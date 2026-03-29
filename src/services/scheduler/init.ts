import { getJobRunner } from './job-runner';
import { runAutoSearch } from './tasks/auto-search';
import { runEmailSync } from './tasks/email-sync';
import { runInterviewReminders } from './tasks/interview-reminders';
import { runAutoApply } from './tasks/auto-apply';
import { runDailyDigest } from './tasks/daily-digest';
import { runLinkedInOptimize } from './tasks/linkedin-optimize';
import { runGitHubOptimize } from './tasks/github-optimize';
import { runJobAlerts } from './tasks/job-alerts';
import { runFollowUp } from './tasks/follow-up';
import { runEmailFollowupTask } from './tasks/email-followup';
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
  runner.register('linkedin-optimize', 7 * 24 * 60 * 60 * 1000, runLinkedInOptimize); // Weekly
  runner.register('github-optimize', 7 * 24 * 60 * 60 * 1000, runGitHubOptimize); // Weekly
  runner.register('job-alerts', 60 * 60 * 1000, runJobAlerts); // Every 1 hour
  runner.register('follow-up', 24 * 60 * 60 * 1000, runFollowUp); // Daily
  runner.register('email-followup', 6 * 60 * 60 * 1000, () => runEmailFollowupTask().then(() => undefined)); // Every 6 hours

  // Start the runner (checks every 60 seconds)
  runner.start(60000);

  logger.info('Job scheduler initialized and started');
}
