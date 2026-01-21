'use server';

import { NextRequest, NextResponse } from 'next/server';

// ============================================
// AI INTERVIEW FEEDBACK GENERATOR
// Analyzes interview answers and provides feedback
// ============================================

interface FeedbackRequest {
    question: string;
    answer: string;
    questionType: 'behavioral' | 'college' | 'job' | 'general';
    targetRole?: string; // For job interviews
    targetCollege?: string; // For college interviews
    userProfile?: {
        activities?: any[];
        achievements?: any[];
        major?: string;
        gpa?: number;
    };
}

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

async function callClaude(prompt: string, maxTokens: number = 2000): Promise<string> {
    try {
        const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || '';

        const response = await fetch(CLAUDE_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-5-20250929',
                max_tokens: maxTokens,
                temperature: 0.7,
                messages: [{ role: 'user', content: prompt }],
            }),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(`Claude API error: ${error.error?.message || response.statusText}`);
        }

        const data = await response.json();
        return data.content[0].text;
    } catch (error) {
        console.error('Claude API error:', error);
        throw error;
    }
}

function parseJSON(text: string, fallback: any = {}): any {
    try {
        // Find JSON in ```json ... ``` blocks
        const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[1]);
        }
        // Try parsing the entire text
        return JSON.parse(text);
    } catch {
        return fallback;
    }
}

