import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticate, successResponse, handleError } from '@/lib/api-utils';
import { storage } from '@/lib/storage';
import { aiClient } from '@/lib/ai-client';
import { logger } from '@/lib/logger';
import { generateId } from '@/lib/utils';
import type { Profile } from '@/types/profile';

// ── Input schema ──────────────────────────────────────────────

const inputSchema = z.object({
  company: z.string().min(1),
  role: z.string().min(1),
  interviewDate: z.string().optional(),
  interviewType: z.enum(['phone', 'video', 'onsite', 'technical', 'final']).default('video'),
  rounds: z.number().min(1).max(10).default(1),
  additionalContext: z.string().max(500).optional(),
});

// ── AI output schema ──────────────────────────────────────────

const warroomSchema = z.object({
  company_intel: z.object({
    mission: z.string(),
    key_products: z.array(z.string()),
    culture_signals: z.array(z.string()),
    recent_news: z.array(z.string()),
    interview_style: z.string(),
    known_red_flags: z.array(z.string()),
  }),
  personal_pitch: z.object({
    opening: z.string(),
    full_pitch: z.string(),
    why_this_company: z.string(),
    why_this_role: z.string(),
  }),
  likely_questions: z.array(z.object({
    question: z.string(),
    category: z.enum(['behavioral', 'technical', 'culture-fit', 'role-specific']),
    talking_points: z.array(z.string()),
    trap_to_avoid: z.string(),
  })).max(8),
  accomplishments_to_mention: z.array(z.object({
    story: z.string(),
    metrics: z.string(),
    relevance: z.string(),
  })).max(4),
  red_flags_to_avoid: z.array(z.string()),
  pre_interview_checklist: z.array(z.object({
    item: z.string(),
    timing: z.string(),
    done: z.boolean().default(false),
  })),
  confidence_boosters: z.array(z.string()).max(3),
  questions_to_ask: z.array(z.object({
    question: z.string(),
    why_ask: z.string(),
  })).max(5),
});

export type WarroomResult = z.infer<typeof warroomSchema>;

export interface WarroomRecord {
  id: string;
  company: string;
  role: string;
  interviewDate: string | undefined;
  interviewType: string;
  rounds: number;
  createdAt: string;
  result: WarroomResult;
}

// ── POST — generate war room ──────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);
    const body: unknown = await req.json();
    const input = inputSchema.parse(body);

    // Load user profile for personalisation
    const profile = await storage.getJSON<Profile>(`users/${userId}/profile.json`);

    const profileContext = profile
      ? [
          profile.name ? `Name: ${profile.name}` : '',
          profile.headline ? `Current role/headline: ${profile.headline}` : '',
          profile.skills?.length
            ? `Skills: ${profile.skills.map((s) => s.name).join(', ')}`
            : '',
          Array.isArray(profile.experience) && profile.experience.length
            ? `Experience: ${(profile.experience as Array<{ title?: string; company?: string; years?: number }>)
                .slice(0, 3)
                .map((e) => `${e.title ?? ''} at ${e.company ?? ''}`).join('; ')}`
            : '',
        ]
          .filter(Boolean)
          .join('\n')
      : 'No profile available — generate generic advice.';

    const systemPrompt = `You are a world-class interview coach and career strategist. You've prepared hundreds of candidates for interviews at FAANG, unicorns, and elite companies. Your war room briefings are legendary for their specificity, insight, and ability to make candidates feel supremely confident and prepared.`;

    const userPrompt = `Generate a complete interview war room briefing for the following:

Company: ${input.company}
Role: ${input.role}
Interview type: ${input.interviewType}
Number of rounds: ${input.rounds}
${input.interviewDate ? `Interview date/time: ${input.interviewDate}` : ''}
${input.additionalContext ? `Additional context: ${input.additionalContext}` : ''}

Candidate profile:
${profileContext}

Produce a highly specific, actionable war room briefing. For company intel, draw on widely known facts about the company — their actual products, culture, interview reputation, and common pitfalls candidates face. For likely questions, tailor them specifically to the ${input.interviewType} interview for ${input.role} at ${input.company}. For accomplishments, pull from the candidate's background and frame them for this specific role.

Pre-interview checklist should cover: Night before, 1 hour before, and 10 minutes before. Include items like technical setup (for video/phone/technical), logistics, mental preparation, and materials to review.

Be direct and specific — no generic platitudes. Every piece of advice should be actionable.`;

    const result = await aiClient.completeJSON(
      systemPrompt,
      userPrompt,
      warroomSchema,
      { model: 'powerful', maxTokens: 4096 }
    );

    const record: WarroomRecord = {
      id: generateId(),
      company: input.company,
      role: input.role,
      interviewDate: input.interviewDate,
      interviewType: input.interviewType,
      rounds: input.rounds,
      createdAt: new Date().toISOString(),
      result,
    };

    await storage.putJSON(`users/${userId}/warroom/${record.id}.json`, record);

    logger.info({ userId, company: input.company, role: input.role }, 'War room generated');

    return successResponse(record);
  } catch (error) {
    logger.error({ error }, 'War room generation error');
    return handleError(error);
  }
}

// ── GET — fetch last 5 war rooms ──────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);

    const keys = await storage.listKeys(`users/${userId}/warroom/`);

    if (!keys.length) {
      return successResponse({ warrooms: [] });
    }

    // Load all records and sort by createdAt desc, return last 5
    const records = await Promise.all(
      keys.map((key) => storage.getJSON<WarroomRecord>(key))
    );

    const valid = records
      .filter((r): r is WarroomRecord => r !== null && r !== undefined)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    logger.info({ userId, count: valid.length }, 'War rooms listed');

    return successResponse({ warrooms: valid });
  } catch (error) {
    logger.error({ error }, 'War room list error');
    return handleError(error);
  }
}
