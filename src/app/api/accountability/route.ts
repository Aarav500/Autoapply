/**
 * GET/POST /api/accountability
 * Job search accountability system — goals, daily check-ins, streaks, AI coaching.
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticate, successResponse, errorResponse, handleError } from '@/lib/api-utils';
import { aiClient } from '@/lib/ai-client';
import { storage } from '@/lib/storage';
import { logger } from '@/lib/logger';
import { generateId } from '@/lib/utils';
import type { Profile } from '@/types/profile';

// ─── Storage keys ──────────────────────────────────────────────────────────────

function goalsKey(userId: string) {
  return `users/${userId}/accountability/goals.json`;
}
function checkinsKey(userId: string) {
  return `users/${userId}/accountability/checkins.json`;
}
function weeklyKey(userId: string) {
  return `users/${userId}/accountability/weekly.json`;
}

// ─── Types ─────────────────────────────────────────────────────────────────────

interface AccountabilityGoals {
  dailyApplications: number;
  weeklyApplications: number;
  weeklyConnections: number;
  weeklyInterviewPractice: number;
  searchPhase: 'active-hunt' | 'passive' | 'targeting' | 'interviewing';
  targetCompanies: string[];
  targetRoles: string[];
  deadline?: string;
  createdAt: string;
  updatedAt: string;
}

interface DailyCheckIn {
  id: string;
  date: string;
  applicationsSubmitted: number;
  connectionsRequested: number;
  interviewPracticed: boolean;
  mood: 1 | 2 | 3 | 4 | 5;
  wins: string[];
  blockers: string;
  notes: string;
  aiCoachingMessage?: string;
  aiTone?: string;
  aiActionForTomorrow?: string;
  createdAt: string;
}

interface WeeklyReview {
  id: string;
  weekOf: string;
  totalApplications: number;
  totalConnections: number;
  responseRate: number;
  streakDays: number;
  goalsMet: boolean;
  aiReview?: string;
  nextWeekStrategy?: string;
  highlights?: string[];
  goalAdjustment?: string | null;
  createdAt: string;
}

// ─── Request schemas ───────────────────────────────────────────────────────────

const setGoalsSchema = z.object({
  action: z.literal('set-goals'),
  dailyApplications: z.number().min(1).max(50),
  weeklyApplications: z.number().min(1).max(200),
  weeklyConnections: z.number().min(0).max(200),
  weeklyInterviewPractice: z.number().min(0).max(7),
  searchPhase: z.enum(['active-hunt', 'passive', 'targeting', 'interviewing']),
  targetCompanies: z.array(z.string()).default([]),
  targetRoles: z.array(z.string()).default([]),
  deadline: z.string().optional(),
});

const checkInSchema = z.object({
  action: z.literal('checkin'),
  date: z.string(),
  applicationsSubmitted: z.number().min(0),
  connectionsRequested: z.number().min(0),
  interviewPracticed: z.boolean(),
  mood: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  wins: z.array(z.string()).default([]),
  blockers: z.string().default(''),
  notes: z.string().default(''),
});

const weeklyReviewSchema = z.object({
  action: z.literal('weekly-review'),
});

const requestSchema = z.discriminatedUnion('action', [
  setGoalsSchema,
  checkInSchema,
  weeklyReviewSchema,
]);

// ─── AI output schemas ─────────────────────────────────────────────────────────

const coachingSchema = z.object({
  message: z.string(),
  tone: z.enum(['celebrating', 'encouraging', 'challenging', 'supportive']),
  action_for_tomorrow: z.string(),
});

const weeklyAiSchema = z.object({
  review: z.string(),
  next_week_strategy: z.string(),
  goal_adjustment: z.string().nullable(),
  highlights: z.array(z.string()),
});

// ─── Helpers ───────────────────────────────────────────────────────────────────

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function calculateStreak(checkins: DailyCheckIn[]): number {
  if (checkins.length === 0) return 0;

  const sorted = [...checkins]
    .filter((c) => c.applicationsSubmitted > 0 || c.interviewPracticed || c.connectionsRequested > 0)
    .map((c) => c.date)
    .sort()
    .reverse();

  if (sorted.length === 0) return 0;

  const today = isoDate(new Date());
  const yesterday = isoDate(new Date(Date.now() - 86400000));

  // Streak must include today or yesterday
  if (sorted[0] !== today && sorted[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diffDays = Math.round((prev.getTime() - curr.getTime()) / 86400000);
    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function getWeekStart(date?: Date): string {
  const d = date ? new Date(date) : new Date();
  const day = d.getDay(); // 0=Sun
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((day + 6) % 7));
  return isoDate(monday);
}

function pruneOldCheckins(checkins: DailyCheckIn[]): DailyCheckIn[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  return checkins.filter((c) => new Date(c.date) >= cutoff);
}

function pruneOldWeekly(weeks: WeeklyReview[]): WeeklyReview[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 84); // 12 weeks
  return weeks.filter((w) => new Date(w.weekOf) >= cutoff);
}

function buildWeekSummary(
  checkins: DailyCheckIn[],
  weekOf: string
): { totalApplications: number; totalConnections: number; streak: number; goalsMet: boolean; goals: AccountabilityGoals | null } {
  const weekEnd = new Date(weekOf);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekCheckins = checkins.filter((c) => c.date >= weekOf && c.date < isoDate(weekEnd));
  return {
    totalApplications: weekCheckins.reduce((s, c) => s + c.applicationsSubmitted, 0),
    totalConnections: weekCheckins.reduce((s, c) => s + c.connectionsRequested, 0),
    streak: calculateStreak(checkins),
    goalsMet: false, // caller fills this in
    goals: null,
  };
}

// ─── GET handler ───────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);

    const [goals, rawCheckins, rawWeekly] = await Promise.all([
      storage.getJSON<AccountabilityGoals>(goalsKey(userId)),
      storage.getJSON<DailyCheckIn[]>(checkinsKey(userId)),
      storage.getJSON<WeeklyReview[]>(weeklyKey(userId)),
    ]);

    const checkins = pruneOldCheckins(Array.isArray(rawCheckins) ? rawCheckins : []);
    const weekly = pruneOldWeekly(Array.isArray(rawWeekly) ? rawWeekly : []);

    const last7 = checkins
      .slice()
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 7);

    const streak = calculateStreak(checkins);
    const weekOf = getWeekStart();
    const weekEnd = new Date(weekOf);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const thisWeekCheckins = checkins.filter(
      (c) => c.date >= weekOf && c.date < isoDate(weekEnd)
    );
    const weekApps = thisWeekCheckins.reduce((s, c) => s + c.applicationsSubmitted, 0);
    const weekConnections = thisWeekCheckins.reduce((s, c) => s + c.connectionsRequested, 0);

    logger.info({ userId, streak }, 'Accountability GET');

    return successResponse({
      goals,
      recentCheckins: last7,
      streak,
      weekOf,
      weekApps,
      weekConnections,
      latestWeeklyReview: weekly.length > 0 ? weekly[weekly.length - 1] : null,
    });
  } catch (error) {
    logger.error({ error }, 'Accountability GET error');
    return handleError(error);
  }
}

// ─── POST handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);

    const body = await req.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues[0]?.message ?? 'Invalid request',
        400,
        'VALIDATION_ERROR'
      );
    }

    // ── set-goals ──────────────────────────────────────────────────────────────
    if (parsed.data.action === 'set-goals') {
      const {
        dailyApplications,
        weeklyApplications,
        weeklyConnections,
        weeklyInterviewPractice,
        searchPhase,
        targetCompanies,
        targetRoles,
        deadline,
      } = parsed.data;

      const existing = await storage.getJSON<AccountabilityGoals>(goalsKey(userId));
      const now = new Date().toISOString();

      const goals: AccountabilityGoals = {
        dailyApplications,
        weeklyApplications,
        weeklyConnections,
        weeklyInterviewPractice,
        searchPhase,
        targetCompanies,
        targetRoles,
        deadline,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };

      await storage.putJSON(goalsKey(userId), goals);
      logger.info({ userId, searchPhase }, 'Goals saved');

      return successResponse({ goals });
    }

    // ── checkin ────────────────────────────────────────────────────────────────
    if (parsed.data.action === 'checkin') {
      const {
        date,
        applicationsSubmitted,
        connectionsRequested,
        interviewPracticed,
        mood,
        wins,
        blockers,
        notes,
      } = parsed.data;

      const [goals, rawCheckins, profile] = await Promise.all([
        storage.getJSON<AccountabilityGoals>(goalsKey(userId)),
        storage.getJSON<DailyCheckIn[]>(checkinsKey(userId)),
        storage.getJSON<Profile>(`users/${userId}/profile.json`),
      ]);

      const checkins = pruneOldCheckins(Array.isArray(rawCheckins) ? rawCheckins : []);

      // Remove any existing check-in for the same date
      const filtered = checkins.filter((c) => c.date !== date);

      // Week context for AI
      const weekOf = getWeekStart();
      const weekEnd = new Date(weekOf);
      weekEnd.setDate(weekEnd.getDate() + 7);
      const weekCheckins = filtered.filter(
        (c) => c.date >= weekOf && c.date < isoDate(weekEnd)
      );
      const weekAppsTotal = weekCheckins.reduce((s, c) => s + c.applicationsSubmitted, 0) + applicationsSubmitted;

      // Build new streak including this check-in
      const tempCheckins = [
        ...filtered,
        {
          id: 'temp',
          date,
          applicationsSubmitted,
          connectionsRequested,
          interviewPracticed,
          mood,
          wins,
          blockers,
          notes,
          createdAt: new Date().toISOString(),
        } as DailyCheckIn,
      ];
      const newStreak = calculateStreak(tempCheckins);

      // AI coaching message
      const systemPrompt =
        'You are a high-performance job search coach. You\'re direct, warm, and data-driven. Your coaching messages are specific, motivating, and adjusted to the person\'s mood and progress.';

      const moodLabels: Record<number, string> = {
        1: 'burning out / frustrated',
        2: 'low / discouraged',
        3: 'neutral / steady',
        4: 'good / positive',
        5: 'on fire / excellent',
      };

      const userPrompt = `Provide a coaching message for today's job search check-in.

Person's headline: ${profile?.headline ?? 'Job seeker'}
Search phase: ${goals?.searchPhase ?? 'active-hunt'}
Goals: ${goals?.dailyApplications ?? 5} apps/day, ${goals?.weeklyApplications ?? 25} apps/week
${goals?.deadline ? `Target employment date: ${goals.deadline}` : ''}

Today's check-in (${date}):
- Applications submitted: ${applicationsSubmitted} (goal: ${goals?.dailyApplications ?? 5})
- Connections requested: ${connectionsRequested}
- Interview practice: ${interviewPracticed ? 'Yes' : 'No'}
- Mood: ${mood}/5 (${moodLabels[mood] ?? 'unknown'})
- Wins today: ${wins.length > 0 ? wins.join(', ') : 'none listed'}
- Blockers: ${blockers || 'none listed'}

Week so far: ${weekAppsTotal} applications (goal: ${goals?.weeklyApplications ?? 25})
Current streak: ${newStreak} day${newStreak !== 1 ? 's' : ''}

Return JSON with:
- message: 2-4 sentence personalized coaching message (direct, specific, no fluff)
- tone: one of "celebrating" | "encouraging" | "challenging" | "supportive" based on mood and progress
- action_for_tomorrow: one concrete, specific action for tomorrow (1-2 sentences)`;

      const aiResult = await aiClient.completeJSON(systemPrompt, userPrompt, coachingSchema, {
        model: 'balanced',
        maxTokens: 512,
      });

      const newCheckin: DailyCheckIn = {
        id: generateId(),
        date,
        applicationsSubmitted,
        connectionsRequested,
        interviewPracticed,
        mood,
        wins,
        blockers,
        notes,
        aiCoachingMessage: aiResult.message,
        aiTone: aiResult.tone,
        aiActionForTomorrow: aiResult.action_for_tomorrow,
        createdAt: new Date().toISOString(),
      };

      const updatedCheckins = pruneOldCheckins([...filtered, newCheckin]);
      await storage.putJSON(checkinsKey(userId), updatedCheckins);

      logger.info({ userId, date, streak: newStreak }, 'Check-in saved');

      return successResponse({
        checkin: newCheckin,
        streak: newStreak,
        coaching: {
          message: aiResult.message,
          tone: aiResult.tone,
          actionForTomorrow: aiResult.action_for_tomorrow,
        },
      });
    }

    // ── weekly-review ──────────────────────────────────────────────────────────
    if (parsed.data.action === 'weekly-review') {
      const [goals, rawCheckins, rawWeekly, profile] = await Promise.all([
        storage.getJSON<AccountabilityGoals>(goalsKey(userId)),
        storage.getJSON<DailyCheckIn[]>(checkinsKey(userId)),
        storage.getJSON<WeeklyReview[]>(weeklyKey(userId)),
        storage.getJSON<Profile>(`users/${userId}/profile.json`),
      ]);

      const checkins = pruneOldCheckins(Array.isArray(rawCheckins) ? rawCheckins : []);
      const weeklyList = pruneOldWeekly(Array.isArray(rawWeekly) ? rawWeekly : []);

      const weekOf = getWeekStart();
      const weekEnd = new Date(weekOf);
      weekEnd.setDate(weekEnd.getDate() + 7);
      const weekCheckins = checkins.filter(
        (c) => c.date >= weekOf && c.date < isoDate(weekEnd)
      );

      const totalApps = weekCheckins.reduce((s, c) => s + c.applicationsSubmitted, 0);
      const totalConns = weekCheckins.reduce((s, c) => s + c.connectionsRequested, 0);
      const avgMood =
        weekCheckins.length > 0
          ? weekCheckins.reduce((s, c) => s + c.mood, 0) / weekCheckins.length
          : 0;
      const streak = calculateStreak(checkins);
      const daysCheckedIn = weekCheckins.length;
      const goalsMet = goals ? totalApps >= goals.weeklyApplications : false;

      const moodDescriptions = weekCheckins.map(
        (c) => `${c.date}: mood=${c.mood}/5, apps=${c.applicationsSubmitted}, wins=${c.wins.join('; ') || 'none'}, blockers=${c.blockers || 'none'}`
      );

      const systemPrompt =
        'You are a high-performance job search coach providing weekly performance reviews. Be direct, analytical, and forward-looking. Identify patterns, celebrate wins, and give actionable strategy for the next week.';

      const userPrompt = `Generate a weekly review for this job seeker.

Person: ${profile?.headline ?? 'Job seeker'}
Search phase: ${goals?.searchPhase ?? 'active-hunt'}
Weekly goals: ${goals?.weeklyApplications ?? 25} apps, ${goals?.weeklyConnections ?? 10} connections, ${goals?.weeklyInterviewPractice ?? 3} practice sessions
${goals?.targetRoles?.length ? `Target roles: ${goals.targetRoles.join(', ')}` : ''}
${goals?.targetCompanies?.length ? `Target companies: ${goals.targetCompanies.join(', ')}` : ''}

Week of ${weekOf}:
- Applications submitted: ${totalApps} / ${goals?.weeklyApplications ?? 25} goal
- Connections requested: ${totalConns} / ${goals?.weeklyConnections ?? 10} goal
- Days checked in: ${daysCheckedIn} / 7
- Average mood: ${avgMood.toFixed(1)} / 5
- Current streak: ${streak} days
- Goals met: ${goalsMet ? 'YES' : 'NO'}

Daily breakdown:
${moodDescriptions.join('\n')}

Return JSON with:
- review: 3-4 paragraph analysis of the week — performance, patterns, what worked, what didn't
- next_week_strategy: specific, actionable strategy for next week (2-3 paragraphs, concrete tactics)
- goal_adjustment: if goals should be revised (increase/decrease), explain why and by how much — or null if current goals are appropriate
- highlights: array of 3-5 specific wins or notable moments from this week`;

      const aiResult = await aiClient.completeJSON(systemPrompt, userPrompt, weeklyAiSchema, {
        model: 'balanced',
        maxTokens: 2048,
      });

      const review: WeeklyReview = {
        id: generateId(),
        weekOf,
        totalApplications: totalApps,
        totalConnections: totalConns,
        responseRate: 0, // updated when response tracking is added
        streakDays: streak,
        goalsMet,
        aiReview: aiResult.review,
        nextWeekStrategy: aiResult.next_week_strategy,
        highlights: aiResult.highlights,
        goalAdjustment: aiResult.goal_adjustment,
        createdAt: new Date().toISOString(),
      };

      // Upsert weekly review for this week
      const existingIdx = weeklyList.findIndex((w) => w.weekOf === weekOf);
      const updatedWeekly =
        existingIdx >= 0
          ? weeklyList.map((w, i) => (i === existingIdx ? review : w))
          : [...weeklyList, review];

      await storage.putJSON(weeklyKey(userId), pruneOldWeekly(updatedWeekly));
      logger.info({ userId, weekOf, goalsMet }, 'Weekly review generated');

      return successResponse({ review });
    }

    return errorResponse('Unknown action', 400, 'UNKNOWN_ACTION');
  } catch (error) {
    logger.error({ error }, 'Accountability POST error');
    return handleError(error);
  }
}
