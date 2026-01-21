'use server';

import { NextRequest, NextResponse } from 'next/server';
import { ToneCalibration } from '@/lib/s3-storage';
import { targetColleges } from '@/lib/colleges-data';

// ============================================
// TONE CALIBRATION ENGINE
// Ensures essays match each college's preferred voice
// ============================================

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const getClaudeKey = () => process.env.CLAUDE_API_KEY || process.env.NEXT_PUBLIC_CLAUDE_API_KEY || '';

// College-specific tone profiles
const TONE_PROFILES = {
    mit: {
        name: 'MIT',
        preferred: {
            toneWords: ['analytical', 'hands-on', 'problem-solving', 'technical depth', 'maker mindset', 'rigorous'],
            sentencePatterns: [
                'Show technical depth: "I debugged for 40 hours until..."',
                'Emphasize making: "I built...", "I hacked together..."',
                'Problem-solving focus: "The algorithm failed because..."'
            ],
            vocabularyLevel: 'technical',
            examplePhrases: [
                'mens et manus (mind and hand)',
                'I spent [X hours] debugging',
                'The problem was [technical detail]',
                'I built/designed/coded/hacked',
                'I discovered that [technical insight]'
            ]
        },
        avoid: {
            toneWords: ['flowery language', 'excessive emotion', 'vague passion'],
            bannedPhrases: [
                'I\'ve always been passionate about',
                'world-class education',
                'MIT has great programs',
                'prestigious institution'
            ],
            commonMistakes: [
                'Being too theoretical without showing hands-on work',
                'Generic praise about MIT\'s reputation',
                'Not showing technical depth in projects'
            ]
        },
        voiceProfile: {
            formalityLevel: 45, // Fairly casual
            technicalDepth: 90, // Very technical
            emotionalExpression: 40, // Moderate emotion
            innovationFocus: 85 // High innovation
        }
    },
    stanford: {
        name: 'Stanford',
        preferred: {
            toneWords: ['innovative', 'impact-driven', 'interdisciplinary', 'bold vision', 'entrepreneurial', 'change-maker'],
            sentencePatterns: [
                'Show bold vision: "What if we could..."',
                'Emphasize impact: "This helped [X people]..."',
                'Demonstrate innovation: "I reimagined how..."'
            ],
            vocabularyLevel: 'balanced',
            examplePhrases: [
                'What if we could',
                'This led me to launch/create/start',
                'I brought together [disciplines]',
                'The impact was [measurable result]',
                'I saw an opportunity to'
            ]
        },
        avoid: {
            toneWords: ['pure technical details', 'narrow focus', 'playing it safe', 'incremental'],
            bannedPhrases: [
                'great university',
                'top-ranked school',
                'prestigious',
                'world-class'
            ],
            commonMistakes: [
                'Being too narrowly technical',
                'Not showing entrepreneurial thinking',
                'Lacking interdisciplinary connections',
                'No mention of impact/change'
            ]
        },
        voiceProfile: {
            formalityLevel: 40, // Casual and approachable
            technicalDepth: 60, // Moderate technical depth
            emotionalExpression: 65, // Higher emotion/inspiration
            innovationFocus: 95 // Very high innovation
        }
    },
    cmu: {
        name: 'Carnegie Mellon',
        preferred: {
            toneWords: ['rigorous', 'collaborative', 'craft-focused', 'iterative', 'dedicated', 'interdisciplinary'],
            sentencePatterns: [
                'Show iteration: "After 12 versions, I finally..."',
                'Emphasize craft: "I refined the design until..."',
                'Demonstrate rigor: "I spent [time] perfecting..."'
            ],
            vocabularyLevel: 'technical',
            examplePhrases: [
                'My heart is in the work',
                'After [X iterations]',
                'I collaborated with [teams/departments]',
                'I refined/perfected/iterated',
                'The process taught me'
            ]
        },
        avoid: {
            toneWords: ['theoretical without application', 'solo achievement focus', 'shortcuts'],
            bannedPhrases: [
                'top CS school',
                'prestigious program',
                'great university'
            ],
            commonMistakes: [
                'Not showing iterative process',
                'Focusing only on end result',
                'Not mentioning collaboration',
                'Being too narrowly focused on one domain'
            ]
        },
        voiceProfile: {
            formalityLevel: 50, // Balanced formality
            technicalDepth: 85, // High technical depth
            emotionalExpression: 55, // Moderate emotion
            innovationFocus: 75 // High innovation, but craft-focused
        }
    },
    cornell: {
        name: 'Cornell',
        preferred: {
            toneWords: ['practical', 'community-minded', 'service-oriented', 'balanced', 'thoughtful'],
            sentencePatterns: [
                'Show practical application: "I applied [theory] to help [community]"',
                'Emphasize service: "This benefited [specific group]"',
                'Balance breadth and depth: "I combined [X] with [Y]"'
            ],
            vocabularyLevel: 'balanced',
            examplePhrases: [
                'I applied [knowledge] to help',
                'The community benefited',
                'I balanced [academic] with [service]',
                'This addressed a real need'
            ]
        },
        avoid: {
            toneWords: ['purely theoretical', 'elitist', 'detached from real-world'],
            bannedPhrases: [
                'Ivy League',
                'prestigious',
                'elite institution'
            ],
            commonMistakes: [
                'Not showing community engagement',
                'Being too purely academic',
                'Not demonstrating practical application'
            ]
        },
        voiceProfile: {
            formalityLevel: 55, // Slightly more formal
            technicalDepth: 70, // Moderate-high technical
            emotionalExpression: 60, // Moderate-high emotion
            innovationFocus: 70 // Good innovation
        }
    },
    nyu: {
        name: 'NYU',
        preferred: {
            toneWords: ['global', 'diverse', 'urban-engaged', 'independent', 'creative'],
            sentencePatterns: [
                'Show global perspective: "Growing up in [place], I..."',
                'Emphasize NYC connection: "New York\'s [resource] enables..."',
                'Demonstrate independence: "I navigated [challenge]"'
            ],
            vocabularyLevel: 'accessible',
            examplePhrases: [
                'In [home country/city]',
                'New York offers',
                'The diversity of',
                'I bring a perspective from',
                'The urban environment'
            ]
        },
        avoid: {
            toneWords: ['generic', 'suburban', 'traditional'],
            bannedPhrases: [
                'great school',
                'top university',
                'prestigious'
            ],
            commonMistakes: [
                'Not mentioning NYC specifically',
                'Not showing global/diverse perspective',
                'Being too conventional'
            ]
        },
        voiceProfile: {
            formalityLevel: 45, // Fairly casual
            technicalDepth: 60, // Moderate technical
            emotionalExpression: 70, // Higher emotion/personal
            innovationFocus: 75 // Good innovation
        }
    }
};

