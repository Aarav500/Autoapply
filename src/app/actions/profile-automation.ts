'use server';

import { ProfileGraphService } from '@/lib/automation/profile-graph';
import { ProfileGenerator } from '@/lib/automation/generators/profile-generator';
import { prisma } from '@/lib/prisma';

export interface ProfileReviewData {
    headline: {
        current: string;
        proposed: string;
    };
    about: {
        current: string;
        proposed: string;
    };
    experiences: {
        id: string;
        role: string;
        company: string;
        current: string; // Original description from DB
        proposed: string; // Generated bullets
    }[];
}

export async function getProfileReviewData(userId: string): Promise<ProfileReviewData> {
    // 1. Get Source of Truth
    const graph = await ProfileGraphService.getProfileGraph(userId);

    // 2. Get current raw fields (simulating "Old Profile" vs "New Graph")
    // In a real scenario, "current" might come from a LinkedIn crawl.
    // Here we use the raw DB fields vs the Generator's strict output.

    // 3. Generate Proposed Content
    const proposedHeadline = ProfileGenerator.generateHeadline(graph);
    const proposedAbout = ProfileGenerator.generateAbout(graph);

    // Map experiences
    const experiences = graph.workExperience.map(exp => ({
        id: exp.id || '',
        role: exp.role,
        company: exp.organization,
        current: exp.description || '', // robust fallback
        proposed: ProfileGenerator.generateExperienceBlock(exp)
    })).concat(
        graph.projects.map(proj => ({
            id: proj.id || '',
            role: proj.role,
            company: proj.organization,
            current: proj.description || '',
            proposed: ProfileGenerator.generateExperienceBlock(proj)
        }))
    );

    return {
        headline: {
            current: 'Software Engineer', // Placeholder or fetch from DB if stored separately
            proposed: proposedHeadline
        },
        about: {
            current: '', // Placeholder
            proposed: proposedAbout
        },
        experiences
    };
}
