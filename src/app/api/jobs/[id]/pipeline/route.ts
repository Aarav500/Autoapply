import { NextRequest } from 'next/server';
import { apiResponse, apiError, authenticate, handleError } from '@/lib/api-utils';
import { searchEngine } from '@/services/jobs/search-engine';
import { AuthError } from '@/lib/errors';

/**
 * POST /api/jobs/[id]/pipeline
 * Save a job to the user's pipeline (status = 'saved').
 * Returns { saved: true } if newly saved, or { saved: false, alreadySaved: true } if duplicate.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await authenticate(req);
    const { id: jobId } = await params;

    const job = await searchEngine.getJob(userId, jobId);

    if (!job) {
      return apiError(new Error('Job not found'), 404);
    }

    // If already saved (or further along in pipeline), report it
    const alreadyPipelined =
      job.status === 'saved' ||
      job.status === 'applying' ||
      job.status === 'applied' ||
      job.status === 'screening' ||
      job.status === 'interview' ||
      job.status === 'offer';

    if (alreadyPipelined) {
      return apiResponse({ saved: false, alreadySaved: true, status: job.status });
    }

    await searchEngine.updateJobStatus(userId, jobId, 'saved');

    return apiResponse({ saved: true, alreadySaved: false });
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error, 401);
    }
    return handleError(error);
  }
}
