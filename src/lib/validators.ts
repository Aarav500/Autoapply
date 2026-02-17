/**
 * Reusable Zod validation schemas
 */

import { z } from 'zod';

/**
 * Email validation
 */
export const emailSchema = z
  .string()
  .email('Invalid email address')
  .min(1, 'Email is required');

/**
 * Password validation (min 8 chars, 1 uppercase, 1 number)
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

/**
 * Pagination parameters
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

/**
 * ID validation (UUID or CUID)
 */
export const idSchema = z.string().min(1, 'ID is required');

/**
 * URL validation
 */
export const urlSchema = z.string().url('Invalid URL');

/**
 * Phone number validation (basic)
 */
export const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format');

/**
 * Date string validation (ISO 8601)
 */
export const dateStringSchema = z.string().datetime();
