import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import type { ApiResponse } from '@/types';
import type { Experience } from '@prisma/client';

// ============================================
// Validation Schemas
// ============================================

const createExperienceSchema = z.object({
  company: z.string().min(1).max(255),
  title: z.string().min(1).max(255),
  location: z.string().max(255).optional(),
  locationType: z.enum(['remote', 'hybrid', 'onsite']).optional(),
  startDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid start date',
  }),
  endDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid end date',
  }).optional().nullable(),
  isCurrent: z.boolean().optional().default(false),
  description: z.string().max(5000).optional(),
  achievements: z.array(z.string().max(500)).max(10).optional(),
  skills: z.array(z.string().max(100)).max(20).optional(),
  companyLogo: z.string().url().optional().nullable(),
});

const updateExperienceSchema = createExperienceSchema.partial().extend({
  id: z.string().cuid(),
});

const deleteExperienceSchema = z.object({
  id: z.string().cuid(),
});

// ============================================
// Helper Functions
// ============================================

function formatResponse<T>(data: T, message?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
  };
}

function formatError(error: string, status: number = 400): NextResponse {
  return NextResponse.json(
    { success: false, error } as ApiResponse<never>,
    { status }
  );
}

async function getProfileId(userId: string): Promise<string | null> {
  const profile = await db.profile.findUnique({
    where: { userId },
    select: { id: true },
  });
  return profile?.id || null;
}

async function updateCompletionScore(profileId: string): Promise<void> {
  const profile = await db.profile.findUnique({
    where: { id: profileId },
    include: {
      skills: true,
      experiences: true,
      education: true,
    },
  });

  if (!profile) return;

  // Simple completion score calculation for experiences
  const hasExperience = profile.experiences.length > 0;
  const baseScore = profile.completionScore || 0;

  // Add 15 points if has at least one experience, remove if none
  const experienceWeight = 15;
  const currentExperiencePoints = hasExperience ? experienceWeight : 0;

  await db.profile.update({
    where: { id: profileId },
    data: {
      completionScore: Math.min(100, baseScore + (hasExperience ? 0 : -experienceWeight) + currentExperiencePoints),
    },
  });
}

// ============================================
// POST /api/profile/experience - Create experience
// ============================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await requireAuth();
    const userId = session.user?.id;
    if (!userId) {
      return formatError('User not found', 401);
    }

    const body = await request.json();
    const validationResult = createExperienceSchema.safeParse(body);

    if (!validationResult.success) {
      return formatError(
        `Validation error: ${validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`
      );
    }

    const data = validationResult.data;

    // Get or create profile
    let profileId = await getProfileId(userId);
    if (!profileId) {
      const profile = await db.profile.create({
        data: { userId },
      });
      profileId = profile.id;
    }

    // Validate date logic
    const startDate = new Date(data.startDate);
    const endDate = data.endDate ? new Date(data.endDate) : null;

    if (endDate && endDate < startDate) {
      return formatError('End date cannot be before start date');
    }

    if (data.isCurrent && endDate) {
      return formatError('Current position cannot have an end date');
    }

    // If this is marked as current, unmark other current experiences
    if (data.isCurrent) {
      await db.experience.updateMany({
        where: {
          profileId,
          isCurrent: true,
        },
        data: {
          isCurrent: false,
          endDate: new Date(),
        },
      });
    }

    const experience = await db.experience.create({
      data: {
        profileId,
        company: data.company,
        companyLogo: data.companyLogo,
        title: data.title,
        location: data.location,
        locationType: data.locationType,
        startDate,
        endDate,
        isCurrent: data.isCurrent || false,
        description: data.description,
        achievements: data.achievements || [],
        skills: data.skills || [],
      },
    });

    await updateCompletionScore(profileId);

    return NextResponse.json(
      formatResponse(experience, 'Experience added successfully'),
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return formatError('Unauthorized', 401);
    }
    console.error('POST /api/profile/experience error:', error);
    return formatError('Failed to create experience', 500);
  }
}

// ============================================
// PUT /api/profile/experience - Update experience
// ============================================

