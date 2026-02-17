/**
 * STAR answer builder service for behavioral questions
 */

import { aiClient } from '@/lib/ai-client';
import { PredictedQuestion, STARAnswer, STARAnswerSchema } from '@/types/interview';
import { Profile } from '@/types/profile';
import { AppError } from '@/lib/errors';
import { z } from 'zod';

/**
 * Build STAR answers for behavioral and company-specific questions
 */
export async function buildSTARAnswers(
  questions: PredictedQuestion[],
  profile: Profile
): Promise<STARAnswer[]> {
  try {
    // Filter to behavioral and company-specific questions
    const behavioralQuestions = questions.filter(
      (q) => q.category === 'behavioral' || q.category === 'company_specific'
    );

    if (behavioralQuestions.length === 0) {
      return [];
    }

    // Process in batches of 3 to manage token usage
    const batchSize = 3;
    const allAnswers: STARAnswer[] = [];

    for (let i = 0; i < behavioralQuestions.length; i += batchSize) {
      const batch = behavioralQuestions.slice(i, i + batchSize);
      const batchAnswers = await processBatch(batch, profile);
      allAnswers.push(...batchAnswers);
    }

    return allAnswers;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to build STAR answers', 500, 'AI_ERROR');
  }
}

/**
 * Process a batch of questions
 */
async function processBatch(
  questions: PredictedQuestion[],
  profile: Profile
): Promise<STARAnswer[]> {
  const systemPrompt = `You are a career coach helping a candidate prepare STAR (Situation, Task, Action, Result) answers for behavioral interview questions.

STAR Framework:
- Situation: Set the context (where, when, what was happening)
- Task: Explain the challenge or responsibility
- Action: Describe what YOU did (use "I", not "we")
- Result: Share the outcome with metrics/impact when possible

Rules:
1. Use REAL experience from the candidate's work history
2. Each answer should be deliverable in 1.5-2 minutes (150-200 words total)
3. Include specific metrics/numbers in Results when possible
4. Make it conversational, not robotic
5. Focus on actions that demonstrate the skill being tested
6. Reference which experience/project this story comes from`;

  const experienceContext = buildExperienceContext(profile);
  const questionsText = questions
    .map((q, idx) => `${idx + 1}. ${q.question}\n   Testing: ${q.whatTheyTest}`)
    .join('\n\n');

  const userPrompt = `CANDIDATE EXPERIENCE:
${experienceContext}

QUESTIONS TO ANSWER:
${questionsText}

For each question, create a STAR answer using the candidate's real experience. Return as JSON array.`;

  const answersSchema = z.object({
    answers: z.array(
      z.object({
        questionId: z.string(),
        situation: z.string(),
        task: z.string(),
        action: z.string(),
        result: z.string(),
        experienceUsed: z.string(),
      })
    ),
  });

  const result = await aiClient.completeJSON(
    systemPrompt,
    userPrompt,
    answersSchema,
    { model: 'balanced' }
  );

  // Map questionId back to actual question IDs
  const answers: STARAnswer[] = result.answers.map((answer, idx) => ({
    ...answer,
    questionId: questions[idx].id,
  }));

  return answers;
}

/**
 * Build detailed experience context for AI
 */
function buildExperienceContext(profile: Profile): string {
  const experiences = profile.experience
    .slice(0, 5)
    .map((exp) => {
      const duration = calculateDuration(exp.startDate, exp.endDate);
      const bullets = exp.bullets.slice(0, 5).map((b) => `  - ${b}`).join('\n');

      return `${exp.role} at ${exp.company} (${duration})
${exp.description || ''}
Key achievements:
${bullets || '  - No specific achievements listed'}
Technologies: ${exp.technologies.join(', ') || 'Not specified'}`;
    })
    .join('\n\n---\n\n');

  const projects = profile.projects
    .slice(0, 3)
    .map((proj) => {
      return `${proj.name}
${proj.description || 'No description'}
Tech: ${proj.technologies.join(', ')}`;
    })
    .join('\n\n');

  let context = experiences;
  if (projects) {
    context += `\n\n--- NOTABLE PROJECTS ---\n\n${projects}`;
  }

  return context;
}

/**
 * Calculate duration string
 */
function calculateDuration(startDate: string, endDate: string | null): string {
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();

  const months = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30));
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;

  if (years === 0) return `${months} month${months === 1 ? '' : 's'}`;
  if (remainingMonths === 0) return `${years} year${years === 1 ? '' : 's'}`;
  return `${years} year${years === 1 ? '' : 's'} ${remainingMonths} month${remainingMonths === 1 ? '' : 's'}`;
}
