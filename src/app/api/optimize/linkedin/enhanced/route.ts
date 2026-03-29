import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticate, successResponse, handleError } from '@/lib/api-utils';
import { aiClient } from '@/lib/ai-client';
import {
  linkedinPostIdeasPrompt,
  linkedinNetworkStrategyPrompt,
  linkedinCalendarPrompt,
} from '@/prompts/linkedin-enhanced';
import { storage } from '@/lib/storage';

const requestSchema = z.object({
  action: z.enum(['posts', 'network', 'calendar', 'auto-optimize']),
  targetField: z.string().optional(),
  niche: z.string().optional(),
  goals: z.array(z.string()).optional(),
  targetRole: z.string().optional(),
  targetCompanies: z.array(z.string()).optional(),
  postsPerWeek: z.number().min(1).max(7).optional(),
});

const postIdeasSchema = z.object({
  posts: z.array(z.object({
    title: z.string(),
    hook: z.string(),
    content_outline: z.array(z.string()).default([]),
    hashtags: z.array(z.string()).default([]),
    best_time: z.string().default('Tuesday 9am'),
    engagement_type: z.string().default('thought-leadership'),
  })).default([]),
});

const networkSchema = z.object({
  target_connections: z.array(z.object({
    role_type: z.string(),
    why: z.string(),
    where_to_find: z.string(),
    outreach_template: z.string(),
  })).default([]),
  groups: z.array(z.object({
    name: z.string(),
    reason: z.string(),
  })).default([]),
  weekly_actions: z.array(z.string()).default([]),
});

const calendarSchema = z.object({
  weeks: z.array(z.object({
    week_number: z.number(),
    theme: z.string(),
    posts: z.array(z.object({
      day: z.string(),
      topic: z.string(),
      format: z.string(),
      key_points: z.array(z.string()).default([]),
    })).default([]),
  })).default([]),
});

interface ProfileData {
  name?: string;
  headline?: string;
  title?: string;
  summary?: string;
  skills?: Array<{ name: string; proficiency?: string }> | string[];
  experience?: Array<{ title: string; company: string; description?: string }>;
  socialLinks?: Array<{ platform: string; url: string }>;
  preferences?: {
    targetRoles?: string[];
    targetCompanies?: string[];
    industries?: string[];
  };
}

function extractSkillNames(skills: ProfileData['skills']): string[] {
  if (!skills || !Array.isArray(skills)) return [];
  return skills.map((s) => {
    if (typeof s === 'string') return s;
    if (typeof s === 'object' && s !== null && 'name' in s) return s.name;
    return String(s);
  });
}

function deriveTargetField(profile: ProfileData): string {
  const skills = extractSkillNames(profile.skills);
  const experienceTitles = (profile.experience || []).map(e => e.title).filter(Boolean);
  if (experienceTitles.length > 0) return experienceTitles[0];
  if (skills.length > 0) return skills.slice(0, 3).join(', ');
  return 'general professional development';
}

function deriveNiche(profile: ProfileData): string {
  if (profile.headline) return profile.headline;
  const skills = extractSkillNames(profile.skills);
  if (skills.length > 0) return skills.slice(0, 2).join(' & ');
  return 'professional insights';
}

function deriveGoals(profile: ProfileData): string[] {
  const goals: string[] = [];
  const prefs = profile.preferences;
  if (prefs?.targetRoles && prefs.targetRoles.length > 0) {
    goals.push(`Land a role as ${prefs.targetRoles[0]}`);
  }
  if (prefs?.industries && prefs.industries.length > 0) {
    goals.push(`Build network in ${prefs.industries.slice(0, 2).join(' and ')}`);
  }
  if (goals.length === 0) {
    goals.push('Expand professional network', 'Find new career opportunities');
  }
  return goals;
}

function deriveTargetRole(profile: ProfileData): string | undefined {
  const prefs = profile.preferences;
  if (prefs?.targetRoles && prefs.targetRoles.length > 0) return prefs.targetRoles[0];
  const experience = profile.experience || [];
  if (experience.length > 0) return experience[0].title;
  return undefined;
}

