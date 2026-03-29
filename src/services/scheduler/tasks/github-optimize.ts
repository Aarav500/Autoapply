import { createLogger } from '@/lib/logger';
import { storage } from '@/lib/storage';
import { aiClient } from '@/lib/ai-client';
import {
  portfolioOptimizerPrompt,
  contributionFinderPrompt,
  readmeGeneratorPrompt,
} from '@/prompts/github-enhanced';
import { z } from 'zod';

const logger = createLogger('task:github-optimize');

interface ProfileData {
  name?: string;
  headline?: string;
  skills?: Array<{ name: string; proficiency?: string }> | string[];
  experience?: Array<{ title: string; company: string; description?: string }>;
  socialLinks?: Array<{ platform: string; url: string }>;
  preferences?: {
    targetRoles?: string[];
    targetCompanies?: string[];
    industries?: string[];
  };
}

interface GitHubRepoResponse {
  name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  topics: string[];
  fork: boolean;
}

const KNOWN_PROGRAMMING_LANGUAGES = new Set([
  'javascript', 'typescript', 'python', 'java', 'c', 'c++', 'c#', 'go', 'rust',
  'ruby', 'php', 'swift', 'kotlin', 'scala', 'r', 'dart', 'lua', 'perl',
  'haskell', 'elixir', 'clojure', 'erlang', 'julia', 'matlab', 'sql', 'shell',
  'bash', 'powershell', 'objective-c', 'html', 'css', 'graphql',
]);

const portfolioResultSchema = z.object({
  pin_recommendations: z.array(z.object({
    repo: z.string(),
    reason: z.string(),
    improvements: z.array(z.string()).default([]),
  })).default([]),
  naming_suggestions: z.array(z.object({
    current: z.string(),
    suggested: z.string(),
    reason: z.string(),
  })).default([]),
  description_improvements: z.array(z.object({
    repo: z.string(),
    current: z.string().default(''),
    suggested: z.string(),
  })).default([]),
  overall_strategy: z.array(z.string()).default([]),
});

const contributionResultSchema = z.object({
  recommended_projects: z.array(z.object({
    project_name: z.string(),
    description: z.string(),
    why_contribute: z.string(),
    good_first_issues: z.array(z.string()).default([]),
    skills_match: z.array(z.string()).default([]),
    difficulty: z.string().default('beginner'),
  })).default([]),
  contribution_strategy: z.array(z.string()).default([]),
  weekly_goals: z.array(z.string()).default([]),
});

const readmeResultSchema = z.object({
  content: z.string(),
  sections: z.array(z.string()).default([]),
});

function extractSkillNames(skills: ProfileData['skills']): string[] {
  if (!skills || !Array.isArray(skills)) return [];
  return skills.map((s) => {
    if (typeof s === 'string') return s;
    if (typeof s === 'object' && s !== null && 'name' in s) return s.name;
    return String(s);
  });
}

