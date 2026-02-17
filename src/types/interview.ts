/**
 * Interview type definitions and Zod schemas
 */

import { z } from 'zod';

// ==================== Enums ====================

export const InterviewStatus = z.enum(['pending', 'confirmed', 'completed', 'cancelled', 'rescheduled']);
export type InterviewStatus = z.infer<typeof InterviewStatus>;

export const InterviewType = z.enum(['phone_screen', 'technical', 'behavioral', 'system_design', 'cultural_fit', 'final', 'unknown']);
export type InterviewType = z.infer<typeof InterviewType>;

export const InterviewOutcome = z.enum(['passed', 'failed', 'pending', 'offer']);
export type InterviewOutcome = z.infer<typeof InterviewOutcome>;

// ==================== Interview Schema ====================

export const InterviewSchema = z.object({
  id: z.string(),
  userId: z.string(),
  emailId: z.string().optional(),
  company: z.string(),
  role: z.string(),
  type: InterviewType,
  proposedTimes: z.array(z.string()).default([]), // ISO date strings
  scheduledAt: z.string().nullable(),
  duration: z.number().default(60), // minutes
  location: z.string().nullable().optional(),
  meetingLink: z.string().url().nullable().optional(),
  interviewerName: z.string().nullable().optional(),
  interviewerEmail: z.string().email().nullable().optional(),
  calendarEventId: z.string().nullable().optional(),
  prepData: z.record(z.string(), z.unknown()).nullable().optional(),
  status: InterviewStatus,
  outcome: InterviewOutcome.nullable().optional(),
  notes: z.string().default(''),
  followUpSent: z.boolean().default(false),
  // Reminder tracking
  morningReminderSent: z.boolean().optional(),
  oneHourReminderSent: z.boolean().optional(),
  thankYouReminderSent: z.boolean().optional(),
  thankYouDraft: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Interview = z.infer<typeof InterviewSchema>;

// ==================== Interview List Item ====================

export const InterviewListItemSchema = z.object({
  id: z.string(),
  company: z.string(),
  role: z.string(),
  scheduledAt: z.string().nullable(),
  status: InterviewStatus,
  type: InterviewType,
});
export type InterviewListItem = z.infer<typeof InterviewListItemSchema>;

// ==================== Request/Response Schemas ====================

export const InterviewCreateSchema = z.object({
  company: z.string().min(1),
  role: z.string().min(1),
  type: InterviewType.optional(),
  proposedTimes: z.array(z.string()).optional(),
  scheduledAt: z.string().optional(),
  location: z.string().optional(),
  meetingLink: z.string().url().optional(),
  interviewerName: z.string().optional(),
  interviewerEmail: z.string().email().optional(),
});
export type InterviewCreateRequest = z.infer<typeof InterviewCreateSchema>;

export const InterviewUpdateSchema = z.object({
  type: InterviewType.optional(),
  scheduledAt: z.string().optional(),
  location: z.string().optional(),
  meetingLink: z.string().url().optional(),
  interviewerName: z.string().optional(),
  interviewerEmail: z.string().email().optional(),
  status: InterviewStatus.optional(),
  outcome: InterviewOutcome.optional(),
  notes: z.string().optional(),
});
export type InterviewUpdateRequest = z.infer<typeof InterviewUpdateSchema>;

// ==================== Company Research ====================

export const KeyPersonSchema = z.object({
  name: z.string(),
  role: z.string(),
  note: z.string(),
});
export type KeyPerson = z.infer<typeof KeyPersonSchema>;

export const CompanyResearchSchema = z.object({
  overview: z.string(),
  products: z.array(z.string()),
  culture: z.string(),
  recentNews: z.array(z.string()),
  competitors: z.array(z.string()),
  interviewTips: z.array(z.string()),
  keyPeople: z.array(KeyPersonSchema),
  talkingPoints: z.array(z.string()),
  questionsToAsk: z.array(z.string()),
});
export type CompanyResearch = z.infer<typeof CompanyResearchSchema>;

// ==================== Interview Questions ====================

export const QuestionCategory = z.enum(['behavioral', 'technical', 'company_specific', 'curveball', 'to_ask']);
export type QuestionCategory = z.infer<typeof QuestionCategory>;

export const QuestionDifficulty = z.enum(['easy', 'medium', 'hard']);
export type QuestionDifficulty = z.infer<typeof QuestionDifficulty>;

export const PredictedQuestionSchema = z.object({
  id: z.string(),
  question: z.string(),
  category: QuestionCategory,
  difficulty: QuestionDifficulty,
  whatTheyTest: z.string(),
  tipToAnswer: z.string(),
});
export type PredictedQuestion = z.infer<typeof PredictedQuestionSchema>;

// ==================== STAR Answers ====================

export const STARAnswerSchema = z.object({
  questionId: z.string(),
  situation: z.string(),
  task: z.string(),
  action: z.string(),
  result: z.string(),
  experienceUsed: z.string(),
});
export type STARAnswer = z.infer<typeof STARAnswerSchema>;

// ==================== Mock Interview ====================

export const MockInterviewMode = z.enum(['behavioral', 'technical', 'mixed']);
export type MockInterviewMode = z.infer<typeof MockInterviewMode>;

export const MockMessageSchema = z.object({
  role: z.enum(['interviewer', 'candidate']),
  content: z.string(),
  timestamp: z.string(),
});
export type MockMessage = z.infer<typeof MockMessageSchema>;

export const MockScoreSchema = z.object({
  questionNumber: z.number(),
  score: z.number().min(1).max(10),
  feedback: z.string(),
});
export type MockScore = z.infer<typeof MockScoreSchema>;

export const MockOverallAssessmentSchema = z.object({
  score: z.number().min(1).max(10),
  summary: z.string(),
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
});
export type MockOverallAssessment = z.infer<typeof MockOverallAssessmentSchema>;

export const MockSessionSchema = z.object({
  id: z.string(),
  interviewId: z.string(),
  mode: MockInterviewMode,
  messages: z.array(MockMessageSchema),
  scores: z.array(MockScoreSchema),
  isComplete: z.boolean(),
  overallAssessment: MockOverallAssessmentSchema.nullable(),
  startedAt: z.string(),
  completedAt: z.string().nullable(),
});
export type MockSession = z.infer<typeof MockSessionSchema>;

// ==================== Prep Package ====================

export const PrepPackageSchema = z.object({
  interviewId: z.string(),
  company: z.string(),
  role: z.string(),
  scheduledAt: z.string().nullable(),
  companyResearch: CompanyResearchSchema,
  questions: z.array(PredictedQuestionSchema),
  starAnswers: z.array(STARAnswerSchema),
  quickTips: z.array(z.string()),
  thingsToAvoid: z.array(z.string()),
  interviewDayChecklist: z.array(z.string()),
  generatedAt: z.string(),
});
export type PrepPackage = z.infer<typeof PrepPackageSchema>;

// ==================== Request/Response Schemas ====================

export const MockInterviewStartSchema = z.object({
  mode: MockInterviewMode,
});
export type MockInterviewStartRequest = z.infer<typeof MockInterviewStartSchema>;

export const MockAnswerSchema = z.object({
  answer: z.string().min(1),
});
export type MockAnswerRequest = z.infer<typeof MockAnswerSchema>;

export const MockAnswerResponseSchema = z.object({
  feedback: z.string(),
  score: z.number().min(1).max(10),
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  nextQuestion: z.string().nullable(),
  isComplete: z.boolean(),
  overallAssessment: MockOverallAssessmentSchema.nullable(),
});
export type MockAnswerResponse = z.infer<typeof MockAnswerResponseSchema>;
