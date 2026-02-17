import { NextRequest, NextResponse } from 'next/server';
import { GmailClient } from '@/services/comms/gmail-client';
import { storage } from '@/lib/storage';
import { encrypt } from '@/lib/encryption';
import { logger } from '@/lib/logger';
import { verifyAccessToken } from '@/services/auth/jwt';
import { cookies } from 'next/headers';

/**
 * GET /api/comms/email/callback
 * Handle Gmail OAuth callback
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.redirect(new URL('/comms?error=oauth_failed', request.url));
    }

    // Get user ID from auth token
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.redirect(new URL('/login?error=not_authenticated', request.url));
    }

    const payload = verifyAccessToken(token);
    const userId = payload.userId;

    // Exchange code for tokens
    const gmailClient = new GmailClient({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      redirectUri: process.env.GOOGLE_REDIRECT_URI!,
    });

    const tokens = await gmailClient.handleCallback(code);

    // Encrypt refresh token before storing
    const encryptedRefreshToken = encrypt(tokens.refreshToken);

    // Load existing settings
    const settingsKey = `users/${userId}/settings.json`;
    let settings: any = {};

    try {
      settings = await storage.getJSON(settingsKey);
    } catch (error) {
      // Settings don't exist yet
    }

    // Update settings with Gmail token
    settings.googleRefreshToken = encryptedRefreshToken;
    settings.autoReplyEnabled = settings.autoReplyEnabled || false;
    settings.autoReplyRules = settings.autoReplyRules || [];
    settings.lastEmailSync = undefined; // Will sync all emails on first sync

    await storage.putJSON(settingsKey, settings);

    logger.info({ userId }, 'Gmail OAuth successful');

    // Redirect to comms page with success message
    return NextResponse.redirect(new URL('/comms?connected=true', request.url));
  } catch (error) {
    logger.error({ error }, 'Gmail OAuth callback failed');
    return NextResponse.redirect(new URL('/comms?error=oauth_failed', request.url));
  }
}
