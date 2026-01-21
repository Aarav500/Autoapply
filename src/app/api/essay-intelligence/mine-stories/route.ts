'use server';

import { NextRequest, NextResponse } from 'next/server';
import { StoryMining } from '@/lib/s3-storage';
import { targetColleges } from '@/lib/colleges-data';

// ============================================
// STORY MINING ENGINE
// Auto-finds best narrative opportunities from activities
// ============================================

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const getClaudeKey = () => process.env.CLAUDE_API_KEY || process.env.NEXT_PUBLIC_CLAUDE_API_KEY || '';

interface MineStoriesRequest {
    activities: any[];
    achievements?: any[];
    activityIntelligence?: any; // From analyze-activities
    targetPrompts?: string[]; // Essay prompts to analyze against
}

export async function POST(request: NextRequest) {
    try {
        const body: MineStoriesRequest = await request.json();
        const { activities, achievements = [], activityIntelligence, targetPrompts = [] } = body;

        const claudeKey = getClaudeKey();
        if (!claudeKey) {
            return NextResponse.json({
                error: 'Claude API key not configured'
            }, { status: 500 });
        }

        console.log(`⛏️ Mining stories from ${activities.length} activities...`);

        // ============================================
        // PHASE 1: IDENTIFY FAILURE → LEARNING STORIES
        // ============================================

        const failureStoriesPrompt = `You are an expert at finding compelling failure-to-learning stories for college essays. These are the MOST powerful essay stories.

ACTIVITIES:
${JSON.stringify(activities, null, 2)}

${achievements.length > 0 ? `ACHIEVEMENTS:\n${JSON.stringify(achievements, null, 2)}` : ''}

TASK: Find 3-5 authentic failure → learning moments. These are moments where:
- Something went wrong or failed
- Student learned something valuable
- Shows vulnerability and growth

Examples:
- "My ML model had 89% accuracy but was biased"
- "Our app crashed during the demo"
- "Lost the robotics competition in finals"

For each story, provide:
- Hook: Compelling opening line
- Context: Brief background (1-2 sentences)
- Conflict: What went wrong
- Action: What student did
- Result: What happened
- Reflection: What student learned

Return JSON:
{
  "stories": [
    {
      "storyId": "failure-1",
      "title": "Short title (e.g., 'The Biased AI Model')",
      "type": "failure-learning",
      "hook": "Honestly, I didn't expect my AI to be racist.",
      "context": "Built ML model to predict student performance in CS 010A",
      "conflict": "Discovered 89% accuracy masked severe bias against certain demographics",
      "action": "Spent 6 weeks debugging data, rebuilding training set, consulting professor",
      "result": "Accuracy dropped to 76% but gained fairness. Published findings.",
      "reflection": "Learned that 'accurate' doesn't mean 'fair'. Changed career focus to AI ethics.",
      "emotionalImpact": 90,
      "uniqueness": 85,
      "authenticity": 95,
      "relatedActivities": ["ML Research Lab"],
      "specificMetrics": ["89% accuracy", "76% accuracy", "6 weeks", "published at IEEE"]
    }
  ]
}

Return ONLY the JSON object with 3-5 failure stories.`;

        const failureResponse = await callClaude(claudeKey, failureStoriesPrompt);
        const failureStories = parseJSON(failureResponse, { stories: [] }).stories || [];

        // ============================================
        // PHASE 2: IDENTIFY CHALLENGE → GROWTH STORIES
        // ============================================

        const challengeStoriesPrompt = `You are an expert at finding challenge → growth stories for college essays.

ACTIVITIES:
${JSON.stringify(activities, null, 2)}

TASK: Find 3-5 stories where student faced a significant challenge and grew from it.

Examples:
- Overcame language barrier to teach CS
- Managed team conflict during hackathon
- Balanced work and school while supporting family

Use same JSON structure as before, but type: "challenge-growth"

Return ONLY the JSON object with 3-5 challenge stories.`;

        const challengeResponse = await callClaude(claudeKey, challengeStoriesPrompt);
        const challengeStories = parseJSON(challengeResponse, { stories: [] }).stories || [];

        // ============================================
        // PHASE 3: IDENTIFY PASSION → IMPACT STORIES
        // ============================================

        const impactStoriesPrompt = `You are an expert at finding passion → impact stories for college essays.

ACTIVITIES:
${JSON.stringify(activities, null, 2)}

${achievements.length > 0 ? `ACHIEVEMENTS:\n${JSON.stringify(achievements, null, 2)}` : ''}

TASK: Find 3-5 stories where student's passion led to measurable impact.

Examples:
- Built app that helped 500+ students
- Tutoring program reduced CS dropout rate
- Research published at major conference

Use same JSON structure, but type: "passion-impact"

Focus on QUANTIFIABLE impact with specific numbers.

Return ONLY the JSON object with 3-5 impact stories.`;

        const impactResponse = await callClaude(claudeKey, impactStoriesPrompt);
        const impactStories = parseJSON(impactResponse, { stories: [] }).stories || [];

        // ============================================
        // PHASE 4: IDENTIFY LEADERSHIP → TEAM STORIES
        // ============================================

        const leadershipStoriesPrompt = `You are an expert at finding leadership → team dynamic stories for college essays.

ACTIVITIES:
${JSON.stringify(activities, null, 2)}

TASK: Find 2-3 stories that show leadership and collaboration.

Examples:
- Led diverse team through difficult project
- Mentored younger students
- Coordinated volunteers for community service

Use same JSON structure, but type: "leadership-team"

Focus on HOW student led, not just that they were a leader.

Return ONLY the JSON object with 2-3 leadership stories.`;

        const leadershipResponse = await callClaude(claudeKey, leadershipStoriesPrompt);
        const leadershipStories = parseJSON(leadershipResponse, { stories: [] }).stories || [];

        // ============================================
        // PHASE 5: SCORE STORIES FOR COLLEGE ALIGNMENT
        // ============================================

        const allStories = [
            ...failureStories,
            ...challengeStories,
            ...impactStories,
            ...leadershipStories
        ];

        // Score each story against each college
        for (const story of allStories) {
            story.collegeAlignment = {};

            for (const college of targetColleges) {
                const alignmentPrompt = `You are a ${college.fullName} admissions expert. Score how well this story fits ${college.name}.

STORY:
${JSON.stringify(story, null, 2)}

${college.fullName} VALUES:
${college.research.values.join(', ')}

${college.fullName} CULTURE:
${college.research.culture}

TASK: Score 0-100 how well this story aligns with ${college.name}'s values and culture.

Return JSON:
{
  "alignmentScore": 85,
  "reasoning": "Why this score"
}

Return ONLY the JSON object.`;

                const alignmentResponse = await callClaude(claudeKey, alignmentPrompt);
                const { alignmentScore } = parseJSON(alignmentResponse, { alignmentScore: 50 });

                story.collegeAlignment[college.id] = alignmentScore;
            }
        }

        // ============================================
        // PHASE 6: MAP STORIES TO ESSAY PROMPTS
        // ============================================

        if (targetPrompts.length > 0) {
            for (const story of allStories) {
                const promptMappingPrompt = `You are a college essay expert. Determine which of these prompts this story could answer well.

STORY:
Title: ${story.title}
Type: ${story.type}
Hook: ${story.hook}
Conflict: ${story.conflict}
Reflection: ${story.reflection}

PROMPTS:
${targetPrompts.map((p, i) => `${i + 1}. ${p}`).join('\n')}

TASK: Which prompts does this story answer? Return prompt text (not numbers).

Return JSON:
{
  "suitablePrompts": [
    "Full prompt text that this story answers"
  ]
}

Return ONLY the JSON object.`;

                const promptResponse = await callClaude(claudeKey, promptMappingPrompt);
                const { suitablePrompts } = parseJSON(promptResponse, { suitablePrompts: [] });

                story.suitablePrompts = suitablePrompts;
            }
        }

        // ============================================
        // PHASE 7: RANK STORIES BY OVERALL POTENTIAL
        // ============================================

        const rankedStories = allStories
            .map(story => ({
                ...story,
                overallScore: (
                    story.emotionalImpact * 0.35 +
                    story.uniqueness * 0.35 +
                    story.authenticity * 0.30
                )
            }))
            .sort((a, b) => b.overallScore - a.overallScore);

        const storyMining: StoryMining = {
            stories: rankedStories,
            minedAt: new Date().toISOString()
        };

        console.log(`✅ Story mining complete:`);
        console.log(`   - ${failureStories.length} failure → learning stories`);
        console.log(`   - ${challengeStories.length} challenge → growth stories`);
        console.log(`   - ${impactStories.length} passion → impact stories`);
        console.log(`   - ${leadershipStories.length} leadership → team stories`);
        console.log(`   - Top story: "${rankedStories[0]?.title}" (score: ${rankedStories[0]?.overallScore.toFixed(1)})`);

        return NextResponse.json({
            success: true,
            storyMining,
            summary: {
                totalStories: rankedStories.length,
                failureStories: failureStories.length,
                challengeStories: challengeStories.length,
                impactStories: impactStories.length,
                leadershipStories: leadershipStories.length,
                topStory: rankedStories[0]?.title,
                topScore: rankedStories[0]?.overallScore
            }
        });

    } catch (error) {
        console.error('Story mining error:', error);
        return NextResponse.json({
            error: 'Failed to mine stories',
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
            temperature: 0.4, // Slightly higher for creativity in story finding
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
