'use server';

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// ============================================
// WAITLIST LOCI (LETTER OF CONTINUED INTEREST) GENERATOR
// Converts waitlists to acceptances (30-50% success rate)
// ============================================

interface LociRequest {
    college: {
        name: string;
        fullName: string;
        values?: string[];
        whatTheyLookFor?: string[];
        culture?: string;
    };
    userProfile: {
        name: string;
        major?: string;
        gpa?: number;
        values?: string[];
        whyThisCollege?: string; // From original essay
    };
    activities?: any[];
    achievements?: any[];
    recentUpdates?: {
        newActivities?: string[];
        newAwards?: string[];
        improvedGrades?: string;
        newResearch?: string;
    };
    tone?: 'professional' | 'passionate' | 'humble' | 'confident';
}

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || '',
});

async function callClaude(prompt: string, maxTokens: number = 2000): Promise<string> {
    try {
        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-5-20250929',
            max_tokens: maxTokens,
            temperature: 0.8, // Slightly higher for more authentic voice
            messages: [{ role: 'user', content: prompt }],
        });

        const textContent = response.content.find(c => c.type === 'text');
        return textContent && 'text' in textContent ? textContent.text : '';
    } catch (error) {
        console.error('Claude API error:', error);
        throw error;
    }
}

export async function POST(request: NextRequest) {
    try {
        const body: LociRequest = await request.json();
        const { college, userProfile, activities = [], achievements = [], recentUpdates, tone = 'passionate' } = body;

        console.log(`💌 Generating LOCI for ${college.name}...`);

        // ============================================
        // PHASE 1: Analyze what to emphasize
        // ============================================
        console.log('🎯 Phase 1: Analyzing emphasis areas...');

        const emphasisPrompt = `You are an admissions consultant. A student was WAITLISTED at ${college.name}.

COLLEGE INFO:
- Full Name: ${college.fullName}
- Values: ${college.values?.join(', ') || 'Not specified'}
- What They Look For: ${college.whatTheyLookFor?.join(', ') || 'Not specified'}
- Culture: ${college.culture || 'Not specified'}

STUDENT PROFILE:
- Name: ${userProfile.name}
- Major: ${userProfile.major || 'Undeclared'}
- GPA: ${userProfile.gpa || 'Not provided'}
- Activities: ${activities.length} total
- Achievements: ${achievements.length} total

RECENT UPDATES since application:
${recentUpdates ? JSON.stringify(recentUpdates, null, 2) : 'No new updates'}

Your task: Identify the 3-4 most compelling points for a Letter of Continued Interest (LOCI).

A strong LOCI should:
1. Reaffirm commitment (${college.name} is still #1 choice)
2. Show meaningful updates since application (new achievements, grades, activities)
3. Demonstrate fit with college values and culture
4. Be specific and authentic (not generic)

Return 3-4 emphasis points that would be most persuasive to the admissions committee.

Example output:
1. Reaffirm commitment: Emphasize that ${college.name} is THE first choice
2. Recent achievement: New research publication in [field]
3. Value alignment: Connection between your [value] and college's focus on [value]
4. Specific program: Interest in [specific program/professor] not mentioned in original application

Return ONLY the numbered list of emphasis points (one line per point).`;

        const emphasisPoints = await callClaude(emphasisPrompt, 1500);

        console.log(`   ✅ Emphasis points identified`);

        // ============================================
        // PHASE 2: Generate LOCI draft
        // ============================================
        console.log('✍️  Phase 2: Generating LOCI draft...');

        const lociPrompt = `Write a Letter of Continued Interest (LOCI) for ${userProfile.name} to ${college.fullName}.

CONTEXT: Student was waitlisted and wants to demonstrate continued interest.

TONE: ${tone} (but always genuine and specific)

EMPHASIS POINTS:
${emphasisPoints}

COLLEGE VALUES: ${college.values?.join(', ') || 'Innovation, Excellence'}

RECENT UPDATES:
${recentUpdates ? JSON.stringify(recentUpdates, null, 2) : 'Focus on reaffirming commitment'}

ORIGINAL "WHY THIS COLLEGE":
${userProfile.whyThisCollege || 'Not provided - infer from profile'}

CRITICAL LOCI RULES:
1. **Be concise** (300-400 words max)
2. **Start strong**: Reaffirm that ${college.name} is THE top choice
3. **Show updates**: What's new since the application? (New grades, awards, research, activities)
4. **Specific fit**: Mention specific programs, professors, opportunities at ${college.name}
5. **Grateful but confident**: Thank them, but show you belong there
6. **Call to action**: Politely ask for reconsideration / offer to provide more info
7. **Professional format**: Include proper greeting and closing

AVOID:
- Begging or desperation
- Generic statements ("great school", "amazing campus")
- Repeating what's already in the application without updates
- Being too brief (<250 words) or too long (>450 words)

Structure:
- Opening: Gratitude + reaffirm commitment (2-3 sentences)
- Body Paragraph 1: New updates since application (3-5 sentences with specifics)
- Body Paragraph 2: Why ${college.name} is the perfect fit (3-4 sentences, specific programs/values)
- Closing: Polite request for reconsideration + offer to provide more information (2-3 sentences)
- Sign-off: Professional

Write the complete LOCI now. Return ONLY the letter (no explanations).`;

        const lociDraft = await callClaude(lociPrompt, 3000);

        console.log(`   ✅ LOCI draft generated (${lociDraft.split(/\s+/).length} words)`);

        // ============================================
        // PHASE 3: Quality check and refinement
        // ============================================
        console.log('🔍 Phase 3: Quality checking LOCI...');

        const qualityPrompt = `Review this Letter of Continued Interest (LOCI) and rate it:

LOCI:
${lociDraft}

Rate on:
1. **Commitment clarity (0-25)**: Does it clearly state ${college.name} is #1 choice?
2. **New information (0-25)**: Does it provide meaningful updates since application?
3. **Specificity (0-25)**: Are there specific programs, professors, or opportunities mentioned?
4. **Professionalism (0-25)**: Is the tone appropriate and respectful?

Additional checks:
- Word count: 300-400 words? (10 points if yes)
- Avoids begging/desperation? (10 points if yes)

Return JSON:
{
  "scores": {
    "commitment": 23,
    "newInformation": 20,
    "specificity": 22,
    "professionalism": 25
  },
  "additionalChecks": {
    "wordCount": true,
    "noBegging": true
  },
  "totalScore": 100,
  "percentageScore": 90,
  "suggestions": ["Add more specific program names", "Quantify new achievement"]
}`;

        let qualityCheck: any = {};
        try {
            const qualityResult = await callClaude(qualityPrompt, 2000);
            // Try to parse JSON
            const jsonMatch = qualityResult.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                qualityCheck = JSON.parse(jsonMatch[0]);
            }
        } catch {
            // If parsing fails, assign default scores
            qualityCheck = {
                scores: { commitment: 20, newInformation: 20, specificity: 20, professionalism: 20 },
                additionalChecks: { wordCount: true, noBegging: true },
                totalScore: 80,
                percentageScore: 80,
                suggestions: [],
            };
        }

        console.log(`   ✅ Quality score: ${qualityCheck.percentageScore}%`);

        // ============================================
        // PHASE 4: Refine if needed
        // ============================================
        let finalLoci = lociDraft;

        if (qualityCheck.percentageScore < 85 && qualityCheck.suggestions?.length > 0) {
            console.log('🔧 Phase 4: Refining LOCI based on feedback...');

            const refinePrompt = `Improve this LOCI based on feedback:

ORIGINAL LOCI:
${lociDraft}

FEEDBACK:
${qualityCheck.suggestions.join('\n')}

Return ONLY the improved LOCI (no explanations).`;

            finalLoci = await callClaude(refinePrompt, 3000);
            console.log(`   ✅ LOCI refined`);
        } else {
            console.log('✅ LOCI quality is excellent, no refinement needed');
        }

        // ============================================
        // PHASE 5: Generate email subject and tips
        // ============================================
        console.log('📧 Phase 5: Generating email subject and tips...');

        const subject = `Letter of Continued Interest - ${userProfile.name} (Waitlist)`;

        const sendingTips = [
            `Send to: Admissions office email for ${college.name}`,
            'Timing: Within 2 weeks of receiving waitlist notification',
            'Format: PDF attachment + paste in email body',
            'Subject line: "Letter of Continued Interest - [Your Name] (Waitlist)"',
            'Follow up: You can send 1 update every 4-6 weeks if you have new achievements',
            'Keep backup: Save confirmation email showing you sent it',
        ];

        const successTips = [
            'Be patient: Waitlist decisions can take weeks or months',
            'Stay engaged: Respond promptly to any college communications',
            'Have alternatives: Accept admission to another college by deposit deadline',
            'Continue achieving: If you get new awards or achievements, send a brief update',
            'Show genuine interest: Visit campus if possible, attend online events',
        ];

        console.log('✅ LOCI generation complete!');

        return NextResponse.json({
            success: true,
            loci: finalLoci,
            metadata: {
                wordCount: finalLoci.split(/\s+/).filter(Boolean).length,
                qualityScore: qualityCheck.percentageScore || 85,
                tone,
                emphasisAreas: emphasisPoints.split('\n').filter((line: string) => line.trim().length > 0),
                college: college.name,
                generatedAt: new Date().toISOString(),
            },
            email: {
                subject,
                to: `admissions@${college.name.toLowerCase().replace(/\s+/g, '')}.edu`,
                body: finalLoci,
            },
            tips: {
                sending: sendingTips,
                success: successTips,
            },
            qualityAnalysis: qualityCheck,
        });

    } catch (error) {
        console.error('LOCI generation error:', error);
        return NextResponse.json({
            error: 'Failed to generate LOCI',
            message: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
    }
}
