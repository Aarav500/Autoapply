import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { encrypt } from '@/lib/encryption';
import type { UserSettings } from '@/types/notifications';
import { google } from 'googleapis';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/oauth/google/callback
 * Handle Google OAuth callback for Calendar integration
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state'); // userId
    const error = url.searchParams.get('error');

    if (error) {
      // User denied access
      return NextResponse.redirect(`${process.env.APP_URL}/settings?calendar_error=${error}`);
    }

    if (!code || !state) {
      return NextResponse.redirect(`${process.env.APP_URL}/settings?calendar_error=invalid_request`);
    }

    const userId = state;

    // Exchange code for tokens
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || `${process.env.APP_URL}/api/auth/oauth/google/callback`
    );

    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      return NextResponse.redirect(`${process.env.APP_URL}/settings?calendar_error=no_refresh_token`);
    }

    // Store encrypted refresh token in user settings
    
    let settings = await storage.getJSON<UserSettings>(`users/${userId}/settings.json`);

    if (!settings) {
      settings = {
        userId,
        twilioConfigured: false,
        phoneNumber: null,
        whatsappEnabled: false,
        googleCalendarToken: null,
        googleRefreshToken: null,
        autoReplyEnabled: false,
        autoReplyRules: {},
        lastEmailSync: null,
        autoSearchEnabled: false,
        searchConfigurations: [],
        notificationPreferences: {
          smsEnabled: false,
          whatsappEnabled: false,
          emailDigestEnabled: true,
          inAppEnabled: true,
          interviewReminders: true,
          jobMatchAlerts: true,
          applicationUpdates: true,
          dailyDigest: true,
          dailyDigestTime: '09:00',
        },
        quietHoursStart: null,
        quietHoursEnd: null,
        timezone: 'UTC',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    // Encrypt and store the refresh token
    settings.googleCalendarToken = encrypt(tokens.refresh_token);
    settings.updatedAt = new Date().toISOString();

    await storage.putJSON(`users/${userId}/settings.json`, settings);

    // Redirect to settings page with success message
    return NextResponse.redirect(`${process.env.APP_URL}/settings?calendar_connected=true`);
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    return NextResponse.redirect(`${process.env.APP_URL}/settings?calendar_error=server_error`);
  }
}
