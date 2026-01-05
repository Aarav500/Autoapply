'use server';

import { NextRequest, NextResponse } from 'next/server';

// ============================================
// AI EXTRACTION API
// Server-side AI extraction using runtime env vars
// ============================================

// Get Claude API key from environment (runtime)
const getClaudeKey = () => process.env.CLAUDE_API_KEY || process.env.NEXT_PUBLIC_CLAUDE_API_KEY || '';

interface ExtractedActivity {
    name: string;
    role: string;
    organization: string;
    startDate: string;
    endDate: string;
    description: string;
    hoursPerWeek: number;
    weeksPerYear: number;
}

interface ExtractedAchievement {
    title: string;
    description: string;
    date: string;
}

interface ExtractionResult {
    activities: ExtractedActivity[];
    achievements: ExtractedAchievement[];
    summary?: string;
}

export async function POST(request: NextRequest) {
    try {
        const { text, documentType } = await request.json();

        if (!text || text.length < 50) {
            return NextResponse.json({
                activities: [],
                achievements: [],
                summary: 'Document too short for extraction'
            });
        }

        const claudeKey = getClaudeKey();

        if (!claudeKey) {
            console.log('Claude API key not configured - available env vars:', Object.keys(process.env).filter(k => k.includes('CLAUDE') || k.includes('API')));
            return NextResponse.json({
                activities: [],
                achievements: [],
                error: 'AI not configured',
                summary: 'Claude API key not configured on server'
            });
        }

        // Build document-type specific prompt
        const getExtractionPrompt = (docType: string, documentText: string) => {
            const baseInstructions = `You are an expert at extracting structured information from documents for college/job applications.
Extract ALL relevant information - be thorough and don't miss anything important.`;

            const typeSpecificInstructions: Record<string, string> = {
                'paper': `This is an ACADEMIC/RESEARCH PAPER. Papers come in many formats - IEEE, ACM, arXiv, Nature, Science, Elsevier, Springer, APA, MLA, Chicago, conference proceedings, journal articles, theses, dissertations, working papers, preprints, etc.

INTELLIGENTLY DETECT AND EXTRACT regardless of format:

1. PAPER METADATA (extract as ACTIVITY):
   - Title: Look for the largest/boldest text at the top, or after "Title:" 
   - Authors: Names listed after title, look for affiliations in superscripts/footnotes
   - YOUR role: If you see the user's name, they are an Author. Check author order (1st author, co-author, corresponding author)
   - Institution: University, lab, company, or research group affiliations
   - Date: Look for submission date, publication date, or copyright year

2. ABSTRACT/SUMMARY (use for description):
   - Look for "Abstract", "Summary", or the italicized paragraph after authors
   - Extract key findings, methodology, and contributions

3. EXTRACT AS ACHIEVEMENTS:
   - Publication venue (journal name, conference name)
   - Impact factor or ranking if mentioned
   - Citations count if mentioned
   - Awards (Best Paper, Honorable Mention, etc.)
   - Grants/funding acknowledged

4. KEY SECTIONS TO SCAN:
   - Introduction: Research problem and motivation
   - Methodology/Methods: Technical skills demonstrated
   - Results/Findings: Key outcomes and discoveries
   - Conclusion: Impact and contributions
   - Acknowledgments: Funding, collaborators, mentors

5. TECHNICAL SKILLS DEMONSTRATED:
   - Programming languages, tools, frameworks mentioned
   - Statistical methods, ML algorithms
   - Lab techniques, equipment used

CREATE ONE ACTIVITY for the research project with a rich description summarizing:
- What problem was solved
- What methods/tools were used
- What was discovered/achieved
- Why it matters`,

                'resume': `This is a RESUME/CV. Extract ALL:
- Work experiences, internships, part-time jobs
- Extracurricular activities, clubs, volunteering
- Leadership positions
- Projects (personal, academic, professional)
- Skills and certifications
- Awards, honors, scholarships`,

                'transcript': `This is an ACADEMIC TRANSCRIPT. Extract:
- Academic achievements (Dean's List, honors)
- Notable courses as activities if relevant
- GPA milestones as achievements
- Academic awards or recognitions`,

                'certificate': `This is a CERTIFICATE/AWARD. Extract:
- The certification/award as an ACHIEVEMENT
- Any training or coursework as an ACTIVITY
- Issuing organization and date
- Skills or competencies certified`,

                'other': `Extract any activities, experiences, achievements, awards, or notable accomplishments.`
            };

            return `${baseInstructions}

${typeSpecificInstructions[docType] || typeSpecificInstructions['other']}

EXTRACTION RULES:
1. Extract EVERY activity, experience, or achievement you can find
2. For dates, use "Month Year" format or estimate if unclear
3. For hours/weeks, estimate based on typical commitment levels
4. Descriptions should be detailed (2-3 sentences) highlighting impact and responsibilities
5. Don't skip anything - err on the side of including more rather than less

Return a JSON object with this exact structure:
{
  "activities": [
    {"name": "Activity/Experience Name", "role": "Your Role/Position", "organization": "Org/Company/School", "startDate": "Month Year", "endDate": "Month Year or Present", "description": "Detailed description of what you did and achieved", "hoursPerWeek": 10, "weeksPerYear": 40}
  ],
  "achievements": [
    {"title": "Achievement Title", "description": "What this achievement represents and its significance", "date": "Month Year"}
  ],
  "summary": "Brief summary: Found X activities and Y achievements including [key highlights]"
}

Document text:
${documentText.substring(0, 10000)}`;
        };

        const prompt = getExtractionPrompt(documentType || 'other', text);

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': claudeKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: 'claude-3-haiku-20240307',
                max_tokens: 4096,
                messages: [{ role: 'user', content: prompt }],
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('Claude API error:', response.status, error);
            return NextResponse.json({
                activities: [],
                achievements: [],
                error: `Claude API error: ${response.status}`,
                summary: 'AI extraction failed'
            }, { status: 500 });
        }

        const data = await response.json();
        const content = data.content?.[0]?.text || '';

        // Parse JSON from response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return NextResponse.json({
                activities: [],
                achievements: [],
                summary: 'Could not parse AI response'
            });
        }

        const result: ExtractionResult = JSON.parse(jsonMatch[0]);

        return NextResponse.json({
            activities: result.activities || [],
            achievements: result.achievements || [],
            summary: result.summary || `Extracted ${result.activities?.length || 0} activities and ${result.achievements?.length || 0} achievements`,
        });

    } catch (error) {
        console.error('AI extraction error:', error);
        return NextResponse.json({
            activities: [],
            achievements: [],
            error: error instanceof Error ? error.message : 'Unknown error',
            summary: 'Extraction failed'
        }, { status: 500 });
    }
}
