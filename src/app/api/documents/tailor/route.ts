import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticate, successResponse, errorResponse, handleError } from '@/lib/api-utils';
import { storage } from '@/lib/storage';
import { aiClient } from '@/lib/ai-client';
import type { Job } from '@/types/job';
import type { Profile } from '@/types/profile';
import { z as zod } from 'zod';

const TailorSchema = z.object({
  jobId: z.string().min(1),
  type: z.enum(['cv', 'cover-letter']),
  tone: z.enum(['professional', 'enthusiastic', 'concise']).default('professional'),
});

const TailoredResultSchema = zod.object({
  tailoredContent: zod.string(),
  keywordsAdded: zod.array(zod.string()),
  sectionsModified: zod.array(zod.string()),
  atsScoreEstimate: zod.number(),
  summary: zod.string(),
});

// POST /api/documents/tailor
export async function POST(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);
    const body: unknown = await req.json();
    const parsed = TailorSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(`Invalid: ${parsed.error.issues.map((e) => e.message).join(', ')}`, 400);
    }
    const { jobId, type, tone } = parsed.data;

    // Load job
    const raw = await storage.getJSON<Job[] | { jobs: Job[] }>(`users/${userId}/jobs/index.json`);
    const jobs: Job[] = Array.isArray(raw) ? raw : (raw as { jobs: Job[] })?.jobs ?? [];
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return errorResponse('Job not found', 404);

    // Load profile
    const profile = await storage.getJSON<Profile>(`users/${userId}/profile.json`);
    if (!profile) return errorResponse('Profile not found — complete your profile first', 400);

    const profileSummary = [
      `Name: ${profile.name ?? 'Unknown'}`,
      `Headline: ${profile.headline ?? ''}`,
      `Skills: ${(profile.skills ?? []).map((s) => s.name).join(', ')}`,
      `Experience: ${(profile.experience ?? []).slice(0, 3).map((e) => `${(e as Record<string, unknown>)['role']} at ${(e as Record<string, unknown>)['company']}`).join('; ')}`,
      `Education: ${(profile.education ?? []).slice(0, 2).map((e) => `${(e as Record<string, unknown>)['degree']} from ${(e as Record<string, unknown>)['institution']}`).join('; ')}`,
      `Summary: ${profile.summary ?? ''}`,
    ].join('\n');

    const jobDescription = `${job.title} at ${job.company}\n${job.description ?? ''}\nTags: ${(job.tags ?? []).join(', ')}`;

    const systemPrompt = type === 'cv'
      ? `You are an expert CV writer and ATS optimization specialist. Your task is to tailor a candidate's CV profile to a specific job posting by emphasizing relevant experience, reordering skills, and inserting job-specific keywords naturally.

Return a JSON object with:
- "tailoredContent": the tailored CV summary/profile section (2-3 paragraphs, ${tone} tone)
- "keywordsAdded": array of keywords from the job description naturally woven in
- "sectionsModified": array of section names you improved (e.g., ["Summary", "Skills", "Experience"])
- "atsScoreEstimate": estimated ATS match score 0-100 after tailoring
- "summary": one-sentence explanation of main changes made`
      : `You are an expert cover letter writer. Your task is to write a tailored cover letter for the specific job, highlighting the candidate's most relevant experience and matching their skills to the job requirements.

Return a JSON object with:
- "tailoredContent": the full tailored cover letter (3 paragraphs, ${tone} tone, 250-350 words)
- "keywordsAdded": array of keywords from the job description naturally used
- "sectionsModified": ["Opening", "Body", "Closing"]
- "atsScoreEstimate": estimated ATS keyword match score 0-100
- "summary": one-sentence explanation of the angle taken`;

    const userPrompt = `CANDIDATE PROFILE:\n${profileSummary}\n\nJOB POSTING:\n${jobDescription}\n\nTone: ${tone}\n\nTailor the ${type === 'cv' ? 'CV' : 'cover letter'} for maximum relevance to this role.`;

    const result = await aiClient.completeJSON(systemPrompt, userPrompt, TailoredResultSchema, { model: 'balanced' });

    // Store tailored content for future reference
    const tailorKey = `users/${userId}/documents/tailored/${jobId}-${type}.json`;
    await storage.putJSON(tailorKey, {
      jobId,
      jobTitle: job.title,
      company: job.company,
      type,
      tone,
      ...result,
      createdAt: new Date().toISOString(),
    });

    return successResponse(result);
  } catch (error) {
    return handleError(error);
  }
}
