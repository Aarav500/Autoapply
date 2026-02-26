import { nanoid } from 'nanoid';
import { logger } from '@/lib/logger';
import { AppError } from '@/lib/errors';
import { storage } from '@/lib/storage';
import { aiClient } from '@/lib/ai-client';
import { cvGeneratorPrompt, CVGeneratorInput } from '@/prompts/cv-generator';
import { GeneratedCVSchema, GeneratedCV } from '@/types/ai';
import { CVContent, Document, DocumentIndex } from '@/types/documents';
import { modernCleanTemplate } from './templates/modern-clean';
import { htmlToPdf } from './pdf-generator';
import { contentToDocx } from './docx-generator';
import { checkATS } from './ats-checker';

interface GenerateCVOptions {
  userId: string;
  jobId?: string;
  templateName?: string;
}

interface GenerateCVResult {
  documentId: string;
  pdfUrl: string;
  docxUrl: string;
  atsScore: number;
}

/**
 * Generate a CV (both PDF and DOCX) for a user, optionally tailored to a job
 */
export async function generateCV(options: GenerateCVOptions): Promise<GenerateCVResult> {
  const { userId, jobId, templateName = 'modern-clean' } = options;

  try {
    logger.info({ userId, jobId, templateName });

    // 1. Load user profile
    const profile = await storage.getJSON<any>(`users/${userId}/profile.json`);
    if (!profile) {
      throw new AppError('Profile not found', 404, 'PROFILE_NOT_FOUND');
    }

    // 2. Load job details if jobId provided
    let jobListing;
    if (jobId) {
      jobListing = await storage.getJSON<any>(`users/${userId}/jobs/${jobId}.json`);
      if (!jobListing) {
        throw new AppError('Job not found', 404, 'JOB_NOT_FOUND');
      }
    }

    // 3. Prepare input for AI CV generator
    const cvInput: CVGeneratorInput = {
      profile: {
        name: profile.name,
        email: profile.email,
        phone: profile.phone || '',
        location: profile.location || '',
        linkedin: profile.socialLinks?.find((s: { platform: string; url: string }) => s.platform === 'LinkedIn')?.url,
        github: profile.socialLinks?.find((s: { platform: string; url: string }) => s.platform === 'GitHub')?.url,
        website: profile.socialLinks?.find((s: { platform: string; url: string }) => s.platform === 'Portfolio' || s.platform === 'Website')?.url,
        title: profile.headline || '',
        summary: profile.summary,
        experience: profile.experience || [],
        education: profile.education || [],
        skills: {
          languages: (profile.skills || [])
            .filter((s: { name: string }) =>
              ['javascript', 'typescript', 'python', 'java', 'go', 'rust', 'c++', 'c#', 'ruby', 'php', 'swift', 'kotlin'].some(lang =>
                s.name.toLowerCase().includes(lang)
              )
            )
            .map((s: { name: string }) => s.name),
          frameworks: (profile.skills || [])
            .filter((s: { name: string }) =>
              ['react', 'vue', 'angular', 'next', 'express', 'django', 'flask', 'spring', 'rails'].some(fw =>
                s.name.toLowerCase().includes(fw)
              )
            )
            .map((s: { name: string }) => s.name),
          tools: (profile.skills || [])
            .filter((s: { name: string }) =>
              !['javascript', 'typescript', 'python', 'java', 'go', 'rust', 'c++', 'c#', 'ruby', 'php', 'swift', 'kotlin', 'react', 'vue', 'angular', 'next', 'express', 'django', 'flask', 'spring', 'rails'].some(term =>
                s.name.toLowerCase().includes(term)
              )
            )
            .map((s: { name: string }) => s.name),
          methodologies: [],
        },
        certifications: profile.certifications || [],
        projects: profile.projects || [],
      },
      jobListing: jobListing ? {
        title: jobListing.title,
        company: jobListing.company,
        description: jobListing.description,
        requirements: jobListing.requirements || [],
      } : undefined,
      templateName,
    };

    // 4. Call AI to generate optimized CV content
    logger.info('Calling AI to generate CV content');
    const prompt = cvGeneratorPrompt(cvInput);
    const generatedCV = await aiClient.completeJSON<GeneratedCV>(
      prompt.system,
      prompt.user,
      GeneratedCVSchema,
      { model: 'balanced' }
    );

    // 5. Convert AI output to CVContent format
    const cvContent: CVContent = {
      contactInfo: {
        name: generatedCV.header.name,
        email: generatedCV.header.email,
        phone: generatedCV.header.phone,
        location: generatedCV.header.location,
        linkedin: generatedCV.header.linkedin,
        github: generatedCV.header.github,
        website: generatedCV.header.website,
      },
      summary: generatedCV.summary,
      experience: generatedCV.experience.map(exp => ({
        company: exp.company,
        position: exp.role,
        location: exp.location,
        startDate: exp.startDate,
        endDate: exp.endDate,
        highlights: exp.achievements,
      })),
      education: generatedCV.education.map(edu => ({
        institution: edu.institution,
        degree: edu.degree,
        field: edu.field,
        location: edu.location,
        startDate: edu.startDate,
        endDate: edu.endDate ?? undefined,
        gpa: edu.gpa,
        honors: edu.honors,
      })),
      skills: {
        technical: [
          ...generatedCV.skills.languages,
          ...generatedCV.skills.frameworks,
          ...generatedCV.skills.tools,
        ],
        soft: profile.skills?.soft || [],
        languages: profile.skills?.languages,
        certifications: generatedCV.certifications?.map(c => `${c.name} (${c.issuer})`),
      },
      projects: generatedCV.projects?.map(p => ({
        name: p.name,
        description: p.description,
        technologies: p.technologies,
        link: p.url,
        highlights: p.achievements,
      })),
      awards: profile.awards,
    };

    // 6. Render HTML using template
    let html: string;
    switch (templateName) {
      case 'modern-clean':
        html = modernCleanTemplate(cvContent);
        break;
      default:
        html = modernCleanTemplate(cvContent);
    }

    // 7. Generate PDF and DOCX
    logger.info('Generating PDF and DOCX files');
    const [pdfBuffer, docxBuffer] = await Promise.all([
      htmlToPdf(html),
      contentToDocx(cvContent),
    ]);

    // 8. Calculate ATS score
    const atsResult = checkATS(cvContent, jobListing?.description);

    // 9. Upload files to S3
    const documentId = nanoid();
    const pdfKey = `users/${userId}/documents/cv/${documentId}.pdf`;
    const docxKey = `users/${userId}/documents/cv/${documentId}.docx`;

    await Promise.all([
      storage.uploadFile(pdfKey, pdfBuffer, 'application/pdf'),
      storage.uploadFile(docxKey, docxBuffer, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
    ]);

    // 10. Update documents index
    const indexKey = `users/${userId}/documents/index.json`;
    const index = await storage.getJSON<DocumentIndex>(indexKey) || {
      documents: [],
      lastUpdated: new Date().toISOString(),
    };

    const now = new Date().toISOString();
    const document: Document = {
      id: documentId,
      userId,
      type: 'cv',
      name: jobListing ? `CV - ${jobListing.company} - ${jobListing.title}` : 'CV - General',
      description: jobListing ? `Tailored CV for ${jobListing.company}` : 'General purpose CV',
      jobId,
      templateName,
      createdAt: now,
      updatedAt: now,
      files: {
        pdf: pdfKey,
        docx: docxKey,
      },
      metadata: {
        atsScore: atsResult.score,
        wordCount: cvContent.summary.split(/\s+/).length +
          cvContent.experience.flatMap(e => e.highlights).join(' ').split(/\s+/).length,
        pageCount: 1, // Estimate - could be calculated from PDF
      },
    };

    index.documents.push(document);
    index.lastUpdated = now;
    await storage.putJSON(indexKey, index);

    // 11. Generate presigned URLs for download
    const [pdfUrl, docxUrl] = await Promise.all([
      storage.getPresignedUrl(pdfKey, 3600),
      storage.getPresignedUrl(docxKey, 3600),
    ]);

    logger.info({
      documentId,
      atsScore: atsResult.score,
      pdfSizeBytes: pdfBuffer.length,
      docxSizeBytes: docxBuffer.length,
    });

    return {
      documentId,
      pdfUrl,
      docxUrl,
      atsScore: atsResult.score,
    };
  } catch (error) {
    logger.error({ error, userId, jobId });
    throw error instanceof AppError ? error : new AppError(
      'Failed to generate CV',
      500,
      'CV_GENERATION_FAILED'
    );
  }
}
