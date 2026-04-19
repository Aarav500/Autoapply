import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticate, successResponse, errorResponse, handleError } from '@/lib/api-utils';
import { storage } from '@/lib/storage';
import { aiClient } from '@/lib/ai-client';
import { generateId } from '@/lib/utils';
import { logger } from '@/lib/logger';
import type { Profile } from '@/types/profile';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Reference {
  id: string;
  name: string;
  company: string;
  role: string;
  relationship: 'manager' | 'peer' | 'report' | 'client' | 'professor' | 'mentor';
  email?: string;
  phone?: string;
  linkedinUrl?: string;
  yearsWorkedTogether: number;
  context: string;
  strengths: string[];
  status: 'available' | 'asked' | 'confirmed' | 'used';
  lastPreparedAt?: string;
  notes: string;
  createdAt: string;
}

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const CreateReferenceSchema = z.object({
  action: z.literal('create'),
  name: z.string().min(1),
  company: z.string().min(1),
  role: z.string().min(1),
  relationship: z.enum(['manager', 'peer', 'report', 'client', 'professor', 'mentor']),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  linkedinUrl: z.string().url().optional(),
  yearsWorkedTogether: z.number().min(0),
  context: z.string().min(1),
  strengths: z.array(z.string()),
  status: z.enum(['available', 'asked', 'confirmed', 'used']).default('available'),
  notes: z.string().default(''),
});

const GenerateBriefSchema = z.object({
  action: z.literal('generate-brief'),
  referenceId: z.string().min(1),
  targetCompany: z.string().min(1),
  targetRole: z.string().min(1),
  interviewRound: z.string().min(1),
});

const PostBodySchema = z.discriminatedUnion('action', [
  CreateReferenceSchema,
  GenerateBriefSchema,
]);

const PatchBodySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).optional(),
  company: z.string().min(1).optional(),
  role: z.string().min(1).optional(),
  relationship: z.enum(['manager', 'peer', 'report', 'client', 'professor', 'mentor']).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  linkedinUrl: z.string().url().optional(),
  yearsWorkedTogether: z.number().min(0).optional(),
  context: z.string().min(1).optional(),
  strengths: z.array(z.string()).optional(),
  status: z.enum(['available', 'asked', 'confirmed', 'used']).optional(),
  notes: z.string().optional(),
});

const BriefOutputSchema = z.object({
  subject_line: z.string(),
  email_body: z.string(),
  talking_points: z.array(z.string()),
  company_context: z.string(),
  what_to_avoid: z.array(z.string()),
  expected_questions: z.array(z.string()),
});

// ─── Storage helpers ──────────────────────────────────────────────────────────

const REFS_KEY = (userId: string) => `users/${userId}/references/index.json`;

async function loadRefs(userId: string): Promise<Reference[]> {
  const raw = await storage.getJSON<Reference[]>(REFS_KEY(userId));
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [];
}

