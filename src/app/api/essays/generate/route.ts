'use server';

import { NextRequest, NextResponse } from 'next/server';

// ============================================
// SERVER-SIDE ESSAY GENERATION API
// Uses environment variables (GitHub secrets) for AI keys
// ============================================

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// Get API keys from environment (runtime - works with GitHub secrets)
const getClaudeKey = () => process.env.CLAUDE_API_KEY || process.env.NEXT_PUBLIC_CLAUDE_API_KEY || '';
const getGeminiKey = () => process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
const getOpenAIKey = () => process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY || '';

interface EssayRequest {
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
    achievements?: string;
    wordLimit: number;
    tone?: string;
}

// Call Claude API
async function callClaude(apiKey: string, systemPrompt: string, userMessage: string): Promise<string> {
    const response = await fetch(CLAUDE_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model: 'claude-opus-4-20250514',
            max_tokens: 2000,
            system: systemPrompt,
            messages: [{ role: 'user', content: userMessage }],
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Claude API error: ${error}`);
    }

    const data = await response.json();
    return data.content[0].text;
}

// Call Gemini API
async function callGemini(apiKey: string, systemPrompt: string, userMessage: string): Promise<string> {
    const response = await fetch(`${GEMINI_API_URL}/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ parts: [{ text: userMessage }] }],
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Gemini API error: ${error}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}

// Call OpenAI API
async function callOpenAI(apiKey: string, systemPrompt: string, userMessage: string): Promise<string> {
    const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage },
            ],
            max_tokens: 2000,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

export async function POST(request: NextRequest) {
    try {
        const body: EssayRequest = await request.json();
        const { prompt, college, activities, achievements, wordLimit, tone } = body;

        // Try Claude first, then Gemini, then OpenAI
        const claudeKey = getClaudeKey();
        const geminiKey = getGeminiKey();
        const openaiKey = getOpenAIKey();

        let provider = '';
        let apiKey = '';

        if (claudeKey) {
            provider = 'claude';
            apiKey = claudeKey;
        } else if (geminiKey) {
            provider = 'gemini';
            apiKey = geminiKey;
        } else if (openaiKey) {
            provider = 'openai';
            apiKey = openaiKey;
        } else {
            console.log('No AI API key found. Available env vars:',
                Object.keys(process.env).filter(k => k.includes('API') || k.includes('CLAUDE') || k.includes('GEMINI') || k.includes('OPENAI')));
            return NextResponse.json({
                error: 'No AI API key configured',
                message: 'Please add CLAUDE_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY to your environment variables or GitHub secrets'
            }, { status: 500 });
        }

        console.log(`📝 Generating essay using ${provider} for ${college.name}`);

        // Build activities context
        const activitiesContext = activities.map((a, i) =>
            `Activity ${i + 1}: ${a.name}\n- Description: ${a.description}\n- Impact: ${a.impact}`
        ).join('\n\n');

        // Build system prompt
        const systemPrompt = `You are an expert college essay writer helping a student craft a compelling transfer application essay.

WRITING STYLE:
- Write in first person with a genuine, authentic voice
- Use specific, concrete examples - not generic statements
- Show personal growth and self-reflection
- Avoid clichés and AI-sounding phrases
- Be confident but not arrogant
- Connect experiences to future goals at this specific college

BANNED PHRASES (never use these):
- "Ever since I was young"
- "My passion for..."
- "I've always wanted to..."
- "This experience taught me..."
- "pushed me out of my comfort zone"
- "diverse perspectives"
- "making a difference"
- "giving back to the community"

TARGET COLLEGE: ${college.name}
Values: ${college.values.join(', ')}
What they look for: ${college.whatTheyLookFor.join(', ')}
Culture: ${college.culture}
Notable programs: ${college.notablePrograms.join(', ')}

TONE: ${tone || 'confident and reflective'}
WORD LIMIT: ${wordLimit} words (MUST stay within this limit)`;

        const userMessage = `ESSAY PROMPT:
${prompt}

${achievements ? `STUDENT ACHIEVEMENTS:\n${achievements}\n` : ''}

STUDENT'S ACTIVITIES AND EXPERIENCES:
${activitiesContext}

Write a complete essay that:
1. Opens with a compelling hook (specific moment/scene)
2. Weaves in the student's actual activities naturally
3. Connects to ${college.name}'s specific values and programs
4. Stays UNDER ${wordLimit} words
5. Ends with a clear connection to future at ${college.name}

Write the essay now:`;

        // Call the AI
        let essay: string;
        if (provider === 'claude') {
            essay = await callClaude(apiKey, systemPrompt, userMessage);
        } else if (provider === 'gemini') {
            essay = await callGemini(apiKey, systemPrompt, userMessage);
        } else {
            essay = await callOpenAI(apiKey, systemPrompt, userMessage);
        }

        console.log(`✅ Generated essay (${essay.split(/\s+/).length} words) using ${provider}`);

        return NextResponse.json({
            essay,
            provider,
            wordCount: essay.split(/\s+/).length,
        });

    } catch (error) {
        console.error('Essay generation error:', error);
        return NextResponse.json({
            error: 'Failed to generate essay',
            message: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
    }
}

// GET endpoint to check which providers are available
export async function GET() {
    const providers: string[] = [];

    if (getClaudeKey()) providers.push('claude');
    if (getGeminiKey()) providers.push('gemini');
    if (getOpenAIKey()) providers.push('openai');

    return NextResponse.json({
        hasKey: providers.length > 0,
        providers,
        preferred: providers[0] || null,
    });
}
