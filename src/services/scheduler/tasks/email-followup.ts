/**
 * Email follow-up task — runs every 6 hours.
 * For each user who has Gmail connected, checks for "waiting" threads
 * that haven't had a reply in FOLLOW_UP_DAYS days and sends a polite follow-up.
 */

import { storage } from '@/lib/storage';
import { aiClient } from '@/lib/ai-client';
import { z } from 'zod';
import type { EmailIndexEntry } from '@/types/comms';

const FOLLOW_UP_DAYS = 7; // days before sending a follow-up
const MAX_FOLLOW_UPS = 2; // maximum follow-ups per thread

const FollowUpSchema = z.object({
  subject: z.string(),
  body: z.string(),
});

export async function runEmailFollowupTask(): Promise<{ processed: number; sent: number }> {
  let processed = 0;
  let sent = 0;

  try {
    // Get all users who have Gmail connected
    const userKeys = await storage.listKeys('users/').catch(() => [] as string[]);
    const userIds = [...new Set(
      userKeys
        .filter((k) => k.match(/^users\/[^/]+\/settings\.json$/))
        .map((k) => k.split('/')[1])
    )];

    for (const userId of userIds) {
      try {
        const settings = await storage.getJSON<Record<string, unknown>>(`users/${userId}/settings.json`);
        if (!settings?.googleRefreshToken) continue; // no Gmail

        const result = await processUserFollowups(userId);
        processed += result.processed;
        sent += result.sent;
      } catch {
        // Continue with next user on error
      }
    }
  } catch (error) {
    console.error('[email-followup] task error:', error);
  }

  return { processed, sent };
}

async function processUserFollowups(userId: string): Promise<{ processed: number; sent: number }> {
  let processed = 0;
  let sent = 0;

  const raw = await storage.getJSON<unknown>(`users/${userId}/emails/index.json`).catch(() => null);
  const emails: EmailIndexEntry[] = Array.isArray(raw) ? raw : [];

  const now = Date.now();
  const cutoff = FOLLOW_UP_DAYS * 24 * 60 * 60 * 1000;

  // Find emails that need follow-up:
  // - category: recruiter_outreach or action_required
  // - isJobRelated: true
  // - received more than FOLLOW_UP_DAYS ago
  // - not already followed up (tracked in follow-up metadata)
  const candidates = emails.filter((e) => {
    if (!e.isJobRelated) return false;
    if (!['recruiter_outreach', 'action_required'].includes(e.category || '')) return false;
    const age = now - new Date(e.receivedAt).getTime();
    return age >= cutoff;
  });

  for (const email of candidates.slice(0, 5)) { // cap at 5 per run per user
    processed++;
    try {
      // Check follow-up history
      const followupKey = `users/${userId}/emails/followups/${email.threadId}.json`;
      const followupHistory = await storage.getJSON<{ count: number; lastSentAt: string }>(followupKey).catch(() => null);

      if (followupHistory && followupHistory.count >= MAX_FOLLOW_UPS) continue;

      // Check that last follow-up was at least FOLLOW_UP_DAYS ago
      if (followupHistory?.lastSentAt) {
        const daysSinceLast = (now - new Date(followupHistory.lastSentAt).getTime()) / (24 * 60 * 60 * 1000);
        if (daysSinceLast < FOLLOW_UP_DAYS) continue;
      }

      // Generate follow-up email via AI
      const followUp = await aiClient.completeJSON(
        `You are a professional job seeker writing polite follow-up emails. Write concise, professional follow-ups.
         Return JSON with "subject" and "body" fields only. Body should be 2-3 sentences max.`,
        `Generate a follow-up email for this context:
         Original subject: "${email.subject}"
         From: ${email.from}
         Received: ${email.receivedAt} (${FOLLOW_UP_DAYS}+ days ago, no reply yet)

         The follow-up should be polite, brief, and reiterate interest. Do not be pushy.`,
        FollowUpSchema,
        { model: 'fast' }
      );

      // Store the follow-up for the user to review/send (don't auto-send without review)
      const pendingFollowupKey = `users/${userId}/emails/pending-followups/${email.id}.json`;
      await storage.putJSON(pendingFollowupKey, {
        originalEmailId: email.id,
        threadId: email.threadId,
        to: email.from,
        subject: followUp.subject,
        body: followUp.body,
        generatedAt: new Date().toISOString(),
        status: 'pending', // user must approve before sending
      });

      // Record that we generated a follow-up
      await storage.putJSON(followupKey, {
        count: (followupHistory?.count || 0) + 1,
        lastSentAt: new Date().toISOString(),
      });

      sent++;
    } catch {
      // Continue with next email
    }
  }

  return { processed, sent };
}
