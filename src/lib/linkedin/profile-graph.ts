import { z } from 'zod';

export const LinkedInPositionSchema = z.object({
    title: z.string(),
    company: z.string(),
    location: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    isCurrent: z.boolean().default(false),
    description: z.string().optional(),
    highlights: z.array(z.string()).default([]),
});

export const LinkedInEducationSchema = z.object({
    school: z.string(),
    degree: z.string().optional(),
    field: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    description: z.string().optional(),
});

export const LinkedInProjectSchema = z.object({
    title: z.string(),
    description: z.string().optional(),
    link: z.string().optional(),
    technologies: z.array(z.string()).default([]),
});

export const LinkedInSnapshotSchema = z.object({
    fullName: z.string().optional(),
    headline: z.string().optional(),
    about: z.string().optional(),
    positions: z.array(LinkedInPositionSchema).default([]),
    education: z.array(LinkedInEducationSchema).default([]),
    skills: z.array(z.string()).default([]),
    projects: z.array(LinkedInProjectSchema).default([]),
    connectionsCount: z.number().optional(),
    lastUpdated: z.string().default(() => new Date().toISOString()),
});

export type LinkedInPosition = z.infer<typeof LinkedInPositionSchema>;
export type LinkedInEducation = z.infer<typeof LinkedInEducationSchema>;
export type LinkedInProject = z.infer<typeof LinkedInProjectSchema>;
export type LinkedInSnapshot = z.infer<typeof LinkedInSnapshotSchema>;

export interface ProfileRecommendation {
    section: string;
    type: 'missing' | 'improvement' | 'consistency';
    impact: 'high' | 'medium' | 'low';
    message: string;
    suggestedAction: string;
    contentToCopy?: string;
}

export interface LinkedInProfileGraph {
    snapshot: LinkedInSnapshot;
    recommendations: ProfileRecommendation[];
    score: number;
}
