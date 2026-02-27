/**
 * Resume parser - extracts structured data from PDF and DOCX resumes using AI
 */

import mammoth from 'mammoth';
import { z } from 'zod';
import { aiClient } from '@/lib/ai-client';
import { logger } from '@/lib/logger';
import { ValidationError } from '@/lib/errors';
import {
  Profile,
  SkillSchema,
  ExperienceSchema,
  EducationSchema,
  CertificationSchema,
  ProjectSchema,
  LanguageSchema,
} from '@/types/profile';
import { getProfile, updateProfile } from '../profile-service';

// Dynamic import for CommonJS module
type PdfParseResult = {
  text: string;
  numpages: number;
  info: Record<string, unknown>;
};
type PdfParseFn = (buffer: Buffer) => Promise<PdfParseResult>;

// Schema for AI extraction
const ResumeDataSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  summary: z.string().optional(),
  headline: z.string().optional(),
  skills: z.array(SkillSchema).default([]),
  experience: z
    .array(
      ExperienceSchema.omit({ id: true }).extend({
        id: z.string().optional(),
      })
    )
    .default([]),
  education: z
    .array(
      EducationSchema.omit({ id: true }).extend({
        id: z.string().optional(),
      })
    )
    .default([]),
  certifications: z
    .array(
      CertificationSchema.omit({ id: true }).extend({
        id: z.string().optional(),
      })
    )
    .default([]),
  projects: z
    .array(
      ProjectSchema.omit({ id: true }).extend({
        id: z.string().optional(),
      })
    )
    .default([]),
  languages: z.array(LanguageSchema).default([]),
});

type ResumeData = z.infer<typeof ResumeDataSchema>;

/**
 * Extract text from PDF buffer
 */
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    // Import the internal lib directly — the pdf-parse package index.js reads a
    // test PDF file from disk at load time which crashes in Next.js server routes.
    const pdfParse: PdfParseFn = require('pdf-parse/lib/pdf-parse.js');
    const data = await pdfParse(buffer);
    return data.text;
  } catch (error) {
    logger.error({ error }, 'Failed to extract text from PDF');
    throw new ValidationError('Failed to parse PDF file');
  }
}

/**
 * Extract text from DOCX buffer
 */
async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    logger.error({ error }, 'Failed to extract text from DOCX');
    throw new ValidationError('Failed to parse DOCX file');
  }
}

/**
 * Extract structured data from resume text using AI
 */
async function extractStructuredData(text: string): Promise<ResumeData> {
  const systemPrompt = `You are an expert resume parser. Extract structured information from the provided resume text.

Your task:
1. Extract ALL relevant information from the resume
2. Return a JSON object matching the exact schema provided
3. For dates, use ISO 8601 format (YYYY-MM-DD)
4. If a person is currently working somewhere, set "current": true and "endDate": null
5. For skills, estimate proficiency level based on context (beginner/intermediate/advanced/expert)
6. Estimate years of experience with each skill if mentioned
7. For education, if still studying, set "endDate": null
8. Extract ALL work experiences, projects, certifications, and education entries
9. Clean and normalize all text (fix typos, standardize formatting)

Schema:
- name: Full name
- phone: Phone number (optional)
- location: Location/city (optional)
- summary: Professional summary or objective (optional)
- headline: Professional title/headline (optional)
- skills: Array of { name, proficiency: "beginner"|"intermediate"|"advanced"|"expert", years?: number }
- experience: Array of { company, role, startDate, endDate, current, description?, bullets: [], technologies: [] }
- education: Array of { institution, degree, field?, startDate, endDate, gpa?: number }
- certifications: Array of { name, issuer, date, url? }
- projects: Array of { name, description?, technologies: [], url?, githubUrl? }
- languages: Array of { language, proficiency: "native"|"fluent"|"conversational"|"basic" }

IMPORTANT:
- All arrays should be populated if information is available
- Use null for missing optional dates
- Preserve all bullet points and details
- Extract technologies mentioned in each experience
- If information is not in the resume, use empty arrays or omit optional fields`;

  const userPrompt = `Parse this resume and extract all information:\n\n${text}`;

  try {
    const extractedData = await aiClient.completeJSON<ResumeData>(
      systemPrompt,
      userPrompt,
      ResumeDataSchema,
      {
        model: 'balanced',
        maxTokens: 8000,
        temperature: 0.3, // Lower temperature for more consistent extraction
      }
    );

    logger.info('Resume data extracted successfully');
    return extractedData;
  } catch (error) {
    logger.error({ error }, 'Failed to extract structured data from resume');
    throw new ValidationError('Failed to parse resume content. Please try a different format.');
  }
}

