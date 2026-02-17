/**
 * GET /api/interview/[id]/prep - Get or generate prep package
 */

import { NextRequest } from 'next/server';
import { authenticate } from '@/lib/api-utils';
import { apiResponse, apiError } from '@/lib/api-utils';
import { generatePrepPackage } from '@/services/interview/prep-package';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await authenticate(req);
    const { id } = await params;

    const prepPackage = await generatePrepPackage(userId, id);

    return apiResponse({ prep: prepPackage });
  } catch (error) {
    return apiError(error);
  }
}
