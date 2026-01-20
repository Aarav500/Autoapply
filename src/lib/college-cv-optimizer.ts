// ============================================
// COLLEGE CV OPTIMIZER
// Specialized logic for college application CVs
// ============================================

import { targetColleges } from './colleges-data';

export interface ActivityItem {
    id: string;
    name: string;
    role: string;
    organization: string;
    startDate: string;
    endDate: string;
    description: string;
    hoursPerWeek: number;
    weeksPerYear: number;
}

export interface Achievement {
    id: string;
    title: string;
    org: string;
    date: string;
}

/**
 * Map activities to college values and calculate alignment scores
 */
export function mapActivitiesToCollegeValues(
    activities: ActivityItem[],
    collegeId: string
): Array<{ activity: ActivityItem; values: string[]; score: number }> {
    const college = targetColleges.find(c => c.id === collegeId);
    if (!college) return [];

    const valueKeywords: Record<string, string[]> = {
        'Innovation': ['created', 'developed', 'invented', 'designed', 'built', 'engineered', 'pioneered', 'launched'],
        'Leadership': ['led', 'founded', 'organized', 'managed', 'directed', 'president', 'captain', 'coordinated'],
        'Collaboration': ['team', 'collaborated', 'partnered', 'worked with', 'group', 'collective', 'cooperative'],
        'Impact': ['helped', 'served', 'improved', 'benefited', 'impacted', 'changed', 'transformed', 'supported'],
        'Research': ['researched', 'studied', 'analyzed', 'investigated', 'explored', 'examined', 'published'],
        'Service': ['volunteered', 'community', 'service', 'outreach', 'nonprofit', 'charity', 'mentored'],
        'Excellence': ['award', 'recognition', 'honor', 'achievement', 'top', 'first place', 'best', 'distinguished'],
        'Diversity': ['diverse', 'inclusion', 'multicultural', 'international', 'equity', 'accessibility'],
        'Entrepreneurship': ['startup', 'founded', 'business', 'venture', 'entrepreneur', 'company', 'enterprise'],
        'Global': ['international', 'global', 'abroad', 'worldwide', 'cross-cultural', 'foreign'],
        'Technical Depth': ['programming', 'engineering', 'technical', 'computer science', 'mathematics', 'science'],
        'Arts & Humanities': ['music', 'art', 'theater', 'writing', 'literature', 'history', 'philosophy'],
        'Intellectual Curiosity': ['learned', 'curious', 'explored', 'discovered', 'self-taught', 'independent study'],
    };

    return activities.map(activity => {
        const text = `${activity.name} ${activity.role} ${activity.description}`.toLowerCase();
        const matchedValues: string[] = [];
        let score = 0;

        college.research.values.forEach(value => {
            const keywords = valueKeywords[value] || [];
            const matches = keywords.filter(kw => text.includes(kw.toLowerCase()));
            if (matches.length > 0) {
                matchedValues.push(value);
                score += matches.length;
            }
        });

        // Boost score based on time commitment (shows depth)
        const totalHours = activity.hoursPerWeek * activity.weeksPerYear;
        if (totalHours > 200) score += 3;
        else if (totalHours > 100) score += 2;
        else if (totalHours > 50) score += 1;

        // Boost for leadership roles
        if (/president|founder|captain|director|lead|head/i.test(activity.role)) {
            score += 2;
        }

        return { activity, values: matchedValues, score };
    });
}

/**
 * Prioritize activities for college application
 */
export function prioritizeActivitiesForCollege(
    activities: ActivityItem[],
    collegeId: string,
    maxActivities: number = 8
): ActivityItem[] {
    const mapped = mapActivitiesToCollegeValues(activities, collegeId);

    // Sort by alignment score (descending)
    const sorted = mapped.sort((a, b) => b.score - a.score);

    return sorted.slice(0, maxActivities).map(m => m.activity);
}

/**
 * Generate activity description using CARL framework
 */
