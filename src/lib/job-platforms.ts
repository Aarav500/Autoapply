// ============================================
// JOB PLATFORM ADAPTERS
// Unified interface for multiple job platforms
// ============================================

export interface Job {
    id: string;
    title: string;
    company: string;
    companyLogo?: string;
    location: string;
    locationType: 'remote' | 'hybrid' | 'onsite';
    salary?: {
        min: number;
        max: number;
        currency: string;
        period: 'hourly' | 'monthly' | 'yearly';
    };
    description: string;
    requirements: string[];
    skills: string[];
    postedDate: Date;
    deadline?: Date;
    applicationUrl: string;
    platform: JobPlatform;
    platformJobId: string;
    sponsorsVisa: boolean;
    jobType: 'internship' | 'full-time' | 'part-time' | 'contract';
    experienceLevel: 'entry' | 'mid' | 'senior';
    matchScore?: number;
    saved?: boolean;
    applied?: boolean;
    applicationStatus?: ApplicationStatus;
}

export type JobPlatform =
    | 'handshake'
    | 'linkedin'
    | 'indeed'
    | 'glassdoor'
    | 'google_jobs'
    | 'greenhouse'
    | 'lever'
    | 'workday'
    | 'company_direct';

export type ApplicationStatus =
    | 'not_applied'
    | 'applied'
    | 'screening'
    | 'interview'
    | 'offer'
    | 'rejected'
    | 'withdrawn';

export interface SearchFilters {
    query: string;
    location?: string;
    remote?: boolean;
    jobType?: ('internship' | 'full-time' | 'part-time')[];
    salaryMin?: number;
    salaryMax?: number;
    sponsorsVisa?: boolean;
    postedWithin?: number; // days
    experienceLevel?: ('entry' | 'mid' | 'senior')[];
    companies?: string[];
    excludeCompanies?: string[];
    skills?: string[];
}

export interface PlatformConfig {
    enabled: boolean;
    apiKey?: string;
    credentials?: {
        email?: string;
        password?: string;
    };
    cookies?: string;
    rateLimit: number; // requests per minute
}

// ============================================
// PLATFORM ADAPTER INTERFACE
// ============================================

export interface JobPlatformAdapter {
    name: JobPlatform;
    displayName: string;
    icon: string;
    supportsAutoApply: boolean;

    search(filters: SearchFilters): Promise<Job[]>;
    getJobDetails(jobId: string): Promise<Job>;
    apply?(jobId: string, resume: string, coverLetter?: string): Promise<boolean>;
    isLoggedIn?(): Promise<boolean>;
    login?(credentials: { email: string; password: string }): Promise<boolean>;
}

// ============================================
// HANDSHAKE ADAPTER (UCR)
// ============================================

export class HandshakeAdapter implements JobPlatformAdapter {
    name: JobPlatform = 'handshake';
    displayName = 'Handshake (UCR)';
    icon = '🎓';
    supportsAutoApply = true;

    private baseUrl = 'https://ucr.joinhandshake.com';

    async search(filters: SearchFilters): Promise<Job[]> {
        // In production, this would use Puppeteer/Playwright to scrape
        // For now, return simulated data
        const jobs = await this.fetchHandshakeJobs(filters);
        return jobs.map(this.normalizeJob);
    }

    async getJobDetails(jobId: string): Promise<Job> {
        // Fetch individual job details
        return this.fetchJobById(jobId);
    }

    async apply(jobId: string, resume: string, coverLetter?: string): Promise<boolean> {
        // Automate application via Handshake
        console.log(`Applying to Handshake job ${jobId}...`);
        return true;
    }

    async isLoggedIn(): Promise<boolean> {
        // Check if session is valid
        return false;
    }

    async login(credentials: { email: string; password: string }): Promise<boolean> {
        // Login via UCR SSO
        console.log('Logging into Handshake via UCR SSO...');
        return true;
    }

    private async fetchHandshakeJobs(filters: SearchFilters): Promise<any[]> {
        // Simulated Handshake jobs for Summer 2026
        return [
            {
                id: 'hs-1',
                title: 'Software Engineering Intern',
                company: 'Google',
                location: 'Mountain View, CA',
                salary: { min: 8000, max: 12000, period: 'monthly' },
                type: 'internship',
                sponsorsVisa: true,
                posted: new Date('2025-12-15'),
            },
            {
                id: 'hs-2',
                title: 'Data Science Intern',
                company: 'Meta',
                location: 'Menlo Park, CA',
                salary: { min: 9000, max: 11000, period: 'monthly' },
                type: 'internship',
                sponsorsVisa: true,
                posted: new Date('2025-12-20'),
            },
            {
                id: 'hs-3',
                title: 'ML Engineering Intern',
                company: 'Amazon',
                location: 'Seattle, WA',
                salary: { min: 8500, max: 11500, period: 'monthly' },
                type: 'internship',
                sponsorsVisa: true,
                posted: new Date('2025-12-18'),
            },
        ];
    }

