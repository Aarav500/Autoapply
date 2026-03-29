/**
 * GET  /api/interview/[id]/mock - List past mock sessions
 * POST /api/interview/[id]/mock - Start a mock interview session
 */

import { NextRequest } from 'next/server';
import { authenticate } from '@/lib/api-utils';
import { apiResponse, apiError } from '@/lib/api-utils';
import { startMockInterview } from '@/services/interview/mock-interview';
import { MockInterviewStartSchema } from '@/types/interview';
import { storage } from '@/lib/storage';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await authenticate(req);
    const { id } = await params;

    // List all mock-*.json files under this interview
    const prefix = `users/${userId}/interviews/${id}/mock-`;
    const keys = await storage.listKeys(prefix);
    const sessions = await Promise.all(
      keys.map(async (key) => {
        try {
          const s = await storage.getJSON<Record<string, unknown>>(key);
          if (!s) return null;
          return {
            id: s.id,
            mode: s.mode,
            difficulty: s.difficulty,
            startedAt: s.startedAt,
            completedAt: s.completedAt,
            overallScore: s.overallScore,
            messageCount: Array.isArray(s.messages) ? (s.messages as unknown[]).length : 0,
          };
        } catch {
          return null;
        }
      })
    );

    const validSessions = sessions.filter(Boolean);
    validSessions.sort((a, b) => {
      const ta = a?.startedAt ? new Date(a.startedAt as string).getTime() : 0;
      const tb = b?.startedAt ? new Date(b.startedAt as string).getTime() : 0;
      return tb - ta;
    });

    return apiResponse({ sessions: validSessions });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await authenticate(req);
    const { id } = await params;

    const body = await req.json();
    const { mode, difficulty } = MockInterviewStartSchema.parse(body);

    const session = await startMockInterview(userId, id, mode, difficulty);

    return apiResponse({
      sessionId: session.id,
      firstQuestion: session.messages[0].content,
      session,
    });
  } catch (error) {
    return apiError(error);
  }
}
