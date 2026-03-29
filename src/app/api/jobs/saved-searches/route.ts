import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticate, successResponse, errorResponse, handleError } from '@/lib/api-utils';
import { storage } from '@/lib/storage';
import { generateId } from '@/lib/utils';

export interface SavedSearch {
  id: string;
  name: string;
  filters: {
    statusFilter?: string;
    remoteOnly?: boolean;
    minScore?: number;
    minSalary?: number;
    maxSalary?: number;
    jobType?: string;
    urgency?: string;
    query?: string;
  };
  alertEnabled: boolean;
  createdAt: string;
  lastAlertAt?: string;
}

const SaveSchema = z.object({
  name: z.string().min(1).max(80),
  filters: z.object({
    statusFilter: z.string().optional(),
    remoteOnly: z.boolean().optional(),
    minScore: z.number().min(0).max(100).optional(),
    minSalary: z.number().min(0).optional(),
    maxSalary: z.number().min(0).optional(),
    jobType: z.string().optional(),
    urgency: z.string().optional(),
    query: z.string().optional(),
  }),
  alertEnabled: z.boolean().default(false),
});

// GET /api/jobs/saved-searches
export async function GET(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);
    const raw = await storage.getJSON<SavedSearch[]>(`users/${userId}/jobs/saved-searches.json`);
    const searches: SavedSearch[] = Array.isArray(raw) ? raw : [];
    return successResponse({ searches });
  } catch (error) {
    return handleError(error);
  }
}

// POST /api/jobs/saved-searches
export async function POST(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);
    const body: unknown = await req.json();
    const parsed = SaveSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(`Invalid: ${parsed.error.issues.map((e) => e.message).join(', ')}`, 400);
    }
    const { name, filters, alertEnabled } = parsed.data;

    const raw = await storage.getJSON<SavedSearch[]>(`users/${userId}/jobs/saved-searches.json`);
    const searches: SavedSearch[] = Array.isArray(raw) ? raw : [];

    const newSearch: SavedSearch = {
      id: generateId(),
      name,
      filters,
      alertEnabled,
      createdAt: new Date().toISOString(),
    };

    searches.unshift(newSearch);
    await storage.putJSON(`users/${userId}/jobs/saved-searches.json`, searches);

    return successResponse({ search: newSearch });
  } catch (error) {
    return handleError(error);
  }
}

// DELETE /api/jobs/saved-searches?id=xxx
export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return errorResponse('Missing id', 400);

    const raw = await storage.getJSON<SavedSearch[]>(`users/${userId}/jobs/saved-searches.json`);
    const searches: SavedSearch[] = Array.isArray(raw) ? raw : [];
    const updated = searches.filter((s) => s.id !== id);
    await storage.putJSON(`users/${userId}/jobs/saved-searches.json`, updated);

    return successResponse({ deleted: true });
  } catch (error) {
    return handleError(error);
  }
}
