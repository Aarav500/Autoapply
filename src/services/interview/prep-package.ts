/**
 * Interview prep package generator
 */

import { storage } from '@/lib/storage';
import { aiClient } from '@/lib/ai-client';
import {
  PrepPackage,
  PrepPackageSchema,
  Interview,
  InterviewSchema,
} from '@/types/interview';
import { Profile, ProfileSchema } from '@/types/profile';
import { AppError, NotFoundError } from '@/lib/errors';
import { z } from 'zod';
import { compileCompanyResearch } from './company-research';
import { predictQuestions } from './question-predictor';
import { buildSTARAnswers } from './star-builder';

/**
 * Generate or retrieve cached prep package for an interview
 */
export async function generatePrepPackage(
  userId: string,
  interviewId: string
): Promise<PrepPackage> {
  try {
    // Check if prep already exists and is recent (< 24 hours old)
    const prepPath = `users/${userId}/interviews/${interviewId}/prep.json`;
    const existing = await storage.getJSON<PrepPackage>(prepPath);

    if (existing) {
      const age = Date.now() - new Date(existing.generatedAt).getTime();
      const twentyFourHours = 24 * 60 * 60 * 1000;

      if (age < twentyFourHours) {
        return existing;
      }
    }

    // Load interview and profile
    const interview = await storage.getJSON<Interview>(
      `users/${userId}/interviews/${interviewId}.json`
    );

    const profile = await storage.getJSON<Profile>(
      `users/${userId}/profile.json`
    );

    if (!interview) {
      throw new NotFoundError('Interview not found');
    }

    if (!profile) {
      throw new NotFoundError('Profile not found');
    }

    // Try to find matching job
    let jobDetail = null;
    try {
      const jobsIndex = await storage.getJSON<{ jobs: Array<{ id: string; company: string }> }>(
        `users/${userId}/jobs/index.json`
      );

      const matchingJob = jobsIndex?.jobs?.find(
        (j) => j.company.toLowerCase() === interview.company.toLowerCase()
      );

      if (matchingJob) {
        jobDetail = await storage.getJSON<{
          title: string;
          description: string;
          requirements?: string[];
        }>(`users/${userId}/jobs/${matchingJob.id}.json`);
      }
    } catch {
      // No jobs found, continue without job details
    }

    // Run company research and questions in parallel
    const [companyResearch, questions] = await Promise.all([
      compileCompanyResearch(interview.company, interview.role),
      predictQuestions(
        {
          title: interview.role,
          company: interview.company,
          description: jobDetail?.description || `${interview.role} position at ${interview.company}`,
          requirements: jobDetail?.requirements,
        },
        profile
      ),
    ]);

    // STAR answers depend on questions
    const starAnswers = await buildSTARAnswers(questions, profile);

    // Generate quick tips, things to avoid, and checklist
    const tipsResult = await generateInterviewTips(interview.role, interview.company);

    // Build prep package
    const prepPackage: PrepPackage = {
      interviewId,
      company: interview.company,
      role: interview.role,
      scheduledAt: interview.scheduledAt,
      companyResearch,
      questions,
      starAnswers,
      quickTips: tipsResult.quickTips,
      thingsToAvoid: tipsResult.thingsToAvoid,
      interviewDayChecklist: tipsResult.checklist,
      generatedAt: new Date().toISOString(),
    };

    // Save to S3
    await storage.putJSON(prepPath, prepPackage);

    return prepPackage;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to generate prep package', 500, 'INTERNAL_ERROR');
  }
}

/**
 * Generate interview tips, things to avoid, and checklist
 */
async function generateInterviewTips(
  role: string,
  company: string
): Promise<{
  quickTips: string[];
  thingsToAvoid: string[];
  checklist: string[];
}> {
  const systemPrompt = `You are a career coach providing practical interview advice.
Generate actionable tips that will actually help in an interview.`;

  const userPrompt = `Generate interview preparation advice for a ${role} interview at ${company}.

Provide:
1. quickTips: 5 specific, actionable tips (not generic advice like "be yourself")
2. thingsToAvoid: 5 common mistakes to avoid in interviews
3. checklist: 7 items for interview day (logistics, preparation, materials to bring)

Return JSON: { "quickTips": ["..."], "thingsToAvoid": ["..."], "checklist": ["..."] }`;

  const schema = z.object({
    quickTips: z.array(z.string()).length(5),
    thingsToAvoid: z.array(z.string()).length(5),
    checklist: z.array(z.string()).length(7),
  });

  const result = await aiClient.completeJSON(systemPrompt, userPrompt, schema, { model: 'fast' });

  return result;
}
