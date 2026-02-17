import { NextRequest } from 'next/server';
import { successResponse, handleError, authenticate } from '@/lib/api-utils';
import { storage } from '@/lib/storage';
import { EmailIndexEntry } from '@/types/comms';
import { logger } from '@/lib/logger';

/**
 * GET /api/comms/email/inbox
 * List emails with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await authenticate(request);

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const jobRelated = searchParams.get('jobRelated') === 'true';
    const unread = searchParams.get('unread') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Load emails index
    const emailsIndexKey = `users/${userId}/emails/index.json`;
    let emails: EmailIndexEntry[] = [];

    try {
      emails = await storage.getJSON<EmailIndexEntry[]>(emailsIndexKey) || [];
    } catch (error) {
      // No emails yet
      return successResponse({
        emails: [],
        total: 0,
        limit,
        offset,
      });
    }

    // Apply filters
    let filtered = emails;

    if (category) {
      filtered = filtered.filter((e) => e.category === category);
    }

    if (jobRelated) {
      filtered = filtered.filter((e) => e.isJobRelated);
    }

    if (unread) {
      filtered = filtered.filter((e) => !e.isRead);
    }

    // Sort by received date (newest first)
    filtered.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());

    const total = filtered.length;

    // Paginate
    const paginated = filtered.slice(offset, offset + limit);

    return successResponse({
      emails: paginated,
      total,
      limit,
      offset,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to list emails');
    return handleError(error);
  }
}
