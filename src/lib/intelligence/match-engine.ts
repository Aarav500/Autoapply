import { Opportunity } from '../automation/opportunity-store';
import { UserProfile, DEFAULT_PROFILE } from '../automation/user-profile';

export interface MatchAnalysis {
    score: number; // 0-100
    category: 'Safety' | 'Target' | 'Reach' | 'Not Eligible';
    reasons: string[];
    missingRequirements: string[];
    strengths: string[];
}

export class MatchEngine {

    /**
     * Calculate match score and analysis for an opportunity
     */
    static analyze(opportunity: Opportunity, profile: UserProfile = DEFAULT_PROFILE): MatchAnalysis {
        const analysis: MatchAnalysis = {
            score: 0,
            category: 'Target', // default
            reasons: [],
            missingRequirements: [],
            strengths: []
        };

        const oppText = (opportunity.title + ' ' + opportunity.description + ' ' + opportunity.requirements.join(' ')).toLowerCase();

        // 1. STRICT ELIGIBILITY CHECKS
        // ----------------------------------------------------

        // GPA Check
        const gpaMatch = oppText.match(/gpa[:\s]*(\d\.\d)/);
        if (gpaMatch) {
            const minGPA = parseFloat(gpaMatch[1]);
            if (profile.gpa < minGPA) {
                analysis.score = 0;
                analysis.category = 'Not Eligible';
                analysis.missingRequirements.push(`GPA ${profile.gpa} is below minimum ${minGPA}`);
                return analysis;
            } else {
                analysis.strengths.push(`GPA ${profile.gpa} meets requirement (${minGPA}+)`);
            }
        }

        // Citizenship Check (for International Students)
        if (profile.citizenship !== 'United States') {
            if (oppText.includes('us citizen') || oppText.includes('u.s. citizen') || oppText.includes('permanent resident')) {
                analysis.score = 0;
                analysis.category = 'Not Eligible';
                analysis.missingRequirements.push('Requires US Citizenship');
                return analysis;
            }
        }

        // 2. SCORING FACTORS
        // ----------------------------------------------------
        let score = 50; // Base score for being eligible

        // Skill Matching
        const matchedSkills: string[] = [];
        profile.skills.forEach(skill => {
            if (oppText.includes(skill.toLowerCase())) {
                matchedSkills.push(skill);
                score += 5;
            }
        });

        if (matchedSkills.length > 0) {
            analysis.strengths.push(`Matches ${matchedSkills.length} skills: ${matchedSkills.slice(0, 3).join(', ')}...`);
        }

        // Major Matching
        if (oppText.includes(profile.major.toLowerCase()) ||
            (profile.major.toLowerCase().includes('computer science') && (oppText.includes('software') || oppText.includes('developer')))) {
            score += 15;
            analysis.strengths.push('Major aligns with role');
        }

        // Activities & Leadership matching
        // Simple keyword expansion from common leadership terms
        const leadershipKeywords = ['lead', 'president', 'founder', 'chair', 'captain'];
        const hasLeadership = leadershipKeywords.some(kw =>
            profile.workExperience.some(exp => exp.role.toLowerCase().includes(kw)) ||
            (oppText.includes('leadership') || oppText.includes('initiative'))
        );

        if (hasLeadership && (oppText.includes('leadership') || oppText.includes('initiative'))) {
            score += 10;
            analysis.strengths.push('Demonstrated leadership matches requirements');
        }

        // 3. CATEGORIZATION
        // ----------------------------------------------------
        analysis.score = Math.min(100, score);

        if (analysis.score >= 90) analysis.category = 'Safety';
        else if (analysis.score >= 70) analysis.category = 'Target';
        else analysis.category = 'Reach';

        // Additional Logic: If it's a top tier company, it's always a Reach or Target, never Safety
        const topTier = ['google', 'meta', 'apple', 'microsoft', 'amazon', 'netflix', 'openai', 'anthropic'];
        if (topTier.some(c => opportunity.organization.toLowerCase().includes(c))) {
            if (analysis.category === 'Safety') analysis.category = 'Target';
            if (analysis.category === 'Target') analysis.category = 'Reach';
            analysis.reasons.push('High competition expected (Top Tier Company)');
        }

        return analysis;
    }
}
