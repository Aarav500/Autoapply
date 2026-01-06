// ============================================
// MULTI-MODEL AI ENGINE
// Supports Claude (Anthropic), Gemini (Google), and OpenAI
// ============================================

// Types
export type AIProvider = 'claude' | 'gemini' | 'openai';

export interface AIConfig {
    provider: AIProvider;
    apiKey: string;
    model?: string;
}

export interface EssayGenerationRequest {
    prompt: string;
    college: {
        name: string;
        fullName?: string;
        values: string[];
        whatTheyLookFor: string[];
        culture: string;
        notablePrograms: string[];
        // NEW: Enhanced research data
        motto?: string;
        famousAlumni?: string[];
        uniqueFeatures?: string[];
        campusVibe?: string;
        recentNews?: string[];
        studentLife?: string;
    };
    activities: {
        name: string;
        description: string;
        impact: string;
    }[];
    wordLimit: number;
    tone?: 'casual' | 'formal' | 'passionate' | 'confident' | 'reflective';
    previousDraft?: string;
}

// ============================================
// COLLEGE-SPECIFIC ESSAY PERSONALITIES
// Tailored writing guidance for each school
// ============================================

const COLLEGE_PERSONALITIES: Record<string, {
    tone: string;
    narrativeStyle: string;
    keyThemes: string[];
    sampleOpener: string;
}> = {
    'mit': {
        tone: 'Intellectually curious, slightly quirky, genuine enthusiasm for problem-solving',
        narrativeStyle: 'Show the joy of figuring things out. Embrace "productive weirdness." Be specific about technical interests but make them human.',
        keyThemes: ['intellectual obsession', 'hands-on building', 'collaboration', 'not afraid to fail', 'genuine curiosity'],
        sampleOpener: 'The servo motor whined in protest as I pushed it past its limits for the third time that night...',
    },
    'stanford': {
        tone: 'Optimistic, entrepreneurial, unconventional, future-focused',
        narrativeStyle: 'Think big but stay grounded. Show risk-taking and resilience. Connect personal story to larger impact.',
        keyThemes: ['entrepreneurial spirit', 'positive change', 'unconventional path', 'intellectual vitality', 'taking action'],
        sampleOpener: 'My first startup failed spectacularly. Twelve users, three investors who ghosted, and one very confused mother...',
    },
    'harvard': {
        tone: 'Thoughtful, reflective, morally engaged, intellectually deep',
        narrativeStyle: 'Show leadership through impact on others. Demonstrate moral complexity and growth. Be intellectually honest.',
        keyThemes: ['leadership', 'impact on community', 'intellectual growth', 'ethical reflection', 'diverse perspectives'],
        sampleOpener: 'I stood at the podium, acutely aware that my next words could either unite or divide a room of 200 people...',
    },
    'cmu': {
        tone: 'Creative, technically rigorous, interdisciplinary, hardworking',
        narrativeStyle: 'Blend art and technology. Show the creative process behind technical work. Embrace the grind.',
        keyThemes: ['art meets tech', 'creative problem-solving', 'collaboration', 'passion projects', 'late nights worth it'],
        sampleOpener: 'At 3am, with cold pizza and a stubborn bug, I discovered something beautiful in the chaos of my code...',
    },
    'cornell': {
        tone: 'Community-focused, intellectually curious, down-to-earth',
        narrativeStyle: 'Show fit with specific college within Cornell. Emphasize "any person, any study" ethos. Ground in community.',
        keyThemes: ['community building', 'intellectual breadth', 'specific college fit', 'belonging', 'contribution'],
        sampleOpener: 'The greenhouse was humid, my hands were muddy, and for the first time, botany made perfect sense...',
    },
    'nyu': {
        tone: 'Independent, urban, globally-minded, career-focused',
        narrativeStyle: 'Show how NYC/global experience shapes you. Demonstrate independence and initiative. Be specific about NYU resources.',
        keyThemes: ['urban energy', 'global perspective', 'independence', 'career clarity', 'cultural engagement'],
        sampleOpener: 'The subway was packed, I was running late, and somehow the stranger next to me became my first investor...',
    },
    'umich': {
        tone: 'Ambitious, spirited, collaborative, proud',
        narrativeStyle: 'Embody "Leaders and Best" without being arrogant. Show team impact. Balance excellence with humility.',
        keyThemes: ['leadership', 'excellence', 'community impact', 'Go Blue spirit', 'making a difference'],
        sampleOpener: 'The scoreboard read 0-0, but the real game was happening in the strategy session I\'d organized at midnight...',
    },
    'gatech': {
        tone: 'Innovative, hands-on, problem-solving, spirited',
        narrativeStyle: 'Show practical application of ideas. Emphasize "Progress and Service." Connect to Atlanta\'s tech scene.',
        keyThemes: ['innovation', 'real-world problem solving', 'service', 'technical excellence', 'collaboration'],
        sampleOpener: 'The prototype didn\'t work. But watching it fail taught me exactly how to make the next one succeed...',
    },
};

