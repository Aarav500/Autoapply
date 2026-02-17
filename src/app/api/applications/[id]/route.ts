import { NextRequest } from 'next/server';
import { apiResponse, apiError, authenticate } from '@/lib/api-utils';
import { storage } from '@/lib/storage';
import { logger } from '@/lib/logger';
import { NotFoundError } from '@/lib/errors';
import type { Application } from '@/types/application';

/**
 * GET /api/applications/[id]
 * Get full application details including presigned screenshot URL
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await authenticate(req);
    const { id: applicationId } = await params;

        const application = await storage.getJSON<Application>(
      `users/${userId}/applications/${applicationId}.json`
    );

    if (!application) {
      throw new NotFoundError('Application not found');
    }

    // Generate presigned URL for screenshot if exists
    let screenshotUrl: string | null = null;
    if (application.screenshotKey) {
      screenshotUrl = await storage.getPresignedUrl(application.screenshotKey, 3600); // 1 hour
    }

    logger.info({ userId, applicationId }, 'Application retrieved');

    return apiResponse({
      success: true,
      data: {
        application,
        screenshotUrl,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Get application error');
    return apiError(error);
  }
}

/**
 * DELETE /api/applications/[id]
 * Delete application (and screenshot from S3)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await authenticate(req);
    const { id: applicationId } = await params;

        const application = await storage.getJSON<Application>(
      `users/${userId}/applications/${applicationId}.json`
    );

    if (!application) {
      throw new NotFoundError('Application not found');
    }

    // Delete screenshot from S3 if exists
    if (application.screenshotKey) {
      try {
        await storage.deleteFile(application.screenshotKey);
      } catch (error) {
        logger.warn({ error, screenshotKey: application.screenshotKey }, 'Failed to delete screenshot');
      }
    }

    // Delete application file
    await storage.deleteFile(`users/${userId}/applications/${applicationId}.json`);

    // Remove from index
    await storage.updateJSON<{ applications: any[] }>(
      `users/${userId}/applications/index.json`,
      (current: { applications: any[] } | null) => ({
        applications: (current?.applications || []).filter((app: any) => app.id !== applicationId),
      })
    );

    logger.info({ userId, applicationId }, 'Application deleted');

    return apiResponse({
      success: true,
      data: { deleted: true },
    });
  } catch (error) {
    logger.error({ error }, 'Delete application error');
    return apiError(error);
  }
}
