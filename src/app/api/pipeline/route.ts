import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticate, successResponse, errorResponse, handleError } from '@/lib/api-utils';
import { storage } from '@/lib/storage';
import { logger } from '@/lib/logger';
import { aiClient } from '@/lib/ai-client';
import { generateId } from '@/lib/utils';
import { Job, PipelineStatus } from '@/types/job';
import { computeWinProbForExport } from './win-probability';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PipelineEventType =
  | 'status-change'
  | 'note'
  | 'email'
  | 'interview'
  | 'offer'
  | 'rejection';

export interface PipelineEvent {
  id: string;
  type: PipelineEventType;
  from?: string;
  to?: string;
  note?: string;
  timestamp: string;
}

// The 6 pipeline columns exposed to the Kanban board
const KANBAN_COLUMNS: PipelineStatus[] = [
  'saved',
  'applied',
  'screening',
  'interview',
  'offer',
  'rejected',
];

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const patchBodySchema = z.object({
  id: z.string().min(1),
  status: z.enum(['saved', 'applied', 'screening', 'interview', 'offer', 'rejected']).optional(),
  notes: z.string().optional(),
}).refine((d) => d.status !== undefined || d.notes !== undefined, {
  message: 'Provide at least status or notes',
});

const eventBodySchema = z.object({
  applicationId: z.string().min(1),
  type: z.enum(['status-change', 'note', 'email', 'interview', 'offer', 'rejection']),
  note: z.string().optional(),
});

const followupBodySchema = z.object({
  applicationId: z.string().min(1),
});

// ─── Card type ────────────────────────────────────────────────────────────────

export interface PipelineCard {
  id: string;
  title: string;
  company: string;
  location: string | undefined;
  remote: boolean;
  matchScore: number;
  status: PipelineStatus;
  platform: string;
  url: string | undefined;
  savedAt: string;
  updatedAt: string;
  appliedAt: string | undefined;
  winProbability: number;
  events: PipelineEvent[];
  notes?: string;
}

type PipelineColumns = Record<PipelineStatus, PipelineCard[]>;

// ─── Reminder type ────────────────────────────────────────────────────────────

export interface PipelineReminder {
  applicationId: string;
  company: string;
  role: string;
  message: string;
  urgency: 'high' | 'medium' | 'low';
  suggestedAction: string;
}

// ─── Application event log file ───────────────────────────────────────────────

interface AppEventLog {
  events: PipelineEvent[];
}

async function loadEvents(userId: string, jobId: string): Promise<PipelineEvent[]> {
  try {
    const raw = await storage.getJSON<AppEventLog | PipelineEvent[]>(
      `users/${userId}/applications/${jobId}-events.json`
    );
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    return raw.events ?? [];
  } catch {
    return [];
  }
}

