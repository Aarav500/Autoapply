import { NextRequest } from 'next/server';
import { successResponse, errorResponse, authenticate, handleError } from '@/lib/api-utils';
import { GmailClient } from '@/services/comms/gmail-client';
import { storage } from '@/lib/storage';
import { decrypt } from '@/lib/encryption';
import { SendEmailRequestSchema } from '@/types/comms';
import { logger } from '@/lib/logger';

/**
 * POST /api/comms/email/send
 * Send email or reply
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await authenticate(request);

    // Validate request body
    const body = await request.json();
    const { to, subject, body: emailBody, threadId, inReplyTo } = SendEmailRequestSchema.parse(body);

    // Load user settings to get Gmail token
    const settingsKey = `users/${userId}/settings.json`;
    const settings = await storage.getJSON<any>(settingsKey);

    if (!settings?.googleRefreshToken) {
      return errorResponse('Gmail not connected. Please connect your Gmail account first.', 400);
    }

    // Initialize Gmail client
    const gmailClient = new GmailClient({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      redirectUri: process.env.GOOGLE_REDIRECT_URI!,
    });

    const refreshToken = decrypt(settings.googleRefreshToken);
    gmailClient.setCredentials(refreshToken);

    // Send message
    const messageId = await gmailClient.sendMessage(to, subject, emailBody, {
      threadId,
      inReplyTo,
    });

    logger.info({ userId, messageId, to, subject }, 'Email sent successfully');

    return successResponse({ messageId });
  } catch (error: any) {
    logger.error({ error }, 'Failed to send email');
    return handleError(error);
  }
}
