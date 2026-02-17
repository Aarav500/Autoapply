import puppeteer from 'puppeteer';
import { logger } from '@/lib/logger';
import { AppError } from '@/lib/errors';

/**
 * Generate PDF from HTML string using Puppeteer
 */
export async function htmlToPdf(html: string): Promise<Buffer> {
  let browser;

  try {
    logger.info('Launching Puppeteer for PDF generation');

    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    const page = await browser.newPage();

    // Set content and wait for network to be idle
    await page.setContent(html, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    // Generate PDF with A4 format and proper margins
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0.5in',
        right: '0.5in',
        bottom: '0.5in',
        left: '0.5in',
      },
      preferCSSPageSize: false,
    });

    logger.info({ sizeBytes: pdfBuffer.length }, 'PDF generated successfully');

    return Buffer.from(pdfBuffer);
  } catch (error) {
    logger.error({ error }, 'PDF generation failed');
    throw new AppError('Failed to generate PDF', 500, 'PDF_GENERATION_FAILED');
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
