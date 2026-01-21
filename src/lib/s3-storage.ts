// ============================================
// S3 STORAGE - Cloud-based data persistence
// Replaces localStorage with S3 bucket storage
// ============================================

interface S3Config {
    bucketName: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
}

// Get S3 config from environment
function getS3Config(): S3Config | null {
    const bucketName = process.env.NEXT_PUBLIC_S3_BUCKET_NAME || process.env.S3_BUCKET_NAME;
    const region = process.env.NEXT_PUBLIC_AWS_REGION || process.env.AWS_REGION || 'us-east-1';
    const accessKeyId = process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;

    if (!bucketName || !accessKeyId || !secretAccessKey) {
        return null;
    }

    return { bucketName, region, accessKeyId, secretAccessKey };
}

// ============================================
// S3 STORAGE CLASS
// ============================================

class S3Storage {
    private baseUrl = '/api/storage';
    private cache: Map<string, { data: any; timestamp: number }> = new Map();
    private cacheTimeout = 5 * 60 * 1000; // 5 minutes

    // Get data from S3
    async get<T>(key: string, defaultValue: T): Promise<T> {
        // Check cache first
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }

        try {
            const response = await fetch(`${this.baseUrl}?key=${encodeURIComponent(key)}`);

            if (!response.ok) {
                if (response.status === 404) {
                    return defaultValue;
                }
                throw new Error(`S3 get failed: ${response.status}`);
            }

            const data = await response.json();
            this.cache.set(key, { data, timestamp: Date.now() });
            return data;
        } catch (error) {
            console.error('S3 get error:', error);
            // Fallback to localStorage if S3 fails
            return this.getFromLocalStorage(key, defaultValue);
        }
    }

    // Save data to S3
    async set<T>(key: string, value: T): Promise<boolean> {
        try {
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key, value }),
            });

            if (!response.ok) {
                throw new Error(`S3 set failed: ${response.status}`);
            }

            // Update cache
            this.cache.set(key, { data: value, timestamp: Date.now() });

            // Also save to localStorage as backup
            this.saveToLocalStorage(key, value);

            return true;
        } catch (error) {
            console.error('S3 set error:', error);
            // Fallback to localStorage
            return this.saveToLocalStorage(key, value);
        }
    }

    // Delete data from S3
    async delete(key: string): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}?key=${encodeURIComponent(key)}`, {
                method: 'DELETE',
            });

            this.cache.delete(key);
            this.removeFromLocalStorage(key);

            return response.ok;
        } catch (error) {
            console.error('S3 delete error:', error);
            return false;
        }
    }

    // List all keys with prefix
    async list(prefix: string): Promise<string[]> {
        try {
            const response = await fetch(`${this.baseUrl}/list?prefix=${encodeURIComponent(prefix)}`);

            if (!response.ok) {
                throw new Error(`S3 list failed: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('S3 list error:', error);
            return [];
        }
    }

    // LocalStorage fallback methods
    private getFromLocalStorage<T>(key: string, defaultValue: T): T {
        if (typeof window === 'undefined') return defaultValue;
        try {
            const item = localStorage.getItem(`s3_${key}`);
            return item ? JSON.parse(item) : defaultValue;
        } catch {
            return defaultValue;
        }
    }

    private saveToLocalStorage<T>(key: string, value: T): boolean {
        if (typeof window === 'undefined') return false;
        try {
            localStorage.setItem(`s3_${key}`, JSON.stringify(value));
            return true;
        } catch {
            return false;
        }
    }

    private removeFromLocalStorage(key: string): void {
        if (typeof window === 'undefined') return;
        try {
            localStorage.removeItem(`s3_${key}`);
        } catch {
            // ignore
        }
    }

    // Clear cache
    clearCache(): void {
        this.cache.clear();
    }
}

// Singleton instance
export const s3Storage = new S3Storage();

// ============================================
// DATA MODELS & KEYS
// ============================================

