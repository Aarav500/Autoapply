'use server';

import { NextRequest, NextResponse } from 'next/server';

// ============================================
// ULTIMATE ESSAY API - ITERATIVE PERFECTION
// Runs multiple perfection cycles until 95%+
// with no more actionable feedback
// ============================================

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

const getClaudeKey = () => process.env.CLAUDE_API_KEY || process.env.NEXT_PUBLIC_CLAUDE_API_KEY || '';
const getGeminiKey = () => process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';

interface UltimateEssayRequest {
    essay: string;
    prompt: string;
    college: {
        name: string;
        fullName: string;
        values: string[];
        whatTheyLookFor: string[];
        culture: string;
        notablePrograms: string[];
    };
    wordLimit: number;
    activities?: {
        name: string;
        description: string;
        impact: string;
    }[];
}

async function callAI(apiKey: string, provider: string, systemPrompt: string, userMessage: string): Promise<string> {
    if (provider === 'claude') {
        const response = await fetch(CLAUDE_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: 'claude-opus-4-20250514',
                max_tokens: 3000,
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
    } else {
        const response = await fetch(`${GEMINI_API_URL}/gemini-1.5-pro:generateContent?key=${apiKey}`, {
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
}

async function reviewEssay(
    apiKey: string,
    provider: string,
    essay: string,
    prompt: string,
    college: UltimateEssayRequest['college'],
    wordLimit: number
): Promise<{ score: number; improvements: string[]; oneThingToFix: string | null }> {

    const systemPrompt = `You are a ${college.name} admissions officer. Review this essay and score it 0-100.

SCORING:
- 95-100: EXCELLENT - Ready to submit, no improvements needed
- 90-94: VERY GOOD - One minor tweak at most
- 85-89: GOOD - 2-3 improvements needed
- Below 85: Needs more work

IMPORTANT: Only give 95%+ if the essay is TRULY excellent with nothing to improve.

Return ONLY valid JSON:
{
    "score": <number>,
    "improvements": ["<specific improvement if any>"],
    "oneThingToFix": "<most important fix or null if perfect>"
}`;

    const userMessage = `PROMPT: ${prompt}
WORD LIMIT: ${wordLimit}
ESSAY:
${essay}

Review and return JSON only:`;

    const response = await callAI(apiKey, provider, systemPrompt, userMessage);

    try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                score: parsed.score || 50,
                improvements: parsed.improvements || [],
                oneThingToFix: parsed.oneThingToFix || null
            };
        }
    } catch {
        // Fallback
    }

    return { score: 80, improvements: ['Review parsing failed'], oneThingToFix: null };
}

async function perfectEssay(
    apiKey: string,
    provider: string,
    essay: string,
    prompt: string,
    college: UltimateEssayRequest['college'],
    wordLimit: number,
    feedbackToAddress: string[],
    iteration: number
): Promise<string> {

    const systemPrompt = `You are a legendary essay consultant with 100% admission rate. 
This is iteration ${iteration} of perfection. Your job is to make this essay FLAWLESS.

RULES:
1. Word limit: ${wordLimit} words MAX
2. Address ALL feedback completely
3. Make it sound authentically human (contractions, varied sentences, natural flow)
4. Include specific details about ${college.name} programs
5. The goal is 95%+ score with NO remaining feedback

Output ONLY the perfected essay, nothing else.`;

    const feedbackList = feedbackToAddress.length > 0
        ? `FEEDBACK TO ADDRESS:\n${feedbackToAddress.map((f, i) => `${i + 1}. ${f}`).join('\n')}`
        : 'No specific feedback - just polish to perfection.';

    const userMessage = `PROMPT: ${prompt}

CURRENT ESSAY:
${essay}

${feedbackList}

${college.name} VALUES: ${college.values.join(', ')}
${college.name} LOOKS FOR: ${college.whatTheyLookFor.join(', ')}
PROGRAMS: ${college.notablePrograms.slice(0, 3).join(', ')}

Write the PERFECT version that will score 95%+:`;

    const perfected = await callAI(apiKey, provider, systemPrompt, userMessage);

    // Clean up
    return perfected
        .replace(/^```[\s\S]*?\n/, '')
        .replace(/\n```$/, '')
        .replace(/^["']|["']$/g, '')
        .trim();
}

function trimToWordLimit(essay: string, limit: number): string {
    const words = essay.split(/\s+/).filter(w => w.length > 0);
    if (words.length <= limit) return essay;

    const trimmed = words.slice(0, limit).join(' ');
    const lastPeriod = trimmed.lastIndexOf('.');
    if (lastPeriod > trimmed.length - 80) {
        return trimmed.slice(0, lastPeriod + 1);
    }
    return trimmed;
}

export async function POST(request: NextRequest) {
    try {
        const body: UltimateEssayRequest = await request.json();
        const { essay, prompt, college, wordLimit, activities } = body;

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
                error: 'No AI API key configured'
            }, { status: 500 });
        }

        console.log(`🏆 Starting ULTIMATE essay perfection for ${college.name}...`);

        let currentEssay = essay;
        let currentScore = 0;
        let iterations = 0;
        const maxIterations = 3; // Prevent infinite loops
        const logs: string[] = [];

        // ITERATIVE PERFECTION LOOP
        while (iterations < maxIterations) {
            iterations++;
            logs.push(`\n--- Iteration ${iterations} ---`);

            // Step 1: Perfect the essay
            const review = await reviewEssay(apiKey, provider, currentEssay, prompt, college, wordLimit);
            currentScore = review.score;
            logs.push(`Review score: ${currentScore}%`);
            logs.push(`Improvements: ${review.improvements.length > 0 ? review.improvements.join('; ') : 'None'}`);

            // If we've reached 95%+ with no improvements, we're done!
            if (currentScore >= 95 && review.improvements.length === 0) {
                logs.push(`✅ PERFECT! Score ${currentScore}% with no improvements needed.`);
                break;
            }

            // If score is 95%+ but still has minor improvements, we're good
            if (currentScore >= 95) {
                logs.push(`✅ Excellent! Score ${currentScore}% - good enough to submit.`);
                break;
            }

            // Step 2: Collect feedback to address
            const feedbackToAddress: string[] = [];
            if (review.oneThingToFix) {
                feedbackToAddress.push(review.oneThingToFix);
            }
            feedbackToAddress.push(...review.improvements);

            if (feedbackToAddress.length === 0) {
                logs.push(`No actionable feedback but score is ${currentScore}%. Doing final polish...`);
                feedbackToAddress.push('Polish the essay to be more compelling and memorable');
            }

            // Step 3: Perfect with feedback
            logs.push(`Applying ${feedbackToAddress.length} improvements...`);
            currentEssay = await perfectEssay(
                apiKey,
                provider,
                currentEssay,
                prompt,
                college,
                wordLimit,
                feedbackToAddress,
                iterations
            );

            // Ensure word limit
            currentEssay = trimToWordLimit(currentEssay, wordLimit);
            logs.push(`New word count: ${currentEssay.split(/\s+/).filter(Boolean).length}`);
        }

        // Final review
        const finalReview = await reviewEssay(apiKey, provider, currentEssay, prompt, college, wordLimit);
        logs.push(`\n🏆 FINAL SCORE: ${finalReview.score}%`);

        const finalWordCount = currentEssay.split(/\s+/).filter(Boolean).length;

        console.log(logs.join('\n'));

        return NextResponse.json({
            success: true,
            ultimateEssay: currentEssay,
            finalScore: finalReview.score,
            iterations,
            wordCount: finalWordCount,
            remainingImprovements: finalReview.improvements,
            logs,
            provider,
        });

    } catch (error) {
        console.error('Ultimate essay error:', error);
        return NextResponse.json({
            error: 'Failed to create ultimate essay',
            message: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
