import sgMail from '@sendgrid/mail';

// ============================================
// SENDGRID CONFIGURATION
// ============================================

const apiKey = process.env.SENDGRID_API_KEY;
const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@autoapply.com';

// Initialize SendGrid client
if (apiKey) {
  sgMail.setApiKey(apiKey);
}

// ============================================
// CONFIGURATION HELPERS
// ============================================

export function isSendGridConfigured(): boolean {
  return !!(apiKey && fromEmail);
}

function validateConfiguration(): void {
  if (!apiKey) {
    throw new Error('SendGrid API key not configured. Set SENDGRID_API_KEY environment variable.');
  }
  if (!fromEmail) {
    throw new Error('SendGrid from email not configured. Set SENDGRID_FROM_EMAIL environment variable.');
  }
}

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: EmailAttachment[];
  headers?: Record<string, string>;
  categories?: string[];
  sendAt?: number; // Unix timestamp for scheduled sending
}

export interface EmailAttachment {
  content: string; // Base64 encoded content
  filename: string;
  type?: string; // MIME type
  disposition?: 'attachment' | 'inline';
  contentId?: string; // For inline images
}

export interface TemplatedEmailOptions {
  to: string | string[];
  templateId: string;
  dynamicTemplateData?: Record<string, unknown>;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  categories?: string[];
  sendAt?: number;
}

export interface BulkEmailOptions {
  personalizations: {
    to: string | string[];
    cc?: string | string[];
    bcc?: string | string[];
    subject?: string;
    dynamicTemplateData?: Record<string, unknown>;
  }[];
  subject?: string;
  text?: string;
  html?: string;
  templateId?: string;
  categories?: string[];
  sendAt?: number;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  statusCode?: number;
}

export interface BulkEmailResult {
  success: boolean;
  totalSent: number;
  errors: { recipient: string; error: string }[];
  messageId?: string;
}

// ============================================
// EMAIL SENDING FUNCTIONS
// ============================================

/**
 * Send a single email
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  try {
    validateConfiguration();

    // Validate required fields
    if (!options.to) {
      throw new Error('Recipient email address is required');
    }
    if (!options.subject) {
      throw new Error('Email subject is required');
    }
    if (!options.text && !options.html) {
      throw new Error('Email content (text or html) is required');
    }

    // Build mail data with required content
    const msg = {
      to: options.to,
      from: fromEmail,
      subject: options.subject,
      text: options.text || '',
      html: options.html || options.text || '',
      ...(options.replyTo && { replyTo: options.replyTo }),
      ...(options.cc && { cc: options.cc }),
      ...(options.bcc && { bcc: options.bcc }),
      ...(options.attachments && {
        attachments: options.attachments.map(att => ({
          content: att.content,
          filename: att.filename,
          type: att.type,
          disposition: att.disposition || 'attachment' as const,
          ...(att.contentId && { contentId: att.contentId }),
        })),
      }),
      ...(options.headers && { headers: options.headers }),
      ...(options.categories && { categories: options.categories }),
      ...(options.sendAt && { sendAt: options.sendAt }),
    };

    const response = await sgMail.send(msg);

    return {
      success: true,
      messageId: response[0].headers['x-message-id'],
      statusCode: response[0].statusCode,
    };
  } catch (error) {
    console.error('SendGrid email error:', error);

    const sgError = error as { response?: { body?: { errors?: { message: string }[] } }; code?: number };
    const errorMessage =
      sgError.response?.body?.errors?.[0]?.message ||
      (error instanceof Error ? error.message : 'Failed to send email');

    return {
      success: false,
      error: errorMessage,
      statusCode: sgError.code,
    };
  }
}

/**
 * Send a templated email using SendGrid Dynamic Templates
 */
