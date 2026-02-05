import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { addJob, QUEUE_NAMES } from '@/lib/jobs/queues';

// GET /api/interviews - List interviews
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const upcoming = searchParams.get('upcoming') === 'true';
    const status = searchParams.get('status');

    const now = new Date();

    const where = {
      userId: session.user.id,
      ...(upcoming && { scheduledAt: { gte: now } }),
      ...(status && { status }),
    };

    const interviews = await db.interview.findMany({
      where,
      orderBy: { scheduledAt: 'asc' },
      include: {
        application: {
          include: {
            job: {
              select: {
                id: true,
                title: true,
                company: true,
                companyLogo: true,
                location: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ items: interviews });
  } catch (error) {
    console.error('Error fetching interviews:', error);
    return NextResponse.json(
      { error: 'Failed to fetch interviews' },
      { status: 500 }
    );
  }
}

// POST /api/interviews - Create interview
const createInterviewSchema = z.object({
  applicationId: z.string(),
  type: z.enum(['phone_screen', 'video', 'technical', 'behavioral', 'onsite', 'panel', 'final']),
  round: z.number().optional().default(1),
  title: z.string().optional(),
  scheduledAt: z.string().datetime().optional(),
  duration: z.number().optional(),
  location: z.string().optional(),
  meetingLink: z.string().url().optional(),
  platform: z.string().optional(),
  interviewers: z.array(z.object({
    name: z.string(),
    title: z.string().optional(),
    email: z.string().email().optional(),
  })).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data = createInterviewSchema.parse(body);

    // Verify application belongs to user
    const application = await db.application.findUnique({
      where: { id: data.applicationId },
    });

    if (!application || application.userId !== session.user.id) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const interview = await db.interview.create({
      data: {
        userId: session.user.id,
        applicationId: data.applicationId,
        type: data.type,
        round: data.round,
        title: data.title,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
        duration: data.duration,
        location: data.location,
        meetingLink: data.meetingLink,
        platform: data.platform,
        interviewers: data.interviewers,
        status: 'pending',
      },
      include: {
        application: {
          include: {
            job: true,
          },
        },
      },
    });

    // Queue prep materials generation
    await addJob(QUEUE_NAMES.INTERVIEW_PREP, {
      interviewId: interview.id,
    });

    return NextResponse.json(interview, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating interview:', error);
    return NextResponse.json(
      { error: 'Failed to create interview' },
      { status: 500 }
    );
  }
}