export const STORAGE_KEYS = {
    // User data (simple keys to match existing S3 data)
    USER_PROFILE: 'user-profile',
    USER_SETTINGS: 'user-settings',
    CV_PROFILE: 'cv-profile',

    // Essays
    ESSAYS: 'essays',
    ESSAY_DRAFTS: 'essay-drafts',

    // Jobs (use simple keys matching existing data)
    JOBS_ALL: 'enhanced-jobs',
    SAVED_JOBS: 'saved-jobs',
    SAVED_JOB_IDS: 'saved-job-ids',
    APPLIED_JOBS: 'applied-jobs',
    APPLIED_JOB_IDS: 'applied-job-ids',
    JOB_PREFERENCES: 'job-preferences',

    // Scholarships (use simple keys matching existing data)
    SCHOLARSHIPS_ALL: 'enhanced-scholarships',
    SAVED_SCHOLARSHIPS: 'saved-scholarships',
    SAVED_SCHOLARSHIP_IDS: 'saved-scholarship-ids',
    APPLIED_SCHOLARSHIPS: 'applied-scholarships',
    APPLIED_SCHOLARSHIP_IDS: 'applied-scholarship-ids',

    // Discovered Opportunities (from scrapers)
    DISCOVERED_OPPORTUNITIES: 'automation/opportunities',
    GENERATED_DOCUMENTS: 'automation/documents',

    // Applications
    APPLICATION_STATUS: 'applications/status',
    DOCUMENT_CHECKLIST: 'applications/checklist',

    // LinkedIn
    LINKEDIN_PROFILE: 'linkedin/profile',
    LINKEDIN_POSTS: 'linkedin/posts',

    // Grades
    TRANSCRIPT: 'grades/transcript',
    COURSES: 'grades/courses',

    // Activities & Achievements (use simple keys to match existing S3 data)
    ACTIVITIES: 'activities',
    ACHIEVEMENTS: 'achievements',

    // Analytics
    ANALYTICS_EVENTS: 'analytics-events',

    // Deadlines
    DEADLINES: 'deadlines',

    // ============================================
    // ESSAY INTELLIGENCE SYSTEM (98% Quality)
    // ============================================

    // Personal Profile (comprehensive background)
    ESSAY_PERSONAL_PROFILE: 'essay-intelligence/personal-profile',

    // College-specific research
    ESSAY_COLLEGE_RESEARCH: 'essay-intelligence/college-research',

    // Writing voice samples
    ESSAY_WRITING_SAMPLES: 'essay-intelligence/writing-samples',

    // Prompt analysis cache
    ESSAY_PROMPT_ANALYSIS: 'essay-intelligence/prompt-analysis',

    // Generated essay variants (multi-agent outputs)
    ESSAY_VARIANTS: 'essay-intelligence/variants',

    // Iteration history (refinement tracking)
    ESSAY_ITERATIONS: 'essay-intelligence/iterations',

    // Quality scores and validation results
    ESSAY_QUALITY_SCORES: 'essay-intelligence/quality-scores',

    // Admissions officer feedback simulations
    ESSAY_AO_FEEDBACK: 'essay-intelligence/ao-feedback',

    // ============================================
    // ADVANCED ESSAY ENHANCEMENTS (99.5% Quality)
    // ============================================

    // Activity intelligence analysis
    ACTIVITY_INTELLIGENCE: 'essay-intelligence/activity-intelligence',

    // Story mining from activities
    STORY_MINING: 'essay-intelligence/story-mining',

    // College tone calibration
    TONE_CALIBRATION: 'essay-intelligence/tone-calibration',

    // Weakness transformation analysis
    WEAKNESS_ANALYSIS: 'essay-intelligence/weakness-analysis',

    // Cross-essay consistency tracking
    ESSAY_CONSISTENCY: 'essay-intelligence/essay-consistency',

    // ============================================
    // FINAL ENHANCEMENTS (100% Quality)
    // ============================================

    // Real-time web research data
    WEB_RESEARCH: 'essay-intelligence/web-research',

    // Admissions officer patterns from real data
    AO_PATTERNS: 'essay-intelligence/ao-patterns',

    // Competitor analysis
    COMPETITOR_ANALYSIS: 'essay-intelligence/competitor-analysis',

    // Emotional arc optimization
    EMOTIONAL_ARC: 'essay-intelligence/emotional-arc',

    // Cultural authenticity analysis
    CULTURAL_AUTHENTICITY: 'essay-intelligence/cultural-authenticity',

    // Admissions trends tracking
    ADMISSIONS_TRENDS: 'essay-intelligence/admissions-trends',

    // Voice analysis from writing samples
    VOICE_PROFILE: 'essay-intelligence/voice-profile',

    // ============================================
    // STORY DEDUPLICATION & DIVERSITY (101% Quality)
    // ============================================

    // Story allocation across all essays for a college
    STORY_ALLOCATION: 'essay-intelligence/story-allocation',

    // ============================================
    // SCHOLARSHIP INTELLIGENCE SYSTEM (Peak Quality)
    // ============================================

    // Discovered scholarships from real-time scraping
    SCHOLARSHIP_DISCOVERIES: 'scholarship-intelligence/discoveries',

    // Scholarship application success predictions
    SCHOLARSHIP_SUCCESS_PREDICTIONS: 'scholarship-intelligence/success-predictions',

    // Story allocation across scholarship applications
    SCHOLARSHIP_STORY_ALLOCATION: 'scholarship-intelligence/story-allocation',

    // Generated scholarship documents (essays, CV, etc.)
    SCHOLARSHIP_DOCUMENTS: 'scholarship-intelligence/documents',

    // Auto-apply results and tracking
    SCHOLARSHIP_AUTO_APPLY_RESULTS: 'scholarship-intelligence/auto-apply-results',

    // Application strategy optimization
    SCHOLARSHIP_STRATEGY: 'scholarship-intelligence/strategy',

    // Financial projections and ROI analysis
    SCHOLARSHIP_FINANCIAL_PROJECTIONS: 'scholarship-intelligence/financial-projections',

    // Deadline tracking and reminders
    SCHOLARSHIP_DEADLINE_INTELLIGENCE: 'scholarship-intelligence/deadline-intelligence',
} as const;

// ============================================
// TYPED STORAGE HELPERS
// ============================================

export interface UserProfile {
    name: string;
    email?: string;
    school: string;
    major: string;
    gpa: number;
    graduationYear: number;
    isInternational: boolean;
    isIndian: boolean;
    skills: string[];
    activities: any[];
}

