/**
 * Authentication service - handles user registration, login, and session management
 */

import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { nanoid } from 'nanoid';
import { storage } from '@/lib/storage';
import { logger } from '@/lib/logger';
import { AuthError, ValidationError } from '@/lib/errors';
import {
  User,
  UserProfile,
  UserCreate,
  UserLogin,
  AuthTokens,
  EmailMapping,
  RefreshTokenRecord,
} from '@/types/user';
import {
  generateTokens,
  verifyRefreshToken,
  hashToken,
  getRefreshTokenExpiry,
} from './jwt';

const BCRYPT_ROUNDS = 12;

/**
 * Hash an email address for consistent lookup keys
 */
export function hashEmail(email: string): string {
  return crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex');
}

/**
 * Remove passwordHash from user object for safe return
 */
function sanitizeUser(user: User): UserProfile {
  const { passwordHash, ...profile } = user;
  return profile;
}

/**
 * Register a new user
 */
export async function register(
  email: string,
  password: string,
  name: string,
  phone?: string,
  location?: string
): Promise<{ user: UserProfile; tokens: AuthTokens }> {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    const emailHash = hashEmail(normalizedEmail);

    // Check if email already exists
    const emailMappingKey = `auth/emails/${emailHash}.json`;
    const existingMapping = await storage.getJSON<EmailMapping>(emailMappingKey);

    if (existingMapping) {
      throw new ValidationError('Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Create user
    const userId = nanoid();
    const now = new Date().toISOString();

    const user: User = {
      id: userId,
      email: normalizedEmail,
      name,
      passwordHash,
      phone,
      location,
      createdAt: now,
      updatedAt: now,
    };

    // Save user profile to S3
    const userKey = `users/${userId}/profile.json`;
    await storage.putJSON(userKey, user);

    // Create email → userId mapping
    const emailMapping: EmailMapping = {
      userId,
      email: normalizedEmail,
      createdAt: now,
    };
    await storage.putJSON(emailMappingKey, emailMapping);

    // Generate tokens
    const { accessToken, refreshToken, expiresIn, refreshTokenHash } = generateTokens(userId);

    // Store refresh token
    const refreshTokenRecord: RefreshTokenRecord = {
      userId,
      tokenHash: refreshTokenHash,
      createdAt: now,
      expiresAt: getRefreshTokenExpiry(),
    };
    await storage.putJSON(`auth/refresh-tokens/${refreshTokenHash}.json`, refreshTokenRecord);

    logger.info({ userId, email: normalizedEmail }, 'User registered successfully');

    return {
      user: sanitizeUser(user),
      tokens: {
        accessToken,
        refreshToken,
        expiresIn,
      },
    };
  } catch (error) {
    if (error instanceof ValidationError || error instanceof AuthError) {
      throw error;
    }
    logger.error({ error, email }, 'Registration failed');
    throw new AuthError('Failed to register user');
  }
}

/**
 * Login a user
 */
export async function login(
  email: string,
  password: string
): Promise<{ user: UserProfile; tokens: AuthTokens }> {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    const emailHash = hashEmail(normalizedEmail);

    // Look up userId by email
    const emailMappingKey = `auth/emails/${emailHash}.json`;
    const emailMapping = await storage.getJSON<EmailMapping>(emailMappingKey);

    if (!emailMapping) {
      throw new AuthError('Invalid email or password');
    }

    // Load user
    const userKey = `users/${emailMapping.userId}/profile.json`;
    const user = await storage.getJSON<User>(userKey);

    if (!user) {
      throw new AuthError('Invalid email or password');
    }

    // Verify password
    const passwordValid = await bcrypt.compare(password, user.passwordHash);

    if (!passwordValid) {
      throw new AuthError('Invalid email or password');
    }

    // Generate tokens
    const { accessToken, refreshToken, expiresIn, refreshTokenHash } = generateTokens(user.id);

    // Store refresh token
    const now = new Date().toISOString();
    const refreshTokenRecord: RefreshTokenRecord = {
      userId: user.id,
      tokenHash: refreshTokenHash,
      createdAt: now,
      expiresAt: getRefreshTokenExpiry(),
    };
    await storage.putJSON(`auth/refresh-tokens/${refreshTokenHash}.json`, refreshTokenRecord);

    logger.info({ userId: user.id, email: normalizedEmail }, 'User logged in successfully');

    return {
      user: sanitizeUser(user),
      tokens: {
        accessToken,
        refreshToken,
        expiresIn,
      },
    };
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }
    logger.error({ error, email }, 'Login failed');
    throw new AuthError('Login failed');
  }
}

/**
 * Refresh access token using refresh token
 */
export async function refresh(
  refreshToken: string
): Promise<{ tokens: AuthTokens }> {
  try {
    // Verify refresh token
    const { userId } = verifyRefreshToken(refreshToken);

    // Check if refresh token exists in storage
    const refreshTokenHash = hashToken(refreshToken);
    const tokenKey = `auth/refresh-tokens/${refreshTokenHash}.json`;
    const tokenRecord = await storage.getJSON<RefreshTokenRecord>(tokenKey);

    if (!tokenRecord) {
      throw new AuthError('Invalid refresh token');
    }

    if (tokenRecord.userId !== userId) {
      throw new AuthError('Invalid refresh token');
    }

    // Delete old refresh token
    await storage.deleteJSON(tokenKey);

    // Generate new tokens
    const {
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn,
      refreshTokenHash: newRefreshTokenHash,
    } = generateTokens(userId);

    // Store new refresh token
    const now = new Date().toISOString();
    const newTokenRecord: RefreshTokenRecord = {
      userId,
      tokenHash: newRefreshTokenHash,
      createdAt: now,
      expiresAt: getRefreshTokenExpiry(),
    };
    await storage.putJSON(
      `auth/refresh-tokens/${newRefreshTokenHash}.json`,
      newTokenRecord
    );

    logger.info({ userId }, 'Tokens refreshed successfully');

    return {
      tokens: {
        accessToken,
        refreshToken: newRefreshToken,
        expiresIn,
      },
    };
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }
    logger.error({ error }, 'Token refresh failed');
    throw new AuthError('Failed to refresh tokens');
  }
}

/**
 * Logout user by invalidating refresh token
 */
export async function logout(refreshToken: string): Promise<void> {
  try {
    const refreshTokenHash = hashToken(refreshToken);
    const tokenKey = `auth/refresh-tokens/${refreshTokenHash}.json`;

    // Delete refresh token
    await storage.deleteJSON(tokenKey);

    logger.info('User logged out successfully');
  } catch (error) {
    logger.error({ error }, 'Logout failed');
    throw new AuthError('Failed to logout');
  }
}

/**
 * Get user profile by ID
 */
export async function getUser(userId: string): Promise<UserProfile> {
  try {
    const userKey = `users/${userId}/profile.json`;
    const user = await storage.getJSON<User>(userKey);

    if (!user) {
      throw new AuthError('User not found');
    }

    return sanitizeUser(user);
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }
    logger.error({ error, userId }, 'Failed to get user');
    throw new AuthError('Failed to get user');
  }
}
