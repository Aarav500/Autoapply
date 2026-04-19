import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticate, handleError, successResponse } from '@/lib/api-utils';
import { storage } from '@/lib/storage';
import { aiClient } from '@/lib/ai-client';
import { logger } from '@/lib/logger';
import type { Job } from '@/types/job';

const AnalyzeSchema = z.object({
  patterns: z.array(z.object({
    category: z.string(),
    count: z.number(),
    description: z.string(),
    examples: z.array(z.string()),
    recommendation: z.string(),
  })),
  topReason: z.string(),
  actionableInsights: z.array(z.string()),
  profileStrengths: z.array(z.string()),
  profileWeaknesses: z.array(z.string()),
  estimatedSuccessRateIncrease: z.number(),
});

export async function GET(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);

    const raw = await storage.getJSON<unknown>(`users/${userId}/jobs/index.json`);
    const jobs: Job[] = Array.isArray(raw)
      ? (raw as Job[])
      : ((raw as { jobs?: Job[] } | null)?.jobs ?? []);

    const rejected = jobs.filter((j) => j.status === 'rejected');

    if (rejected.length === 0) {
      return successResponse({
        patterns: [],
        topReason: 'No rejections yet',
        actionableInsights: ['Keep applying! You have no rejections to analyze.'],
        profileStrengths: [],
        profileWeaknesses: [],
        estimatedSuccessRateIncrease: 0,
        totalRejections: 0,
      });
    }

    // Build rejection summary for AI
    const rejectionSummary = rejected.map((j) => ({
      title: j.title,
      company: j.company,
      rejectionReason: (j as Job & { rejectionReason?: string }).rejectionReason ?? 'Unknown',
      appliedAt: j.appliedAt,
    }));

    const profile = await storage.getJSON<{ headline?: string; skills?: Array<{ name: string }> }>(`users/${userId}/profile.json`);

    const { system, user } = {
      system: `You are a career coach expert at identifying rejection patterns from job applications.
Analyze the rejection data and provide actionable insights. Return a JSON object matching the schema exactly.`,
      user: `Profile: ${JSON.stringify({ headline: profile?.headline, skills: profile?.skills?.slice(0, 10) })}

Rejection history (${rejected.length} rejections):
${JSON.stringify(rejectionSummary.slice(0, 30), null, 2)}

Identify patterns in why these applications failed and provide specific recommendations to improve success rate.`,
    };

    const analysis = await aiClient.completeJSON(system, user, AnalyzeSchema, { model: 'balanced' });

    logger.info({ userId, rejectionCount: rejected.length }, 'Rejection analysis complete');

    return successResponse({ ...analysis, totalRejections: rejected.length });
  } catch (error) {
    logger.error({ error }, 'Rejection analysis error');
    return handleError(error);
  }
}
