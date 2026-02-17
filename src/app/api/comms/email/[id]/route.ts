import { NextRequest } from 'next/server';
import { successResponse, errorResponse, authenticate, handleError } from '@/lib/api-utils';
import { storage } from '@/lib/storage';
import { ProcessedEmail } from '@/types/comms';
import { logger } from '@/lib/logger';

/**
 * GET /api/comms/email/[id]
 * Get full email with AI analysis
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await authenticate(request);
    const { id } = await params;

    // Load email
    const emailKey = `users/${userId}/emails/${id}.json`;

    try {
      const email = await storage.getJSON<ProcessedEmail>(emailKey);

      return successResponse(email);
    } catch (error) {
      return errorResponse('Email not found', 404);
    }
  } catch (error) {
    logger.error({ error }, 'Failed to get email');

    return errorResponse('Failed to load email', 500);
  }
}
