import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticate, successResponse, handleError } from '@/lib/api-utils';
import { aiClient } from '@/lib/ai-client';
import {
  portfolioOptimizerPrompt,
  contributionFinderPrompt,
  readmeGeneratorPrompt,
} from '@/prompts/github-enhanced';
import { storage } from '@/lib/storage';

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

const KNOWN_PROGRAMMING_LANGUAGES = new Set([
  'javascript', 'typescript', 'python', 'java', 'c', 'c++', 'c#', 'go', 'rust',
  'ruby', 'php', 'swift', 'kotlin', 'scala', 'r', 'dart', 'lua', 'perl',
  'haskell', 'elixir', 'clojure', 'erlang', 'julia', 'matlab', 'sql', 'shell',
  'bash', 'powershell', 'objective-c', 'assembly', 'coffeescript', 'groovy',
  'solidity', 'zig', 'nim', 'ocaml', 'f#', 'vb.net', 'html', 'css', 'sass',
  'scss', 'less', 'graphql', 'wasm', 'webassembly',
]);

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
  // Extract username from URL like https://github.com/username or https://github.com/username/
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
  // Filter non-programming-language skills as interests
  const nonLang = skills.filter((s) => !KNOWN_PROGRAMMING_LANGUAGES.has(s.toLowerCase()));
  interests.push(...nonLang.slice(0, 5));
  if (interests.length === 0) {
    interests.push('open source', 'software development');
  }
  return interests;
}

const portfolioRequestSchema = z.object({
  action: z.literal('portfolio'),
  username: z.string().min(1).optional(),
  targetRole: z.string().optional(),
});

const contributionsRequestSchema = z.object({
  action: z.literal('contributions'),
  skills: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
  interests: z.array(z.string()).optional(),
  experienceLevel: z.string().default('intermediate'),
});

const readmeRequestSchema = z.object({
  action: z.literal('readme'),
  repoName: z.string().min(1),
  description: z.string().min(1),
  techStack: z.array(z.string()).min(1),
  features: z.array(z.string()).optional(),
  isPortfolioProject: z.boolean().optional(),
});

const autoOptimizeRequestSchema = z.object({
  action: z.literal('auto-optimize'),
  username: z.string().optional(),
  targetRole: z.string().optional(),
});

