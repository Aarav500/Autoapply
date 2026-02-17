/**
 * API utilities for response handling and authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { AppError, AuthError } from './errors';
import { verifyAccessToken } from '@/services/auth/jwt';

interface SuccessResponse<T> {
  success: true;
  data: T;
}

interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
  };
}

/**
 * Create a successful API response
 */
export function successResponse<T>(
  data: T,
  status: number = 200
): NextResponse<SuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status }
  );
}

/**
 * Create an error API response
 */
export function errorResponse(
  message: string,
  status: number = 500,
  code?: string
): NextResponse<ErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: {
        message,
        code,
      },
    },
    { status }
  );
}

/**
 * Create error response from Error object
 */
export function apiError(
  error: unknown,
  status?: number
): NextResponse<ErrorResponse> {
  return handleError(error);
}

/**
 * Handle errors and convert to appropriate responses
 */
export function handleError(error: unknown): NextResponse<ErrorResponse> {
  // Known AppError instances
  if (error instanceof AppError) {
    return errorResponse(error.message, error.statusCode, error.code);
  }

  // Unknown errors
  if (error instanceof Error) {
    return errorResponse(
      process.env.NODE_ENV === 'development'
        ? error.message
        : 'Internal server error',
      500,
      'INTERNAL_ERROR'
    );
  }

  // Completely unknown error type
  return errorResponse('An unexpected error occurred', 500, 'UNKNOWN_ERROR');
}

/**
 * Authenticate request and extract userId from JWT
 * Throws AuthError if authentication fails
 */
export async function authenticate(
  request: NextRequest
): Promise<{ userId: string }> {
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AuthError('Missing or invalid authorization header');
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    const { userId } = verifyAccessToken(token);
    return { userId };
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }
    throw new AuthError('Authentication failed');
  }
}

/**
 * Alias for authenticate (for compatibility)
 */
export async function authenticateRequest(request: NextRequest): Promise<string> {
  const { userId } = await authenticate(request);
  return userId;
}

/**
 * Updated apiResponse to handle both success and error cases
 */
export function apiResponse<T>(
  data: T | null,
  error?: Error | null,
  status?: number
): NextResponse {
  if (error) {
    return handleError(error);
  }
  return successResponse(data, status || 200);
}
