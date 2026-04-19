import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticate, successResponse, errorResponse, handleError } from '@/lib/api-utils';
import { aiClient } from '@/lib/ai-client';
import { storage } from '@/lib/storage';
import { logger } from '@/lib/logger';
import { generateId } from '@/lib/utils';

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const actionSchema = z.object({
  action: z.enum(['generate', 'save']),
});

const portfolioRepoSchema = z.object({
  name: z.string(),
  original_description: z.string(),
  ai_description: z.string(),
  impact_statement: z.string(),
  tech_stack: z.array(z.string()),
  highlights: z.array(z.string()),
  demo_tip: z.string(),
  relevance_score: z.number().min(1).max(10),
  category: z.enum(['web-app', 'api', 'library', 'ml-ai', 'data', 'mobile', 'cli-tool', 'other']),
});

const portfolioSchema = z.object({
  selected_repos: z.array(portfolioRepoSchema),
  portfolio_bio: z.string(),
  tagline: z.string(),
  top_skills: z.array(z.string()),
});

const saveBodySchema = z.object({
  action: z.literal('save'),
  portfolio: z.object({
    selected_repos: z.array(portfolioRepoSchema),
    portfolio_bio: z.string(),
    tagline: z.string(),
    top_skills: z.array(z.string()),
  }),
});

// ─── Types ────────────────────────────────────────────────────────────────────

interface GitHubRepo {
  name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  topics: string[];
  fork: boolean;
  archived: boolean;
}

interface ProfileData {
  name?: string;
  headline?: string;
  summary?: string;
  skills?: Array<{ name: string; proficiency?: string }> | string[];
  socialLinks?: Array<{ platform: string; url: string }>;
}

