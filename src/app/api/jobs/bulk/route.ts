import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticate, successResponse, errorResponse, handleError } from '@/lib/api-utils';
import { storage } from '@/lib/storage';
import type { Job, PipelineStatus } from '@/types/job';

const BulkSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(100),
  action: z.enum(['save', 'archive', 'delete', 'status']),
  status: z.enum(['saved', 'applied', 'screening', 'interview', 'offer', 'rejected']).optional(),
});

// POST /api/jobs/bulk
export async function POST(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);
    const body: unknown = await req.json();
    const parsed = BulkSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(`Invalid request: ${parsed.error.issues.map((e) => e.message).join(', ')}`, 400);
    }
    const { ids, action, status } = parsed.data;

    const raw = await storage.getJSON<Job[] | { jobs: Job[] }>(`users/${userId}/jobs/index.json`);
    const jobs: Job[] = Array.isArray(raw) ? raw : (raw as { jobs: Job[] })?.jobs ?? [];

    let affected = 0;

    if (action === 'delete') {
      const idsSet = new Set(ids);
      const remaining = jobs.filter((j) => !idsSet.has(j.id));
      affected = jobs.length - remaining.length;
      await storage.putJSON(`users/${userId}/jobs/index.json`, remaining);
    } else if (action === 'archive') {
      for (const job of jobs) {
        if (ids.includes(job.id)) {
          job.status = 'rejected';
          job.updatedAt = new Date();
          affected++;
        }
      }
      await storage.putJSON(`users/${userId}/jobs/index.json`, jobs);
    } else if (action === 'save') {
      for (const job of jobs) {
        if (ids.includes(job.id) && job.status === 'discovered') {
          job.status = 'saved';
          job.updatedAt = new Date();
          affected++;
        }
      }
      await storage.putJSON(`users/${userId}/jobs/index.json`, jobs);
    } else if (action === 'status' && status) {
      for (const job of jobs) {
        if (ids.includes(job.id)) {
          job.status = status as PipelineStatus;
          job.updatedAt = new Date();
          affected++;
        }
      }
      await storage.putJSON(`users/${userId}/jobs/index.json`, jobs);
    }

    return successResponse({ affected, action });
  } catch (error) {
    return handleError(error);
  }
}
