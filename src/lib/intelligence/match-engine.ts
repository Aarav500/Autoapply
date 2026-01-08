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

        // LOCATION/STATE CHECK
        const statePatterns = [
            { state: 'Florida', patterns: ['florida resident', 'florida students', 'florida scholarship'] },
            { state: 'Texas', patterns: ['texas resident', 'texas students'] },
            { state: 'California', patterns: ['california resident', 'california students'] },
            { state: 'New York', patterns: ['new york resident', 'new york students'] },
        ];
        for (const { state, patterns } of statePatterns) {
            if (profile.state !== state && patterns.some(p => oppText.includes(p))) {
                analysis.score = 0;
                analysis.category = 'Not Eligible';
                analysis.missingRequirements.push(`${state} residency required`);
                return analysis;
            }
        }

        // DEGREE LEVEL CHECK (Undergrad vs Graduate/Law/Medical)
        const degreeLevel = profile.degree.toLowerCase();
        const isUndergrad = degreeLevel.includes('bachelor') || degreeLevel.includes('undergraduate');
        if (isUndergrad) {
            const gradPatterns = ['law school', 'law student', 'graduate student', 'phd student',
                'masters student', 'medical school', 'mba student', 'jd student'];
            if (gradPatterns.some(p => oppText.includes(p))) {
                analysis.score = 0;
                analysis.category = 'Not Eligible';
                analysis.missingRequirements.push('Graduate/Professional degree required');
                return analysis;
            }
        }

        // FIELD RESTRICTION CHECK (Art, Nursing, Law, Medical majors)
        const userMajor = profile.major.toLowerCase();
        const fieldRestrictions = [
            { field: 'art', keywords: ['art student', 'art major', 'fine arts', 'art scholarship'] },
            { field: 'nursing', keywords: ['nursing student', 'nursing major', 'nursing scholarship'] },
            { field: 'law', keywords: ['law student', 'pre-law', 'legal studies'] },
            { field: 'medical', keywords: ['medical student', 'pre-med', 'healthcare'] },
            { field: 'music', keywords: ['music student', 'music major', 'music scholarship'] },
            { field: 'education', keywords: ['education major', 'teaching scholarship'] },
        ];
        for (const { field, keywords } of fieldRestrictions) {
            if (!userMajor.includes(field) && keywords.some(k => oppText.includes(k))) {
                // Check if it's specifically FOR that major (not just mentioning it)
                const isRestricted = oppText.includes(`for ${field}`) ||
                    oppText.includes(`${field} majors only`) ||
                    keywords.some(k => opportunity.title.toLowerCase().includes(k));
                if (isRestricted) {
                    analysis.score = 0;
                    analysis.category = 'Not Eligible';
                    analysis.missingRequirements.push(`${field.charAt(0).toUpperCase() + field.slice(1)} major required`);
                    return analysis;
                }
            }
        }

        // YEAR IN SCHOOL CHECK
        const gradYear = profile.graduationYear;
        const currentYear = new Date().getFullYear();
        const yearsUntilGrad = gradYear - currentYear;

        if (yearsUntilGrad > 3 && oppText.includes('senior')) {
            analysis.score = 0;
            analysis.category = 'Not Eligible';
            analysis.missingRequirements.push('Senior year required');
            return analysis;
        }
        if (yearsUntilGrad <= 0 && (oppText.includes('current student') || oppText.includes('enrolled'))) {
            analysis.score = 0;
            analysis.category = 'Not Eligible';
            analysis.missingRequirements.push('Must be currently enrolled');
            return analysis;
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
