import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

// GET /api/jobs - List jobs with filtering
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const query = searchParams.get('query') || '';
    const minMatchScore = parseInt(searchParams.get('minMatchScore') || '0');
    const bookmarkedOnly = searchParams.get('bookmarked') === 'true';
    const platforms = searchParams.get('platforms')?.split(',').filter(Boolean) || [];
    const remoteOnly = searchParams.get('remote') === 'true';

    const where = {
      userId: session.user.id,
      isHidden: false,
      ...(query && {
        OR: [
          { title: { contains: query, mode: 'insensitive' as const } },
          { company: { contains: query, mode: 'insensitive' as const } },
          { description: { contains: query, mode: 'insensitive' as const } },
        ],
      }),
      ...(minMatchScore > 0 && { matchScore: { gte: minMatchScore } }),
      ...(bookmarkedOnly && { isBookmarked: true }),
      ...(platforms.length > 0 && { sourcePlatform: { in: platforms } }),
      ...(remoteOnly && { locationType: 'remote' }),
    };

    const [jobs, total] = await Promise.all([
      db.job.findMany({
        where,
        orderBy: [
          { isBookmarked: 'desc' },
          { matchScore: 'desc' },
          { postedAt: 'desc' },
        ],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          application: {
            select: {
              id: true,
              status: true,
              appliedAt: true,
            },
          },
        },
      }),
      db.job.count({ where }),
    ]);

    return NextResponse.json({
      items: jobs,
      total,
      page,
      limit,
      hasMore: page * limit < total,
    });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}

// POST /api/jobs - Manually add a job
const createJobSchema = z.object({
  title: z.string().min(1),
  company: z.string().min(1),
  location: z.string().optional(),
  locationType: z.enum(['remote', 'hybrid', 'onsite']).optional(),
  salaryMin: z.number().optional(),
  salaryMax: z.number().optional(),
  description: z.string().min(1),
  requirements: z.string().optional(),
  sourceUrl: z.string().url(),
  sourcePlatform: z.string().default('manual'),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data = createJobSchema.parse(body);

    const job = await db.job.create({
      data: {
        ...data,
        userId: session.user.id,
      },
    });

    return NextResponse.json(job, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating job:', error);
    return NextResponse.json(
      { error: 'Failed to create job' },
      { status: 500 }
    );
  }
}
