import { prisma } from '../prisma';
import {
    ProfileGraphSchema,
    ProfileGraph,
    EducationSchema,
    ActivitySchema,
    UserSkillSchema,
    LeadSchema,
    PostVariantSchema
} from './profile-schema';
import { z } from 'zod';

// ==========================================
// PROFILE GRAPH SERVICE
// The Canonical Source of Truth for User Data
// ==========================================

export class ProfileGraphService {

    /**
     * strictGet: Validates data against Zod schema before returning.
     * Throws if DB state is invalid (should trigger a migration or manual fix).
     */
    static async getProfileGraph(userId: string): Promise<ProfileGraph> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                education: true,
                activities: {
                    include: {
                        skills: { include: { skill: true } },
                        variants: true
                    }
                },
                skills: { include: { skill: true } },
                leads: true,
            }
        });

        if (!user) throw new Error(`User ${userId} not found`);

        const graph: ProfileGraph = {
            userId: user.id,
            fullName: user.name,
            email: user.email,

            education: user.education.map((e: any) => ({
                ...e,
                startDate: e.startDate.toISOString(),
                endDate: e.endDate ? e.endDate.toISOString() : undefined,
                gpa: e.gpa || undefined,
                description: e.description || undefined,
            })),

            // Map activities to Schema format
            workExperience: user.activities
                .filter(a => a.organization && !a.name.toLowerCase().includes('project')) // Basic heuristic if no type field yet
                .map(this.mapActivityToSchema),

            projects: user.activities
                .filter(a => a.name.toLowerCase().includes('project'))
                .map(this.mapActivityToSchema),

            // Direct skills
            skills: user.skills.map((us: any) => ({
                id: us.id,
                skillId: us.skillId,
                skillName: us.skill.name,
                proficiency: us.proficiency as any,
                verified: us.verified
            })),

            leads: user.leads.map((l: any) => ({
                ...l,
                profileUrl: l.profileUrl || '',
                status: l.status as any,
                matchScore: l.matchScore || undefined,
                headline: l.headline || undefined,
                company: l.company || undefined,
            })),

            // Collect all variants
            generatedPosts: user.activities.flatMap(a =>
                a.variants.map((v: any) => ({
                    ...v,
                    type: v.type as any,
                    hookScore: v.hookScore || undefined,
                    readability: v.readability || undefined,
                    status: v.status as any,
                    scheduledFor: v.scheduledFor ? v.scheduledFor.toISOString() : undefined
                }))
            )
        };

        // Validate against Zod to ensure Source of Truth integrity
        return ProfileGraphSchema.parse(graph);
    }

    /**
     * Helpers to map Prisma Activity to Zod Activity
     */
    private static mapActivityToSchema(activity: any) {
        return {
            id: activity.id,
            name: activity.name,
            role: activity.role,
            organization: activity.organization,
            startDate: activity.startDate.toISOString(),
            endDate: activity.endDate ? activity.endDate.toISOString() : undefined,
            isCurrent: activity.isCurrent,
            description: activity.description,
            skills: activity.skills.map((s: any) => s.skill.name)
        };
    }

    /**
     * Create a snapshot of the current profile state.
     * Returns a JSON string that can be stored in S3 or a 'Snapshots' table.
     */
    static async createSnapshot(userId: string): Promise<string> {
        const graph = await this.getProfileGraph(userId);
        const snapshot = {
            timestamp: new Date().toISOString(),
            data: graph
        };
        // In a real app, save this to `ProfileSnapshot` table or S3
        return JSON.stringify(snapshot);
    }

    /**
     * Update methods using strict validation
     */
    static async addSkill(userId: string, skillName: string, proficiency: 'beginner' | 'intermediate' | 'advanced' | 'expert') {
        // 1. Find or create master skill
        const skill = await prisma.skill.upsert({
            where: { name: skillName },
            update: {},
            create: { name: skillName }
        });

        // 2. Link to user
        return prisma.userSkill.upsert({
            where: {
                userId_skillId: { userId, skillId: skill.id }
            },
            update: { proficiency },
            create: {
                userId,
                skillId: skill.id,
                proficiency
            }
        });
    }
}
