import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticate, successResponse, handleError } from '@/lib/api-utils';
import { aiClient } from '@/lib/ai-client';
import { eligibilityAssessmentPrompt, strategyBuilderPrompt, visaFinderPrompt } from '@/prompts/greencard';
import { storage } from '@/lib/storage';
import { logger } from '@/lib/logger';

const inputSchema = z.object({
  action: z.enum(['assess', 'strategy', 'evidence-save', 'evidence-list', 'visa-finder']),
  visaType: z.string().optional(),
  evidenceType: z.string().optional(),
  evidenceData: z.object({}).passthrough().optional(),
});

const coerceString = z.union([z.string(), z.object({}).passthrough()]).transform((v) =>
  typeof v === 'string' ? v : JSON.stringify(v)
);

const assessmentSchema = z.object({
  visa_type: z.string().default('EB-1A'),
  overall_eligibility: z.string().default('possible'),
  overall_score: z.number().default(0),
  criteria: z.array(z.object({
    name: z.string(),
    met: z.boolean().default(false),
    strength: z.string().default('weak'),
    current_evidence: z.string().default(''),
    suggestions: z.array(z.string()).default([]),
  })).default([]),
  summary: coerceString.default(''),
  next_steps: z.array(coerceString).default([]),
  estimated_timeline: z.string().default('12-24 months'),
});

const strategySchema = z.object({
  roadmap: z.array(z.object({
    month: z.string(),
    focus: z.string(),
    actions: z.array(z.object({
      action: z.string(),
      criterion: z.string(),
      impact: z.string().default('medium'),
      details: z.string().default(''),
    })).default([]),
  })).default([]),
  priority_criteria: z.array(z.string()).default([]),
  attorney_recommendations: z.array(z.string()).default([]),
  estimated_filing_date: z.string().default('TBD'),
});

const visaPathwaySchema = z.object({
  visa_type: z.string(),
  visa_name: z.string().default(''),
  fit_level: z.string().default('not_eligible'),
  reason: z.string().default(''),
  advantages: z.array(z.string()).default([]),
  gaps: z.array(z.string()).default([]),
  timeline: z.string().default('Unknown'),
  leads_to_green_card: z.boolean().default(false),
  green_card_path: z.string().default(''),
});

const visaFinderSchema = z.object({
  pathways: z.array(visaPathwaySchema).default([]),
  top_recommendations: z.array(z.object({
    visa_type: z.string(),
    rank: z.number().default(0),
    reason: z.string().default(''),
  })).default([]),
  multi_pathway_strategy: z.string().default(''),
  immediate_actions: z.array(z.string()).default([]),
});

interface EvidenceItem {
  id: string;
  type: string;
  title: string;
  description: string;
  date: string;
  link: string;
  createdAt: string;
}

