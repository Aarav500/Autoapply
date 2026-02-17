/**
 * POST /api/auth/logout - Logout user and invalidate refresh token
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiResponse, apiError } from '@/lib/api-utils';
import { logout } from '@/services/auth/auth-service';
import { ValidationError, AuthError } from '@/lib/errors';
import { logger } from '@/lib/logger';

const logoutSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = logoutSchema.parse(body);

    // Logout user
    await logout(validatedData.refreshToken);

    logger.info('User logged out via API');

    return apiResponse({ message: 'Logged out successfully' });
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
    logger.error({ error }, 'Logout endpoint error');
    return apiError(new Error('Internal server error'), 500);
  }
}
