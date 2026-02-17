import { NextRequest } from 'next/server';
import { apiResponse, apiError, authenticate, handleError } from '@/lib/api-utils';
import { AuthError } from '@/lib/errors';

/**
 * GET /api/comms/calendar/connect
 * Get Google Calendar OAuth URL
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.APP_URL}/api/auth/oauth/google/callback`;

    if (!clientId) {
      throw new Error('Google OAuth not configured');
    }

    // Build OAuth URL with calendar scopes
    const scopes = [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar.readonly',
    ];

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
      access_type: 'offline', // Request refresh token
      prompt: 'consent', // Force consent to get refresh token
      state: userId, // Pass userId to identify user in callback
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    return apiResponse({
      authUrl,
    });
  } catch (error) {
    return handleError(error);
  }
}
