// ============================================
// ALL JOB PLATFORMS - MAXIMUM COVERAGE
// Every platform possible for job search
// ============================================

import { Job, SearchFilters } from './job-platforms';

// ============================================
// ALL SUPPORTED PLATFORMS
// ============================================

export const ALL_JOB_PLATFORMS = {
    // UNIVERSITY PORTALS
    handshake: {
        name: 'Handshake',
        icon: '🎓',
        url: 'https://joinhandshake.com',
        type: 'university',
        autoApply: true,
        forInternships: true,
        description: 'College career portal - UCR, UCLA, Berkeley, etc.',
    },

    // MAJOR JOB BOARDS
    linkedin: {
        name: 'LinkedIn',
        icon: '💼',
        url: 'https://linkedin.com/jobs',
        type: 'job_board',
        autoApply: true, // Easy Apply only
        forInternships: true,
        description: 'Largest professional network',
    },
    indeed: {
        name: 'Indeed',
        icon: '📋',
        url: 'https://indeed.com',
        type: 'job_board',
        autoApply: true, // Indeed Apply
        forInternships: true,
        description: 'Largest job aggregator',
    },
    glassdoor: {
        name: 'Glassdoor',
        icon: '🏢',
        url: 'https://glassdoor.com',
        type: 'job_board',
        autoApply: false,
        forInternships: true,
        description: 'Jobs + company reviews',
    },
    ziprecruiter: {
        name: 'ZipRecruiter',
        icon: '⚡',
        url: 'https://ziprecruiter.com',
        type: 'job_board',
        autoApply: true,
        forInternships: true,
        description: 'AI-powered job matching',
    },
    monster: {
        name: 'Monster',
        icon: '👾',
        url: 'https://monster.com',
        type: 'job_board',
        autoApply: false,
        forInternships: true,
        description: 'Classic job board',
    },
    careerbuilder: {
        name: 'CareerBuilder',
        icon: '🏗️',
        url: 'https://careerbuilder.com',
        type: 'job_board',
        autoApply: false,
        forInternships: true,
        description: 'Employment screening company',
    },

    // TECH-SPECIFIC
    levels_fyi: {
        name: 'Levels.fyi',
        icon: '📊',
        url: 'https://levels.fyi/internships',
        type: 'tech',
        autoApply: false,
        forInternships: true,
        description: 'Tech compensation data + jobs',
    },
    wellfound: {
        name: 'Wellfound (AngelList)',
        icon: '😇',
        url: 'https://wellfound.com',
        type: 'startup',
        autoApply: true,
        forInternships: true,
        description: 'Startup jobs',
    },
    ycombinator: {
        name: 'Y Combinator Jobs',
        icon: '🚀',
        url: 'https://www.workatastartup.com',
        type: 'startup',
        autoApply: false,
        forInternships: true,
        description: 'YC-backed company jobs',
    },
    builtin: {
        name: 'Built In',
        icon: '🏙️',
        url: 'https://builtin.com',
        type: 'tech',
        autoApply: false,
        forInternships: true,
        description: 'Tech jobs by city',
    },
    dice: {
        name: 'Dice',
        icon: '🎲',
        url: 'https://dice.com',
        type: 'tech',
        autoApply: false,
        forInternships: true,
        description: 'Tech-focused job board',
    },
    stackoverflow: {
        name: 'Stack Overflow Jobs',
        icon: '📚',
        url: 'https://stackoverflow.com/jobs',
        type: 'tech',
        autoApply: false,
        forInternships: true,
        description: 'Developer jobs',
    },

    // AGGREGATORS
    google_jobs: {
        name: 'Google Jobs',
        icon: '🔍',
        url: 'https://google.com/search?q=jobs',
        type: 'aggregator',
        autoApply: false,
        forInternships: true,
        description: 'Aggregates from all sources',
    },
    adzuna: {
        name: 'Adzuna',
        icon: '🔎',
        url: 'https://adzuna.com',
        type: 'aggregator',
        autoApply: false,
        forInternships: true,
        description: 'Job aggregator with salary data',
    },
    jooble: {
        name: 'Jooble',
        icon: '🌐',
        url: 'https://jooble.org',
        type: 'aggregator',
        autoApply: false,
        forInternships: true,
        description: 'Global job aggregator',
    },

    // INTERNSHIP SPECIFIC
    internships_com: {
        name: 'Internships.com',
        icon: '📖',
        url: 'https://internships.com',
        type: 'internship',
        autoApply: false,
        forInternships: true,
        description: 'Internship-focused platform',
    },
    wayup: {
        name: 'WayUp',
        icon: '⬆️',
        url: 'https://wayup.com',
        type: 'internship',
        autoApply: true,
        forInternships: true,
        description: 'Early-career jobs',
    },
    ripplematch: {
        name: 'RippleMatch',
        icon: '🌊',
        url: 'https://ripplematch.com',
        type: 'internship',
        autoApply: true,
        forInternships: true,
        description: 'AI-matched internships',
    },
    simplyhired: {
        name: 'SimplyHired',
        icon: '💡',
        url: 'https://simplyhired.com',
        type: 'job_board',
        autoApply: false,
        forInternships: true,
        description: 'Job search engine',
    },

    // BIG TECH DIRECT
    google_careers: {
        name: 'Google Careers',
        icon: '🔵',
        url: 'https://careers.google.com',
        type: 'company',
        autoApply: false,
        forInternships: true,
        description: 'Google/Alphabet jobs',
    },
    meta_careers: {
        name: 'Meta Careers',
        icon: '📘',
        url: 'https://metacareers.com',
        type: 'company',
        autoApply: false,
        forInternships: true,
        description: 'Meta/Facebook jobs',
    },
    amazon_jobs: {
        name: 'Amazon Jobs',
        icon: '📦',
        url: 'https://amazon.jobs',
        type: 'company',
        autoApply: false,
        forInternships: true,
        description: 'Amazon/AWS jobs',
    },
    microsoft_careers: {
        name: 'Microsoft Careers',
        icon: '🪟',
        url: 'https://careers.microsoft.com',
        type: 'company',
        autoApply: false,
        forInternships: true,
        description: 'Microsoft jobs',
    },
    apple_jobs: {
        name: 'Apple Jobs',
        icon: '🍎',
        url: 'https://jobs.apple.com',
        type: 'company',
        autoApply: false,
        forInternships: true,
        description: 'Apple jobs',
    },
    netflix_jobs: {
        name: 'Netflix Jobs',
        icon: '🎬',
        url: 'https://jobs.netflix.com',
        type: 'company',
        autoApply: false,
        forInternships: true,
        description: 'Netflix jobs',
    },
    nvidia_careers: {
        name: 'NVIDIA Careers',
        icon: '💚',
        url: 'https://nvidia.wd5.myworkdayjobs.com',
        type: 'company',
        autoApply: false,
        forInternships: true,
        description: 'NVIDIA GPU/AI jobs',
    },
    tesla_careers: {
        name: 'Tesla Careers',
        icon: '🚗',
        url: 'https://tesla.com/careers',
        type: 'company',
        autoApply: false,
        forInternships: false, // Requires US citizenship usually
        description: 'Tesla/SpaceX jobs',
    },
    stripe_careers: {
        name: 'Stripe Careers',
        icon: '💳',
        url: 'https://stripe.com/jobs',
        type: 'company',
        autoApply: false,
        forInternships: true,
        description: 'Stripe fintech jobs',
    },
    openai_careers: {
        name: 'OpenAI Careers',
        icon: '🤖',
        url: 'https://openai.com/careers',
        type: 'company',
        autoApply: false,
        forInternships: true,
        description: 'OpenAI AI research jobs',
    },
    anthropic_careers: {
        name: 'Anthropic Careers',
        icon: '🧠',
        url: 'https://anthropic.com/careers',
        type: 'company',
        autoApply: false,
        forInternships: true,
        description: 'Anthropic AI safety jobs',
    },

    // ATS PLATFORMS (These host jobs for many companies)
    greenhouse: {
        name: 'Greenhouse Jobs',
        icon: '🌱',
        url: 'https://boards.greenhouse.io',
        type: 'ats',
        autoApply: false,
        forInternships: true,
        description: 'ATS used by 1000s of tech companies',
    },
    lever: {
        name: 'Lever Jobs',
        icon: '⚡',
        url: 'https://jobs.lever.co',
        type: 'ats',
        autoApply: false,
        forInternships: true,
        description: 'ATS used by startups',
    },
    workday: {
        name: 'Workday Jobs',
        icon: '☀️',
        url: 'https://myworkdayjobs.com',
        type: 'ats',
        autoApply: false,
        forInternships: true,
        description: 'ATS used by enterprises',
    },
    icims: {
        name: 'iCIMS Jobs',
        icon: '💼',
        url: 'https://careers-icims.icims.com',
        type: 'ats',
        autoApply: false,
        forInternships: true,
        description: 'Enterprise ATS',
    },

    // INTERNATIONAL
    nus_talentconnect: {
        name: 'NUS TalentConnect',
        icon: '🇸🇬',
        url: 'https://nus.edu.sg/cfg',
        type: 'university',
        autoApply: false,
        forInternships: true,
        description: 'Singapore NUS jobs',
    },

    // FREELANCE/CONTRACT (for side income)
    upwork: {
        name: 'Upwork',
        icon: '💻',
        url: 'https://upwork.com',
        type: 'freelance',
        autoApply: true,
        forInternships: false,
        description: 'Freelance tech jobs',
    },
    toptal: {
        name: 'Toptal',
        icon: '🔝',
        url: 'https://toptal.com',
        type: 'freelance',
        autoApply: false,
        forInternships: false,
        description: 'Elite freelance network',
    },
} as const;

