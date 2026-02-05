import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { generateJSON } from '@/lib/ai/claude';
import type { ApiResponse } from '@/types';

// ============================================
// Types
// ============================================

interface SkillGapAnalysis {
  overallScore: number;
  marketReadiness: 'excellent' | 'good' | 'fair' | 'needs_improvement';
  summary: string;
  strengths: {
    skill: string;
    reason: string;
    marketDemand: 'high' | 'medium' | 'low';
  }[];
  skillGaps: {
    skill: string;
    importance: 'critical' | 'important' | 'nice_to_have';
    reason: string;
    learningResources: string[];
    estimatedTimeToLearn: string;
  }[];
  recommendations: {
    priority: 'high' | 'medium' | 'low';
    action: string;
    impact: string;
    timeframe: string;
  }[];
  trendingSkills: {
    skill: string;
    trend: 'rising' | 'stable' | 'declining';
    relevanceToProfile: 'high' | 'medium' | 'low';
    description: string;
  }[];
  careerPaths: {
    title: string;
    matchScore: number;
    requiredSkills: string[];
    missingSkills: string[];
    salaryRange: {
      min: number;
      max: number;
      currency: string;
    };
  }[];
  profileOptimization: {
    section: string;
    currentScore: number;
    suggestions: string[];
  }[];
}

interface AnalysisOptions {
  targetRole?: string;
  targetIndustry?: string;
  location?: string;
  includeCareerPaths?: boolean;
  includeTrendingSkills?: boolean;
}

// ============================================
// Validation Schemas
// ============================================

const analysisQuerySchema = z.object({
  targetRole: z.string().max(100).optional(),
  targetIndustry: z.string().max(100).optional(),
  location: z.string().max(100).optional(),
  includeCareerPaths: z.preprocess(
    (val) => val === 'true' || val === '1',
    z.boolean().default(true)
  ),
  includeTrendingSkills: z.preprocess(
    (val) => val === 'true' || val === '1',
    z.boolean().default(true)
  ),
});

// ============================================
// Helper Functions
// ============================================

function formatResponse<T>(data: T, message?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
  };
}

function formatError(error: string, status: number = 400): NextResponse {
  return NextResponse.json(
    { success: false, error } as ApiResponse<never>,
    { status }
  );
}

/**
 * Build a comprehensive profile summary for AI analysis
 */
function buildProfileSummary(profile: {
  headline: string | null;
  summary: string | null;
  location: string | null;
  remotePreference: string | null;
  yearsOfExperience: number | null;
  skills: { name: string; category: string | null; proficiency: number | null; yearsOfExp: number | null }[];
  experiences: { company: string; title: string; description: string | null; achievements: string[]; skills: string[]; isCurrent: boolean }[];
  education: { institution: string; degree: string; field: string | null }[];
}): string {
  const parts: string[] = [];

  // Basic info
  if (profile.headline) {
    parts.push(`Professional Headline: ${profile.headline}`);
  }

  if (profile.summary) {
    parts.push(`Summary: ${profile.summary}`);
  }

  if (profile.location) {
    parts.push(`Location: ${profile.location}`);
  }

  if (profile.remotePreference) {
    parts.push(`Work Preference: ${profile.remotePreference}`);
  }

  if (profile.yearsOfExperience !== null) {
    parts.push(`Total Years of Experience: ${profile.yearsOfExperience}`);
  }

  // Skills
  if (profile.skills.length > 0) {
    const skillsByCategory: Record<string, string[]> = {};
    profile.skills.forEach(skill => {
      const category = skill.category || 'other';
      if (!skillsByCategory[category]) {
        skillsByCategory[category] = [];
      }
      const skillStr = skill.proficiency
        ? `${skill.name} (${skill.proficiency}/5${skill.yearsOfExp ? `, ${skill.yearsOfExp}y` : ''})`
        : skill.name;
      skillsByCategory[category].push(skillStr);
    });

    parts.push('\nSkills:');
    for (const [category, skills] of Object.entries(skillsByCategory)) {
      parts.push(`  ${category}: ${skills.join(', ')}`);
    }
  }

  // Experience
  if (profile.experiences.length > 0) {
    parts.push('\nWork Experience:');
    profile.experiences.forEach((exp, index) => {
      parts.push(`  ${index + 1}. ${exp.title} at ${exp.company}${exp.isCurrent ? ' (Current)' : ''}`);
      if (exp.description) {
        parts.push(`     Description: ${exp.description.substring(0, 200)}...`);
      }
      if (exp.achievements.length > 0) {
        parts.push(`     Key Achievements: ${exp.achievements.slice(0, 3).join('; ')}`);
      }
      if (exp.skills.length > 0) {
        parts.push(`     Skills Used: ${exp.skills.join(', ')}`);
      }
    });
  }

  // Education
  if (profile.education.length > 0) {
    parts.push('\nEducation:');
    profile.education.forEach((edu, index) => {
      parts.push(`  ${index + 1}. ${edu.degree}${edu.field ? ` in ${edu.field}` : ''} from ${edu.institution}`);
    });
  }

  return parts.join('\n');
}

