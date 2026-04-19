import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticate, successResponse, handleError, errorResponse } from '@/lib/api-utils';
import { storage } from '@/lib/storage';
import { aiClient } from '@/lib/ai-client';
import { generateId } from '@/lib/utils';
import { logger } from '@/lib/logger';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Offer {
  id: string;
  company: string;
  role: string;
  location: string;
  remote: 'remote' | 'hybrid' | 'onsite';
  baseSalary: number;
  targetBonus: number;
  signingBonus: number;
  equityGrant: number;
  equityVestingYears: number;
  pto: number;
  retirement401k: boolean;
  healthInsurance: 'excellent' | 'good' | 'basic' | 'none';
  learningBudget: number;
  workFromHomeStiped: number;
  notes: string;
  createdAt: string;
  annualEquityValue?: number;
  trueAnnualValue?: number;
}

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const SaveOfferSchema = z.object({
  action: z.literal('save'),
  company: z.string().min(1),
  role: z.string().min(1),
  location: z.string().min(1),
  remote: z.enum(['remote', 'hybrid', 'onsite']),
  baseSalary: z.number().min(0),
  targetBonus: z.number().min(0),
  signingBonus: z.number().min(0),
  equityGrant: z.number().min(0),
  equityVestingYears: z.number().min(1).default(4),
  pto: z.number().min(0),
  retirement401k: z.boolean(),
  healthInsurance: z.enum(['excellent', 'good', 'basic', 'none']),
  learningBudget: z.number().min(0),
  workFromHomeStiped: z.number().min(0),
  notes: z.string().default(''),
});

const CompareOffersSchema = z.object({
  action: z.literal('compare'),
  offerIds: z.array(z.string()).min(2),
});

const PostSchema = z.union([SaveOfferSchema, CompareOffersSchema]);

const DeleteSchema = z.object({
  id: z.string().min(1),
});

