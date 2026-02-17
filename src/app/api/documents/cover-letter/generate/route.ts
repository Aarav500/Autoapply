import { NextRequest } from 'next/server';
import { errorResponse, successResponse, authenticate, handleError } from '@/lib/api-utils';
import { generateCoverLetterRequestSchema } from '@/types/documents';
import { generateCoverLetter } from '@/services/documents/cover-letter-builder';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await authenticate(req);

    // Parse and validate request body
    const body = await req.json();
    const validation = generateCoverLetterRequestSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse('Invalid request body', 400, 'VALIDATION_ERROR');
    }

    const { jobId } = validation.data;

    logger.info({ userId, jobId }, 'Cover letter generation request');

    // Generate cover letter
    const result = await generateCoverLetter({
      userId,
      jobId,
    });

    return successResponse({
      documentId: result.documentId,
      pdfUrl: result.pdfUrl,
    });
  } catch (error) {
    logger.error({ error }, 'Cover letter generation API error');
    return handleError(error);
  }
}