/**
 * Generate AI-powered skill gap analysis
 */
async function generateSkillGapAnalysis(
  profileSummary: string,
  options: AnalysisOptions
): Promise<SkillGapAnalysis> {
  const targetContext = [
    options.targetRole ? `Target Role: ${options.targetRole}` : '',
    options.targetIndustry ? `Target Industry: ${options.targetIndustry}` : '',
    options.location ? `Target Location: ${options.location}` : '',
  ].filter(Boolean).join('\n');

  const prompt = `Analyze this professional profile and provide a comprehensive skill gap analysis for the job market.

PROFILE:
${profileSummary}

${targetContext ? `TARGET CRITERIA:\n${targetContext}\n` : ''}
Based on current job market trends and requirements, analyze this profile and provide:

1. Overall market readiness score (0-100)
2. Key strengths that are in-demand
3. Critical skill gaps compared to market requirements
4. Actionable recommendations for improvement
${options.includeTrendingSkills ? '5. Trending skills relevant to this profile' : ''}
${options.includeCareerPaths ? '6. Potential career paths with match scores' : ''}
7. Profile optimization suggestions

Respond with a JSON object in this exact format:
{
  "overallScore": <number 0-100>,
  "marketReadiness": "excellent" | "good" | "fair" | "needs_improvement",
  "summary": "<2-3 sentence summary of the analysis>",
  "strengths": [
    {
      "skill": "<skill name>",
      "reason": "<why this is a strength>",
      "marketDemand": "high" | "medium" | "low"
    }
  ],
  "skillGaps": [
    {
      "skill": "<missing skill>",
      "importance": "critical" | "important" | "nice_to_have",
      "reason": "<why this skill is needed>",
      "learningResources": ["<resource 1>", "<resource 2>"],
      "estimatedTimeToLearn": "<e.g., 2-3 months>"
    }
  ],
  "recommendations": [
    {
      "priority": "high" | "medium" | "low",
      "action": "<specific action to take>",
      "impact": "<expected impact>",
      "timeframe": "<realistic timeframe>"
    }
  ],
  "trendingSkills": [
    {
      "skill": "<skill name>",
      "trend": "rising" | "stable" | "declining",
      "relevanceToProfile": "high" | "medium" | "low",
      "description": "<brief description of why this is trending>"
    }
  ],
  "careerPaths": [
    {
      "title": "<job title>",
      "matchScore": <0-100>,
      "requiredSkills": ["<skill1>", "<skill2>"],
      "missingSkills": ["<skill1>", "<skill2>"],
      "salaryRange": {
        "min": <number>,
        "max": <number>,
        "currency": "USD"
      }
    }
  ],
  "profileOptimization": [
    {
      "section": "<profile section>",
      "currentScore": <0-100>,
      "suggestions": ["<suggestion 1>", "<suggestion 2>"]
    }
  ]
}

Provide at least:
- 3-5 strengths
- 3-5 skill gaps (prioritized by importance)
- 3-5 recommendations
${options.includeTrendingSkills ? '- 5-8 trending skills' : '- Empty trendingSkills array'}
${options.includeCareerPaths ? '- 3-5 career paths' : '- Empty careerPaths array'}
- 3-5 profile optimization suggestions

Be specific and actionable in your recommendations. Consider current 2024-2025 job market trends.`;

  const analysis = await generateJSON<SkillGapAnalysis>(prompt, {
    system: `You are an expert career advisor and job market analyst. You have deep knowledge of:
- Current tech industry trends and in-demand skills
- Job market requirements across different roles and industries
- Career development best practices
- Learning paths and resources for skill development
- Salary benchmarks and career progression

Provide accurate, actionable insights based on real market data and trends. Be specific and practical in your recommendations.`,
    model: 'claude-3-5-sonnet-20241022',
    temperature: 0.4,
    maxTokens: 4096,
  });

  return analysis;
}

