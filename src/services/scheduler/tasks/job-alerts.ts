import { createLogger } from '@/lib/logger';
import { storage } from '@/lib/storage';
import { generateId } from '@/lib/utils';
import type { JobAlert } from '@/app/api/job-alerts/route';

const logger = createLogger('task:job-alerts');

// ─── Notification shape stored in notifications index ────────────────────────

interface StoredNotification {
  id: string;
  userId: string;
  type: 'job_match';
  title: string;
  message: string;
  channel: string;
  priority: 'medium';
  read: boolean;
  sent: boolean;
  sentAt: string | null;
  data: Record<string, unknown>;
  createdAt: string;
}

// ─── Job shape from jobs index ────────────────────────────────────────────────

interface IndexedJob {
  id?: string;
  title?: string;
  location?: string;
  matchScore?: number;
  remote?: boolean;
  salary?: number;
}

// ─── Entry point ─────────────────────────────────────────────────────────────

export async function runJobAlerts(): Promise<void> {
  try {
    const allKeys = await storage.listKeys('users/');
    const alertKeys = allKeys.filter((k) => k.endsWith('/job-alerts/index.json'));

    logger.info({ userCount: alertKeys.length }, 'Running job alerts task');

    for (const alertKey of alertKeys) {
      const parts = alertKey.split('/');
      const userId = parts[1];
      if (userId) {
        await processUserAlerts(userId);
      }
    }
  } catch (error) {
    logger.error({ error }, 'Job alerts task failed');
  }
}

// ─── Per-user processing ──────────────────────────────────────────────────────

async function processUserAlerts(userId: string): Promise<void> {
  try {
    const alerts =
      (await storage.getJSON<JobAlert[]>(`users/${userId}/job-alerts/index.json`)) ?? [];
    const activeAlerts = alerts.filter((a) => a.active);

    if (activeAlerts.length === 0) return;

    // Load jobs index — handle both flat array and { jobs: [] } shape
    const rawJobs = await storage.getJSON<unknown>(`users/${userId}/jobs/index.json`);
    const jobsArray: IndexedJob[] = Array.isArray(rawJobs)
      ? (rawJobs as IndexedJob[])
      : ((rawJobs as { jobs?: IndexedJob[] })?.jobs ?? []);

    let updated = false;

    for (const alert of activeAlerts) {
      const newMatches = jobsArray.filter((job) => {
        if (!job.id || alert.seenJobIds.includes(job.id)) return false;

        const titleMatch =
          !alert.keywords ||
          job.title?.toLowerCase().includes(alert.keywords.toLowerCase()) === true;

        const locationMatch =
          alert.remote ||
          !alert.location ||
          job.location?.toLowerCase().includes(alert.location.toLowerCase()) === true ||
          job.remote === true;

        const scoreMatch =
          job.matchScore === undefined || job.matchScore >= alert.minMatchScore;

        const salaryMatch = alert.minSalary === 0 || (job.salary ?? 0) >= alert.minSalary;

        return titleMatch && locationMatch && scoreMatch && salaryMatch;
      });

      if (newMatches.length > 0) {
        const notification: StoredNotification = {
          id: generateId(),
          userId,
          type: 'job_match',
          title: `${newMatches.length} new job${newMatches.length > 1 ? 's' : ''} match "${alert.name}"`,
          message: 'New matches found for your job alert. Review them now.',
          channel: 'in_app',
          priority: 'medium',
          read: false,
          sent: false,
          sentAt: null,
          data: { alertId: alert.id, matchCount: newMatches.length },
          createdAt: new Date().toISOString(),
        };

        // Persist notification — handle both flat array and { notifications: [] } shape
        const notifKey = `users/${userId}/notifications/index.json`;
        const rawNotifs = await storage.getJSON<unknown>(notifKey);
        const notifArray: StoredNotification[] = Array.isArray(rawNotifs)
          ? (rawNotifs as StoredNotification[])
          : ((rawNotifs as { notifications?: StoredNotification[] })?.notifications ?? []);

        await storage.putJSON(notifKey, [notification, ...notifArray].slice(0, 100));

        const newIds = newMatches.map((j) => j.id).filter((id): id is string => Boolean(id));
        alert.seenJobIds = [...new Set([...alert.seenJobIds, ...newIds])];
        alert.matchCount += newMatches.length;
        alert.lastRunAt = new Date().toISOString();
        updated = true;

        logger.info(
          { userId, alertId: alert.id, matches: newMatches.length },
          'Job alert matched new jobs'
        );
      } else {
        alert.lastRunAt = new Date().toISOString();
        updated = true;
      }
    }

    if (updated) {
      await storage.putJSON(`users/${userId}/job-alerts/index.json`, alerts);
    }
  } catch (error) {
    logger.error({ error, userId }, 'Failed to process job alerts for user');
  }
}
