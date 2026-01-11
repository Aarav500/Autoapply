
import { Activity, Achievement } from '@/types/common';
import { achievementStorage } from '../storage';

// Keywords that suggest an achievement
const ACHIEVEMENT_KEYWORDS = [
    'won', 'winner', 'award', 'place', 'finalist', 'champion', 'honor',
    'scholarship', 'grant', 'fellowship', 'recognition', 'selected',
    'published', 'publication', 'patent', 'certified', 'certification'
];

/**
 * Extract achievements from a list of activities
 */
export function extractAchievementsFromActivities(activities: Activity[]): Achievement[] {
    const extracted: Achievement[] = [];

    for (const activity of activities) {
        // Combine name, description, and impact for analysis
        const text = `${activity.name} ${activity.description || ''} ${activity.impact || ''}`;
        const lowerText = text.toLowerCase();

        // Check for keywords
        if (ACHIEVEMENT_KEYWORDS.some(kw => lowerText.includes(kw))) {
            // Try to extract a title (simple heuristic: first sentence or the part with the keyword)
            let title = activity.name; // default

            // Refine title if possible
            if (activity.impact) {
                const impactSentences = activity.impact.split(/[.!]/);
                const winningSentence = impactSentences.find(s => ACHIEVEMENT_KEYWORDS.some(k => s.toLowerCase().includes(k)));
                if (winningSentence) {
                    title = winningSentence.trim();
                }
            }

            // Determine type
            let type: Achievement['type'] = 'other';
            if (lowerText.includes('award')) type = 'award';
            else if (lowerText.includes('scholarship')) type = 'honor';
            else if (lowerText.includes('publish')) type = 'publication';
            else if (lowerText.includes('certif')) type = 'certification';
            else if (lowerText.includes('won') || lowerText.includes('place')) type = 'competition';

            extracted.push({
                id: `auto-${activity.id}-${Date.now()}`,
                title: title.length > 100 ? title.substring(0, 97) + '...' : title, // Truncate if too long
                type,
                date: new Date().getFullYear().toString(), // Approximate
                description: `Extracted from activity: ${activity.name}`,
                issuer: activity.id // Link back to activity
            });
        }
    }

    return extracted;
}

/**
 * Merge new achievements with existing ones, preventing duplicates
 */
export function mergeAchievements(newAchievements: Achievement[]): number {
    if (typeof window === 'undefined') return 0;

    const existing = achievementStorage.loadAchievements();
    let addedCount = 0;

    for (const newAch of newAchievements) {
        // Check for duplicate by fuzzy title match
        const isDuplicate = existing.some(ex => {
            // 1. Exact title match
            if (ex.title.toLowerCase() === newAch.title.toLowerCase()) return true;

            // 2. Similarity match (simple substring check)
            if (ex.title.toLowerCase().includes(newAch.title.toLowerCase()) ||
                newAch.title.toLowerCase().includes(ex.title.toLowerCase())) {
                return true;
            }

            return false;
        });

        if (!isDuplicate) {
            achievementStorage.addAchievement(newAch);
            existing.push(newAch); // Update local copy for subsequent checks
            addedCount++;
        }
    }

    return addedCount;
}
