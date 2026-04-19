/**
 * GET/POST /api/burnout
 * Job search burnout tracker — daily mood/energy logging with AI pattern analysis.
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticate, successResponse, errorResponse, handleError } from '@/lib/api-utils';
import { aiClient } from '@/lib/ai-client';
import { storage } from '@/lib/storage';
import { logger } from '@/lib/logger';
import { generateId } from '@/lib/utils';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface BurnoutEntry {
  id: string;
  date: string;
  mood: 1 | 2 | 3 | 4 | 5;
  energy: 1 | 2 | 3 | 4 | 5;
  applicationsToday: number;
  wins: string[];
  feelings: string;
  aiMessage?: string;
}

type BurnoutRisk = 'low' | 'moderate' | 'high' | 'critical';

// ─── Schemas ───────────────────────────────────────────────────────────────────

const logSchema = z.object({
  action: z.literal('log'),
  mood: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  energy: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  applicationsToday: z.number().min(0).default(0),
  wins: z.array(z.string()).default([]),
  feelings: z.string().default(''),
});

const adviceSchema = z.object({
  action: z.literal('get-advice'),
});

const bodySchema = z.discriminatedUnion('action', [logSchema, adviceSchema]);

// ─── Helpers ───────────────────────────────────────────────────────────────────

function computeBurnoutRisk(entries: BurnoutEntry[]): BurnoutRisk {
  const last7 = entries.slice(-7);
  if (last7.length === 0) return 'low';
  const avgMood = last7.reduce((acc, e) => acc + e.mood, 0) / last7.length;
  const avgEnergy = last7.reduce((acc, e) => acc + e.energy, 0) / last7.length;
  const combined = (avgMood + avgEnergy) / 2;
  if (combined >= 3.5) return 'low';
  if (combined >= 2.5) return 'moderate';
  if (combined >= 1.75) return 'high';
  return 'critical';
}

function computeBurnoutScore(entries: BurnoutEntry[]): number {
  const last7 = entries.slice(-7);
  if (last7.length === 0) return 100;
  const avg = last7.reduce((acc, e) => acc + e.mood, 0) / last7.length;
  return Math.round((avg / 5) * 100);
}

function buildSystemPrompt(): string {
  return `You are a compassionate career wellbeing coach specializing in supporting job seekers through the emotional challenges of the job search process. You offer warm, grounded, and genuinely helpful support — never generic platitudes. You understand that job searching is exhausting and emotionally draining, and you validate those feelings while providing practical encouragement. Keep messages concise (2-4 sentences) and genuinely human.`;
}

function buildLogUserPrompt(entry: BurnoutEntry, recent: BurnoutEntry[], risk: BurnoutRisk): string {
  const last3 = recent.slice(-3);
  const recentMoodAvg = last3.length > 0
    ? (last3.reduce((acc, e) => acc + e.mood, 0) / last3.length).toFixed(1)
    : String(entry.mood);
  const hasWins = entry.wins.length > 0;
  const isLowStreak = last3.length >= 3 && last3.every((e) => e.energy <= 2);

  let context = `Today's check-in:
- Mood: ${entry.mood}/5
- Energy: ${entry.energy}/5
- Applications submitted: ${entry.applicationsToday}
- Wins today: ${hasWins ? entry.wins.join(', ') : 'none noted'}
- Feelings: ${entry.feelings || 'not shared'}
- Burnout risk: ${risk}
- 3-day mood average: ${recentMoodAvg}/5`;

  if (hasWins) {
    context += '\n\nContext: The user just shared a win. Celebrate it genuinely and specifically.';
  } else if (risk === 'critical' || (risk === 'high' && isLowStreak)) {
    context += '\n\nContext: This person is showing serious burnout signals. Focus on rest, self-compassion, and remind them their worth is not tied to job search outcomes.';
  } else if (isLowStreak) {
    context += '\n\nContext: Energy has been consistently low for 3+ days. Recommend a specific type of break (nature walk, creative hobby, social time) and validate the fatigue.';
  } else if (risk === 'moderate') {
    context += '\n\nContext: Signs of wear are showing. Offer gentle encouragement and one concrete recharge tip.';
  }

  return `${context}\n\nWrite a short, warm, personalized message for this person right now.`;
}

function buildAdviceUserPrompt(entries: BurnoutEntry[], risk: BurnoutRisk): string {
  const last14 = entries.slice(-14);
  const summary = last14.map((e) =>
    `${e.date}: mood ${e.mood}/5, energy ${e.energy}/5, ${e.applicationsToday} apps, wins: [${e.wins.join(', ') || 'none'}]`
  ).join('\n');

  return `Based on this 14-day wellbeing log for a job seeker, provide personalized, actionable advice (4-6 sentences). Current burnout risk: ${risk}.

Log:
${summary}

Address their specific patterns — low-energy days, wins (or lack thereof), application pace. Give concrete strategies tailored to what you see in the data. Be warm, direct, and specific — not generic.`;
}

// ─── GET ───────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);

    const raw = await storage.getJSON<BurnoutEntry[]>(`users/${userId}/burnout/log.json`);
    const all: BurnoutEntry[] = Array.isArray(raw) ? raw : [];

    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const log = all.filter((e) => e.date >= cutoff);

    const burnout_score = computeBurnoutScore(all);
    const burnout_risk = computeBurnoutRisk(all);

    return successResponse({ log, burnout_score, burnout_risk });
  } catch (error) {
    logger.error({ error }, 'Burnout GET error');
    return handleError(error);
  }
}

// ─── POST ──────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);

    const body = await req.json() as unknown;
    const validation = bodySchema.safeParse(body);
    if (!validation.success) {
      return errorResponse(
        validation.error.issues[0]?.message ?? 'Invalid request body',
        400,
        'VALIDATION_ERROR'
      );
    }

    const raw = await storage.getJSON<BurnoutEntry[]>(`users/${userId}/burnout/log.json`);
    const all: BurnoutEntry[] = Array.isArray(raw) ? raw : [];

    if (validation.data.action === 'get-advice') {
      const risk = computeBurnoutRisk(all);
      if (all.length === 0) {
        return successResponse({ advice: "Start logging your daily mood and energy to get personalized wellbeing advice. Even just a few days of data will help me understand your patterns." });
      }
      const advice = await aiClient.complete(
        buildSystemPrompt(),
        buildAdviceUserPrompt(all, risk),
        { model: 'balanced', maxTokens: 512 }
      );
      logger.info({ userId }, 'Burnout advice generated');
      return successResponse({ advice });
    }

    // action === 'log'
    const { mood, energy, applicationsToday, wins, feelings } = validation.data;

    const today = new Date().toISOString().slice(0, 10);
    // Replace today's entry if it already exists
    const withoutToday = all.filter((e) => e.date !== today);

    const risk = computeBurnoutRisk(withoutToday);

    const aiMessage = await aiClient.complete(
      buildSystemPrompt(),
      buildLogUserPrompt(
        { id: '', date: today, mood, energy, applicationsToday, wins, feelings },
        withoutToday,
        risk
      ),
      { model: 'balanced', maxTokens: 512 }
    );

    const entry: BurnoutEntry = {
      id: generateId(),
      date: today,
      mood,
      energy,
      applicationsToday,
      wins,
      feelings,
      aiMessage,
    };

    const updated = [...withoutToday, entry].sort((a, b) => a.date.localeCompare(b.date));
    await storage.putJSON(`users/${userId}/burnout/log.json`, updated);

    const burnout_risk = computeBurnoutRisk(updated);

    logger.info({ userId, mood, energy, burnout_risk }, 'Burnout entry logged');

    return successResponse({ entry, burnout_risk, message: aiMessage });
  } catch (error) {
    logger.error({ error }, 'Burnout POST error');
    return handleError(error);
  }
}
