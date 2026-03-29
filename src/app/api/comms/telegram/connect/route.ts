import { NextRequest } from 'next/server';
import { authenticate, successResponse, handleError } from '@/lib/api-utils';
import { storage } from '@/lib/storage';

/**
 * POST /api/comms/telegram/connect
 * Generate a 6-character link code that the user sends to the bot as /link CODE.
 * Code expires in 10 minutes.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);

    // Generate a 6-character alphanumeric code (uppercase, no ambiguous chars)
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    await storage.putJSON(`comms/telegram-link/${code}.json`, {
      userId,
      code,
      expiresAt,
      createdAt: new Date().toISOString(),
    });

    const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'YourAutoApplyBot';

    return successResponse({
      code,
      expiresAt,
      botUrl: `https://t.me/${botUsername}`,
      instruction: `Open @${botUsername} on Telegram and send: /link ${code}`,
    });
  } catch (error) {
    return handleError(error);
  }
}

/**
 * GET /api/comms/telegram/connect
 * Check if the current user has Telegram linked.
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);
    const settings = await storage.getJSON<Record<string, unknown>>(`users/${userId}/settings.json`).catch(() => null);

    const isLinked = !!(settings?.telegramChatId && settings?.telegramEnabled);
    const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'YourAutoApplyBot';
    const isServerConfigured = !!process.env.TELEGRAM_BOT_TOKEN;

    return successResponse({
      isLinked,
      isServerConfigured,
      botUsername,
    });
  } catch (error) {
    return handleError(error);
  }
}

/**
 * DELETE /api/comms/telegram/connect
 * Unlink Telegram from the current user's account.
 */
export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);

    await storage.updateJSON<Record<string, unknown>>(
      `users/${userId}/settings.json`,
      (s) => {
        const updated = { ...s };
        delete updated.telegramChatId;
        updated.telegramEnabled = false;
        return updated;
      }
    );

    return successResponse({ unlinked: true });
  } catch (error) {
    return handleError(error);
  }
}
