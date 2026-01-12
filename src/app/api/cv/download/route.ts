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
        return new NextResponse(pdfBuffer, {
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
 * Simple markdown to professional CV HTML converter
 */
function convertMarkdownToCVHtml(markdown: string, profile: any): string {
    // 1. Pre-process profile header if we have one
    let headerHtml = '';
    if (profile && profile.name) {
        headerHtml = `
            <div class="header">
                <h1>${profile.name}</h1>
                <div class="header-info">
                    ${profile.email ? `<span>${profile.email}</span>` : ''}
                    ${profile.phone ? `<span> | ${profile.phone}</span>` : ''}
                    ${profile.location ? `<span> | ${profile.location}</span>` : ''}
                </div>
                <div class="header-info">
                    ${profile.linkedin ? `<span><a href="${profile.linkedin.startsWith('http') ? profile.linkedin : 'https://' + profile.linkedin}" class="contact-link">LinkedIn</a></span>` : ''}
                    ${profile.github ? `<span> | <a href="${profile.github.startsWith('http') ? profile.github : 'https://' + profile.github}" class="contact-link">GitHub</a></span>` : ''}
                    ${profile.website ? `<span> | <a href="${profile.website.startsWith('http') ? profile.website : 'https://' + profile.website}" class="contact-link">Website</a></span>` : ''}
                </div>
            </div>
            <hr />
        `;
    }

    // 2. Clean markdown and convert to HTML
    // We remove the top-level name header if it exists in markdown to avoid duplication
    let processedMarkdown = markdown;
    if (profile?.name) {
        const nameRegex = new RegExp(`^#\\s+${profile.name}.*\\n`, 'i');
        processedMarkdown = processedMarkdown.replace(nameRegex, '');
    }

    let content = processedMarkdown
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/^[-*+]\s+(.+)$/gm, '<li>$1</li>')
        // Wrap groups of <li> in <ul>
        .replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`)
        .replace(/\n\n/g, '<p></p>')
        .replace(/\n/g, '<br>');

    // Wrap in professional template
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            line-height: 1.4;
            color: #1a1a1a;
            margin: 0;
            padding: 0;
            font-size: 10pt;
        }

        .header {
            text-align: center;
            margin-bottom: 10pt;
        }

        h1 {
            font-size: 20pt;
            margin: 0 0 5pt 0;
            color: #000;
            font-weight: 700;
        }

        h2 {
            font-size: 13pt;
            margin-top: 15pt;
            margin-bottom: 5pt;
            border-bottom: 1pt solid #333;
            color: #222;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5pt;
            page-break-after: avoid;
        }

        h3 {
            font-size: 11pt;
            margin-top: 10pt;
            margin-bottom: 2pt;
            font-weight: 600;
            color: #333;
            page-break-after: avoid;
        }

        p, li {
            margin-bottom: 3pt;
        }

        ul {
            padding-left: 15pt;
            margin-top: 2pt;
            margin-bottom: 5pt;
        }

        .header-info {
            margin-bottom: 2pt;
            color: #444;
            font-size: 9pt;
        }

        .header-info span {
            margin: 0 2pt;
        }

        .contact-link {
            text-decoration: none;
            color: #444;
        }

        hr {
            border: none;
            border-top: 0.5pt solid #ccc;
            margin: 8pt 0;
        }

        /* Spacing for sections */
        .cv-content h2:first-child {
            margin-top: 0;
        }

        @page {
            size: A4;
            margin: 15mm;
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
