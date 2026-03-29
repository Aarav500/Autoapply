import { storage } from '@/lib/storage';
import { generateId } from '@/lib/utils';
import type { UserSettings, Notification, NotificationPriority } from '@/types/notifications';

export class NotificationManager {
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

    // 2. Create notification record (always in-app)
    const notif: Notification = {
      id: generateId(),
      userId,
      type: notification.type as Notification['type'],
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

    // 3. Save notification to S3
    await storage.updateJSON<{ notifications: Notification[] }>(
      `users/${userId}/notifications/index.json`,
      (current: { notifications?: Notification[] } | null) => ({
        notifications: [...(current?.notifications || []), notif],
      })
    );
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

    notifications.sort((a: Notification, b: Notification) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

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
