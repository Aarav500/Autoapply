import { createLogger } from '@/lib/logger';
import { storage } from '@/lib/storage';
import { aiClient } from '@/lib/ai-client';
import {
  linkedinPostIdeasPrompt,
  linkedinNetworkStrategyPrompt,
  linkedinCalendarPrompt,
} from '@/prompts/linkedin-enhanced';
import { z } from 'zod';

const logger = createLogger('task:linkedin-optimize');

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

function isProfileComplete(profile: ProfileData): boolean {
  return !!(
    profile.name &&
    profile.skills &&
    extractSkillNames(profile.skills).length > 0
  );
}

export async function runLinkedInOptimize(): Promise<void> {
  logger.info('Starting LinkedIn auto-optimize task');

  const userKeys = await storage.listKeys('users/');
  const userIds = [...new Set(userKeys.map(k => k.split('/')[1]).filter(Boolean))];

  logger.info({ count: userIds.length }, 'Found users');

  let optimized = 0;
  let skipped = 0;

  for (const userId of userIds) {
    try {
      const profile = await storage.getJSON<ProfileData>(`users/${userId}/profile.json`);
      if (!profile || !isProfileComplete(profile)) {
        skipped++;
        continue;
      }

      // Check if we optimized recently (within last 6 days to allow weekly re-run)
      const lastOptimize = await storage.getJSON<{ generatedAt: string }>(
        `users/${userId}/linkedin/auto-optimize.json`
      );
      if (lastOptimize?.generatedAt) {
        const daysSince = (Date.now() - new Date(lastOptimize.generatedAt).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince < 6) {
          logger.debug({ userId }, 'Skipping - optimized recently');
          skipped++;
          continue;
        }
      }

      logger.info({ userId }, 'Running LinkedIn auto-optimize');

      const skillNames = extractSkillNames(profile.skills);
      const profileName = profile.name || 'Unknown';
      const profileHeadline = profile.headline || profile.title || undefined;
      const experience = profile.experience || [];
      const targetField = deriveTargetField(profile);
      const niche = deriveNiche(profile);
      const goals = deriveGoals(profile);
      const targetRole = profile.preferences?.targetRoles?.[0];
      const targetCompanies = profile.preferences?.targetCompanies;

      // Run all three in parallel
      const results = await Promise.allSettled([
        (async () => {
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
            targetField,
            niche,
          });
          const result = await aiClient.completeJSON(
            prompt.system, prompt.user, postIdeasSchema,
            { model: 'balanced', maxTokens: 4096 }
          );
          await storage.putJSON(`users/${userId}/linkedin/posts.json`, {
            generatedAt: new Date().toISOString(),
            targetField, niche, ...result,
          });
          return 'posts';
        })(),
        (async () => {
          const prompt = linkedinNetworkStrategyPrompt({
            profile: {
              name: profileName,
              headline: profileHeadline,
              skills: skillNames,
              goals,
            },
            targetRole,
            targetCompanies: targetCompanies && targetCompanies.length > 0 ? targetCompanies : undefined,
          });
          const result = await aiClient.completeJSON(
            prompt.system, prompt.user, networkSchema,
            { model: 'balanced', maxTokens: 4096 }
          );
          await storage.putJSON(`users/${userId}/linkedin/network.json`, {
            generatedAt: new Date().toISOString(),
            goals, targetRole: targetRole || null,
            targetCompanies: targetCompanies || null, ...result,
          });
          return 'network';
        })(),
        (async () => {
          const prompt = linkedinCalendarPrompt({
            profile: {
              name: profileName,
              headline: profileHeadline,
              skills: skillNames,
            },
            niche,
            postsPerWeek: 3,
          });
          const result = await aiClient.completeJSON(
            prompt.system, prompt.user, calendarSchema,
            { model: 'balanced', maxTokens: 4096 }
          );
          await storage.putJSON(`users/${userId}/linkedin/calendar.json`, {
            generatedAt: new Date().toISOString(),
            niche, postsPerWeek: 3, ...result,
          });
          return 'calendar';
        })(),
      ]);

      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      await storage.putJSON(`users/${userId}/linkedin/auto-optimize.json`, {
        generatedAt: new Date().toISOString(),
        succeeded,
        failed,
      });

      if (failed > 0) {
        const errors = results
          .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
          .map(r => r.reason instanceof Error ? r.reason.message : String(r.reason));
        logger.warn({ userId, succeeded, failed, errors }, 'LinkedIn optimize partially failed');
      }

      optimized++;
      logger.info({ userId, succeeded, failed }, 'LinkedIn auto-optimize completed');
    } catch (error) {
      logger.error({ userId, error }, 'Failed to optimize LinkedIn for user');
    }
  }

  logger.info({ optimized, skipped }, 'LinkedIn auto-optimize task completed');
}
