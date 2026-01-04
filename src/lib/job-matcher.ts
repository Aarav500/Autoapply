// ============================================
// JOB MATCHER - AI-powered job matching
// ============================================

import { Job, SearchFilters } from './job-platforms';

export interface UserProfile {
    skills: string[];
    experience: {
        title: string;
        company: string;
        duration: string;
        skills: string[];
    }[];
    education: {
        school: string;
        degree: string;
        major: string;
        gpa?: number;
        graduationYear: number;
    };
    preferences: {
        locations: string[];
        remote: boolean;
        salaryMin?: number;
        jobTypes: ('internship' | 'full-time' | 'part-time')[];
        industries: string[];
        needsVisaSponsorship: boolean;
    };
    resume?: string;
}

export interface MatchResult {
    job: Job;
    score: number;
    matchedSkills: string[];
    missingSkills: string[];
    reasons: string[];
}

// ============================================
// SKILL EXTRACTION
// ============================================

const TECH_SKILLS = [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Go', 'Rust', 'Ruby', 'Swift',
    'React', 'Vue', 'Angular', 'Next.js', 'Node.js', 'Django', 'Flask', 'Spring', 'Express',
    'AWS', 'GCP', 'Azure', 'Docker', 'Kubernetes', 'Terraform', 'CI/CD',
    'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'GraphQL', 'REST API',
    'Machine Learning', 'Deep Learning', 'NLP', 'Computer Vision', 'TensorFlow', 'PyTorch',
    'Git', 'Linux', 'Agile', 'Scrum', 'Data Structures', 'Algorithms',
    'HTML', 'CSS', 'Sass', 'Tailwind', 'Bootstrap',
    'iOS', 'Android', 'React Native', 'Flutter',
];

export function extractSkillsFromText(text: string): string[] {
    const normalizedText = text.toLowerCase();
    return TECH_SKILLS.filter(skill =>
        normalizedText.includes(skill.toLowerCase())
    );
}

export function extractSkillsFromResume(resumeText: string): string[] {
    // Parse resume and extract skills
    const skills = extractSkillsFromText(resumeText);

    // Also look for skill sections
    const skillSectionRegex = /skills?:?\s*([\s\S]*?)(?=\n\n|experience|education|$)/i;
    const match = resumeText.match(skillSectionRegex);

    if (match) {
        const skillSection = match[1];
        const additionalSkills = extractSkillsFromText(skillSection);
        skills.push(...additionalSkills);
    }

    return [...new Set(skills)]; // Remove duplicates
}

// ============================================
// JOB MATCHING ALGORITHM
// ============================================

