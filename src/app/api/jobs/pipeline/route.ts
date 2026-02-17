import { NextRequest } from 'next/server';
import { apiResponse, apiError, authenticate, handleError } from '@/lib/api-utils';
import { searchEngine } from '@/services/jobs/search-engine';
import { AuthError } from '@/lib/errors';
import { PipelineView, PipelineStatus } from '@/types/job';

export async function GET(req: NextRequest) {
  try {
    // Authenticate
    const { userId } = await authenticate(req);

    // Get all jobs
    const allJobs = await searchEngine.listJobs(userId);

    // Group by status
    const pipeline: PipelineView[] = [
      'discovered',
      'saved',
      'applying',
      'applied',
      'screening',
      'interview',
      'offer',
      'rejected',
    ].map((status) => {
      const jobs = allJobs.filter((job) => job.status === status);
      return {
        status: status as PipelineStatus,
        count: jobs.length,
        jobs,
      };
    });

    return apiResponse({ pipeline });
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error, 401);
    }
    return handleError(error);
  }
}
