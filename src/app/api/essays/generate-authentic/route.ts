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

        // PHASE 4: AGGRESSIVE AI TELL CLEANUP (PROGRAMMATIC)
        console.log('\n📍 Phase 4: AI Tell Cleanup & Validation...');
        const cleanedEssay = aggressiveCleanup(finalEssay.content, college.name, essay.wordLimit);
        const cleanupWarnings = validateAuthenticity(cleanedEssay, college.name);

        if (cleanupWarnings.length > 0) {
            console.log('⚠️ Cleanup warnings:', cleanupWarnings);
        }

        // Recalculate scores after cleanup
        const finalWordCount = cleanedEssay.split(/\s+/).length;
        const wordCountAccuracy = Math.round((finalWordCount / essay.wordLimit) * 100);

        // Penalize score if word count is off
        let adjustedScore = finalEssay.scores.overall;
        if (wordCountAccuracy < 95 || wordCountAccuracy > 105) {
            adjustedScore = Math.round(adjustedScore * 0.95);
            console.log(`⚠️ Word count penalty: ${wordCountAccuracy}% of target (${finalWordCount}/${essay.wordLimit})`);
        }

        console.log(`✅ Cleanup complete: ${finalWordCount} words, Score: ${adjustedScore}%`);

        return NextResponse.json({
            success: true,
            essay: cleanedEssay,
            wordCount: finalWordCount,
            scores: {
                ...finalEssay.scores,
                overall: adjustedScore,
            },
            metadata: {
                ...finalEssay.metadata,
                phasesDuration: {
                    excavation: excavationDuration,
                    shaping: shapingDuration,
                    total: excavationDuration + shapingDuration,
                },
                systemVersion: '2.1-aggressive-cleanup',
                efficiencyGain: '33% faster (2 API calls vs 3)',
                rawStoryLength: rawStory.wordCount,
                compressionRatio: (rawStory.wordCount / finalEssay.wordCount).toFixed(2),
                cleanupApplied: true,
                cleanupWarnings,
                wordCountAccuracy: `${wordCountAccuracy}%`,
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

⚠️ CRITICAL: Even if the prompt asks "how you will contribute" or "your future plans", IGNORE THAT PART.
Write ONLY about the past. Tell a story that happened. NO future vision. NO college mentions.
The admissions office wants to see WHO YOU ARE through a past story, not hear what you'll do for them.

WORD TARGET: ${essay.wordLimit} words (aim for 100-110% of limit - shaping phase will trim to exact limit)

YOUR MISSION - DO BOTH:
1. DISCOVER what's genuinely interesting about this student (pivots, contradictions, surprises, omissions)
2. EXCAVATE a raw story around the most compelling discovery

CRITICAL DISCOVERY QUESTIONS TO EXPLORE:
- What changed? (Pivots, mind changes, unexpected shifts)
- What contradicts? (Resume vs reality, expected vs actual)
- What's surprising? (Non-linear paths, unusual combinations)
- What's missing? (What they DIDN'T do that you'd expect)
- What reveals values? (Chose X over Y - why?)

THEN WRITE RAW STORY - CRITICAL CONSTRAINTS:

1. **ONE STORY ONLY**: Pick ONE activity, ONE moment, ONE experience. Go DEEP not WIDE.
   - BAD: "I did quantum computing, then F1 platform, then community work..."
   - GOOD: "I spent three months on this one algorithm. Here's what happened."

2. **NO COLLEGE MENTION**: Do NOT mention the college name anywhere in the story. Not even once.
   - This is a story about YOUR past, not your future at their school

3. **NO ESSAY STRUCTURE**:
   - NO hook-crisis-resolution arc
   - NO markdown headers (##, ###)
   - NO distinct sections with transitions
   - Just tell what happened, linearly, like texting a friend

4. **NO FUTURE VISION**:
   - Story ends when it ends, not with "and this is why I want to..."
   - NO "I want to contribute/pursue/develop/enrich" language
   - End mid-thought or mid-story if that's authentic

5. **VOICE**: Raw, conversational, unpolished
   - Use numbers ONLY when they matter to the story
   - Include mistakes, confusion, dead ends
   - "I thought X but actually Y"

ABSOLUTELY FORBIDDEN (WILL FAIL IF PRESENT):
- Markdown headers (##, ###) or section titles
- Essay language: "This experience taught me", "Throughout my journey", "I learned that"
- College name or any mention of applying to college
- Forced transitions ("Meanwhile", "As a result", "Looking back", "Now when I")
- Multiple activities listed (pick ONE story only)
- Ending with future plans/vision ("I want to", "I will", "pursuing")
- Starting with philosophical statements
- More than 4 paragraph breaks (should flow as 3-5 paragraphs maximum)

VOICE EXAMPLES (what it SHOULD sound like):
- "I spent three weeks on this algorithm. Thought I had it. Then Professor Koutra said 'your proof is wrong' and I realized I'd been faking understanding."
- "At 3 AM I got a text. Just three words: 'I trusted you.' My system recommended 50,000 winter coats. In July."
- "The Romanian kid next to me won gold. He just drew diagrams. No fancy code. I went to his room that night. 'How?'"

OUTPUT: ${Math.floor(essay.wordLimit * 1.0)}-${Math.floor(essay.wordLimit * 1.1)} words of raw narrative. NO sections, NO headers, ONE flowing story.`;

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

CRITICAL: This essay must NOT sound AI-generated. Admissions officers can detect formulaic essays immediately.

PRESERVE AT ALL COSTS:
- The authentic voice (don't make it sound "smarter" or more formal)
- Specific details that make it real (times, quotes, specific numbers that matter)
- Moments of confusion, failure, uncertainty
- Natural flow of thought
- Conversational tone

MANDATORY REMOVALS (these ALWAYS indicate AI writing):
1. ALL markdown headers (##, ###, etc.) - Remove completely, no section titles
2. Future vision paragraphs - CRITICAL: Remove ANY paragraph mentioning:
   - "This is why I want to attend X"
   - "X will help me achieve..."
   - "I want to contribute..."
   - "developing solutions", "enrich the future", "pursue X at [college]"
   - ANY forward-looking statement about college or career goals
   - Rule: If last 30% of essay mentions college name OR future goals, DELETE that entire section
3. Essay language phrases: "Let me be honest", "Here's what X", "The truth is", "This taught me that", "Throughout my journey"
4. Formulaic conclusions - NO wrapping up or summarizing at the end. Essay should END mid-story or mid-thought
5. College name-dropping - If college name appears ANYWHERE in last 30% of essay, remove entire paragraph containing it
6. Section-based structure - Should flow as ONE continuous narrative, not sections
7. Multiple activity listing - If essay mentions 3+ different activities, it's too broad. Focus on ONE story only.

WHAT YOU CAN ADJUST:
1. Trim to EXACTLY word limit (keep last complete sentence, no mid-sentence cuts)
2. Fix obvious grammar errors (but keep natural sentence structure)
3. Remove paragraph breaks between short sections (max 3-4 paragraph breaks total)
4. Remove any "transitions" between thoughts (let it jump naturally)

WHAT YOU ABSOLUTELY CANNOT DO:
- Add ANY mention of the college unless it's already in the raw story
- Add a "vision" section or conclusion paragraph
- Make it sound more "essay-like" or polished
- Add transitions that don't exist in raw story
- Add formulaic endings

WORD LIMIT: ${essay.wordLimit} words (strict - must hit 95-100% of limit)

EXAMPLES OF BAD VS GOOD ENDINGS:

❌ BAD (sounds AI-generated):
"This experience taught me that effective leadership means combining technical innovation with human understanding. At Michigan, I want to contribute to developing solutions that enrich the future through the Multidisciplinary Design Program and Professor X's lab, where I can apply these lessons to real-world challenges."

✅ GOOD (authentic):
"The inventory manager still uses my system. Last week she texted me: 'Your algorithm said 200 units. I ordered 150 anyway. The supplier was late again.' She was right. I texted back: 'Next version, you train the algorithm on supplier reliability.' She replied with a thumbs up emoji."

❌ BAD (multiple activities):
"My quantum optimization work taught me about real-world constraints. The F1 platform showed me prediction challenges. The community program demonstrated AI's social impact. Now I understand how to build technology that serves people."

✅ GOOD (one deep story):
"I spent three months debugging that Black Friday crash. Turns out the problem wasn't the quantum computing or the fancy algorithms. It was that I never asked the inventory manager what she actually needed. I just assumed I knew better."

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
 * AGGRESSIVE CLEANUP: Programmatically remove AI tells
 * This runs AFTER Claude shaping to forcibly remove patterns Claude keeps including
 */
function aggressiveCleanup(essay: string, collegeName: string, wordLimit: number): string {
    let cleaned = essay;

    // Build comprehensive college name patterns (e.g., "UMich" -> also match "Michigan", "University of Michigan")
    const collegePatterns = [
        collegeName,
        collegeName.replace(/^U/, 'University of '), // UMich -> University of Mich
        collegeName.replace(/^U/, ''), // UMich -> Mich
    ];
    if (collegeName === 'UMich') collegePatterns.push('Michigan', 'University of Michigan');
    if (collegeName === 'MIT') collegePatterns.push('Massachusetts Institute of Technology');
    if (collegeName === 'CMU') collegePatterns.push('Carnegie Mellon');
    // Add more as needed

    console.log(`🔍 Checking for college names: ${collegePatterns.join(', ')}`);

    // Split into paragraphs
    const paragraphs = cleaned.split('\n\n').filter(p => p.trim().length > 0);
    const essayLength = paragraphs.length;
    const last30PercentStart = Math.floor(essayLength * 0.7); // Last 30%

    console.log(`📊 Essay has ${essayLength} paragraphs, last 30% starts at paragraph ${last30PercentStart + 1}`);

    // RULE 1: Remove last 30% if it mentions college name OR future vision
    const filteredParagraphs = paragraphs.filter((para, index) => {
        if (index >= last30PercentStart) {
            // Check if paragraph mentions ANY college name variation
            const mentionsCollege = collegePatterns.some(pattern =>
                para.includes(pattern) || para.toLowerCase().includes(pattern.toLowerCase())
            );

            // Check for future-looking phrases
            const hasFutureVision =
                mentionsCollege ||
                /want to contribute|will help me|I want to|I'm excited to|looking forward to/i.test(para) ||
                /pursuing|enrich the future|developing solutions|future plans/i.test(para) ||
                /through \w+ mission|this approach.*how I want|can contribute to/i.test(para) ||
                /Professor \w+|Multidisciplinary|Design Program|research (with|in)/i.test(para) || // Specific lab/program mentions
                /At \w+,?\s+I/i.test(para); // "At Michigan, I..." pattern

            if (hasFutureVision || mentionsCollege) {
                console.log(`🗑️ REMOVED paragraph ${index + 1}/${essayLength} (${mentionsCollege ? 'college mention' : 'future vision'})`);
                console.log(`   Preview: "${para.substring(0, 100)}..."`);
                return false;
            }
        }
        return true;
    });

    cleaned = filteredParagraphs.join('\n\n');

    console.log(`📝 After paragraph filtering: ${cleaned.split('\n\n').length} paragraphs remain`);

    // RULE 2: Remove entire sentences with essay language (not just phrases)
    const essayPhrases = [
        /This experience (completely )?changed (how|the way) I think[^.]*\./gi,
        /This shift influenced everything[^.]*\./gi,
        /I learned that[^.]*\./gi,
        /Now when I approach[^.]*\./gi,
        /This is what .+ means to me[^.]*\./gi,
        /Throughout my journey[^.]*\./gi,
        /Let me be honest[^.]*\./gi,
        /The truth is[^.]*\./gi,
        /Here's what[^.]*\./gi,
        /Looking back[^.]*\./gi,
        /After .+, I realized that[^.]*\./gi,
        /true (technical )?leadership means[^.]*\./gi,
        /true citizenship means[^.]*\./gi,
    ];

    let removalCount = 0;
    essayPhrases.forEach(pattern => {
        const matches = cleaned.match(pattern);
        if (matches) {
            console.log(`🗑️ Removing ${matches.length} sentence(s) with essay language: "${matches[0].substring(0, 80)}..."`);
            removalCount += matches.length;
        }
        cleaned = cleaned.replace(pattern, '');
    });

    if (removalCount > 0) {
        console.log(`✂️ Removed ${removalCount} essay language sentences`);
    }

    // RULE 3: Remove markdown headers
    cleaned = cleaned.replace(/^#+\s+.+$/gm, '');

    // RULE 4: Clean up excessive paragraph breaks (max 4 breaks = 5 paragraphs)
    const finalParagraphs = cleaned.split('\n\n').filter(p => p.trim().length > 0);
    if (finalParagraphs.length > 5) {
        console.log(`📝 Reducing paragraph breaks from ${finalParagraphs.length} to 5`);
        // Keep first 2, last 1, distribute rest evenly
        const kept = [
            finalParagraphs[0],
            finalParagraphs[1],
            finalParagraphs[Math.floor(finalParagraphs.length / 2)],
            finalParagraphs[Math.floor(finalParagraphs.length * 0.75)],
            finalParagraphs[finalParagraphs.length - 1],
        ];
        cleaned = kept.join('\n\n');
    }

    // RULE 5: If essay is still too short after cleanup, pad warning
    const currentWords = cleaned.split(/\s+/).length;
    const targetMin = Math.floor(wordLimit * 0.95);
    const targetMax = Math.floor(wordLimit * 1.05);

    if (currentWords < targetMin) {
        console.log(`⚠️ WARNING: Essay only ${currentWords} words (target: ${targetMin}-${targetMax})`);
    } else if (currentWords > targetMax) {
        console.log(`✂️ Trimming from ${currentWords} to ${targetMax} words`);
        const words = cleaned.split(/\s+/);
        cleaned = words.slice(0, targetMax).join(' ');
        // End at last complete sentence
        const lastPeriod = cleaned.lastIndexOf('.');
        if (lastPeriod > targetMax * 0.9) {
            cleaned = cleaned.substring(0, lastPeriod + 1);
        }
    }

    // Clean up extra whitespace
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

    // Final check: Count how many times "system", "program", "project", "platform" appear
    const activityMentions = (cleaned.match(/\b(platform|system|program|project|research)\b/gi) || []).length;
    if (activityMentions >= 5) {
        console.log(`⚠️ WARNING: Essay still mentions ${activityMentions} different projects (too scattered)`);
    }

    console.log(`✅ Cleanup complete: ${cleaned.split(/\s+/).length} words, ${cleaned.split('\n\n').length} paragraphs`);

    return cleaned;
}

/**
 * VALIDATE AUTHENTICITY: Check for remaining AI tells
 */
function validateAuthenticity(essay: string, collegeName: string): string[] {
    const warnings: string[] = [];

    // Check 1: College name in essay
    if (essay.includes(collegeName)) {
        const position = essay.indexOf(collegeName);
        const percentThrough = (position / essay.length) * 100;
        warnings.push(`College name appears at ${Math.round(percentThrough)}% through essay`);
    }

    // Check 2: Multiple activities mentioned
    const activityCount = (essay.match(/\b(platform|system|program|project|research)\b/gi) || []).length;
    if (activityCount >= 4) {
        warnings.push(`Essay mentions ${activityCount} different projects (may be too scattered)`);
    }

    // Check 3: Word count vs target
    const wordCount = essay.split(/\s+/).length;

    // Check 4: Essay language remaining
    const essayLanguagePatterns = [
        'I learned',
        'taught me',
        'this experience',
        'looking back',
        'throughout',
    ];
    const foundPatterns = essayLanguagePatterns.filter(pattern =>
        essay.toLowerCase().includes(pattern.toLowerCase())
    );
    if (foundPatterns.length > 0) {
        warnings.push(`Essay language found: ${foundPatterns.join(', ')}`);
    }

    // Check 5: Paragraph structure
    const paragraphCount = essay.split('\n\n').filter(p => p.trim().length > 0).length;
    if (paragraphCount > 5) {
        warnings.push(`${paragraphCount} paragraphs (should be ≤5 for natural flow)`);
    }

    return warnings;
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
