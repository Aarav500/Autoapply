import { NextRequest } from 'next/server';
import { apiResponse, apiError } from '@/lib/api-utils';
import { authenticate, handleError } from '@/lib/api-utils';
import { getNotificationManager } from '@/services/comms/notification-manager';
import { MarkNotificationsReadSchema } from '@/types/notifications';

/**
 * GET /api/comms/notifications
 * List notifications (optionally filter by unread)
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);
    

    const url = new URL(req.url);
    const unreadOnly = url.searchParams.get('unread') === 'true';
    const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!, 10) : undefined;

    const nm = getNotificationManager();
    const notifications = await nm.list(userId, { unreadOnly, limit });

    return apiResponse({ notifications });
  } catch (error) {
    return handleError(error);
  }
}

/**
 * POST /api/comms/notifications
 * Mark notifications as read
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);
    

    const body = await req.json();
    const parsed = MarkNotificationsReadSchema.safeParse(body);
    if (!parsed.success) {
      throw new Error('Invalid request data');
    }

    const { ids } = parsed.data;
    const nm = getNotificationManager();
    await nm.markAsRead(userId, ids);

    return apiResponse({ marked: ids.length });
  } catch (error) {
    return handleError(error);
  }
}
