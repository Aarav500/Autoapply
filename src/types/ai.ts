import { z } from 'zod';

// ============================================================================
// CV Generator Types
// ============================================================================

export const CVHeaderSchema = z.object({
  name: z.string(),
  title: z.string().optional().default(''),
  email: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  location: z.string().optional().default(''),
  linkedin: z.string().optional(),
  github: z.string().optional(),
  website: z.string().optional(),
});

export const CVExperienceSchema = z.object({
  company: z.string(),
  role: z.string(),
  startDate: z.string().optional().default(''),
  endDate: z.string().nullable().optional().default(null),
  location: z.string().optional().default(''),
  achievements: z.array(z.string()).optional().default([]),
  technologies: z.array(z.string()).optional(),
});

export const CVEducationSchema = z.object({
  institution: z.string(),
  degree: z.string(),
  field: z.string().optional().default(''),
  startDate: z.string().optional().default(''),
  endDate: z.string().nullable().optional().default(null),
  location: z.string().optional().default(''),
  gpa: z.string().optional(),
  honors: z.array(z.string()).optional(),
});

export const CVCertificationSchema = z.object({
  name: z.string(),
  issuer: z.string().optional().default(''),
  date: z.string().optional().default(''),
  expiryDate: z.string().nullable().optional(),
  credentialId: z.string().optional(),
  url: z.string().optional(),
});

export const CVProjectSchema = z.object({
  name: z.string(),
  description: z.string().optional().default(''),
  technologies: z.array(z.string()).optional().default([]),
  url: z.string().optional(),
  achievements: z.array(z.string()).optional().default([]),
});

export const CVSkillsSchema = z.object({
  languages: z.array(z.string()).optional().default([]),
  frameworks: z.array(z.string()).optional().default([]),
  tools: z.array(z.string()).optional().default([]),
  methodologies: z.array(z.string()).optional(),
});

export const GeneratedCVSchema = z.object({
  header: CVHeaderSchema,
  summary: z.string(),
  experience: z.array(CVExperienceSchema),
  education: z.array(CVEducationSchema),
  skills: CVSkillsSchema,
  certifications: z.array(CVCertificationSchema).optional(),
  projects: z.array(CVProjectSchema).optional(),
});

export type CVHeader = z.infer<typeof CVHeaderSchema>;
export type CVExperience = z.infer<typeof CVExperienceSchema>;
export type CVEducation = z.infer<typeof CVEducationSchema>;
export type CVCertification = z.infer<typeof CVCertificationSchema>;
export type CVProject = z.infer<typeof CVProjectSchema>;
export type CVSkills = z.infer<typeof CVSkillsSchema>;
export type GeneratedCV = z.infer<typeof GeneratedCVSchema>;

// ============================================================================
// Cover Letter Types
// ============================================================================

export const CoverLetterParagraphSchema = z.object({
  content: z.string(),
  purpose: z.string(), // e.g., "hook", "experience", "skills-match", "company-fit", "call-to-action"
});

export const GeneratedCoverLetterSchema = z.object({
  greeting: z.string(),
  paragraphs: z.array(CoverLetterParagraphSchema),
  signoff: z.string(),
  key_points_addressed: z.array(z.string()),
});

export type CoverLetterParagraph = z.infer<typeof CoverLetterParagraphSchema>;
export type GeneratedCoverLetter = z.infer<typeof GeneratedCoverLetterSchema>;

// ============================================================================
// Job Matcher Types
// ============================================================================

export const JobMatchRecommendationSchema = z.enum(['strong_apply', 'apply', 'maybe', 'skip']);

export const JobMatchResultSchema = z.object({
  match_score: z.number().min(0).max(100),
  matching_skills: z.array(z.string()),
  missing_skills: z.array(z.string()),
  recommendation: JobMatchRecommendationSchema,
  reasoning: z.string(),
});

export type JobMatchRecommendation = z.infer<typeof JobMatchRecommendationSchema>;
export type JobMatchResult = z.infer<typeof JobMatchResultSchema>;

// ============================================================================
// Email Analyzer Types
// ============================================================================

export const EmailCategorySchema = z.enum([
  'interview_invite',
  'rejection',
  'recruiter_outreach',
  'follow_up',
  'offer',
  'action_required',
  'other',
]);

