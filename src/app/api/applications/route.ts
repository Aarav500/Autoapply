import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

// GET /api/applications - List applications
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where = {
      userId: session.user.id,
      ...(status && { status }),
    };

    const [applications, total] = await Promise.all([
      db.application.findMany({
        where,
        orderBy: { appliedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          job: {
            select: {
              id: true,
              title: true,
              company: true,
              companyLogo: true,
              location: true,
              locationType: true,
              salaryMin: true,
              salaryMax: true,
              sourcePlatform: true,
            },
          },
          interviews: {
            where: {
              scheduledAt: { gte: new Date() },
            },
            orderBy: { scheduledAt: 'asc' },
            take: 1,
          },
          _count: {
            select: {
              emails: true,
              interviews: true,
            },
          },
        },
      }),
      db.application.count({ where }),
    ]);

    // Get stats
    const stats = await db.application.groupBy({
      by: ['status'],
      where: { userId: session.user.id },
      _count: { status: true },
    });

    const statusCounts = stats.reduce(
      (acc: Record<string, number>, item) => {
        acc[item.status] = item._count.status;
        return acc;
      },
      {} as Record<string, number>
    );

    return NextResponse.json({
      items: applications,
      total,
      page,
      limit,
      hasMore: page * limit < total,
      stats: statusCounts,
    });
  } catch (error) {
    console.error('Error fetching applications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch applications' },
      { status: 500 }
    );
  }
}

// POST /api/applications - Create application
const createApplicationSchema = z.object({
  jobId: z.string(),
  appliedVia: z.enum(['manual', 'auto', 'easy_apply', 'direct']).default('manual'),
  resumeDocId: z.string().optional(),
  coverLetterDocId: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data = createApplicationSchema.parse(body);

    // Verify job exists and belongs to user
    const job = await db.job.findUnique({
      where: { id: data.jobId },
      include: { application: true },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (job.application) {
      return NextResponse.json(
        { error: 'Already applied to this job' },
        { status: 400 }
      );
    }

    const application = await db.application.create({
      data: {
        ...data,
        userId: session.user.id,
        status: 'applied',
      },
      include: {
        job: true,
      },
    });

    // Create log entry
    await db.applicationLog.create({
      data: {
        applicationId: application.id,
        action: 'status_change',
        newValue: 'applied',
        description: `Applied via ${data.appliedVia}`,
      },
    });

    return NextResponse.json(application, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating application:', error);
    return NextResponse.json(
      { error: 'Failed to create application' },
      { status: 500 }
    );
  }
}
