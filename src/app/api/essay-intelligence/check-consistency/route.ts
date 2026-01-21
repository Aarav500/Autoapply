'use server';

import { NextRequest, NextResponse } from 'next/server';
import { EssayConsistency } from '@/lib/s3-storage';

// ============================================
// CROSS-ESSAY CONSISTENCY CHECKER
// Ensures all essays for a college work together cohesively
// ============================================

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const getClaudeKey = () => process.env.CLAUDE_API_KEY || process.env.NEXT_PUBLIC_CLAUDE_API_KEY || '';

interface CheckConsistencyRequest {
    collegeId: string;
    essays: {
        essayId: string;
        prompt: string;
        content: string;
    }[];
}

export async function POST(request: NextRequest) {
    try {
        const body: CheckConsistencyRequest = await request.json();
        const { collegeId, essays } = body;

        const claudeKey = getClaudeKey();
        if (!claudeKey) {
            return NextResponse.json({
                error: 'Claude API key not configured'
            }, { status: 500 });
        }

        console.log(`🔍 Checking consistency across ${essays.length} essays for ${collegeId}...`);

        // ============================================
        // PHASE 1: DETECT STORY REPETITION
        // ============================================

        const storyRepetitionPrompt = `You are a college admissions expert. Analyze these essays for story repetition.

ESSAYS:
${essays.map((e, i) => `
ESSAY ${i + 1} (${e.essayId}):
PROMPT: ${e.prompt}
CONTENT:
${e.content}
`).join('\n---\n')}

TASK: Identify stories, anecdotes, or examples used across multiple essays.

For each repeated story:
- Which essays use it?
- Is the repetition appropriate or excessive?
- Recommendation (keep, modify, or remove from one essay)

Return JSON:
{
  "storyUsage": [
    {
      "story": "Description of the story (e.g., 'ML model bias discovery')",
      "usedInEssays": ["essay-1", "essay-2"],
      "repetitionLevel": "appropriate",  // "none", "appropriate", "excessive"
      "recommendation": "Keep in essay-1, modify in essay-2 to focus on different aspect"
    }
  ]
}

Return ONLY the JSON object.`;

        const repetitionResponse = await callClaude(claudeKey, storyRepetitionPrompt);
        const { storyUsage } = parseJSON(repetitionResponse, { storyUsage: [] });

        // ============================================
        // PHASE 2: ANALYZE THEME COVERAGE
        // ============================================

        const themeCoveragePrompt = `You are a college admissions expert. Analyze theme coverage across these essays.

ESSAYS:
${essays.map((e, i) => `
ESSAY ${i + 1} (${e.essayId}):
PROMPT: ${e.prompt}
CONTENT:
${e.content}
`).join('\n---\n')}

TASK: Identify major themes (leadership, innovation, resilience, community service, etc.) and which essays cover them.

Assess if themes are:
- Under-represented (mentioned in 0-1 essays, but should be more)
- Appropriately covered (mentioned in right number of essays)
- Over-represented (too many essays cover same theme)

Return JSON:
{
  "themeCoverage": [
    {
      "theme": "Technical innovation",
      "essaysCovering": ["essay-1", "essay-3"],
      "coverage": "appropriate"  // "under", "appropriate", "over"
    },
    {
      "theme": "Community service",
      "essaysCovering": [],
      "coverage": "under"
    }
  ]
}

Return ONLY the JSON object.`;

        const coverageResponse = await callClaude(claudeKey, themeCoveragePrompt);
        const { themeCoverage } = parseJSON(coverageResponse, { themeCoverage: [] });

        // ============================================
        // PHASE 3: DETECT CONTRADICTIONS
        // ============================================

        const contradictionsPrompt = `You are a college admissions expert. Check these essays for contradictions or inconsistencies.

ESSAYS:
${essays.map((e, i) => `
ESSAY ${i + 1} (${e.essayId}):
PROMPT: ${e.prompt}
CONTENT:
${e.content}
`).join('\n---\n')}

TASK: Identify any contradictions or inconsistencies across essays.

Examples of contradictions:
- Essay 1 says "I work best independently" but Essay 2 emphasizes "I thrive in teams"
- Different versions of same story with conflicting details
- Conflicting career goals
- Inconsistent personality traits

Return JSON:
{
  "contradictions": [
    {
      "issue": "Description of contradiction",
      "essays": ["essay-1", "essay-3"],
      "severity": "moderate",  // "critical", "moderate", "minor"
      "resolution": "How to resolve it"
    }
  ]
}

If no contradictions found, return empty array.

Return ONLY the JSON object.`;

        const contradictionsResponse = await callClaude(claudeKey, contradictionsPrompt);
        const { contradictions } = parseJSON(contradictionsResponse, { contradictions: [] });

        // ============================================
        // PHASE 4: ASSESS NARRATIVE ARC
        // ============================================

        const narrativeArcPrompt = `You are a college admissions expert. Assess if these essays together tell a complete, cohesive story.

ESSAYS:
${essays.map((e, i) => `
ESSAY ${i + 1} (${e.essayId}):
PROMPT: ${e.prompt}
CONTENT:
${e.content}
`).join('\n---\n')}

TASK: Evaluate the overall narrative arc across all essays.

Consider:
1. Completeness: Do essays together paint a full picture of the applicant? (0-100)
2. Progression: Do essays build on each other or feel disconnected?
3. Gaps: What important aspects of applicant are missing?
4. Strengths: What works well about the overall narrative?

Return JSON:
{
  "narrativeArc": {
    "completeness": 85,  // 0-100
    "progression": "Essays build well - 1 shows technical passion, 2 shows community impact, 3 shows future vision",
    "gaps": [
      "No mention of how cultural background shapes perspective",
      "Limited discussion of collaborative work"
    ],
    "strengths": [
      "Clear passion for AI ethics comes through all essays",
      "Good balance of technical depth and human impact",
      "Authentic voice consistent across all essays"
    ]
  }
}

Return ONLY the JSON object.`;

        const narrativeResponse = await callClaude(claudeKey, narrativeArcPrompt);
        const { narrativeArc } = parseJSON(narrativeResponse, {
            narrativeArc: {
                completeness: 0,
                progression: '',
                gaps: [],
                strengths: []
            }
        });

        // ============================================
        // PHASE 5: GENERATE RECOMMENDATIONS
        // ============================================

        const recommendationsPrompt = `You are a college admissions expert. Based on this analysis, provide specific recommendations to improve essay consistency.

STORY USAGE:
${JSON.stringify(storyUsage, null, 2)}

THEME COVERAGE:
${JSON.stringify(themeCoverage, null, 2)}

CONTRADICTIONS:
${JSON.stringify(contradictions, null, 2)}

NARRATIVE ARC:
${JSON.stringify(narrativeArc, null, 2)}

TASK: Provide 5-10 specific, actionable recommendations.

Each recommendation should:
- Specify which essay to modify
- Describe what to change
- Explain why it matters
- Prioritize (high/medium/low)

Return JSON:
{
  "recommendations": [
    {
      "type": "modify",  // "add", "remove", "modify"
      "essay": "essay-2",
      "suggestion": "Remove the ML bias story and replace with the community tutoring story to avoid repetition with essay-1",
      "priority": "high"
    },
    {
      "type": "add",
      "essay": "essay-3",
      "suggestion": "Add brief mention of cultural background to address gap in overall narrative",
      "priority": "medium"
    }
  ]
}

Return ONLY the JSON object.`;

        const recommendationsResponse = await callClaude(claudeKey, recommendationsPrompt);
        const { recommendations } = parseJSON(recommendationsResponse, { recommendations: [] });

        // ============================================
        // PHASE 6: BUILD COMPLETE CONSISTENCY REPORT
        // ============================================

        const essayConsistency: EssayConsistency = {
            collegeId,
            essayIds: essays.map(e => e.essayId),
            storyUsage,
            themeCoverage,
            contradictions,
            narrativeArc,
            recommendations,
            analyzedAt: new Date().toISOString()
        };

        console.log(`✅ Consistency check complete:`);
        console.log(`   - ${storyUsage.length} stories tracked`);
        console.log(`   - ${themeCoverage.length} themes analyzed`);
        console.log(`   - ${contradictions.length} contradictions found`);
        console.log(`   - Narrative completeness: ${narrativeArc.completeness}%`);
        console.log(`   - ${recommendations.length} recommendations generated`);

        return NextResponse.json({
            success: true,
            essayConsistency,
            summary: {
                storiesTracked: storyUsage.length,
                themesAnalyzed: themeCoverage.length,
                contradictionsFound: contradictions.length,
                narrativeCompleteness: narrativeArc.completeness,
                recommendationsGenerated: recommendations.length,
                criticalIssues: contradictions.filter((c: any) => c.severity === 'critical').length,
                highPriorityRecommendations: recommendations.filter((r: any) => r.priority === 'high').length
            }
        });

    } catch (error) {
        console.error('Consistency check error:', error);
        return NextResponse.json({
            error: 'Failed to check essay consistency',
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