interface CalibrateToneRequest {
    collegeId?: string; // If provided, only calibrate for this college
}

export async function POST(request: NextRequest) {
    try {
        const body: CalibrateToneRequest = await request.json();
        const { collegeId } = body;

        const claudeKey = getClaudeKey();
        if (!claudeKey) {
            return NextResponse.json({
                error: 'Claude API key not configured'
            }, { status: 500 });
        }

        const collegesToCalibrate = collegeId
            ? targetColleges.filter(c => c.id === collegeId)
            : targetColleges;

        console.log(`🎨 Calibrating tone for ${collegesToCalibrate.length} colleges...`);

        const calibrations: ToneCalibration[] = [];

        for (const college of collegesToCalibrate) {
            const baseProfile = TONE_PROFILES[college.id as keyof typeof TONE_PROFILES];

            if (!baseProfile) {
                console.warn(`No tone profile for ${college.id}, skipping...`);
                continue;
            }

            // ============================================
            // ENHANCE WITH AI-GENERATED EXAMPLES
            // ============================================

            const examplesPrompt = `You are a ${college.fullName} admissions expert. Generate example sentences that perfectly match ${college.name}'s essay tone.

${college.fullName} VALUES:
${college.research.values.join(', ')}

${college.fullName} CULTURE:
${college.research.culture}

PREFERRED TONE:
${baseProfile.preferred.toneWords.join(', ')}

TASK: Generate 10 example sentences that would work PERFECTLY in a ${college.name} transfer essay. Make them:
- Specific and concrete
- Authentic and human
- Aligned with ${college.name}'s values
- Different from each other

Return JSON:
{
  "successExamples": [
    "Example sentence 1",
    "Example sentence 2",
    ...
  ]
}

Return ONLY the JSON object.`;

            const examplesResponse = await callClaude(claudeKey, examplesPrompt);
            const { successExamples } = parseJSON(examplesResponse, { successExamples: [] });

            // ============================================
            // GENERATE FAILURE EXAMPLES
            // ============================================

            const failurePrompt = `You are a ${college.fullName} admissions expert. Generate example sentences that would FAIL in a ${college.name} transfer essay.

THINGS ${college.name} HATES:
${baseProfile.avoid.commonMistakes.join(', ')}

TASK: Generate 10 example sentences that would be RED FLAGS for ${college.name} admissions.

Return JSON:
{
  "failureExamples": [
    "Bad example sentence 1",
    "Bad example sentence 2",
    ...
  ]
}

Return ONLY the JSON object.`;

            const failureResponse = await callClaude(claudeKey, failurePrompt);
            const { failureExamples } = parseJSON(failureResponse, { failureExamples: [] });

            // ============================================
            // BUILD COMPLETE CALIBRATION
            // ============================================

            const calibration: ToneCalibration = {
                collegeId: college.id,
                collegeName: college.name,
                preferred: {
                    ...baseProfile.preferred,
                    vocabularyLevel: baseProfile.preferred.vocabularyLevel as "technical" | "balanced" | "accessible"
                },
                avoid: baseProfile.avoid,
                successExamples,
                failureExamples,
                voiceProfile: baseProfile.voiceProfile,
                calibratedAt: new Date().toISOString()
            };

            calibrations.push(calibration);

            console.log(`✅ Tone calibrated for ${college.name}`);
        }

        return NextResponse.json({
            success: true,
            calibrations,
            summary: {
                collegesCalibrated: calibrations.length,
                colleges: calibrations.map(c => c.collegeName)
            }
        });

    } catch (error) {
        console.error('Tone calibration error:', error);
        return NextResponse.json({
            error: 'Failed to calibrate tone',
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
            max_tokens: 3000,
            temperature: 0.5, // Higher for creative examples
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
