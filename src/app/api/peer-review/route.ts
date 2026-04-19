import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticate, successResponse, handleError, errorResponse } from '@/lib/api-utils';
import { aiClient } from '@/lib/ai-client';
import { storage } from '@/lib/storage';
import { generateId } from '@/lib/utils';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FeedbackItem {
  section: string;
  comment: string;
  type: 'praise' | 'suggestion' | 'critical';
}

interface PeerReview {
  id: string;
  reviewerHash: string;
  overall: 1 | 2 | 3 | 4 | 5;
  feedback: FeedbackItem[];
  summary: string;
  wouldHireRating: 1 | 2 | 3 | 4 | 5;
  submittedAt: string;
}

interface AIReviewSection {
  name: string;
  score: number;
  feedback: string;
}

interface AIReview {
  overall_score: number;
  sections: AIReviewSection[];
  top_strengths: string[];
  critical_improvements: string[];
  ats_compatibility: string;
  first_impression: string;
}

interface PeerSubmission {
  id: string;
  userId: string;
  role: string;
  industry: string;
  yearsExp: number;
  cvText: string;
  submittedAt: string;
  reviewsReceived: PeerReview[];
  aiReview?: AIReview;
  status: 'pending' | 'reviewed' | 'archived';
}

interface MySubmissionsStore {
  submissionIds: string[];
}

interface ReviewsGivenStore {
  reviews: Array<{ submissionId: string; reviewId: string; reviewedAt: string }>;
}

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const submitSchema = z.object({
  action: z.literal('submit'),
  role: z.string().min(1).max(120),
  industry: z.string().min(1).max(80),
  yearsExp: z.number().int().min(0).max(50),
  cvText: z.string().min(100).max(8000),
});

const feedbackItemSchema = z.object({
  section: z.string().min(1),
  comment: z.string().min(50),
  type: z.enum(['praise', 'suggestion', 'critical']),
});

const giveReviewSchema = z.object({
  action: z.literal('give-review'),
  submissionId: z.string(),
  overall: z.union([
    z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5),
  ]),
  feedback: z.array(feedbackItemSchema).min(1),
  summary: z.string().min(50).max(1000),
  wouldHireRating: z.union([
    z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5),
  ]),
});

const bodySchema = z.discriminatedUnion('action', [submitSchema, giveReviewSchema]);

// ─── AI Review Schema ─────────────────────────────────────────────────────────

const aiReviewSchema = z.object({
  overall_score: z.number().min(0).max(100),
  sections: z.array(
    z.object({
      name: z.string(),
      score: z.number().min(0).max(100),
      feedback: z.string(),
    })
  ),
  top_strengths: z.array(z.string()),
  critical_improvements: z.array(z.string()),
  ats_compatibility: z.string(),
  first_impression: z.string(),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hashUserId(userId: string): string {
  return crypto.createHash('sha256').update(userId + 'peer-review-salt').digest('hex').slice(0, 16);
}

async function runAIReview(role: string, industry: string, yearsExp: number, cvText: string): Promise<AIReview> {
  const system = `You are an expert recruiter and resume coach with 15+ years of experience hiring for ${industry} roles.
Analyze the provided CV objectively and thoroughly. Score sections 0-100. Be honest about weaknesses and specific about improvements.`;

  const user = `Review this CV for a ${role} position in the ${industry} industry (${yearsExp} years of experience).

CV TEXT:
${cvText}

Evaluate these sections: Summary, Experience, Skills, Education, Format.
Return JSON with overall_score (0-100), sections array, top_strengths (3-5 items), critical_improvements (3-5 items), ats_compatibility assessment, and first_impression statement.`;

  return aiClient.completeJSON(system, user, aiReviewSchema, { model: 'balanced', maxTokens: 3072 });
}

async function getPool(): Promise<PeerSubmission[]> {
  const raw = await storage.getJSON<PeerSubmission[]>('peer-review/pool.json');
  return Array.isArray(raw) ? raw : [];
}

async function savePool(pool: PeerSubmission[]): Promise<void> {
  await storage.putJSON('peer-review/pool.json', pool);
}

// ─── GET Handler ─────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { userId } = await authenticate(request);
    const action = request.nextUrl.searchParams.get('action');

    if (action === 'pool') {
      const pool = await getPool();
      const userHash = hashUserId(userId);
      // Exclude user's own submissions; return up to 3 needing review
      const candidates = pool
        .filter((s) => s.userId !== userHash && s.status !== 'archived')
        .slice(0, 3)
        .map((s) => ({
          id: s.id,
          role: s.role,
          industry: s.industry,
          yearsExp: s.yearsExp,
          cvText: s.cvText,
          submittedAt: s.submittedAt,
          reviewCount: s.reviewsReceived.length,
        }));

      return successResponse({ submissions: candidates });
    }

    if (action === 'my-submissions') {
      const myStore = await storage.getJSON<MySubmissionsStore>(
        `users/${userId}/peer-review/my-submissions.json`
      );
      const ids: string[] = myStore?.submissionIds ?? [];

      const submissions = await Promise.all(
        ids.map((id) => storage.getJSON<PeerSubmission>(`peer-review/submissions/${id}.json`))
      );

      const valid = submissions.filter((s): s is PeerSubmission => s !== null);

      return successResponse({ submissions: valid });
    }

    return errorResponse('Missing action parameter', 400, 'MISSING_ACTION');
  } catch (error) {
    return handleError(error);
  }
}

