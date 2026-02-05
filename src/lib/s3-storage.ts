// ============================================
// S3 STORAGE - Cloud-based data persistence
// For AutoApply job hunting features
// ============================================

interface S3Config {
    bucketName: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
}

// Get S3 config from environment (GitHub Secrets compatible)
function getS3Config(): S3Config | null {
    const bucketName = process.env.S3_BUCKET_NAME;
    const region = process.env.AWS_REGION || 'us-east-1';
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    if (!bucketName || !accessKeyId || !secretAccessKey) {
        console.warn('S3 configuration incomplete. Required: S3_BUCKET_NAME, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY');
        return null;
    }

    return { bucketName, region, accessKeyId, secretAccessKey };
}

// Check if S3 is configured
export function isS3Configured(): boolean {
    return getS3Config() !== null;
}

// ============================================
// S3 STORAGE CLASS
// ============================================

class S3Storage {
    private baseUrl = '/api/storage';
    private cache: Map<string, { data: unknown; timestamp: number }> = new Map();
    private cacheTimeout = 5 * 60 * 1000; // 5 minutes

    // Get data from S3
    async get<T>(key: string, defaultValue: T): Promise<T> {
        // Check cache first
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data as T;
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
// STORAGE KEYS - Job Hunting Features Only
// ============================================

export const STORAGE_KEYS = {
    // ============================================
    // USER DATA
    // ============================================
    USER_PROFILE: 'user-profile',
    USER_SETTINGS: 'user-settings',
    CV_PROFILE: 'cv-profile',

    // ============================================
    // JOBS
    // ============================================
    JOBS_ALL: 'enhanced-jobs',
    SAVED_JOBS: 'saved-jobs',
    SAVED_JOB_IDS: 'saved-job-ids',
    APPLIED_JOBS: 'applied-jobs',
    APPLIED_JOB_IDS: 'applied-job-ids',
    JOB_PREFERENCES: 'job-preferences',

    // ============================================
    // DOCUMENTS (Resumes, Cover Letters, Profiles)
    // ============================================
    RESUMES: 'documents/resumes',
    COVER_LETTERS: 'documents/cover-letters',
    PROFILE_DOCUMENTS: 'documents/profiles',
    GENERATED_DOCUMENTS: 'automation/documents',

    // ============================================
    // APPLICATIONS
    // ============================================
    DISCOVERED_OPPORTUNITIES: 'automation/opportunities',
    APPLICATION_STATUS: 'applications/status',
    DOCUMENT_CHECKLIST: 'applications/checklist',
    APPLICATION_HISTORY: 'applications/history',

    // ============================================
    // LINKEDIN
    // ============================================
    LINKEDIN_PROFILE: 'linkedin/profile',
    LINKEDIN_CONNECTIONS: 'linkedin/connections',

    // ============================================
    // INTERVIEWS
    // ============================================
    INTERVIEWS: 'interviews/scheduled',
    INTERVIEW_PREP: 'interviews/prep',
    INTERVIEW_FEEDBACK: 'interviews/feedback',

    // ============================================
    // ANALYTICS
    // ============================================
    ANALYTICS_EVENTS: 'analytics-events',
    JOB_MATCH_SCORES: 'analytics/job-matches',

    // ============================================
    // NOTIFICATIONS
    // ============================================
    NOTIFICATION_PREFERENCES: 'notifications/preferences',
    NOTIFICATION_HISTORY: 'notifications/history',
} as const;

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface UserProfile {
    name: string;
    email?: string;
    phone?: string;
    location?: string;
    headline?: string;
    summary?: string;
    skills: string[];
    experience: WorkExperience[];
    education: Education[];
    certifications?: string[];
    languages?: string[];
    linkedInUrl?: string;
    githubUrl?: string;
    portfolioUrl?: string;
    updatedAt?: string;
}

export interface WorkExperience {
    id: string;
    title: string;
    company: string;
    location?: string;
    startDate: string;
    endDate?: string;
    current: boolean;
    description: string;
    achievements: string[];
}

export interface Education {
    id: string;
    school: string;
    degree: string;
    field: string;
    startDate: string;
    endDate?: string;
    gpa?: number;
    achievements?: string[];
}

export interface SavedJob {
    id: string;
    title: string;
    company: string;
    location?: string;
    salary?: string;
    url?: string;
    description?: string;
    requirements?: string[];
    savedAt: string;
    status: 'saved' | 'applied' | 'interview' | 'offer' | 'rejected' | 'withdrawn';
    matchScore?: number;
    notes?: string;
}

export interface JobPreferences {
    titles: string[];
    locations: string[];
    remotePreference: 'remote' | 'hybrid' | 'onsite' | 'any';
    salaryMin?: number;
    salaryMax?: number;
    industries?: string[];
    companySize?: ('startup' | 'small' | 'medium' | 'large' | 'enterprise')[];
    excludeCompanies?: string[];
    keywords?: string[];
    updatedAt: string;
}

export interface Resume {
    id: string;
    name: string;
    content: string;
    format: 'pdf' | 'docx' | 'txt';
    targetRole?: string;
    createdAt: string;
    updatedAt: string;
    isDefault: boolean;
}

export interface CoverLetter {
    id: string;
    jobId?: string;
    jobTitle?: string;
    company?: string;
    content: string;
    createdAt: string;
    updatedAt: string;
}

export interface Interview {
    id: string;
    jobId: string;
    jobTitle: string;
    company: string;
    type: 'phone' | 'video' | 'onsite' | 'technical' | 'panel';
    scheduledAt: string;
    duration?: number; // minutes
    interviewers?: { name: string; title: string }[];
    location?: string;
    meetingLink?: string;
    notes?: string;
    status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
    feedback?: string;
    createdAt: string;
}

export interface DiscoveredOpportunity {
    id: string;
    type: 'job';
    title: string;
    organization: string;
    url: string;
    salary?: string;
    location?: string;
    requirements: string[];
    description: string;
    status: 'new' | 'reviewed' | 'applied' | 'rejected' | 'expired';
    matchScore: number;
    discoveredAt: string;
    appliedAt?: string;
}

export interface GeneratedDocument {
    opportunityId: string;
    opportunityTitle: string;
    organization: string;
    opportunityUrl: string;
    matchScore: number;
    resume: { id: string; content: string; createdAt: string } | null;
    coverLetter: { id: string; content: string; createdAt: string } | null;
    generatedAt: string;
}

export interface ApplicationChecklist {
    jobId: string;
    documentId: string;
    status: 'not_started' | 'in_progress' | 'completed' | 'submitted';
    updatedAt: string;
}

// ============================================
// USER PROFILE FUNCTIONS
// ============================================

export async function getUserProfile(): Promise<UserProfile | null> {
    return s3Storage.get(STORAGE_KEYS.USER_PROFILE, null);
}

export async function saveUserProfile(profile: UserProfile): Promise<boolean> {
    return s3Storage.set(STORAGE_KEYS.USER_PROFILE, {
        ...profile,
        updatedAt: new Date().toISOString(),
    });
}

// ============================================
// JOB FUNCTIONS
// ============================================

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

export async function deleteJob(jobId: string): Promise<boolean> {
    const jobs = await getSavedJobs();
    const filtered = jobs.filter(j => j.id !== jobId);
    return s3Storage.set(STORAGE_KEYS.SAVED_JOBS, filtered);
}

export async function getAppliedJobs(): Promise<string[]> {
    return s3Storage.get(STORAGE_KEYS.APPLIED_JOB_IDS, []);
}

export async function markJobApplied(jobId: string): Promise<boolean> {
    const applied = await getAppliedJobs();
    if (!applied.includes(jobId)) {
        applied.push(jobId);
    }
    return s3Storage.set(STORAGE_KEYS.APPLIED_JOB_IDS, applied);
}

export async function getJobPreferences(): Promise<JobPreferences | null> {
    return s3Storage.get(STORAGE_KEYS.JOB_PREFERENCES, null);
}

export async function saveJobPreferences(prefs: JobPreferences): Promise<boolean> {
    return s3Storage.set(STORAGE_KEYS.JOB_PREFERENCES, {
        ...prefs,
        updatedAt: new Date().toISOString(),
    });
}

// ============================================
// RESUME FUNCTIONS
// ============================================

export async function getResumes(): Promise<Resume[]> {
    return s3Storage.get(STORAGE_KEYS.RESUMES, []);
}

export async function saveResume(resume: Resume): Promise<boolean> {
    const resumes = await getResumes();
    const index = resumes.findIndex(r => r.id === resume.id);

    if (index >= 0) {
        resumes[index] = { ...resume, updatedAt: new Date().toISOString() };
    } else {
        resumes.push({ ...resume, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }

    return s3Storage.set(STORAGE_KEYS.RESUMES, resumes);
}

export async function deleteResume(resumeId: string): Promise<boolean> {
    const resumes = await getResumes();
    const filtered = resumes.filter(r => r.id !== resumeId);
    return s3Storage.set(STORAGE_KEYS.RESUMES, filtered);
}

// ============================================
// COVER LETTER FUNCTIONS
// ============================================

export async function getCoverLetters(): Promise<CoverLetter[]> {
    return s3Storage.get(STORAGE_KEYS.COVER_LETTERS, []);
}

export async function saveCoverLetter(letter: CoverLetter): Promise<boolean> {
    const letters = await getCoverLetters();
    const index = letters.findIndex(l => l.id === letter.id);

    if (index >= 0) {
        letters[index] = { ...letter, updatedAt: new Date().toISOString() };
    } else {
        letters.push({ ...letter, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }

    return s3Storage.set(STORAGE_KEYS.COVER_LETTERS, letters);
}

export async function deleteCoverLetter(letterId: string): Promise<boolean> {
    const letters = await getCoverLetters();
    const filtered = letters.filter(l => l.id !== letterId);
    return s3Storage.set(STORAGE_KEYS.COVER_LETTERS, filtered);
}

// ============================================
// INTERVIEW FUNCTIONS
// ============================================

export async function getInterviews(): Promise<Interview[]> {
    return s3Storage.get(STORAGE_KEYS.INTERVIEWS, []);
}

export async function saveInterview(interview: Interview): Promise<boolean> {
    const interviews = await getInterviews();
    const index = interviews.findIndex(i => i.id === interview.id);

    if (index >= 0) {
        interviews[index] = interview;
    } else {
        interviews.push({ ...interview, createdAt: new Date().toISOString() });
    }

    return s3Storage.set(STORAGE_KEYS.INTERVIEWS, interviews);
}

export async function deleteInterview(interviewId: string): Promise<boolean> {
    const interviews = await getInterviews();
    const filtered = interviews.filter(i => i.id !== interviewId);
    return s3Storage.set(STORAGE_KEYS.INTERVIEWS, filtered);
}

// ============================================
// OPPORTUNITY FUNCTIONS
// ============================================

export async function getDiscoveredOpportunities(): Promise<DiscoveredOpportunity[]> {
    return s3Storage.get(STORAGE_KEYS.DISCOVERED_OPPORTUNITIES, []);
}

export async function saveDiscoveredOpportunities(opportunities: DiscoveredOpportunity[]): Promise<boolean> {
    return s3Storage.set(STORAGE_KEYS.DISCOVERED_OPPORTUNITIES, opportunities);
}

export async function getGeneratedDocuments(): Promise<GeneratedDocument[]> {
    return s3Storage.get(STORAGE_KEYS.GENERATED_DOCUMENTS, []);
}

export async function saveGeneratedDocuments(documents: GeneratedDocument[]): Promise<boolean> {
    return s3Storage.set(STORAGE_KEYS.GENERATED_DOCUMENTS, documents);
}

// ============================================
// APPLICATION CHECKLIST FUNCTIONS
// ============================================

export async function getChecklist(): Promise<ApplicationChecklist[]> {
    return s3Storage.get(STORAGE_KEYS.DOCUMENT_CHECKLIST, []);
}

export async function updateChecklistItem(item: ApplicationChecklist): Promise<boolean> {
    const checklist = await getChecklist();
    const key = `${item.jobId}-${item.documentId}`;
    const index = checklist.findIndex(c => `${c.jobId}-${c.documentId}` === key);

    if (index >= 0) {
        checklist[index] = item;
    } else {
        checklist.push(item);
    }

    return s3Storage.set(STORAGE_KEYS.DOCUMENT_CHECKLIST, checklist);
}

// ============================================
// DATA EXPORT/IMPORT
// ============================================

export async function exportAllData(): Promise<Record<string, unknown>> {
    const data: Record<string, unknown> = {};

    for (const [name, key] of Object.entries(STORAGE_KEYS)) {
        data[name] = await s3Storage.get(key, null);
    }

    return data;
}

export async function importAllData(data: Record<string, unknown>): Promise<void> {
    for (const [name, key] of Object.entries(STORAGE_KEYS)) {
        if (data[name] !== undefined) {
            await s3Storage.set(key, data[name]);
        }
    }
}

// Migrate localStorage data to S3
export async function migrateLocalStorageToS3(): Promise<void> {
    if (typeof window === 'undefined') return;

    const localStorageKeys = [
        'profile', 'savedJobs', 'appliedJobs', 'resumes', 'coverLetters',
        'interviews', 'jobPreferences', 'checklist',
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
