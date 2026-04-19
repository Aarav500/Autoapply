import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticate, successResponse, handleError, errorResponse } from '@/lib/api-utils';
import { aiClient } from '@/lib/ai-client';
import { storage } from '@/lib/storage';
import { logger } from '@/lib/logger';

// ===== Schemas =====

const requestSchema = z.object({
  paperId: z.string().min(1),
  title: z.string().min(1),
  abstract: z.string().min(1),
  authors: z.array(z.string().min(1)).min(1),
  category: z.string().min(1),
  pdfContent: z.string().optional(),
});

const venueSchema = z.object({
  name: z.string(),
  type: z.string(),
  submission_url: z.string().optional(),
  submission_email: z.string().optional(),
  deadline: z.string().optional(),
  acceptance_rate: z.string().optional(),
});

const submitResultSchema = z.object({
  arxiv_category: z.string(),
  arxiv_instructions: z.array(z.string()),
  recommended_venues: z.array(venueSchema),
  formatted_abstract: z.string(),
  cover_letter: z.string(),
  latex_template: z.string(),
  email_submission_template: z.string(),
});

type SubmitResult = z.infer<typeof submitResultSchema>;
type VenueData = z.infer<typeof venueSchema>;

// ===== Stored paper type =====

interface StoredPaper {
  id: string;
  title: string;
  field: string;
  status: string;
  updatedAt: string;
  abstract?: string;
  authors?: string[];
  category?: string;
}

// ===== AI prompt helpers =====

function buildSubmissionSystemPrompt(): string {
  return `You are an expert academic publishing consultant with deep knowledge of:
- arXiv categories, submission processes, and best practices
- Academic journals across all disciplines (IEEE, ACM, Nature, Elsevier, Springer, etc.)
- Conference venues: NeurIPS, ICML, CVPR, ICLR, ACL, EMNLP, SIGMOD, VLDB, etc.
- Preprint servers and open access publishing
- LaTeX formatting standards for academic papers
- Cover letter writing for journal submissions
- Email submission formats for workshops and smaller venues

Your role is to provide actionable, specific guidance for submitting a research paper. Always recommend REAL venues that exist. Be specific about arXiv categories (e.g., cs.LG, cs.CV, math.OC). Provide email templates that follow professional academic norms.

Return valid JSON matching the requested schema exactly.`;
}

