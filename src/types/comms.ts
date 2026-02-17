import { z } from 'zod';

// ============================================================================
// Gmail Message Types
// ============================================================================

export const GmailMessageSchema = z.object({
  id: z.string(),
  externalId: z.string(),
  threadId: z.string(),
  from: z.string(),
  to: z.string(),
  subject: z.string(),
  body: z.string(),
  bodyHtml: z.string(),
  snippet: z.string(),
  receivedAt: z.string(),
  isRead: z.boolean(),
});

export type GmailMessage = z.infer<typeof GmailMessageSchema>;

// ============================================================================
// Email Analysis Types
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

export type EmailCategory = z.infer<typeof EmailCategorySchema>;

export const EmailUrgencySchema = z.enum(['high', 'medium', 'low']);

export type EmailUrgency = z.infer<typeof EmailUrgencySchema>;

export const ExtractedDataSchema = z.object({
  company: z.string().optional(),
  role: z.string().optional(),
  dates: z.array(z.string()).optional(),
  times: z.array(z.string()).optional(),
  location: z.string().optional(),
  meetingLink: z.string().optional(),
  interviewerName: z.string().optional(),
  salary: z.string().optional(),
});

export type ExtractedData = z.infer<typeof ExtractedDataSchema>;

export const EmailAnalysisSchema = z.object({
  category: EmailCategorySchema,
  isJobRelated: z.boolean(),
  urgency: EmailUrgencySchema,
  extractedData: ExtractedDataSchema,
  summary: z.string(),
  suggestedResponse: z.string().nullable(),
  confidence: z.number().min(0).max(1),
});

export type EmailAnalysis = z.infer<typeof EmailAnalysisSchema>;

// ============================================================================
// Processed Email Types
// ============================================================================

export const ProcessedEmailSchema = GmailMessageSchema.extend({
  aiAnalysis: EmailAnalysisSchema,
  suggestedReply: z.string().nullable(),
  autoReplied: z.boolean(),
});

export type ProcessedEmail = z.infer<typeof ProcessedEmailSchema>;

// ============================================================================
// Email Index Entry (for index.json list)
// ============================================================================

export const EmailIndexEntrySchema = z.object({
  id: z.string(),
  externalId: z.string(),
  threadId: z.string(),
  from: z.string(),
  to: z.string(),
  subject: z.string(),
  snippet: z.string(),
  category: EmailCategorySchema.optional(),
  isRead: z.boolean(),
  isJobRelated: z.boolean(),
  urgency: EmailUrgencySchema.optional(),
  receivedAt: z.string(),
});

export type EmailIndexEntry = z.infer<typeof EmailIndexEntrySchema>;

// ============================================================================
// Email Thread Types
// ============================================================================

export const EmailThreadStatusSchema = z.enum(['active', 'waiting', 'closed']);

export type EmailThreadStatus = z.infer<typeof EmailThreadStatusSchema>;

export const EmailThreadSchema = z.object({
  threadId: z.string(),
  company: z.string(),
  role: z.string(),
  latestSubject: z.string(),
  messageCount: z.number(),
  latestDate: z.string(),
  status: EmailThreadStatusSchema,
  messages: z.array(ProcessedEmailSchema),
});

export type EmailThread = z.infer<typeof EmailThreadSchema>;

// ============================================================================
// Auto-Reply Rules
// ============================================================================

export const AutoReplyRuleSchema = z.object({
  id: z.string(),
  category: EmailCategorySchema,
  enabled: z.boolean(),
  minConfidence: z.number().min(0).max(1),
  template: z.string().optional(),
});

export type AutoReplyRule = z.infer<typeof AutoReplyRuleSchema>;

// ============================================================================
// Email Settings (part of user settings.json)
// ============================================================================

export const EmailSettingsSchema = z.object({
  googleRefreshToken: z.string().optional(),
  autoReplyEnabled: z.boolean(),
  autoReplyRules: z.array(AutoReplyRuleSchema),
  lastEmailSync: z.string().optional(),
});

export type EmailSettings = z.infer<typeof EmailSettingsSchema>;

// ============================================================================
// API Request/Response Types
// ============================================================================

export const SendEmailRequestSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1),
  threadId: z.string().optional(),
  inReplyTo: z.string().optional(),
});

export type SendEmailRequest = z.infer<typeof SendEmailRequestSchema>;

export const GenerateReplyRequestSchema = z.object({
  emailId: z.string(),
});

export type GenerateReplyRequest = z.infer<typeof GenerateReplyRequestSchema>;

export const UpdateAutoReplyRequestSchema = z.object({
  enabled: z.boolean(),
  rules: z.array(AutoReplyRuleSchema),
});

export type UpdateAutoReplyRequest = z.infer<typeof UpdateAutoReplyRequestSchema>;

// ============================================================================
// Processing Stats
// ============================================================================

export const EmailProcessingStatsSchema = z.object({
  processed: z.number(),
  jobRelated: z.number(),
  interviewsDetected: z.number(),
  autoReplied: z.number(),
});

export type EmailProcessingStats = z.infer<typeof EmailProcessingStatsSchema>;
