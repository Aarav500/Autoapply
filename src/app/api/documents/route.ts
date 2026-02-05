import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';

// ============================================
// DOCUMENT API - Database-backed storage
// ============================================

// Validation schemas
const createDocumentSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(['resume', 'cover_letter', 'transcript', 'certificate', 'other']),
  mimeType: z.string().optional(),
  s3Key: z.string(), // Required - must upload to S3 first
  s3Url: z.string().url().optional(),
  extractedText: z.string().optional(),
  forJobId: z.string().optional(),
  forCompany: z.string().optional(),
  isDefault: z.boolean().optional(),
});

// POST /api/documents - Create document metadata
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = createDocumentSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // If setting as default, unset other defaults of same type
    if (data.isDefault) {
      await db.document.updateMany({
        where: {
          userId: session.user.id,
          type: data.type,
          isDefault: true,
        },
        data: { isDefault: false },
      });
    }

    const document = await db.document.create({
      data: {
        userId: session.user.id,
        name: data.name,
        type: data.type,
        mimeType: data.mimeType || 'application/octet-stream',
        s3Key: data.s3Key,
        s3Url: data.s3Url,
        extractedText: data.extractedText,
        forJobId: data.forJobId,
        forCompany: data.forCompany,
        isDefault: data.isDefault || false,
      },
    });

    return NextResponse.json(
      { success: true, document },
      { status: 201 }
    );
  } catch (error) {
    console.error('Document creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create document' },
      { status: 500 }
    );
  }
}

// GET /api/documents - List documents
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type');
    const forJobId = searchParams.get('forJobId');

    // Get single document by ID
    if (id) {
      const document = await db.document.findUnique({
        where: { id },
      });

      if (!document) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
      }

      // Verify ownership
      if (document.userId !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      return NextResponse.json({ document });
    }

    // List documents with filters
    const where = {
      userId: session.user.id,
      ...(type && { type }),
      ...(forJobId && { forJobId }),
    };

    const documents = await db.document.findMany({
      where,
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json({ documents });
  } catch (error) {
    console.error('Document fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

// DELETE /api/documents - Delete document
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Document ID required' }, { status: 400 });
    }

    // Verify ownership
    const document = await db.document.findUnique({
      where: { id },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    if (document.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete from database
    await db.document.delete({ where: { id } });

    // Note: S3 cleanup should be handled by a background job or lifecycle policy

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Document delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  }
}

// PATCH /api/documents - Update document
const updateDocumentSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(255).optional(),
  isDefault: z.boolean().optional(),
  extractedText: z.string().optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = updateDocumentSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const { id, ...updateData } = validationResult.data;

    // Verify ownership
    const existingDoc = await db.document.findUnique({
      where: { id },
    });

    if (!existingDoc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    if (existingDoc.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // If setting as default, unset other defaults of same type
    if (updateData.isDefault) {
      await db.document.updateMany({
        where: {
          userId: session.user.id,
          type: existingDoc.type,
          isDefault: true,
          id: { not: id },
        },
        data: { isDefault: false },
      });
    }

    const document = await db.document.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, document });
  } catch (error) {
    console.error('Document update error:', error);
    return NextResponse.json(
      { error: 'Failed to update document' },
      { status: 500 }
    );
  }
}
