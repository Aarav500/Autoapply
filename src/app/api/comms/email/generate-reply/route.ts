import { NextRequest } from 'next/server';
import { successResponse, handleError, authenticate } from '@/lib/api-utils';
import { EmailProcessor } from '@/services/comms/email-processor';
import { GenerateReplyRequestSchema } from '@/types/comms';
import { logger } from '@/lib/logger';

/**
 * POST /api/comms/email/generate-reply
 * Generate AI reply without sending
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await authenticate(request);

    // Validate request body
    const body = await request.json();
    const { emailId } = GenerateReplyRequestSchema.parse(body);

    const processor = new EmailProcessor();
    const suggestedReply = await processor.generateReply(userId, emailId);

    return successResponse({ suggestedReply });
  } catch (error: any) {
    logger.error({ error }, 'Failed to generate reply');
    return handleError(error);
  }
}
