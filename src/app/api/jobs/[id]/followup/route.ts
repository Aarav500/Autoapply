import { NextRequest } from 'next/server';
import { authenticate, handleError, successResponse, errorResponse } from '@/lib/api-utils';
import { storage } from '@/lib/storage';
import { aiClient } from '@/lib/ai-client';
import { generateId } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import type { Job } from '@/types/job';
import type { Profile } from '@/types/profile';

const FollowUpBodySchema = z.object({
  daysDelay: z.number().int().min(1).max(90),
  type: z.enum(['follow-up', 'check-in', 'close-loop']),
});

interface FollowUpEntry {
  id: string;
  jobId: string;
  type: string;
  daysDelay: number;
  scheduledDate: string;
  subject: string;
  emailDraft: string;
  createdAt: string;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await authenticate(req);
    const { id: jobId } = await params;

    const body = await req.json();
    const validation = FollowUpBodySchema.safeParse(body);
    if (!validation.success) {
      return errorResponse('Invalid request body', 400, 'VALIDATION_ERROR');
    }

    const { daysDelay, type } = validation.data;

    // Load jobs index to find the specific job
    const raw = await storage.getJSON<unknown>(`users/${userId}/jobs/index.json`);
    const jobs: Job[] = Array.isArray(raw)
      ? (raw as Job[])
      : ((raw as { jobs?: Job[] } | null)?.jobs ?? []);

    const job = jobs.find((j) => j.id === jobId);
    if (!job) {
      return errorResponse('Job not found', 404, 'NOT_FOUND');
    }

    // Load profile for personalization
    const profile = await storage.getJSON<Profile>(`users/${userId}/profile.json`).catch(() => null);

    const candidateName = profile?.name ?? 'the candidate';
    const candidateEmail = profile?.email ?? '';

    // Compute scheduled date
    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + daysDelay);
    const scheduledDateStr = scheduledDate.toISOString().slice(0, 10);

    // Determine email intent
    const intentMap = {
      'follow-up': 'a polite follow-up to check on the status of their application',
      'check-in': 'a friendly check-in to express continued interest and ask if there is any update',
      'close-loop': 'a graceful close-the-loop message accepting that the role may have been filled and keeping the door open for future opportunities',
    };
    const intent = intentMap[type];

    // Draft subject
    const subjectPrefixMap = {
      'follow-up': 'Following up',
      'check-in': 'Checking in',
      'close-loop': 'Re: Application',
    };
    const subjectPrefix = subjectPrefixMap[type];
    const subject = `${subjectPrefix} — ${job.title} at ${job.company}`;

    // Generate email draft via AI
    const systemPrompt = `You are an expert career coach and email writer. Write professional, concise, and warm job-application follow-up emails. The email should be 3-4 short paragraphs, have no placeholder text, and feel genuine.`;

    const userPrompt = `Write ${intent} for:
Candidate: ${candidateName}${candidateEmail ? ` (${candidateEmail})` : ''}
Role applied for: ${job.title}
Company: ${job.company}
Days since applying: approximately ${daysDelay} days
Application status: ${job.status}

Output only the email body (no subject line, no "Dear [Name]" — start from after the greeting, beginning with "I hope").`;

    const emailDraft = await aiClient.complete(systemPrompt, userPrompt, {
      model: 'balanced',
      maxTokens: 400,
    });

    // Persist follow-up plan
    const followUpKey = `users/${userId}/jobs/${jobId}/followups.json`;
    const existingRaw = await storage.getJSON<FollowUpEntry[]>(followUpKey).catch(() => null);
    const existing: FollowUpEntry[] = Array.isArray(existingRaw) ? existingRaw : [];

    const newEntry: FollowUpEntry = {
      id: generateId(),
      jobId,
      type,
      daysDelay,
      scheduledDate: scheduledDateStr,
      subject,
      emailDraft,
      createdAt: new Date().toISOString(),
    };

    existing.push(newEntry);
    await storage.putJSON(followUpKey, existing);

    logger.info({ userId, jobId, type, scheduledDate: scheduledDateStr }, 'Follow-up scheduled');

    return successResponse({
      emailDraft,
      scheduledDate: scheduledDateStr,
      subject,
    });
  } catch (error) {
    logger.error({ error }, 'Follow-up generation error');
    return handleError(error);
  }
}
