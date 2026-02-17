import { NextRequest } from 'next/server';
import { apiResponse, apiError } from '@/lib/api-utils';
import { authenticate, handleError } from '@/lib/api-utils';
import { storage } from '@/lib/storage';
import { ConfigureWhatsAppSchema, type UserSettings } from '@/types/notifications';
import { createPhoneMapping } from '@/app/api/comms/webhook/twilio/route';

/**
 * PUT /api/comms/whatsapp/configure
 * Configure WhatsApp notifications
 */
export async function PUT(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);
    

    const body = await req.json();
    const parsed = ConfigureWhatsAppSchema.safeParse(body);
    if (!parsed.success) {
      throw new Error('Invalid request data');
    }

    const { phoneNumber, enabled } = parsed.data;
    

    // Load or create settings
    let settings = await storage.getJSON<UserSettings>(`users/${userId}/settings.json`);
    if (!settings) {
      settings = {
        userId: userId,
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
          dailyDigestTime: '09:00'
        },
        quietHoursStart: null,
        quietHoursEnd: null,
        timezone: 'UTC',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    // Update settings
    settings.phoneNumber = phoneNumber;
    settings.whatsappEnabled = enabled;
    settings.notificationPreferences.whatsappEnabled = enabled;
    settings.updatedAt = new Date().toISOString();

    await storage.putJSON(`users/${userId}/settings.json`, settings);

    // Create phone mapping for webhook routing
    if (enabled) {
      await createPhoneMapping(phoneNumber, userId);
    }

    return apiResponse({
      configured: enabled,
      phoneNumber,
    });
  } catch (error) {
    return handleError(error);
  }
}