async function saveEvents(
  userId: string,
  jobId: string,
  events: PipelineEvent[]
): Promise<void> {
  await storage.putJSON(`users/${userId}/applications/${jobId}-events.json`, { events });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toISOString(val: Date | string | undefined): string | undefined {
  if (!val) return undefined;
  if (val instanceof Date) return val.toISOString();
  return String(val);
}

function jobToCard(job: Job, events: PipelineEvent[]): PipelineCard {
  return {
    id: job.id,
    title: job.title,
    company: job.company,
    location: job.location,
    remote: job.remote,
    matchScore: job.matchScore,
    status: job.status,
    platform: job.platform,
    url: job.url,
    savedAt: toISOString(job.savedAt) ?? new Date().toISOString(),
    updatedAt: toISOString(job.updatedAt) ?? new Date().toISOString(),
    appliedAt: toISOString(job.appliedAt),
    winProbability: computeWinProbForExport(job),
    events,
    notes: job.notes,
  };
}

// ─── GET /api/pipeline ────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    // ── Reminders action ──────────────────────────────────────────────────────
    if (action === 'reminders') {
      const raw = await storage.getJSON<Job[] | { jobs: Job[] }>(
        `users/${userId}/jobs/index.json`
      );
      const jobs: Job[] = Array.isArray(raw) ? raw : (raw as { jobs: Job[] })?.jobs ?? [];

      const now = Date.now();
      const DAY = 86_400_000;
      const reminders: PipelineReminder[] = [];

      for (const job of jobs) {
        const updatedAt = new Date(
          job.updatedAt instanceof Date ? job.updatedAt : String(job.updatedAt)
        ).getTime();
        const appliedAt = job.appliedAt
          ? new Date(
              job.appliedAt instanceof Date ? job.appliedAt : String(job.appliedAt)
            ).getTime()
          : null;

        const daysSinceUpdate = (now - updatedAt) / DAY;
        const daysSinceApplied = appliedAt ? (now - appliedAt) / DAY : null;

        if (job.status === 'applied') {
          const daysAgo = daysSinceApplied ?? daysSinceUpdate;
          if (daysAgo > 7) {
            reminders.push({
              applicationId: job.id,
              company: job.company,
              role: job.title,
              message: `Applied ${Math.round(daysAgo)} days ago with no update — consider following up with ${job.company}.`,
              urgency: daysAgo > 14 ? 'high' : 'medium',
              suggestedAction: `Send a polite follow-up email to ${job.company} asking about next steps.`,
            });
          }
        } else if (job.status === 'screening') {
          if (daysSinceUpdate > 5) {
            reminders.push({
              applicationId: job.id,
              company: job.company,
              role: job.title,
              message: `Screening at ${job.company} has been stalled for ${Math.round(daysSinceUpdate)} days.`,
              urgency: daysSinceUpdate > 10 ? 'high' : 'medium',
              suggestedAction: 'Check your email for missed messages and follow up with the recruiter.',
            });
          }
        } else if (job.status === 'interview') {
          if (daysSinceUpdate > 3) {
            reminders.push({
              applicationId: job.id,
              company: job.company,
              role: job.title,
              message: `Interview at ${job.company} passed ${Math.round(daysSinceUpdate)} days ago — no offer received yet.`,
              urgency: daysSinceUpdate > 7 ? 'high' : 'low',
              suggestedAction: 'Send a thank-you note and status check to the hiring manager.',
            });
          }
        }
      }

      return successResponse({ reminders });
    }

    // ── Default: load pipeline ────────────────────────────────────────────────
    const raw = await storage.getJSON<Job[] | { jobs: Job[] }>(
      `users/${userId}/jobs/index.json`
    );
    const jobs: Job[] = Array.isArray(raw) ? raw : (raw as { jobs: Job[] })?.jobs ?? [];

    // Build empty columns for each Kanban status
    const columns: PipelineColumns = {
      discovered: [],
      saved: [],
      applying: [],
      applied: [],
      screening: [],
      interview: [],
      offer: [],
      rejected: [],
    };

    // Load events for each job in parallel
    const eventsPerJob = await Promise.all(
      jobs.map((job) => loadEvents(userId, job.id))
    );

    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      if (job.status && job.status in columns) {
        columns[job.status].push(jobToCard(job, eventsPerJob[i]));
      }
    }

    // Sort each column by updatedAt descending
    for (const col of KANBAN_COLUMNS) {
      columns[col].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    }

    // Return only the 6 Kanban columns (not discovered/applying)
    const result: Record<string, PipelineCard[]> = {};
    for (const col of KANBAN_COLUMNS) {
      result[col] = columns[col];
    }

    logger.info({ userId, totalJobs: jobs.length }, 'Pipeline fetched');

    return successResponse({ columns: result });
  } catch (error) {
    return handleError(error);
  }
}

// ─── PATCH /api/pipeline — move a card ───────────────────────────────────────

export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);

    const body: unknown = await req.json();
    const parsed = patchBodySchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(
        `Invalid request: ${parsed.error.issues.map((e: { message: string }) => e.message).join(', ')}`,
        400
      );
    }

    const { id, status, notes } = parsed.data;

    // Load existing jobs index
    const raw = await storage.getJSON<Job[] | { jobs: Job[] }>(
      `users/${userId}/jobs/index.json`
    );
    const jobs: Job[] = Array.isArray(raw) ? raw : (raw as { jobs: Job[] })?.jobs ?? [];

    const jobIndex = jobs.findIndex((j) => j.id === id);
    if (jobIndex === -1) {
      return errorResponse('Job not found', 404);
    }

    const previousStatus = jobs[jobIndex].status;
    const effectiveStatus = status ?? jobs[jobIndex].status;

    const updatedJob: Job = {
      ...jobs[jobIndex],
      status: effectiveStatus,
      updatedAt: new Date(),
      ...(notes !== undefined ? { notes } : {}),
    };

    jobs[jobIndex] = updatedJob;

    // Persist updated index
    await storage.putJSON(`users/${userId}/jobs/index.json`, jobs);

    // Also update the individual job file if it exists
    try {
      const individualJob = await storage.getJSON<Job>(
        `users/${userId}/jobs/${id}.json`
      );
      if (individualJob) {
        await storage.putJSON(`users/${userId}/jobs/${id}.json`, {
          ...individualJob,
          status: effectiveStatus,
          updatedAt: new Date(),
          ...(notes !== undefined ? { notes } : {}),
        });
      }
    } catch {
      // Individual file may not exist — that's fine
    }

    // Append a status-change event to the application event log
    if (status && previousStatus !== status) {
      const existingEvents = await loadEvents(userId, id);
      const newEvent: PipelineEvent = {
        id: generateId(),
        type: 'status-change',
        from: previousStatus,
        to: status,
        timestamp: new Date().toISOString(),
      };
      await saveEvents(userId, id, [...existingEvents, newEvent]);
    }

    logger.info({ userId, jobId: id, from: previousStatus, to: effectiveStatus }, 'Job pipeline updated');

    return successResponse({ updated: true, id, status: effectiveStatus, notes });
  } catch (error) {
    return handleError(error);
  }
}

