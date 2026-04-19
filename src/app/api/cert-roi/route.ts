/**
 * GET/POST /api/cert-roi
 * Certification ROI calculator — AI-powered analysis of cert value vs. cost.
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticate, successResponse, errorResponse, handleError } from '@/lib/api-utils';
import { aiClient } from '@/lib/ai-client';
import { storage } from '@/lib/storage';
import { logger } from '@/lib/logger';
import { generateId } from '@/lib/utils';

// ─── Input schema ──────────────────────────────────────────────────────────────

const inputSchema = z.object({
  certification: z.string().min(1),
  targetRole: z.string().optional(),
  currentSalary: z.number().optional(),
});

// ─── AI output schema ──────────────────────────────────────────────────────────

const certRoiSchema = z.object({
  certification_overview: z.object({
    full_name: z.string(),
    issuer: z.string(),
    difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
    study_hours: z.string(),
    exam_cost: z.string(),
    renewal_required: z.boolean(),
    renewal_frequency: z.string().optional(),
  }),
  roi_analysis: z.object({
    salary_increase_estimate: z.string(),
    break_even_months: z.number(),
    '5_year_value': z.string(),
    demand_trend: z.enum(['surging', 'growing', 'stable', 'declining']),
    hiring_priority: z.string(),
  }),
  best_for_roles: z.array(z.string()).max(5),
  alternatives: z.array(z.object({
    name: z.string(),
    better_if: z.string(),
    roi_comparison: z.string(),
  })).max(4),
  learning_path: z.array(z.object({
    step: z.string(),
    resource: z.string(),
    duration: z.string(),
    free: z.boolean(),
  })).max(6),
  verdict: z.object({
    recommendation: z.enum(['highly-recommended', 'recommended', 'situational', 'skip']),
    reason: z.string(),
    do_it_if: z.string(),
    skip_if: z.string(),
  }),
});

type CertRoiResult = z.infer<typeof certRoiSchema>;

// ─── Stored shape ──────────────────────────────────────────────────────────────

interface StoredAnalysis {
  id: string;
  certification: string;
  targetRole?: string;
  currentSalary?: number;
  result: CertRoiResult;
  analyzedAt: string;
}

// ─── GET ───────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);

    const raw = await storage.getJSON<StoredAnalysis[]>(`users/${userId}/cert-roi/analyses.json`);
    const analyses: StoredAnalysis[] = Array.isArray(raw) ? raw : [];

    return successResponse({ analyses });
  } catch (error) {
    logger.error({ error }, 'Cert-ROI GET error');
    return handleError(error);
  }
}

// ─── POST ──────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);

    const body = await req.json() as unknown;
    const validation = inputSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse(
        validation.error.issues[0]?.message ?? 'Invalid request body',
        400,
        'VALIDATION_ERROR'
      );
    }

    const { certification, targetRole, currentSalary } = validation.data;

    logger.info({ userId, certification, targetRole }, 'Cert ROI analysis requested');

    const systemPrompt = `You are a career strategist and tech education expert with deep knowledge of certification ROI across the tech industry as of 2026. You give data-driven, honest assessments. You base your analysis on real market data — average exam costs, actual study time distributions from forums and bootcamps, salary survey data from levels.fyi, LinkedIn, and Glassdoor, and employer survey data on certification value. Be specific and realistic, not optimistic.`;

    const contextParts: string[] = [`Certification requested: "${certification}"`];
    if (targetRole) contextParts.push(`Target role: ${targetRole}`);
    if (currentSalary) contextParts.push(`Current salary: $${currentSalary.toLocaleString()}/year`);

    const userPrompt = `${contextParts.join('\n')}

Analyze the ROI of this certification and return a JSON object with the following exact structure:

{
  "certification_overview": {
    "full_name": "full official certification name",
    "issuer": "organization that issues it",
    "difficulty": "beginner" | "intermediate" | "advanced" | "expert",
    "study_hours": "realistic study hour range e.g. '80-120 hours'",
    "exam_cost": "total cost including exam fee e.g. '$300-$500'",
    "renewal_required": true | false,
    "renewal_frequency": "how often renewal is needed if applicable"
  },
  "roi_analysis": {
    "salary_increase_estimate": "realistic annual salary increase range e.g. '$8,000-$15,000/year'",
    "break_even_months": number of months to break even on study time + exam cost,
    "5_year_value": "estimated 5-year financial value e.g. '$45,000-$75,000'",
    "demand_trend": "surging" | "growing" | "stable" | "declining",
    "hiring_priority": "2-3 sentences on how much hiring managers weight this cert"
  },
  "best_for_roles": ["array of up to 5 job titles this cert most benefits"],
  "alternatives": [
    {
      "name": "alternative certification name",
      "better_if": "specific scenario when you'd choose this instead",
      "roi_comparison": "e.g. 'Higher ROI but requires 2x study time'"
    }
  ],
  "learning_path": [
    {
      "step": "concise step description",
      "resource": "specific resource name (course, book, platform)",
      "duration": "e.g. '2 weeks' or '40 hours'",
      "free": true | false
    }
  ],
  "verdict": {
    "recommendation": "highly-recommended" | "recommended" | "situational" | "skip",
    "reason": "2-3 sentence honest assessment of overall value",
    "do_it_if": "specific conditions under which this cert pays off",
    "skip_if": "specific conditions under which you should skip or deprioritize it"
  }
}

Be honest — if a certification is overhyped or has declining ROI, say so. Up to 4 alternatives, up to 6 learning path steps.`;

    const result = await aiClient.completeJSON(
      systemPrompt,
      userPrompt,
      certRoiSchema,
      { model: 'balanced', maxTokens: 2048 }
    );

    // Load existing, cap at 20
    const raw = await storage.getJSON<StoredAnalysis[]>(`users/${userId}/cert-roi/analyses.json`);
    const existing: StoredAnalysis[] = Array.isArray(raw) ? raw : [];

    const newEntry: StoredAnalysis = {
      id: generateId(),
      certification,
      targetRole,
      currentSalary,
      result,
      analyzedAt: new Date().toISOString(),
    };

    const updated = [newEntry, ...existing].slice(0, 20);
    await storage.putJSON(`users/${userId}/cert-roi/analyses.json`, updated);

    logger.info({ userId, certification, verdict: result.verdict.recommendation }, 'Cert ROI analysis complete');

    return successResponse({ analysis: newEntry });
  } catch (error) {
    logger.error({ error }, 'Cert-ROI POST error');
    return handleError(error);
  }
}