export function formatActivityWithCARL(activity: ActivityItem): string {
    const { role, organization, startDate, endDate, description, hoursPerWeek } = activity;

    // Parse the description to apply CARL if not already formatted
    const hasStructure = description.includes('Context:') || description.includes('Result:');

    if (hasStructure) {
        return description;
    }

    // Generate CARL structure from existing description
    return `
**Context:** ${description.split('.')[0] || 'Engaged in meaningful work with the organization'}.

**Action:** Took initiative to ${description.toLowerCase().includes('led') ? 'lead' : 'contribute to'} key projects and initiatives, dedicating ${hoursPerWeek} hours per week.

**Result:** ${description.split('.').slice(1).join('.') || 'Made measurable impact on the organization and community'}.

**Learning:** Developed valuable skills in leadership, collaboration, and problem-solving that align with my academic and career goals.
`.trim();
}

/**
 * Analyze activities for "spike" vs "well-rounded"
 */
export function analyzeActivityProfile(activities: ActivityItem[]): {
    type: 'spike' | 'well-rounded' | 'balanced';
    dominantTheme?: string;
    suggestions: string[];
} {
    if (activities.length === 0) {
        return {
            type: 'balanced',
            suggestions: ['Add more activities to build your profile'],
        };
    }

    // Categorize activities
    const categories: Record<string, number> = {
        'STEM': 0,
        'Arts': 0,
        'Sports': 0,
        'Service': 0,
        'Leadership': 0,
        'Research': 0,
    };

    activities.forEach(activity => {
        const text = `${activity.name} ${activity.role} ${activity.description}`.toLowerCase();

        if (/programming|engineering|math|science|research|computer|tech/i.test(text)) {
            categories['STEM'] += activity.hoursPerWeek * activity.weeksPerYear;
            categories['Research'] += activity.hoursPerWeek * activity.weeksPerYear * 0.5;
        }
        if (/art|music|theater|drama|creative|writing|literature/i.test(text)) {
            categories['Arts'] += activity.hoursPerWeek * activity.weeksPerYear;
        }
        if (/sport|athletic|team|competition|tournament/i.test(text)) {
            categories['Sports'] += activity.hoursPerWeek * activity.weeksPerYear;
        }
        if (/volunteer|service|community|nonprofit|charity|outreach/i.test(text)) {
            categories['Service'] += activity.hoursPerWeek * activity.weeksPerYear;
        }
        if (/president|founder|lead|captain|director|organized|managed/i.test(text)) {
            categories['Leadership'] += activity.hoursPerWeek * activity.weeksPerYear;
        }
    });

    const totalHours = Object.values(categories).reduce((sum, h) => sum + h, 0);
    const categoryPercentages = Object.entries(categories).map(([cat, hours]) => ({
        category: cat,
        percentage: totalHours > 0 ? (hours / totalHours) * 100 : 0,
    }));

    const dominant = categoryPercentages.sort((a, b) => b.percentage - a.percentage)[0];
    const suggestions: string[] = [];

    if (dominant.percentage > 60) {
        suggestions.push(`You have a strong "spike" in ${dominant.category}. This is excellent for top colleges!`);
        suggestions.push('Consider adding 1-2 activities that show other dimensions of your personality.');
        return {
            type: 'spike',
            dominantTheme: dominant.category,
            suggestions,
        };
    } else if (categoryPercentages.filter(c => c.percentage > 20).length >= 4) {
        suggestions.push('Your activities show well-rounded involvement across multiple areas.');
        suggestions.push('Consider developing deeper expertise in 1-2 areas to show "spike" potential.');
        return {
            type: 'well-rounded',
            suggestions,
        };
    } else {
        suggestions.push('You have a balanced profile with depth in key areas.');
        suggestions.push(`Your strongest area is ${dominant.category} - consider highlighting this in your applications.`);
        return {
            type: 'balanced',
            dominantTheme: dominant.category,
            suggestions,
        };
    }
}

/**
 * Generate "Why This College" section
 */
