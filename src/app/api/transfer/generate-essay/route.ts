'use server';

import { NextRequest, NextResponse } from 'next/server';

// ============================================
// TRANSFER ESSAY GENERATION API
// Generate college-specific essays based on user activities
// Uses Claude API for maximum quality
// ============================================

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const getClaudeKey = () => process.env.CLAUDE_API_KEY || process.env.NEXT_PUBLIC_CLAUDE_API_KEY || '';

interface Activity {
    name: string;
    role: string;
    organization: string;
    description: string;
    hoursPerWeek: number;
    weeksPerYear: number;
}

interface GenerateEssayRequest {
    college: {
        id: string;
        name: string;
        fullName: string;
        values: string[];
        whatTheyLookFor: string[];
        culture: string;
        notablePrograms: string[];
        uniqueFeatures: string[];
    };
    essay: {
        id: string;
        title: string;
        prompt: string;
        wordLimit: number;
    };
    activities: Activity[];
    userProfile?: {
        name?: string;
        major?: string;
        gpa?: string | number;
        values?: string[];
        interests?: string[];
    };
}

// Helper to calculate activity time commitment
function calculateTotalHours(activity: Activity): number {
    return activity.hoursPerWeek * activity.weeksPerYear;
}

// Format activities for AI prompt
function formatActivitiesForAI(activities: Activity[]): string {
    return activities
        .map((activity, index) => {
            const totalHours = calculateTotalHours(activity);
            return `
${index + 1}. ${activity.name}
   Role: ${activity.role}
   Organization: ${activity.organization}
   Time Commitment: ${activity.hoursPerWeek} hrs/week × ${activity.weeksPerYear} weeks/year (${totalHours} total hours)
   Description: ${activity.description}
`.trim();
        })
        .join('\n\n');
}

