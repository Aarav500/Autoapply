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

        // Calculate target word count (aim for 100-105% so cleanup brings us to 90%+)
        const targetWords = Math.floor(wordLimit * 1.0); // Target 100% of limit
        const maxWords = Math.floor(wordLimit * 1.05); // Allow up to 105%
        const minWords = Math.floor(wordLimit * 0.85); // Minimum 85% after cleanup

        // Build system prompt with STRICT word limit and quality requirements
        const systemPrompt = `You are writing a college transfer essay RIGHT NOW. Your ENTIRE response will be the essay content itself.

🚨🚨🚨 ABSOLUTE REQUIREMENT - YOU WILL BE REJECTED IF YOU VIOLATE THIS:
Your response MUST begin with the FIRST SENTENCE OF THE ESSAY. No preamble, no meta-text, no commentary.

FORBIDDEN PATTERNS (your response will be REJECTED if it contains ANY of these):
❌ "I cannot provide"
❌ "I notice that"
❌ "To help you"
❌ "Could you please"
❌ "Please provide"
❌ "I would need"
❌ "Once you provide"
❌ "Please submit"
❌ "I can help you"
❌ "Here's the essay"
❌ "Let me write"

Your response MUST start with a concrete moment, action, or scene from the student's life.

EXAMPLE OF CORRECT START:
"The servo motor whined as I pushed it past its limits for the third time that night."
"'I trusted you.' Three words from a small business owner at 3:47 AM."
"The scoreboard read 0-0, but the real game was happening in my head."

EXAMPLE OF INCORRECT START (WILL BE REJECTED):
"I cannot provide an improved essay because..."
"To help you with your transfer essay, I would need..."
"Please provide your actual essay draft so I can..."

⚠️ CRITICAL WORD LIMIT: You MUST write between ${minWords}-${maxWords} words. Target ${targetWords} words.
Cleanup will trim the essay, so aim for ${targetWords}-${maxWords} words to ensure we hit target after cleanup.
Count your words carefully.

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
- Focus on ONE story/experience - go DEEP not WIDE
- Write about the PAST, not the future
- End naturally when story ends - NO future vision paragraphs

🚨 CRITICAL ANTI-SPAM RULES (WILL BE REJECTED IF VIOLATED):
- DO NOT mention college name (${college.name}) in the essay body
- DO NOT mention professor names, program names, lab names, course codes
- DO NOT write "At ${college.name}, I will..." or "I'm excited to..."
- DO NOT list multiple activities - pick ONE and tell that story deeply
- ONE college mention is allowed ONLY in the final sentence as natural connection

⚠️ IF PROMPT ASKS ABOUT "OBJECTIVES" OR "FUTURE PLANS":
Answer by showing PAST experiences that reveal what you value, not by listing future plans.
- ❌ WRONG: "My objective is to work with Professor X on Y research"
- ❌ WRONG: "I hope to take EECS 498 and join the Z lab"
- ✅ RIGHT: Tell a story from your past that shows you care about that thing
- ✅ RIGHT: Let the story speak for itself - don't explain "this is why I want X"

Example: Instead of "I want to study AI ethics" → Tell story about the retail crash where your AI failed and you learned ethics matters

TARGET COLLEGE: ${college.name}
Values: ${college.values.join(', ')}
What they look for: ${college.whatTheyLookFor.join(', ')}
Culture: ${college.culture}

NOTE: Understand these values to write stories that naturally align, but DO NOT explicitly mention them

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

1. WORD LIMIT: Aim for ${targetWords}-${maxWords} words (cleanup will trim to final limit). COUNT CAREFULLY.

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

5. FOCUS ON THE PAST: Write about experiences that ALREADY happened
   - ❌ WRONG: "At ${college.name}, I'll work with Professor X on..."
   - ✅ RIGHT: "At 3 AM I got a text. 'I trusted you.' My system had failed."
   - Show your character through past actions, not future promises

6. ONE STORY ONLY: Pick ONE activity/experience and go deep
   - ❌ WRONG: "I did robotics, then debate, then volunteering, then..."
   - ✅ RIGHT: "I spent three months debugging this one algorithm. Here's what happened."
   - Focus on depth over breadth - one story reveals more than five summaries

7. NO COLLEGE SPAM: Do NOT mention college name, professors, programs, courses
   - College name allowed ONLY in final sentence as natural connection
   - Don't write "I want to work with Professor X" or "I'll take EECS 498"
   - Show qualities that align with college values through past stories

8. UNIQUENESS: Make this essay impossible for any other student to write
   - Include hyper-specific details only YOU would know
   - Tell a story only YOU can tell

9. IF PROMPT MENTIONS "OBJECTIVES" OR "HOPES TO ACHIEVE":
   This is a TRAP. DO NOT write about future plans. Instead:
   - Write about PAST experiences that show what you value
   - Example: Prompt asks "objectives" → Write about past failure that taught you what matters
   - Example: Prompt asks "what you hope to achieve" → Write about past achievement and what it revealed
   - Let your past actions speak louder than future promises
   - The admissions officer will infer your objectives from your story

COUNT YOUR WORDS BEFORE RESPONDING. If over ${wordLimit}, CUT content IMMEDIATELY.

🚨 YOUR RESPONSE MUST BE:
- The complete essay (${targetWords}-${maxWords} words - will be trimmed by cleanup)
- Starting with the opening sentence (a specific moment in time)
- NO meta-commentary like "Here's the essay..." or "I notice that..."
- NO feedback or questions
- JUST THE ESSAY ITSELF
- Focus on ONE deep story from your PAST (not future plans)

Begin writing the essay NOW. First sentence:`;
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

        // POST-PROCESSING: Remove college spam if AI ignored instructions
        essay = cleanupCollegeSpam(essay, college.name, wordLimit);
        words = essay.split(/\s+/).filter(w => w.length > 0);

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

