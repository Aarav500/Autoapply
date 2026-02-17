import { NextRequest } from 'next/server';
import { errorResponse, successResponse, authenticate, handleError } from '@/lib/api-utils';
import { generateCVRequestSchema } from '@/types/documents';
import { generateCV } from '@/services/documents/cv-builder';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await authenticate(req);

    // Parse and validate request body
    const body = await req.json();
    const validation = generateCVRequestSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse('Invalid request body', 400, 'VALIDATION_ERROR');
    }

    const { jobId, template } = validation.data;

    logger.info({ userId, jobId, template }, 'CV generation request');

    // Generate CV
    const result = await generateCV({
      userId,
      jobId,
      templateName: template,
    });

    return successResponse({
      documentId: result.documentId,
      pdfUrl: result.pdfUrl,
      docxUrl: result.docxUrl,
      atsScore: result.atsScore,
    });
  } catch (error) {
    logger.error({ error }, 'CV generation API error');
    return handleError(error);
  }
}