// ============================================
// ANTI-CLICHÉ RULES
// Phrases that make essays sound AI-generated
// ============================================

const BANNED_PHRASES = [
    'Ever since I was young',
    'From a young age',
    'I have always been passionate',
    'I learned that',
    'This experience taught me',
    'I was able to',
    'I realized that',
    'In conclusion',
    'In today\'s society',
    'defines who I am',
    'shaped me into the person I am today',
    'a journey of self-discovery',
    'pushed me out of my comfort zone',
    'ignited my passion',
    'sparked my interest',
    'opened my eyes',
    'transformative experience',
    'diverse perspectives',
    'making a difference',
    'giving back to the community',
];

export interface EssayReviewRequest {
    essay: string;
    prompt: string;
    college: {
        name: string;
        values: string[];
        whatTheyLookFor: string[];
    };
    wordLimit: number;
}

export interface ReviewFeedback {
    overallScore: number;
    strengths: string[];
    improvements: string[];
    suggestions: string[];
    specificEdits: {
        original: string;
        suggested: string;
        reason: string;
    }[];
}

// ============================================
// CLAUDE API (Best for essays)
// ============================================

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

async function callClaude(
    apiKey: string,
    systemPrompt: string,
    userMessage: string,
    model: string = 'claude-opus-4-20250514'
): Promise<string> {
    const response = await fetch(CLAUDE_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model,
            max_tokens: 4096,
            system: systemPrompt,
            messages: [{ role: 'user', content: userMessage }],
        }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(`Claude API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.content[0].text;
}

// ============================================
// GEMINI API (Good free tier)
// ============================================

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

async function callGemini(
    apiKey: string,
    systemPrompt: string,
    userMessage: string,
    model: string = 'gemini-1.5-flash'
): Promise<string> {
    const response = await fetch(
        `${GEMINI_API_URL}/${model}:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: `${systemPrompt}\n\n${userMessage}` }] }],
                generationConfig: {
                    maxOutputTokens: 4096,
                    temperature: 0.7,
                },
            }),
        }
    );

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(`Gemini API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}

// ============================================
// OPENAI API
// ============================================

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

async function callOpenAI(
    apiKey: string,
    systemPrompt: string,
    userMessage: string,
    model: string = 'gpt-4o'
): Promise<string> {
    const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage },
            ],
            max_tokens: 4096,
            temperature: 0.7,
        }),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

// ============================================
// UNIFIED AI CALLER
// ============================================

export async function callAI(
    config: AIConfig,
    systemPrompt: string,
    userMessage: string
): Promise<string> {
    switch (config.provider) {
        case 'claude':
            return callClaude(config.apiKey, systemPrompt, userMessage, config.model);
        case 'gemini':
            return callGemini(config.apiKey, systemPrompt, userMessage, config.model);
        case 'openai':
            return callOpenAI(config.apiKey, systemPrompt, userMessage, config.model);
        default:
            throw new Error(`Unknown AI provider: ${config.provider}`);
    }
}

// ============================================
// ESSAY GENERATION (State-of-the-Art Prompts)
// ============================================

export async function generateEssay(
    config: AIConfig,
    request: EssayGenerationRequest
): Promise<string> {
    // Get college-specific personality (default to generic if not found)
    const collegeId = request.college.name.toLowerCase().replace(/[^a-z]/g, '');
    const personality = COLLEGE_PERSONALITIES[collegeId] || {
        tone: 'Authentic, confident, reflective',
        narrativeStyle: 'Tell a specific story that reveals character. Show, don\'t tell.',
        keyThemes: ['genuine passion', 'personal growth', 'future vision'],
        sampleOpener: 'The moment everything changed was smaller than I expected...',
    };

    // Build comprehensive system prompt
    const systemPrompt = `You are a 17-18 year old student applying to ${request.college.name}. You are writing YOUR OWN college essay in YOUR OWN authentic voice.

## YOUR WRITING STYLE
- You write like a smart teenager, NOT a professional writer
- You use sentence fragments sometimes. For emphasis.
- You include specific sensory details (what you saw, heard, felt)
- You're vulnerable about failures and uncertainties
- You have a sense of humor about yourself
- You don't brag - you show, don't tell

## VOICE FOR ${request.college.name.toUpperCase()}
Tone: ${personality.tone}
Style: ${personality.narrativeStyle}
Key themes to weave in: ${personality.keyThemes.join(', ')}
Example opener style: "${personality.sampleOpener}"

## ABSOLUTE RULES - NEVER DO THESE
${BANNED_PHRASES.map(p => `- NEVER write: "${p}"`).join('\n')}
- NEVER open with a quote from someone famous
- NEVER open with a dictionary definition
- NEVER use the phrase "sparked my interest" or "ignited my passion"
- NEVER write generic statements that could apply to anyone
- NEVER summarize what you learned in the last paragraph

## WRITING TECHNIQUES TO USE
- Start in medias res (middle of the action)
- Use specific timestamps ("It was 3am on a Tuesday" not "one night")
- Include dialogue when it adds personality
- End on a forward-looking note that connects to ${request.college.name}
- Show your thought process, including doubts
- Use contrasts and surprises

## THE RESULT SHOULD PASS AS HUMAN-WRITTEN
Your essay should:
1. Sound like it was written by a real teenager, not an AI
2. Have small imperfections that make it feel authentic
3. Include hyper-specific details only YOU would know
4. Make the reader feel like they know you personally`;

    // Build comprehensive college context
    const collegeContext = `
## DEEP RESEARCH ON ${request.college.name.toUpperCase()}

MOTTO: "${request.college.motto || 'Excellence in education'}"

CORE VALUES: ${request.college.values.join(', ')}

WHAT ADMISSIONS LOOKS FOR: ${request.college.whatTheyLookFor.join(', ')}

CAMPUS CULTURE: ${request.college.culture}

CAMPUS VIBE: ${request.college.campusVibe || ''}

NOTABLE PROGRAMS: ${request.college.notablePrograms.join(', ')}

FAMOUS ALUMNI: ${(request.college.famousAlumni || []).join(', ') || 'Many successful alumni'}

UNIQUE FEATURES: ${(request.college.uniqueFeatures || []).join(', ') || ''}

RECENT NEWS: ${(request.college.recentNews || []).join(', ') || ''}

STUDENT LIFE: ${request.college.studentLife || ''}
`.trim();

    // Format activities with rich context
    const activitiesText = request.activities.length > 0
        ? request.activities.map(a => `
ACTIVITY: ${a.name}
What I did: ${a.description}
Impact/Achievement: ${a.impact}
`).join('\n')
        : 'No specific activities provided - use generic but believable experiences';

    // Build the user message
    const userMessage = `Write my college essay for ${request.college.name} (${request.college.fullName || request.college.name}).

## THE PROMPT I'M RESPONDING TO
"${request.prompt}"

## STRICT WORD LIMIT: ${request.wordLimit} words
(Stay within this limit - admissions officers count!)

${collegeContext}

## MY ACTIVITIES & EXPERIENCES TO DRAW FROM
${activitiesText}

## TONE I WANT
${request.tone || 'authentic, confident, with moments of vulnerability'}

${request.previousDraft ? `
## MY PREVIOUS DRAFT (improve but keep my voice)
${request.previousDraft}

Make it better while keeping what makes it sound like ME.
` : ''}

## CRITICAL INSTRUCTIONS
1. Start immediately with an engaging hook - NO titles or headers
2. Make every sentence count - show personality
3. Connect MY specific experiences to ${request.college.name}'s culture
4. Reference specific programs or features that genuinely excite me
5. End looking toward my future at ${request.college.name}
6. DO NOT exceed ${request.wordLimit} words

Write the essay now. Make it sound like a real 17-18 year old wrote it.`;

    return callAI(config, systemPrompt, userMessage);
}

// ============================================
// ESSAY REVIEW
// ============================================

export async function reviewEssay(
    config: AIConfig,
    request: EssayReviewRequest
): Promise<ReviewFeedback> {
    const systemPrompt = `You are an expert college admissions consultant who has read thousands of essays. You provide detailed, constructive feedback that helps students improve their essays.

You must respond in valid JSON format with this exact structure:
{
  "overallScore": <number 1-100>,
  "strengths": ["<strength1>", "<strength2>", ...],
  "improvements": ["<area1>", "<area2>", ...],
  "suggestions": ["<suggestion1>", "<suggestion2>", ...],
  "specificEdits": [
    {
      "original": "<exact text from essay>",
      "suggested": "<improved version>",
      "reason": "<why this is better>"
    }
  ]
}`;

    const userMessage = `Review this college essay for ${request.college.name}.

PROMPT: "${request.prompt}"
WORD LIMIT: ${request.wordLimit} words
COLLEGE VALUES: ${request.college.values.join(', ')}
WHAT THEY LOOK FOR: ${request.college.whatTheyLookFor.join(', ')}

ESSAY:
${request.essay}

Evaluate based on:
1. Hook strength and opening
2. Authenticity and voice
3. Specific details and anecdotes
4. Connection to ${request.college.name}
5. Structure and flow
6. Grammar and word choice
7. Overall memorability

Respond with JSON only.`;

    const response = await callAI(config, systemPrompt, userMessage);

    // Parse JSON response
    try {
        // Extract JSON from response (in case there's extra text)
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON found in response');
        return JSON.parse(jsonMatch[0]);
    } catch (error) {
        console.error('Failed to parse review response:', response);
        // Return a default response if parsing fails
        return {
            overallScore: 70,
            strengths: ['Unable to parse detailed feedback'],
            improvements: ['Please try again'],
            suggestions: ['Retry the review'],
            specificEdits: [],
        };
    }
}

// ============================================
// TONE ADJUSTMENT
// ============================================

export async function adjustTone(
    config: AIConfig,
    essay: string,
    targetTone: 'casual' | 'formal' | 'passionate' | 'confident' | 'reflective',
    intensity: number = 50
): Promise<string> {
    const toneDescriptions = {
        casual: 'conversational, friendly, relatable, uses contractions and informal language',
        formal: 'professional, polished, sophisticated vocabulary, proper sentence structure',
        passionate: 'emotional, enthusiastic, uses vivid language and exclamations',
        confident: 'assertive, bold, uses strong statements and active voice',
        reflective: 'thoughtful, introspective, contemplative, uses questions and observations',
    };

    const systemPrompt = `You are an expert essay editor. Your task is to adjust the tone of essays while maintaining their core message and the student's voice.`;

    const userMessage = `Adjust this essay to be more ${targetTone}.

TARGET TONE: ${toneDescriptions[targetTone]}
INTENSITY: ${intensity}% (0 = subtle change, 100 = dramatic change)

ESSAY:
${essay}

Rewrite the essay with the adjusted tone. Maintain the core story and message. Keep a similar word count.`;

    return callAI(config, systemPrompt, userMessage);
}