/**
 * LIGHTWEIGHT CLEANUP: Remove college spam if AI ignored instructions
 * Less aggressive than generate-authentic's cleanup
 */
function cleanupCollegeSpam(essay: string, collegeName: string, wordLimit: number): string {
    let cleaned = essay;

    // Build college name variations
    const collegePatterns = [
        collegeName,
        collegeName.replace(/^U/, 'University of '),
        collegeName.replace(/^U/, ''),
    ];
    if (collegeName === 'UMich') collegePatterns.push('Michigan', 'University of Michigan', 'U-M', 'UM');
    if (collegeName === 'MIT') collegePatterns.push('Massachusetts Institute of Technology');
    if (collegeName === 'CMU') collegePatterns.push('Carnegie Mellon', 'Carnegie Mellon University');
    if (collegeName === 'Stanford') collegePatterns.push('Stanford University');

    console.log(`🔍 Checking for college spam: ${collegePatterns.join(', ')}`);

    // Split into paragraphs
    const paragraphs = cleaned.split('\n\n').filter(p => p.trim().length > 0);
    const lastParagraphIndex = paragraphs.length - 1;

    // RULE 1: Remove paragraphs with college spam (EXCEPT last paragraph which can have one mention)
    const filteredParagraphs = paragraphs.filter((para, index) => {
        const isLastParagraph = index === lastParagraphIndex;

        // Check for college name mentions
        const collegeCount = collegePatterns.reduce((count, pattern) => {
            const regex = new RegExp(pattern, 'gi');
            return count + (para.match(regex) || []).length;
        }, 0);

        // Check for professor/program mentions
        const hasProfessor = /Professor\s+[A-Z][a-z]+|Dr\.\s+[A-Z][a-z]+/i.test(para);
        const hasProgram = /Lab\b|EECS\s+\d+|TechArb|Multidisciplinary Design/i.test(para);

        // Check for pure future vision
        const futureVisionCount = (para.match(/At\s+\w+,?\s+I(?:'ll|will)|I(?:'ll|will)\s+(?:work|study|contribute|pursue|learn)|Through\s+courses|partnerships\s+with/gi) || []).length;
        const isPureFutureVision = futureVisionCount >= 2;

        // Keep last paragraph even if it has ONE college mention (natural ending)
        if (isLastParagraph && collegeCount <= 1 && !hasProfessor && !hasProgram && futureVisionCount <= 1) {
            return true;
        }

        // Remove if has spam
        if (collegeCount > 0 || hasProfessor || hasProgram || isPureFutureVision) {
            console.log(`🗑️  Removed paragraph ${index + 1} (${collegeCount > 0 ? 'COLLEGE' : hasProfessor ? 'PROFESSOR' : hasProgram ? 'PROGRAM' : 'FUTURE VISION'})`);
            console.log(`   Preview: "${para.substring(0, 100)}..."`);
            return false;
        }

        return true;
    });

    cleaned = filteredParagraphs.join('\n\n');

    // RULE 2: Remove sentences with obvious essay language
    const essayLanguage = [
        /This experience (completely )?changed[^.]*\./gi,
        /I learned that[^.]*\./gi,
        /Looking back[^.]*\./gi,
        /Throughout my journey[^.]*\./gi,
    ];

    essayLanguage.forEach(pattern => {
        cleaned = cleaned.replace(pattern, '');
    });

    // RULE 3: Check word count
    const currentWords = cleaned.split(/\s+/).filter(w => w.length > 0).length;
    const targetMin = Math.floor(wordLimit * 0.85); // Updated to 85%
    const targetRange = Math.floor(wordLimit * 0.95); // Good range is 95-105%

    if (currentWords < targetMin) {
        console.log(`⚠️  Cleanup removed too much (${currentWords}/${wordLimit} words = ${Math.round(currentWords/wordLimit*100)}%). Consider regenerating.`);
    } else if (currentWords >= targetMin && currentWords < targetRange) {
        console.log(`⚡ Word count acceptable but on lower end (${currentWords}/${wordLimit} words = ${Math.round(currentWords/wordLimit*100)}%)`);
    }

    // Clean up whitespace
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

    console.log(`✅ Cleanup complete: ${cleaned.split(/\s+/).filter(w => w.length > 0).length} words`);

    return cleaned;
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
