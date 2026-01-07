// ============================================
// AUTOMATION API - Start/Stop/Status/OTP
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { browserManager } from '@/lib/automation/browser';
import { runBoldOrgWorkflow } from '@/lib/automation/bold-org-bot';

// Store active workflow promise
let activeWorkflow: Promise<void> | null = null;

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, platform, otp } = body;

        switch (action) {
            case 'start':
                if (browserManager.getState().status === 'running') {
                    return NextResponse.json({ error: 'Automation already running' }, { status: 400 });
                }

                // Start the workflow in background
                if (platform === 'bold-org' || platform === 'scholarships') {
                    activeWorkflow = runBoldOrgWorkflow();
                } else {
                    return NextResponse.json({ error: 'Unknown platform' }, { status: 400 });
                }

                return NextResponse.json({
                    success: true,
                    message: 'Automation started',
                    state: browserManager.getState()
                });

            case 'status':
                return NextResponse.json({
                    success: true,
                    state: browserManager.getState()
                });

            case 'otp':
                if (!otp) {
                    return NextResponse.json({ error: 'OTP required' }, { status: 400 });
                }
                browserManager.provideOTP(otp);
                return NextResponse.json({
                    success: true,
                    message: 'OTP provided',
                    state: browserManager.getState()
                });

            case 'stop':
                await browserManager.close();
                return NextResponse.json({
                    success: true,
                    message: 'Automation stopped'
                });

            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }
    } catch (error) {
        console.error('Automation API error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

export async function GET() {
    return NextResponse.json({
        success: true,
        state: browserManager.getState()
    });
}
