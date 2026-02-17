import { NextRequest } from 'next/server';
import { apiResponse, apiError } from '@/lib/api-utils';
import { authenticate, handleError } from '@/lib/api-utils';
import { storage } from '@/lib/storage';
import { NotificationPreferencesUpdateSchema, type UserSettings } from '@/types/notifications';

/**
 * GET /api/comms/notifications/preferences
 * Get notification preferences
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);
    

    
    const settings = await storage.getJSON<UserSettings>(`users/${userId}/settings.json`);

    if (!settings) {
      return apiResponse({
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
      });
    }

    return apiResponse({
      notificationPreferences: settings.notificationPreferences,
      quietHoursStart: settings.quietHoursStart,
      quietHoursEnd: settings.quietHoursEnd,
      timezone: settings.timezone,
    });
  } catch (error) {
    return handleError(error);
  }
}

/**
 * PUT /api/comms/notifications/preferences
 * Update notification preferences
 */
export async function PUT(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);
    

    const body = await req.json();
    const parsed = NotificationPreferencesUpdateSchema.safeParse(body);
    if (!parsed.success) {
      throw new Error('Invalid request data');
    }

    
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

    // Update preferences
    settings.notificationPreferences = {
      ...settings.notificationPreferences,
      ...parsed.data,
    };
    settings.updatedAt = new Date().toISOString();

    await storage.putJSON(`users/${userId}/settings.json`, settings);

    return apiResponse({
      notificationPreferences: settings.notificationPreferences,
    });
  } catch (error) {
    return handleError(error);
  }
}