export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await requireAuth();
    const userId = session.user?.id;
    if (!userId) {
      return formatError('User not found', 401);
    }

    const body = await request.json();
    const validationResult = updateExperienceSchema.safeParse(body);

    if (!validationResult.success) {
      return formatError(
        `Validation error: ${validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`
      );
    }

    const { id, ...updateData } = validationResult.data;

    // Verify ownership
    const profileId = await getProfileId(userId);
    if (!profileId) {
      return formatError('Profile not found', 404);
    }

    const existingExperience = await db.experience.findFirst({
      where: {
        id,
        profileId,
      },
    });

    if (!existingExperience) {
      return formatError('Experience not found', 404);
    }

    // Process dates - build update object explicitly
    const processedData: Record<string, unknown> = {};

    if (updateData.company !== undefined) processedData.company = updateData.company;
    if (updateData.companyLogo !== undefined) processedData.companyLogo = updateData.companyLogo;
    if (updateData.title !== undefined) processedData.title = updateData.title;
    if (updateData.location !== undefined) processedData.location = updateData.location;
    if (updateData.locationType !== undefined) processedData.locationType = updateData.locationType;
    if (updateData.description !== undefined) processedData.description = updateData.description;
    if (updateData.achievements !== undefined) processedData.achievements = updateData.achievements;
    if (updateData.skills !== undefined) processedData.skills = updateData.skills;
    if (updateData.isCurrent !== undefined) processedData.isCurrent = updateData.isCurrent;

    if (updateData.startDate) {
      processedData.startDate = new Date(updateData.startDate);
    }
    if (updateData.endDate !== undefined) {
      processedData.endDate = updateData.endDate ? new Date(updateData.endDate) : null;
    }

    // Validate date logic
    const startDate = processedData.startDate || existingExperience.startDate;
    const endDate = processedData.endDate !== undefined ? processedData.endDate : existingExperience.endDate;
    const isCurrent = processedData.isCurrent !== undefined ? processedData.isCurrent : existingExperience.isCurrent;

    if (endDate && endDate < startDate) {
      return formatError('End date cannot be before start date');
    }

    if (isCurrent && endDate) {
      return formatError('Current position cannot have an end date');
    }

    // If marking as current, unmark others
    if (updateData.isCurrent && !existingExperience.isCurrent) {
      await db.experience.updateMany({
        where: {
          profileId,
          isCurrent: true,
          id: { not: id },
        },
        data: {
          isCurrent: false,
          endDate: new Date(),
        },
      });
    }

    const experience = await db.experience.update({
      where: { id },
      data: processedData,
    });

    return NextResponse.json(
      formatResponse(experience, 'Experience updated successfully')
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return formatError('Unauthorized', 401);
    }
    console.error('PUT /api/profile/experience error:', error);
    return formatError('Failed to update experience', 500);
  }
}

// ============================================
// DELETE /api/profile/experience - Delete experience
// ============================================

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await requireAuth();
    const userId = session.user?.id;
    if (!userId) {
      return formatError('User not found', 401);
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      // Try to get from body
      const body = await request.json().catch(() => ({}));
      const validationResult = deleteExperienceSchema.safeParse(body);

      if (!validationResult.success) {
        return formatError('Experience ID is required');
      }

      return deleteExperience(userId, validationResult.data.id);
    }

    return deleteExperience(userId, id);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return formatError('Unauthorized', 401);
    }
    console.error('DELETE /api/profile/experience error:', error);
    return formatError('Failed to delete experience', 500);
  }
}

async function deleteExperience(userId: string, experienceId: string): Promise<NextResponse> {
  const profileId = await getProfileId(userId);
  if (!profileId) {
    return formatError('Profile not found', 404);
  }

  const experience = await db.experience.findFirst({
    where: {
      id: experienceId,
      profileId,
    },
  });

  if (!experience) {
    return formatError('Experience not found', 404);
  }

  await db.experience.delete({
    where: { id: experienceId },
  });

  await updateCompletionScore(profileId);

  return NextResponse.json(
    formatResponse({ id: experienceId }, 'Experience deleted successfully')
  );
}
