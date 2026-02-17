import twilio from 'twilio';

export class WhatsAppClient {
  private client: twilio.Twilio | null = null;
  private fromNumber: string;

  constructor() {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    if (sid && token) this.client = twilio(sid, token);
    this.fromNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  async sendMessage(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.isConfigured()) return { success: false, error: 'Twilio WhatsApp not configured' };
    try {
      // WhatsApp numbers need "whatsapp:" prefix
      const toFormatted = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
      const result = await this.client!.messages.create({
        body: message,
        from: this.fromNumber,
        to: toFormatted,
      });
      return { success: true, messageId: result.sid };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'WhatsApp send failed' };
    }
  }

  // Richer formatting for WhatsApp (supports *bold*, _italic_)
  formatInterviewNotification(data: { company: string; role: string; date: string; time: string; link?: string; prepUrl?: string }): string {
    return [
      `🎯 *Interview Scheduled!*`,
      ``,
      `*Company:* ${data.company}`,
      `*Role:* ${data.role}`,
      `*Date:* ${data.date}`,
      `*Time:* ${data.time}`,
      data.link ? `*Meeting:* ${data.link}` : '',
      ``,
      data.prepUrl ? `📚 Prep materials: ${data.prepUrl}` : '',
      ``,
      `Reply *YES* to confirm or *RESCHEDULE* for alternatives.`,
    ].filter(Boolean).join('\n');
  }

  formatDailyDigest(data: { newJobs: number; applied: number; responses: number; interviews: number; topMatch?: { title: string; company: string; score: number } }): string {
    const lines = [
      `📊 *Your Daily Job Search Digest*`,
      ``,
      `🔍 New matches found: *${data.newJobs}*`,
      `📤 Applications sent: *${data.applied}*`,
      `📬 Responses received: *${data.responses}*`,
      `🎤 Upcoming interviews: *${data.interviews}*`,
    ];
    if (data.topMatch) {
      lines.push('', `⭐ *Top Match:* ${data.topMatch.title} at ${data.topMatch.company} (${data.topMatch.score}%)`);
    }
    return lines.join('\n');
  }
}
