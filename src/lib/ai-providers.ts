// ============================================
// MULTI-MODEL AI ENGINE
// Supports Claude (Anthropic), Gemini (Google), and OpenAI
// ============================================

// Types
export type AIProvider = 'claude' | 'gemini' | 'openai';

export interface AIConfig {
    provider: AIProvider;
    apiKey: string;
    model?: string;
}

export interface EssayGenerationRequest {
    prompt: string;
    college: {
        name: string;
        values: string[];
        whatTheyLookFor: string[];
        culture: string;
        notablePrograms: string[];
    };
    activities: {
        name: string;
        description: string;
        impact: string;
    }[];
    wordLimit: number;
    tone?: 'casual' | 'formal' | 'passionate' | 'confident' | 'reflective';
    previousDraft?: string;
}

export interface EssayReviewRequest {
    essay: string;
    prompt: string;
    college: {
        name: string;
        values: string[];
        whatTheyLookFor: string[];
    };
    wordLimit: number;
}

export interface ReviewFeedback {
    overallScore: number;
    strengths: string[];
    improvements: string[];
    suggestions: string[];
    specificEdits: {
        original: string;
        suggested: string;
        reason: string;
    }[];
}

// ============================================
// CLAUDE API (Best for essays)
// ============================================

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

async function callClaude(
    apiKey: string,
    systemPrompt: string,
    userMessage: string,
    model: string = 'claude-3-5-sonnet-20241022'
): Promise<string> {
    const response = await fetch(CLAUDE_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model,
            max_tokens: 4096,
            system: systemPrompt,
            messages: [{ role: 'user', content: userMessage }],
        }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(`Claude API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.content[0].text;
}

// ============================================
// GEMINI API (Good free tier)
// ============================================

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

async function callGemini(
    apiKey: string,
    systemPrompt: string,
    userMessage: string,
    model: string = 'gemini-1.5-flash'
): Promise<string> {
    const response = await fetch(
        `${GEMINI_API_URL}/${model}:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: `${systemPrompt}\n\n${userMessage}` }] }],
                generationConfig: {
                    maxOutputTokens: 4096,
                    temperature: 0.7,
                },
            }),
        }
    );

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(`Gemini API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}

// ============================================
// OPENAI API
// ============================================

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

async function callOpenAI(
    apiKey: string,
    systemPrompt: string,
    userMessage: string,
    model: string = 'gpt-4o'
): Promise<string> {
    const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage },
            ],
            max_tokens: 4096,
            temperature: 0.7,
        }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

// ============================================
// UNIFIED AI CALLER
// ============================================

export async function callAI(
    config: AIConfig,
    systemPrompt: string,
    userMessage: string
): Promise<string> {
    switch (config.provider) {
        case 'claude':
            return callClaude(config.apiKey, systemPrompt, userMessage, config.model);
        case 'gemini':
            return callGemini(config.apiKey, systemPrompt, userMessage, config.model);
        case 'openai':
            return callOpenAI(config.apiKey, systemPrompt, userMessage, config.model);
        default:
            throw new Error(`Unknown AI provider: ${config.provider}`);
    }
}

// ============================================
// ESSAY GENERATION (Optimized for Claude)
// ============================================

export async function generateEssay(
    config: AIConfig,
    request: EssayGenerationRequest
): Promise<string> {
    const systemPrompt = `You are an expert college admissions essay writer with 20 years of experience helping students get into top universities. You specialize in writing authentic, compelling essays that sound like the student's own voice.

Your essays are known for:
- Authentic, conversational tone (NOT robotic or generic)
- Specific, vivid details and anecdotes
- Clear structure with a compelling hook
- Deep self-reflection and genuine vulnerability
- Connecting personal experiences to future goals
- Subtle integration of the student's achievements without bragging

CRITICAL: Write as if you ARE the student. Use first person. Be genuine and vulnerable. Avoid clichés and generic statements.`;

    const activitiesText = request.activities
        .map(a => `- ${a.name}: ${a.description}. Impact: ${a.impact}`)
        .join('\n');

    const userMessage = `Write a college essay for ${request.college.name}.

ESSAY PROMPT: "${request.prompt}"

WORD LIMIT: ${request.wordLimit} words

COLLEGE VALUES: ${request.college.values.join(', ')}
WHAT THEY LOOK FOR: ${request.college.whatTheyLookFor.join(', ')}
CAMPUS CULTURE: ${request.college.culture}
NOTABLE PROGRAMS: ${request.college.notablePrograms.join(', ')}

MY ACTIVITIES & EXPERIENCES:
${activitiesText}

TONE: ${request.tone || 'authentic and confident'}

${request.previousDraft ? `PREVIOUS DRAFT TO IMPROVE:\n${request.previousDraft}\n\nPlease improve this draft while maintaining my voice.` : ''}

Write an essay that:
1. Has a compelling opening hook (not a quote or dictionary definition)
2. Uses specific anecdotes from my activities
3. Shows my personality and values
4. Connects to ${request.college.name}'s specific programs and culture
5. Ends with a forward-looking conclusion

Start the essay directly - no titles or headers.`;

    return callAI(config, systemPrompt, userMessage);
}

// ============================================
// ESSAY REVIEW
// ============================================

export async function reviewEssay(
    config: AIConfig,
    request: EssayReviewRequest
): Promise<ReviewFeedback> {
    const systemPrompt = `You are an expert college admissions consultant who has read thousands of essays. You provide detailed, constructive feedback that helps students improve their essays.

You must respond in valid JSON format with this exact structure:
{
  "overallScore": <number 1-100>,
  "strengths": ["<strength1>", "<strength2>", ...],
  "improvements": ["<area1>", "<area2>", ...],
  "suggestions": ["<suggestion1>", "<suggestion2>", ...],
  "specificEdits": [
    {
      "original": "<exact text from essay>",
      "suggested": "<improved version>",
      "reason": "<why this is better>"
    }
  ]
}`;

    const userMessage = `Review this college essay for ${request.college.name}.

PROMPT: "${request.prompt}"
WORD LIMIT: ${request.wordLimit} words
COLLEGE VALUES: ${request.college.values.join(', ')}
WHAT THEY LOOK FOR: ${request.college.whatTheyLookFor.join(', ')}

ESSAY:
${request.essay}

Evaluate based on:
1. Hook strength and opening
2. Authenticity and voice
3. Specific details and anecdotes
4. Connection to ${request.college.name}
5. Structure and flow
6. Grammar and word choice
7. Overall memorability

Respond with JSON only.`;

    const response = await callAI(config, systemPrompt, userMessage);

    // Parse JSON response
    try {
        // Extract JSON from response (in case there's extra text)
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON found in response');
        return JSON.parse(jsonMatch[0]);
    } catch (error) {
        console.error('Failed to parse review response:', response);
        // Return a default response if parsing fails
        return {
            overallScore: 70,
            strengths: ['Unable to parse detailed feedback'],
            improvements: ['Please try again'],
            suggestions: ['Retry the review'],
            specificEdits: [],
        };
    }
}

// ============================================
// TONE ADJUSTMENT
// ============================================

export async function adjustTone(
    config: AIConfig,
    essay: string,
    targetTone: 'casual' | 'formal' | 'passionate' | 'confident' | 'reflective',
    intensity: number = 50
): Promise<string> {
    const toneDescriptions = {
        casual: 'conversational, friendly, relatable, uses contractions and informal language',
        formal: 'professional, polished, sophisticated vocabulary, proper sentence structure',
        passionate: 'emotional, enthusiastic, uses vivid language and exclamations',
        confident: 'assertive, bold, uses strong statements and active voice',
        reflective: 'thoughtful, introspective, contemplative, uses questions and observations',
    };

    const systemPrompt = `You are an expert essay editor. Your task is to adjust the tone of essays while maintaining their core message and the student's voice.`;

    const userMessage = `Adjust this essay to be more ${targetTone}.

TARGET TONE: ${toneDescriptions[targetTone]}
INTENSITY: ${intensity}% (0 = subtle change, 100 = dramatic change)

ESSAY:
${essay}

Rewrite the essay with the adjusted tone. Maintain the core story and message. Keep a similar word count.`;

    return callAI(config, systemPrompt, userMessage);
}

