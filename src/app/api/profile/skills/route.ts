/**
 * PUT /api/profile/skills - Update skills array
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiResponse, apiError, authenticate } from '@/lib/api-utils';
import { updateSkills } from '@/services/profile/profile-service';
import { SkillsUpdateSchema } from '@/types/profile';
import { ValidationError, AuthError, NotFoundError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export async function PUT(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await authenticate(request);

    // Parse and validate request body
    const body = await request.json();
    const validatedData = SkillsUpdateSchema.parse(body);

    // Update skills
    const profile = await updateSkills(userId, validatedData.skills);

    logger.info({ userId, skillCount: validatedData.skills.length }, 'Skills updated via API');
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
    logger.error({ error }, 'Update skills endpoint error');
    return apiError(new Error('Internal server error'), 500);
  }
}
