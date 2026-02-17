import { NextRequest } from 'next/server';
import { apiResponse, apiError, authenticate } from '@/lib/api-utils';
import { storage } from '@/lib/storage';
import { logger } from '@/lib/logger';
import type { ApplicationListItem } from '@/types/application';

/**
 * GET /api/applications
 * List all applications for the authenticated user
 * Query params: ?status=submitted&limit=50
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);
    const searchParams = req.nextUrl.searchParams;
    const statusFilter = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const applicationsData = await storage.getJSON<{ applications: ApplicationListItem[] }>(
      `users/${userId}/applications/index.json`
    );

    let applications = applicationsData?.applications || [];

    // Filter by status if provided
    if (statusFilter) {
      applications = applications.filter((app: ApplicationListItem) => app.status === statusFilter);
    }

    // Sort by appliedAt descending (most recent first)
    applications.sort((a: ApplicationListItem, b: ApplicationListItem) => {
      if (!a.appliedAt) return 1;
      if (!b.appliedAt) return -1;
      return new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime();
    });

    // Apply limit
    applications = applications.slice(0, limit);

    logger.info({ userId, count: applications.length, statusFilter }, 'Applications listed');

    return apiResponse({
      success: true,
      data: {
        applications,
        total: applications.length,
      },
    });
  } catch (error) {
    logger.error({ error }, 'List applications error');
    return apiError(error);
  }
}
