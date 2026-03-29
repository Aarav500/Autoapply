/**
 * POST /api/interview/star-validate
 * Validate a candidate's answer against the STAR framework.
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticate, successResponse, errorResponse, handleError } from '@/lib/api-utils';
import { aiClient } from '@/lib/ai-client';
import { logger } from '@/lib/logger';

// ─── Request schema ────────────────────────────────────────────────────────────

const requestSchema = z.object({
  answer: z.string().min(10, 'Answer must be at least 10 characters'),
  question: z.string().min(5, 'Question must be at least 5 characters'),
});

// ─── AI response schema ────────────────────────────────────────────────────────

const starSchema = z.object({
  hasSituation: z.boolean(),
  hasTask: z.boolean(),
  hasAction: z.boolean(),
  hasResult: z.boolean(),
  score: z.number().min(0).max(100),
  feedback: z.string(),
  improvedAnswer: z.string(),
  missingSections: z.array(z.string()),
});

// ─── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);

    const body = await req.json();
    const validation = requestSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse(
        validation.error.issues[0]?.message ?? 'Invalid request body',
        400,
        'VALIDATION_ERROR'
      );
    }

    const { answer, question } = validation.data;

    logger.info({ userId }, 'STAR validation request');

    const systemPrompt = `You are an expert interview coach specializing in the STAR framework (Situation, Task, Action, Result).
Analyze behavioral interview answers for STAR completeness and quality.

STAR Framework:
- Situation: Sets the context/background (what, when, where)
- Task: Describes the challenge/responsibility the candidate had
- Action: Explains the specific steps the candidate took (should be the longest part)
- Result: Quantifiable outcomes and lessons learned

Score the answer 0-100:
- 0-25: Missing 2+ STAR components
- 26-50: Has components but lacks detail
- 51-75: Good structure, some areas to improve
- 76-90: Strong STAR with clear actions and results
- 91-100: Excellent, quantified results, compelling narrative

Also provide an improved version of the answer that fills in any gaps while preserving the candidate's authentic voice.`;

    const userPrompt = `Interview Question: "${question}"

Candidate's Answer:
"${answer}"

Analyze this answer and return a JSON evaluation.`;

    const result = await aiClient.completeJSON(systemPrompt, userPrompt, starSchema, {
      model: 'balanced',
      maxTokens: 2048,
    });

    return successResponse(result);
  } catch (error) {
    logger.error({ error }, 'STAR validation error');
    return handleError(error);
  }
}