export type AllPlatformId = keyof typeof ALL_JOB_PLATFORMS;

// ============================================
// PLATFORM CATEGORIES
// ============================================

export const PLATFORM_CATEGORIES = {
    university: {
        name: 'University Portals',
        description: 'Your school career services',
        platforms: ['handshake'],
    },
    job_board: {
        name: 'Job Boards',
        description: 'Major job posting sites',
        platforms: ['linkedin', 'indeed', 'glassdoor', 'ziprecruiter', 'monster', 'careerbuilder'],
    },
    tech: {
        name: 'Tech-Specific',
        description: 'Technology industry focused',
        platforms: ['levels_fyi', 'builtin', 'dice', 'stackoverflow'],
    },
    startup: {
        name: 'Startups',
        description: 'Startup and early-stage companies',
        platforms: ['wellfound', 'ycombinator'],
    },
    aggregator: {
        name: 'Aggregators',
        description: 'Search across multiple sources',
        platforms: ['google_jobs', 'adzuna', 'jooble'],
    },
    internship: {
        name: 'Internship-Focused',
        description: 'Internships and early career',
        platforms: ['internships_com', 'wayup', 'ripplematch', 'simplyhired'],
    },
    company: {
        name: 'Big Tech Direct',
        description: 'Apply directly to top companies',
        platforms: ['google_careers', 'meta_careers', 'amazon_jobs', 'microsoft_careers',
            'apple_jobs', 'netflix_jobs', 'nvidia_careers', 'stripe_careers',
            'openai_careers', 'anthropic_careers'],
    },
    ats: {
        name: 'ATS Platforms',
        description: 'Applicant tracking systems hosting many companies',
        platforms: ['greenhouse', 'lever', 'workday', 'icims'],
    },
} as const;

