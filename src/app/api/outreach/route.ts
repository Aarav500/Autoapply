import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticate, successResponse, handleError } from '@/lib/api-utils';
import { aiClient } from '@/lib/ai-client';
import { storage } from '@/lib/storage';
import { logger } from '@/lib/logger';
import { generateId } from '@/lib/utils';
import type { Profile } from '@/types/profile';

// ── Input Schema ──────────────────────────────────────────────────────────────

const inputSchema = z.object({
  action: z.literal('generate'),
  targetName: z.string().min(1),
  targetCompany: z.string().min(1),
  targetRole: z.string().min(1),
  targetBio: z.string().max(1000),
  sharedContext: z.string().max(500).optional(),
  goal: z.enum(['referral', 'coffee-chat', 'job-inquiry', 'networking', 'informational-interview']),
  platform: z.enum(['email', 'linkedin-message', 'linkedin-inmail', 'twitter-dm']),
});

// ── AI Output Schema ──────────────────────────────────────────────────────────

const outreachSchema = z.object({
  subject_line: z.string(),
  message: z.string(),
  message_short: z.string(),
  personalization_hooks: z.array(z.string()),
  why_it_works: z.string(),
  follow_up_timing: z.string(),
  alternative_angle: z.string(),
});

export type OutreachResult = z.infer<typeof outreachSchema>;

// ── Stored history item ───────────────────────────────────────────────────────

export interface OutreachHistoryItem {
  id: string;
  createdAt: string;
  targetName: string;
  targetCompany: string;
  targetRole: string;
  targetBio: string;
  sharedContext?: string;
  goal: z.infer<typeof inputSchema>['goal'];
  platform: z.infer<typeof inputSchema>['platform'];
  result: OutreachResult;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const GOAL_LABELS: Record<z.infer<typeof inputSchema>['goal'], string> = {
  referral: 'internal referral to a job opening',
  'coffee-chat': 'casual 20-minute virtual coffee chat',
  'job-inquiry': 'direct inquiry about job opportunities',
  networking: 'to connect and build a professional relationship',
  'informational-interview': '30-minute informational interview about their career path',
};

const PLATFORM_CONSTRAINTS: Record<z.infer<typeof inputSchema>['platform'], string> = {
  email: 'a professional email (subject line required, 150 words max for body)',
  'linkedin-message': 'a LinkedIn connection message (300 characters max)',
  'linkedin-inmail': 'a LinkedIn InMail (300 words max, no subject line needed)',
  'twitter-dm': 'a Twitter/X DM (280 characters max, very casual tone)',
};

function buildSystemPrompt(): string {
  return `You are an expert networker and career coach. You write cold outreach messages that get responses. Your messages are specific, personalized, and never sound like templates. You understand that people respond to genuine curiosity and clear value exchange, not flattery or vague asks.

Key principles:
- Lead with something specific you noticed about their work, not a generic compliment
- Make a single, clear, easy-to-fulfill ask
- Keep it short — busy people don't read walls of text
- Show you've done your research
- Sound like a human, not a sales bot
- Never use "I hope this message finds you well", "reaching out to connect", or "pick your brain"`;
}

function buildUserPrompt(
  input: z.infer<typeof inputSchema>,
  profile: Partial<Profile> | null
): string {
  const senderName = profile?.name ?? 'the sender';
  const senderHeadline = profile?.headline ?? '';
  const senderSkills = profile?.skills?.slice(0, 5).map((s) => s.name).join(', ') ?? '';
  const senderExperience = profile?.experience?.slice(0, 2).map(
    (e) => `${e.role} at ${e.company}`
  ).join(', ') ?? '';

  const goalLabel = GOAL_LABELS[input.goal];
  const platformConstraint = PLATFORM_CONSTRAINTS[input.platform];

  return `Write a cold outreach message for the following scenario.

## About the sender (${senderName})
- Headline: ${senderHeadline || 'Not provided'}
- Top skills: ${senderSkills || 'Not provided'}
- Recent experience: ${senderExperience || 'Not provided'}

## About the target person
- Name: ${input.targetName}
- Role: ${input.targetRole} at ${input.targetCompany}
- Background / Bio: ${input.targetBio}
${input.sharedContext ? `- Shared context: ${input.sharedContext}` : ''}

## Goal
The sender wants ${goalLabel}.

## Platform
Write ${platformConstraint}.

## Requirements
1. Reference something SPECIFIC from their bio or background — a project, a career transition, a company they built, something concrete
2. Keep the full message under 150 words
3. The short version must be under 300 characters for LinkedIn
4. No corporate jargon, no "synergies", no "leverage"
5. One clear ask in the last sentence
6. Sound like it was written by a smart human, not a template

Respond with a JSON object matching exactly:
{
  "subject_line": "email subject if applicable, otherwise empty string",
  "message": "the full outreach message",
  "message_short": "ultra-short version under 300 chars for LinkedIn",
  "personalization_hooks": ["specific thing referenced 1", "specific thing referenced 2"],
  "why_it_works": "1-2 sentence explanation of the psychological approach used",
  "follow_up_timing": "when and how to follow up if no response",
  "alternative_angle": "a completely different approach if this one doesn't work"
}`;
}

// ── GET /api/outreach ─────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { userId } = await authenticate(request);

    const raw = await storage.getJSON<OutreachHistoryItem[] | { history: OutreachHistoryItem[] }>(
      `users/${userId}/outreach/history.json`
    );

    const history: OutreachHistoryItem[] = Array.isArray(raw) ? raw : raw?.history ?? [];

    // Most recent first
    history.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    logger.info({ userId, count: history.length }, 'Outreach history fetched');

    return successResponse({ history });
  } catch (error) {
    logger.error({ error }, 'Outreach GET error');
    return handleError(error);
  }
}

// ── POST /api/outreach ────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const { userId } = await authenticate(request);

    const body = await request.json();
    const input = inputSchema.parse(body);

    // Load user profile for context (gracefully handle missing profile)
    let profile: Partial<Profile> | null = null;
    try {
      profile = await storage.getJSON<Partial<Profile>>(`users/${userId}/profile.json`);
    } catch {
      logger.warn({ userId }, 'Outreach: profile not found, generating without sender context');
    }

    const system = buildSystemPrompt();
    const user = buildUserPrompt(input, profile);

    const result = await aiClient.completeJSON(system, user, outreachSchema, {
      model: 'balanced',
      maxTokens: 2048,
    });

    // Save to history
    const historyItem: OutreachHistoryItem = {
      id: generateId(),
      createdAt: new Date().toISOString(),
      targetName: input.targetName,
      targetCompany: input.targetCompany,
      targetRole: input.targetRole,
      targetBio: input.targetBio,
      sharedContext: input.sharedContext,
      goal: input.goal,
      platform: input.platform,
      result,
    };

    const rawHistory = await storage.getJSON<
      OutreachHistoryItem[] | { history: OutreachHistoryItem[] }
    >(`users/${userId}/outreach/history.json`);

    const existing: OutreachHistoryItem[] = Array.isArray(rawHistory)
      ? rawHistory
      : rawHistory?.history ?? [];

    const updated = [historyItem, ...existing].slice(0, 50);

    await storage.putJSON(`users/${userId}/outreach/history.json`, updated);

    logger.info(
      { userId, targetName: input.targetName, goal: input.goal },
      'Outreach message generated'
    );

    return successResponse({ outreach: result, historyItem });
  } catch (error) {
    logger.error({ error }, 'Outreach POST error');
    return handleError(error);
  }
}
