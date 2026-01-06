'use server';

import { NextRequest, NextResponse } from 'next/server';

// ============================================
// SERVER-SIDE ESSAY REVIEW API
// Acts like a college-specific admissions counselor
// ============================================

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

const getClaudeKey = () => process.env.CLAUDE_API_KEY || process.env.NEXT_PUBLIC_CLAUDE_API_KEY || '';
const getGeminiKey = () => process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';

interface ReviewRequest {
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
}

// College-specific review personas
const getCollegePersona = (collegeName: string, values: string[], whatTheyLookFor: string[]) => {
    const personas: Record<string, string> = {
        'MIT': `You are a senior MIT admissions officer with 15 years of experience. You've read thousands of essays and know exactly what makes an MIT applicant stand out. 
        
MIT SPECIFIC PRIORITIES:
- Genuine intellectual curiosity and "nerdiness" - we want students who geek out about ideas
- Hands-on making and building - show us what you've created or engineered
- Collaborative spirit - MIT is about working together, not lone wolves
- Resilience and problem-solving mindset
- Authentic voice - we can spot polished generic essays instantly
- Specific connection to MIT's unique culture (hacking, pass/no record, UROP, etc.)`,

        'Stanford': `You are a Stanford admissions officer known for identifying "intellectually curious, future leaders."

STANFORD SPECIFIC PRIORITIES:
- Intellectual vitality - genuine passion for learning and ideas
- Evidence of impact and leadership, not just participation
- "Stanford duck syndrome" awareness - authenticity over perfection
- Entrepreneurial mindset and initiative
- Global perspective and cultural awareness
- Specific connection to Stanford's interdisciplinary approach`,

        'Harvard': `You are a Harvard admissions officer evaluating essays for the most selective university.

HARVARD SPECIFIC PRIORITIES:
- Character and integrity - who you are matters as much as what you've done
- Potential for future contribution to society
- Genuine intellectual depth and curiosity
- Evidence of leadership and impact
- Authenticity - we read 40,000+ essays, we can spot generic ones
- How you'll contribute to the Harvard community`,

        'UMich': `You are a University of Michigan admissions officer, particularly focused on the "Community" essay.

UMICH SPECIFIC PRIORITIES:
- "Leaders and Best" - show leadership potential
- Community contribution - how will you enrich the Michigan community?
- Evidence of collaboration and teamwork
- Genuine interest in specific Michigan programs, traditions, or opportunities
- Diversity of thought and experience
- Connection to Michigan values: excellence, integrity, community engagement`,

        'Berkeley': `You are a UC Berkeley admissions officer evaluating transfer students.

BERKELEY SPECIFIC PRIORITIES:
- Academic excellence and intellectual curiosity
- Personal insight and self-reflection
- Overcoming challenges and demonstrating resilience  
- Contribution to the Golden Bear community
- Commitment to social justice and making a difference
- Specific interest in Berkeley's unique culture and programs`,

        'UCLA': `You are a UCLA admissions officer with expertise in transfer admissions.

UCLA SPECIFIC PRIORITIES:
- Academic preparation and intellectual curiosity
- Leadership and community engagement
- Personal growth and self-awareness
- Contribution to UCLA's diverse community
- True Bruin values: respect, accountability, integrity
- Specific connection to UCLA programs and culture`,
    };

    // Default persona if college not in list
    return personas[collegeName] || `You are an experienced admissions officer at ${collegeName}, evaluating transfer student essays.

${collegeName} SPECIFIC PRIORITIES:
- Alignment with core values: ${values.join(', ')}
- Evidence of: ${whatTheyLookFor.join(', ')}
- Genuine interest in ${collegeName}'s specific programs and culture
- Authentic voice and personal reflection
- Potential for contributing to the campus community`;
};

