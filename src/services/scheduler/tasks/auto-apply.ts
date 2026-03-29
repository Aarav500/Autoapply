import { createLogger } from '@/lib/logger';
import { storage } from '@/lib/storage';
import type { UserSettings } from '@/types/notifications';
import type { Job } from '@/types/job';
import { AutoApplicant } from '@/services/jobs/auto-applicant';
import { NotificationManager } from '@/services/comms/notification-manager';

const logger = createLogger('task:auto-apply');

// FAANG, top-tier, and high-growth companies — applied first when internship priority is active
const PRIORITY_COMPANIES = new Set<string>([
  // FAANG / Big Tech
  'meta', 'facebook', 'apple', 'amazon', 'netflix', 'google', 'alphabet',
  'microsoft', 'nvidia', 'openai', 'anthropic', 'stripe', 'airbnb', 'uber',
  'lyft', 'twitter', 'x', 'salesforce', 'adobe', 'intel', 'amd', 'qualcomm',
  'oracle', 'ibm', 'cisco', 'palantir', 'snowflake', 'databricks', 'confluent',
  'hashicorp', 'cloudflare', 'datadog', 'mongodb', 'elastic', 'twilio',
  // AI / ML companies
  'scale ai', 'scale', 'mistral', 'cohere', 'stability ai', 'perplexity',
  'inflection', 'xai', 'character.ai', 'hugging face', 'weights & biases',
  'modal', 'replicate', 'together ai', 'anyscale', 'pika', 'runway',
  'midjourney', 'elevenlabs', 'synthesia', 'labelbox', 'snorkel',
  'landing ai', 'h2o.ai', 'datarobot', 'c3.ai',
  // Developer tooling / infrastructure
  'vercel', 'supabase', 'planetscale', 'neon', 'railway', 'fly.io',
  'retool', 'airtable', 'clickup', 'coda', 'linear', 'loom', 'figma',
  'notion', 'roam research', 'obsidian', 'mem', 'otter.ai', 'superhuman',
  // Fintech / HR tech
  'rippling', 'gusto', 'deel', 'remote', 'brex', 'ramp', 'mercury', 'plaid', 'finix',
  // Design / Creative
  'canva', 'miro', 'pitch', 'tome', 'gamma', 'beautiful.ai',
  // Defense / aerospace
  'anduril', 'shield ai', 'joby', 'archer', 'wisk', 'lilium',
]);

// Titles that indicate a senior role — skipped for students
const SENIOR_TITLE_KEYWORDS = [
  'senior',
  'lead',
  'principal',
  'staff',
  'director',
  'manager',
  'head of',
  'vp ',
  'vice president',
  'chief',
];

// Titles that indicate an internship / entry-level position
const INTERNSHIP_TITLE_KEYWORDS = [
  'intern',
  'internship',
  'co-op',
  'coop',
  'entry level',
  'entry-level',
  'new grad',
  'graduate',
  'apprentice',
  'junior',
];

/**
 * Returns true if the job title suggests a senior / leadership role.
 */
