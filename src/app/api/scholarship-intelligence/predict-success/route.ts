'use server';

import { NextRequest, NextResponse } from 'next/server';

// ============================================
// APPLICATION SUCCESS PREDICTOR
// Simulates scholarship reviewer decision-making
// ============================================

interface SuccessPredictionRequest {
    scholarship: {
        id: string;
        name: string;
        sponsor: string;
        amount: string;
        category: string;
        competitiveness?: 'low' | 'medium' | 'high' | 'very-high';
    };
    userProfile: any;
    activities: any[];
    documents?: {
        essays?: { essay: string }[];
        cv?: string;
    };
}

// Helper: Call Claude API
async function callClaude(apiKey: string, prompt: string, maxTokens: number = 2000): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model: 'claude-sonnet-4-5-20250929',
            max_tokens: maxTokens,
            messages: [{
                role: 'user',
                content: prompt,
            }],
        }),
    });

    const data = await response.json();
    return data.content?.[0]?.text || '';
}

// Helper: Parse JSON safely
function parseJSON(text: string, fallback: any): any {
    try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return fallback;
    } catch {
        return fallback;
    }
}

// Calculate competitiveness based on scholarship data
function estimateCompetitiveness(scholarship: any): 'low' | 'medium' | 'high' | 'very-high' {
    if (scholarship.competitiveness) return scholarship.competitiveness;

    const amount = scholarship.amount.toLowerCase();
    const name = scholarship.name.toLowerCase();

    // Very high competitiveness indicators
    if (name.includes('fulbright') || name.includes('rhodes') || name.includes('knight-hennessy')) {
        return 'very-high';
    }
    if (amount.includes('full') && (amount.includes('tuition') || amount.includes('funding'))) {
        return 'very-high';
    }

    // High competitiveness
    if (parseInt(amount.replace(/[^0-9]/g, '')) > 50000) {
        return 'high';
    }
    if (name.includes('national') || name.includes('presidential')) {
        return 'high';
    }

    // Medium competitiveness
    if (parseInt(amount.replace(/[^0-9]/g, '')) > 10000) {
        return 'medium';
    }

    // Low competitiveness
    return 'low';
}

