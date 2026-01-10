// ============================================
// USER PROFILE - Complete Schema
// Used by Universal Form Filler to auto-fill any form
// ============================================

export interface WorkExperience {
    company: string;
    role: string;
    startDate: string;
    endDate: string;
    description: string;
    current: boolean;
}

export interface Education {
    school: string;
    degree: string;
    major: string;
    gpa: number;
    graduationYear: number;
    graduationMonth: string;
}

export interface UserProfile {
    // Personal
    firstName: string;
    lastName: string;
    fullName: string;
    email: string;
    phone: string;
    dateOfBirth: string;

    // Address
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;

    // Education (primary)
    school: string;
    major: string;
    gpa: number;
    graduationYear: number;
    graduationMonth: string;
    degree: string;

    // All education history
    educationHistory: Education[];

    // Demographics (optional - for diversity scholarships)
    citizenship: string;
    ethnicity?: string;
    gender?: string;
    veteranStatus?: string;
    disabilityStatus?: string;

    // Work Experience
    workExperience: WorkExperience[];

    // Skills
    skills: string[];
    languages: string[];

    // Skills with proficiency levels
    skillsTaxonomy?: SkillWithProficiency[];

    // Links
    linkedIn: string;
    github?: string;
    portfolio?: string;
    personalWebsite?: string;

    // Documents (paths to files)
    resumePath?: string;
    coverLetterPath?: string;
    transcriptPath?: string;

    // Document vault (user-controlled uploads)
    documentVault?: DocumentVault;

    // Essay answers (pre-written for common prompts)
    essayAnswers: {
        whyThisSchool?: string;
        careerGoals?: string;
        biggestChallenge?: string;
        leadershipExperience?: string;
        communityService?: string;
    };

    // Job/Opportunity Preferences
    preferences?: UserJobPreferences;

    // Constraints (for eligibility matching)
    constraints?: UserEligibilityConstraints;

    // Availability
    availability?: UserAvailability;

    // Activities (projects, volunteering, clubs)
    activities?: Activity[];

    // Achievements (awards, honors, publications)
    achievements?: Achievement[];
}

// ============================================
// NEW TYPES FOR ENHANCED MATCHING
// ============================================

export interface SkillWithProficiency {
    skill: string;
    proficiency: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    yearsOfExperience?: number;
}

export interface DocumentVault {
    transcripts?: { name: string; path: string; uploadedAt: string }[];
    certificates?: { name: string; path: string; uploadedAt: string }[];
    recommendationLetters?: { name: string; recommenderName: string; path: string; uploadedAt: string }[];
    idDocuments?: { name: string; path: string; uploadedAt: string }[];
    portfolioItems?: { name: string; path: string; type: string; uploadedAt: string }[];
}

export interface UserJobPreferences {
    // Job preferences
    desiredRoles: string[];
    desiredIndustries: string[];
    desiredLocations: string[];
    remotePreference: 'remote' | 'hybrid' | 'onsite' | 'any';
    salaryExpectations?: {
        min: number;
        currency: string;
        period: 'hourly' | 'monthly' | 'yearly';
    };
    employmentTypes: ('internship' | 'full-time' | 'part-time' | 'contract')[];

    // Work authorization
    workAuthorization: {
        hasUSWorkAuth: boolean;
        needsVisaSponsorship: boolean;
        citizenship: string;
        visaType?: string;
    };
}

export interface UserEligibilityConstraints {
    citizenship: string;
    residency?: string;
    isTransferStudent: boolean;
    isFirstGen: boolean;
    isLowIncome: boolean;
    hasDisability?: boolean;
    isVeteran?: boolean;
    age?: number;
}

export interface UserAvailability {
    earliestStartDate?: string;
    hoursPerWeek?: number;
    availableForFullTime: boolean;
    availableForPartTime: boolean;
    summerOnly?: boolean;
}

export interface Activity {
    id: string;
    name: string;
    type: 'project' | 'volunteering' | 'club' | 'research' | 'work' | 'other';
    organization?: string;
    role?: string;
    startDate: string;
    endDate?: string;
    current: boolean;
    description: string;
    achievements?: string[];
    skills?: string[];
}

export interface Achievement {
    id: string;
    title: string;
    type: 'award' | 'honor' | 'publication' | 'competition' | 'certification' | 'other';
    issuer?: string;
    date: string;
    description?: string;
    url?: string;
}



// Default profile for Aarav Shah
export const DEFAULT_PROFILE: UserProfile = {
    // Personal
    firstName: 'Aarav',
    lastName: 'Shah',
    fullName: 'Aarav Shah',
    email: 'ashah264@ucr.edu',
    phone: '+19509062964',
    dateOfBirth: '2004-01-15', // Placeholder

    // Address
    address: '',
    city: 'Riverside',
    state: 'California',
    zipCode: '92521',
    country: 'United States',

    // Education
    school: 'University of California, Riverside',
    major: 'Computer Science',
    gpa: 3.9,
    graduationYear: 2026,
    graduationMonth: 'June',
    degree: 'Bachelor of Science',

    educationHistory: [
        {
            school: 'University of California, Riverside',
            degree: 'Bachelor of Science',
            major: 'Computer Science',
            gpa: 3.9,
            graduationYear: 2026,
            graduationMonth: 'June',
        }
    ],

    // Demographics
    citizenship: 'India',
    ethnicity: 'Asian',
    gender: 'Male',

    // Work Experience
    workExperience: [],

    // Skills
    skills: [
        'Python', 'JavaScript', 'TypeScript', 'React', 'Next.js',
        'Node.js', 'SQL', 'Machine Learning', 'AWS', 'Docker',
        'Git', 'REST APIs', 'Data Structures', 'Algorithms'
    ],
    languages: ['English', 'Hindi', 'Gujarati'],

    // Links
    linkedIn: 'https://www.linkedin.com/in/aarav-shah-9b878329a/',
    github: 'https://github.com/ashah264',

    // Essay answers
    essayAnswers: {},
};

