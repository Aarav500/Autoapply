import { NextRequest } from 'next/server';
import { apiResponse, apiError, authenticate, handleError } from '@/lib/api-utils';
import { searchEngine } from '@/services/jobs/search-engine';
import { AuthError } from '@/lib/errors';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate
    const { userId } = await authenticate(req);

    const { id: jobId } = await params;

    // Get current job
    const job = await searchEngine.getJob(userId, jobId);

    if (!job) {
      return apiError(new Error('Job not found'), 404);
    }

    // Toggle saved status
    const newStatus = job.status === 'saved' ? 'discovered' : 'saved';
    const updatedJob = await searchEngine.updateJobStatus(
      userId,
      jobId,
      newStatus
    );

    return apiResponse({ job: updatedJob, saved: newStatus === 'saved' });
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error, 401);
    }
    return handleError(error);
  }
}