// ============================================
// ESSAY RECYCLING / ADAPTATION
// ============================================

export async function recycleEssay(
    config: AIConfig,
    sourceEssay: string,
    originalPrompt: string,
    targetPrompt: string,
    targetCollege: {
        name: string;
        values: string[];
        whatTheyLookFor: string[];
    }
): Promise<string> {
    const systemPrompt = `You are an expert at adapting college essays across different prompts while maintaining authenticity and uniqueness.`;

    const userMessage = `Adapt this essay for a different prompt and college.

ORIGINAL PROMPT: "${originalPrompt}"

ORIGINAL ESSAY:
${sourceEssay}

TARGET PROMPT: "${targetPrompt}"

TARGET COLLEGE: ${targetCollege.name}
THEIR VALUES: ${targetCollege.values.join(', ')}
WHAT THEY LOOK FOR: ${targetCollege.whatTheyLookFor.join(', ')}

Adapt the essay to:
1. Answer the target prompt directly
2. Reference ${targetCollege.name}'s specific values
3. Maintain the student's authentic voice
4. Keep the core story but adjust framing
5. Make it feel like a new essay, not a modified version`;

    return callAI(config, systemPrompt, userMessage);
}

// ============================================
// CONFIGURATION HELPERS
// ============================================

export function getAIConfig(): AIConfig | null {
    if (typeof window === 'undefined') return null;

    // Check for Claude API key first (preferred for essays)
    const claudeKey = process.env.NEXT_PUBLIC_CLAUDE_API_KEY ||
        localStorage.getItem('claude_api_key');
    if (claudeKey) {
        return { provider: 'claude', apiKey: claudeKey };
    }

    // Fall back to Gemini
    const geminiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
        localStorage.getItem('gemini_api_key');
    if (geminiKey) {
        return { provider: 'gemini', apiKey: geminiKey };
    }

    // Fall back to OpenAI
    const openaiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY ||
        localStorage.getItem('openai_api_key');
    if (openaiKey) {
        return { provider: 'openai', apiKey: openaiKey };
    }

    return null;
}