// Field mapping patterns - used by AI to match form fields
export const FIELD_PATTERNS: Record<string, string[]> = {
    firstName: ['first name', 'fname', 'given name', 'first', 'forename'],
    lastName: ['last name', 'lname', 'surname', 'family name', 'last'],
    fullName: ['full name', 'name', 'your name', 'legal name'],
    email: ['email', 'e-mail', 'email address', 'mail'],
    phone: ['phone', 'mobile', 'telephone', 'tel', 'cell', 'phone number', 'contact number'],
    dateOfBirth: ['date of birth', 'dob', 'birthday', 'birth date', 'birthdate'],

    address: ['address', 'street', 'street address', 'address line'],
    city: ['city', 'town'],
    state: ['state', 'province', 'region'],
    zipCode: ['zip', 'zip code', 'postal', 'postal code', 'zipcode'],
    country: ['country', 'nation'],

    school: ['school', 'university', 'college', 'institution', 'school name'],
    major: ['major', 'field of study', 'concentration', 'program', 'degree program'],
    gpa: ['gpa', 'grade point', 'grade point average', 'cumulative gpa'],
    graduationYear: ['graduation year', 'grad year', 'expected graduation', 'year of graduation', 'graduation'],
    degree: ['degree', 'degree type', 'degree level'],

    citizenship: ['citizenship', 'nationality', 'citizen of'],
    ethnicity: ['ethnicity', 'race', 'ethnic background'],
    gender: ['gender', 'sex'],

    linkedIn: ['linkedin', 'linked in', 'linkedin url', 'linkedin profile'],
    github: ['github', 'github url', 'github profile'],
    portfolio: ['portfolio', 'portfolio url', 'website', 'personal website'],

    resumePath: ['resume', 'cv', 'curriculum vitae', 'upload resume', 'attach resume'],
    coverLetterPath: ['cover letter', 'cover'],
    transcriptPath: ['transcript', 'academic record'],
};

// ============================================
// PROFILE BUILDER
// Connects to the main storage.ts to get real user data
// ============================================

import { profileStorage, activityStorage, Activity as StorageActivity, UserProfile as StorageProfile } from '../storage';

export function buildFullProfile(): UserProfile {
    // Start with default as base
    const fullProfile = { ...DEFAULT_PROFILE };

    // 1. Try to load Profile from storage
    if (typeof window !== 'undefined') {
        try {
            const storedProfile = profileStorage.loadProfile();
            if (storedProfile) {
                // Map stored profile to our expanded UserProfile
                fullProfile.fullName = storedProfile.name || fullProfile.fullName;
                fullProfile.firstName = storedProfile.name ? storedProfile.name.split(' ')[0] : fullProfile.firstName;
                fullProfile.lastName = storedProfile.name ? storedProfile.name.split(' ').slice(1).join(' ') : fullProfile.lastName;
                fullProfile.major = storedProfile.major || fullProfile.major;
                fullProfile.school = storedProfile.currentSchool || fullProfile.school;
                fullProfile.gpa = storedProfile.gpa || fullProfile.gpa;
                fullProfile.graduationYear = storedProfile.graduationYear || fullProfile.graduationYear;

                if (storedProfile.interests && storedProfile.interests.length > 0) {
                    // Add interests to skills if not present
                    const newSkills = storedProfile.interests.filter(i => !fullProfile.skills.includes(i));
                    fullProfile.skills = [...fullProfile.skills, ...newSkills];
                }
            }

            // 2. Load Activities
            const storedActivities = activityStorage.loadActivities();
            if (storedActivities && storedActivities.length > 0) {
                fullProfile.activities = storedActivities.map(a => ({
                    id: a.id,
                    name: a.name,
                    description: a.description,
                    type: 'other', // Default fallback
                    startDate: '2023-01-01', // Placeholder as storage.ts doesn't have dates yet
                    current: true,
                    role: 'Member',
                    skills: a.skills
                }));

                // Heuristic: If activity name contains "Club", "Society", mark as club
                // If "Project", "App", mark as project
                fullProfile.activities.forEach(a => {
                    const lowerName = a.name.toLowerCase();
                    if (lowerName.includes('club') || lowerName.includes('society')) a.type = 'club';
                    else if (lowerName.includes('project') || lowerName.includes('app')) a.type = 'project';
                    else if (lowerName.includes('volunteer')) a.type = 'volunteering';
                });
            }

        } catch (e) {
            console.warn('Failed to load user profile from storage, using default', e);
        }
    }

    return fullProfile;
}
