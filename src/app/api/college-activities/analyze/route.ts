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

// ============================================
// COLLEGE-SPECIFIC CUSTOMIZATION GUIDANCE
// Provides tailored framing for each college's unique values and culture
// ============================================
function getCollegeSpecificGuidance(collegeId: string, collegeName: string): {
    framingApproach: string;
    keyThemes: string[];
    languageStyle: string;
    avoidPhrases: string[];
    emphasizeMetrics: string[];
} {
    const collegeGuidance: Record<string, any> = {
        'umich': {
            framingApproach: `Frame activities around "Leaders and Citizens" - every activity should show BOTH leadership initiative AND community contribution. UMich wants students who don't just lead but also serve, collaborate, and uplift others. Emphasize the "Leaders and Best" mentality - being the best at what you do while making others better.`,
            keyThemes: [
                'Leaders and Citizens dual identity',
                'Public good and societal impact',
                'Go Blue community spirit',
                'Ann Arbor engagement',
                'Wolverine excellence and ambition',
                'Collaborative leadership (not just individual achievement)'
            ],
            languageStyle: 'Confident but community-minded. Show ambition tempered with service orientation. Use "we" language alongside "I" to show team player mentality.',
            avoidPhrases: ['sole leader', 'individual achievement only', 'competitive dominance'],
            emphasizeMetrics: ['community members impacted', 'team collaboration outcomes', 'public benefit metrics', 'scale of positive change']
        },
        'mit': {
            framingApproach: `Frame around "Mens et Manus" (Mind and Hand) - show BOTH theoretical understanding AND hands-on application. MIT loves "productive weirdness" - genuine passion projects that go deep. Emphasize collaboration over competition.`,
            keyThemes: [
                'Hands-on building and making',
                'Collaborative problem-solving',
                'Intellectual curiosity and rabbit holes',
                'Technical depth with real-world application',
                'UROP-style research mindset',
                'Creative hacks and unconventional solutions'
            ],
            languageStyle: 'Technical but not pretentious. Show genuine excitement about learning. Embrace being "nerdy" about your interests.',
            avoidPhrases: ['competitive edge', 'prestige-focused', 'surface-level involvement'],
            emphasizeMetrics: ['technical complexity', 'iterations and failures learned from', 'collaborative contributions', 'real-world applications built']
        },
        'stanford': {
            framingApproach: `Frame around entrepreneurial impact and "intellectual vitality." Stanford values students who think big, take risks, and want to change the world. Show curiosity that extends beyond the classroom.`,
            keyThemes: [
                'Entrepreneurial mindset',
                'World-changing ambitions',
                'Interdisciplinary thinking',
                'd.school design thinking approach',
                'Silicon Valley connection potential',
                'Freedom to explore and pivot'
            ],
            languageStyle: 'Optimistic, ambitious, reflective. Show self-awareness about growth. Balance confidence with intellectual humility.',
            avoidPhrases: ['just following the path', 'safe choices', 'narrow focus only'],
            emphasizeMetrics: ['venture outcomes', 'people reached/helped', 'innovative approaches tried', 'interdisciplinary connections made']
        },
        'cmu': {
            framingApproach: `Frame around "My heart is in the work" - show DEEP passion and technical excellence. CMU values the intersection of creativity and technology. Demonstrate intense dedication to craft.`,
            keyThemes: [
                'Technical excellence with creative application',
                'Cross-disciplinary collaboration (art + tech)',
                'Intense work ethic and dedication',
                'Problem-solving through iteration',
                'Building tangible products/outcomes',
                'Human-centered technology'
            ],
            languageStyle: 'Passionate, detail-oriented, humble about the work ahead. Show appreciation for craft and iterative improvement.',
            avoidPhrases: ['easy success', 'natural talent alone', 'single-domain focus'],
            emphasizeMetrics: ['hours invested', 'iterations completed', 'technical challenges overcome', 'cross-disciplinary collaborations']
        },
        'gatech': {
            framingApproach: `Frame around "Progress and Service" - show innovation that serves real-world needs. Georgia Tech values hands-on problem solvers who create tangible impact. Emphasize Atlanta's industry connections.`,
            keyThemes: [
                'Innovation for practical impact',
                'CREATE-X entrepreneurship spirit',
                'VIP research contribution',
                'Industry-relevant skills',
                'Engineering solutions to real problems',
                'Yellow Jacket initiative and drive'
            ],
            languageStyle: 'Results-oriented, practical, ambitious. Show you get things done and measure outcomes.',
            avoidPhrases: ['theoretical only', 'abstract without application'],
            emphasizeMetrics: ['problems solved', 'prototypes built', 'industry connections made', 'real-world deployments']
        },
        'cornell': {
            framingApproach: `Frame around "any person, any study" - show intellectual breadth AND community belonging. Cornell values specific college fit and genuine community contribution.`,
            keyThemes: [
                'Intellectual curiosity across domains',
                'Specific college/school alignment',
                'Community contribution and belonging',
                'Research engagement',
                'Ithaca and Big Red community',
                'Public engagement mission'
            ],
            languageStyle: 'Intellectually curious, community-oriented. Show you belong to communities and contribute meaningfully.',
            avoidPhrases: ['generic ivy interest', 'prestige only'],
            emphasizeMetrics: ['community impact', 'research contributions', 'cross-disciplinary explorations', 'people mentored/helped']
        },
        'usc': {
            framingApproach: `Frame around the "Trojan Family" - show how you'll contribute to and benefit from USC's legendary network. Emphasize leadership, career focus, and LA industry connections.`,
            keyThemes: [
                'Trojan Family network contribution',
                'Entertainment/tech industry relevance',
                'Leadership with community spirit',
                'Fight On mentality',
                'Career-oriented initiative',
                'LA cultural engagement'
            ],
            languageStyle: 'Spirited, career-focused, community-minded. Show school pride potential and networking orientation.',
            avoidPhrases: ['isolated individual', 'anti-social pursuit'],
            emphasizeMetrics: ['network connections built', 'leadership positions held', 'industry-relevant experience', 'community events organized']
        },
        'uwash': {
            framingApproach: `Frame around public good, innovation, and Pacific Northwest values. UW values sustainability, tech industry preparation, and community engagement.`,
            keyThemes: [
                'Public good orientation',
                'Tech industry preparation',
                'Sustainability and environmental awareness',
                'Husky community spirit',
                'Seattle ecosystem engagement',
                'Collaborative innovation'
            ],
            languageStyle: 'Mission-driven, innovative, community-oriented. Show connection to PNW values.',
            avoidPhrases: ['purely profit-driven', 'disengaged from community'],
            emphasizeMetrics: ['environmental/social impact', 'community members served', 'collaborative projects', 'industry connections']
        },
        'uiuc': {
            framingApproach: `Frame around "Learning and Labor" - show technical excellence with practical application. UIUC values Big Ten spirit, engineering prowess, and entrepreneurial outcomes.`,
            keyThemes: [
                'Technical/engineering excellence',
                'Big Ten community spirit',
                'Entrepreneurial innovation',
                'Research contributions',
                'NCSA/computing heritage alignment',
                'Midwestern work ethic'
            ],
            languageStyle: 'Hardworking, technical, spirited. Show deep expertise and school pride potential.',
            avoidPhrases: ['passive learner', 'theory-only focus'],
            emphasizeMetrics: ['technical projects completed', 'research contributions', 'startup/venture involvement', 'community impact']
        },
        'nyu': {
            framingApproach: `Frame around urban engagement and global perspective. NYU values independence, diversity, and using NYC as your campus. Show how you'll bridge divides.`,
            keyThemes: [
                'Global/urban perspective',
                'NYC as learning environment',
                'Bridge-building across communities',
                'Independence and initiative',
                'Cultural engagement',
                'Career-focused ambition'
            ],
            languageStyle: 'Worldly, independent, diversity-minded. Show you thrive in urban complexity.',
            avoidPhrases: ['traditional campus seeker', 'homogeneous experiences'],
            emphasizeMetrics: ['global experiences', 'diverse collaborations', 'urban initiative projects', 'cultural bridges built']
        },
        'northeastern': {
            framingApproach: `Frame around experiential learning and co-op readiness. Northeastern values practical experience, career preparation, and global engagement.`,
            keyThemes: [
                'Experiential learning mindset',
                'Co-op/work experience',
                'Career preparation focus',
                'Global perspective',
                'Practical skill application',
                'Industry connections'
            ],
            languageStyle: 'Career-focused, practical, globally-minded. Show you learn by doing.',
            avoidPhrases: ['purely academic', 'no work experience'],
            emphasizeMetrics: ['work experience hours', 'professional skills gained', 'industry connections', 'global experiences']
        },
        'utaustin': {
            framingApproach: `Frame around Texas-sized ambition and community pride. UT values leadership, Hook 'em spirit, and activities that show you're ready to contribute to Austin's unique culture.`,
            keyThemes: [
                'Longhorn leadership and pride',
                'Austin cultural fit',
                'Texas-scale ambition',
                'Community contribution',
                'Diverse perspectives',
                'Innovation ecosystem engagement'
            ],
            languageStyle: 'Confident, community-minded, spirited. Show genuine enthusiasm for Texas and Austin.',
            avoidPhrases: ['Texas is just a backup', 'no interest in community'],
            emphasizeMetrics: ['leadership positions', 'community impact scale', 'people influenced', 'Austin-relevant experience']
        },
        'purdue': {
            framingApproach: `Frame around "Giant Leaps" and Boilermaker humility. Purdue values engineering excellence, hard work, and shooting for the stars (literally - Cradle of Astronauts).`,
            keyThemes: [
                'Engineering/technical excellence',
                'Giant Leaps ambition',
                'Boilermaker work ethic',
                'Humble persistence',
                'Space/aerospace passion',
                'Practical problem-solving'
            ],
            languageStyle: 'Hardworking, humble, ambitious. Show you do the work without bragging.',
            avoidPhrases: ['flashy without substance', 'shortcuts over hard work'],
            emphasizeMetrics: ['technical challenges solved', 'hours dedicated', 'projects completed', 'real-world applications']
        },
        'umd': {
            framingApproach: `Frame around "Fearless Ideas" and DC-area engagement. UMD values innovation, political/policy awareness, and leveraging DC proximity for impact.`,
            keyThemes: [
                'Fearless intellectual exploration',
                'DC/policy engagement',
                'Terp community spirit',
                'Research contribution',
                'Public service orientation',
                'Tech/cybersecurity excellence'
            ],
            languageStyle: 'Bold, engaged, community-oriented. Show you\'ll leverage DC opportunities.',
            avoidPhrases: ['apolitical disengagement', 'no interest in DC'],
            emphasizeMetrics: ['policy/civic engagement', 'research contributions', 'community impact', 'DC-relevant experience']
        },
        'nus': {
            framingApproach: `Frame around global excellence and Asian perspective. NUS values academic rigor, global mindset, and enterprise/innovation in an Asian context.`,
            keyThemes: [
                'Global/Asian perspective',
                'Academic excellence',
                'Enterprise and innovation',
                'Resilience and adaptability',
                'Cross-cultural competence',
                'Research orientation'
            ],
            languageStyle: 'Globally-minded, academically rigorous, adaptable. Show appreciation for Asian context.',
            avoidPhrases: ['Western-centric only', 'no global experience'],
            emphasizeMetrics: ['academic achievements', 'global experiences', 'cross-cultural collaborations', 'enterprise outcomes']
        }
    };

    return collegeGuidance[collegeId] || {
        framingApproach: `Frame activities to align with ${collegeName}'s values. Emphasize leadership, impact, and genuine passion.`,
        keyThemes: ['Leadership', 'Impact', 'Community', 'Academic excellence', 'Personal growth'],
        languageStyle: 'Authentic, specific, outcome-oriented.',
        avoidPhrases: ['generic', 'passive'],
        emphasizeMetrics: ['impact numbers', 'leadership positions', 'hours invested', 'outcomes achieved']
    };
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

        // Log first activity and achievement to verify data structure
        console.log(`   📋 First activity: ${JSON.stringify(activities[0], null, 2).substring(0, 500)}`);
        if (achievements && achievements.length > 0) {
            console.log(`   🏆 First achievement: ${JSON.stringify(achievements[0], null, 2).substring(0, 500)}`);
        } else {
            console.log(`   ⚠️ No achievements provided - will analyze without them`);
        }

        // ============================================
        // PHASE 1: Prioritize activities for this college
        // ============================================
        console.log('📊 Phase 1: Prioritizing activities...');

        // Get college-specific customization guidance
        const collegeGuidance = getCollegeSpecificGuidance(college.id, college.name);

        const prioritizePrompt = `You are an elite admissions consultant who deeply understands ${college.fullName}'s culture and values. Your job is to help this student frame their activities in the most compelling way for THIS specific school.

═══════════════════════════════════════════════════════════
🎯 ${college.fullName.toUpperCase()} - SPECIFIC FRAMING APPROACH
═══════════════════════════════════════════════════════════

${collegeGuidance.framingApproach}

KEY THEMES TO WEAVE INTO ACTIVITY FRAMING:
${collegeGuidance.keyThemes.map(t => `• ${t}`).join('\n')}

LANGUAGE STYLE FOR ${college.name.toUpperCase()}:
${collegeGuidance.languageStyle}

METRICS TO EMPHASIZE:
${collegeGuidance.emphasizeMetrics.map(m => `✓ ${m}`).join('\n')}

PHRASES/APPROACHES TO AVOID:
${collegeGuidance.avoidPhrases.map(p => `✗ "${p}"`).join('\n')}

═══════════════════════════════════════════════════════════
COLLEGE CONTEXT
═══════════════════════════════════════════════════════════
- Core Values: ${college.values?.join(', ') || 'Excellence, Innovation'}
- What Admissions Looks For: ${college.whatTheyLookFor?.join(', ') || 'Leadership, Impact'}
- Culture: ${college.culture || 'Collaborative, innovative'}
- Notable Programs: ${college.notablePrograms?.join(', ') || 'Strong academic programs'}

═══════════════════════════════════════════════════════════
APPLICANT PROFILE
═══════════════════════════════════════════════════════════
- Intended Major: ${userProfile?.major || 'Undeclared'}
- GPA: ${userProfile?.gpa || 'Not provided'}

═══════════════════════════════════════════════════════════
ACTIVITIES TO CUSTOMIZE (${activities.length} total)
═══════════════════════════════════════════════════════════
${activities.map((a, i) => `
【Activity ${i + 1}】${a.name}
   • ID: ${a.id || `activity-${i}`}
   • Role: ${a.role || 'Participant'}
   • Description: ${a.description || 'No description provided'}
   • Category: ${a.category || 'General'}
   • Time Commitment: ${a.hoursPerWeek || 0}h/week
   • Duration: ${a.startDate || 'Unknown'} - ${a.endDate || 'Present'}
`).join('\n')}

═══════════════════════════════════════════════════════════
YOUR TASK
═══════════════════════════════════════════════════════════

For EACH activity, provide:
1. **Relevance Score (0-100)**: How well does this activity align with ${college.name}'s specific values and what they look for? Be rigorous - only give 85+ for activities that genuinely resonate with ${college.name}'s core themes.

2. **Priority (1-5)**:
   - 1 = MUST feature prominently (perfect ${college.name} fit)
   - 2 = Strong fit, should highlight
   - 3 = Solid activity, include with framing
   - 4 = Okay, mention briefly
   - 5 = Low priority for ${college.name}

3. **Customization** with THREE specific elements:
   - "emphasize": What aspect to highlight FOR ${college.name} SPECIFICALLY (use their language/values)
   - "reframe": How to reposition the narrative to match ${college.name}'s culture
   - "connect": Specific ${college.name} programs, values, or opportunities this connects to

Return JSON array (sort by relevanceScore, highest first):
[
  {
    "activityId": "activity-id",
    "activityName": "Activity Name",
    "relevanceScore": 85,
    "priority": 1,
    "customization": {
      "emphasize": "[Specific aspect that resonates with ${college.name}'s values]",
      "reframe": "[How to tell this story in a way ${college.name} wants to hear]",
      "connect": "[Specific ${college.name} program, value, or opportunity this ties to]"
    },
    "reasoning": "[Why this activity matters for ${college.name} specifically]"
  }
]`;

        const prioritizedActivitiesResult = await callClaude(prioritizePrompt, 4000);
        const prioritizedActivities = parseJSON(prioritizedActivitiesResult, []);

        console.log(`   ✅ Prioritized ${prioritizedActivities.length} activities`);

        // ============================================
        // PHASE 2: Analyze profile readiness
        // ============================================
        console.log('🎓 Phase 2: Analyzing profile readiness...');

        // Build activity summaries for better analysis
        const activitySummaries = activities.slice(0, 10).map((a: any) =>
            `- ${a.name}: ${a.role || 'Member'} at ${a.organization || 'N/A'} (${a.category || 'general'})${a.description ? ` - ${a.description.substring(0, 100)}...` : ''}`
        ).join('\n');

        // Build detailed achievement summaries
        const achievementSummaries = achievements && achievements.length > 0
            ? achievements.slice(0, 10).map((a: any) =>
                `- ${a.title || a.name}: ${a.category || 'award'}${a.description ? ` - ${a.description.substring(0, 80)}` : ''}${a.date ? ` (${a.date})` : ''}`
            ).join('\n')
            : '- No achievements listed yet';

        console.log(`   📋 Activities summary: ${activitySummaries.substring(0, 300)}...`);
        console.log(`   🏆 Achievements summary: ${achievementSummaries.substring(0, 300)}...`);

        const readinessPrompt = `You are evaluating a transfer applicant's readiness specifically for ${college.fullName}. Your assessment must be calibrated to what ${college.name} SPECIFICALLY values.

═══════════════════════════════════════════════════════════
🎓 ${college.fullName.toUpperCase()} ADMISSION CRITERIA
═══════════════════════════════════════════════════════════

CORE VALUES: ${college.values?.join(', ') || 'Excellence, Innovation'}
WHAT THEY LOOK FOR: ${college.whatTheyLookFor?.join(', ') || 'Leadership, Impact'}
CULTURE: ${college.culture || 'Collaborative, innovative'}

${college.name.toUpperCase()}-SPECIFIC EVALUATION APPROACH:
${collegeGuidance.framingApproach}

KEY THEMES ${college.name.toUpperCase()} CARES ABOUT:
${collegeGuidance.keyThemes.map(t => `• ${t}`).join('\n')}

═══════════════════════════════════════════════════════════
APPLICANT PROFILE
═══════════════════════════════════════════════════════════
- Intended Major: ${userProfile?.major || 'Computer Science'}
- GPA: ${userProfile?.gpa || 'Not provided'}
- Total Activities: ${activities.length}
- Total Achievements: ${achievements?.length || 0}

TOP ACTIVITIES (${activities.length} total):
${activitySummaries || '- Multiple technical and leadership activities'}

KEY ACHIEVEMENTS (${achievements?.length || 0} total) - IMPORTANT: Factor these into Academic and overall assessment:
${achievementSummaries}

NOTE: Achievements should SIGNIFICANTLY boost the Academic score and influence overall readiness. Awards, honors, recognitions, and accomplishments demonstrate academic excellence and dedication.

═══════════════════════════════════════════════════════════
${college.name.toUpperCase()}-CALIBRATED READINESS ASSESSMENT
═══════════════════════════════════════════════════════════

IMPORTANT: You MUST return numeric scores (integers between 0-100). Do NOT return strings. Make reasonable estimates based on provided data.

Evaluate readiness in 5 categories, CALIBRATED TO ${college.name.toUpperCase()}'S SPECIFIC VALUES:

1. **Academic** (0-100): Based on achievements, coursework, GPA. How does this align with ${college.name}'s academic expectations?

2. **Leadership** (0-100): Evaluate through ${college.name}'s lens:
${college.id === 'umich' ? '   - UMich wants "Leaders AND Citizens" - look for BOTH initiative AND community service' : ''}
${college.id === 'mit' ? '   - MIT values collaborative leadership, not just individual achievement' : ''}
${college.id === 'stanford' ? '   - Stanford wants entrepreneurial leaders who think big' : ''}
${college.id === 'cmu' ? '   - CMU values creative leadership in technical domains' : ''}
${college.id === 'gatech' ? '   - Georgia Tech wants innovative leaders who solve real problems' : ''}
${college.id === 'cornell' ? '   - Cornell values community-contributing leaders' : ''}
${college.id === 'usc' ? '   - USC wants Trojan Family builders - networkers and community leaders' : ''}
${college.id === 'nyu' ? '   - NYU values bridge-builders who connect diverse communities' : ''}
${!['umich', 'mit', 'stanford', 'cmu', 'gatech', 'cornell', 'usc', 'nyu'].includes(college.id) ? `   - ${college.name} values leadership aligned with their mission` : ''}

3. **Research/Technical** (0-100): Technical depth and hands-on project work. Does this match ${college.name}'s programs?

4. **Community Impact** (0-100): Service, volunteering, societal contribution. How does this align with ${college.name}'s public mission?

5. **${college.name} Fit & Passion** (0-100): This is the MOST IMPORTANT category. How well does this applicant embody ${college.name}'s specific culture and values?
   - Do they show themes that resonate with: ${collegeGuidance.keyThemes.slice(0, 3).join(', ')}?
   - Would they thrive in ${college.name}'s environment?

STRENGTHS: Identify 2-3 areas where this applicant is PARTICULARLY strong for ${college.name}
GAPS: Identify 2-3 specific areas where the applicant could strengthen their ${college.name} application

Return ONLY valid JSON with INTEGER scores:
{
  "readiness": {
    "academic": 85,
    "leadership": 80,
    "researchTechnical": 82,
    "communityImpact": 75,
    "fitPassion": 88
  },
  "overallReadiness": 82,
  "strengths": ["Specific strength for ${college.name}", "Another ${college.name}-relevant strength"],
  "gaps": ["Specific gap for ${college.name} application", "Another area to strengthen for ${college.name}"],
  "category": "strong-match"
}

Categories based on overallReadiness: "safety" (90+), "strong-match" (75-89), "match" (60-74), "reach" (40-59), "high-reach" (<40)`;

        const readinessResult = await callClaude(readinessPrompt, 2500);
        let readinessAnalysis = parseJSON(readinessResult, {
            readiness: { academic: 75, leadership: 80, researchTechnical: 85, communityImpact: 70, fitPassion: 82 },
            overallReadiness: 78,
            strengths: [`Strong activity portfolio with ${activities.length} activities`, `${achievements?.length || 0} achievements to highlight`],
            gaps: ['Consider adding more specific details to activity descriptions'],
            category: 'strong-match',
        });

        // CRITICAL: Validate and fix non-numeric scores
        const validateScore = (val: any, fallback: number): number => {
            if (typeof val === 'number' && !isNaN(val)) return Math.round(val);
            if (typeof val === 'string') {
                const parsed = parseInt(val, 10);
                if (!isNaN(parsed)) return parsed;
            }
            return fallback;
        };

        // Ensure all scores are actual numbers
        const baseScore = Math.round(70 + (activities.length / 3) + (achievements.length / 3)); // Base on activity count
        readinessAnalysis.readiness = {
            academic: validateScore(readinessAnalysis.readiness?.academic, baseScore),
            leadership: validateScore(readinessAnalysis.readiness?.leadership, baseScore - 5),
            researchTechnical: validateScore(readinessAnalysis.readiness?.researchTechnical, baseScore + 5),
            communityImpact: validateScore(readinessAnalysis.readiness?.communityImpact, baseScore - 10),
            fitPassion: validateScore(readinessAnalysis.readiness?.fitPassion, baseScore),
        };

        // Calculate overall if it's not a valid number
        if (typeof readinessAnalysis.overallReadiness !== 'number' || isNaN(readinessAnalysis.overallReadiness)) {
            const scores = Object.values(readinessAnalysis.readiness) as number[];
            readinessAnalysis.overallReadiness = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
        }

        // Ensure strengths and gaps are arrays
        if (!Array.isArray(readinessAnalysis.strengths) || readinessAnalysis.strengths.length === 0) {
            readinessAnalysis.strengths = [
                `High activity volume (${activities.length} activities)`,
                `Strong achievement record (${achievements.length} achievements)`
            ];
        }
        if (!Array.isArray(readinessAnalysis.gaps) || readinessAnalysis.gaps.length === 0) {
            readinessAnalysis.gaps = ['Consider adding more quantified impact metrics to activities'];
        }

        // Ensure category is set
        if (!readinessAnalysis.category || typeof readinessAnalysis.category !== 'string') {
            const overall = readinessAnalysis.overallReadiness;
            if (overall >= 90) readinessAnalysis.category = 'safety';
            else if (overall >= 75) readinessAnalysis.category = 'strong-match';
            else if (overall >= 60) readinessAnalysis.category = 'match';
            else if (overall >= 40) readinessAnalysis.category = 'reach';
            else readinessAnalysis.category = 'high-reach';
        }

        console.log(`   ✅ Overall readiness: ${readinessAnalysis.overallReadiness}%`);
        console.log(`   📊 Scores: academic=${readinessAnalysis.readiness.academic}, leadership=${readinessAnalysis.readiness.leadership}`);

        // ============================================
        // PHASE 3: Generate recommendations
        // ============================================
        console.log('💡 Phase 3: Generating recommendations...');

        const recommendationsPrompt = `You are an expert admissions strategist. Generate specific, actionable recommendations to strengthen this applicant's profile for ${college.fullName}.

═══════════════════════════════════════════════════════════
🎯 ${college.name.toUpperCase()} CONTEXT & VALUES
═══════════════════════════════════════════════════════════

${collegeGuidance.framingApproach}

KEY THEMES TO BUILD TOWARD:
${collegeGuidance.keyThemes.map(t => `• ${t}`).join('\n')}

METRICS ${college.name.toUpperCase()} VALUES:
${collegeGuidance.emphasizeMetrics.map(m => `✓ ${m}`).join('\n')}

═══════════════════════════════════════════════════════════
APPLICANT'S CURRENT PROFILE
═══════════════════════════════════════════════════════════

ACTIVITIES (${activities.length}):
${activitySummaries}

ACHIEVEMENTS (${achievements?.length || 0}):
${achievementSummaries}

═══════════════════════════════════════════════════════════
CURRENT READINESS SCORES
═══════════════════════════════════════════════════════════
- Academic: ${readinessAnalysis.readiness.academic}%
- Leadership: ${readinessAnalysis.readiness.leadership}%
- Research/Technical: ${readinessAnalysis.readiness.researchTechnical}%
- Community Impact: ${readinessAnalysis.readiness.communityImpact}%
- ${college.name} Fit & Passion: ${readinessAnalysis.readiness.fitPassion}%

IDENTIFIED GAPS:
${readinessAnalysis.gaps.map((g: string) => `⚠️ ${g}`).join('\n')}

CURRENT STRENGTHS:
${readinessAnalysis.strengths.map((s: string) => `✓ ${s}`).join('\n')}

═══════════════════════════════════════════════════════════
GENERATE ${college.name.toUpperCase()}-SPECIFIC RECOMMENDATIONS
═══════════════════════════════════════════════════════════

Create 5-8 recommendations that are:
1. **Actionable** - Student can realistically do this before application deadline
2. **${college.name}-Specific** - Directly addresses what ${college.name} values
3. **Strategic** - Either fills a gap OR amplifies an existing strength in a ${college.name}-relevant way
4. **Specific** - Include concrete steps, not vague advice

${college.id === 'umich' ? `
🔷 UMICH-SPECIFIC RECOMMENDATIONS TO CONSIDER:
- Activities that show "Leaders AND Citizens" duality
- Ways to demonstrate "Leaders and Best" excellence mindset
- Community service or public good contributions
- Collaborative leadership (not just individual achievement)
- Connection to Ann Arbor, Michigan, or Big Ten community
` : ''}
${college.id === 'mit' ? `
🔷 MIT-SPECIFIC RECOMMENDATIONS TO CONSIDER:
- Hands-on building/making projects
- Collaborative problem-solving initiatives
- Deep-dive passion projects (productive weirdness)
- Technical depth with real-world application
- Research or UROP-style experiences
` : ''}
${college.id === 'stanford' ? `
🔷 STANFORD-SPECIFIC RECOMMENDATIONS TO CONSIDER:
- Entrepreneurial initiatives or ventures
- Interdisciplinary explorations
- Intellectually curious side projects
- Impact-focused innovations
- Reflection and self-awareness demonstrations
` : ''}
${college.id === 'cmu' ? `
🔷 CMU-SPECIFIC RECOMMENDATIONS TO CONSIDER:
- Technical excellence projects with creative application
- Cross-disciplinary work (tech + arts/humanities)
- Iteration-heavy projects showing dedication
- Human-centered technology focus
- Collaboration across different domains
` : ''}
${college.id === 'gatech' ? `
🔷 GEORGIA TECH-SPECIFIC RECOMMENDATIONS TO CONSIDER:
- Innovation that solves real problems
- Industry-relevant technical projects
- Entrepreneurship (CREATE-X style)
- Practical applications with measurable impact
- Atlanta/industry connection building
` : ''}
${!['umich', 'mit', 'stanford', 'cmu', 'gatech'].includes(college.id) ? `
🔷 ${college.name.toUpperCase()}-SPECIFIC RECOMMENDATIONS:
Consider activities that align with: ${collegeGuidance.keyThemes.slice(0, 3).join(', ')}
` : ''}

CRITICAL: For EACH recommendation, also generate a complete "suggestedActivity" that the student could add to their profile. This should be a fully-formed activity with realistic details.

Return JSON:
{
  "recommendations": [
    {
      "priority": "high",
      "category": "leadership|technical|community|academic|fit",
      "title": "Specific, actionable title",
      "description": "Detailed description of what to do and how it helps for ${college.name}",
      "impact": "How this specifically addresses ${college.name}'s values: [cite specific ${college.name} value/theme]",
      "timeframe": "Realistic timeframe",
      "difficulty": "low|medium|high",
      "suggestedActivity": {
        "name": "Specific activity name (e.g., 'CS Peer Tutoring Program')",
        "role": "Your role (e.g., 'Founder & Lead Tutor')",
        "organization": "Organization name (e.g., 'University Computer Science Department')",
        "description": "150-word description of the activity, what you do, and measurable outcomes. Write as if you're already doing it. Include specific numbers and impacts.",
        "category": "Academic|Leadership|Community Service|Research|Work|Arts|Athletics",
        "hoursPerWeek": 5,
        "weeksPerYear": 30,
        "expectedImpact": "Quantifiable expected impact (e.g., 'Help 50+ students improve grades by 1 letter grade')",
        "collegeConnection": "Specific connection to ${college.name}'s values: ${collegeGuidance.keyThemes[0]} and ${collegeGuidance.keyThemes[1]}"
      }
    }
  ]
}`;

        const recommendationsResult = await callClaude(recommendationsPrompt, 5000);
        const recommendations = parseJSON(recommendationsResult, { recommendations: [] });

        console.log(`   ✅ Generated ${recommendations.recommendations.length} recommendations`);

        // ============================================
        // PHASE 4: Create customized activity descriptions
        // ============================================
        console.log('✍️  Phase 4: Creating customized descriptions...');
        console.log(`   📊 Prioritized activities count: ${prioritizedActivities.length}`);

        // If AI didn't return proper prioritization, create default prioritization from activities
        let activitiesToCustomize = prioritizedActivities;
        if (!prioritizedActivities || prioritizedActivities.length === 0) {
            console.log('   ⚠️ No prioritized activities from AI - using original activities');
            activitiesToCustomize = activities.map((a: any, i: number) => ({
                activityId: a.id || `activity-${i}`,
                activityName: a.name,
                relevanceScore: 70,
                priority: i < 3 ? 1 : i < 6 ? 2 : 3,
                customization: {
                    emphasize: 'Your key contributions and leadership',
                    reframe: `Present this activity in terms of ${college.name}'s values`,
                    connect: `Connect to ${college.name}'s mission and programs`
                },
                reasoning: `Activity relevant for ${college.name} application`
            }));
        }

        const customizedActivities = activitiesToCustomize.slice(0, 10).map((pa: any, index: number) => {
            // Try to find the original activity by ID, name, or index
            let originalActivity = activities.find((a: any) =>
                a.id === pa.activityId ||
                a.name === pa.activityName ||
                a.name?.toLowerCase() === pa.activityName?.toLowerCase()
            );

            // Fallback: if no match found, try to match by partial name
            if (!originalActivity && pa.activityName) {
                const nameMatch = activities.find((a: any) =>
                    pa.activityName?.toLowerCase().includes(a.name?.toLowerCase()) ||
                    a.name?.toLowerCase().includes(pa.activityName?.toLowerCase())
                );
                if (nameMatch) originalActivity = nameMatch;
            }

            // If still no match, use the activity at the same index if available
            if (!originalActivity && index < activities.length) {
                originalActivity = activities[index];
            }

            const result = {
                id: originalActivity?.id || pa.activityId || `custom-${index}`,
                name: pa.activityName || originalActivity?.name || `Activity ${index + 1}`,
                role: originalActivity?.role || 'Participant',
                description: originalActivity?.description || pa.activityName || '',
                category: originalActivity?.category || 'General',
                relevanceScore: typeof pa.relevanceScore === 'number' ? pa.relevanceScore : 70,
                priority: typeof pa.priority === 'number' ? pa.priority : 3,
                customization: pa.customization || {
                    emphasize: 'Highlight your contributions and impact',
                    reframe: 'Present in terms of outcomes achieved',
                    connect: `Connect to ${college.name}'s values and programs`
                },
                reasoning: pa.reasoning || 'Relevant activity for your application',
                customizedDescription: pa.customization?.reframe || originalActivity?.description || '',
            };

            return result;
        }).filter((a: any) => a.name); // Only filter out truly empty names

        console.log(`   ✅ Created ${customizedActivities.length} customized activities`);
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
