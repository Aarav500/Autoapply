// ============================================
// CV INTELLIGENCE ENGINE
// Pre-processes activities and ensures comprehensive tailoring
// ============================================

import { ActivityItem, Achievement } from './college-cv-optimizer';
import { extractATSKeywords } from './ats-optimizer';

export interface EnrichedActivity extends ActivityItem {
    relevanceScore: number;
    matchedKeywords: string[];
    quantifiedImpact: string;
    tailoredDescription: string;
    priority: 'high' | 'medium' | 'low';
}

export interface CVIntelligenceConfig {
    mode: 'job' | 'college';
    targetContext: string; // job description OR college values
    maxActivities?: number;
    enforceQuantification: boolean;
}

/**
 * Intelligent activity scorer for job applications
 */
export function scoreActivityForJob(
    activity: ActivityItem,
    jobKeywords: string[]
): { score: number; matches: string[] } {
    const text = `${activity.name} ${activity.role} ${activity.organization} ${activity.description}`.toLowerCase();
    const matches: string[] = [];
    let score = 0;

    // Keyword matching (most important)
    jobKeywords.forEach(keyword => {
        if (text.includes(keyword.toLowerCase())) {
            matches.push(keyword);
            score += 10;
        }
    });

    // Time commitment (shows dedication)
    const totalHours = activity.hoursPerWeek * activity.weeksPerYear;
    if (totalHours > 500) score += 15;
    else if (totalHours > 200) score += 10;
    else if (totalHours > 100) score += 5;

    // Leadership indicators
    if (/lead|manager|director|president|founder|head|captain|cto|ceo|coordinator/i.test(activity.role)) {
        score += 12;
    }

    // Quantifiable results (numbers, metrics, percentages)
    const hasMetrics = /\d+%|\d+x|saved \$|\d+ users|\d+ people|increased|improved|reduced|grew/i.test(activity.description);
    if (hasMetrics) score += 8;

    // Technical depth indicators
    const technicalTerms = /built|developed|engineered|architected|deployed|programmed|designed|implemented|created|automated/i;
    if (technicalTerms.test(activity.description)) score += 7;

    // Recency bonus (recent experience more relevant)
    const endYear = activity.endDate.includes('Present') ? new Date().getFullYear() : parseInt(activity.endDate.split(/[-/]/)[0]);
    const yearsSince = new Date().getFullYear() - endYear;
    if (yearsSince <= 1) score += 5;
    else if (yearsSince <= 2) score += 3;

    return { score, matches };
}

/**
 * Intelligent activity scorer for college applications
 */
export function scoreActivityForCollege(
    activity: ActivityItem,
    collegeValues: string[]
): { score: number; alignedValues: string[] } {
    const text = `${activity.name} ${activity.role} ${activity.description}`.toLowerCase();
    const alignedValues: string[] = [];
    let score = 0;

    // Value alignment keywords
    const valueKeywordMap: Record<string, string[]> = {
        'Innovation': ['created', 'invented', 'pioneered', 'developed', 'built', 'launched', 'designed', 'engineered', 'founded', 'started'],
        'Leadership': ['led', 'founded', 'president', 'captain', 'director', 'organized', 'managed', 'coordinated', 'mentored', 'guided'],
        'Research': ['researched', 'studied', 'analyzed', 'investigated', 'published', 'discovered', 'experimented', 'tested'],
        'Service': ['volunteered', 'served', 'helped', 'community', 'nonprofit', 'charity', 'outreach', 'mentor', 'tutor'],
        'Impact': ['impacted', 'helped', 'benefited', 'improved', 'changed', 'transformed', 'served', 'supported', 'affected'],
        'Collaboration': ['collaborated', 'teamwork', 'partnered', 'worked with', 'coordinated', 'group', 'team'],
        'Excellence': ['award', 'recognition', 'honor', 'first place', 'top', 'best', 'distinguished', 'outstanding'],
        'Intellectual Curiosity': ['learned', 'explored', 'self-taught', 'curious', 'studied', 'discovered', 'independent'],
    };

    // Check alignment with college values
    collegeValues.forEach(value => {
        const keywords = valueKeywordMap[value] || [];
        const valueMatches = keywords.filter(kw => text.includes(kw.toLowerCase())).length;
        if (valueMatches > 0) {
            alignedValues.push(value);
            score += valueMatches * 12; // High weight for value alignment
        }
    });

    // Deep commitment (multi-year involvement)
    const duration = calculateDurationYears(activity.startDate, activity.endDate);
    if (duration >= 3) score += 15;
    else if (duration >= 2) score += 10;
    else if (duration >= 1) score += 5;

    // Time intensity
    const totalHours = activity.hoursPerWeek * activity.weeksPerYear;
    if (totalHours > 300) score += 12;
    else if (totalHours > 150) score += 8;
    else if (totalHours > 75) score += 4;

    // Leadership growth (increasing responsibility)
    if (/founder|president|captain|director|lead|head/i.test(activity.role)) score += 10;

    // Initiative and agency
    if (/founded|started|created|initiated|launched|built/i.test(activity.description)) score += 8;

    // Quantifiable impact
    if (/\d+\s+(students|people|members|hours|participants|attendees)/i.test(activity.description)) score += 7;

    return { score, alignedValues };
}

/**
 * Calculate duration in years between two date strings
 */
function calculateDurationYears(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = endDate.includes('Present') ? new Date() : new Date(endDate);
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365);
}

/**
 * Enrich activity with tailored description
 */
