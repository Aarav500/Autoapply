import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont } from 'pdf-lib';
import { logger } from '@/lib/logger';
import { AppError } from '@/lib/errors';

// Layout constants
const PAGE_WIDTH = 595.28; // A4 width in points
const PAGE_HEIGHT = 841.89; // A4 height in points
const MARGIN = 50;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

/**
 * Simple HTML tag stripper
 */
function stripHtml(text: string): string {
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

interface Color { r: number; g: number; b: number }

/**
 * Draw wrapped text, return the new Y position. Returns -1 if page break needed.
 */
function drawWrappedText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  font: PDFFont,
  fontSize: number,
  color: Color = { r: 0.2, g: 0.2, b: 0.2 },
  lineHeight: number = 1.4
): number {
  const clean = stripHtml(text);
  const words = clean.split(/\s+/).filter(Boolean);
  let line = '';
  let currentY = y;
  const spacing = fontSize * lineHeight;

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);

    if (testWidth > maxWidth && line) {
      if (currentY < MARGIN + 20) return -1;
      page.drawText(line, { x, y: currentY, size: fontSize, font, color: rgb(color.r, color.g, color.b) });
      currentY -= spacing;
      line = word;
    } else {
      line = testLine;
    }
  }

  if (line) {
    if (currentY < MARGIN + 20) return -1;
    page.drawText(line, { x, y: currentY, size: fontSize, font, color: rgb(color.r, color.g, color.b) });
    currentY -= spacing;
  }

  return currentY;
}

/**
 * Helper to match regex across multiline content (no /s flag needed)
 */
function matchAll(html: string, pattern: RegExp): RegExpExecArray[] {
  const results: RegExpExecArray[] = [];
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(html)) !== null) {
    results.push(m);
  }
  return results;
}

/**
 * Generate PDF from HTML string using pdf-lib (pure Node.js, no browser needed)
 */