/**
 * Merge extracted resume data with existing profile (don't overwrite existing data)
 */
function mergeResumeData(existingProfile: Profile, resumeData: ResumeData): Partial<Profile> {
  const updates: Partial<Profile> = {};

  // Update basic fields only if not already set
  if (resumeData.name && !existingProfile.name) {
    updates.name = resumeData.name;
  }
  if (resumeData.phone && !existingProfile.phone) {
    updates.phone = resumeData.phone;
  }
  if (resumeData.location && !existingProfile.location) {
    updates.location = resumeData.location;
  }
  if (resumeData.summary && !existingProfile.summary) {
    updates.summary = resumeData.summary;
  }
  if (resumeData.headline && !existingProfile.headline) {
    updates.headline = resumeData.headline;
  }

  // Merge arrays (add new items, don't duplicate)
  if (resumeData.skills.length > 0) {
    const existingSkillNames = new Set(existingProfile.skills.map((s) => s.name.toLowerCase()));
    const newSkills = resumeData.skills.filter(
      (skill) => !existingSkillNames.has(skill.name.toLowerCase())
    );
    if (newSkills.length > 0) {
      updates.skills = [...existingProfile.skills, ...newSkills];
    }
  }

  // For experience, education, etc., we need to generate IDs
  if (resumeData.experience.length > 0) {
    const newExperience = resumeData.experience.map((exp) => ({
      ...exp,
      id: exp.id || crypto.randomUUID(),
    }));
    updates.experience = [...existingProfile.experience, ...newExperience];
  }

  if (resumeData.education.length > 0) {
    const newEducation = resumeData.education.map((edu) => ({
      ...edu,
      id: edu.id || crypto.randomUUID(),
    }));
    updates.education = [...existingProfile.education, ...newEducation];
  }

  if (resumeData.certifications.length > 0) {
    const newCertifications = resumeData.certifications.map((cert) => ({
      ...cert,
      id: cert.id || crypto.randomUUID(),
    }));
    updates.certifications = [...existingProfile.certifications, ...newCertifications];
  }

  if (resumeData.projects.length > 0) {
    const newProjects = resumeData.projects.map((proj) => ({
      ...proj,
      id: proj.id || crypto.randomUUID(),
    }));
    updates.projects = [...existingProfile.projects, ...newProjects];
  }

  if (resumeData.languages.length > 0) {
    const existingLanguages = new Set(
      existingProfile.languages.map((l) => l.language.toLowerCase())
    );
    const newLanguages = resumeData.languages.filter(
      (lang) => !existingLanguages.has(lang.language.toLowerCase())
    );
    if (newLanguages.length > 0) {
      updates.languages = [...existingProfile.languages, ...newLanguages];
    }
  }

  return updates;
}

/**
 * Parse resume file and merge with existing profile
 */
export async function parseResume(
  userId: string,
  fileBuffer: Buffer,
  fileName: string
): Promise<Profile> {
  try {
    // Detect file type from extension
    const extension = fileName.toLowerCase().split('.').pop();

    let text: string;

    if (extension === 'pdf') {
      text = await extractTextFromPDF(fileBuffer);
    } else if (extension === 'docx' || extension === 'doc') {
      text = await extractTextFromDOCX(fileBuffer);
    } else {
      throw new ValidationError('Unsupported file format. Please upload PDF or DOCX');
    }

    if (!text || text.trim().length < 100) {
      throw new ValidationError('Resume file appears to be empty or too short');
    }

    logger.info({ userId, fileName, textLength: text.length }, 'Extracted text from resume');

    // Extract structured data using AI
    const resumeData = await extractStructuredData(text);

    // Get existing profile
    const existingProfile = await getProfile(userId);

    if (!existingProfile) {
      throw new ValidationError('Profile not found');
    }

    // Merge resume data with existing profile
    const updates = mergeResumeData(existingProfile, resumeData);

    // Update profile with merged data
    const updatedProfile = await updateProfile(userId, updates);

    logger.info({ userId, fileName }, 'Resume parsed and merged successfully');
    return updatedProfile;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    logger.error({ error, userId, fileName }, 'Failed to parse resume');
    throw new ValidationError('Failed to parse resume. Please try again.');
  }
}
