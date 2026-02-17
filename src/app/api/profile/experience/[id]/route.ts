/**
 * PUT /api/profile/experience/[id] - Update experience entry
 * DELETE /api/profile/experience/[id] - Delete experience entry
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiResponse, apiError, authenticate } from '@/lib/api-utils';
import {
  updateExperience,
  removeExperience,
} from '@/services/profile/profile-service';
import { ExperienceUpdateSchema } from '@/types/profile';
import { ValidationError, AuthError, NotFoundError } from '@/lib/errors';
import { logger } from '@/lib/logger';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    // Authenticate user
    const { userId } = await authenticate(request);

    // Get experience ID from params
    const { id: experienceId } = await params;

    // Parse and validate request body
    const body = await request.json();
    const validatedData = ExperienceUpdateSchema.parse(body);

    // Update experience
    const profile = await updateExperience(userId, experienceId, validatedData);

    logger.info({ userId, experienceId }, 'Experience updated via API');
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
    logger.error({ error }, 'Update experience endpoint error');
    return apiError(new Error('Internal server error'), 500);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // Authenticate user
    const { userId } = await authenticate(request);

    // Get experience ID from params
    const { id: experienceId } = await params;

    // Remove experience
    const profile = await removeExperience(userId, experienceId);

    logger.info({ userId, experienceId }, 'Experience removed via API');
    return apiResponse({ profile });
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error, 401);
    }
    if (error instanceof NotFoundError) {
      return apiError(error, 404);
    }
    logger.error({ error }, 'Remove experience endpoint error');
    return apiError(new Error('Internal server error'), 500);
  }
}
