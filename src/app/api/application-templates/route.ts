import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticate, successResponse, errorResponse, handleError } from '@/lib/api-utils';
import { storage } from '@/lib/storage';
import { aiClient } from '@/lib/ai-client';
import { generateId } from '@/lib/utils';
import { z as zod } from 'zod';

export interface ApplicationTemplate {
  id: string;
  question: string;
  category: 'motivation' | 'experience' | 'skills' | 'cultural' | 'salary' | 'availability' | 'other';
  answer: string;
  tags: string[];
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

const TemplateSchema = z.object({
  question: z.string().min(5),
  answer: z.string().min(10),
  category: z.enum(['motivation', 'experience', 'skills', 'cultural', 'salary', 'availability', 'other']).default('other'),
  tags: z.array(z.string()).default([]),
});

const GenerateSchema = z.object({
  question: z.string().min(5),
  context: z.string().optional(),
  tone: z.enum(['professional', 'enthusiastic', 'concise']).default('professional'),
});

const GeneratedAnswerSchema = zod.object({
  answer: zod.string(),
  category: zod.enum(['motivation', 'experience', 'skills', 'cultural', 'salary', 'availability', 'other']),
  tags: zod.array(zod.string()),
  alternativeVersions: zod.array(zod.string()),
});

async function loadTemplates(userId: string): Promise<ApplicationTemplate[]> {
  const raw = await storage.getJSON<ApplicationTemplate[]>(`users/${userId}/settings/application-templates.json`);
  return Array.isArray(raw) ? raw : [];
}

async function saveTemplates(userId: string, templates: ApplicationTemplate[]): Promise<void> {
  await storage.putJSON(`users/${userId}/settings/application-templates.json`, templates);
}

// GET /api/application-templates
export async function GET(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);
    const templates = await loadTemplates(userId);
    return successResponse({ templates });
  } catch (error) {
    return handleError(error);
  }
}

// POST /api/application-templates?action=generate|save
export async function POST(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') ?? 'save';

    if (action === 'generate') {
      const body: unknown = await req.json();
      const parsed = GenerateSchema.safeParse(body);
      if (!parsed.success) return errorResponse('Invalid request', 400);

      const { question, context, tone } = parsed.data;

      const profile = await storage.getJSON<Record<string, unknown>>(`users/${userId}/profile.json`);
      const profileContext = profile
        ? `Candidate: ${String(profile.name ?? '')}, ${String(profile.headline ?? '')}, Skills: ${
            ((profile.skills as Array<{ name: string }>) ?? []).slice(0, 8).map((s) => s.name).join(', ')
          }`
        : 'No profile data available';

      const systemPrompt = `You are an expert at writing compelling answers to job application screening questions. Write answers that are honest, specific, and highlight the candidate's strengths.`;
      const userPrompt = `Write an answer to this application question in a ${tone} tone.

Question: "${question}"
${context ? `Additional context: ${context}` : ''}
${profileContext}

Return JSON with:
- answer: the main answer (2-4 sentences, concrete and specific)
- category: one of "motivation", "experience", "skills", "cultural", "salary", "availability", "other"
- tags: 2-4 keyword tags for searchability
- alternativeVersions: array of 2 shorter alternative phrasings`;

      const result = await aiClient.completeJSON(systemPrompt, userPrompt, GeneratedAnswerSchema, { model: 'fast' });
      return successResponse(result);
    }

    // Default: save template
    const body: unknown = await req.json();
    const parsed = TemplateSchema.safeParse(body);
    if (!parsed.success) return errorResponse(`Invalid: ${parsed.error.issues.map((e) => e.message).join(', ')}`, 400);

    const templates = await loadTemplates(userId);
    const now = new Date().toISOString();
    const newTemplate: ApplicationTemplate = {
      id: generateId(),
      ...parsed.data,
      usageCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    templates.unshift(newTemplate);
    await saveTemplates(userId, templates);

    return successResponse({ template: newTemplate });
  } catch (error) {
    return handleError(error);
  }
}

// PATCH /api/application-templates — update answer
export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);
    const body = await req.json() as { id: string; answer?: string; question?: string; tags?: string[] };
    if (!body.id) return errorResponse('Missing id', 400);

    const templates = await loadTemplates(userId);
    const idx = templates.findIndex((t) => t.id === body.id);
    if (idx === -1) return errorResponse('Template not found', 404);

    templates[idx] = {
      ...templates[idx],
      ...(body.answer !== undefined ? { answer: body.answer } : {}),
      ...(body.question !== undefined ? { question: body.question } : {}),
      ...(body.tags !== undefined ? { tags: body.tags } : {}),
      updatedAt: new Date().toISOString(),
    };

    await saveTemplates(userId, templates);
    return successResponse({ template: templates[idx] });
  } catch (error) {
    return handleError(error);
  }
}

// DELETE /api/application-templates?id=xxx
export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return errorResponse('Missing id', 400);

    const templates = await loadTemplates(userId);
    await saveTemplates(userId, templates.filter((t) => t.id !== id));

    return successResponse({ deleted: true });
  } catch (error) {
    return handleError(error);
  }
}