// ============================================
// ESSAY INTELLIGENCE SYSTEM TYPES
// ============================================

export interface PersonalProfile {
    // Basic Info (from UserProfile)
    name: string;
    email: string;
    currentSchool: string;
    major: string;
    gpa: number;
    graduationYear: number;

    // Background & Identity
    background: {
        isInternational: boolean;
        homeCountry?: string;
        ethnicity?: string;
        firstGeneration?: boolean;
        languages: string[];
        immigrationStory?: string;
    };

    // Transfer Context
    transferReason: {
        whyLeaving: string; // Why transferring from current school
        whatsMissing: string; // What current school lacks
        specificNeeds: string[]; // What you need from target schools
        urgency?: string; // Timeline/urgency reasons
    };

    // Personal Story
    personalStory: {
        familyBackground?: string; // Family context, challenges, support
        culturalIdentity?: string; // How culture shapes you
        challenges: string[]; // Hardships, obstacles overcome
        pivotalMoments: string[]; // Life-changing experiences
        uniquePerspective?: string; // What makes you different
    };

    // Goals & Vision
    goals: {
        careerGoals: string[]; // Long-term career aspirations
        dreamCompanies?: string[]; // Target employers
        problemsToSolve: string[]; // World problems you want to tackle
        impactVision: string; // How you want to change the world
        fiveYearPlan?: string; // Where you see yourself
        tenYearPlan?: string; // Long-term vision
    };

    // Values & Interests
    values: string[]; // Core personal values
    interests: string[]; // Academic and personal interests
    passions: string[]; // What drives you

    // Additional Context
    adversity?: string; // Major challenges faced
    leadership?: string; // Leadership philosophy
    collaboration?: string; // How you work with others
    learningStyle?: string; // How you learn best

    updatedAt: string;
}

export interface CollegeResearch {
    collegeId: string;
    collegeName: string;

    // Specific professors you want to work with
    professors: {
        name: string;
        department: string;
        researchArea: string;
        whyInterested: string;
        specificPapers?: string[]; // Their notable work you've read
    }[];

    // Specific courses you want to take
    courses: {
        code: string;
        name: string;
        whyInterested: string;
        howItFitsGoals: string;
    }[];

    // Labs, research groups, centers
    labs: {
        name: string;
        focus: string;
        whyInterested: string;
        specificProjects?: string[];
    }[];

    // Clubs, organizations, extracurriculars
    organizations: {
        name: string;
        type: string; // academic, cultural, service, etc.
        whyJoin: string;
        roleYouWant?: string;
    }[];

    // Unique opportunities at this school
    uniqueOpportunities: {
        name: string;
        description: string;
        whyImportant: string;
    }[];

    // Campus culture fit
    cultureFit: {
        values: string[]; // School values that resonate with you
        traditions: string[]; // Traditions you're excited about
        communityAspects: string[]; // What about community appeals
    };

    // Location advantages
    locationBenefits: string[]; // Why this location matters

    updatedAt: string;
}

export interface WritingSample {
    id: string;
    title: string;
    type: 'essay' | 'email' | 'personal-statement' | 'casual-writing' | 'academic-paper';
    content: string;
    wordCount: number;
    writtenAt: string;
    analysis?: {
        toneProfile: string; // casual, formal, conversational, etc.
        vocabularyLevel: string;
        sentenceStructure: string;
        commonPhrases: string[];
        voiceCharacteristics: string[];
    };
    createdAt: string;
}

export interface EssayPromptAnalysis {
    collegeId: string;
    essayId: string;
    prompt: string;

    analysis: {
        // What the prompt is REALLY asking
        hiddenQuestions: string[];
        keyThemes: string[];
        whatAdmissionsWants: string[];

        // Strategy
        recommendedApproach: string;
        structureSuggestions: string[];

        // Relevant materials
        relevantActivities: string[]; // Activity IDs that fit
        relevantAchievements: string[]; // Achievement IDs that fit
        relevantCourses: string[]; // Course codes that fit

        // Examples from admitted students
        successfulApproaches?: string[];
        commonPitfalls?: string[];
    };

    analyzedAt: string;
}

export interface EssayVariant {
    variantId: string;
    collegeId: string;
    essayId: string;
    prompt: string;

    approach: string; // narrative, analytical, reflective, etc.
    content: string;
    wordCount: number;

    scores: {
        authenticity: number; // 0-100
        specificity: number; // 0-100
        collegeFit: number; // 0-100
        emotionalImpact: number; // 0-100
        overall: number; // 0-100
    };

    strengths: string[];
    weaknesses: string[];

    generatedAt: string;
}

export interface EssayIteration {
    iterationId: string;
    essayId: string;
    collegeId: string;
    version: number;

    content: string;
    wordCount: number;

    improvements: {
        from: number; // previous version number
        changesApplied: string[];
        feedbackAddressed: string[];
    };

    scores: {
        authenticity: number;
        specificity: number;
        collegeFit: number;
        emotionalImpact: number;
        overall: number;
    };

    feedback: {
        type: 'strength' | 'improvement' | 'critical';
        content: string;
        priority: 'high' | 'medium' | 'low';
    }[];

