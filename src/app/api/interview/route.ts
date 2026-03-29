/**
 * GET /api/interview - List all interviews
 * GET /api/interview?action=question-bank&company=Google - Get company question bank
 */

import { NextRequest } from 'next/server';
import { authenticate } from '@/lib/api-utils';
import { apiResponse, apiError } from '@/lib/api-utils';
import { storage } from '@/lib/storage';
import { InterviewListItem } from '@/types/interview';
import { getCompanyQuestionBank } from '@/services/interview/mock-interview';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);

    // Get query params
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    // Handle question-bank action
    if (action === 'question-bank') {
      const company = searchParams.get('company');
      if (!company || company.trim().length === 0) {
        return apiError(new Error('company parameter is required'), 400);
      }

      const questionBank = await getCompanyQuestionBank(userId, company.trim());
      return apiResponse(questionBank);
    }

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