export const EmailUrgencySchema = z.enum(['high', 'medium', 'low']);

export const ExtractedEmailDataSchema = z.object({
  company: z.string().nullable().optional().default(null),
  role: z.string().nullable().optional().default(null),
  dates: z.array(z.string()).optional().default([]),
  times: z.array(z.string()).optional().default([]),
  links: z.array(z.string()).optional().default([]),
  interviewer: z.string().nullable().optional().default(null),
});

export const EmailAnalysisSchema = z.object({
  category: EmailCategorySchema,
  extracted_data: ExtractedEmailDataSchema,
  urgency: EmailUrgencySchema,
  suggested_response: z.string(),
});

export type EmailCategory = z.infer<typeof EmailCategorySchema>;
export type EmailUrgency = z.infer<typeof EmailUrgencySchema>;
export type ExtractedEmailData = z.infer<typeof ExtractedEmailDataSchema>;
export type EmailAnalysis = z.infer<typeof EmailAnalysisSchema>;

// ============================================================================
// GitHub Optimizer Types
// ============================================================================

export const GitHubSectionScoreSchema = z.object({
  score: z.number().min(0).max(100),
  suggestions: z.array(z.string()).optional().default([]),
});

export const GitHubOptimizationSchema = z.object({
  overall_score: z.number().min(0).max(100),
  sections: z.object({
    bio: GitHubSectionScoreSchema,
    readme: GitHubSectionScoreSchema,
    repos: GitHubSectionScoreSchema,
    contributions: GitHubSectionScoreSchema,
  }),
});

export type GitHubSectionScore = z.infer<typeof GitHubSectionScoreSchema>;
export type GitHubOptimization = z.infer<typeof GitHubOptimizationSchema>;

// ============================================================================
// LinkedIn Optimizer Types
// ============================================================================

export const LinkedInSectionScoreSchema = z.object({
  score: z.number().min(0).max(100),
  suggestions: z.array(z.string()).optional().default([]),
});

export const LinkedInOptimizationSchema = z.object({
  overall_score: z.number().min(0).max(100),
  headline_options: z.array(z.string()),
  sections: z.object({
    headline: LinkedInSectionScoreSchema,
    about: LinkedInSectionScoreSchema,
    experience: LinkedInSectionScoreSchema,
    skills: LinkedInSectionScoreSchema,
    recommendations: LinkedInSectionScoreSchema,
  }),
});

export type LinkedInSectionScore = z.infer<typeof LinkedInSectionScoreSchema>;
export type LinkedInOptimization = z.infer<typeof LinkedInOptimizationSchema>;

// ============================================================================
// Interview Coach Types
// ============================================================================

export const STARAnswerSchema = z.object({
  question: z.string(),
  situation: z.string(),
  task: z.string(),
  action: z.string(),
  result: z.string(),
});

export const InterviewQuestionSchema = z.object({
  question: z.string(),
  category: z.string(), // e.g., "behavioral", "technical", "system-design", "leadership"
  difficulty: z.enum(['easy', 'medium', 'hard']),
  sample_answer: z.string().optional(),
});

export const InterviewPrepSchema = z.object({
  company_research: z.string(),
  behavioral_questions: z.array(InterviewQuestionSchema),
  technical_questions: z.array(InterviewQuestionSchema),
  star_answers: z.array(STARAnswerSchema),
  questions_to_ask: z.array(z.string()),
});

export type STARAnswer = z.infer<typeof STARAnswerSchema>;
export type InterviewQuestion = z.infer<typeof InterviewQuestionSchema>;
export type InterviewPrep = z.infer<typeof InterviewPrepSchema>;

// ============================================================================
// Auto-Responder Types
// ============================================================================

export const AutoResponseSchema = z.object({
  subject: z.string(),
  body: z.string(),
  tone: z.enum(['professional', 'friendly', 'formal', 'enthusiastic']),
});

export type AutoResponse = z.infer<typeof AutoResponseSchema>;

// ============================================================================
// AI Client Options
// ============================================================================

export type AIModel = 'fast' | 'balanced' | 'powerful';

export interface AIClientOptions {
  model?: AIModel;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
}

export interface AIUsageMetrics {
  input_tokens: number;
  output_tokens: number;
  model: string;
  duration_ms: number;
}
