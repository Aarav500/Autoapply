// ============================================
// HEALTH CHECK API
// Validates environment, browser, and S3 connectivity
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { validateEnvironment, validateBrowser, validateS3 } from '@/lib/automation/environment-validator';

export async function GET(request: NextRequest) {
    const checks = {
        environment: { status: 'checking', details: null as any },
        browser: { status: 'checking', error: null as any },
        s3: { status: 'checking', error: null as any },
    };

    try {
        // Environment validation
        const envResult = await validateEnvironment();
        checks.environment = {
            status: envResult.valid ? 'healthy' : 'unhealthy',
            details: envResult,
        };

        // Browser health (with timeout)
        const browserPromise = validateBrowser();
        const browserTimeout = new Promise<{ success: boolean; error: string }>((resolve) =>
            setTimeout(() => resolve({ success: false, error: 'Browser validation timeout' }), 15000)
        );

        const browserResult = await Promise.race([browserPromise, browserTimeout]);
        checks.browser = {
            status: browserResult.success ? 'healthy' : 'unhealthy',
            error: browserResult.error || null,
        };

        // S3 connectivity (with timeout)
        const s3Promise = validateS3();
        const s3Timeout = new Promise<{ success: boolean; error: string }>((resolve) =>
            setTimeout(() => resolve({ success: false, error: 'S3 validation timeout' }), 10000)
        );

        const s3Result = await Promise.race([s3Promise, s3Timeout]);
        checks.s3 = {
            status: s3Result.success ? 'healthy' : 'degraded',  // S3 is optional
            error: s3Result.error || null,
        };
    } catch (error) {
        return NextResponse.json(
            {
                status: 'error',
                message: error instanceof Error ? error.message : 'Health check failed',
                timestamp: new Date().toISOString(),
                checks,
            },
            { status: 500 }
        );
    }

    const allHealthy = checks.environment.status === 'healthy' && checks.browser.status === 'healthy';
    const status = allHealthy ? 'healthy' : 'degraded';

    return NextResponse.json(
        {
            status,
            timestamp: new Date().toISOString(),
            checks,
        },
        { status: allHealthy ? 200 : 503 }
    );
}
