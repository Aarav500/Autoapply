import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

// ============================================
// PDF GENERATION API
// Renders CV Markdown to high-quality PDF using Puppeteer
// ============================================

export async function POST(request: NextRequest) {
    try {
        const { markdown, profile } = await request.json();

        if (!markdown) {
            return NextResponse.json({ error: 'Markdown content is required' }, { status: 400 });
        }

        // 1. Convert Markdown to simple HTML
        // For a CV, we want a very clean structure
        const html = convertMarkdownToCVHtml(markdown, profile);

        // 2. Launch Puppeteer
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();

        // 3. Set content and wait for fonts/styles
        await page.setContent(html, { waitUntil: 'networkidle0' });

        // 4. Generate PDF
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '15mm',
                right: '15mm',
                bottom: '15mm',
                left: '15mm'
            }
        });

        await browser.close();

        // 5. Return PDF as stream
        // We use standard Response and cast to any to bypass the SharedArrayBuffer vs ArrayBuffer type mismatch in this environment
        return new Response(pdfBuffer as any, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="CV_${profile?.name?.replace(/\s+/g, '_') || 'Professional'}.pdf"`,
            },
        });

    } catch (error) {
        console.error('PDF Generation Error:', error);
        return NextResponse.json({
            error: 'Failed to generate PDF',
            message: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

/**
 * Enhanced markdown to professional CV HTML converter with modern formatting
 */
function convertMarkdownToCVHtml(markdown: string, profile: any): string {
    // 1. Pre-process profile header if we have one
    let headerHtml = '';
    if (profile && profile.name) {
        const links = [];
        if (profile.linkedin) links.push(`<a href="${profile.linkedin.startsWith('http') ? profile.linkedin : 'https://' + profile.linkedin}" class="contact-link">LinkedIn</a>`);
        if (profile.github) links.push(`<a href="${profile.github.startsWith('http') ? profile.github : 'https://' + profile.github}" class="contact-link">GitHub</a>`);
        if (profile.portfolio) links.push(`<a href="${profile.portfolio.startsWith('http') ? profile.portfolio : 'https://' + profile.portfolio}" class="contact-link">Portfolio</a>`);
        if (profile.website) links.push(`<a href="${profile.website.startsWith('http') ? profile.website : 'https://' + profile.website}" class="contact-link">Website</a>`);

        headerHtml = `
            <div class="header">
                <h1>${profile.name}</h1>
                <div class="header-info">
                    ${profile.email ? `<span>${profile.email}</span>` : ''}
                    ${profile.phone ? `<span class="separator">•</span><span>${profile.phone}</span>` : ''}
                    ${profile.location ? `<span class="separator">•</span><span>${profile.location}</span>` : ''}
                </div>
                ${links.length > 0 ? `<div class="header-info header-links">${links.join('<span class="separator">•</span>')}</div>` : ''}
            </div>
            <div class="header-divider"></div>
        `;
    }

    // 2. Clean markdown and convert to HTML with enhanced formatting
    // Remove the top-level name header and contact info if it exists to avoid duplication
    let processedMarkdown = markdown;
    if (profile?.name) {
        const nameRegex = new RegExp(`^#\\s+${profile.name}.*?\\n`, 'i');
        processedMarkdown = processedMarkdown.replace(nameRegex, '');
        // Remove any contact info lines that follow the name
        processedMarkdown = processedMarkdown.replace(/^[^\n]*@[^\n]*\n/m, ''); // email line
        processedMarkdown = processedMarkdown.replace(/^\[.*?\]\(.*?\).*?\n/gm, ''); // link lines
    }

    // Remove multiple consecutive horizontal rules
    processedMarkdown = processedMarkdown.replace(/---+\n/g, '');
    processedMarkdown = processedMarkdown.trim();

    let content = processedMarkdown
        // Headers
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        .replace(/^## (.+)$/gm, '<h2><span class="section-number"></span>$1</h2>')
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')

        // Emphasis
        .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')

        // Links
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="inline-link">$1</a>')

        // Bullet points - handle nested structure better
        .replace(/^[-*+]\s+(.+)$/gm, '<li>$1</li>')
        // Wrap consecutive <li> in <ul>
        .replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`)

        // Paragraphs
        .replace(/\n\n+/g, '</p><p>')
        .replace(/\n/g, '<br>');

    // Wrap content in paragraphs
    content = '<p>' + content + '</p>';
    // Clean up empty paragraphs
    content = content.replace(/<p><\/p>/g, '').replace(/<p>\s*<\/p>/g, '');

    // Wrap in professional template
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Source+Serif+Pro:wght@600&display=swap');

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
            line-height: 1.6;
            color: #1a1a1a;
            margin: 0;
            padding: 0;
            font-size: 10.5pt;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }

        /* ===== HEADER SECTION ===== */
        .header {
            text-align: center;
            margin-bottom: 16pt;
            padding-bottom: 10pt;
        }

        .header h1 {
            font-family: 'Source Serif Pro', Georgia, serif;
            font-size: 26pt;
            margin: 0 0 6pt 0;
            color: #000;
            font-weight: 600;
            letter-spacing: -0.5pt;
        }

        .header-info {
            margin-bottom: 3pt;
            color: #444;
            font-size: 9pt;
            font-weight: 400;
            line-height: 1.4;
        }

        .header-info span {
            display: inline;
        }

        .header-info .separator {
            margin: 0 6pt;
            color: #999;
            font-weight: 300;
        }

        .header-links {
            margin-top: 4pt;
        }

        .contact-link {
            text-decoration: none;
            color: #2563eb;
            font-weight: 500;
            transition: color 0.2s;
        }

        .contact-link:hover {
            color: #1d4ed8;
            text-decoration: underline;
        }

        .header-divider {
            width: 60pt;
            height: 2pt;
            background: linear-gradient(to right, #2563eb, #7c3aed);
            margin: 8pt auto 0;
        }

        /* ===== TYPOGRAPHY ===== */
        h1 {
            font-size: 22pt;
            margin: 16pt 0 8pt 0;
            color: #000;
            font-weight: 700;
            letter-spacing: -0.3pt;
        }

        h2 {
            font-size: 13pt;
            margin-top: 16pt;
            margin-bottom: 8pt;
            padding-bottom: 4pt;
            border-bottom: 1.5pt solid #2563eb;
            color: #1a1a1a;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.8pt;
            page-break-after: avoid;
            position: relative;
        }

        h2 .section-number {
            display: inline-block;
            width: 4pt;
            height: 4pt;
            background: #2563eb;
            border-radius: 50%;
            margin-right: 8pt;
            vertical-align: middle;
        }

        h3 {
            font-size: 11pt;
            margin-top: 10pt;
            margin-bottom: 3pt;
            font-weight: 600;
            color: #1a1a1a;
            page-break-after: avoid;
            display: flex;
            justify-content: space-between;
            align-items: baseline;
        }

        /* ===== CONTENT FORMATTING ===== */
        p {
            margin: 0 0 8pt 0;
            text-align: justify;
            hyphens: auto;
        }

        strong {
            font-weight: 600;
            color: #000;
        }

        em {
            font-style: italic;
            color: #555;
            font-size: 9.5pt;
        }

        /* ===== LISTS ===== */
        ul {
            padding-left: 18pt;
            margin-top: 4pt;
            margin-bottom: 10pt;
            list-style-type: none;
        }

        li {
            margin-bottom: 4pt;
            padding-left: 0;
            position: relative;
            line-height: 1.5;
        }

        li::before {
            content: "▸";
            position: absolute;
            left: -14pt;
            color: #2563eb;
            font-weight: 600;
        }

        /* ===== LINKS ===== */
        .inline-link {
            color: #2563eb;
            text-decoration: none;
            font-weight: 500;
        }

        .inline-link:hover {
            text-decoration: underline;
        }

        /* ===== LAYOUT ===== */
        .cv-content {
            page-break-inside: avoid;
        }

        .cv-content h2:first-child {
            margin-top: 0;
        }

        /* Prevent orphan headers */
        h2, h3 {
            page-break-inside: avoid;
            page-break-after: avoid;
        }

        /* Keep list items together when possible */
        li {
            page-break-inside: avoid;
        }

        /* ===== PAGE SETUP ===== */
        @page {
            size: A4;
            margin: 18mm 20mm 20mm 20mm;
        }

        /* ===== PRINT OPTIMIZATIONS ===== */
        @media print {
            body {
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
            }
        }

        /* Hide horizontal rules as we use custom dividers */
        hr {
            display: none;
        }

        /* Additional spacing for cleaner sections */
        .cv-content > h2 + p,
        .cv-content > h2 + h3,
        .cv-content > h2 + ul {
            margin-top: 6pt;
        }
    </style>
</head>
<body>
    ${headerHtml}
    <div class="cv-content">
        ${content}
    </div>
</body>
</html>
    `;
}
