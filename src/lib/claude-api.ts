// ============================================
// CLAUDE API - EXCLUSIVE AI PROVIDER
// Using Opus for essays (best quality)
// Using Sonnet for quick tasks (fast + good)
// ============================================

export type ClaudeModel =
    | 'claude-3-opus-20240229'      // Best for essays - highest quality
    | 'claude-3-5-sonnet-20241022'  // Good for quick tasks
    | 'claude-3-haiku-20240307';    // Fast for simple tasks

export interface ClaudeConfig {
    apiKey: string;
    defaultModel: ClaudeModel;
}

export interface ClaudeMessage {
    role: 'user' | 'assistant';
    content: string;
}

// ============================================
// CLAUDE API CLIENT
// ============================================

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

export async function callClaude(
    apiKey: string,
    systemPrompt: string,
    messages: ClaudeMessage[],
    model: ClaudeModel = 'claude-3-opus-20240229',
    maxTokens: number = 4096
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
            max_tokens: maxTokens,
            system: systemPrompt,
            messages,
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
// ESSAY GENERATION (OPUS - Best Quality)
// ============================================

export interface EssayRequest {
    prompt: string;
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
    wordLimit: number;
    tone?: 'casual' | 'formal' | 'passionate' | 'confident' | 'reflective';
    previousDraft?: string;
}

export async function generateEssayWithOpus(
    apiKey: string,
    request: EssayRequest
): Promise<string> {
    const systemPrompt = `You are an expert college admissions essay writer with 20+ years of experience helping students get into Stanford, MIT, Harvard, and other top universities. You have reviewed 50,000+ essays and know exactly what admissions officers look for.

Your writing is:
- AUTHENTIC: Sounds like a real student, not AI-generated
- SPECIFIC: Uses concrete details and vivid anecdotes
- VULNERABLE: Shows genuine self-reflection and growth
- MEMORABLE: Creates a lasting impression with a unique voice
- STRATEGIC: Subtly connects to college values without being obvious

CRITICAL RULES:
1. Write in first person as the student
2. Never start with a quote or dictionary definition
3. Avoid clichés like "passionate about" or "making a difference"
4. Show don't tell - use specific moments and dialogue
5. Keep within word limit but use every word strategically`;

    const activitiesText = request.activities
        .map(a => `- ${a.name}: ${a.description}. Impact: ${a.impact}`)
        .join('\n');

    const userMessage = `Write a transfer essay for ${request.college.name}.

PROMPT: "${request.prompt}"
WORD LIMIT: ${request.wordLimit} words

COLLEGE RESEARCH:
- Values: ${request.college.values.join(', ')}
- What they look for: ${request.college.whatTheyLookFor.join(', ')}
- Culture: ${request.college.culture}
- Notable programs: ${request.college.notablePrograms.join(', ')}

MY ACTIVITIES:
${activitiesText}

TONE: ${request.tone || 'confident and authentic'}

${request.previousDraft ? `IMPROVE THIS DRAFT:\n${request.previousDraft}` : 'Write a new essay from scratch.'}

Write the essay now. Start directly with the opening - no titles or headers.`;

    return callClaude(
        apiKey,
        systemPrompt,
        [{ role: 'user', content: userMessage }],
        'claude-3-opus-20240229', // OPUS for best essay quality
        4096
    );
}

// ============================================
// ESSAY REVIEW (SONNET - Fast + Good)
// ============================================

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

export async function reviewEssayWithSonnet(
    apiKey: string,
    essay: string,
    prompt: string,
    collegeName: string
): Promise<ReviewFeedback> {
    const systemPrompt = `You are a former Stanford admissions officer who now consults for students. Provide detailed, actionable feedback on essays. Respond in JSON format only.`;

    const userMessage = `Review this essay for ${collegeName}.

PROMPT: "${prompt}"

ESSAY:
${essay}

Rate and provide feedback. Respond with this exact JSON structure:
{
  "overallScore": <1-100>,
  "strengths": ["<strength1>", "<strength2>"],
  "improvements": ["<improvement1>", "<improvement2>"],
  "suggestions": ["<suggestion1>", "<suggestion2>"],
  "specificEdits": [
    {"original": "<text>", "suggested": "<improved>", "reason": "<why>"}
  ]
}`;

    const response = await callClaude(
        apiKey,
        systemPrompt,
        [{ role: 'user', content: userMessage }],
        'claude-3-5-sonnet-20241022', // SONNET for fast reviews
        2048
    );

    try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON found');
        return JSON.parse(jsonMatch[0]);
    } catch {
        return {
            overallScore: 70,
            strengths: ['Unable to parse feedback'],
            improvements: ['Please try again'],
            suggestions: [],
            specificEdits: [],
        };
    }
}

