'use server';

import { NextRequest, NextResponse } from 'next/server';

// ============================================
// DOCUMENT PARSING API - PROFESSIONAL GRADE
// Extracts text from PDF, DOCX, TXT files
// Uses mammoth.js for DOCX and pdf-parse for PDF
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
        let metadata: Record<string, unknown> = {};

        console.log(`Parsing file: ${file.name}, size: ${buffer.length} bytes`);

        // Extract text based on file type
        if (fileName.endsWith('.pdf')) {
            const result = await extractFromPDF(buffer);
            text = result.text;
            metadata = result.metadata;
        } else if (fileName.endsWith('.txt')) {
            text = buffer.toString('utf-8');
        } else if (fileName.endsWith('.docx')) {
            const result = await extractFromDocx(buffer);
            text = result.text;
            metadata = result.metadata;
        } else if (fileName.endsWith('.doc')) {
            // .doc files (old Word format) - try basic extraction
            text = await extractFromDOC(buffer);
        } else {
            return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
        }

        // Clean and normalize text
        const cleanedText = cleanText(text);

        console.log(`Extracted ${cleanedText.length} characters from ${file.name}`);

        return NextResponse.json({
            success: true,
            fileName: file.name,
            text: cleanedText,
            charCount: cleanedText.length,
            wordCount: cleanedText.split(/\s+/).filter(w => w.length > 0).length,
            metadata,
        });
    } catch (error) {
        console.error('Document parse error:', error);
        return NextResponse.json(
            { error: `Failed to parse document: ${error instanceof Error ? error.message : 'Unknown error'}` },
            { status: 500 }
        );
    }
}

// ============================================
// PDF EXTRACTION using pdf-parse with OCR fallback
// ============================================
async function extractFromPDF(buffer: Buffer): Promise<{ text: string; metadata: Record<string, unknown> }> {
    // Import OCR utilities
    const { isTextMeaningful, cleanAcademicPaperText, detectPDFType } = await import('@/lib/pdf-ocr');

    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pdfParse = require('pdf-parse') as (buffer: Buffer, options?: Record<string, unknown>) => Promise<{
            text: string;
            numpages: number;
            numrender: number;
            info: Record<string, unknown>;
            metadata: unknown;
        }>;

        // Set a timeout for parsing (some PDFs can hang)
        const parsePromise = pdfParse(buffer, {
            // Limit pages to prevent hanging on huge documents
            max: 50,
        });

        // Timeout after 30 seconds
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('PDF parsing timed out')), 30000);
        });

        const data = await Promise.race([parsePromise, timeoutPromise]);

        // Detect PDF type based on extracted text quality
        const pdfType = detectPDFType(data.text, buffer.length, data.numpages);
        console.log(`PDF type detected: ${pdfType}, pages: ${data.numpages}, text length: ${data.text.length}`);

        // Check if we got meaningful text
        if (!isTextMeaningful(data.text)) {
            console.log('Primary extraction produced poor results, trying fallback...');

            // Try fallback extraction
            const fallbackText = extractTextFromPDFBuffer(buffer);

            if (isTextMeaningful(fallbackText)) {
                // Clean academic paper formatting
                const cleanedText = cleanAcademicPaperText(fallbackText);
                return {
                    text: cleanedText,
                    metadata: {
                        pages: data.numpages,
                        method: 'fallback',
                        pdfType,
                        warning: 'Used fallback extraction - some text may be missing'
                    },
                };
            }

            // If both methods fail, it's likely a scanned PDF
            if (pdfType === 'scanned') {
                throw new Error(
                    'This appears to be a scanned PDF (image-based). ' +
                    'Please try one of these options:\n' +
                    '1. Use Adobe Acrobat or online tools to OCR the PDF first\n' +
                    '2. Convert the PDF to images and upload those\n' +
                    '3. If you have the original document, export as text-based PDF'
                );
            }
        }

        // Clean the text for academic papers
        const cleanedText = cleanAcademicPaperText(data.text);

        return {
            text: cleanedText,
            metadata: {
                pages: data.numpages,
                info: data.info,
                method: 'text-extraction',
                pdfType,
            },
        };
    } catch (error) {
        console.error('PDF parse error:', error);

        // Try fallback extraction before giving up
        try {
            const fallbackText = extractTextFromPDFBuffer(buffer);
            if (fallbackText.length > 50) {
                const cleanedText = cleanAcademicPaperText(fallbackText);
                return {
                    text: cleanedText,
                    metadata: { method: 'fallback', error: 'Primary parser failed' },
                };
            }
        } catch (fallbackError) {
            console.error('PDF fallback also failed:', fallbackError);
        }

        // Provide helpful error message
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        if (errorMessage.includes('scanned')) {
            throw error; // Re-throw our helpful scanned PDF message
        }

        throw new Error(
            'Failed to parse PDF. Possible reasons:\n' +
            '• The PDF may be scanned (image-based) - try OCR first\n' +
            '• The PDF may be password protected\n' +
            '• The PDF may be corrupted\n' +
            '• The PDF uses unusual encoding'
        );
    }
}

