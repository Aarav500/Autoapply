/**
 * GET /api/interview/[id] - Get interview details
 * PATCH /api/interview/[id] - Update interview
 */

import { NextRequest } from 'next/server';
import { authenticate } from '@/lib/api-utils';
import { apiResponse, apiError } from '@/lib/api-utils';
import { storage } from '@/lib/storage';
import {
  Interview,
  InterviewSchema,
  InterviewUpdateSchema,
  InterviewListItem,
} from '@/types/interview';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await authenticate(req);
    const { id } = await params;

    const interview = await storage.getJSON<Interview>(`users/${userId}/interviews/${id}.json`);

    if (!interview) {
      return apiError(new Error('Interview not found'), 404);
    }

    return apiResponse({ interview });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await authenticate(req);
    const { id } = await params;

    const body = await req.json();
    const updates = InterviewUpdateSchema.parse(body);

    // Update interview
    await storage.updateJSON<Interview>(
      `users/${userId}/interviews/${id}.json`,
      (current) => {
        if (!current) throw new Error('Interview not found');
        return {
          ...current,
          ...updates,
          updatedAt: new Date().toISOString(),
        };
      }
    );

    // Reload updated interview
    const updated = await storage.getJSON<Interview>(`users/${userId}/interviews/${id}.json`);
    if (!updated) throw new Error('Failed to reload updated interview');

    // Update index
    await storage.updateJSON<{ interviews: InterviewListItem[] }>(
      `users/${userId}/interviews/index.json`,
      (current) => {
        const interviews = current?.interviews || [];
        const existingIndex = interviews.findIndex((i) => i.id === id);

        const listItem: InterviewListItem = {
          id: updated.id,
          company: updated.company,
          role: updated.role,
          scheduledAt: updated.scheduledAt,
          status: updated.status,
          type: updated.type,
        };

        if (existingIndex >= 0) {
          interviews[existingIndex] = listItem;
        }

        return { interviews };
      }
    );

    return apiResponse({ interview: updated });
  } catch (error) {
    return apiError(error);
  }
}
