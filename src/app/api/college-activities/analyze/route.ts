'use server';

import { NextRequest, NextResponse } from 'next/server';

// ============================================
// COLLEGE-SPECIFIC ACTIVITIES ANALYZER
// Customizes activities for each college and provides readiness analysis
// ============================================

interface AnalyzeRequest {
    college: {
        id: string;
        name: string;
        fullName: string;
        values?: string[];
        whatTheyLookFor?: string[];
        culture?: string;
        notablePrograms?: string[];
    };
    activities: any[];
    achievements: any[];
    userProfile?: {
        major?: string;
        gpa?: number;
        interests?: string[];
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
                model: 'claude-sonnet-4-20250514',
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
        // Try to extract JSON from markdown code blocks first
        const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\}|\[[\s\S]*?\])\s*```/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[1]);
        }

        // Try to find JSON object or array in the text
        const objectMatch = text.match(/\{[\s\S]*\}/);
        const arrayMatch = text.match(/\[[\s\S]*\]/);

        if (objectMatch) {
            return JSON.parse(objectMatch[0]);
        }
        if (arrayMatch) {
            return JSON.parse(arrayMatch[0]);
        }

        // Last resort: try parsing the whole text
        return JSON.parse(text);
    } catch (e) {
        console.error('JSON parse error:', e);
        console.error('Text to parse:', text.substring(0, 500));
        return fallback;
    }
}

export async function POST(request: NextRequest) {
    try {
        const body: AnalyzeRequest = await request.json();
        const { college, activities, achievements, userProfile } = body;

        console.log(`🎯 Analyzing activities for ${college.name}...`);
        console.log(`   📦 Received ${activities?.length || 0} activities, ${achievements?.length || 0} achievements`);
        console.log(`   👤 User profile: major=${userProfile?.major}, gpa=${userProfile?.gpa}`);

        // Check if we have enough data to analyze
        if (!activities || activities.length === 0) {
            console.error('❌ No activities provided - returning error');
            return NextResponse.json({
                error: 'No activities provided',
                message: 'Please add activities to your profile before analyzing.',
            }, { status: 400 });
        }

        // Log first activity to verify data structure
        console.log(`   📋 First activity: ${JSON.stringify(activities[0], null, 2).substring(0, 500)}`);

        // ============================================
        // PHASE 1: Prioritize activities for this college
        // ============================================
        console.log('📊 Phase 1: Prioritizing activities...');

        const prioritizePrompt = `You are an admissions consultant. Prioritize and customize these activities for ${college.fullName}.

COLLEGE INFO:
- Values: ${college.values?.join(', ') || 'Excellence, Innovation'}
- What They Look For: ${college.whatTheyLookFor?.join(', ') || 'Leadership, Impact'}
- Culture: ${college.culture || 'Collaborative, innovative'}
- Notable Programs: ${college.notablePrograms?.join(', ') || 'Not specified'}

USER PROFILE:
- Major: ${userProfile?.major || 'Undeclared'}
- GPA: ${userProfile?.gpa || 'Not provided'}

ACTIVITIES (${activities.length} total):
${activities.map((a, i) => `
${i + 1}. ${a.name}
   Role: ${a.role}
   Description: ${a.description}
   Category: ${a.category || 'General'}
   Hours: ${a.hoursPerWeek || 0}h/week
   Duration: ${a.startDate} - ${a.endDate || 'Present'}
`).join('\n')}

Task: For each activity, assign:
1. **Relevance Score (0-100)**: How relevant to ${college.name}'s values and programs?
2. **Priority (1-5)**: Should it be featured prominently?
3. **Customization**: How to frame this activity specifically for ${college.name}?

Return JSON array:
[
  {
    "activityId": "activity-id",
    "activityName": "Activity Name",
    "relevanceScore": 85,
    "priority": 1,
    "customization": {
      "emphasize": "Technical leadership aligns with MIT's maker culture",
      "reframe": "Highlight the engineering problem-solving aspect",
      "connect": "Mention interest in MIT CSAIL or Media Lab"
    },
    "reasoning": "Strong STEM project with measurable impact"
  }
]

Sort by relevanceScore (highest first).`;

        const prioritizedActivitiesResult = await callClaude(prioritizePrompt, 4000);
        const prioritizedActivities = parseJSON(prioritizedActivitiesResult, []);

        console.log(`   ✅ Prioritized ${prioritizedActivities.length} activities`);

        // ============================================
        // PHASE 2: Analyze profile readiness
        // ============================================
        console.log('🎓 Phase 2: Analyzing profile readiness...');

        const readinessPrompt = `Analyze this applicant's readiness for ${college.fullName}.

COLLEGE CRITERIA:
- Values: ${college.values?.join(', ') || 'Excellence, Innovation'}
- What They Look For: ${college.whatTheyLookFor?.join(', ') || 'Leadership, Impact'}
- Notable Programs: ${college.notablePrograms?.join(', ') || 'Various programs'}

