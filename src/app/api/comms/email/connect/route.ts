import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { GmailClient } from '@/services/comms/gmail-client';
import { logger } from '@/lib/logger';

/**
 * GET /api/comms/email/connect
 * Returns Gmail OAuth authorization URL
 */
export async function GET(request: NextRequest) {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      return errorResponse('Gmail OAuth not configured. Please set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI environment variables.', 500);
    }

    const gmailClient = new GmailClient({
      clientId,
      clientSecret,
      redirectUri,
    });

    const authUrl = gmailClient.getAuthUrl();

    logger.info('Generated Gmail OAuth URL');

    return successResponse({ authUrl });
  } catch (error) {
    logger.error({ error }, 'Failed to generate Gmail OAuth URL');
    return errorResponse('Failed to generate Gmail authorization URL', 500);
  }
}
