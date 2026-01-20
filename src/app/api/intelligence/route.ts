/**
 * Intelligence API Endpoint
 * Provides access to scraped college and job intelligence
 * Triggers on-demand scraping and returns data for Claude
 */

import { NextRequest, NextResponse } from 'next/server';
import { intelligenceScraper } from '@/lib/intelligence-scraper';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');
    const collegeId = searchParams.get('college');
    const role = searchParams.get('role');
    const company = searchParams.get('company');
    const refresh = searchParams.get('refresh') === 'true';

    try {
        switch (action) {
            case 'college':
                if (!collegeId) {
                    return NextResponse.json(
                        { error: 'college parameter required' },
                        { status: 400 }
                    );
                }
                const collegeData = await intelligenceScraper.getCollegeIntelligence(collegeId, refresh);
                return NextResponse.json({
                    success: true,
                    data: collegeData,
                });

            case 'job':
                if (!role) {
                    return NextResponse.json(
                        { error: 'role parameter required' },
                        { status: 400 }
                    );
                }
                const jobData = await intelligenceScraper.updateJob(role, company || undefined);
                return NextResponse.json({
                    success: true,
                    data: jobData,
                });

            case 'all':
                const allData = intelligenceScraper.getData();
                return NextResponse.json({
                    success: true,
                    data: allData,
                });

            case 'context':
                // Generate Claude context for essay writing
                if (!collegeId) {
                    return NextResponse.json(
                        { error: 'college parameter required' },
                        { status: 400 }
                    );
                }

                // Get or refresh college intelligence
                await intelligenceScraper.getCollegeIntelligence(collegeId, refresh);

                // Parse activities from query string
                const activitiesParam = searchParams.get('activities') || '';
                const activities = activitiesParam.split(',').filter(a => a.trim());

                const context = intelligenceScraper.generateClaudeContext(collegeId, activities);
                return NextResponse.json({
                    success: true,
                    context,
                });

            default:
                return NextResponse.json({
                    success: true,
                    message: 'Intelligence API',
                    endpoints: [
                        'GET ?action=college&college=mit&refresh=true - Get college intelligence',
                        'GET ?action=job&role=Software Engineer&company=Google - Get job intelligence',
                        'GET ?action=all - Get all scraped data',
                        'GET ?action=context&college=mit&activities=research,leadership - Get Claude context',
                    ],
                });
        }
    } catch (error) {
        console.error('Intelligence API error:', error);
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Unknown error',
                success: false
            },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, collegeIds, roles } = body;

        switch (action) {
            case 'refresh-all-colleges':
                // Start background refresh of all colleges
                // In production, this would be a background job
                await intelligenceScraper.updateAllColleges();
                return NextResponse.json({
                    success: true,
                    message: 'All colleges refreshed',
                    data: intelligenceScraper.getData(),
                });

            case 'refresh-selected':
                if (!collegeIds || !Array.isArray(collegeIds)) {
                    return NextResponse.json(
                        { error: 'collegeIds array required' },
                        { status: 400 }
                    );
                }

                const results: Record<string, unknown> = {};
                for (const id of collegeIds) {
                    try {
                        results[id] = await intelligenceScraper.updateCollege(id);
                    } catch (error) {
                        results[id] = { error: error instanceof Error ? error.message : 'Failed' };
                    }
                }

                return NextResponse.json({
                    success: true,
                    data: results,
                });

            case 'scrape-jobs':
                if (!roles || !Array.isArray(roles)) {
                    return NextResponse.json(
                        { error: 'roles array required' },
                        { status: 400 }
                    );
                }

                const jobResults: Record<string, unknown> = {};
                for (const roleInfo of roles) {
                    const { role, company } = typeof roleInfo === 'string'
                        ? { role: roleInfo, company: undefined }
                        : roleInfo;
                    try {
                        jobResults[role] = await intelligenceScraper.updateJob(role, company);
                    } catch (error) {
                        jobResults[role] = { error: error instanceof Error ? error.message : 'Failed' };
                    }
                }

                return NextResponse.json({
                    success: true,
                    data: jobResults,
                });

            default:
                return NextResponse.json(
                    { error: 'Unknown action' },
                    { status: 400 }
                );
        }
    } catch (error) {
        console.error('Intelligence API POST error:', error);
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Unknown error',
                success: false
            },
            { status: 500 }
        );
    }
}
