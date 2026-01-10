
import { prisma } from '@/lib/prisma';
import { LeadSchema, LeadStatusEnum } from '@/lib/automation/profile-schema';
import { z } from 'zod';

type Lead = z.infer<typeof LeadSchema>;

export class LeadEngine {

    /**
     * Add a lead to the system with deduplication based on Profile URL.
     */
    static async addLead(userId: string, leadData: Omit<Lead, 'id' | 'matchScore' | 'status'>) {
        const existing = await prisma.lead.findFirst({
            where: {
                userId,
                profileUrl: leadData.profileUrl
            }
        });

        if (existing) {
            return { status: 'duplicate', lead: existing };
        }

        const newLead = await prisma.lead.create({
            data: {
                userId,
                name: leadData.name,
                headline: leadData.headline,
                company: leadData.company,
                source: leadData.source,
                profileUrl: leadData.profileUrl || '',
                status: 'identified',
                matchScore: this.calculateMatchScore(leadData), // Initial score
            }
        });

        return { status: 'created', lead: newLead };
    }

    /**
     * Calculates a match score (0-1) based on relevance to user goals.
     * Heuristic: Keyword matching in headline.
     */
    private static calculateMatchScore(lead: Omit<Lead, 'id' | 'matchScore' | 'status'>): number {
        const keywords = ['recruiter', 'talent', 'hiring', 'manager', 'engineer', 'lead', 'cto', 'founder'];
        const text = (lead.headline + ' ' + lead.company).toLowerCase();

        let score = 0.3; // Baseline
        if (keywords.some(k => text.includes(k))) score += 0.4;
        if (lead.company && ['Google', 'Meta', 'Amazon', 'Startup'].includes(lead.company)) score += 0.2;

        return Math.min(1, score);
    }

    /**
     * Updates lead status (e.g., after a reply).
     */
    static async updateStatus(leadId: string, status: z.infer<typeof LeadStatusEnum>) {
        return prisma.lead.update({
            where: { id: leadId },
            data: { status }
        });
    }

    /**
     * Find best leads to contact next.
     */
    static async getNextLeadsToContact(userId: string, limit: number = 5) {
        return prisma.lead.findMany({
            where: {
                userId,
                status: 'identified' // Not yet contacted
            },
            orderBy: {
                matchScore: 'desc'
            },
            take: limit
        });
    }
}
