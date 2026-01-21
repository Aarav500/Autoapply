'use server';

import { NextRequest, NextResponse } from 'next/server';
import { ActivityIntelligence } from '@/lib/s3-storage';
import { targetColleges } from '@/lib/colleges-data';

// ============================================
// ACTIVITY INTELLIGENCE ANALYZER
// Extracts maximum essay value from activities
// ============================================

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const getClaudeKey = () => process.env.CLAUDE_API_KEY || process.env.NEXT_PUBLIC_CLAUDE_API_KEY || '';

interface AnalyzeActivitiesRequest {
    activities: any[];
    achievements?: any[];
    profile?: {
        major: string;
        interests: string[];
        careerGoals: string[];
        currentSchool: string;
    };
}

export async function POST(request: NextRequest) {
    try {
        const body: AnalyzeActivitiesRequest = await request.json();
        const { activities, achievements = [], profile } = body;

        const claudeKey = getClaudeKey();
        if (!claudeKey) {
            return NextResponse.json({
                error: 'Claude API key not configured'
            }, { status: 500 });
        }

        console.log(`🔍 Analyzing ${activities.length} activities for essay intelligence...`);

        // ============================================
        // PHASE 1: EXTRACT KEY THEMES & PATTERNS
        // ============================================

        const themesPrompt = `You are an expert college admissions essay analyst. Analyze these activities and extract key themes, patterns, and unique angles.

ACTIVITIES:
${JSON.stringify(activities, null, 2)}

${achievements.length > 0 ? `ACHIEVEMENTS:\n${JSON.stringify(achievements, null, 2)}` : ''}

${profile ? `STUDENT PROFILE:
- Major: ${profile.major}
- Interests: ${profile.interests.join(', ')}
- Career Goals: ${profile.careerGoals.join(', ')}
- Current School: ${profile.currentSchool}` : ''}

TASK: Identify the key themes and what makes this student unique.

Return JSON:
{
  "keyThemes": [
    "Theme 1 (e.g., 'AI/ML research and ethics')",
    "Theme 2 (e.g., 'Community service through technology')",
    "Theme 3"
  ],
  "uniqueAngles": [
    "What makes this student different from typical CS applicants",
    "Unique perspective or background",
    "Unusual combination of interests"
  ]
}

Return ONLY the JSON object.`;

        const themesResponse = await callClaude(claudeKey, themesPrompt);
        const { keyThemes, uniqueAngles } = parseJSON(themesResponse, {
            keyThemes: [],
            uniqueAngles: []
        });

        // ============================================
        // PHASE 2: MINE EMOTIONAL MOMENTS & STORIES
        // ============================================

        const emotionalMomentsPrompt = `You are an expert at finding compelling personal stories. Analyze these activities for emotional moments and story potential.

ACTIVITIES:
${JSON.stringify(activities, null, 2)}

TASK: Find 5-10 moments with high emotional impact and story potential.

For EACH moment, identify:
- Which activity it's from
- The specific moment (failure, challenge, breakthrough, impact)
- Why it's emotionally compelling
- Its story potential for college essays

Return JSON:
{
  "emotionalMoments": [
    {
      "activity": "Activity name",
      "moment": "Describe the specific moment (e.g., 'When my ML model failed due to bias in training data')",
      "emotionalImpact": 85,  // 0-100 score
      "storyPotential": 90,   // 0-100 score
      "whyCompelling": "Why this moment matters"
    }
  ]
}

Return ONLY the JSON array.`;

        const emotionalResponse = await callClaude(claudeKey, emotionalMomentsPrompt);
        const { emotionalMoments } = parseJSON(emotionalResponse, { emotionalMoments: [] });

        // ============================================
        // PHASE 3: EXTRACT SPECIFIC METRICS
        // ============================================

        const metricsPrompt = `You are a data extraction specialist. Extract ALL specific, quantifiable metrics from these activities.

ACTIVITIES:
${JSON.stringify(activities, null, 2)}

${achievements.length > 0 ? `ACHIEVEMENTS:\n${JSON.stringify(achievements, null, 2)}` : ''}

TASK: Find every number, metric, and quantifiable achievement.

Examples:
- "200+ hours of tutoring"
- "47 students taught"
- "$5,000 raised for charity"
- "Reduced processing time from 4 hours to 47 minutes"
- "89% model accuracy, improved to 94%"
- "Led team of 12 volunteers"

Return JSON:
{
  "specificNumbers": [
    {
      "metric": "200+ hours",
      "context": "Tutored underprivileged students in CS",
      "impactLevel": "high"
    },
    {
      "metric": "47 students",
      "context": "Total students taught programming",
      "impactLevel": "high"
    }
  ]
}

Include EVERY quantifiable metric you find. Return ONLY the JSON object.`;

        const metricsResponse = await callClaude(claudeKey, metricsPrompt);
        const { specificNumbers } = parseJSON(metricsResponse, { specificNumbers: [] });

        // ============================================
        // PHASE 4: TRANSFER MOTIVATION ANALYSIS
        // ============================================

        const transferMotivationPrompt = `You are a transfer admissions expert. Based on these activities, identify why this student needs to transfer.

ACTIVITIES:
${JSON.stringify(activities, null, 2)}

${profile ? `CURRENT SCHOOL: ${profile.currentSchool}
MAJOR: ${profile.major}
INTERESTS: ${profile.interests.join(', ')}` : ''}

TASK: Analyze what these activities reveal about:
1. What's lacking at their current school
2. What they need to continue/expand their work
3. Where they want to grow

Return JSON:
{
  "transferMotivation": {
    "currentLimitations": [
      "UCR lacks advanced AI research labs for hands-on ML work",
      "No professors specializing in AI ethics",
      "Limited industry partnerships for AI internships"
    ],
    "futureNeeds": [
      "Access to cutting-edge AI research facilities",
      "Mentorship from AI ethics researchers",
      "Proximity to Silicon Valley AI companies"
    ],
    "growthAreas": [
      "Want to work on production-level AI systems",
      "Need to publish research in AI fairness",
      "Build connections with AI safety community"
    ]
  }
}

Return ONLY the JSON object.`;

        const transferResponse = await callClaude(claudeKey, transferMotivationPrompt);
        const { transferMotivation } = parseJSON(transferResponse, {
            transferMotivation: {
                currentLimitations: [],
                futureNeeds: [],
                growthAreas: []
            }
        });

        // ============================================
        // PHASE 5: COLLEGE-SPECIFIC ALIGNMENT
        // ============================================

        const collegeAlignment: Record<string, any> = {};

        for (const college of targetColleges) {
            const alignmentPrompt = `You are a ${college.fullName} admissions expert. Analyze how these activities align with ${college.name}.

ACTIVITIES:
${JSON.stringify(activities, null, 2)}

${profile ? `STUDENT PROFILE:
- Major: ${profile.major}
- Interests: ${profile.interests.join(', ')}
- Career Goals: ${profile.careerGoals.join(', ')}` : ''}

${college.fullName} STRENGTHS:
- Notable Programs: ${college.research.notablePrograms.join(', ')}
- Unique Features: ${college.research.uniqueFeatures.join(', ')}
- Values: ${college.research.values.join(', ')}
- Culture: ${college.research.culture}

TASK: Identify how this student's activities align with ${college.name}.

Return JSON:
{
  "matchingActivities": [
    "Activity name that aligns with ${college.name}"
  ],
  "relevantProfessors": [
    "Professor name whose work connects to student's activities"
  ],
  "relevantCourses": [
    "Course code/name that builds on student's activities"
  ],
  "uniqueOpportunities": [
    "${college.name}-specific opportunities to highlight in essays"
  ],
  "alignmentScore": 85,  // 0-100 score
  "connectionPoints": [
    "How student's activities connect to ${college.name}'s strengths"
  ]
}

Return ONLY the JSON object.`;

            const alignmentResponse = await callClaude(claudeKey, alignmentPrompt);
            const alignment = parseJSON(alignmentResponse, {
                matchingActivities: [],
                relevantProfessors: [],
                relevantCourses: [],
                uniqueOpportunities: [],
                alignmentScore: 0,
                connectionPoints: []
            });

            collegeAlignment[college.id] = alignment;
        }

        // ============================================
        // PHASE 6: BUILD COMPLETE INTELLIGENCE OBJECT
        // ============================================

        const activityIntelligence: ActivityIntelligence = {
            keyThemes,
            uniqueAngles,
            emotionalMoments,
            specificNumbers,
            transferMotivation,
            collegeAlignment,
            analyzedAt: new Date().toISOString()
        };

        console.log(`✅ Activity intelligence complete:`);
        console.log(`   - ${keyThemes.length} key themes`);
        console.log(`   - ${uniqueAngles.length} unique angles`);
        console.log(`   - ${emotionalMoments.length} emotional moments`);
        console.log(`   - ${specificNumbers.length} specific metrics`);
        console.log(`   - ${Object.keys(collegeAlignment).length} colleges analyzed`);

        return NextResponse.json({
            success: true,
            activityIntelligence,
            summary: {
                themesFound: keyThemes.length,
                uniqueAnglesFound: uniqueAngles.length,
                emotionalMomentsFound: emotionalMoments.length,
                metricsExtracted: specificNumbers.length,
                collegesAnalyzed: Object.keys(collegeAlignment).length
            }
        });

    } catch (error) {
        console.error('Activity intelligence error:', error);
        return NextResponse.json({
            error: 'Failed to analyze activities',
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