export function generateWhyThisCollege(
    collegeId: string,
    activities: ActivityItem[],
    userSummary?: string
): string {
    const college = targetColleges.find(c => c.id === collegeId);
    if (!college) return '';

    const mapped = mapActivitiesToCollegeValues(activities, collegeId);
    const topActivity = mapped.sort((a, b) => b.score - a.score)[0];

    const values = college.research.values.slice(0, 2);
    const programs = college.research.notablePrograms.slice(0, 2);

    return `
## Why ${college.name}

${college.name} represents the ideal environment for me to continue my journey in ${topActivity?.values[0] || 'learning'} and ${topActivity?.values[1] || 'innovation'}. The university's commitment to ${values[0].toLowerCase()} and ${values[1].toLowerCase()} deeply resonates with my own values and aspirations.

I am particularly drawn to ${programs[0]}, which aligns perfectly with my passion for ${topActivity?.activity.name || 'making meaningful impact'}. Through my experience ${topActivity?.activity.description.split('.')[0].toLowerCase() || 'contributing to my community'}, I have developed a strong foundation that I am eager to build upon at ${college.name}.

${userSummary ? `${userSummary} At ${college.name}, I am excited to collaborate with like-minded peers and world-class faculty to push the boundaries of what's possible.` : `The opportunity to learn from ${college.name}'s distinguished faculty and collaborate with talented peers from diverse backgrounds would be transformative for my intellectual and personal growth.`}

I am confident that ${college.name} is where I can make my greatest contribution while being challenged and supported to reach my full potential.
`.trim();
}

/**
 * Calculate college fit score
 */
export function calculateCollegeFitScore(
    activities: ActivityItem[],
    achievements: Achievement[],
    collegeId: string
): {
    overallScore: number;
    valueAlignment: number;
    depthScore: number;
    leadershipScore: number;
    impactScore: number;
    suggestions: string[];
} {
    const college = targetColleges.find(c => c.id === collegeId);
    if (!college) return {
        overallScore: 0,
        valueAlignment: 0,
        depthScore: 0,
        leadershipScore: 0,
        impactScore: 0,
        suggestions: ['College not found'],
    };

    const mapped = mapActivitiesToCollegeValues(activities, collegeId);

    // Value Alignment (0-100)
    const activitiesWithValues = mapped.filter(m => m.values.length > 0).length;
    const valueAlignment = activities.length > 0
        ? (activitiesWithValues / activities.length) * 100
        : 0;

    // Depth Score (0-100) - based on time commitment
    const totalHours = activities.reduce((sum, a) => sum + (a.hoursPerWeek * a.weeksPerYear), 0);
    const depthScore = Math.min(100, (totalHours / 500) * 100); // 500+ hours = max score

    // Leadership Score (0-100)
    const leadershipActivities = activities.filter(a =>
        /president|founder|captain|director|lead|head|chair/i.test(a.role)
    ).length;
    const leadershipScore = Math.min(100, (leadershipActivities / 3) * 100); // 3+ leadership roles = max score

    // Impact Score (0-100) - based on achievements
    const impactScore = Math.min(100, (achievements.length / 5) * 100); // 5+ achievements = max score

    const overallScore = (valueAlignment + depthScore + leadershipScore + impactScore) / 4;

    const suggestions: string[] = [];

    if (valueAlignment < 60) {
        suggestions.push(`Strengthen alignment with ${college.name}'s values: ${college.research.values.join(', ')}`);
    }
    if (depthScore < 50) {
        suggestions.push('Increase depth of commitment in your key activities (aim for 100+ hours/year per activity)');
    }
    if (leadershipScore < 50) {
        suggestions.push('Pursue more leadership opportunities to demonstrate initiative and impact');
    }
    if (impactScore < 50) {
        suggestions.push('Highlight more achievements and recognition to showcase excellence');
    }

    return {
        overallScore: Math.round(overallScore),
        valueAlignment: Math.round(valueAlignment),
        depthScore: Math.round(depthScore),
        leadershipScore: Math.round(leadershipScore),
        impactScore: Math.round(impactScore),
        suggestions,
    };
}
