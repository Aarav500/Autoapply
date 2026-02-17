import { getJobRunner } from './job-runner';
import { runAutoSearch } from './tasks/auto-search';
import { runEmailSync } from './tasks/email-sync';
import { runInterviewReminders } from './tasks/interview-reminders';
import { runAutoApply } from './tasks/auto-apply';
import { runDailyDigest } from './tasks/daily-digest';
import { createLogger } from '@/lib/logger';

const logger = createLogger('scheduler');

export function initializeScheduler(): void {
  logger.info('Initializing job scheduler');

  const runner = getJobRunner();

  // Register all recurring tasks
  runner.register('auto-search', 60 * 60 * 1000, runAutoSearch); // Every 1 hour
  runner.register('email-sync', 15 * 60 * 1000, runEmailSync); // Every 15 min
  runner.register('interview-reminders', 15 * 60 * 1000, runInterviewReminders); // Every 15 min
  runner.register('auto-apply', 2 * 60 * 60 * 1000, runAutoApply); // Every 2 hours
  runner.register('daily-digest', 60 * 60 * 1000, runDailyDigest); // Check every hour

  // Start the runner (checks every 60 seconds)
  runner.start(60000);

  logger.info('Job scheduler initialized and started');
}
