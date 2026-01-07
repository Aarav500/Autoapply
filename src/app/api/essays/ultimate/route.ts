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

// College-specific review personas (copied from review API for consistency)
const getCollegePersona = (collegeName: string, values: string[], whatTheyLookFor: string[]) => {
    const personas: Record<string, string> = {
        'MIT': `You are a senior MIT admissions officer with 15 years of experience. You've read thousands of essays and know exactly what makes an MIT applicant stand out. 
MIT SPECIFIC PRIORITIES:
- Genuine intellectual curiosity and "nerdiness"
- Hands-on making and building
- Collaborative spirit
- Resilience and problem-solving mindset
- Authentic voice`,

        'Stanford': `You are a Stanford admissions officer known for identifying "intellectually curious, future leaders."
STANFORD SPECIFIC PRIORITIES:
- Intellectual vitality
- Evidence of impact and leadership
- Authenticity over perfection
- Entrepreneurial mindset`,

        'Harvard': `You are a Harvard admissions officer evaluating essays for the most selective university.
HARVARD SPECIFIC PRIORITIES:
- Character and integrity
- Potential for future contribution to society
- Genuine intellectual depth
- Evidence of leadership and impact`,

        'UMich': `You are a University of Michigan admissions officer, particularly focused on the "Community" essay.
UMICH SPECIFIC PRIORITIES:
- "Leaders and Best" - show leadership potential
- Community contribution
- Evidence of collaboration
- Connection to Michigan values`,
    };

    return personas[collegeName] || `You are an experienced admissions officer at ${collegeName}.
${collegeName} SPECIFIC PRIORITIES:
- Alignment with core values: ${values.join(', ')}
- Evidence of: ${whatTheyLookFor.join(', ')}
- Genuine interest in ${collegeName}'s programs
- Authentic voice and personal reflection`;
};

async function reviewEssay(
    apiKey: string,
    provider: string,
    essay: string,
    prompt: string,
    college: UltimateEssayRequest['college'],
    wordLimit: number
): Promise<{
    score: number;
    improvements: string[];
    oneThingToFix: string | null;
    categoryScores?: Record<string, number>;
}> {

    const persona = getCollegePersona(college.name, college.values, college.whatTheyLookFor);

    const systemPrompt = `${persona}

You are reviewing a transfer student essay. Your goal is to HELP the student reach PERFECTION.
You are the TOUGHEST, HARSHEST specialist in the office. You rarely give scores above 95.

SCORING GUIDE (RUTHLESS STANDARDS):
- 98-100: TRANSCENDENT - A masterpiece. Flawless.
- 95-97: EXCELLENT - Ready to submit, but could be 1% better.
- 90-94: VERY GOOD - Still needs polish to be competitive at Ivy League.
- 85-89: GOOD - Not memorable enough.
- Below 85: Needs significant work.

REVIEW CRITERIA (score each 1-10, then calculate weighted average):
1. AUTHENTICITY (20%): Is the voice unique? (If it sounds like AI, score < 5)
2. SPECIFICITY (20%): vivid examples? (If generic, score < 6)
3. COLLEGE FIT (25%): Deep research? (If vague, score < 5)
4. STRUCTURE (15%): Flawless flow?
5. IMPACT (20%): Does it make you FEEL?

IMPORTANT: 
- Be extremely nitpicky. Find the smallest flaws.
- Improvements must be ACTIONABLE (e.g., "Change the opening to...")
- If the essay is "good" but not "amazing", max score is 92.

Return ONLY valid JSON:
{
    "score": <number 0-100>,
    "categoryScores": { "authenticity": <number>, "specificity": <number>, "collegeFit": <number>, "structure": <number>, "impact": <number> },
    "improvements": ["<specific improvement 1>", "<specific improvement 2>"],
    "oneThingToFix": "<most important fix or null>"
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

            // Standardize output
            let score = parsed.score || parsed.overallScore || 50;
            let improvements = parsed.improvements || [];
            let oneThingToFix = parsed.oneThingToFix || null;
            let categoryScores = parsed.categoryScores || {};

            // Ensure improvements exist if score < 95
            if (score < 95 && improvements.length === 0) {
                improvements.push("Add more specific details to increase impact");
                improvements.push("Strengthen the connection to the college's values");
            }

            if (!oneThingToFix && improvements.length > 0) {
                oneThingToFix = improvements[0];
            }

            return { score, improvements, oneThingToFix, categoryScores };
        }
    } catch {
        // Fallback
    }

    return { score: 75, improvements: ['Review parsing failed'], oneThingToFix: null };
}

async function perfectEssay(
    apiKey: string,
    provider: string,
    essay: string,
    prompt: string,
    college: UltimateEssayRequest['college'],
    wordLimit: number,
    feedbackToAddress: string[],
    iteration: number,
    categoryScores?: Record<string, number>
): Promise<string> {

    // Dynamic strategy based on weak categories
    let specificFocus = "";
    if (categoryScores) {
        const weakAreas = Object.entries(categoryScores)
            .filter(([_, score]) => score < 9)
            .map(([cat]) => cat.toUpperCase());

        if (weakAreas.length > 0) {
            specificFocus = `\nCRITICAL FOCUS AREAS (Score < 9/10): ${weakAreas.join(', ')}. You MUST improve these specifically.`;
        }
    }

    const systemPrompt = `You are a legendary essay consultant with 100% admission rate. 
This is iteration ${iteration} of perfection. Your job is to make this essay FLAWLESS.

RUBRIC YOU ARE GRADED ON (Aim for 10/10 in all):
1. AUTHENTICITY: Unique voice, no AI-sounding phrases.
2. SPECIFICITY: Vivid concrete details, numbers, names.
3. COLLEGE FIT: Deep research, specific program mentions.
4. STRUCTURE: Flawless flow, strong hook and conclusion.
5. IMPACT: Emotional resonance, memorable story.

RULES:
1. Word limit: ${wordLimit} words MAX (Strictly enforced)
2. Address ALL feedback completely - do not ignore anything.
3. Make it sound authentically human (contractions, varied sentences, natural flow).
4. Include specific details about ${college.name} programs.
5. The goal is 97%+ score.${specificFocus}

STRATEGY:
- If Specificity is low: Add concrete numbers, proper nouns, and sensory details.
- If Authenticity is low: Rewrite to sound more conversational and less "polished".
- If College Fit is low: Name drop specific professors, labs, or traditions.
- cut fluff ruthlessly to make space for substance.

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
        const maxIterations = 10; // Increased to ensure perfection
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

            // If we've reached 97%+ with no improvements, we're done! (Higher threshold for safety)
            if (currentScore >= 97 && review.improvements.length === 0) {
                logs.push(`✅ TRUE PERFECTION! Score ${currentScore}% with no improvements needed.`);
                break;
            }

            // If score is 97%+ but still has minor improvements, we're good
            if (currentScore >= 97) {
                logs.push(`✅ Excellent! Score ${currentScore}% - exceeds safety threshold.`);
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
                iterations,
                review.categoryScores
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
