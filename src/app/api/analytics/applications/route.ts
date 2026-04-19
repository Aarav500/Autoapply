import { NextRequest } from 'next/server';
import { authenticate, successResponse, handleError } from '@/lib/api-utils';
import { storage } from '@/lib/storage';

interface JobRecord {
  id?: string;
  status?: string;
  appliedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  matchScore?: number;
  title?: string;
  company?: string;
  source?: string;
  platform?: string;
}

interface DailyEntry {
  date: string;
  count: number;
}

interface WeeklyEntry {
  week: string;
  count: number;
  responseRate: number;
}

interface ConversionFunnel {
  applied: number;
  screening: number;
  interview: number;
  offer: number;
  rejected: number;
}

interface AnalyticsResponse {
  dailyApps: DailyEntry[];
  weeklyApps: WeeklyEntry[];
  responseRate: number;
  conversionFunnel: ConversionFunnel;
  bestApplyDay: string;
  bestApplyHour: string;
  avgTimeToResponse: number;
  streak: number;
  longestStreak: number;
  totalApplied: number;
  thisWeekApps: number;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const HOUR_BUCKETS: Array<{ label: string; start: number; end: number }> = [
  { label: '6am-9am',   start: 6,  end: 9  },
  { label: '9am-11am',  start: 9,  end: 11 },
  { label: '11am-1pm',  start: 11, end: 13 },
  { label: '1pm-3pm',   start: 13, end: 15 },
  { label: '3pm-5pm',   start: 15, end: 17 },
  { label: '5pm-8pm',   start: 17, end: 20 },
  { label: '8pm-12am',  start: 20, end: 24 },
];

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function startOfWeekMonday(d: Date): Date {
  const dt = new Date(d);
  const day = dt.getDay();
  const daysFromMonday = day === 0 ? 6 : day - 1;
  dt.setDate(dt.getDate() - daysFromMonday);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await authenticate(request);

    const raw = await storage.getJSON<unknown>(`users/${userId}/jobs/index.json`).catch(() => null);
    const jobs: JobRecord[] = Array.isArray(raw)
      ? (raw as JobRecord[])
      : Array.isArray((raw as { jobs?: JobRecord[] })?.jobs)
      ? ((raw as { jobs: JobRecord[] }).jobs)
      : [];

    // Only consider jobs that have been applied
    const appliedStatuses = new Set(['applied', 'screening', 'interview', 'offer', 'rejected', 'applying']);
    const appliedJobs = jobs.filter(
      (j) => j.appliedAt || j.status === 'applied' || appliedStatuses.has(j.status ?? '')
    );

    const now = new Date();

    // ── Daily apps: last 30 days ────────────────────────────────────────────
    const dailyMap = new Map<string, number>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      dailyMap.set(toDateStr(d), 0);
    }
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    for (const job of appliedJobs) {
      const ts = job.appliedAt || job.createdAt || '';
      if (!ts) continue;
      const d = new Date(ts);
      if (isNaN(d.getTime())) continue;
      if (d < thirtyDaysAgo) continue;
      const key = toDateStr(d);
      if (dailyMap.has(key)) dailyMap.set(key, (dailyMap.get(key) ?? 0) + 1);
    }
    const dailyApps: DailyEntry[] = Array.from(dailyMap.entries()).map(([date, count]) => ({ date, count }));

    // ── Weekly apps: last 12 weeks ──────────────────────────────────────────
    // Build 12-week buckets starting from Monday
    const weekBuckets: Array<{ weekStart: Date; weekEnd: Date; label: string }> = [];
    const baseWeekStart = startOfWeekMonday(now);
    for (let w = 11; w >= 0; w--) {
      const ws = new Date(baseWeekStart);
      ws.setDate(baseWeekStart.getDate() - w * 7);
      const we = new Date(ws);
      we.setDate(ws.getDate() + 7);
      weekBuckets.push({
        weekStart: ws,
        weekEnd: we,
        label: toDateStr(ws),
      });
    }

    const responseStatusSet = new Set(['screening', 'interview', 'offer']);

    const weeklyApps: WeeklyEntry[] = weekBuckets.map(({ weekStart, weekEnd, label }) => {
      const weekJobs = appliedJobs.filter((j) => {
        const ts = j.appliedAt || j.createdAt || '';
        if (!ts) return false;
        const d = new Date(ts);
        if (isNaN(d.getTime())) return false;
        return d >= weekStart && d < weekEnd;
      });
      const responded = weekJobs.filter((j) => responseStatusSet.has(j.status ?? '')).length;
      const responseRate = weekJobs.length > 0 ? Math.round((responded / weekJobs.length) * 100) : 0;
      return { week: label, count: weekJobs.length, responseRate };
    });

    // ── Conversion funnel ──────────────────────────────────────────────────
    const conversionFunnel: ConversionFunnel = {
      applied:    appliedJobs.length,
      screening:  appliedJobs.filter((j) => j.status === 'screening').length,
      interview:  appliedJobs.filter((j) => j.status === 'interview').length,
      offer:      appliedJobs.filter((j) => j.status === 'offer').length,
      rejected:   appliedJobs.filter((j) => j.status === 'rejected').length,
    };

