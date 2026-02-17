import { NextRequest } from 'next/server';
import { z } from 'zod';
import { successResponse, errorResponse, authenticate } from '@/lib/api-utils';
import { searchEngine } from '@/services/jobs/search-engine';

const searchSchema = z.object({
  keywords: z.array(z.string()).optional(),
  location: z.string().optional(),
  remote: z.boolean().optional(),
  minSalary: z.number().optional(),
  maxSalary: z.number().optional(),
  jobTypes: z.array(z.enum(['full-time', 'part-time', 'contract', 'internship'])).optional(),
  excludeCompanies: z.array(z.string()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);
    const body = await req.json();
    const query = searchSchema.parse(body);

    // Trigger immediate job search for the authenticated user
    const results = await searchEngine.searchJobs(userId, query);

    return successResponse({
      message: 'Job search completed',
      newJobs: results.newJobs,
      totalJobs: results.jobs.length,
      jobs: results.jobs.slice(0, 10), // Return top 10 jobs
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Invalid request body', 400);
    }

    return errorResponse(
      error instanceof Error ? error.message : 'Failed to trigger job search',
      500
    );
  }
}
