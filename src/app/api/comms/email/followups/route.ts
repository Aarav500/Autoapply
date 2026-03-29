import { NextRequest } from 'next/server';
import { authenticate, successResponse, errorResponse, handleError } from '@/lib/api-utils';
import { storage } from '@/lib/storage';
import { GmailClient } from '@/services/comms/gmail-client';
import { decrypt } from '@/lib/encryption';
import { z } from 'zod';

const ApproveSchema = z.object({
  followupId: z.string(),
});

/**
 * GET /api/comms/email/followups
 * List pending AI-generated follow-up emails awaiting user approval
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);
    const keys = await storage.listKeys(`users/${userId}/emails/pending-followups/`).catch(() => [] as string[]);

    const followups = await Promise.all(
      keys.map((k) => storage.getJSON<Record<string, unknown>>(k).catch(() => null))
    );

    return successResponse({
      followups: followups.filter(Boolean).filter((f) => (f as Record<string, unknown>)?.status === 'pending'),
      total: followups.filter(Boolean).length,
    });
  } catch (error) {
    return handleError(error);
  }
}

/**
 * POST /api/comms/email/followups
 * Approve and send a pending follow-up email via Gmail
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);
    const body = await req.json();
    const { followupId } = ApproveSchema.parse(body);

    const key = `users/${userId}/emails/pending-followups/${followupId}.json`;
    const followup = await storage.getJSON<Record<string, unknown>>(key);
    if (!followup) return errorResponse('Follow-up not found', 404);
    if (followup.status !== 'pending') return errorResponse('Follow-up already processed', 400);

    const settings = await storage.getJSON<Record<string, unknown>>(`users/${userId}/settings.json`);
    if (!settings?.googleRefreshToken) {
      return errorResponse('Gmail not connected', 400);
    }

    const gmailClient = new GmailClient({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      redirectUri: process.env.GOOGLE_REDIRECT_URI!,
    });
    gmailClient.setCredentials(decrypt(settings.googleRefreshToken as string));

    const messageId = await gmailClient.sendMessage(
      followup.to as string,
      followup.subject as string,
      followup.body as string,
      { threadId: followup.threadId as string | undefined }
    );

    await storage.updateJSON<Record<string, unknown>>(key, (f) => ({
      ...f,
      status: 'sent',
      sentAt: new Date().toISOString(),
      messageId,
    }));

    return successResponse({ sent: true, messageId });
  } catch (error) {
    return handleError(error);
  }
}

/**
 * DELETE /api/comms/email/followups
 * Dismiss a pending follow-up (mark as dismissed without sending)
 */
export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);
    const body = await req.json();
    const { followupId } = ApproveSchema.parse(body);

    const key = `users/${userId}/emails/pending-followups/${followupId}.json`;
    await storage.updateJSON<Record<string, unknown>>(key, (f) => ({ ...f, status: 'dismissed' }));

    return successResponse({ dismissed: true });
  } catch (error) {
    return handleError(error);
  }
}
