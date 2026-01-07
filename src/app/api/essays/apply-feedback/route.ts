'use server';

import { NextRequest, NextResponse } from 'next/server';

// ============================================
// APPLY FEEDBACK API
// Applies specific feedback to an essay with minimal changes
// Preserves the original voice and structure
// ============================================

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

const getClaudeKey = () => process.env.CLAUDE_API_KEY || process.env.NEXT_PUBLIC_CLAUDE_API_KEY || '';
const getGeminiKey = () => process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';

interface ApplyFeedbackRequest {
    essay: string;
    feedback: string[];
    oneThingToFix?: string;
    college: {
        name: string;
        fullName: string;
    };
    wordLimit: number;
}

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

export async function POST(request: NextRequest) {
    try {
        const body: ApplyFeedbackRequest = await request.json();
        const { essay, feedback, oneThingToFix, college, wordLimit } = body;

        const claudeKey = getClaudeKey();
        const geminiKey = getGeminiKey();

        let provider = '';
        let apiKey = '';

        if (claudeKey) {
            provider = 'claude';
            apiKey = claudeKey;
        } else if (geminiKey) {
            provider = 'gemini';
            apiKey = geminiKey;
        } else {
            return NextResponse.json({
                error: 'No AI API key configured',
                message: 'Please add CLAUDE_API_KEY or GEMINI_API_KEY'
            }, { status: 500 });
        }

        console.log(`🔧 Applying feedback to ${college.name} essay using ${provider}...`);

        // Build system prompt for MINIMAL changes
        const systemPrompt = `You are an expert essay editor. Your ONLY job is to apply specific feedback to an essay.

⚠️ CRITICAL RULES:
1. Make ONLY the changes necessary to address the feedback
2. PRESERVE the student's voice, tone, and writing style
3. KEEP the overall structure intact
4. DO NOT rewrite sentences that don't need fixing
5. Make surgical, targeted edits - not a full rewrite
6. STAY WITHIN ${wordLimit} words

You are like a careful copy editor, not a ghostwriter. The essay should still sound like the student wrote it.`;

        // Build user message
        const feedbackList = feedback.map((f, i) => `${i + 1}. ${f}`).join('\n');

        const userMessage = `CURRENT ESSAY FOR ${college.fullName}:
---
${essay}
---

FEEDBACK TO APPLY:
${feedbackList}
${oneThingToFix ? `\nPRIORITY FIX: ${oneThingToFix}` : ''}

⚠️ TASK: Apply ONLY the feedback above. Make MINIMAL changes.
- Fix what the feedback identifies
- Keep everything else exactly the same
- Preserve the student's voice
- Stay under ${wordLimit} words

Output ONLY the updated essay, nothing else:`;

        let updatedEssay: string;
        if (provider === 'claude') {
            updatedEssay = await callClaude(apiKey, systemPrompt, userMessage);
        } else {
            updatedEssay = await callGemini(apiKey, systemPrompt, userMessage);
        }

        // Clean up the response (remove any markdown formatting)
        updatedEssay = updatedEssay
            .replace(/^```[\s\S]*?\n/, '')
            .replace(/\n```$/, '')
            .trim();

        const originalWordCount = essay.trim().split(/\s+/).filter(Boolean).length;
        const updatedWordCount = updatedEssay.trim().split(/\s+/).filter(Boolean).length;

        return NextResponse.json({
            success: true,
            updatedEssay,
            originalWordCount,
            updatedWordCount,
            feedbackApplied: feedback.length + (oneThingToFix ? 1 : 0),
            provider,
        });

    } catch (error) {
        console.error('Apply feedback error:', error);
        return NextResponse.json({
            error: 'Failed to apply feedback',
            message: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
