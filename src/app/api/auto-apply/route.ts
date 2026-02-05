import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { addJob, QUEUE_NAMES } from '@/lib/jobs/queues';

// GET /api/auto-apply - Get auto-apply status and stats
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get active rules count
    const activeRulesCount = await db.autoApplyRule.count({
      where: { userId: session.user.id, isEnabled: true },
    });

    // Get auto-apply stats
    const now = new Date();
    const startOfDay = new Date(now.setHours(0, 0, 0, 0));
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [todayApplications, weekApplications, monthApplications, totalApplications] = await Promise.all([
      db.application.count({
        where: {
          userId: session.user.id,
          appliedVia: 'auto',
          appliedAt: { gte: startOfDay },
        },
      }),
      db.application.count({
        where: {
          userId: session.user.id,
          appliedVia: 'auto',
          appliedAt: { gte: startOfWeek },
        },
      }),
      db.application.count({
        where: {
          userId: session.user.id,
          appliedVia: 'auto',
          appliedAt: { gte: startOfMonth },
        },
      }),
      db.application.count({
        where: {
          userId: session.user.id,
          appliedVia: 'auto',
        },
      }),
    ]);

    // Get recent auto-applications
    const recentApplications = await db.application.findMany({
      where: {
        userId: session.user.id,
        appliedVia: 'auto',
      },
      orderBy: { appliedAt: 'desc' },
      take: 10,
      include: {
        job: {
          select: {
            id: true,
            title: true,
            company: true,
            companyLogo: true,
          },
        },
      },
    });

    // Get user profile for auto-apply readiness check
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: {
        profile: {
          include: {
            skills: true,
            experiences: true,
          },
        },
      },
    });

    const profile = user?.profile;
    const isReady = !!(
      user?.name &&
      user?.email &&
      profile?.skills && profile.skills.length > 0 &&
      profile?.experiences && profile.experiences.length > 0
    );

    return NextResponse.json({
      isReady,
      activeRulesCount,
      stats: {
        today: todayApplications,
        week: weekApplications,
        month: monthApplications,
        total: totalApplications,
      },
      recentApplications,
    });
  } catch (error) {
    console.error('Error fetching auto-apply status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch auto-apply status' },
      { status: 500 }
    );
  }
}

// POST /api/auto-apply - Trigger auto-apply for matching jobs
const triggerSchema = z.object({
  ruleId: z.string().optional(),
  jobIds: z.array(z.string()).optional(),
  limit: z.number().optional().default(10),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { ruleId, jobIds, limit } = triggerSchema.parse(body);

    let jobsToApply: { id: string }[] = [];

    if (jobIds && jobIds.length > 0) {
      // Apply to specific jobs (filter out ones already applied to)
      jobsToApply = await db.job.findMany({
        where: {
          id: { in: jobIds },
          // Ensure no application exists for this job
          application: null,
        },
        select: { id: true },
      });
    } else if (ruleId) {
      // Apply based on rule settings
      const rule = await db.autoApplyRule.findUnique({
        where: { id: ruleId, userId },
      });

      if (!rule) {
        return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
      }

      jobsToApply = await db.job.findMany({
        where: {
          isHidden: false,
          matchScore: { gte: rule.minMatchScore },
          ...(rule.excludeCompanies.length > 0 && { company: { notIn: rule.excludeCompanies } }),
          ...(rule.excludeLocations.length > 0 && { location: { notIn: rule.excludeLocations } }),
          ...(rule.includeCompanies.length > 0 && { company: { in: rule.includeCompanies } }),
          ...(rule.preferRemote && { locationType: 'remote' }),
          application: null,
        },
        select: { id: true },
        take: limit,
        orderBy: { matchScore: 'desc' },
      });
    } else {
      // Apply to top matching jobs
      jobsToApply = await db.job.findMany({
        where: {
          isHidden: false,
          matchScore: { gte: 70 },
          application: null,
        },
        select: { id: true },
        take: limit,
        orderBy: { matchScore: 'desc' },
      });
    }

    // Queue auto-apply jobs
    const queuedJobs = await Promise.all(
      jobsToApply.map((job) =>
        addJob(QUEUE_NAMES.JOB_APPLY, {
          userId,
          jobId: job.id,
          isAutoApply: true,
        })
      )
    );

    return NextResponse.json({
      success: true,
      queued: queuedJobs.length,
      jobIds: jobsToApply.map((j) => j.id),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error triggering auto-apply:', error);
    return NextResponse.json(
      { error: 'Failed to trigger auto-apply' },
      { status: 500 }
    );
  }
}
