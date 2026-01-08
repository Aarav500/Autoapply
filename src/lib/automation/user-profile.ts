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

    // Links
    linkedIn: string;
    github?: string;
    portfolio?: string;
    personalWebsite?: string;

    // Documents (paths to files)
    resumePath?: string;
    coverLetterPath?: string;
    transcriptPath?: string;

    // Essay answers (pre-written for common prompts)
    essayAnswers: {
        whyThisSchool?: string;
        careerGoals?: string;
        biggestChallenge?: string;
        leadershipExperience?: string;
        communityService?: string;
    };
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
