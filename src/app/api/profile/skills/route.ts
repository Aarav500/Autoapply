import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import type { ApiResponse } from '@/types';
import type { Skill } from '@prisma/client';

// ============================================
// Validation Schemas
// ============================================

const skillCategoryEnum = z.enum(['technical', 'soft', 'language', 'tool', 'framework']);
const proficiencyEnum = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]);

const createSkillSchema = z.object({
  name: z.string().min(1).max(100).transform(s => s.trim()),
  category: skillCategoryEnum.optional(),
  proficiency: proficiencyEnum.optional(),
  yearsOfExp: z.number().min(0).max(50).optional().nullable(),
  isHighlight: z.boolean().optional().default(false),
});

const createBulkSkillsSchema = z.object({
  skills: z.array(createSkillSchema).min(1).max(50),
});

const updateSkillSchema = createSkillSchema.partial().extend({
  id: z.string().cuid(),
});

const deleteSkillSchema = z.object({
  id: z.string().cuid(),
});

const deleteBulkSkillsSchema = z.object({
  ids: z.array(z.string().cuid()).min(1).max(50),
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
// POST /api/profile/skills - Create skill(s)
// ============================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await requireAuth();
    const userId = session.user?.id;
    if (!userId) {
      return formatError('User not found', 401);
    }

    const body = await request.json();

    // Check if bulk create or single create
    const isBulk = 'skills' in body && Array.isArray(body.skills);

    if (isBulk) {
      return handleBulkCreate(userId, body);
    }

    return handleSingleCreate(userId, body);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return formatError('Unauthorized', 401);
    }
    console.error('POST /api/profile/skills error:', error);
    return formatError('Failed to create skill', 500);
  }
}

async function handleSingleCreate(userId: string, body: unknown): Promise<NextResponse> {
  const validationResult = createSkillSchema.safeParse(body);

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

  // Check if skill already exists
  const existingSkill = await db.skill.findUnique({
    where: {
      profileId_name: {
        profileId,
        name: data.name,
      },
    },
  });

  if (existingSkill) {
    return formatError(`Skill "${data.name}" already exists`);
  }

  const skill = await db.skill.create({
    data: {
      profileId,
      name: data.name,
      category: data.category,
      proficiency: data.proficiency,
      yearsOfExp: data.yearsOfExp,
      isHighlight: data.isHighlight || false,
    },
  });

  await updateCompletionScore(profileId);

  return NextResponse.json(
    formatResponse(skill, 'Skill added successfully'),
    { status: 201 }
  );
}

async function handleBulkCreate(userId: string, body: unknown): Promise<NextResponse> {
  const validationResult = createBulkSkillsSchema.safeParse(body);

  if (!validationResult.success) {
    return formatError(
      `Validation error: ${validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`
    );
  }

  const { skills } = validationResult.data;

  // Get or create profile
  let profileId = await getProfileId(userId);
  if (!profileId) {
    const profile = await db.profile.create({
      data: { userId },
    });
    profileId = profile.id;
  }

  // Get existing skills
  const existingSkills = await db.skill.findMany({
    where: {
      profileId,
      name: { in: skills.map(s => s.name) },
    },
    select: { name: true },
  });

  const existingNames = new Set(existingSkills.map(s => s.name.toLowerCase()));
  const newSkills = skills.filter(s => !existingNames.has(s.name.toLowerCase()));

  if (newSkills.length === 0) {
    return formatError('All skills already exist');
  }

  // Create new skills
  const createdSkills = await db.$transaction(
    newSkills.map(skill =>
      db.skill.create({
        data: {
          profileId: profileId!,
          name: skill.name,
          category: skill.category,
          proficiency: skill.proficiency,
          yearsOfExp: skill.yearsOfExp,
          isHighlight: skill.isHighlight || false,
        },
      })
    )
  );

  await updateCompletionScore(profileId);

  const skippedCount = skills.length - newSkills.length;
  const message = skippedCount > 0
    ? `${createdSkills.length} skills added (${skippedCount} already existed)`
    : `${createdSkills.length} skills added successfully`;

  return NextResponse.json(
    formatResponse(
      {
        skills: createdSkills,
        added: createdSkills.length,
        skipped: skippedCount,
      },
      message
    ),
    { status: 201 }
  );
}

// ============================================
// PUT /api/profile/skills - Update skill
// ============================================

