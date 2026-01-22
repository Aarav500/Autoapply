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

async function callAI(apiKey: string, provider: string, systemPrompt: string, userMessage: string, isReview: boolean = false): Promise<string> {
    if (provider === 'claude') {
        // Use Sonnet for reviews (faster, cheaper), Sonnet for perfection too (more consistent)
        const model = 'claude-sonnet-4-20250514';

        const response = await fetch(CLAUDE_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model,
                max_tokens: 4000,
                temperature: isReview ? 0.3 : 0.7, // Low temp for reviews, moderate for writing
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

You are reviewing a transfer student essay. Your goal is to HELP the student improve while recognizing what's already working well.

SCORING GUIDE (FAIR BUT HIGH STANDARDS):
- 95-100: EXCEPTIONAL - Truly outstanding, ready to submit. Minor tweaks only.
- 90-94: EXCELLENT - Very strong, competitive at top schools. 1-2 small improvements possible.
- 85-89: VERY GOOD - Solid essay with room for enhancement.
- 80-84: GOOD - Has potential but needs work in specific areas.
- Below 80: Needs significant revision.

REVIEW CRITERIA (score each 1-10):
1. AUTHENTICITY (20%): Does it sound like a real person? Contractions, varied sentences, natural flow.
2. SPECIFICITY (25%): Concrete details? Numbers, names, vivid scenes?
3. COLLEGE FIT (20%): Shows genuine interest in this specific school?
4. STRUCTURE (15%): Clear narrative arc? Good flow between ideas?
5. IMPACT (20%): Emotionally engaging? Memorable?

SCORING PRINCIPLES:
- START by identifying what's WORKING well in the essay
- An essay can score 95+ without being "perfect" - it just needs to be authentic, specific, and compelling
- Only deduct points for CLEAR issues, not nitpicks
- If the essay answers the prompt well and feels genuine, that's a strong foundation

ONLY flag these as issues if they're genuinely problematic:
- Over word limit: Note it but don't over-penalize if close
- Missing specific college connection: Suggest adding ONE specific detail
- Generic phrasing: Point to specific sentences that could be more vivid

IMPORTANT:
- Improvements should be SPECIFIC and ACTIONABLE
- Maximum 3 improvements - focus on what matters most
- If the essay is already strong (90+), don't force unnecessary changes
- Preserve what's working - don't suggest rewriting good parts

Return ONLY valid JSON:
{
    "score": <number 0-100>,
    "categoryScores": { "authenticity": <number>, "specificity": <number>, "collegeFit": <number>, "structure": <number>, "impact": <number> },
    "strengths": ["<what's working well>"],
    "improvements": ["<specific improvement if needed>"],
    "oneThingToFix": "<single most impactful change or null if essay is strong>",
    "spark": "<the memorable moment in the essay, or null>"
}`;

    const userMessage = `PROMPT: ${prompt}
WORD LIMIT: ${wordLimit}
ESSAY:
${essay}

Review and return JSON only:`;

    const response = await callAI(apiKey, provider, systemPrompt, userMessage, true); // isReview = true

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

            // CRITICAL: Only suggest improvements if they're truly needed
            // Don't force improvements just because score < 95
            if (improvements.length === 0 && score < 90) {
                improvements.push("Add more vivid sensory details to make the narrative more immersive");
            }

            // Don't force spark requirement - it can artificially lower good essays
            // Only mention spark if score is high but essay feels generic
            if (score >= 90 && score < 95 && !spark && improvements.length === 0) {
                improvements.push("Consider adding a moment of vulnerability or unexpected insight to make it truly memorable");
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

    const systemPrompt = `You are a skilled essay editor helping improve a college application essay.
This is iteration ${iteration}. Your job is to make TARGETED improvements while PRESERVING what's already working.

CRITICAL PRINCIPLE: DO NOT REWRITE THE WHOLE ESSAY.
The student has a voice and story that works. Your job is to ENHANCE, not replace.

WHAT TO PRESERVE:
- The overall structure and narrative arc
- Specific examples and anecdotes that are working
- The student's authentic voice and tone
- Opening hooks that are engaging
- Emotional moments that resonate

WHAT TO IMPROVE (based on feedback):
${specificFocus || '- Make small targeted improvements based on the feedback below'}

EDITING RULES:
1. Word limit: ${wordLimit} words MAX
2. Only change what's specifically called out in the feedback
3. Keep the same opening unless feedback says to change it
4. Maintain the student's voice - don't make it sound "polished" or AI-written
5. If adding something, remove something else to stay within word limit

APPROACH:
- Read the feedback carefully
- Make the MINIMUM changes needed to address each point
- If a section is working, leave it alone
- Prefer tweaking sentences over rewriting paragraphs
- The goal is improvement, not perfection${obedienceInstruction}

Output ONLY the improved essay, nothing else.`;

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

        // First, review the current essay to see where it stands
        const initialReview = await reviewEssay(apiKey, provider, currentEssay, prompt, college, wordLimit);
        currentScore = initialReview.score;
        logs.push(`Initial review score: ${currentScore}%`);

        // If essay is already excellent (93%+), only do minor polish if there's clear feedback
        if (currentScore >= 93 && initialReview.improvements.length === 0) {
            logs.push(`✅ Essay is already excellent at ${currentScore}%! No changes needed.`);
            // Skip perfection loop - return the original essay
            return NextResponse.json({
                success: true,
                ultimateEssay: currentEssay,
                finalScore: currentScore,
                iterations: 0,
                wordCount: currentEssay.split(/\s+/).filter(Boolean).length,
                remainingImprovements: [],
                logs,
                provider,
                message: "Essay was already strong - preserved original"
            });
        }

        // ITERATIVE PERFECTION LOOP - only if improvements are needed
        while (iterations < maxIterations) {
            iterations++;
            logs.push(`\n--- Iteration ${iterations} ---`);

            // Get current review (use initial on first iteration)
            const review = iterations === 1 ? initialReview : await reviewEssay(apiKey, provider, currentEssay, prompt, college, wordLimit);
            currentScore = review.score;

            if (iterations > 1) {
                logs.push(`Review score: ${currentScore}%`);
            }
            logs.push(`Improvements suggested: ${review.improvements.length > 0 ? review.improvements.join('; ') : 'None'}`);

            // If we've reached 95%+ OR no improvements left, we're done
            if (currentScore >= 95) {
                logs.push(`✅ Excellent! Score ${currentScore}% - ready to submit.`);
                break;
            }

            if (review.improvements.length === 0) {
                logs.push(`✅ No more improvements needed at ${currentScore}%.`);
                break;
            }

            // Collect feedback - limit to top 2 most important
            const feedbackToAddress: string[] = [];
            if (review.oneThingToFix) {
                feedbackToAddress.push(review.oneThingToFix);
            }
            // Add max 1 more improvement to avoid over-editing
            if (review.improvements.length > 0 && feedbackToAddress.length < 2) {
                const additionalFeedback = review.improvements.filter(i => i !== review.oneThingToFix).slice(0, 1);
                feedbackToAddress.push(...additionalFeedback);
            }

            if (feedbackToAddress.length === 0) {
                logs.push(`No actionable feedback at ${currentScore}%. Stopping.`);
                break;
            }

            // Apply targeted improvements
            logs.push(`Applying ${feedbackToAddress.length} targeted improvements...`);
            const improvedEssay = await perfectEssay(
                apiKey,
                provider,
                currentEssay,
                prompt,
                college,
                wordLimit,
                feedbackToAddress,
                iterations,
                review.categoryScores,
                false // Don't force spark - let essay be natural
            );

            // Ensure word limit
            const trimmedEssay = trimToWordLimit(improvedEssay, wordLimit);
            const newWordCount = trimmedEssay.split(/\s+/).filter(Boolean).length;
            logs.push(`New word count: ${newWordCount}`);

            // CRITICAL: Check if the improvement actually helped
            const verifyReview = await reviewEssay(apiKey, provider, trimmedEssay, prompt, college, wordLimit);

            if (verifyReview.score >= currentScore) {
                // Improvement worked or maintained quality - accept it
                currentEssay = trimmedEssay;
                logs.push(`✓ Improvement accepted (${currentScore}% → ${verifyReview.score}%)`);
                currentScore = verifyReview.score;
            } else {
                // Improvement made it worse - reject and stop
                logs.push(`✗ Improvement rejected (would drop from ${currentScore}% to ${verifyReview.score}%). Keeping previous version.`);
                break;
            }
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
