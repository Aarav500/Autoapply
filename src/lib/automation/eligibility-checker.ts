// ============================================
// ELIGIBILITY CHECKER
// Comprehensive verification of user qualifications
// ============================================

import { Opportunity } from './opportunity-store';
import { UserProfile, DEFAULT_PROFILE } from './user-profile';

export interface EligibilityResult {
    eligible: boolean;
    score: number; // 0-100
    matchedCriteria: string[];
    failedCriteria: string[];
    warnings: string[];
}

/**
 * Check if user is eligible for an opportunity
 */
export function checkEligibility(
    opportunity: Opportunity,
    profile: UserProfile = DEFAULT_PROFILE
): EligibilityResult {
    const matched: string[] = [];
    const failed: string[] = [];
    const warnings: string[] = [];
    let score = 100;

    // Extract requirements from opportunity
    const requirements = opportunity.requirements.map(r => r.toLowerCase());
    const description = opportunity.description.toLowerCase();
    const title = opportunity.title.toLowerCase();

    // ============================================
    // DEADLINE CHECK (Critical)
    // ============================================
    if (opportunity.deadline) {
        const deadline = new Date(opportunity.deadline);
        const now = new Date();
        const daysUntilDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntilDeadline < 0) {
            failed.push(`Deadline passed (${opportunity.deadline})`);
            return { eligible: false, score: 0, matchedCriteria: matched, failedCriteria: failed, warnings };
        } else if (daysUntilDeadline < 3) {
            warnings.push(`Urgent: ${daysUntilDeadline} days until deadline`);
        }
        matched.push('Deadline valid');
    }

    // ============================================
    // GPA CHECK
    // ============================================
    const gpaMatch = requirements.find(r =>
        r.includes('gpa') || r.includes('grade point')
    );
    if (gpaMatch) {
        const gpaRequirement = parseFloat(gpaMatch.match(/\d+\.?\d*/)?.[0] || '0');
        if (gpaRequirement > 0) {
            if (profile.gpa >= gpaRequirement) {
                matched.push(`GPA ${profile.gpa} meets ${gpaRequirement}+ requirement`);
            } else {
                failed.push(`GPA ${profile.gpa} below required ${gpaRequirement}`);
                score -= 50; // Major penalty
            }
        }
    }

    // ============================================
    // MAJOR/FIELD CHECK
    // ============================================
    const userMajorLower = profile.major.toLowerCase();
    const hasMajorRequirement = requirements.some(r =>
        r.includes('major') || r.includes('computer science') ||
        r.includes('engineering') || r.includes('stem') ||
        r.includes('cs major') || r.includes('tech')
    );

    if (hasMajorRequirement) {
        const csRelated = ['computer science', 'cs', 'software', 'engineering', 'tech', 'stem'];
        const matchesMajor = csRelated.some(m =>
            requirements.some(r => r.includes(m)) ||
            description.includes(m)
        );

        if (matchesMajor && userMajorLower.includes('computer science')) {
            matched.push('Major matches (Computer Science)');
            score += 5;
        } else if (hasMajorRequirement && !matchesMajor) {
            warnings.push('May have different major requirement');
            score -= 10;
        }
    }

    // ============================================
    // CLASS YEAR / GRADUATION YEAR
    // ============================================
    const currentYear = new Date().getFullYear();
    const yearToGraduation = profile.graduationYear - currentYear;

    // Check for specific year requirements
    const yearRequirements = [
        { pattern: /freshman/i, years: [3, 4] },
        { pattern: /sophomore/i, years: [2, 3] },
        { pattern: /junior/i, years: [1, 2] },
        { pattern: /senior/i, years: [0, 1] },
        { pattern: /rising senior/i, years: [1] },
        { pattern: /undergraduate/i, years: [0, 1, 2, 3, 4] },
        { pattern: /graduate/i, years: [-1, -2, -3] }, // Already graduated
    ];

    for (const req of yearRequirements) {
        const matchesReq = requirements.some(r => req.pattern.test(r)) ||
            req.pattern.test(description);
        if (matchesReq) {
            if (req.years.includes(yearToGraduation)) {
                matched.push(`Class year matches (graduating ${profile.graduationYear})`);
            } else {
                const yearName = yearToGraduation === 0 ? 'Senior' :
                    yearToGraduation === 1 ? 'Junior' :
                        yearToGraduation === 2 ? 'Sophomore' : 'Other';
                failed.push(`Year requirement not met (you're: ${yearName})`);
                score -= 30;
            }
            break;
        }
    }

    // ============================================
    // CITIZENSHIP / VISA STATUS
    // ============================================
    const usOnly = requirements.some(r =>
        r.includes('us citizen') || r.includes('u.s. citizen') ||
        r.includes('us resident') || r.includes('permanent resident') ||
        r.includes('american citizen')
    );

    const internationalFriendly = requirements.some(r =>
        r.includes('international') || r.includes('all students')
    ) || description.includes('international students');

    if (usOnly && profile.citizenship !== 'United States') {
        failed.push('US citizenship required');
        score -= 100; // Disqualifying
    } else if (internationalFriendly) {
        matched.push('Open to international students');
        score += 5;
    }

    // Check visa sponsorship for jobs
    if (opportunity.type === 'job') {
        const noSponsorship = description.includes('no visa') ||
            description.includes('no sponsorship') ||
            description.includes('authorized to work');
        if (noSponsorship && profile.citizenship !== 'United States') {
            warnings.push('May not offer visa sponsorship');
            score -= 20;
        }
    }

    // ============================================
    // SKILLS MATCH
    // ============================================
    const userSkillsLower = profile.skills.map(s => s.toLowerCase());
    let skillsMatched = 0;
    let skillsMissing = 0;

    const skillPatterns = [
        'python', 'javascript', 'typescript', 'react', 'node',
        'java', 'c++', 'sql', 'aws', 'machine learning', 'ai',
        'data structures', 'algorithms', 'git', 'docker',
    ];

    for (const skill of skillPatterns) {
        const requiredInOpp = requirements.some(r => r.includes(skill)) ||
            description.includes(skill);
        if (requiredInOpp) {
            if (userSkillsLower.some(s => s.includes(skill))) {
                skillsMatched++;
                matched.push(`Skill: ${skill}`);
            } else {
                skillsMissing++;
            }
        }
    }

    if (skillsMatched > 0) {
        score += Math.min(skillsMatched * 3, 15);
    }
    if (skillsMissing > 2) {
        warnings.push(`Missing ${skillsMissing} mentioned skills`);
        score -= skillsMissing * 2;
    }

    // ============================================
    // LOCATION CHECK (for jobs)
    // ============================================
    if (opportunity.type === 'job' && opportunity.location) {
        const location = opportunity.location.toLowerCase();
        if (location.includes('remote')) {
            matched.push('Remote position');
            score += 5;
        }
    }

    // ============================================
    // FINAL SCORE CALCULATION
    // ============================================
    score = Math.max(0, Math.min(100, score));

    // Determine eligibility
    const eligible = failed.filter(f =>
        f.includes('citizenship') ||
        f.includes('Deadline passed') ||
        f.includes('GPA')
    ).length === 0;

    return {
        eligible,
        score,
        matchedCriteria: matched,
        failedCriteria: failed,
        warnings,
    };
}

/**
 * Calculate enhanced match score incorporating eligibility
 */
export function calculateEnhancedScore(
    baseScore: number,
    eligibility: EligibilityResult
): number {
    if (!eligibility.eligible) return 0;

    // Combine base match score with eligibility score
    return Math.round((baseScore * 0.6) + (eligibility.score * 0.4));
}
