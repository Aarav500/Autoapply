'use server';

import { NextRequest, NextResponse } from 'next/server';
import { WeaknessAnalysis } from '@/lib/s3-storage';

// ============================================
// WEAKNESS ANALYSIS & TRANSFORMATION ENGINE
// Turns potential concerns into strengths
// ============================================

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const getClaudeKey = () => process.env.CLAUDE_API_KEY || process.env.NEXT_PUBLIC_CLAUDE_API_KEY || '';

interface AnalyzeWeaknessesRequest {
    transcript: any; // Student's grades/courses
    activities: any[];
    achievements?: any[];
    profile?: {
        gpa: number;
        major: string;
        currentSchool: string;
        interests: string[];
    };
}

export async function POST(request: NextRequest) {
    try {
        const body: AnalyzeWeaknessesRequest = await request.json();
        const { transcript, activities, achievements = [], profile } = body;

        const claudeKey = getClaudeKey();
        if (!claudeKey) {
            return NextResponse.json({
                error: 'Claude API key not configured'
            }, { status: 500 });
        }

        console.log(`🔍 Analyzing potential weaknesses and transformation strategies...`);

        // ============================================
        // PHASE 1: IDENTIFY POTENTIAL ACADEMIC CONCERNS
        // ============================================

        const academicConcernsPrompt = `You are a college admissions expert. Analyze this academic profile for potential concerns and how to address them.

TRANSCRIPT:
${JSON.stringify(transcript, null, 2)}

${profile ? `GPA: ${profile.gpa}
MAJOR: ${profile.major}
CURRENT SCHOOL: ${profile.currentSchool}` : ''}

TASK: Identify potential academic concerns an admissions officer might have.

Consider:
- GPA (is it below target school's average?)
- Course rigor (are courses challenging enough?)
- Grade trajectory (upward or downward trend?)
- Weak semesters (any particularly bad terms?)
- Subject weaknesses (struggles in key courses?)

For EACH concern, provide:
1. The concern
2. Severity (high/medium/low)
3. Evidence from transcript
4. How to reframe it positively
5. What to emphasize instead

Return JSON:
{
  "potentialConcerns": [
    {
      "concern": "GPA of 3.7 is below MIT's 3.9 average",
      "severity": "medium",
      "evidence": "Overall GPA: 3.7",
      "reframe": {
        "approach": "Contextualize with course rigor and upward trend",
        "angle": "Took hardest CS courses while working 20hrs/week. GPA improved from 3.5 → 3.9 in major courses",
        "evidenceToUse": ["Upward trend in major GPA", "Difficult courses", "Work commitments"],
        "exampleLanguage": "While my overall GPA is 3.7, I deliberately chose the most rigorous CS courses available - Advanced Algorithms, Machine Learning, AI - while working 20 hours weekly to support my family. My major GPA increased from 3.5 to 3.9, showing I thrive when challenged."
      }
    }
  ]
}

Return ONLY the JSON object with all potential academic concerns.`;

        const academicResponse = await callClaude(claudeKey, academicConcernsPrompt);
        const { potentialConcerns: academicConcerns } = parseJSON(academicResponse, { potentialConcerns: [] });

        // ============================================
        // PHASE 2: IDENTIFY ACTIVITY/EC CONCERNS
        // ============================================

        const activityConcernsPrompt = `You are a college admissions expert. Analyze this activity profile for potential concerns.

ACTIVITIES:
${JSON.stringify(activities, null, 2)}

${achievements.length > 0 ? `ACHIEVEMENTS:\n${JSON.stringify(achievements, null, 2)}` : ''}

TASK: Identify potential extracurricular concerns.

Consider:
- Limited leadership positions?
- Depth vs breadth (too scattered or too narrow?)
- Low time commitment (does it look padded?)
- Lack of awards/recognition?
- No community service?
- Activities don't align with major?

For EACH concern, provide reframing strategy.

Return JSON using same structure as academic concerns.

Return ONLY the JSON object.`;

        const activityResponse = await callClaude(claudeKey, activityConcernsPrompt);
        const { potentialConcerns: activityConcerns } = parseJSON(activityResponse, { potentialConcerns: [] });

        // ============================================
        // PHASE 3: ANALYZE OVERALL ACADEMIC PROFILE
        // ============================================

        const academicProfilePrompt = `You are a college admissions expert. Provide strategic guidance on presenting this academic profile.

TRANSCRIPT:
${JSON.stringify(transcript, null, 2)}

${profile ? `GPA: ${profile.gpa}
MAJOR: ${profile.major}` : ''}

TASK: Provide strategic framing for:
1. GPA context (how to explain/contextualize it)
2. Course rigor (what to highlight)
3. Grade trajectory (upward trend? how to show it?)

Return JSON:
{
  "academicProfile": {
    "gpaContext": "How to contextualize GPA in essays",
    "courseRigor": "Which courses to highlight as challenging",
    "gradeTrajectory": "How to frame grade trend (if any)"
  }
}

Return ONLY the JSON object.`;

        const profileResponse = await callClaude(claudeKey, academicProfilePrompt);
        const { academicProfile } = parseJSON(profileResponse, {
            academicProfile: {
                gpaContext: '',
                courseRigor: '',
                gradeTrajectory: ''
            }
        });

        // ============================================
        // PHASE 4: ANALYZE ACTIVITY PROFILE
        // ============================================

        const activityProfilePrompt = `You are a college admissions expert. Analyze the overall activity profile.

ACTIVITIES:
${JSON.stringify(activities, null, 2)}

TASK: Assess:
1. Leadership (strong, moderate, weak?)
2. Depth vs Breadth (specialist or generalist?)
3. Time commitment (total hours across all activities)
4. Overall impact level

Return JSON:
{
  "activityProfile": {
    "leadershipGaps": "If limited leadership, note it here (or null if strong)",
    "depthVsBreadth": "depth or breadth or balanced",
    "timeCommitment": "Total estimated hours per week/year",
    "impactLevel": "Assessment of overall impact: transformative/significant/moderate/developing"
  }
}

Return ONLY the JSON object.`;

        const activityProfileResponse = await callClaude(claudeKey, activityProfilePrompt);
        const { activityProfile } = parseJSON(activityProfileResponse, {
            activityProfile: {
                depthVsBreadth: 'balanced',
                timeCommitment: '',
                impactLevel: ''
            }
        });

        // ============================================
        // PHASE 5: ESSAY STRATEGY
        // ============================================

        const essayStrategyPrompt = `You are a college admissions strategist. Based on this profile, what should essays emphasize vs minimize?

POTENTIAL CONCERNS:
${JSON.stringify([...academicConcerns, ...activityConcerns], null, 2)}

ACADEMIC PROFILE:
${JSON.stringify(academicProfile, null, 2)}

ACTIVITY PROFILE:
${JSON.stringify(activityProfile, null, 2)}

TASK: Provide strategic essay guidance.

What to EMPHASIZE (play to strengths):
- List 5-7 things to highlight prominently in essays

What to MINIMIZE (don't draw attention to):
- List 3-5 things to mention minimally or reframe

Compensating strengths (what overcomes weaknesses):
- List 3-5 strengths that compensate for any weaknesses

Return JSON:
{
  "essayStrategy": {
    "whatToEmphasize": [
      "Strength to emphasize in essays"
    ],
    "whatToMinimize": [
      "Weakness to minimize or reframe"
    ],
    "compensatingStrengths": [
      "Strength that compensates for weaknesses"
    ]
  }
}

Return ONLY the JSON object.`;

        const strategyResponse = await callClaude(claudeKey, essayStrategyPrompt);
        const { essayStrategy } = parseJSON(strategyResponse, {
            essayStrategy: {
                whatToEmphasize: [],
                whatToMinimize: [],
                compensatingStrengths: []
            }
        });

        // ============================================
        // PHASE 6: BUILD COMPLETE ANALYSIS
        // ============================================

        const weaknessAnalysis: WeaknessAnalysis = {
            potentialConcerns: [...academicConcerns, ...activityConcerns],
            academicProfile,
            activityProfile,
            essayStrategy,
            analyzedAt: new Date().toISOString()
        };

        console.log(`✅ Weakness analysis complete:`);
        console.log(`   - ${academicConcerns.length} academic concerns identified`);
        console.log(`   - ${activityConcerns.length} activity concerns identified`);
        console.log(`   - ${essayStrategy.whatToEmphasize.length} strengths to emphasize`);
        console.log(`   - ${essayStrategy.compensatingStrengths.length} compensating strengths found`);

        return NextResponse.json({
            success: true,
            weaknessAnalysis,
            summary: {
                totalConcerns: academicConcerns.length + activityConcerns.length,
                academicConcerns: academicConcerns.length,
                activityConcerns: activityConcerns.length,
                strengthsToEmphasize: essayStrategy.whatToEmphasize.length,
                compensatingStrengths: essayStrategy.compensatingStrengths.length
            }
        });

    } catch (error) {
        console.error('Weakness analysis error:', error);
        return NextResponse.json({
            error: 'Failed to analyze weaknesses',
            message: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

async function callClaude(apiKey: string, prompt: string): Promise<string> {
    const response = await fetch(CLAUDE_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model: 'claude-sonnet-4-5-20250929',
            max_tokens: 4000,
            temperature: 0.3,
            messages: [{ role: 'user', content: prompt }],
        }),
    });

    if (!response.ok) {
        throw new Error(`Claude API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.content[0].text.trim();
}

function parseJSON(text: string, defaultValue: any): any {
    try {
        const jsonMatch = text.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return defaultValue;
    } catch {
        return defaultValue;
    }
}
