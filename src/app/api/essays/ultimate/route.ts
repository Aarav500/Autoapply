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
- "Leaders AND Best" - show BOTH leadership AND citizenship (being a good community member)
- Community contribution AND how you support others
- Evidence of collaboration - not just leading but LISTENING
- Connection to Michigan values
- CRITICAL: The prompt asks for leaders AND citizens. If essay only shows leadership without citizenship/teamwork, PENALIZE heavily.`,
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
    spark?: string | null;
}> {

    const persona = getCollegePersona(college.name, college.values, college.whatTheyLookFor);

    const systemPrompt = `${persona}

You are reviewing a transfer student essay. Your goal is HELP the student reach PERFECTION.
You are the TOUGHEST, HARSHEST specialist in the office. You rarely give scores above 95.

SCORING GUIDE (RUTHLESS STANDARDS):
- 98-100: TRANSCENDENT - A masterpiece. Flawless. One coherent narrative.
- 95-97: EXCELLENT - Ready to submit, but could be 1% better.
- 90-94: VERY GOOD - Still needs polish to be competitive at Ivy League.
- 85-89: GOOD - Not memorable enough.
- Below 85: Needs significant work.

REVIEW CRITERIA (score each 1-10, then calculate weighted average):
1. AUTHENTICITY (20%): Is the voice unique? (If it sounds like AI, score < 5)
2. SPECIFICITY (20%): Vivid examples? (If generic, score < 6)
3. COLLEGE FIT (25%): Deep research? (If vague, score < 5)
4. STRUCTURE (15%): ONE coherent narrative? Good transitions? (If disconnected anecdotes, score < 6)
5. IMPACT (20%): Does it make you FEEL?
6. COHERENCE (bonus check): Is there ONE main thread, or is it a resume in paragraph form?

AUTOMATIC PENALTIES (reduce score):
- Name-dropping 4+ different organizations/programs: -5 points (looks like a resume)
- Same example/device repeated 3+ times: -3 points (overworked)
- Disconnected anecdotes without transitions: -5 points (no narrative thread)
- Over word limit: -10 points
- If prompt mentions "community" or "citizen" but essay only shows leadership without citizenship/teamwork: -8 points

IMPORTANT:
- Be extremely nitpicky. Find the smallest flaws.
- Improvements must be ACTIONABLE (e.g., "Change the opening to...")
- **THE SPARK REQUIREMENT**: To score > 93, the essay MUST have a "Spark" - a moment of raw vulnerability, a counter-intuitive insight, or a unique connection that makes it impossible to forget.
- If "Spark" is missing, max score is 93.
- **COHERENCE CHECK**: The essay should read as ONE story, not a list of achievements. If it feels like "and then I did X, and then I did Y, and then I did Z", penalize the structure score.
- Check word count! If over limit, note it.

Return ONLY valid JSON:
{
    "score": <number 0-100>,
    "categoryScores": { "authenticity": <number>, "specificity": <number>, "collegeFit": <number>, "structure": <number>, "impact": <number> },
    "improvements": ["<specific improvement 1>", "<specific improvement 2>"],
    "oneThingToFix": "<most important fix or null>",
    "spark": "<description of the spark or null if missing>",
    "penalties": ["<penalty applied if any>"]
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
            let spark = parsed.spark || null;

            // Ensure improvements exist if score < 95
            if (score < 95 && improvements.length === 0) {
                improvements.push("Add more specific details to increase impact");
                improvements.push("Strengthen the connection to the college's values");
            }

            // Force spark feedback if high score but no spark (safety net)
            if (score > 90 && !spark) {
                improvements.unshift("MISSING SPARK: Add a moment of raw vulnerability or unexpected insight.");
            }

            if (!oneThingToFix && improvements.length > 0) {
                oneThingToFix = improvements[0];
            }

            return { score, improvements, oneThingToFix, categoryScores, spark };
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
    categoryScores?: Record<string, number>,
    missingSpark?: boolean
): Promise<string> {

    const isPanicMode = true; // ALWAYS in strict obedience mode as requested ("no freedom")

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

    if (missingSpark) {
        specificFocus += `\nCRITICAL: The essay lacks a "SPARK". You MUST take a risk. Add a moment of raw vulnerability, a counter-intuitive insight, or a unique connection. Do not be safe.`;
    }

    const obedienceInstruction = isPanicMode
        ? `\nCRITICAL INSTRUCTION: STICK TO THE FEEDBACK. Do not be "creative". If the feedback suggests a specific phrase, example, or change, OPTIMIZE FOR THAT EXACTLY. Literal obedience is required.`
        : "";

    const systemPrompt = `You are a legendary essay consultant with 100% admission rate.
This is iteration ${iteration} of perfection. Your job is to make this essay FLAWLESS.

RUBRIC YOU ARE GRADED ON (Aim for 10/10 in all):
1. AUTHENTICITY: Unique voice, no AI-sounding phrases.
2. SPECIFICITY: Vivid concrete details, numbers, names. BUT only 2-3 KEY activities with DEPTH.
3. COLLEGE FIT: 1-2 specific program mentions (not 4+, that looks desperate).
4. STRUCTURE: ONE coherent narrative with good TRANSITIONS. Not disconnected anecdotes.
5. IMPACT: Emotional resonance, memorable story.

RULES:
1. Word limit: ${wordLimit} words STRICT MAX (Count every word! If limit is 250, stay under 250.)
2. Address ALL feedback completely - do not ignore anything.
3. Make it sound authentically human (contractions, varied sentences, natural flow).
4. Include 1-2 specific details about ${college.name} programs (not 4+).
5. The goal is 97%+ score.${specificFocus}

CRITICAL ANTI-PATTERNS TO AVOID:
- Do NOT repeat the same example/device more than 2 times
- Do NOT name-drop 4+ different organizations (looks like a resume)
- Do NOT write disconnected anecdotes. ONE main story thread.
- If the prompt asks about "community", show BOTH leadership AND citizenship (supporting others)
- Do NOT exceed word limit. Count the words.

STRATEGY:
- If Specificity is low: Add concrete numbers, proper nouns, and sensory details TO 2-3 KEY ACTIVITIES.
- If Authenticity is low: Rewrite to sound more conversational and less "polished".
- If College Fit is low: Add 1-2 specific professor/lab/tradition mentions (NOT 4+).
- If Structure is low: REWRITE with ONE narrative thread and clear transitions.
- Cut fluff ruthlessly to make space for substance.${obedienceInstruction}

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
        const maxIterations = 3; // Reduced to 3 to save costs & force efficiency
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

                review.categoryScores,
                !review.spark && currentScore > 90 // Flag missing spark if score is decent but no spark
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
