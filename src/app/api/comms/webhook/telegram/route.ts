import { NextRequest } from 'next/server';
import { storage } from '@/lib/storage';
import { TelegramClient, type TelegramUpdate } from '@/services/comms/telegram-client';
import { InterviewScheduler } from '@/services/comms/interview-scheduler';
import type { Interview } from '@/types/interview';
import crypto from 'crypto';
import { createTelegramMapping } from '@/lib/comms-mappings';

/**
 * POST /api/comms/webhook/telegram
 * Handle incoming Telegram Bot updates (messages + inline button presses).
 * NO auth — validates X-Telegram-Bot-Api-Secret-Token header instead.
 */
export async function POST(req: NextRequest) {
  const client = new TelegramClient();

  try {
    // 1. Validate Telegram secret token
    const secret = req.headers.get('x-telegram-bot-api-secret-token');
    const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (expected && secret !== expected) {
      return new Response('Forbidden', { status: 403 });
    }

    const update = await req.json() as TelegramUpdate;

    // ── Handle inline button presses ────────────────────────────────────────
    if (update.callback_query) {
      const cq = update.callback_query;
      const chatId = cq.message?.chat.id;
      if (!chatId) return new Response('OK', { status: 200 });

      const userId = await lookupUserByChatId(chatId);
      if (!userId) {
        await client.answerCallbackQuery(cq.id, 'Account not linked. Send /link CODE to the bot first.');
        return new Response('OK', { status: 200 });
      }

      const parsed = TelegramClient.parseCallback(cq.data || '');
      let answerText = 'Done!';

      if (parsed.action === 'confirm') {
        const interview = await findPendingInterview(userId);
        if (interview && interview.proposedTimes.length > 0) {
          const scheduler = new InterviewScheduler();
          await scheduler.confirmInterview(userId, interview.id, new Date(interview.proposedTimes[0]));
          answerText = '✅ Interview confirmed!';
          await client.sendMessage(
            chatId,
            `✅ *Confirmed!*\nInterview with *${interview.company}* on ${new Date(interview.proposedTimes[0]).toLocaleDateString()}.`
          );
        } else {
          answerText = 'No pending interview found.';
        }
      } else if (parsed.action === 'reschedule') {
        answerText = 'Visit the app to reschedule.';
        await client.sendMessage(chatId, '🔄 Please visit AutoApply to pick a new time for your interview.');
      } else if (parsed.action === 'skip') {
        const skipped = await skipNextDiscoveredJob(userId);
        answerText = skipped ? '⏭ Job skipped.' : 'No pending jobs to skip.';
        await client.sendMessage(chatId, skipped ? "⏭ Got it — we won't auto\\-apply to that job\\." : '⚠️ No pending auto\\-apply jobs found\\.');
      }

      await client.answerCallbackQuery(cq.id, answerText);
      return new Response('OK', { status: 200 });
    }

    // ── Handle text messages ─────────────────────────────────────────────────
    if (update.message?.text) {
      const msg = update.message;
      const chatId = msg.chat.id;
      const text = msg.text ?? '';
      const parsed = TelegramClient.parseInbound(text);

      if (parsed.action === 'start') {
        await client.sendMessage(
          chatId,
          `👋 *Welcome to AutoApply Bot!*\n\nTo link your account:\n1. Open AutoApply → Settings → Integrations → Telegram\n2. Copy your 6-character code\n3. Send: \`/link YOURCODE\``
        );
        return new Response('OK', { status: 200 });
      }

      if (parsed.action === 'link' && parsed.linkCode) {
        const code = parsed.linkCode;
        const linkData = await storage
          .getJSON<{ userId: string; expiresAt: string }>(`comms/telegram-link/${code}.json`)
          .catch(() => null);

        if (!linkData) {
          await client.sendMessage(chatId, '❌ Invalid or expired code. Generate a new one in Settings.');
          return new Response('OK', { status: 200 });
        }

        if (new Date(linkData.expiresAt) < new Date()) {
          await storage.deleteJSON(`comms/telegram-link/${code}.json`).catch(() => undefined);
          await client.sendMessage(chatId, '⏰ Code expired. Generate a new one in Settings.');
          return new Response('OK', { status: 200 });
        }

        // Link the account: store chatId → userId mapping
        await createTelegramMapping(chatId, linkData.userId);
        // Store chatId in user settings
        await storage.updateJSON<Record<string, unknown>>(
          `users/${linkData.userId}/settings.json`,
          (s) => ({ ...(s || {}), telegramChatId: String(chatId), telegramEnabled: true })
        );
        // Clean up the link code
        await storage.deleteJSON(`comms/telegram-link/${code}.json`).catch(() => undefined);

        await client.sendMessage(
          chatId,
          `✅ *Account linked!*\n\nYou'll now receive job alerts, interview notifications, and daily digests here.\n\nYou can confirm interviews or skip auto-applies directly from these messages.`
        );
        return new Response('OK', { status: 200 });
      }

      // Unknown command
      const userId = await lookupUserByChatId(chatId);
      if (userId) {
        await client.sendMessage(
          chatId,
          "I didn't understand that\\. Use the buttons in notifications, or visit AutoApply\\."
        );
      } else {
        await client.sendMessage(
          chatId,
          '🔗 Your account isn\'t linked yet\\. Go to AutoApply → Settings → Integrations → Telegram to get your link code\\.'
        );
      }
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Telegram webhook error:', error);
    return new Response('OK', { status: 200 }); // Always 200 to prevent Telegram retry storms
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function lookupUserByChatId(chatId: number): Promise<string | null> {
  try {
    const hash = crypto.createHash('sha256').update(String(chatId)).digest('hex');
    const mapping = await storage.getJSON<{ userId: string }>(`comms/telegram-map/${hash}.json`);
    return mapping?.userId || null;
  } catch {
    return null;
  }
}

async function findPendingInterview(userId: string): Promise<Interview | null> {
  try {
    const index = await storage.getJSON<{ interviews: Array<{ id: string; status: string }> }>(
      `users/${userId}/interviews/index.json`
    );
    if (!index?.interviews) return null;
    const pending = index.interviews.find((i) => i.status === 'pending');
    if (!pending) return null;
    return await storage.getJSON<Interview>(`users/${userId}/interviews/${pending.id}.json`);
  } catch {
    return null;
  }
}

async function skipNextDiscoveredJob(userId: string): Promise<boolean> {
  try {
    const jobsIndex = await storage.getJSON<{ id: string; status: string }[]>(`users/${userId}/jobs/index.json`);
    const jobs = Array.isArray(jobsIndex) ? jobsIndex : [];
    const nextJob = jobs.find((j) => j.status === 'discovered');
    if (!nextJob) return false;

    const rejectedKey = `users/${userId}/jobs/rejected-ids.json`;
    const existing = await storage.getJSON<string[]>(rejectedKey).catch(() => null);
    const rejectedIds = Array.isArray(existing) ? existing : [];
    if (!rejectedIds.includes(nextJob.id)) {
      rejectedIds.push(nextJob.id);
      await storage.putJSON(rejectedKey, rejectedIds);
    }
    return true;
  } catch {
    return false;
  }
}