// ============================================
// ESSAY RECYCLING / ADAPTATION
// ============================================

export async function recycleEssay(
    config: AIConfig,
    sourceEssay: string,
    originalPrompt: string,
    targetPrompt: string,
    targetCollege: {
        name: string;
        values: string[];
        whatTheyLookFor: string[];
    }
): Promise<string> {
    const systemPrompt = `You are an expert at adapting college essays across different prompts while maintaining authenticity and uniqueness.`;

    const userMessage = `Adapt this essay for a different prompt and college.

ORIGINAL PROMPT: "${originalPrompt}"

ORIGINAL ESSAY:
${sourceEssay}

TARGET PROMPT: "${targetPrompt}"

TARGET COLLEGE: ${targetCollege.name}
THEIR VALUES: ${targetCollege.values.join(', ')}
WHAT THEY LOOK FOR: ${targetCollege.whatTheyLookFor.join(', ')}

Adapt the essay to:
1. Answer the target prompt directly
2. Reference ${targetCollege.name}'s specific values
3. Maintain the student's authentic voice
4. Keep the core story but adjust framing
5. Make it feel like a new essay, not a modified version`;

    return callAI(config, systemPrompt, userMessage);
}

// ============================================
// CONFIGURATION HELPERS
// ============================================

export function getAIConfig(): AIConfig | null {
    if (typeof window === 'undefined') return null;

    // Check for Claude API key first (preferred for essays)
    const claudeKey = process.env.NEXT_PUBLIC_CLAUDE_API_KEY ||
        localStorage.getItem('claude_api_key');
    if (claudeKey) {
        return { provider: 'claude', apiKey: claudeKey };
    }

    // Fall back to Gemini
    const geminiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
        localStorage.getItem('gemini_api_key');
    if (geminiKey) {
        return { provider: 'gemini', apiKey: geminiKey };
    }

    // Fall back to OpenAI
    const openaiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY ||
        localStorage.getItem('openai_api_key');
    if (openaiKey) {
        return { provider: 'openai', apiKey: openaiKey };
    }

    return null;
}

export function setAPIKey(provider: AIProvider, apiKey: string) {
    localStorage.setItem(`${provider}_api_key`, apiKey);
}

export function getAvailableProviders(): AIProvider[] {
    const providers: AIProvider[] = [];

    if (process.env.NEXT_PUBLIC_CLAUDE_API_KEY || localStorage.getItem('claude_api_key')) {
        providers.push('claude');
    }
    if (process.env.NEXT_PUBLIC_GEMINI_API_KEY || localStorage.getItem('gemini_api_key')) {
        providers.push('gemini');
    }
    if (process.env.NEXT_PUBLIC_OPENAI_API_KEY || localStorage.getItem('openai_api_key')) {
        providers.push('openai');
    }

    return providers;
}
