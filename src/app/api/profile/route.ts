/**
 * GET /api/profile - Get user profile
 * PUT /api/profile - Update basic profile fields
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiResponse, apiError, authenticate } from '@/lib/api-utils';
import { getProfile, updateProfile, initializeProfile } from '@/services/profile/profile-service';
import { getUser } from '@/services/auth/auth-service';
import { ProfileUpdateSchema } from '@/types/profile';
import { ValidationError, AuthError, NotFoundError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await authenticate(request);

    // Get profile
    let profile = await getProfile(userId);

    // If profile doesn't exist, initialize it
    if (!profile) {
      const user = await getUser(userId);
      profile = await initializeProfile(userId, user.email, user.name);
    }

    logger.info({ userId }, 'Profile retrieved');
    return apiResponse({ profile });
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error, 401);
    }
    if (error instanceof NotFoundError) {
      return apiError(error, 404);
    }
    logger.error({ error }, 'Get profile endpoint error');
    return apiError(new Error('Internal server error'), 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await authenticate(request);

    // Parse and validate request body
    const body = await request.json();
    const validatedData = ProfileUpdateSchema.parse(body);

    // Update profile
    const profile = await updateProfile(userId, validatedData);

    logger.info({ userId }, 'Profile updated via API');
    return apiResponse({ profile });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(new ValidationError(error.issues[0].message), 400);
    }
    if (error instanceof AuthError) {
      return apiError(error, 401);
    }
    if (error instanceof NotFoundError) {
      return apiError(error, 404);
    }
    if (error instanceof ValidationError) {
      return apiError(error, 400);
    }
    logger.error({ error }, 'Update profile endpoint error');
    return apiError(new Error('Internal server error'), 500);
  }
}
