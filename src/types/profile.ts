/**
 * Profile type definitions and Zod schemas
 */

import { z } from 'zod';

// ==================== Enums ====================

export const ProficiencyLevel = z.enum(['beginner', 'intermediate', 'advanced', 'expert']);
export type ProficiencyLevel = z.infer<typeof ProficiencyLevel>;

export const LanguageProficiency = z.enum(['native', 'fluent', 'conversational', 'basic']);
export type LanguageProficiency = z.infer<typeof LanguageProficiency>;

export const RemotePreference = z.enum(['remote', 'hybrid', 'onsite', 'any']);
export type RemotePreference = z.infer<typeof RemotePreference>;

// ==================== Nested Types ====================

export const SkillSchema = z.object({
  name: z.string().min(1),
  proficiency: ProficiencyLevel,
  years: z.number().min(0).optional(),
});
export type Skill = z.infer<typeof SkillSchema>;

export const ExperienceSchema = z.object({
  id: z.string(),
  company: z.string().min(1),
  role: z.string().min(1),
  startDate: z.string(), // ISO date string
  endDate: z.string().nullable(),
  current: z.boolean(),
  description: z.string().optional(),
  bullets: z.array(z.string()).default([]),
  technologies: z.array(z.string()).default([]),
});
export type Experience = z.infer<typeof ExperienceSchema>;

export const EducationSchema = z.object({
  id: z.string(),
  institution: z.string().min(1),
  degree: z.string().min(1),
  field: z.string().optional(),
  startDate: z.string(), // ISO date string
  endDate: z.string().nullable(),
  gpa: z.number().min(0).max(4).nullable().optional(),
});
export type Education = z.infer<typeof EducationSchema>;

export const CertificationSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  issuer: z.string().min(1),
  date: z.string(), // ISO date string
  url: z.string().url().optional(),
});
export type Certification = z.infer<typeof CertificationSchema>;

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  technologies: z.array(z.string()).default([]),
  url: z.string().url().optional(),
  githubUrl: z.string().url().optional(),
});
export type Project = z.infer<typeof ProjectSchema>;

export const LanguageSchema = z.object({
  language: z.string().min(1),
  proficiency: LanguageProficiency,
});
export type Language = z.infer<typeof LanguageSchema>;

export const SocialLinkSchema = z.object({
  platform: z.string().min(1), // e.g., "LinkedIn", "GitHub", "Twitter"
  url: z.string().url(),
});
export type SocialLink = z.infer<typeof SocialLinkSchema>;

export const PreferencesSchema = z.object({
  targetRoles: z.array(z.string()).default([]),
  targetCompanies: z.array(z.string()).default([]),
  salaryMin: z.number().min(0).nullable().optional(),
  salaryMax: z.number().min(0).nullable().optional(),
  locations: z.array(z.string()).default([]),
  remotePreference: RemotePreference.optional(),
  industries: z.array(z.string()).default([]),
  dealBreakers: z.array(z.string()).default([]),
});
export type Preferences = z.infer<typeof PreferencesSchema>;

const DEFAULT_PREFERENCES: Preferences = {
  targetRoles: [],
  targetCompanies: [],
  locations: [],
  industries: [],
  dealBreakers: [],
};

// ==================== Main Profile Schema ====================

export const ProfileSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().min(1),
  phone: z.string().optional(),
  location: z.string().optional(),
  photoUrl: z.string().url().optional(),
  summary: z.string().optional(),
  headline: z.string().optional(),
  skills: z.array(SkillSchema).default([]),
  experience: z.array(ExperienceSchema).default([]),
  education: z.array(EducationSchema).default([]),
  certifications: z.array(CertificationSchema).default([]),
  projects: z.array(ProjectSchema).default([]),
  languages: z.array(LanguageSchema).default([]),
  socialLinks: z.array(SocialLinkSchema).default([]),
  preferences: PreferencesSchema.default(() => DEFAULT_PREFERENCES),
  completenessScore: z.number().min(0).max(100).default(0),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Profile = z.infer<typeof ProfileSchema>;

// ==================== Update Schemas ====================

export const ProfileUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  photoUrl: z.string().url().optional(),
  summary: z.string().optional(),
  headline: z.string().optional(),
});
export type ProfileUpdate = z.infer<typeof ProfileUpdateSchema>;

export const SkillsUpdateSchema = z.object({
  skills: z.array(SkillSchema),
});
export type SkillsUpdate = z.infer<typeof SkillsUpdateSchema>;

export const ExperienceCreateSchema = ExperienceSchema.omit({ id: true });
export type ExperienceCreate = z.infer<typeof ExperienceCreateSchema>;

export const ExperienceUpdateSchema = ExperienceSchema.omit({ id: true }).partial();
export type ExperienceUpdate = z.infer<typeof ExperienceUpdateSchema>;

export const EducationCreateSchema = EducationSchema.omit({ id: true });
export type EducationCreate = z.infer<typeof EducationCreateSchema>;

export const EducationUpdateSchema = EducationSchema.omit({ id: true }).partial();
export type EducationUpdate = z.infer<typeof EducationUpdateSchema>;

export const CertificationCreateSchema = CertificationSchema.omit({ id: true });
export type CertificationCreate = z.infer<typeof CertificationCreateSchema>;

export const ProjectCreateSchema = ProjectSchema.omit({ id: true });
export type ProjectCreate = z.infer<typeof ProjectCreateSchema>;

export const LanguageCreateSchema = LanguageSchema;
export type LanguageCreate = z.infer<typeof LanguageCreateSchema>;

export const SocialLinkCreateSchema = SocialLinkSchema;
export type SocialLinkCreate = z.infer<typeof SocialLinkCreateSchema>;

export const PreferencesUpdateSchema = PreferencesSchema.partial();
export type PreferencesUpdate = z.infer<typeof PreferencesUpdateSchema>;

// ==================== Completeness Types ====================

export interface CompletenessSection {
  category: string;
  points: number;
  maxPoints: number;
  complete: boolean;
  description: string;
}

export interface CompletenessResult {
  score: number;
  breakdown: CompletenessSection[];
  nextSteps: string[];
}
