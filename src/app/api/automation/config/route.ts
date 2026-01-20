// API Route: Automation Configuration
// GET /api/automation/config - Get current config
// PUT /api/automation/config - Update config

import { NextRequest, NextResponse } from 'next/server';
import { automationEngine } from '@/lib/automation/automation-engine';

export async function GET() {
    try {
        const config = automationEngine.getConfig();

        return NextResponse.json({
            success: true,
            config,
        });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: String(error) },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest) {
    try {
        const updates = await request.json();

        // Validate updates
        const validKeys = [
            'discoveryIntervalMs',
            'enabledScrapers',
            'minMatchScore',
            'maxApplicationsPerDay',
            'delayBetweenApplicationsMs',
            'dryRun',
            'autoStart',
        ];

        const invalidKeys = Object.keys(updates).filter(k => !validKeys.includes(k));
        if (invalidKeys.length > 0) {
            return NextResponse.json(
                { success: false, error: `Invalid config keys: ${invalidKeys.join(', ')}` },
                { status: 400 }
            );
        }

        // Apply updates
        automationEngine.updateConfig(updates);

        return NextResponse.json({
            success: true,
            message: 'Configuration updated',
            config: automationEngine.getConfig(),
        });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: String(error) },
            { status: 500 }
        );
    }
}