export async function htmlToPdf(html: string): Promise<Buffer> {
  try {
    logger.info('Generating PDF with pdf-lib');

    const doc = await PDFDocument.create();
    const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
    const fontItalic = await doc.embedFont(StandardFonts.HelveticaOblique);

    const BLACK: Color = { r: 0.1, g: 0.1, b: 0.12 };
    const DARK: Color = { r: 0.2, g: 0.2, b: 0.2 };
    const GRAY: Color = { r: 0.4, g: 0.4, b: 0.4 };
    const SECTION_COLOR: Color = { r: 0.1, g: 0.1, b: 0.18 };

    let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y = PAGE_HEIGHT - MARGIN;

    const addNewPage = (): PDFPage => {
      page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
      return page;
    };

    const ensureSpace = (needed: number) => {
      if (y < MARGIN + needed) {
        addNewPage();
      }
    };

    const drawTextSafe = (text: string, x: number, maxW: number, font: PDFFont, size: number, color: Color): void => {
      const newY = drawWrappedText(page, text, x, y, maxW, font, size, color);
      if (newY === -1) {
        addNewPage();
        y = drawWrappedText(page, text, x, y, maxW, font, size, color);
      } else {
        y = newY;
      }
    };

    // ======== Parse HTML content ========
    // Note: Using [\s\S] instead of . for multiline matching (avoids /s flag)

    // Extract name
    const nameMatch = html.match(/<h1[^>]*class="name"[^>]*>([\s\S]*?)<\/h1>/);
    const name = nameMatch ? stripHtml(nameMatch[1]) : 'Resume';

    // Extract contact line
    const contactMatch = html.match(/<div[^>]*class="contact"[^>]*>([\s\S]*?)<\/div>/);
    const contactLine = contactMatch ? stripHtml(contactMatch[1]) : '';

    // === HEADER ===
    const nameWidth = fontBold.widthOfTextAtSize(name, 22);
    page.drawText(name, {
      x: (PAGE_WIDTH - nameWidth) / 2,
      y,
      size: 22,
      font: fontBold,
      color: rgb(BLACK.r, BLACK.g, BLACK.b),
    });
    y -= 28;

    if (contactLine) {
      const parts = contactLine.split(/\s*[•·|]\s*/).filter(Boolean);
      const contactStr = parts.join('  •  ');
      const contactFontSize = 9;
      const contactWidth = fontRegular.widthOfTextAtSize(contactStr, contactFontSize);
      if (contactWidth <= CONTENT_WIDTH) {
        page.drawText(contactStr, {
          x: (PAGE_WIDTH - contactWidth) / 2,
          y,
          size: contactFontSize,
          font: fontRegular,
          color: rgb(GRAY.r, GRAY.g, GRAY.b),
        });
      } else {
        drawTextSafe(contactStr, MARGIN, CONTENT_WIDTH, fontRegular, contactFontSize, GRAY);
      }
      y -= 20;
    }

    // Divider
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: PAGE_WIDTH - MARGIN, y },
      thickness: 1,
      color: rgb(0.75, 0.75, 0.75),
    });
    y -= 18;

    // === SECTIONS ===
    const sectionMatches = matchAll(html, /<section[^>]*class="section"[^>]*>([\s\S]*?)<\/section>/g);

    for (const sectionMatch of sectionMatches) {
      const sectionHtml = sectionMatch[1];

      // Section title
      const titleMatch = sectionHtml.match(/<h2[^>]*class="section-title"[^>]*>([\s\S]*?)<\/h2>/);
      const sectionTitle = titleMatch ? stripHtml(titleMatch[1]) : '';

      if (sectionTitle) {
        ensureSpace(40);
        page.drawText(sectionTitle.toUpperCase(), {
          x: MARGIN,
          y,
          size: 11,
          font: fontBold,
          color: rgb(SECTION_COLOR.r, SECTION_COLOR.g, SECTION_COLOR.b),
        });
        y -= 3;
        page.drawLine({
          start: { x: MARGIN, y },
          end: { x: PAGE_WIDTH - MARGIN, y },
          thickness: 1.5,
          color: rgb(0.2, 0.2, 0.2),
        });
        y -= 14;
      }

      // === SUMMARY ===
      const summaryMatch = sectionHtml.match(/<p[^>]*class="summary"[^>]*>([\s\S]*?)<\/p>/);
      if (summaryMatch) {
        ensureSpace(30);
        drawTextSafe(summaryMatch[1], MARGIN, CONTENT_WIDTH, fontRegular, 10, DARK);
        y -= 6;
      }

      // === EXPERIENCE ITEMS ===
      const expItems = matchAll(sectionHtml, /<div[^>]*class="experience-item"[^>]*>([\s\S]*?)<\/div>\s*(?=<div[^>]*class="experience-item"|$)/g);
      for (const expMatch of expItems) {
        ensureSpace(60);
        const expHtml = expMatch[1];

        const companyMatch = expHtml.match(/<span[^>]*class="company-name"[^>]*>([\s\S]*?)<\/span>/);
        const jobTitleMatch = expHtml.match(/<span[^>]*class="job-title"[^>]*>([\s\S]*?)<\/span>/);
        const metaMatch = expHtml.match(/<div[^>]*class="job-meta"[^>]*>([\s\S]*?)<\/div>/);

        const company = companyMatch ? stripHtml(companyMatch[1]) : '';
        const jobTitle = jobTitleMatch ? stripHtml(jobTitleMatch[1]) : '';
        const meta = metaMatch ? stripHtml(metaMatch[1]) : '';

        if (company) {
          const companyW = fontBold.widthOfTextAtSize(company, 11);
          page.drawText(company, { x: MARGIN, y, size: 11, font: fontBold, color: rgb(BLACK.r, BLACK.g, BLACK.b) });
          if (jobTitle) {
            page.drawText(`  •  ${jobTitle}`, { x: MARGIN + companyW, y, size: 10, font: fontItalic, color: rgb(DARK.r, DARK.g, DARK.b) });
          }
          y -= 14;
        }

        if (meta) {
          page.drawText(meta, { x: MARGIN, y, size: 9, font: fontRegular, color: rgb(GRAY.r, GRAY.g, GRAY.b) });
          y -= 14;
        }

        // Bullet points
        const bullets = matchAll(expHtml, /<li>([\s\S]*?)<\/li>/g);
        for (const bullet of bullets) {
          ensureSpace(16);
          page.drawText('•', { x: MARGIN + 8, y, size: 9, font: fontRegular, color: rgb(DARK.r, DARK.g, DARK.b) });
          drawTextSafe(bullet[1], MARGIN + 22, CONTENT_WIDTH - 22, fontRegular, 9.5, DARK);
        }
        y -= 8;
      }

      // === EDUCATION ITEMS ===
      const eduItems = matchAll(sectionHtml, /<div[^>]*class="education-item"[^>]*>([\s\S]*?)<\/div>\s*(?=<div[^>]*class="education-item"|$)/g);
      for (const eduMatch of eduItems) {
        ensureSpace(40);
        const eduHtml = eduMatch[1];

        const institutionMatch = eduHtml.match(/<span[^>]*class="institution"[^>]*>([\s\S]*?)<\/span>/);
        const degreeMatch = eduHtml.match(/<span[^>]*class="degree"[^>]*>([\s\S]*?)<\/span>/);
        const eduMetaMatch = eduHtml.match(/<div[^>]*class="education-meta"[^>]*>([\s\S]*?)<\/div>/);

        const institution = institutionMatch ? stripHtml(institutionMatch[1]) : '';
        const degree = degreeMatch ? stripHtml(degreeMatch[1]) : '';
        const eduMeta = eduMetaMatch ? stripHtml(eduMetaMatch[1]) : '';

        if (institution) {
          const instW = fontBold.widthOfTextAtSize(institution, 11);
          page.drawText(institution, { x: MARGIN, y, size: 11, font: fontBold, color: rgb(BLACK.r, BLACK.g, BLACK.b) });
          if (degree) {
            page.drawText(`  •  ${degree}`, { x: MARGIN + instW, y, size: 10, font: fontItalic, color: rgb(DARK.r, DARK.g, DARK.b) });
          }
          y -= 14;
        }

        if (eduMeta) {
          page.drawText(eduMeta, { x: MARGIN, y, size: 9, font: fontRegular, color: rgb(GRAY.r, GRAY.g, GRAY.b) });
          y -= 14;
        }

        // Honors bullets
        const honorsBlock = eduHtml.match(/<ul[^>]*class="honors"[^>]*>([\s\S]*?)<\/ul>/);
        if (honorsBlock) {
          const honorBullets = matchAll(honorsBlock[1], /<li>([\s\S]*?)<\/li>/g);
          for (const hb of honorBullets) {
            ensureSpace(16);
            page.drawText('•', { x: MARGIN + 8, y, size: 9, font: fontRegular, color: rgb(DARK.r, DARK.g, DARK.b) });
            drawTextSafe(hb[1], MARGIN + 22, CONTENT_WIDTH - 22, fontRegular, 9, DARK);
          }
        }
        y -= 6;
      }

      // === SKILLS ===
      const skillCategories = matchAll(sectionHtml, /<div[^>]*class="skill-category"[^>]*>([\s\S]*?)<\/div>/g);
      for (const skillMatch of skillCategories) {
        ensureSpace(20);
        const labelMatch = skillMatch[1].match(/<span[^>]*class="skill-label"[^>]*>([\s\S]*?)<\/span>/);
        const listMatch = skillMatch[1].match(/<span[^>]*class="skill-list"[^>]*>([\s\S]*?)<\/span>/);
        const label = labelMatch ? stripHtml(labelMatch[1]) : '';
        const list = listMatch ? stripHtml(listMatch[1]) : '';

        if (label) {
          const labelWidth = fontBold.widthOfTextAtSize(label + ' ', 10);
          page.drawText(label + ' ', { x: MARGIN, y, size: 10, font: fontBold, color: rgb(BLACK.r, BLACK.g, BLACK.b) });
          drawTextSafe(list, MARGIN + labelWidth, CONTENT_WIDTH - labelWidth, fontRegular, 10, DARK);
          y -= 2;
        }
      }

      // === PROJECT ITEMS ===
      const projItems = matchAll(sectionHtml, /<div[^>]*class="project-item"[^>]*>([\s\S]*?)<\/div>\s*(?=<div[^>]*class="project-item"|$)/g);
      for (const projMatch of projItems) {
        ensureSpace(40);
        const projHtml = projMatch[1];

        const projNameMatch = projHtml.match(/<span[^>]*class="project-name"[^>]*>([\s\S]*?)<\/span>/);
        const projDescMatch = projHtml.match(/<p[^>]*class="project-description"[^>]*>([\s\S]*?)<\/p>/);
        const projTechMatch = projHtml.match(/<p[^>]*class="project-tech"[^>]*>([\s\S]*?)<\/p>/);

        const projName = projNameMatch ? stripHtml(projNameMatch[1]) : '';
        const projDesc = projDescMatch ? stripHtml(projDescMatch[1]) : '';
        const projTech = projTechMatch ? stripHtml(projTechMatch[1]) : '';

        if (projName) {
          page.drawText(projName, { x: MARGIN, y, size: 11, font: fontBold, color: rgb(BLACK.r, BLACK.g, BLACK.b) });
          y -= 14;
        }
        if (projDesc) drawTextSafe(projDesc, MARGIN, CONTENT_WIDTH, fontRegular, 9.5, DARK);
        if (projTech) drawTextSafe(projTech, MARGIN, CONTENT_WIDTH, fontItalic, 9, GRAY);

        const projBullets = matchAll(projHtml, /<li>([\s\S]*?)<\/li>/g);
        for (const pb of projBullets) {
          ensureSpace(16);
          page.drawText('•', { x: MARGIN + 8, y, size: 9, font: fontRegular, color: rgb(DARK.r, DARK.g, DARK.b) });
          drawTextSafe(pb[1], MARGIN + 22, CONTENT_WIDTH - 22, fontRegular, 9.5, DARK);
        }
        y -= 6;
      }

      // === AWARD ITEMS ===
      const awardItems = matchAll(sectionHtml, /<div[^>]*class="award-item"[^>]*>([\s\S]*?)<\/div>/g);
      for (const awardMatch of awardItems) {
        ensureSpace(30);
        const awardHtml = awardMatch[1];
        const awardTitleMatch = awardHtml.match(/<div[^>]*class="award-title"[^>]*>([\s\S]*?)<\/div>/);
        const awardMetaMatch = awardHtml.match(/<div[^>]*class="award-meta"[^>]*>([\s\S]*?)<\/div>/);

        if (awardTitleMatch) {
          page.drawText(stripHtml(awardTitleMatch[1]), { x: MARGIN, y, size: 11, font: fontBold, color: rgb(BLACK.r, BLACK.g, BLACK.b) });
          y -= 14;
        }
        if (awardMetaMatch) {
          page.drawText(stripHtml(awardMetaMatch[1]), { x: MARGIN, y, size: 9, font: fontRegular, color: rgb(GRAY.r, GRAY.g, GRAY.b) });
          y -= 14;
        }
      }
    }

    const pdfBytes = await doc.save();
    const buffer = Buffer.from(pdfBytes);
    logger.info({ sizeBytes: buffer.length }, 'PDF generated successfully with pdf-lib');
    return buffer;
  } catch (error) {
    logger.error({ error }, 'PDF generation failed');
    throw new AppError('Failed to generate PDF', 500, 'PDF_GENERATION_FAILED');
  }
}
