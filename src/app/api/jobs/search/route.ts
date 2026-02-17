import { NextRequest } from 'next/server';
import { apiResponse, apiError, authenticate, handleError, errorResponse } from '@/lib/api-utils';
import { searchEngine } from '@/services/jobs/search-engine';
import { AuthError } from '@/lib/errors';
import { z } from 'zod';

const SearchQuerySchema = z.object({
  keywords: z.array(z.string()).optional(),
  location: z.string().optional(),
  remote: z.boolean().optional(),
  minSalary: z.number().optional(),
  maxSalary: z.number().optional(),
  jobTypes: z
    .array(z.enum(['full-time', 'part-time', 'contract', 'internship']))
    .optional(),
  excludeCompanies: z.array(z.string()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    // Authenticate
    const { userId } = await authenticate(req);

    // Parse and validate request body
    const body = await req.json();
    const validation = SearchQuerySchema.safeParse(body);

    if (!validation.success) {
      return errorResponse('Invalid search query', 400, 'VALIDATION_ERROR');
    }

    const query = validation.data;

    // Execute search
    const result = await searchEngine.searchJobs(userId, query);

    return apiResponse(result);
  } catch (error) {
    if (error instanceof AuthError) {
      return apiError(error, 401);
    }
    return handleError(error);
  }
}