function deriveTargetCompanies(profile: ProfileData): string[] | undefined {
  const prefs = profile.preferences;
  if (prefs?.targetCompanies && prefs.targetCompanies.length > 0) return prefs.targetCompanies;
  return undefined;
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await authenticate(request);

    const body = await request.json();
    const { action, targetField, niche, goals, targetRole, targetCompanies, postsPerWeek } =
      requestSchema.parse(body);

    // Load user profile from S3
    const profileData = await storage.getJSON<ProfileData>(`users/${userId}/profile.json`);
    if (!profileData) {
      return successResponse({ error: 'Profile not found. Please complete your profile first.' }, 404);
    }

    const skillNames = extractSkillNames(profileData.skills);
    const experience = profileData.experience || [];
    const profileName = profileData.name || 'Unknown';
    const profileHeadline = profileData.headline || profileData.title || undefined;

    if (action === 'posts') {
      const field = targetField || deriveTargetField(profileData);
      const prompt = linkedinPostIdeasPrompt({
        profile: {
          name: profileName,
          headline: profileHeadline,
          skills: skillNames,
          experience: experience.map((exp) => ({
            title: exp.title || '',
            company: exp.company || '',
          })),
        },
        targetField: field,
        niche: niche || undefined,
      });

      const result = await aiClient.completeJSON(
        prompt.system,
        prompt.user,
        postIdeasSchema,
        { model: 'balanced', maxTokens: 4096 }
      );

      await storage.putJSON(`users/${userId}/linkedin/posts.json`, {
        generatedAt: new Date().toISOString(),
        targetField: field,
        niche: niche || null,
        ...result,
      });

      return successResponse({ posts: result, targetField: field });
    }

    if (action === 'network') {
      const userGoals = goals && goals.length > 0
        ? goals
        : deriveGoals(profileData);

      const prompt = linkedinNetworkStrategyPrompt({
        profile: {
          name: profileName,
          headline: profileHeadline,
          skills: skillNames,
          goals: userGoals,
        },
        targetRole: targetRole || undefined,
        targetCompanies: targetCompanies && targetCompanies.length > 0 ? targetCompanies : undefined,
      });

      const result = await aiClient.completeJSON(
        prompt.system,
        prompt.user,
        networkSchema,
        { model: 'balanced', maxTokens: 4096 }
      );

      await storage.putJSON(`users/${userId}/linkedin/network.json`, {
        generatedAt: new Date().toISOString(),
        goals: userGoals,
        targetRole: targetRole || null,
        targetCompanies: targetCompanies || null,
        ...result,
      });

      return successResponse({ network: result, goals: userGoals });
    }

    if (action === 'calendar') {
      const calendarNiche = niche || deriveNiche(profileData);
      const prompt = linkedinCalendarPrompt({
        profile: {
          name: profileName,
          headline: profileHeadline,
          skills: skillNames,
        },
        niche: calendarNiche,
        postsPerWeek: postsPerWeek || 3,
      });

      const result = await aiClient.completeJSON(
        prompt.system,
        prompt.user,
        calendarSchema,
        { model: 'balanced', maxTokens: 4096 }
      );

      await storage.putJSON(`users/${userId}/linkedin/calendar.json`, {
        generatedAt: new Date().toISOString(),
        niche: calendarNiche,
        postsPerWeek: postsPerWeek || 3,
        ...result,
      });

      return successResponse({ calendar: result, niche: calendarNiche });
    }

    if (action === 'auto-optimize') {
      // Auto-derive all fields from profile
      const autoField = targetField || deriveTargetField(profileData);
      const autoNiche = niche || deriveNiche(profileData);
      const autoGoals = (goals && goals.length > 0) ? goals : deriveGoals(profileData);
      const autoTargetRole = targetRole || deriveTargetRole(profileData);
      const autoTargetCompanies = (targetCompanies && targetCompanies.length > 0)
        ? targetCompanies
        : deriveTargetCompanies(profileData);

      // Run all three optimizations in parallel
      const [postsResult, networkResult, calendarResult] = await Promise.all([
        (async () => {
          try {
            const prompt = linkedinPostIdeasPrompt({
              profile: {
                name: profileName,
                headline: profileHeadline,
                skills: skillNames,
                experience: experience.map((exp) => ({
                  title: exp.title || '',
                  company: exp.company || '',
                })),
              },
              targetField: autoField,
              niche: autoNiche,
            });
            const result = await aiClient.completeJSON(
              prompt.system,
              prompt.user,
              postIdeasSchema,
              { model: 'balanced', maxTokens: 4096 }
            );
            await storage.putJSON(`users/${userId}/linkedin/posts.json`, {
              generatedAt: new Date().toISOString(),
              targetField: autoField,
              niche: autoNiche,
              ...result,
            });
            return result;
          } catch (err) {
            return { posts: [], error: err instanceof Error ? err.message : 'Posts generation failed' };
          }
        })(),
        (async () => {
          try {
            const prompt = linkedinNetworkStrategyPrompt({
              profile: {
                name: profileName,
                headline: profileHeadline,
                skills: skillNames,
                goals: autoGoals,
              },
              targetRole: autoTargetRole,
              targetCompanies: autoTargetCompanies,
            });
            const result = await aiClient.completeJSON(
              prompt.system,
              prompt.user,
              networkSchema,
              { model: 'balanced', maxTokens: 4096 }
            );
            await storage.putJSON(`users/${userId}/linkedin/network.json`, {
              generatedAt: new Date().toISOString(),
              goals: autoGoals,
              targetRole: autoTargetRole || null,
              targetCompanies: autoTargetCompanies || null,
              ...result,
            });
            return result;
          } catch (err) {
            return { target_connections: [], groups: [], weekly_actions: [], error: err instanceof Error ? err.message : 'Network strategy failed' };
          }
        })(),
        (async () => {
          try {
            const prompt = linkedinCalendarPrompt({
              profile: {
                name: profileName,
                headline: profileHeadline,
                skills: skillNames,
              },
              niche: autoNiche,
              postsPerWeek: postsPerWeek || 3,
            });
            const result = await aiClient.completeJSON(
              prompt.system,
              prompt.user,
              calendarSchema,
              { model: 'balanced', maxTokens: 4096 }
            );
            await storage.putJSON(`users/${userId}/linkedin/calendar.json`, {
              generatedAt: new Date().toISOString(),
              niche: autoNiche,
              postsPerWeek: postsPerWeek || 3,
              ...result,
            });
            return result;
          } catch (err) {
            return { weeks: [], error: err instanceof Error ? err.message : 'Calendar generation failed' };
          }
        })(),
      ]);

      await storage.putJSON(`users/${userId}/linkedin/auto-optimize.json`, {
        generatedAt: new Date().toISOString(),
        derivedFields: {
          targetField: autoField,
          niche: autoNiche,
          goals: autoGoals,
          targetRole: autoTargetRole || null,
          targetCompanies: autoTargetCompanies || null,
        },
      });

      return successResponse({
        posts: postsResult,
        network: networkResult,
        calendar: calendarResult,
        derivedFields: {
          targetField: autoField,
          niche: autoNiche,
          goals: autoGoals,
          targetRole: autoTargetRole || null,
          targetCompanies: autoTargetCompanies || null,
        },
      });
    }

    return successResponse({ error: 'Invalid action' }, 400);
  } catch (error) {
    return handleError(error);
  }
}