export async function POST(request: NextRequest) {
    try {
        const body: FeedbackRequest = await request.json();
        const { question, answer, questionType, targetRole, targetCollege, userProfile } = body;

        console.log(`🎤 Generating feedback for ${questionType} interview question...`);

        if (!answer || answer.trim().length === 0) {
            return NextResponse.json({
                error: 'No answer provided',
                message: 'Please provide an answer to get feedback.',
            }, { status: 400 });
        }

        // ============================================
        // PHASE 1: Analyze answer structure (STAR)
        // ============================================
        console.log('📊 Phase 1: Analyzing answer structure...');

        const starPrompt = `Analyze this interview answer for STAR method structure:

QUESTION: ${question}
ANSWER: ${answer}

Evaluate:
1. **Situation (0-25 points)**: Did they set the scene with context?
2. **Task (0-25 points)**: Did they clearly define their responsibility?
3. **Action (0-25 points)**: Did they explain specific actions they took?
4. **Result (0-25 points)**: Did they share measurable outcomes?

Additional Criteria:
- **Specificity (0-20 points)**: Are there concrete examples and numbers?
- **Clarity (0-20 points)**: Is the answer clear and easy to follow?
- **Length (0-10 points)**: Is it 1-2 minutes (150-300 words)?

Return JSON:
{
  "starScore": {
    "situation": 20,
    "task": 22,
    "action": 23,
    "result": 18
  },
  "additionalScores": {
    "specificity": 15,
    "clarity": 18,
    "length": 8
  },
  "totalScore": 124,
  "percentageScore": 74,
  "starPresent": {
    "situation": true,
    "task": true,
    "action": true,
    "result": false
  }
}`;

        const starAnalysis = parseJSON(await callClaude(starPrompt, 2000), {
            starScore: { situation: 0, task: 0, action: 0, result: 0 },
            additionalScores: { specificity: 0, clarity: 0, length: 0 },
            totalScore: 0,
            percentageScore: 0,
            starPresent: { situation: false, task: false, action: false, result: false },
        });

        console.log(`   ✅ STAR score: ${starAnalysis.percentageScore}%`);

        // ============================================
        // PHASE 2: Content quality analysis
        // ============================================
        console.log('🎯 Phase 2: Analyzing content quality...');

        let contentPrompt = `Analyze this interview answer for CONTENT QUALITY:

QUESTION: ${question}
ANSWER: ${answer}
QUESTION TYPE: ${questionType}`;

        if (targetCollege) {
            contentPrompt += `\nTARGET COLLEGE: ${targetCollege}`;
        }
        if (targetRole) {
            contentPrompt += `\nTARGET ROLE: ${targetRole}`;
        }

        contentPrompt += `

Evaluate:
1. **Relevance (0-25)**: How well does the answer address the question?
2. **Impact (0-25)**: Does it show meaningful achievements/growth?
3. **Authenticity (0-25)**: Does it sound genuine and personal?
4. **Differentiation (0-25)**: Is it unique or generic?

Return JSON:
{
  "contentScores": {
    "relevance": 22,
    "impact": 20,
    "authenticity": 23,
    "differentiation": 18
  },
  "contentPercentage": 83,
  "strengths": ["Specific numbers", "Clear leadership"],
  "weaknesses": ["Generic result", "Missing emotional impact"]
}`;

        const contentAnalysis = parseJSON(await callClaude(contentPrompt, 2000), {
            contentScores: { relevance: 0, impact: 0, authenticity: 0, differentiation: 0 },
            contentPercentage: 0,
            strengths: [],
            weaknesses: [],
        });

        console.log(`   ✅ Content quality: ${contentAnalysis.contentPercentage}%`);

        // ============================================
        // PHASE 3: Generate detailed feedback
        // ============================================
        console.log('💡 Phase 3: Generating detailed feedback...');

        const feedbackPrompt = `You are an expert interview coach. Provide detailed feedback on this answer:

QUESTION: ${question}
ANSWER: ${answer}

ANALYSIS RESULTS:
- STAR Score: ${starAnalysis.percentageScore}%
- Content Quality: ${contentAnalysis.contentPercentage}%
- Strengths: ${contentAnalysis.strengths.join(', ')}
- Weaknesses: ${contentAnalysis.weaknesses.join(', ')}

Provide:
1. **Overall Assessment** (2-3 sentences)
2. **What Worked Well** (3-4 bullet points)
3. **Areas to Improve** (3-4 specific, actionable bullet points)
4. **Suggested Revision** (rewrite the answer to be stronger, 150-250 words)

Return JSON:
{
  "overallAssessment": "...",
  "whatWorkedWell": ["...", "..."],
  "areasToImprove": ["...", "..."],
  "suggestedRevision": "..."
}`;

        const feedback = parseJSON(await callClaude(feedbackPrompt, 3000), {
            overallAssessment: '',
            whatWorkedWell: [],
            areasToImprove: [],
            suggestedRevision: '',
        });

        // ============================================
        // PHASE 4: Calculate final score
        // ============================================
        console.log('📈 Phase 4: Calculating final score...');

        const finalScore = Math.round((starAnalysis.percentageScore + contentAnalysis.contentPercentage) / 2);

        console.log(`   ✅ Final score: ${finalScore}%`);

        // ============================================
        // PHASE 5: Generate improvement tips
        // ============================================
        console.log('✨ Phase 5: Generating improvement tips...');

        const tips: string[] = [];

        // STAR-based tips
        if (!starAnalysis.starPresent.situation) {
            tips.push('Start with context: Set the scene before jumping into action');
        }
        if (!starAnalysis.starPresent.task) {
            tips.push('Define your role: What was YOUR specific responsibility?');
        }
        if (!starAnalysis.starPresent.action) {
            tips.push('Detail your actions: What specific steps did you take?');
        }
        if (!starAnalysis.starPresent.result) {
            tips.push('Quantify results: Add specific numbers/metrics to show impact');
        }

        // Content-based tips
        if (contentAnalysis.contentScores.specificity < 15) {
            tips.push('Add more specific details: Names, numbers, dates, metrics');
        }
        if (contentAnalysis.contentScores.differentiation < 18) {
            tips.push('Make it unique: What makes YOUR story different?');
        }
        if (contentAnalysis.contentScores.impact < 20) {
            tips.push('Emphasize impact: What changed because of your actions?');
        }

        console.log('✅ Feedback generation complete!');

        return NextResponse.json({
            success: true,
            score: finalScore,
            starAnalysis: {
                percentage: starAnalysis.percentageScore,
                breakdown: starAnalysis.starScore,
                starPresent: starAnalysis.starPresent,
            },
            contentAnalysis: {
                percentage: contentAnalysis.contentPercentage,
                breakdown: contentAnalysis.contentScores,
                strengths: contentAnalysis.strengths,
                weaknesses: contentAnalysis.weaknesses,
            },
            feedback: {
                overallAssessment: feedback.overallAssessment,
                whatWorkedWell: feedback.whatWorkedWell,
                areasToImprove: feedback.areasToImprove,
                suggestedRevision: feedback.suggestedRevision,
            },
            improvementTips: tips,
            metadata: {
                questionType,
                targetRole,
                targetCollege,
                generatedAt: new Date().toISOString(),
            },
        });

    } catch (error) {
        console.error('Interview feedback error:', error);
        return NextResponse.json({
            error: 'Failed to generate feedback',
            message: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
    }
}
