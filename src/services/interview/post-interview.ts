/**
 * Post-interview actions: thank-you emails and follow-ups
 */

import { storage } from '@/lib/storage';
import { aiClient } from '@/lib/ai-client';
import { getNotificationManager } from '@/services/comms/notification-manager';
import { Interview, InterviewSchema } from '@/types/interview';
import { Profile, ProfileSchema } from '@/types/profile';
import { AppError, NotFoundError } from '@/lib/errors';

/**
 * Generate thank-you email after an interview
 */
export async function generateThankYouEmail(
  userId: string,
  interviewId: string
): Promise<string> {
  try {

    const interview = await storage.getJSON<Interview>(
      `users/${userId}/interviews/${interviewId}.json`
    );

    const profile = await storage.getJSON<Profile>(
      `users/${userId}/profile.json`
    );

    if (!interview) {
      throw new NotFoundError('Interview not found');
    }

    if (!profile) {
      throw new NotFoundError('Profile not found');
    }

    const interviewerName = interview.interviewerName || 'the team';
    const systemPrompt = `You are a professional career coach helping write a thank-you email after a job interview.

Rules:
- Keep it under 150 words
- Be specific - reference the role and company
- Express genuine enthusiasm for the opportunity
- Professional but warm tone
- Mention something specific from the interview if possible (but you may not have this info)
- No generic phrases like "I am writing to thank you"
- Close with looking forward to next steps`;

    const userPrompt = `Write a thank-you email for:
Candidate: ${profile.name}
Company: ${interview.company}
Role: ${interview.role}
Interviewer: ${interviewerName}
${interview.notes ? `Interview notes: ${interview.notes}` : ''}

Generate the email body (no subject line needed).`;

    const email = await aiClient.complete(systemPrompt, userPrompt, { model: 'balanced' });

    return email.trim();
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to generate thank-you email', 500, 'AI_ERROR');
  }
}

/**
 * Generate follow-up email when no response after interview
 */
export async function generateFollowUpEmail(
  userId: string,
  interviewId: string
): Promise<string> {
  try {

    const interview = await storage.getJSON<Interview>(
      `users/${userId}/interviews/${interviewId}.json`
    );

    const profile = await storage.getJSON<Profile>(
      `users/${userId}/profile.json`
    );

    if (!interview) {
      throw new NotFoundError('Interview not found');
    }

    if (!profile) {
      throw new NotFoundError('Profile not found');
    }

    const daysSinceInterview = interview.scheduledAt
      ? Math.floor((Date.now() - new Date(interview.scheduledAt).getTime()) / (1000 * 60 * 60 * 24))
      : 7;

    const systemPrompt = `You are a professional career coach helping write a follow-up email after a job interview.

Rules:
- Keep it under 100 words
- Be brief, professional, and not pushy
- Express continued interest
- Politely ask about timeline or next steps
- Professional but friendly tone`;

    const userPrompt = `Write a follow-up email for:
Candidate: ${profile.name}
Company: ${interview.company}
Role: ${interview.role}
Days since interview: ${daysSinceInterview}

Generate the email body (no subject line needed).`;

    const email = await aiClient.complete(systemPrompt, userPrompt, { model: 'balanced' });

    return email.trim();
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to generate follow-up email', 500, 'AI_ERROR');
  }
}

/**
 * Schedule post-interview actions
 * Called after an interview's scheduledAt time passes
 */
export async function schedulePostInterviewActions(
  userId: string,
  interviewId: string
): Promise<void> {
  try {

    // Generate thank-you email draft
    const thankYou = await generateThankYouEmail(userId, interviewId);

    // Update interview with thank-you draft
    await storage.updateJSON<Interview>(
      `users/${userId}/interviews/${interviewId}.json`,
      (current) => {
        if (!current) throw new NotFoundError('Interview not found');
        return {
          ...current,
          prepData: {
            ...(current.prepData || {}),
            thankYouDraft: thankYou,
            thankYouGeneratedAt: new Date().toISOString(),
          },
        };
      }
    );

    // Notify user that draft is ready
    const nm = getNotificationManager();
    await nm.send(userId, {
      type: 'thank_you_ready',
      title: 'Thank-You Email Draft Ready',
      message: `Your thank-you email draft is ready to review and send.`,
      priority: 'medium',
      data: { interviewId },
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to schedule post-interview actions', 500, 'INTERNAL_ERROR');
  }
}
