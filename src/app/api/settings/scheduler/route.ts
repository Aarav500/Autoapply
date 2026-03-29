import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticate, successResponse, handleError } from '@/lib/api-utils';
import { getJobRunner } from '@/services/scheduler/job-runner';

const TriggerSchema = z.object({
  action: z.enum(['enable', 'disable', 'run-now']),
  task: z.string().min(1),
});

export async function GET(request: NextRequest) {
  try {
    await authenticate(request);
    const runner = getJobRunner();
    const tasks = runner.getStatus();
    return successResponse({ tasks });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await authenticate(request);
    const body = TriggerSchema.parse(await request.json());
    const runner = getJobRunner();

    if (body.action === 'enable') {
      runner.enable(body.task);
      return successResponse({ ok: true, action: 'enabled', task: body.task });
    }

    if (body.action === 'disable') {
      runner.disable(body.task);
      return successResponse({ ok: true, action: 'disabled', task: body.task });
    }

    // run-now — runs async, returns immediately
    runner.runNow(body.task).catch(() => undefined);
    return successResponse({ ok: true, action: 'triggered', task: body.task });
  } catch (error) {
    return handleError(error);
  }
}