export function setAPIKey(provider: AIProvider, apiKey: string) {
    localStorage.setItem(`${provider}_api_key`, apiKey);
}

export function getAvailableProviders(): AIProvider[] {
    const providers: AIProvider[] = [];

    if (process.env.NEXT_PUBLIC_CLAUDE_API_KEY || localStorage.getItem('claude_api_key')) {
        providers.push('claude');
    }
    if (process.env.NEXT_PUBLIC_GEMINI_API_KEY || localStorage.getItem('gemini_api_key')) {
        providers.push('gemini');
    }
    if (process.env.NEXT_PUBLIC_OPENAI_API_KEY || localStorage.getItem('openai_api_key')) {
        providers.push('openai');
    }

    return providers;
}

// ============================================
// DOCUMENT EXTRACTION - AI-Powered
// Extracts activities, achievements, research from documents
// ============================================

export interface ExtractedActivity {
    name: string;
    role: string;
    organization: string;
    startDate: string;
    endDate: string;
    description: string;
    hoursPerWeek: number;
    weeksPerYear: number;
    impact: string;
}

export interface ExtractedAchievement {
    title: string;
    description: string;
    date: string;
    significance: string;
}

export interface ExtractedResearch {
    topic: string;
    findings: string;
    methodology: string;
    essayContext: string;
}

