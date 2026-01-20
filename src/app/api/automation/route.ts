// ============================================
// AUTOMATION API - Universal Form Filler
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { browserManager } from '@/lib/automation/browser';
import { fillFormAtUrl, DEFAULT_PROFILE } from '@/lib/automation/form-filler';

// Store active workflow promise
let activeWorkflow: Promise<any> | null = null;

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, url, otp, profile } = body;

        switch (action) {
            case 'fill-form':
                if (!url) {
                    return NextResponse.json({ error: 'URL required' }, { status: 400 });
                }

                if (browserManager.getState().status === 'running') {
                    return NextResponse.json({ error: 'Automation already running' }, { status: 400 });
                }

                // Start the form filler in background
                activeWorkflow = fillFormAtUrl(url, profile || DEFAULT_PROFILE);

                // Wait a bit for it to start
                await new Promise(r => setTimeout(r, 500));

                return NextResponse.json({
                    success: true,
                    message: 'Form filler started',
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
