import { NextRequest } from 'next/server';
import { apiResponse, apiError } from '@/lib/api-utils';
import { authenticate, handleError } from '@/lib/api-utils';
import { getNotificationManager } from '@/services/comms/notification-manager';

/**
 * GET /api/comms/notifications/count
 * Get unread notification count
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);
    

    const nm = getNotificationManager();
    const unreadCount = await nm.getUnread(userId);

    return apiResponse({ unreadCount });
  } catch (error) {
    return handleError(error);
  }
}