// ============================================
// GET /api/profile/analysis - Get skill gap analysis
// ============================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await requireAuth();
    const userId = session.user?.id;
    if (!userId) {
      return formatError('User not found', 401);
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const queryParams = {
      targetRole: searchParams.get('targetRole') || undefined,
      targetIndustry: searchParams.get('targetIndustry') || undefined,
      location: searchParams.get('location') || undefined,
      includeCareerPaths: searchParams.get('includeCareerPaths') || 'true',
      includeTrendingSkills: searchParams.get('includeTrendingSkills') || 'true',
    };

    const validationResult = analysisQuerySchema.safeParse(queryParams);

    if (!validationResult.success) {
      return formatError(
        `Invalid query parameters: ${validationResult.error.errors.map(e => e.message).join(', ')}`
      );
    }

    const options = validationResult.data;

    // Get user profile with all relations
    const profile = await db.profile.findUnique({
      where: { userId },
      include: {
        skills: {
          orderBy: [
            { proficiency: 'desc' },
            { yearsOfExp: 'desc' },
          ],
        },
        experiences: {
          orderBy: [
            { isCurrent: 'desc' },
            { startDate: 'desc' },
          ],
        },
        education: {
          orderBy: [
            { startDate: 'desc' },
          ],
        },
      },
    });

    if (!profile) {
      return formatError('Profile not found. Please create your profile first.', 404);
    }

    // Check if profile has minimum data for analysis
    const hasMinimumData = profile.skills.length >= 3 || profile.experiences.length >= 1;

    if (!hasMinimumData) {
      return formatError(
        'Your profile needs more information for analysis. Please add at least 3 skills or 1 work experience.',
        400
      );
    }

    // Build profile summary
    const profileSummary = buildProfileSummary({
      headline: profile.headline,
      summary: profile.summary,
      location: profile.location,
      remotePreference: profile.remotePreference,
      yearsOfExperience: profile.yearsOfExperience,
      skills: profile.skills.map(s => ({
        name: s.name,
        category: s.category,
        proficiency: s.proficiency,
        yearsOfExp: s.yearsOfExp,
      })),
      experiences: profile.experiences.map(e => ({
        company: e.company,
        title: e.title,
        description: e.description,
        achievements: e.achievements,
        skills: e.skills,
        isCurrent: e.isCurrent,
      })),
      education: profile.education.map(e => ({
        institution: e.institution,
        degree: e.degree,
        field: e.field,
      })),
    });

    // Generate AI analysis
    const analysis = await generateSkillGapAnalysis(profileSummary, options);

    // Return the analysis with metadata
    return NextResponse.json(
      formatResponse(
        {
          analysis,
          metadata: {
            analyzedAt: new Date().toISOString(),
            profileCompletionScore: profile.completionScore,
            skillsAnalyzed: profile.skills.length,
            experiencesAnalyzed: profile.experiences.length,
            options: {
              targetRole: options.targetRole || null,
              targetIndustry: options.targetIndustry || null,
              location: options.location || null,
            },
          },
        },
        'Skill gap analysis completed successfully'
      )
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return formatError('Unauthorized', 401);
    }

    if (error instanceof Error && error.message.includes('API')) {
      console.error('AI API error:', error);
      return formatError('AI service temporarily unavailable. Please try again later.', 503);
    }

    console.error('GET /api/profile/analysis error:', error);
    return formatError('Failed to generate skill gap analysis', 500);
  }
}