export async function POST(request: NextRequest) {
    try {
        const body: SuccessPredictionRequest = await request.json();
        const { scholarship, userProfile, activities, documents } = body;

        const claudeKey = process.env.ANTHROPIC_API_KEY;
        if (!claudeKey) {
            return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
        }

        console.log(`🎯 Predicting success for: ${scholarship.name}`);

        const competitiveness = estimateCompetitiveness(scholarship);
        console.log(`   Competition level: ${competitiveness}`);

        // ============================================
        // PHASE 1: Profile Strength Analysis
        // ============================================
        console.log('📊 Phase 1: Analyzing profile strength...');

        const profilePrompt = `You are a scholarship reviewer. Analyze this applicant's PROFILE STRENGTH:

SCHOLARSHIP: ${scholarship.name} by ${scholarship.sponsor}
AMOUNT: ${scholarship.amount}
CATEGORY: ${scholarship.category}
COMPETITIVENESS: ${competitiveness}

APPLICANT:
- GPA: ${userProfile?.gpa || 'Not specified'}
- Major: ${userProfile?.major || 'Not specified'}
- Current Institution: ${userProfile?.currentCollege || 'Not specified'}
- Background: ${userProfile?.background || 'Not specified'}

ACTIVITIES (${activities.length} total):
${activities.slice(0, 15).map((a: any, i: number) => `${i + 1}. ${a.name} - ${a.role} (${a.hoursPerWeek}h/week)`).join('\n')}

Rate applicant's profile strength:
1. Academic Strength (0-100): GPA, coursework, academic achievements
2. Activity Strength (0-100): Quality, impact, leadership of activities
3. Scholarship Fit (0-100): How well profile matches scholarship values/mission
4. Uniqueness (0-100): How differentiated from typical applicants
5. Overall Profile Score (0-100)

Return JSON:
{
  "academicStrength": 85,
  "activityStrength": 90,
  "scholarshipFit": 88,
  "uniqueness": 75,
  "overallScore": 85,
  "strengths": ["high GPA", "leadership"],
  "weaknesses": ["limited research experience"]
}`;

        const profileAnalysis = parseJSON(await callClaude(claudeKey, profilePrompt, 2000), {
            overallScore: 70,
        });

        console.log(`   Profile score: ${profileAnalysis.overallScore}/100`);

        // ============================================
        // PHASE 2: Document Quality Analysis (if provided)
        // ============================================
        let documentQuality = 85; // Default if no documents provided

        if (documents?.essays && documents.essays.length > 0) {
            console.log('📝 Phase 2: Analyzing document quality...');

            const essayText = documents.essays.map(e => e.essay).join('\n\n---\n\n');

            const documentPrompt = `You are a scholarship reviewer. Rate this application's DOCUMENT QUALITY:

SCHOLARSHIP: ${scholarship.name}

ESSAYS:
${essayText}

${documents.cv ? `CV:\n${documents.cv}` : ''}

Rate document quality:
1. Essay Quality (0-100): Clarity, impact, authenticity, storytelling
2. Quantification (0-100): Specific numbers and metrics
3. Authenticity (0-100): Genuine voice vs AI-sounding
4. Emotional Impact (0-100): Memorability, connection
5. Overall Document Score (0-100)

Return JSON:
{
  "essayQuality": 92,
  "quantification": 95,
  "authenticity": 100,
  "emotionalImpact": 88,
  "overallScore": 94,
  "strengths": ["vivid storytelling", "specific metrics"],
  "weaknesses": []
}`;

            const documentAnalysis = parseJSON(await callClaude(claudeKey, documentPrompt, 2000), {
                overallScore: 85,
            });

            documentQuality = documentAnalysis.overallScore;
            console.log(`   Document quality: ${documentQuality}/100`);
        } else {
            console.log('📝 Phase 2: No documents provided, using estimated quality...');
        }

        // ============================================
        // PHASE 3: Competition Analysis
        // ============================================
        console.log('🏆 Phase 3: Analyzing competition level...');

        const competitionPrompt = `Analyze COMPETITION for this scholarship:

SCHOLARSHIP: ${scholarship.name}
COMPETITIVENESS: ${competitiveness}
APPLICANT PROFILE SCORE: ${profileAnalysis.overallScore}/100
DOCUMENT QUALITY: ${documentQuality}/100

Based on competitiveness, estimate:
1. Number of applicants (approximate)
2. Typical winner profile score (0-100)
3. Applicant's standing: top-1%, top-5%, top-10%, top-25%, top-50%, below-average
4. Competitive advantages this applicant has
5. Competitive disadvantages

Return JSON:
{
  "estimatedApplicants": 5000,
  "typicalWinnerScore": 90,
  "applicantStanding": "top-10%",
  "advantages": ["strong GPA", "unique background"],
  "disadvantages": ["limited leadership roles"],
  "competitivenessRating": "high"
}`;

        const competitionAnalysis = parseJSON(await callClaude(claudeKey, competitionPrompt, 2000), {
            applicantStanding: 'top-25%',
        });

        console.log(`   Applicant standing: ${competitionAnalysis.applicantStanding}`);

        // ============================================
        // PHASE 4: Reviewer Decision Simulation
        // ============================================
        console.log('👤 Phase 4: Simulating reviewer decision...');

        const reviewerPrompt = `You are a scholarship reviewer deciding on this application.

SCHOLARSHIP: ${scholarship.name} (${competitiveness} competitiveness)
APPLICANT PROFILE: ${profileAnalysis.overallScore}/100
DOCUMENT QUALITY: ${documentQuality}/100
COMPETITION: ${competitionAnalysis.applicantStanding}

You've reviewed 50 applications today. Make your decision:

1. Memorability (0-100): Will I remember this applicant tomorrow?
2. Impact (0-100): How much did this application move me?
3. Confidence (0-100): How confident am I in selecting this applicant?
4. Decision: award / finalist / maybe / reject
5. Decision reasoning

Return JSON:
{
  "memorability": 85,
  "impact": 88,
  "confidence": 82,
  "decision": "finalist",
  "reasoning": "Strong profile with compelling story, but highly competitive",
  "scoreVsTypicalWinner": -5
}`;

        const reviewerDecision = parseJSON(await callClaude(claudeKey, reviewerPrompt, 2000), {
            decision: 'maybe',
            memorability: 70,
        });

        console.log(`   Reviewer decision: ${reviewerDecision.decision}`);

        // ============================================
        // PHASE 5: Success Probability Calculation
        // ============================================
        console.log('🎲 Phase 5: Calculating success probability...');

        // Base probabilities by competitiveness
        const baseProbabilities: Record<string, number> = {
            'low': 40,        // 40% base chance
            'medium': 15,     // 15% base chance
            'high': 5,        // 5% base chance
            'very-high': 1,   // 1% base chance
        };

        let successProbability = baseProbabilities[competitiveness] || 10;

        // Adjust based on profile strength
        const profileModifier = (profileAnalysis.overallScore - 70) * 0.5; // +/- 15% max
        successProbability += profileModifier;

        // Adjust based on document quality
        const documentModifier = (documentQuality - 85) * 0.3; // +/- 4.5% max
        successProbability += documentModifier;

        // Adjust based on standing
        const standingMultipliers: Record<string, number> = {
            'top-1%': 3.0,
            'top-5%': 2.0,
            'top-10%': 1.5,
            'top-25%': 1.0,
            'top-50%': 0.5,
            'below-average': 0.2,
        };
        const standingMultiplier = standingMultipliers[competitionAnalysis.applicantStanding] || 1.0;
        successProbability *= standingMultiplier;

        // Cap between 0-100%
        successProbability = Math.max(0, Math.min(100, Math.round(successProbability)));

        console.log(`   Success probability: ${successProbability}%`);

        // ============================================
        // PHASE 6: Recommendations
        // ============================================
        const recommendations: string[] = [];

        if (profileAnalysis.overallScore < 80) {
            recommendations.push('Strengthen profile: Add more high-impact activities or achievements');
        }
        if (documentQuality < 90 && documents) {
            recommendations.push('Improve documents: Increase quantification and emotional impact');
        }
        if (reviewerDecision.memorability < 85) {
            recommendations.push('Increase memorability: Add more unique/vivid details to essays');
        }
        if (competitionAnalysis.disadvantages && competitionAnalysis.disadvantages.length > 0) {
            recommendations.push(`Address weaknesses: ${competitionAnalysis.disadvantages.join(', ')}`);
        }
        if (successProbability < 20) {
            recommendations.push('Consider applying to less competitive scholarships to increase overall success rate');
        }

        console.log('✅ Success prediction complete!');

        return NextResponse.json({
            success: true,
            prediction: {
                successProbability,
                reviewerDecision: reviewerDecision.decision,
                confidence: reviewerDecision.confidence || 75,
            },
            analysis: {
                profile: profileAnalysis,
                documents: documentQuality,
                competition: competitionAnalysis,
                reviewer: reviewerDecision,
            },
            recommendations,
            metadata: {
                scholarshipId: scholarship.id,
                scholarshipName: scholarship.name,
                competitiveness,
                analyzedAt: new Date().toISOString(),
            },
        });

    } catch (error) {
        console.error('Success prediction error:', error);
        return NextResponse.json({
            error: 'Failed to predict success',
            message: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
    }
}
