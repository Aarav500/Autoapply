/**
 * GET /api/interview - List all interviews
 */

import { NextRequest } from 'next/server';
import { authenticate } from '@/lib/api-utils';
import { apiResponse, apiError } from '@/lib/api-utils';
import { storage } from '@/lib/storage';
import { InterviewListItem } from '@/types/interview';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);

    // Get query params
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status');

    // Load interviews index
    const index = await storage.getJSON<{ interviews: InterviewListItem[] }>(
      `users/${userId}/interviews/index.json`
    );

    let interviews = index?.interviews || [];

    // Apply status filter
    if (statusFilter) {
      interviews = interviews.filter((i) => i.status === statusFilter);
    }

    // Sort by scheduledAt (nulls last), then by company
    interviews.sort((a, b) => {
      if (a.scheduledAt && b.scheduledAt) {
        return new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime();
      }
      if (a.scheduledAt) return -1;
      if (b.scheduledAt) return 1;
      return a.company.localeCompare(b.company);
    });

    return apiResponse({ interviews });
  } catch (error) {
    return apiError(error);
  }
}