// ─── POST /api/pipeline — manual event log + follow-up generation ─────────────

export async function POST(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    // ── Follow-up generation ──────────────────────────────────────────────────
    if (action === 'followup') {
      const body: unknown = await req.json();
      const parsed = followupBodySchema.safeParse(body);
      if (!parsed.success) {
        return errorResponse(
          `Invalid request: ${parsed.error.issues.map((e: { message: string }) => e.message).join(', ')}`,
          400
        );
      }

      const { applicationId } = parsed.data;

      // Load job details
      const raw = await storage.getJSON<Job[] | { jobs: Job[] }>(
        `users/${userId}/jobs/index.json`
      );
      const jobs: Job[] = Array.isArray(raw) ? raw : (raw as { jobs: Job[] })?.jobs ?? [];
      const job = jobs.find((j) => j.id === applicationId);

      if (!job) {
        return errorResponse('Job not found', 404);
      }

      const systemPrompt = `You are a professional career coach helping a job seeker write a concise, personable follow-up email. Write in a warm, professional tone. Respond with a JSON object containing exactly two fields: "subject" (string) and "body" (string). The body should be exactly 3 sentences.`;

      const userPrompt = `Write a follow-up email for this job application:
Company: ${job.company}
Role: ${job.title}
Status: ${job.status}
${job.appliedAt ? `Applied: ${new Date(job.appliedAt instanceof Date ? job.appliedAt : String(job.appliedAt)).toLocaleDateString()}` : ''}
${job.analysis?.strengths?.length ? `My strengths: ${job.analysis.strengths.slice(0, 2).join(', ')}` : ''}

Generate a natural follow-up email subject and body (3 sentences max).`;

      const responseText = await aiClient.complete(systemPrompt, userPrompt, { model: 'fast' });

      // Parse the JSON from the response
      let subject = `Following Up — ${job.title} at ${job.company}`;
      let emailBody = responseText;

      try {
        const cleaned = responseText.replace(/^```(?:json)?\n?/gm, '').replace(/\n?```$/gm, '').trim();
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
          if (typeof parsed.subject === 'string') subject = parsed.subject;
          if (typeof parsed.body === 'string') emailBody = parsed.body;
        }
      } catch {
        // Use raw text as body if JSON parsing fails
      }

      return successResponse({ subject, body: emailBody });
    }

    // ── Manual event logging ──────────────────────────────────────────────────
    const body: unknown = await req.json();
    const parsed = eventBodySchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        `Invalid request: ${parsed.error.issues.map((e: { message: string }) => e.message).join(', ')}`,
        400
      );
    }

    const { applicationId, type, note } = parsed.data;

    // Verify the job exists
    const raw = await storage.getJSON<Job[] | { jobs: Job[] }>(
      `users/${userId}/jobs/index.json`
    );
    const jobs: Job[] = Array.isArray(raw) ? raw : (raw as { jobs: Job[] })?.jobs ?? [];
    const jobExists = jobs.some((j) => j.id === applicationId);

    if (!jobExists) {
      return errorResponse('Job not found', 404);
    }

    const existingEvents = await loadEvents(userId, applicationId);
    const newEvent: PipelineEvent = {
      id: generateId(),
      type,
      note,
      timestamp: new Date().toISOString(),
    };
    const updatedEvents = [...existingEvents, newEvent];
    await saveEvents(userId, applicationId, updatedEvents);

    logger.info({ userId, applicationId, eventType: type }, 'Pipeline event logged');

    return successResponse({ event: newEvent, events: updatedEvents });
  } catch (error) {
    return handleError(error);
  }
}

// ─── GET /api/pipeline/export — CSV download ──────────────────────────────────
// Handled via a separate route file at /api/pipeline/export/route.ts
// so Next.js can dispatch to it. This file handles the main /api/pipeline path.
