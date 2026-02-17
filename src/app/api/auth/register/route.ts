/**
 * POST /api/auth/register - Register a new user
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiResponse, apiError } from '@/lib/api-utils';
import { register } from '@/services/auth/auth-service';
import { ValidationError, AuthError } from '@/lib/errors';
import { logger } from '@/lib/logger';

const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  phone: z.string().optional(),
  location: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = registerSchema.parse(body);

    // Register user
    const { user, tokens } = await register(
      validatedData.email,
      validatedData.password,
      validatedData.name,
      validatedData.phone,
      validatedData.location
    );

    logger.info({ userId: user.id }, 'User registered via API');

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
    logger.error({ error }, 'Registration endpoint error');
    return apiError(new Error('Internal server error'), 500);
  }
}