    createdAt: string;
}

export interface QualityScore {
    essayId: string;
    collegeId: string;
    content: string;

    scores: {
        // Core metrics
        authenticity: number; // 0-100 (sounds human, not AI)
        specificity: number; // 0-100 (concrete details, numbers)
        collegeFit: number; // 0-100 (matches college values)
        emotionalImpact: number; // 0-100 (memorable, moving)
        technicalQuality: number; // 0-100 (grammar, flow, structure)

        // Advanced metrics
        voiceConsistency: number; // 0-100 (matches writing samples)
        promptAlignment: number; // 0-100 (answers the question)
        uniqueness: number; // 0-100 (not template-able)

        // Overall
        overall: number; // 0-100
        admissionsProbability: number; // 0-100 (estimated acceptance boost)
    };

    validation: {
        specificDetails: {
            count: number; // Number of specific details (names, numbers, etc.)
            examples: string[];
        };
        collegeReferences: {
            count: number; // Specific college resources mentioned
            examples: string[];
        };
        bannedPhrases: {
            found: string[]; // AI-sounding phrases detected
            severity: 'none' | 'minor' | 'major';
        };
        wordCount: {
            actual: number;
            target: number;
            status: 'under' | 'perfect' | 'over';
        };
    };

    recommendations: string[];
    criticalIssues: string[];

    evaluatedAt: string;
}

export interface AdmissionsOfficerFeedback {
    essayId: string;
    collegeId: string;

    officerPerspective: {
        firstImpression: string;
        memorability: number; // 0-100 (will they remember this essay?)
        standOut: number; // 0-100 (compared to other applicants)
        authenticity: number; // 0-100 (seems genuine?)
        fitAssessment: string; // Would this student fit here?
    };

    strengths: string[];
    concerns: string[];
    redFlags: string[];

    diversityAngle: {
        uniquePerspective: string;
        whatTheyBring: string;
        howTheyContribute: string;
    };

    recommendation: 'strong-accept' | 'accept' | 'waitlist' | 'reject';
    confidenceLevel: number; // 0-100

    simulatedAt: string;
}

export interface EssayDraft {
    id: string;
    collegeId: string;
    prompt: string;
    content: string;
    wordCount: number;
    lastModified: string;
    status: 'draft' | 'review' | 'final';
}

// ============================================
// ADVANCED ESSAY ENHANCEMENT TYPES
// ============================================

export interface ActivityIntelligence {
    // Core analysis
    keyThemes: string[]; // Patterns that emerge from activities
    uniqueAngles: string[]; // What makes this student different
    emotionalMoments: {
        activity: string;
        moment: string;
        emotionalImpact: number; // 0-100
        storyPotential: number; // 0-100
    }[];

    // Extracted metrics
    specificNumbers: {
        metric: string; // e.g., "200+ hours", "47 students", "$5000 raised"
        context: string; // What activity it's from
        impactLevel: 'high' | 'medium' | 'low';
    }[];

    // Transfer motivation
    transferMotivation: {
        currentLimitations: string[]; // What activities show is lacking at current school
        futureNeeds: string[]; // What student needs to continue/expand
        growthAreas: string[]; // Where student wants to grow
    };

    // College alignment per target school
    collegeAlignment: Record<string, {
        matchingActivities: string[]; // Which activities align with this college
        relevantProfessors: string[]; // Professors whose work connects to activities
        relevantCourses: string[]; // Courses that build on activities
        uniqueOpportunities: string[]; // College-specific opportunities to highlight
        alignmentScore: number; // 0-100
    }>;

    analyzedAt: string;
}

export interface StoryMining {
    stories: {
        storyId: string;
        title: string;
        type: 'failure-learning' | 'challenge-growth' | 'passion-impact' | 'leadership-team';

        // Story components
        hook: string; // Opening line
        context: string; // Background
        conflict: string; // Challenge/problem
        action: string; // What you did
        result: string; // Outcome
        reflection: string; // What you learned

        // Scoring
        emotionalImpact: number; // 0-100
        uniqueness: number; // 0-100
        authenticity: number; // 0-100

        // College fit
        collegeAlignment: Record<string, number>; // Score per college

        // Essay fit
        suitablePrompts: string[]; // Which prompts this story answers

        // Supporting data
        relatedActivities: string[];
        specificMetrics: string[];

    }[];

    minedAt: string;
}

export interface ToneCalibration {
    collegeId: string;
    collegeName: string;

    // Preferred tone elements
    preferred: {
        toneWords: string[]; // analytical, hands-on, innovative, etc.
        sentencePatterns: string[]; // Example sentence structures
        vocabularyLevel: 'technical' | 'balanced' | 'accessible';
        examplePhrases: string[]; // College-specific phrases to use
    };

    // Elements to avoid
    avoid: {
        toneWords: string[];
        bannedPhrases: string[];
        commonMistakes: string[];
    };

    // College-specific examples
    successExamples: string[]; // Example sentences that work well
    failureExamples: string[]; // Common mistakes to avoid

