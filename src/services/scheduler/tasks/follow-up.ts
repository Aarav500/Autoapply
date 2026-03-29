import { createLogger } from '@/lib/logger';
import { storage } from '@/lib/storage';
import { aiClient } from '@/lib/ai-client';
import { NotificationManager } from '@/services/comms/notification-manager';
import type { Application } from '@/types/application';
import type { Job } from '@/types/job';
import type { Profile } from '@/types/profile';

const logger = createLogger('task:follow-up');

interface ApplicationIndex {
  applications: Application[];
}

interface FollowUpRecord {
  applicationId: string;
  jobId: string;
  company: string;
  role: string;
  emailText: string;
  generatedAt: string;
}

const FOLLOW_UP_DAYS = 7;

/**
 * Returns true if the ISO date string is more than `days` days in the past.
 */
function isOlderThanDays(isoDate: string, days: number): boolean {
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return false;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return date < cutoff;
}

/**
 * Generate a polite follow-up email using AI.
 */
async function generateFollowUpEmail(
  profile: Profile,
  job: Job
): Promise<string> {
  const system =
    'You are a career coach. Write a brief, professional follow-up email (3-4 sentences) for a job application. ' +
    'The tone should be confident but not pushy. Express continued interest, mention one relevant strength, ' +
    'ask about timeline. Do not include a subject line — only the email body.';

  const user =
    `Candidate: ${profile.name}\n` +
    `Applied for: ${job.title} at ${job.company}\n` +
    `Candidate headline: ${profile.headline ?? ''}\n` +
    `Top skills: ${(profile.skills ?? [])
      .slice(0, 5)
      .map((s) => s.name)
      .join(', ')}\n\n` +
    'Write a 3-4 sentence follow-up email body.';

  return aiClient.complete(system, user, { model: 'fast' });
}

/**
 * Daily follow-up task — drafts follow-up emails for applications
 * that have been in "applied" status for more than 7 days without a response.
 */
export async function runFollowUp(): Promise<void> {
  logger.info('Starting follow-up task');

  const userKeys = await storage.listKeys('users/');
  const userIds = [...new Set(userKeys.map((k) => k.split('/')[1]))];

  logger.info({ count: userIds.length }, 'Processing users for follow-ups');

  let totalFollowUps = 0;

  for (const userId of userIds) {
    try {
      // Load applications index
      const appIndex = await storage
        .getJSON<ApplicationIndex>(`users/${userId}/applications/index.json`)
        .catch(() => null);

      if (!appIndex) continue;

      // Handle both flat array and wrapped object
      const applications: Application[] = Array.isArray(appIndex)
        ? (appIndex as unknown as Application[])
        : (appIndex.applications ?? []);

      if (applications.length === 0) continue;

      // Load user profile
      const profile = await storage
        .getJSON<Profile>(`users/${userId}/profile.json`)
        .catch(() => null);

      if (!profile) continue;

      const notificationManager = new NotificationManager();

      for (const app of applications) {
        try {
          // Only process applied applications older than 7 days with no follow-up sent
          if (app.status !== 'submitted') continue;
          if (!app.appliedAt) continue;
          if (!isOlderThanDays(app.appliedAt, FOLLOW_UP_DAYS)) continue;

          // Check if follow-up already sent (stored in the full application record)
          const fullApp = await storage
            .getJSON<Application & { followUpSent?: boolean }>(
              `users/${userId}/applications/${app.id}.json`
            )
            .catch(() => null);

          if (!fullApp) continue;
          if (fullApp.followUpSent === true) continue;

          // Load job details
          const job = await storage
            .getJSON<Job>(`users/${userId}/jobs/${app.jobId}.json`)
            .catch(() => null);

          if (!job) continue;

          logger.info({ userId, applicationId: app.id, company: job.company }, 'Generating follow-up email');

          // Generate follow-up email text
          const emailText = await generateFollowUpEmail(profile, job);

          // Save follow-up text
          const followUpRecord: FollowUpRecord = {
            applicationId: app.id,
            jobId: app.jobId,
            company: job.company,
            role: job.title,
            emailText,
            generatedAt: new Date().toISOString(),
          };

          await storage.putJSON(
            `users/${userId}/applications/${app.id}-followup.json`,
            followUpRecord
          );

          // Mark followUpSent on the application record
          const updatedApp: Application & { followUpSent: boolean } = {
            ...fullApp,
            followUpSent: true,
          };

          await storage.putJSON(
            `users/${userId}/applications/${app.id}.json`,
            updatedApp
          );

          // Create in-app notification
          await notificationManager.send(userId, {
            type: 'application_sent',
            priority: 'medium',
            title: 'Follow-up Drafted',
            message: `Follow-up drafted for ${job.company} ${job.title} — review and send it`,
            data: {
              applicationId: app.id,
              jobId: app.jobId,
              company: job.company,
              role: job.title,
              followUpKey: `users/${userId}/applications/${app.id}-followup.json`,
            },
          });

          totalFollowUps++;
          logger.info({ userId, applicationId: app.id, company: job.company }, 'Follow-up drafted');
        } catch (appError) {
          logger.error({ userId, applicationId: app.id, error: appError }, 'Failed to process follow-up for application');
        }
      }
    } catch (userError) {
      logger.error({ userId, error: userError }, 'Failed to process follow-ups for user');
    }
  }

  logger.info({ totalFollowUps }, 'Follow-up task completed');
}
