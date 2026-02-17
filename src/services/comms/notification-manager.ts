import { storage } from '@/lib/storage';
import { generateId } from '@/lib/utils';
import { decrypt } from '@/lib/encryption';
import { SMSClient } from './sms-client';
import { WhatsAppClient } from './whatsapp-client';
import type { UserSettings, Notification, NotificationPriority } from '@/types/notifications';

export class NotificationManager {
  private smsClient: SMSClient;
  private whatsappClient: WhatsAppClient;

  constructor() {
    this.smsClient = new SMSClient();
    this.whatsappClient = new WhatsAppClient();
  }

  async send(userId: string, notification: {
    type: string;
    title: string;
    message: string;
    priority: NotificationPriority;
    data?: Record<string, unknown>;
  }): Promise<void> {
    // 1. Load user settings from S3
    const settings = await storage.getJSON<UserSettings>(`users/${userId}/settings.json`);
    if (!settings) return;

    // 2. Create notification record
    const notif: Notification = {
      id: generateId(),
      userId,
      type: notification.type as any,
      title: notification.title,
      message: notification.message,
      priority: notification.priority,
      channel: 'in_app',
      read: false,
      sent: false,
      sentAt: null,
      data: notification.data,
      createdAt: new Date().toISOString(),
    };

    // 3. Determine channels based on priority and preferences
    const channels: string[] = ['in_app']; // Always in-app

    const prefs = settings.notificationPreferences;
    const isQuietHours = this.checkQuietHours(settings.quietHoursStart, settings.quietHoursEnd, settings.timezone);

    if (notification.priority === 'critical') {
      // Critical: ALL channels, ignore quiet hours
      if (settings.phoneNumber && this.smsClient.isConfigured()) channels.push('sms');
      if (settings.whatsappEnabled && this.whatsappClient.isConfigured()) channels.push('whatsapp');
    } else if (notification.priority === 'high' && !isQuietHours) {
      if (prefs?.smsEnabled && settings.phoneNumber) channels.push('sms');
      if (prefs?.whatsappEnabled && settings.whatsappEnabled) channels.push('whatsapp');
    }
    // medium and low: in-app only (collected for daily digest)

    // 4. Send to each channel
    for (const channel of channels) {
      if (channel === 'sms' && settings.phoneNumber) {
        await this.smsClient.sendSMS(settings.phoneNumber, `${notification.title}\n${notification.message}`);
        notif.sent = true;
        notif.sentAt = new Date().toISOString();
      }
      if (channel === 'whatsapp' && settings.phoneNumber) {
        await this.whatsappClient.sendMessage(settings.phoneNumber, `*${notification.title}*\n${notification.message}`);
        notif.sent = true;
        notif.sentAt = new Date().toISOString();
      }
    }

    notif.channel = channels.join(',');

    // 5. Save notification to S3
    await storage.updateJSON<{ notifications: Notification[] }>(
      `users/${userId}/notifications/index.json`,
      (current: { notifications?: Notification[] } | null) => ({
        notifications: [...(current?.notifications || []), notif],
      })
    );
  }

  private checkQuietHours(start?: string | null, end?: string | null, timezone?: string): boolean {
    if (!start || !end) return false;
    // Parse HH:MM format, compare with current time in user's timezone
    // Return true if current time is within quiet hours
    const now = new Date();
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    const currentH = now.getHours();
    const currentM = now.getMinutes();
    const currentMinutes = currentH * 60 + currentM;
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (startMinutes <= endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    } else {
      // Overnight quiet hours (e.g., 22:00 - 07:00)
      return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    }
  }

  async getUnread(userId: string): Promise<number> {
    const data = await storage.getJSON<{ notifications: Notification[] }>(`users/${userId}/notifications/index.json`);
    if (!data) return 0;
    return data.notifications.filter((n: Notification) => !n.read).length;
  }

  async markAsRead(userId: string, notificationIds: string[]): Promise<void> {
    await storage.updateJSON<{ notifications: Notification[] }>(
      `users/${userId}/notifications/index.json`,
      (current: { notifications?: Notification[] } | null) => ({
        notifications: (current?.notifications || []).map((n: Notification) =>
          notificationIds.includes(n.id) ? { ...n, read: true } : n
        ),
      })
    );
  }

  async list(userId: string, options?: { unreadOnly?: boolean; limit?: number }): Promise<Notification[]> {
    const data = await storage.getJSON<{ notifications: Notification[] }>(`users/${userId}/notifications/index.json`);
    if (!data) return [];

    let notifications = data.notifications;

    if (options?.unreadOnly) {
      notifications = notifications.filter((n: Notification) => !n.read);
    }

    // Sort by creation date descending
    notifications.sort((a: Notification, b: Notification) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (options?.limit) {
      notifications = notifications.slice(0, options.limit);
    }

    return notifications;
  }
}

// Singleton
let _manager: NotificationManager | null = null;
export function getNotificationManager(): NotificationManager {
  if (!_manager) _manager = new NotificationManager();
  return _manager;
}