export async function POST(request: NextRequest) {
    try {
        const body: GenerateEssayRequest = await request.json();
        const { college, essay, activities, userProfile } = body;

        const claudeKey = getClaudeKey();

        if (!claudeKey) {
            return NextResponse.json({
                error: 'Claude API key not configured. Please add CLAUDE_API_KEY to your environment variables.'
            }, { status: 500 });
        }

        if (activities.length === 0) {
            return NextResponse.json({
                error: 'No activities provided. Please add activities to your profile first.'
            }, { status: 400 });
        }

        console.log(`🎓 Generating essay for ${college.name}: "${essay.title}"`);
        console.log(`📊 Using ${activities.length} activities as context`);

        // Sort activities by total hours (shows dedication)
        const sortedActivities = [...activities].sort(
            (a, b) => calculateTotalHours(b) - calculateTotalHours(a)
        );

        // Build rich context about the college
        const collegeContext = `
${college.fullName} (${college.name})

CORE VALUES: ${college.values.join(', ')}

WHAT THEY LOOK FOR: ${college.whatTheyLookFor.join(', ')}

CULTURE: ${college.culture}

NOTABLE PROGRAMS: ${college.notablePrograms.join(', ')}

UNIQUE FEATURES: ${college.uniqueFeatures.join(', ')}
`.trim();

        // Build user context
        const userContext = userProfile ? `
APPLICANT PROFILE:
- Major Interest: ${userProfile.major || 'Not specified'}
- GPA: ${userProfile.gpa || 'Not specified'}
- Core Values: ${userProfile.values?.join(', ') || 'Not specified'}
- Interests: ${userProfile.interests?.join(', ') || 'Not specified'}
`.trim() : 'Applicant profile not provided.';

        // Create the AI prompt - ENHANCED FOR 100% QUALITY
        const systemPrompt = `You are THE WORLD'S #1 college essay consultant. Your essays have a 100% acceptance rate to Ivy League and top-tier universities. Admissions officers at MIT, Stanford, and Harvard specifically request your students.

YOUR MISSION: Write a FLAWLESS, admission-GUARANTEEING essay that makes ${college.name} admissions officers DEMAND this student.

🎯 NON-NEGOTIABLE REQUIREMENTS (All must be met for 100% quality):

1. **AUTHENTICITY - CRITICAL**:
   - Write like a brilliant 20-year-old HUMAN, not an AI
   - Use contractions (I'm, don't, can't, won't)
   - Vary sentence length dramatically (3-word sentences next to 30-word ones)
   - Include casual phrases: "honestly", "turns out", "weird thing is"
   - BANNED PHRASES: "As a passionate...", "Throughout my journey", "I have always", "This experience taught me"
   - If it sounds polished/formal, you've FAILED

2. **SPECIFICITY - MANDATORY**:
   - MUST include: specific numbers, dates, names, locations, technical details
   - Example: Not "I led a team" → "I coordinated 12 volunteers across 3 Riverside homeless shelters"
   - Example: Not "I improved efficiency" → "I reduced processing time from 4 hours to 47 minutes"
   - Every claim MUST have concrete evidence from their actual activities
   - Zero generic statements allowed

3. **COLLEGE FIT - SHOW DEEP RESEARCH**:
   - Reference 2-3 SPECIFIC resources at ${college.name}:
     * Specific professors (e.g., "Professor Daniela Rus at CSAIL")
     * Specific labs/centers (e.g., "MIT Media Lab's Lifelong Kindergarten group")
     * Specific courses (e.g., "6.034 Artificial Intelligence")
     * Specific traditions (e.g., "MIT's culture of 'hacks'")
   - Connect their activities to ${college.name}'s values: ${college.values.join(', ')}
   - Show you've done homework beyond the website

4. **NARRATIVE ARC - STORY STRUCTURE**:
   - HOOK (sentence 1-2): Start with a vivid moment, surprising fact, or provocative question
   - RISING ACTION: Build tension/complexity
   - CLIMAX: Pivotal realization or achievement
   - RESOLUTION: Forward-looking vision at ${college.name}
   - Every paragraph must flow seamlessly

5. **SHOW DON'T TELL - EVIDENCE-BASED**:
   - NEVER say "I'm a leader" → SHOW through specific actions
   - NEVER say "I'm passionate" → SHOW through 300+ hours invested
   - Use sensory details: what you saw, heard, felt
   - Paint a scene, don't describe it

6. **THE SPARK - MAKE IT UNFORGETTABLE**:
   - Include ONE moment of:
     * Raw vulnerability (failure that led to growth)
     * Counter-intuitive insight (challenge common wisdom)
     * Unique connection (unexpected link between activities)
   - This is what separates 95% essays from 100% essays
   - Admissions officers should REMEMBER this essay weeks later

🎨 WRITING STYLE (Match this tone exactly):
- **Voice**: Intelligent 20-year-old having coffee with a mentor (casual but substantive)
- **Pacing**: Fast. No fluff. Every sentence adds value.
- **Emotion**: Subtle but present. Don't be cheesy.
- **Confidence**: Assured but not arrogant. Let achievements speak.

📏 WORD LIMIT: **${essay.wordLimit} words MAXIMUM** (aim for ${Math.floor(essay.wordLimit * 0.92)}-${essay.wordLimit})
- Cut ruthlessly. Dense > wordy.
- Every word must earn its place.

🚫 INSTANT DISQUALIFICATION (If you include these, essay is rejected):
- "As a passionate..."
- "Throughout my journey..."
- "I have always believed..."
- "This experience taught me that..."
- "In today's world..."
- "Since I was young..."
- Generic platitudes about ${college.name} ("world-class education", "diverse community")

✅ SUCCESS CRITERIA (Check before submitting):
- [ ] Could ONLY be written by this specific student (not template-able)
- [ ] Includes 5+ specific numbers/names/details from their activities
- [ ] References 2+ specific ${college.name} resources by name
- [ ] Has a "spark" moment that makes it memorable
- [ ] Flows naturally (read aloud test)
- [ ] Answers the prompt DIRECTLY
- [ ] Within word limit
- [ ] Zero AI-sounding phrases

OUTPUT FORMAT: **ONLY the essay text. No preamble. No explanations. Just the essay.**

This essay will determine their future. Make it perfect.`;

        const userMessage = `
ESSAY PROMPT:
"${essay.prompt}"

WORD LIMIT: ${essay.wordLimit} words

---

${collegeContext}

---

${userContext}

---

STUDENT'S ACTIVITIES (from S3 bucket):
${formatActivitiesForAI(sortedActivities)}

---

INSTRUCTIONS:
Write an exceptional essay that:
1. Directly answers the prompt
2. Draws from the student's ACTUAL activities (be specific - use details!)
3. Shows why ${college.name} is the perfect fit based on their values: ${college.values.slice(0, 3).join(', ')}
4. Stays within ${essay.wordLimit} words
5. Feels authentically human (avoid AI-sounding phrases like "As a passionate..." or "Throughout my journey...")

Remember: The goal is to make admissions officers FEEL something and remember this student.

Write the essay now:`;

        // Call Claude API
        const response = await fetch(CLAUDE_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': claudeKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-5-20250929', // Latest Sonnet model
                max_tokens: 4000,
                temperature: 0.9, // Higher temperature for creativity
                system: systemPrompt,
                messages: [{ role: 'user', content: userMessage }],
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Claude API error:', errorText);
            return NextResponse.json({
                error: 'Claude API request failed',
                details: errorText
            }, { status: 500 });
        }

        const data = await response.json();
        const generatedEssay = data.content[0].text.trim();

        // Calculate word count
        const wordCount = generatedEssay.split(/\s+/).filter(Boolean).length;

        // Basic quality check
        const hasCollegeName = generatedEssay.toLowerCase().includes(college.name.toLowerCase());
        const hasSpecifics = generatedEssay.match(/\b\d+\b/g)?.length || 0; // Contains numbers (shows specificity)

        const initialScore = hasCollegeName && hasSpecifics > 0 ? 85 : 75;

        console.log(`✅ Essay generated: ${wordCount} words (limit: ${essay.wordLimit})`);
        console.log(`📊 Initial quality score: ${initialScore}%`);

        return NextResponse.json({
            success: true,
            essay: generatedEssay,
            wordCount,
            score: initialScore,
            metadata: {
                activitiesUsed: activities.length,
                collegeValuesMatched: college.values.length,
                hasCollegeName,
                specificity: hasSpecifics,
            },
        });

    } catch (error) {
        console.error('Essay generation error:', error);
        return NextResponse.json({
            error: 'Failed to generate essay',
            message: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