interface PortfolioConfig {
  id: string;
  generatedAt: string;
  githubUsername: string;
  selected_repos: z.infer<typeof portfolioRepoSchema>[];
  portfolio_bio: string;
  tagline: string;
  top_skills: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractGitHubUsername(profile: ProfileData): string | null {
  const links = profile.socialLinks ?? [];
  const ghLink = links.find(
    (l) =>
      l.platform.toLowerCase() === 'github' ||
      l.url.toLowerCase().includes('github.com')
  );
  if (!ghLink) return null;
  const match = ghLink.url.match(/github\.com\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

function extractSkillNames(
  skills: Array<{ name: string; proficiency?: string }> | string[] | undefined
): string[] {
  if (!skills || !Array.isArray(skills)) return [];
  return skills.map((s) => {
    if (typeof s === 'string') return s;
    return s.name;
  });
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { userId } = await authenticate(request);

    const [savedPortfolio, profile] = await Promise.all([
      storage.getJSON<PortfolioConfig>(`users/${userId}/portfolio/config.json`).catch(() => null),
      storage.getJSON<ProfileData>(`users/${userId}/profile.json`).catch(() => null),
    ]);

    const githubUrl = profile ? (() => {
      const links = profile.socialLinks ?? [];
      const ghLink = links.find(
        (l) =>
          l.platform.toLowerCase() === 'github' ||
          l.url.toLowerCase().includes('github.com')
      );
      return ghLink?.url ?? null;
    })() : null;

    const githubUsername = profile ? extractGitHubUsername(profile) : null;

    return successResponse({
      portfolio: savedPortfolio,
      githubUrl,
      githubUsername,
    });
  } catch (error) {
    return handleError(error);
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const { userId } = await authenticate(request);
    const body = await request.json() as Record<string, unknown>;
    const { action } = actionSchema.parse(body);

    if (action === 'save') {
      const { portfolio } = saveBodySchema.parse(body);

      const profile = await storage
        .getJSON<ProfileData>(`users/${userId}/profile.json`)
        .catch(() => null);

      const githubUsername = profile ? extractGitHubUsername(profile) : 'unknown';

      const config: PortfolioConfig = {
        id: generateId(),
        generatedAt: new Date().toISOString(),
        githubUsername: githubUsername ?? 'unknown',
        ...portfolio,
      };

      await storage.putJSON(`users/${userId}/portfolio/config.json`, config);
      logger.info({ userId }, 'Portfolio config saved');

      return successResponse({ portfolio: config });
    }

    // action === 'generate'
    const profile = await storage
      .getJSON<ProfileData>(`users/${userId}/profile.json`)
      .catch(() => null);

    if (!profile) {
      return errorResponse('Profile not found. Please complete your profile first.', 404);
    }

    const githubUsername = extractGitHubUsername(profile);
    if (!githubUsername) {
      return errorResponse(
        'No GitHub URL found in profile. Add it in Profile settings.',
        400
      );
    }

    // Fetch repos from GitHub API
    let repos: GitHubRepo[];
    try {
      const reposRes = await fetch(
        `https://api.github.com/users/${encodeURIComponent(githubUsername)}/repos?sort=updated&per_page=50&type=public`,
        {
          headers: {
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'AutoApply-Portfolio-Builder/1.0',
          },
        }
      );

      if (reposRes.status === 404) {
        return errorResponse(
          `GitHub user "${githubUsername}" not found. Check the URL in your profile.`,
          404
        );
      }

      if (reposRes.status === 403 || reposRes.status === 429) {
        return errorResponse(
          'GitHub API rate limit reached. Please try again in a few minutes.',
          429
        );
      }

      if (!reposRes.ok) {
        return errorResponse(
          `GitHub API error: ${reposRes.statusText}. Please try again later.`,
          502
        );
      }

      repos = (await reposRes.json()) as GitHubRepo[];
    } catch (fetchError) {
      logger.error({ fetchError, githubUsername }, 'Failed to fetch GitHub repos');
      return errorResponse(
        'Could not reach GitHub API. Check your network connection and try again.',
        502
      );
    }

    // Filter out forks and archived repos
    const ownRepos = repos.filter((r) => !r.fork && !r.archived);

    if (ownRepos.length === 0) {
      return errorResponse(
        'No original (non-forked) public repositories found on this GitHub account.',
        400
      );
    }

    const skillNames = extractSkillNames(profile.skills);

    // Build a concise summary for the AI prompt
    const repoSummaries = ownRepos.map((r) => ({
      name: r.name,
      description: r.description ?? '',
      language: r.language ?? 'unknown',
      stars: r.stargazers_count,
      forks: r.forks_count,
      topics: r.topics,
      updated_at: r.updated_at,
      url: r.html_url,
    }));

    const systemPrompt =
      'You are a senior software engineer and hiring manager. Select and describe GitHub projects that will impress technical recruiters. Focus on impact, complexity, and real-world usefulness. Write descriptions that are specific, not generic. Avoid filler phrases like "This project demonstrates" or "A comprehensive solution". Get straight to the point about what it does and why it matters.';

    const userPrompt = `Candidate profile:
Name: ${profile.name ?? 'Unknown'}
Headline: ${profile.headline ?? 'Software Developer'}
Summary: ${profile.summary ?? ''}
Skills: ${skillNames.join(', ') || 'Not specified'}

GitHub username: ${githubUsername}
Total non-forked public repositories: ${ownRepos.length}

Repositories (JSON):
${JSON.stringify(repoSummaries, null, 2)}

Task:
1. Select the top 4-6 most impressive repositories that best showcase this developer's skills and real-world impact.
2. For each selected repo, write professional descriptions tailored to impress a technical recruiter.
3. Derive a portfolio_bio (2-3 sentences introducing this developer), a one-line tagline, and top_skills inferred from the repos.

Focus on repos that show: real-world usefulness, technical complexity, teamwork (forks/stars), breadth of skills, and interview talking points.`;

    const result = await aiClient.completeJSON(systemPrompt, userPrompt, portfolioSchema, {
      model: 'balanced',
      maxTokens: 3072,
    });

    const config: PortfolioConfig = {
      id: generateId(),
      generatedAt: new Date().toISOString(),
      githubUsername,
      selected_repos: result.selected_repos,
      portfolio_bio: result.portfolio_bio,
      tagline: result.tagline,
      top_skills: result.top_skills,
    };

    await storage.putJSON(`users/${userId}/portfolio/config.json`, config);
    logger.info({ userId, githubUsername, repoCount: result.selected_repos.length }, 'Portfolio generated');

    return successResponse({ portfolio: config });
  } catch (error) {
    return handleError(error);
  }
}
