import { NextRequest, NextResponse } from 'next/server';
import { authenticate, handleError } from '@/lib/api-utils';
import { storage } from '@/lib/storage';
import { logger } from '@/lib/logger';
import { Job } from '@/types/job';
import { PipelineEvent } from '../route';
import { computeWinProbForExport } from '../win-probability';

interface AppEventLog {
  events: PipelineEvent[];
}

async function loadLastEvent(userId: string, jobId: string): Promise<PipelineEvent | null> {
  try {
    const raw = await storage.getJSON<AppEventLog | PipelineEvent[]>(
      `users/${userId}/applications/${jobId}-events.json`
    );
    if (!raw) return null;
    const events: PipelineEvent[] = Array.isArray(raw) ? raw : (raw.events ?? []);
    if (events.length === 0) return null;
    return events[events.length - 1];
  } catch {
    return null;
  }
}

function escapeCSV(val: string | number | undefined | null): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toDateString(val: Date | string | undefined): string {
  if (!val) return '';
  const d = val instanceof Date ? val : new Date(String(val));
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US');
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);

    const raw = await storage.getJSON<Job[] | { jobs: Job[] }>(
      `users/${userId}/jobs/index.json`
    );
    const jobs: Job[] = Array.isArray(raw) ? raw : (raw as { jobs: Job[] })?.jobs ?? [];

    // Load last events in parallel
    const lastEvents = await Promise.all(
      jobs.map((job) => loadLastEvent(userId, job.id))
    );

    const headers = [
      'Company',
      'Role',
      'Status',
      'Applied Date',
      'Match Score',
      'Win Probability',
      'Last Event',
      'Notes',
    ];

    const rows: string[][] = jobs.map((job, i) => {
      const lastEvent = lastEvents[i];
      const lastEventDesc = lastEvent
        ? `${lastEvent.type}${lastEvent.note ? ': ' + lastEvent.note : ''} (${toDateString(lastEvent.timestamp)})`
        : '';

      return [
        job.company,
        job.title,
        job.status,
        toDateString(job.appliedAt),
        String(job.matchScore),
        String(computeWinProbForExport(job)),
        lastEventDesc,
        job.notes ?? '',
      ];
    });

    const csvLines = [
      headers.map(escapeCSV).join(','),
      ...rows.map((row) => row.map(escapeCSV).join(',')),
    ];

    const csv = csvLines.join('\n');

    logger.info({ userId, jobCount: jobs.length }, 'Pipeline CSV exported');

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="pipeline.csv"',
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
