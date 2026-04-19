import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticate, handleError, successResponse } from '@/lib/api-utils';
import { storage } from '@/lib/storage';
import { aiClient } from '@/lib/ai-client';
import { logger } from '@/lib/logger';

const RequestSchema = z.object({
  domain: z.string().optional(),
  location: z.string().optional(),
  refresh: z.boolean().optional(),
});

const TrendsSchema = z.object({
  trending: z.array(z.object({
    skill: z.string(),
    category: z.string(),
    demandScore: z.number().min(0).max(100),
    growthPercent: z.number(),
    avgSalaryPremium: z.number(),
    topCompanies: z.array(z.string()),
    description: z.string(),
  })),
  declining: z.array(z.object({
    skill: z.string(),
    reason: z.string(),
    dropPercent: z.number(),
  })),
  emergingRoles: z.array(z.object({
    role: z.string(),
    salaryRange: z.string(),
    skills: z.array(z.string()),
    outlook: z.string(),
  })),
  marketInsight: z.string(),
  lastUpdated: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);
    const body = await req.json() as Record<string, unknown>;
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) return handleError(new Error(parsed.error.message));

    const { domain, location, refresh } = parsed.data;

    // Cache for 24h
    const cacheKey = `users/${userId}/trends/cache-${domain ?? 'all'}.json`;
    if (!refresh) {
      const cached = await storage.getJSON<{ data: unknown; cachedAt: string }>(cacheKey);
      if (cached?.cachedAt && (Date.now() - new Date(cached.cachedAt).getTime()) < 86400000) {
        return successResponse(cached.data);
      }
    }

    const profile = await storage.getJSON<{ skills?: Array<{ name: string }> }>(`users/${userId}/profile.json`);
    const userSkills = profile?.skills?.map((s) => s.name).slice(0, 15).join(', ') ?? '';

    const { system, user } = {
      system: `You are a tech industry analyst with access to current job market data.
Provide accurate, actionable insights on skill trends based on current hiring patterns. Return JSON matching the schema.`,
      user: `Domain: ${domain ?? 'Software Engineering / Tech'}
Location: ${location ?? 'Global / US'}
Candidate's current skills: ${userSkills || 'Not specified'}
Current date: ${new Date().toLocaleDateString()}

Analyze current job market trends and provide:
1. Top 10 trending skills with demand scores and salary premiums
2. Top 5 declining skills to be aware of
3. Top 5 emerging roles in the next 12 months
4. Overall market insight summary (2-3 sentences)

Base on real industry patterns from 2024-2025.`,
    };

    const result = await aiClient.completeJSON(system, user, TrendsSchema, { model: 'balanced' });

    await storage.putJSON(cacheKey, { data: result, cachedAt: new Date().toISOString() });

    logger.info({ userId, domain }, 'Trends analysis complete');
    return successResponse(result);
  } catch (error) {
    return handleError(error);
  }
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);
    const { searchParams } = new URL(req.url);
    const domain = searchParams.get('domain') ?? undefined;
    const cacheKey = `users/${userId}/trends/cache-${domain ?? 'all'}.json`;
    const cached = await storage.getJSON<{ data: unknown; cachedAt: string }>(cacheKey);
    if (cached?.data) return successResponse(cached.data);
    return successResponse(null);
  } catch (error) {
    return handleError(error);
  }
}
