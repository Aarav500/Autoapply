'use server';

import { NextRequest, NextResponse } from 'next/server';

// ============================================
// ENHANCED ESSAY INTELLIGENCE SYSTEM
// 99.5%+ Quality with Activity Intelligence, Story Mining, Tone Calibration
// ============================================

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const getClaudeKey = () => process.env.CLAUDE_API_KEY || process.env.NEXT_PUBLIC_CLAUDE_API_KEY || '';

interface GenerateEnhancedEssayRequest {
    // Essay details
    college: {
        id: string;
        name: string;
        fullName: string;
        values: string[];
        whatTheyLookFor: string[];
        culture: string;
        notablePrograms: string[];
    };
    essay: {
        id: string;
        title: string;
        prompt: string;
        wordLimit: number;
    };

    // Student data
    activities: any[];
    achievements?: any[];
    transcript?: any;

    // Optional pre-computed intelligence (if not provided, will auto-generate)
    activityIntelligence?: any;
    storyMining?: any;
    toneCalibration?: any;
    weaknessAnalysis?: any;

    // Essay Intelligence data
    personalProfile?: any;
    collegeResearch?: any;

    // Generation options
    numVariants?: number;
    targetQuality?: number;
    maxIterations?: number;
}

export async function POST(request: NextRequest) {
    try {
        const body: GenerateEnhancedEssayRequest = await request.json();
        const {
            college,
            essay,
            activities,
            achievements = [],
            transcript = {},
            activityIntelligence: providedActivityIntelligence,
            storyMining: providedStoryMining,
            toneCalibration: providedToneCalibration,
            weaknessAnalysis: providedWeaknessAnalysis,
            personalProfile,
            collegeResearch,
            numVariants = 3,
            targetQuality = 99,
            maxIterations = 5,
        } = body;

        const claudeKey = getClaudeKey();
        if (!claudeKey) {
            return NextResponse.json({
                error: 'Claude API key not configured'
            }, { status: 500 });
        }

        console.log(`🚀 ENHANCED Essay Intelligence: Generating for ${college.name}`);
        console.log(`🎯 Target Quality: ${targetQuality}%`);

        // ============================================
        // PHASE 0: GATHER ALL INTELLIGENCE
        // ============================================

        let activityIntelligence = providedActivityIntelligence;
        let storyMining = providedStoryMining;
        let toneCalibration = providedToneCalibration;
        let weaknessAnalysis = providedWeaknessAnalysis;

        // Auto-analyze activities if not provided
        if (!activityIntelligence && activities.length > 0) {
            console.log('🔍 Auto-analyzing activities...');
            const analysisResponse = await fetch(new URL('/api/essay-intelligence/analyze-activities', request.url), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    activities,
                    achievements,
                    profile: personalProfile
                })
            });
            if (analysisResponse.ok) {
                const data = await analysisResponse.json();
                activityIntelligence = data.activityIntelligence;
            }
        }

        // Auto-mine stories if not provided
        if (!storyMining && activities.length > 0) {
            console.log('⛏️ Auto-mining stories...');
            const miningResponse = await fetch(new URL('/api/essay-intelligence/mine-stories', request.url), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    activities,
                    achievements,
                    activityIntelligence,
                    targetPrompts: [essay.prompt]
                })
            });
            if (miningResponse.ok) {
                const data = await miningResponse.json();
                storyMining = data.storyMining;
            }
        }

        // Auto-calibrate tone if not provided
        if (!toneCalibration) {
            console.log('🎨 Auto-calibrating tone...');
            const toneResponse = await fetch(new URL('/api/essay-intelligence/calibrate-tone', request.url), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    collegeId: college.id
                })
            });
            if (toneResponse.ok) {
                const data = await toneResponse.json();
                toneCalibration = data.calibrations?.[0];
            }
        }

        // Auto-analyze weaknesses if not provided
        if (!weaknessAnalysis && transcript) {
            console.log('🔍 Auto-analyzing weaknesses...');
            const weaknessResponse = await fetch(new URL('/api/essay-intelligence/analyze-weaknesses', request.url), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transcript,
                    activities,
                    achievements,
                    profile: personalProfile
                })
            });
            if (weaknessResponse.ok) {
                const data = await weaknessResponse.json();
                weaknessAnalysis = data.weaknessAnalysis;
            }
        }

        // ============================================
        // PHASE 1: ENHANCED CONTEXT BUILDING
        // ============================================

        const enhancedContext = buildEnhancedContext({
            college,
            essay,
            activities,
            achievements,
            transcript,
            personalProfile,
            collegeResearch,
            activityIntelligence,
            storyMining,
            toneCalibration,
            weaknessAnalysis
        });

        // ============================================
        // PHASE 2: PROMPT-SPECIFIC STRATEGY
        // ============================================

        const promptStrategy = await analyzePromptStrategy({
            claudeKey,
            prompt: essay.prompt,
            college,
            activities,
            activityIntelligence,
            storyMining
        });

        // ============================================
        // PHASE 3: SELECT BEST STORIES FOR THIS PROMPT
        // ============================================

        const selectedStories = selectBestStories({
            storyMining,
            prompt: essay.prompt,
            college,
            promptStrategy,
            numStories: 2-3 // Use 2-3 best stories per essay
        });

        // ============================================
        // PHASE 4: MULTI-AGENT GENERATION WITH ENHANCEMENTS
        // ============================================

        const approaches = [
            {
                name: 'Narrative-Driven',
                focus: 'Tell compelling story with emotional arc',
                primaryStory: selectedStories[0],
                toneGuidance: toneCalibration?.preferred
            },
            {
                name: 'Analytical-Intellectual',
                focus: 'Demonstrate intellectual curiosity and growth',
                primaryStory: selectedStories[1] || selectedStories[0],
                toneGuidance: toneCalibration?.preferred
            },
            {
                name: 'Impact-Oriented',
                focus: 'Show measurable impact and achievements',
                primaryStory: selectedStories[2] || selectedStories[0],
                toneGuidance: toneCalibration?.preferred
            }
        ];

        console.log(`🤖 Generating ${approaches.length} essay variants...`);

        const variants = await Promise.all(
            approaches.map(approach =>
                generateEnhancedVariant({
                    claudeKey,
                    context: enhancedContext,
                    approach,
                    promptStrategy,
                    toneCalibration,
                    activityIntelligence,
                    weaknessAnalysis,
                    wordLimit: essay.wordLimit
                })
            )
        );

        // ============================================
        // PHASE 5: EVALUATE VARIANTS
        // ============================================

        console.log(`📊 Evaluating ${variants.length} variants...`);

        const evaluatedVariants = await Promise.all(
            variants.map(async (variant) => {
                const quality = await evaluateEnhancedQuality({
                    claudeKey,
                    essay: variant.content,
                    prompt: essay.prompt,
                    college,
                    toneCalibration,
                    activityIntelligence,
                    wordLimit: essay.wordLimit
                });

                return {
                    ...variant,
                    quality
                };
            })
        );

        // Pick best variant
        const bestVariant = evaluatedVariants.reduce((best, current) =>
            current.quality.overall > best.quality.overall ? current : best
        );

        console.log(`🏆 Best variant: ${bestVariant.approach} (score: ${bestVariant.quality.overall})`);

        // ============================================
        // PHASE 6: ITERATIVE REFINEMENT WITH ENHANCEMENTS
        // ============================================

        let currentEssay = bestVariant.content;
        let currentQuality = bestVariant.quality.overall;
        const iterations = [];

        for (let i = 0; i < maxIterations && currentQuality < targetQuality; i++) {
            console.log(`🔄 Refinement iteration ${i + 1}/${maxIterations}...`);

            const improved = await refineWithEnhancements({
                claudeKey,
                essay: currentEssay,
                targetQuality,
                currentQuality,
                iteration: i + 1,
                toneCalibration,
                activityIntelligence,
                promptStrategy,
                weaknessAnalysis,
                wordLimit: essay.wordLimit
            });

            const newQuality = await evaluateEnhancedQuality({
                claudeKey,
                essay: improved.content,
                prompt: essay.prompt,
                college,
                toneCalibration,
                activityIntelligence,
                wordLimit: essay.wordLimit
            });

            iterations.push({
                iteration: i + 1,
                content: improved.content,
                quality: newQuality.overall,
                improvements: improved.improvements
            });

            if (newQuality.overall > currentQuality) {
                currentEssay = improved.content;
                currentQuality = newQuality.overall;
                console.log(`✅ Iteration ${i + 1}: Quality improved to ${currentQuality.toFixed(1)}%`);
            } else {
                console.log(`⏭️ Iteration ${i + 1}: No improvement, keeping previous version`);
                break;
            }
        }

        // ============================================
        // PHASE 7: FINAL VALIDATION
        // ============================================

        const finalValidation = await validateEnhancedEssay({
            claudeKey,
            essay: currentEssay,
            prompt: essay.prompt,
            college,
            toneCalibration,
            activityIntelligence,
            wordLimit: essay.wordLimit
        });

        // ============================================
        // PHASE 8: COLLEGE-SPECIFIC RED FLAGS CHECK
        // ============================================

        const redFlags = await checkCollegeRedFlags({
            claudeKey,
            essay: currentEssay,
            college,
            toneCalibration
        });

        console.log(`✅ Essay generation complete! Final quality: ${currentQuality.toFixed(1)}%`);

        return NextResponse.json({
            success: true,
            essay: {
                content: currentEssay,
                wordCount: currentEssay.split(/\s+/).length,
                quality: currentQuality
            },
            variants: evaluatedVariants.map(v => ({
                approach: v.approach,
                content: v.content,
                quality: v.quality.overall
            })),
            iterations,
            intelligence: {
                activityIntelligence: activityIntelligence ? {
                    keyThemes: activityIntelligence.keyThemes,
                    uniqueAngles: activityIntelligence.uniqueAngles,
                    metricsCount: activityIntelligence.specificNumbers?.length || 0
                } : null,
                storiesUsed: selectedStories.map(s => s.title),
                toneCalibrated: !!toneCalibration,
                weaknessesAddressed: weaknessAnalysis?.potentialConcerns?.length || 0
            },
            validation: finalValidation,
            redFlags,
            metadata: {
                targetQuality,
                achievedQuality: currentQuality,
                iterationsUsed: iterations.length,
                enhancedGeneration: true
            }
        });

    } catch (error) {
        console.error('Enhanced essay generation error:', error);
        return NextResponse.json({
            error: 'Failed to generate enhanced essay',
            message: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function buildEnhancedContext(params: any): string {
    const {
        college,
        essay,
        activities,
        achievements,
        transcript,
        personalProfile,
        collegeResearch,
        activityIntelligence,
        storyMining,
        toneCalibration,
        weaknessAnalysis
    } = params;

    let context = `# ENHANCED ESSAY CONTEXT\n\n`;

    // College info
    context += `## College: ${college.fullName}\n`;
    context += `Values: ${college.values.join(', ')}\n`;
    context += `Culture: ${college.culture}\n\n`;

    // Essay prompt
    context += `## Essay Prompt\n${essay.prompt}\n`;
    context += `Word Limit: ${essay.wordLimit}\n\n`;

    // Activity intelligence
    if (activityIntelligence) {
        context += `## Activity Intelligence\n`;
        context += `Key Themes: ${activityIntelligence.keyThemes?.join(', ') || 'N/A'}\n`;
        context += `Unique Angles: ${activityIntelligence.uniqueAngles?.join('; ') || 'N/A'}\n`;
        context += `Specific Metrics: ${activityIntelligence.specificNumbers?.length || 0} quantifiable achievements\n\n`;
    }

    // Activities
    context += `## Activities\n${JSON.stringify(activities, null, 2)}\n\n`;

    // Story mining
    if (storyMining?.stories) {
        context += `## Top Stories Available\n`;
        storyMining.stories.slice(0, 5).forEach((story: any, i: number) => {
            context += `${i + 1}. ${story.title} (${story.type})\n`;
            context += `   Impact: ${story.emotionalImpact}/100, Uniqueness: ${story.uniqueness}/100\n`;
        });
        context += '\n';
    }

    // Tone guidance
    if (toneCalibration) {
        context += `## Tone Guidance for ${college.name}\n`;
        context += `Preferred: ${toneCalibration.preferred?.toneWords?.join(', ') || 'N/A'}\n`;
        context += `Avoid: ${toneCalibration.avoid?.toneWords?.join(', ') || 'N/A'}\n\n`;
    }

    // Weakness strategy
    if (weaknessAnalysis?.essayStrategy) {
        context += `## Strategic Guidance\n`;
        context += `Emphasize: ${weaknessAnalysis.essayStrategy.whatToEmphasize?.join('; ') || 'N/A'}\n`;
        context += `Minimize: ${weaknessAnalysis.essayStrategy.whatToMinimize?.join('; ') || 'N/A'}\n\n`;
    }

    // College research
    if (collegeResearch) {
        context += `## College-Specific Research\n`;
        context += `Professors: ${collegeResearch.professors?.map((p: any) => p.name).join(', ') || 'N/A'}\n`;
        context += `Courses: ${collegeResearch.courses?.map((c: any) => c.code).join(', ') || 'N/A'}\n\n`;
    }

    return context;
}

async function analyzePromptStrategy(params: any): Promise<any> {
    const { claudeKey, prompt, college, activities, activityIntelligence, storyMining } = params;

    const strategyPrompt = `You are an expert at analyzing college essay prompts. Decode what this prompt REALLY asks for.

PROMPT: "${prompt}"

COLLEGE: ${college.fullName}
COLLEGE VALUES: ${college.values.join(', ')}

STUDENT ACTIVITIES:
${JSON.stringify(activities.slice(0, 5), null, 2)}

${activityIntelligence ? `KEY THEMES: ${activityIntelligence.keyThemes?.join(', ')}` : ''}

TASK: Analyze this prompt deeply.

Return JSON:
{
  "hiddenQuestions": ["What is this prompt REALLY asking?"],
  "bestActivitiesToHighlight": ["Which activities fit this prompt best"],
  "bestAngle": "What approach to take",
  "whatAdmissionsWants": ["What admissions officers want to see"],
  "commonMistakes": ["What to avoid"]
}

Return ONLY the JSON object.`;

    const response = await callClaude(claudeKey, strategyPrompt);
    return parseJSON(response, {
        hiddenQuestions: [],
        bestActivitiesToHighlight: [],
        bestAngle: '',
        whatAdmissionsWants: [],
        commonMistakes: []
    });
}

function selectBestStories(params: any): any[] {
    const { storyMining, prompt, college, promptStrategy, numStories = 3 } = params;

    if (!storyMining?.stories || storyMining.stories.length === 0) {
        return [];
    }

    // Filter stories suitable for this prompt
    const suitableStories = storyMining.stories.filter((story: any) =>
        story.suitablePrompts?.some((p: string) => p.includes(prompt.substring(0, 50))) ||
        story.collegeAlignment?.[college.id] > 70
    );

    // If no suitable stories found, use top scored stories
    const storiesPool = suitableStories.length > 0 ? suitableStories : storyMining.stories;

    // Return top N stories
    return storiesPool.slice(0, numStories);
}

async function generateEnhancedVariant(params: any): Promise<any> {
    const {
        claudeKey,
        context,
        approach,
        promptStrategy,
        toneCalibration,
        activityIntelligence,
        weaknessAnalysis,
        wordLimit
    } = params;

    const generationPrompt = `You are an expert college essay writer. Generate a ${approach.name} essay.

${context}

APPROACH: ${approach.focus}

${approach.primaryStory ? `PRIMARY STORY TO USE:
Title: ${approach.primaryStory.title}
Hook: ${approach.primaryStory.hook}
Context: ${approach.primaryStory.context}
Conflict: ${approach.primaryStory.conflict}
Result: ${approach.primaryStory.result}
Reflection: ${approach.primaryStory.reflection}
` : ''}

PROMPT STRATEGY:
${JSON.stringify(promptStrategy, null, 2)}

${toneCalibration ? `TONE GUIDANCE:
- Preferred: ${toneCalibration.preferred?.toneWords?.join(', ')}
- Example phrases: ${toneCalibration.preferred?.examplePhrases?.slice(0, 3).join('; ')}
- Avoid: ${toneCalibration.avoid?.bannedPhrases?.slice(0, 3).join('; ')}
` : ''}

REQUIREMENTS:
- ${wordLimit} words or fewer
- Include at least 8 specific metrics/numbers from activity intelligence
- Use authentic, human voice (no AI phrases)
- Match ${toneCalibration?.collegeName || 'college'}'s tone
- Answer the prompt directly
- ${weaknessAnalysis ? `Emphasize: ${weaknessAnalysis.essayStrategy?.whatToEmphasize?.slice(0, 2).join(', ')}` : ''}

Generate the essay. Return ONLY the essay text, no preamble.`;

    const response = await callClaude(claudeKey, generationPrompt, 3000);

    return {
        approach: approach.name,
        content: response.trim(),
        storyUsed: approach.primaryStory?.title
    };
}

async function evaluateEnhancedQuality(params: any): Promise<any> {
    const { claudeKey, essay, prompt, college, toneCalibration, activityIntelligence, wordLimit } = params;

    const evaluationPrompt = `You are a college admissions expert. Evaluate this essay's quality.

ESSAY:
${essay}

PROMPT: ${prompt}
COLLEGE: ${college.name}
WORD LIMIT: ${wordLimit}

${toneCalibration ? `TONE REQUIREMENTS:
- Should match: ${toneCalibration.preferred?.toneWords?.join(', ')}
- Should avoid: ${toneCalibration.avoid?.toneWords?.join(', ')}
` : ''}

Evaluate on:
1. Authenticity (0-100): Sounds human, not AI
2. Specificity (0-100): Concrete details, numbers
3. College Fit (0-100): Matches ${college.name}'s values/tone
4. Emotional Impact (0-100): Memorable, moving
5. Technical Quality (0-100): Grammar, flow
6. Prompt Alignment (0-100): Answers the question

Return JSON:
{
  "authenticity": 95,
  "specificity": 92,
  "collegeFit": 88,
  "emotionalImpact": 90,
  "technicalQuality": 94,
  "promptAlignment": 91,
  "overall": 92,
  "strengths": ["What works well"],
  "weaknesses": ["What needs improvement"]
}

Return ONLY the JSON object.`;

    const response = await callClaude(claudeKey, evaluationPrompt, 2000);
    return parseJSON(response, {
        authenticity: 0,
        specificity: 0,
        collegeFit: 0,
        emotionalImpact: 0,
        technicalQuality: 0,
        promptAlignment: 0,
        overall: 0,
        strengths: [],
        weaknesses: []
    });
}

async function refineWithEnhancements(params: any): Promise<any> {
    const {
        claudeKey,
        essay,
        targetQuality,
        currentQuality,
        iteration,
        toneCalibration,
        activityIntelligence,
        promptStrategy,
        weaknessAnalysis,
        wordLimit
    } = params;

    const refinementPrompt = `You are an expert essay editor. Refine this essay to reach ${targetQuality}% quality.

CURRENT ESSAY:
${essay}

CURRENT QUALITY: ${currentQuality.toFixed(1)}%
TARGET: ${targetQuality}%
ITERATION: ${iteration}

${toneCalibration ? `TONE REQUIREMENTS:
- Match: ${toneCalibration.preferred?.toneWords?.join(', ')}
- Avoid: ${toneCalibration.avoid?.bannedPhrases?.join(', ')}
` : ''}

${activityIntelligence ? `AVAILABLE METRICS (use more):
${activityIntelligence.specificNumbers?.slice(0, 10).map((m: any) => `- ${m.metric}: ${m.context}`).join('\n')}
` : ''}

FOCUS THIS ITERATION:
${iteration === 1 ? '- Add more specific numbers and details' : ''}
${iteration === 2 ? '- Strengthen college fit and specific resources' : ''}
${iteration === 3 ? '- Enhance authenticity, remove AI phrases' : ''}
${iteration === 4 ? '- Polish tone to match college perfectly' : ''}
${iteration === 5 ? '- Final polish and optimization' : ''}

Return JSON:
{
  "content": "The improved essay",
  "improvements": ["List of changes made"]
}

Return ONLY the JSON object.`;

    const response = await callClaude(claudeKey, refinementPrompt, 3000);
    return parseJSON(response, {
        content: essay,
        improvements: []
    });
}

async function validateEnhancedEssay(params: any): Promise<any> {
    const { claudeKey, essay, prompt, college, toneCalibration, activityIntelligence, wordLimit } = params;

    const validationPrompt = `You are a final essay validator. Check if this essay is ready to submit.

ESSAY:
${essay}

WORD LIMIT: ${wordLimit}

Validate:
1. Word count (under ${wordLimit}?)
2. Specific details (at least 8 numbers/metrics?)
3. College mentions (at least 2-3 specific resources?)
4. AI phrases (any banned phrases?)
5. Tone match (matches ${college.name}?)

Return JSON:
{
  "wordCount": ${essay.split(/\s+/).length},
  "wordCountStatus": "perfect",
  "specificDetailsCount": 10,
  "collegeReferencesCount": 3,
  "bannedPhrasesFound": [],
  "toneMatch": true,
  "readyToSubmit": true,
  "finalRecommendations": []
}

Return ONLY the JSON object.`;

    const response = await callClaude(claudeKey, validationPrompt, 2000);
    return parseJSON(response, {
        wordCount: 0,
        wordCountStatus: 'unknown',
        specificDetailsCount: 0,
        collegeReferencesCount: 0,
        bannedPhrasesFound: [],
        toneMatch: false,
        readyToSubmit: false,
        finalRecommendations: []
    });
}

async function checkCollegeRedFlags(params: any): Promise<any> {
    const { claudeKey, essay, college, toneCalibration } = params;

    const redFlagsPrompt = `You are a ${college.fullName} admissions officer. Check this essay for red flags specific to ${college.name}.

ESSAY:
${essay}

${college.name} HATES:
${toneCalibration?.avoid?.commonMistakes?.join('\n') || 'Generic praise, lack of specificity'}

Does this essay have any ${college.name}-specific red flags?

Return JSON:
{
  "redFlags": ["Any red flags found"],
  "severity": "none",  // "none", "minor", "moderate", "critical"
  "fixes": ["How to fix each red flag"]
}

Return ONLY the JSON object.`;

    const response = await callClaude(claudeKey, redFlagsPrompt, 1500);
    return parseJSON(response, {
        redFlags: [],
        severity: 'none',
        fixes: []
    });
}

async function callClaude(apiKey: string, prompt: string, maxTokens: number = 4000): Promise<string> {
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
