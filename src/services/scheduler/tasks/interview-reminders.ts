import { createLogger } from '@/lib/logger';
import { storage } from '@/lib/storage';
import type { Interview, InterviewListItem } from '@/types/interview';
import { NotificationManager } from '@/services/comms/notification-manager';
import { generateThankYouEmail } from '@/services/interview/post-interview';

const logger = createLogger('task:interview-reminders');

export async function runInterviewReminders(): Promise<void> {
  logger.info('Starting interview reminders task');

  // List all user folders
  const userKeys = await storage.listKeys('users/');
  const userIds = [...new Set(userKeys.map(k => k.split('/')[1]))];

  logger.info({ count: userIds.length }, 'Found users');

  let totalReminders = 0;

  for (const userId of userIds) {
    try {
      // Load interviews index
      const index = await storage.getJSON<{ interviews: InterviewListItem[] }>(
        `users/${userId}/interviews/index.json`
      );

      if (!index || !index.interviews || index.interviews.length === 0) {
        continue;
      }

      const now = new Date();

      for (const item of index.interviews) {
        // Only process confirmed interviews with scheduled times
        if (item.status !== 'confirmed' || !item.scheduledAt) {
          continue;
        }

        const scheduledAt = new Date(item.scheduledAt);

        // Load full interview details
        const interview = await storage.getJSON<Interview>(
          `users/${userId}/interviews/${item.id}.json`
        );

        if (!interview) continue;

        const notificationManager = new NotificationManager();

        // Check for 24-hour reminder
        const hoursUntil = (scheduledAt.getTime() - now.getTime()) / (1000 * 60 * 60);
        if (hoursUntil <= 24 && hoursUntil > 23 && !interview.morningReminderSent) {
          logger.info({ userId, interviewId: item.id }, 'Sending 24-hour reminder');

          await notificationManager.send(userId, {
            type: 'interview_reminder',
            priority: 'high',
            title: 'Interview Tomorrow',
            message: `Your interview with ${interview.company} is tomorrow at ${formatTime(scheduledAt)}!`,
            data: {
              interviewId: interview.id,
              company: interview.company,
              scheduledAt: interview.scheduledAt,
            },
          });

          interview.morningReminderSent = true;
          await storage.putJSON(`users/${userId}/interviews/${item.id}.json`, interview);
          totalReminders++;
        }

        // Check for 1-hour reminder
        const minutesUntil = (scheduledAt.getTime() - now.getTime()) / (1000 * 60);
        if (minutesUntil <= 60 && minutesUntil > 50 && !interview.oneHourReminderSent) {
          logger.info({ userId, interviewId: item.id }, 'Sending 1-hour reminder');

          const message = interview.meetingLink
            ? `Interview in 1 hour! Meeting link: ${interview.meetingLink}`
            : `Interview in 1 hour with ${interview.company}!`;

          await notificationManager.send(userId, {
            type: 'interview_reminder',
            priority: 'critical',
            title: 'Interview in 1 Hour!',
            message,
            data: {
              interviewId: interview.id,
              company: interview.company,
              scheduledAt: interview.scheduledAt,
              meetingLink: interview.meetingLink,
            },
          });

          interview.oneHourReminderSent = true;
          await storage.putJSON(`users/${userId}/interviews/${item.id}.json`, interview);
          totalReminders++;
        }

        // Check for post-interview follow-up (2 hours after scheduled time)
        const hoursSince = (now.getTime() - scheduledAt.getTime()) / (1000 * 60 * 60);
        if (hoursSince >= 2 && hoursSince < 4 && !interview.thankYouReminderSent) {
          logger.info({ userId, interviewId: item.id }, 'Sending post-interview reminder');

          // Generate thank-you email draft
          try {
            const thankYouDraft = await generateThankYouEmail(userId, interview.id);
            interview.thankYouDraft = thankYouDraft;

            await notificationManager.send(userId, {
              type: 'thank_you_ready',
              priority: 'medium',
              title: 'How Did Your Interview Go?',
              message: `Your thank-you email draft for ${interview.company} is ready to review and send.`,
              data: {
                interviewId: interview.id,
                company: interview.company,
              },
            });

            interview.thankYouReminderSent = true;
            await storage.putJSON(`users/${userId}/interviews/${item.id}.json`, interview);
            totalReminders++;
          } catch (error) {
            logger.error({ userId, interviewId: item.id, error }, 'Failed to generate thank-you draft');
          }
        }
      }
    } catch (error) {
      logger.error({ userId, error }, 'Failed to process interview reminders for user');
    }
  }

  logger.info({ totalReminders }, 'Interview reminders task completed');
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
