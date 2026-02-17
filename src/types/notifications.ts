/**
 * Notification type definitions and Zod schemas
 */

import { z } from 'zod';

// ==================== Enums ====================

export const NotificationPriority = z.enum(['critical', 'high', 'medium', 'low']);
export type NotificationPriority = z.infer<typeof NotificationPriority>;

export const NotificationType = z.enum([
  'interview_detected',
  'interview_confirmed',
  'interview_reminder',
  'thank_you_ready',
  'job_match',
  'application_sent',
  'email_response',
  'daily_digest',
  'system',
]);
export type NotificationType = z.infer<typeof NotificationType>;

export const NotificationChannel = z.enum(['in_app', 'sms', 'whatsapp', 'email']);
export type NotificationChannel = z.infer<typeof NotificationChannel>;

// ==================== Notification Schema ====================

export const NotificationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: NotificationType,
  title: z.string(),
  message: z.string(),
  channel: z.string(), // comma-separated list of channels
  priority: NotificationPriority,
  read: z.boolean(),
  sent: z.boolean(),
  sentAt: z.string().nullable(),
  data: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string(),
});
export type Notification = z.infer<typeof NotificationSchema>;

// ==================== Notification Preferences ====================

export const NotificationPreferencesSchema = z.object({
  smsEnabled: z.boolean().default(false),
  whatsappEnabled: z.boolean().default(false),
  emailDigestEnabled: z.boolean().default(true),
  inAppEnabled: z.boolean().default(true),
  interviewReminders: z.boolean().default(true),
  jobMatchAlerts: z.boolean().default(true),
  applicationUpdates: z.boolean().default(true),
  dailyDigest: z.boolean().default(true),
  dailyDigestTime: z.string().default('09:00'), // HH:MM format
});
export type NotificationPreferences = z.infer<typeof NotificationPreferencesSchema>;

export const NotificationPreferencesUpdateSchema = NotificationPreferencesSchema.partial();
export type NotificationPreferencesUpdate = z.infer<typeof NotificationPreferencesUpdateSchema>;

// ==================== User Settings Extensions ====================

export const UserSettingsSchema = z.object({
  userId: z.string(),
  twilioConfigured: z.boolean().default(false),
  phoneNumber: z.string().nullable().optional(),
  whatsappEnabled: z.boolean().default(false),
  googleCalendarToken: z.string().nullable().optional(), // encrypted
  googleRefreshToken: z.string().nullable().optional(), // encrypted Gmail refresh token
  autoReplyEnabled: z.boolean().default(false),
  autoReplyRules: z.record(z.string(), z.unknown()).default({}),
  lastEmailSync: z.string().nullable().optional(), // ISO timestamp
  lastDigestSentAt: z.string().nullable().optional(), // ISO timestamp
  autoSearchEnabled: z.boolean().default(false),
  searchConfigurations: z.array(z.unknown()).default([]), // JobSearchQuery configs
  autoApplyRules: z.record(z.string(), z.unknown()).nullable().optional(),
  notificationPreferences: NotificationPreferencesSchema.default(() => ({
    smsEnabled: false,
    whatsappEnabled: false,
    emailDigestEnabled: true,
    inAppEnabled: true,
    interviewReminders: true,
    jobMatchAlerts: true,
    applicationUpdates: true,
    dailyDigest: true,
    dailyDigestTime: '09:00',
  })),
  quietHoursStart: z.string().nullable().optional(), // HH:MM format
  quietHoursEnd: z.string().nullable().optional(), // HH:MM format
  timezone: z.string().default('UTC'),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type UserSettings = z.infer<typeof UserSettingsSchema>;

export const UserSettingsUpdateSchema = z.object({
  phoneNumber: z.string().optional(),
  whatsappEnabled: z.boolean().optional(),
  quietHoursStart: z.string().optional(),
  quietHoursEnd: z.string().optional(),
  timezone: z.string().optional(),
});
export type UserSettingsUpdate = z.infer<typeof UserSettingsUpdateSchema>;

// ==================== Request/Response Schemas ====================

export const MarkNotificationsReadSchema = z.object({
  ids: z.array(z.string()),
});
export type MarkNotificationsReadRequest = z.infer<typeof MarkNotificationsReadSchema>;

export const ConfigureSMSSchema = z.object({
  phoneNumber: z.string(),
  enabled: z.boolean(),
});
export type ConfigureSMSRequest = z.infer<typeof ConfigureSMSSchema>;

export const ConfigureWhatsAppSchema = z.object({
  phoneNumber: z.string(),
  enabled: z.boolean(),
});
export type ConfigureWhatsAppRequest = z.infer<typeof ConfigureWhatsAppSchema>;
