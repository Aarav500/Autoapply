import { createLogger } from '@/lib/logger';
import { storage } from '@/lib/storage';
import type { UserSettings } from '@/types/notifications';
import { searchEngine } from '@/services/jobs/search-engine';
import { NotificationManager } from '@/services/comms/notification-manager';
import type { JobSearchQuery } from '@/types/job';

const logger = createLogger('task:auto-search');

interface SearchConfiguration {
  id: string;
  query: JobSearchQuery;
  frequency: 'hourly' | 'daily' | 'weekly';
  lastRunAt?: string;
  enabled: boolean;
}

export async function runAutoSearch(): Promise<void> {
  logger.info('Starting auto-search task');

  // List all user folders
  const userKeys = await storage.listKeys('users/');
  const userIds = [...new Set(userKeys.map(k => k.split('/')[1]))];

  logger.info({ count: userIds.length }, 'Found users');

  let totalSearches = 0;
  let totalJobsFound = 0;

  for (const userId of userIds) {
    try {
      // Load user settings
      const settings = await storage.getJSON<UserSettings>(`users/${userId}/settings.json`);
      if (!settings) continue;

      // Check if auto-search is enabled
      if (!settings.autoSearchEnabled) {
        logger.debug({ userId }, 'Auto-search disabled for user');
        continue;
      }

      const searchConfigurations = (settings.searchConfigurations as SearchConfiguration[]) || [];
      const activeConfigs = searchConfigurations.filter((c) => c.enabled);

      if (activeConfigs.length === 0) {
        logger.debug({ userId }, 'No active search configurations');
        continue;
      }

      logger.info({ userId, configs: activeConfigs.length }, 'Processing user');

      for (const config of activeConfigs) {
        try {
          // Check if enough time has passed since last run
          if (config.lastRunAt && !shouldRunSearch(config.lastRunAt, config.frequency)) {
            logger.debug({ userId, configId: config.id }, 'Skipping search - too soon');
            continue;
          }

          // Run the search
          logger.info({ userId, query: config.query }, 'Running job search');
          const results = await searchEngine.searchJobs(userId, config.query);

          totalSearches++;
          totalJobsFound += results.newJobs;

          // Update last run time
          config.lastRunAt = new Date().toISOString();
          await storage.putJSON(`users/${userId}/settings.json`, settings);

          // Send notification for high-match jobs
          const highMatchJobs = results.jobs.filter(j => j.matchScore && j.matchScore >= 80);
          if (highMatchJobs.length > 0) {
            const notificationManager = new NotificationManager();
            await notificationManager.send(userId, {
              type: 'job_match',
              priority: 'high',
              title: `${highMatchJobs.length} High-Match Jobs Found!`,
              message: `Found ${highMatchJobs.length} jobs matching your criteria with 80+ match score.`,
              data: {
                jobIds: highMatchJobs.map(j => j.jobId).slice(0, 3),
                totalCount: highMatchJobs.length,
              },
            });
          }

          logger.info({ userId, newJobs: results.newJobs, highMatch: highMatchJobs.length }, 'Search completed');
        } catch (error) {
          logger.error({ userId, configId: config.id, error }, 'Search failed');
        }
      }
    } catch (error) {
      logger.error({ userId, error }, 'Failed to process user');
    }
  }

  logger.info({ totalSearches, totalJobsFound }, 'Auto-search task completed');
}

function shouldRunSearch(lastRunAt: string, frequency: 'hourly' | 'daily' | 'weekly'): boolean {
  const lastRun = new Date(lastRunAt);
  const now = new Date();
  const diffMs = now.getTime() - lastRun.getTime();

  switch (frequency) {
    case 'hourly':
      return diffMs >= 60 * 60 * 1000; // 1 hour
    case 'daily':
      return diffMs >= 24 * 60 * 60 * 1000; // 24 hours
    case 'weekly':
      return diffMs >= 7 * 24 * 60 * 60 * 1000; // 7 days
    default:
      return true;
  }
}