export async function sendTemplatedEmail(options: TemplatedEmailOptions): Promise<EmailResult> {
  try {
    validateConfiguration();

    if (!options.to) {
      throw new Error('Recipient email address is required');
    }
    if (!options.templateId) {
      throw new Error('Template ID is required');
    }

    const msg: sgMail.MailDataRequired = {
      to: options.to,
      from: fromEmail,
      templateId: options.templateId,
      ...(options.dynamicTemplateData && { dynamicTemplateData: options.dynamicTemplateData }),
      ...(options.replyTo && { replyTo: options.replyTo }),
      ...(options.cc && { cc: options.cc }),
      ...(options.bcc && { bcc: options.bcc }),
      ...(options.categories && { categories: options.categories }),
      ...(options.sendAt && { sendAt: options.sendAt }),
    };

    const response = await sgMail.send(msg);

    return {
      success: true,
      messageId: response[0].headers['x-message-id'],
      statusCode: response[0].statusCode,
    };
  } catch (error) {
    console.error('SendGrid templated email error:', error);

    const sgError = error as { response?: { body?: { errors?: { message: string }[] } }; code?: number };
    const errorMessage =
      sgError.response?.body?.errors?.[0]?.message ||
      (error instanceof Error ? error.message : 'Failed to send templated email');

    return {
      success: false,
      error: errorMessage,
      statusCode: sgError.code,
    };
  }
}

/**
 * Send bulk emails with personalization
 */
export async function sendBulkEmail(options: BulkEmailOptions): Promise<BulkEmailResult> {
  try {
    validateConfiguration();

    if (!options.personalizations || options.personalizations.length === 0) {
      throw new Error('At least one personalization is required');
    }

    // Validate content
    if (!options.templateId && !options.text && !options.html) {
      throw new Error('Either templateId or email content (text/html) is required');
    }

    // SendGrid allows up to 1000 personalizations per request
    const MAX_BATCH_SIZE = 1000;
    const batches: typeof options.personalizations[] = [];

    for (let i = 0; i < options.personalizations.length; i += MAX_BATCH_SIZE) {
      batches.push(options.personalizations.slice(i, i + MAX_BATCH_SIZE));
    }

    const errors: { recipient: string; error: string }[] = [];
    let totalSent = 0;
    let messageId: string | undefined;

    for (const batch of batches) {
      try {
        // Build message - must have either text/html or templateId
        const msg = {
          from: fromEmail,
          personalizations: batch.map(p => ({
            to: Array.isArray(p.to) ? p.to.map(email => ({ email })) : [{ email: p.to }],
            ...(p.cc && {
              cc: Array.isArray(p.cc) ? p.cc.map(email => ({ email })) : [{ email: p.cc }],
            }),
            ...(p.bcc && {
              bcc: Array.isArray(p.bcc) ? p.bcc.map(email => ({ email })) : [{ email: p.bcc }],
            }),
            ...(p.subject && { subject: p.subject }),
            ...(p.dynamicTemplateData && { dynamicTemplateData: p.dynamicTemplateData }),
          })),
          subject: options.subject || 'No Subject',
          text: options.text || ' ',
          html: options.html || options.text || ' ',
          ...(options.templateId && { templateId: options.templateId }),
          ...(options.categories && { categories: options.categories }),
          ...(options.sendAt && { sendAt: options.sendAt }),
        };

        const response = await sgMail.send(msg);
        totalSent += batch.length;
        messageId = response[0].headers['x-message-id'];
      } catch (batchError) {
        console.error('Batch send error:', batchError);

        // Add errors for all recipients in failed batch
        for (const p of batch) {
          const recipients = Array.isArray(p.to) ? p.to : [p.to];
          for (const recipient of recipients) {
            errors.push({
              recipient,
              error: batchError instanceof Error ? batchError.message : 'Batch send failed',
            });
          }
        }
      }
    }

    return {
      success: errors.length === 0,
      totalSent,
      errors,
      messageId,
    };
  } catch (error) {
    console.error('SendGrid bulk email error:', error);

    return {
      success: false,
      totalSent: 0,
      errors: [
        {
          recipient: 'all',
          error: error instanceof Error ? error.message : 'Failed to send bulk email',
        },
      ],
    };
  }
}

