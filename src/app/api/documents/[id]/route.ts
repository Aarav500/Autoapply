import { NextRequest } from 'next/server';
import { errorResponse, successResponse, authenticate, handleError } from '@/lib/api-utils';
import { storage } from '@/lib/storage';
import { DocumentIndex } from '@/types/documents';
import { logger } from '@/lib/logger';

/**
 * GET /api/documents/[id]
 * Get document details with presigned download URLs
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const { userId } = await authenticate(req);
    const { id: documentId } = await params;

    logger.info({ userId, documentId }, 'Get document request');

    // Load documents index
    const indexKey = `users/${userId}/documents/index.json`;
    const index = await storage.getJSON<DocumentIndex>(indexKey);

    if (!index) {
      return errorResponse('Document not found', 404, 'DOCUMENT_NOT_FOUND');
    }

    // Find document
    const document = index.documents.find(d => d.id === documentId);

    if (!document) {
      return errorResponse('Document not found', 404, 'DOCUMENT_NOT_FOUND');
    }

    // Generate presigned URLs for files
    const urls: { pdf?: string; docx?: string } = {};

    if (document.files.pdf) {
      urls.pdf = await storage.getPresignedUrl(document.files.pdf, 3600);
    }

    if (document.files.docx) {
      urls.docx = await storage.getPresignedUrl(document.files.docx, 3600);
    }

    return successResponse({
      document,
      downloadUrls: urls,
    });
  } catch (error) {
    logger.error({ error }, 'Get document API error');
    return handleError(error);
  }
}

/**
 * DELETE /api/documents/[id]
 * Delete a document and its files from S3
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const { userId } = await authenticate(req);
    const { id: documentId } = await params;

    logger.info({ userId, documentId }, 'Delete document request');

    // Load documents index
    const indexKey = `users/${userId}/documents/index.json`;
    const index = await storage.getJSON<DocumentIndex>(indexKey);

    if (!index) {
      return errorResponse('Document not found', 404, 'DOCUMENT_NOT_FOUND');
    }

    // Find document
    const documentIndex = index.documents.findIndex(d => d.id === documentId);

    if (documentIndex === -1) {
      return errorResponse('Document not found', 404, 'DOCUMENT_NOT_FOUND');
    }

    const document = index.documents[documentIndex];

    // Delete files from S3
    const deletePromises: Promise<void>[] = [];

    if (document.files.pdf) {
      deletePromises.push(storage.deleteFile(document.files.pdf));
    }

    if (document.files.docx) {
      deletePromises.push(storage.deleteFile(document.files.docx));
    }

    await Promise.all(deletePromises);

    // Remove from index
    index.documents.splice(documentIndex, 1);
    index.lastUpdated = new Date().toISOString();

    await storage.putJSON(indexKey, index);

    logger.info({ userId, documentId }, 'Document deleted successfully');

    return successResponse({
      message: 'Document deleted successfully',
    });
  } catch (error) {
    logger.error({ error }, 'Delete document API error');
    return handleError(error);
  }
}
