import twilio from 'twilio';

// ============================================
// TWILIO CONFIGURATION
// ============================================

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

let twilioClient: twilio.Twilio | null = null;

// ============================================
// CLIENT INITIALIZATION
// ============================================

function getClient(): twilio.Twilio {
  if (!twilioClient) {
    if (!accountSid || !authToken) {
      throw new Error('Twilio credentials not configured. Required: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN');
    }
    twilioClient = twilio(accountSid, authToken);
  }
  return twilioClient;
}

export function isTwilioConfigured(): boolean {
  return !!(accountSid && authToken && (messagingServiceSid || twilioPhoneNumber));
}

// ============================================
// SMS FUNCTIONS
// ============================================

export interface SendSMSOptions {
  to: string;
  body: string;
  statusCallback?: string;
}

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
  errorCode?: string;
}

export async function sendSMS({ to, body, statusCallback }: SendSMSOptions): Promise<SMSResult> {
  try {
    if (!isTwilioConfigured()) {
      throw new Error('Twilio not configured. Required: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and either TWILIO_MESSAGING_SERVICE_SID or TWILIO_PHONE_NUMBER');
    }

    const client = getClient();

    // Format phone number (ensure E.164 format)
    const formattedTo = formatPhoneNumber(to);
    if (!formattedTo) {
      throw new Error(`Invalid phone number format: ${to}`);
    }

    // Validate message body
    if (!body || body.trim().length === 0) {
      throw new Error('Message body cannot be empty');
    }

    // Build message options - prefer Messaging Service SID if available
    const messageOptions: twilio.Twilio['messages']['create'] extends (opts: infer P) => unknown ? P : never = {
      body: body.slice(0, 1600), // SMS has 1600 char limit with concatenation
      to: formattedTo,
      ...(messagingServiceSid
        ? { messagingServiceSid }
        : { from: twilioPhoneNumber }),
      ...(statusCallback && { statusCallback }),
    };

    const message = await client.messages.create(messageOptions);

    return {
      success: true,
      messageId: message.sid,
    };
  } catch (error) {
    console.error('Error sending SMS:', error);

    // Extract Twilio error details if available
    const twilioError = error as { code?: number; message?: string };

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send SMS',
      errorCode: twilioError.code?.toString(),
    };
  }
}

// ============================================
// WHATSAPP FUNCTIONS
// ============================================

export interface SendWhatsAppOptions {
  to: string;
  body: string;
  mediaUrl?: string[];
  templateName?: string;
  templateVariables?: Record<string, string>;
}

export interface WhatsAppResult {
  success: boolean;
  messageId?: string;
  error?: string;
  errorCode?: string;
}

export async function sendWhatsApp({
  to,
  body,
  mediaUrl,
}: SendWhatsAppOptions): Promise<WhatsAppResult> {
  try {
    if (!isTwilioConfigured()) {
      throw new Error('Twilio not configured for WhatsApp');
    }

    const client = getClient();

    // Format phone number for WhatsApp
    const formattedTo = formatPhoneNumber(to);
    if (!formattedTo) {
      throw new Error(`Invalid phone number format: ${to}`);
    }

    // WhatsApp requires whatsapp: prefix
    const whatsappTo = `whatsapp:${formattedTo}`;

    // Determine from number - use messaging service or phone number
    const from = messagingServiceSid
      ? undefined
      : `whatsapp:${twilioPhoneNumber}`;

    const messageOptions: Parameters<typeof client.messages.create>[0] = {
      body,
      to: whatsappTo,
      ...(messagingServiceSid
        ? { messagingServiceSid }
        : { from }),
      ...(mediaUrl && mediaUrl.length > 0 && { mediaUrl }),
    };

    const message = await client.messages.create(messageOptions);

    return {
      success: true,
      messageId: message.sid,
    };
  } catch (error) {
    console.error('Error sending WhatsApp:', error);

    const twilioError = error as { code?: number; message?: string };

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send WhatsApp message',
      errorCode: twilioError.code?.toString(),
    };
  }
}

// ============================================
// PHONE NUMBER FORMATTING
// ============================================

function formatPhoneNumber(phone: string): string | null {
  if (!phone) return null;

  // Remove all non-digit characters except leading +
  let cleaned = phone.replace(/[^\d+]/g, '');

  // If starts with +, keep it
  if (cleaned.startsWith('+')) {
    // Validate E.164 format (+ followed by 10-15 digits)
    if (/^\+\d{10,15}$/.test(cleaned)) {
      return cleaned;
    }
  }

  // Remove any remaining + signs
  cleaned = cleaned.replace(/\+/g, '');

  // US/Canada numbers (10 digits)
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  }

  // Numbers with country code (11-15 digits)
  if (cleaned.length >= 11 && cleaned.length <= 15) {
    return `+${cleaned}`;
  }

  return null;
}