const AIComparisonSchema = z.object({
  winner: z.string(),
  reasoning: z.string(),
  pros_cons: z.array(
    z.object({
      company: z.string(),
      pros: z.array(z.string()),
      cons: z.array(z.string()),
    })
  ),
  negotiation_tips: z.array(z.string()),
  final_recommendation: z.string(),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeOfferValues(offer: Offer): Offer {
  const annualEquityValue =
    offer.equityVestingYears > 0
      ? offer.equityGrant / offer.equityVestingYears
      : 0;

  const trueAnnualValue =
    offer.baseSalary +
    offer.baseSalary * (offer.targetBonus / 100) +
    annualEquityValue +
    offer.signingBonus / 2 +
    offer.learningBudget +
    offer.workFromHomeStiped;

  return { ...offer, annualEquityValue, trueAnnualValue };
}

function offersStorageKey(userId: string): string {
  return `users/${userId}/offers/index.json`;
}

async function loadOffers(userId: string): Promise<Offer[]> {
  const raw = await storage.getJSON<Offer[]>(offersStorageKey(userId));
  return Array.isArray(raw) ? raw : [];
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);
    const offers = await loadOffers(userId);
    const withComputed = offers.map(computeOfferValues);

    logger.info({ userId, count: withComputed.length }, 'Offers loaded');
    return successResponse({ offers: withComputed });
  } catch (error) {
    logger.error({ error }, 'GET /api/offers error');
    return handleError(error);
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);
    const body: unknown = await req.json();
    const parsed = PostSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return errorResponse(firstError?.message ?? 'Invalid request', 400);
    }

    const data = parsed.data;

    // ── Save offer ─────────────────────────────────────────────────────────
    if (data.action === 'save') {
      const now = new Date().toISOString();
      const newOffer: Offer = {
        id: generateId(),
        company: data.company,
        role: data.role,
        location: data.location,
        remote: data.remote,
        baseSalary: data.baseSalary,
        targetBonus: data.targetBonus,
        signingBonus: data.signingBonus,
        equityGrant: data.equityGrant,
        equityVestingYears: data.equityVestingYears,
        pto: data.pto,
        retirement401k: data.retirement401k,
        healthInsurance: data.healthInsurance,
        learningBudget: data.learningBudget,
        workFromHomeStiped: data.workFromHomeStiped,
        notes: data.notes,
        createdAt: now,
      };

      const computed = computeOfferValues(newOffer);
      const existing = await loadOffers(userId);
      await storage.putJSON(offersStorageKey(userId), [...existing, computed]);

      logger.info({ userId, offerId: computed.id }, 'Offer saved');
      return successResponse({ offer: computed });
    }

    // ── Compare offers ─────────────────────────────────────────────────────
    if (data.action === 'compare') {
      const allOffers = await loadOffers(userId);
      const selected = allOffers
        .filter((o) => data.offerIds.includes(o.id))
        .map(computeOfferValues);

      if (selected.length < 2) {
        return errorResponse('At least 2 valid offers required for comparison', 400);
      }

      const healthMap: Record<string, string> = {
        excellent: 'Excellent (low deductibles, full family coverage)',
        good: 'Good (standard PPO/HMO)',
        basic: 'Basic (high deductible plan)',
        none: 'No health insurance provided',
      };

      const offerSummaries = selected
        .map(
          (o) =>
            `Company: ${o.company}
Role: ${o.role}
Location: ${o.location} (${o.remote})
Base Salary: $${o.baseSalary.toLocaleString()}
Target Bonus: ${o.targetBonus}% (~$${Math.round(o.baseSalary * o.targetBonus / 100).toLocaleString()}/yr)
Signing Bonus: $${o.signingBonus.toLocaleString()}
Equity: $${o.equityGrant.toLocaleString()} over ${o.equityVestingYears} years (~$${Math.round((o.annualEquityValue ?? 0)).toLocaleString()}/yr)
PTO: ${o.pto} days/year
401(k) Match: ${o.retirement401k ? 'Yes' : 'No'}
Health Insurance: ${healthMap[o.healthInsurance]}
Learning Budget: $${o.learningBudget.toLocaleString()}/year
WFH Stipend: $${o.workFromHomeStiped.toLocaleString()}/year
True Annual Value: $${Math.round(o.trueAnnualValue ?? 0).toLocaleString()}
Notes: ${o.notes || 'None'}`
        )
        .join('\n\n---\n\n');

      const systemPrompt = `You are a compensation expert and career advisor.
Analyze job offers objectively, weighing financial and non-financial factors.
Be specific about trade-offs. Provide actionable negotiation advice.
Always respond with valid JSON matching the requested schema.`;

      const userPrompt = `Compare these ${selected.length} job offers and recommend the best one:

${offerSummaries}

Provide a detailed comparison with:
1. Clear winner recommendation (use the company name)
2. Reasoning for the recommendation
3. Pros and cons for each company
4. Negotiation tips to improve each offer
5. Final recommendation paragraph`;

      const analysis = await aiClient.completeJSON(
        systemPrompt,
        userPrompt,
        AIComparisonSchema,
        { model: 'balanced', maxTokens: 2048 }
      );

      logger.info({ userId, offerIds: data.offerIds }, 'AI offer comparison completed');
      return successResponse({ analysis, offers: selected });
    }

    return errorResponse('Unknown action', 400);
  } catch (error) {
    logger.error({ error }, 'POST /api/offers error');
    return handleError(error);
  }
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);
    const body: unknown = await req.json();
    const parsed = DeleteSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse('Invalid request: id is required', 400);
    }

    const { id } = parsed.data;
    const existing = await loadOffers(userId);
    const filtered = existing.filter((o) => o.id !== id);

    if (filtered.length === existing.length) {
      return errorResponse('Offer not found', 404);
    }

    await storage.putJSON(offersStorageKey(userId), filtered);

    logger.info({ userId, offerId: id }, 'Offer deleted');
    return successResponse({ deleted: true });
  } catch (error) {
    logger.error({ error }, 'DELETE /api/offers error');
    return handleError(error);
  }
}
