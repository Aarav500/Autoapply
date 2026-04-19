/**
 * POST /api/profile/linkedin-import
 * Parses pasted LinkedIn profile text with AI and merges it into the user's profile.
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticate, successResponse, errorResponse, handleError } from '@/lib/api-utils';
import { aiClient } from '@/lib/ai-client';
import { storage } from '@/lib/storage';
import { logger } from '@/lib/logger';
import { generateId } from '@/lib/utils';
import type { Profile } from '@/types/profile';

// ─── Request schema ────────────────────────────────────────────────────────────

const inputSchema = z.object({
  linkedinUrl: z.string().url().optional(),
  rawText: z.string().min(50, 'Raw text must be at least 50 characters'),
});

// ─── AI parse schema ───────────────────────────────────────────────────────────

const parseSchema = z.object({
  name: z.string().optional(),
  headline: z.string().optional(),
  summary: z.string().optional(),
  location: z.string().optional(),
  experience: z
    .array(
      z.object({
        company: z.string(),
        role: z.string(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        description: z.string().optional(),
      })
    )
    .optional(),
  education: z
    .array(
      z.object({
        institution: z.string(),
        degree: z.string(),
        field: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        gpa: z.number().optional(),
      })
    )
    .optional(),
  skills: z.array(z.string()).optional(),
  certifications: z
    .array(
      z.object({
        name: z.string(),
        issuer: z.string().optional(),
        date: z.string().optional(),
      })
    )
    .optional(),
});

type ParsedLinkedIn = z.infer<typeof parseSchema>;

// ─── Handler ───────────────────────────────────────────────────────────────────

/**
 * POST /api/profile/linkedin-import
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);

    const body = await req.json();
    const validation = inputSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse(
        validation.error.issues[0]?.message ?? 'Invalid request body',
        400,
        'VALIDATION_ERROR'
      );
    }

    const { rawText, linkedinUrl } = validation.data;

    // Load existing profile
    const profile = await storage.getJSON<Profile>(`users/${userId}/profile.json`);
    if (!profile) {
      return errorResponse(
        'Profile not found. Please complete initial registration first.',
        404,
        'PROFILE_NOT_FOUND'
      );
    }

    logger.info({ userId }, 'LinkedIn import: parsing raw text with AI');

    // Use AI to extract structured data from the pasted text
    const systemPrompt = `You are a precise data extraction assistant. Extract structured professional profile information from pasted LinkedIn profile text.

Return ONLY valid JSON matching this exact schema:
{
  "name": string or null,
  "headline": string or null,
  "summary": string or null,
  "location": string or null,
  "experience": [{ "company": string, "role": string, "startDate": string|null, "endDate": string|null, "description": string|null }],
  "education": [{ "institution": string, "degree": string, "field": string|null, "startDate": string|null, "endDate": string|null, "gpa": number|null }],
  "skills": [string],
  "certifications": [{ "name": string, "issuer": string|null, "date": string|null }]
}

Rules:
- dates should be in "YYYY-MM" or "YYYY" format if possible, otherwise leave as text
- If a section is not present in the text, set it to null or an empty array
- Do not invent or infer data not present in the text
- Remove duplicate skills`;

    const userPrompt = `Extract structured profile data from the following LinkedIn profile text${linkedinUrl ? ` (from ${linkedinUrl})` : ''}:\n\n${rawText}`;

    const parsed = await aiClient.completeJSON(systemPrompt, userPrompt, parseSchema, {
      model: 'fast',
      maxTokens: 4096,
    });

    // Track which sections were updated
    const sectionsUpdated: string[] = [];

    await storage.updateJSON<Profile>(`users/${userId}/profile.json`, (current) => {
      const base = current ?? profile;
      const updated = { ...base };

      if (parsed.name && parsed.name.trim()) {
        updated.name = parsed.name.trim();
        sectionsUpdated.push('name');
      }

      if (parsed.headline && parsed.headline.trim()) {
        updated.headline = parsed.headline.trim();
        sectionsUpdated.push('headline');
      }

      if (parsed.summary && parsed.summary.trim()) {
        updated.summary = parsed.summary.trim();
        sectionsUpdated.push('summary');
      }

      if (parsed.location && parsed.location.trim()) {
        updated.location = parsed.location.trim();
        sectionsUpdated.push('location');
      }

      // Merge skills (add new ones not already present)
      if (parsed.skills && parsed.skills.length > 0) {
        const existingNames = new Set(
          (updated.skills || []).map((s) => s.name.toLowerCase())
        );
        const newSkills = parsed.skills
          .filter((s) => s.trim() && !existingNames.has(s.trim().toLowerCase()))
          .map((s) => ({ name: s.trim(), proficiency: 'intermediate' as const }));
        if (newSkills.length > 0) {
          updated.skills = [...(updated.skills || []), ...newSkills];
          sectionsUpdated.push('skills');
        }
      }

      // Merge experience (add entries not already present by role+company)
      if (parsed.experience && parsed.experience.length > 0) {
        const existingKeys = new Set(
          (updated.experience || []).map((e) =>
            `${e.company.toLowerCase()}|${e.role.toLowerCase()}`
          )
        );
        const newExp = parsed.experience
          .filter((e) => {
            const key = `${e.company.toLowerCase()}|${e.role.toLowerCase()}`;
            return !existingKeys.has(key);
          })
          .map((e) => ({
            id: generateId(),
            company: e.company,
            role: e.role,
            startDate: e.startDate ?? new Date().toISOString().slice(0, 7),
            endDate: e.endDate ?? null,
            current: !e.endDate,
            description: e.description ?? undefined,
            bullets: e.description ? [e.description] : [],
            technologies: [],
          }));
        if (newExp.length > 0) {
          updated.experience = [...(updated.experience || []), ...newExp];
          sectionsUpdated.push('experience');
        }
      }

      // Merge education
      if (parsed.education && parsed.education.length > 0) {
        const existingKeys = new Set(
          (updated.education || []).map((e) =>
            `${e.institution.toLowerCase()}|${e.degree.toLowerCase()}`
          )
        );
        const newEdu = parsed.education
          .filter((e) => {
            const key = `${e.institution.toLowerCase()}|${e.degree.toLowerCase()}`;
            return !existingKeys.has(key);
          })
          .map((e) => ({
            id: generateId(),
            institution: e.institution,
            degree: e.degree,
            field: e.field ?? undefined,
            startDate: e.startDate ?? new Date().toISOString().slice(0, 7),
            endDate: e.endDate ?? null,
            gpa: e.gpa ?? undefined,
          }));
        if (newEdu.length > 0) {
          updated.education = [...(updated.education || []), ...newEdu];
          sectionsUpdated.push('education');
        }
      }

      // Merge certifications
      if (parsed.certifications && parsed.certifications.length > 0) {
        const existingNames = new Set(
          (updated.certifications || []).map((c) => c.name.toLowerCase())
        );
        const newCerts = parsed.certifications
          .filter((c) => !existingNames.has(c.name.toLowerCase()))
          .map((c) => ({
            id: generateId(),
            name: c.name,
            issuer: c.issuer ?? 'Unknown',
            date: c.date ?? new Date().toISOString().slice(0, 10),
            url: undefined,
          }));
        if (newCerts.length > 0) {
          updated.certifications = [...(updated.certifications || []), ...newCerts];
          sectionsUpdated.push('certifications');
        }
      }

      // Add LinkedIn URL to socialLinks if provided and not already present
      if (linkedinUrl) {
        const alreadyLinked = (updated.socialLinks || []).some(
          (l) => l.platform.toLowerCase() === 'linkedin'
        );
        if (!alreadyLinked) {
          updated.socialLinks = [
            ...(updated.socialLinks || []),
            { platform: 'LinkedIn', url: linkedinUrl },
          ];
          sectionsUpdated.push('socialLinks');
        }
      }

      updated.updatedAt = new Date().toISOString();
      return updated;
    });

    logger.info({ userId, sectionsUpdated }, 'LinkedIn import complete');

    return successResponse({
      parsed,
      sectionsUpdated,
      sectionsUpdatedCount: sectionsUpdated.length,
    });
  } catch (error) {
    logger.error({ error }, 'LinkedIn import error');
    return handleError(error);
  }
}