function extractGitHubUsername(profile: ProfileData): string | undefined {
  const links = profile.socialLinks || [];
  const ghLink = links.find((l) =>
    l.platform.toLowerCase() === 'github' ||
    l.url.toLowerCase().includes('github.com')
  );
  if (!ghLink) return undefined;
  const match = ghLink.url.match(/github\.com\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : undefined;
}

function extractProgrammingLanguages(skills: string[]): string[] {
  return skills.filter((s) => KNOWN_PROGRAMMING_LANGUAGES.has(s.toLowerCase()));
}

function extractInterests(profile: ProfileData): string[] {
  const interests: string[] = [];
  if (profile.headline) {
    interests.push(profile.headline);
  }
  const skills = extractSkillNames(profile.skills);
  const nonLang = skills.filter((s) => !KNOWN_PROGRAMMING_LANGUAGES.has(s.toLowerCase()));
  interests.push(...nonLang.slice(0, 5));
  if (interests.length === 0) {
    interests.push('open source', 'software development');
  }
  return interests;
}

function isProfileComplete(profile: ProfileData): boolean {
  return !!(
    profile.name &&
    profile.skills &&
    extractSkillNames(profile.skills).length > 0 &&
    extractGitHubUsername(profile)
  );
}

export async function runGitHubOptimize(): Promise<void> {
  logger.info('Starting GitHub auto-optimize task');

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

      // Check if we optimized recently
      const lastOptimize = await storage.getJSON<{ generatedAt: string }>(
        `users/${userId}/github/auto-optimize.json`
      );
      if (lastOptimize?.generatedAt) {
        const daysSince = (Date.now() - new Date(lastOptimize.generatedAt).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince < 6) {
          logger.debug({ userId }, 'Skipping - optimized recently');
          skipped++;
          continue;
        }
      }

      const username = extractGitHubUsername(profile);
      if (!username) {
        skipped++;
        continue;
      }

      logger.info({ userId, username }, 'Running GitHub auto-optimize');

      const skillNames = extractSkillNames(profile.skills);
      const languages = extractProgrammingLanguages(skillNames);
      const interests = extractInterests(profile);
      const targetRole = profile.preferences?.targetRoles?.[0];

      // Run portfolio and contributions in parallel
      const results = await Promise.allSettled([
        (async () => {
          const reposRes = await fetch(
            `https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=30`,
            { headers: { Accept: 'application/vnd.github.v3+json' } }
          );
          if (!reposRes.ok) {
            throw new Error(`GitHub user "${username}" not found`);
          }
          const reposData: GitHubRepoResponse[] = await reposRes.json();
          const repos = reposData
            .filter((r) => !r.fork)
            .map((repo) => ({
              name: repo.name,
              description: repo.description || undefined,
              language: repo.language || undefined,
              stars: repo.stargazers_count || 0,
              forks: repo.forks_count || 0,
              topics: repo.topics || [],
              hasReadme: true,
            }));

          const prompt = portfolioOptimizerPrompt({ username, repos, targetRole });
          const result = await aiClient.completeJSON(
            prompt.system, prompt.user, portfolioResultSchema,
            { model: 'balanced', maxTokens: 4096 }
          );

          await storage.putJSON(`users/${userId}/github/portfolio.json`, {
            generatedAt: new Date().toISOString(),
            username, repoCount: repos.length, ...result,
          });

          // Generate README for top repo
          if (repos.length > 0) {
            const topRepo = repos[0];
            try {
              const readmePrompt = readmeGeneratorPrompt({
                repoName: topRepo.name,
                description: topRepo.description || `A ${topRepo.language || 'software'} project`,
                techStack: topRepo.language ? [topRepo.language] : skillNames.slice(0, 5),
                isPortfolioProject: true,
              });
              const readmeResult = await aiClient.completeJSON(
                readmePrompt.system, readmePrompt.user, readmeResultSchema,
                { model: 'balanced', maxTokens: 4096 }
              );
              await storage.putJSON(`users/${userId}/github/readme-${topRepo.name}.json`, {
                generatedAt: new Date().toISOString(),
                repoName: topRepo.name, ...readmeResult,
              });
            } catch (readmeError) {
              logger.warn({ userId, repo: topRepo.name, error: readmeError }, 'README generation failed');
            }
          }

          return 'portfolio';
        })(),
        (async () => {
          const effectiveLanguages = languages.length > 0 ? languages : ['JavaScript', 'TypeScript'];
          const effectiveSkills = skillNames.length > 0 ? skillNames : ['web development'];
          const prompt = contributionFinderPrompt({
            skills: effectiveSkills,
            languages: effectiveLanguages,
            interests,
            experienceLevel: 'intermediate',
          });
          const result = await aiClient.completeJSON(
            prompt.system, prompt.user, contributionResultSchema,
            { model: 'balanced', maxTokens: 4096 }
          );
          await storage.putJSON(`users/${userId}/github/contributions.json`, {
            generatedAt: new Date().toISOString(),
            ...result,
          });
          return 'contributions';
        })(),
      ]);

      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      await storage.putJSON(`users/${userId}/github/auto-optimize.json`, {
        generatedAt: new Date().toISOString(),
        username,
        succeeded,
        failed,
      });

      if (failed > 0) {
        const errors = results
          .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
          .map(r => r.reason instanceof Error ? r.reason.message : String(r.reason));
        logger.warn({ userId, succeeded, failed, errors }, 'GitHub optimize partially failed');
      }

      optimized++;
      logger.info({ userId, succeeded, failed }, 'GitHub auto-optimize completed');
    } catch (error) {
      logger.error({ userId, error }, 'Failed to optimize GitHub for user');
    }
  }

  logger.info({ optimized, skipped }, 'GitHub auto-optimize task completed');
}
