import { NextRequest } from 'next/server';
import { apiResponse, apiError, authenticate, handleError, errorResponse } from '@/lib/api-utils';
import { searchEngine } from '@/services/jobs/search-engine';
import { AuthError } from '@/lib/errors';
import { storage } from '@/lib/storage';
import { logger } from '@/lib/logger';
import { generatePrepPackage } from '@/services/interview/prep-package';
import type { Job, PipelineStatus } from '@/types/job';
import { z } from 'zod';
import { randomUUID } from 'crypto';

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

/**
 * Creates an interview record in S3 and then generates a prep package for it.
 * Called fire-and-forget when a job moves to screening or interview status.
 */
async function triggerInterviewPrep(
  userId: string,
  jobId: string,
  job: Job
): Promise<void> {
  try {
    // Load the interviews index
    const interviewsIndexKey = `users/${userId}/interviews/index.json`;
    let interviews: Array<{
      id: string;
      company: string;
      role: string;
      jobId: string;
      status: string;
      scheduledAt: string | null;
      createdAt: string;
    }> = [];

    try {
      const result = await storage.getJSON<typeof interviews>(interviewsIndexKey);
      interviews = result || [];
    } catch {
      // Index doesn't exist yet — first interview
    }

    // Skip if an interview record already exists for this job
    const alreadyExists = interviews.some((i) => i.jobId === jobId);
    if (alreadyExists) {
      logger.info({ userId, jobId }, 'Interview record already exists — skipping auto-prep trigger');
      return;
    }

    const interviewId = randomUUID();

    const newInterview = {
      id: interviewId,
      company: job.company,
      role: job.title,
      jobId,
      status: 'pending',
      scheduledAt: null,
      createdAt: new Date().toISOString(),
    };

    // Save interview record
    await storage.putJSON(`users/${userId}/interviews/${interviewId}.json`, newInterview);

    interviews.push(newInterview);
    await storage.putJSON(interviewsIndexKey, interviews);

    logger.info({ userId, jobId, interviewId }, 'Interview record created — generating prep package');

    // Generate prep package (this calls AI and can take a while — fire-and-forget is fine)
    await generatePrepPackage(userId, interviewId);

    logger.info({ userId, interviewId }, 'Interview prep package generated successfully');
  } catch (error) {
    logger.error({ userId, jobId, error }, 'Failed to auto-generate interview prep');
  }
}

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

    const newStatus: PipelineStatus = validation.data.status;

    // Update status
    const updatedJob = await searchEngine.updateJobStatus(
      userId,
      jobId,
      newStatus
    );

    // Auto-trigger interview prep in background when entering screening or interview stage
    if (newStatus === 'screening' || newStatus === 'interview') {
      void triggerInterviewPrep(userId, jobId, updatedJob as Job);
    }

    return apiResponse(updatedJob);
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error, 401);
    }
    return handleError(error);
  }
}
