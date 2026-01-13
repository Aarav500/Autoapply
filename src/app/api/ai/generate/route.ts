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
    console.log('[Claude API] Calling with:', {
        model: 'claude-opus-4-5-20251101',
        maxTokens: 8192,
        temperature: 0.3,
        systemPromptLength: systemPrompt.length,
        userMessageLength: userMessage.length,
        apiKeyPrefix: apiKey.substring(0, 10) + '...'
    });

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
        console.error('[Claude API] Error response:', {
            status: response.status,
            statusText: response.statusText,
            error: error.substring(0, 500)
        });
        throw new Error(`Claude API error (${response.status}): ${error}`);
    }

    const data = await response.json();
    console.log('[Claude API] Success! Generated tokens:', data.usage?.output_tokens || 'unknown');
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

        // Debug logging
        console.log('[AI Generate] Request details:', {
            provider: activeProvider,
            hasClientApiKey: !!clientApiKey,
            clientApiKeyLength: clientApiKey?.length || 0,
            hasEnvClaudeKey: !!process.env.CLAUDE_API_KEY,
            hasEnvPublicClaudeKey: !!process.env.NEXT_PUBLIC_CLAUDE_API_KEY,
            systemPromptLength: systemPrompt?.length || 0,
            userMessageLength: userMessage?.length || 0,
        });

        if (activeProvider === 'claude') activeKey = getClaudeKey() || clientApiKey;
        else if (activeProvider === 'gemini') activeKey = getGeminiKey() || clientApiKey;
        else if (activeProvider === 'openai') activeKey = getOpenAIKey() || clientApiKey;

        console.log('[AI Generate] Final key status:', {
            provider: activeProvider,
            hasActiveKey: !!activeKey,
            activeKeyLength: activeKey?.length || 0,
            activeKeyPrefix: activeKey ? activeKey.substring(0, 10) + '...' : 'none'
        });

        if (!activeKey) {
            console.error('[AI Generate] No API key found!');
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

        console.log('[AI Generate] Success! Response length:', text.length);
        return NextResponse.json({ text, provider: activeProvider });
    } catch (error) {
        console.error('[AI Generate] Fatal error:', {
            name: error instanceof Error ? error.name : 'Unknown',
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined
        });
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
