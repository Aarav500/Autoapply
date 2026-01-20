// ============================================
// OPPORTUNITY MATCHER - Deterministic Scoring
// Hard filters + soft scoring with explanations
// ============================================

import {
    JobListing,
    ScholarshipListing,
    UnifiedOpportunity,
    MatchResult,
    UserPreferences,
    UserConstraints,
    JobFilters,
    ScholarshipFilters,
    SortOption,
} from './opportunity-types';
import { UserProfile } from './user-profile';

// ============================================
// SKILL MATCHING
// ============================================

const SKILL_SYNONYMS: Record<string, string[]> = {
    'javascript': ['js', 'ecmascript', 'es6', 'es2015'],
    'typescript': ['ts'],
    'python': ['py', 'python3'],
    'react': ['reactjs', 'react.js'],
    'node': ['nodejs', 'node.js'],
    'aws': ['amazon web services', 'amazon aws'],
    'gcp': ['google cloud', 'google cloud platform'],
    'sql': ['mysql', 'postgresql', 'postgres', 'sqlite', 'mssql'],
    'machine learning': ['ml', 'deep learning', 'ai', 'artificial intelligence'],
    'data science': ['data analysis', 'data analytics'],
};

function normalizeSkill(skill: string): string {
    const lower = skill.toLowerCase().trim();
    for (const [canonical, synonyms] of Object.entries(SKILL_SYNONYMS)) {
        if (lower === canonical || synonyms.includes(lower)) {
            return canonical;
        }
    }
    return lower;
}

function calculateSkillOverlap(
    userSkills: string[],
    requiredSkills: string[],
    preferredSkills: string[]
): { matched: string[]; missing: string[]; score: number } {
    const normalizedUser = new Set(userSkills.map(normalizeSkill));
    const normalizedRequired = requiredSkills.map(normalizeSkill);
    const normalizedPreferred = preferredSkills.map(normalizeSkill);

    const matchedRequired = normalizedRequired.filter(s => normalizedUser.has(s));
    const matchedPreferred = normalizedPreferred.filter(s => normalizedUser.has(s));
    const missingRequired = normalizedRequired.filter(s => !normalizedUser.has(s));

    // Required skills weighted 70%, preferred 30%
    const requiredScore = normalizedRequired.length > 0
        ? (matchedRequired.length / normalizedRequired.length) * 70
        : 70;
    const preferredScore = normalizedPreferred.length > 0
        ? (matchedPreferred.length / normalizedPreferred.length) * 30
        : 30;

    return {
        matched: [...matchedRequired, ...matchedPreferred],
        missing: missingRequired,
        score: Math.round(requiredScore + preferredScore),
    };
}

// ============================================
// HARD FILTERS - Must Pass All
// ============================================

interface HardFilterResult {
    passed: boolean;
    failures: string[];
}

export function checkJobHardFilters(
    job: JobListing,
    profile: UserProfile,
    preferences: UserPreferences,
    constraints: UserConstraints
): HardFilterResult {
    const failures: string[] = [];

    // 1. Deadline check
    if (job.deadline) {
        const deadline = new Date(job.deadline);
        if (deadline < new Date()) {
            failures.push('Deadline has passed');
        }
    }

    // 2. Work authorization check
    if (job.visa_work_auth) {
        if (job.visa_work_auth.requires_us_citizen && constraints.citizenship !== 'United States') {
            failures.push('Requires US citizenship');
        }
        if (job.visa_work_auth.requires_us_work_auth && !preferences.work_authorization.has_us_work_auth) {
            failures.push('Requires US work authorization');
        }
        if (preferences.work_authorization.needs_visa_sponsorship && !job.visa_work_auth.sponsors_visa) {
            failures.push('Does not sponsor visas');
        }
    }

    // 3. Education requirements
    if (job.education_requirements) {
        if (job.education_requirements.min_gpa && profile.gpa < job.education_requirements.min_gpa) {
            failures.push(`Requires minimum GPA of ${job.education_requirements.min_gpa}`);
        }
    }

    // 4. Experience requirements
    if (job.years_experience_required?.min && job.years_experience_required.min > 0) {
        // For internships/entry level, we're lenient
        if (job.seniority && !['entry', 'mid'].includes(job.seniority)) {
            const totalExperience = profile.workExperience?.length || 0;
            if (totalExperience < job.years_experience_required.min) {
                failures.push(`Requires ${job.years_experience_required.min}+ years of experience`);
            }
        }
    }

    // 5. Location check (for non-remote jobs)
    if (job.remote_type === 'onsite' && preferences.remote_preference === 'remote') {
        // This is a soft preference, not a hard filter
    }

    return {
        passed: failures.length === 0,
        failures,
    };
}

