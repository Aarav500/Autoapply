import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { getJobRunner } from '@/services/scheduler/job-runner';

export async function GET(req: NextRequest) {
  try {
    const runner = getJobRunner();
    const status = runner.getStatus();

    return successResponse({
      running: true,
      tasks: status,
    });
  } catch (error) {
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to get scheduler status',
      500
    );
  }
}
