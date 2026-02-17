/**
 * Health check endpoint
 * Tests S3 connection and returns system status
 */

import { NextResponse } from 'next/server';
import { storage } from '@/lib/storage';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { createLogger } from '@/lib/logger';

const logger = createLogger('health-check');

interface HealthStatus {
  status: 'ok' | 'error';
  timestamp: string;
  storage: 'connected' | 'error';
  error?: string;
}

export async function GET() {
  try {
    // Test S3 connection by ensuring bucket exists
    await storage.ensureBucket();

    // Try to list keys to verify connection
    await storage.listKeys('health-check/');

    const response: HealthStatus = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      storage: 'connected',
    };

    logger.info('Health check passed');
    return successResponse(response);
  } catch (error) {
    logger.error({ error }, 'Health check failed');

    const response: HealthStatus = {
      status: 'error',
      timestamp: new Date().toISOString(),
      storage: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };

    return errorResponse('Health check failed', 503);
  }
}