export function checkScholarshipHardFilters(
    scholarship: ScholarshipListing,
    profile: UserProfile,
    constraints: UserConstraints
): HardFilterResult {
    const failures: string[] = [];
    const elig = scholarship.eligibility;

    // 1. Deadline check
    if (scholarship.deadline) {
        const deadline = new Date(scholarship.deadline);
        if (deadline < new Date()) {
            failures.push('Deadline has passed');
        }
    }

    // 2. Citizenship/Residency
    if (elig.citizenship && elig.citizenship.length > 0) {
        if (!elig.citizenship.includes(constraints.citizenship) &&
            !elig.citizenship.includes('any') &&
            !elig.citizenship.includes('international')) {
            failures.push(`Requires citizenship: ${elig.citizenship.join(' or ')}`);
        }
    }

    // 3. GPA requirement
    if (elig.min_gpa && profile.gpa < elig.min_gpa) {
        failures.push(`Requires minimum GPA of ${elig.min_gpa}`);
    }

    // 4. Major requirement
    if (elig.majors && elig.majors.length > 0) {
        const userMajor = profile.major.toLowerCase();
        const matchesMajor = elig.majors.some(m =>
            userMajor.includes(m.toLowerCase()) || m.toLowerCase().includes(userMajor)
        );
        if (!matchesMajor && !elig.majors.includes('any')) {
            failures.push(`Requires major in: ${elig.majors.join(', ')}`);
        }
    }

    // 5. Transfer-specific eligibility
    if (elig.is_transfer_specific && !constraints.is_transfer_student) {
        failures.push('Only for transfer students');
    }

    // 6. Year in school
    if (elig.year_in_school && elig.year_in_school.length > 0) {
        // Infer year from graduation year
        const currentYear = new Date().getFullYear();
        const yearsUntilGrad = profile.graduationYear - currentYear;
        let userYear: string = 'junior'; // default
        if (yearsUntilGrad >= 3) userYear = 'freshman';
        else if (yearsUntilGrad >= 2) userYear = 'sophomore';
        else if (yearsUntilGrad >= 1) userYear = 'junior';
        else userYear = 'senior';

        if (constraints.is_transfer_student) {
            userYear = 'transfer';
        }

        if (!elig.year_in_school.includes(userYear as any) &&
            !elig.year_in_school.includes('transfer' as any)) {
            failures.push(`For ${elig.year_in_school.join('/')} students only`);
        }
    }

    // 7. Demographics (optional - only filter if explicitly required)
    if (elig.demographics) {
        if (elig.demographics.first_gen === true && !constraints.is_first_gen) {
            failures.push('For first-generation college students only');
        }
        if (elig.demographics.low_income === true && !constraints.is_low_income) {
            failures.push('For low-income students only');
        }
    }

    return {
        passed: failures.length === 0,
        failures,
    };
}

// ============================================
// SOFT SCORING
// ============================================

interface SoftScoreBreakdown {
    skills_match: number;      // 0-30
    experience_match: number;  // 0-20
    education_match: number;   // 0-20
    preference_match: number;  // 0-20
    recency_bonus: number;     // 0-10
    total: number;             // 0-100
}

