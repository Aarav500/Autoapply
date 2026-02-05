import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

// GET /api/notifications/preferences - Get notification preferences
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get or create default preferences
    let preferences = await db.notificationPreference.findUnique({
      where: { userId: session.user.id },
    });

    // Return preferences or defaults
    if (!preferences) {
      // Return defaults without creating
      return NextResponse.json({
        preferences: {
          emailEnabled: true,
          smsEnabled: false,
          whatsappEnabled: false,
          pushEnabled: true,
          newMatches: true,
          statusUpdates: true,
          interviewReminders: true,
          deadlineReminders: true,
          applicationFollowUps: true,
          weeklyDigest: true,
          quietHoursEnabled: false,
          quietHoursStart: '22:00',
          quietHoursEnd: '08:00',
          quietHoursTimezone: null,
        },
      });
    }

    return NextResponse.json({ preferences });
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notification preferences' },
      { status: 500 }
    );
  }
}

// PUT /api/notifications/preferences - Update notification preferences
const updatePreferencesSchema = z.object({
  emailEnabled: z.boolean().optional(),
  smsEnabled: z.boolean().optional(),
  whatsappEnabled: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
  newMatches: z.boolean().optional(),
  statusUpdates: z.boolean().optional(),
  interviewReminders: z.boolean().optional(),
  deadlineReminders: z.boolean().optional(),
  applicationFollowUps: z.boolean().optional(),
  weeklyDigest: z.boolean().optional(),
  quietHoursEnabled: z.boolean().optional(),
  quietHoursStart: z.string().optional(),
  quietHoursEnd: z.string().optional(),
  quietHoursTimezone: z.string().optional(),
});

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data = updatePreferencesSchema.parse(body);

    // Upsert preferences
    const preferences = await db.notificationPreference.upsert({
      where: { userId: session.user.id },
      update: data,
      create: {
        userId: session.user.id,
        ...data,
      },
    });

    return NextResponse.json({ preferences });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error updating notification preferences:', error);
    return NextResponse.json(
      { error: 'Failed to update notification preferences' },
      { status: 500 }
    );
  }
}