/**
 * Fallback PDF text extraction - extracts readable strings from binary
 * Works for some PDFs where pdf-parse fails
 */
function extractTextFromPDFBuffer(buffer: Buffer): string {
    const text = buffer.toString('utf-8', 0, Math.min(buffer.length, 1000000));
    const segments: string[] = [];

    // Find text between parentheses (PDF text objects)
    const textPattern = /\(([^)]+)\)/g;
    let match;
    while ((match = textPattern.exec(text)) !== null) {
        const segment = match[1]
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '')
            .replace(/\\\(/g, '(')
            .replace(/\\\)/g, ')')
            .replace(/\\\\/g, '\\');
        if (segment.length > 2 && /[a-zA-Z]{2,}/.test(segment)) {
            segments.push(segment);
        }
    }

    // Also look for stream content
    const streamPattern = /stream[\s\S]*?endstream/g;
    while ((match = streamPattern.exec(text)) !== null) {
        // Extract readable parts
        const readable = match[0]
            .replace(/[^\x20-\x7E\n]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        if (readable.length > 20 && /[a-zA-Z]{3,}/.test(readable)) {
            segments.push(readable);
        }
    }

    return segments.join(' ').replace(/\s+/g, ' ').trim();
}

// ============================================
// DOCX EXTRACTION using mammoth.js
// Professional-grade extraction preserving structure
// ============================================
async function extractFromDocx(buffer: Buffer): Promise<{ text: string; metadata: Record<string, unknown> }> {
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const mammoth = require('mammoth');

        // Extract raw text (best for CV/resume parsing)
        const textResult = await mammoth.extractRawText({ buffer });

        // Also get HTML for structure analysis (helps with formatting)
        const htmlResult = await mammoth.convertToHtml({ buffer });

        // Extract structured data from HTML for better parsing
        const structuredText = extractStructuredText(htmlResult.value);

        return {
            text: textResult.value || structuredText,
            metadata: {
                messages: textResult.messages,
                hasFormatting: htmlResult.value.includes('<strong>') || htmlResult.value.includes('<em>'),
            },
        };
    } catch (error) {
        console.error('DOCX parse error:', error);
        throw new Error('Failed to parse DOCX - file may be corrupted');
    }
}

// ============================================
// DOC (legacy Word) EXTRACTION
// Uses basic binary extraction as fallback
// ============================================
async function extractFromDOC(buffer: Buffer): Promise<string> {
    try {
        // Old .doc files are compound documents
        // Try to extract readable text patterns
        const text = buffer.toString('latin1');

        // Find text segments (between control characters)
        const segments: string[] = [];
        let currentSegment = '';

        for (const char of text) {
            const code = char.charCodeAt(0);
            // Printable ASCII range + common extended chars
            if ((code >= 32 && code <= 126) || (code >= 160 && code <= 255)) {
                currentSegment += char;
            } else if (currentSegment.length > 3) {
                // Only keep segments with actual words
                if (/[a-zA-Z]{2,}/.test(currentSegment)) {
                    segments.push(currentSegment);
                }
                currentSegment = '';
            } else {
                currentSegment = '';
            }
        }

        if (currentSegment.length > 3 && /[a-zA-Z]{2,}/.test(currentSegment)) {
            segments.push(currentSegment);
        }

        return segments.join(' ');
    } catch (error) {
        console.error('DOC parse error:', error);
        throw new Error('Failed to parse DOC - please convert to DOCX for better results');
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Extract structured text from HTML output
 * Preserves paragraph breaks and list formatting
 */
function extractStructuredText(html: string): string {
    // Replace block elements with newlines
    let text = html
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<\/h[1-6]>/gi, '\n\n')
        .replace(/<\/li>/gi, '\n')
        .replace(/<li>/gi, '• ')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/tr>/gi, '\n')
        .replace(/<\/td>/gi, '\t');

    // Remove remaining HTML tags
    text = text.replace(/<[^>]+>/g, '');

    // Decode HTML entities
    text = text
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&rsquo;/g, "'")
        .replace(/&lsquo;/g, "'")
        .replace(/&rdquo;/g, '"')
        .replace(/&ldquo;/g, '"')
        .replace(/&mdash;/g, '—')
        .replace(/&ndash;/g, '–')
        .replace(/&bull;/g, '•');

    return text;
}

/**
 * Clean and normalize extracted text
 * - Removes excessive whitespace
 * - Normalizes line breaks
 * - Removes non-printable characters
 */
function cleanText(text: string): string {
    return text
        // Normalize unicode whitespace
        .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
        // Remove zero-width characters
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        // Normalize line endings
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        // Collapse multiple spaces (but not newlines)
        .replace(/[ \t]+/g, ' ')
        // Collapse more than 2 consecutive newlines
        .replace(/\n{3,}/g, '\n\n')
        // Trim lines
        .split('\n')
        .map(line => line.trim())
        .join('\n')
        // Final trim
        .trim();
}
