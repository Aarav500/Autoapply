import { NextResponse } from 'next/server';
import { getAllOpportunities, getStats, getOpportunitiesByStatus, seedSampleOpportunities } from '@/lib/automation/opportunity-store';

/**
 * GET /api/automation/opportunities
 * Returns all discovered opportunities (jobs & scholarships)
 */
export async function GET() {
    try {
        const opportunities = getAllOpportunities();
        const stats = getStats();

        // Separate jobs and scholarships
        const jobs = opportunities.filter(o => o.type === 'job');
        const scholarships = opportunities.filter(o => o.type === 'scholarship');

        return NextResponse.json({
            success: true,
            stats,
            jobs,
            scholarships,
            total: opportunities.length,
        });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: 'Failed to fetch opportunities' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/automation/opportunities
 * Actions: seed (add sample data)
 */
export async function POST(request: Request) {
    try {
        const { action } = await request.json();

        if (action === 'seed') {
            seedSampleOpportunities();
            return NextResponse.json({ success: true, message: 'Sample opportunities added' });
        }

        return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: 'Failed to process request' },
            { status: 500 }
        );
    }
}
