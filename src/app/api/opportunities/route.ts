// ============================================
// OPPORTUNITIES API
// CRUD operations for opportunity queue
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import {
    getAllOpportunities,
    getEligibleOpportunities,
    addOpportunity,
    updateOpportunity,
    queueForApply,
    getStats,
    seedSampleOpportunities,
    Opportunity,
} from '@/lib/automation/opportunity-store';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
        case 'eligible':
            const minScore = parseInt(searchParams.get('minScore') || '70');
            return NextResponse.json({
                success: true,
                opportunities: getEligibleOpportunities(minScore),
            });

        case 'stats':
            return NextResponse.json({
                success: true,
                stats: getStats(),
            });

        case 'seed':
            seedSampleOpportunities();
            return NextResponse.json({
                success: true,
                message: 'Sample opportunities seeded',
                opportunities: getAllOpportunities(),
            });

        default:
            return NextResponse.json({
                success: true,
                opportunities: getAllOpportunities(),
            });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, opportunity, id, updates } = body;

        switch (action) {
            case 'add':
                if (!opportunity) {
                    return NextResponse.json({ error: 'Opportunity data required' }, { status: 400 });
                }
                const added = addOpportunity(opportunity);
                return NextResponse.json({
                    success: true,
                    opportunity: added,
                });

            case 'update':
                if (!id || !updates) {
                    return NextResponse.json({ error: 'ID and updates required' }, { status: 400 });
                }
                const updated = updateOpportunity(id, updates);
                return NextResponse.json({
                    success: true,
                    opportunity: updated,
                });

            case 'queue':
                if (!id) {
                    return NextResponse.json({ error: 'ID required' }, { status: 400 });
                }
                const queued = queueForApply(id);
                return NextResponse.json({
                    success: true,
                    opportunity: queued,
                });

            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
