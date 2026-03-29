import { NextRequest } from 'next/server';
import { authenticate, handleError, successResponse } from '@/lib/api-utils';
import { storage } from '@/lib/storage';
import { aiClient } from '@/lib/ai-client';
import { logger } from '@/lib/logger';
import type { Job } from '@/types/job';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface TimingResult {
  bestDay: string;
  bestHour: string;
  confidence: number;
  tip: string;
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);

    // Load jobs index
    const raw = await storage.getJSON<unknown>(`users/${userId}/jobs/index.json`);
    const jobs: Job[] = Array.isArray(raw)
      ? (raw as Job[])
      : ((raw as { jobs?: Job[] } | null)?.jobs ?? []);

    // Filter to jobs that were applied and have meaningful outcome data
    const appliedJobs = jobs.filter((j) => j.appliedAt);

    if (appliedJobs.length < 5) {
      // Not enough data — use AI-generated generic advice
      const advice = await aiClient.complete(
        'You are a career strategist with expertise in job application timing. Provide concise, data-backed advice.',
        `Give optimal job application timing advice. Include: best day of week, best time of day, and one actionable tip. Keep each piece of advice to one sentence.
Respond in JSON: { "bestDay": "string", "bestHour": "string", "tip": "string" }`,
        { model: 'fast', maxTokens: 200 }
      );

      let parsed: { bestDay?: string; bestHour?: string; tip?: string } = {};
      try {
        const jsonMatch = advice.match(/\{[\s\S]*\}/);
        if (jsonMatch) parsed = JSON.parse(jsonMatch[0]) as { bestDay?: string; bestHour?: string; tip?: string };
      } catch {
        // ignore parse error
      }

      const result: TimingResult = {
        bestDay: parsed.bestDay ?? 'Tuesday',
        bestHour: parsed.bestHour ?? '9:00 AM – 10:00 AM',
        confidence: 0,
        tip: parsed.tip ?? 'Apply on Tuesday or Wednesday mornings when recruiters are most active reviewing new submissions.',
      };

      return successResponse(result);
    }

    // Categorize outcomes
    const successStatuses = new Set(['screening', 'interview', 'offer']);
    const failStatuses = new Set(['rejected']);

    // Count success/fail by day and hour
    const daySuccess = new Array(7).fill(0);
    const dayFail = new Array(7).fill(0);
    const dayTotal = new Array(7).fill(0);

    // Hour buckets: 0-23
    const hourSuccess = new Array(24).fill(0);
    const hourFail = new Array(24).fill(0);
    const hourTotal = new Array(24).fill(0);

    for (const job of appliedJobs) {
      const appliedAt = new Date(job.appliedAt as Date);
      const day = appliedAt.getDay();
      const hour = appliedAt.getHours();

      dayTotal[day]++;
      hourTotal[hour]++;

      if (successStatuses.has(job.status)) {
        daySuccess[day]++;
        hourSuccess[hour]++;
      } else if (failStatuses.has(job.status)) {
        dayFail[day]++;
        hourFail[hour]++;
      }
    }

    // Calculate success rate per day (only days with >= 1 application)
    let bestDayIdx = 2; // default Tuesday
    let bestDayRate = -1;
    for (let d = 0; d < 7; d++) {
      if (dayTotal[d] === 0) continue;
      const rate = daySuccess[d] / dayTotal[d];
      if (rate > bestDayRate) {
        bestDayRate = rate;
        bestDayIdx = d;
      }
    }

    // Calculate success rate per hour (aggregate into 3-hour buckets for stability)
    const bucketSize = 3;
    let bestHourBucket = 9; // default 9am
    let bestBucketRate = -1;
    for (let h = 0; h < 24; h += bucketSize) {
      let bucketSuccess = 0;
      let bucketTotal = 0;
      for (let k = h; k < h + bucketSize && k < 24; k++) {
        bucketSuccess += hourSuccess[k];
        bucketTotal += hourTotal[k];
      }
      if (bucketTotal === 0) continue;
      const rate = bucketSuccess / bucketTotal;
      if (rate > bestBucketRate) {
        bestBucketRate = rate;
        bestHourBucket = h;
      }
    }

    const formatHourRange = (h: number): string => {
      const pad = (n: number) => (n === 0 ? '12' : n > 12 ? String(n - 12) : String(n));
      const suffix = (n: number) => (n < 12 ? 'AM' : 'PM');
      const endH = (h + bucketSize) % 24;
      return `${pad(h)}:00 ${suffix(h)} – ${pad(endH)}:00 ${suffix(endH)}`;
    };

    // Confidence: based on number of outcome-tracked jobs / total applied
    const trackedOutcomes = appliedJobs.filter(
      (j) => successStatuses.has(j.status) || failStatuses.has(j.status)
    ).length;
    const confidence = Math.min(100, Math.round((trackedOutcomes / Math.max(appliedJobs.length, 1)) * 100));

    // Build tip via AI using the analyzed data
    const bestDay = DAY_NAMES[bestDayIdx];
    const bestHour = formatHourRange(bestHourBucket);

    const tip = await aiClient.complete(
      'You are a career strategist. Give a single concrete, motivating sentence of advice.',
      `Based on application data: best day is ${bestDay}, best time is ${bestHour}, with ${confidence}% confidence from ${appliedJobs.length} applications. Write one actionable tip about when to apply for jobs.`,
      { model: 'fast', maxTokens: 80 }
    ).catch(() => `Apply on ${bestDay} during ${bestHour} to maximize your chances of getting noticed.`);

    const result: TimingResult = {
      bestDay,
      bestHour,
      confidence,
      tip: tip.trim().split('\n')[0].slice(0, 200),
    };

    logger.info({ userId, bestDay, bestHour, confidence }, 'Timing analysis complete');

    return successResponse(result);
  } catch (error) {
    logger.error({ error }, 'Timing analysis error');
    return handleError(error);
  }
}
