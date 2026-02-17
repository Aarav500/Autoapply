import { NextRequest } from 'next/server';
import { successResponse, authenticate, handleError } from '@/lib/api-utils';
import { storage } from '@/lib/storage';
import { DocumentIndex } from '@/types/documents';
import { logger } from '@/lib/logger';

/**
 * GET /api/documents
 * List all documents for the authenticated user
 */
export async function GET(req: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await authenticate(req);

    logger.info({ userId }, 'List documents request');

    // Load documents index
    const indexKey = `users/${userId}/documents/index.json`;
    const index = await storage.getJSON<DocumentIndex>(indexKey);

    if (!index) {
      return successResponse({
        documents: [],
        total: 0,
      });
    }

    // Sort by creation date (newest first)
    const sortedDocuments = [...index.documents].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return successResponse({
      documents: sortedDocuments,
      total: sortedDocuments.length,
    });
  } catch (error) {
    logger.error({ error }, 'List documents API error');
    return handleError(error);
  }
}
