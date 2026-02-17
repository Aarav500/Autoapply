import { NextRequest } from 'next/server';
import { apiResponse, apiError, authenticate } from '@/lib/api-utils';
import { storage } from '@/lib/storage';
import { logger } from '@/lib/logger';
import { autoApplyRuleSchema } from '@/types/application';
import type { AutoApplyRule } from '@/types/application';
import { z } from 'zod';

const updateAutoApplySchema = z.object({
  enabled: z.boolean().optional(),
  minMatchScore: z.number().min(0).max(100).optional(),
  platforms: z.array(z.string()).optional(),
  excludeCompanies: z.array(z.string()).optional(),
  requireRemote: z.boolean().optional(),
  minSalary: z.number().nullable().optional(),
  maxApplicationsPerDay: z.number().min(1).max(50).optional(),
});

/**
 * GET /api/settings/auto-apply
 * Get auto-apply rules
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);
    
    const settings = await storage.getJSON<any>(`users/${userId}/settings.json`);

    // Default auto-apply rules
    const defaultRules: AutoApplyRule = {
      id: 'default',
      enabled: false,
      minMatchScore: 70,
      platforms: [],
      excludeCompanies: [],
      requireRemote: false,
      minSalary: null,
      maxApplicationsPerDay: 10,
    };

    const autoApplyRules = settings?.autoApplyRules || defaultRules;

    logger.info({ userId }, 'Auto-apply rules retrieved');

    return apiResponse({
      success: true,
      data: { autoApplyRules },
    });
  } catch (error) {
    logger.error({ error }, 'Get auto-apply rules error');
    return apiError(error);
  }
}

/**
 * PUT /api/settings/auto-apply
 * Update auto-apply rules
 */
export async function PUT(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);
    const body = await req.json();

    // Validate input
    const updates = updateAutoApplySchema.parse(body);

    
    // Update settings
    await storage.updateJSON<any>(`users/${userId}/settings.json`, (current: any) => {
      const currentRules = current?.autoApplyRules || {
        id: 'default',
        enabled: false,
        minMatchScore: 70,
        platforms: [],
        excludeCompanies: [],
        requireRemote: false,
        minSalary: null,
        maxApplicationsPerDay: 10,
      };

      return {
        ...current,
        autoApplyRules: {
          ...currentRules,
          ...updates,
        },
      };
    });

    logger.info({ userId, updates }, 'Auto-apply rules updated');

    // Get updated rules
    const settings = await storage.getJSON<any>(`users/${userId}/settings.json`);
    const autoApplyRules = settings?.autoApplyRules;

    return apiResponse({
      success: true,
      data: { autoApplyRules },
    });
  } catch (error) {
    logger.error({ error }, 'Update auto-apply rules error');
    return apiError(error);
  }
}
