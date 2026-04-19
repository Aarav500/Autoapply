import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticate, successResponse, handleError } from '@/lib/api-utils';
import { aiClient } from '@/lib/ai-client';
import { storage } from '@/lib/storage';
import { logger } from '@/lib/logger';

// ─── Input Schema ──────────────────────────────────────────────────────────────

const inputSchema = z.object({
  company: z.string().min(1),
  role: z.string().optional(),
});

// ─── AI Output Schema ──────────────────────────────────────────────────────────

const deepDiveSchema = z.object({
  company_overview: z.object({
    founded: z.string(),
    headquarters: z.string(),
    size: z.string(),
    stage: z.enum(['startup', 'growth', 'public', 'enterprise', 'big-tech']),
    business_model: z.string(),
    key_products: z.array(z.string()),
    mission: z.string(),
    competitive_moat: z.string(),
  }),

  financial_health: z.object({
    status: z.enum(['profitable', 'growing', 'burning', 'declining', 'unknown']),
    funding: z.string(),
    valuation: z.string().optional(),
    revenue_signals: z.string(),
    layoff_history: z.string(),
    job_security_rating: z.number().min(1).max(10),
  }),

  leadership: z.array(z.object({
    name: z.string(),
    role: z.string(),
    background: z.string(),
    reputation: z.string(),
    signal: z.enum(['positive', 'neutral', 'mixed', 'concerning']),
  })).max(4),

  culture: z.object({
    work_life_balance: z.number().min(1).max(10),
    eng_culture: z.string(),
    diversity_inclusion: z.string(),
    remote_policy: z.string(),
    growth_opportunities: z.string(),
    known_positives: z.array(z.string()),
    known_negatives: z.array(z.string()),
  }),

  interview_process: z.object({
    typical_rounds: z.number(),
    process_overview: z.string(),
    stages: z.array(z.object({
      stage: z.string(),
      format: z.string(),
      what_they_assess: z.string(),
      tips: z.string(),
    })),
    avg_timeline: z.string(),
    difficulty: z.enum(['easy', 'moderate', 'hard', 'brutal']),
    known_questions: z.array(z.string()).max(5),
  }),

  glassdoor_sentiment: z.object({
    overall_score: z.number().min(1).max(5),
    ceo_approval: z.string(),
    recommend_to_friend: z.string(),
    common_praise: z.array(z.string()),
    common_complaints: z.array(z.string()),
    recent_trend: z.enum(['improving', 'stable', 'declining']),
  }),

  red_flags: z.array(z.object({
    flag: z.string(),
    severity: z.enum(['critical', 'high', 'medium', 'low']),
    context: z.string(),
  })),

  verdict: z.object({
    score: z.number().min(1).max(10),
    label: z.enum(['dream-company', 'solid-choice', 'proceed-with-caution', 'avoid']),
    summary: z.string(),
    best_for: z.string(),
    worst_for: z.string(),
  }),

  insider_tips: z.array(z.string()).max(6),
});

export type CompanyDeepDive = z.infer<typeof deepDiveSchema>;

// ─── Cached Index Entry ────────────────────────────────────────────────────────

interface ResearchIndexEntry {
  slug: string;
  company: string;
  verdict_score: number;
  verdict_label: string;
  stage: string;
  researched_at: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function toCompanySlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// ─── GET — return cached result or null ───────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { userId } = await authenticate(request);
    const url = new URL(request.url);
    const company = url.searchParams.get('company');

    // List all cached researches
    if (!company) {
      const indexKey = `users/${userId}/company-research/index.json`;
      const raw = await storage.getJSON<ResearchIndexEntry[] | { entries: ResearchIndexEntry[] }>(indexKey);
      const entries: ResearchIndexEntry[] = Array.isArray(raw) ? raw : raw?.entries || [];
      return successResponse({ entries });
    }

    const slug = toCompanySlug(company);
    const cacheKey = `users/${userId}/company-research/${slug}.json`;
    const cached = await storage.getJSON<CompanyDeepDive & { company: string; role?: string; researched_at: string }>(cacheKey);

    if (!cached) {
      return successResponse({ result: null });
    }

    logger.info({ userId, slug }, 'Returning cached company research');
    return successResponse({ result: cached });
  } catch (error) {
    logger.error({ error }, 'Company research GET error');
    return handleError(error);
  }
}