export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await requireAuth();
    const userId = session.user?.id;
    if (!userId) {
      return formatError('User not found', 401);
    }

    const body = await request.json();
    const validationResult = updateSkillSchema.safeParse(body);

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

    const existingSkill = await db.skill.findFirst({
      where: {
        id,
        profileId,
      },
    });

    if (!existingSkill) {
      return formatError('Skill not found', 404);
    }

    // Check for name conflict if name is being updated
    if (updateData.name && updateData.name !== existingSkill.name) {
      const conflictingSkill = await db.skill.findUnique({
        where: {
          profileId_name: {
            profileId,
            name: updateData.name,
          },
        },
      });

      if (conflictingSkill) {
        return formatError(`Skill "${updateData.name}" already exists`);
      }
    }

    // Process update data
    const processedData: Partial<Skill> = {};

    if (updateData.name !== undefined) processedData.name = updateData.name;
    if (updateData.category !== undefined) processedData.category = updateData.category;
    if (updateData.proficiency !== undefined) processedData.proficiency = updateData.proficiency;
    if (updateData.yearsOfExp !== undefined) processedData.yearsOfExp = updateData.yearsOfExp;
    if (updateData.isHighlight !== undefined) processedData.isHighlight = updateData.isHighlight;

    const skill = await db.skill.update({
      where: { id },
      data: processedData,
    });

    return NextResponse.json(
      formatResponse(skill, 'Skill updated successfully')
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return formatError('Unauthorized', 401);
    }
    console.error('PUT /api/profile/skills error:', error);
    return formatError('Failed to update skill', 500);
  }
}

// ============================================
// DELETE /api/profile/skills - Delete skill(s)
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
    const idsParam = searchParams.get('ids');

    // Check for bulk delete via query params
    if (idsParam) {
      const ids = idsParam.split(',').map(s => s.trim());
      return handleBulkDelete(userId, ids);
    }

    // Single delete via query param
    if (id) {
      return handleSingleDelete(userId, id);
    }

    // Try to get from body
    const body = await request.json().catch(() => ({}));

    // Check if bulk delete via body
    if ('ids' in body && Array.isArray(body.ids)) {
      const validationResult = deleteBulkSkillsSchema.safeParse(body);

      if (!validationResult.success) {
        return formatError('Invalid skill IDs');
      }

      return handleBulkDelete(userId, validationResult.data.ids);
    }

    // Single delete via body
    const validationResult = deleteSkillSchema.safeParse(body);

    if (!validationResult.success) {
      return formatError('Skill ID is required');
    }

    return handleSingleDelete(userId, validationResult.data.id);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return formatError('Unauthorized', 401);
    }
    console.error('DELETE /api/profile/skills error:', error);
    return formatError('Failed to delete skill', 500);
  }
}

async function handleSingleDelete(userId: string, skillId: string): Promise<NextResponse> {
  const profileId = await getProfileId(userId);
  if (!profileId) {
    return formatError('Profile not found', 404);
  }

  const skill = await db.skill.findFirst({
    where: {
      id: skillId,
      profileId,
    },
  });

  if (!skill) {
    return formatError('Skill not found', 404);
  }

  await db.skill.delete({
    where: { id: skillId },
  });

  await updateCompletionScore(profileId);

  return NextResponse.json(
    formatResponse({ id: skillId }, 'Skill deleted successfully')
  );
}

async function handleBulkDelete(userId: string, skillIds: string[]): Promise<NextResponse> {
  const profileId = await getProfileId(userId);
  if (!profileId) {
    return formatError('Profile not found', 404);
  }

  // Verify all skills belong to user
  const skills = await db.skill.findMany({
    where: {
      id: { in: skillIds },
      profileId,
    },
    select: { id: true },
  });

  const foundIds = new Set(skills.map(s => s.id));
  const notFoundIds = skillIds.filter(id => !foundIds.has(id));

  if (skills.length === 0) {
    return formatError('No skills found to delete', 404);
  }

  // Delete found skills
  await db.skill.deleteMany({
    where: {
      id: { in: Array.from(foundIds) },
      profileId,
    },
  });

  await updateCompletionScore(profileId);

  const message = notFoundIds.length > 0
    ? `${skills.length} skills deleted (${notFoundIds.length} not found)`
    : `${skills.length} skills deleted successfully`;

  return NextResponse.json(
    formatResponse(
      {
        deleted: Array.from(foundIds),
        notFound: notFoundIds,
        count: skills.length,
      },
      message
    )
  );
}
