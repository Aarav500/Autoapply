'use server';

import { NextRequest, NextResponse } from 'next/server';
import { targetColleges } from '@/lib/colleges-data';

// ============================================
// AUTO-RESEARCH SYSTEM
// Automatically generates college-specific research
// based on user's major, interests, and goals
// ============================================

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const getClaudeKey = () => process.env.CLAUDE_API_KEY || process.env.NEXT_PUBLIC_CLAUDE_API_KEY || '';

interface AutoResearchRequest {
    collegeId: string;
    userProfile: {
        major: string;
        interests: string[];
        careerGoals: string[];
        currentSchool: string;
        whyTransferringGeneral: string; // General reason, will be customized per college
    };
}

export async function POST(request: NextRequest) {
    try {
        const body: AutoResearchRequest = await request.json();
        const { collegeId, userProfile } = body;

        const claudeKey = getClaudeKey();
        if (!claudeKey) {
            return NextResponse.json({
                error: 'Claude API key not configured'
            }, { status: 500 });
        }

        // Find college data
        const college = targetColleges.find(c => c.id === collegeId);
        if (!college) {
            return NextResponse.json({
                error: 'College not found'
            }, { status: 404 });
        }

        console.log(`🔬 Auto-researching ${college.name} for ${userProfile.major} major...`);

        // ============================================
        // PHASE 1: AUTO-GENERATE PROFESSORS
        // ============================================

        const professorsPrompt = `You are a college research assistant. Based on this student's profile, recommend 3 REAL professors at ${college.fullName} they should work with.

STUDENT PROFILE:
- Major: ${userProfile.major}
- Interests: ${userProfile.interests.join(', ')}
- Career Goals: ${userProfile.careerGoals.join(', ')}

COLLEGE: ${college.fullName}
NOTABLE PROGRAMS: ${college.research.notablePrograms.join(', ')}

Research real professors at ${college.name} and return JSON:
[
  {
    "name": "Dr. [Real Professor Name]",
    "department": "[Department]",
    "researchArea": "[Their actual research focus]",
    "whyInterested": "Why this student should work with them (be specific to student's goals)",
    "specificPapers": ["Recent paper title 1", "Recent paper title 2"]
  }
]

Return ONLY the JSON array with 3 professors.`;

        const professorsResponse = await callClaude(claudeKey, professorsPrompt);
        const professors = parseJSON(professorsResponse, []);

        // ============================================
        // PHASE 2: AUTO-GENERATE COURSES
        // ============================================

        const coursesPrompt = `You are a college research assistant. Based on this student's profile, recommend 5 REAL courses at ${college.fullName}.

STUDENT PROFILE:
- Major: ${userProfile.major}
- Interests: ${userProfile.interests.join(', ')}
- Career Goals: ${userProfile.careerGoals.join(', ')}

COLLEGE: ${college.fullName}

Research real courses and return JSON:
[
  {
    "code": "[Real course code like CS 101]",
    "name": "[Real course name]",
    "whyInterested": "Why this course fits student's goals",
    "howItFitsGoals": "How it prepares them for their career goals"
  }
]

Return ONLY the JSON array with 5 courses.`;

        const coursesResponse = await callClaude(claudeKey, coursesPrompt);
        const courses = parseJSON(coursesResponse, []);

        // ============================================
        // PHASE 3: AUTO-GENERATE LABS
        // ============================================

        const labsPrompt = `You are a college research assistant. Based on this student's profile, recommend 2-3 REAL research labs/centers at ${college.fullName}.

STUDENT PROFILE:
- Major: ${userProfile.major}
- Interests: ${userProfile.interests.join(', ')}

COLLEGE: ${college.fullName}
NOTABLE PROGRAMS: ${college.research.notablePrograms.join(', ')}

Research real labs and return JSON:
[
  {
    "name": "[Real lab name]",
    "focus": "[Lab's research focus]",
    "whyInterested": "Why this student should join this lab",
    "specificProjects": ["Project 1", "Project 2"]
  }
]

Return ONLY the JSON array with 2-3 labs.`;

        const labsResponse = await callClaude(claudeKey, labsPrompt);
        const labs = parseJSON(labsResponse, []);

        // ============================================
        // PHASE 4: AUTO-GENERATE STUDENT ORGS
        // ============================================

        const orgsPrompt = `You are a college research assistant. Based on this student's profile, recommend 2-3 REAL student organizations at ${college.fullName}.

STUDENT PROFILE:
- Major: ${userProfile.major}
- Interests: ${userProfile.interests.join(', ')}

COLLEGE: ${college.fullName}

Research real student organizations and return JSON:
[
  {
    "name": "[Real organization name]",
    "type": "academic|cultural|service|technical",
    "whyJoin": "Why this student should join",
    "roleYouWant": "Role they could take"
  }
]

Return ONLY the JSON array with 2-3 organizations.`;

        const orgsResponse = await callClaude(claudeKey, orgsPrompt);
        const organizations = parseJSON(orgsResponse, []);

        // ============================================
        // PHASE 5: CUSTOMIZE "WHY TRANSFERRING" FOR THIS COLLEGE
        // ============================================

        const whyTransferPrompt = `You are a college admissions consultant. This student is transferring from ${userProfile.currentSchool} to ${college.fullName}.

STUDENT'S GENERAL TRANSFER REASON:
"${userProfile.whyTransferringGeneral}"

STUDENT PROFILE:
- Major: ${userProfile.major}
- Interests: ${userProfile.interests.join(', ')}
- Career Goals: ${userProfile.careerGoals.join(', ')}

${college.fullName} STRENGTHS:
- Values: ${college.research.values.join(', ')}
- Notable Programs: ${college.research.notablePrograms.join(', ')}
- Unique Features: ${college.research.uniqueFeatures.join(', ')}
- Culture: ${college.research.culture}

TASK: Rewrite their transfer reason SPECIFICALLY for ${college.name}. Be authentic and specific.

Return JSON:
{
  "whyLeaving": "Why leaving ${userProfile.currentSchool} (be specific about what's lacking)",
  "whatsMissing": "What ${userProfile.currentSchool} lacks that ${college.name} has",
  "whyThisCollege": "Why ${college.name} specifically (mention specific resources, programs, culture)"
}

Return ONLY the JSON object.`;

        const whyTransferResponse = await callClaude(claudeKey, whyTransferPrompt);
        const customizedTransferReason = parseJSON(whyTransferResponse, {
            whyLeaving: userProfile.whyTransferringGeneral,
            whatsMissing: '',
            whyThisCollege: ''
        });

        // ============================================
        // PHASE 6: CUSTOMIZE CAREER GOALS FOR THIS COLLEGE
        // ============================================

        const careerGoalsPrompt = `You are a college admissions consultant. Customize this student's career goals to show how ${college.fullName} specifically helps them achieve those goals.

STUDENT'S GENERAL CAREER GOALS:
${userProfile.careerGoals.join('\n')}

${college.fullName} STRENGTHS:
- Notable Programs: ${college.research.notablePrograms.join(', ')}
- Unique Features: ${college.research.uniqueFeatures.join(', ')}
- Culture: ${college.research.culture}
- Location: ${college.location}

PROFESSORS THEY'LL WORK WITH:
${professors.map(p => `${p.name} (${p.researchArea})`).join(', ')}

TASK: Rewrite their career goals to show how ${college.name} is the PERFECT place to achieve them.

Return JSON:
{
  "customizedGoals": [
    "Goal 1 (mention how ${college.name} helps achieve it)",
    "Goal 2 (mention specific resources at ${college.name})",
    "Goal 3 (connect to ${college.name}'s unique strengths)"
  ],
  "impactVision": "How they'll use ${college.name}'s resources to make an impact"
}

Return ONLY the JSON object.`;

        const careerGoalsResponse = await callClaude(claudeKey, careerGoalsPrompt);
        const customizedCareerGoals = parseJSON(careerGoalsResponse, {
            customizedGoals: userProfile.careerGoals,
            impactVision: ''
        });

        // ============================================
        // PHASE 7: BUILD COMPLETE COLLEGE RESEARCH OBJECT
        // ============================================

        const collegeResearch = {
            collegeId: college.id,
            collegeName: college.name,
            professors,
            courses,
            labs,
            organizations,

            // Auto-generated unique opportunities
            uniqueOpportunities: college.research.uniqueFeatures.map(feature => ({
                name: feature,
                description: `${college.name}'s ${feature}`,
                whyImportant: `Aligns with my ${userProfile.major} major and career goals`
            })),

            // Culture fit (auto-matched to student values)
            cultureFit: {
                values: college.research.values.slice(0, 3),
                traditions: college.research.uniqueFeatures.slice(0, 2),
                communityAspects: [college.research.culture]
            },

            // Location benefits
            locationBenefits: [
                `${college.location} offers access to ${userProfile.major} opportunities`,
                `Proximity to industry leaders in ${userProfile.interests[0] || 'technology'}`
            ],

            // CUSTOMIZED transfer reason for THIS college
            customizedTransferReason,

            // CUSTOMIZED career goals for THIS college
            customizedCareerGoals,

            updatedAt: new Date().toISOString(),
        };

        console.log(`✅ Auto-research complete for ${college.name}:`);
        console.log(`   - ${professors.length} professors`);
        console.log(`   - ${courses.length} courses`);
        console.log(`   - ${labs.length} labs`);
        console.log(`   - ${organizations.length} organizations`);

        return NextResponse.json({
            success: true,
            collegeResearch,
            summary: {
                college: college.name,
                professorsFound: professors.length,
                coursesFound: courses.length,
                labsFound: labs.length,
                organizationsFound: organizations.length,
                customizedForCollege: true,
            }
        });

    } catch (error) {
        console.error('Auto-research error:', error);
        return NextResponse.json({
            error: 'Failed to auto-research college',
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
            max_tokens: 2000,
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
        // Try to extract JSON from response
        const jsonMatch = text.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return defaultValue;
    } catch {
        return defaultValue;
    }
}
