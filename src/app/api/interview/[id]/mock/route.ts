/**
 * POST /api/interview/[id]/mock - Start a mock interview session
 */

import { NextRequest } from 'next/server';
import { authenticate } from '@/lib/api-utils';
import { apiResponse, apiError } from '@/lib/api-utils';
import { startMockInterview } from '@/services/interview/mock-interview';
import { MockInterviewStartSchema } from '@/types/interview';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await authenticate(req);
    const { id } = await params;

    const body = await req.json();
    const { mode } = MockInterviewStartSchema.parse(body);

    const session = await startMockInterview(userId, id, mode);

    return apiResponse({
      sessionId: session.id,
      firstQuestion: session.messages[0].content,
      session,
    });
  } catch (error) {
    return apiError(error);
  }
}
