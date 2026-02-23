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

const resultSchema = z.object({
  overall_score: z.number(),
  headline_options: z.array(z.string()),
  sections: z.object({
    headline: z.object({
      score: z.number(),
      suggestions: z.array(z.string()),
    }),
    about: z.object({
      score: z.number(),
      suggestions: z.array(z.string()),
    }),
    experience: z.object({
      score: z.number(),
      suggestions: z.array(z.string()),
    }),
    skills: z.object({
      score: z.number(),
      suggestions: z.array(z.string()),
    }),
    recommendations: z.object({
      score: z.number(),
      suggestions: z.array(z.string()),
    }),
  }),
});

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
