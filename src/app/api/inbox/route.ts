import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

// GET /api/inbox - List emails
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const classification = searchParams.get('classification');
    const unreadOnly = searchParams.get('unread') === 'true';
    const needsResponseOnly = searchParams.get('needsResponse') === 'true';

    const where = {
      userId: session.user.id,
      isArchived: false,
      ...(classification && { classification }),
      ...(unreadOnly && { isRead: false }),
      ...(needsResponseOnly && { needsResponse: true }),
    };

    const [emails, total] = await Promise.all([
      db.email.findMany({
        where,
        orderBy: { receivedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          application: {
            select: {
              id: true,
              status: true,
              job: {
                select: {
                  title: true,
                  company: true,
                },
              },
            },
          },
        },
      }),
      db.email.count({ where }),
    ]);

    // Get counts by classification
    const classificationCounts = await db.email.groupBy({
      by: ['classification'],
      where: { userId: session.user.id, isArchived: false },
      _count: { classification: true },
    });

    const counts = classificationCounts.reduce((acc, item) => {
      if (item.classification) {
        acc[item.classification] = item._count.classification;
      }
      return acc;
    }, {} as Record<string, number>);

    // Get unread count
    const unreadCount = await db.email.count({
      where: { userId: session.user.id, isRead: false, isArchived: false },
    });

    return NextResponse.json({
      items: emails,
      total,
      page,
      limit,
      hasMore: page * limit < total,
      counts,
      unreadCount,
    });
  } catch (error) {
    console.error('Error fetching emails:', error);
    return NextResponse.json(
      { error: 'Failed to fetch emails' },
      { status: 500 }
    );
  }
}

// PATCH /api/inbox - Bulk update emails
const bulkUpdateSchema = z.object({
  emailIds: z.array(z.string()),
  action: z.enum(['read', 'unread', 'archive', 'star', 'unstar']),
});

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { emailIds, action } = bulkUpdateSchema.parse(body);

    const updateData: Record<string, boolean> = {};
    switch (action) {
      case 'read':
        updateData.isRead = true;
        break;
      case 'unread':
        updateData.isRead = false;
        break;
      case 'archive':
        updateData.isArchived = true;
        break;
      case 'star':
        updateData.isStarred = true;
        break;
      case 'unstar':
        updateData.isStarred = false;
        break;
    }

    await db.email.updateMany({
      where: {
        id: { in: emailIds },
        userId: session.user.id,
      },
      data: updateData,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error updating emails:', error);
    return NextResponse.json(
      { error: 'Failed to update emails' },
      { status: 500 }
    );
  }
}
