import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import type { ApiResponse } from '@/types';
import type { Education } from '@prisma/client';

// ============================================
// Validation Schemas
// ============================================

const createEducationSchema = z.object({
  institution: z.string().min(1).max(255),
  degree: z.string().min(1).max(255),
  field: z.string().max(255).optional(),
  startDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid start date',
  }),
  endDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid end date',
  }).optional().nullable(),
  isCurrent: z.boolean().optional().default(false),
  gpa: z.number().min(0).max(5).optional().nullable(),
  gpaScale: z.number().min(1).max(100).optional().default(4.0),
  honors: z.array(z.string().max(255)).max(10).optional(),
  activities: z.array(z.string().max(255)).max(10).optional(),
  logo: z.string().url().optional().nullable(),
});

const updateEducationSchema = createEducationSchema.partial().extend({
  id: z.string().cuid(),
});

const deleteEducationSchema = z.object({
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

  // Recalculate completion score
  const weights = {
    headline: 10,
    summary: 15,
    location: 5,
    remotePreference: 5,
    salaryMin: 5,
    salaryMax: 5,
    yearsOfExperience: 5,
    linkedinUrl: 10,
    githubUrl: 5,
    skills: 15,
    experiences: 15,
    education: 10,
  };

  let score = 0;
  const maxScore = Object.values(weights).reduce((a, b) => a + b, 0);

  if (profile.headline) score += weights.headline;
  if (profile.summary && profile.summary.length >= 100) score += weights.summary;
  if (profile.location) score += weights.location;
  if (profile.remotePreference) score += weights.remotePreference;
  if (profile.salaryMin) score += weights.salaryMin;
  if (profile.salaryMax) score += weights.salaryMax;
  if (profile.yearsOfExperience !== null) score += weights.yearsOfExperience;
  if (profile.linkedinUrl) score += weights.linkedinUrl;
  if (profile.githubUrl) score += weights.githubUrl;

  const skillCount = profile.skills?.length || 0;
  score += Math.min(skillCount / 5, 1) * weights.skills;

  const expCount = profile.experiences?.length || 0;
  score += Math.min(expCount, 1) * weights.experiences;

  const eduCount = profile.education?.length || 0;
  score += Math.min(eduCount, 1) * weights.education;

  const completionScore = Math.round((score / maxScore) * 100);

  await db.profile.update({
    where: { id: profileId },
    data: { completionScore },
  });
}

// ============================================
// POST /api/profile/education - Create education
// ============================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await requireAuth();
    const userId = session.user?.id;
    if (!userId) {
      return formatError('User not found', 401);
    }

    const body = await request.json();
    const validationResult = createEducationSchema.safeParse(body);

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
      return formatError('Current education cannot have an end date');
    }

    // Validate GPA against scale
    if (data.gpa !== null && data.gpa !== undefined && data.gpaScale) {
      if (data.gpa > data.gpaScale) {
        return formatError(`GPA cannot exceed the scale (${data.gpaScale})`);
      }
    }

    const education = await db.education.create({
      data: {
        profileId,
        institution: data.institution,
        logo: data.logo,
        degree: data.degree,
        field: data.field,
        startDate,
        endDate,
        isCurrent: data.isCurrent || false,
        gpa: data.gpa,
        gpaScale: data.gpaScale,
        honors: data.honors || [],
        activities: data.activities || [],
      },
    });

    await updateCompletionScore(profileId);

    return NextResponse.json(
      formatResponse(education, 'Education added successfully'),
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return formatError('Unauthorized', 401);
    }
    console.error('POST /api/profile/education error:', error);
    return formatError('Failed to create education record', 500);
  }
}

// ============================================
// PUT /api/profile/education - Update education
// ============================================

export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await requireAuth();
    const userId = session.user?.id;
    if (!userId) {
      return formatError('User not found', 401);
    }

    const body = await request.json();
    const validationResult = updateEducationSchema.safeParse(body);

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

    const existingEducation = await db.education.findFirst({
      where: {
        id,
        profileId,
      },
    });

    if (!existingEducation) {
      return formatError('Education record not found', 404);
    }

    // Process data
    const processedData: Partial<Education> = {};

    if (updateData.institution !== undefined) processedData.institution = updateData.institution;
    if (updateData.logo !== undefined) processedData.logo = updateData.logo;
    if (updateData.degree !== undefined) processedData.degree = updateData.degree;
    if (updateData.field !== undefined) processedData.field = updateData.field;
    if (updateData.gpa !== undefined) processedData.gpa = updateData.gpa;
    if (updateData.gpaScale !== undefined) processedData.gpaScale = updateData.gpaScale;
    if (updateData.honors !== undefined) processedData.honors = updateData.honors;
    if (updateData.activities !== undefined) processedData.activities = updateData.activities;
    if (updateData.isCurrent !== undefined) processedData.isCurrent = updateData.isCurrent;

    if (updateData.startDate) {
      processedData.startDate = new Date(updateData.startDate);
    }
    if (updateData.endDate !== undefined) {
      processedData.endDate = updateData.endDate ? new Date(updateData.endDate) : null;
    }

    // Validate date logic
    const startDate = processedData.startDate || existingEducation.startDate;
    const endDate = processedData.endDate !== undefined ? processedData.endDate : existingEducation.endDate;
    const isCurrent = processedData.isCurrent !== undefined ? processedData.isCurrent : existingEducation.isCurrent;

    if (endDate && endDate < startDate) {
      return formatError('End date cannot be before start date');
    }

    if (isCurrent && endDate) {
      return formatError('Current education cannot have an end date');
    }

    // Validate GPA against scale
    const gpa = processedData.gpa !== undefined ? processedData.gpa : existingEducation.gpa;
    const gpaScale = processedData.gpaScale !== undefined ? processedData.gpaScale : existingEducation.gpaScale;

    if (gpa !== null && gpa !== undefined && gpaScale !== null && gpaScale !== undefined) {
      if (gpa > gpaScale) {
        return formatError(`GPA cannot exceed the scale (${gpaScale})`);
      }
    }

    const education = await db.education.update({
      where: { id },
      data: processedData,
    });

    return NextResponse.json(
      formatResponse(education, 'Education updated successfully')
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return formatError('Unauthorized', 401);
    }
    console.error('PUT /api/profile/education error:', error);
    return formatError('Failed to update education record', 500);
  }
}

// ============================================
// DELETE /api/profile/education - Delete education
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
      const validationResult = deleteEducationSchema.safeParse(body);

      if (!validationResult.success) {
        return formatError('Education ID is required');
      }

      return deleteEducation(userId, validationResult.data.id);
    }

    return deleteEducation(userId, id);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return formatError('Unauthorized', 401);
    }
    console.error('DELETE /api/profile/education error:', error);
    return formatError('Failed to delete education record', 500);
  }
}

async function deleteEducation(userId: string, educationId: string): Promise<NextResponse> {
  const profileId = await getProfileId(userId);
  if (!profileId) {
    return formatError('Profile not found', 404);
  }

  const education = await db.education.findFirst({
    where: {
      id: educationId,
      profileId,
    },
  });

  if (!education) {
    return formatError('Education record not found', 404);
  }

  await db.education.delete({
    where: { id: educationId },
  });

  await updateCompletionScore(profileId);

  return NextResponse.json(
    formatResponse({ id: educationId }, 'Education deleted successfully')
  );
}
