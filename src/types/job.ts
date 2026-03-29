export type JobPlatform = 'remoteok' | 'hackernews' | 'indeed' | 'handshake' | 'linkedin' | 'wayup' | 'glassdoor' | 'manual' | 'greenhouse' | 'lever' | 'workday' | 'wellfound' | 'dice';

export type ApplicationUrgency = 'apply-now' | 'soon' | 'normal' | 'stale' | 'expired';

export type PipelineStatus =
  | 'discovered'
  | 'saved'
  | 'applying'
  | 'applied'
  | 'screening'
  | 'interview'
  | 'offer'
  | 'rejected';

export interface JobSearchQuery {
  keywords?: string[];
  location?: string;
  remote?: boolean;
  minSalary?: number;
  maxSalary?: number;
  jobTypes?: ('full-time' | 'part-time' | 'contract' | 'internship' | 'co-op' | 'on-campus' | 'work-study' | 'fellowship' | 'apprenticeship')[];
  experienceLevel?: ('entry-level' | 'internship' | 'student' | 'junior' | 'mid' | 'senior')[];
  excludeCompanies?: string[];
}

export interface RawJob {
  externalId: string;
  platform: JobPlatform;
  title: string;
  company: string;
  location?: string;
  remote: boolean;
  description: string;
  url?: string;
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
  };
  jobType?: string;
  tags?: string[];
  postedAt?: Date;
  fetchedAt: Date;
}

export interface JobMatchAnalysis {
  matchScore: number; // 0-100
  strengths: string[];
  concerns: string[];
  missingSkills: string[];
  recommendations: string[];
}

export interface ScoredJob extends RawJob {
  jobId: string; // our internal ID
  matchScore: number;
  analysis?: JobMatchAnalysis;
  isLikelyExpired?: boolean;
  postingAgeHours?: number;
  applicationUrgency?: ApplicationUrgency;
  whyApply?: string;
}

export interface JobSummary {
  id: string;
  externalId: string;
  platform: JobPlatform;
  title: string;
  company: string;
  location?: string;
  remote: boolean;
  matchScore: number;
  status: PipelineStatus;
  savedAt: Date;
  updatedAt: Date;
  url?: string;
}

export interface Job extends JobSummary {
  description: string;
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
  };
  jobType?: string;
  tags?: string[];
  postedAt?: Date;
  fetchedAt: Date;
  analysis?: JobMatchAnalysis;
  notes?: string;
  appliedAt?: Date;
  responseAt?: Date;
  applicationId?: string; // ID of the application record if applied
  isLikelyExpired?: boolean;
  postingAgeHours?: number;
  applicationUrgency?: ApplicationUrgency;
  whyApply?: string;
}

export interface SearchResult {
  query: JobSearchQuery;
  totalResults: number;
  newJobs: number;
  platformResults: {
    platform: JobPlatform;
    count: number;
    error?: string;
  }[];
  jobs: ScoredJob[];
  searchedAt: Date;
}

export interface JobStats {
  totalJobs: number;
  byStatus: Record<PipelineStatus, number>;
  applied: number;
  responseRate: number;
  interviews: number;
  offers: number;
  avgMatchScore: number;
  byPlatform: Record<JobPlatform, number>;
}

export interface PipelineView {
  status: PipelineStatus;
  count: number;
  jobs: JobSummary[];
}

export interface JobCache {
  timestamp: Date;
  expiresAt: Date;
  jobs: RawJob[];
}
