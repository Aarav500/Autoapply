import { NextRequest } from 'next/server';
import { authenticate, successResponse, handleError } from '@/lib/api-utils';
import { storage } from '@/lib/storage';
import type { Job } from '@/types/job';

export interface BottleneckAlert {
  type: 'stalled-stage' | 'no-progression' | 'high-rejection' | 'stale-saved';
  severity: 'high' | 'medium' | 'low';
  stage: string;
  count: number;
  message: string;
  action: string;
}

export interface StageMetrics {
  stage: string;
  count: number;
  avgDaysInStage: number;
  oldestDaysInStage: number;
}

// GET /api/pipeline/analytics
export async function GET(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);

    const raw = await storage.getJSON<Job[] | { jobs: Job[] }>(`users/${userId}/jobs/index.json`);
    const jobs: Job[] = Array.isArray(raw) ? raw : (raw as { jobs: Job[] })?.jobs ?? [];

    const now = Date.now();
    const DAY = 86_400_000;

    // Build stage metrics
    const stageMap: Record<string, { jobs: Job[]; ages: number[] }> = {};
    for (const job of jobs) {
      const stage = job.status ?? 'discovered';
      if (!stageMap[stage]) stageMap[stage] = { jobs: [], ages: [] };
      const updatedAt = new Date(job.updatedAt instanceof Date ? job.updatedAt : String(job.updatedAt)).getTime();
      const daysInStage = (now - updatedAt) / DAY;
      stageMap[stage].jobs.push(job);
      stageMap[stage].ages.push(daysInStage);
    }

    const stageMetrics: StageMetrics[] = Object.entries(stageMap).map(([stage, data]) => ({
      stage,
      count: data.jobs.length,
      avgDaysInStage: data.ages.length > 0 ? data.ages.reduce((a, b) => a + b, 0) / data.ages.length : 0,
      oldestDaysInStage: data.ages.length > 0 ? Math.max(...data.ages) : 0,
    }));

    // Generate bottleneck alerts
    const alerts: BottleneckAlert[] = [];

    const screeningCount = stageMap['screening']?.jobs.length ?? 0;
    const interviewCount = stageMap['interview']?.jobs.length ?? 0;
    const appliedCount = stageMap['applied']?.jobs.length ?? 0;
    const savedCount = stageMap['saved']?.jobs.length ?? 0;

    // Stalled in screening
    if (screeningCount >= 5 && interviewCount === 0) {
      const avgDays = stageMap['screening']?.ages.reduce((a, b) => a + b, 0) / (stageMap['screening']?.ages.length || 1);
      if (avgDays > 7) {
        alerts.push({
          type: 'stalled-stage',
          severity: 'high',
          stage: 'screening',
          count: screeningCount,
          message: `${screeningCount} jobs in Screening with no Interview conversions — something may be blocking.`,
          action: 'Review your screening responses and consider requesting feedback from recruiters.',
        });
      }
    }

    // Large applied pile with no movement
    if (appliedCount >= 10) {
      const oldApplied = (stageMap['applied']?.ages ?? []).filter((d) => d > 14).length;
      if (oldApplied >= 5) {
        alerts.push({
          type: 'no-progression',
          severity: 'medium',
          stage: 'applied',
          count: oldApplied,
          message: `${oldApplied} applications with no response for 14+ days.`,
          action: 'Send follow-up emails to the oldest applications or revise your resume/cover letter.',
        });
      }
    }

    // High rejection rate
    const rejectedCount = stageMap['rejected']?.jobs.length ?? 0;
    const totalTracked = jobs.filter((j) => j.status !== 'discovered' && j.status !== 'saved').length;
    if (totalTracked >= 10 && rejectedCount / totalTracked > 0.6) {
      alerts.push({
        type: 'high-rejection',
        severity: 'medium',
        stage: 'rejected',
        count: rejectedCount,
        message: `${Math.round((rejectedCount / totalTracked) * 100)}% rejection rate — consider refining targeting.`,
        action: 'Use Skills Gap and Company Research to better target roles that match your profile.',
      });
    }

    // Stale saved pile
    if (savedCount >= 8) {
      const staleSaved = (stageMap['saved']?.ages ?? []).filter((d) => d > 7).length;
      if (staleSaved >= 4) {
        alerts.push({
          type: 'stale-saved',
          severity: 'low',
          stage: 'saved',
          count: staleSaved,
          message: `${staleSaved} saved jobs haven't been applied to in 7+ days — some may be expiring.`,
          action: 'Review your saved jobs and apply to the most relevant ones before they close.',
        });
      }
    }

    // Stalled in individual stages
    for (const { stage, avgDays, threshold, severity } of [
      { stage: 'applied', avgDays: stageMap['applied']?.ages.filter((d) => d > 21).length ?? 0, threshold: 3, severity: 'high' as const },
      { stage: 'screening', avgDays: stageMap['screening']?.ages.filter((d) => d > 10).length ?? 0, threshold: 2, severity: 'medium' as const },
      { stage: 'interview', avgDays: stageMap['interview']?.ages.filter((d) => d > 7).length ?? 0, threshold: 1, severity: 'high' as const },
    ]) {
      if (avgDays >= threshold && !alerts.find((a) => a.stage === stage)) {
        alerts.push({
          type: 'stalled-stage',
          severity,
          stage,
          count: avgDays,
          message: `${avgDays} jobs in ${stage.charAt(0).toUpperCase() + stage.slice(1)} are overdue for follow-up.`,
          action: `Follow up on your ${stage} applications — a polite check-in can move things forward.`,
        });
      }
    }

    // Sort by severity
    const severityOrder = { high: 0, medium: 1, low: 2 };
    alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return successResponse({ alerts, stageMetrics });
  } catch (error) {
    return handleError(error);
  }
}
