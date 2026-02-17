import { NextRequest } from 'next/server';
import { apiResponse, apiError, authenticate, handleError } from '@/lib/api-utils';
import { searchEngine } from '@/services/jobs/search-engine';
import { AuthError } from '@/lib/errors';
import { JobStats, PipelineStatus, JobPlatform } from '@/types/job';

export async function GET(req: NextRequest) {
  try {
    // Authenticate
    const { userId } = await authenticate(req);

    // Get all jobs
    const allJobs = await searchEngine.listJobs(userId);

    // Calculate stats
    const byStatus: Record<PipelineStatus, number> = {
      discovered: 0,
      saved: 0,
      applying: 0,
      applied: 0,
      screening: 0,
      interview: 0,
      offer: 0,
      rejected: 0,
    };

    const byPlatform: Record<JobPlatform, number> = {
      remoteok: 0,
      hackernews: 0,
      manual: 0,
    };

    let totalMatchScore = 0;
    let applicationsWithResponse = 0;

    for (const job of allJobs) {
      byStatus[job.status]++;
      byPlatform[job.platform]++;
      totalMatchScore += job.matchScore;

      // Count responses (screening, interview, offer)
      if (['screening', 'interview', 'offer'].includes(job.status)) {
        applicationsWithResponse++;
      }
    }

    const applied = byStatus.applied + byStatus.screening + byStatus.interview + byStatus.offer;
    const responseRate = applied > 0 ? (applicationsWithResponse / applied) * 100 : 0;
    const avgMatchScore = allJobs.length > 0 ? totalMatchScore / allJobs.length : 0;

    const stats: JobStats = {
      totalJobs: allJobs.length,
      byStatus,
      applied,
      responseRate: Math.round(responseRate * 10) / 10,
      interviews: byStatus.interview,
      offers: byStatus.offer,
      avgMatchScore: Math.round(avgMatchScore * 10) / 10,
      byPlatform,
    };

    return apiResponse(stats);
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error, 401);
    }
    return handleError(error);
  }
}
