import { createLogger } from '@/lib/logger';

const logger = createLogger('job-runner');

interface ScheduledTask {
  name: string;
  intervalMs: number;
  lastRun: number;
  handler: () => Promise<void>;
  enabled: boolean;
}

class JobRunner {
  private tasks: Map<string, ScheduledTask> = new Map();
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  register(name: string, intervalMs: number, handler: () => Promise<void>): void {
    this.tasks.set(name, { name, intervalMs, lastRun: 0, handler, enabled: true });
    logger.info({ task: name, intervalMs }, 'Task registered');
  }

  start(checkIntervalMs: number = 60000): void {
    if (this.running) return;
    this.running = true;
    logger.info('Job runner started');

    this.timer = setInterval(async () => {
      const now = Date.now();
      for (const [name, task] of this.tasks) {
        if (!task.enabled) continue;
        if (now - task.lastRun < task.intervalMs) continue;

        task.lastRun = now;
        logger.info({ task: name }, 'Running scheduled task');

        try {
          await task.handler();
          logger.info({ task: name }, 'Task completed');
        } catch (error) {
          logger.error({ task: name, error }, 'Task failed');
        }
      }
    }, checkIntervalMs);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.running = false;
    logger.info('Job runner stopped');
  }

  enable(name: string): void {
    const task = this.tasks.get(name);
    if (task) {
      task.enabled = true;
      logger.info({ task: name }, 'Task enabled');
    }
  }

  disable(name: string): void {
    const task = this.tasks.get(name);
    if (task) {
      task.enabled = false;
      logger.info({ task: name }, 'Task disabled');
    }
  }

  async runNow(name: string): Promise<void> {
    const task = this.tasks.get(name);
    if (!task) {
      throw new Error(`Task ${name} not found`);
    }

    logger.info({ task: name }, 'Manually running task');
    task.lastRun = Date.now();
    await task.handler();
    logger.info({ task: name }, 'Manual task execution completed');
  }

  getStatus(): { name: string; enabled: boolean; lastRun: string; interval: string }[] {
    return Array.from(this.tasks.values()).map(t => ({
      name: t.name,
      enabled: t.enabled,
      lastRun: t.lastRun ? new Date(t.lastRun).toISOString() : 'never',
      interval: `${t.intervalMs / 1000 / 60} minutes`,
    }));
  }
}

// Singleton
let _runner: JobRunner | null = null;
export function getJobRunner(): JobRunner {
  if (!_runner) _runner = new JobRunner();
  return _runner;
}
