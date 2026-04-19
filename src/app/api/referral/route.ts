/**
 * POST /api/referral
 * AI-powered referral outreach strategy for a target company and role.
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticate, successResponse, errorResponse, handleError } from '@/lib/api-utils';
import { aiClient } from '@/lib/ai-client';
import { storage } from '@/lib/storage';
import { logger } from '@/lib/logger';
import type { Profile } from '@/types/profile';

// ─── Request schema ────────────────────────────────────────────────────────────

const inputSchema = z.object({
  company: z.string().min(1),
  jobTitle: z.string().min(1),
  jobUrl: z.string().url().optional(),
});

// ─── AI output schema ──────────────────────────────────────────────────────────

const referralSchema = z.object({
  linkedin_search_tips: z.array(z.string()),
  target_audience: z.object({
    best_connectors: z.array(z.string()).default([]),
    avoid: z.array(z.string()).default([]),
    search_approach: z.string().default(''),
  }).optional(),
  outreach_message: z.string(),
  connection_request_note: z.string().default(''),
  inmail_message: z.string().default(''),
  subject_line: z.string(),
  follow_up_message: z.string(),
  timing_advice: z.string(),
  key_talking_points: z.array(z.string()),
  referral_ask_script: z.string().default(''),
  common_mistakes: z.array(z.string()).default([]),
});

// ─── Handler ───────────────────────────────────────────────────────────────────

/**
 * POST /api/referral
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);

    const body = await req.json();
    const validation = inputSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse(
        validation.error.issues[0]?.message ?? 'Invalid request body',
        400,
        'VALIDATION_ERROR'
      );
    }

    const { company, jobTitle, jobUrl } = validation.data;

    // Load user profile for context
    const profile = await storage.getJSON<Profile>(`users/${userId}/profile.json`);
    if (!profile) {
      return errorResponse(
        'Profile not found. Please complete your profile first.',
        404,
        'PROFILE_NOT_FOUND'
      );
    }

    logger.info({ userId, company, jobTitle }, 'Referral finder request');

    const skillsSummary = (profile.skills ?? [])
      .slice(0, 10)
      .map((s) => s.name)
      .join(', ');

    const recentRole = (profile.experience ?? [])[0];
    const recentRoleSummary = recentRole
      ? `${recentRole.role} at ${recentRole.company}`
      : profile.headline ?? 'Professional';

    const educationSummary = (profile.education ?? [])
      .slice(0, 2)
      .map((e) => `${e.degree}${e.field ? ` in ${e.field}` : ''} from ${e.institution}`)
      .join('; ');

    // Extract top quantified achievements from experience bullets
    const topAchievements = (profile.experience ?? [])
      .flatMap((exp) => (exp.bullets ?? []).slice(0, 2))
      .slice(0, 5)
      .join('; ');

    // GitHub/portfolio links
    const githubUrl = (profile.socialLinks ?? []).find(
      (l) => l.platform?.toLowerCase() === 'github'
    )?.url;
    const portfolioUrl = (profile.socialLinks ?? []).find(
      (l) => l.platform?.toLowerCase() === 'portfolio' || l.platform?.toLowerCase() === 'website'
    )?.url;

    const systemPrompt = `You are a career networking expert who has helped 1,000+ professionals land referrals at companies like Google, Anthropic, Stripe, Airbnb, and YC-backed startups. You have deep knowledge of:
- What employees actually look for before referring someone (they're putting their reputation on the line)
- LinkedIn outreach psychology (what gets replied to vs. ignored)
- The referral process at large tech vs. startup companies
- How to make asks that feel collaborative, not transactional

Key insight: The best referral outreach isn't about the job — it's about showing the connection why referring YOU reflects well on THEM.`;

    const userPrompt = `Generate a comprehensive referral outreach strategy for:

CANDIDATE:
- Name: ${profile.name ?? 'Candidate'}
- Current/Recent Role: ${recentRoleSummary}
- Education: ${educationSummary || 'Not specified'}
- Key Skills: ${skillsSummary || 'Not specified'}
- Top Achievements: ${topAchievements || 'Not specified'}
- Location: ${profile.location ?? 'Not specified'}
${githubUrl ? `- GitHub: ${githubUrl}` : ''}
${portfolioUrl ? `- Portfolio: ${portfolioUrl}` : ''}

TARGET:
- Company: ${company}
- Role: ${jobTitle}${jobUrl ? `\n- Job URL: ${jobUrl}` : ''}

Return a JSON object with:
- linkedin_search_tips: 4-6 specific LinkedIn search strategies to find referrers at ${company} — include exact query examples like 'site:linkedin.com "${company}" "Software Engineer" "referral"'
- target_audience: { best_connectors (types of people most likely to refer, e.g. "engineers on the same team as the role", "recent hires within 6 months"), avoid (who NOT to cold-message), search_approach (1-2 sentences on best approach) }
- outreach_message: personalized LinkedIn InMail (150-300 words) that mentions a SPECIFIC thing about ${company} and ties it to candidate's strongest achievement — NOT generic; reference their actual background
- connection_request_note: a 200-character connection request note (LinkedIn limit) — concise hook
- inmail_message: a more detailed InMail version (300-400 chars) if they're not connected
- subject_line: email subject line if reaching out via email
- follow_up_message: 5-7 day follow-up if no response (50-80 words, light touch)
- timing_advice: specific advice on when to send, how many people to contact, sequencing (2-3 sentences)
- key_talking_points: 5-7 specific things to highlight about THIS candidate for THIS company — use their actual achievements and skills, tied to ${company}'s known focus areas
- referral_ask_script: the exact moment/phrasing for making the referral ask in the conversation (30-50 words)
- common_mistakes: 3-5 common mistakes candidates make when asking for referrals at ${company} or similar companies`;

    const result = await aiClient.completeJSON(
      systemPrompt,
      userPrompt,
      referralSchema,
      { model: 'balanced', maxTokens: 4096 }
    );

    // Save for history
    await storage.putJSON(`users/${userId}/referrals/${company.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.json`, {
      company,
      jobTitle,
      jobUrl,
      result,
      generatedAt: new Date().toISOString(),
    });

    logger.info({ userId, company, jobTitle }, 'Referral strategy generated');

    return successResponse({ company, jobTitle, data: result });
  } catch (error) {
    logger.error({ error }, 'Referral API error');
    return handleError(error);
  }
}
