/**
 * POST /api/auth/login - Login a user
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiResponse, apiError } from '@/lib/api-utils';
import { login } from '@/services/auth/auth-service';
import { ValidationError, AuthError } from '@/lib/errors';
import { logger } from '@/lib/logger';

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = loginSchema.parse(body);

    // Login user
    const { user, tokens } = await login(validatedData.email, validatedData.password);

    logger.info({ userId: user.id }, 'User logged in via API');

    return apiResponse({
      user,
      ...tokens,
    });
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
    logger.error({ error }, 'Login endpoint error');
    return apiError(new Error('Internal server error'), 500);
  }
}
