import { NextRequest, NextResponse } from 'next/server';
import { apiResponse, apiError, authenticate } from '@/lib/api-utils';
import { getAutoApplicant } from '@/services/jobs/auto-applicant';
import { logger } from '@/lib/logger';
import { z } from 'zod';

/**
 * POST /api/jobs/[id]/apply
 * Trigger auto-application for a job
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await authenticate(req);
    const { id: jobId } = await params;

    logger.info({ userId, jobId }, 'Auto-apply requested');

    const autoApplicant = getAutoApplicant();
    const result = await autoApplicant.applyToJob(userId, jobId);

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || 'Application failed',
        data: {
          applicationId: result.applicationId,
          method: result.method,
          screenshotKey: result.screenshotKey,
        },
      }, { status: 400 });
    }

    return apiResponse({
      success: true,
      data: {
        applicationId: result.applicationId,
        method: result.method,
        confirmationMessage: result.confirmationMessage,
        screenshotKey: result.screenshotKey,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Auto-apply endpoint error');
    return apiError(error);
  }
}
