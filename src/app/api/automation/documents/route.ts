import { NextResponse } from 'next/server';
import {
    getAllDocuments,
    getDocumentStats,
    getDocumentById,
    getDocumentsForOpportunity,
    getAllCVs,
    getAllEssays,
    getAllCoverLetters,
    exportAllDocuments,
    clearAllDocuments,
} from '@/lib/automation/document-store';

/**
 * GET /api/automation/documents
 * Returns all generated documents organized by opportunity
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type');
        const docId = searchParams.get('id');
        const oppId = searchParams.get('opportunityId');
        const format = searchParams.get('format');

        // Get single document by ID
        if (docId) {
            const doc = getDocumentById(docId);
            if (!doc) {
                return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
            }
            return NextResponse.json({ success: true, document: doc });
        }

        // Get documents for specific opportunity
        if (oppId) {
            const docs = getDocumentsForOpportunity(oppId);
            return NextResponse.json({ success: true, documents: docs });
        }

        // Export all as JSON file
        if (format === 'json') {
            const json = exportAllDocuments();
            return new Response(json, {
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Disposition': 'attachment; filename="all-documents.json"',
                },
            });
        }

        // Filter by type
        if (type === 'cv') {
            return NextResponse.json({ success: true, documents: getAllCVs(), type: 'cv' });
        }
        if (type === 'essay') {
            return NextResponse.json({ success: true, documents: getAllEssays(), type: 'essay' });
        }
        if (type === 'cover_letter') {
            return NextResponse.json({ success: true, documents: getAllCoverLetters(), type: 'cover_letter' });
        }

        // Default: return all with stats
        const allDocs = getAllDocuments();
        const stats = getDocumentStats();

        return NextResponse.json({
            success: true,
            stats,
            documents: allDocs,
        });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: 'Failed to fetch documents' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/automation/documents
 * Clear all documents
 */
export async function DELETE() {
    try {
        clearAllDocuments();
        return NextResponse.json({ success: true, message: 'All documents cleared' });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: 'Failed to clear documents' },
            { status: 500 }
        );
    }
}
