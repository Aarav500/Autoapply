import { LinkedInSnapshot, ProfileRecommendation } from './profile-graph';
import { Activity, Achievement } from '../storage';

export function analyzeProfile(snapshot: LinkedInSnapshot, activities: Activity[], achievements: Achievement[]): {
    recommendations: ProfileRecommendation[];
    score: number;
} {
    const recommendations: ProfileRecommendation[] = [];
    let score = 0;

    // 1. Headline Analysis
    if (!snapshot.headline) {
        recommendations.push({
            section: 'Headline',
            type: 'missing',
            impact: 'high',
            message: 'Your profile is missing a headline.',
            suggestedAction: 'Create a professional headline that highlights your current role and key skills.',
        });
    } else if (snapshot.headline.length < 50) {
        recommendations.push({
            section: 'Headline',
            type: 'improvement',
            impact: 'medium',
            message: 'Your headline is a bit short.',
            suggestedAction: 'Expand your headline to include more keywords and your specific value proposition.',
        });
    } else {
        score += 15;
    }

    // 2. About Section Analysis
    if (!snapshot.about) {
        recommendations.push({
            section: 'About',
            type: 'missing',
            impact: 'high',
            message: 'You haven\'t added an About section yet.',
            suggestedAction: 'Write a summary that highlights your passion, engineering background, and career goals.',
        });
    } else {
        score += 20;
    }

    // 3. Experience Gap Detection (Activities vs LinkedIn)
    const linkedInCompanies = snapshot.positions.map(p => p.company.toLowerCase());
    const missingActivities = activities.filter(a => {
        if (!a.organization) return false;
        return !linkedInCompanies.some(c => c.includes(a.organization!.toLowerCase()));
    });

    if (missingActivities.length > 0) {
        recommendations.push({
            section: 'Experience',
            type: 'consistency',
            impact: 'high',
            message: `You have ${missingActivities.length} activities in your CV that aren't on your LinkedIn.`,
            suggestedAction: `Add "${missingActivities[0].organization}" to your experience section.`,
            contentToCopy: missingActivities[0].description,
        });
    } else {
        score += 30;
    }

    // 4. Skills Analysis
    if (snapshot.skills.length < 5) {
        recommendations.push({
            section: 'Skills',
            type: 'improvement',
            impact: 'medium',
            message: 'You have very few skills listed.',
            suggestedAction: 'Add at least 15-20 skills to improve search visibility.',
        });
    } else {
        score += 15;
    }

    // 5. Quantified Outcomes (Metric Detection)
    const hasMetrics = snapshot.positions.some(p => p.description?.match(/\d+%|\d+\s+percent|\$\d+|[0-9]+\s*(?:users|clients|students|projects)/i));
    if (!hasMetrics && snapshot.positions.length > 0) {
        recommendations.push({
            section: 'Experience',
            type: 'improvement',
            impact: 'high',
            message: 'Your experience descriptions lack quantified results.',
            suggestedAction: 'Add metrics (e.g., "Increased performance by 20%", "Managed 10+ students") to stand out.',
        });
    } else if (hasMetrics) {
        score += 20;
    }

    return { recommendations, score };
}
