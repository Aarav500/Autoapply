// ============================================
// DISCOVERY API - Find real scholarships & jobs
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { browserManager } from '@/lib/automation/browser';
import { discoverScholarships } from '@/lib/automation/scrapers/bold-org-scraper';
import { discoverJobs } from '@/lib/automation/scrapers/linkedin-scraper';
import { getAllOpportunities, getStats } from '@/lib/automation/opportunity-store';
import { validateEnvironment } from '@/lib/automation/environment-validator';
import { ScraperError, ScraperErrorCode } from '@/lib/automation/errors';

let activeDiscovery: Promise<any> | null = null;

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, keywords } = body;

        // Validate environment before any discovery action
        if (['discover-all', 'discover-jobs', 'discover-scholarships'].includes(action)) {
            const envValidation = await validateEnvironment();
            if (!envValidation.valid) {
                const error = new ScraperError(
                    ScraperErrorCode.ENVIRONMENT_ERROR,
                    `Environment validation failed: ${envValidation.errors.join(', ')}`,
                    'system',
                    false,
                    { errors: envValidation.errors, warnings: envValidation.warnings }
                );
                return NextResponse.json(
                    {
                        success: false,
                        error: error.toJSON(),
                        validation: envValidation,
                    },
                    { status: 503 }
                );
            }

            // Log warnings but continue
            if (envValidation.warnings.length > 0) {
                console.warn('[Discovery] Environment warnings:', envValidation.warnings);
            }
        }

        switch (action) {
            case 'discover-all':
                if (browserManager.getState().status === 'running') {
                    return NextResponse.json({ error: 'Discovery already running' }, { status: 400 });
                }

                // Run both scrapers
                browserManager.setStatus('running');
                activeDiscovery = (async () => {
                    const scholarshipCount = await discoverScholarships();
                    const jobCount = await discoverJobs(keywords || 'software engineer intern');
                    browserManager.setStatus('completed');
                    return { scholarshipCount, jobCount };
                })();

                return NextResponse.json({
                    success: true,
                    message: 'Discovery started for scholarships and jobs',
                    state: browserManager.getState(),
                });

            case 'discover-scholarships':
                if (browserManager.getState().status === 'running') {
                    return NextResponse.json({ error: 'Discovery already running' }, { status: 400 });
                }

                browserManager.setStatus('running');
                activeDiscovery = discoverScholarships().finally(() => browserManager.setStatus('completed'));

                return NextResponse.json({
                    success: true,
                    message: 'Scholarship discovery started',
                    state: browserManager.getState(),
                });

            case 'discover-jobs':
                if (browserManager.getState().status === 'running') {
                    return NextResponse.json({ error: 'Discovery already running' }, { status: 400 });
                }

                browserManager.setStatus('running');
                activeDiscovery = discoverJobs(keywords || 'software engineer intern').finally(() => browserManager.setStatus('completed'));

                return NextResponse.json({
                    success: true,
                    message: 'Job discovery started',
                    state: browserManager.getState(),
                });

            case 'status':
                return NextResponse.json({
                    success: true,
                    state: browserManager.getState(),
                    stats: getStats(),
                });

            case 'stop':
                await browserManager.close();
                return NextResponse.json({
                    success: true,
                    message: 'Discovery stopped',
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

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'results') {
        return NextResponse.json({
            success: true,
            opportunities: getAllOpportunities(),
            stats: getStats(),
        });
    }

    return NextResponse.json({
        success: true,
        state: browserManager.getState(),
        stats: getStats(),
    });
}