    // ── Overall response rate ──────────────────────────────────────────────
    const responded = appliedJobs.filter((j) => responseStatusSet.has(j.status ?? '')).length;
    const responseRate = appliedJobs.length > 0
      ? Math.round((responded / appliedJobs.length) * 100)
      : 0;

    // ── Best apply day (by response rate per day-of-week) ──────────────────
    const dayStats: Record<number, { total: number; responded: number }> = {};
    for (let i = 0; i < 7; i++) dayStats[i] = { total: 0, responded: 0 };
    for (const job of appliedJobs) {
      const ts = job.appliedAt || job.createdAt || '';
      if (!ts) continue;
      const d = new Date(ts);
      if (isNaN(d.getTime())) continue;
      const dow = d.getDay();
      dayStats[dow].total += 1;
      if (responseStatusSet.has(job.status ?? '')) dayStats[dow].responded += 1;
    }
    let bestDayIdx = 2; // default Tuesday
    let bestDayRate = -1;
    for (let i = 0; i < 7; i++) {
      const { total, responded: r } = dayStats[i];
      if (total > 0) {
        const rate = r / total;
        if (rate > bestDayRate) { bestDayRate = rate; bestDayIdx = i; }
      }
    }
    const bestApplyDay = DAY_NAMES[bestDayIdx];

    // ── Best apply hour (by response rate per bucket) ──────────────────────
    const hourStats: Record<string, { total: number; responded: number }> = {};
    for (const b of HOUR_BUCKETS) hourStats[b.label] = { total: 0, responded: 0 };
    for (const job of appliedJobs) {
      const ts = job.appliedAt || job.createdAt || '';
      if (!ts) continue;
      const d = new Date(ts);
      if (isNaN(d.getTime())) continue;
      const hour = d.getHours();
      const bucket = HOUR_BUCKETS.find((b) => hour >= b.start && hour < b.end);
      if (!bucket) continue;
      hourStats[bucket.label].total += 1;
      if (responseStatusSet.has(job.status ?? '')) hourStats[bucket.label].responded += 1;
    }
    let bestHourLabel = '9am-11am'; // sensible default
    let bestHourRate = -1;
    for (const [label, { total, responded: r }] of Object.entries(hourStats)) {
      if (total > 0) {
        const rate = r / total;
        if (rate > bestHourRate) { bestHourRate = rate; bestHourLabel = label; }
      }
    }
    const bestApplyHour = bestHourLabel;

    // ── Avg time to response (days from appliedAt to updatedAt) ────────────
    const responseTimes: number[] = [];
    for (const job of appliedJobs) {
      if (!responseStatusSet.has(job.status ?? '')) continue;
      const applied = job.appliedAt || job.createdAt || '';
      const updated = job.updatedAt || '';
      if (!applied || !updated) continue;
      const da = new Date(applied);
      const du = new Date(updated);
      if (isNaN(da.getTime()) || isNaN(du.getTime())) continue;
      const diffDays = (du.getTime() - da.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays >= 0) responseTimes.push(diffDays);
    }
    const avgTimeToResponse = responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : 0;

    // ── Streak: consecutive days with at least 1 application ───────────────
    const activeDaySet = new Set<string>();
    for (const job of appliedJobs) {
      const ts = job.appliedAt || job.createdAt || '';
      if (!ts) continue;
      const d = new Date(ts);
      if (!isNaN(d.getTime())) activeDaySet.add(toDateStr(d));
    }

    // Build streak from today going backwards
    let streak = 0;
    const checkDate = new Date(now);
    checkDate.setHours(0, 0, 0, 0);
    while (activeDaySet.has(toDateStr(checkDate))) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    // Longest streak: scan all active days sorted
    const sortedDays = Array.from(activeDaySet).sort();
    let longestStreak = 0;
    let currentRun = 0;
    let prevDay: Date | null = null;
    for (const ds of sortedDays) {
      const d = new Date(ds + 'T00:00:00');
      if (prevDay === null) {
        currentRun = 1;
      } else {
        const diffMs = d.getTime() - prevDay.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        if (Math.round(diffDays) === 1) {
          currentRun++;
        } else {
          if (currentRun > longestStreak) longestStreak = currentRun;
          currentRun = 1;
        }
      }
      prevDay = d;
    }
    if (currentRun > longestStreak) longestStreak = currentRun;

    // ── This week apps (Mon–Sun) ───────────────────────────────────────────
    const weekStart = startOfWeekMonday(now);
    const thisWeekApps = appliedJobs.filter((j) => {
      const ts = j.appliedAt || j.createdAt || '';
      if (!ts) return false;
      const d = new Date(ts);
      return !isNaN(d.getTime()) && d >= weekStart;
    }).length;

    const analytics: AnalyticsResponse = {
      dailyApps,
      weeklyApps,
      responseRate,
      conversionFunnel,
      bestApplyDay,
      bestApplyHour,
      avgTimeToResponse,
      streak,
      longestStreak,
      totalApplied: appliedJobs.length,
      thisWeekApps,
    };

    return successResponse(analytics);
  } catch (error) {
    return handleError(error);
  }
}
