import { NextRequest } from 'next/server';
import { successResponse, handleError } from '@/lib/api-utils';
import { authenticate } from '@/lib/api-utils';
import { storage } from '@/lib/storage';

/**
 * GET /api/settings/integrations
 * Check which integrations are configured (env vars present)
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);

    const settings = await storage.getJSON<Record<string, unknown>>(`users/${userId}/settings.json`);

    return successResponse({
      gmail: {
        serverConfigured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REDIRECT_URI),
        userConnected: !!settings?.googleRefreshToken,
      },
      calendar: {
        serverConfigured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
        userConnected: !!settings?.googleCalendarToken,
      },
      sms: {
        serverConfigured: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER),
        userConnected: !!settings?.twilioConfigured,
        phoneNumber: settings?.phoneNumber || null,
      },
      whatsapp: {
        serverConfigured: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_NUMBER),
        userConnected: !!settings?.whatsappEnabled,
        phoneNumber: settings?.phoneNumber || null,
      },
      autoReply: {
        enabled: !!settings?.autoReplyEnabled,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