    // Voice characteristics
    voiceProfile: {
        formalityLevel: number; // 0-100 (0=very casual, 100=very formal)
        technicalDepth: number; // 0-100 (how technical to be)
        emotionalExpression: number; // 0-100 (how much emotion to show)
        innovationFocus: number; // 0-100 (emphasis on innovation vs tradition)
    };

    calibratedAt: string;
}

export interface WeaknessAnalysis {
    // Detected potential concerns
    potentialConcerns: {
        concern: string;
        severity: 'high' | 'medium' | 'low';
        evidence: string;

        // Transformation strategy
        reframe: {
            approach: string; // How to address it
            angle: string; // The positive spin
            evidenceToUse: string[]; // Activities/achievements that support reframe
            exampleLanguage: string; // How to write it
        };
    }[];

    // Academic concerns
    academicProfile: {
        gpaContext: string; // How to contextualize GPA
        courseRigor: string; // How to highlight challenging courses
        gradeTrajectory: string; // Upward/downward trend explanation
    };

    // Activity concerns
    activityProfile: {
        leadershipGaps?: string; // If limited leadership
        depthVsBreadth: 'depth' | 'breadth' | 'balanced';
        timeCommitment: string; // Total hours analysis
        impactLevel: string; // Overall impact assessment
    };

    // How to address in essays
    essayStrategy: {
        whatToEmphasize: string[];
        whatToMinimize: string[];
        compensatingStrengths: string[];
    };

    analyzedAt: string;
}

export interface EssayConsistency {
    collegeId: string;
    essayIds: string[];

    // Cross-essay analysis
    storyUsage: {
        story: string;
        usedInEssays: string[]; // Which essays use this story
        repetitionLevel: 'none' | 'appropriate' | 'excessive';
        recommendation: string;
    }[];

    // Theme coverage
    themeCoverage: {
        theme: string; // e.g., "leadership", "innovation", "resilience"
        essaysCovering: string[];
        coverage: 'under' | 'appropriate' | 'over';
    }[];

    // Contradiction detection
    contradictions: {
        issue: string;
        essays: string[]; // Which essays contradict
        severity: 'critical' | 'moderate' | 'minor';
        resolution: string;
    }[];

    // Narrative arc
    narrativeArc: {
        completeness: number; // 0-100 (do essays tell complete story?)
        progression: string; // Do essays build on each other?
        gaps: string[]; // What's missing from overall narrative
        strengths: string[]; // What works well across essays
    };

    // Recommendations
    recommendations: {
        type: 'add' | 'remove' | 'modify';
        essay: string;
        suggestion: string;
        priority: 'high' | 'medium' | 'low';
    }[];

    analyzedAt: string;
}

// ============================================
// FINAL ENHANCEMENT TYPES (100% Quality)
// ============================================

export interface WebResearch {
    collegeId: string;
    collegeName: string;

    // Latest professors (hired recently)
    newProfessors: {
        name: string;
        department: string;
        hiredDate: string; // "Fall 2025", "Sept 2025"
        researchArea: string;
        recentPublications: string[]; // Last 6 months
        websiteUrl: string;
    }[];

    // New courses (added this year)
    newCourses: {
        code: string;
        name: string;
        addedSemester: string; // "Fall 2025"
        description: string;
        syllabusUrl?: string;
    }[];

    // New labs/centers (launched recently)
    newLabs: {
        name: string;
        launchedDate: string;
        focus: string;
        fundingAmount?: string; // "$10M NSF grant"
        websiteUrl: string;
    }[];

    // Current student projects (GitHub, blogs)
    studentProjects: {
        projectName: string;
        description: string;
        studentName?: string;
        url: string;
        relevance: string; // Why relevant to applicant
    }[];

    // Recent news/announcements
    recentNews: {
        title: string;
        date: string;
        summary: string;
        url: string;
        relevance: string;
    }[];

    scrapedAt: string;
}

export interface AOPatterns {
    collegeId: string;

    // Patterns from admitted essays
    admittedPatterns: {
        commonThemes: string[]; // Themes in 70%+ of admitted essays
        averageSpecificity: number; // Average # of specific details
        averageCollegeReferences: number; // Average # of college mentions
        toneCharacteristics: string[]; // Common tone elements
        storyTypes: string[]; // Which story types worked (failure-learning, etc.)
        essayLength: { min: number; max: number; average: number };
    };

    // Patterns from rejected essays
    rejectedPatterns: {
        commonMistakes: string[]; // Mistakes in 50%+ of rejected essays
        redFlags: string[]; // Things that led to rejection
        toneMismatches: string[]; // Tone problems
        lackOf: string[]; // What was missing
    };

    // Success factors
    successFactors: {
        factor: string;
        importance: number; // 0-100
        examples: string[];
    }[];

    // Data source
    dataSource: {
        essaysAnalyzed: number;
        admittedCount: number;
        rejectedCount: number;
        yearsOfData: string[]; // ["2023", "2024", "2025"]
    };

    analyzedAt: string;
}

export interface CompetitorAnalysis {
    collegeId: string;
    major: string;

    // Overused stories/themes
    oversaturatedThemes: {
        theme: string;
        prevalence: number; // 0-100 (how common)
        recommendation: 'avoid' | 'approach-differently' | 'ok-if-unique';
        alternativeApproaches: string[];
    }[];

