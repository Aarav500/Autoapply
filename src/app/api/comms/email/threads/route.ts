import { NextRequest } from 'next/server';
import { successResponse, handleError, authenticate } from '@/lib/api-utils';
import { EmailProcessor } from '@/services/comms/email-processor';
import { logger } from '@/lib/logger';

/**
 * GET /api/comms/email/threads
 * Get emails grouped by thread/company
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await authenticate(request);

    const processor = new EmailProcessor();
    const threads = await processor.getThreads(userId);

    return successResponse({ threads });
  } catch (error) {
    logger.error({ error }, 'Failed to get email threads');
    return handleError(error);
  }
}
