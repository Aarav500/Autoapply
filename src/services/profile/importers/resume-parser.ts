/**
 * Resume parser - extracts structured data from PDF and DOCX resumes using AI
 */

import mammoth from 'mammoth';
import { z } from 'zod';
import { aiClient } from '@/lib/ai-client';
import { logger } from '@/lib/logger';
import { ValidationError } from '@/lib/errors';
import { Profile, ProficiencyLevel, LanguageProficiency } from '@/types/profile';
import { getProfile, updateProfile } from '../profile-service';

// ========== Lenient schemas for AI extraction (forgiving of AI output quirks) ==========

const LenientSkillSchema = z.object({
  name: z.string(),
  proficiency: z.string().catch('intermediate'),
  years: z.number().optional().catch(undefined),
});

const LenientExperienceSchema = z.object({
  id: z.string().optional(),
  company: z.string(),
  role: z.string(),
  startDate: z.string().catch(''),
  endDate: z.string().nullable().catch(null),
  current: z.boolean().catch(false),
  description: z.string().optional().catch(undefined),
  bullets: z.array(z.string()).catch([]),
  technologies: z.array(z.string()).catch([]),
});

const LenientEducationSchema = z.object({
  id: z.string().optional(),
  institution: z.string(),
  degree: z.string(),
  field: z.string().optional().catch(undefined),
  startDate: z.string().catch(''),
  endDate: z.string().nullable().catch(null),
  gpa: z.number().nullable().optional().catch(undefined),
});

const LenientCertificationSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  issuer: z.string(),
  date: z.string().catch(''),
  url: z.string().optional().catch(undefined),
});

const LenientProjectSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string().optional().catch(undefined),
  technologies: z.array(z.string()).catch([]),
  url: z.string().optional().catch(undefined),
  githubUrl: z.string().optional().catch(undefined),
});

const LenientLanguageSchema = z.object({
  language: z.string(),
  proficiency: z.string().catch('conversational'),
});

// Schema for AI extraction — intentionally lenient to avoid Zod validation failures
const ResumeDataSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  summary: z.string().optional(),
  headline: z.string().optional(),
  skills: z.array(LenientSkillSchema).catch([]),
  experience: z.array(LenientExperienceSchema).catch([]),
  education: z.array(LenientEducationSchema).catch([]),
  certifications: z.array(LenientCertificationSchema).catch([]),
  projects: z.array(LenientProjectSchema).catch([]),
  languages: z.array(LenientLanguageSchema).catch([]),
});

type ResumeData = z.infer<typeof ResumeDataSchema>;

/**
 * Extract text from PDF buffer using pdf-parse (reliable, no native deps, no worker needed)
 */
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    // Use the lib/ path to avoid pdf-parse's test-data check on require()
    const pdfParse = require('pdf-parse/lib/pdf-parse.js') as (buf: Buffer) => Promise<{ text: string }>; // eslint-disable-line
    const data = await pdfParse(buffer);
    return data.text || '';
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
        temperature: 0.3,
        timeout: 60000, // 60s — resume parsing can be slow
      }
    );

    logger.info('Resume data extracted successfully');
    return extractedData;
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error({ error: errMsg, stack: error instanceof Error ? error.stack : undefined }, 'Failed to extract structured data from resume');
    throw new ValidationError(`Failed to parse resume content: ${errMsg}`);
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

  // Valid proficiency values for coercion
  const validSkillProf = new Set(['beginner', 'intermediate', 'advanced', 'expert']);
  const validLangProf = new Set(['native', 'fluent', 'conversational', 'basic']);

  // Merge arrays (add new items, don't duplicate)
  if (resumeData.skills.length > 0) {
    const existingSkillNames = new Set(existingProfile.skills.map((s) => s.name.toLowerCase()));
    const newSkills = resumeData.skills
      .filter((skill) => !existingSkillNames.has(skill.name.toLowerCase()))
      .map((skill) => ({
        name: skill.name,
        proficiency: (validSkillProf.has(skill.proficiency) ? skill.proficiency : 'intermediate') as ProficiencyLevel,
        ...(skill.years !== undefined ? { years: skill.years } : {}),
      }));
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
    const newLanguages = resumeData.languages
      .filter((lang) => !existingLanguages.has(lang.language.toLowerCase()))
      .map((lang) => ({
        language: lang.language,
        proficiency: (validLangProf.has(lang.proficiency) ? lang.proficiency : 'conversational') as LanguageProficiency,
      }));
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
