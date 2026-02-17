import { NextRequest } from 'next/server';
import { successResponse, handleError, authenticate } from '@/lib/api-utils';
import { storage } from '@/lib/storage';
import { UpdateAutoReplyRequestSchema, AutoReplyRule } from '@/types/comms';
import { logger } from '@/lib/logger';

/**
 * GET /api/comms/auto-reply
 * Get current auto-reply rules
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await authenticate(request);

    // Load settings
    const settingsKey = `users/${userId}/settings.json`;
    let settings: any = {};

    try {
      settings = await storage.getJSON(settingsKey);
    } catch (error) {
      // Settings don't exist yet
    }

    const autoReplyEnabled = settings?.autoReplyEnabled || false;
    const autoReplyRules: AutoReplyRule[] = settings?.autoReplyRules || [];

    return successResponse({
      enabled: autoReplyEnabled,
      rules: autoReplyRules,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get auto-reply settings');
    return handleError(error);
  }
}

/**
 * PUT /api/comms/auto-reply
 * Update auto-reply rules
 */
export async function PUT(request: NextRequest) {
  try {
    const { userId } = await authenticate(request);

    // Validate request body
    const body = await request.json();
    const { enabled, rules } = UpdateAutoReplyRequestSchema.parse(body);

    // Load existing settings
    const settingsKey = `users/${userId}/settings.json`;
    let settings: any = {};

    try {
      settings = await storage.getJSON(settingsKey);
    } catch (error) {
      // Settings don't exist yet
    }

    // Update auto-reply settings
    settings.autoReplyEnabled = enabled;
    settings.autoReplyRules = rules;

    await storage.putJSON(settingsKey, settings);

    logger.info({ userId, enabled, rulesCount: rules.length }, 'Auto-reply settings updated');

    return successResponse({
      enabled,
      rules,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to update auto-reply settings');
    return handleError(error);
  }
}
