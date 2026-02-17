import twilio from 'twilio';

export class SMSClient {
  private client: twilio.Twilio | null = null;

  constructor() {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    if (sid && token) {
      this.client = twilio(sid, token);
    }
  }

  isConfigured(): boolean {
    return this.client !== null && !!process.env.TWILIO_PHONE_NUMBER;
  }

  async sendSMS(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.isConfigured()) return { success: false, error: 'Twilio not configured' };
    try {
      // Truncate message to 1600 chars (Twilio limit)
      // If longer, split into multiple messages
      const result = await this.client!.messages.create({
        body: message.slice(0, 1600),
        from: process.env.TWILIO_PHONE_NUMBER,
        to,
      });
      return { success: true, messageId: result.sid };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'SMS send failed' };
    }
  }

  // Pre-formatted notification messages
  formatInterviewNotification(data: { company: string; role: string; date: string; time: string; link?: string }): string {
    return [
      `🎯 Interview Alert!`,
      `Company: ${data.company}`,
      `Role: ${data.role}`,
      `Date: ${data.date}`,
      `Time: ${data.time}`,
      data.link ? `Link: ${data.link}` : '',
      ``,
      `Reply YES to confirm, RESCHEDULE for alternatives.`
    ].filter(Boolean).join('\n');
  }

  formatJobMatchNotification(data: { title: string; company: string; score: number; salary?: string }): string {
    return [
      `🔥 High Match Job!`,
      `${data.title} at ${data.company}`,
      `Match: ${data.score}%`,
      data.salary ? `Salary: ${data.salary}` : '',
      ``,
      `Auto-applying in 1 hour. Reply SKIP to cancel.`
    ].filter(Boolean).join('\n');
  }

  formatDailyDigest(data: { newJobs: number; applied: number; responses: number; interviews: number }): string {
    return [
      `📊 Daily Digest`,
      `New matches: ${data.newJobs}`,
      `Applied today: ${data.applied}`,
      `Responses: ${data.responses}`,
      `Upcoming interviews: ${data.interviews}`,
    ].join('\n');
  }

  // Handle inbound SMS (from Twilio webhook)
  static parseInbound(body: string): { action: 'confirm' | 'reschedule' | 'skip' | 'unknown'; raw: string } {
    const normalized = body.trim().toUpperCase();
    if (normalized === 'YES' || normalized === 'CONFIRM' || normalized === 'Y') return { action: 'confirm', raw: body };
    if (normalized === 'RESCHEDULE' || normalized === 'CHANGE') return { action: 'reschedule', raw: body };
    if (normalized === 'SKIP' || normalized === 'CANCEL' || normalized === 'NO' || normalized === 'N') return { action: 'skip', raw: body };
    return { action: 'unknown', raw: body };
  }
}
