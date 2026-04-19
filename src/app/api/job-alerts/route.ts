import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticate, successResponse, handleError, errorResponse } from '@/lib/api-utils';
import { storage } from '@/lib/storage';
import { generateId } from '@/lib/utils';
import { logger } from '@/lib/logger';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface JobAlert {
  id: string;
  userId: string;
  name: string;
  keywords: string;
  location: string;
  minSalary: number;
  minMatchScore: number;
  remote: boolean;
  active: boolean;
  lastRunAt?: string;
  matchCount: number;
  seenJobIds: string[];
  createdAt: string;
}

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const CreateAlertSchema = z.object({
  action: z.literal('create'),
  name: z.string().min(1, 'Name is required'),
  keywords: z.string().default(''),
  location: z.string().default(''),
  minSalary: z.number().min(0).default(0),
  minMatchScore: z.number().min(0).max(100).default(70),
  remote: z.boolean().default(false),
  active: z.boolean().default(true),
});

const UpdateAlertSchema = z.object({
  id: z.string().min(1, 'Alert ID is required'),
  name: z.string().min(1).optional(),
  keywords: z.string().optional(),
  location: z.string().optional(),
  minSalary: z.number().min(0).optional(),
  minMatchScore: z.number().min(0).max(100).optional(),
  remote: z.boolean().optional(),
  active: z.boolean().optional(),
});

const DeleteAlertSchema = z.object({
  id: z.string().min(1, 'Alert ID is required'),
});

// ─── Storage helpers ──────────────────────────────────────────────────────────

function alertsKey(userId: string): string {
  return `users/${userId}/job-alerts/index.json`;
}

async function loadAlerts(userId: string): Promise<JobAlert[]> {
  const data = await storage.getJSON<JobAlert[]>(alertsKey(userId));
  return Array.isArray(data) ? data : [];
}

async function saveAlerts(userId: string, alerts: JobAlert[]): Promise<void> {
  await storage.putJSON(alertsKey(userId), alerts);
}

// ─── GET /api/job-alerts ──────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);
    const alerts = await loadAlerts(userId);
    logger.info({ userId, count: alerts.length }, 'Job alerts listed');
    return successResponse({ alerts });
  } catch (error) {
    logger.error({ error }, 'GET /api/job-alerts error');
    return handleError(error);
  }
}

// ─── POST /api/job-alerts ─────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);
    const body: unknown = await req.json();
    const parsed = CreateAlertSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message ?? 'Invalid request', 400);
    }

    const { action: _action, ...fields } = parsed.data;

    const newAlert: JobAlert = {
      id: generateId(),
      userId,
      name: fields.name,
      keywords: fields.keywords,
      location: fields.location,
      minSalary: fields.minSalary,
      minMatchScore: fields.minMatchScore,
      remote: fields.remote,
      active: fields.active,
      matchCount: 0,
      seenJobIds: [],
      createdAt: new Date().toISOString(),
    };

    const alerts = await loadAlerts(userId);
    alerts.push(newAlert);
    await saveAlerts(userId, alerts);

    logger.info({ userId, alertId: newAlert.id }, 'Job alert created');
    return successResponse({ alert: newAlert }, 201);
  } catch (error) {
    logger.error({ error }, 'POST /api/job-alerts error');
    return handleError(error);
  }
}

// ─── PATCH /api/job-alerts ────────────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);
    const body: unknown = await req.json();
    const parsed = UpdateAlertSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message ?? 'Invalid request', 400);
    }

    const { id, ...updates } = parsed.data;
    const alerts = await loadAlerts(userId);
    const idx = alerts.findIndex((a) => a.id === id && a.userId === userId);

    if (idx === -1) {
      return errorResponse('Alert not found', 404);
    }

    alerts[idx] = { ...alerts[idx], ...updates };
    await saveAlerts(userId, alerts);

    logger.info({ userId, alertId: id }, 'Job alert updated');
    return successResponse({ alert: alerts[idx] });
  } catch (error) {
    logger.error({ error }, 'PATCH /api/job-alerts error');
    return handleError(error);
  }
}

// ─── DELETE /api/job-alerts ───────────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);
    const body: unknown = await req.json();
    const parsed = DeleteAlertSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message ?? 'Invalid request', 400);
    }

    const { id } = parsed.data;
    const alerts = await loadAlerts(userId);
    const filtered = alerts.filter((a) => !(a.id === id && a.userId === userId));

    if (filtered.length === alerts.length) {
      return errorResponse('Alert not found', 404);
    }

    await saveAlerts(userId, filtered);

    logger.info({ userId, alertId: id }, 'Job alert deleted');
    return successResponse({ deleted: true });
  } catch (error) {
    logger.error({ error }, 'DELETE /api/job-alerts error');
    return handleError(error);
  }
}
