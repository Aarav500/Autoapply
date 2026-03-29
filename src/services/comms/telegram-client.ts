/**
 * Telegram Bot API client — free replacement for Twilio SMS/WhatsApp.
 * Features: inline keyboard buttons, rich Markdown formatting, no per-message cost.
 *
 * Setup:
 *  1. Create a bot via @BotFather → get TELEGRAM_BOT_TOKEN
 *  2. Register webhook:
 *     POST https://api.telegram.org/bot{TOKEN}/setWebhook
 *     { url: "https://yourdomain.com/api/comms/webhook/telegram", secret_token: TELEGRAM_WEBHOOK_SECRET }
 *  3. Users link their account by sending /link CODE to the bot
 */

const TELEGRAM_API = 'https://api.telegram.org';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InlineKeyboardButton {
  text: string;
  callback_data: string;
}

export interface TelegramSendResult {
  success: boolean;
  messageId?: number;
  error?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: { id: number; first_name: string; username?: string };
    chat: { id: number; type: string };
    text?: string;
    date: number;
  };
  callback_query?: {
    id: string;
    from: { id: number; first_name: string; username?: string };
    message?: { message_id: number; chat: { id: number } };
    data?: string;
  };
}

export interface ParsedTelegramAction {
  action: 'confirm' | 'reschedule' | 'skip' | 'link' | 'start' | 'unknown';
  linkCode?: string;
  raw: string;
}

// ─── Client ───────────────────────────────────────────────────────────────────

export class TelegramClient {
  private token: string | null;

  constructor() {
    this.token = process.env.TELEGRAM_BOT_TOKEN || null;
  }

  isConfigured(): boolean {
    return !!this.token;
  }

  private get apiBase(): string {
    return `${TELEGRAM_API}/bot${this.token}`;
  }

  async sendMessage(
    chatId: number | string,
    text: string,
    keyboard?: InlineKeyboardButton[][]
  ): Promise<TelegramSendResult> {
    if (!this.isConfigured()) return { success: false, error: 'Telegram bot not configured' };

    try {
      const body: Record<string, unknown> = {
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
      };
      if (keyboard && keyboard.length > 0) {
        body.reply_markup = { inline_keyboard: keyboard };
      }

      const res = await fetch(`${this.apiBase}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = await res.json() as { ok: boolean; result?: { message_id: number }; description?: string };
      if (!json.ok) return { success: false, error: json.description || 'Telegram API error' };
      return { success: true, messageId: json.result?.message_id };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Send failed' };
    }
  }

  async answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void> {
    if (!this.isConfigured()) return;
    await fetch(`${this.apiBase}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
    }).catch(() => undefined);
  }

  // ─── Pre-formatted notifications ────────────────────────────────────────────

  formatInterviewNotification(data: {
    company: string;
    role: string;
    date: string;
    time: string;
    link?: string;
  }): { text: string; keyboard: InlineKeyboardButton[][] } {
    const text = [
      `🎯 *Interview Alert!*`,
      ``,
      `*Company:* ${data.company}`,
      `*Role:* ${data.role}`,
      `*Date:* ${data.date}`,
      `*Time:* ${data.time}`,
      data.link ? `*Link:* ${data.link}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const keyboard: InlineKeyboardButton[][] = [
      [
        { text: '✅ Confirm', callback_data: 'confirm' },
        { text: '🔄 Reschedule', callback_data: 'reschedule' },
      ],
    ];

    return { text, keyboard };
  }

  formatJobMatchNotification(data: {
    title: string;
    company: string;
    score: number;
    salary?: string;
  }): { text: string; keyboard: InlineKeyboardButton[][] } {
    const text = [
      `🔥 *High Match Job!*`,
      ``,
      `*${data.title}* at ${data.company}`,
      `Match: ${data.score}%`,
      data.salary ? `Salary: ${data.salary}` : '',
      ``,
      `Auto\\-applying in 1 hour\\.`,
    ]
      .filter(Boolean)
      .join('\n');

    const keyboard: InlineKeyboardButton[][] = [
      [{ text: '⏭ Skip — Don\'t Apply', callback_data: 'skip' }],
    ];

    return { text, keyboard };
  }

  formatDailyDigest(data: {
    newJobs: number;
    applied: number;
    responses: number;
    interviews: number;
  }): { text: string } {
    const text = [
      `📊 *Daily Digest*`,
      ``,
      `🔍 New matches: *${data.newJobs}*`,
      `📤 Applied today: *${data.applied}*`,
      `💬 Responses: *${data.responses}*`,
      `📅 Upcoming interviews: *${data.interviews}*`,
    ].join('\n');

    return { text };
  }

  // ─── Parse inbound text commands ────────────────────────────────────────────

  static parseInbound(text: string): ParsedTelegramAction {
    const trimmed = text.trim();

    // /link CODE
    const linkMatch = trimmed.match(/^\/link\s+([A-Z0-9]{6})$/i);
    if (linkMatch) return { action: 'link', linkCode: linkMatch[1].toUpperCase(), raw: text };

    if (trimmed === '/start') return { action: 'start', raw: text };

    return { action: 'unknown', raw: text };
  }

  // Parse callback_query data (button presses)
  static parseCallback(data: string): ParsedTelegramAction {
    if (data === 'confirm') return { action: 'confirm', raw: data };
    if (data === 'reschedule') return { action: 'reschedule', raw: data };
    if (data === 'skip') return { action: 'skip', raw: data };
    return { action: 'unknown', raw: data };
  }
}

export const telegramClient = new TelegramClient();
