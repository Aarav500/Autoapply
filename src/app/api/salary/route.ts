/**
 * GET  /api/salary   – offer research history
 * POST /api/salary   – salary research and negotiation coaching.
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticate, successResponse, errorResponse, handleError } from '@/lib/api-utils';
import { aiClient } from '@/lib/ai-client';
import { storage } from '@/lib/storage';
import { logger } from '@/lib/logger';
import type { Profile } from '@/types/profile';

// ─── Stored record shape (subset used for history) ─────────────────────────────

interface SalaryRecord {
  action: string;
  jobTitle: string;
  company: string;
  location: string;
  yearsExp: number;
  result: {
    salary_range: { min: number; max: number; median: number };
    market_position: string;
    [key: string]: unknown;
  };
  generatedAt: string;
}

// ─── GET handler ───────────────────────────────────────────────────────────────

/**
 * GET /api/salary
 * Returns all past salary research records for the authenticated user,
 * ordered newest-first, filtered to action=research entries.
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);

    const keys = await storage.listKeys(`users/${userId}/salary/`);
    const researchKeys = keys.filter((k) => k.includes('/salary/research-'));

    const records = await Promise.all(
      researchKeys.map((key) => storage.getJSON<SalaryRecord>(key))
    );

    const history = records
      .filter((r): r is SalaryRecord => r !== null && r.action === 'research')
      .sort(
        (a, b) =>
          new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
      )
      .map((r) => ({
        date: r.generatedAt,
        jobTitle: r.jobTitle,
        company: r.company,
        location: r.location,
        salary_range: r.result.salary_range,
        market_position: r.result.market_position,
      }));

    return successResponse({ history });
  } catch (error) {
    logger.error({ error }, 'Salary GET error');
    return handleError(error);
  }
}

// ─── Request schema ────────────────────────────────────────────────────────────

const inputSchema = z.object({
  action: z.enum(['research', 'negotiate']),
  jobTitle: z.string().min(1),
  company: z.string().min(1),
  location: z.string().min(1),
  yearsExp: z.number().min(0).optional(),
  currentOffer: z.number().min(0).optional(),
});

// ─── AI output schemas ─────────────────────────────────────────────────────────

const researchSchema = z.object({
  salary_range: z.object({
    min: z.number(),
    max: z.number(),
    median: z.number(),
  }),
  total_comp_range: z.object({
    min: z.number(),
    max: z.number(),
    median: z.number(),
    includes: z.array(z.string()).default([]),
  }).optional(),
  equity_details: z.object({
    typical_grant: z.string().default(''),
    vesting_schedule: z.string().default('4-year with 1-year cliff'),
    refreshers: z.string().default(''),
    current_value_estimate: z.string().default(''),
  }).optional(),
  signing_bonus: z.object({
    typical_range: z.string().default(''),
    negotiability: z.string().default(''),
  }).optional(),
  market_position: z.string(),
  key_factors: z.array(z.string()),
  negotiation_room: z.string(),
  data_sources: z.array(z.string()).default([]),
  comparable_companies: z.array(z.object({
    company: z.string(),
    base_salary_median: z.number(),
    total_comp_median: z.number().optional(),
  })).default([]),
  yoe_impact: z.string().default(''),
  location_adjustment: z.string().default(''),
});

const negotiateSchema = z.object({
  recommended_counter: z.number(),
  counter_range: z.object({
    aggressive: z.number(),
    moderate: z.number(),
    conservative: z.number(),
  }).optional(),
  negotiation_script: z.string(),
  email_template: z.string(),
  phone_script: z.string().default(''),
  key_tactics: z.array(z.string()),
  what_to_avoid: z.array(z.string()),
  alternative_benefits: z.array(z.string()),
  negotiation_timeline: z.string().default(''),
  expected_outcome: z.string().default(''),
});

// ─── Handler ───────────────────────────────────────────────────────────────────

/**
 * POST /api/salary
 */
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

    const { action, jobTitle, company, location, yearsExp, currentOffer } = validation.data;

    // Load profile to enrich context
    const profile = await storage.getJSON<Profile>(`users/${userId}/profile.json`);

    const skillsSummary = (profile?.skills ?? [])
      .slice(0, 15)
      .map((s) => `${s.name} (${s.proficiency})`)
      .join(', ');

    const expYears =
      yearsExp ??
      (profile?.experience
        ? (() => {
            const totalMonths = (profile.experience || []).reduce((acc, exp) => {
              const start = new Date(exp.startDate);
              const end = exp.endDate ? new Date(exp.endDate) : new Date();
              return acc + Math.max(0, (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth());
            }, 0);
            return Math.round(totalMonths / 12);
          })()
        : 0);

    logger.info({ userId, action, jobTitle, company, location }, 'Salary request');

    if (action === 'research') {
      const systemPrompt = `You are a compensation expert with deep knowledge of tech industry salaries across all markets and company sizes. You have access to salary data from Levels.fyi, Glassdoor, LinkedIn Salary, Blind, and Radford surveys.

Provide accurate, data-driven salary information based on role, company reputation/size, location cost-of-living, and candidate experience level. Always provide base salary figures in USD (annualized). Be specific and realistic — do not give overly wide ranges.`;

      const userPrompt = `Provide comprehensive compensation research for:
Role: ${jobTitle}
Company: ${company}
Location: ${location}
Years of Experience: ${expYears}
${skillsSummary ? `Candidate Skills: ${skillsSummary}` : ''}

Return a JSON object with these fields:
- salary_range: { min, max, median } — realistic annual BASE salary in USD (not total comp)
- total_comp_range: { min, max, median, includes: ["base", "equity", "bonus"] } — total annual compensation in USD
- equity_details: { typical_grant (e.g. "$200k-$400k RSUs over 4 years"), vesting_schedule, refreshers (frequency/amount), current_value_estimate }
- signing_bonus: { typical_range (e.g. "$20k-$50k"), negotiability ("high"/"medium"/"low") }
- market_position: one of "below market", "at market", "above market", "top of market" based on industry data
- key_factors: array of 5-7 specific factors affecting compensation for this role/company/location
- negotiation_room: 2-3 sentences on leverage and how much movement is realistic
- data_sources: array of data sources this estimate is based on (e.g. ["levels.fyi", "glassdoor", "blind"])
- comparable_companies: array of 3-5 similar companies with { company, base_salary_median, total_comp_median }
- yoe_impact: how years of experience affects this specific role's comp (1-2 sentences)
- location_adjustment: cost-of-living and location adjustment insight (1-2 sentences)`;

      const result = await aiClient.completeJSON(
        systemPrompt,
        userPrompt,
        researchSchema,
        { model: 'balanced', maxTokens: 2048 }
      );

      await storage.putJSON(`users/${userId}/salary/research-${Date.now()}.json`, {
        action,
        jobTitle,
        company,
        location,
        yearsExp: expYears,
        result,
        generatedAt: new Date().toISOString(),
      });

      return successResponse({ action, data: result });
    }

    // action === 'negotiate'
    if (!currentOffer) {
      return errorResponse(
        'currentOffer is required for the negotiate action.',
        400,
        'MISSING_CURRENT_OFFER'
      );
    }

    const negotiateSystemPrompt = `You are a seasoned career coach and salary negotiation expert who has coached thousands of professionals at top tech companies including FAANG, unicorn startups, and established enterprises. You give direct, actionable negotiation advice grounded in real-world outcomes.`;

    const negotiateUserPrompt = `Create a salary negotiation strategy for:
Role: ${jobTitle}
Company: ${company}
Location: ${location}
Years of Experience: ${expYears}
Current Offer: $${currentOffer.toLocaleString()}
${skillsSummary ? `Candidate Skills: ${skillsSummary}` : ''}

Return a JSON object with:
- recommended_counter: specific dollar amount to counter-offer (integer, USD base salary)
- counter_range: { aggressive (10-15% above offer), moderate (5-10% above), conservative (2-5% above) }
- negotiation_script: a natural, confident verbal script for the phone negotiation (2-4 paragraphs, ready to read aloud)
- email_template: polished negotiation email with subject line embedded at the top (ready to send)
- phone_script: a shorter script specifically for a phone/Zoom call negotiation
- key_tactics: 5-7 specific, actionable negotiation tactics tailored to this company/role
- what_to_avoid: 5-6 specific mistakes that candidates make with this company or in this context
- alternative_benefits: 6-8 specific non-salary items to negotiate if base is fixed (include equity refresh, signing bonus, PTO, WFH stipend, learning budget, title upgrade — be company-specific)
- negotiation_timeline: advice on timing (when to respond, how long to take)
- expected_outcome: realistic prediction of negotiation result based on this company's known practices`;

    const result = await aiClient.completeJSON(
      negotiateSystemPrompt,
      negotiateUserPrompt,
      negotiateSchema,
      { model: 'balanced', maxTokens: 4096 }
    );

    await storage.putJSON(`users/${userId}/salary/negotiate-${Date.now()}.json`, {
      action,
      jobTitle,
      company,
      location,
      yearsExp: expYears,
      currentOffer,
      result,
      generatedAt: new Date().toISOString(),
    });

    logger.info({ userId, action }, 'Salary result generated');

    return successResponse({ action, data: result });
  } catch (error) {
    logger.error({ error }, 'Salary API error');
    return handleError(error);
  }
}