    private normalizeJob(raw: any): Job {
        return {
            id: `handshake-${raw.id}`,
            title: raw.title,
            company: raw.company,
            location: raw.location,
            locationType: raw.location.toLowerCase().includes('remote') ? 'remote' : 'onsite',
            salary: raw.salary ? {
                min: raw.salary.min,
                max: raw.salary.max,
                currency: 'USD',
                period: raw.salary.period,
            } : undefined,
            description: raw.description || '',
            requirements: raw.requirements || [],
            skills: raw.skills || [],
            postedDate: raw.posted,
            applicationUrl: `https://ucr.joinhandshake.com/jobs/${raw.id}`,
            platform: 'handshake',
            platformJobId: raw.id,
            sponsorsVisa: raw.sponsorsVisa,
            jobType: raw.type,
            experienceLevel: 'entry',
        };
    }

    private async fetchJobById(jobId: string): Promise<Job> {
        const jobs = await this.fetchHandshakeJobs({} as SearchFilters);
        const job = jobs.find(j => j.id === jobId);
        if (!job) throw new Error(`Job ${jobId} not found`);
        return this.normalizeJob(job);
    }
}

// ============================================
// LINKEDIN ADAPTER
// ============================================

export class LinkedInAdapter implements JobPlatformAdapter {
    name: JobPlatform = 'linkedin';
    displayName = 'LinkedIn';
    icon = '💼';
    supportsAutoApply = true; // Easy Apply only

    async search(filters: SearchFilters): Promise<Job[]> {
        // LinkedIn job search via their API or scraping
        return this.fetchLinkedInJobs(filters);
    }

    async getJobDetails(jobId: string): Promise<Job> {
        return this.fetchJobById(jobId);
    }

    async apply(jobId: string, resume: string): Promise<boolean> {
        // Only works for Easy Apply jobs
        console.log(`Applying via LinkedIn Easy Apply: ${jobId}`);
        return true;
    }

    private async fetchLinkedInJobs(filters: SearchFilters): Promise<Job[]> {
        // Simulated LinkedIn jobs
        return [
            {
                id: 'linkedin-1',
                title: 'Frontend Developer Intern',
                company: 'Microsoft',
                companyLogo: 'https://logo.clearbit.com/microsoft.com',
                location: 'Redmond, WA',
                locationType: 'hybrid' as const,
                salary: { min: 7500, max: 10000, currency: 'USD', period: 'monthly' as const },
                description: 'Join our team building next-gen web experiences...',
                requirements: ['React', 'TypeScript', 'CSS'],
                skills: ['JavaScript', 'React', 'HTML', 'CSS'],
                postedDate: new Date('2025-12-22'),
                applicationUrl: 'https://linkedin.com/jobs/view/123',
                platform: 'linkedin' as JobPlatform,
                platformJobId: 'li-123',
                sponsorsVisa: true,
                jobType: 'internship' as const,
                experienceLevel: 'entry' as const,
            },
            {
                id: 'linkedin-2',
                title: 'Backend Engineering Intern',
                company: 'Apple',
                companyLogo: 'https://logo.clearbit.com/apple.com',
                location: 'Cupertino, CA',
                locationType: 'onsite' as const,
                salary: { min: 8000, max: 11000, currency: 'USD', period: 'monthly' as const },
                description: 'Build scalable services for millions of users...',
                requirements: ['Python', 'Java', 'Distributed Systems'],
                skills: ['Python', 'Java', 'Kubernetes'],
                postedDate: new Date('2025-12-19'),
                applicationUrl: 'https://linkedin.com/jobs/view/456',
                platform: 'linkedin' as JobPlatform,
                platformJobId: 'li-456',
                sponsorsVisa: true,
                jobType: 'internship' as const,
                experienceLevel: 'entry' as const,
            },
        ];
    }

    private async fetchJobById(jobId: string): Promise<Job> {
        const jobs = await this.fetchLinkedInJobs({} as SearchFilters);
        const job = jobs.find(j => j.id === jobId);
        if (!job) throw new Error(`Job ${jobId} not found`);
        return job;
    }
}

// ============================================
// INDEED ADAPTER
// ============================================

