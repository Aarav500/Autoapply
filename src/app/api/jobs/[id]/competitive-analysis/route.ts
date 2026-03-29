/**
 * POST /api/jobs/[id]/competitive-analysis
 * AI analysis of how the user stacks up against the typical applicant pool for a job.
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticate, successResponse, errorResponse, handleError } from '@/lib/api-utils';
import { aiClient } from '@/lib/ai-client';
import { storage } from '@/lib/storage';
import { logger } from '@/lib/logger';
import type { Profile } from '@/types/profile';
import type { Job } from '@/types/job';

// ─── AI output schema ──────────────────────────────────────────────────────────

const analysisSchema = z.object({
  applicant_pool_description: z.string(),
  user_ranking: z.string(),
  competitive_advantages: z.array(z.string()),
  critical_gaps: z.array(z.string()),
  application_strategy: z.string(),
  keywords_to_emphasize: z.array(z.string()),
  red_flags_to_address: z.array(z.string()),
});

// ─── Handler ───────────────────────────────────────────────────────────────────

/**
 * POST /api/jobs/[id]/competitive-analysis
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await authenticate(req);
    const { id: jobId } = await params;

    // Load job from S3
    const job = await storage.getJSON<Job>(`users/${userId}/jobs/${jobId}.json`);
    if (!job) {
      return errorResponse('Job not found.', 404, 'JOB_NOT_FOUND');
    }

    // Load user profile
    const profile = await storage.getJSON<Profile>(`users/${userId}/profile.json`);
    if (!profile) {
      return errorResponse(
        'Profile not found. Please complete your profile first.',
        404,
        'PROFILE_NOT_FOUND'
      );
    }

    logger.info({ userId, jobId }, 'Competitive analysis request');

    // Build a rich profile summary for the AI
    const skillsSummary = (profile.skills ?? [])
      .map((s) => `${s.name} (${s.proficiency})`)
      .join(', ');

    const experienceSummary = (profile.experience ?? [])
      .slice(0, 5)
      .map((e) => {
        const start = e.startDate ? new Date(e.startDate).getFullYear() : '?';
        const end = e.endDate ? new Date(e.endDate).getFullYear() : 'Present';
        return `${e.role} at ${e.company} (${start}–${end})`;
      })
      .join('; ');

    const educationSummary = (profile.education ?? [])
      .map((e) => `${e.degree}${e.field ? ` in ${e.field}` : ''} from ${e.institution}`)
      .join('; ');

    const systemPrompt = `You are a top-tier talent acquisition expert with 15+ years of recruiting experience at FAANG, leading startups, and Fortune 500 companies. You have reviewed hundreds of thousands of applications and know exactly what hiring managers look for at each company type and level.

You give brutally honest, specific competitive analysis. You are not here to make candidates feel good — you are here to give them actionable intelligence so they can position themselves optimally and outcompete other applicants.`;

    const userPrompt = `Provide a competitive analysis for this candidate applying to this job:

JOB DETAILS:
Title: ${job.title}
Company: ${job.company}
Location: ${job.location ?? 'Not specified'}
Job Type: ${job.jobType ?? 'Not specified'}
Description:
${(job.description ?? '').slice(0, 3000)}

CANDIDATE PROFILE:
Name: ${profile.name ?? 'Candidate'}
Headline: ${profile.headline ?? 'Not specified'}
Location: ${profile.location ?? 'Not specified'}
Skills: ${skillsSummary || 'None listed'}
Experience: ${experienceSummary || 'None listed'}
Education: ${educationSummary || 'Not specified'}
Summary: ${(profile.summary ?? '').slice(0, 500) || 'Not provided'}

Return a JSON object with:
- applicant_pool_description: describe the typical applicant pool for this specific role at this company — who they are, their backgrounds, experience levels, education, and how many typically apply (be specific and realistic, 2-3 sentences)
- user_ranking: where this candidate likely ranks in the applicant pool — top 10%? top 25%? bottom half? — with a direct explanation of why (2-3 sentences)
- competitive_advantages: array of 4-6 specific ways this candidate stands out vs. the typical applicant — reference specific skills, experiences, or credentials from their profile
- critical_gaps: array of 3-5 genuine gaps or weaknesses vs. what hiring managers at ${job.company} typically want for this ${job.title} role — be honest and specific
- application_strategy: a 3-4 sentence strategic recommendation for how this candidate should position their application, what narrative to lead with, and what to prioritize
- keywords_to_emphasize: array of 8-12 specific keywords and phrases from the job description that this candidate should prominently feature in their CV and cover letter
- red_flags_to_address: array of 2-4 potential red flags or objections a recruiter might have about this candidate's application, and how to proactively address each one`;

    const result = await aiClient.completeJSON(
      systemPrompt,
      userPrompt,
      analysisSchema,
      { model: 'balanced', maxTokens: 4096 }
    );

    // Persist analysis alongside the job
    await storage.putJSON(
      `users/${userId}/jobs/${jobId}-competitive-analysis.json`,
      {
        jobId,
        result,
        generatedAt: new Date().toISOString(),
      }
    );

    logger.info({ userId, jobId }, 'Competitive analysis complete');

    return successResponse({ jobId, data: result });
  } catch (error) {
    logger.error({ error }, 'Competitive analysis error');
    return handleError(error);
  }
}
