/**
 * GET/POST /api/market
 * Weekly job market intelligence dashboard.
 * GET  — return latest cached report (regenerate flag if stale).
 * POST — force regenerate a fresh report.
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticate, successResponse, errorResponse, handleError } from '@/lib/api-utils';
import { aiClient } from '@/lib/ai-client';
import { storage } from '@/lib/storage';
import { logger } from '@/lib/logger';
import type { Profile } from '@/types/profile';

// ─── Constants ────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const MAX_CACHED_REPORTS = 4;

// ─── Request schema ───────────────────────────────────────────────────────────

const inputSchema = z.object({
  focus: z.string().optional(),
  timeframe: z.enum(['this-week', 'this-month']).default('this-week'),
});

// ─── AI output schema ─────────────────────────────────────────────────────────

const marketSchema = z.object({
  report_date: z.string(),
  market_temperature: z.enum(['hot', 'warm', 'cooling', 'cold']),
  summary: z.string(),

  trending_roles: z.array(z.object({
    role: z.string(),
    demand_change: z.string(),
    avg_salary: z.string(),
    top_hiring_companies: z.array(z.string()),
    reason: z.string(),
  })).max(6),

  in_demand_skills: z.array(z.object({
    skill: z.string(),
    demand_level: z.enum(['surging', 'growing', 'stable', 'declining']),
    avg_salary_premium: z.string(),
    roles_that_need_it: z.array(z.string()),
  })).max(10),

  hiring_companies: z.array(z.object({
    company: z.string(),
    open_roles_estimate: z.string(),
    growth_stage: z.string(),
    why_hiring: z.string(),
    roles_they_need: z.array(z.string()),
  })).max(8),

  declining_areas: z.array(z.object({
    area: z.string(),
    reason: z.string(),
    pivot_suggestion: z.string(),
  })).max(4),

  salary_trends: z.object({
    overall_trend: z.string(),
    highest_paying_roles: z.array(z.string()),
    fastest_growing_comp: z.array(z.string()),
  }),

  hot_locations: z.array(z.object({
    location: z.string(),
    why_hot: z.string(),
    remote_ratio: z.string(),
  })).max(5),

  personalized_insights: z.array(z.object({
    insight: z.string(),
    action: z.string(),
    urgency: z.enum(['immediate', 'this-week', 'this-month']),
  })).max(5),

  market_prediction: z.string(),
});

export type MarketReport = z.infer<typeof marketSchema> & {
  generatedAt: string;
  id: string;
  timeframe: string;
};

// ─── Storage helpers ──────────────────────────────────────────────────────────

async function loadReports(userId: string): Promise<MarketReport[]> {
  const raw = await storage.getJSON<unknown>(`users/${userId}/market/reports.json`).catch(() => null);
  if (!raw) return [];
  return Array.isArray(raw) ? (raw as MarketReport[]) : [];
}

async function saveReports(userId: string, reports: MarketReport[]): Promise<void> {
  await storage.putJSON(`users/${userId}/market/reports.json`, reports);
}

function isStale(report: MarketReport): boolean {
  return Date.now() - new Date(report.generatedAt).getTime() > CACHE_TTL_MS;
}

// ─── AI generation ────────────────────────────────────────────────────────────

async function generateReport(
  userId: string,
  profile: Profile | null,
  timeframe: string,
  focus?: string,
): Promise<MarketReport> {
  const skillNames = (profile?.skills ?? []).slice(0, 20).map((s) => s.name).join(', ');
  const headline = profile?.headline ?? '';
  const roles = (profile?.preferences?.targetRoles ?? []).join(', ');
  const locations = (profile?.preferences?.locations ?? []).join(', ');

  const systemPrompt = `You are a senior tech industry analyst with deep knowledge of current hiring market trends as of 2026. You combine data from LinkedIn job postings, Levels.fyi compensation data, layoff.fyi, Crunchbase funding data, and macroeconomic signals to give accurate, actionable market intelligence.`;

  const userPrompt = `Generate a comprehensive job market intelligence report for the tech industry covering ${timeframe === 'this-week' ? 'this week (ending today)' : 'this month'}.${focus ? ` Focus especially on: ${focus}.` : ''}

${profile ? `Personalize insights for this candidate:
- Headline: ${headline || 'Not specified'}
- Skills: ${skillNames || 'Not specified'}
- Target roles: ${roles || 'Not specified'}
- Preferred locations: ${locations || 'Not specified'}` : 'Generate general market insights (no candidate profile available).'}

Return a JSON object with exactly these fields:
- report_date: today's date as "Month DD, YYYY"
- market_temperature: one of "hot", "warm", "cooling", "cold" — overall tech hiring sentiment
- summary: 2-3 sentence executive summary of the market right now

- trending_roles: array of up to 6 roles, each with { role, demand_change (e.g. "+34% this week"), avg_salary (e.g. "$185k/yr"), top_hiring_companies (3-4 names), reason (1-2 sentences why demand is up) }

- in_demand_skills: array of up to 10 skills, each with { skill, demand_level ("surging"|"growing"|"stable"|"declining"), avg_salary_premium (e.g. "+$18k/yr"), roles_that_need_it (2-3 role names) }

- hiring_companies: array of up to 8 companies actively hiring, each with { company, open_roles_estimate (e.g. "200+ open roles"), growth_stage (e.g. "Series B", "Public – expanding", "Post-IPO"), why_hiring (1 sentence), roles_they_need (3-4 role types) }

- declining_areas: array of up to 4 areas with reduced demand, each with { area, reason (1-2 sentences), pivot_suggestion (1 sentence actionable advice) }

- salary_trends: { overall_trend (2-3 sentences on compensation direction), highest_paying_roles (5 role titles), fastest_growing_comp (4-5 role titles seeing fastest comp increases) }

- hot_locations: array of up to 5 locations, each with { location, why_hot (1 sentence), remote_ratio (e.g. "70% remote-friendly") }

- personalized_insights: array of up to 5 insights specific to the candidate's profile, each with { insight (specific observation about their situation), action (concrete next step), urgency ("immediate"|"this-week"|"this-month") }. If no profile, return empty array.

- market_prediction: 1-paragraph outlook for the next 30 days including key events, funding trends, and hiring forecasts.

Be specific, use real company names and realistic numbers. Reflect 2026 market conditions accurately.`;

  const report = await aiClient.completeJSON(systemPrompt, userPrompt, marketSchema, {
    model: 'powerful',
    maxTokens: 4096,
  });

  const fullReport: MarketReport = {
    ...report,
    id: `market-${Date.now()}`,
    generatedAt: new Date().toISOString(),
    timeframe,
  };

  // Persist to cache
  const reports = await loadReports(userId);
  const updated = [fullReport, ...reports].slice(0, MAX_CACHED_REPORTS);
  await saveReports(userId, updated);

  logger.info({ userId, timeframe }, 'Market report generated and cached');

  return fullReport;
}

// ─── GET — return latest cached report ───────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);

    const reports = await loadReports(userId);
    const latest = reports[0] ?? null;

    if (!latest) {
      return successResponse({ report: null, stale: false, needsGeneration: true });
    }

    return successResponse({
      report: latest,
      stale: isStale(latest),
      needsGeneration: false,
    });
  } catch (error) {
    logger.error({ error }, 'Market GET error');
    return handleError(error);
  }
}

// ─── POST — generate (or force regenerate) a report ──────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);

    const body = await req.json().catch(() => ({}));
    const validation = inputSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse(
        validation.error.issues[0]?.message ?? 'Invalid request body',
        400,
        'VALIDATION_ERROR',
      );
    }

    const { focus, timeframe } = validation.data;

    const profile = await storage
      .getJSON<Profile>(`users/${userId}/profile.json`)
      .catch(() => null);

    const report = await generateReport(userId, profile, timeframe, focus);

    return successResponse({ report, stale: false });
  } catch (error) {
    logger.error({ error }, 'Market POST error');
    return handleError(error);
  }
}