function buildSubmissionUserPrompt(
  title: string,
  abstract: string,
  authors: string[],
  category: string,
  pdfContent?: string
): string {
  const contentSection = pdfContent
    ? `\n\nAdditional Paper Content (excerpt):\n${pdfContent.slice(0, 3000)}`
    : '';

  return `Generate a complete submission package for the following research paper:

Title: ${title}

Authors: ${authors.join(', ')}

Research Category/Field: ${category}

Abstract:
${abstract}${contentSection}

Provide:
1. arxiv_category: The most appropriate arXiv category code (e.g., "cs.LG", "math.ST", "physics.comp-ph")

2. arxiv_instructions: Step-by-step instructions for submitting to arXiv (5-8 specific steps)

3. recommended_venues: 5 real publication venues ranked by fit score, each with:
   - name: Full venue name
   - type: "journal", "conference", or "workshop"
   - submission_url: Real URL if known (e.g., "https://openreview.net/group?id=NeurIPS.cc/2024/Conference")
   - submission_email: Submission email if this venue accepts email submissions
   - deadline: Upcoming deadline if known (month/year format, e.g., "June 2026")
   - acceptance_rate: Typical acceptance rate (e.g., "~25%", "~15%")

4. formatted_abstract: A polished, publication-ready version of the abstract with improved clarity, proper structure (motivation, method, results, significance), and within 250 words

5. cover_letter: A professional cover letter for journal submission (300-400 words), addressed generically to "Dear Editor", highlighting the paper's contributions, novelty, and significance to the field

6. latex_template: A minimal LaTeX document template for this paper (include \\documentclass, usepackage lines, title/author/abstract setup — do NOT generate full paper content, just the template structure)

7. email_submission_template: A professional email template for submitting to venues that accept email submission, including subject line format, body with paper details, and attachment instructions`;
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await authenticate(request);

    const body: unknown = await request.json();
    const parseResult = requestSchema.safeParse(body);
    if (!parseResult.success) {
      return errorResponse(parseResult.error.issues[0]?.message ?? 'Invalid request', 400);
    }

    const { paperId, title, abstract, authors, category, pdfContent } = parseResult.data;

    // Load the paper from S3 to verify it belongs to this user
    // (It's okay if it doesn't exist yet — user may be submitting without saving first)
    let storedPaper: StoredPaper | null = null;
    try {
      storedPaper = await storage.getJSON<StoredPaper>(
        `users/${userId}/research/${paperId}.json`
      );
    } catch {
      // Not found is fine — paper may not be saved yet
    }

    logger.info({ userId, paperId, title }, 'Generating research submission package');

    // Call AI to generate the full submission package
    const system = buildSubmissionSystemPrompt();
    const user = buildSubmissionUserPrompt(title, abstract, authors, category, pdfContent);

    const venueSchemaForAI = z.object({
      name: z.string(),
      type: z.string(),
      submission_url: z.string().optional(),
      submission_email: z.string().optional(),
      deadline: z.string().optional(),
      acceptance_rate: z.string().optional(),
    });

    const aiResultSchema = z.object({
      arxiv_category: z.string(),
      arxiv_instructions: z.array(z.string()),
      recommended_venues: z.array(venueSchemaForAI),
      formatted_abstract: z.string(),
      cover_letter: z.string(),
      latex_template: z.string(),
      email_submission_template: z.string(),
    });

    let result: SubmitResult;
    try {
      result = await aiClient.completeJSON<SubmitResult>(system, user, aiResultSchema, {
        model: 'powerful',
        maxTokens: 8192,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'AI generation failed';
      logger.error({ err, userId, paperId }, 'AI submission package generation failed');
      return errorResponse(`Failed to generate submission package: ${msg}`, 500);
    }

    // Validate result against schema
    const validatedResult = submitResultSchema.safeParse(result);
    if (!validatedResult.success) {
      return errorResponse('AI returned invalid submission package format', 500);
    }

    // Update paper status in S3 if it exists
    if (storedPaper) {
      const updatedPaper: StoredPaper = {
        ...storedPaper,
        status: 'ready_to_submit',
        updatedAt: new Date().toISOString(),
        abstract,
        authors,
        category,
      };
      await storage
        .putJSON(`users/${userId}/research/${paperId}.json`, updatedPaper)
        .catch((err: unknown) => {
          logger.warn({ err, userId, paperId }, 'Failed to update paper status');
        });
    }

    logger.info(
      {
        userId,
        paperId,
        arxivCategory: validatedResult.data.arxiv_category,
        venueCount: validatedResult.data.recommended_venues.length,
      },
      'Submission package generated successfully'
    );

    return successResponse({
      submission: validatedResult.data,
      paperTitle: title,
      paperId,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    return handleError(err);
  }
}

// GET: Return submission package for an existing paper
export async function GET(request: NextRequest) {
  try {
    const { userId } = await authenticate(request);

    const { searchParams } = new URL(request.url);
    const paperId = searchParams.get('paperId');

    if (!paperId) {
      return errorResponse('paperId query parameter is required', 400);
    }

    const paper = await storage.getJSON<StoredPaper & { submissionPackage?: SubmitResult }>(
      `users/${userId}/research/${paperId}.json`
    );

    if (!paper) {
      return errorResponse('Paper not found', 404);
    }

    // Build simplified venue list from the stored paper if no package exists
    const venues: VenueData[] = [];

    return successResponse({
      paper,
      hasSubmissionPackage: Boolean(paper.submissionPackage),
      venues,
    });
  } catch (err) {
    return handleError(err);
  }
}
