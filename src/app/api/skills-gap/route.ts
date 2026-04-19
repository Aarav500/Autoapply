import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticate, successResponse, handleError } from '@/lib/api-utils';
import { aiClient } from '@/lib/ai-client';
import { storage } from '@/lib/storage';
import { generateId } from '@/lib/utils';
import { createLogger } from '@/lib/logger';
import type { Profile } from '@/types/profile';

const logger = createLogger('skills-gap');

// ─── Input Schemas ─────────────────────────────────────────────────────────────

const analyzeSchema = z.object({
  action: z.literal('analyze').optional(),
  targetRole: z.string().min(1),
  targetCompany: z.string().optional(),
  seniorityLevel: z
    .enum(['junior', 'mid', 'senior', 'staff', 'principal'])
    .default('mid'),
});

const updateProgressSchema = z.object({
  action: z.literal('update-progress'),
  analysisId: z.string().min(1),
  skill: z.string().min(1),
  resourceIndex: z.number().int().min(0),
  completed: z.boolean(),
  totalResources: z.number().int().min(1),
});

// Keep backward-compat alias
const inputSchema = analyzeSchema;

// ─── AI Output Schema ──────────────────────────────────────────────────────────

const gapSchema = z.object({
  matched_skills: z.array(
    z.object({
      skill: z.string(),
      proficiency: z.string(),
      relevance: z.enum(['critical', 'important', 'nice-to-have']),
    })
  ),
  missing_skills: z.array(
    z.object({
      skill: z.string(),
      importance: z.enum(['critical', 'important', 'nice-to-have']),
      time_to_learn: z.string(),
      learning_resources: z
        .array(
          z.object({
            name: z.string(),
            type: z.enum(['course', 'documentation', 'book', 'project', 'tutorial']),
            url_hint: z.string(),
          })
        )
        .max(3),
    })
  ),
  readiness_score: z.number().min(0).max(100),
  summary: z.string(),
  priority_actions: z.array(z.string()).max(5),
  estimated_prep_time: z.string(),
});

export type GapAnalysis = z.infer<typeof gapSchema>;

// ─── Stored Analysis Record ────────────────────────────────────────────────────

interface AnalysisRecord {
  id: string;
  targetRole: string;
  targetCompany: string | undefined;
  seniorityLevel: string;
  analysis: GapAnalysis;
  createdAt: string;
}

// ─── Progress types ────────────────────────────────────────────────────────────

interface ResourceProgress {
  completed: boolean;
  completedAt: string | null;
}

interface SkillProgress {
  resources: ResourceProgress[];
  percentComplete: number;
}

interface ProgressStore {
  // key: `${analysisId}::${skillName}`
  [key: string]: SkillProgress;
}

