import { NextRequest } from 'next/server';
import { errorResponse, successResponse, authenticate, handleError } from '@/lib/api-utils';
import { storage } from '@/lib/storage';
import { atsCheckRequestSchema, DocumentIndex, CVContent } from '@/types/documents';
import { checkATS } from '@/services/documents/ats-checker';
import { logger } from '@/lib/logger';

/**
 * POST /api/documents/ats-check
 * Check ATS compatibility of a document
 */
export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await authenticate(req);

    // Parse and validate request body
    const body = await req.json();
    const validation = atsCheckRequestSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse('Invalid request body', 400, 'VALIDATION_ERROR');
    }

    const { documentId, jobId } = validation.data;

    logger.info({ userId, documentId, jobId }, 'ATS check request');

    // Load documents index
    const indexKey = `users/${userId}/documents/index.json`;
    const index = await storage.getJSON<DocumentIndex>(indexKey);

    if (!index) {
      return errorResponse('Document not found', 404, 'DOCUMENT_NOT_FOUND');
    }

    // Find document
    const document = index.documents.find(d => d.id === documentId);

    if (!document) {
      return errorResponse('Document not found', 404, 'DOCUMENT_NOT_FOUND');
    }

    // For now, we need to reconstruct CVContent from the document
    // In a real implementation, we might store the CVContent alongside the document
    // For this API, we'll regenerate from profile (simplified approach)

    // Load user profile
    const profile = await storage.getJSON<any>(`users/${userId}/profile.json`);
    if (!profile) {
      return errorResponse('Profile not found', 404, 'PROFILE_NOT_FOUND');
    }

    // Reconstruct basic CVContent
    const cvContent: CVContent = {
      contactInfo: {
        name: profile.personalInfo.name,
        email: profile.personalInfo.email,
        phone: profile.personalInfo.phone,
        location: profile.personalInfo.location,
        linkedin: profile.socialLinks?.linkedin,
        github: profile.socialLinks?.github,
        website: profile.socialLinks?.website,
      },
      summary: profile.professionalInfo?.summary || '',
      experience: (profile.experience || []).map((exp: any) => ({
        company: exp.company,
        position: exp.role,
        location: exp.location,
        startDate: exp.startDate,
        endDate: exp.endDate,
        highlights: exp.achievements || exp.responsibilities || [],
      })),
      education: profile.education || [],
      skills: {
        technical: profile.skills?.technical || [],
        soft: profile.skills?.soft || [],
        languages: profile.skills?.languages,
        certifications: profile.certifications?.map((c: any) => `${c.name} (${c.issuer})`),
      },
      projects: profile.projects,
      awards: profile.awards,
    };

    // Load job description if provided
    let jobDescription: string | undefined;
    if (jobId) {
      const job = await storage.getJSON<any>(`users/${userId}/jobs/${jobId}.json`);
      if (job) {
        jobDescription = job.description;
      }
    }

    // Run ATS check
    const atsResult = checkATS(cvContent, jobDescription);

    return successResponse({
      documentId,
      atsResult,
    });
  } catch (error) {
    logger.error({ error }, 'ATS check API error');
    return handleError(error);
  }
}
