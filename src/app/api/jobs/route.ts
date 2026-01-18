import { NextRequest, NextResponse } from 'next/server';
import { calculateJobMatch } from '@/lib/ai-engine';
import { getAllOpportunities, initializeOpportunityStore } from '@/lib/automation/opportunity-store';

// ============================================
// JOBS API - Returns REAL jobs from OpportunityStore
// NO MORE MOCK DATA
// ============================================

export async function GET(request: NextRequest) {
    try {
        // Initialize store (loads from S3/localStorage)
        await initializeOpportunityStore();

        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type') || 'all';
        const search = searchParams.get('search') || '';
        const minScore = parseInt(searchParams.get('minScore') || '0');

        // Get REAL opportunities from the store
        let opportunities = getAllOpportunities();

        // Filter by type (jobs only, scholarships only, or all)
        if (type === 'job' || type === 'jobs') {
            opportunities = opportunities.filter(o => o.type === 'job');
        } else if (type === 'scholarship' || type === 'scholarships') {
            opportunities = opportunities.filter(o => o.type === 'scholarship');
        }

        // Filter by search query
        if (search) {
            const q = search.toLowerCase();
            opportunities = opportunities.filter(o =>
                o.title.toLowerCase().includes(q) ||
                o.organization.toLowerCase().includes(q) ||
                o.description.toLowerCase().includes(q) ||
                o.requirements.some(r => r.toLowerCase().includes(q))
            );
        }

        // Filter by minimum match score
        if (minScore > 0) {
            opportunities = opportunities.filter(o => o.matchScore >= minScore);
        }

        // Sort by match score (highest first)
        opportunities.sort((a, b) => b.matchScore - a.matchScore);

        return NextResponse.json({
            jobs: opportunities,
            total: opportunities.length,
            message: opportunities.length === 0
                ? 'No jobs found. Click "Scan New Jobs" to discover opportunities.'
                : undefined
        });
    } catch (error) {
        console.error('Jobs API error:', error);
        return NextResponse.json({
            error: 'Failed to fetch jobs',
            jobs: [],
            total: 0
        }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, jobDescription, resumeContent, skills } = body;

        if (action === 'calculate-match') {
            const match = await calculateJobMatch(jobDescription, resumeContent, skills);
            return NextResponse.json(match);
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        console.error('Jobs API error:', error);
        return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
    }
}
