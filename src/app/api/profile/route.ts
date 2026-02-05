import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import type { ApiResponse, ProfileWithRelations } from '@/types';

// ============================================
// Validation Schemas
// ============================================

const updateProfileSchema = z.object({
  headline: z.string().max(255).optional(),
  summary: z.string().max(5000).optional(),
  location: z.string().max(255).optional(),
  remotePreference: z.enum(['remote', 'hybrid', 'onsite', 'any']).optional(),
  willingToRelocate: z.boolean().optional(),
  availableFrom: z.string().datetime().optional().nullable(),
  noticePeriod: z.number().int().min(0).max(365).optional().nullable(),
  salaryMin: z.number().int().min(0).optional().nullable(),
  salaryMax: z.number().int().min(0).optional().nullable(),
  salaryCurrency: z.string().length(3).optional(),
  yearsOfExperience: z.number().min(0).max(50).optional().nullable(),
  githubUrl: z.string().url().optional().nullable(),
  githubUsername: z.string().max(100).optional().nullable(),
  linkedinUrl: z.string().url().optional().nullable(),
  portfolioUrl: z.string().url().optional().nullable(),
  personalWebsite: z.string().url().optional().nullable(),
  twitterUrl: z.string().url().optional().nullable(),
});

// ============================================
// Helper Functions
// ============================================

/**
 * Calculate profile completion score based on filled fields
 */
function calculateCompletionScore(profile: ProfileWithRelations): number {
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
    skills: 15, // At least 5 skills
    experiences: 15, // At least 1 experience
    education: 10, // At least 1 education
  };

  let score = 0;
  const maxScore = Object.values(weights).reduce((a, b) => a + b, 0);

  if (profile.headline) score += weights.headline;
  if (profile.summary && profile.summary.length >= 100) score += weights.summary;
  if (profile.location) score += weights.location;
  if (profile.remotePreference) score += weights.remotePreference;
  if (profile.salaryMin) score += weights.salaryMin;
  if (profile.salaryMax) score += weights.salaryMax;
  if (profile.yearsOfExperience !== null && profile.yearsOfExperience !== undefined) {
    score += weights.yearsOfExperience;
  }
  if (profile.linkedinUrl) score += weights.linkedinUrl;
  if (profile.githubUrl) score += weights.githubUrl;

  // Skills scoring (0-15 points based on count)
  const skillCount = profile.skills?.length || 0;
  score += Math.min(skillCount / 5, 1) * weights.skills;

  // Experience scoring
  const expCount = profile.experiences?.length || 0;
  score += Math.min(expCount, 1) * weights.experiences;

  // Education scoring
  const eduCount = profile.education?.length || 0;
  score += Math.min(eduCount, 1) * weights.education;

  return Math.round((score / maxScore) * 100);
}

/**
 * Format API response
 */
function formatResponse<T>(data: T, message?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
  };
}

/**
 * Format error response
 */
function formatError(error: string, status: number = 400): NextResponse {
  return NextResponse.json(
    { success: false, error } as ApiResponse<never>,
    { status }
  );
}

// ============================================
// GET /api/profile - Get user profile
// ============================================

export async function GET(): Promise<NextResponse> {
  try {
    const session = await requireAuth();
    const userId = session.user?.id;
    if (!userId) {
      return formatError('User not found', 401);
    }

    const profile = await db.profile.findUnique({
      where: { userId },
      include: {
        skills: {
          orderBy: [
            { isHighlight: 'desc' },
            { proficiency: 'desc' },
            { name: 'asc' },
          ],
        },
        experiences: {
          orderBy: [
            { isCurrent: 'desc' },
            { startDate: 'desc' },
          ],
        },
        education: {
          orderBy: [
            { isCurrent: 'desc' },
            { startDate: 'desc' },
          ],
        },
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
            phone: true,
            timezone: true,
          },
        },
      },
    });

    if (!profile) {
      // Create profile if it doesn't exist
      const newProfile = await db.profile.create({
        data: { userId },
        include: {
          skills: true,
          experiences: true,
          education: true,
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              image: true,
              phone: true,
              timezone: true,
            },
          },
        },
      });

      return NextResponse.json(
        formatResponse({
          ...newProfile,
          completionScore: 0,
        })
      );
    }

    // Calculate and update completion score
    const completionScore = calculateCompletionScore(profile as ProfileWithRelations);

    if (profile.completionScore !== completionScore) {
      await db.profile.update({
        where: { id: profile.id },
        data: { completionScore },
      });
    }

    return NextResponse.json(
      formatResponse({
        ...profile,
        completionScore,
      })
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return formatError('Unauthorized', 401);
    }
    console.error('GET /api/profile error:', error);
    return formatError('Failed to fetch profile', 500);
  }
}

// ============================================
// PUT /api/profile - Update user profile
// ============================================

export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await requireAuth();
    const userId = session.user?.id;
    if (!userId) {
      return formatError('User not found', 401);
    }

    const body = await request.json();
    const validationResult = updateProfileSchema.safeParse(body);

    if (!validationResult.success) {
      return formatError(
        `Validation error: ${validationResult.error.errors.map(e => e.message).join(', ')}`
      );
    }

    const updateData = validationResult.data;

    // Process date fields
    const processedData: Record<string, unknown> = { ...updateData };
    if (updateData.availableFrom) {
      processedData.availableFrom = new Date(updateData.availableFrom);
    }

    // Validate salary range
    if (updateData.salaryMin && updateData.salaryMax && updateData.salaryMin > updateData.salaryMax) {
      return formatError('Minimum salary cannot be greater than maximum salary');
    }

    // Update or create profile
    const profile = await db.profile.upsert({
      where: { userId },
      update: processedData,
      create: {
        userId,
        ...processedData,
      },
      include: {
        skills: {
          orderBy: [
            { isHighlight: 'desc' },
            { proficiency: 'desc' },
            { name: 'asc' },
          ],
        },
        experiences: {
          orderBy: [
            { isCurrent: 'desc' },
            { startDate: 'desc' },
          ],
        },
        education: {
          orderBy: [
            { isCurrent: 'desc' },
            { startDate: 'desc' },
          ],
        },
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
            phone: true,
            timezone: true,
          },
        },
      },
    });

    // Calculate and update completion score
    const completionScore = calculateCompletionScore(profile as ProfileWithRelations);

    if (profile.completionScore !== completionScore) {
      await db.profile.update({
        where: { id: profile.id },
        data: { completionScore },
      });
    }

    return NextResponse.json(
      formatResponse(
        { ...profile, completionScore },
        'Profile updated successfully'
      )
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return formatError('Unauthorized', 401);
    }
    console.error('PUT /api/profile error:', error);
    return formatError('Failed to update profile', 500);
  }
}
