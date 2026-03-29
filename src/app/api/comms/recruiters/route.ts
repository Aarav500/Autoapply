import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticate, successResponse, errorResponse, handleError } from '@/lib/api-utils';
import { storage } from '@/lib/storage';
import { aiClient } from '@/lib/ai-client';
import { generateId } from '@/lib/utils';
import { z as zod } from 'zod';

export interface RecruiterContact {
  id: string;
  name: string;
  company: string;
  email?: string;
  linkedinUrl?: string;
  role?: string;
  firstContactAt: string;
  lastContactAt: string;
  emailCount: number;
  avgResponseDays?: number;
  conversionStatus: 'cold' | 'active' | 'interview' | 'offer' | 'closed';
  notes?: string;
  linkedJobIds: string[];
  tags: string[];
}

interface RecruiterIndex {
  recruiters: RecruiterContact[];
}

const AddSchema = z.object({
  name: z.string().min(1),
  company: z.string().min(1),
  email: z.string().email().optional(),
  linkedinUrl: z.string().url().optional(),
  role: z.string().optional(),
  notes: z.string().optional(),
  linkedJobIds: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
});

const UpdateSchema = z.object({
  id: z.string().min(1),
  name: z.string().optional(),
  company: z.string().optional(),
  email: z.string().email().optional(),
  linkedinUrl: z.string().url().optional(),
  notes: z.string().optional(),
  conversionStatus: z.enum(['cold', 'active', 'interview', 'offer', 'closed']).optional(),
  tags: z.array(z.string()).optional(),
});

const AnalyzeEmailSchema = z.object({
  emailText: z.string().min(10),
  recruiterName: z.string().optional(),
  company: z.string().optional(),
});

const RecruiterInsightSchema = zod.object({
  recruiterName: zod.string(),
  company: zod.string(),
  recruiterRole: zod.string(),
  emailTone: zod.enum(['warm', 'formal', 'urgent', 'generic']),
  intentSignals: zod.array(zod.string()),
  recommendedResponse: zod.string(),
  followUpIn: zod.number(),
  redFlags: zod.array(zod.string()),
});

async function loadIndex(userId: string): Promise<RecruiterContact[]> {
  const raw = await storage.getJSON<RecruiterIndex | RecruiterContact[]>(`users/${userId}/comms/recruiters.json`);
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  return raw.recruiters ?? [];
}

async function saveIndex(userId: string, recruiters: RecruiterContact[]): Promise<void> {
  await storage.putJSON(`users/${userId}/comms/recruiters.json`, { recruiters });
}

// GET /api/comms/recruiters
export async function GET(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);
    const recruiters = await loadIndex(userId);
    recruiters.sort((a, b) => new Date(b.lastContactAt).getTime() - new Date(a.lastContactAt).getTime());
    return successResponse({ recruiters });
  } catch (error) {
    return handleError(error);
  }
}

// POST /api/comms/recruiters — add or analyze
export async function POST(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    if (action === 'analyze') {
      const body: unknown = await req.json();
      const parsed = AnalyzeEmailSchema.safeParse(body);
      if (!parsed.success) return errorResponse('Invalid request', 400);

      const { emailText, recruiterName, company } = parsed.data;

      const systemPrompt = `You are an expert at analyzing recruiter outreach emails. Extract key signals and provide actionable advice for the job seeker.`;
      const userPrompt = `Analyze this recruiter email and extract structured insights:

Email: ${emailText}
${recruiterName ? `Recruiter Name: ${recruiterName}` : ''}
${company ? `Company: ${company}` : ''}

Return a JSON object with:
- recruiterName: their name (extract from email if not provided)
- company: company name (extract if not provided)
- recruiterRole: their job title (guess if not stated)
- emailTone: "warm", "formal", "urgent", or "generic"
- intentSignals: array of 2-4 signals about their intent (e.g., "specific role mentioned", "timeline pressure", "generic blast")
- recommendedResponse: a 2-3 sentence recommended response strategy
- followUpIn: days to follow up if no response (number)
- redFlags: array of any concerning signals (empty array if none)`;

      const insight = await aiClient.completeJSON(systemPrompt, userPrompt, RecruiterInsightSchema, { model: 'fast' });
      return successResponse({ insight });
    }

    // Default: add recruiter
    const body: unknown = await req.json();
    const parsed = AddSchema.safeParse(body);
    if (!parsed.success) return errorResponse(`Invalid: ${parsed.error.issues.map((e) => e.message).join(', ')}`, 400);

    const recruiters = await loadIndex(userId);
    const now = new Date().toISOString();
    const newRecruiter: RecruiterContact = {
      id: generateId(),
      ...parsed.data,
      firstContactAt: now,
      lastContactAt: now,
      emailCount: 1,
      conversionStatus: 'active',
      linkedJobIds: parsed.data.linkedJobIds,
      tags: parsed.data.tags,
    };

    recruiters.unshift(newRecruiter);
    await saveIndex(userId, recruiters);

    return successResponse({ recruiter: newRecruiter });
  } catch (error) {
    return handleError(error);
  }
}

// PATCH /api/comms/recruiters — update
export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);
    const body: unknown = await req.json();
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Invalid request', 400);

    const { id, ...updates } = parsed.data;
    const recruiters = await loadIndex(userId);
    const idx = recruiters.findIndex((r) => r.id === id);
    if (idx === -1) return errorResponse('Recruiter not found', 404);

    recruiters[idx] = {
      ...recruiters[idx],
      ...updates,
      lastContactAt: new Date().toISOString(),
    };

    await saveIndex(userId, recruiters);
    return successResponse({ recruiter: recruiters[idx] });
  } catch (error) {
    return handleError(error);
  }
}

// DELETE /api/comms/recruiters?id=xxx
export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return errorResponse('Missing id', 400);

    const recruiters = await loadIndex(userId);
    const updated = recruiters.filter((r) => r.id !== id);
    await saveIndex(userId, updated);

    return successResponse({ deleted: true });
  } catch (error) {
    return handleError(error);
  }
}
