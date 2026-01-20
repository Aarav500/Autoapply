import { NextRequest, NextResponse } from 'next/server';

/**
 * DEBUG ENDPOINT: Check localStorage keys and help migrate data
 *
 * GET /api/storage-debug - List all localStorage keys (from client)
 * POST /api/storage-debug - Migrate old keys to new centralized keys
 */

export async function GET(request: NextRequest) {
    // This endpoint returns instructions for the client to check localStorage
    return NextResponse.json({
        message: 'Use browser console to check localStorage',
        instructions: [
            '1. Open browser DevTools (F12)',
            '2. Go to Console tab',
            '3. Run: Object.keys(localStorage).filter(k => k.includes("s3_cache"))',
            '4. This will show all cached S3 keys',
        ],
        commonKeys: [
            's3_cache_activities',
            's3_cache_achievements',
            's3_cache_cv-profile',
            's3_cache_activities/all',
            's3_cache_achievements/all',
            's3_cache_cv/profile',
        ],
        migrationScript: `
// Run this in browser console to check your data:

// 1. Check old location
const oldActivities = localStorage.getItem('s3_cache_activities');
console.log('Old activities:', oldActivities ? JSON.parse(oldActivities).length : 'none');

// 2. Check new location
const newActivities = localStorage.getItem('s3_cache_activities/all');
console.log('New activities:', newActivities ? JSON.parse(newActivities).length : 'none');

// 3. Migrate if needed (ONLY if new location is empty)
if (oldActivities && !newActivities) {
    localStorage.setItem('s3_cache_activities/all', oldActivities);
    console.log('✓ Migrated activities');
}

// 4. Same for achievements
const oldAchievements = localStorage.getItem('s3_cache_achievements');
const newAchievements = localStorage.getItem('s3_cache_achievements/all');
if (oldAchievements && !newAchievements) {
    localStorage.setItem('s3_cache_achievements/all', oldAchievements);
    console.log('✓ Migrated achievements');
}

// 5. Same for profile
const oldProfile = localStorage.getItem('s3_cache_cv-profile');
const newProfile = localStorage.getItem('s3_cache_cv/profile');
if (oldProfile && !newProfile) {
    localStorage.setItem('s3_cache_cv/profile', oldProfile);
    console.log('✓ Migrated profile');
}

console.log('✓ Migration complete! Refresh the page.');
        `.trim()
    });
}