export interface DocumentExtractionResult {
    activities: ExtractedActivity[];
    achievements: ExtractedAchievement[];
    research: ExtractedResearch[];
    summary: string;
}

export async function extractFromDocument(
    config: AIConfig,
    documentText: string,
    documentType: 'resume' | 'paper' | 'transcript' | 'certificate' | 'other'
): Promise<DocumentExtractionResult> {
    const systemPrompt = `You are an expert at reading documents and extracting ONLY verifiable information.

⚠️ CRITICAL ANTI-HALLUCINATION RULES:
1. You MUST ONLY extract information that is EXPLICITLY stated in the document
2. You MUST NOT invent, imagine, or hallucinate ANY activities, achievements, or experiences
3. You MUST NOT assume the author held any positions or roles unless explicitly stated
4. If the document contains no activities/achievements, return EMPTY arrays - this is CORRECT
5. For research papers: extract ONLY the paper itself as ONE activity - NOT student clubs/sports/volunteering

VERIFICATION CHECK: Before including ANY item, ask yourself:
"Can I point to the EXACT text in this document that proves this exists?"
If NO, do NOT include it.

You must respond in valid JSON format with this exact structure:
{
    "activities": [
        {
            "name": "Activity name (MUST be explicitly in document)",
            "role": "Your position (MUST be stated in document)",
            "organization": "Where (MUST be stated)",
            "startDate": "When started (or 'Unknown')",
            "endDate": "When ended (or 'Unknown')",
            "description": "Based on actual document text",
            "hoursPerWeek": 0,
            "weeksPerYear": 0,
            "impact": "Outcomes explicitly mentioned in document"
        }
    ],
    "achievements": [
        {
            "title": "Achievement name (MUST be in document)",
            "description": "What it was (from document)",
            "date": "When (or 'Unknown')",
            "significance": "Why it matters"
        }
    ],
    "research": [
        {
            "topic": "Research area/title (from document)",
            "findings": "Key contributions (from document)",
            "methodology": "How research was conducted (from document)",
            "essayContext": "How to reference this in essays"
        }
    ],
    "summary": "Summary of what was actually found in this document"
}

DOCUMENT TYPE: ${documentType}
${documentType === 'paper' ? `
FOR RESEARCH PAPERS:
- Extract ONLY the research project as ONE activity (the paper itself)
- DO NOT invent student activities, clubs, sports, or volunteering
- A research paper should have AT MOST 1 activity and maybe 1-2 achievements (publication, awards)
` : ''}

CRITICAL RULES:
1. Extract ONLY what is EXPLICITLY in the document
2. Do NOT estimate or invent hours/weeks - use 0 if not stated
3. Do NOT invent achievements or activities not mentioned
4. Return EMPTY arrays if nothing is found - this is the CORRECT response
5. When in doubt, EXCLUDE rather than include`;

    const userMessage = `Extract ONLY verifiable information from this ${documentType}.

DOCUMENT CONTENT:
${documentText.slice(0, 15000)}

${documentText.length > 15000 ? '\n[Document truncated for processing]' : ''}

REMEMBER:
- ONLY extract what is EXPLICITLY in the document
- Do NOT invent or hallucinate any information
- Empty arrays are the CORRECT response if nothing is found
- Return valid JSON only`;

    try {
        const result = await callAI(config, systemPrompt, userMessage);

        // Parse the JSON response
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No valid JSON in response');
        }

        const parsed = JSON.parse(jsonMatch[0]) as DocumentExtractionResult;

        // Validate and ensure arrays exist
        return {
            activities: parsed.activities || [],
            achievements: parsed.achievements || [],
            research: parsed.research || [],
            summary: parsed.summary || 'Document processed successfully.',
        };
    } catch (error) {
        console.error('Document extraction error:', error);
        // Return empty result on error
        return {
            activities: [],
            achievements: [],
            research: [],
            summary: 'Failed to extract information from document.',
        };
    }
}

