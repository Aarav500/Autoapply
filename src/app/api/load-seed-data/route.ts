// ============================================
// API: Load Seed Data for Activities & Achievements
// POST /api/load-seed-data - Loads Aarav Shah's profile data
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import seedData from '@/data/import-activities-achievements.json';

// S3 storage integration
async function saveToS3(key: string, value: any): Promise<boolean> {
    try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        const response = await fetch(`${baseUrl}/api/storage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key, value }),
        });
        return response.ok;
    } catch (error) {
        console.error('S3 save error:', error);
        return false;
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => ({}));
        const { merge = false } = body;

        let activitiesLoaded = 0;
        let achievementsLoaded = 0;

        if (merge) {
            // Merge with existing data - would need to fetch existing first
            // For now, just load the seed data
            const activitiesSaved = await saveToS3('activities', seedData.activities);
            const achievementsSaved = await saveToS3('achievements', seedData.achievements);

            if (activitiesSaved) activitiesLoaded = seedData.activities.length;
            if (achievementsSaved) achievementsLoaded = seedData.achievements.length;
        } else {
            // Replace existing data with seed data
            const activitiesSaved = await saveToS3('activities', seedData.activities);
            const achievementsSaved = await saveToS3('achievements', seedData.achievements);

            if (activitiesSaved) activitiesLoaded = seedData.activities.length;
            if (achievementsSaved) achievementsLoaded = seedData.achievements.length;
        }

        return NextResponse.json({
            success: true,
            message: `Loaded ${activitiesLoaded} activities and ${achievementsLoaded} achievements`,
            data: {
                activities: activitiesLoaded,
                achievements: achievementsLoaded
            }
        });
    } catch (error) {
        console.error('Load seed data error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to load seed data' },
            { status: 500 }
        );
    }
}

export async function GET() {
    // Return the seed data for preview
    return NextResponse.json({
        success: true,
        data: seedData,
        summary: {
            activities: seedData.activities.length,
            achievements: seedData.achievements.length,
            categories: {
                activities: {
                    academic: seedData.activities.filter(a => a.category === 'academic').length,
                    leadership: seedData.activities.filter(a => a.category === 'leadership').length,
                    work: seedData.activities.filter(a => a.category === 'work').length,
                    volunteer: seedData.activities.filter(a => a.category === 'volunteer').length,
                    creative: seedData.activities.filter(a => a.category === 'creative').length,
                },
                achievements: {
                    award: seedData.achievements.filter(a => a.category === 'award').length,
                    publication: seedData.achievements.filter(a => a.category === 'publication').length,
                    certification: seedData.achievements.filter(a => a.category === 'certification').length,
                    academic: seedData.achievements.filter(a => a.category === 'academic').length,
                    other: seedData.achievements.filter(a => a.category === 'other').length,
                }
            }
        }
    });
}
