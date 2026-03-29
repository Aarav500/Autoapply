import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticate, successResponse, handleError } from '@/lib/api-utils';
import { aiClient } from '@/lib/ai-client';
import { linkedinOptimizerPrompt } from '@/prompts/linkedin-optimizer';
import { storage } from '@/lib/storage';

const analyzeSchema = z.object({
  targetRole: z.string().optional(),
  targetIndustry: z.string().optional(),
});

const sectionSchema = z.object({
  score: z.number().default(0),
  suggestions: z.array(z.string()).default([]),
});

const resultSchema = z.object({
  overall_score: z.number().default(0),
  headline_options: z.array(z.string()).default([]),
  sections: z.object({
    headline: sectionSchema,
    about: sectionSchema,
    experience: sectionSchema,
    skills: sectionSchema,
    recommendations: sectionSchema,
  }),
});

interface ScoreHistoryEntry {
  score: number;
  date: string;
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await authenticate(request);

    const history = await storage.getJSON<ScoreHistoryEntry[]>(
      `users/${userId}/optimize/linkedin-scores.json`
    );

    const historyEntries: ScoreHistoryEntry[] = Array.isArray(history) ? history : [];

    return successResponse({
      history: historyEntries,
      latest: historyEntries.length > 0 ? historyEntries[historyEntries.length - 1] : null,
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await authenticate(request);

    const body = await request.json();
    const { targetRole, targetIndustry } = analyzeSchema.parse(body);

    // Load user profile from S3
    const profileData = await storage.getJSON<Record<string, unknown>>(`users/${userId}/profile.json`);
    if (!profileData) {
      return successResponse({ error: 'Profile not found. Please complete your profile first.' }, 404);
    }

    const experience = (profileData.experience as Array<Record<string, string>>) || [];
    const education = (profileData.education as Array<Record<string, string>>) || [];
    const skills = (profileData.skills as string[]) || [];

    const profileInput = {
      profile: {
        name: (profileData.name as string) || 'Unknown',
        headline: (profileData.title as string) || undefined,
        about: (profileData.summary as string) || undefined,
        experience: experience.map((exp) => ({
          title: exp.title || '',
          company: exp.company || '',
          duration: exp.duration || `${exp.startDate || ''} - ${exp.endDate || 'Present'}`,
          description: exp.description || undefined,
        })),
        education: education.map((edu) => ({
          school: edu.institution || edu.school || '',
          degree: edu.degree || '',
          field: edu.field || undefined,
        })),
        skills,
        connections: (profileData.linkedinConnections as number) || undefined,
      },
      targetRole,
      targetIndustry,
    };

    const prompt = linkedinOptimizerPrompt(profileInput);
    const result = await aiClient.completeJSON(
      prompt.system,
      prompt.user,
      resultSchema,
      { model: 'balanced', maxTokens: 4096 }
    );

    // Save score history
    try {
      const existingRaw = await storage.getJSON<ScoreHistoryEntry[]>(
        `users/${userId}/optimize/linkedin-scores.json`
      );
      const existing: ScoreHistoryEntry[] = Array.isArray(existingRaw) ? existingRaw : [];
      const newEntry: ScoreHistoryEntry = {
        score: result.overall_score,
        date: new Date().toISOString(),
      };
      const updated = [...existing, newEntry].slice(-12);
      await storage.putJSON(`users/${userId}/optimize/linkedin-scores.json`, updated);
    } catch {
      // Non-critical — do not fail the response
    }

    return successResponse({
      analysis: result,
      profileSummary: {
        name: profileInput.profile.name,
        headline: profileInput.profile.headline,
        experienceCount: experience.length,
        skillsCount: skills.length,
        educationCount: education.length,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
