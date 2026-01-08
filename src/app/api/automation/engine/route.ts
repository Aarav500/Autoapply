// API Route: Automation Engine Control
// POST /api/automation/engine/start - Start automation
// POST /api/automation/engine/stop - Stop automation  
// GET /api/automation/engine/status - Get status

import { NextRequest, NextResponse } from 'next/server';
import { automationEngine } from '@/lib/automation/automation-engine';

export async function GET() {
    try {
        const status = automationEngine.getStatus();
        const logs = automationEngine.getLogs().slice(-100); // Last 100 logs

        return NextResponse.json({
            success: true,
            status,
            logs,
        });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: String(error) },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action');

        switch (action) {
            case 'start':
                await automationEngine.start();
                return NextResponse.json({
                    success: true,
                    message: 'Automation engine started',
                    status: automationEngine.getStatus(),
                });

            case 'stop':
                await automationEngine.stop();
                return NextResponse.json({
                    success: true,
                    message: 'Automation engine stopped',
                    status: automationEngine.getStatus(),
                });

            case 'discover':
                await automationEngine.triggerDiscovery();
                return NextResponse.json({
                    success: true,
                    message: 'Discovery scan triggered',
                    status: automationEngine.getStatus(),
                });

            default:
                return NextResponse.json(
                    { success: false, error: 'Invalid action. Use: start, stop, or discover' },
                    { status: 400 }
                );
        }
    } catch (error) {
        return NextResponse.json(
            { success: false, error: String(error) },
            { status: 500 }
        );
    }
}
