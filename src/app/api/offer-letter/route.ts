import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticate, successResponse, handleError } from '@/lib/api-utils';
import { aiClient } from '@/lib/ai-client';
import { storage } from '@/lib/storage';
import { generateId } from '@/lib/utils';
import { logger } from '@/lib/logger';

// ─── Input Schema ─────────────────────────────────────────────────────────────

const inputSchema = z.object({
  offerText: z.string().min(100).max(20000),
  role: z.string().optional(),
  company: z.string().optional(),
});

// ─── AI Output Schema ─────────────────────────────────────────────────────────

const analysisSchema = z.object({
  offer_health_score: z.number().min(0).max(100),
  overall_verdict: z.enum(['excellent', 'good', 'fair', 'concerning', 'red-flags-present']),
  summary: z.string(),

  compensation: z.object({
    base_salary: z.string(),
    bonus: z.string(),
    equity: z.string(),
    signing_bonus: z.string(),
    total_comp_estimate: z.string(),
    compensation_assessment: z.string(),
  }),

  equity_analysis: z.object({
    grant_amount: z.string(),
    vesting_schedule: z.string(),
    cliff: z.string(),
    acceleration: z.string(),
    strike_price: z.string().optional(),
    assessment: z.string(),
    is_standard: z.boolean(),
    concerns: z.array(z.string()),
  }),

  clauses: z.array(
    z.object({
      clause_type: z.enum([
        'nda',
        'non-compete',
        'ip-assignment',
        'clawback',
        'at-will',
        'arbitration',
        'benefits',
        'pto',
        'severance',
        'other',
      ]),
      extracted_text: z.string(),
      assessment: z.enum(['favorable', 'standard', 'unusual', 'concerning', 'red-flag']),
      explanation: z.string(),
      industry_standard: z.string(),
      negotiation_tip: z.string().optional(),
    })
  ),

  red_flags: z.array(
    z.object({
      issue: z.string(),
      severity: z.enum(['critical', 'high', 'medium', 'low']),
      explanation: z.string(),
      ask_to_change: z.string(),
    })
  ),

  favorable_terms: z.array(z.string()),

  negotiation_opportunities: z.array(
    z.object({
      item: z.string(),
      current: z.string(),
      ask_for: z.string(),
      script: z.string(),
    })
  ),

  questions_to_ask_hr: z.array(z.string()),
  recommendation: z.string(),
});

// ─── Stored Record Type ───────────────────────────────────────────────────────

interface OfferLetterRecord {
  id: string;
  company: string;
  role: string;
  analyzedAt: string;
  offer_health_score: number;
  overall_verdict: string;
  summary: string;
  compensation: z.infer<typeof analysisSchema>['compensation'];
  equity_analysis: z.infer<typeof analysisSchema>['equity_analysis'];
  clauses: z.infer<typeof analysisSchema>['clauses'];
  red_flags: z.infer<typeof analysisSchema>['red_flags'];
  favorable_terms: string[];
  negotiation_opportunities: z.infer<typeof analysisSchema>['negotiation_opportunities'];
  questions_to_ask_hr: string[];
  recommendation: string;
}

// ─── GET — return analysis history ───────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { userId } = await authenticate(request);

    const raw = await storage.getJSON<OfferLetterRecord[]>(
      `users/${userId}/offer-letter/index.json`
    );
    const history: OfferLetterRecord[] = Array.isArray(raw) ? raw : [];

    return successResponse({ history });
  } catch (error) {
    return handleError(error);
  }
}

// ─── POST — analyze offer letter ─────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const { userId } = await authenticate(request);

    const body = await request.json();
    const { offerText, role, company } = inputSchema.parse(body);

    const systemPrompt =
      'You are a senior employment attorney and compensation expert who has reviewed thousands of offer letters at top tech companies. You identify every clause, compare to industry norms, and give candidates the legal and strategic insight they need to negotiate from a position of knowledge. Be specific about what is unusual versus standard. Always return valid JSON matching the requested schema exactly.';

    const contextLine = [
      role ? `Role: ${role}` : null,
      company ? `Company: ${company}` : null,
    ]
      .filter(Boolean)
      .join(' | ');

    const userPrompt = `Analyze the following offer letter thoroughly. Extract and evaluate every clause, compare compensation to industry standards, identify red flags and favorable terms, and provide actionable negotiation guidance.${contextLine ? `\n\nContext: ${contextLine}` : ''}

Offer Letter Text:
---
${offerText}
---

Return a comprehensive JSON analysis following the schema exactly.`;

    logger.info({ userId, company, role }, 'Analyzing offer letter');

    const analysis = await aiClient.completeJSON(systemPrompt, userPrompt, analysisSchema, {
      model: 'powerful',
      maxTokens: 4096,
    });

    const id = generateId();
    const record: OfferLetterRecord = {
      id,
      company: company ?? 'Unknown Company',
      role: role ?? 'Unknown Role',
      analyzedAt: new Date().toISOString(),
      ...analysis,
    };

    // Persist to history index
    try {
      const existingRaw = await storage.getJSON<OfferLetterRecord[]>(
        `users/${userId}/offer-letter/index.json`
      );
      const existing: OfferLetterRecord[] = Array.isArray(existingRaw) ? existingRaw : [];
      const updated = [record, ...existing].slice(0, 50);
      await storage.putJSON(`users/${userId}/offer-letter/index.json`, updated);
      await storage.putJSON(`users/${userId}/offer-letter/${id}.json`, record);
    } catch (storageError) {
      logger.warn({ userId, storageError }, 'Failed to persist offer letter analysis');
    }

    return successResponse({ analysis: record });
  } catch (error) {
    return handleError(error);
  }
}
