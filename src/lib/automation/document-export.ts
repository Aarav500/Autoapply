// ============================================
// DOCUMENT EXPORT UTILITIES
// PDF/DOCX generation and shareable links
// ============================================

import { jsPDF } from 'jspdf';

// ============================================
// MARKDOWN TO PLAIN TEXT
// ============================================

function markdownToPlainText(markdown: string): string {
    return markdown
        .replace(/^#{1,6}\s+/gm, '') // Headers
        .replace(/\*\*([^*]+)\*\*/g, '$1') // Bold
        .replace(/\*([^*]+)\*/g, '$1') // Italic
        .replace(/`([^`]+)`/g, '$1') // Code
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links
        .replace(/^[-*+]\s+/gm, '• ') // Bullet points
        .replace(/^>\s+/gm, '') // Block quotes
        .replace(/---+/g, '─'.repeat(40)) // Horizontal rules
        .trim();
}

// ============================================
// PDF EXPORT
// ============================================

export interface PDFExportOptions {
    title: string;
    author: string;
    subject?: string;
    fontSize?: number;
    lineHeight?: number;
    margin?: number;
}

export async function exportToPDF(
    content: string,
    options: PDFExportOptions
): Promise<Blob> {
    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
    });

    const fontSize = options.fontSize || 11;
    const lineHeight = options.lineHeight || 6;
    const margin = options.margin || 20;
    const pageWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const contentWidth = pageWidth - 2 * margin;

    // Set document properties
    pdf.setProperties({
        title: options.title,
        author: options.author,
        subject: options.subject || 'Generated Document',
    });

    // Convert markdown to plain text for PDF
    const plainText = markdownToPlainText(content);
    const lines = plainText.split('\n');

    // Typography
    pdf.setFont('helvetica');
    pdf.setFontSize(fontSize);

    let y = margin;
    let pageNum = 1;

    for (const line of lines) {
        // Check for headers (lines that were headers in markdown)
        const isHeader = line.match(/^[A-Z][A-Z\s]+$/) || line.includes('|') === false && line.length < 50 && !line.startsWith('•');

        if (isHeader && line.trim().length > 0 && !line.startsWith('•')) {
            pdf.setFontSize(fontSize + 2);
            pdf.setFont('helvetica', 'bold');
        } else {
            pdf.setFontSize(fontSize);
            pdf.setFont('helvetica', 'normal');
        }

        // Word wrap
        const wrappedLines = pdf.splitTextToSize(line, contentWidth);

        for (const wrappedLine of wrappedLines) {
            // Check if we need a new page
            if (y + lineHeight > pageHeight - margin) {
                pdf.addPage();
                pageNum++;
                y = margin;
            }

            pdf.text(wrappedLine, margin, y);
            y += lineHeight;
        }

        // Add spacing after paragraphs
        if (line.trim() === '') {
            y += lineHeight / 2;
        }
    }

    // Add footer with page numbers
    const totalPages = pdf.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.text(
            `Page ${i} of ${totalPages}`,
            pageWidth / 2,
            pageHeight - 10,
            { align: 'center' }
        );
    }

    return pdf.output('blob');
}

// ============================================
// DOCX EXPORT (Simple HTML-based approach)
// ============================================

export async function exportToDOCX(
    content: string,
    options: { title: string; author: string }
): Promise<Blob> {
    // Convert markdown to HTML-like format for DOCX
    const htmlContent = markdownToHTML(content);

    // Create a simple DOCX using HTML in a Word-compatible format
    const docxTemplate = `
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<?mso-application progid="Word.Document"?>
<w:wordDocument xmlns:w="http://schemas.microsoft.com/office/word/2003/wordml">
<w:body>
<w:p><w:r><w:t>${htmlContent.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</w:t></w:r></w:p>
</w:body>
</w:wordDocument>
`.trim();

    // For a simpler approach, export as HTML that Word can open
    const wordDoc = `
<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" 
      xmlns:w="urn:schemas-microsoft-com:office:word">
<head>
    <meta charset="UTF-8">
    <title>${options.title}</title>
    <meta name="author" content="${options.author}">
    <style>
        body { font-family: 'Calibri', sans-serif; font-size: 11pt; line-height: 1.5; }
        h1 { font-size: 16pt; font-weight: bold; margin-bottom: 12pt; }
        h2 { font-size: 14pt; font-weight: bold; margin-top: 12pt; margin-bottom: 6pt; }
        h3 { font-size: 12pt; font-weight: bold; margin-top: 10pt; margin-bottom: 4pt; }
        p { margin: 6pt 0; }
        ul { margin: 6pt 0; padding-left: 24pt; }
        li { margin: 3pt 0; }
        hr { border: none; border-top: 1px solid #ccc; margin: 12pt 0; }
    </style>
</head>
<body>
${htmlContent}
</body>
</html>
`.trim();

    return new Blob([wordDoc], { type: 'application/msword' });
}

function markdownToHTML(markdown: string): string {
    return markdown
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
        .replace(/^[-*+]\s+(.+)$/gm, '<li>$1</li>')
        .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
        .replace(/^---+$/gm, '<hr>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/^(.+)$/gm, (match) => {
            if (match.startsWith('<')) return match;
            return `<p>${match}</p>`;
        })
        .replace(/<p><\/p>/g, '')
        .replace(/<p>(<[hul])/g, '$1')
        .replace(/(<\/[hul][^>]*>)<\/p>/g, '$1');
}

// ============================================
// SHAREABLE LINKS
// ============================================

export interface ShareableDocument {
    id: string;
    opportunityId: string;
    opportunityTitle: string;
    documentType: 'cv' | 'cover_letter' | 'essay';
    content: string;
    createdAt: string;
    expiresAt?: string;
    accessCount: number;
    shareToken: string;
}

// Generate a unique share token
export function generateShareToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 12; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
}

// Create a shareable link for a document
export function createShareableLink(
    document: { id: string; content: string; type: string; opportunityTitle: string },
    baseUrl: string = typeof window !== 'undefined' ? window.location.origin : ''
): ShareableDocument {
    const shareToken = generateShareToken();
    const now = new Date();
    const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

    return {
        id: document.id,
        opportunityId: document.id.replace(/^(cv|cover|essay)_/, ''),
        opportunityTitle: document.opportunityTitle,
        documentType: document.type as 'cv' | 'cover_letter' | 'essay',
        content: document.content,
        createdAt: now.toISOString(),
        expiresAt: expires.toISOString(),
        accessCount: 0,
        shareToken,
    };
}

// Get the shareable URL
export function getShareableUrl(shareToken: string, baseUrl: string = ''): string {
    return `${baseUrl}/share/doc/${shareToken}`;
}

// ============================================
// DOWNLOAD HELPER
// ============================================

export function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

export async function downloadAsPlainText(content: string, filename: string): Promise<void> {
    const plainText = markdownToPlainText(content);
    const blob = new Blob([plainText], { type: 'text/plain' });
    downloadBlob(blob, filename);
}

export async function downloadAsPDF(
    content: string,
    filename: string,
    options: { title: string; author: string }
): Promise<void> {
    const blob = await exportToPDF(content, options);
    downloadBlob(blob, filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
}

export async function downloadAsDOCX(
    content: string,
    filename: string,
    options: { title: string; author: string }
): Promise<void> {
    const blob = await exportToDOCX(content, options);
    downloadBlob(blob, filename.endsWith('.docx') ? filename : `${filename}.doc`);
}
