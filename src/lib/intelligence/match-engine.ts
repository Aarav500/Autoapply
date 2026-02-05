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

        const oppText = (opportunity.title + ' ' + opportunity.description + ' ' + (opportunity.requirements?.join(' ') || '')).toLowerCase();

        // 1. STRICT ELIGIBILITY CHECKS
        // ----------------------------------------------------

        // GPA Check
        const gpaMatch = oppText.match(/gpa[:\s]*(\d\.\d)/);
        if (gpaMatch && profile.gpa !== undefined) {
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

        // LOCATION/STATE CHECK - Comprehensive list
        const statePatterns = [
            { state: 'Florida', patterns: ['florida resident', 'florida students', 'florida scholarship', 'for florida'] },
            { state: 'Texas', patterns: ['texas resident', 'texas students', 'for texas'] },
            { state: 'California', patterns: ['california resident', 'california students', 'for california'] },
            { state: 'New York', patterns: ['new york resident', 'new york students', 'for new york'] },
            { state: 'Georgia', patterns: ['georgia resident', 'georgia students', 'for georgia'] },
            { state: 'Ohio', patterns: ['ohio resident', 'ohio students', 'for ohio'] },
            { state: 'Pennsylvania', patterns: ['pennsylvania resident', 'pennsylvania students', 'for pennsylvania'] },
            { state: 'Michigan', patterns: ['michigan resident', 'michigan students', 'for michigan'] },
            { state: 'Illinois', patterns: ['illinois resident', 'illinois students', 'for illinois'] },
            { state: 'North Carolina', patterns: ['north carolina resident', 'north carolina students'] },
            { state: 'Virginia', patterns: ['virginia resident', 'virginia students', 'for virginia'] },
        ];
        for (const { state, patterns } of statePatterns) {
            if (profile.state !== state && patterns.some(p => oppText.includes(p))) {
                analysis.score = 0;
                analysis.category = 'Not Eligible';
                analysis.missingRequirements.push(`${state} residency required`);
                return analysis;
            }
        }

        // ETHNICITY/RACE REQUIREMENT CHECK
        const userEthnicity = (profile.ethnicity || '').toLowerCase();
        const ethnicityRestrictions = [
            { ethnicity: 'black', patterns: ['black student', 'african american', 'for black', 'black scholars'] },
            { ethnicity: 'hispanic', patterns: ['hispanic student', 'latino student', 'for hispanic', 'latinx'] },
            { ethnicity: 'native american', patterns: ['native american', 'indigenous student', 'tribal', 'american indian'] },
            { ethnicity: 'asian', patterns: ['asian student', 'for asian', 'asian american'] },
            { ethnicity: 'pacific islander', patterns: ['pacific islander', 'native hawaiian'] },
        ];
        for (const { ethnicity, patterns } of ethnicityRestrictions) {
            // If scholarship is for a specific ethnicity and user is NOT that ethnicity
            if (!userEthnicity.includes(ethnicity) && patterns.some(p => oppText.includes(p))) {
                // Check if it's specifically FOR that group (in title or explicit)
                const isRestricted = patterns.some(p => opportunity.title.toLowerCase().includes(p)) ||
                    oppText.includes(`for ${ethnicity}`) ||
                    oppText.includes(`${ethnicity} only`);
                if (isRestricted) {
                    analysis.score = 0;
                    analysis.category = 'Not Eligible';
                    analysis.missingRequirements.push(`${ethnicity.charAt(0).toUpperCase() + ethnicity.slice(1)} ethnicity required`);
                    return analysis;
                }
            }
        }

        // FILTER OUT CATEGORY/LIST PAGES (not actual scholarships)
        const categoryPatterns = ['top scholarships for', 'best scholarships for', 'upcoming deadlines', 'list of scholarships'];
        if (categoryPatterns.some(p => opportunity.title.toLowerCase().includes(p))) {
            analysis.score = 0;
            analysis.category = 'Not Eligible';
            analysis.missingRequirements.push('Category page, not an actual scholarship');
            return analysis;
        }

        // DEGREE LEVEL CHECK (Undergrad vs Graduate/Law/Medical)
        const degreeLevel = (profile.degree || '').toLowerCase();
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
        const userMajor = (profile.major || '').toLowerCase();
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
        const gradYear = profile.graduationYear || (new Date().getFullYear() + 1);
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
        const profileMajor = (profile.major || '').toLowerCase();
        if (profileMajor && (oppText.includes(profileMajor) ||
            (profileMajor.includes('computer science') && (oppText.includes('software') || oppText.includes('developer'))))) {
            score += 15;
            analysis.strengths.push('Major aligns with role');
        }

        // Activities & Leadership matching
        // Simple keyword expansion from common leadership terms
        const leadershipKeywords = ['lead', 'president', 'founder', 'chair', 'captain'];
        const hasLeadership = leadershipKeywords.some(kw =>
            profile.experience.some(exp => exp.title.toLowerCase().includes(kw)) ||
            (oppText.includes('leadership') || oppText.includes('initiative'))
        );

        if (hasLeadership && (oppText.includes('leadership') || oppText.includes('initiative'))) {
            score += 10;
            analysis.strengths.push('Demonstrated leadership matches requirements');
        }

        // --- NEW: ACTIVITY & ACHIEVEMENT MATCHING ---
        if (profile.activities && profile.activities.length > 0) {
            let activityMatches = 0;
            for (const act of profile.activities) {
                // Check if activity name or description keywords appear in opportunity text
                const keywords = [
                    ...act.name.toLowerCase().split(' '),
                    ...(act.description ? act.description.toLowerCase().split(' ') : [])
                ].filter(w => w.length > 4); // Filter out small words

                const matches = keywords.filter(k => oppText.includes(k));
                if (matches.length >= 2) { // Threshold for relevance
                    activityMatches++;
                    analysis.strengths.push(`Your activity "${act.name}" is relevant`);
                }
            }
            // Bonus for relevant activities
            if (activityMatches > 0) score += Math.min(15, activityMatches * 5);
        }

        if (profile.achievements && profile.achievements.length > 0) {
            // Boost score if user has high-level achievements
            const hasMajorAward = profile.achievements.some(a =>
                a.type === 'award' || a.type === 'publication' || a.title.toLowerCase().includes('winner')
            );
            if (hasMajorAward) {
                score += 5;
                analysis.strengths.push('Strong achievement record');
            }
        }

        // 3. CATEGORIZATION
        // ----------------------------------------------------
        analysis.score = Math.min(100, score);

        if (analysis.score >= 90) analysis.category = 'Safety';
        else if (analysis.score >= 70) analysis.category = 'Target';
        else analysis.category = 'Reach';

        // Additional Logic: If it's a top tier company, it's always a Reach or Target, never Safety
        const topTier = ['google', 'meta', 'apple', 'microsoft', 'amazon', 'netflix', 'openai', 'anthropic'];
        if (topTier.some(c => opportunity.company.toLowerCase().includes(c))) {
            if (analysis.category === 'Safety') analysis.category = 'Target';
            if (analysis.category === 'Target') analysis.category = 'Reach';
            analysis.reasons.push('High competition expected (Top Tier Company)');
        }

        return analysis;
    }
}
