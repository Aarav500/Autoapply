import { NextRequest } from 'next/server';
import { successResponse, errorResponse, authenticate, handleError } from '@/lib/api-utils';
import { storage } from '@/lib/storage';
import { decrypt } from '@/lib/encryption';
import { logger } from '@/lib/logger';

interface UserSettings {
  googleRefreshToken?: string;
}

interface GmailAttachmentResponse {
  size?: number;
  data?: string;
}

interface TokenResponse {
  access_token?: string;
}

/**
 * GET /api/comms/email/attachment?emailId=X&attachmentId=Y
 * Fetches a Gmail attachment and returns it as base64-encoded data.
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await authenticate(request);

    const { searchParams } = new URL(request.url);
    const emailId = searchParams.get('emailId');
    const attachmentId = searchParams.get('attachmentId');
    const mimeType = searchParams.get('mimeType') || 'application/octet-stream';

    if (!emailId || !attachmentId) {
      return errorResponse('emailId and attachmentId query parameters are required', 400);
    }

    const settings = await storage.getJSON<UserSettings>(`users/${userId}/settings.json`);

    if (!settings?.googleRefreshToken) {
      return errorResponse('Gmail not connected. Please connect your Gmail account first.', 400);
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return errorResponse('Gmail OAuth not configured.', 500);
    }

    // Exchange refresh token for access token
    const refreshToken = decrypt(settings.googleRefreshToken);
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!tokenRes.ok) {
      return errorResponse('Failed to authenticate with Gmail. Please reconnect your account.', 401);
    }

    const tokenData = (await tokenRes.json()) as TokenResponse;
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return errorResponse('Failed to obtain Gmail access token.', 401);
    }

    // Fetch attachment from Gmail API
    const attachmentUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(emailId)}/attachments/${encodeURIComponent(attachmentId)}`;

    const attachmentRes = await fetch(attachmentUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!attachmentRes.ok) {
      const errText = await attachmentRes.text();
      logger.error({ emailId, attachmentId, status: attachmentRes.status, errText }, 'Gmail attachment fetch failed');
      return errorResponse('Failed to fetch attachment from Gmail.', attachmentRes.status);
    }

    const attachmentData = (await attachmentRes.json()) as GmailAttachmentResponse;

    if (!attachmentData.data) {
      return errorResponse('Attachment data is empty.', 404);
    }

    // Gmail returns base64url encoded data — convert to standard base64
    const base64Data = attachmentData.data.replace(/-/g, '+').replace(/_/g, '/');

    logger.info({ userId, emailId, attachmentId }, 'Attachment fetched successfully');

    return successResponse({
      data: base64Data,
      mimeType,
      size: attachmentData.size || 0,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch email attachment');
    return handleError(error);
  }
}
