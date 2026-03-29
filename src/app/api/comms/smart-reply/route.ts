import { NextRequest } from 'next/server';
import { z } from 'zod';
import { successResponse, handleError, authenticate } from '@/lib/api-utils';
import { storage } from '@/lib/storage';
import { aiClient } from '@/lib/ai-client';
import { logger } from '@/lib/logger';
import { ProcessedEmail } from '@/types/comms';
import { Profile } from '@/types/profile';

const SmartReplyRequestSchema = z.object({
  emailId: z.string(),
});

const SmartReplySchema = z.object({
  replies: z
    .array(
      z.object({
        tone: z.enum(['professional', 'enthusiastic', 'concise']),
        subject: z.string(),
        body: z.string(),
        why: z.string(),
        word_count: z.number(),
      })
    )
    .length(3),
  recommended_tone: z.enum(['professional', 'enthusiastic', 'concise']),
  reasoning: z.string(),
});

export type SmartReplyResult = z.infer<typeof SmartReplySchema>;

/**
 * POST /api/comms/smart-reply
 * Generate 3 smart reply options with different tones
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await authenticate(request);

    const body = await request.json();
    const { emailId } = SmartReplyRequestSchema.parse(body);

    // Load the email
    const email = await storage.getJSON<ProcessedEmail>(
      `users/${userId}/emails/${emailId}.json`
    );

    if (!email) {
      return successResponse({
        replies: [
          {
            tone: 'professional' as const,
            subject: `Re: ${emailId}`,
            body: 'Thank you for your email. I look forward to discussing this further.',
            why: 'Safe, formal reply suitable for any professional context.',
            word_count: 14,
          },
          {
            tone: 'enthusiastic' as const,
            subject: `Re: ${emailId}`,
            body: 'Thank you so much for reaching out! I am really excited about this opportunity.',
            why: 'Shows genuine enthusiasm and energy.',
            word_count: 16,
          },
          {
            tone: 'concise' as const,
            subject: `Re: ${emailId}`,
            body: 'Thanks for reaching out. Happy to connect.',
            why: 'Brief and direct - good for quick confirmations.',
            word_count: 8,
          },
        ],
        recommended_tone: 'professional' as const,
        reasoning: 'Email content not available for analysis.',
      });
    }

    // Load user profile for context
    const profile = await storage
      .getJSON<Profile>(`users/${userId}/profile.json`)
      .catch(() => null);

    const profileContext = profile
      ? `Sender's name: ${profile.name || 'Unknown'}\nSender's role: ${profile.headline || 'Job seeker'}`
      : 'Sender is a job seeker';

    const systemPrompt =
      'You are an expert career communications coach. Generate 3 reply options for this job-related email. ' +
      'Each should be appropriate for the context but differ in tone. ' +
      'Professional = formal and measured. ' +
      'Enthusiastic = warm and energized (good for offers/exciting news). ' +
      'Concise = brief and direct (good for scheduling/confirmations). ' +
      'Make each reply complete and ready to send. ' +
      'Include accurate word_count for each reply body. ' +
      'The "why" field should be a short phrase explaining when to choose this tone (under 15 words).';

    const userPrompt = `${profileContext}\n\n` +
      `Email to reply to:\nFrom: ${email.from}\nSubject: ${email.subject}\nDate: ${email.receivedAt}\n\n${email.body}`;

    const result = await aiClient.completeJSON(systemPrompt, userPrompt, SmartReplySchema, {
      model: 'balanced',
    });

    logger.info({ userId, emailId }, 'Smart replies generated successfully');

    return successResponse(result);
  } catch (error) {
    logger.error({ error }, 'Failed to generate smart replies');
    return handleError(error);
  }
}
