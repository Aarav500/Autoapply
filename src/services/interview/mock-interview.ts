/**
 * Mock interview service for practice sessions
 */

import { aiClient } from '@/lib/ai-client';
import { storage } from '@/lib/storage';
import {
  MockSession,
  MockInterviewMode,
  MockDifficultyLevel,
  Interview,
  MockAnswerResponse,
  QuestionBank,
  QuestionBankItem,
} from '@/types/interview';
import { Profile } from '@/types/profile';
import { AppError, NotFoundError } from '@/lib/errors';
import { z } from 'zod';
import { randomUUID } from 'crypto';

/**
 * Compute the next difficulty level based on the latest score
 */
function computeNextDifficulty(
  current: MockDifficultyLevel,
  score: number
): MockDifficultyLevel {
  const levels: MockDifficultyLevel[] = ['warm-up', 'standard', 'challenging', 'intense'];
  const idx = levels.indexOf(current);
  if (score >= 80) {
    // Scale score: service uses 1-10, progression uses percentage — treat score as /10 * 100
    return levels[Math.min(idx + 1, levels.length - 1)];
  }
  if (score < 50) {
    return levels[Math.max(idx - 1, 0)];
  }
  return current;
}

/**
 * Scale a 1-10 score to 0-100 for difficulty logic
 */
function scoreTo100(score: number): number {
  return Math.round((score / 10) * 100);
}

/**
 * Start a new mock interview session
 */
export async function startMockInterview(
  userId: string,
  interviewId: string,
  mode: MockInterviewMode,
  difficulty: MockDifficultyLevel = 'warm-up'
): Promise<MockSession> {
  try {

    // Load interview details
    const interview = await storage.getJSON<Interview>(
      `users/${userId}/interviews/${interviewId}.json`
    );

    if (!interview) {
      throw new NotFoundError('Interview not found');
    }

    // Generate first question
    const firstQuestion = await generateFirstQuestion(mode, interview, userId, difficulty);

    // Create session
    const session: MockSession = {
      id: randomUUID(),
      interviewId,
      mode,
      difficulty,
      messages: [
        {
          role: 'interviewer',
          content: firstQuestion,
          timestamp: new Date().toISOString(),
        },
      ],
      scores: [],
      isComplete: false,
      overallAssessment: null,
      startedAt: new Date().toISOString(),
      completedAt: null,
    };

    // Save session
    await storage.putJSON(
      `users/${userId}/interviews/${interviewId}/mock-${session.id}.json`,
      session
    );

    return session;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to start mock interview', 500, 'INTERNAL_ERROR');
  }
}

/**
 * Process candidate's answer and get next question/feedback
 */
