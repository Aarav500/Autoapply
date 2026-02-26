import { createLogger } from '@/lib/logger';
import { storage } from '@/lib/storage';
import type { UserSettings } from '@/types/notifications';
import type { Job } from '@/types/job';
import { AutoApplicant } from '@/services/jobs/auto-applicant';
import { NotificationManager } from '@/services/comms/notification-manager';

const logger = createLogger('task:auto-apply');

export async function runAutoApply(): Promise<void> {
  logger.info('Starting auto-apply task');

  // List all user folders
  const userKeys = await storage.listKeys('users/');
  const userIds = [...new Set(userKeys.map(k => k.split('/')[1]))];

  logger.info({ count: userIds.length }, 'Found users');

  let totalApplications = 0;

  for (const userId of userIds) {
    try {
      // Load user settings
      const settings = await storage.getJSON<UserSettings>(`users/${userId}/settings.json`);
      if (!settings) continue;

      // Check if auto-apply is enabled
      const autoApplyRules = settings.autoApplyRules;
      if (!autoApplyRules?.enabled) {
        logger.debug({ userId }, 'Auto-apply disabled for user');
        continue;
      }

      // Load jobs index (stored as a flat array of JobSummary)
      const jobsIndex = await storage.getJSON<Job[]>(`users/${userId}/jobs/index.json`);
      if (!jobsIndex || jobsIndex.length === 0) {
        logger.debug({ userId }, 'No jobs found for user');
        continue;
      }

      // Check daily rate limit
      const today = new Date().toISOString().split('T')[0];
      const applicationsToday = await countApplicationsToday(userId, today);
      const maxApplicationsPerDay = (autoApplyRules.maxApplicationsPerDay as number | undefined) || 10;

      if (applicationsToday >= maxApplicationsPerDay) {
        logger.info({ userId, applicationsToday, maxApplicationsPerDay }, 'Daily rate limit reached');
        continue;
      }

      const remainingApplications = maxApplicationsPerDay - applicationsToday;

      // Find eligible jobs
      const minMatchScore = (autoApplyRules.minMatchScore as number | undefined) || 70;
      const eligibleJobs = jobsIndex.filter(
        (job) =>
          job.status === 'discovered' &&
          job.matchScore !== undefined &&
          job.matchScore >= minMatchScore
      );

      if (eligibleJobs.length === 0) {
        logger.debug({ userId, minMatchScore }, 'No eligible jobs found');
        continue;
      }

      // Sort by match score (highest first)
      eligibleJobs.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

      // Apply to jobs up to remaining limit
      const jobsToApply = eligibleJobs.slice(0, remainingApplications);
      logger.info({ userId, count: jobsToApply.length }, 'Applying to jobs');

      const notificationManager = new NotificationManager();

      for (const job of jobsToApply) {
        try {
          logger.info({ userId, jobId: job.id, company: job.company }, 'Applying to job');

          const applicant = new AutoApplicant();
          const result = await applicant.applyToJob(userId, job.id);

          if (result.success) {
            totalApplications++;
            logger.info({ userId, jobId: job.id, applicationId: result.applicationId }, 'Application successful');

            // Send success notification
            await notificationManager.send(userId, {
              type: 'application_sent',
              priority: 'medium',
              title: 'Application Submitted',
              message: `Successfully applied to ${job.company} - ${job.title}`,
              data: {
                jobId: job.id,
                applicationId: result.applicationId,
                company: job.company,
              },
            });
          } else {
            logger.warn({ userId, jobId: job.id, error: result.error }, 'Application failed');

            // Send failure notification only for unexpected errors (not manual_required)
            if (result.error && !result.error.includes('manual')) {
              await notificationManager.send(userId, {
                type: 'application_sent',
                priority: 'low',
                title: 'Application Failed',
                message: `Could not auto-apply to ${job.company}: ${result.error}`,
                data: {
                  jobId: job.id,
                  error: result.error,
                },
              });
            }
          }

          // Wait 2-5 minutes between applications (be respectful)
          if (jobsToApply.indexOf(job) < jobsToApply.length - 1) {
            const delayMinutes = 2 + Math.random() * 3;
            const delayMs = delayMinutes * 60 * 1000;
            logger.info({ delayMinutes: delayMinutes.toFixed(1) }, 'Waiting before next application');
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }
        } catch (error) {
          logger.error({ userId, jobId: job.id, error }, 'Failed to apply to job');
        }
      }
    } catch (error) {
      logger.error({ userId, error }, 'Failed to process auto-apply for user');
    }
  }

  logger.info({ totalApplications }, 'Auto-apply task completed');
}

async function countApplicationsToday(userId: string, today: string): Promise<number> {
  try {
    const appsIndex = await storage.getJSON<{ applications: Array<{ createdAt?: string; appliedAt?: string | null }> }>(
      `users/${userId}/applications/index.json`
    );

    if (!appsIndex || !appsIndex.applications) return 0;

    return appsIndex.applications.filter((app) => app.appliedAt && app.appliedAt.startsWith(today)).length;
  } catch {
    return 0;
  }
}