const requestSchema = z.discriminatedUnion('action', [
  portfolioRequestSchema,
  contributionsRequestSchema,
  readmeRequestSchema,
  autoOptimizeRequestSchema,
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

interface GitHubRepoResponse {
  name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  topics: string[];
  fork: boolean;
}

async function handlePortfolio(username: string, targetRole?: string) {
  const reposRes = await fetch(
    `https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=30`,
    { headers: { Accept: 'application/vnd.github.v3+json' } }
  );

  if (!reposRes.ok) {
    return successResponse({ error: `GitHub user "${username}" not found` }, 404);
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
    prompt.system,
    prompt.user,
    portfolioResultSchema,
    { model: 'balanced', maxTokens: 4096 }
  );

  return successResponse({
    portfolio: result,
    repoCount: repos.length,
    username,
  });
}

async function handleContributions(
  skills: string[],
  languages: string[],
  interests: string[],
  experienceLevel: string
) {
  const prompt = contributionFinderPrompt({ skills, languages, interests, experienceLevel });
  const result = await aiClient.completeJSON(
    prompt.system,
    prompt.user,
    contributionResultSchema,
    { model: 'balanced', maxTokens: 4096 }
  );

  return successResponse({ contributions: result });
}

async function handleReadme(
  repoName: string,
  description: string,
  techStack: string[],
  features?: string[],
  isPortfolioProject?: boolean
) {
  const prompt = readmeGeneratorPrompt({ repoName, description, techStack, features, isPortfolioProject });
  const result = await aiClient.completeJSON(
    prompt.system,
    prompt.user,
    readmeResultSchema,
    { model: 'balanced', maxTokens: 4096 }
  );

  return successResponse({ readme: result });
}

async function handleAutoOptimize(
  userId: string,
  profile: ProfileData,
  usernameOverride?: string,
  targetRoleOverride?: string
) {
  const skillNames = extractSkillNames(profile.skills);
  const username = usernameOverride || extractGitHubUsername(profile);
  if (!username) {
    return successResponse({
      error: 'GitHub username not found. Please add your GitHub link to your profile social links, or provide a username.',
    }, 400);
  }

  const languages = extractProgrammingLanguages(skillNames);
  const interests = extractInterests(profile);
  const targetRole = targetRoleOverride
    || (profile.preferences?.targetRoles?.[0])
    || undefined;

  // Run portfolio and contributions in parallel (readme requires repo data from portfolio)
  const [portfolioResult, contributionsResult] = await Promise.all([
    (async () => {
      try {
        const reposRes = await fetch(
          `https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=30`,
          { headers: { Accept: 'application/vnd.github.v3+json' } }
        );
        if (!reposRes.ok) {
          return { error: `GitHub user "${username}" not found` };
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
          prompt.system,
          prompt.user,
          portfolioResultSchema,
          { model: 'balanced', maxTokens: 4096 }
        );
        return { portfolio: result, repoCount: repos.length, repos };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Portfolio analysis failed' };
      }
    })(),
    (async () => {
      try {
        const effectiveLanguages = languages.length > 0 ? languages : ['JavaScript', 'TypeScript'];
        const effectiveSkills = skillNames.length > 0 ? skillNames : ['web development'];
        const prompt = contributionFinderPrompt({
          skills: effectiveSkills,
          languages: effectiveLanguages,
          interests,
          experienceLevel: 'intermediate',
        });
        const result = await aiClient.completeJSON(
          prompt.system,
          prompt.user,
          contributionResultSchema,
          { model: 'balanced', maxTokens: 4096 }
        );
        return { contributions: result };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Contribution finder failed' };
      }
    })(),
  ]);

  // Generate README for the top repo if portfolio succeeded
  interface PortfolioSuccessResult {
    portfolio: z.infer<typeof portfolioResultSchema>;
    repoCount: number;
    repos: Array<{
      name: string;
      description?: string;
      language?: string;
      stars: number;
      forks: number;
      topics: string[];
      hasReadme: boolean;
    }>;
  }

  let readmeResult: z.infer<typeof readmeResultSchema> | null = null;
  const portfolioData = portfolioResult as PortfolioSuccessResult | { error: string };
  if ('repos' in portfolioData && portfolioData.repos.length > 0) {
    const topRepo = portfolioData.repos[0];
    try {
      const prompt = readmeGeneratorPrompt({
        repoName: topRepo.name,
        description: topRepo.description || `A ${topRepo.language || 'software'} project`,
        techStack: topRepo.language ? [topRepo.language] : skillNames.slice(0, 5),
        isPortfolioProject: true,
      });
      readmeResult = await aiClient.completeJSON(
        prompt.system,
        prompt.user,
        readmeResultSchema,
        { model: 'balanced', maxTokens: 4096 }
      );
    } catch {
      // README generation is optional; skip on failure
    }
  }

  await storage.putJSON(`users/${userId}/github/auto-optimize.json`, {
    generatedAt: new Date().toISOString(),
    username,
    derivedFields: {
      languages,
      interests,
      targetRole: targetRole || null,
    },
  });

  return successResponse({
    portfolio: 'portfolio' in portfolioResult ? portfolioResult.portfolio : null,
    contributions: 'contributions' in contributionsResult ? contributionsResult.contributions : null,
    readme: readmeResult,
    username,
    derivedFields: {
      languages,
      interests,
      targetRole: targetRole || null,
    },
    errors: {
      portfolio: 'error' in portfolioResult ? portfolioResult.error : null,
      contributions: 'error' in contributionsResult ? contributionsResult.error : null,
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await authenticate(request);

    const body = await request.json();
    const parsed = requestSchema.parse(body);

    // Load profile for auto-deriving fields
    const profile = await storage.getJSON<ProfileData>(`users/${userId}/profile.json`);

    switch (parsed.action) {
      case 'portfolio': {
        const username = parsed.username || (profile ? extractGitHubUsername(profile) : undefined);
        if (!username) {
          return successResponse({
            error: 'GitHub username is required. Add your GitHub link to your profile or provide a username.',
          }, 400);
        }
        return await handlePortfolio(username, parsed.targetRole);
      }

      case 'contributions': {
        const skillNames = profile ? extractSkillNames(profile.skills) : [];
        const effectiveSkills = (parsed.skills && parsed.skills.length > 0) ? parsed.skills : (skillNames.length > 0 ? skillNames : undefined);
        const effectiveLanguages = (parsed.languages && parsed.languages.length > 0) ? parsed.languages : (skillNames.length > 0 ? extractProgrammingLanguages(skillNames) : undefined);
        const effectiveInterests = (parsed.interests && parsed.interests.length > 0) ? parsed.interests : (profile ? extractInterests(profile) : undefined);

        if (!effectiveSkills || effectiveSkills.length === 0) {
          return successResponse({ error: 'Skills are required. Add skills to your profile or provide them manually.' }, 400);
        }
        if (!effectiveLanguages || effectiveLanguages.length === 0) {
          return successResponse({ error: 'Programming languages are required. Add them to your profile skills or provide them manually.' }, 400);
        }
        if (!effectiveInterests || effectiveInterests.length === 0) {
          return successResponse({ error: 'Interests are required. Add a headline to your profile or provide them manually.' }, 400);
        }

        // After null-guards above, these are guaranteed to be defined non-empty arrays
        const resolvedSkills: string[] = effectiveSkills;
        const resolvedLanguages: string[] = effectiveLanguages;
        const resolvedInterests: string[] = effectiveInterests;

        return await handleContributions(
          resolvedSkills,
          resolvedLanguages,
          resolvedInterests,
          parsed.experienceLevel
        );
      }

      case 'readme':
        return await handleReadme(
          parsed.repoName,
          parsed.description,
          parsed.techStack,
          parsed.features,
          parsed.isPortfolioProject
        );

      case 'auto-optimize': {
        if (!profile) {
          return successResponse({ error: 'Profile not found. Please complete your profile first.' }, 404);
        }
        return await handleAutoOptimize(userId, profile, parsed.username, parsed.targetRole);
      }

      default:
        return successResponse({ error: 'Invalid action' }, 400);
    }
  } catch (error) {
    return handleError(error);
  }
}
