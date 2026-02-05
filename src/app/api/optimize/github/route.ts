import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { addJob, QUEUE_NAMES } from '@/lib/jobs/queues';

// GET /api/optimize/github - Get GitHub analysis
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
          platform: 'github',
        },
      },
    });

    if (!analysis) {
      return NextResponse.json({
        analyzed: false,
        message: 'No GitHub analysis found. Trigger an analysis first.',
      });
    }

    return NextResponse.json({
      analyzed: true,
      ...analysis,
    });
  } catch (error) {
    console.error('Error fetching GitHub analysis:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analysis' },
      { status: 500 }
    );
  }
}

// POST /api/optimize/github - Trigger GitHub analysis
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { username } = body;

    // Get profile to check for existing username
    const profile = await db.profile.findUnique({
      where: { userId: session.user.id },
    });

    const githubUsername = username || profile?.githubUsername;

    if (!githubUsername) {
      return NextResponse.json(
        { error: 'GitHub username required' },
        { status: 400 }
      );
    }

    // Update profile with username if provided
    if (username && username !== profile?.githubUsername) {
      await db.profile.update({
        where: { userId: session.user.id },
        data: {
          githubUsername: username,
          githubUrl: `https://github.com/${username}`,
        },
      });
    }

    // Queue analysis job
    const job = await addJob(QUEUE_NAMES.PLATFORM_GITHUB, {
      userId: session.user.id,
      username: githubUsername,
    });

    return NextResponse.json({
      success: true,
      message: 'GitHub analysis started',
      jobId: job.id,
    });
  } catch (error) {
    console.error('Error starting GitHub analysis:', error);
    return NextResponse.json(
      { error: 'Failed to start analysis' },
      { status: 500 }
    );
  }
}

// PATCH /api/optimize/github - Complete a task
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
          platform: 'github',
        },
      },
    });

    if (!analysis) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }

    // Add task to completed tasks
    const completedTasks = [...(analysis.completedTasks || []), taskId];

    await db.platformAnalysis.update({
      where: {
        userId_platform: {
          userId: session.user.id,
          platform: 'github',
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
