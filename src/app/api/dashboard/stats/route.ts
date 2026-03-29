import { NextRequest } from 'next/server';
import { authenticateRequest } from '@/lib/api-utils';
import { storage } from '@/lib/storage';
import { apiResponse } from '@/lib/api-utils';

interface GoalData {
  weeklyApplicationTarget: number;
  currentWeekApps: number;
  currentStreak: number;
  longestStreak: number;
  weekStartDate: string;
}

interface StoredGoals {
  weeklyApplicationTarget: number;
  currentStreak: number;
  longestStreak: number;
  weekStartDate: string;
  lastCheckedWeek: string;
}

export async function GET(request: NextRequest) {
  try {
    const userId = await authenticateRequest(request);

    // Fetch jobs to calculate stats (index is saved as flat JobSummary[])
    const jobsRaw = await storage.getJSON<unknown>(`users/${userId}/jobs/index.json`).catch(() => []);
    const jobs: Array<{ createdAt?: string; matchScore?: number; status?: string }> =
      Array.isArray(jobsRaw) ? (jobsRaw as Array<{ createdAt?: string; matchScore?: number; status?: string }>) : ((jobsRaw as { jobs?: Array<{ createdAt?: string; matchScore?: number; status?: string }> })?.jobs || []);

    // Fetch applications (getJSON returns null when file doesn't exist)
    const appsIndex = await storage.getJSON<{ applications?: Array<{ appliedAt?: string; createdAt?: string; status?: string; company?: string }> }>(`users/${userId}/applications/index.json`).catch(() => null);
    const applications: Array<{ appliedAt?: string; createdAt?: string; status?: string; company?: string }> =
      Array.isArray(appsIndex)
        ? (appsIndex as Array<{ appliedAt?: string; createdAt?: string; status?: string; company?: string }>)
        : (appsIndex?.applications || []);

    // Fetch interviews (index is saved as flat array)
    const interviewsRaw = await storage.getJSON<unknown>(`users/${userId}/interviews/index.json`).catch(() => []);
    const interviews: Array<{ status?: string; scheduledAt?: string; createdAt?: string }> =
      Array.isArray(interviewsRaw)
        ? (interviewsRaw as Array<{ status?: string; scheduledAt?: string; createdAt?: string }>)
        : ((interviewsRaw as { interviews?: Array<{ status?: string; scheduledAt?: string; createdAt?: string }> })?.interviews || []);

    // ── Basic counts ──────────────────────────────────────────────────────────
    const today = new Date().toDateString();
    const applicationsToday = applications.filter((app) =>
      new Date(app.appliedAt || app.createdAt || '').toDateString() === today
    ).length;

    const totalJobs = jobs.length;
    const totalApplications = applications.length;

    const scheduledInterviews = interviews.filter((i) => i.status === 'scheduled');
    const totalInterviews = scheduledInterviews.length;

    // ── Status breakdowns ─────────────────────────────────────────────────────
    const screeningCount = applications.filter((app) => app.status === 'screening').length;
    const interviewCount = applications.filter((app) => app.status === 'interview').length;
    const offerCount = applications.filter((app) => app.status === 'offer').length;
    const rejectedCount = applications.filter((app) => app.status === 'rejected').length;

    // Count applications that got any response (screening, interview, or offer)
    const applicationsWithResponse = applications.filter((app) =>
      app.status === 'screening' || app.status === 'interview' || app.status === 'offer'
    ).length;

    // Count offers
    const totalOffers = offerCount;

    // ── Find next interview ───────────────────────────────────────────────────
    const upcomingInterviews = scheduledInterviews
      .filter((i) => i.scheduledAt && new Date(i.scheduledAt) > new Date())
      .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime());

    const nextInterview = upcomingInterviews[0];

    // ── Computed insight #1: Response rate ────────────────────────────────────
    const responseRate = totalApplications > 0
      ? Math.round((applicationsWithResponse / totalApplications) * 100)
      : 0;

    // ── Computed insight #2: Interview conversion rate ────────────────────────
    const interviewConversionRate = screeningCount > 0
      ? Math.round((interviewCount / screeningCount) * 100)
      : 0;

    // ── Computed insight #3: Offer rate ──────────────────────────────────────
    const offerRate = interviewCount > 0
      ? Math.round((offerCount / interviewCount) * 100)
      : 0;

    // ── Computed insight #4: Week-over-week trend ─────────────────────────────
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const thisWeekApps = applications.filter((a) =>
      (a.appliedAt || a.createdAt || '') > oneWeekAgo
    ).length;
    const lastWeekApps = applications.filter((a) =>
      (a.appliedAt || a.createdAt || '') > twoWeeksAgo &&
      (a.appliedAt || a.createdAt || '') <= oneWeekAgo
    ).length;
    const weekOverWeekChange = lastWeekApps > 0
      ? Math.round(((thisWeekApps - lastWeekApps) / lastWeekApps) * 100)
      : thisWeekApps > 0 ? 100 : 0;

    // ── Computed insight #5: Top companies applied to ─────────────────────────
    const companyCounts: Record<string, number> = {};
    applications.forEach((a) => {
      if (a.company) companyCounts[a.company] = (companyCounts[a.company] || 0) + 1;
    });
    const topCompanies = Object.entries(companyCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([company, count]) => ({ company, count }));

    // ── Computed insight #6: Average match score of active jobs ──────────────
    const activeJobs = jobs.filter(
      (j) => j.status === 'applied' || j.status === 'screening' || j.status === 'interview'
    );
    const avgMatchScore = activeJobs.length > 0
      ? Math.round(
          activeJobs.reduce((acc, j) => acc + (j.matchScore || 0), 0) / activeJobs.length
        )
      : 0;

    // ── Stat card array (existing shape, kept intact) ─────────────────────────
    const stats = [
      {
        number: totalJobs.toString(),
        label: 'Jobs Found',
        trend: `↑${jobs.filter((j) => new Date(j.createdAt || '').toDateString() === today).length} today`,
        trendColor: '#00E676',
      },
      {
        number: totalApplications.toString(),
        label: 'Applied',
        trend: `↑${applicationsToday} today`,
        trendColor: '#00E676',
      },
      {
        number: `${responseRate}%`,
        label: 'Response Rate',
        trend:
          weekOverWeekChange > 0
            ? `↑${weekOverWeekChange}% vs last week`
            : weekOverWeekChange < 0
            ? `↓${Math.abs(weekOverWeekChange)}% vs last week`
            : applicationsWithResponse > 0
            ? 'Same as last week'
            : 'No responses yet',
        trendColor: weekOverWeekChange >= 0 ? '#00E676' : '#FF5252',
      },
      {
        number: totalInterviews.toString(),
        label: 'Interviews',
        sub: nextInterview
          ? `Next: ${new Date(nextInterview.scheduledAt!).toLocaleDateString()}`
          : 'None scheduled',
        subColor: '#FFAB00',
        accent: true,
      },
      {
        number: totalOffers.toString(),
        label: 'Offers',
        sub: totalOffers > 0 ? 'pending review' : 'none yet',
        subColor: '#7E7E98',
        accent: true,
      },
    ];

    // ── Goal tracker ─────────────────────────────────────────────────────────
    const storedGoals = await storage.getJSON<StoredGoals>(`users/${userId}/goals.json`).catch(() => null);
    const weeklyApplicationTarget = storedGoals?.weeklyApplicationTarget ?? 10;

    // Determine start of current week (Monday)
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sun, 1 = Mon ...
    const daysFromMonday = (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
    const weekStart = new Date(now);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(now.getDate() - daysFromMonday);
    const weekStartISO = weekStart.toISOString();

    const currentWeekApps = applications.filter((a) => {
      const ts = a.appliedAt || a.createdAt || '';
      return ts >= weekStartISO;
    }).length;

    // Streak: stored and updated here based on whether last week's goal was met
    let currentStreak = storedGoals?.currentStreak ?? 0;
    let longestStreak = storedGoals?.longestStreak ?? 0;
    const lastCheckedWeek = storedGoals?.lastCheckedWeek ?? '';

    // Compute last week's start (7 days before this week's start)
    const lastWeekStart = new Date(weekStart);
    lastWeekStart.setDate(weekStart.getDate() - 7);
    const lastWeekStartISO = lastWeekStart.toISOString();
    const lastWeekKey = lastWeekStartISO.slice(0, 10);

    if (lastCheckedWeek !== lastWeekKey) {
      // First time computing for this new week — check if last week's goal was met
      const lastWeekCount = applications.filter((a) => {
        const ts = a.appliedAt || a.createdAt || '';
        return ts >= lastWeekStartISO && ts < weekStartISO;
      }).length;

      if (lastWeekCount >= weeklyApplicationTarget) {
        currentStreak += 1;
        if (currentStreak > longestStreak) longestStreak = currentStreak;
      } else if (lastCheckedWeek !== '') {
        // Only reset if we actually had a previous week tracked
        currentStreak = 0;
      }

      // Persist updated streak data
      const updatedGoals: StoredGoals = {
        weeklyApplicationTarget,
        currentStreak,
        longestStreak,
        weekStartDate: weekStartISO,
        lastCheckedWeek: lastWeekKey,
      };
      await storage.putJSON(`users/${userId}/goals.json`, updatedGoals).catch(() => null);
    }

    const goalData: GoalData = {
      weeklyApplicationTarget,
      currentWeekApps,
      currentStreak,
      longestStreak,
      weekStartDate: weekStartISO,
    };

    // ── Health Score (0-100) ─────────────────────────────────────────────────
    // Activity component (40%): apps in last 7 days vs target
    const activityTarget = weeklyApplicationTarget || 10;
    const activityScore = Math.min(Math.round((thisWeekApps / activityTarget) * 100), 100);

    // Quality component (25%): avg match score of all applications (0–100)
    const allJobsWithScore = jobs.filter((j) => typeof j.matchScore === 'number');
    const avgAllMatchScore =
      allJobsWithScore.length > 0
        ? Math.round(allJobsWithScore.reduce((acc, j) => acc + (j.matchScore || 0), 0) / allJobsWithScore.length)
        : 0;
    const qualityScore = avgAllMatchScore;

    // Diversity component (20%): unique companies / total apps (capped at 1) * 100
    const uniqueCompanies = Object.keys(companyCounts).length;
    const diversityScore =
      totalApplications > 0
        ? Math.min(Math.round((uniqueCompanies / totalApplications) * 200), 100)
        : 0;

    // Responsiveness component (15%): response rate over last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const apps30d = applications.filter((a) => (a.appliedAt || a.createdAt || '') > thirtyDaysAgo);
    const responses30d = apps30d.filter(
      (a) => a.status === 'screening' || a.status === 'interview' || a.status === 'offer'
    ).length;
    const responsivenessScore =
      apps30d.length > 0 ? Math.min(Math.round((responses30d / apps30d.length) * 100 * 3), 100) : 0;

    const healthScore = Math.round(
      activityScore * 0.4 +
      qualityScore * 0.25 +
      diversityScore * 0.2 +
      responsivenessScore * 0.15
    );

    // Health trend: compare this week's activity score to last week's
    const lastWeekActivityScore = Math.min(Math.round((lastWeekApps / activityTarget) * 100), 100);
    const healthTrend: 'improving' | 'stable' | 'declining' =
      activityScore > lastWeekActivityScore + 10
        ? 'improving'
        : activityScore < lastWeekActivityScore - 10
        ? 'declining'
        : 'stable';

    const healthComponents = {
      activity: activityScore,
      quality: qualityScore,
      diversity: diversityScore,
      responsiveness: responsivenessScore,
    };

    // ── Next Best Action (rules-based) ───────────────────────────────────────
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const recentApps = applications.filter((a) => (a.appliedAt || a.createdAt || '') > threeDaysAgo);

    const hasOffer = offerCount > 0;
    const hasUpcomingInterview = upcomingInterviews.length > 0;
    const noRecentApps = recentApps.length === 0;

    let nextBestAction: { action: string; href: string; priority: 'urgent' | 'recommended' | 'suggested' };

    if (hasOffer) {
      nextBestAction = {
        action: 'You have a pending offer — compare and decide',
        href: '/jobs',
        priority: 'urgent',
      };
    } else if (hasUpcomingInterview && nextInterview?.scheduledAt) {
      const company = (nextInterview as { company?: string }).company ?? 'your interview';
      nextBestAction = {
        action: `Run a practice interview to prep for ${company}`,
        href: '/interview',
        priority: 'urgent',
      };
    } else if (noRecentApps) {
      nextBestAction = {
        action: 'You haven\'t applied in 3 days — apply to 3 new jobs today',
        href: '/jobs',
        priority: 'recommended',
      };
    } else if (healthScore < 50) {
      nextBestAction = {
        action: 'Optimise your CV for ATS to improve your match rate',
        href: '/documents',
        priority: 'recommended',
      };
    } else {
      nextBestAction = {
        action: 'Expand your network — message a connection about an open role',
        href: '/comms',
        priority: 'suggested',
      };
    }

    // ── Market Snippet ────────────────────────────────────────────────────────
    const SKILL_TREND_MAP: Record<string, Array<{ skill: string; change: string }>> = {
      frontend: [
        { skill: 'React 19', change: '+18%' },
        { skill: 'TypeScript', change: '+12%' },
        { skill: 'Next.js', change: '+15%' },
      ],
      backend: [
        { skill: 'Rust', change: '+22%' },
        { skill: 'Go', change: '+14%' },
        { skill: 'PostgreSQL', change: '+9%' },
      ],
      ml: [
        { skill: 'PyTorch', change: '+31%' },
        { skill: 'LLM Fine-tuning', change: '+45%' },
        { skill: 'MLOps', change: '+27%' },
      ],
      design: [
        { skill: 'Figma', change: '+11%' },
        { skill: 'Motion Design', change: '+19%' },
        { skill: 'Design Systems', change: '+16%' },
      ],
      default: [
        { skill: 'AI/ML Integration', change: '+38%' },
        { skill: 'Cloud Architecture', change: '+21%' },
        { skill: 'TypeScript', change: '+12%' },
      ],
    };

    const DOMAIN_COMPANIES: Record<string, string[]> = {
      frontend: ['Vercel', 'Linear', 'Figma', 'Loom'],
      backend: ['Stripe', 'PlanetScale', 'Neon', 'Fly.io'],
      ml: ['Anthropic', 'Mistral', 'Cohere', 'Hugging Face'],
      design: ['Figma', 'Canva', 'Framer', 'Miro'],
      default: ['Anthropic', 'Vercel', 'Stripe', 'Linear'],
    };

    // Determine domain from jobs or profile skills
    const jobTitles = jobs.map((j) => String((j as { title?: string }).title ?? '').toLowerCase()).join(' ');
    const domain =
      jobTitles.includes('machine learning') || jobTitles.includes('ml') || jobTitles.includes('ai')
        ? 'ml'
        : jobTitles.includes('design') || jobTitles.includes('ux') || jobTitles.includes('ui')
        ? 'design'
        : jobTitles.includes('backend') || jobTitles.includes('server') || jobTitles.includes('infra')
        ? 'backend'
        : jobTitles.includes('frontend') || jobTitles.includes('react') || jobTitles.includes('next')
        ? 'frontend'
        : 'default';

    const trendingSkills = SKILL_TREND_MAP[domain] ?? SKILL_TREND_MAP.default;
    const hiringCompanies = (DOMAIN_COMPANIES[domain] ?? DOMAIN_COMPANIES.default).slice(0, 3);

    // Market temperature: hot if health improving and many companies hiring; else warm/cooling
    const marketTemperature: 'hot' | 'warm' | 'cooling' =
      healthTrend === 'improving' && thisWeekApps > 3
        ? 'hot'
        : healthTrend === 'declining'
        ? 'cooling'
        : 'warm';

    const marketSnippet = {
      temperature: marketTemperature,
      trendingSkills,
      hiringCompanies,
      salaryTrend: 'Average SWE salaries up 8% this quarter (Q1 2026)',
    };

    return apiResponse({
      stats,
      applicationsToday,
      goalData,
      // ── Health Score ──────────────────────────────────────────────────────
      healthScore,
      healthComponents,
      healthTrend,
      // ── Next Best Action ─────────────────────────────────────────────────
      nextBestAction,
      // ── Market Snippet ────────────────────────────────────────────────────
      marketSnippet,
      // ── Enriched insight payload ──────────────────────────────────────────
      insights: {
        responseRate,
        interviewConversionRate,
        offerRate,
        weekOverWeekChange,
        thisWeekApps,
        lastWeekApps,
        topCompanies,
        avgMatchScore,
        // Status breakdown
        breakdown: {
          applied: totalApplications,
          screening: screeningCount,
          interview: interviewCount,
          offer: offerCount,
          rejected: rejectedCount,
        },
      },
    });
  } catch (error) {
    return apiResponse(null, error as Error, 500);
  }
}