// ============================================
// JOB MATCHING (SONNET - Fast Analysis)
// ============================================

export interface JobMatchAnalysis {
    matchScore: number;
    matchedSkills: string[];
    missingSkills: string[];
    reasons: string[];
    shouldApply: boolean;
    coverLetterPoints: string[];
}

export async function analyzeJobMatchWithAI(
    apiKey: string,
    jobDescription: string,
    resumeText: string,
    preferences: {
        needsVisa: boolean;
        preferredLocations: string[];
        salaryMin: number;
    }
): Promise<JobMatchAnalysis> {
    const systemPrompt = `You are an AI career advisor. Analyze job postings and match them to candidates. Be honest about fit. Respond in JSON.`;

    const userMessage = `Analyze this job for the candidate.

JOB DESCRIPTION:
${jobDescription}

CANDIDATE RESUME:
${resumeText}

PREFERENCES:
- Needs visa sponsorship: ${preferences.needsVisa}
- Preferred locations: ${preferences.preferredLocations.join(', ')}
- Minimum salary: $${preferences.salaryMin}

Respond with JSON:
{
  "matchScore": <0-100>,
  "matchedSkills": ["skill1", "skill2"],
  "missingSkills": ["skill1"],
  "reasons": ["reason1", "reason2"],
  "shouldApply": <true/false>,
  "coverLetterPoints": ["point1", "point2"]
}`;

    const response = await callClaude(
        apiKey,
        systemPrompt,
        [{ role: 'user', content: userMessage }],
        'claude-3-5-sonnet-20241022',
        1024
    );

    try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON found');
        return JSON.parse(jsonMatch[0]);
    } catch {
        return {
            matchScore: 50,
            matchedSkills: [],
            missingSkills: [],
            reasons: ['Analysis failed'],
            shouldApply: false,
            coverLetterPoints: [],
        };
    }
}

// ============================================
// AUTO JOB FILTER (AI-Powered)
// ============================================

export async function autoFilterJobs(
    apiKey: string,
    jobs: { title: string; company: string; description: string }[],
    userProfile: string,
    preferences: string
): Promise<{ jobIndex: number; score: number; reason: string }[]> {
    const systemPrompt = `You are an AI job search assistant. Filter and rank jobs for the candidate. Be selective - only recommend truly good matches.`;

    const jobsList = jobs.map((j, i) =>
        `[${i}] ${j.title} at ${j.company}: ${j.description.substring(0, 200)}...`
    ).join('\n\n');

    const userMessage = `Filter these jobs for the candidate.

CANDIDATE PROFILE:
${userProfile}

PREFERENCES:
${preferences}

JOBS:
${jobsList}

For each job that's a good match (score >= 70), respond with JSON array:
[{"jobIndex": 0, "score": 85, "reason": "Strong match because..."}]

Only include good matches. Be selective.`;

    const response = await callClaude(
        apiKey,
        systemPrompt,
        [{ role: 'user', content: userMessage }],
        'claude-3-5-sonnet-20241022',
        2048
    );

    try {
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (!jsonMatch) return [];
        return JSON.parse(jsonMatch[0]);
    } catch {
        return [];
    }
}

// ============================================
// CONFIGURATION
// ============================================

export function getClaudeApiKey(): string | null {
    // Check environment variable first (for production/CI)
    if (process.env.CLAUDE_API_KEY) {
        return process.env.CLAUDE_API_KEY;
    }
    if (process.env.NEXT_PUBLIC_CLAUDE_API_KEY) {
        return process.env.NEXT_PUBLIC_CLAUDE_API_KEY;
    }
    // Fallback to localStorage for development
    if (typeof window !== 'undefined') {
        return localStorage.getItem('claude_api_key');
    }
    return null;
}

export function setClaudeApiKey(key: string): void {
    if (typeof window !== 'undefined') {
        localStorage.setItem('claude_api_key', key);
    }
}

// Model recommendations
export const MODEL_RECOMMENDATIONS = {
    essays: 'claude-3-opus-20240229',        // Best quality, slower
    review: 'claude-3-5-sonnet-20241022',    // Fast, good quality
    jobMatch: 'claude-3-5-sonnet-20241022',  // Fast analysis
    quickTasks: 'claude-3-haiku-20240307',   // Very fast, simple tasks
} as const;
