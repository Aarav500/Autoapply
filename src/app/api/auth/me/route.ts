/**
 * GET /api/auth/me - Get current user profile
 */

import { NextRequest } from 'next/server';
import { apiResponse, apiError, authenticate } from '@/lib/api-utils';
import { getUser } from '@/services/auth/auth-service';
import { AuthError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await authenticate(request);

    // Get user profile
    const user = await getUser(userId);

    logger.info({ userId }, 'User profile retrieved via API');

    return apiResponse({ user });
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error, 401);
    }
    logger.error({ error }, 'Me endpoint error');
    return apiError(new Error('Internal server error'), 500);
  }
}
