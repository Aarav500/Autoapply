// ============================================
// AUTO-APPLY API
// Triggers the auto-apply pipeline
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { browserManager } from '@/lib/automation/browser';
import { applyToAllEligible, applyToOpportunity } from '@/lib/automation/auto-apply';
import { getAllOpportunities } from '@/lib/automation/opportunity-store';

let activeApplyProcess: Promise<any> | null = null;

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, opportunityId, minScore } = body;

        switch (action) {
            case 'apply-all':
                if (browserManager.getState().status === 'running') {
                    return NextResponse.json({ error: 'Already running' }, { status: 400 });
                }

                // Start the auto-apply process in background
                activeApplyProcess = applyToAllEligible(minScore || 70);

                return NextResponse.json({
                    success: true,
                    message: 'Auto-apply started for all eligible opportunities',
                    state: browserManager.getState(),
                });

            case 'apply-one':
                if (!opportunityId) {
                    return NextResponse.json({ error: 'Opportunity ID required' }, { status: 400 });
                }

                const opportunities = getAllOpportunities();
                const opp = opportunities.find(o => o.id === opportunityId);

                if (!opp) {
                    return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 });
                }

                // Apply to single opportunity
                activeApplyProcess = applyToOpportunity(opp);

                return NextResponse.json({
                    success: true,
                    message: `Applying to ${opp.title}`,
                    state: browserManager.getState(),
                });

            case 'status':
                return NextResponse.json({
                    success: true,
                    state: browserManager.getState(),
                });

            case 'stop':
                await browserManager.close();
                return NextResponse.json({
                    success: true,
                    message: 'Auto-apply stopped',
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

export async function GET() {
    return NextResponse.json({
        success: true,
        state: browserManager.getState(),
    });
}
