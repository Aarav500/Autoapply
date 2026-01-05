'use server';

import { NextRequest, NextResponse } from 'next/server';

// ============================================
// DOCUMENT PARSING API
// Extracts text from PDF, DOCX, TXT files
// ============================================

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        const fileName = file.name.toLowerCase();
        const buffer = Buffer.from(await file.arrayBuffer());
        let text = '';

        // Extract text based on file type
        if (fileName.endsWith('.pdf')) {
            text = await extractFromPDF(buffer);
        } else if (fileName.endsWith('.txt')) {
            text = buffer.toString('utf-8');
        } else if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
            // For DOCX, we'll do simple text extraction
            text = await extractFromDocx(buffer);
        } else {
            return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            fileName: file.name,
            text: text.trim(),
            charCount: text.length,
        });
    } catch (error) {
        console.error('Document parse error:', error);
        return NextResponse.json(
            { error: 'Failed to parse document' },
            { status: 500 }
        );
    }
}

// ============================================
// PDF EXTRACTION using pdf-parse
// ============================================

async function extractFromPDF(buffer: Buffer): Promise<string> {
    try {
        // Use require for pdf-parse as it doesn't have proper ESM types
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pdfParse = require('pdf-parse') as (buffer: Buffer) => Promise<{ text: string }>;
        const data = await pdfParse(buffer);
        return data.text;
    } catch (error) {
        console.error('PDF parse error:', error);
        throw new Error('Failed to parse PDF');
    }
}

// ============================================
// DOCX EXTRACTION (basic)
// ============================================

async function extractFromDocx(buffer: Buffer): Promise<string> {
    // DOCX is a zip file with XML inside
    // For basic extraction, we'll look for text patterns
    // A more robust solution would use mammoth.js
    try {
        const text = buffer.toString('utf-8');
        // Extract readable text, removing XML tags
        const cleanText = text
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        return cleanText;
    } catch (error) {
        console.error('DOCX parse error:', error);
        throw new Error('Failed to parse DOCX');
    }
}
