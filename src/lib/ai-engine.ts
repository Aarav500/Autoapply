import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface UserContext {
    resume?: string;
    activities?: string[];
    achievements?: string[];
    previousEssays?: string[];
    personalInfo?: {
        name?: string;
        major?: string;
        school?: string;
        graduationYear?: string;
    };
}

export interface EssayFeedback {
    type: 'strength' | 'improvement' | 'suggestion';
    text: string;
}

export interface EssayResult {
    content: string;
    confidence: number;
    feedback: EssayFeedback[];
}

/**
 * Generate an essay draft using Gemini AI
 */
export async function generateEssayDraft(
    prompt: string,
    wordLimit: number,
    context: UserContext
): Promise<string> {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const systemPrompt = `You are an expert college essay writer helping an international student craft compelling transfer application essays. 

CONTEXT ABOUT THE STUDENT:
${context.resume ? `Resume Summary: ${context.resume}` : ''}
${context.activities ? `Activities: ${context.activities.join('; ')}` : ''}
${context.achievements ? `Achievements: ${context.achievements.join('; ')}` : ''}
${context.personalInfo ? `Personal Info: ${JSON.stringify(context.personalInfo)}` : ''}

ESSAY PROMPT:
${prompt}

REQUIREMENTS:
- Word limit: ${wordLimit} words
- Write in first person
- Be specific and use concrete examples
- Show personal growth and self-reflection
- Connect experiences to future goals
- Maintain an authentic, genuine voice
- Avoid clichés and generic statements

Write a compelling, authentic essay that answers the prompt while highlighting the student's unique experiences and perspectives.`;

    try {
        const result = await model.generateContent(systemPrompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error('Error generating essay:', error);
        throw new Error('Failed to generate essay');
    }
}

/**
 * Review an essay and provide feedback
 */
export async function reviewEssay(
    essay: string,
    prompt: string,
    wordLimit: number
): Promise<EssayFeedback[]> {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const reviewPrompt = `You are an expert college admissions counselor reviewing a transfer application essay.

ESSAY PROMPT: ${prompt}
WORD LIMIT: ${wordLimit}

ESSAY:
${essay}

Please analyze this essay and provide feedback in the following JSON format:
[
  { "type": "strength", "text": "feedback about a strength" },
  { "type": "improvement", "text": "feedback about an area to improve" },
  { "type": "suggestion", "text": "a specific suggestion for enhancement" }
]

Provide:
- 2-3 strengths
- 2-3 areas for improvement
- 1-2 specific suggestions

Focus on:
- Alignment with prompt
- Authenticity and voice
- Specific examples and details
- Structure and flow
- Grammar and clarity

Return ONLY the JSON array, no other text.`;

    try {
        const result = await model.generateContent(reviewPrompt);
        const response = await result.response;
        const text = response.text();

        // Parse the JSON response
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return [];
    } catch (error) {
        console.error('Error reviewing essay:', error);
        throw new Error('Failed to review essay');
    }
}

/**
 * Calculate confidence score for an essay
 */
export async function calculateConfidence(
    essay: string,
    prompt: string,
    wordLimit: number
): Promise<number> {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const confidencePrompt = `You are an expert college admissions evaluator. Rate this essay on a scale of 0-100.

PROMPT: ${prompt}
WORD LIMIT: ${wordLimit}

ESSAY:
${essay}

Consider:
- Prompt alignment (20%)
- Authenticity/Voice (20%)
- Specific examples (20%)
- Structure/Flow (20%)
- Grammar/Clarity (20%)

Return ONLY a number between 0 and 100.`;

    try {
        const result = await model.generateContent(confidencePrompt);
        const response = await result.response;
        const score = parseInt(response.text().trim());
        return isNaN(score) ? 50 : Math.min(100, Math.max(0, score));
    } catch (error) {
        console.error('Error calculating confidence:', error);
        return 50; // Default score on error
    }
}

/**
 * Apply feedback to improve an essay
 */
export async function applyFeedback(
    essay: string,
    feedback: EssayFeedback[],
    prompt: string,
    wordLimit: number
): Promise<string> {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const improvementPrompt = `You are an expert essay editor. Improve this essay based on the feedback provided.

ORIGINAL ESSAY:
${essay}

PROMPT: ${prompt}
WORD LIMIT: ${wordLimit}

FEEDBACK TO APPLY:
${feedback.map((f, i) => `${i + 1}. [${f.type}] ${f.text}`).join('\n')}

Rewrite the essay incorporating the feedback while:
- Maintaining the original voice and authenticity
- Staying within the word limit
- Preserving the core message and structure
- Improving clarity and impact

Return ONLY the improved essay, no other text.`;

    try {
        const result = await model.generateContent(improvementPrompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error('Error applying feedback:', error);
        throw new Error('Failed to apply feedback');
    }
}

/**
 * Iteratively improve an essay until target confidence is reached
 */
export async function* iterativeImprove(
    essay: string,
    prompt: string,
    wordLimit: number,
    targetConfidence: number = 90,
    maxIterations: number = 5
): AsyncGenerator<EssayResult> {
    let currentEssay = essay;
    let iteration = 0;

    while (iteration < maxIterations) {
        // Calculate current confidence
        const confidence = await calculateConfidence(currentEssay, prompt, wordLimit);

        // Get feedback
        const feedback = await reviewEssay(currentEssay, prompt, wordLimit);

        // Yield current state
        yield { content: currentEssay, confidence, feedback };

        // Check if target reached
        if (confidence >= targetConfidence) {
            break;
        }

        // Apply feedback for next iteration
        const improvements = feedback.filter(f => f.type !== 'strength');
        if (improvements.length === 0) {
            break; // No more improvements to make
        }

        currentEssay = await applyFeedback(currentEssay, improvements, prompt, wordLimit);
        iteration++;
    }
}

/**
 * Generate an email draft
 */
export async function generateEmail(
    template: string,
    context: {
        recipient?: string;
        company?: string;
        position?: string;
        college?: string;
        purpose?: string;
    },
    userContext: UserContext
): Promise<{ subject: string; body: string }> {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const emailPrompt = `You are helping an international student write a professional email.

TEMPLATE TYPE: ${template}
CONTEXT:
${JSON.stringify(context, null, 2)}

USER INFO:
${userContext.personalInfo ? JSON.stringify(userContext.personalInfo) : 'Not provided'}

Write a professional, polite email that is:
- Concise but comprehensive
- Properly formatted with greeting and closing
- Professional yet personable
- Specific to the context provided

Return JSON in this format:
{
  "subject": "email subject line",
  "body": "full email body"
}

Return ONLY the JSON, no other text.`;

    try {
        const result = await model.generateContent(emailPrompt);
        const response = await result.response;
        const text = response.text();
        const json = JSON.parse(text);
        return json;
    } catch (error) {
        console.error('Error generating email:', error);
        throw new Error('Failed to generate email');
    }
}

/**
 * Match job requirements to resume
 */
export async function calculateJobMatch(
    jobDescription: string,
    resumeContent: string,
    skills: string[]
): Promise<{ score: number; reasons: string[] }> {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const matchPrompt = `Analyze how well this candidate matches the job requirements.

JOB DESCRIPTION:
${jobDescription}

CANDIDATE RESUME:
${resumeContent}

SKILLS:
${skills.join(', ')}

Provide a match analysis in this JSON format:
{
  "score": 85,
  "reasons": [
    "Reason 1 why they match",
    "Reason 2 why they match",
    "Reason 3 why they match"
  ]
}

Score should be 0-100 based on:
- Skills alignment
- Experience relevance
- Education fit
- Keyword matches

Return ONLY the JSON, no other text.`;

    try {
        const result = await model.generateContent(matchPrompt);
        const response = await result.response;
        const json = JSON.parse(response.text());
        return json;
    } catch (error) {
        console.error('Error calculating job match:', error);
        return { score: 50, reasons: ['Unable to analyze match'] };
    }
}
