import { aiClient } from '@/lib/ai-client';
import { logger } from '@/lib/logger';
import type { FormAnalysis } from '@/types/application';
import type { Profile } from '@/types/profile';
import { formAnalysisSchema } from '@/types/application';

/**
 * Analyze job application form and generate field mappings
 */
export async function analyzeFormAndFill(
  pageHTML: string,
  profile: Profile,
  job: { title: string; company: string; description: string }
): Promise<FormAnalysis> {
  try {
    const ai = aiClient;

    // Prepare profile summary for AI
    const linkedinLink = profile.socialLinks?.find(link => link.platform === 'linkedin')?.url || '';
    const githubLink = profile.socialLinks?.find(link => link.platform === 'github')?.url || '';
    const websiteLink = profile.socialLinks?.find(link => link.platform === 'website')?.url || '';

    const profileSummary = {
      name: profile.name,
      email: profile.email,
      phone: profile.phone || '',
      location: profile.location || '',
      linkedin: linkedinLink,
      github: githubLink,
      website: websiteLink,
      headline: profile.headline || '',
      summary: profile.summary || '',
      skills: profile.skills || [],
      experience: (profile.experience || []).map(exp => ({
        title: exp.role,
        company: exp.company,
        duration: `${exp.startDate} - ${exp.endDate || 'Present'}`,
        description: exp.description,
      })),
      education: (profile.education || []).map(edu => ({
        degree: edu.degree,
        school: edu.institution,
        year: edu.endDate,
      })),
      yearsOfExperience: calculateYearsOfExperience(profile),
      currentTitle: profile.experience?.[0]?.role || '',
      currentCompany: profile.experience?.[0]?.company || '',
    };

    const systemPrompt = `You are analyzing a job application form. Given the HTML and a candidate's profile, identify all form fields and map them to the correct profile data.

For standard fields (name, email, phone, etc.), map them to profile values.
For custom questions (like "Why do you want to work here?" or "Tell us about yourself"), generate thoughtful, specific answers based on the job and profile.

Return a JSON object with this structure:
{
  "fields": [
    {
      "selector": "CSS selector (prefer id, then name, then more specific selectors)",
      "type": "text|email|tel|number|select|textarea|file|checkbox|radio",
      "value": "the value to fill in",
      "confidence": 0.0-1.0,
      "label": "field label if identifiable"
    }
  ],
  "customAnswers": [
    {
      "selector": "CSS selector for textarea or text input",
      "question": "the question being asked",
      "answer": "thoughtful, specific answer (2-4 sentences, no generic fluff)",
      "confidence": 0.0-1.0
    }
  ],
  "requiresManualReview": false,
  "missingRequiredData": ["list of any required data not in profile"],
  "warnings": ["any concerns or ambiguities"]
}

IMPORTANT:
- For selectors, prefer: #id > [name="x"] > more specific CSS
- For select/dropdown fields, provide the exact option text to select
- For file inputs, just note type="file" - file upload is handled separately
- For "years of experience" questions, calculate from work history
- For salary questions, you can leave blank or use "Competitive" if no data available
- For cover letter / "why this company" questions, mention specific things about the company and role
- Confidence below 0.7 means the field might need manual review
- Set requiresManualReview=true if critical fields are ambiguous or missing data`;

    const userPrompt = `Job Application Form Analysis

JOB DETAILS:
Title: ${job.title}
Company: ${job.company}
Description: ${job.description.slice(0, 500)}...

CANDIDATE PROFILE:
${JSON.stringify(profileSummary, null, 2)}

FORM HTML (truncated):
${pageHTML}

Analyze the form and provide field mappings.`;

    const result = await ai.completeJSON<FormAnalysis>(
      systemPrompt,
      userPrompt,
      formAnalysisSchema,
      { model: 'balanced' }
    );

    logger.info({
      fieldsCount: result.fields.length,
      customAnswersCount: result.customAnswers.length,
      requiresManualReview: result.requiresManualReview,
    }, 'Form analysis completed');

    return result;
  } catch (error) {
    logger.error({ error }, 'Form analysis failed');

    // Return empty analysis on failure
    return {
      fields: [],
      customAnswers: [],
      requiresManualReview: true,
      warnings: ['AI form analysis failed - manual application required'],
    };
  }
}

/**
 * Calculate years of experience from work history
 */
function calculateYearsOfExperience(profile: Profile): number {
  if (!profile.experience || profile.experience.length === 0) {
    return 0;
  }

  let totalMonths = 0;

  for (const exp of profile.experience) {
    const startDate = new Date(exp.startDate);
    const endDate = exp.endDate ? new Date(exp.endDate) : new Date();

    if (isNaN(startDate.getTime())) continue;

    const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 +
                   (endDate.getMonth() - startDate.getMonth());

    totalMonths += Math.max(0, months);
  }

  return Math.round(totalMonths / 12);
}

/**
 * Generate custom answer for a specific question using AI
 */
export async function generateCustomAnswer(
  question: string,
  profile: Profile,
  job: { title: string; company: string; description: string }
): Promise<string> {
  try {
    const ai = aiClient;

    const systemPrompt = `You are helping a job candidate answer application questions. Generate thoughtful, specific answers that highlight relevant experience and genuine interest.

Rules:
- Be specific and concrete, not generic
- Reference actual experience from the candidate's background
- Show genuine interest in the company/role
- Keep answers concise (2-4 sentences for short answers, 1-2 paragraphs for essays)
- Avoid clichés like "I'm passionate about..." or "I'm a team player"
- Focus on value the candidate can bring`;

    const userPrompt = `Question: ${question}

Job: ${job.title} at ${job.company}
Job Description: ${job.description.slice(0, 300)}...

Candidate Background:
- Current Role: ${profile.experience?.[0]?.role || 'N/A'} at ${profile.experience?.[0]?.company || 'N/A'}
- Summary: ${profile.summary || 'N/A'}
- Key Skills: ${profile.skills?.slice(0, 10).map(s => s.name).join(', ') || 'N/A'}
- Notable Experience: ${profile.experience?.slice(0, 2).map(e => `${e.role} at ${e.company}`).join(', ') || 'N/A'}

Generate a strong answer to this question.`;

    const answer = await ai.complete(systemPrompt, userPrompt, { model: 'balanced' });

    return answer.trim();
  } catch (error) {
    logger.error({ error, question }, 'Failed to generate custom answer');
    return '';
  }
}
