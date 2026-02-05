// ============================================
// AutoApply - Type Definitions
// ============================================

import type {
  User,
  Profile,
  Skill,
  Experience,
  Education,
  Job,
  Application,
  Document,
  Email,
  Interview,
  Notification,
  SavedSearch,
} from '@prisma/client';

// ============================================
// Extended Types with Relations
// ============================================

export type ProfileWithRelations = Profile & {
  skills: Skill[];
  experiences: Experience[];
  education: Education[];
  user: User;
};

export type JobWithRelations = Job & {
  application?: Application | null;
  user: User;
};

export type ApplicationWithRelations = Application & {
  job: Job;
  emails: Email[];
  interviews: Interview[];
  user: User;
};

export type InterviewWithRelations = Interview & {
  application: Application & {
    job: Job;
  };
};

// ============================================
// API Request/Response Types
// ============================================

// Profile
export interface UpdateProfileRequest {
  headline?: string;
  summary?: string;
  location?: string;
  remotePreference?: 'remote' | 'hybrid' | 'onsite' | 'any';
  willingToRelocate?: boolean;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  yearsOfExperience?: number;
  githubUrl?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  personalWebsite?: string;
}

export interface AddExperienceRequest {
  company: string;
  title: string;
  location?: string;
  locationType?: 'remote' | 'hybrid' | 'onsite';
  startDate: string;
  endDate?: string;
  isCurrent?: boolean;
  description?: string;
  achievements?: string[];
  skills?: string[];
}

export interface AddEducationRequest {
  institution: string;
  degree: string;
  field?: string;
  startDate: string;
  endDate?: string;
  isCurrent?: boolean;
  gpa?: number;
  gpaScale?: number;
  honors?: string[];
  activities?: string[];
}

export interface AddSkillRequest {
  name: string;
  category?: 'technical' | 'soft' | 'language' | 'tool' | 'framework';
  proficiency?: 1 | 2 | 3 | 4 | 5;
  yearsOfExp?: number;
  isHighlight?: boolean;
}

// Jobs
export interface SearchJobsRequest {
  query?: string;
  titles?: string[];
  companies?: string[];
  locations?: string[];
  remoteOnly?: boolean;
  salaryMin?: number;
  salaryMax?: number;
  platforms?: string[];
  minMatchScore?: number;
  page?: number;
  limit?: number;
}

export interface JobMatchResult {
  job: Job;
  matchScore: number;
  matchReasons: string[];
  missingSkills: string[];
}

// Applications
export type ApplicationStatus =
  | 'applied'
  | 'screening'
  | 'phone_screen'
  | 'interview'
  | 'technical'
  | 'onsite'
  | 'offer'
  | 'negotiation'
  | 'accepted'
  | 'rejected'
  | 'withdrawn';

export interface CreateApplicationRequest {
  jobId: string;
  appliedVia?: 'manual' | 'auto' | 'easy_apply' | 'direct';
  resumeDocId?: string;
  coverLetterDocId?: string;
  notes?: string;
}

export interface UpdateApplicationRequest {
  status?: ApplicationStatus;
  notes?: string;
  nextFollowUp?: string;
}

// Documents
export type DocumentType =
  | 'resume'
  | 'cover_letter'
  | 'portfolio'
  | 'reference'
  | 'thank_you'
  | 'other';

export interface GenerateDocumentRequest {
  type: DocumentType;
  jobId?: string;
  templateId?: string;
  customizations?: Record<string, string>;
}

export interface UploadDocumentRequest {
  type: DocumentType;
  name: string;
  file: File;
  isDefault?: boolean;
}

// Interviews
export type InterviewType =
  | 'phone_screen'
  | 'video'
  | 'technical'
  | 'behavioral'
  | 'onsite'
  | 'panel'
  | 'final';

export type InterviewStatus =
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'rescheduled'
  | 'no_show';

export interface CreateInterviewRequest {
  applicationId: string;
  type: InterviewType;
  round?: number;
  title?: string;
  scheduledAt?: string;
  duration?: number;
  location?: string;
  meetingLink?: string;
  platform?: string;
  interviewers?: { name: string; title: string; email?: string }[];
}

export interface UpdateInterviewRequest {
  status?: InterviewStatus;
  scheduledAt?: string;
  notes?: string;
  feedback?: string;
  rating?: 1 | 2 | 3 | 4 | 5;
  outcome?: 'passed' | 'failed' | 'pending';
}

// Emails
export type EmailClassification =
  | 'recruiter'
  | 'rejection'
  | 'interview'
  | 'offer'
  | 'follow_up'
  | 'newsletter'
  | 'spam';

export interface EmailSyncRequest {
  provider: 'gmail' | 'outlook';
  accessToken: string;
  refreshToken?: string;
}

// Platform Optimization
export interface PlatformAnalysisResult {
  platform: 'github' | 'linkedin';
  overallScore: number;
  sections: {
    name: string;
    score: number;
    suggestions: string[];
  }[];
  tasks: {
    id: string;
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    completed: boolean;
  }[];
}

// Auto-Apply
export interface AutoApplySettings {
  isEnabled: boolean;
  minMatchScore: number;
  maxApplicationsPerDay: number;
  maxApplicationsPerWeek: number;
  excludeCompanies: string[];
  excludeKeywords: string[];
  includeCompanies: string[];
  preferRemote: boolean;
  applyWindowStart: string;
  applyWindowEnd: string;
  timezone: string;
  enableWeekends: boolean;
  generateCoverLetter: boolean;
}

// Notifications
export type NotificationType =
  | 'interview_reminder'
  | 'new_match'
  | 'status_update'
  | 'deadline'
  | 'system';

export type NotificationChannel = 'app' | 'email' | 'sms' | 'whatsapp';

export interface NotificationPreferences {
  emailEnabled: boolean;
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  pushEnabled: boolean;
  newMatches: boolean;
  statusUpdates: boolean;
  interviewReminders: boolean;
  deadlineReminders: boolean;
  applicationFollowUps: boolean;
  weeklyDigest: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

// ============================================
// Dashboard/Stats Types
// ============================================

export interface DashboardStats {
  applications: {
    total: number;
    thisWeek: number;
    byStatus: Record<ApplicationStatus, number>;
  };
  interviews: {
    upcoming: number;
    completed: number;
    nextInterview?: InterviewWithRelations;
  };
  jobs: {
    totalMatches: number;
    newToday: number;
    bookmarked: number;
    avgMatchScore: number;
  };
  profile: {
    completionScore: number;
    skillsCount: number;
    experiencesCount: number;
  };
}

export interface ActivityFeedItem {
  id: string;
  type: 'application' | 'interview' | 'email' | 'status_change';
  title: string;
  description: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

// ============================================
// API Response Wrapper
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
