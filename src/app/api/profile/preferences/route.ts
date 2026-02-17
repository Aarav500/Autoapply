/**
 * PUT /api/profile/preferences - Update job preferences
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiResponse, apiError, authenticate } from '@/lib/api-utils';
import { updatePreferences } from '@/services/profile/profile-service';
import { PreferencesUpdateSchema } from '@/types/profile';
import { ValidationError, AuthError, NotFoundError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export async function PUT(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await authenticate(request);

    // Parse and validate request body
    const body = await request.json();
    const validatedData = PreferencesUpdateSchema.parse(body);

    // Update preferences
    const profile = await updatePreferences(userId, validatedData);

    logger.info({ userId }, 'Preferences updated via API');
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
    logger.error({ error }, 'Update preferences endpoint error');
    return apiError(new Error('Internal server error'), 500);
  }
}