export class IndeedAdapter implements JobPlatformAdapter {
    name: JobPlatform = 'indeed';
    displayName = 'Indeed';
    icon = '📋';
    supportsAutoApply = true; // Indeed Apply

    async search(filters: SearchFilters): Promise<Job[]> {
        return this.fetchIndeedJobs(filters);
    }

    async getJobDetails(jobId: string): Promise<Job> {
        return this.fetchJobById(jobId);
    }

    private async fetchIndeedJobs(filters: SearchFilters): Promise<Job[]> {
        return [
            {
                id: 'indeed-1',
                title: 'Software Developer Intern',
                company: 'Salesforce',
                companyLogo: 'https://logo.clearbit.com/salesforce.com',
                location: 'San Francisco, CA',
                locationType: 'hybrid' as const,
                salary: { min: 7000, max: 9500, currency: 'USD', period: 'monthly' as const },
                description: 'Join our CRM platform team...',
                requirements: ['Java', 'SQL', 'Cloud'],
                skills: ['Java', 'Apex', 'Salesforce'],
                postedDate: new Date('2025-12-21'),
                applicationUrl: 'https://indeed.com/viewjob?jk=abc123',
                platform: 'indeed' as JobPlatform,
                platformJobId: 'abc123',
                sponsorsVisa: true,
                jobType: 'internship' as const,
                experienceLevel: 'entry' as const,
            },
            {
                id: 'indeed-2',
                title: 'Cloud Engineering Intern',
                company: 'Netflix',
                companyLogo: 'https://logo.clearbit.com/netflix.com',
                location: 'Los Gatos, CA',
                locationType: 'onsite' as const,
                salary: { min: 9000, max: 12000, currency: 'USD', period: 'monthly' as const },
                description: 'Scale our global streaming infrastructure...',
                requirements: ['AWS', 'Python', 'Infrastructure'],
                skills: ['AWS', 'Python', 'Terraform'],
                postedDate: new Date('2025-12-20'),
                applicationUrl: 'https://indeed.com/viewjob?jk=def456',
                platform: 'indeed' as JobPlatform,
                platformJobId: 'def456',
                sponsorsVisa: true,
                jobType: 'internship' as const,
                experienceLevel: 'entry' as const,
            },
        ];
    }

    private async fetchJobById(jobId: string): Promise<Job> {
        const jobs = await this.fetchIndeedJobs({} as SearchFilters);
        const job = jobs.find(j => j.id === jobId);
        if (!job) throw new Error(`Job ${jobId} not found`);
        return job;
    }
}

// ============================================
// GOOGLE JOBS ADAPTER
// ============================================

export class GoogleJobsAdapter implements JobPlatformAdapter {
    name: JobPlatform = 'google_jobs';
    displayName = 'Google Jobs';
    icon = '🔍';
    supportsAutoApply = false; // Redirects to company page

    async search(filters: SearchFilters): Promise<Job[]> {
        return this.fetchGoogleJobs(filters);
    }

    async getJobDetails(jobId: string): Promise<Job> {
        return this.fetchJobById(jobId);
    }

    private async fetchGoogleJobs(filters: SearchFilters): Promise<Job[]> {
        // Google Jobs aggregates from multiple sources
        return [
            {
                id: 'google-1',
                title: 'Product Engineering Intern',
                company: 'Stripe',
                companyLogo: 'https://logo.clearbit.com/stripe.com',
                location: 'San Francisco, CA',
                locationType: 'hybrid' as const,
                salary: { min: 8500, max: 11500, currency: 'USD', period: 'monthly' as const },
                description: 'Build the economic infrastructure of the internet...',
                requirements: ['Ruby', 'React', 'API Design'],
                skills: ['Ruby', 'React', 'APIs'],
                postedDate: new Date('2025-12-23'),
                applicationUrl: 'https://stripe.com/jobs/123',
                platform: 'google_jobs' as JobPlatform,
                platformJobId: 'stripe-123',
                sponsorsVisa: true,
                jobType: 'internship' as const,
                experienceLevel: 'entry' as const,
            },
            {
                id: 'google-2',
                title: 'AI Research Intern',
                company: 'OpenAI',
                companyLogo: 'https://logo.clearbit.com/openai.com',
                location: 'San Francisco, CA',
                locationType: 'onsite' as const,
                salary: { min: 10000, max: 15000, currency: 'USD', period: 'monthly' as const },
                description: 'Work on cutting-edge AI research...',
                requirements: ['Python', 'ML', 'Research'],
                skills: ['Python', 'PyTorch', 'NLP'],
                postedDate: new Date('2025-12-18'),
                applicationUrl: 'https://openai.com/careers/intern',
                platform: 'google_jobs' as JobPlatform,
                platformJobId: 'openai-intern',
                sponsorsVisa: true,
                jobType: 'internship' as const,
                experienceLevel: 'entry' as const,
            },
        ];
    }