APPLICANT:
- Major: ${userProfile?.major || 'Undeclared'}
- GPA: ${userProfile?.gpa || 'Not provided'}
- Activities: ${activities.length} total
- Achievements: ${achievements.length} total
- Top Activities: ${prioritizedActivities.slice(0, 5).map((a: any) => a.activityName).join(', ')}

Evaluate readiness in 5 categories (0-100 each):
1. **Academic Readiness**: GPA, coursework rigor
2. **Leadership**: Leadership roles and impact
3. **Research/Technical**: Research experience or technical projects
4. **Community Impact**: Service and social initiatives
5. **Fit & Passion**: Alignment with college values and culture

Return JSON:
{
  "readiness": {
    "academic": 85,
    "leadership": 75,
    "researchTechnical": 80,
    "communityImpact": 65,
    "fitPassion": 90
  },
  "overallReadiness": 79,
  "strengths": ["Strong technical background", "Clear passion for CS"],
  "gaps": ["Limited community service", "Could showcase more leadership"],
  "category": "strong-match"
}

Categories: "safety" (90-100%), "strong-match" (75-89%), "match" (60-74%), "reach" (40-59%), "high-reach" (<40%)`;

        const readinessResult = await callClaude(readinessPrompt, 2500);
        const readinessAnalysis = parseJSON(readinessResult, {
            readiness: { academic: 70, leadership: 70, researchTechnical: 70, communityImpact: 70, fitPassion: 70 },
            overallReadiness: 70,
            strengths: [],
            gaps: [],
            category: 'match',
        });

        console.log(`   ✅ Overall readiness: ${readinessAnalysis.overallReadiness}%`);

        // ============================================
        // PHASE 3: Generate recommendations
        // ============================================
        console.log('💡 Phase 3: Generating recommendations...');

        const recommendationsPrompt = `Based on the readiness analysis, provide specific, actionable recommendations to strengthen the application for ${college.name}.

READINESS SCORES:
- Academic: ${readinessAnalysis.readiness.academic}%
- Leadership: ${readinessAnalysis.readiness.leadership}%
- Research/Technical: ${readinessAnalysis.readiness.researchTechnical}%
- Community Impact: ${readinessAnalysis.readiness.communityImpact}%
- Fit & Passion: ${readinessAnalysis.readiness.fitPassion}%

GAPS IDENTIFIED:
${readinessAnalysis.gaps.join('\n')}

Provide 5-8 specific recommendations:
- Each should address a gap or strengthen an existing strength
- Be actionable (student can do it before application)
- Be specific to ${college.name} when possible

Return JSON:
{
  "recommendations": [
    {
      "priority": "high",
      "category": "leadership",
      "title": "Start a technical workshop series",
      "description": "Launch peer tutoring for advanced CS topics to demonstrate leadership",
      "impact": "Addresses leadership gap, aligns with MIT's collaborative culture",
      "timeframe": "2-3 months",
      "difficulty": "medium"
    }
  ]
}`;

        const recommendationsResult = await callClaude(recommendationsPrompt, 3000);
        const recommendations = parseJSON(recommendationsResult, { recommendations: [] });

        console.log(`   ✅ Generated ${recommendations.recommendations.length} recommendations`);

        // ============================================
        // PHASE 4: Create customized activity descriptions
        // ============================================
        console.log('✍️  Phase 4: Creating customized descriptions...');

        const customizedActivities = prioritizedActivities.slice(0, 10).map((pa: any) => {
            const originalActivity = activities.find(a => a.id === pa.activityId || a.name === pa.activityName);

            return {
                ...originalActivity,
                relevanceScore: pa.relevanceScore,
                priority: pa.priority,
                customization: pa.customization,
                reasoning: pa.reasoning,
                customizedDescription: pa.customization?.reframe || originalActivity?.description || '',
            };
        });

        console.log('✅ Analysis complete!');

        return NextResponse.json({
            success: true,
            college: {
                id: college.id,
                name: college.name,
            },
            readiness: {
                scores: readinessAnalysis.readiness,
                overall: readinessAnalysis.overallReadiness,
                category: readinessAnalysis.category,
                strengths: readinessAnalysis.strengths,
                gaps: readinessAnalysis.gaps,
            },
            activities: {
                prioritized: customizedActivities,
                total: activities.length,
                recommended: customizedActivities.filter((a: any) => a.priority <= 2).length,
            },
            recommendations: recommendations.recommendations || [],
            metadata: {
                analyzedAt: new Date().toISOString(),
                activitiesAnalyzed: activities.length,
                achievementsAnalyzed: achievements.length,
            },
        });

    } catch (error) {
        console.error('Activities analysis error:', error);
        return NextResponse.json({
            error: 'Failed to analyze activities',
            message: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
    }
}