export function enrichActivityForJob(
    activity: ActivityItem,
    matchedKeywords: string[],
    score: number
): EnrichedActivity {
    // Generate quantified impact if missing
    const hasMetrics = /\d+%|\d+x|\$\d+|\d+ (users|people|customers|clients)/i.test(activity.description);
    const quantifiedImpact = hasMetrics
        ? activity.description
        : `${activity.description} [Note: Add quantifiable metrics for stronger impact]`;

    // Create tailored description that emphasizes matched keywords
    const tailoredDescription = activity.description;

    const priority: 'high' | 'medium' | 'low' = score > 50 ? 'high' : score > 30 ? 'medium' : 'low';

    return {
        ...activity,
        relevanceScore: score,
        matchedKeywords,
        quantifiedImpact,
        tailoredDescription,
        priority,
    };
}

/**
 * Enrich activity for college application
 */
export function enrichActivityForCollege(
    activity: ActivityItem,
    alignedValues: string[],
    score: number
): EnrichedActivity {
    const totalHours = activity.hoursPerWeek * activity.weeksPerYear;
    const duration = calculateDurationYears(activity.startDate, activity.endDate);

    const quantifiedImpact = `${activity.description} [Duration: ${duration.toFixed(1)} years | Commitment: ${totalHours} total hours]`;

    const priority: 'high' | 'medium' | 'low' = score > 60 ? 'high' : score > 35 ? 'medium' : 'low';

    return {
        ...activity,
        relevanceScore: score,
        matchedKeywords: alignedValues,
        quantifiedImpact,
        tailoredDescription: activity.description,
        priority,
    };
}

/**
 * MAIN FUNCTION: Process all activities intelligently
 */
export function processActivitiesForCV(
    activities: ActivityItem[],
    config: CVIntelligenceConfig
): EnrichedActivity[] {
    if (activities.length === 0) return [];

    let enriched: EnrichedActivity[];

    if (config.mode === 'job') {
        // Extract keywords from job description
        const keywords = config.targetContext
            ? extractATSKeywords(config.targetContext).all
            : [];

        enriched = activities.map(activity => {
            const { score, matches } = scoreActivityForJob(activity, keywords);
            return enrichActivityForJob(activity, matches, score);
        });
    } else {
        // Extract college values
        const values = config.targetContext.split(',').map(v => v.trim());

        enriched = activities.map(activity => {
            const { score, alignedValues } = scoreActivityForCollege(activity, values);
            return enrichActivityForCollege(activity, alignedValues, score);
        });
    }

    // Sort by relevance score (descending)
    enriched.sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Apply max activities limit if specified
    if (config.maxActivities && enriched.length > config.maxActivities) {
        enriched = enriched.slice(0, config.maxActivities);
    }

    return enriched;
}

/**
 * Format enriched activities for AI prompt (detailed, structured)
 */
export function formatActivitiesForPrompt(enrichedActivities: EnrichedActivity[]): string {
    if (enrichedActivities.length === 0) {
        return '[No activities provided]';
    }

    return enrichedActivities.map((activity, idx) => {
        const totalHours = activity.hoursPerWeek * activity.weeksPerYear;
        const duration = calculateDurationYears(activity.startDate, activity.endDate);

        return `
【ACTIVITY ${idx + 1}】 [Priority: ${activity.priority.toUpperCase()} | Relevance Score: ${activity.relevanceScore}]
Name: ${activity.name}
Role: ${activity.role}
Organization: ${activity.organization}
Duration: ${activity.startDate} → ${activity.endDate} (${duration.toFixed(1)} years)
Time Commitment: ${activity.hoursPerWeek} hrs/week × ${activity.weeksPerYear} weeks/year = ${totalHours} total hours
Matched Keywords/Values: ${activity.matchedKeywords.length > 0 ? activity.matchedKeywords.join(', ') : 'None'}

Description:
${activity.description}

REQUIREMENT: You MUST include this activity in the final CV with proper tailoring.
`.trim();
    }).join('\n\n---\n\n');
}

/**
 * Generate quality checklist for CV validation
 */
export function generateQualityChecklist(
    enrichedActivities: EnrichedActivity[],
    mode: 'job' | 'college'
): string[] {
    const checklist: string[] = [];

    if (mode === 'job') {
        checklist.push(`✓ Include ALL ${enrichedActivities.length} activities provided above`);
        checklist.push('✓ Start each bullet with strong action verb (past tense: Led, Built, Achieved)');
        checklist.push('✓ Include quantifiable metrics (%, $, numbers) in every bullet');
        checklist.push('✓ Use exact keywords from job description');
        checklist.push('✓ Prioritize high-relevance activities with more bullets');
        checklist.push('✓ Keep total CV length to 1-2 pages');
    } else {
        checklist.push(`✓ Include ALL ${enrichedActivities.length} activities provided above`);
        checklist.push('✓ Use CARL framework (Context-Action-Result-Learning) for top 3-4 activities');
        checklist.push('✓ Explicitly connect each activity to college values');
        checklist.push('✓ Emphasize depth, growth, and sustained commitment');
        checklist.push('✓ Show initiative and leadership (not just participation)');
        checklist.push('✓ Include total hours and duration for each activity');
    }

    return checklist;
}

/**
 * Validate generated CV contains all activities
 */
export function validateCVCompleteness(
    generatedCV: string,
    activities: ActivityItem[]
): { isComplete: boolean; missingActivities: string[] } {
    const missing: string[] = [];

    activities.forEach(activity => {
        // Check if activity name OR organization appears in CV
        const activityMentioned =
            generatedCV.includes(activity.name) ||
            generatedCV.includes(activity.organization) ||
            generatedCV.includes(activity.role);

        if (!activityMentioned) {
            missing.push(`${activity.role} at ${activity.organization}`);
        }
    });

    return {
        isComplete: missing.length === 0,
        missingActivities: missing,
    };
}
