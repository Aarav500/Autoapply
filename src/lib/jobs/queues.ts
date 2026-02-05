// Database-based job queue (no Redis required)
import { db } from '../db';

// Queue names
export const QUEUE_NAMES = {
  // Job hunting
  JOB_SCRAPE: 'job:scrape',
  JOB_MATCH: 'job:match',
  JOB_APPLY: 'job:apply',
  JOB_EXPIRE: 'job:expire',

  // Email
  EMAIL_SYNC: 'email:sync',
  EMAIL_CLASSIFY: 'email:classify',
  EMAIL_RESPOND: 'email:respond',

  // Documents
  DOCUMENT_GENERATE: 'document:generate',
  DOCUMENT_OPTIMIZE: 'document:optimize',

  // Platform optimization
  PLATFORM_GITHUB: 'platform:analyze:github',
  PLATFORM_LINKEDIN: 'platform:analyze:linkedin',

  // Interviews
  INTERVIEW_PREP: 'interview:prep',
  INTERVIEW_REMIND: 'interview:remind',

  // Notifications
  NOTIFICATION_SEND: 'notification:send',
  NOTIFICATION_DIGEST: 'notification:digest',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

// Job status types
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

// Add a job to the queue (stored in database)
export async function addJob<T>(
  queueName: QueueName,
  data: T,
  options?: {
    delay?: number;
    priority?: number;
    jobId?: string;
  }
) {
  const runAt = options?.delay
    ? new Date(Date.now() + options.delay)
    : new Date();

  const job = await db.jobQueue.create({
    data: {
      id: options?.jobId || undefined,
      queue: queueName,
      data: data as object,
      status: 'pending',
      priority: options?.priority || 0,
      runAt,
      attempts: 0,
      maxAttempts: 3,
    },
  });

  return job;
}

// Get pending jobs for a queue
export async function getPendingJobs(queueName: QueueName, limit = 10) {
  return db.jobQueue.findMany({
    where: {
      queue: queueName,
      status: 'pending',
      runAt: { lte: new Date() },
    },
    orderBy: [
      { priority: 'desc' },
      { createdAt: 'asc' },
    ],
    take: limit,
  });
}

// Mark job as processing
export async function markJobProcessing(jobId: string) {
  return db.jobQueue.update({
    where: { id: jobId },
    data: {
      status: 'processing',
      startedAt: new Date(),
      attempts: { increment: 1 },
    },
  });
}

// Mark job as completed
export async function markJobCompleted(jobId: string, result?: object) {
  return db.jobQueue.update({
    where: { id: jobId },
    data: {
      status: 'completed',
      completedAt: new Date(),
      result: result || undefined,
    },
  });
}

// Mark job as failed
export async function markJobFailed(jobId: string, error: string) {
  const job = await db.jobQueue.findUnique({ where: { id: jobId } });

  if (!job) return null;

  // If we haven't exceeded max attempts, set back to pending for retry
  const shouldRetry = job.attempts < job.maxAttempts;

  return db.jobQueue.update({
    where: { id: jobId },
    data: {
      status: shouldRetry ? 'pending' : 'failed',
      error,
      failedAt: shouldRetry ? undefined : new Date(),
      // Exponential backoff for retry
      runAt: shouldRetry
        ? new Date(Date.now() + Math.pow(2, job.attempts) * 1000)
        : undefined,
    },
  });
}

// Get queue stats
export async function getQueueStats(queueName: QueueName) {
  const [pending, processing, completed, failed] = await Promise.all([
    db.jobQueue.count({ where: { queue: queueName, status: 'pending' } }),
    db.jobQueue.count({ where: { queue: queueName, status: 'processing' } }),
    db.jobQueue.count({ where: { queue: queueName, status: 'completed' } }),
    db.jobQueue.count({ where: { queue: queueName, status: 'failed' } }),
  ]);

  return {
    name: queueName,
    pending,
    processing,
    completed,
    failed,
    total: pending + processing,
  };
}

// Get all queues stats
export async function getAllQueuesStats() {
  const stats = await Promise.all(
    Object.values(QUEUE_NAMES).map((name) => getQueueStats(name))
  );
  return stats;
}

// Clean old completed/failed jobs
export async function cleanOldJobs(daysOld = 7) {
  const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

  return db.jobQueue.deleteMany({
    where: {
      OR: [
        { status: 'completed', completedAt: { lt: cutoff } },
        { status: 'failed', failedAt: { lt: cutoff } },
      ],
    },
  });
}

// Schedule recurring job (simplified - creates a job with future runAt)
export async function scheduleRecurringJob<T>(
  queueName: QueueName,
  data: T,
  delayMs: number,
  options?: {
    jobId?: string;
  }
) {
  return addJob(queueName, data, {
    delay: delayMs,
    jobId: options?.jobId,
  });
}