// ─── POST Handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const { userId } = await authenticate(request);
    const body = await request.json();

    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message ?? 'Validation error', 400, 'VALIDATION_ERROR');
    }

    const data = parsed.data;

    // ── Submit CV for review ─────────────────────────────────────────────────
    if (data.action === 'submit') {
      const userHash = hashUserId(userId);
      const submissionId = generateId();

      logger.info({ userId, submissionId }, 'Running AI review for new submission');

      let aiReview: AIReview | undefined;
      try {
        aiReview = await runAIReview(data.role, data.industry, data.yearsExp, data.cvText);
      } catch (err) {
        logger.warn({ err }, 'AI review failed, proceeding without it');
        aiReview = undefined;
      }

      const submission: PeerSubmission = {
        id: submissionId,
        userId: userHash,
        role: data.role,
        industry: data.industry,
        yearsExp: data.yearsExp,
        cvText: data.cvText,
        submittedAt: new Date().toISOString(),
        reviewsReceived: [],
        aiReview,
        status: 'pending',
      };

      // Save full submission
      await storage.putJSON(`peer-review/submissions/${submissionId}.json`, submission);

      // Add to pool
      const pool = await getPool();
      pool.unshift(submission);
      if (pool.length > 200) pool.splice(200);
      await savePool(pool);

      // Track in user's own list
      const myStore = (await storage.getJSON<MySubmissionsStore>(
        `users/${userId}/peer-review/my-submissions.json`
      )) ?? { submissionIds: [] };
      myStore.submissionIds.unshift(submissionId);
      await storage.putJSON(`users/${userId}/peer-review/my-submissions.json`, myStore);

      return successResponse({ submission, aiReview });
    }

    // ── Give a review ────────────────────────────────────────────────────────
    if (data.action === 'give-review') {
      const submission = await storage.getJSON<PeerSubmission>(
        `peer-review/submissions/${data.submissionId}.json`
      );

      if (!submission) {
        return errorResponse('Submission not found', 404, 'NOT_FOUND');
      }

      const userHash = hashUserId(userId);
      if (submission.userId === userHash) {
        return errorResponse('Cannot review your own submission', 400, 'SELF_REVIEW');
      }

      // Validate each feedback comment is at least 50 chars
      for (const fb of data.feedback) {
        if (fb.comment.length < 50) {
          return errorResponse(
            `Feedback for section "${fb.section}" must be at least 50 characters`,
            400,
            'INSUFFICIENT_FEEDBACK'
          );
        }
      }

      const reviewId = generateId();
      const review: PeerReview = {
        id: reviewId,
        reviewerHash: userHash,
        overall: data.overall,
        feedback: data.feedback as FeedbackItem[],
        summary: data.summary,
        wouldHireRating: data.wouldHireRating,
        submittedAt: new Date().toISOString(),
      };

      submission.reviewsReceived.push(review);
      submission.status = 'reviewed';

      // Persist updated submission
      await storage.putJSON(`peer-review/submissions/${data.submissionId}.json`, submission);

      // Update pool entry
      const pool = await getPool();
      const idx = pool.findIndex((s) => s.id === data.submissionId);
      if (idx !== -1) {
        pool[idx] = submission;
        await savePool(pool);
      }

      // Track in reviewer's history
      const givenStore = (await storage.getJSON<ReviewsGivenStore>(
        `users/${userId}/peer-review/reviews-given.json`
      )) ?? { reviews: [] };
      givenStore.reviews.unshift({
        submissionId: data.submissionId,
        reviewId,
        reviewedAt: new Date().toISOString(),
      });
      await storage.putJSON(`users/${userId}/peer-review/reviews-given.json`, givenStore);

      return successResponse({ review, reviewsGivenCount: givenStore.reviews.length });
    }

    return errorResponse('Invalid action', 400, 'INVALID_ACTION');
  } catch (error) {
    return handleError(error);
  }
}