function buildProfileInput(
  profileData: Record<string, unknown>,
  body: Record<string, unknown>
) {
  const experience = (profileData.experience as Array<Record<string, string>>) || [];
  const education = (profileData.education as Array<Record<string, string>>) || [];

  return {
    name: (profileData.name as string) || 'Unknown',
    education: education.map((edu) => ({
      institution: edu.institution || edu.school || '',
      degree: edu.degree || '',
      field: edu.field || edu.major || '',
      year: edu.year || edu.endDate || undefined,
    })),
    experience: experience.map((exp) => ({
      company: exp.company || '',
      role: exp.role || exp.title || '',
      duration: exp.duration || `${exp.startDate || ''} - ${exp.endDate || 'Present'}`,
      achievements: (exp.achievements as unknown as string[]) || (exp.bullets as unknown as string[]) || [],
    })),
    publications: body.publications as number | undefined,
    citations: body.citations as number | undefined,
    awards: body.awards as string[] | undefined,
    patents: body.patents as number | undefined,
    memberships: body.memberships as string[] | undefined,
    mediaFeatures: body.mediaFeatures as string[] | undefined,
    contributions: body.contributions as string[] | undefined,
    nationality: (body.nationality as string) || (profileData.nationality as string) || undefined,
    currentVisaStatus: (body.currentVisaStatus as string) || (profileData.currentVisaStatus as string) || undefined,
    fieldOfStudy: (body.fieldOfStudy as string) || undefined,
  };
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await authenticate(request);

    const body = await request.json();
    const validation = inputSchema.safeParse(body);

    if (!validation.success) {
      return successResponse({ error: 'Invalid request body' }, 400);
    }

    const { action, visaType, evidenceType, evidenceData } = validation.data;

    // ---------- ASSESS ----------
    if (action === 'assess') {
      if (!visaType) {
        return successResponse({ error: 'visaType is required for assessment' }, 400);
      }

      const profileData = await storage.getJSON<Record<string, unknown>>(`users/${userId}/profile.json`);
      if (!profileData) {
        return successResponse({ error: 'Profile not found. Please complete your profile first.' }, 404);
      }

      const profileInput = buildProfileInput(profileData, body);

      logger.info({ userId, visaType }, 'Green card eligibility assessment requested');

      const prompt = eligibilityAssessmentPrompt({ profile: profileInput, visaType });
      const assessment = await aiClient.completeJSON(
        prompt.system,
        prompt.user,
        assessmentSchema,
        { model: 'balanced', maxTokens: 8192 }
      );

      // Save assessment for strategy builder (optional bonus context)
      await storage.putJSON(`users/${userId}/greencard/assessment.json`, {
        ...assessment,
        visaType,
        createdAt: new Date().toISOString(),
        profileSnapshot: profileInput,
      });

      return successResponse({ assessment });
    }

    // ---------- STRATEGY ----------
    if (action === 'strategy') {
      if (!visaType) {
        return successResponse({ error: 'visaType is required for strategy' }, 400);
      }

      const profileData = await storage.getJSON<Record<string, unknown>>(`users/${userId}/profile.json`);
      if (!profileData) {
        return successResponse({ error: 'Profile not found. Please complete your profile first.' }, 404);
      }

      // Try to load previous assessment as optional bonus context
      let currentStrengths: string[] = [];
      let gaps: string[] = [];

      try {
        const savedAssessment = await storage.getJSON<Record<string, unknown>>(`users/${userId}/greencard/assessment.json`);
        if (savedAssessment) {
          const criteria = (savedAssessment.criteria as Array<Record<string, unknown>>) || [];
          currentStrengths = criteria
            .filter((c) => c.met === true || c.strength === 'strong' || c.strength === 'moderate')
            .map((c) => c.name as string);
          gaps = criteria
            .filter((c) => c.met === false || c.strength === 'weak' || c.strength === 'not-met')
            .map((c) => c.name as string);
        }
      } catch (err) {
        logger.debug({ err }, 'No previous assessment found, strategy will analyze profile directly');
      }

      const profileInput = buildProfileInput(profileData, body);

      logger.info({ userId, visaType, hasPriorAssessment: currentStrengths.length > 0 }, 'Green card strategy builder requested');

      const prompt = strategyBuilderPrompt({
        profile: profileInput,
        visaType,
        currentStrengths,
        gaps,
      });

      const strategy = await aiClient.completeJSON(
        prompt.system,
        prompt.user,
        strategySchema,
        { model: 'balanced', maxTokens: 8192 }
      );

      // Save strategy
      await storage.putJSON(`users/${userId}/greencard/strategy.json`, {
        ...strategy,
        visaType,
        createdAt: new Date().toISOString(),
      });

      return successResponse({ strategy });
    }

    // ---------- VISA-FINDER ----------
    if (action === 'visa-finder') {
      const profileData = await storage.getJSON<Record<string, unknown>>(`users/${userId}/profile.json`);
      if (!profileData) {
        return successResponse({ error: 'Profile not found. Please complete your profile first.' }, 404);
      }

      const profileInput = buildProfileInput(profileData, body);

      logger.info({ userId }, 'Visa pathway finder requested');

      const prompt = visaFinderPrompt({ profile: profileInput });
      const result = await aiClient.completeJSON(
        prompt.system,
        prompt.user,
        visaFinderSchema,
        { model: 'balanced', maxTokens: 8192 }
      );

      // Save result
      await storage.putJSON(`users/${userId}/greencard/visa-finder.json`, {
        ...result,
        createdAt: new Date().toISOString(),
      });

      return successResponse({ visaFinder: result });
    }

    // ---------- EVIDENCE-SAVE ----------
    if (action === 'evidence-save') {
      if (!evidenceType || !evidenceData) {
        return successResponse({ error: 'evidenceType and evidenceData are required' }, 400);
      }

      const evidenceKey = `users/${userId}/greencard/evidence.json`;
      const existing = await storage.getJSON<EvidenceItem[]>(evidenceKey);
      const items: EvidenceItem[] = Array.isArray(existing) ? existing : [];

      const newItem: EvidenceItem = {
        id: `ev_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        type: evidenceType,
        title: (evidenceData.title as string) || '',
        description: (evidenceData.description as string) || '',
        date: (evidenceData.date as string) || new Date().toISOString().split('T')[0],
        link: (evidenceData.link as string) || '',
        createdAt: new Date().toISOString(),
      };

      items.push(newItem);
      await storage.putJSON(evidenceKey, items);

      logger.info({ userId, evidenceType, evidenceId: newItem.id }, 'Green card evidence saved');

      return successResponse({ evidence: newItem, total: items.length });
    }

    // ---------- EVIDENCE-LIST ----------
    if (action === 'evidence-list') {
      const evidenceKey = `users/${userId}/greencard/evidence.json`;
      const existing = await storage.getJSON<EvidenceItem[]>(evidenceKey);
      const items: EvidenceItem[] = Array.isArray(existing) ? existing : [];

      return successResponse({ evidence: items, total: items.length });
    }

    return successResponse({ error: 'Unknown action' }, 400);
  } catch (error) {
    logger.error({ error }, 'Green card API error');
    return handleError(error);
  }
}
