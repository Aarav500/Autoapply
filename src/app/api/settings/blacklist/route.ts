import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticate, handleError, successResponse } from '@/lib/api-utils';
import { storage } from '@/lib/storage';
import { logger } from '@/lib/logger';

interface BlacklistData {
  companies: string[];
  updatedAt: string;
}

const UpdateSchema = z.object({
  companies: z.array(z.string().min(1).max(120)).max(500),
});

export async function GET(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);
    const data = await storage.getJSON<BlacklistData>(`users/${userId}/settings/blacklist.json`);
    return successResponse({ companies: data?.companies ?? [] });
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);
    const body = await req.json() as Record<string, unknown>;
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) return handleError(new Error(parsed.error.message));

    const data: BlacklistData = { companies: parsed.data.companies, updatedAt: new Date().toISOString() };
    await storage.putJSON(`users/${userId}/settings/blacklist.json`, data);
    logger.info({ userId, count: data.companies.length }, 'Blacklist updated');
    return successResponse({ companies: data.companies });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);
    const body = await req.json() as { company?: string };
    const company = body.company?.trim();
    if (!company) return handleError(new Error('Company name required'));

    const existing = await storage.getJSON<BlacklistData>(`users/${userId}/settings/blacklist.json`);
    const companies = existing?.companies ?? [];
    if (!companies.includes(company)) companies.push(company);
    await storage.putJSON(`users/${userId}/settings/blacklist.json`, { companies, updatedAt: new Date().toISOString() });
    return successResponse({ companies });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);
    const { searchParams } = new URL(req.url);
    const company = searchParams.get('company');
    if (!company) return handleError(new Error('Company name required'));

    const existing = await storage.getJSON<BlacklistData>(`users/${userId}/settings/blacklist.json`);
    const companies = (existing?.companies ?? []).filter((c) => c !== company);
    await storage.putJSON(`users/${userId}/settings/blacklist.json`, { companies, updatedAt: new Date().toISOString() });
    return successResponse({ companies });
  } catch (error) {
    return handleError(error);
  }
}