export function calculateJobSoftScore(
    job: JobListing,
    profile: UserProfile,
    preferences: UserPreferences
): SoftScoreBreakdown {
    // 1. Skills match (0-30)
    const skillResult = calculateSkillOverlap(
        profile.skills,
        job.required_skills,
        job.preferred_skills
    );
    const skills_match = Math.round(skillResult.score * 0.3);

    // 2. Experience match (0-20)
    let experience_match = 10; // Base score
    if (job.seniority === 'entry' || job.employment_type === 'internship') {
        experience_match = 20; // Entry level is a good match for students
    } else if (job.years_experience_required?.min) {
        const userExp = profile.workExperience?.length || 0;
        const ratio = Math.min(userExp / job.years_experience_required.min, 1);
        experience_match = Math.round(ratio * 20);
    }

    // 3. Education match (0-20)
    let education_match = 15; // Base score
    if (job.education_requirements?.major) {
        const majorMatch = profile.major.toLowerCase().includes(
            job.education_requirements.major.toLowerCase()
        );
        education_match = majorMatch ? 20 : 10;
    }
    if (profile.gpa >= 3.7) education_match = Math.min(education_match + 5, 20);

    // 4. Preference match (0-20)
    let preference_match = 10;

    // Location preference
    if (job.remote_type === preferences.remote_preference || preferences.remote_preference === 'any') {
        preference_match += 5;
    }

    // Industry preference
    if (job.industry && preferences.desired_industries.some(i =>
        job.industry!.toLowerCase().includes(i.toLowerCase())
    )) {
        preference_match += 5;
    }

    // 5. Recency bonus (0-10)
    let recency_bonus = 0;
    if (job.posted_date) {
        const daysAgo = Math.floor(
            (Date.now() - new Date(job.posted_date).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysAgo <= 7) recency_bonus = 10;
        else if (daysAgo <= 14) recency_bonus = 7;
        else if (daysAgo <= 30) recency_bonus = 4;
        else recency_bonus = 0;
    }

    const total = skills_match + experience_match + education_match + preference_match + recency_bonus;

    return {
        skills_match,
        experience_match,
        education_match,
        preference_match,
        recency_bonus,
        total: Math.min(total, 100),
    };
}

export function calculateScholarshipSoftScore(
    scholarship: ScholarshipListing,
    profile: UserProfile,
    constraints: UserConstraints
): SoftScoreBreakdown {
    const elig = scholarship.eligibility;

    // 1. Skills/Field match (0-30)
    let skills_match = 20; // Base
    if (elig.majors && elig.majors.length > 0) {
        const majorMatch = elig.majors.some(m =>
            profile.major.toLowerCase().includes(m.toLowerCase())
        );
        skills_match = majorMatch ? 30 : 15;
    }

    // 2. Experience/Activities match (0-20)
    let experience_match = 10;
    // Could be enhanced with activity matching

    // 3. Education/GPA match (0-20)
    let education_match = 10;
    if (elig.min_gpa) {
        const gpaMargin = profile.gpa - elig.min_gpa;
        if (gpaMargin >= 0.5) education_match = 20;
        else if (gpaMargin >= 0.2) education_match = 15;
        else if (gpaMargin >= 0) education_match = 10;
        else education_match = 5;
    } else {
        education_match = 15;
    }

    // 4. Preference/Demographics match (0-20)
    let preference_match = 10;
    if (elig.demographics) {
        if (elig.demographics.first_gen && constraints.is_first_gen) preference_match += 5;
        if (elig.demographics.low_income && constraints.is_low_income) preference_match += 5;
    }
    if (elig.is_transfer_specific && constraints.is_transfer_student) {
        preference_match = 20;
    }

    // 5. Deadline urgency bonus (0-10)
    let recency_bonus = 0;
    if (scholarship.deadline) {
        const daysUntil = Math.floor(
            (new Date(scholarship.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        if (daysUntil > 60) recency_bonus = 5;
        else if (daysUntil > 30) recency_bonus = 8;
        else if (daysUntil > 14) recency_bonus = 10;
        else if (daysUntil > 0) recency_bonus = 3; // Very urgent, slightly penalized
        else recency_bonus = 0;
    }

    const total = skills_match + experience_match + education_match + preference_match + recency_bonus;

    return {
        skills_match,
        experience_match,
        education_match,
        preference_match,
        recency_bonus,
        total: Math.min(total, 100),
    };
}

// ============================================
// MATCH EXPLANATION GENERATOR
// ============================================

export function generateJobMatchExplanation(
    job: JobListing,
    profile: UserProfile,
    softScore: SoftScoreBreakdown
): string[] {
    const explanations: string[] = [];

    // Skills
    const skillResult = calculateSkillOverlap(
        profile.skills,
        job.required_skills,
        job.preferred_skills
    );
    if (skillResult.matched.length > 0) {
        explanations.push(`✓ Skills match: ${skillResult.matched.slice(0, 5).join(', ')}`);
    }
    if (skillResult.missing.length > 0 && skillResult.missing.length <= 3) {
        explanations.push(`→ Consider adding: ${skillResult.missing.join(', ')}`);
    }

    // Education
    if (job.education_requirements?.major) {
        if (profile.major.toLowerCase().includes(job.education_requirements.major.toLowerCase())) {
            explanations.push(`✓ Major aligns with ${job.education_requirements.major}`);
        }
    }
    if (profile.gpa >= 3.5) {
        explanations.push(`✓ Strong GPA: ${profile.gpa}`);
    }

    // Experience level
    if (job.employment_type === 'internship' || job.seniority === 'entry') {
        explanations.push(`✓ Entry-level position matches your experience`);
    }

    // Location
    if (job.remote_type === 'remote') {
        explanations.push(`✓ Remote work available`);
    }

    // Visa sponsorship
    if (job.visa_work_auth?.sponsors_visa) {
        explanations.push(`✓ Sponsors work visas`);
    }

    // Recency
    if (job.posted_date) {
        const daysAgo = Math.floor(
            (Date.now() - new Date(job.posted_date).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysAgo <= 7) {
            explanations.push(`✓ Posted recently (${daysAgo} days ago)`);
        }
    }

    return explanations;
}

export function generateScholarshipMatchExplanation(
    scholarship: ScholarshipListing,
    profile: UserProfile,
    constraints: UserConstraints
): string[] {
    const explanations: string[] = [];
    const elig = scholarship.eligibility;

    // GPA
    if (elig.min_gpa && profile.gpa >= elig.min_gpa) {
        explanations.push(`✓ GPA ${profile.gpa} exceeds minimum ${elig.min_gpa}`);
    }

    // Major
    if (elig.majors && elig.majors.length > 0) {
        const majorMatch = elig.majors.some(m =>
            profile.major.toLowerCase().includes(m.toLowerCase())
        );
        if (majorMatch) {
            explanations.push(`✓ ${profile.major} matches required fields`);
        }
    }

    // Transfer
    if (elig.is_transfer_specific && constraints.is_transfer_student) {
        explanations.push(`✓ Specifically for transfer students like you`);
    }

    // Demographics
    if (elig.demographics?.first_gen && constraints.is_first_gen) {
        explanations.push(`✓ For first-generation students`);
    }
    if (elig.demographics?.low_income && constraints.is_low_income) {
        explanations.push(`✓ For students demonstrating financial need`);
    }

    // Deadline
    if (scholarship.deadline) {
        const daysUntil = Math.floor(
            (new Date(scholarship.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        if (daysUntil > 30) {
            explanations.push(`✓ Deadline in ${daysUntil} days - good time to apply`);
        } else if (daysUntil > 0) {
            explanations.push(`⚠ Only ${daysUntil} days until deadline`);
        }
    }

    // Amount
    if (scholarship.amount_value && scholarship.amount_value >= 5000) {
        explanations.push(`✓ Substantial award: ${scholarship.amount}`);
    }

    return explanations;
}

// ============================================
// MAIN MATCHING FUNCTIONS
// ============================================

export function matchJob(
    job: JobListing,
    profile: UserProfile,
    preferences: UserPreferences,
    constraints: UserConstraints
): MatchResult {
    const hardFilterResult = checkJobHardFilters(job, profile, preferences, constraints);
    const softScore = calculateJobSoftScore(job, profile, preferences);
    const explanations = generateJobMatchExplanation(job, profile, softScore);

    // Final score: 0 if hard filters fail, otherwise soft score
    const finalScore = hardFilterResult.passed ? softScore.total : 0;

    return {
        opportunity: jobToUnifiedOpportunity(job),
        score: finalScore,
        passed_hard_filters: hardFilterResult.passed,
        hard_filter_failures: hardFilterResult.failures,
        soft_score_breakdown: softScore,
        explanation: hardFilterResult.passed
            ? explanations
            : [`✗ ${hardFilterResult.failures.join(', ')}`],
    };
}

export function matchScholarship(
    scholarship: ScholarshipListing,
    profile: UserProfile,
    constraints: UserConstraints
): MatchResult {
    const hardFilterResult = checkScholarshipHardFilters(scholarship, profile, constraints);
    const softScore = calculateScholarshipSoftScore(scholarship, profile, constraints);
    const explanations = generateScholarshipMatchExplanation(scholarship, profile, constraints);

    const finalScore = hardFilterResult.passed ? softScore.total : 0;

    return {
        opportunity: scholarshipToUnifiedOpportunity(scholarship),
        score: finalScore,
        passed_hard_filters: hardFilterResult.passed,
        hard_filter_failures: hardFilterResult.failures,
        soft_score_breakdown: softScore,
        explanation: hardFilterResult.passed
            ? explanations
            : [`✗ ${hardFilterResult.failures.join(', ')}`],
    };
}

// ============================================
// CONVERSION UTILITIES
// ============================================

export function jobToUnifiedOpportunity(job: JobListing): UnifiedOpportunity {
    return {
        id: job.id,
        type: 'job',
        title: job.title,
        organization: job.company,
        url: job.canonical_apply_url,
        deadline: job.deadline,
        location: job.locations.join(', '),
        amount_or_salary: job.salary_range
            ? `$${job.salary_range.min.toLocaleString()}-$${job.salary_range.max.toLocaleString()}/${job.salary_range.period}`
            : undefined,
        match_score: job.match_score,
        match_explanation: job.match_explanation,
        application_status: job.application_status,
        saved: job.saved,
        hidden: job.hidden,
        required_documents: job.application_documents_required,
        discovered_at: job.discovered_at,
        applied_at: job.applied_at,
        job_data: job,
    };
}

export function scholarshipToUnifiedOpportunity(scholarship: ScholarshipListing): UnifiedOpportunity {
    return {
        id: scholarship.id,
        type: 'scholarship',
        title: scholarship.scholarship_name,
        organization: scholarship.sponsor,
        url: scholarship.apply_url,
        deadline: scholarship.deadline,
        amount_or_salary: scholarship.amount,
        match_score: scholarship.match_score,
        match_explanation: scholarship.match_explanation,
        application_status: scholarship.application_status,
        saved: scholarship.saved,
        hidden: scholarship.hidden,
        required_documents: scholarship.required_documents,
        discovered_at: scholarship.discovered_at,
        applied_at: scholarship.applied_at,
        scholarship_data: scholarship,
    };
}

// ============================================
// FILTERING & SORTING
// ============================================

export function filterJobs(jobs: JobListing[], filters: JobFilters): JobListing[] {
    return jobs.filter(job => {
        // Query search
        if (filters.query) {
            const q = filters.query.toLowerCase();
            const searchable = `${job.title} ${job.company} ${job.description}`.toLowerCase();
            if (!searchable.includes(q)) return false;
        }

        // Location
        if (filters.locations && filters.locations.length > 0) {
            const hasLocation = job.locations.some(loc =>
                filters.locations!.some(f => loc.toLowerCase().includes(f.toLowerCase()))
            );
            if (!hasLocation) return false;
        }

        // Remote type
        if (filters.remote_type && filters.remote_type.length > 0) {
            if (!filters.remote_type.includes(job.remote_type)) return false;
        }

        // Employment type
        if (filters.employment_types && filters.employment_types.length > 0) {
            if (!filters.employment_types.includes(job.employment_type)) return false;
        }

        // Seniority
        if (filters.seniority_levels && filters.seniority_levels.length > 0 && job.seniority) {
            if (!filters.seniority_levels.includes(job.seniority)) return false;
        }

        // Salary
        if (filters.salary_min && job.salary_range) {
            if (job.salary_range.max < filters.salary_min) return false;
        }

        // Posted within days
        if (filters.posted_within_days && job.posted_date) {
            const daysAgo = Math.floor(
                (Date.now() - new Date(job.posted_date).getTime()) / (1000 * 60 * 60 * 24)
            );
            if (daysAgo > filters.posted_within_days) return false;
        }

        // Match score threshold
        if (filters.min_match_score && job.match_score < filters.min_match_score) {
            return false;
        }

        // Visa sponsorship
        if (filters.sponsors_visa && !job.visa_work_auth?.sponsors_visa) {
            return false;
        }

        // Hidden
        if (!filters.show_hidden && job.hidden) return false;

        // Applied
        if (!filters.show_applied && job.application_status !== 'not_started') return false;

        return true;
    });
}

export function filterScholarships(
    scholarships: ScholarshipListing[],
    filters: ScholarshipFilters
): ScholarshipListing[] {
    return scholarships.filter(scholarship => {
        // Query search
        if (filters.query) {
            const q = filters.query.toLowerCase();
            const searchable = `${scholarship.scholarship_name} ${scholarship.sponsor} ${scholarship.description}`.toLowerCase();
            if (!searchable.includes(q)) return false;
        }

        // Deadline within days
        if (filters.deadline_within_days && scholarship.deadline) {
            const daysUntil = Math.floor(
                (new Date(scholarship.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            );
            if (daysUntil > filters.deadline_within_days || daysUntil < 0) return false;
        }

        // Amount range
        if (filters.min_amount && scholarship.amount_value && scholarship.amount_value < filters.min_amount) {
            return false;
        }
        if (filters.max_amount && scholarship.amount_value && scholarship.amount_value > filters.max_amount) {
            return false;
        }

        // Category
        if (filters.categories && filters.categories.length > 0) {
            if (!filters.categories.includes(scholarship.category)) return false;
        }

        // Transfer specific
        if (filters.for_transfer && !scholarship.eligibility.is_transfer_specific) {
            return false;
        }

        // Match score threshold
        if (filters.min_match_score && scholarship.match_score < filters.min_match_score) {
            return false;
        }

        // Hidden
        if (!filters.show_hidden && scholarship.hidden) return false;

        // Applied
        if (!filters.show_applied && scholarship.application_status !== 'not_started') return false;

        return true;
    });
}

export function sortOpportunities<T extends MatchResult>(
    items: T[],
    sortBy: SortOption
): T[] {
    return [...items].sort((a, b) => {
        switch (sortBy) {
            case 'match_score':
                return b.score - a.score;
            case 'newest':
                return new Date(b.opportunity.discovered_at || 0).getTime() - new Date(a.opportunity.discovered_at || 0).getTime();
            case 'deadline_soon':
                if (!a.opportunity.deadline) return 1;
                if (!b.opportunity.deadline) return -1;
                return new Date(a.opportunity.deadline).getTime() - new Date(b.opportunity.deadline).getTime();
            case 'salary_high':
            case 'amount_high':
                // Would need to extract numeric value from salary/amount
                return b.score - a.score; // fallback
            default:
                return 0;
        }
    });
}


// ============================================
// BATCH MATCHING
// ============================================

export function matchAndRankJobs(
    jobs: JobListing[],
    profile: UserProfile,
    preferences: UserPreferences,
    constraints: UserConstraints,
    filters?: JobFilters,
    sortBy: SortOption = 'match_score'
): MatchResult[] {
    // First, compute match scores for all jobs
    const matchedJobs = jobs.map(job => {
        const result = matchJob(job, profile, preferences, constraints);
        // Update the job with computed score
        job.match_score = result.score;
        job.match_explanation = result.explanation;
        return result;
    });

    // Filter only those that pass hard filters
    let eligibleJobs = matchedJobs.filter(r => r.passed_hard_filters);

    // Apply additional filters if provided
    if (filters) {
        const filteredJobData = filterJobs(
            eligibleJobs.map(r => r.opportunity.job_data!),
            filters
        );
        const filteredIds = new Set(filteredJobData.map(j => j.id));
        eligibleJobs = eligibleJobs.filter(r => filteredIds.has(r.opportunity.id));
    }

    // Sort
    return sortOpportunities(eligibleJobs, sortBy);
}

export function matchAndRankScholarships(
    scholarships: ScholarshipListing[],
    profile: UserProfile,
    constraints: UserConstraints,
    filters?: ScholarshipFilters,
    sortBy: SortOption = 'match_score'
): MatchResult[] {
    // Compute match scores
    const matchedScholarships = scholarships.map(scholarship => {
        const result = matchScholarship(scholarship, profile, constraints);
        scholarship.match_score = result.score;
        scholarship.match_explanation = result.explanation;
        return result;
    });

    // Filter only those that pass hard filters
    let eligibleScholarships = matchedScholarships.filter(r => r.passed_hard_filters);

    // Apply additional filters
    if (filters) {
        const filteredData = filterScholarships(
            eligibleScholarships.map(r => r.opportunity.scholarship_data!),
            filters
        );
        const filteredIds = new Set(filteredData.map(s => s.id));
        eligibleScholarships = eligibleScholarships.filter(r => filteredIds.has(r.opportunity.id));
    }

    // Sort
    return sortOpportunities(eligibleScholarships, sortBy);
}
