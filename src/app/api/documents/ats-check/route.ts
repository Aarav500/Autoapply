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
    const profile = await storage.getJSON<Record<string, unknown>>(`users/${userId}/profile.json`);
    if (!profile) {
      return errorResponse('Profile not found', 404, 'PROFILE_NOT_FOUND');
    }

    // Reconstruct basic CVContent
    const socialLinks: Array<{ platform: string; url: string }> = (profile.socialLinks as Array<{ platform: string; url: string }>) || [];
    const linkedinLink = socialLinks.find((l) => l.platform?.toLowerCase() === 'linkedin');
    const githubLink = socialLinks.find((l) => l.platform?.toLowerCase() === 'github');
    const websiteLink = socialLinks.find((l) => l.platform?.toLowerCase() === 'website' || l.platform?.toLowerCase() === 'portfolio');

    const allSkillNames = ((profile.skills as Array<{ name: string }>) || []).map((s) => s.name);
    const cvContent: CVContent = {
      contactInfo: {
        name: profile.name as string,
        email: profile.email as string,
        phone: profile.phone as string,
        location: profile.location as string,
        linkedin: linkedinLink?.url,
        github: githubLink?.url,
        website: websiteLink?.url,
      },
      summary: (profile.summary as string) || '',
      experience: ((profile.experience as Array<Record<string, unknown>>) || []).map((exp) => ({
        company: exp.company as string,
        position: exp.role as string,
        location: exp.location as string,
        startDate: exp.startDate as string,
        endDate: exp.endDate as string | null,
        highlights: (Array.isArray(exp.bullets) ? exp.bullets : Array.isArray(exp.responsibilities) ? exp.responsibilities : []) as string[],
      })),
      education: (profile.education as CVContent['education']) || [],
      skills: {
        technical: allSkillNames,
        soft: [],
        certifications: ((profile.certifications as Array<{ name: string; issuer: string }>) || []).map((c) => `${c.name} (${c.issuer})`),
      },
      projects: profile.projects as CVContent['projects'],
    };

    // Load job description if provided
    let jobDescription: string | undefined;
    let job: Record<string, unknown> | null = null;
    if (jobId) {
      job = await storage.getJSON<Record<string, unknown>>(`users/${userId}/jobs/${jobId}.json`);
      if (job) {
        jobDescription = job.description as string;
      }
    }

    // Run ATS check
    const atsResult = checkATS(cvContent, jobDescription);

    // Generate actionable improvement suggestions based on ATS score
    const improvements: Array<{ priority: 'high' | 'medium' | 'low'; category: string; suggestion: string }> = [];

    if (atsResult.score < 90) {
      // Keyword gap analysis
      if (jobId && job?.description) {
        const jobWords = ((job.description as string).match(/\b[a-zA-Z][a-zA-Z+#.]{2,}\b/g) || [])
          .map((w: string) => w.toLowerCase())
          .filter((w: string) => w.length > 3);

        const cvText = [
          cvContent.summary,
          ...(cvContent.experience || []).flatMap((e: { highlights?: string[] }) => e.highlights || []),
          ...(Object.values(cvContent.skills || {}).flat() as string[]),
        ].join(' ').toLowerCase();

        const STOP_WORDS = new Set(['with', 'this', 'that', 'have', 'will', 'from', 'they', 'what', 'when', 'your', 'more', 'also', 'been', 'were', 'their', 'which', 'about', 'into', 'than']);
        const missingKeywords = [...new Set(jobWords)]
          .filter((w: string) => !STOP_WORDS.has(w) && !cvText.includes(w))
          .slice(0, 8);

        if (missingKeywords.length > 0) {
          improvements.push({
            priority: 'high',
            category: 'Missing Keywords',
            suggestion: `Add these keywords from the job description: ${missingKeywords.join(', ')}`,
          });
        }
      }

      if (atsResult.score < 70) {
        improvements.push({
          priority: 'high',
          category: 'Achievement Quantification',
          suggestion: 'Most bullets lack measurable results. Add numbers: team size, % improvement, $ impact, users served, or time saved to at least 80% of bullets.',
        });
      }

      if (atsResult.score < 80) {
        improvements.push({
          priority: 'medium',
          category: 'Action Verbs',
          suggestion: 'Replace weak verbs (helped, assisted, worked on, was responsible for) with strong action verbs: Architected, Led, Delivered, Optimized, Launched, Generated.',
        });

        improvements.push({
          priority: 'medium',
          category: 'Summary Section',
          suggestion: 'Ensure your professional summary explicitly mentions your target role title and top 3 skills — ATS systems weight summary keywords heavily.',
        });
      }

      improvements.push({
        priority: 'low',
        category: 'ATS Formatting',
        suggestion: 'Avoid tables, text boxes, and columns — some ATS systems cannot parse them. Use simple single-column layout with standard section headers.',
      });
    }

    return successResponse({
      documentId,
      atsResult,
      improvements,
    });
  } catch (error) {
    logger.error({ error }, 'ATS check API error');
    return handleError(error);
  }
}
