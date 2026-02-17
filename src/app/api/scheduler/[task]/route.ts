import { NextRequest } from 'next/server';
import { z } from 'zod';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { getJobRunner } from '@/services/scheduler/job-runner';

const actionSchema = z.object({
  action: z.enum(['run', 'enable', 'disable']),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ task: string }> }) {
  try {
    const body = await req.json();
    const { action } = actionSchema.parse(body);
    const { task: taskName } = await params;

    const runner = getJobRunner();

    switch (action) {
      case 'run':
        await runner.runNow(taskName);
        return successResponse({ message: `Task ${taskName} executed successfully` });

      case 'enable':
        runner.enable(taskName);
        return successResponse({ message: `Task ${taskName} enabled` });

      case 'disable':
        runner.disable(taskName);
        return successResponse({ message: `Task ${taskName} disabled` });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Invalid request body', 400);
    }

    return errorResponse(
      error instanceof Error ? error.message : 'Failed to execute action',
      500
    );
  }
}
