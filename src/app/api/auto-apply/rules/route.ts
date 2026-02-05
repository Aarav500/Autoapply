import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

// GET /api/auto-apply/rules - Get user's auto-apply rule
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // User can only have one rule (userId is @unique)
    const rule = await db.autoApplyRule.findUnique({
      where: { userId: session.user.id },
    });

    return NextResponse.json({ rule });
  } catch (error) {
    console.error('Error fetching auto-apply rule:', error);
    return NextResponse.json(
      { error: 'Failed to fetch auto-apply rule' },
      { status: 500 }
    );
  }
}

// POST /api/auto-apply/rules - Create or update auto-apply rule
const ruleSchema = z.object({
  isEnabled: z.boolean().optional(),
  minMatchScore: z.number().min(0).max(100).optional(),
  requiredSkillsMatch: z.number().min(0).max(100).optional(),
  maxApplicationsPerDay: z.number().min(1).max(100).optional(),
  maxApplicationsPerWeek: z.number().min(1).max(500).optional(),
  excludeCompanies: z.array(z.string()).optional(),
  excludeKeywords: z.array(z.string()).optional(),
  excludeLocations: z.array(z.string()).optional(),
  includeCompanies: z.array(z.string()).optional(),
  preferRemote: z.boolean().optional(),
  applyWindowStart: z.string().optional(),
  applyWindowEnd: z.string().optional(),
  timezone: z.string().optional(),
  enableWeekends: z.boolean().optional(),
  defaultResumeId: z.string().nullable().optional(),
  generateCoverLetter: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data = ruleSchema.parse(body);

    // Upsert - create if doesn't exist, update if it does
    const rule = await db.autoApplyRule.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        ...data,
      },
      update: data,
    });

    return NextResponse.json(rule, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error saving auto-apply rule:', error);
    return NextResponse.json(
      { error: 'Failed to save auto-apply rule' },
      { status: 500 }
    );
  }
}

// PATCH /api/auto-apply/rules - Update auto-apply rule
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data = ruleSchema.parse(body);

    const existingRule = await db.autoApplyRule.findUnique({
      where: { userId: session.user.id },
    });

    if (!existingRule) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    const rule = await db.autoApplyRule.update({
      where: { userId: session.user.id },
      data,
    });

    return NextResponse.json(rule);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error updating auto-apply rule:', error);
    return NextResponse.json(
      { error: 'Failed to update auto-apply rule' },
      { status: 500 }
    );
  }
}

// DELETE /api/auto-apply/rules - Delete auto-apply rule
export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existingRule = await db.autoApplyRule.findUnique({
      where: { userId: session.user.id },
    });

    if (!existingRule) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    await db.autoApplyRule.delete({
      where: { userId: session.user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting auto-apply rule:', error);
    return NextResponse.json(
      { error: 'Failed to delete auto-apply rule' },
      { status: 500 }
    );
  }
}
