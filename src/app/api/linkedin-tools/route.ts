import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticate, successResponse, handleError, errorResponse } from '@/lib/api-utils';
import { aiClient } from '@/lib/ai-client';
import { storage } from '@/lib/storage';
import { generateId } from '@/lib/utils';
import { logger } from '@/lib/logger';

// ─── Types ────────────────────────────────────────────────────────────────────

interface GeneratedTarget {
  id: string;
  name: string;
  company: string;
  role: string;
  goal: 'connect' | 'referral' | 'coffee-chat' | 'job-inquiry';
  context?: string;
  connection_note: string;
  inmail_message: string;
  personalization_hooks: string[];
  response?: 'accepted' | 'replied' | 'ignored' | 'declined' | 'pending';
  respondedAt?: string;
}

interface Batch {
  id: string;
  generatedAt: string;
  targets: GeneratedTarget[];
  stats: {
    total: number;
    accepted: number;
    replied: number;
    ignored: number;
    declined: number;
  };
}

interface BatchesStore {
  batches: Batch[];
}

interface UserProfile {
  name?: string;
  headline?: string;
  skills?: Array<{ name: string; proficiency?: string }>;
}

// ─── Zod Input Schema ─────────────────────────────────────────────────────────

const targetInputSchema = z.object({
  name: z.string().min(1).max(100),
  company: z.string().min(1).max(100),
  role: z.string().min(1).max(100),
  context: z.string().max(300).optional(),
  goal: z.enum(['connect', 'referral', 'coffee-chat', 'job-inquiry']),
});

const inputSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('batch-generate'),
    targets: z.array(targetInputSchema).min(1).max(20),
  }),
  z.object({
    action: z.literal('track-response'),
    targetId: z.string(),
    batchId: z.string(),
    responseType: z.enum(['accepted', 'replied', 'ignored', 'declined']),
  }),
  z.object({
    action: z.literal('get-history'),
  }),
]);

// ─── AI Response Schema ───────────────────────────────────────────────────────

const aiOutputSchema = z.object({
  targets: z.array(
    z.object({
      name: z.string(),
      connection_note: z.string(),
      inmail_message: z.string(),
      personalization_hooks: z.array(z.string()),
    })
  ),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function computeStats(targets: GeneratedTarget[]): Batch['stats'] {
  return {
    total: targets.length,
    accepted: targets.filter((t) => t.response === 'accepted').length,
    replied: targets.filter((t) => t.response === 'replied').length,
    ignored: targets.filter((t) => t.response === 'ignored').length,
    declined: targets.filter((t) => t.response === 'declined').length,
  };
}

async function loadBatches(userId: string): Promise<BatchesStore> {
  const raw = await storage.getJSON<BatchesStore>(`users/${userId}/linkedin-tools/batches.json`);
  return raw ?? { batches: [] };
}

async function saveBatches(userId: string, store: BatchesStore): Promise<void> {
  await storage.putJSON(`users/${userId}/linkedin-tools/batches.json`, store);
}

// ─── GET Handler ─────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { userId } = await authenticate(request);
    const store = await loadBatches(userId);

    return successResponse({ batches: store.batches });
  } catch (error) {
    return handleError(error);
  }
}

// ─── POST Handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const { userId } = await authenticate(request);
    const body = await request.json();

    const parsed = inputSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message ?? 'Validation error', 400, 'VALIDATION_ERROR');
    }

    const data = parsed.data;

    // ── Batch Generate ───────────────────────────────────────────────────────
    if (data.action === 'batch-generate') {
      // Load profile for sender context
      const profile = await storage.getJSON<UserProfile>(`users/${userId}/profile.json`);
      const senderName = profile?.name ?? 'a professional';
      const senderHeadline = profile?.headline ?? 'seeking new opportunities';
      const topSkills = (profile?.skills ?? [])
        .slice(0, 5)
        .map((s) => s.name)
        .join(', ');

      logger.info({ userId, count: data.targets.length }, 'Generating LinkedIn outreach messages');

      const targetsPayload = data.targets
        .map(
          (t, i) =>
            `${i + 1}. Name: ${t.name} | Company: ${t.company} | Role: ${t.role} | Goal: ${t.goal}${t.context ? ` | Context: ${t.context}` : ''}`
        )
        .join('\n');

      const system = `You are a LinkedIn networking expert who writes connection requests that are specific, genuine, and never sound like templates. Reference something real about the person's background.
Sender context: ${senderName} — ${senderHeadline}. Top skills: ${topSkills || 'not specified'}.
Rules:
- connection_note: max 300 characters, warm and specific, never start with "Hi I noticed" cliché
- inmail_message: max 500 characters, reference the goal clearly, add value, no begging
- personalization_hooks: 2-4 strings explaining what was personalized (e.g. "Referenced their fintech background")`;

      const user = `Generate personalized LinkedIn messages for each target below. Return a JSON object with a "targets" array.

Targets:
${targetsPayload}`;

      const aiResult = await aiClient.completeJSON(system, user, aiOutputSchema, {
        model: 'balanced',
        maxTokens: 3072,
      });

      // Merge AI output with input metadata
      const generatedTargets: GeneratedTarget[] = data.targets.map((input, i) => {
        const ai = aiResult.targets[i] ?? {
          name: input.name,
          connection_note: `Hi ${input.name}, I'd love to connect regarding ${input.goal} opportunities at ${input.company}.`,
          inmail_message: `Hi ${input.name}, I came across your profile and would love to discuss ${input.goal} opportunities at ${input.company}. Would you be open to a conversation?`,
          personalization_hooks: ['Basic personalization'],
        };

        // Enforce character limits
        const note = ai.connection_note.slice(0, 300);
        const inmail = ai.inmail_message.slice(0, 500);

        return {
          id: generateId(),
          name: input.name,
          company: input.company,
          role: input.role,
          goal: input.goal,
          context: input.context,
          connection_note: note,
          inmail_message: inmail,
          personalization_hooks: ai.personalization_hooks ?? [],
          response: 'pending',
        };
      });

      const batchId = generateId();
      const batch: Batch = {
        id: batchId,
        generatedAt: new Date().toISOString(),
        targets: generatedTargets,
        stats: computeStats(generatedTargets),
      };

      const store = await loadBatches(userId);
      store.batches.unshift(batch);
      if (store.batches.length > 50) store.batches.splice(50);
      await saveBatches(userId, store);

      return successResponse({ batch });
    }

    // ── Track Response ───────────────────────────────────────────────────────
    if (data.action === 'track-response') {
      const store = await loadBatches(userId);
      const batchIdx = store.batches.findIndex((b) => b.id === data.batchId);

      if (batchIdx === -1) {
        return errorResponse('Batch not found', 404, 'NOT_FOUND');
      }

      const targetIdx = store.batches[batchIdx].targets.findIndex((t) => t.id === data.targetId);
      if (targetIdx === -1) {
        return errorResponse('Target not found in batch', 404, 'NOT_FOUND');
      }

      store.batches[batchIdx].targets[targetIdx].response = data.responseType;
      store.batches[batchIdx].targets[targetIdx].respondedAt = new Date().toISOString();
      store.batches[batchIdx].stats = computeStats(store.batches[batchIdx].targets);

      await saveBatches(userId, store);

      return successResponse({ batch: store.batches[batchIdx] });
    }

    // ── Get History ──────────────────────────────────────────────────────────
    if (data.action === 'get-history') {
      const store = await loadBatches(userId);
      return successResponse({ batches: store.batches });
    }

    return errorResponse('Invalid action', 400, 'INVALID_ACTION');
  } catch (error) {
    return handleError(error);
  }
}