// ============================================
// NOTIFICATION TYPES
// ============================================

export type NotificationChannel = 'email' | 'sms' | 'whatsapp' | 'push';

export type NotificationType =
  | 'new_job_match'
  | 'application_status'
  | 'interview_scheduled'
  | 'interview_reminder'
  | 'email_received'
  | 'document_ready'
  | 'weekly_digest';

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  channels: NotificationChannel[];
  userId: string;
  phone?: string;
  email?: string;
}

export interface NotificationResult {
  channel: NotificationChannel;
  success: boolean;
  messageId?: string;
  error?: string;
}

// ============================================
// UNIFIED NOTIFICATION FUNCTION
// ============================================

export async function sendNotification(payload: NotificationPayload): Promise<{
  results: NotificationResult[];
}> {
  const results: NotificationResult[] = [];

  for (const channel of payload.channels) {
    switch (channel) {
      case 'sms':
        if (payload.phone) {
          const smsResult = await sendSMS({
            to: payload.phone,
            body: `${payload.title}\n\n${payload.message}`,
          });
          results.push({
            channel: 'sms',
            success: smsResult.success,
            messageId: smsResult.messageId,
            error: smsResult.error,
          });
        } else {
          results.push({
            channel: 'sms',
            success: false,
            error: 'Phone number not provided'
          });
        }
        break;

      case 'whatsapp':
        if (payload.phone) {
          const whatsappResult = await sendWhatsApp({
            to: payload.phone,
            body: `*${payload.title}*\n\n${payload.message}`,
          });
          results.push({
            channel: 'whatsapp',
            success: whatsappResult.success,
            messageId: whatsappResult.messageId,
            error: whatsappResult.error,
          });
        } else {
          results.push({
            channel: 'whatsapp',
            success: false,
            error: 'Phone number not provided'
          });
        }
        break;

      case 'email':
        // Email is handled by SendGrid integration
        results.push({
          channel: 'email',
          success: true,
          error: 'Email channel handled by SendGrid'
        });
        break;

      case 'push':
        // Push notifications would require web push or mobile integration
        results.push({
          channel: 'push',
          success: false,
          error: 'Push notifications not implemented'
        });
        break;
    }
  }

  return { results };
}

// ============================================
// NOTIFICATION TEMPLATES
// ============================================

export const notificationTemplates: Record<
  NotificationType,
  { title: string; template: (data: Record<string, unknown>) => string }
> = {
  new_job_match: {
    title: 'New Job Match Found!',
    template: (data) =>
      `We found a ${data.matchScore}% match: ${data.jobTitle} at ${data.company}. Check it out in your dashboard.`,
  },
  application_status: {
    title: 'Application Update',
    template: (data) =>
      `Your application for ${data.jobTitle} at ${data.company} has been updated to: ${data.status}.`,
  },
  interview_scheduled: {
    title: 'Interview Scheduled',
    template: (data) =>
      `Your interview for ${data.jobTitle} at ${data.company} is scheduled for ${data.date} at ${data.time}.`,
  },
  interview_reminder: {
    title: 'Interview Reminder',
    template: (data) =>
      `Reminder: Your interview for ${data.jobTitle} at ${data.company} is ${data.timeUntil}. Good luck!`,
  },
  email_received: {
    title: 'New Email from Recruiter',
    template: (data) =>
      `You received an email from ${data.sender} regarding ${data.subject}.`,
  },
  document_ready: {
    title: 'Document Ready',
    template: (data) =>
      `Your ${data.documentType} for ${data.jobTitle} has been generated and is ready for review.`,
  },
  weekly_digest: {
    title: 'Weekly Job Hunt Summary',
    template: (data) =>
      `This week: ${data.newMatches} new matches, ${data.applicationsSubmitted} applications, ${data.interviews} interviews scheduled.`,
  },
};

// ============================================
// HELPER FUNCTION TO CREATE NOTIFICATION
// ============================================

export function createNotificationFromTemplate(
  type: NotificationType,
  data: Record<string, unknown>,
  channels: NotificationChannel[],
  userId: string,
  contactInfo: { phone?: string; email?: string }
): NotificationPayload {
  const template = notificationTemplates[type];
  return {
    type,
    title: template.title,
    message: template.template(data),
    data,
    channels,
    userId,
    phone: contactInfo.phone,
    email: contactInfo.email,
  };
}