    private async fetchJobById(jobId: string): Promise<Job> {
        const jobs = await this.fetchGoogleJobs({} as SearchFilters);
        const job = jobs.find(j => j.id === jobId);
        if (!job) throw new Error(`Job ${jobId} not found`);
        return job;
    }
}

// ============================================
// COMPANY CAREERS ADAPTER
// ============================================

export class CompanyCareerAdapter implements JobPlatformAdapter {
    name: JobPlatform = 'company_direct';
    displayName = 'Company Careers';
    icon = '🏢';
    supportsAutoApply = false;

    // Known company career pages
    private companyUrls: Record<string, string> = {
        'google': 'https://careers.google.com',
        'meta': 'https://www.metacareers.com',
        'amazon': 'https://www.amazon.jobs',
        'microsoft': 'https://careers.microsoft.com',
        'apple': 'https://jobs.apple.com',
        'nvidia': 'https://nvidia.wd5.myworkdayjobs.com',
        'tesla': 'https://www.tesla.com/careers',
        'spacex': 'https://www.spacex.com/careers',
    };

    async search(filters: SearchFilters): Promise<Job[]> {
        return this.fetchCompanyJobs(filters);
    }

    async getJobDetails(jobId: string): Promise<Job> {
        const jobs = await this.fetchCompanyJobs({} as SearchFilters);
        const job = jobs.find(j => j.id === jobId);
        if (!job) throw new Error(`Job ${jobId} not found`);
        return job;
    }

    private async fetchCompanyJobs(filters: SearchFilters): Promise<Job[]> {
        return [
            {
                id: 'company-1',
                title: 'NVIDIA GPU Architecture Intern',
                company: 'NVIDIA',
                companyLogo: 'https://logo.clearbit.com/nvidia.com',
                location: 'Santa Clara, CA',
                locationType: 'onsite' as const,
                salary: { min: 9000, max: 13000, currency: 'USD', period: 'monthly' as const },
                description: 'Design next-gen GPU architectures...',
                requirements: ['Computer Architecture', 'C++', 'Verilog'],
                skills: ['C++', 'CUDA', 'GPU'],
                postedDate: new Date('2025-12-15'),
                applicationUrl: 'https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite',
                platform: 'company_direct' as JobPlatform,
                platformJobId: 'nvidia-gpu-intern',
                sponsorsVisa: true,
                jobType: 'internship' as const,
                experienceLevel: 'entry' as const,
            },
            {
                id: 'company-2',
                title: 'SpaceX Software Engineering Intern',
                company: 'SpaceX',
                companyLogo: 'https://logo.clearbit.com/spacex.com',
                location: 'Hawthorne, CA',
                locationType: 'onsite' as const,
                salary: { min: 8000, max: 10000, currency: 'USD', period: 'monthly' as const },
                description: 'Build software for rockets and spacecraft...',
                requirements: ['C++', 'Python', 'Embedded'],
                skills: ['C++', 'Python', 'Linux'],
                postedDate: new Date('2025-12-17'),
                applicationUrl: 'https://www.spacex.com/careers',
                platform: 'company_direct' as JobPlatform,
                platformJobId: 'spacex-swe-intern',
                sponsorsVisa: false, // SpaceX requires US citizenship
                jobType: 'internship' as const,
                experienceLevel: 'entry' as const,
            },
        ];
    }
}

// ============================================
// PLATFORM REGISTRY
// ============================================

export const jobPlatforms: Record<JobPlatform, JobPlatformAdapter> = {
    handshake: new HandshakeAdapter(),
    linkedin: new LinkedInAdapter(),
    indeed: new IndeedAdapter(),
    google_jobs: new GoogleJobsAdapter(),
    company_direct: new CompanyCareerAdapter(),
    glassdoor: new LinkedInAdapter(), // Placeholder
    greenhouse: new CompanyCareerAdapter(), // Placeholder
    lever: new CompanyCareerAdapter(), // Placeholder
    workday: new CompanyCareerAdapter(), // Placeholder
};

export function getEnabledPlatforms(config: Record<JobPlatform, PlatformConfig>): JobPlatformAdapter[] {
    return Object.entries(config)
        .filter(([_, cfg]) => cfg.enabled)
        .map(([platform]) => jobPlatforms[platform as JobPlatform]);
}