// ============================================
// POST /api/profile/analysis - Generate analysis with custom criteria
// ============================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await requireAuth();
    const userId = session.user?.id;
    if (!userId) {
      return formatError('User not found', 401);
    }

    const body = await request.json();

    const bodySchema = z.object({
      targetRole: z.string().max(100).optional(),
      targetIndustry: z.string().max(100).optional(),
      location: z.string().max(100).optional(),
      includeCareerPaths: z.boolean().default(true),
      includeTrendingSkills: z.boolean().default(true),
      jobDescription: z.string().max(10000).optional(),
    });

    const validationResult = bodySchema.safeParse(body);

    if (!validationResult.success) {
      return formatError(
        `Validation error: ${validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`
      );
    }

    const options = validationResult.data;

    // Get user profile
    const profile = await db.profile.findUnique({
      where: { userId },
      include: {
        skills: {
          orderBy: [
            { proficiency: 'desc' },
            { yearsOfExp: 'desc' },
          ],
        },
        experiences: {
          orderBy: [
            { isCurrent: 'desc' },
            { startDate: 'desc' },
          ],
        },
        education: {
          orderBy: [
            { startDate: 'desc' },
          ],
        },
      },
    });

    if (!profile) {
      return formatError('Profile not found', 404);
    }

    const hasMinimumData = profile.skills.length >= 3 || profile.experiences.length >= 1;

    if (!hasMinimumData) {
      return formatError(
        'Your profile needs more information for analysis. Please add at least 3 skills or 1 work experience.',
        400
      );
    }

    // Build profile summary
    const profileSummary = buildProfileSummary({
      headline: profile.headline,
      summary: profile.summary,
      location: profile.location,
      remotePreference: profile.remotePreference,
      yearsOfExperience: profile.yearsOfExperience,
      skills: profile.skills.map(s => ({
        name: s.name,
        category: s.category,
        proficiency: s.proficiency,
        yearsOfExp: s.yearsOfExp,
      })),
      experiences: profile.experiences.map(e => ({
        company: e.company,
        title: e.title,
        description: e.description,
        achievements: e.achievements,
        skills: e.skills,
        isCurrent: e.isCurrent,
      })),
      education: profile.education.map(e => ({
        institution: e.institution,
        degree: e.degree,
        field: e.field,
      })),
    });

    // If job description is provided, include it in the analysis
    let enhancedProfileSummary = profileSummary;
    if (options.jobDescription) {
      enhancedProfileSummary += `\n\nTARGET JOB DESCRIPTION:\n${options.jobDescription}`;
    }

    // Generate AI analysis
    const analysis = await generateSkillGapAnalysis(enhancedProfileSummary, {
      targetRole: options.targetRole,
      targetIndustry: options.targetIndustry,
      location: options.location,
      includeCareerPaths: options.includeCareerPaths,
      includeTrendingSkills: options.includeTrendingSkills,
    });

    return NextResponse.json(
      formatResponse(
        {
          analysis,
          metadata: {
            analyzedAt: new Date().toISOString(),
            profileCompletionScore: profile.completionScore,
            skillsAnalyzed: profile.skills.length,
            experiencesAnalyzed: profile.experiences.length,
            options: {
              targetRole: options.targetRole || null,
              targetIndustry: options.targetIndustry || null,
              location: options.location || null,
              hasJobDescription: !!options.jobDescription,
            },
          },
        },
        'Skill gap analysis completed successfully'
      )
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return formatError('Unauthorized', 401);
    }

    if (error instanceof Error && error.message.includes('API')) {
      console.error('AI API error:', error);
      return formatError('AI service temporarily unavailable. Please try again later.', 503);
    }

    console.error('POST /api/profile/analysis error:', error);
    return formatError('Failed to generate skill gap analysis', 500);
  }
}