function isSeniorRole(title: string): boolean {
  const lower = title.toLowerCase();
  return SENIOR_TITLE_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Returns true if the job title suggests an internship or entry-level role.
 */
function isInternshipOrEntryLevel(title: string): boolean {
  const lower = title.toLowerCase();
  return INTERNSHIP_TITLE_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Sort jobs so that FAANG internships come first, then other internships,
 * then all other jobs — all within their own match-score ordering.
 */
function isPriorityCompany(company: string): boolean {
  const lower = company.toLowerCase();
  // Check exact membership or substring match against each entry
  for (const name of PRIORITY_COMPANIES) {
    if (lower.includes(name)) return true;
  }
  return false;
}

function prioritySortJobs(jobs: Job[]): Job[] {
  return [...jobs].sort((a, b) => {
    const aIsFaang = isPriorityCompany(a.company);
    const bIsFaang = isPriorityCompany(b.company);
    const aIsIntern = isInternshipOrEntryLevel(a.title);
    const bIsIntern = isInternshipOrEntryLevel(b.title);

    // Tier 1: FAANG internship
    const aTier = aIsFaang && aIsIntern ? 0 : aIsIntern ? 1 : 2;
    const bTier = bIsFaang && bIsIntern ? 0 : bIsIntern ? 1 : 2;

    if (aTier !== bTier) return aTier - bTier;

    // Within same tier, sort by match score descending
    return (b.matchScore || 0) - (a.matchScore || 0);
  });
}

/**
 * Returns a per-platform application count for today from the applications index.
 */
async function getDailyPlatformCounts(
  userId: string,
  today: string
): Promise<Record<string, number>> {
  try {
    const appsIndex = await storage.getJSON<{
      applications: Array<{ createdAt?: string; appliedAt?: string | null; platform?: string }>;
    }>(`users/${userId}/applications/index.json`);

    if (!appsIndex?.applications) return {};

    const todayApps = appsIndex.applications.filter(
      (app) => app.appliedAt && app.appliedAt.startsWith(today)
    );

    const counts: Record<string, number> = {};
    for (const app of todayApps) {
      const platform = app.platform || 'unknown';
      counts[platform] = (counts[platform] || 0) + 1;
    }

    return counts;
  } catch {
    return {};
  }
}

export async function runAutoApply(): Promise<void> {
  logger.info('Starting auto-apply task');

  // List all user folders
  const userKeys = await storage.listKeys('users/');
  const userIds = [...new Set(userKeys.map((k) => k.split('/')[1]))];

  logger.info({ count: userIds.length }, 'Found users');

  let totalApplications = 0;

  for (const userId of userIds) {
    try {
      // Load user settings
      const settings = await storage.getJSON<UserSettings>(`users/${userId}/settings.json`);
      if (!settings) continue;

      // Check if auto-apply is enabled
      const autoApplyRules = settings.autoApplyRules as {
        enabled?: boolean;
        minMatchScore?: number;
        maxApplicationsPerDay?: number;
        autoApplyInternshipsOnly?: boolean;
      } | undefined;

      if (!autoApplyRules?.enabled) {
        logger.debug({ userId }, 'Auto-apply disabled for user');
        continue;
      }

      // Load profile to check student status
      const profile = await storage.getJSON<{
        preferences?: { isStudent?: boolean };
      }>(`users/${userId}/profile.json`);
      const isStudent = profile?.preferences?.isStudent === true;

      // Load jobs index (stored as a flat array of Job)
      const jobsIndex = await storage.getJSON<Job[]>(`users/${userId}/jobs/index.json`);
      if (!jobsIndex || jobsIndex.length === 0) {
        logger.debug({ userId }, 'No jobs found for user');
        continue;
      }

      // Load rejected job IDs so we never re-apply to something the user dismissed
      const rejectedKey = `users/${userId}/jobs/rejected-ids.json`;
      const rejectedData = await storage.getJSON<string[]>(rejectedKey).catch(() => null);
      const rejectedIds = new Set<string>(Array.isArray(rejectedData) ? rejectedData : []);

      // Check daily rate limit — use user's local timezone if available
      const getUserToday = (timezone?: string): string => {
        try {
          if (timezone) {
            return new Date().toLocaleDateString('en-CA', { timeZone: timezone });
          }
        } catch {
          // fallback to UTC date
        }
        return new Date().toISOString().split('T')[0];
      };
      const today = getUserToday((settings as { timezone?: string }).timezone);
      const applicationsToday = await countApplicationsToday(userId, today);
      const maxApplicationsPerDay = autoApplyRules.maxApplicationsPerDay ?? 10;

      if (applicationsToday >= maxApplicationsPerDay) {
        logger.info({ userId, applicationsToday, maxApplicationsPerDay }, 'Daily rate limit reached');
        continue;
      }

      const remainingApplications = maxApplicationsPerDay - applicationsToday;

      // Load per-platform daily counts to avoid job board bans
      const platformCounts = await getDailyPlatformCounts(userId, today);

      // Per-platform daily limit (conservative)
      const MAX_PER_PLATFORM = 5;

      // Find eligible jobs
      const minMatchScore = autoApplyRules.minMatchScore ?? 70;
      const internshipsOnly = autoApplyRules.autoApplyInternshipsOnly === true;

      const eligibleJobs = jobsIndex.filter((job) => {
        // Must be undiscovered and meet match threshold
        if (job.status !== 'discovered') return false;
        if (job.matchScore === undefined || job.matchScore < minMatchScore) return false;

        // Skip jobs the user has explicitly rejected
        if (rejectedIds.has(job.id)) return false;

        // Skip senior roles for students
        if (isStudent && isSeniorRole(job.title)) return false;

        // Respect internships-only flag
        if (internshipsOnly && !isInternshipOrEntryLevel(job.title)) return false;

        // Respect per-platform cap
        const platformCount = platformCounts[job.platform] || 0;
        if (platformCount >= MAX_PER_PLATFORM) return false;

        return true;
      });

      if (eligibleJobs.length === 0) {
        logger.debug({ userId, minMatchScore }, 'No eligible jobs found');
        continue;
      }

      // Priority sort: FAANG internships first, then others by match score
      const prioritySorted = prioritySortJobs(eligibleJobs);

      // Quality score: breaks ties within priority tiers using salary and company tier signals
      const qualityScore = (job: Job): number => {
        let score = job.matchScore || 0;
        if (job.salary?.min && job.salary.min > 150000) score += 5;
        if (job.salary?.min && job.salary.min > 200000) score += 5;
        if (isPriorityCompany(job.company)) score += 10;
        return score;
      };

      // Re-sort by quality score (stable sort within priority tiers)
      const sortedJobs = prioritySorted.sort((a, b) => qualityScore(b) - qualityScore(a));

      // Apply to jobs up to remaining limit
      const jobsToApply = sortedJobs.slice(0, remainingApplications);
      logger.info({ userId, count: jobsToApply.length }, 'Applying to jobs');

      const notificationManager = new NotificationManager();

      // Track how many succeed in this run for velocity metrics
      const totalBeforeRun = totalApplications;

      for (let i = 0; i < jobsToApply.length; i++) {
        const job = jobsToApply[i];
        try {
          logger.info({ userId, jobId: job.id, company: job.company }, 'Applying to job');

          const applicant = new AutoApplicant();
          const result = await applicant.applyToJob(userId, job.id);

          if (result.success) {
            totalApplications++;
            // Update platform count to respect cap within this run
            platformCounts[job.platform] = (platformCounts[job.platform] || 0) + 1;

            logger.info(
              { userId, jobId: job.id, applicationId: result.applicationId },
              'Application successful'
            );

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

          // 500 ms delay between applications to avoid rate limiting
          if (i < jobsToApply.length - 1) {
            await new Promise<void>((resolve) => setTimeout(resolve, 500));
          }
        } catch (error) {
          logger.error({ userId, jobId: job.id, error }, 'Failed to apply to job');
        }
      }

      // Track application velocity for analytics (best-effort — never block the run)
      const successfulThisRun = totalApplications - totalBeforeRun;
      if (successfulThisRun > 0) {
        try {
          const velocityKey = `users/${userId}/jobs/application-velocity.json`;
          const rawVelocity = await storage
            .getJSON<{ dates: string[]; count: number }>(velocityKey)
            .catch(() => null);
          const velocity: { dates: string[]; count: number } = rawVelocity ?? { dates: [] as string[], count: 0 };

          if (!velocity.dates.includes(today)) {
            velocity.dates.push(today);
          }
          velocity.count = (velocity.count || 0) + successfulThisRun;

          // Keep last 30 days only
          if (velocity.dates.length > 30) {
            velocity.dates = velocity.dates.slice(-30);
          }

          await storage.putJSON(velocityKey, velocity);
          logger.debug({ userId, successfulThisRun, totalVelocity: velocity.count }, 'Velocity tracked');
        } catch (velocityErr) {
          logger.warn({ userId, velocityErr }, 'Failed to persist velocity metrics');
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
    const appsIndex = await storage.getJSON<{
      applications: Array<{ createdAt?: string; appliedAt?: string | null }>;
    }>(`users/${userId}/applications/index.json`);

    if (!appsIndex?.applications) return 0;

    return appsIndex.applications.filter(
      (app) => app.appliedAt && app.appliedAt.startsWith(today)
    ).length;
  } catch {
    return 0;
  }
}