export async function processMockAnswer(
  userId: string,
  sessionId: string,
  answer: string
): Promise<MockAnswerResponse> {
  try {
  
    // Find session file
    const sessionPath = await findSessionPath(userId, sessionId);
    if (!sessionPath) {
      throw new NotFoundError('Mock session not found');
    }

    // Load session
    const session = await storage.getJSON<MockSession>(sessionPath);
    if (!session) {
      throw new NotFoundError('Mock session not found');
    }

    if (session.isComplete) {
      throw new AppError('Mock session is already complete', 400, 'VALIDATION_ERROR');
    }

    // Add candidate's answer to messages
    session.messages.push({
      role: 'candidate',
      content: answer,
      timestamp: new Date().toISOString(),
    });

    // Load interview and profile for context
    const interview = await storage.getJSON<Interview>(
      `users/${userId}/interviews/${session.interviewId}.json`
    );
    const profile = await storage.getJSON<Profile>(
      `users/${userId}/profile.json`
    );

    if (!interview || !profile) {
      throw new NotFoundError('Interview or profile not found');
    }

    // Determine if this should be the last question
    const questionNumber = session.scores.length + 1;
    const shouldWrapUp = questionNumber >= 6;

    // Get AI feedback (structured output)
    const parsed = await getInterviewerResponse(
      session,
      interview,
      profile,
      questionNumber,
      shouldWrapUp
    );

    // Add score
    session.scores.push({
      questionNumber,
      score: parsed.score,
      feedback: parsed.feedback,
    });

    // Compute next difficulty based on this answer's score
    const currentDifficulty: MockDifficultyLevel = session.difficulty ?? 'warm-up';
    const nextDifficulty = computeNextDifficulty(currentDifficulty, scoreTo100(parsed.score));

    // Add next question or wrap up
    if (shouldWrapUp && parsed.overallAssessment) {
      session.isComplete = true;
      session.completedAt = new Date().toISOString();
      const { score: oaScore, summary, strengths: oaStrengths, improvements: oaImprovements } = parsed.overallAssessment;
      session.overallAssessment = { score: oaScore, summary, strengths: oaStrengths, improvements: oaImprovements };

      session.messages.push({
        role: 'interviewer',
        content: `Thank you for your time. Here's my overall assessment:\n\n${parsed.overallAssessment.summary}`,
        timestamp: new Date().toISOString(),
      });
    } else if (parsed.nextQuestion) {
      // Update session difficulty for next question
      session.difficulty = nextDifficulty;
      session.messages.push({
        role: 'interviewer',
        content: parsed.nextQuestion,
        timestamp: new Date().toISOString(),
      });
    }

    // Save updated session
    await storage.putJSON(sessionPath, session);

    return {
      feedback: parsed.feedback,
      score: parsed.score,
      strengths: parsed.strengths,
      improvements: parsed.improvements,
      nextQuestion: parsed.nextQuestion,
      isComplete: session.isComplete,
      overallAssessment: session.overallAssessment,
      nextDifficulty,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to process mock answer', 500, 'INTERNAL_ERROR');
  }
}

const difficultyInstructions: Record<MockDifficultyLevel, string> = {
  'warm-up': 'Ask a gentle behavioral question to get the candidate comfortable',
  'standard': 'Ask a standard behavioral question as would be asked in a typical tech interview',
  'challenging': 'Ask a challenging question about a difficult situation or technical decision',
  'intense': 'Ask the most difficult questions — culture fit conflicts, failure analysis, leadership under pressure, highly technical system design behavioral questions',
};

/**
 * Generate the first question based on mode and difficulty
 */
async function generateFirstQuestion(
  mode: MockInterviewMode,
  interview: Interview,
  userId: string,
  difficulty: MockDifficultyLevel = 'warm-up'
): Promise<string> {
  const profile = await storage.getJSON<Profile>(`users/${userId}/profile.json`);

  const modeDescriptions = {
    behavioral: 'behavioral questions about past experiences',
    technical: 'technical questions about skills and problem-solving',
    mixed: 'a mix of behavioral and technical questions',
  };

  const systemPrompt = `You are conducting a ${mode} interview for a ${interview.role} position at ${interview.company}.
Start with a welcoming introduction and ask the first question.
Difficulty instruction: ${difficultyInstructions[difficulty]}.
Make it ${mode === 'technical' ? 'a coding or technical problem' : 'a behavioral question'}.
Keep the introduction brief (1-2 sentences) then ask the question.`;

  const userPrompt = `Candidate: ${profile?.name || 'the candidate'}
Role: ${interview.role}
Company: ${interview.company}
Interview mode: ${modeDescriptions[mode]}
Difficulty: ${difficulty}

Generate a welcoming opening and first question appropriate for the ${difficulty} difficulty level.`;

  const response = await aiClient.complete(systemPrompt, userPrompt, { model: 'balanced' });
  return response;
}

/**
 * Zod schema for the interviewer's response JSON
 */
const InterviewerResponseSchema = z.object({
  feedback: z.string().min(1).default('Good answer overall.'),
  score: z.number().min(1).max(10).default(6),
  strengths: z.array(z.string()).default([]),
  improvements: z.array(z.string()).default([]),
  nextQuestion: z.string().nullable().default(null),
  overallAssessment: z.object({
    score: z.number().min(1).max(10).default(6),
    summary: z.string().default(''),
    strengths: z.array(z.string()).default([]),
    improvements: z.array(z.string()).default([]),
    hiringRecommendation: z.string().default('consider'),
  }).nullable().default(null),
});

type InterviewerResponse = z.infer<typeof InterviewerResponseSchema>;

/**
 * Get interviewer's response to candidate's answer using structured output
 */
async function getInterviewerResponse(
  session: MockSession,
  interview: Interview,
  profile: Profile,
  questionNumber: number,
  shouldWrapUp: boolean
): Promise<InterviewerResponse> {
  const conversationHistory = session.messages
    .map((m) => `${m.role === 'interviewer' ? 'Interviewer' : 'Candidate'}: ${m.content}`)
    .join('\n\n');

  const currentDifficulty: MockDifficultyLevel = session.difficulty ?? 'warm-up';
  const nextDifficultyInstruction = difficultyInstructions[currentDifficulty];

  const systemPrompt = `You are an experienced interviewer conducting a ${session.mode} interview for ${interview.role} at ${interview.company}.
This is question ${questionNumber} of approximately 6.
Current difficulty: ${currentDifficulty}.

Your task:
1. Give brief, specific feedback on the candidate's answer (2-3 sentences)
2. Score the answer from 1-10 (7+ = strong, 5-6 = acceptable, below 5 = needs improvement)
3. List 2-3 concrete strengths in the answer
4. List 2-3 specific, actionable areas for improvement
${shouldWrapUp
    ? '5. Provide overall assessment with summary, strengths, improvements, overall score 1-10, and hiringRecommendation (one of: "strong_yes", "yes", "consider", "no")'
    : `5. Ask the next question at difficulty level: ${nextDifficultyInstruction}`
  }

Be a realistic, fair interviewer. Push back on vague answers. Ask for specifics.
Focus on what interviewers actually look for in ${session.mode} interviews.`;

  const userPrompt = `CONVERSATION SO FAR:
${conversationHistory}

Candidate: ${profile.name || 'the candidate'}
Role: ${interview.role}
Company: ${interview.company}

${shouldWrapUp
    ? 'This was the final question. Provide comprehensive final assessment.'
    : `Provide feedback on the candidate's last answer and ask question ${questionNumber + 1}.`
  }

Return a JSON object with:
- feedback: brief specific feedback on the answer
- score: integer 1-10
- strengths: array of 2-3 strings
- improvements: array of 2-3 strings
- ${shouldWrapUp
    ? 'overallAssessment: { score, summary, strengths, improvements, hiringRecommendation }'
    : 'nextQuestion: the next interview question string'
  }`;

  try {
    const result = await aiClient.completeJSON(
      systemPrompt,
      userPrompt,
      InterviewerResponseSchema,
      { model: 'balanced', maxTokens: 2048 }
    );
    return result;
  } catch (error) {
    // Graceful fallback: return a safe default if AI fails
    return {
      feedback: 'Thank you for your answer. Let\'s continue with the next question.',
      score: 6,
      strengths: ['Clear communication'],
      improvements: ['Provide more specific examples with metrics'],
      nextQuestion: shouldWrapUp ? null : 'Can you walk me through a challenging technical problem you solved recently?',
      overallAssessment: shouldWrapUp ? {
        score: 6,
        summary: 'The interview session is complete.',
        strengths: ['Completed the interview'],
        improvements: ['Practice with more specific STAR examples'],
        hiringRecommendation: 'consider',
      } : null,
    };
  }
}

/**
 * Find session path by searching interview directories
 */
async function findSessionPath(userId: string, sessionId: string): Promise<string | null> {

  // List all interviews
  const interviewsIndex = await storage.getJSON<{ interviews: { id: string }[] }>(
    `users/${userId}/interviews/index.json`
  );

  if (!interviewsIndex?.interviews) return null;

  // Search each interview directory for the session
  for (const interview of interviewsIndex.interviews) {
    const sessionPath = `users/${userId}/interviews/${interview.id}/mock-${sessionId}.json`;
    try {
      const exists = await storage.getJSON(sessionPath);
      if (exists) return sessionPath;
    } catch {
      continue;
    }
  }

  return null;
}

const QuestionBankResponseSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string(),
      category: z.enum(['behavioral', 'technical', 'culture-fit', 'situational']),
      difficulty: z.enum(['easy', 'medium', 'hard']),
      tips: z.string(),
    })
  ),
});

/**
 * Get or generate company question bank (cached in S3)
 */
export async function getCompanyQuestionBank(
  userId: string,
  company: string
): Promise<QuestionBank> {
  try {
    const companySlug = company.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const cachePath = `users/${userId}/interviews/question-bank/${companySlug}.json`;

    // Return cached version if available (less than 30 days old)
    const cached = await storage.getJSON<QuestionBank>(cachePath);
    if (cached) {
      const ageMs = Date.now() - new Date(cached.generatedAt).getTime();
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      if (ageMs < thirtyDaysMs) {
        return cached;
      }
    }

    // Generate via AI
    const systemPrompt = `You are an expert career coach who has studied thousands of interview reports from Glassdoor, Blind, and public sources.
Your task is to return a JSON object listing the 12 most commonly asked interview questions at a specific company.
Include a mix of behavioral, technical, culture-fit, and situational questions.
Each question must include a difficulty (easy/medium/hard), category, and a practical tip.`;

    const userPrompt = `Based on widely reported Glassdoor and public interview experiences at ${company}, list the 12 most commonly asked interview questions across all rounds.
Include behavioral, technical, and culture-fit questions.

Return a JSON object:
{
  "questions": [
    {
      "question": "...",
      "category": "behavioral" | "technical" | "culture-fit" | "situational",
      "difficulty": "easy" | "medium" | "hard",
      "tips": "Practical tip for answering this question"
    }
  ]
}`;

    const parsed = await aiClient.completeJSON(
      systemPrompt,
      userPrompt,
      QuestionBankResponseSchema,
      { model: 'balanced', maxTokens: 3000 }
    );

    const questionBank: QuestionBank = {
      company,
      companySlug,
      questions: parsed.questions as QuestionBankItem[],
      generatedAt: new Date().toISOString(),
    };

    // Cache result
    await storage.putJSON(cachePath, questionBank);

    return questionBank;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to get company question bank', 500, 'INTERNAL_ERROR');
  }
}
