/**
 * Interview question prediction service
 */

import { aiClient } from '@/lib/ai-client';
import { PredictedQuestion, PredictedQuestionSchema } from '@/types/interview';
import { Profile } from '@/types/profile';
import { AppError } from '@/lib/errors';
import { z } from 'zod';
import { randomUUID } from 'crypto';

interface JobInfo {
  title: string;
  company: string;
  description: string;
  requirements?: string[];
}

/**
 * Predict interview questions based on job and candidate profile
 */
export async function predictQuestions(
  job: JobInfo,
  profile: Profile
): Promise<PredictedQuestion[]> {
  try {
    const systemPrompt = `You are an experienced technical interviewer and career coach.
Generate a comprehensive set of interview questions for a ${job.title} position at ${job.company}.

Question categories:
1. BEHAVIORAL (10 questions): Leadership, teamwork, conflict resolution, failure, achievement, handling pressure, communication, adaptability, problem-solving, career goals
2. TECHNICAL (5-10 questions): Based on job requirements and candidate's skills - can be coding problems, system design, architecture, tools/frameworks
3. COMPANY_SPECIFIC (3-5 questions): About the company's products, culture, challenges, or industry
4. CURVEBALL (2-3 questions): Unexpected questions to test thinking on your feet
5. TO_ASK (5 questions): Smart questions the candidate should ask the interviewer

For each question provide:
- question: The actual question text
- category: One of the 5 categories above
- difficulty: easy/medium/hard
- whatTheyTest: What the interviewer is assessing (e.g., "Leadership and conflict resolution skills")
- tipToAnswer: Brief tip on how to approach answering this question

Make technical questions specific to the role's tech stack.
Make behavioral questions relevant to the seniority level.
Make company questions show you've done research.`;

    const candidateContext = buildCandidateContext(profile);
    const jobContext = buildJobContext(job);

    const userPrompt = `${jobContext}

${candidateContext}

Generate 25-30 interview questions covering all 5 categories. Return as JSON array of questions.`;

    const questionsSchema = z.object({
      questions: z.array(PredictedQuestionSchema.omit({ id: true })),
    });

    const result = await aiClient.completeJSON(
      systemPrompt,
      userPrompt,
      questionsSchema,
      { model: 'powerful' }
    );

    // Add unique IDs to each question
    const questionsWithIds = result.questions.map((q) => ({
      ...q,
      id: randomUUID(),
    }));

    return questionsWithIds;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to predict interview questions', 500, 'AI_ERROR');
  }
}

/**
 * Build candidate context from profile
 */
function buildCandidateContext(profile: Profile): string {
  const skillsList = profile.skills
    .filter((s) => s.proficiency === 'expert' || s.proficiency === 'advanced')
    .map((s) => s.name)
    .slice(0, 10)
    .join(', ');

  const experienceSummary = profile.experience
    .slice(0, 3)
    .map((e) => `${e.role} at ${e.company}`)
    .join('; ');

  const yearsOfExperience = calculateYearsOfExperience(profile);

  return `CANDIDATE PROFILE:
Name: ${profile.name}
Years of Experience: ${yearsOfExperience}
Top Skills: ${skillsList || 'Not specified'}
Recent Experience: ${experienceSummary || 'Not specified'}
Education: ${profile.education[0]?.degree || 'Not specified'} ${profile.education[0]?.field ? `in ${profile.education[0].field}` : ''}`;
}

/**
 * Build job context
 */
function buildJobContext(job: JobInfo): string {
  const requirements = job.requirements?.slice(0, 10).join(', ') || 'Not specified';

  return `JOB DETAILS:
Role: ${job.title}
Company: ${job.company}
Description: ${job.description.slice(0, 500)}${job.description.length > 500 ? '...' : ''}
Key Requirements: ${requirements}`;
}

/**
 * Calculate total years of experience
 */
function calculateYearsOfExperience(profile: Profile): number {
  if (profile.experience.length === 0) return 0;

  const totalMs = profile.experience.reduce((acc, exp) => {
    const start = new Date(exp.startDate).getTime();
    const end = exp.endDate ? new Date(exp.endDate).getTime() : Date.now();
    return acc + (end - start);
  }, 0);

  return Math.round(totalMs / (1000 * 60 * 60 * 24 * 365));
}
