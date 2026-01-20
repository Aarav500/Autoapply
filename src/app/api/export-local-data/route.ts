import { NextRequest, NextResponse } from 'next/server';

/**
 * EXPORT LOCAL DATA ENDPOINT
 *
 * This endpoint helps export localStorage data from browser
 * so it can be imported to production S3 storage
 */

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { activities, achievements, profile } = body;

        // In production, this would save to S3
        // For now, just validate the data structure

        return NextResponse.json({
            success: true,
            message: 'Data received',
            counts: {
                activities: Array.isArray(activities) ? activities.length : 0,
                achievements: Array.isArray(achievements) ? achievements.length : 0,
                hasProfile: !!profile
            }
        });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: 'Invalid data format' },
            { status: 400 }
        );
    }
}
