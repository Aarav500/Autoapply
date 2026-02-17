import { z } from 'zod';

// Application statuses
export type ApplicationStatus = 'submitted' | 'failed' | 'pending_review' | 'withdrawn';

// Application methods
export type ApplicationMethod = 'direct_website' | 'email' | 'linkedin_easy' | 'manual_required';

// Application result from automation
export interface ApplicationResult {
  success: boolean;
  applicationId: string;
  method: ApplicationMethod;
  error?: string;
  screenshotKey?: string; // S3 key to screenshot of confirmation/error
  confirmationMessage?: string;
}

// Application record
export interface Application {
  id: string;
  jobId: string;
  userId: string;
  status: ApplicationStatus;
  method: ApplicationMethod;
  appliedAt: string | null;
  cvDocumentId: string | null;
  coverLetterDocumentId: string | null;
  error: string | null;
  screenshotKey: string | null;
  confirmationMessage: string | null;
  metadata?: {
    attemptCount?: number;
    lastAttemptAt?: string;
    formFieldsFilled?: number;
    totalFormFields?: number;
  };
}

// Application list item
export interface ApplicationListItem {
  id: string;
  jobId: string;
  status: ApplicationStatus;
  method: ApplicationMethod;
  appliedAt: string | null;
}

// Auto-apply rules
export interface AutoApplyRule {
  id: string;
  enabled: boolean;
  minMatchScore: number;
  platforms: string[];
  excludeCompanies: string[];
  requireRemote: boolean;
  minSalary: number | null;
  maxApplicationsPerDay: number;
}

// Form field for browser automation
export interface FormField {
  selector: string;
  type: 'text' | 'email' | 'tel' | 'number' | 'select' | 'textarea' | 'file' | 'checkbox' | 'radio';
  value: string;
  confidence: number; // 0-1, how confident AI is about this mapping
  label?: string;
}

// Custom answer for open-ended questions
export interface CustomAnswer {
  selector: string;
  question: string;
  answer: string;
  confidence: number;
}

// Form analysis result from AI
export interface FormAnalysis {
  fields: FormField[];
  customAnswers: CustomAnswer[];
  requiresManualReview: boolean;
  missingRequiredData?: string[];
  warnings?: string[];
}

// Zod schemas
export const applicationStatusSchema = z.enum(['submitted', 'failed', 'pending_review', 'withdrawn']);
export const applicationMethodSchema = z.enum(['direct_website', 'email', 'linkedin_easy', 'manual_required']);

export const applicationSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  userId: z.string(),
  status: applicationStatusSchema,
  method: applicationMethodSchema,
  appliedAt: z.string().nullable(),
  cvDocumentId: z.string().nullable(),
  coverLetterDocumentId: z.string().nullable(),
  error: z.string().nullable(),
  screenshotKey: z.string().nullable(),
  confirmationMessage: z.string().nullable(),
  metadata: z.object({
    attemptCount: z.number().optional(),
    lastAttemptAt: z.string().optional(),
    formFieldsFilled: z.number().optional(),
    totalFormFields: z.number().optional(),
  }).optional(),
});

export const autoApplyRuleSchema = z.object({
  id: z.string(),
  enabled: z.boolean(),
  minMatchScore: z.number().min(0).max(100),
  platforms: z.array(z.string()),
  excludeCompanies: z.array(z.string()),
  requireRemote: z.boolean(),
  minSalary: z.number().nullable(),
  maxApplicationsPerDay: z.number().min(1).max(50),
});

export const formFieldSchema = z.object({
  selector: z.string(),
  type: z.enum(['text', 'email', 'tel', 'number', 'select', 'textarea', 'file', 'checkbox', 'radio']),
  value: z.string(),
  confidence: z.number().min(0).max(1),
  label: z.string().optional(),
});

export const customAnswerSchema = z.object({
  selector: z.string(),
  question: z.string(),
  answer: z.string(),
  confidence: z.number().min(0).max(1),
});

export const formAnalysisSchema = z.object({
  fields: z.array(formFieldSchema),
  customAnswers: z.array(customAnswerSchema),
  requiresManualReview: z.boolean(),
  missingRequiredData: z.array(z.string()).optional(),
  warnings: z.array(z.string()).optional(),
});
