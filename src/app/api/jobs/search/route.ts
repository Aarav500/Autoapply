import { NextRequest } from 'next/server';
import { apiResponse, apiError, authenticate, handleError, errorResponse } from '@/lib/api-utils';
import { searchEngine } from '@/services/jobs/search-engine';
import { storage } from '@/lib/storage';
import { aiClient } from '@/lib/ai-client';
import { AuthError } from '@/lib/errors';
import { z } from 'zod';
import type { ScoredJob } from '@/types/job';
import type { Profile } from '@/types/profile';

const SearchQuerySchema = z.object({
  keywords: z.array(z.string()).optional(),
  location: z.string().optional(),
  remote: z.boolean().optional(),
  minSalary: z.number().optional(),
  maxSalary: z.number().optional(),
  jobTypes: z
    .array(z.enum(['full-time', 'part-time', 'contract', 'internship', 'co-op', 'on-campus', 'work-study', 'fellowship', 'apprenticeship']))
    .optional(),
  experienceLevel: z
    .array(z.enum(['entry-level', 'internship', 'student', 'junior', 'mid', 'senior']))
    .optional(),
  excludeCompanies: z.array(z.string()).optional(),
});

/**
 * Generate a "why you should apply" one-sentence insight for a single job.
 * Returns empty string on failure — never throws.
 */
async function generateWhyApply(
  profile: Profile,
  job: ScoredJob
): Promise<string> {
  try {
    const profileSummary = [
      profile.headline ?? '',
      profile.skills?.slice(0, 8).map((s) => s.name).join(', ') ?? '',
    ]
      .filter(Boolean)
      .join(' — ');

    const topMatchingSkills = profile.skills
      ?.filter((s) => {
        const text = `${job.title} ${job.description} ${(job.tags ?? []).join(' ')}`.toLowerCase();
        return text.includes(s.name.toLowerCase());
      })
      .slice(0, 3)
      .map((s) => s.name)
      .join(', ') ?? '';

    const insight = await aiClient.complete(
      'You are a career coach. In ONE sentence (max 15 words), explain why this specific candidate should apply to this job based on their profile match.',
      `Candidate: ${profileSummary}\nJob: ${job.title} at ${job.company}\nMatch score: ${job.matchScore}/100\nKey match: ${topMatchingSkills || 'general fit'}`,
      { model: 'fast', maxTokens: 60 }
    );

    // Trim and cap to a single sentence
    return insight.trim().split('\n')[0].slice(0, 120);
  } catch {
    return '';
  }
}

export async function POST(req: NextRequest) {
  try {
    // Authenticate
    const { userId } = await authenticate(req);

    // Parse and validate request body
    const body = await req.json();
    const validation = SearchQuerySchema.safeParse(body);

    if (!validation.success) {
      return errorResponse('Invalid search query', 400, 'VALIDATION_ERROR');
    }

    const query = validation.data;

    // Execute search
    const result = await searchEngine.searchJobs(userId, query);

    // ── Fetch existing tracked jobs to mark duplicates ────────────────────────
    const existingJobsData = await storage
      .getJSON<unknown>(`users/${userId}/jobs/index.json`)
      .catch(() => null);
    const existingJobs = Array.isArray(existingJobsData)
      ? (existingJobsData as Array<{ externalId?: string; id?: string }>)
      : ((existingJobsData as { jobs?: Array<{ externalId?: string; id?: string }> } | null)
          ?.jobs || []);

    const existingExternalIds = new Set(
      existingJobs
        .map((j) => j.externalId || j.id)
        .filter(Boolean)
    );

    // Mark already-tracked jobs (don't remove them — let the UI decide)
    const enrichedJobs = result.jobs.map((job) => ({
      ...job,
      alreadyTracked:
        existingExternalIds.has(job.externalId) || existingExternalIds.has(job.jobId),
    }));

    // ── AI "why apply" insights for top 5 results ─────────────────────────────
    const profile = await storage
      .getJSON<Profile>(`users/${userId}/profile.json`)
      .catch(() => null);

    if (profile && enrichedJobs.length > 0) {
      const top5 = enrichedJobs.slice(0, 5);
      const insightResults = await Promise.allSettled(
        top5.map((job) => generateWhyApply(profile, job))
      );
      insightResults.forEach((result, idx) => {
        if (result.status === 'fulfilled' && result.value) {
          enrichedJobs[idx] = { ...enrichedJobs[idx], whyApply: result.value };
        }
      });
    }

    // ── Save search to history for analytics ─────────────────────────────────
    const searchHistoryKey = `users/${userId}/jobs/search-history.json`;
    const searchHistoryRaw = await storage
      .getJSON<Array<{ query: unknown; count: number; searchedAt: string }>>(searchHistoryKey)
      .catch(() => []);
    const historyArr = Array.isArray(searchHistoryRaw) ? searchHistoryRaw : [];
    historyArr.unshift({
      query: body,
      count: enrichedJobs.length,
      searchedAt: new Date().toISOString(),
    });
    if (historyArr.length > 50) historyArr.length = 50;
    // Fire-and-forget — never let history errors fail the response
    storage.putJSON(searchHistoryKey, historyArr).catch(() => {});

    return apiResponse({ ...result, jobs: enrichedJobs });
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error, 401);
    }
    return handleError(error);
  }
}
