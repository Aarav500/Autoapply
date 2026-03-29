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

    // Try to find matching job (index is saved as flat JobSummary[])
    let jobDetail = null;
    try {
      const jobsRaw = await storage.getJSON<any>(
        `users/${userId}/jobs/index.json`
      );
      const jobsArr: Array<{ id: string; company: string }> = Array.isArray(jobsRaw)
        ? jobsRaw
        : (jobsRaw?.jobs || []);

      const matchingJob = jobsArr.find(
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
    const tipsResult = await generateInterviewTips(interview.role, interview.company, profile);

    // Build prep package
    const prepPackage: PrepPackage = {
      interviewId,
      company: interview.company,
      role: interview.role,
      scheduledAt: interview.scheduledAt,
      companyResearch,
      questions,
      starAnswers,
      quickTips: tipsResult.tips,
      thingsToAvoid: tipsResult.avoidList,
      interviewDayChecklist: tipsResult.checklist,
      difficulty: tipsResult.difficulty,
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
  company: string,
  profile: Profile
): Promise<{ tips: string[]; avoidList: string[]; checklist: string[]; difficulty: string }> {
  const skillsList = (profile.skills || []).slice(0, 8).map((s) => s.name).join(', ');
  const yearsExp = (() => {
    if (!profile.experience || profile.experience.length === 0) return 0;
    const totalMonths = profile.experience.reduce((acc, exp) => {
      const start = new Date(exp.startDate || '2020-01-01');
      const end = exp.endDate ? new Date(exp.endDate) : new Date();
      return acc + Math.max(0, (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth());
    }, 0);
    return Math.round(totalMonths / 12);
  })();

  const tipsSchema = z.object({
    tips: z.array(z.string()).default([]),
    avoid: z.array(z.string()).default([]),
    checklist: z.array(z.string()).default([]),
    difficulty: z.string().default('Medium'),
    interview_format: z.string().default(''),
    time_to_prepare: z.string().default(''),
  });

  const result = await aiClient.completeJSON(
    `You are an expert interview coach with insider knowledge of hiring processes at top tech companies. Generate specific, actionable interview guidance — not generic advice. Every tip must be role and company specific.`,
    `Generate interview preparation guidance for:
Role: ${role}
Company: ${company}
Candidate Skills: ${skillsList}
Years of Experience: ${yearsExp}

Return JSON with:
- tips: 7-10 SPECIFIC tips for THIS role at THIS company (e.g., "${company} uses HackerRank for coding rounds — practice on that platform specifically, not just LeetCode", "For ${role} at ${company}, system design questions focus on X — prepare Y and Z specifically")
- avoid: 7-10 specific mistakes candidates make at ${company} interviews for ${role} (be specific, not generic)
- checklist: 10-12 day-of checklist items (mix of logistics and mental prep — be specific to remote vs onsite if you know)
- difficulty: "Easy|Medium|Hard|Very Hard" — honest assessment of how selective ${company} is for ${role}
- interview_format: brief description of typical interview format at ${company} for this type of role (rounds, types, timeline)
- time_to_prepare: recommended preparation time given candidate's ${yearsExp} years of experience`,
    tipsSchema,
    { model: 'balanced', maxTokens: 3072 }
  );

  return {
    tips: result.tips,
    avoidList: result.avoid,
    checklist: result.checklist,
    difficulty: `${result.difficulty} — ${result.interview_format} — Recommended prep: ${result.time_to_prepare}`,
  };
}