async function callClaude(apiKey: string, systemPrompt: string, userMessage: string): Promise<string> {
    const response = await fetch(CLAUDE_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model: 'claude-opus-4-20250514',
            max_tokens: 2000,
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

async function callGemini(apiKey: string, systemPrompt: string, userMessage: string): Promise<string> {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
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

export async function POST(request: NextRequest) {
    try {
        const body: ReviewRequest = await request.json();
        const { essay, prompt, college, wordLimit } = body;

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
            // Return basic review if no API key
            const wordCount = essay.split(/\s+/).filter(w => w.length > 0).length;
            return NextResponse.json({
                overallScore: wordCount >= wordLimit * 0.8 ? 70 : 50,
                strengths: ['Essay submitted for review'],
                improvements: ['Add AI API key for detailed college-specific feedback'],
                suggestions: ['Configure CLAUDE_API_KEY in GitHub secrets'],
                collegeSpecific: `Unable to provide ${college.name}-specific feedback without AI API key`,
                provider: 'local',
            });
        }

        console.log(`📝 Reviewing essay for ${college.name} using ${provider}...`);

        // Build college-specific persona
        const persona = getCollegePersona(college.name, college.values, college.whatTheyLookFor);

        const systemPrompt = `${persona}

You are reviewing a transfer student essay. Be TOUGH but CONSTRUCTIVE - your goal is to help this student get accepted.

REVIEW CRITERIA (score each 1-10):
1. AUTHENTICITY (20%): Is the voice genuine? Can you hear a real person?
2. SPECIFICITY (20%): Does it use concrete examples, not generic statements?
3. COLLEGE FIT (25%): Does it show genuine knowledge of and fit for ${college.name}?
4. STRUCTURE (15%): Is it well-organized with a clear narrative arc?
5. IMPACT (20%): Does it leave a memorable impression?

Return your review as VALID JSON only (no markdown, no code blocks):
{
    "overallScore": <number 0-100>,
    "categoryScores": {
        "authenticity": <1-10>,
        "specificity": <1-10>,
        "collegeFit": <1-10>,
        "structure": <1-10>,
        "impact": <1-10>
    },
    "strengths": ["<specific strength 1>", "<specific strength 2>"],
    "improvements": ["<specific improvement 1>", "<specific improvement 2>"],
    "suggestions": ["<actionable suggestion 1>", "<actionable suggestion 2>"],
    "collegeSpecific": "<What a ${college.name} admissions officer would specifically say about this essay>",
    "keyPhrasesToRevise": ["<weak phrase 1>", "<weak phrase 2>"],
    "memorableElements": "<What stands out positively>",
    "oneThingToFix": "<The single most important thing to improve>"
}`;

        const userMessage = `ESSAY PROMPT:
${prompt}

WORD LIMIT: ${wordLimit} words
ACTUAL WORD COUNT: ${essay.split(/\s+/).filter(w => w.length > 0).length} words

ESSAY TO REVIEW:
${essay}

Review this essay as a ${college.name} admissions officer. Be specific, be tough, be helpful. Return ONLY valid JSON.`;

        let reviewText: string;
        if (provider === 'claude') {
            reviewText = await callClaude(apiKey, systemPrompt, userMessage);
        } else {
            reviewText = await callGemini(apiKey, systemPrompt, userMessage);
        }

        // Parse JSON response
        let review;
        try {
            // Try to extract JSON from response
            const jsonMatch = reviewText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                review = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('No JSON found in response');
            }
        } catch (parseError) {
            console.error('Failed to parse review JSON:', parseError);
            // Fallback structured response
            review = {
                overallScore: 75,
                strengths: ['Essay reviewed by AI'],
                improvements: ['Review parsing failed - please try again'],
                suggestions: [reviewText.slice(0, 200)],
                collegeSpecific: 'Unable to parse detailed feedback',
                provider,
            };
        }

        review.provider = provider;

        console.log(`✅ Essay reviewed: ${review.overallScore}% score`);

        return NextResponse.json(review);

    } catch (error) {
        console.error('Essay review error:', error);
        return NextResponse.json({
            error: 'Failed to review essay',
            message: error instanceof Error ? error.message : 'Unknown error',
            overallScore: 50,
            strengths: [],
            improvements: ['Review failed - please try again'],
            suggestions: [],
        }, { status: 500 });
    }
}
