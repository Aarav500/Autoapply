/**
 * POST /api/profile/import/resume - Upload and parse resume file
 */

import { NextRequest } from 'next/server';
import { apiResponse, apiError, authenticate } from '@/lib/api-utils';
import { parseResume } from '@/services/profile/importers/resume-parser';
import { ValidationError, AuthError } from '@/lib/errors';
import { logger } from '@/lib/logger';

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await authenticate(request);

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('resume') as File | null;

    if (!file) {
      return apiError(new ValidationError('No file uploaded'), 400);
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return apiError(new ValidationError('File size exceeds 10MB limit'), 400);
    }

    // Validate file type
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.pdf') && !fileName.endsWith('.docx') && !fileName.endsWith('.doc')) {
      return apiError(
        new ValidationError('Invalid file type. Please upload PDF or DOCX'),
        400
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse resume
    const profile = await parseResume(userId, buffer, file.name);

    logger.info({ userId, fileName: file.name, fileSize: file.size }, 'Resume imported via API');
    return apiResponse({ profile });
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error, 401);
    }
    if (error instanceof ValidationError) {
      return apiError(error, 400);
    }
    logger.error({ error }, 'Import resume endpoint error');
    return apiError(new Error('Failed to import resume'), 500);
  }
}