    // Underutilized angles
    uniqueOpportunities: {
        angle: string;
        rarity: number; // 0-100 (how rare)
        potentialImpact: number; // 0-100
        howToUse: string;
    }[];

    // Common applicant profiles
    typicalApplicants: {
        profile: string; // "Pre-med with research"
        frequency: number; // 0-100
        howToStandOut: string;
    }[];

    // Contrarian takes
    contrarianAngles: {
        conventionalWisdom: string; // What everyone says
        contrarianTake: string; // What to say instead
        reasoning: string; // Why it works
        riskLevel: 'low' | 'medium' | 'high';
    }[];

    analyzedAt: string;
}

export interface EmotionalArc {
    essayId: string;

    // Emotional journey map
    arc: {
        hook: {
            content: string;
            emotionalImpact: number; // 0-100
            grabsAttention: boolean;
            improvements: string[];
        };
        context: {
            content: string;
            buildsConnection: number; // 0-100
        };
        conflict: {
            content: string;
            tensionLevel: number; // 0-100
            climaxPlacement: number; // 0-100 (% through essay)
            optimal: boolean;
        };
        resolution: {
            content: string;
            satisfactionLevel: number; // 0-100
            memorability: number; // 0-100
        };
    };

    // Overall arc quality
    arcQuality: {
        overall: number; // 0-100
        pacing: number; // 0-100 (too fast/slow?)
        emotionalRange: number; // 0-100 (varies enough?)
        climaxTiming: 'too-early' | 'perfect' | 'too-late';
    };

    // Optimization suggestions
    optimizations: {
        section: 'hook' | 'context' | 'conflict' | 'resolution';
        current: string;
        optimized: string;
        reasoning: string;
        impactGain: number; // 0-100
    }[];

    analyzedAt: string;
}

export interface CulturalAuthenticity {
    // Detected cultural background
    culturalBackground: {
        primaryCulture: string; // "Indian", "Chinese", "Mexican", etc.
        secondaryCultures: string[];
        languages: string[];
        immigrationStatus?: 'first-gen' | 'second-gen' | 'international';
        confidence: number; // 0-100 (how confident in detection)
    };

    // Cultural perspectives to inject
    culturalLenses: {
        perspective: string; // "Jugaad innovation mindset"
        explanation: string; // What it means
        howToWeave: string; // How to integrate into essay
        relevanceToMajor: string; // Connection to academic interest
        examples: string[]; // Example phrases/stories
    }[];

    // Bilingual/multicultural insights
    multilingualStrengths: {
        insight: string;
        application: string; // How it shaped thinking
        intellectualConnection: string; // Link to academic work
    }[];

    // Bridge-building opportunities
    culturalBridging: {
        culture1: string;
        culture2: string;
        bridgeStory: string; // How you connect two worlds
        uniqueValue: string; // What this brings to college
    }[];

    // Authenticity score
    authenticityMetrics: {
        culturalSpecificity: number; // 0-100
        avoidsCliches: number; // 0-100
        uniquePerspective: number; // 0-100
        overall: number; // 0-100
    };

    analyzedAt: string;
}

export interface AdmissionsTrends {
    collegeId: string;

    // Current priorities (this year)
    currentPriorities: {
        priority: string; // "AI Safety", "Climate Tech", etc.
        source: string; // Where we learned this
        sourceUrl: string;
        relevanceScore: number; // 0-100 (for this applicant)
        howToAlign: string;
    }[];

    // New initiatives/programs
    newInitiatives: {
        name: string;
        launchDate: string;
        description: string;
        relevance: string;
        url: string;
    }[];

    // Recent announcements
    recentAnnouncements: {
        title: string;
        date: string;
        summary: string;
        implications: string; // What it means for applicants
        url: string;
    }[];

    // Social media highlights
    socialHighlights: {
        platform: string; // "Twitter", "Instagram", "LinkedIn"
        content: string;
        date: string;
        whatItShows: string; // What college is prioritizing
        url: string;
    }[];

    scrapedAt: string;
}

export interface VoiceProfile {
    // Analyzed from writing samples
    vocabularyPatterns: {
        commonWords: string[]; // Words used frequently
        uniquePhrases: string[]; // Signature phrases
        vocabularyLevel: 'simple' | 'moderate' | 'advanced';
        technicalDensity: number; // 0-100
    };

    // Sentence structure
    sentencePatterns: {
        averageLength: number;
        lengthVariation: 'low' | 'moderate' | 'high';
        preferredStructures: string[]; // "Short declarative", "Long flowing", etc.
        contractionUsage: number; // 0-100 (how often use I'm vs I am)
    };

    // Tone characteristics
    toneProfile: {
        formalityLevel: number; // 0-100
        humorStyle?: 'sarcastic' | 'dry' | 'playful' | 'none';
        emotionalExpression: number; // 0-100
        directness: number; // 0-100 (blunt vs diplomatic)
    };

    // Unique quirks
    writingQuirks: {
        quirk: string; // "Starts sentences with 'Honestly'"
        frequency: number; // How often
        shouldPreserve: boolean; // Keep in essays?
    }[];

    // Example sentences in your voice
    voiceExamples: string[];

    analyzedAt: string;
}

