import { NextRequest, NextResponse } from 'next/server';

// Document API - stores document metadata in S3 storage
// Actual file uploads would go directly to S3 via presigned URLs

interface DocumentMetadata {
    id: string;
    name: string;
    type: string;
    size: number;
    uploadedAt: string;
    userId: string;
}

// In-memory store for demo (would use s3Storage in production)
const documents: Map<string, DocumentMetadata> = new Map();

export async function POST(request: NextRequest) {
    try {
        const data = await request.json();
        const { name, type, size, userId = 'default-user' } = data;

        if (!name) {
            return NextResponse.json({ error: 'No file name provided' }, { status: 400 });
        }

        const id = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const doc: DocumentMetadata = {
            id,
            name,
            type: type || 'application/octet-stream',
            size: size || 0,
            uploadedAt: new Date().toISOString(),
            userId,
        };

        documents.set(id, doc);

        return NextResponse.json({
            success: true,
            document: doc,
        });
    } catch (error) {
        console.error('Document upload error:', error);
        return NextResponse.json({ error: 'Failed to save document' }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const userId = searchParams.get('userId') || 'default-user';

        if (id) {
            const doc = documents.get(id);
            if (!doc) {
                return NextResponse.json({ error: 'Document not found' }, { status: 404 });
            }
            return NextResponse.json({ document: doc });
        }

        // List all documents for user
        const userDocs = Array.from(documents.values()).filter(d => d.userId === userId);
        return NextResponse.json({ documents: userDocs });
    } catch (error) {
        console.error('Document API error:', error);
        return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'No document ID provided' }, { status: 400 });
        }

        if (!documents.has(id)) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 });
        }

        documents.delete(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete error:', error);
        return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
    }
}
