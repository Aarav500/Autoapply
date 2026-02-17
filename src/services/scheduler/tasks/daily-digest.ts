import { createLogger } from '@/lib/logger';
import { storage } from '@/lib/storage';
import type { UserSettings } from '@/types/notifications';
import type { Job } from '@/types/job';
import type { InterviewListItem } from '@/types/interview';
import { NotificationManager } from '@/services/comms/notification-manager';

const logger = createLogger('task:daily-digest');

interface DigestData {
  newJobsToday: number;
  applicationsSentToday: number;
  responsesReceivedToday: number;
  upcomingInterviewsThisWeek: number;
  topMatchJob?: {
    company: string;
    title: string;
    matchScore: number;
    location: string;
  };
}

export async function runDailyDigest(): Promise<void> {
  logger.info('Starting daily digest task');

  // List all user folders
  const userKeys = await storage.listKeys('users/');
  const userIds = [...new Set(userKeys.map(k => k.split('/')[1]))];

  logger.info({ count: userIds.length }, 'Found users');

  let totalDigestsSent = 0;

  for (const userId of userIds) {
    try {
      // Load user settings
      const settings = await storage.getJSON<UserSettings>(`users/${userId}/settings.json`);
      if (!settings) continue;

      // Check if daily digest is enabled
      const digestEnabled = settings.notificationPreferences?.dailyDigest !== false;
      if (!digestEnabled) {
        logger.debug({ userId }, 'Daily digest disabled for user');
        continue;
      }

      // Check if it's the right time to send (simplified: check if 8am in user's timezone)
      // For now, we'll send once per day and track the last send time
      const lastDigestSent = settings.lastDigestSentAt;
      const today = new Date().toISOString().split('T')[0];

      if (lastDigestSent && lastDigestSent.startsWith(today)) {
        logger.debug({ userId }, 'Digest already sent today');
        continue;
      }

      // Compile digest data
      const digestData = await compileDigestData(userId);

      // Only send if there's something to report
      if (
        digestData.newJobsToday === 0 &&
        digestData.applicationsSentToday === 0 &&
        digestData.responsesReceivedToday === 0 &&
        digestData.upcomingInterviewsThisWeek === 0
      ) {
        logger.debug({ userId }, 'No activity to report in digest');
        continue;
      }

      // Build digest message
      const message = buildDigestMessage(digestData);

      // Send via notification manager
      const notificationManager = new NotificationManager();
      await notificationManager.send(userId, {
        type: 'daily_digest',
        priority: 'low',
        title: 'Daily Job Search Digest',
        message,
        data: digestData as unknown as Record<string, unknown>,
      });

      // Update last digest sent time
      settings.lastDigestSentAt = new Date().toISOString();
      await storage.putJSON(`users/${userId}/settings.json`, settings);

      totalDigestsSent++;
      logger.info({ userId }, 'Daily digest sent');
    } catch (error) {
      logger.error({ userId, error }, 'Failed to send daily digest for user');
    }
  }

  logger.info({ totalDigestsSent }, 'Daily digest task completed');
}

async function compileDigestData(userId: string): Promise<DigestData> {
  const today = new Date().toISOString().split('T')[0];
  const oneWeekFromNow = new Date();
  oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);

  // Count new jobs today
  let newJobsToday = 0;
  let topMatchJob: DigestData['topMatchJob'] | undefined;

  try {
    const jobsIndex = await storage.getJSON<{ jobs: Job[] }>(`users/${userId}/jobs/index.json`);
    if (jobsIndex?.jobs) {
      const todayJobs = jobsIndex.jobs.filter((job) => {
        const fetchedDate = new Date(job.fetchedAt).toISOString().split('T')[0];
        return fetchedDate === today;
      });
      newJobsToday = todayJobs.length;

      // Find top match job
      const sortedByMatch = [...todayJobs].sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
      if (sortedByMatch.length > 0 && sortedByMatch[0].matchScore) {
        topMatchJob = {
          company: sortedByMatch[0].company,
          title: sortedByMatch[0].title,
          matchScore: sortedByMatch[0].matchScore,
          location: sortedByMatch[0].location || 'Remote',
        };
      }
    }
  } catch {
    // Ignore errors, just means no jobs
  }

  // Count applications sent today
  let applicationsSentToday = 0;
  try {
    const appsIndex = await storage.getJSON<{ applications: Array<{ createdAt: string }> }>(
      `users/${userId}/applications/index.json`
    );
    if (appsIndex?.applications) {
      applicationsSentToday = appsIndex.applications.filter((app) =>
        app.createdAt.startsWith(today)
      ).length;
    }
  } catch {
    // Ignore
  }

  // Count responses received today
  let responsesReceivedToday = 0;
  try {
    const emailsIndex = await storage.getJSON<{ emails: Array<{ receivedAt: string; jobRelated?: boolean; category?: string }> }>(
      `users/${userId}/emails/index.json`
    );
    if (emailsIndex?.emails) {
      responsesReceivedToday = emailsIndex.emails.filter(
        (email) =>
          email.receivedAt.startsWith(today) &&
          email.jobRelated &&
          email.category !== 'other'
      ).length;
    }
  } catch {
    // Ignore
  }

  // Count upcoming interviews this week
  let upcomingInterviewsThisWeek = 0;
  try {
    const interviewsIndex = await storage.getJSON<{ interviews: InterviewListItem[] }>(
      `users/${userId}/interviews/index.json`
    );
    if (interviewsIndex?.interviews) {
      upcomingInterviewsThisWeek = interviewsIndex.interviews.filter(
        (interview) =>
          interview.status === 'confirmed' &&
          interview.scheduledAt &&
          new Date(interview.scheduledAt) <= oneWeekFromNow &&
          new Date(interview.scheduledAt) > new Date()
      ).length;
    }
  } catch {
    // Ignore
  }

  return {
    newJobsToday,
    applicationsSentToday,
    responsesReceivedToday,
    upcomingInterviewsThisWeek,
    topMatchJob,
  };
}

function buildDigestMessage(data: DigestData): string {
  const parts: string[] = [];

  if (data.newJobsToday > 0) {
    parts.push(`📋 ${data.newJobsToday} new job${data.newJobsToday > 1 ? 's' : ''} found`);
  }

  if (data.applicationsSentToday > 0) {
    parts.push(`✅ ${data.applicationsSentToday} application${data.applicationsSentToday > 1 ? 's' : ''} sent`);
  }

  if (data.responsesReceivedToday > 0) {
    parts.push(`📧 ${data.responsesReceivedToday} response${data.responsesReceivedToday > 1 ? 's' : ''} received`);
  }

  if (data.upcomingInterviewsThisWeek > 0) {
    parts.push(
      `🗓️ ${data.upcomingInterviewsThisWeek} interview${data.upcomingInterviewsThisWeek > 1 ? 's' : ''} this week`
    );
  }

  let message = parts.join(' • ');

  if (data.topMatchJob) {
    message += `\n\n⭐ Top Match: ${data.topMatchJob.company} - ${data.topMatchJob.title} (${data.topMatchJob.matchScore}% match)`;
  }

  return message || 'No new activity today';
}