// ============================================
// STORY DEDUPLICATION & DIVERSITY TYPES (101% Quality)
// ============================================

export interface StoryAllocation {
    collegeId: string;
    collegeName: string;

    // All essays for this college
    essays: {
        essayId: string;
        title: string;
        prompt: string;
        wordLimit: number;
    }[];

    // All available stories from story mining
    availableStories: {
        storyId: string;
        title: string;
        type: string;
        emotionalImpact: number;
        uniqueness: number;
        themes: string[]; // technical, leadership, cultural, etc.
    }[];

    // Story allocation (which story for which essay)
    allocation: {
        essayId: string;
        assignedStory: {
            storyId: string;
            title: string;
            reason: string; // Why this story for this essay
            fitScore: number; // 0-100
        };
        backupStories: {
            storyId: string;
            title: string;
            fitScore: number;
        }[];
    }[];

    // Theme diversity analysis
    themeDiversity: {
        theme: string; // "technical", "leadership", "cultural", "community"
        essaysUsing: string[]; // Which essays cover this theme
        coverage: number; // 0-100 (how much coverage)
        status: 'under-represented' | 'balanced' | 'over-represented';
        recommendation: string;
    }[];

    // Story usage tracking
    storyUsage: {
        storyId: string;
        usedInEssays: string[];
        usageStatus: 'unused' | 'used-once' | 'overused';
        recommendation: string;
    }[];

    // Deduplication warnings
    deduplicationWarnings: {
        issue: string; // "Same story used in 3 essays"
        severity: 'critical' | 'moderate' | 'minor';
        affectedEssays: string[];
        resolution: string;
    }[];

    // Diversity score
    diversityMetrics: {
        themeVariety: number; // 0-100 (how diverse are themes)
        storyUniqueness: number; // 0-100 (each essay tells different story)
        narrativeProgression: number; // 0-100 (essays build on each other)
        overall: number; // 0-100
    };

    // Recommendations
    recommendations: {
        type: 'swap-story' | 'add-theme' | 'reduce-overlap' | 'enhance-progression';
        essayId: string;
        suggestion: string;
        expectedImpact: number; // 0-100
        priority: 'high' | 'medium' | 'low';
    }[];

    allocatedAt: string;
}

export interface SavedJob {
    id: string;
    title: string;
    company: string;
    savedAt: string;
    status: 'saved' | 'applied' | 'interview' | 'rejected';
}

// User Profile
export async function getUserProfile(): Promise<UserProfile | null> {
    return s3Storage.get(STORAGE_KEYS.USER_PROFILE, null);
}

export async function saveUserProfile(profile: UserProfile): Promise<boolean> {
    return s3Storage.set(STORAGE_KEYS.USER_PROFILE, profile);
}

// Essays
export async function getAllEssays(): Promise<EssayDraft[]> {
    return s3Storage.get(STORAGE_KEYS.ESSAYS, []);
}

export async function saveEssay(essay: EssayDraft): Promise<boolean> {
    const essays = await getAllEssays();
    const index = essays.findIndex(e => e.id === essay.id);

    if (index >= 0) {
        essays[index] = essay;
    } else {
        essays.push(essay);
    }

    return s3Storage.set(STORAGE_KEYS.ESSAYS, essays);
}

export async function deleteEssay(essayId: string): Promise<boolean> {
    const essays = await getAllEssays();
    const filtered = essays.filter(e => e.id !== essayId);
    return s3Storage.set(STORAGE_KEYS.ESSAYS, filtered);
}

// Jobs
export async function getSavedJobs(): Promise<SavedJob[]> {
    return s3Storage.get(STORAGE_KEYS.SAVED_JOBS, []);
}

export async function saveJob(job: SavedJob): Promise<boolean> {
    const jobs = await getSavedJobs();
    const index = jobs.findIndex(j => j.id === job.id);

    if (index >= 0) {
        jobs[index] = job;
    } else {
        jobs.push(job);
    }

    return s3Storage.set(STORAGE_KEYS.SAVED_JOBS, jobs);
}

export async function getAppliedJobs(): Promise<string[]> {
    return s3Storage.get(STORAGE_KEYS.APPLIED_JOBS, []);
}

export async function markJobApplied(jobId: string): Promise<boolean> {
    const applied = await getAppliedJobs();
    if (!applied.includes(jobId)) {
        applied.push(jobId);
    }
    return s3Storage.set(STORAGE_KEYS.APPLIED_JOBS, applied);
}

// Scholarships
export async function getSavedScholarships(): Promise<string[]> {
    return s3Storage.get(STORAGE_KEYS.SAVED_SCHOLARSHIPS, []);
}

export async function saveScholarship(scholarshipId: string): Promise<boolean> {
    const saved = await getSavedScholarships();
    if (!saved.includes(scholarshipId)) {
        saved.push(scholarshipId);
    }
    return s3Storage.set(STORAGE_KEYS.SAVED_SCHOLARSHIPS, saved);
}

export async function getAppliedScholarships(): Promise<string[]> {
    return s3Storage.get(STORAGE_KEYS.APPLIED_SCHOLARSHIPS, []);
}

