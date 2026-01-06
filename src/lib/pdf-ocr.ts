/**
 * PDF OCR Module
 * Handles OCR for scanned/image-based PDFs using Tesseract.js
 * Falls back to this when regular pdf-parse fails to extract text
 */

import Tesseract from 'tesseract.js';

export interface OCRResult {
    text: string;
    confidence: number;
    pages: number;
    method: 'ocr' | 'text-extraction' | 'fallback';
}

/**
 * Extract text from PDF using Tesseract OCR
 * This is used when pdf-parse fails to extract meaningful text
 * (typically for scanned documents or image-based PDFs)
 */
export async function extractTextWithOCR(
    imageDataUrl: string,
    language: string = 'eng'
): Promise<{ text: string; confidence: number }> {
    try {
        const result = await Tesseract.recognize(
            imageDataUrl,
            language,
            {
                logger: (m) => {
                    if (m.status === 'recognizing text') {
                        console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
                    }
                },
            }
        );

        return {
            text: result.data.text,
            confidence: result.data.confidence,
        };
    } catch (error) {
        console.error('OCR extraction failed:', error);
        throw new Error(`OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Check if PDF text extraction result is meaningful
 * Returns false if the text appears to be garbage or too short
 */
export function isTextMeaningful(text: string): boolean {
    if (!text || text.trim().length < 50) {
        return false;
    }

    // Check for actual words (not just random characters)
    const words = text.split(/\s+/).filter(w => w.length > 2);
    if (words.length < 10) {
        return false;
    }

    // Check for common English letter patterns
    const letterRatio = (text.match(/[a-zA-Z]/g) || []).length / text.length;
    if (letterRatio < 0.5) {
        return false; // Too many non-letter characters suggests garbage
    }

    // Check for reasonable word lengths (average should be 3-10 chars)
    const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / words.length;
    if (avgWordLength < 2 || avgWordLength > 15) {
        return false;
    }

    return true;
}

/**
 * Enhanced PDF text extraction with academic paper support
 * Handles multi-column layouts, headers/footers, and references
 */
export function cleanAcademicPaperText(text: string): string {
    let cleaned = text;

    // Remove page numbers (common patterns)
    cleaned = cleaned.replace(/^\s*\d+\s*$/gm, '');
    cleaned = cleaned.replace(/Page\s+\d+\s*(of\s+\d+)?/gi, '');

    // Remove common headers/footers from academic papers
    cleaned = cleaned.replace(/^(IEEE|ACM|arXiv|Springer|Elsevier).*$/gim, '');
    cleaned = cleaned.replace(/^(Preprint|Draft|Manuscript).*$/gim, '');

    // Fix common OCR errors
    cleaned = cleaned
        .replace(/\|/g, 'l')  // Pipe to l
        .replace(/0(?=[a-zA-Z])/g, 'o')  // 0 before letters -> o
        .replace(/(?<=[a-zA-Z])1/g, 'l')  // 1 after letters -> l
        .replace(/\s+/g, ' ')  // Collapse whitespace
        .replace(/\n{3,}/g, '\n\n');  // Max 2 newlines

    // Try to detect and preserve section headers
    cleaned = cleaned.replace(
        /^([A-Z][A-Za-z\s]{2,50}):?\s*$/gm,
        '\n## $1\n'
    );

    // Clean up equations and formulas (often garbled in OCR)
    cleaned = cleaned.replace(/[∑∏∫∂√±×÷∞≠≤≥∈∉⊂⊃∪∩]/g, ' [math] ');

    return cleaned.trim();
}

/**
 * Detect if a PDF is likely scanned (image-based) vs text-based
 * by analyzing the extracted text quality
 */
export function detectPDFType(
    extractedText: string,
    fileSize: number,
    pageCount: number
): 'text-based' | 'scanned' | 'mixed' | 'unknown' {
    if (!extractedText || extractedText.trim().length < 10) {
        return 'scanned';
    }

    const textLength = extractedText.trim().length;
    const expectedMinText = pageCount * 500; // At least 500 chars per page for text PDF

    if (textLength < expectedMinText * 0.3) {
        // Way less text than expected
        return 'scanned';
    }

    if (isTextMeaningful(extractedText)) {
        return 'text-based';
    }

    // If text exists but isn't meaningful, might be mixed
    if (textLength > expectedMinText * 0.5) {
        return 'mixed';
    }

    return 'unknown';
}

/**
 * Convert PDF buffer to data URL for OCR processing
 * Note: In production, we'd use pdf.js or pdf-to-img for actual PDF rendering
 * This is a simplified version for now
 */
export async function processPDFForOCR(
    pdfBuffer: Buffer
): Promise<{ success: boolean; message: string; pageImages?: string[] }> {
    // For now, we'll return a message indicating OCR path
    // In production, this would convert PDF pages to images

    try {
        // Check if buffer looks like a PDF
        const header = pdfBuffer.slice(0, 5).toString();
        if (!header.startsWith('%PDF-')) {
            return {
                success: false,
                message: 'Not a valid PDF file',
            };
        }

        // For scanned PDFs, we need to:
        // 1. Render each page to an image
        // 2. Run OCR on each image
        // 3. Combine the results

        // This requires pdf.js or similar library for rendering
        // For now, return a message about the limitation
        return {
            success: false,
            message: 'PDF appears to be scanned. Full OCR support requires additional processing. Try converting your PDF to images first, or use a text-based PDF.',
        };
    } catch (error) {
        return {
            success: false,
            message: `PDF processing error: ${error instanceof Error ? error.message : 'Unknown'}`,
        };
    }
}

export default {
    extractTextWithOCR,
    isTextMeaningful,
    cleanAcademicPaperText,
    detectPDFType,
    processPDFForOCR,
};
