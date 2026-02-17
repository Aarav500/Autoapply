/**
 * JWT token generation and verification
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { AuthError } from '@/lib/errors';
import { logger } from '@/lib/logger';

const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-in-production';
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production';
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

interface TokenPayload {
  userId: string;
  type: 'access' | 'refresh';
}

/**
 * Generate access and refresh tokens for a user
 */
export function generateTokens(userId: string): {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshTokenHash: string;
} {
  try {
    const accessPayload: TokenPayload = {
      userId,
      type: 'access',
    };

    const refreshPayload: TokenPayload = {
      userId,
      type: 'refresh',
    };

    const accessToken = jwt.sign(accessPayload, ACCESS_TOKEN_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
    });

    const refreshToken = jwt.sign(refreshPayload, REFRESH_TOKEN_SECRET, {
      expiresIn: REFRESH_TOKEN_EXPIRY,
    });

    // Hash the refresh token for storage
    const refreshTokenHash = hashToken(refreshToken);

    // Access token expires in 15 minutes (900 seconds)
    const expiresIn = 900;

    logger.info({ userId }, 'Generated auth tokens');

    return {
      accessToken,
      refreshToken,
      expiresIn,
      refreshTokenHash,
    };
  } catch (error) {
    logger.error({ error, userId }, 'Failed to generate tokens');
    throw new AuthError('Failed to generate authentication tokens');
  }
}

/**
 * Verify an access token and return the user ID
 */
export function verifyAccessToken(token: string): { userId: string } {
  try {
    const payload = jwt.verify(token, ACCESS_TOKEN_SECRET) as TokenPayload;

    if (payload.type !== 'access') {
      throw new AuthError('Invalid token type');
    }

    return { userId: payload.userId };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AuthError('Access token has expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AuthError('Invalid access token');
    }
    throw new AuthError('Failed to verify access token');
  }
}

/**
 * Verify a refresh token and return the user ID
 */
export function verifyRefreshToken(token: string): { userId: string } {
  try {
    const payload = jwt.verify(token, REFRESH_TOKEN_SECRET) as TokenPayload;

    if (payload.type !== 'refresh') {
      throw new AuthError('Invalid token type');
    }

    return { userId: payload.userId };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AuthError('Refresh token has expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AuthError('Invalid refresh token');
    }
    throw new AuthError('Failed to verify refresh token');
  }
}

/**
 * Hash a token for storage (SHA-256)
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Get refresh token expiry timestamp
 */
export function getRefreshTokenExpiry(): string {
  return new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS).toISOString();
}