// ============================================
// DEFAULT CONFIGURATION
// ============================================

export const DEFAULT_ENABLED_PLATFORMS: AllPlatformId[] = [
    'handshake',
    'linkedin',
    'indeed',
    'google_jobs',
    'levels_fyi',
    'wellfound',
    'ripplematch',
    'google_careers',
    'meta_careers',
    'amazon_jobs',
    'microsoft_careers',
    'openai_careers',
    'anthropic_careers',
    'greenhouse',
    'lever',
];

// Platforms that sponsor visas (verified)
export const VISA_FRIENDLY_COMPANIES = [
    'google_careers',
    'meta_careers',
    'amazon_jobs',
    'microsoft_careers',
    'apple_jobs',
    'netflix_jobs',
    'nvidia_careers',
    'stripe_careers',
    'openai_careers',
    'anthropic_careers',
];

// Total platform count
export const TOTAL_PLATFORMS = Object.keys(ALL_JOB_PLATFORMS).length;

// ============================================
// SAMPLE JOBS FROM ALL PLATFORMS
// ============================================

export function generateSampleJobs(): Job[] {
    const companies = [
        { name: 'Google', platform: 'google_careers' as AllPlatformId, salary: [10000, 15000] },
        { name: 'Meta', platform: 'meta_careers' as AllPlatformId, salary: [9500, 14000] },
        { name: 'Amazon', platform: 'amazon_jobs' as AllPlatformId, salary: [8500, 12000] },
        { name: 'Microsoft', platform: 'microsoft_careers' as AllPlatformId, salary: [9000, 13000] },
        { name: 'Apple', platform: 'apple_jobs' as AllPlatformId, salary: [9500, 14000] },
        { name: 'Netflix', platform: 'netflix_jobs' as AllPlatformId, salary: [11000, 16000] },
        { name: 'NVIDIA', platform: 'nvidia_careers' as AllPlatformId, salary: [9000, 13000] },
        { name: 'Stripe', platform: 'stripe_careers' as AllPlatformId, salary: [10000, 14000] },
        { name: 'OpenAI', platform: 'openai_careers' as AllPlatformId, salary: [12000, 18000] },
        { name: 'Anthropic', platform: 'anthropic_careers' as AllPlatformId, salary: [11000, 17000] },
        { name: 'Salesforce', platform: 'linkedin' as AllPlatformId, salary: [8000, 11000] },
        { name: 'Adobe', platform: 'indeed' as AllPlatformId, salary: [8500, 11500] },
        { name: 'Twitter/X', platform: 'greenhouse' as AllPlatformId, salary: [9000, 12000] },
        { name: 'Uber', platform: 'lever' as AllPlatformId, salary: [8500, 12000] },
        { name: 'Airbnb', platform: 'lever' as AllPlatformId, salary: [9000, 13000] },
        { name: 'Lyft', platform: 'greenhouse' as AllPlatformId, salary: [8000, 11000] },
        { name: 'Coinbase', platform: 'lever' as AllPlatformId, salary: [10000, 14000] },
        { name: 'Databricks', platform: 'greenhouse' as AllPlatformId, salary: [10000, 14000] },
        { name: 'Figma', platform: 'lever' as AllPlatformId, salary: [9000, 12000] },
        { name: 'Discord', platform: 'greenhouse' as AllPlatformId, salary: [9000, 12000] },
    ];

    const roles = [
        'Software Engineering Intern',
        'Backend Engineering Intern',
        'Frontend Engineering Intern',
        'Full Stack Engineering Intern',
        'Machine Learning Intern',
        'Data Science Intern',
        'Cloud Infrastructure Intern',
        'Mobile Engineering Intern',
        'Security Engineering Intern',
        'Product Engineering Intern',
    ];

    const locations = [
        { city: 'San Francisco, CA', type: 'hybrid' as const },
        { city: 'Mountain View, CA', type: 'onsite' as const },
        { city: 'Seattle, WA', type: 'hybrid' as const },
        { city: 'New York, NY', type: 'hybrid' as const },
        { city: 'Austin, TX', type: 'onsite' as const },
        { city: 'Remote', type: 'remote' as const },
    ];

    const jobs: Job[] = [];

    companies.forEach((company, i) => {
        const role = roles[i % roles.length];
        const loc = locations[i % locations.length];
        const platformInfo = ALL_JOB_PLATFORMS[company.platform];

        jobs.push({
            id: `job-${i}`,
            title: role,
            company: company.name,
            companyLogo: `https://logo.clearbit.com/${company.name.toLowerCase().replace(/\s/g, '')}.com`,
            location: loc.city,
            locationType: loc.type,
            salary: {
                min: company.salary[0],
                max: company.salary[1],
                currency: 'USD',
                period: 'monthly',
            },
            description: `Join ${company.name}'s team as a ${role}. Work on cutting-edge technology...`,
            requirements: ['CS degree', 'Python or Java', 'Data structures'],
            skills: ['Python', 'JavaScript', 'React', 'AWS', 'SQL'],
            postedDate: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000),
            applicationUrl: `${platformInfo.url}/jobs/${i}`,
            platform: company.platform as any,
            platformJobId: `${company.platform}-${i}`,
            sponsorsVisa: VISA_FRIENDLY_COMPANIES.includes(company.platform),
            jobType: 'internship',
            experienceLevel: 'entry',
        });
    });

    return jobs;
}
