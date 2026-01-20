// ============================================
// OPPORTUNITY TYPES - Enhanced Data Models
// Full schema for jobs and scholarships per spec
// ============================================

// ============================================
// APPLICATION STATUS
// ============================================

export type ApplicationStatus =
    | 'not_started'
    | 'docs_generated'
    | 'applied'
    | 'interview'
    | 'rejected'
    | 'offer';

// ============================================
// LOCATION TYPES
// ============================================

export type LocationType = 'remote' | 'hybrid' | 'onsite';

export type EmploymentType = 'internship' | 'full-time' | 'part-time' | 'contract';

export type SeniorityLevel = 'entry' | 'mid' | 'senior' | 'lead' | 'executive';

// ============================================
// JOB LISTING INTERFACE
// ============================================

export interface JobListing {
    // Identity
    id: string;
    source_name: string;
    source_url: string;
    canonical_apply_url: string;
    backup_apply_urls?: string[];

    // Basic Info
    title: string;
    company: string;
    company_site?: string;
    company_logo?: string;
    industry?: string;

    // Location
    locations: string[];
    remote_type: LocationType;

    // Employment Details
    employment_type: EmploymentType;
    seniority?: SeniorityLevel;
    years_experience_required?: { min: number; max?: number };

    // Skills & Qualifications
    required_skills: string[];
    preferred_skills: string[];
    education_requirements?: {
        degree?: string;
        major?: string;
        min_gpa?: number;
    };
    responsibilities: string[];
    qualifications: string[];

    // Work Authorization
    visa_work_auth?: {
        sponsors_visa: boolean;
        requires_us_citizen?: boolean;
        requires_us_work_auth?: boolean;
        notes?: string;
    };

    // Application Requirements
    application_documents_required: ApplicationDocument[];

    // Dates
    deadline?: string;
    posted_date: string;

    // Compensation
    salary_range?: {
        min: number;
        max: number;
        currency: string;
        period: 'hourly' | 'monthly' | 'yearly';
    };

    // Search Optimization
    ats_keywords: string[];
    description: string;

    // Matching
    match_score: number;
    match_explanation: string[];

    // Application Status
    application_status: ApplicationStatus;
    saved: boolean;
    hidden: boolean;

    // Timestamps
    discovered_at: string;
    applied_at?: string;

    // Generated Documents
    generated_documents?: {
        cv_id?: string;
        cover_letter_id?: string;
        portfolio_summary_id?: string;
    };
}

// ============================================
// SCHOLARSHIP LISTING INTERFACE
// ============================================

export interface ScholarshipListing {
    // Identity
    id: string;
    source_name: string;
    source_url: string;
    apply_url: string;

    // Basic Info
    scholarship_name: string;
    sponsor: string;
    sponsor_logo?: string;
    category: 'merit' | 'need' | 'diversity' | 'college' | 'field' | 'other';

    // Award Details
    amount: string;
    amount_value?: number; // Numeric for sorting
    renewability?: 'one-time' | 'annual' | 'multi-year';
    number_of_awards?: number;

    // Deadlines
    deadline: string;
    early_deadline?: string;

    // Eligibility Rules
    eligibility: {
        citizenship?: string[];
        residency?: string[];
        min_gpa?: number;
        max_gpa?: number;
        majors?: string[];
        schools?: string[];
        school_types?: ('community_college' | 'university' | 'graduate')[];
        year_in_school?: ('freshman' | 'sophomore' | 'junior' | 'senior' | 'graduate' | 'transfer')[];
        is_transfer_specific?: boolean;
        demographics?: {
            gender?: string[];
            ethnicity?: string[];
            first_gen?: boolean;
            low_income?: boolean;
            veteran?: boolean;
            disability?: boolean;
        };
        custom_requirements?: string[];
    };

    // Required Documents
    required_documents: ApplicationDocument[];

    // Essay Prompts
    essay_prompts?: EssayPrompt[];

    // Description
    description: string;

    // Matching
    match_score: number;
    match_explanation: string[];

    // Application Status
    application_status: ApplicationStatus;
    saved: boolean;
    hidden: boolean;

    // Timestamps
    discovered_at: string;
    applied_at?: string;

    // Generated Documents
    generated_documents?: {
        cv_id?: string;
        essay_ids?: string[];
        personal_statement_id?: string;
        lor_template_ids?: string[];
    };
}

// ============================================
// SUPPORTING TYPES
// ============================================

