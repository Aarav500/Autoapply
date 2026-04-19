/**
 * GET  /api/bgcheck   — load background check state (or return defaults)
 * POST /api/bgcheck   — update state OR get AI guidance on a flagged item
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticate, successResponse, errorResponse, handleError } from '@/lib/api-utils';
import { aiClient } from '@/lib/ai-client';
import { storage } from '@/lib/storage';
import { logger } from '@/lib/logger';
import { generateId } from '@/lib/utils';

// ─── Types ─────────────────────────────────────────────────────────────────────

type Category = 'employment' | 'education' | 'criminal' | 'credit' | 'licenses' | 'references' | 'identity';
type ItemStatus = 'pending' | 'ready' | 'needs-attention' | 'not-applicable';
type OverallStatus = 'not-started' | 'in-progress' | 'ready';

interface ChecklistItem {
  id: string;
  category: Category;
  item: string;
  status: ItemStatus;
  notes: string;
  flagged: boolean;
  explanation?: string;
}

interface BGCheckState {
  items: ChecklistItem[];
  overallStatus: OverallStatus;
  lastUpdated: string;
}

// ─── Request schemas ────────────────────────────────────────────────────────────

const checklistItemSchema = z.object({
  id: z.string(),
  category: z.enum(['employment', 'education', 'criminal', 'credit', 'licenses', 'references', 'identity']),
  item: z.string(),
  status: z.enum(['pending', 'ready', 'needs-attention', 'not-applicable']),
  notes: z.string(),
  flagged: z.boolean(),
  explanation: z.string().optional(),
});

const updateSchema = z.object({
  action: z.literal('update'),
  items: z.array(checklistItemSchema),
});

const guidanceSchema = z.object({
  action: z.literal('get-guidance'),
  itemId: z.string(),
  situation: z.string().min(1),
});

const postSchema = z.discriminatedUnion('action', [updateSchema, guidanceSchema]);

// ─── Default items ─────────────────────────────────────────────────────────────

function buildDefaultItems(): ChecklistItem[] {
  const raw: Array<{ category: Category; item: string }> = [
    // Employment
    { category: 'employment', item: 'Verify exact employment dates for all jobs in last 7 years' },
    { category: 'employment', item: 'Have explanation ready for any employment gaps > 3 months' },
    { category: 'employment', item: 'Confirm all job titles match LinkedIn and resume exactly' },
    { category: 'employment', item: 'Have reference contacts ready for each employer' },
    { category: 'employment', item: 'Know your reason for leaving each position' },
    { category: 'employment', item: 'Locate W-2s or pay stubs if requested' },
    { category: 'employment', item: 'Document any contract/freelance work with dates' },
    // Education
    { category: 'education', item: 'Verify degree titles and graduation years match transcript' },
    { category: 'education', item: 'Have university contact info ready' },
    { category: 'education', item: 'International degrees: have equivalency documentation if needed' },
    { category: 'education', item: 'List all certifications with issuing organization and dates' },
    // Criminal / Civil
    { category: 'criminal', item: 'Know what a background check will find in your jurisdiction' },
    { category: 'criminal', item: 'Prepare truthful explanation for any criminal record' },
    { category: 'criminal', item: 'Note any civil litigation you were party to' },
    { category: 'criminal', item: "Understand what 'ban the box' laws apply in your state" },
    // Credit
    { category: 'credit', item: 'Check your credit report (annualcreditreport.com)' },
    { category: 'credit', item: 'Prepare explanation for any derogatory marks' },
    { category: 'credit', item: 'Know which roles typically require credit checks (finance, security clearance)' },
    // Professional Licenses
    { category: 'licenses', item: 'List all active licenses with numbers and expiration dates' },
    { category: 'licenses', item: 'Verify licenses show as active in state databases' },
    { category: 'licenses', item: 'Note any previously revoked/suspended licenses and context' },
    // References
    { category: 'references', item: 'Have 3-5 professional references ready with current contact info' },
    { category: 'references', item: 'Brief each reference on the role and what to emphasize' },
    { category: 'references', item: 'Confirm references know they may be contacted' },
    // Identity
    { category: 'identity', item: 'Have government-issued ID ready (passport or driver\'s license)' },
    { category: 'identity', item: 'Social Security card or equivalent' },
    { category: 'identity', item: 'Work authorization documentation if applicable (visa, EAD card)' },
  ];

  return raw.map((r) => ({
    id: generateId(),
    category: r.category,
    item: r.item,
    status: 'pending' as ItemStatus,
    notes: '',
    flagged: false,
  }));
}

function computeOverallStatus(items: ChecklistItem[]): OverallStatus {
  const resolved = items.filter(
    (i) => i.status === 'ready' || i.status === 'not-applicable'
  ).length;
  if (resolved === 0) return 'not-started';
  if (resolved === items.length) return 'ready';
  return 'in-progress';
}

// ─── GET ───────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);

    const existing = await storage.getJSON<BGCheckState>(
      `users/${userId}/bgcheck/state.json`
    );

    if (existing) {
      logger.info({ userId }, 'BGCheck state loaded');
      return successResponse(existing);
    }

    // First visit — build and persist defaults
    const defaultState: BGCheckState = {
      items: buildDefaultItems(),
      overallStatus: 'not-started',
      lastUpdated: new Date().toISOString(),
    };

    await storage.putJSON(`users/${userId}/bgcheck/state.json`, defaultState);
    logger.info({ userId }, 'BGCheck default state created');
    return successResponse(defaultState);
  } catch (error) {
    logger.error({ error }, 'BGCheck GET error');
    return handleError(error);
  }
}

// ─── POST ──────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);

    const body = await req.json();
    const validation = postSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse(
        validation.error.issues[0]?.message ?? 'Invalid request body',
        400,
        'VALIDATION_ERROR'
      );
    }

    const data = validation.data;

    // ── action: update ──────────────────────────────────────────────────────────
    if (data.action === 'update') {
      const overallStatus = computeOverallStatus(data.items);
      const newState: BGCheckState = {
        items: data.items,
        overallStatus,
        lastUpdated: new Date().toISOString(),
      };
      await storage.putJSON(`users/${userId}/bgcheck/state.json`, newState);
      logger.info({ userId, overallStatus }, 'BGCheck state updated');
      return successResponse(newState);
    }

    // ── action: get-guidance ───────────────────────────────────────────────────
    const { itemId, situation } = data;

    // Fetch the state to provide item context
    const state = await storage.getJSON<BGCheckState>(
      `users/${userId}/bgcheck/state.json`
    );
    const item = state?.items.find((i) => i.id === itemId);
    const itemContext = item ? `Checklist item: "${item.item}"` : '';

    const systemPrompt =
      'You are a background check specialist and HR advisor. Provide compassionate, practical guidance on how candidates can proactively address background check concerns.';

    const userPrompt = `${itemContext ? `${itemContext}\n\n` : ''}Candidate's situation: ${situation}

Please provide:
1. A clear, honest assessment of how employers typically view this situation
2. Specific, actionable steps to address or disclose it proactively
3. Example language the candidate can use when explaining this to an employer
4. Any relevant legal considerations or rights the candidate should know about

Keep your guidance supportive, non-judgmental, and practical. Be concise — 200-350 words.`;

    const guidance = await aiClient.complete(systemPrompt, userPrompt, {
      model: 'balanced',
      maxTokens: 1024,
    });

    logger.info({ userId, itemId }, 'BGCheck guidance generated');
    return successResponse({ guidance });
  } catch (error) {
    logger.error({ error }, 'BGCheck POST error');
    return handleError(error);
  }
}
