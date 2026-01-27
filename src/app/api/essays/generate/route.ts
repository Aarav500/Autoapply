'use server';

import { NextRequest, NextResponse } from 'next/server';
import { checkForDuplication, calculateDiversityScore, detectAIPatterns } from '@/lib/essay-quality';

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
    essayTitle?: string;
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
    major?: string;
    goals?: string;
    // For improvement iterations
    previousFeedback?: string;
    previousDraft?: string;
    existingEssays?: string[]; // New: List of other essays for the same college
}

// Call Claude API with optimal temperature for essay generation
async function callClaude(apiKey: string, systemPrompt: string, userMessage: string, temperature: number = 0.7): Promise<string> {
    const response = await fetch(CLAUDE_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model: 'claude-opus-4-20250514',
            max_tokens: 4000,
            temperature: temperature, // 0.7 = creative but controlled
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

// Call Gemini API with standardized temperature
async function callGemini(apiKey: string, systemPrompt: string, userMessage: string, temperature: number = 0.7): Promise<string> {
    const response = await fetch(`${GEMINI_API_URL}/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ parts: [{ text: userMessage }] }],
            generationConfig: {
                temperature: temperature,
                maxOutputTokens: 4000,
            },
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Gemini API error: ${error}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}

// Call OpenAI API with standardized temperature
async function callOpenAI(apiKey: string, systemPrompt: string, userMessage: string, temperature: number = 0.7): Promise<string> {
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
            max_tokens: 4000,
            temperature: temperature, // 0.7 = creative but controlled
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
        const { prompt, essayTitle, college, activities, achievements, wordLimit, tone, major, goals, previousFeedback, previousDraft, existingEssays } = body;

        // Detect if this is an improvement iteration
        const isImprovement = previousFeedback && previousDraft;
        if (isImprovement) {
            console.log('📝 This is an IMPROVEMENT iteration with previous feedback');
        }

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

        console.log(`📝 ${isImprovement ? 'Improving' : 'Generating'} essay using ${provider} for ${college.name}`);

        // Build activities context - sort by total hours (most significant first)
        const sortedActivities = [...activities].sort((a, b) => {
            const getTotalHours = (act: any) => (act.hoursPerWeek || 0) * (act.weeksPerYear || 40);
            return getTotalHours(b) - getTotalHours(a);
        });

        const activitiesContext = sortedActivities.map((a, i) =>
            `Activity ${i + 1}: ${a.name}\n- Description: ${a.description}\n- Impact: ${a.impact}`
        ).join('\n\n');

        // Build existing essays context with FULL CONTENT for proper deduplication
        let existingEssaysContext = '';
        let existingEssaysAnalysis = '';

        if (existingEssays && existingEssays.length > 0) {
            // Extract key topics from each existing essay
            const extractedTopics = existingEssays.map((essay, i) => {
                // Extract main verbs and nouns to understand what the essay is about
                const words = essay.toLowerCase().split(/\s+/);
                const activities = sortedActivities.map(a => a.name.toLowerCase());
                const usedActivities = activities.filter(act =>
                    essay.toLowerCase().includes(act.toLowerCase())
                );

                return {
                    index: i + 1,
                    usedActivities,
                    excerpt: essay.slice(0, 150) + '...',
                    fullText: essay, // Include full text for semantic comparison
                };
            });

            existingEssaysAnalysis = extractedTopics.map(topic =>
                `Essay ${topic.index}: Uses activities [${topic.usedActivities.join(', ') || 'general experience'}]`
            ).join('\n');

            existingEssaysContext = `
⚠️ CRITICAL ANTI-DUPLICATION REQUIREMENTS:

You have ALREADY written ${existingEssays.length} essay(s) for ${college.name}:
${existingEssaysAnalysis}

STRICT RULES TO AVOID REPETITION:
1. DO NOT use the same activities mentioned in existing essays
2. DO NOT tell similar stories or use similar anecdotes
3. DO NOT use similar opening hooks or narrative structures
4. CHOOSE COMPLETELY DIFFERENT aspects of your experience
5. Show a DIFFERENT side of yourself

EXISTING ESSAYS (FULL TEXT - DO NOT REPEAT THESE):
${existingEssays.map((essay, i) => `\n--- EXISTING ESSAY ${i + 1} FOR ${college.name} ---\n${essay}\n---\n`).join('\n')}

⚠️ Your new essay MUST be meaningfully different. Focus on activities/experiences NOT covered above.
`;
        }

        // Calculate target word count (aim for 90% of limit to leave buffer)
        const targetWords = Math.floor(wordLimit * 0.9);
        const minWords = Math.floor(wordLimit * 0.75);

        // Build system prompt with STRICT word limit and quality requirements
        const systemPrompt = `You are an expert college essay writer helping a student craft a compelling, UNIQUE transfer application essay.

⚠️ CRITICAL WORD LIMIT: You MUST write EXACTLY between ${minWords}-${wordLimit} words. NOT A SINGLE WORD MORE than ${wordLimit}.
Count your words carefully. Essays over the limit will be REJECTED.

🎯 AUTHENTICITY REQUIREMENTS (This MUST sound like a real 17-18 year old wrote it):
- Write in first person with natural, conversational voice
- Use contractions (I'm, don't, can't, won't) - real students use these
- Include imperfect thoughts and real hesitations
- Use specific sensory details (what you saw, heard, felt, smelled)
- Sometimes use sentence fragments. For emphasis.
- Show vulnerability - admit failures and uncertainties
- Include timestamps ("3am on a Tuesday", not "one night")
- Use dialogue when it adds personality
- Have a sense of humor about yourself

📊 SPECIFICITY REQUIREMENTS (Include 8-12 specific details):
- Exact numbers, dates, times
- Real names (people, places, organizations - but NOT professor/college names)
- Specific tools, technologies, concepts
- Concrete sensory details
- Measurable outcomes

🚫 ABSOLUTELY BANNED PHRASES (AI tells):
- "Ever since I was young" / "From a young age"
- "I have always been passionate" / "My passion for"
- "sparked my interest" / "ignited my passion"
- "This experience taught me" / "I learned that"
- "pushed me out of my comfort zone"
- "diverse perspectives"
- "making a difference" / "giving back to the community"
- "transformative experience"
- "journey of self-discovery"
- "shaped me into the person I am"
- Opening with a famous quote or dictionary definition

🎨 NARRATIVE STRUCTURE:
- Start in medias res (middle of action) - NO exposition
- First sentence MUST be a specific moment/scene
- Use the "zoom in" technique: specific moment → broader context → future
- End with forward-looking connection to ${college.name}
- NO summary paragraph or "In conclusion"

TARGET COLLEGE: ${college.name}
Values: ${college.values.join(', ')}
What they look for: ${college.whatTheyLookFor.join(', ')}
Culture: ${college.culture}
Notable programs: ${college.notablePrograms.join(', ')}

TONE: ${tone || 'confident, authentic, with moments of vulnerability'}

STRICT WORD LIMIT: ${wordLimit} words maximum. Target: ${targetWords} words.

🎯 QUALITY BENCHMARK: Your essay will be scored on:
- Authenticity (sounds human, not AI)
- Specificity (concrete details, not generic)
- Uniqueness (different from other essays)
- Emotional impact (memorable to admissions officers)
- College fit (connects to ${college.name} specifically)`;

        // Build user message - different for first draft vs improvement
        let userMessage: string;

        if (isImprovement) {
            userMessage = `ESSAY PROMPT${essayTitle ? ` (${essayTitle})` : ''}:
${prompt}

STUDENT'S ACTIVITIES AND EXPERIENCES (use these - do NOT ask for more):
${activitiesContext}

${major ? `STUDENT'S FIELD/MAJOR: ${major}\n` : ''}
${goals ? `STUDENT'S GOALS: ${goals}\n` : ''}

${achievements ? `STUDENT ACHIEVEMENTS:\n${achievements}\n` : ''}

PREVIOUS DRAFT:
${previousDraft}

ADMISSIONS COUNSELOR FEEDBACK ON PREVIOUS DRAFT:
${previousFeedback}

⚠️ TASK: IMPROVE the essay based on the counselor's feedback above.
- Address EVERY piece of feedback
- Keep what works, fix what doesn't
- STAY UNDER ${wordLimit} words
- Make the essay stronger, more authentic, and better aligned with ${college.name}

Write the IMPROVED essay now (${wordLimit} words max):`;
        } else {
            userMessage = `ESSAY PROMPT${essayTitle ? ` (${essayTitle})` : ''}:
"${prompt}"

${achievements ? `STUDENT ACHIEVEMENTS:\n${achievements}\n\n` : ''}
${major ? `STUDENT'S FIELD/MAJOR: ${major}\n` : ''}
${goals ? `STUDENT'S GOALS: ${goals}\n\n` : ''}

STUDENT'S ACTIVITIES AND EXPERIENCES (choose 1-2 most relevant - do NOT use all):
${activitiesContext}

${existingEssaysContext}

⚠️ CRITICAL INSTRUCTIONS:

1. WORD LIMIT: MAXIMUM ${wordLimit} words. Aim for ${targetWords} words. COUNT CAREFULLY.

2. OPENING: Start with a specific moment in time. NO background/exposition.
   ✅ Good: "The servo motor whined as I pushed it past its limits for the third time that night."
   ❌ Bad: "I have always been interested in robotics since I was young."

3. SPECIFICITY: Include 8-12 concrete details:
   - Exact numbers ("47 lines of code", "3am on a Tuesday")
   - Real names of places/tools/concepts
   - Sensory details (sounds, sights, textures)
   - Measurable outcomes

4. VOICE: Write like a smart 17-18 year old:
   - Use contractions naturally (I'm, don't, can't)
   - Include sentence fragments for emphasis
   - Show vulnerability and uncertainty
   - Have a subtle sense of humor

5. COLLEGE CONNECTION: Mention ${college.name}'s specific programs/values, but naturally
   - Don't force it or make it sound researched
   - Connect YOUR experience to THEIR offerings

6. ACTIVITIES: Choose 1-2 activities maximum from the list above
   - Focus on depth over breadth
   - Tell ONE story well, don't list multiple activities
   - Show specific moments, not summaries

7. UNIQUENESS: Make this essay impossible for any other student to write
   - Include hyper-specific details only YOU would know
   - Tell a story only YOU can tell

COUNT YOUR WORDS BEFORE RESPONDING. If over ${wordLimit}, CUT content IMMEDIATELY.

Write the essay NOW (${wordLimit} words max):`;
        }

        // Call the AI with retry logic for duplication
        let essay: string;
        let attempt = 0;
        const maxAttempts = 3;
        let isDuplicate = false;

        do {
            attempt++;
            if (attempt > 1) {
                console.log(`⚠️ Attempt ${attempt}/${maxAttempts} - previous essay was too similar`);
            }

            if (provider === 'claude') {
                essay = await callClaude(apiKey, systemPrompt, userMessage, 0.7);
            } else if (provider === 'gemini') {
                essay = await callGemini(apiKey, systemPrompt, userMessage, 0.7);
            } else {
                essay = await callOpenAI(apiKey, systemPrompt, userMessage, 0.7);
            }

            // Check for duplication with existing essays
            if (existingEssays && existingEssays.length > 0) {
                const dupCheck = checkForDuplication(essay, existingEssays, 40);
                isDuplicate = dupCheck.isDuplicate;

                if (isDuplicate && attempt < maxAttempts) {
                    console.log(`❌ Essay is ${dupCheck.mostSimilar}% similar to existing essay. Regenerating...`);
                    // Add stronger anti-duplication instruction for next attempt
                    userMessage += `\n\n⚠️⚠️⚠️ PREVIOUS ATTEMPT WAS TOO SIMILAR TO EXISTING ESSAYS (${dupCheck.mostSimilar}% similarity).
You MUST use COMPLETELY DIFFERENT activities, stories, and examples. Be MORE creative and show a DIFFERENT side of yourself.`;
                } else if (!isDuplicate) {
                    console.log(`✅ Essay uniqueness check passed (max similarity: ${dupCheck.mostSimilar}%)`);
                } else {
                    console.log(`⚠️ Essay still ${dupCheck.mostSimilar}% similar after ${maxAttempts} attempts. Proceeding anyway.`);
                }
            } else {
                isDuplicate = false; // No existing essays to compare
            }
        } while (isDuplicate && attempt < maxAttempts);

        // POST-PROCESSING: Trim essay if it exceeds word limit
        let words = essay.split(/\s+/).filter(w => w.length > 0);
        if (words.length > wordLimit) {
            console.log(`⚠️ Essay was ${words.length} words, trimming to ${wordLimit}...`);

            // Find the last complete sentence within the word limit
            const trimmedWords = words.slice(0, wordLimit);
            let trimmedText = trimmedWords.join(' ');

            // Find the last sentence ending
            const sentenceEndings = ['.', '!', '?'];
            let lastSentenceEnd = -1;

            for (let i = trimmedText.length - 1; i >= 0; i--) {
                if (sentenceEndings.includes(trimmedText[i])) {
                    lastSentenceEnd = i;
                    break;
                }
            }

            // If we found a sentence ending in the last 50 characters, cut there
            if (lastSentenceEnd > trimmedText.length - 100) {
                essay = trimmedText.slice(0, lastSentenceEnd + 1);
            } else {
                // Otherwise just cut at word limit
                essay = trimmedText;
            }

            words = essay.split(/\s+/).filter(w => w.length > 0);
            console.log(`✂️ Trimmed essay to ${words.length} words`);
        }

        // POST-PROCESSING: Analyze essay quality
        const diversityAnalysis = calculateDiversityScore(essay);
        const aiDetection = detectAIPatterns(essay);

        console.log(`✅ Generated essay (${words.length} words) using ${provider}`);
        console.log(`📊 Diversity Score: ${diversityAnalysis.score}/100`);
        console.log(`🤖 AI Detection Confidence: ${aiDetection.confidence}%`);

        return NextResponse.json({
            essay,
            provider,
            wordCount: words.length,
            // Quality metadata
            qualityMetrics: {
                diversityScore: diversityAnalysis.score,
                diversityBreakdown: diversityAnalysis.breakdown,
                diversityFeedback: diversityAnalysis.feedback,
                aiDetectionConfidence: aiDetection.confidence,
                aiPatterns: aiDetection.patterns,
                aiSuggestions: aiDetection.suggestions,
            },
            attempts: attempt, // How many tries it took to avoid duplication
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
