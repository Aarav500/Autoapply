/**
 * POST /api/profile/education - Add education entry
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiResponse, apiError, authenticate } from '@/lib/api-utils';
import { addEducation } from '@/services/profile/profile-service';
import { EducationCreateSchema } from '@/types/profile';
import { ValidationError, AuthError, NotFoundError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
    try {
        const { userId } = await authenticate(request);

        const body = await request.json();
        const validatedData = EducationCreateSchema.parse(body);

        const profile = await addEducation(userId, validatedData);

        logger.info({ userId }, 'Education added via API');
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
        logger.error({ error }, 'Add education endpoint error');
        return apiError(new Error('Internal server error'), 500);
    }
}
