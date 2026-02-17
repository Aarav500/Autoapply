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
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  storage?: 'connected' | 'error';
  error?: string;
  uptime: number;
}

export async function GET() {
  const startTime = Date.now();

  try {
    // Basic health check - server is responding
    const response: HealthStatus = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };

    // Try S3 connection (non-blocking for basic health)
    try {
      await Promise.race([
        storage.ensureBucket(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('S3 timeout')), 3000))
      ]);

      await Promise.race([
        storage.listKeys('health-check/'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('S3 timeout')), 3000))
      ]);

      response.storage = 'connected';
      logger.info('Health check passed - full');
    } catch (storageError) {
      // Server is up but storage has issues
      response.status = 'degraded';
      response.storage = 'error';
      response.error = storageError instanceof Error ? storageError.message : 'Storage connection failed';
      logger.warn({ error: storageError }, 'Health check passed - degraded (storage issue)');
    }

    return successResponse(response);
  } catch (error) {
    logger.error({ error }, 'Health check failed');

    const response: HealthStatus = {
      status: 'error',
      timestamp: new Date().toISOString(),
      storage: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      uptime: process.uptime(),
    };

    return errorResponse('Health check failed', 503);
  }
}