// ─── POST handler ──────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const { userId } = await authenticate(request);

    const body = await request.json();

    // ── update-progress branch ──────────────────────────────────────────────
    if (body?.action === 'update-progress') {
      const { analysisId, skill, resourceIndex, completed, totalResources } =
        updateProgressSchema.parse(body);

      const progressKey = `users/${userId}/skills-gap/progress.json`;
      const existing = await storage.getJSON<ProgressStore>(progressKey);
      const store: ProgressStore =
        existing && typeof existing === 'object' && !Array.isArray(existing)
          ? existing
          : {};

      const compositeKey = `${analysisId}::${skill}`;
      const current: SkillProgress = store[compositeKey] ?? {
        resources: Array.from({ length: totalResources }, () => ({
          completed: false,
          completedAt: null,
        })),
        percentComplete: 0,
      };

      // Ensure the resources array is large enough
      while (current.resources.length < totalResources) {
        current.resources.push({ completed: false, completedAt: null });
      }

      current.resources[resourceIndex] = {
        completed,
        completedAt: completed ? new Date().toISOString() : null,
      };

      const completedCount = current.resources.filter((r) => r.completed).length;
      current.percentComplete = Math.round((completedCount / totalResources) * 100);

      store[compositeKey] = current;
      await storage.putJSON(progressKey, store);

      logger.info({ userId, analysisId, skill, resourceIndex, completed }, 'Progress updated');
      return successResponse({ progress: store[compositeKey], key: compositeKey });
    }

    // ── analyze branch ──────────────────────────────────────────────────────
    const { targetRole, targetCompany, seniorityLevel } = inputSchema.parse(body);

    // Load profile
    const profileData = await storage.getJSON<Profile>(`users/${userId}/profile.json`);
    if (!profileData) {
      return successResponse({ error: 'Profile not found. Please complete your profile first.' }, 404);
    }

    // Build skill list for the prompt
    const skills = (profileData.skills ?? [])
      .map((s) => `${s.name} (${s.proficiency})`)
      .join(', ');

    const experienceSummary = (profileData.experience ?? [])
      .map((e) => {
        const end = e.current ? 'Present' : (e.endDate ?? 'Present');
        return `${e.role} at ${e.company} (${e.startDate} – ${end})`;
      })
      .join('\n');

    const candidateContext = [
      `Name: ${profileData.name}`,
      profileData.headline ? `Current headline: ${profileData.headline}` : null,
      `Skills: ${skills || 'None listed'}`,
      experienceSummary ? `Experience:\n${experienceSummary}` : 'No experience listed',
    ]
      .filter(Boolean)
      .join('\n');

    const companyClause = targetCompany
      ? ` at ${targetCompany}`
      : '';

    const systemPrompt =
      'You are a senior engineering hiring manager with expertise in evaluating technical candidates. ' +
      'Analyze skill gaps for career transitions. Be specific and actionable. ' +
      'Return only valid JSON matching the exact schema requested — no markdown, no prose outside JSON.';

    const userPrompt = `Perform a skills gap analysis for this candidate targeting the role below.

TARGET ROLE: ${targetRole}${companyClause}
SENIORITY LEVEL: ${seniorityLevel}

CANDIDATE PROFILE:
${candidateContext}

Return a JSON object with:
- matched_skills: skills the candidate already has that are relevant, with relevance label
- missing_skills: skills they need to acquire, ordered by importance, each with time_to_learn and up to 3 learning_resources
- readiness_score: integer 0-100 representing how ready they are today
- summary: 2-3 sentence plain-English summary
- priority_actions: up to 5 concrete next steps
- estimated_prep_time: rough calendar estimate to close all critical gaps (e.g. "3-4 months")`;

    logger.info({ userId, targetRole, seniorityLevel }, 'Running skills gap analysis');

    const analysis = await aiClient.completeJSON(systemPrompt, userPrompt, gapSchema, {
      model: 'balanced',
      maxTokens: 3072,
    });

    // Persist result — append to history, cap at 20
    const historyKey = `users/${userId}/skills-gap/analyses.json`;
    const existing = await storage.getJSON<AnalysisRecord[]>(historyKey);
    const history: AnalysisRecord[] = Array.isArray(existing) ? existing : [];

    const record: AnalysisRecord = {
      id: generateId(),
      targetRole,
      targetCompany,
      seniorityLevel,
      analysis,
      createdAt: new Date().toISOString(),
    };

    const updated = [record, ...history].slice(0, 20);
    await storage.putJSON(historyKey, updated);

    logger.info({ userId, targetRole, readinessScore: analysis.readiness_score }, 'Skills gap analysis complete');

    return successResponse({ record });
  } catch (error) {
    logger.error({ error }, 'Skills gap analysis failed');
    return handleError(error);
  }
}

// ─── GET handler ───────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { userId } = await authenticate(request);

    const historyKey = `users/${userId}/skills-gap/analyses.json`;
    const progressKey = `users/${userId}/skills-gap/progress.json`;

    const [rawAnalyses, rawProgress] = await Promise.all([
      storage.getJSON<AnalysisRecord[]>(historyKey),
      storage.getJSON<ProgressStore>(progressKey),
    ]);

    const analyses: AnalysisRecord[] = Array.isArray(rawAnalyses) ? rawAnalyses : [];
    const progress: ProgressStore = (rawProgress && typeof rawProgress === 'object' && !Array.isArray(rawProgress))
      ? rawProgress
      : {};

    return successResponse({ analyses, progress });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch skills gap history');
    return handleError(error);
  }
}
