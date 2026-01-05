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

        // Call Claude API for extraction
        const prompt = `You are an expert at extracting structured information from documents. 
Analyze this ${documentType || 'document'} and extract:

1. ACTIVITIES: Any activities, experiences, jobs, internships, clubs, volunteering, etc.
   For each, extract: name, role/position, organization, start date, end date, description, hours per week (estimate), weeks per year (estimate)

2. ACHIEVEMENTS: Awards, honors, certifications, publications, competitions won, etc.
   For each, extract: title, description, date

Return a JSON object with this exact structure:
{
  "activities": [
    {"name": "...", "role": "...", "organization": "...", "startDate": "...", "endDate": "...", "description": "...", "hoursPerWeek": 10, "weeksPerYear": 40}
  ],
  "achievements": [
    {"title": "...", "description": "...", "date": "..."}
  ],
  "summary": "Brief summary of what was extracted"
}

Document text:
${text.substring(0, 8000)}`;

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
