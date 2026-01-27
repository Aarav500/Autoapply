import { NextRequest, NextResponse } from 'next/server';

/**
 * AUTHENTIC ESSAY GENERATION SYSTEM
 *
 * Philosophy: Discovery Over Direction
 * - 3-phase pipeline: Discovery → Excavation → Shaping
 * - Minimal instructions to preserve authenticity
 * - Focus on one deep story, not surface-level activity listing
 *
 * Quality Scoring: >100% possible
 * - Memorability (30%): Would AO remember this tomorrow?
 * - Authenticity (30%): Could ONLY this student write this?
 * - Insight (20%): Reveals actual thinking?
 * - Growth (10%): Real change, not manufactured?
 * - Risk (10%): Vulnerable/unexpected?
 */

interface Activity {
    id: string;
    name: string;
    role: string;
    organization: string;
    description: string;
    hoursPerWeek: number;
    weeksPerYear: number;
    startDate: string;
    endDate?: string;
    isCurrent: boolean;
}

interface Achievement {
    id: string;
    title: string;
    organization: string;
    date: string;
    description?: string;
}

interface Transcript {
    gpa: number;
    totalCredits: number;
    courses: {
        name: string;
        grade: string;
        credits: number;
        semester: string;
        learnings?: string;
    }[];
}

interface UserProfile {
    name: string;
    major: string;
    gpa: number;
    values?: string[];
    interests?: string[];
    background?: string;
}

interface College {
    id: string;
    name: string;
    fullName: string;
    values: string[];
    culture: string;
    whatTheyLookFor: string[];
}

interface Essay {
    id: string;
    title: string;
    prompt: string;
    wordLimit: number;
}

interface DiscoveryQuestion {
    question: string;
    rationale: string;
    category: 'pivot' | 'contradiction' | 'surprise' | 'omission' | 'values';
}

interface RawStory {
    narrative: string;
    wordCount: number;
    keyMoments: string[];
    authenticity_notes: string[];
}

