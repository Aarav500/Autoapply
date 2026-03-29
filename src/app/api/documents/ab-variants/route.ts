/**
 * POST /api/documents/ab-variants
 * Generate 3 A/B cover letter variants (formal, warm, punchy) for a job.
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticate, successResponse, errorResponse, handleError } from '@/lib/api-utils';
import { aiClient } from '@/lib/ai-client';
import { storage } from '@/lib/storage';
import { logger } from '@/lib/logger';
import type { Profile } from '@/types/profile';

// ─── Request schema ────────────────────────────────────────────────────────────

const requestSchema = z.object({
  jobId: z.string().min(1),
  profileSummary: z.string().optional(),
});

// ─── AI response schema ────────────────────────────────────────────────────────

const variantSchema = z.object({
  variants: z.array(
    z.object({
      tone: z.enum(['formal', 'warm', 'punchy']),
      subject: z.string(),
      body: z.string(),
      keyStrength: z.string(),
    })
  ).length(3),
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

    const { jobId, profileSummary } = validation.data;

    // Load job from jobs index
    const jobsIndex = await storage.getJSON<{ jobs: Record<string, unknown>[] }>(
      `users/${userId}/jobs/index.json`
    );
    const jobsArray = Array.isArray(jobsIndex)
      ? (jobsIndex as Record<string, unknown>[])
      : (jobsIndex?.jobs ?? []);

    const job = jobsArray.find((j) => (j as Record<string, unknown>).id === jobId) as Record<string, unknown> | undefined;
    if (!job) {
      return errorResponse('Job not found', 404, 'JOB_NOT_FOUND');
    }

    // Load profile
    const profile = await storage.getJSON<Profile>(`users/${userId}/profile.json`);
    if (!profile) {
      return errorResponse('Profile not found', 404, 'PROFILE_NOT_FOUND');
    }

    logger.info({ userId, jobId }, 'Generating A/B cover letter variants');

    const name = profile.name || 'the applicant';
    const headline = profile.headline || '';
    const summary = profileSummary || profile.summary || '';
    const skills = (profile.skills || []).map((s) => s.name).slice(0, 10).join(', ');
    const topExp = (profile.experience || []).slice(0, 2).map(
      (e) => `${e.role} at ${e.company}`
    ).join('; ');

    const jobTitle = String(job.title ?? 'the role');
    const jobCompany = String(job.company ?? 'the company');
    const jobDescription = String(job.description ?? '');

    const systemPrompt = `You are an expert cover letter writer specializing in crafting highly personalized, persuasive cover letters.
Generate exactly 3 distinct cover letter variants with different tones: formal, warm, and punchy.

Each variant must:
- Have a compelling email subject line
- Be 3-4 paragraphs (200-300 words for the body)
- Highlight a specific key strength from the candidate's background
- Be distinct in tone — formal is professional/structured, warm is conversational/personable, punchy is bold/energetic/direct
- Be tailored to the specific job and company
- NOT use generic phrases like "I am writing to apply for..."`;

    const userPrompt = `Generate 3 A/B cover letter variants for:

Candidate: ${name}
Headline: ${headline}
Summary: ${summary}
Top Skills: ${skills}
Experience: ${topExp}

Target Role: ${jobTitle} at ${jobCompany}
Job Description: ${jobDescription.slice(0, 1500)}

Return exactly 3 variants with tones: "formal", "warm", "punchy".`;

    const result = await aiClient.completeJSON(systemPrompt, userPrompt, variantSchema, {
      model: 'balanced',
      maxTokens: 4096,
    });

    // Persist for future use
    await storage.putJSON(
      `users/${userId}/documents/ab-variants/${jobId}.json`,
      {
        jobId,
        jobTitle,
        jobCompany,
        generatedAt: new Date().toISOString(),
        variants: result.variants,
      }
    );

    logger.info({ userId, jobId }, 'A/B cover letter variants generated');

    return successResponse({ variants: result.variants, jobTitle, jobCompany });
  } catch (error) {
    logger.error({ error }, 'AB variants generation error');
    return handleError(error);
  }
}
