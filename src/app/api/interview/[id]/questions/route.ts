/**
 * GET /api/interview/[id]/questions - Get questions and STAR answers from prep package
 */

import { NextRequest } from 'next/server';
import { authenticate } from '@/lib/api-utils';
import { apiResponse, apiError } from '@/lib/api-utils';
import { storage } from '@/lib/storage';
import { PrepPackage, PrepPackageSchema } from '@/types/interview';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await authenticate(req);
    const { id } = await params;

    // Load prep package
    const prep = await storage.getJSON<PrepPackage>(
      `users/${userId}/interviews/${id}/prep.json`
    );

    if (!prep) {
      return apiError(new Error('Prep package not found. Generate it first via /prep endpoint.'), 404);
    }

    return apiResponse({
      questions: prep.questions,
      starAnswers: prep.starAnswers,
    });
  } catch (error) {
    return apiError(error);
  }
}
