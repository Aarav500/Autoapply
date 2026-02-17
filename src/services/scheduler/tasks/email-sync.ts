import { createLogger } from '@/lib/logger';
import { storage } from '@/lib/storage';
import type { UserSettings } from '@/types/notifications';
import { EmailProcessor } from '@/services/comms/email-processor';

const logger = createLogger('task:email-sync');

export async function runEmailSync(): Promise<void> {
  logger.info('Starting email sync task');

  // List all user folders
  const userKeys = await storage.listKeys('users/');
  const userIds = [...new Set(userKeys.map(k => k.split('/')[1]))];

  logger.info({ count: userIds.length }, 'Found users');

  let totalProcessed = 0;
  let totalUsers = 0;

  for (const userId of userIds) {
    try {
      // Load user settings
      const settings = await storage.getJSON<UserSettings>(`users/${userId}/settings.json`);
      if (!settings) continue;

      // Check if Gmail is connected
      if (!settings.googleRefreshToken) {
        logger.debug({ userId }, 'Gmail not connected');
        continue;
      }

      totalUsers++;
      logger.info({ userId }, 'Syncing emails for user');

      // Process new emails
      const processor = new EmailProcessor();
      const result = await processor.processNewEmails(userId);

      totalProcessed += result.processed;

      logger.info(
        {
          userId,
          processed: result.processed,
          jobRelated: result.jobRelated,
          interviewsDetected: result.interviewsDetected,
          autoReplied: result.autoReplied,
        },
        'Email sync completed for user'
      );
    } catch (error) {
      logger.error({ userId, error }, 'Failed to sync emails for user');
    }
  }

  logger.info({ totalUsers, totalProcessed }, 'Email sync task completed');
}
