/**
 * GET /api/interview/company-questions?company=Google&role=Software+Engineer
 * Return AI-generated company-specific interview questions with caching.
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticate, successResponse, errorResponse, handleError } from '@/lib/api-utils';
import { aiClient } from '@/lib/ai-client';
import { storage } from '@/lib/storage';
import { logger } from '@/lib/logger';

// ─── AI response schema ────────────────────────────────────────────────────────

const companyQuestionsSchema = z.object({
  company: z.string(),
  role: z.string(),
  questions: z.array(
    z.object({
      question: z.string(),
      category: z.enum(['behavioral', 'technical', 'culture', 'situational']),
      difficulty: z.enum(['easy', 'medium', 'hard']),
      tip: z.string(),
      sampleAnswer: z.string(),
    })
  ),
  interviewProcess: z.string(),
  tips: z.array(z.string()),
});

type CompanyQuestionsResult = z.infer<typeof companyQuestionsSchema>;

// ─── Slug helper ──────────────────────────────────────────────────────────────

function toSlug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// ─── Handler ───────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);

    const { searchParams } = new URL(req.url);
    const company = searchParams.get('company')?.trim();
    const role = searchParams.get('role')?.trim() || 'Software Engineer';

    if (!company || company.length === 0) {
      return errorResponse('company query parameter is required', 400, 'VALIDATION_ERROR');
    }

    const cacheKey = `users/${userId}/interview/company-questions/${toSlug(company)}-${toSlug(role)}.json`;

    // Check cache first
    const cached = await storage.getJSON<CompanyQuestionsResult & { cachedAt: string }>(cacheKey);
    if (cached) {
      logger.info({ userId, company, role }, 'Company questions cache hit');
      return successResponse(cached);
    }

    logger.info({ userId, company, role }, 'Generating company questions');

    const systemPrompt = `You are an expert interview preparation coach with deep knowledge of tech company hiring processes.
Generate realistic, specific interview questions for a given company and role.

For each question:
- Make it specific to the company's culture/values/tech stack when known
- Provide a practical tip for answering it
- Include a concise sample answer (2-3 sentences)
- Assign the correct category and difficulty

Categories:
- behavioral: Past experience questions (Tell me about a time...)
- technical: Role-specific technical knowledge
- culture: Company values, team fit, working style
- situational: Hypothetical problem-solving scenarios

Generate 10-15 questions total across all categories.
Also describe the typical interview process for this company/role and provide 3-5 top preparation tips.`;

    const userPrompt = `Generate interview questions for:
Company: ${company}
Role: ${role}

Include a mix of behavioral, technical, culture, and situational questions.
Make them specific to ${company}'s known interview style and the ${role} position requirements.`;

    const result = await aiClient.completeJSON(systemPrompt, userPrompt, companyQuestionsSchema, {
      model: 'balanced',
      maxTokens: 4096,
    });

    const toStore = {
      ...result,
      cachedAt: new Date().toISOString(),
    };

    // Cache the result
    await storage.putJSON(cacheKey, toStore);

    logger.info({ userId, company, role, questionCount: result.questions.length }, 'Company questions generated and cached');

    return successResponse(toStore);
  } catch (error) {
    logger.error({ error }, 'Company questions error');
    return handleError(error);
  }
}
