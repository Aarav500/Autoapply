import { nanoid } from 'nanoid';
import { logger } from '@/lib/logger';
import { AppError } from '@/lib/errors';
import { storage } from '@/lib/storage';
import { aiClient } from '@/lib/ai-client';
import { coverLetterPrompt, CoverLetterInput } from '@/prompts/cover-letter';
import { GeneratedCoverLetterSchema, GeneratedCoverLetter } from '@/types/ai';
import { CoverLetterContent, Document, DocumentIndex } from '@/types/documents';
import { htmlToPdf } from './pdf-generator';

interface GenerateCoverLetterOptions {
  userId: string;
  jobId: string;
}

interface GenerateCoverLetterResult {
  documentId: string;
  pdfUrl: string;
}

/**
 * Create professional cover letter HTML template
 */
function coverLetterTemplate(content: CoverLetterContent): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cover Letter - ${content.senderInfo.name}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    @page {
      size: A4;
      margin: 1in;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #333;
      background: white;
    }

    .container {
      max-width: 8.5in;
      margin: 0 auto;
    }

    .sender-info {
      margin-bottom: 2em;
    }

    .sender-name {
      font-size: 14pt;
      font-weight: 700;
      color: #1a1a2e;
      margin-bottom: 0.3em;
    }

    .sender-contact {
      font-size: 10pt;
      color: #666;
      line-height: 1.4;
    }

    .date {
      margin-bottom: 2em;
      font-size: 11pt;
      color: #333;
    }

    .greeting {
      margin-bottom: 1.5em;
      font-size: 11pt;
      color: #333;
    }

    .body-paragraph {
      margin-bottom: 1.2em;
      font-size: 11pt;
      line-height: 1.6;
      text-align: justify;
      color: #333;
    }

    .closing {
      margin-top: 2em;
      margin-bottom: 4em;
    }

    .signature {
      font-size: 11pt;
      font-weight: 600;
      color: #1a1a2e;
    }

    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="sender-info">
      <div class="sender-name">${content.senderInfo.name}</div>
      <div class="sender-contact">
        ${content.senderInfo.email}${content.senderInfo.phone ? ` • ${content.senderInfo.phone}` : ''}
        ${content.senderInfo.address ? `<br>${content.senderInfo.address}` : ''}
      </div>
    </div>

    <div class="date">${content.date}</div>

    <div class="greeting">${content.greeting}</div>

    ${content.body.map(paragraph => `<div class="body-paragraph">${paragraph}</div>`).join('\n    ')}

    <div class="closing">${content.closing}</div>

    <div class="signature">${content.signature}</div>
  </div>
</body>
</html>`;
}

/**
 * Generate a cover letter PDF for a specific job application
 */
export async function generateCoverLetter(options: GenerateCoverLetterOptions): Promise<GenerateCoverLetterResult> {
  const { userId, jobId } = options;

  try {
    logger.info({ userId, jobId });

    // 1. Load user profile
    const profile = await storage.getJSON<any>(`users/${userId}/profile.json`);
    if (!profile) {
      throw new AppError('Profile not found', 404, 'PROFILE_NOT_FOUND');
    }

    // 2. Load job details
    const jobListing = await storage.getJSON<any>(`users/${userId}/jobs/${jobId}.json`);
    if (!jobListing) {
      throw new AppError('Job not found', 404, 'JOB_NOT_FOUND');
    }

    // 3. Prepare input for AI cover letter generator
    const coverLetterInput: CoverLetterInput = {
      profile: {
        name: profile.personalInfo.name,
        currentTitle: profile.professionalInfo?.currentTitle || '',
        experience: (profile.experience || []).slice(0, 3).map((exp: any) => ({
          company: exp.company,
          role: exp.role,
          achievements: exp.achievements || exp.responsibilities?.slice(0, 3) || [],
          technologies: exp.technologies,
        })),
        skills: [
          ...(profile.skills?.technical || []).slice(0, 10),
          ...(profile.skills?.soft || []).slice(0, 5),
        ],
        achievements: profile.achievements?.map((a: any) => a.description || a.title).slice(0, 3),
      },
      jobListing: {
        title: jobListing.title,
        company: jobListing.company,
        description: jobListing.description,
        requirements: jobListing.requirements || [],
        companyInfo: jobListing.companyInfo,
      },
    };

    // 4. Call AI to generate cover letter
    logger.info('Calling AI to generate cover letter');
    const prompt = coverLetterPrompt(coverLetterInput);
    const generatedLetter = await aiClient.completeJSON<GeneratedCoverLetter>(
      prompt.system,
      prompt.user,
      GeneratedCoverLetterSchema,
      { model: 'balanced' }
    );

    // 5. Convert AI output to CoverLetterContent format
    const today = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const coverLetterContent: CoverLetterContent = {
      recipientName: undefined,
      companyName: jobListing.company,
      position: jobListing.title,
      date: today,
      greeting: generatedLetter.greeting,
      opening: generatedLetter.paragraphs[0]?.content || '',
      body: generatedLetter.paragraphs.slice(1).map(p => p.content),
      closing: generatedLetter.signoff,
      signature: profile.personalInfo.name,
      senderInfo: {
        name: profile.personalInfo.name,
        email: profile.personalInfo.email,
        phone: profile.personalInfo.phone,
        address: profile.personalInfo.location,
      },
    };

    // 6. Render HTML
    const html = coverLetterTemplate(coverLetterContent);

    // 7. Generate PDF
    logger.info('Generating cover letter PDF');
    const pdfBuffer = await htmlToPdf(html);

    // 8. Upload to S3
    const documentId = nanoid();
    const pdfKey = `users/${userId}/documents/cover-letters/${documentId}.pdf`;
    await storage.uploadFile(pdfKey, pdfBuffer, 'application/pdf');

    // 9. Update documents index
    const indexKey = `users/${userId}/documents/index.json`;
    const index = await storage.getJSON<DocumentIndex>(indexKey) || {
      documents: [],
      lastUpdated: new Date().toISOString(),
    };

    const now = new Date().toISOString();
    const document: Document = {
      id: documentId,
      userId,
      type: 'cover-letter',
      name: `Cover Letter - ${jobListing.company} - ${jobListing.title}`,
      description: `Cover letter for ${jobListing.company}`,
      jobId,
      createdAt: now,
      updatedAt: now,
      files: {
        pdf: pdfKey,
      },
      metadata: {
        wordCount: generatedLetter.paragraphs
          .map(p => p.content.split(/\s+/).length)
          .reduce((a, b) => a + b, 0),
        pageCount: 1,
      },
    };

    index.documents.push(document);
    index.lastUpdated = now;
    await storage.putJSON(indexKey, index);

    // 10. Generate presigned URL
    const pdfUrl = await storage.getPresignedUrl(pdfKey, 3600);

    logger.info({
      documentId,
      pdfSizeBytes: pdfBuffer.length,
      keyPointsAddressed: generatedLetter.key_points_addressed.length,
    });

    return {
      documentId,
      pdfUrl,
    };
  } catch (error) {
    logger.error({ error, userId, jobId });
    throw error instanceof AppError ? error : new AppError(
      'Failed to generate cover letter',
      500,
      'COVER_LETTER_GENERATION_FAILED'
    );
  }
}
