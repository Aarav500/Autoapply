// ============================================
// UTILITY: Load Seed Activities & Achievements
// Run this to populate the application with Aarav Shah's profile data
// ============================================

import seedData from '@/data/import-activities-achievements.json';

/**
 * Loads seed activities and achievements into localStorage for immediate use
 * Call this function from the browser console or a useEffect to populate data
 */
export function loadSeedDataToLocalStorage(): { activities: number; achievements: number } {
    // Save activities
    localStorage.setItem('activities', JSON.stringify(seedData.activities));

    // Save achievements
    localStorage.setItem('achievements', JSON.stringify(seedData.achievements));

    console.log(`Loaded ${seedData.activities.length} activities and ${seedData.achievements.length} achievements to localStorage`);

    return {
        activities: seedData.activities.length,
        achievements: seedData.achievements.length
    };
}

/**
 * Gets the seed data for programmatic access
 */
export function getSeedData() {
    return seedData;
}

/**
 * Merges seed data with existing data (avoids duplicates by ID)
 */
export function mergeSeedDataWithExisting(): { activities: number; achievements: number } {
    // Get existing data
    const existingActivities = JSON.parse(localStorage.getItem('activities') || '[]');
    const existingAchievements = JSON.parse(localStorage.getItem('achievements') || '[]');

    // Create ID sets for existing data
    const existingActivityIds = new Set(existingActivities.map((a: any) => a.id));
    const existingAchievementIds = new Set(existingAchievements.map((a: any) => a.id));

    // Filter out duplicates from seed data
    const newActivities = seedData.activities.filter(a => !existingActivityIds.has(a.id));
    const newAchievements = seedData.achievements.filter(a => !existingAchievementIds.has(a.id));

    // Merge and save
    const mergedActivities = [...existingActivities, ...newActivities];
    const mergedAchievements = [...existingAchievements, ...newAchievements];

    localStorage.setItem('activities', JSON.stringify(mergedActivities));
    localStorage.setItem('achievements', JSON.stringify(mergedAchievements));

    console.log(`Added ${newActivities.length} new activities and ${newAchievements.length} new achievements`);

    return {
        activities: newActivities.length,
        achievements: newAchievements.length
    };
}

/**
 * Export for use in browser console
 * Usage: In browser console, run:
 *   import('@/lib/load-seed-data').then(m => m.loadSeedDataToLocalStorage())
 */
export default {
    loadSeedDataToLocalStorage,
    getSeedData,
    mergeSeedDataWithExisting,
    seedData
};