// ============================================
// APPLICATION-SPECIFIC EMAIL FUNCTIONS
// ============================================

/**
 * Send application confirmation email
 */
export async function sendApplicationConfirmation(
  to: string,
  data: {
    applicantName: string;
    jobTitle: string;
    company: string;
    applicationDate: string;
    jobUrl?: string;
  }
): Promise<EmailResult> {
  const subject = `Application Confirmed: ${data.jobTitle} at ${data.company}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Application Submitted Successfully!</h2>
      <p>Hi ${data.applicantName},</p>
      <p>Your application has been successfully submitted:</p>
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>Position:</strong> ${data.jobTitle}</p>
        <p style="margin: 5px 0;"><strong>Company:</strong> ${data.company}</p>
        <p style="margin: 5px 0;"><strong>Date:</strong> ${data.applicationDate}</p>
      </div>
      ${data.jobUrl ? `<p><a href="${data.jobUrl}" style="color: #2563eb;">View Job Posting</a></p>` : ''}
      <p>We'll notify you of any updates to your application status.</p>
      <p>Good luck!</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
      <p style="color: #6b7280; font-size: 12px;">This email was sent by AutoApply</p>
    </div>
  `;

  return sendEmail({
    to,
    subject,
    html,
    categories: ['application-confirmation'],
  });
}

/**
 * Send interview reminder email
 */
