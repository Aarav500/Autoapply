import { NextRequest } from 'next/server';
import { successResponse, errorResponse, authenticate, handleError } from '@/lib/api-utils';
import { EmailProcessor } from '@/services/comms/email-processor';
import { logger } from '@/lib/logger';

/**
 * POST /api/comms/email/sync
 * Trigger email sync and processing
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await authenticate(request);

    const processor = new EmailProcessor();
    const stats = await processor.processNewEmails(userId);

    logger.info({ userId, stats }, 'Email sync completed');

    return successResponse(stats);
  } catch (error: any) {
    logger.error({ error }, 'Email sync failed');
    return handleError(error);
  }
}