export function calculateJobMatch(job: Job, profile: UserProfile): MatchResult {
    let score = 0;
    const reasons: string[] = [];

    // Skill matching (40% of score)
    const jobSkills = job.skills.map(s => s.toLowerCase());
    const userSkills = profile.skills.map(s => s.toLowerCase());

    const matchedSkills = profile.skills.filter(skill =>
        jobSkills.includes(skill.toLowerCase())
    );

    const missingSkills = job.skills.filter(skill =>
        !userSkills.includes(skill.toLowerCase())
    );

    const skillMatchPercent = jobSkills.length > 0
        ? (matchedSkills.length / jobSkills.length) * 100
        : 50;

    score += skillMatchPercent * 0.4;

    if (matchedSkills.length > 0) {
        reasons.push(`${matchedSkills.length}/${job.skills.length} required skills matched`);
    }

    // Location matching (15% of score)
    const locationLower = job.location.toLowerCase();
    const preferredLocations = profile.preferences.locations.map(l => l.toLowerCase());

    if (profile.preferences.remote && job.locationType === 'remote') {
        score += 15;
        reasons.push('Remote position matches preference');
    } else if (preferredLocations.some(loc => locationLower.includes(loc))) {
        score += 15;
        reasons.push('Location matches preference');
    } else if (job.locationType === 'hybrid') {
        score += 7;
        reasons.push('Hybrid option available');
    }

    // Visa sponsorship (15% of score for international students)
    if (profile.preferences.needsVisaSponsorship) {
        if (job.sponsorsVisa) {
            score += 15;
            reasons.push('✅ Sponsors visa');
        } else {
            score -= 10;
            reasons.push('⚠️ May not sponsor visa');
        }
    } else {
        score += 10; // Default bonus for US workers
    }

    // Job type matching (10% of score)
    if (profile.preferences.jobTypes.includes(job.jobType)) {
        score += 10;
        reasons.push(`${job.jobType} matches your preference`);
    }

    // Salary matching (10% of score)
    if (job.salary && profile.preferences.salaryMin) {
        const monthlySalary = job.salary.period === 'yearly'
            ? job.salary.min / 12
            : job.salary.min;

        if (monthlySalary >= profile.preferences.salaryMin) {
            score += 10;
            reasons.push(`Salary meets minimum (${formatSalary(job.salary)})`);
        }
    } else if (job.salary) {
        score += 5;
        reasons.push(`Salary: ${formatSalary(job.salary)}`);
    }

    // Experience level matching (10% of score)
    const yearsOfExperience = profile.experience.length;
    if (job.experienceLevel === 'entry' && yearsOfExperience <= 2) {
        score += 10;
        reasons.push('Entry-level matches your experience');
    } else if (job.experienceLevel === 'mid' && yearsOfExperience >= 2) {
        score += 10;
    }

    // Company reputation bonus
    const topCompanies = ['Google', 'Meta', 'Amazon', 'Microsoft', 'Apple', 'Netflix', 'Stripe', 'OpenAI'];
    if (topCompanies.some(c => job.company.includes(c))) {
        score += 5;
        reasons.push('Top-tier company');
    }

    // Recency bonus
    const daysSincePosted = Math.floor((Date.now() - job.postedDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSincePosted <= 3) {
        score += 5;
        reasons.push('Posted recently');
    }

    return {
        job: { ...job, matchScore: Math.min(100, Math.round(score)) },
        score: Math.min(100, Math.round(score)),
        matchedSkills,
        missingSkills,
        reasons,
    };
}

function formatSalary(salary: Job['salary']): string {
    if (!salary) return 'Not specified';
    return `$${salary.min.toLocaleString()}-$${salary.max.toLocaleString()}/${salary.period}`;
}

// ============================================
// JOB AGGREGATOR
// ============================================

import { jobPlatforms, JobPlatform, PlatformConfig } from './job-platforms';

export interface AggregatorConfig {
    platforms: Record<JobPlatform, PlatformConfig>;
    maxJobsPerPlatform: number;
    deduplicateByTitle: boolean;
    sortBy: 'matchScore' | 'postedDate' | 'salary';
}

export async function aggregateJobs(
    filters: SearchFilters,
    profile: UserProfile,
    config: AggregatorConfig
): Promise<MatchResult[]> {
    const enabledPlatforms = Object.entries(config.platforms)
        .filter(([_, cfg]) => cfg.enabled)
        .map(([platform]) => platform as JobPlatform);

    // Fetch jobs from all platforms in parallel
    const jobPromises = enabledPlatforms.map(async platform => {
        try {
            const adapter = jobPlatforms[platform];
            const jobs = await adapter.search(filters);
            return jobs.slice(0, config.maxJobsPerPlatform);
        } catch (error) {
            console.error(`Failed to fetch from ${platform}:`, error);
            return [];
        }
    });

    const allJobsArrays = await Promise.all(jobPromises);
    let allJobs = allJobsArrays.flat();

    // Deduplicate by title + company
    if (config.deduplicateByTitle) {
        const seen = new Set<string>();
        allJobs = allJobs.filter(job => {
            const key = `${job.title.toLowerCase()}-${job.company.toLowerCase()}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    // Calculate match scores
    const matchResults = allJobs.map(job => calculateJobMatch(job, profile));

    // Sort by configured criteria
    matchResults.sort((a, b) => {
        switch (config.sortBy) {
            case 'matchScore':
                return b.score - a.score;
            case 'postedDate':
                return b.job.postedDate.getTime() - a.job.postedDate.getTime();
            case 'salary':
                const salaryA = a.job.salary?.max || 0;
                const salaryB = b.job.salary?.max || 0;
                return salaryB - salaryA;
            default:
                return b.score - a.score;
        }
    });

    return matchResults;
}

// ============================================
// DEFAULT USER PROFILE (for demo)
// ============================================

export const defaultProfile: UserProfile = {
    skills: [
        'JavaScript', 'TypeScript', 'React', 'Next.js', 'Node.js',
        'Python', 'SQL', 'Git', 'AWS', 'Docker',
        'Machine Learning', 'Data Structures', 'Algorithms',
    ],
    experience: [
        {
            title: 'Software Engineering Intern',
            company: 'Tech Startup',
            duration: 'Summer 2025',
            skills: ['React', 'Node.js', 'PostgreSQL'],
        },
        {
            title: 'Research Assistant',
            company: 'UCR CS Department',
            duration: '2024-2025',
            skills: ['Python', 'Machine Learning', 'Research'],
        },
    ],
    education: {
        school: 'UC Riverside',
        degree: 'Bachelor of Science',
        major: 'Computer Science',
        gpa: 3.75,
        graduationYear: 2026,
    },
    preferences: {
        locations: ['San Francisco', 'Los Angeles', 'Seattle', 'New York'],
        remote: true,
        salaryMin: 7000, // monthly
        jobTypes: ['internship'],
        industries: ['Tech', 'Finance', 'AI/ML'],
        needsVisaSponsorship: true,
    },
};
