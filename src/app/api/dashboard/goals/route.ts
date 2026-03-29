import { NextRequest } from 'next/server';
import { authenticateRequest, apiResponse } from '@/lib/api-utils';
import { storage } from '@/lib/storage';
import { z } from 'zod';

interface StoredGoals {
  weeklyApplicationTarget: number;
  currentStreak: number;
  longestStreak: number;
  weekStartDate: string;
  lastCheckedWeek: string;
}

const DEFAULT_GOALS: StoredGoals = {
  weeklyApplicationTarget: 10,
  currentStreak: 0,
  longestStreak: 0,
  weekStartDate: new Date().toISOString(),
  lastCheckedWeek: '',
};

export async function GET(request: NextRequest) {
  try {
    const userId = await authenticateRequest(request);
    const goals = await storage.getJSON<StoredGoals>(`users/${userId}/goals.json`).catch(() => null);
    return apiResponse(goals ?? DEFAULT_GOALS);
  } catch (error) {
    return apiResponse(null, error as Error, 500);
  }
}

const UpdateGoalSchema = z.object({
  weeklyTarget: z.number().int().min(1).max(100),
});

export async function POST(request: NextRequest) {
  try {
    const userId = await authenticateRequest(request);
    const body = await request.json() as unknown;
    const parsed = UpdateGoalSchema.safeParse(body);
    if (!parsed.success) {
      return apiResponse(null, new Error('Invalid weeklyTarget — must be an integer between 1 and 100'), 400);
    }

    const existing = await storage.getJSON<StoredGoals>(`users/${userId}/goals.json`).catch(() => null);
    const updated: StoredGoals = {
      ...(existing ?? DEFAULT_GOALS),
      weeklyApplicationTarget: parsed.data.weeklyTarget,
    };
    await storage.putJSON(`users/${userId}/goals.json`, updated);
    return apiResponse(updated);
  } catch (error) {
    return apiResponse(null, error as Error, 500);
  }
}
