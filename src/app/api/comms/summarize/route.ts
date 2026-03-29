import { NextRequest } from 'next/server';
import { z } from 'zod';
import { successResponse, handleError, authenticate } from '@/lib/api-utils';
import { storage } from '@/lib/storage';
import { aiClient } from '@/lib/ai-client';
import { logger } from '@/lib/logger';
import { ProcessedEmail } from '@/types/comms';

const SummarizeRequestSchema = z.object({
  threadId: z.string().optional(),
  emailIds: z.array(z.string()).optional(),
}).refine((data) => data.threadId || (data.emailIds && data.emailIds.length > 0), {
  message: 'Either threadId or emailIds must be provided',
});

const ThreadSummarySchema = z.object({
  summary: z.string(),
  bullet_points: z.array(z.string()).max(5),
  action_items: z.array(z.string()),
  key_dates: z.array(z.string()),
  sentiment: z.enum(['positive', 'neutral', 'negative', 'urgent']),
  next_step: z.string(),
});

export type ThreadSummary = z.infer<typeof ThreadSummarySchema>;

/**
 * POST /api/comms/summarize
 * Summarize an email thread using AI
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await authenticate(request);

    const body = await request.json();
    const { threadId, emailIds } = SummarizeRequestSchema.parse(body);

    // Collect emails to summarize
    let emails: ProcessedEmail[] = [];

    if (emailIds && emailIds.length > 0) {
      // Load emails by explicit IDs
      const loadedEmails = await Promise.all(
        emailIds.map(async (emailId) => {
          try {
            return await storage.getJSON<ProcessedEmail>(`users/${userId}/emails/${emailId}.json`);
          } catch {
            return null;
          }
        })
      );
      emails = loadedEmails.filter((e): e is ProcessedEmail => e !== null);
    } else if (threadId) {
      // Load all emails index and find matching thread
      const emailIndex = await storage
        .getJSON<unknown>(`users/${userId}/emails/index.json`)
        .catch(() => null);

      const indexArray = Array.isArray(emailIndex)
        ? emailIndex
        : (emailIndex as Record<string, unknown> | null)?.emails
        ? ((emailIndex as Record<string, unknown>).emails as unknown[])
        : [];

      // Filter index entries that belong to this thread
      const threadEntries = indexArray.filter(
        (entry) =>
          (entry as Record<string, unknown>).threadId === threadId ||
          (entry as Record<string, unknown>).id === threadId
      );

      // Load full email objects
      const loadedEmails = await Promise.all(
        threadEntries.map(async (entry) => {
          const entryId = (entry as Record<string, unknown>).id as string;
          try {
            return await storage.getJSON<ProcessedEmail>(`users/${userId}/emails/${entryId}.json`);
          } catch {
            return null;
          }
        })
      );
      emails = loadedEmails.filter((e): e is ProcessedEmail => e !== null);

      // If no emails found via index, try loading the thread file directly
      if (emails.length === 0) {
        try {
          const threadFile = await storage.getJSON<{ messages: ProcessedEmail[] }>(
            `users/${userId}/emails/threads/${threadId}.json`
          );
          emails = threadFile?.messages || [];
        } catch {
          // Thread file doesn't exist, continue with empty array
        }
      }
    }

    if (emails.length === 0) {
      return successResponse({
        summary: 'No emails found for this thread.',
        bullet_points: [],
        action_items: [],
        key_dates: [],
        sentiment: 'neutral' as const,
        next_step: 'Check that the email thread exists.',
      });
    }

    // Build thread content string for AI
    const threadContent = emails
      .sort((a, b) => new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime())
      .map(
        (email) =>
          `From: ${email.from}\nDate: ${email.receivedAt}\nSubject: ${email.subject}\n\n${email.body}`
      )
      .join('\n\n---\n\n');

    const systemPrompt =
      'You are a helpful assistant that summarizes email threads for job seekers. ' +
      'Extract key information: decisions made, action items, next steps, and important dates. ' +
      'Be concise and actionable. Focus on what the job seeker needs to know and do.';

    const userPrompt = `Summarize this email thread in 3-5 bullet points:\n\n${threadContent}`;

    const result = await aiClient.completeJSON(systemPrompt, userPrompt, ThreadSummarySchema, {
      model: 'fast',
    });

    logger.info({ userId, threadId, emailCount: emails.length }, 'Thread summarized successfully');

    return successResponse(result);
  } catch (error) {
    logger.error({ error }, 'Failed to summarize thread');
    return handleError(error);
  }
}
