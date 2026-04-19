import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticate, handleError, successResponse } from '@/lib/api-utils';
import { aiClient } from '@/lib/ai-client';
import { logger } from '@/lib/logger';

const RequestSchema = z.object({
  currentCity: z.string().min(1),
  targetCity: z.string().min(1),
  currentSalary: z.number().positive(),
  currency: z.string().default('USD'),
  jobTitle: z.string().optional(),
});

const ResultSchema = z.object({
  adjustedSalary: z.number(),
  adjustmentPercent: z.number(),
  costOfLivingIndex: z.object({ current: z.number(), target: z.number() }),
  breakdown: z.object({
    housing: z.object({ current: z.number(), target: z.number(), diff: z.number() }),
    food: z.object({ current: z.number(), target: z.number(), diff: z.number() }),
    transport: z.object({ current: z.number(), target: z.number(), diff: z.number() }),
    utilities: z.object({ current: z.number(), target: z.number(), diff: z.number() }),
    tax: z.object({ current: z.number(), target: z.number(), diff: z.number() }),
  }),
  purchasingPower: z.string(),
  recommendation: z.string(),
  negotiationTip: z.string(),
  topEmployers: z.array(z.string()),
  averageSalaryRange: z.object({ min: z.number(), max: z.number() }),
});

export async function POST(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);
    const body = await req.json() as Record<string, unknown>;
    const parsed = RequestSchema.safeParse(body);
    if (!parsed.success) return handleError(new Error(parsed.error.message));

    const { currentCity, targetCity, currentSalary, currency, jobTitle } = parsed.data;

    const { system, user } = {
      system: `You are a relocation and compensation expert with deep knowledge of global cost-of-living data.
Provide accurate, data-driven salary adjustment calculations. Return a JSON object matching the schema.`,
      user: `Current location: ${currentCity}
Target location: ${targetCity}
Current salary: ${currency} ${currentSalary.toLocaleString()}${jobTitle ? `\nJob title: ${jobTitle}` : ''}

Calculate:
1. Cost-of-living adjusted salary needed in ${targetCity} to maintain equivalent purchasing power
2. Detailed breakdown (housing, food, transport, utilities, taxes) with estimated monthly costs
3. COL index for both cities (US avg = 100)
4. Purchasing power summary
5. Negotiation tip for asking for a raise if moving to a higher COL city
6. Top employers in ${targetCity} for ${jobTitle ?? 'tech roles'}
7. Average salary range for ${jobTitle ?? 'software engineer'} in ${targetCity}

Use realistic, current data. Round salaries to nearest $1000.`,
    };

    const result = await aiClient.completeJSON(system, user, ResultSchema, { model: 'balanced' });

    logger.info({ userId, currentCity, targetCity }, 'Relocation calculation done');
    return successResponse({ ...result, currentCity, targetCity, currentSalary, currency });
  } catch (error) {
    return handleError(error);
  }
}
