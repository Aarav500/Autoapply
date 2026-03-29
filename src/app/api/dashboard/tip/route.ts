import { NextRequest } from 'next/server';
import { authenticateRequest } from '@/lib/api-utils';
import { storage } from '@/lib/storage';
import { aiClient } from '@/lib/ai-client';
import { apiResponse } from '@/lib/api-utils';

type TipCategory = 'application' | 'networking' | 'interview' | 'mindset' | 'strategy';

interface CachedTip {
  tip: string;
  category: TipCategory;
  generatedAt: string;
  date: string; // ISO date string yyyy-mm-dd
}

interface ProfileData {
  headline?: string;
  skills?: Array<{ name: string }>;
}

function inferCategory(tip: string): TipCategory {
  const lower = tip.toLowerCase();
  if (lower.includes('network') || lower.includes('connect') || lower.includes('linkedin') || lower.includes('referral')) return 'networking';
  if (lower.includes('interview') || lower.includes('question') || lower.includes('answer') || lower.includes('practice')) return 'interview';
  if (lower.includes('mindset') || lower.includes('rejection') || lower.includes('confidence') || lower.includes('mental') || lower.includes('burnout')) return 'mindset';
  if (lower.includes('strateg') || lower.includes('target') || lower.includes('prioriti') || lower.includes('research')) return 'strategy';
  return 'application';
}

export async function GET(request: NextRequest) {
  try {
    const userId = await authenticateRequest(request);
    const today = new Date().toISOString().slice(0, 10);

    // Check cache
    const cached = await storage.getJSON<CachedTip>(`users/${userId}/dashboard/tip.json`).catch(() => null);
    if (cached && cached.date === today) {
      return apiResponse(cached);
    }

    // Load data to personalise the tip
    const profile = await storage.getJSON<ProfileData>(`users/${userId}/profile.json`).catch(() => null);

    const appsRaw = await storage.getJSON<unknown>(`users/${userId}/applications/index.json`).catch(() => []);
    const applications: Array<{ appliedAt?: string; createdAt?: string; status?: string }> =
      Array.isArray(appsRaw)
        ? (appsRaw as Array<{ appliedAt?: string; createdAt?: string; status?: string }>)
        : ((appsRaw as { applications?: Array<{ appliedAt?: string; createdAt?: string; status?: string }> })?.applications || []);

    const totalApps = applications.length;
    const applicationsWithResponse = applications.filter(
      (a) => a.status === 'screening' || a.status === 'interview' || a.status === 'offer'
    ).length;
    const responseRate = totalApps > 0 ? Math.round((applicationsWithResponse / totalApps) * 100) : 0;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const recentApps = applications.filter((a) => (a.appliedAt || a.createdAt || '') > thirtyDaysAgo).length;

    const interviewsRaw = await storage.getJSON<unknown>(`users/${userId}/interviews/index.json`).catch(() => []);
    const interviews: Array<{ status?: string; scheduledAt?: string }> =
      Array.isArray(interviewsRaw)
        ? (interviewsRaw as Array<{ status?: string; scheduledAt?: string }>)
        : ((interviewsRaw as { interviews?: Array<{ status?: string; scheduledAt?: string }> })?.interviews || []);

    const upcomingInterviews = interviews.filter(
      (i) => i.status === 'scheduled' && i.scheduledAt && new Date(i.scheduledAt) > new Date()
    );

    const headline = profile?.headline ?? 'job seeker';
    const skills = (profile?.skills ?? []).slice(0, 5).map((s) => s.name).join(', ') || 'not listed';

    let challenges = '';
    if (responseRate < 10 && totalApps > 5) challenges += 'low response rate; ';
    if (recentApps === 0) challenges += 'no recent applications; ';
    if (upcomingInterviews.length > 0) challenges += `${upcomingInterviews.length} upcoming interview(s) to prepare for; `;
    if (challenges === '') challenges = 'maintaining momentum';

    const systemPrompt =
      'You are a world-class job search coach. Generate ONE highly specific, actionable coaching tip for today. Max 2 sentences. Be direct and specific — not generic advice.';

    const userPrompt =
      `User profile: ${headline}. ` +
      `Top skills: ${skills}. ` +
      `Total applications sent: ${totalApps}. ` +
      `Applications in last 30 days: ${recentApps}. ` +
      `Response rate: ${responseRate}%. ` +
      `Current challenges: ${challenges}. ` +
      `Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}. ` +
      `Give one sharp, personalised tip that directly addresses their situation right now.`;

    const tip = await aiClient.complete(systemPrompt, userPrompt, { model: 'fast', maxTokens: 150 });

    const category = inferCategory(tip);
    const result: CachedTip = {
      tip: tip.trim(),
      category,
      generatedAt: new Date().toISOString(),
      date: today,
    };

    await storage.putJSON(`users/${userId}/dashboard/tip.json`, result).catch(() => null);

    return apiResponse(result);
  } catch (error) {
    return apiResponse(null, error as Error, 500);
  }
}

export async function DELETE(request: NextRequest) {
  // Invalidates the cache so the next GET regenerates
  try {
    const userId = await authenticateRequest(request);
    await storage.deleteJSON(`users/${userId}/dashboard/tip.json`).catch(() => null);
    return apiResponse({ invalidated: true });
  } catch (error) {
    return apiResponse(null, error as Error, 500);
  }
}

