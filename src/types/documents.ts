import { z } from 'zod';

// Document Types
export type DocumentType = 'cv' | 'cover-letter' | 'resume' | 'other';

export interface Document {
  id: string;
  userId: string;
  type: DocumentType;
  name: string;
  description?: string;
  jobId?: string;
  templateName?: string;
  createdAt: string;
  updatedAt: string;
  files: {
    pdf?: string; // S3 key
    docx?: string; // S3 key
  };
  metadata?: {
    atsScore?: number;
    wordCount?: number;
    pageCount?: number;
  };
}

export interface DocumentIndex {
  documents: Document[];
  lastUpdated: string;
}

// CV Content Structure (matches AI cv-generator output)
export interface CVContent {
  contactInfo: {
    name: string;
    email: string;
    phone?: string;
    location?: string;
    linkedin?: string;
    github?: string;
    website?: string;
  };
  summary: string;
  experience: Array<{
    company: string;
    position: string;
    location?: string;
    startDate: string;
    endDate: string | null; // null = current
    highlights: string[]; // Quantified achievements
  }>;
  education: Array<{
    institution: string;
    degree: string;
    field: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    gpa?: string;
    honors?: string[];
  }>;
  skills: {
    technical: string[];
    soft: string[];
    languages?: string[];
    certifications?: string[];
  };
  projects?: Array<{
    name: string;
    description: string;
    technologies: string[];
    link?: string;
    highlights: string[];
  }>;
  awards?: Array<{
    title: string;
    issuer: string;
    date: string;
    description?: string;
  }>;
}

// Cover Letter Content
export interface CoverLetterContent {
  recipientName?: string;
  companyName: string;
  position: string;
  date: string;
  greeting: string;
  opening: string;
  body: string[];
  closing: string;
  signature: string;
  senderInfo: {
    name: string;
    email: string;
    phone?: string;
    address?: string;
  };
}

// ATS Check Result
export interface ATSResult {
  score: number; // 0-100
  breakdown: {
    formatting: {
      score: number;
      passed: string[];
      failed: string[];
    };
    keywords: {
      score: number;
      found: string[];
      missing: string[];
      suggestions: string[];
    };
    content: {
      score: number;
      hasSummary: boolean;
      hasQuantifiedAchievements: boolean;
      hasActionVerbs: boolean;
      hasContactInfo: boolean;
      suggestions: string[];
    };
  };
  overallSuggestions: string[];
}

// Zod Schemas
export const generateCVRequestSchema = z.object({
  jobId: z.string().optional(),
  template: z.enum(['modern-clean', 'ats-optimized', 'creative']).default('modern-clean'),
});

export const generateCoverLetterRequestSchema = z.object({
  jobId: z.string(),
});

export const atsCheckRequestSchema = z.object({
  documentId: z.string(),
  jobId: z.string().optional(),
});

export type GenerateCVRequest = z.infer<typeof generateCVRequestSchema>;
export type GenerateCoverLetterRequest = z.infer<typeof generateCoverLetterRequestSchema>;
export type ATSCheckRequest = z.infer<typeof atsCheckRequestSchema>;
