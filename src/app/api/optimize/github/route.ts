import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticate, successResponse, handleError } from '@/lib/api-utils';
import { aiClient } from '@/lib/ai-client';
import { githubOptimizerPrompt } from '@/prompts/github-optimizer';

const analyzeSchema = z.object({
  username: z.string().min(1),
  targetRole: z.string().optional(),
});

const resultSchema = z.object({
  overall_score: z.number(),
  sections: z.object({
    bio: z.object({
      score: z.number(),
      suggestions: z.array(z.string()),
    }),
    readme: z.object({
      score: z.number(),
      suggestions: z.array(z.string()),
    }),
    repos: z.object({
      score: z.number(),
      suggestions: z.array(z.string()),
    }),
    contributions: z.object({
      score: z.number(),
      suggestions: z.array(z.string()),
    }),
  }),
});

export async function POST(request: NextRequest) {
  try {
    await authenticate(request);

    const body = await request.json();
    const { username, targetRole } = analyzeSchema.parse(body);

    // Fetch GitHub profile via public API
    const [userRes, reposRes] = await Promise.all([
      fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, {
        headers: { 'Accept': 'application/vnd.github.v3+json' },
      }),
      fetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=30`, {
        headers: { 'Accept': 'application/vnd.github.v3+json' },
      }),
    ]);

    if (!userRes.ok) {
      return successResponse({
        error: `GitHub user "${username}" not found`,
      }, 404);
    }

    const userData = await userRes.json();
    const reposData = reposRes.ok ? await reposRes.json() : [];

    // Check for profile README
    let readme: string | undefined;
    try {
      const readmeRes = await fetch(
        `https://api.github.com/repos/${encodeURIComponent(username)}/${encodeURIComponent(username)}/readme`,
        { headers: { 'Accept': 'application/vnd.github.v3+json' } }
      );
      if (readmeRes.ok) {
        const readmeData = await readmeRes.json();
        readme = Buffer.from(readmeData.content, 'base64').toString('utf-8');
      }
    } catch {
      // No profile README
    }

    const repositories = reposData.map((repo: Record<string, unknown>) => ({
      name: repo.name as string,
      description: (repo.description as string) || undefined,
      stars: (repo.stargazers_count as number) || 0,
      forks: (repo.forks_count as number) || 0,
      language: (repo.language as string) || undefined,
      topics: (repo.topics as string[]) || [],
      lastUpdated: repo.updated_at as string,
      isForked: repo.fork as boolean,
      hasReadme: true, // GitHub API doesn't tell us easily, assume true
    }));

    const profileInput = {
      profile: {
        username,
        bio: userData.bio || undefined,
        company: userData.company || undefined,
        location: userData.location || undefined,
        website: userData.blog || undefined,
        twitter: userData.twitter_username || undefined,
        repositories,
        readme,
        followers: userData.followers,
        following: userData.following,
      },
      targetRole,
    };

    const prompt = githubOptimizerPrompt(profileInput);
    const result = await aiClient.completeJSON(
      prompt.system,
      prompt.user,
      resultSchema,
      { model: 'balanced', maxTokens: 4096 }
    );

    return successResponse({
      analysis: result,
      profile: {
        username,
        name: userData.name,
        bio: userData.bio,
        avatarUrl: userData.avatar_url,
        publicRepos: userData.public_repos,
        followers: userData.followers,
        following: userData.following,
        location: userData.location,
        company: userData.company,
        blog: userData.blog,
        createdAt: userData.created_at,
        hasReadme: !!readme,
      },
      topRepos: repositories.slice(0, 6).map((r: Record<string, unknown>) => ({
        name: r.name,
        description: r.description,
        stars: r.stars,
        forks: r.forks,
        language: r.language,
        topics: r.topics,
        isForked: r.isForked,
      })),
    });
  } catch (error) {
    return handleError(error);
  }
}