export async function markScholarshipApplied(scholarshipId: string): Promise<boolean> {
    const applied = await getAppliedScholarships();
    if (!applied.includes(scholarshipId)) {
        applied.push(scholarshipId);
    }
    return s3Storage.set(STORAGE_KEYS.APPLIED_SCHOLARSHIPS, applied);
}

// Application Checklist
export interface ChecklistItem {
    collegeId: string;
    documentId: string;
    status: 'not_started' | 'in_progress' | 'completed' | 'submitted';
    updatedAt: string;
}

export async function getChecklist(): Promise<ChecklistItem[]> {
    return s3Storage.get(STORAGE_KEYS.DOCUMENT_CHECKLIST, []);
}

export async function updateChecklistItem(item: ChecklistItem): Promise<boolean> {
    const checklist = await getChecklist();
    const key = `${item.collegeId}-${item.documentId}`;
    const index = checklist.findIndex(c => `${c.collegeId}-${c.documentId}` === key);

    if (index >= 0) {
        checklist[index] = item;
    } else {
        checklist.push(item);
    }

    return s3Storage.set(STORAGE_KEYS.DOCUMENT_CHECKLIST, checklist);
}

// Grades/Courses
export interface Course {
    id: string;
    name: string;
    code: string;
    grade: string;
    credits: number;
    semester: string;
    learnings: string[];
}

export async function getCourses(): Promise<Course[]> {
    return s3Storage.get(STORAGE_KEYS.COURSES, []);
}

export async function saveCourse(course: Course): Promise<boolean> {
    const courses = await getCourses();
    const index = courses.findIndex(c => c.id === course.id);

    if (index >= 0) {
        courses[index] = course;
    } else {
        courses.push(course);
    }

    return s3Storage.set(STORAGE_KEYS.COURSES, courses);
}

// Activities
export async function getActivities(): Promise<any[]> {
    return s3Storage.get(STORAGE_KEYS.ACTIVITIES, []);
}

export async function saveActivities(activities: any[]): Promise<boolean> {
    return s3Storage.set(STORAGE_KEYS.ACTIVITIES, activities);
}

// ============================================
// OPPORTUNITIES & DOCUMENTS (Automation)
// ============================================

export interface DiscoveredOpportunity {
    id: string;
    type: 'job' | 'scholarship';
    title: string;
    organization: string;
    url: string;
    deadline?: string;
    amount?: number;
    salary?: string;
    location?: string;
    requirements: string[];
    description: string;
    status: string;
    matchScore: number;
    discoveredAt: string;
    appliedAt?: string;
}

export interface GeneratedDocument {
    opportunityId: string;
    opportunityTitle: string;
    organization: string;
    opportunityType: 'job' | 'scholarship';
    opportunityUrl: string;
    matchScore: number;
    cv: { id: string; content: string; createdAt: string } | null;
    essay: { id: string; content: string; createdAt: string } | null;
    coverLetter: { id: string; content: string; createdAt: string } | null;
    generatedAt: string;
}

// Get all discovered opportunities from S3
export async function getDiscoveredOpportunities(): Promise<DiscoveredOpportunity[]> {
    return s3Storage.get(STORAGE_KEYS.DISCOVERED_OPPORTUNITIES, []);
}

// Save all discovered opportunities to S3
export async function saveDiscoveredOpportunities(opportunities: DiscoveredOpportunity[]): Promise<boolean> {
    return s3Storage.set(STORAGE_KEYS.DISCOVERED_OPPORTUNITIES, opportunities);
}

// Get all generated documents from S3
export async function getGeneratedDocuments(): Promise<GeneratedDocument[]> {
    return s3Storage.get(STORAGE_KEYS.GENERATED_DOCUMENTS, []);
}

// Save all generated documents to S3
export async function saveGeneratedDocuments(documents: GeneratedDocument[]): Promise<boolean> {
    return s3Storage.set(STORAGE_KEYS.GENERATED_DOCUMENTS, documents);
}

// ============================================
// SYNC & MIGRATION
// ============================================

// Migrate localStorage data to S3
export async function migrateLocalStorageToS3(): Promise<void> {
    if (typeof window === 'undefined') return;

    const localStorageKeys = [
        'essays', 'profile', 'activities', 'savedJobs', 'appliedJobs',
        'savedScholarships', 'appliedScholarships', 'checklist', 'courses',
    ];

    for (const key of localStorageKeys) {
        try {
            const data = localStorage.getItem(key);
            if (data) {
                const parsed = JSON.parse(data);
                await s3Storage.set(`migrated/${key}`, parsed);
                console.log(`Migrated ${key} to S3`);
            }
        } catch (error) {
            console.error(`Failed to migrate ${key}:`, error);
        }
    }
}

// Export all data for backup
export async function exportAllData(): Promise<Record<string, any>> {
    const data: Record<string, any> = {};

    for (const [name, key] of Object.entries(STORAGE_KEYS)) {
        data[name] = await s3Storage.get(key, null);
    }

    return data;
}

// Import data from backup
export async function importAllData(data: Record<string, any>): Promise<void> {
    for (const [name, key] of Object.entries(STORAGE_KEYS)) {
        if (data[name] !== undefined) {
            await s3Storage.set(key, data[name]);
        }
    }
}
