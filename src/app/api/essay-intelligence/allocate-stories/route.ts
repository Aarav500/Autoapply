'use server';

import { NextRequest, NextResponse } from 'next/server';
import { StoryAllocation } from '@/lib/s3-storage';

// ============================================
// STORY ALLOCATION & DEDUPLICATION SYSTEM
// Ensures no story repetition across essays
// Maximizes theme diversity for full personality showcase
// ============================================

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const getClaudeKey = () => process.env.CLAUDE_API_KEY || process.env.NEXT_PUBLIC_CLAUDE_API_KEY || '';

interface AllocateStoriesRequest {
    collegeId: string;
    collegeName: string;
    essays: {
        essayId: string;
        title: string;
        prompt: string;
        wordLimit: number;
    }[];
    storyMining: any; // From story mining system
}

export async function POST(request: NextRequest) {
    try {
        const body: AllocateStoriesRequest = await request.json();
        const { collegeId, collegeName, essays, storyMining } = body;

        const claudeKey = getClaudeKey();
        if (!claudeKey) {
            return NextResponse.json({ error: 'Claude API key not configured' }, { status: 500 });
        }

        console.log(`🎯 Allocating stories for ${collegeName} (${essays.length} essays)...`);

        if (!storyMining || !storyMining.stories || storyMining.stories.length === 0) {
            return NextResponse.json({
                error: 'No stories available. Run story mining first.'
            }, { status: 400 });
        }

        // ============================================
        // PHASE 1: ANALYZE AVAILABLE STORIES
        // ============================================

        const availableStories = storyMining.stories.map((story: any) => ({
            storyId: story.storyId,
            title: story.title,
            type: story.type,
            emotionalImpact: story.emotionalImpact,
            uniqueness: story.uniqueness,
            themes: extractThemes(story)
        }));

        console.log(`📚 Found ${availableStories.length} available stories`);

        // ============================================
        // PHASE 2: OPTIMAL STORY-TO-ESSAY MATCHING
        // ============================================

        const allocationPrompt = `You are an expert college admissions consultant. Allocate stories to essays to MAXIMIZE DIVERSITY and MINIMIZE REPETITION.

COLLEGE: ${collegeName}

ESSAYS (${essays.length} total):
${essays.map((e, i) => `${i + 1}. ${e.title} (${e.essayId})
   Prompt: ${e.prompt.substring(0, 150)}...
   Word Limit: ${e.wordLimit}`).join('\n\n')}

AVAILABLE STORIES (${availableStories.length} total):
${availableStories.map((s: any, i: number) => `${i + 1}. ${s.title} (${s.storyId})
   Type: ${s.type}
   Themes: ${s.themes.join(', ')}
   Impact: ${s.emotionalImpact}/100
   Uniqueness: ${s.uniqueness}/100`).join('\n\n')}

ALLOCATION RULES:
1. Each story should be used in EXACTLY ONE essay (no repetition)
2. Each essay should cover DIFFERENT themes (maximize diversity)
3. Match story type to essay prompt (fit matters)
4. Aim for theme balance across all essays:
   - Technical/academic
   - Leadership/teamwork
   - Cultural/personal
   - Community/service
   - Challenge/growth

GOAL: After reading all ${essays.length} essays, admissions officers should see a COMPLETE, DIVERSE picture of the student.

Return JSON:
{
  "allocation": [
    {
      "essayId": "essay-1",
      "assignedStory": {
        "storyId": "story-1",
        "title": "Story title",
        "reason": "Why this story fits this essay perfectly",
        "fitScore": 95
      },
      "backupStories": [
        { "storyId": "story-2", "title": "Backup 1", "fitScore": 85 },
        { "storyId": "story-3", "title": "Backup 2", "fitScore": 80 }
      ]
    }
  ],
  "themeCoverage": {
    "technical": ["essay-1", "essay-3"],
    "leadership": ["essay-2"],
    "cultural": ["essay-4"],
    "community": ["essay-5"],
    "challenge": ["essay-1", "essay-2"]
  }
}

Ensure MAXIMUM DIVERSITY and NO REPETITION.`;

        const allocationResponse = await callClaude(claudeKey, allocationPrompt, 4000);
        const allocationData = parseJSON(allocationResponse, { allocation: [], themeCoverage: {} });

        // ============================================
        // PHASE 3: THEME DIVERSITY ANALYSIS
        // ============================================

        console.log('🎨 Analyzing theme diversity...');

        const themeDiversityPrompt = `Analyze theme diversity across these ${essays.length} essays for ${collegeName}.

ALLOCATION:
${JSON.stringify(allocationData.allocation, null, 2)}

AVAILABLE STORIES:
${JSON.stringify(availableStories, null, 2)}

Analyze:
1. Which themes are OVER-represented (appearing in 50%+ of essays)?
2. Which themes are UNDER-represented (missing or only 1 essay)?
3. Is there a balanced showcase of the student's full personality?

Return JSON:
{
  "themeDiversity": [
    {
      "theme": "technical",
      "essaysUsing": ["essay-1", "essay-3"],
      "coverage": 40,
      "status": "balanced",
      "recommendation": "Good coverage of technical depth"
    },
    {
      "theme": "leadership",
      "essaysUsing": ["essay-2"],
      "coverage": 20,
      "status": "under-represented",
      "recommendation": "Add more leadership examples in essay-5"
    }
  ]
}`;

        const themeDiversityResponse = await callClaude(claudeKey, themeDiversityPrompt, 2000);
        const themeDiversityData = parseJSON(themeDiversityResponse, { themeDiversity: [] });

        // ============================================
        // PHASE 4: DEDUPLICATION CHECK
        // ============================================

        console.log('🔍 Checking for story duplication...');

        const storyUsageMap: Record<string, string[]> = {};
        allocationData.allocation.forEach((alloc: any) => {
            const storyId = alloc.assignedStory.storyId;
            if (!storyUsageMap[storyId]) {
                storyUsageMap[storyId] = [];
            }
            storyUsageMap[storyId].push(alloc.essayId);
        });

        const storyUsage = availableStories.map((story: any) => {
            const usedIn = storyUsageMap[story.storyId] || [];
            let status: 'unused' | 'used-once' | 'overused' = 'unused';
            let recommendation = '';

            if (usedIn.length === 0) {
                status = 'unused';
                recommendation = `Story "${story.title}" is not used. Consider if it could strengthen any essay.`;
            } else if (usedIn.length === 1) {
                status = 'used-once';
                recommendation = `✅ Perfect - used once in ${usedIn[0]}`;
            } else {
                status = 'overused';
                recommendation = `⚠️ CRITICAL: Story used in ${usedIn.length} essays: ${usedIn.join(', ')}. This is redundant!`;
            }

            return {
                storyId: story.storyId,
                usedInEssays: usedIn,
                usageStatus: status,
                recommendation
            };
        });

        const deduplicationWarnings = storyUsage
            .filter((s: any) => s.usageStatus === 'overused')
            .map((s: any) => ({
                issue: `Story "${availableStories.find((st: any) => st.storyId === s.storyId)?.title}" used in ${s.usedInEssays.length} essays`,
                severity: s.usedInEssays.length >= 3 ? 'critical' : 'moderate' as 'critical' | 'moderate' | 'minor',
                affectedEssays: s.usedInEssays,
                resolution: `Assign different stories to ${s.usedInEssays.slice(1).join(', ')}. Use backup stories.`
            }));

        // ============================================
        // PHASE 5: DIVERSITY METRICS
        // ============================================

        console.log('📊 Calculating diversity metrics...');

        const diversityPrompt = `Calculate diversity metrics for this essay allocation:

ESSAYS: ${essays.length}
STORIES USED: ${storyUsage.filter((s: any) => s.usageStatus !== 'unused').length}
THEME DIVERSITY: ${JSON.stringify(themeDiversityData.themeDiversity)}
DUPLICATIONS: ${deduplicationWarnings.length}

Score these metrics (0-100):
1. Theme Variety: How diverse are the themes across essays?
2. Story Uniqueness: Does each essay tell a different story?
3. Narrative Progression: Do essays complement each other (tell a cohesive story)?

Return JSON:
{
  "themeVariety": 85,
  "storyUniqueness": 100,
  "narrativeProgression": 90,
  "overall": 92
}`;

        const diversityMetricsResponse = await callClaude(claudeKey, diversityPrompt, 1000);
        const diversityMetrics = parseJSON(diversityMetricsResponse, {
            themeVariety: 80,
            storyUniqueness: 90,
            narrativeProgression: 85,
            overall: 85
        });

        // ============================================
        // PHASE 6: RECOMMENDATIONS
        // ============================================

        console.log('💡 Generating recommendations...');

        const recommendationsPrompt = `Based on this analysis, provide actionable recommendations:

THEME DIVERSITY: ${JSON.stringify(themeDiversityData.themeDiversity)}
STORY USAGE: ${JSON.stringify(storyUsage)}
DUPLICATIONS: ${deduplicationWarnings.length}
DIVERSITY SCORE: ${diversityMetrics.overall}/100

Generate 3-5 specific recommendations to improve diversity and eliminate duplication.

Return JSON:
{
  "recommendations": [
    {
      "type": "swap-story",
      "essayId": "essay-3",
      "suggestion": "Swap current story with backup story 'XYZ' to add more cultural perspective",
      "expectedImpact": 15,
      "priority": "high"
    }
  ]
}`;

        const recommendationsResponse = await callClaude(claudeKey, recommendationsPrompt, 2000);
        const recommendationsData = parseJSON(recommendationsResponse, { recommendations: [] });

        // ============================================
        // BUILD COMPLETE STORY ALLOCATION OBJECT
        // ============================================

        const storyAllocation: StoryAllocation = {
            collegeId,
            collegeName,
            essays,
            availableStories,
            allocation: allocationData.allocation,
            themeDiversity: themeDiversityData.themeDiversity,
            storyUsage,
            deduplicationWarnings,
            diversityMetrics,
            recommendations: recommendationsData.recommendations,
            allocatedAt: new Date().toISOString()
        };

        console.log(`✅ Story allocation complete for ${collegeName}:`);
        console.log(`   - ${essays.length} essays`);
        console.log(`   - ${availableStories.length} stories available`);
        console.log(`   - ${storyUsage.filter((s: any) => s.usageStatus === 'used-once').length} stories allocated`);
        console.log(`   - ${deduplicationWarnings.length} duplication warnings`);
        console.log(`   - Diversity score: ${diversityMetrics.overall}/100`);

        return NextResponse.json({
            success: true,
            storyAllocation,
            summary: {
                totalEssays: essays.length,
                totalStories: availableStories.length,
                storiesAllocated: storyUsage.filter((s: any) => s.usageStatus === 'used-once').length,
                duplications: deduplicationWarnings.length,
                diversityScore: diversityMetrics.overall,
                needsImprovement: diversityMetrics.overall < 85
            }
        });

    } catch (error) {
        console.error('Story allocation error:', error);
        return NextResponse.json({
            error: 'Failed to allocate stories',
            message: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

async function callClaude(apiKey: string, prompt: string, maxTokens: number = 3000): Promise<string> {
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

function extractThemes(story: any): string[] {
    const themes: string[] = [];

    const type = story.type?.toLowerCase() || '';
    if (type.includes('technical') || type.includes('research')) themes.push('technical');
    if (type.includes('leadership') || type.includes('team')) themes.push('leadership');
    if (type.includes('cultural') || type.includes('identity')) themes.push('cultural');
    if (type.includes('community') || type.includes('service')) themes.push('community');
    if (type.includes('challenge') || type.includes('failure') || type.includes('growth')) themes.push('challenge');
    if (type.includes('passion') || type.includes('impact')) themes.push('passion');

    // Extract from context, conflict, action
    const text = `${story.context} ${story.conflict} ${story.action}`.toLowerCase();
    if (text.includes('code') || text.includes('algorithm') || text.includes('research')) themes.push('technical');
    if (text.includes('lead') || text.includes('organize') || text.includes('mentor')) themes.push('leadership');
    if (text.includes('culture') || text.includes('heritage') || text.includes('identity')) themes.push('cultural');
    if (text.includes('volunteer') || text.includes('community') || text.includes('help')) themes.push('community');

    // Remove duplicates
    return Array.from(new Set(themes));
}
