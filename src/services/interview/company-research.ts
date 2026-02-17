/**
 * Company research service for interview preparation
 */

import { aiClient } from '@/lib/ai-client';
import { CompanyResearch, CompanyResearchSchema } from '@/types/interview';
import { AppError } from '@/lib/errors';

/**
 * Compile comprehensive company research for interview preparation
 */
export async function compileCompanyResearch(
  companyName: string,
  role?: string
): Promise<CompanyResearch> {
  try {
    const roleContext = role ? ` for a ${role} interview` : '';

    const systemPrompt = `You are a career coach helping a candidate research ${companyName}${roleContext}.
Compile a comprehensive briefing with specific, actionable information.

IMPORTANT:
- If you don't know something specific about the company, say so rather than making things up
- Focus on publicly available information
- Be specific with examples
- Prioritize recent information (last 1-2 years)
- Include practical interview tips specific to this company's known interview style

For recentNews, only include actual recent events (last 6-12 months) - if you don't know recent news, return an empty array.
For keyPeople, include executives or team members relevant to the role - if unknown, return an empty array.`;

    const userPrompt = `Company: ${companyName}
${role ? `Role: ${role}` : ''}

Generate a research briefing with the following structure:
- overview: 2-3 sentence company description (what they do, size, stage)
- products: Array of main products/services
- culture: 1-2 sentences on company culture/values
- recentNews: Recent company news (funding, product launches, acquisitions) - only real news, empty array if unknown
- competitors: Main competitors
- interviewTips: Specific tips for interviewing at this company (if known)
- keyPeople: Relevant executives/leaders with brief notes
- talkingPoints: Things to mention that show you've researched the company
- questionsToAsk: Thoughtful questions to ask the interviewer

Return valid JSON matching this schema.`;

    const research = await aiClient.completeJSON(
      systemPrompt,
      userPrompt,
      CompanyResearchSchema,
      { model: 'balanced' }
    );

    return research;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to compile company research', 500, 'AI_ERROR');
  }
}
