/**
 * Mock interview service for practice sessions
 */

import { aiClient } from '@/lib/ai-client';
import { storage } from '@/lib/storage';
import {
  MockSession,
  MockSessionSchema,
  MockInterviewMode,
  MockMessage,
  MockScore,
  MockOverallAssessment,
  Interview,
  InterviewSchema,
  PredictedQuestion,
  MockAnswerResponse,
} from '@/types/interview';
import { Profile, ProfileSchema } from '@/types/profile';
import { AppError, NotFoundError } from '@/lib/errors';
import { z } from 'zod';
import { randomUUID } from 'crypto';

/**
 * Start a new mock interview session
 */
export async function startMockInterview(
  userId: string,
  interviewId: string,
  mode: MockInterviewMode
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
    const firstQuestion = await generateFirstQuestion(mode, interview, userId);

    // Create session
    const session: MockSession = {
      id: randomUUID(),
      interviewId,
      mode,
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

    // Get AI feedback
    const aiResponse = await getInterviewerResponse(
      session,
      interview,
      profile,
      questionNumber,
      shouldWrapUp
    );

    // Parse AI response
    const parsed = parseInterviewerResponse(aiResponse, shouldWrapUp);

    // Add score
    session.scores.push({
      questionNumber,
      score: parsed.score,
      feedback: parsed.feedback,
    });

    // Add next question or wrap up
    if (shouldWrapUp && parsed.overallAssessment) {
      session.isComplete = true;
      session.completedAt = new Date().toISOString();
      session.overallAssessment = parsed.overallAssessment;

      session.messages.push({
        role: 'interviewer',
        content: `Thank you for your time. Here's my overall assessment:\n\n${parsed.overallAssessment.summary}`,
        timestamp: new Date().toISOString(),
      });
    } else if (parsed.nextQuestion) {
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
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to process mock answer', 500, 'INTERNAL_ERROR');
  }
}

/**
 * Generate the first question based on mode
 */
async function generateFirstQuestion(
  mode: MockInterviewMode,
  interview: Interview,
  userId: string
): Promise<string> {
  const profile = await storage.getJSON<Profile>(`users/${userId}/profile.json`);

  const modeDescriptions = {
    behavioral: 'behavioral questions about past experiences',
    technical: 'technical questions about skills and problem-solving',
    mixed: 'a mix of behavioral and technical questions',
  };

  const systemPrompt = `You are conducting a ${mode} interview for a ${interview.role} position at ${interview.company}.
Start with a welcoming introduction and ask the first question.
Make it ${mode === 'technical' ? 'a coding or technical problem' : 'a behavioral question'}.
Keep the introduction brief (1-2 sentences) then ask the question.`;

  const userPrompt = `Candidate: ${profile?.name || 'the candidate'}
Role: ${interview.role}
Company: ${interview.company}
Interview mode: ${modeDescriptions[mode]}

Generate a welcoming opening and first question.`;

  const response = await aiClient.complete(systemPrompt, userPrompt, { model: 'balanced' });
  return response;
}

/**
 * Get interviewer's response to candidate's answer
 */
async function getInterviewerResponse(
  session: MockSession,
  interview: Interview,
  profile: Profile,
  questionNumber: number,
  shouldWrapUp: boolean
): Promise<string> {
  const conversationHistory = session.messages
    .map((m) => `${m.role === 'interviewer' ? 'Interviewer' : 'Candidate'}: ${m.content}`)
    .join('\n\n');

  const systemPrompt = `You are an experienced interviewer conducting a ${session.mode} interview for ${interview.role} at ${interview.company}.
This is question ${questionNumber} of approximately 6.

Your task:
1. Give brief, specific feedback on the candidate's answer (2-3 sentences)
2. Score the answer from 1-10
3. List 2-3 strengths in the answer
4. List 2-3 areas for improvement
${
  shouldWrapUp
    ? '5. Provide an overall assessment with summary, strengths, improvements, and overall score 1-10'
    : '5. Ask the next question (make it progressively harder)'
}

Be realistic - push back on vague answers, ask for specifics.
Don't be too easy or too harsh.
Focus on what interviewers actually look for in ${session.mode} interviews.

Return response in this JSON format:
{
  "feedback": "Brief specific feedback",
  "score": 7,
  "strengths": ["strength 1", "strength 2"],
  "improvements": ["improvement 1", "improvement 2"],
  ${shouldWrapUp ? '"overallAssessment": { "score": 7, "summary": "...", "strengths": [...], "improvements": [...] }' : '"nextQuestion": "Next question text"'}
}`;

  const userPrompt = `CONVERSATION SO FAR:
${conversationHistory}

Candidate: ${profile.name}
Role: ${interview.role}
Company: ${interview.company}

Provide feedback and ${shouldWrapUp ? 'overall assessment' : 'next question'}.`;

  const response = await aiClient.complete(systemPrompt, userPrompt, { model: 'balanced' });
  return response;
}

/**
 * Parse interviewer's response
 */
function parseInterviewerResponse(
  response: string,
  isWrapUp: boolean
): {
  feedback: string;
  score: number;
  strengths: string[];
  improvements: string[];
  nextQuestion: string | null;
  overallAssessment: MockOverallAssessment | null;
} {
  // Extract JSON from markdown code fence if present
  let jsonText = response.trim();
  if (jsonText.includes('```json')) {
    const match = jsonText.match(/```json\s*([\s\S]*?)\s*```/);
    if (match) jsonText = match[1];
  } else if (jsonText.includes('```')) {
    const match = jsonText.match(/```\s*([\s\S]*?)\s*```/);
    if (match) jsonText = match[1];
  }

  try {
    const parsed = JSON.parse(jsonText);
    return {
      feedback: parsed.feedback || 'No feedback provided',
      score: parsed.score || 5,
      strengths: parsed.strengths || [],
      improvements: parsed.improvements || [],
      nextQuestion: isWrapUp ? null : parsed.nextQuestion || null,
      overallAssessment: isWrapUp ? parsed.overallAssessment || null : null,
    };
  } catch (error) {
    // Fallback if parsing fails
    return {
      feedback: response.slice(0, 200),
      score: 5,
      strengths: [],
      improvements: [],
      nextQuestion: isWrapUp ? null : 'Can you tell me about a challenging project you worked on?',
      overallAssessment: null,
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