async function saveRefs(userId: string, refs: Reference[]): Promise<void> {
  await storage.putJSON(REFS_KEY(userId), refs);
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);
    const refs = await loadRefs(userId);
    logger.info({ userId, count: refs.length }, 'References fetched');
    return successResponse({ references: refs });
  } catch (error) {
    logger.error({ error }, 'GET /api/references error');
    return handleError(error);
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);
    const body: unknown = await req.json();
    const parsed = PostBodySchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message ?? 'Invalid request', 400);
    }

    const data = parsed.data;

    // ── create ──
    if (data.action === 'create') {
      const refs = await loadRefs(userId);

      const newRef: Reference = {
        id: generateId(),
        name: data.name,
        company: data.company,
        role: data.role,
        relationship: data.relationship,
        email: data.email,
        phone: data.phone,
        linkedinUrl: data.linkedinUrl,
        yearsWorkedTogether: data.yearsWorkedTogether,
        context: data.context,
        strengths: data.strengths,
        status: data.status,
        notes: data.notes,
        createdAt: new Date().toISOString(),
      };

      refs.push(newRef);
      await saveRefs(userId, refs);
      logger.info({ userId, referenceId: newRef.id }, 'Reference created');
      return successResponse({ reference: newRef }, 201);
    }

    // ── generate-brief ──
    if (data.action === 'generate-brief') {
      const { referenceId, targetCompany, targetRole, interviewRound } = data;

      const refs = await loadRefs(userId);
      const ref = refs.find((r) => r.id === referenceId);
      if (!ref) {
        return errorResponse('Reference not found', 404);
      }

      const profile = await storage.getJSON<Profile>(`users/${userId}/profile.json`);

      const candidateName = profile?.name ?? 'the candidate';
      const candidateHeadline = profile?.headline ?? '';
      const experienceSnippet =
        Array.isArray(profile?.experience) && profile.experience.length > 0
          ? profile.experience
              .slice(0, 3)
              .map((e) => `${e.role} at ${e.company}`)
              .join(', ')
          : 'various roles';

      const systemPrompt =
        'You are a career coach helping candidates prepare their professional references for final-round interviews. Write prep briefs that are specific, professional, and help references give compelling testimonials.';

      const userPrompt = `
Generate a reference prep brief for the following situation:

CANDIDATE: ${candidateName}
CANDIDATE HEADLINE: ${candidateHeadline}
CANDIDATE EXPERIENCE: ${experienceSnippet}

REFERENCE CONTACT:
- Name: ${ref.name}
- Their Role: ${ref.role} at ${ref.company}
- Relationship: ${ref.relationship} (${ref.yearsWorkedTogether} years worked together)
- Context: ${ref.context}
- Strengths they can speak to: ${ref.strengths.join(', ')}

TARGET OPPORTUNITY:
- Company: ${targetCompany}
- Role: ${targetRole}
- Interview Round: ${interviewRound}

Write a complete prep brief including:
1. A professional email the candidate can send to the reference
2. 4–6 specific talking points the reference should emphasize
3. Brief context about why this company is exciting / what makes it unique
4. Things the reference should NOT mention (weaknesses, unrelated projects, etc.)
5. Questions the hiring team is likely to ask the reference

Be specific, concrete, and tailored to the relationship and role.
`.trim();

      const brief = await aiClient.completeJSON(systemPrompt, userPrompt, BriefOutputSchema, {
        model: 'balanced',
        maxTokens: 2048,
      });

      // Persist brief
      const briefKey = `users/${userId}/references/${referenceId}-brief-${Date.now()}.json`;
      await storage.putJSON(briefKey, {
        referenceId,
        targetCompany,
        targetRole,
        interviewRound,
        generatedAt: new Date().toISOString(),
        brief,
      });

      // Update lastPreparedAt on the reference record
      const updatedRefs = refs.map((r) =>
        r.id === referenceId ? { ...r, lastPreparedAt: new Date().toISOString() } : r
      );
      await saveRefs(userId, updatedRefs);

      logger.info({ userId, referenceId, targetCompany, targetRole }, 'Reference brief generated');
      return successResponse({ brief });
    }

    return errorResponse('Unknown action', 400);
  } catch (error) {
    logger.error({ error }, 'POST /api/references error');
    return handleError(error);
  }
}

// ─── PATCH ────────────────────────────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);
    const body: unknown = await req.json();
    const parsed = PatchBodySchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message ?? 'Invalid request', 400);
    }

    const { id, ...updates } = parsed.data;
    const refs = await loadRefs(userId);
    const idx = refs.findIndex((r) => r.id === id);

    if (idx === -1) {
      return errorResponse('Reference not found', 404);
    }

    refs[idx] = { ...refs[idx], ...updates };
    await saveRefs(userId, refs);

    logger.info({ userId, referenceId: id }, 'Reference updated');
    return successResponse({ reference: refs[idx] });
  } catch (error) {
    logger.error({ error }, 'PATCH /api/references error');
    return handleError(error);
  }
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);
    const { searchParams } = req.nextUrl;
    const id = searchParams.get('id');

    if (!id) {
      return errorResponse('Missing reference id', 400);
    }

    const refs = await loadRefs(userId);
    const filtered = refs.filter((r) => r.id !== id);

    if (filtered.length === refs.length) {
      return errorResponse('Reference not found', 404);
    }

    await saveRefs(userId, filtered);
    logger.info({ userId, referenceId: id }, 'Reference deleted');
    return successResponse({ deleted: true });
  } catch (error) {
    logger.error({ error }, 'DELETE /api/references error');
    return handleError(error);
  }
}