export async function sendInterviewReminder(
  to: string,
  data: {
    applicantName: string;
    jobTitle: string;
    company: string;
    interviewDate: string;
    interviewTime: string;
    interviewType: string;
    meetingLink?: string;
    location?: string;
    interviewers?: string[];
    prepTips?: string[];
  }
): Promise<EmailResult> {
  const subject = `Interview Reminder: ${data.jobTitle} at ${data.company}`;

  let locationInfo = '';
  if (data.meetingLink) {
    locationInfo = `<p style="margin: 5px 0;"><strong>Meeting Link:</strong> <a href="${data.meetingLink}">${data.meetingLink}</a></p>`;
  } else if (data.location) {
    locationInfo = `<p style="margin: 5px 0;"><strong>Location:</strong> ${data.location}</p>`;
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Interview Reminder</h2>
      <p>Hi ${data.applicantName},</p>
      <p>This is a reminder about your upcoming interview:</p>
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>Position:</strong> ${data.jobTitle}</p>
        <p style="margin: 5px 0;"><strong>Company:</strong> ${data.company}</p>
        <p style="margin: 5px 0;"><strong>Date:</strong> ${data.interviewDate}</p>
        <p style="margin: 5px 0;"><strong>Time:</strong> ${data.interviewTime}</p>
        <p style="margin: 5px 0;"><strong>Type:</strong> ${data.interviewType}</p>
        ${locationInfo}
        ${data.interviewers ? `<p style="margin: 5px 0;"><strong>Interviewers:</strong> ${data.interviewers.join(', ')}</p>` : ''}
      </div>
      ${data.prepTips && data.prepTips.length > 0 ? `
        <h3 style="color: #374151;">Preparation Tips</h3>
        <ul>
          ${data.prepTips.map(tip => `<li>${tip}</li>`).join('')}
        </ul>
      ` : ''}
      <p>Good luck with your interview!</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
      <p style="color: #6b7280; font-size: 12px;">This email was sent by AutoApply</p>
    </div>
  `;

  return sendEmail({
    to,
    subject,
    html,
    categories: ['interview-reminder'],
  });
}

/**
 * Send weekly digest email
 */
export async function sendWeeklyDigest(
  to: string,
  data: {
    applicantName: string;
    weekStartDate: string;
    weekEndDate: string;
    newJobMatches: number;
    applicationsSubmitted: number;
    interviewsScheduled: number;
    upcomingInterviews: { jobTitle: string; company: string; date: string }[];
    topMatches: { jobTitle: string; company: string; matchScore: number }[];
  }
): Promise<EmailResult> {
  const subject = `Your Weekly Job Hunt Summary (${data.weekStartDate} - ${data.weekEndDate})`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Weekly Job Hunt Summary</h2>
      <p>Hi ${data.applicantName},</p>
      <p>Here's your activity from ${data.weekStartDate} to ${data.weekEndDate}:</p>

      <div style="display: flex; gap: 20px; margin: 20px 0;">
        <div style="background: #dbeafe; padding: 15px; border-radius: 8px; text-align: center; flex: 1;">
          <p style="font-size: 24px; font-weight: bold; color: #2563eb; margin: 0;">${data.newJobMatches}</p>
          <p style="margin: 5px 0 0 0; color: #374151;">New Matches</p>
        </div>
        <div style="background: #dcfce7; padding: 15px; border-radius: 8px; text-align: center; flex: 1;">
          <p style="font-size: 24px; font-weight: bold; color: #16a34a; margin: 0;">${data.applicationsSubmitted}</p>
          <p style="margin: 5px 0 0 0; color: #374151;">Applications</p>
        </div>
        <div style="background: #fef3c7; padding: 15px; border-radius: 8px; text-align: center; flex: 1;">
          <p style="font-size: 24px; font-weight: bold; color: #d97706; margin: 0;">${data.interviewsScheduled}</p>
          <p style="margin: 5px 0 0 0; color: #374151;">Interviews</p>
        </div>
      </div>

      ${data.upcomingInterviews.length > 0 ? `
        <h3 style="color: #374151;">Upcoming Interviews</h3>
        <ul>
          ${data.upcomingInterviews.map(i => `<li><strong>${i.jobTitle}</strong> at ${i.company} - ${i.date}</li>`).join('')}
        </ul>
      ` : ''}

      ${data.topMatches.length > 0 ? `
        <h3 style="color: #374151;">Top Job Matches</h3>
        <ul>
          ${data.topMatches.map(m => `<li><strong>${m.jobTitle}</strong> at ${m.company} (${m.matchScore}% match)</li>`).join('')}
        </ul>
      ` : ''}

      <p style="margin-top: 20px;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://autoapply.com'}/dashboard"
           style="background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">
          View Dashboard
        </a>
      </p>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
      <p style="color: #6b7280; font-size: 12px;">This email was sent by AutoApply</p>
    </div>
  `;

  return sendEmail({
    to,
    subject,
    html,
    categories: ['weekly-digest'],
  });
}

/**
 * Send notification digest (aggregated notifications)
 */
export async function sendNotificationDigest(
  to: string,
  data: {
    applicantName: string;
    notifications: {
      type: string;
      title: string;
      message: string;
      timestamp: string;
    }[];
  }
): Promise<EmailResult> {
  const subject = `You have ${data.notifications.length} new notification${data.notifications.length > 1 ? 's' : ''}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Notification Summary</h2>
      <p>Hi ${data.applicantName},</p>
      <p>Here's what you missed:</p>

      ${data.notifications.map(n => `
        <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 10px 0; border-left: 4px solid #2563eb;">
          <p style="font-weight: bold; margin: 0 0 5px 0;">${n.title}</p>
          <p style="margin: 0; color: #374151;">${n.message}</p>
          <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 12px;">${n.timestamp}</p>
        </div>
      `).join('')}

      <p style="margin-top: 20px;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://autoapply.com'}/dashboard"
           style="background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">
          View All in Dashboard
        </a>
      </p>

      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
      <p style="color: #6b7280; font-size: 12px;">This email was sent by AutoApply</p>
    </div>
  `;

  return sendEmail({
    to,
    subject,
    html,
    categories: ['notification-digest'],
  });
}
