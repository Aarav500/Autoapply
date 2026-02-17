/**
 * GET /api/interview/[id]/mock/[sessionId] - Get mock session transcript
 * POST /api/interview/[id]/mock/[sessionId] - Send answer and get feedback
 */

import { NextRequest } from 'next/server';
import { authenticate } from '@/lib/api-utils';
import { apiResponse, apiError } from '@/lib/api-utils';
import { storage } from '@/lib/storage';
import { processMockAnswer } from '@/services/interview/mock-interview';
import { MockAnswerSchema, MockSession, MockSessionSchema } from '@/types/interview';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const { userId } = await authenticate(req);
    const { id, sessionId } = await params;

    // Load session
    const session = await storage.getJSON<MockSession>(
      `users/${userId}/interviews/${id}/mock-${sessionId}.json`
    );

    if (!session) {
      return apiError(new Error('Mock session not found'), 404);
    }

    return apiResponse({ session });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const { userId } = await authenticate(req);
    const { sessionId } = await params;

    const body = await req.json();
    const { answer } = MockAnswerSchema.parse(body);

    const result = await processMockAnswer(userId, sessionId, answer);

    return apiResponse(result);
  } catch (error) {
    return apiError(error);
  }
}
