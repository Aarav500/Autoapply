import { NextRequest, NextResponse } from 'next/server';

// ============================================
// SERVER-SIDE AI GENERATION API
// This route forwards requests to AI providers using server-side keys
// ============================================

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// Get API keys from environment
const getClaudeKey = () => process.env.CLAUDE_API_KEY || process.env.NEXT_PUBLIC_CLAUDE_API_KEY || '';
const getGeminiKey = () => process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
const getOpenAIKey = () => process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY || '';

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
            model: 'claude-opus-4-5-20251101',
            max_tokens: 8192,
            temperature: 0.3,
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
            max_tokens: 8192,
            temperature: 0.3,
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
        const body = await request.json();
        const { provider, systemPrompt, userMessage, apiKey: clientApiKey } = body;

        // Use server-side keys if available, otherwise fallback to client key
        let activeKey = '';
        let activeProvider = provider || 'claude';

        if (activeProvider === 'claude') activeKey = getClaudeKey() || clientApiKey;
        else if (activeProvider === 'gemini') activeKey = getGeminiKey() || clientApiKey;
        else if (activeProvider === 'openai') activeKey = getOpenAIKey() || clientApiKey;

        if (!activeKey) {
            return NextResponse.json({
                error: 'No API key configured',
                message: `Please configure ${activeProvider.toUpperCase()}_API_KEY or provide one in the request.`
            }, { status: 401 });
        }

        let text = '';
        if (activeProvider === 'claude') {
            text = await callClaude(activeKey, systemPrompt, userMessage);
        } else if (activeProvider === 'gemini') {
            text = await callGemini(activeKey, systemPrompt, userMessage);
        } else if (activeProvider === 'openai') {
            text = await callOpenAI(activeKey, systemPrompt, userMessage);
        } else {
            throw new Error(`Unsupported provider: ${activeProvider}`);
        }

        return NextResponse.json({ text, provider: activeProvider });
    } catch (error) {
        console.error('AI Route Error:', error);
        return NextResponse.json({
            error: 'AI Generation Failed',
            message: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

// GET endpoint to check which providers have environment keys
export async function GET() {
    const providers = {
        claude: !!getClaudeKey(),
        gemini: !!getGeminiKey(),
        openai: !!getOpenAIKey(),
    };

    return NextResponse.json({
        available: Object.values(providers).some(v => v),
        providers
    });
}