interface FinalEssay {
    content: string;
    wordCount: number;
    scores: {
        memorability: number;
        authenticity: number;
        insight: number;
        growth: number;
        risk: number;
        overall: number;
    };
    metadata: {
        phasesDuration: {
            excavation: number;
            shaping: number;
        };
        keyStrengths: string[];
        warnings: string[];
    };
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            college,
            essay,
            activities,
            achievements,
            transcript,
            userProfile
        } = body;

        // Validate inputs
        if (!college || !essay || !activities || !userProfile) {
            return NextResponse.json(
                { error: 'Missing required fields: college, essay, activities, userProfile' },
                { status: 400 }
            );
        }

        const apiKey = process.env.CLAUDE_API_KEY || process.env.NEXT_PUBLIC_CLAUDE_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { error: 'Claude API key not configured' },
                { status: 500 }
            );
        }

        console.log(`\n🎯 Starting Authentic Essay Generation for ${college.name}`);
        console.log(`📝 Essay: "${essay.title}" (${essay.wordLimit} words)`);

        // PHASE 1: DISCOVERY + EXCAVATION (COMBINED FOR EFFICIENCY)
        console.log('\n📍 Phase 1: Discovery + Excavation (Combined)...');
        const excavationStart = Date.now();
        const rawStory = await runCombinedDiscoveryExcavation(
            activities,
            achievements,
            transcript,
            userProfile,
            essay,
            apiKey
        );
        const excavationDuration = Date.now() - excavationStart;
        console.log(`✅ Story excavation complete (${excavationDuration}ms): ${rawStory.wordCount} words`);

        // PHASE 3: MINIMAL SHAPING
        console.log('\n📍 Phase 3: Minimal Shaping...');
        const shapingStart = Date.now();
        const finalEssay = await runShapingPhase(
            rawStory,
            college,
            essay,
            apiKey
        );
        const shapingDuration = Date.now() - shapingStart;
        console.log(`✅ Shaping complete (${shapingDuration}ms): ${finalEssay.wordCount} words`);
        console.log(`🎯 Overall Score: ${finalEssay.scores.overall}%`);

        return NextResponse.json({
            success: true,
            essay: finalEssay.content,
            wordCount: finalEssay.wordCount,
            scores: finalEssay.scores,
            metadata: {
                ...finalEssay.metadata,
                phasesDuration: {
                    excavation: excavationDuration,
                    shaping: shapingDuration,
                    total: excavationDuration + shapingDuration,
                },
                systemVersion: '2.0-optimized',
                efficiencyGain: '33% faster (2 API calls vs 3)',
                rawStoryLength: rawStory.wordCount,
                compressionRatio: (rawStory.wordCount / finalEssay.wordCount).toFixed(2),
            },
        });

    } catch (error) {
        console.error('Essay generation error:', error);
        return NextResponse.json(
            { error: 'Failed to generate essay', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}

/**
 * PHASE 1: COMBINED DISCOVERY + EXCAVATION (OPTIMIZED)
 * Find and excavate authentic stories in a single API call for efficiency
 */
async function runCombinedDiscoveryExcavation(
    activities: Activity[],
    achievements: Achievement[],
    transcript: Transcript,
    userProfile: UserProfile,
    essay: Essay,
    apiKey: string
): Promise<RawStory> {

    // Sort activities by total hours to find what student invested in most
    const sortedActivities = activities
        .map(a => ({
            ...a,
            totalHours: (a.hoursPerWeek || 0) * (a.weeksPerYear || 0),
        }))
        .sort((a, b) => b.totalHours - a.totalHours);

    // Build concise context
    const activitiesSummary = sortedActivities.slice(0, 10).map(a =>
        `- ${a.name} (${a.role}, ${a.totalHours} hrs): ${a.description}`
    ).join('\n');

    const achievementsSummary = achievements.slice(0, 10).map(a =>
        `- ${a.title} (${a.date}): ${a.description || ''}`
    ).join('\n');

    const systemPrompt = `You are writing an authentic college essay by excavating a student's real story.

ESSAY PROMPT: "${essay.prompt}"
WORD TARGET: ${essay.wordLimit} words (aim for 80-90% of limit in raw form)

YOUR MISSION - DO BOTH:
1. DISCOVER what's genuinely interesting about this student (pivots, contradictions, surprises, omissions)
2. EXCAVATE a raw story around the most compelling discovery

CRITICAL DISCOVERY QUESTIONS TO EXPLORE:
- What changed? (Pivots, mind changes, unexpected shifts)
- What contradicts? (Resume vs reality, expected vs actual)
- What's surprising? (Non-linear paths, unusual combinations)
- What's missing? (What they DIDN'T do that you'd expect)
- What reveals values? (Chose X over Y - why?)

THEN WRITE RAW STORY:
- Focus on ONE deep story (not surface-level activity listing)
- NO essay structure (no hook, no arc, no vision)
- Just tell what happened, what you thought, what changed
- Include mistakes, confusion, dead ends
- Use numbers ONLY when they matter to the story
- Write like explaining to a friend, not an admissions officer

FORBIDDEN:
- Essay language: "This experience taught me...", "Throughout my journey..."
- Forced transitions or bridge sentences
- Artificial narrative structure
- Admissions pandering
- Listing multiple activities superficially
- Ending with future vision paragraph

OUTPUT: ${Math.floor(essay.wordLimit * 0.85)}-${Math.floor(essay.wordLimit * 0.95)} words of raw, unstructured narrative focused on one compelling story.`;

    const userPrompt = `STUDENT DATA:

ACTIVITIES (top 10 by time invested):
${activitiesSummary}

ACHIEVEMENTS:
${achievementsSummary}

PROFILE:
Major: ${userProfile.major || 'Not specified'}
GPA: ${transcript?.gpa || userProfile.gpa || 'Not specified'}
${userProfile.values ? `Values: ${userProfile.values.join(', ')}` : ''}
${userProfile.background ? `Background: ${userProfile.background}` : ''}

Find the most compelling story in this data and write it authentically.`;

    const narrative = await callClaude(systemPrompt, userPrompt, apiKey, 0.8);

    const wordCount = narrative.split(/\s+/).length;

    return {
        narrative,
        wordCount,
        keyMoments: extractKeyMoments(narrative),
        authenticity_notes: [
            `Generated ${wordCount} words in combined discovery+excavation`,
            `Target: ${essay.wordLimit} words`,
            `Efficiency: Single API call (vs 2 in old system)`
        ],
    };
}

/**
 * PHASE 1 (OLD): DEEP DISCOVERY - DEPRECATED
 * Kept for reference but no longer used
 */
async function runDiscoveryPhase_DEPRECATED(
    activities: Activity[],
    achievements: Achievement[],
    transcript: Transcript,
    userProfile: UserProfile,
    apiKey: string
): Promise<DiscoveryQuestion[]> {

    // Sort activities by total hours to find what student invested in most
    const sortedActivities = activities
        .map(a => ({
            ...a,
            totalHours: a.hoursPerWeek * a.weeksPerYear,
        }))
        .sort((a, b) => b.totalHours - a.totalHours);

    // Build context for Claude
    const activitiesSummary = sortedActivities.slice(0, 10).map(a =>
        `- ${a.name} (${a.role}): ${a.totalHours} hours - ${a.description}`
    ).join('\n');

    const achievementsSummary = achievements.map(a =>
        `- ${a.title} (${a.organization}, ${a.date})${a.description ? ': ' + a.description : ''}`
    ).join('\n');

    const transcriptSummary = `GPA: ${transcript.gpa}\nTop courses: ${
        transcript.courses
            .sort((a, b) => (b.grade > a.grade ? 1 : -1))
            .slice(0, 5)
            .map(c => `${c.name} (${c.grade})`)
            .join(', ')
    }`;

    const systemPrompt = `You are analyzing a student's profile to find authentic stories worth telling.

YOUR GOAL: Find what's genuinely interesting, surprising, or revealing about this student.

LOOK FOR:
1. PIVOTS - What changed? Mind changes, unexpected shifts in direction
2. CONTRADICTIONS - Resume vs reality, expected vs actual outcomes
3. SURPRISES - Non-linear paths, unusual combinations, unexpected choices
4. OMISSIONS - What they DIDN'T do that you'd expect given their profile
5. VALUE REVEALS - Decisions that show what they truly care about (chose X over Y - why?)

DO NOT generate generic questions like "Tell me about your passion" or "What's your greatest achievement?"
Instead, find SPECIFIC tensions, contradictions, or surprises in THIS student's actual data.

FORBIDDEN:
- Generic self-reflection questions
- Questions that could apply to any student
- Questions about "passion" or "journey"
- Essay-sounding language

OUTPUT FORMAT:
Return ONLY a JSON array of 3-5 discovery questions. Each question must be specific to this student's actual data.

Example of GOOD questions:
"You spent 400 hours on ML research but then pivoted to teaching. What made you realize research wasn't enough?"
"Your transcript shows A+ in advanced ML but C in basic CS. What happened there?"

Example of BAD questions:
"What is your greatest passion?" (too generic)
"Tell me about your leadership journey" (could be anyone)`;

    const userPrompt = `STUDENT DATA:

ACTIVITIES (sorted by time invested):
${activitiesSummary}

ACHIEVEMENTS:
${achievementsSummary}

TRANSCRIPT:
${transcriptSummary}

PROFILE:
Major: ${userProfile.major}
GPA: ${userProfile.gpa}
${userProfile.values ? `Values: ${userProfile.values.join(', ')}` : ''}
${userProfile.interests ? `Interests: ${userProfile.interests.join(', ')}` : ''}
${userProfile.background ? `Background: ${userProfile.background}` : ''}

Analyze this data and generate 3-5 discovery questions that would reveal authentic insights specific to THIS student.`;

    const response = await callClaude(systemPrompt, userPrompt, apiKey, 0.7);

    // Parse JSON response
    try {
        const questions = JSON.parse(response);
        return questions.map((q: any) => ({
            question: q.question,
            rationale: q.rationale || '',
            category: q.category || 'values',
        }));
    } catch (parseError) {
        console.error('Failed to parse discovery questions, using fallback');
        // Fallback: extract questions from text
        const questionMatches = response.match(/"([^"]+\?)/g) || [];
        return questionMatches.slice(0, 5).map((q: string) => ({
            question: q.replace(/"/g, ''),
            rationale: 'Auto-extracted',
            category: 'values' as const,
        }));
    }
}

/**
 * PHASE 2: STORY EXCAVATION
 * Generate raw, unstructured narrative
 */
async function runExcavationPhase(
    discoveryQuestions: DiscoveryQuestion[],
    activities: Activity[],
    achievements: Achievement[],
    transcript: Transcript,
    userProfile: UserProfile,
    apiKey: string
): Promise<RawStory> {

    const sortedActivities = activities
        .map(a => ({
            ...a,
            totalHours: a.hoursPerWeek * a.weeksPerYear,
        }))
        .sort((a, b) => b.totalHours - a.totalHours);

    const systemPrompt = `You are writing a raw, unstructured narrative based on a student's authentic experiences.

CRITICAL RULES:
1. Answer the discovery questions honestly using the student's actual data
2. NO essay structure (no hook, no arc, no vision paragraph)
3. Just tell what happened, what you thought, what changed
4. Use numbers ONLY when they matter to the story (not for resume padding)
5. Include mistakes, confusion, dead ends, moments of uncertainty
6. Write like you're explaining to a friend who knows you, not an admissions officer

VOICE:
- Natural, conversational
- Can use contractions naturally (not forced)
- Sentence variety happens naturally (don't force it)
- Some sentences can be fragments if that's how thoughts flow
- Use "I" freely - this is first person

FORBIDDEN COMPLETELY:
- Essay language: "This experience taught me...", "Throughout my journey...", "I learned that..."
- Forced transitions or bridge sentences
- Artificial structure (hook→climax→resolution)
- Admissions pandering or obvious signaling
- Listing activities like a resume
- Saying you're "passionate" or describing your "journey"
- Ending with a vision paragraph about the future

WHAT TO INCLUDE:
- The actual moment something clicked or broke
- What you were thinking at the time (even if wrong)
- Specific details: what someone said, what you saw, what time it was
- Mistakes you made and why you made them
- Confusion, uncertainty, "I don't know" moments
- What you'd do differently now

OUTPUT: 800-1000 words of raw story material. Not an essay. Just the story.`;

    const questionsText = discoveryQuestions.map((q, i) =>
        `${i + 1}. ${q.question}`
    ).join('\n\n');

    const activitiesContext = sortedActivities.slice(0, 8).map(a =>
        `${a.name} (${a.role}, ${a.totalHours} hours): ${a.description}`
    ).join('\n');

    const achievementsContext = achievements.map(a =>
        `${a.title} - ${a.organization} (${a.date})${a.description ? ': ' + a.description : ''}`
    ).join('\n');

    const userPrompt = `DISCOVERY QUESTIONS TO EXPLORE:
${questionsText}

STUDENT DATA FOR CONTEXT:

ACTIVITIES:
${activitiesContext}

ACHIEVEMENTS:
${achievementsContext}

TRANSCRIPT: GPA ${transcript.gpa}, Major: ${userProfile.major}
${transcript.courses.slice(0, 3).map(c => `- ${c.name}: ${c.grade}`).join('\n')}

Write a raw narrative (800-1000 words) that explores these discovery questions using the student's actual experiences. Remember: NO essay structure, NO admissions pandering. Just tell what happened.`;

    const narrative = await callClaude(systemPrompt, userPrompt, apiKey, 0.8);

    const wordCount = narrative.split(/\s+/).length;

    return {
        narrative,
        wordCount,
        keyMoments: extractKeyMoments(narrative),
        authenticity_notes: [
            `Generated ${wordCount} words of raw narrative`,
            `Explored ${discoveryQuestions.length} discovery questions`,
        ],
    };
}

/**
 * PHASE 3: MINIMAL SHAPING
 * Shape for college/word limit WITHOUT losing authenticity
 */
async function runShapingPhase(
    rawStory: RawStory,
    college: College,
    essay: Essay,
    apiKey: string
): Promise<FinalEssay> {

    const systemPrompt = `You are shaping a raw story into a college essay while preserving authenticity.

YOUR MISSION: Make this fit the prompt and word limit WITHOUT making it sound like an AI essay.

PRESERVE AT ALL COSTS:
- The authentic voice (don't make it sound "smarter" or more formal)
- Specific details that make it real
- Moments of confusion, failure, uncertainty
- Natural flow of thought
- Conversational tone

WHAT YOU CAN ADJUST:
1. Trim to word limit (keep last complete sentence, no mid-sentence cuts)
2. Fix obvious grammar errors (but keep natural sentence structure)
3. Connect to college values IF it fits naturally (don't force it)
4. Remove any AI clichés that slipped in ("throughout my journey", "this taught me", etc.)
5. Light paragraph breaks for readability

WHAT YOU CANNOT DO:
- Add fake college research or name-dropping
- Force a "vision" section about the future
- Change the voice to sound more "essay-like"
- Add transitions that don't exist in the raw story
- Make up details or experiences
- Add a formulaic conclusion

COLLEGE FIT:
College: ${college.name}
Values: ${college.values.join(', ')}
Culture: ${college.culture}
What they look for: ${college.whatTheyLookFor.join(', ')}

Only mention college-specific details if they NATURALLY connect to the story. Don't force it.

WORD LIMIT: ${essay.wordLimit} words (strict - trim to last complete sentence if needed)

OUTPUT FORMAT:
{
  "essay": "the shaped essay text",
  "wordCount": actual word count,
  "scores": {
    "memorability": 0-100 (would an AO remember this tomorrow?),
    "authenticity": 0-100 (could ONLY this student write this?),
    "insight": 0-100 (reveals actual thinking?),
    "growth": 0-100 (real change, not manufactured?),
    "risk": 0-100 (vulnerable/unexpected?)
  },
  "keyStrengths": ["strength 1", "strength 2"],
  "warnings": ["warning 1 if any"]
}`;

    const userPrompt = `PROMPT: ${essay.prompt}

WORD LIMIT: ${essay.wordLimit}

RAW STORY (${rawStory.wordCount} words):
${rawStory.narrative}

Shape this for the prompt and word limit while preserving authenticity. Return JSON only.`;

    const response = await callClaude(systemPrompt, userPrompt, apiKey, 0.6);

    // Parse JSON response
    try {
        const result = JSON.parse(response);

        const scores = result.scores || {};
        const overall = Math.round(
            (scores.memorability || 70) * 0.30 +
            (scores.authenticity || 70) * 0.30 +
            (scores.insight || 70) * 0.20 +
            (scores.growth || 70) * 0.10 +
            (scores.risk || 70) * 0.10
        );

        return {
            content: result.essay || result.content || response,
            wordCount: result.wordCount || result.essay?.split(/\s+/).length || 0,
            scores: {
                memorability: scores.memorability || 70,
                authenticity: scores.authenticity || 70,
                insight: scores.insight || 70,
                growth: scores.growth || 70,
                risk: scores.risk || 70,
                overall,
            },
            metadata: {
                phasesDuration: { excavation: 0, shaping: 0 }, // Will be filled by caller
                keyStrengths: result.keyStrengths || ['Authentic voice', 'Specific details'],
                warnings: result.warnings || [],
            },
        };
    } catch (parseError) {
        console.error('Failed to parse shaping result, using raw response');
        const wordCount = response.split(/\s+/).length;
        return {
            content: response,
            wordCount,
            scores: {
                memorability: 75,
                authenticity: 75,
                insight: 70,
                growth: 70,
                risk: 65,
                overall: 72,
            },
            metadata: {
                phasesDuration: { excavation: 0, shaping: 0 },
                keyStrengths: ['Generated essay'],
                warnings: ['Failed to parse structured output'],
            },
        };
    }
}

/**
 * Call Claude API
 */
async function callClaude(
    systemPrompt: string,
    userPrompt: string,
    apiKey: string,
    temperature: number = 0.7
): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4000,
            temperature,
            system: systemPrompt,
            messages: [
                {
                    role: 'user',
                    content: userPrompt,
                },
            ],
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Claude API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.content[0].text;
}

/**
 * Extract key moments from narrative
 */
function extractKeyMoments(narrative: string): string[] {
    // Simple extraction: look for sentences with time markers, quotes, or strong verbs
    const sentences = narrative.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const keyMoments: string[] = [];

    for (const sentence of sentences) {
        const s = sentence.trim();
        // Look for: times, quotes, "I realized", specific numbers, names
        if (
            /\d{1,2}:\d{2}/.test(s) || // time
            /["']/.test(s) || // quote
            /(realized|discovered|understood|learned|changed)/i.test(s) || // insight
            /\b\d+[,.]?\d*\b/.test(s) // specific numbers
        ) {
            keyMoments.push(s);
            if (keyMoments.length >= 5) break;
        }
    }

    return keyMoments;
}
