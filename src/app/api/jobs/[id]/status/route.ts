import { NextRequest } from 'next/server';
import { apiResponse, apiError, authenticate, handleError, errorResponse } from '@/lib/api-utils';
import { searchEngine } from '@/services/jobs/search-engine';
import { AuthError } from '@/lib/errors';
import { z } from 'zod';

const StatusUpdateSchema = z.object({
  status: z.enum([
    'discovered',
    'saved',
    'applying',
    'applied',
    'screening',
    'interview',
    'offer',
    'rejected',
  ]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate
    const { userId } = await authenticate(req);

    const { id: jobId } = await params;

    // Parse and validate request body
    const body = await req.json();
    const validation = StatusUpdateSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse('Invalid status', 400, 'VALIDATION_ERROR');
    }

    // Update status
    const updatedJob = await searchEngine.updateJobStatus(
      userId,
      jobId,
      validation.data.status
    );

    return apiResponse(updatedJob);
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error, 401);
    }
    return handleError(error);
  }
}
