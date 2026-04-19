/**
 * POST /api/recruiter-prep  — generate a recruiter brief
 * GET  /api/recruiter-prep  — return last 5 sessions
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticate, successResponse, handleError } from '@/lib/api-utils';
import { aiClient } from '@/lib/ai-client';
import { storage } from '@/lib/storage';
import { logger } from '@/lib/logger';
import { generateId } from '@/lib/utils';
import type { Profile } from '@/types/profile';

// ─── Request schema ────────────────────────────────────────────────────────────

const inputSchema = z.object({
  recruiterInfo: z.string().min(20).max(2000),
  recruiterName: z.string().min(1),
  company: z.string().min(1),
  role: z.string().min(1),
  callType: z
    .enum(['phone-screen', 'video-intro', 'hr-round', 'hiring-manager'])
    .default('phone-screen'),
});

// ─── AI output schema ──────────────────────────────────────────────────────────

const prepSchema = z.object({
  recruiter_profile: z.object({
    background: z.string(),
    years_in_recruiting: z.string(),
    specialization: z.string(),
    personality_signals: z.array(z.string()),
    likely_style: z.enum(['structured', 'conversational', 'technical', 'culture-focused']),
  }),

  company_screening_style: z.object({
    what_they_screen_for: z.array(z.string()),
    deal_breakers: z.array(z.string()),
    green_flags_they_love: z.array(z.string()),
    typical_duration: z.string(),
  }),

  likely_questions: z
    .array(
      z.object({
        question: z.string(),
        why_they_ask: z.string(),
        ideal_answer_direction: z.string(),
        time_limit: z.string(),
      })
    )
    .max(8),

  how_to_position: z.object({
    opening_hook: z.string(),
    key_narrative: z.string(),
    skills_to_emphasize: z.array(z.string()),
    experience_to_highlight: z.string(),
  }),

  what_not_to_say: z
    .array(
      z.object({
        dont_say: z.string(),
        why: z.string(),
        say_instead: z.string(),
      })
    )
    .max(6),

  salary_strategy: z.object({
    when_to_discuss: z.string(),
    how_to_deflect_early: z.string(),
    what_to_say_when_pushed: z.string(),
    anchoring_script: z.string(),
  }),

  questions_to_ask: z
    .array(
      z.object({
        question: z.string(),
        why_it_impresses: z.string(),
      })
    )
    .max(5),

  call_structure: z.object({
    opening: z.string(),
    middle: z.string(),
    closing: z.string(),
  }),

  confidence_level: z.enum(['high', 'medium', 'challenging']),
  confidence_reason: z.string(),
});

export type RecruiterPrep = z.infer<typeof prepSchema>;

// ─── Stored session type ───────────────────────────────────────────────────────

interface PrepSession {
  id: string;
  recruiterName: string;
  company: string;
  role: string;
  callType: string;
  generatedAt: string;
  prep: RecruiterPrep;
}

// ─── GET ───────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);

    const index = await storage.getJSON<{ sessions: PrepSession[] }>(
      `users/${userId}/recruiter-prep/index.json`
    );

    const sessions = (index?.sessions ?? [])
      .sort(
        (a, b) =>
          new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
      )
      .slice(0, 5);

    return successResponse({ sessions });
  } catch (error) {
    logger.error({ error }, 'recruiter-prep GET error');
    return handleError(error);
  }
}

// ─── POST ──────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);

    const body: unknown = await req.json();
    const input = inputSchema.parse(body);

    // Load profile for personalisation
    const profile = await storage.getJSON<Profile>(
      `users/${userId}/profile.json`
    );

    const candidateSummary = profile
      ? [
          profile.name ? `Name: ${profile.name}` : '',
          profile.headline ? `Headline: ${profile.headline}` : '',
          profile.skills?.length
            ? `Key skills: ${profile.skills
                .slice(0, 10)
                .map((s) => s.name)
                .join(', ')}`
            : '',
        ]
          .filter(Boolean)
          .join('\n')
      : 'No profile available.';

    const callTypeLabel: Record<string, string> = {
      'phone-screen': 'Phone Screen',
      'video-intro': 'Video Intro',
      'hr-round': 'HR Round',
      'hiring-manager': 'Hiring Manager Round',
    };

    const system =
      'You are a career strategist who has trained hundreds of candidates on how to pass recruiter screens. ' +
      'You understand recruiter psychology, what different companies screen for, and how to position candidates optimally. ' +
      'You analyze recruiters\' backgrounds to predict their screening style and give candidates an edge.';

    const user =
      `Recruiter: ${input.recruiterName}\n` +
      `Company: ${input.company}\n` +
      `Role applied for: ${input.role}\n` +
      `Call type: ${callTypeLabel[input.callType]}\n\n` +
      `Recruiter information:\n${input.recruiterInfo}\n\n` +
      `Candidate profile:\n${candidateSummary}\n\n` +
      'Generate a comprehensive recruiter brief. For likely_questions provide exactly 6–8 questions. ' +
      'For what_not_to_say provide 4–6 items. For questions_to_ask provide 4–5 high-quality questions. ' +
      'Make the salary_strategy.anchoring_script a ready-to-speak script the candidate can read verbatim. ' +
      'Make opening_hook a 30-second verbatim introduction script tailored to this recruiter and company.';

    const prep = await aiClient.completeJSON(system, user, prepSchema, {
      model: 'balanced',
      maxTokens: 3072,
    });

    // Persist session
    const sessionId = generateId();
    const session: PrepSession = {
      id: sessionId,
      recruiterName: input.recruiterName,
      company: input.company,
      role: input.role,
      callType: input.callType,
      generatedAt: new Date().toISOString(),
      prep,
    };

    await storage.putJSON(
      `users/${userId}/recruiter-prep/${sessionId}.json`,
      session
    );

    // Update index
    const existingIndex = await storage.getJSON<{ sessions: PrepSession[] }>(
      `users/${userId}/recruiter-prep/index.json`
    );
    const sessions = existingIndex?.sessions ?? [];
    sessions.unshift(session);
    await storage.putJSON(`users/${userId}/recruiter-prep/index.json`, {
      sessions: sessions.slice(0, 20),
    });

    logger.info(
      { userId, sessionId, company: input.company },
      'Recruiter prep generated'
    );

    return successResponse({ session });
  } catch (error) {
    logger.error({ error }, 'recruiter-prep POST error');
    return handleError(error);
  }
}
