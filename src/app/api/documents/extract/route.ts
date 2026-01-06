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
    major?: string;
    gpa?: string;
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

⚠️ CRITICAL ANTI-HALLUCINATION RULES - READ CAREFULLY:
1. You MUST ONLY extract information that is EXPLICITLY stated in the document
2. You MUST NOT invent, imagine, or hallucinate ANY activities, achievements, or experiences
3. You MUST NOT assume the document author held any positions, roles, or titles unless explicitly stated
4. If the document doesn't contain activities or achievements, return EMPTY arrays - this is correct behavior
5. For academic papers: extract ONLY the research itself as an activity - DO NOT invent extracurricular activities
6. If you're unsure whether something is actually in the document, DO NOT include it

VERIFICATION CHECK: Before including ANY item, ask yourself:
"Can I point to the EXACT text in this document that proves this exists?"
If the answer is NO, do NOT include it.`;

            const typeSpecificInstructions: Record<string, string> = {
                'paper': `This is an ACADEMIC/RESEARCH PAPER (could be IEEE, ACM, arXiv, journal article, conference paper, thesis, etc.)

FOR RESEARCH PAPERS, extract ONLY:

1. THE RESEARCH PROJECT AS ONE ACTIVITY:
   - name: The paper title (MUST be explicitly stated in the document)
   - role: "Researcher" or "Author" (ONLY if author names are visible)
   - organization: The institution/lab/university (ONLY if stated in the document)
   - description: Summarize the abstract/introduction - what problem was addressed, methodology used, key findings
   - dates: Use publication date if visible, otherwise leave as "Unknown"

2. ACHIEVEMENTS - ONLY if explicitly mentioned:
   - Publication venue (journal/conference name if stated)
   - Awards (Best Paper, etc.) ONLY if explicitly mentioned
   - Grants/funding ONLY if mentioned in acknowledgments
   - Citations ONLY if explicitly stated

3. DO NOT EXTRACT (common mistakes):
   ❌ Random student activities (clubs, sports, volunteering) - these are NOT in a research paper
   ❌ Leadership positions like "President of X" - not relevant to a research paper
   ❌ Invented achievements or honors
   ❌ Anything not explicitly written in this specific document

REMEMBER: A research paper should produce AT MOST 1 activity (the research itself) and possibly a few achievements (publication, awards) - NOT multiple student activities.`,

                'resume': `This is a RESUME/CV. Extract ONLY what is EXPLICITLY listed:
- Work experiences, internships (ONLY if described in the document)
- Extracurricular activities, clubs (ONLY if listed)
- Leadership positions (ONLY with exact titles from the document)
- Projects (ONLY if described)
- Awards, honors (ONLY if explicitly stated)

DO NOT invent experiences or positions not mentioned in the resume.`,

                'transcript': `This is an ACADEMIC TRANSCRIPT. Extract ONLY:
- Honors/awards EXPLICITLY stated (Dean's List, etc.)
- Academic achievements EXPLICITLY mentioned
- GPA milestones if shown

DO NOT invent achievements or assume anything not explicitly stated.`,

                'certificate': `This is a CERTIFICATE/AWARD. Extract ONLY:
- The specific certification/award named in the document
- Issuing organization and date if stated
- Skills/competencies if explicitly mentioned

DO NOT add information not present in the certificate.`,

                'other': `Extract ONLY activities, experiences, achievements that are EXPLICITLY stated in this document.
DO NOT invent or assume any information.`
            };

            return `${baseInstructions}

${typeSpecificInstructions[docType] || typeSpecificInstructions['other']}

EXTRACTION RULES:
1. Extract ONLY what is EXPLICITLY stated in the document - nothing more
2. For dates, use "Month Year" format or "Unknown" if not stated
3. For hours/weeks, use 0 if not stated (do NOT estimate)
4. Descriptions should quote or closely paraphrase the actual document text
5. When in doubt, EXCLUDE rather than include something you're not sure about

BEFORE RETURNING: Review each item and verify it exists in the document text below.

Return a JSON object with this exact structure:
{
  "activities": [
    {"name": "Activity/Experience Name", "role": "Your Role/Position", "organization": "Org/Company/School", "startDate": "Month Year", "endDate": "Month Year or Present", "description": "Description based on document text", "hoursPerWeek": 0, "weeksPerYear": 0}
  ],
  "achievements": [
    {"title": "Achievement Title", "description": "What this achievement represents", "date": "Month Year"}
  ],
  "major": "Extracted Intended/Current Major (if found, else null)",
  "gpa": "Extracted Cumulative GPA (if found, e.g. '3.95', else null)",
  "summary": "Brief summary of what was found in this document"
}

If the document contains no extractable activities or achievements, return empty arrays - this is the CORRECT response.

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