export type ApplicationDocument =
    | 'resume'
    | 'cover_letter'
    | 'transcript'
    | 'portfolio'
    | 'references'
    | 'essay'
    | 'personal_statement'
    | 'lor'
    | 'financial_docs'
    | 'id_document'
    | 'work_samples'
    | 'video_intro'
    | 'other';

export interface EssayPrompt {
    id: string;
    prompt: string;
    word_limit?: number;
    char_limit?: number;
    required: boolean;
}

// ============================================
// UNIFIED OPPORTUNITY TYPE
// ============================================

export type OpportunityType = 'job' | 'scholarship';

export interface UnifiedOpportunity {
    id: string;
    type: OpportunityType;
    title: string;
    organization: string;
    url: string;
    deadline?: string;

    // Display fields
    location?: string;
    amount_or_salary?: string;

    // Matching
    match_score: number;
    match_explanation: string[];

    // Status
    application_status: ApplicationStatus;
    saved: boolean;
    hidden: boolean;

    // Documents
    required_documents: ApplicationDocument[];
    generated_documents?: string[];

    // Timestamps
    discovered_at: string;
    applied_at?: string;

    // Original data
    job_data?: JobListing;
    scholarship_data?: ScholarshipListing;
}

// ============================================
// USER PREFERENCES & CONSTRAINTS
// ============================================

export interface UserPreferences {
    // Job preferences
    desired_roles: string[];
    desired_industries: string[];
    desired_locations: string[];
    remote_preference: LocationType | 'any';
    salary_expectations?: {
        min: number;
        currency: string;
        period: 'hourly' | 'monthly' | 'yearly';
    };
    employment_types: EmploymentType[];

    // Availability
    earliest_start_date?: string;
    hours_per_week?: number;

    // Work authorization
    work_authorization: {
        has_us_work_auth: boolean;
        needs_visa_sponsorship: boolean;
        citizenship: string;
        visa_type?: string;
    };
}

export interface UserConstraints {
    citizenship: string;
    residency?: string;
    is_transfer_student: boolean;
    is_first_gen: boolean;
    is_low_income: boolean;
    has_disability?: boolean;
    is_veteran?: boolean;
    age?: number;
}

// ============================================
// MATCH RESULT
// ============================================

export interface MatchResult {
    opportunity: UnifiedOpportunity;
    score: number;
    passed_hard_filters: boolean;
    hard_filter_failures: string[];
    soft_score_breakdown: {
        skills_match: number;
        experience_match: number;
        education_match: number;
        preference_match: number;
        recency_bonus: number;
    };
    explanation: string[];
}

// ============================================
// FILTER OPTIONS
// ============================================

export interface JobFilters {
    query?: string;
    locations?: string[];
    remote_type?: LocationType[];
    employment_types?: EmploymentType[];
    seniority_levels?: SeniorityLevel[];
    salary_min?: number;
    posted_within_days?: number;
    sources?: string[];
    min_match_score?: number;
    sponsors_visa?: boolean;
    skills?: string[];
    companies?: string[];
    exclude_companies?: string[];
    show_hidden?: boolean;
    show_applied?: boolean;
}

export interface ScholarshipFilters {
    query?: string;
    deadline_within_days?: number;
    min_amount?: number;
    max_amount?: number;
    categories?: ScholarshipListing['category'][];
    for_transfer?: boolean;
    schools?: string[];
    majors?: string[];
    sources?: string[];
    min_match_score?: number;
    show_hidden?: boolean;
    show_applied?: boolean;
}

export type SortOption =
    | 'match_score'
    | 'newest'
    | 'deadline_soon'
    | 'salary_high'
    | 'amount_high';

// ============================================
// DOCUMENT GENERATION REQUEST
// ============================================

export interface DocumentGenerationRequest {
    opportunity_id: string;
    opportunity_type: OpportunityType;
    documents_to_generate: ApplicationDocument[];
    essay_prompts?: EssayPrompt[];
    custom_instructions?: string;
}

export interface GeneratedDocumentResult {
    opportunity_id: string;
    documents: {
        type: ApplicationDocument;
        id: string;
        content: string;
        claims_used: ClaimReference[];
        placeholders: string[];
        version: number;
        created_at: string;
    }[];
}

export interface ClaimReference {
    claim: string;
    source: 'cv' | 'activities' | 'grades' | 'achievements' | 'essays' | 'profile';
    source_detail?: string;
}
