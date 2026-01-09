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
    // User data
    USER_PROFILE: 'user/profile',
    USER_SETTINGS: 'user/settings',

    // Essays
    ESSAYS: 'essays/all',
    ESSAY_DRAFTS: 'essays/drafts',

    // Jobs
    SAVED_JOBS: 'jobs/saved',
    APPLIED_JOBS: 'jobs/applied',
    JOB_PREFERENCES: 'jobs/preferences',

    // Scholarships
    SAVED_SCHOLARSHIPS: 'scholarships/saved',
    APPLIED_SCHOLARSHIPS: 'scholarships/applied',

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

    // Activities
    ACTIVITIES: 'activities/all',
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

export interface EssayDraft {
    id: string;
    collegeId: string;
    prompt: string;
    content: string;
    wordCount: number;
    lastModified: string;
    status: 'draft' | 'review' | 'final';
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
