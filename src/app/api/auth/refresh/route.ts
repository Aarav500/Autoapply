/**
 * POST /api/auth/refresh - Refresh access token
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiResponse, apiError } from '@/lib/api-utils';
import { refresh } from '@/services/auth/auth-service';
import { ValidationError, AuthError } from '@/lib/errors';
import { logger } from '@/lib/logger';

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = refreshSchema.parse(body);

    // Refresh tokens
    const { tokens } = await refresh(validatedData.refreshToken);

    logger.info('Tokens refreshed via API');

    return apiResponse(tokens);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError(new ValidationError(error.issues[0].message), 400);
    }
    if (error instanceof ValidationError) {
      return apiError(error, 400);
    }
    if (error instanceof AuthError) {
      return apiError(error, 401);
    }
    logger.error({ error }, 'Refresh endpoint error');
    return apiError(new Error('Internal server error'), 500);
  }
}
