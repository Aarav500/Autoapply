/**
 * GET /api/profile/completeness - Get profile completeness score and breakdown
 */

import { NextRequest } from 'next/server';
import { apiResponse, apiError, authenticate } from '@/lib/api-utils';
import { getProfile } from '@/services/profile/profile-service';
import { calculateCompleteness } from '@/services/profile/completeness';
import { AuthError, NotFoundError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await authenticate(request);

    // Get profile
    const profile = await getProfile(userId);

    if (!profile) {
      throw new NotFoundError('Profile not found');
    }

    // Calculate completeness
    const completeness = calculateCompleteness(profile);

    logger.info({ userId, score: completeness.score }, 'Completeness retrieved');
    return apiResponse(completeness);
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error, 401);
    }
    if (error instanceof NotFoundError) {
      return apiError(error, 404);
    }
    logger.error({ error }, 'Get completeness endpoint error');
    return apiError(new Error('Internal server error'), 500);
  }
}
