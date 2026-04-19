import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticate, handleError, successResponse } from '@/lib/api-utils';
import { storage } from '@/lib/storage';
import { aiClient } from '@/lib/ai-client';
import { logger } from '@/lib/logger';

const RequestSchema = z.object({
  jobTitle: z.string().min(1),
  company: z.string().min(1),
  offeredSalary: z.number().positive(),
  targetSalary: z.number().positive(),
  currency: z.string().default('USD'),
  benefits: z.string().optional(),
  yearsExperience: z.number().min(0).default(0),
  competingOffers: z.boolean().optional(),
});

const ScriptSchema = z.object({
  openingStatement: z.string(),
  keyArguments: z.array(z.object({
    point: z.string(),
    script: z.string(),
  })),
  counterOfferScript: z.string(),
  benefitsNegotiation: z.string(),
  closingStatement: z.string(),
  emailTemplate: z.string(),
  doList: z.array(z.string()),
  dontList: z.array(z.string()),
  marketData: z.string(),
  confidenceScore: z.number().min(0).max(100),
});

export async function POST(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);

    const body = await req.json() as Record<string, unknown>;
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) {
      return handleError(new Error(parsed.error.message));
    }

    const { jobTitle, company, offeredSalary, targetSalary, currency, benefits, yearsExperience } = parsed.data;

    const profile = await storage.getJSON<{ name?: string; headline?: string; skills?: Array<{ name: string }> }>(`users/${userId}/profile.json`);

    const increase = Math.round(((targetSalary - offeredSalary) / offeredSalary) * 100);

    const { system, user } = {
      system: `You are an expert salary negotiation coach with deep knowledge of compensation strategies.
Generate a detailed negotiation script tailored to the candidate's situation.
Be specific, confident, and professional. Return a JSON object matching the schema.`,
      user: `Candidate: ${profile?.name ?? 'Candidate'} | ${profile?.headline ?? jobTitle}
Skills: ${profile?.skills?.slice(0, 8).map((s) => s.name).join(', ') ?? 'Not specified'}
Years of experience: ${yearsExperience}

Job: ${jobTitle} at ${company}
Offered: ${currency} ${offeredSalary.toLocaleString()}
Target: ${currency} ${targetSalary.toLocaleString()} (+${increase}%)
Benefits context: ${benefits ?? 'Standard package'}

Generate a complete negotiation script with opening, key arguments, counter-offer script, benefits negotiation, closing, and an email template.
Include market data talking points. Rate the confidence of successfully negotiating 0-100 based on the ${increase}% increase request.`,
    };

    const script = await aiClient.completeJSON(system, user, ScriptSchema, { model: 'balanced' });

    logger.info({ userId, jobTitle, company, increase }, 'Negotiation script generated');

    return successResponse({ script, requestedIncrease: increase });
  } catch (error) {
    logger.error({ error }, 'Negotiate script error');
    return handleError(error);
  }
}
