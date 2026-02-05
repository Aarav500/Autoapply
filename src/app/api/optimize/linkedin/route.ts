import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { addJob, QUEUE_NAMES } from '@/lib/jobs/queues';

// GET /api/optimize/linkedin - Get LinkedIn analysis
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const analysis = await db.platformAnalysis.findUnique({
      where: {
        userId_platform: {
          userId: session.user.id,
          platform: 'linkedin',
        },
      },
    });

    if (!analysis) {
      return NextResponse.json({
        analyzed: false,
        message: 'No LinkedIn analysis found. Add your profile data to get started.',
      });
    }

    return NextResponse.json({
      analyzed: true,
      ...analysis,
    });
  } catch (error) {
    console.error('Error fetching LinkedIn analysis:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analysis' },
      { status: 500 }
    );
  }
}

// POST /api/optimize/linkedin - Trigger LinkedIn analysis
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { profileData, linkedinUrl } = body;

    // Update profile with LinkedIn URL if provided
    if (linkedinUrl) {
      await db.profile.update({
        where: { userId: session.user.id },
        data: { linkedinUrl },
      });
    }

    // Queue analysis job
    const job = await addJob(QUEUE_NAMES.PLATFORM_LINKEDIN, {
      userId: session.user.id,
      profileData,
    });

    return NextResponse.json({
      success: true,
      message: 'LinkedIn analysis started',
      jobId: job.id,
    });
  } catch (error) {
    console.error('Error starting LinkedIn analysis:', error);
    return NextResponse.json(
      { error: 'Failed to start analysis' },
      { status: 500 }
    );
  }
}

// PATCH /api/optimize/linkedin - Complete a task
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { taskId } = body;

    if (!taskId) {
      return NextResponse.json({ error: 'Task ID required' }, { status: 400 });
    }

    const analysis = await db.platformAnalysis.findUnique({
      where: {
        userId_platform: {
          userId: session.user.id,
          platform: 'linkedin',
        },
      },
    });

    if (!analysis) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }

    const completedTasks = [...(analysis.completedTasks || []), taskId];

    await db.platformAnalysis.update({
      where: {
        userId_platform: {
          userId: session.user.id,
          platform: 'linkedin',
        },
      },
      data: {
        completedTasks,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error completing task:', error);
    return NextResponse.json(
      { error: 'Failed to complete task' },
      { status: 500 }
    );
  }
}
