/**
 * GET  /api/career — fetch saved career plans
 * POST /api/career — generate a new career roadmap
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticate, successResponse, errorResponse, handleError } from '@/lib/api-utils';
import { aiClient } from '@/lib/ai-client';
import { storage } from '@/lib/storage';
import { logger } from '@/lib/logger';
import { generateId } from '@/lib/utils';
import type { Profile } from '@/types/profile';

// ─── Request schema ─────────────────────────────────────────────────────────

const inputSchema = z.object({
  currentRole: z.string().min(1),
  targetRole: z.string().min(1),
  currentIndustry: z.string().optional(),
  targetIndustry: z.string().optional(),
});

// ─── AI output schema ────────────────────────────────────────────────────────

const roadmapSchema = z.object({
  gap_analysis: z.object({
    current_level: z.string(),
    target_level: z.string(),
    difficulty: z.enum(['easy', 'moderate', 'challenging', 'very-challenging']),
    key_gaps: z.array(z.string()),
  }),
  year_1: z.object({
    title: z.string(),
    goal: z.string(),
    milestones: z.array(z.object({
      month: z.string(),
      action: z.string(),
      outcome: z.string(),
    })),
    skills_to_acquire: z.array(z.string()),
    target_roles: z.array(z.string()),
    companies_to_target: z.array(z.string()),
  }),
  year_3: z.object({
    title: z.string(),
    goal: z.string(),
    milestones: z.array(z.object({
      period: z.string(),
      action: z.string(),
      outcome: z.string(),
    })),
    skills_to_acquire: z.array(z.string()),
    target_roles: z.array(z.string()),
    companies_to_target: z.array(z.string()),
  }),
  year_5: z.object({
    title: z.string(),
    goal: z.string(),
    vision: z.string(),
    target_roles: z.array(z.string()),
    compensation_range: z.string(),
  }),
  quick_wins: z.array(z.string()).max(5),
  success_metrics: z.array(z.string()),
});

export type CareerRoadmap = z.infer<typeof roadmapSchema>;

export interface CareerPlan {
  id: string;
  currentRole: string;
  targetRole: string;
  currentIndustry?: string;
  targetIndustry?: string;
  roadmap: CareerRoadmap;
  generatedAt: string;
}

const PLANS_KEY = (userId: string) => `users/${userId}/career/plans.json`;

// ─── GET ─────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);

    const raw = await storage.getJSON<CareerPlan[]>(PLANS_KEY(userId)).catch(() => null);
    const plans: CareerPlan[] = Array.isArray(raw) ? raw : [];

    return successResponse({ plans });
  } catch (error) {
    logger.error({ error }, 'Career GET error');
    return handleError(error);
  }
}

// ─── POST ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);

    const body = await req.json();
    const validation = inputSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse(
        validation.error.issues[0]?.message ?? 'Invalid request body',
        400,
        'VALIDATION_ERROR'
      );
    }

    const { currentRole, targetRole, currentIndustry, targetIndustry } = validation.data;

    // Load profile for context enrichment
    const profile = await storage.getJSON<Profile>(`users/${userId}/profile.json`).catch(() => null);

    const skillsSummary = (profile?.skills ?? [])
      .slice(0, 20)
      .map((s) => `${s.name} (${s.proficiency})`)
      .join(', ');

    const experienceSummary = (profile?.experience ?? [])
      .slice(0, 5)
      .map((e) => `${e.role} at ${e.company}`)
      .join('; ');

    logger.info({ userId, currentRole, targetRole }, 'Career roadmap requested');

    const systemPrompt = `You are an elite executive career coach who has guided hundreds of professionals to their dream roles at top companies. You give specific, actionable career roadmaps tailored to the individual's background, current market realities, and the target role's requirements. Your advice is grounded in actual hiring patterns, skill adjacencies, and realistic timelines — never generic platitudes.`;

    const userPrompt = `Generate a detailed, actionable career roadmap for a professional making the following transition:

Current Role: ${currentRole}${currentIndustry ? ` (${currentIndustry} industry)` : ''}
Target Role: ${targetRole}${targetIndustry ? ` (${targetIndustry} industry)` : ''}
${experienceSummary ? `Recent Experience: ${experienceSummary}` : ''}
${skillsSummary ? `Current Skills: ${skillsSummary}` : ''}

Return a JSON object with the following structure:

gap_analysis:
  current_level: senior/mid/junior/executive assessment of the current role
  target_level: same assessment of the target role
  difficulty: "easy" | "moderate" | "challenging" | "very-challenging" — how hard this transition is
  key_gaps: array of 4-6 specific skill/experience gaps to bridge

year_1:
  title: short inspiring title for this phase (e.g. "Build the Foundation")
  goal: one-sentence goal for year 1
  milestones: array of 4 milestones with { month (e.g. "Month 1–3"), action (what to do), outcome (measurable result) }
  skills_to_acquire: array of 5-8 specific skills/certifications to gain
  target_roles: array of 3-5 stepping-stone roles to apply for
  companies_to_target: array of 5-8 companies ideal for this stage

year_3:
  title: short title for this phase
  goal: one-sentence goal for year 3
  milestones: array of 3 milestones with { period (e.g. "Year 1–2"), action, outcome }
  skills_to_acquire: array of 4-6 advanced skills
  target_roles: array of 3-5 roles at this level
  companies_to_target: array of 5-8 companies to target

year_5:
  title: short title for this phase
  goal: one-sentence goal for year 5
  vision: 2-3 sentences describing the professional's position in 5 years
  target_roles: array of 3-5 roles achievable by year 5
  compensation_range: realistic comp range as a string (e.g. "$180k–$280k base + equity")

quick_wins: array of exactly 5 actions to take THIS WEEK to start the journey
success_metrics: array of 5-7 measurable metrics to track progress (e.g. "3 new connections in target field per month")`;

    const roadmap = await aiClient.completeJSON(
      systemPrompt,
      userPrompt,
      roadmapSchema,
      { model: 'powerful', maxTokens: 4096 }
    );

    const plan: CareerPlan = {
      id: generateId(),
      currentRole,
      targetRole,
      currentIndustry,
      targetIndustry,
      roadmap,
      generatedAt: new Date().toISOString(),
    };

    // Persist — cap at 10 most recent plans
    const existingRaw = await storage.getJSON<CareerPlan[]>(PLANS_KEY(userId)).catch(() => null);
    const existing: CareerPlan[] = Array.isArray(existingRaw) ? existingRaw : [];
    const updated = [plan, ...existing].slice(0, 10);
    await storage.putJSON(PLANS_KEY(userId), updated);

    logger.info({ userId, planId: plan.id }, 'Career roadmap generated');

    return successResponse({ plan });
  } catch (error) {
    logger.error({ error }, 'Career POST error');
    return handleError(error);
  }
}