// ─── POST — research and cache ─────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const { userId } = await authenticate(request);
    const body = await request.json();
    const { company, role } = inputSchema.parse(body);

    const slug = toCompanySlug(company);
    const now = new Date().toISOString();

    logger.info({ userId, company, role }, 'Starting company deep dive research');

    const systemPrompt = `You are a former FAANG engineering director and tech industry insider with 20 years of experience. You have deep knowledge of company cultures, leadership quality, financial signals, and interview processes at hundreds of tech companies. You give honest, specific assessments that help candidates make informed decisions. Draw on publicly known information about the company — Glassdoor reviews, LinkedIn data, tech press coverage, Blind, engineering blogs, and your industry knowledge. Be direct, candid, and specific. Do not be vague or overly positive.`;

    const userPrompt = `Conduct a comprehensive deep-dive research report on **${company}**${role ? ` for a candidate targeting the **${role}** role` : ''}.

Return a complete JSON object matching this structure exactly:

{
  "company_overview": {
    "founded": "year or approximate period",
    "headquarters": "city, country",
    "size": "employee count range or description",
    "stage": one of ["startup", "growth", "public", "enterprise", "big-tech"],
    "business_model": "clear explanation of how they make money",
    "key_products": ["product1", "product2", ...],
    "mission": "their stated or effective mission",
    "competitive_moat": "what gives them durable competitive advantage"
  },
  "financial_health": {
    "status": one of ["profitable", "growing", "burning", "declining", "unknown"],
    "funding": "funding stage and amount if known",
    "valuation": "current valuation if known (optional)",
    "revenue_signals": "what signals tell us about revenue health",
    "layoff_history": "any notable layoffs, dates, scale",
    "job_security_rating": number 1-10 (10 = most secure)
  },
  "leadership": [
    {
      "name": "full name",
      "role": "title",
      "background": "career background in 1-2 sentences",
      "reputation": "honest assessment of their reputation in industry",
      "signal": one of ["positive", "neutral", "mixed", "concerning"]
    }
    // up to 4 key leaders
  ],
  "culture": {
    "work_life_balance": number 1-10,
    "eng_culture": "engineering culture description",
    "diversity_inclusion": "D&I reality check",
    "remote_policy": "current remote/hybrid/in-office policy",
    "growth_opportunities": "career growth potential description",
    "known_positives": ["positive1", "positive2", ...],
    "known_negatives": ["negative1", "negative2", ...]
  },
  "interview_process": {
    "typical_rounds": number,
    "process_overview": "brief summary of the overall process",
    "stages": [
      {
        "stage": "stage name",
        "format": "format description",
        "what_they_assess": "what they evaluate",
        "tips": "actionable tip for this stage"
      }
    ],
    "avg_timeline": "typical time from first contact to offer",
    "difficulty": one of ["easy", "moderate", "hard", "brutal"],
    "known_questions": ["question1", ...] // up to 5 commonly asked questions
  },
  "glassdoor_sentiment": {
    "overall_score": number 1.0-5.0,
    "ceo_approval": "percentage or qualitative rating",
    "recommend_to_friend": "percentage or qualitative description",
    "common_praise": ["praise1", "praise2", ...],
    "common_complaints": ["complaint1", "complaint2", ...],
    "recent_trend": one of ["improving", "stable", "declining"]
  },
  "red_flags": [
    {
      "flag": "short flag title",
      "severity": one of ["critical", "high", "medium", "low"],
      "context": "why this matters and what it means for a candidate"
    }
  ],
  "verdict": {
    "score": number 1-10 overall verdict score,
    "label": one of ["dream-company", "solid-choice", "proceed-with-caution", "avoid"],
    "summary": "2-3 sentence honest summary of whether to work here",
    "best_for": "what type of person or career stage thrives here",
    "worst_for": "what type of person should avoid this company"
  },
  "insider_tips": ["tip1", "tip2", ...] // up to 6 insider tips for candidates
}

Be specific and honest. If something is unknown, say so briefly rather than making it up. Use real signals from industry knowledge.`;

    const result = await aiClient.completeJSON(
      systemPrompt,
      userPrompt,
      deepDiveSchema,
      { model: 'powerful', maxTokens: 5000 }
    );

    // Persist result
    const cacheKey = `users/${userId}/company-research/${slug}.json`;
    const enrichedResult = { ...result, company, role: role ?? null, researched_at: now };
    await storage.putJSON(cacheKey, enrichedResult);

    // Update index
    const indexKey = `users/${userId}/company-research/index.json`;
    const rawIndex = await storage.getJSON<ResearchIndexEntry[] | { entries: ResearchIndexEntry[] }>(indexKey);
    const entries: ResearchIndexEntry[] = Array.isArray(rawIndex) ? rawIndex : rawIndex?.entries || [];

    const newEntry: ResearchIndexEntry = {
      slug,
      company,
      verdict_score: result.verdict.score,
      verdict_label: result.verdict.label,
      stage: result.company_overview.stage,
      researched_at: now,
    };

    const existingIdx = entries.findIndex(e => e.slug === slug);
    if (existingIdx >= 0) {
      entries[existingIdx] = newEntry;
    } else {
      entries.unshift(newEntry);
    }

    await storage.putJSON(indexKey, entries);

    logger.info({ userId, slug, score: result.verdict.score }, 'Company deep dive completed');

    return successResponse({ result: enrichedResult });
  } catch (error) {
    logger.error({ error }, 'Company research POST error');
    return handleError(error);
  }
}
