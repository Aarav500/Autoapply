import { NextRequest } from 'next/server';
import { apiResponse, apiError, authenticate, handleError, errorResponse } from '@/lib/api-utils';
import { searchEngine } from '@/services/jobs/search-engine';
import { AuthError } from '@/lib/errors';
import { z } from 'zod';

const FilterSchema = z.object({
  status: z
    .enum([
      'discovered',
      'saved',
      'applying',
      'applied',
      'screening',
      'interview',
      'offer',
      'rejected',
    ])
    .optional(),
  minScore: z.number().optional(),
  platform: z.enum(['remoteok', 'hackernews', 'manual']).optional(),
});

export async function GET(req: NextRequest) {
  try {
    // Authenticate
    const { userId } = await authenticate(req);

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const filters = {
      status: searchParams.get('status') || undefined,
      minScore: searchParams.get('minScore')
        ? Number(searchParams.get('minScore'))
        : undefined,
      platform: searchParams.get('platform') || undefined,
    };

    const validation = FilterSchema.safeParse(filters);
    if (!validation.success) {
      return errorResponse('Invalid filters', 400, 'VALIDATION_ERROR');
    }

    // Get jobs
    const jobs = await searchEngine.listJobs(userId, validation.data);

    return apiResponse({ jobs, count: jobs.length });
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error, 401);
    }
    return handleError(error);
  }
}
