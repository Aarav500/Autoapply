// ============================================
// OPPORTUNITY STORAGE & QUEUE
// Central store for discovered scholarships/jobs
// ============================================

export type OpportunityType = 'scholarship' | 'job';
export type OpportunityStatus = 'discovered' | 'queued' | 'tailoring' | 'applying' | 'applied' | 'failed' | 'rejected' | 'accepted';

export interface Opportunity {
    id: string;
    type: OpportunityType;
    title: string;
    organization: string;
    url: string;
    deadline?: string;
    amount?: number; // For scholarships
    salary?: string; // For jobs
    location?: string;
    requirements: string[];
    description: string;
    status: OpportunityStatus;
    matchScore: number; // 0-100 how well it matches user profile

    // Generated content
    tailoredCV?: string;
    tailoredEssay?: string;
    tailoredCoverLetter?: string;

    // Tracking
    discoveredAt: Date;
    appliedAt?: Date;
    error?: string;
}

// In-memory store (would use database in production)
const opportunities: Map<string, Opportunity> = new Map();

// Add opportunity to queue
export function addOpportunity(opp: Omit<Opportunity, 'id' | 'status' | 'discoveredAt'>): Opportunity {
    const id = `opp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const opportunity: Opportunity = {
        ...opp,
        id,
        status: 'discovered',
        discoveredAt: new Date(),
    };
    opportunities.set(id, opportunity);
    return opportunity;
}

// Get all opportunities
export function getAllOpportunities(): Opportunity[] {
    return Array.from(opportunities.values()).sort((a, b) =>
        b.matchScore - a.matchScore
    );
}

// Get opportunities by status
export function getOpportunitiesByStatus(status: OpportunityStatus): Opportunity[] {
    return getAllOpportunities().filter(o => o.status === status);
}

// Get opportunities ready to apply (high match, not yet applied)
export function getEligibleOpportunities(minScore = 70): Opportunity[] {
    return getAllOpportunities().filter(o =>
        o.matchScore >= minScore &&
        ['discovered', 'queued'].includes(o.status)
    );
}

// Update opportunity
export function updateOpportunity(id: string, updates: Partial<Opportunity>): Opportunity | null {
    const opp = opportunities.get(id);
    if (!opp) return null;

    const updated = { ...opp, ...updates };
    opportunities.set(id, updated);
    return updated;
}

// Queue opportunity for auto-apply
export function queueForApply(id: string): Opportunity | null {
    return updateOpportunity(id, { status: 'queued' });
}

// Mark as applied
export function markApplied(id: string): Opportunity | null {
    return updateOpportunity(id, { status: 'applied', appliedAt: new Date() });
}

// Get statistics
export function getStats(): {
    total: number;
    discovered: number;
    queued: number;
    applied: number;
    accepted: number;
} {
    const all = getAllOpportunities();
    return {
        total: all.length,
        discovered: all.filter(o => o.status === 'discovered').length,
        queued: all.filter(o => o.status === 'queued').length,
        applied: all.filter(o => o.status === 'applied').length,
        accepted: all.filter(o => o.status === 'accepted').length,
    };
}

// Seed with sample opportunities for testing
export function seedSampleOpportunities(): void {
    const samples: Omit<Opportunity, 'id' | 'status' | 'discoveredAt'>[] = [
        {
            type: 'scholarship',
            title: 'Tech Innovation Scholarship',
            organization: 'Bold.org',
            url: 'https://bold.org/scholarships/tech-innovation',
            deadline: '2026-03-01',
            amount: 5000,
            requirements: ['CS major', 'GPA 3.5+', 'US student'],
            description: 'For students pursuing careers in technology',
            matchScore: 95,
        },
        {
            type: 'scholarship',
            title: 'Future Leaders Award',
            organization: 'Fastweb',
            url: 'https://fastweb.com/scholarships/future-leaders',
            deadline: '2026-02-15',
            amount: 2500,
            requirements: ['Junior/Senior', 'Leadership experience'],
            description: 'For students demonstrating leadership potential',
            matchScore: 85,
        },
        {
            type: 'job',
            title: 'Software Engineering Intern',
            organization: 'Google',
            url: 'https://careers.google.com/jobs/software-intern',
            salary: '$50/hour',
            location: 'Mountain View, CA',
            requirements: ['CS major', 'Python/Java', 'Data structures'],
            description: 'Summer internship for rising seniors',
            matchScore: 92,
        },
        {
            type: 'job',
            title: 'Frontend Developer Intern',
            organization: 'Meta',
            url: 'https://careers.meta.com/jobs/frontend-intern',
            salary: '$45/hour',
            location: 'Menlo Park, CA',
            requirements: ['React', 'TypeScript', 'CSS'],
            description: 'Build user interfaces for billions of users',
            matchScore: 88,
        },
    ];

    samples.forEach(s => addOpportunity(s));
}
