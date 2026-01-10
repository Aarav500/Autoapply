import { z } from 'zod';

// ==========================================
// ZOD SCHEMAS FOR PROFILE GRAPH
// ==========================================

// Enums matching Prisma or logical constraints
export const ProficiencyEnum = z.enum(['beginner', 'intermediate', 'advanced', 'expert']);
export const PostVariantTypeEnum = z.enum(['story', 'technical', 'lesson', 'outcome']);
export const LeadStatusEnum = z.enum(['identified', 'contacted', 'replied', 'closed']);
export const ActivityTypeEnum = z.enum(['project', 'volunteering', 'club', 'research', 'work', 'other']);

// 1. Education Schema
export const EducationSchema = z.object({
    id: z.string().optional(),
    school: z.string().min(1, "School name is required"),
    degree: z.string().min(1, "Degree is required"),
    major: z.string().min(1, "Major is required"),
    gpa: z.number().min(0).max(4.0).optional(),
    startDate: z.string().or(z.date()), // Allow string ISO for flexibility
    endDate: z.string().or(z.date()).nullable().optional(),
    description: z.string().optional(),
});

// 2. Skill Schema
export const SkillSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1),
    category: z.string().optional(),
});

// 3. User Skill Schema (Skill + Proficiency)
export const UserSkillSchema = z.object({
    id: z.string().optional(),
    skillId: z.string().optional(), // Optional if embedding raw skill data
    skillName: z.string(), // Helper for UI/Exports
    proficiency: ProficiencyEnum,
    verified: z.boolean().default(false),
});

// 4. Activity Schema (Detailed)
export const ActivitySchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1),
    role: z.string().min(1),
    organization: z.string().min(1),
    startDate: z.string().or(z.date()),
    endDate: z.string().or(z.date()).nullable().optional(),
    isCurrent: z.boolean().default(false),
    description: z.string(),
    type: ActivityTypeEnum.optional(),
    skills: z.array(z.string()).optional(), // List of skill IDs or names
});

// 5. Post Variant Schema
export const PostVariantSchema = z.object({
    id: z.string().optional(),
    type: PostVariantTypeEnum,
    content: z.string().min(1),
    hookScore: z.number().min(0).max(100).optional(),
    readability: z.number().min(0).max(100).optional(),
    status: z.enum(['draft', 'scheduled', 'published']).default('draft'),
    scheduledFor: z.string().or(z.date()).nullable().optional(),
});

// 6. Lead Schema
export const LeadSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1),
    headline: z.string().optional(),
    company: z.string().optional(),
    source: z.string(),
    profileUrl: z.string().url().optional().or(z.literal('')),
    status: LeadStatusEnum,
    matchScore: z.number().min(0).max(1).optional(),
});

// 7. Full Profile Graph (Source of Truth)
export const ProfileGraphSchema = z.object({
    userId: z.string(),
    fullName: z.string(),
    email: z.string().email(),

    // Graph Edges
    education: z.array(EducationSchema),
    workExperience: z.array(ActivitySchema), // Mapped from Activities where type=work
    projects: z.array(ActivitySchema),       // Mapped from Activities where type=project
    skills: z.array(UserSkillSchema),

    // Automation Data
    leads: z.array(LeadSchema).optional(),
    generatedPosts: z.array(PostVariantSchema).optional(),
});

// Type inference
export type ProfileGraph = z.infer<typeof ProfileGraphSchema>;
export type ValidatedEducation = z.infer<typeof EducationSchema>;
export type ValidatedSkill = z.infer<typeof UserSkillSchema>;
export type ValidatedPost = z.infer<typeof PostVariantSchema>;
