import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticate, successResponse, handleError, errorResponse } from '@/lib/api-utils';
import { aiClient } from '@/lib/ai-client';
import { storage } from '@/lib/storage';
import { readmeGeneratorPrompt } from '@/prompts/github-enhanced';
import { logger } from '@/lib/logger';

interface ProfileData {
  name?: string;
  headline?: string;
  skills?: Array<{ name: string; proficiency?: string }> | string[];
  socialLinks?: Array<{ platform: string; url: string }>;
}

interface GitHubContentsResponse {
  content: string;
  sha: string;
  name: string;
  path: string;
}

interface GitHubRefResponse {
  object: {
    sha: string;
  };
}

interface GitHubCreateRefResponse {
  ref: string;
}

interface GitHubPRResponse {
  html_url: string;
  number: number;
}

interface ReadmeAIResult {
  content: string;
  sections: string[];
}

const requestSchema = z.object({
  repoName: z.string().min(1),
  targetBranch: z.string().default('main'),
  githubToken: z.string().min(1),
});

const responseSchema = z.object({
  prUrl: z.string(),
  prNumber: z.number(),
  branch: z.string(),
  improvements: z.array(z.string()),
});

type AutoPRResponse = z.infer<typeof responseSchema>;

function extractGitHubUsername(profile: ProfileData): string | undefined {
  const links = profile.socialLinks || [];
  const ghLink = links.find(
    (l) =>
      l.platform.toLowerCase() === 'github' || l.url.toLowerCase().includes('github.com')
  );
  if (!ghLink) return undefined;
  const match = ghLink.url.match(/github\.com\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : undefined;
}

function extractSkillNames(
  skills: ProfileData['skills']
): string[] {
  if (!skills || !Array.isArray(skills)) return [];
  return skills.map((s) => {
    if (typeof s === 'string') return s;
    if (typeof s === 'object' && s !== null && 'name' in s) return (s as { name: string }).name;
    return String(s);
  });
}

async function githubGet<T>(url: string, token: string): Promise<T> {
  const res = await fetch(url, {
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'AutoApply/1.0',
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    if (res.status === 401) {
      throw new Error('Invalid GitHub token. Please check your Personal Access Token.');
    }
    if (res.status === 404) {
      throw new Error(
        `Repository or resource not found. Make sure the repo exists and is accessible.`
      );
    }
    throw new Error(`GitHub API error ${res.status}: ${body}`);
  }

  return res.json() as Promise<T>;
}

async function githubPost<T>(
  url: string,
  token: string,
  body: Record<string, unknown>
): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'AutoApply/1.0',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    if (res.status === 401) {
      throw new Error('Invalid GitHub token.');
    }
    if (res.status === 422) {
      // Could be branch already exists or validation error
      let message = 'GitHub validation error';
      try {
        const parsed = JSON.parse(errBody) as { message?: string };
        if (parsed.message) message = parsed.message;
      } catch {
        // ignore parse error
      }
      throw new Error(`GitHub: ${message}`);
    }
    throw new Error(`GitHub API error ${res.status}: ${errBody}`);
  }

  return res.json() as Promise<T>;
}

async function githubPut<T>(
  url: string,
  token: string,
  body: Record<string, unknown>
): Promise<T> {
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'AutoApply/1.0',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    if (res.status === 401) throw new Error('Invalid GitHub token.');
    throw new Error(`GitHub API error ${res.status}: ${errBody}`);
  }

  return res.json() as Promise<T>;
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await authenticate(request);

    const body: unknown = await request.json();
    const parseResult = requestSchema.safeParse(body);
    if (!parseResult.success) {
      return errorResponse(parseResult.error.issues[0]?.message ?? 'Invalid request', 400);
    }

    const { repoName, targetBranch, githubToken } = parseResult.data;

    // Load profile to get GitHub username and context
    const profile = await storage.getJSON<ProfileData>(`users/${userId}/profile.json`);
    if (!profile) {
      return errorResponse('Profile not found. Please set up your profile first.', 404);
    }

    const owner = extractGitHubUsername(profile);
    if (!owner) {
      return errorResponse(
        'GitHub username not found in profile. Please add your GitHub profile link.',
        400
      );
    }

    // Step 1: Get current README content from GitHub
    logger.info({ userId, owner, repoName }, 'Fetching README from GitHub');

    let readmeData: GitHubContentsResponse;
    try {
      readmeData = await githubGet<GitHubContentsResponse>(
        `https://api.github.com/repos/${owner}/${repoName}/contents/README.md`,
        githubToken
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch README';
      return errorResponse(msg, 400);
    }

    // Decode base64 content
    const currentContent = Buffer.from(readmeData.content, 'base64').toString('utf-8');
    const fileSha = readmeData.sha;

    // Step 2: Generate improved README with AI
    const skills = extractSkillNames(profile.skills);

    const promptInput = {
      repoName,
      description: `GitHub repository by ${profile.name || owner}. Current README:\n\n${currentContent.slice(0, 2000)}`,
      techStack: skills.length > 0 ? skills.slice(0, 10) : ['Unknown'],
      isPortfolioProject: true,
    };

    const { system, user } = readmeGeneratorPrompt(promptInput);

    const readmeSchema = z.object({
      content: z.string(),
      sections: z.array(z.string()),
    });

    let readmeResult: ReadmeAIResult;
    try {
      readmeResult = await aiClient.completeJSON<ReadmeAIResult>(system, user, readmeSchema, {
        model: 'balanced',
        maxTokens: 4096,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'AI generation failed';
      return errorResponse(`Failed to generate improved README: ${msg}`, 500);
    }

    // Step 3: Get the SHA of the target branch tip
    logger.info({ owner, repoName, targetBranch }, 'Getting branch SHA');

    let refData: GitHubRefResponse;
    try {
      refData = await githubGet<GitHubRefResponse>(
        `https://api.github.com/repos/${owner}/${repoName}/git/refs/heads/${targetBranch}`,
        githubToken
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to get branch';
      return errorResponse(
        `Could not find branch "${targetBranch}" in ${owner}/${repoName}: ${msg}`,
        400
      );
    }

    const baseSha = refData.object.sha;

    // Step 4: Create a new branch
    const timestamp = Date.now();
    const newBranch = `autoapply/improve-readme-${timestamp}`;

    try {
      await githubPost<GitHubCreateRefResponse>(
        `https://api.github.com/repos/${owner}/${repoName}/git/refs`,
        githubToken,
        {
          ref: `refs/heads/${newBranch}`,
          sha: baseSha,
        }
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create branch';
      return errorResponse(`Failed to create branch: ${msg}`, 400);
    }

    // Step 5: Update README on new branch
    const newContentBase64 = Buffer.from(readmeResult.content, 'utf-8').toString('base64');

    try {
      await githubPut<Record<string, unknown>>(
        `https://api.github.com/repos/${owner}/${repoName}/contents/README.md`,
        githubToken,
        {
          message: 'docs: improve README for better portfolio presentation [AutoApply]',
          content: newContentBase64,
          sha: fileSha,
          branch: newBranch,
        }
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update README';
      return errorResponse(`Failed to commit improved README: ${msg}`, 500);
    }

    // Step 6: Create pull request
    let prData: GitHubPRResponse;
    try {
      prData = await githubPost<GitHubPRResponse>(
        `https://api.github.com/repos/${owner}/${repoName}/pulls`,
        githubToken,
        {
          title: 'Improve README for better portfolio presentation',
          body: [
            '## AI-Generated README Improvements',
            '',
            'Auto-generated by **AutoApply AI** to enhance portfolio presentation.',
            '',
            '### Sections included',
            readmeResult.sections.map((s) => `- ${s}`).join('\n'),
            '',
            '> Review the changes and merge if they look good!',
          ].join('\n'),
          head: newBranch,
          base: targetBranch,
        }
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create PR';
      return errorResponse(`Failed to create pull request: ${msg}`, 400);
    }

    // Build improvements list from sections
    const improvements = readmeResult.sections.map(
      (section) => `Added/improved ${section} section`
    );
    if (improvements.length === 0) {
      improvements.push('Rewrote README with professional structure');
      improvements.push('Added tech stack documentation');
      improvements.push('Improved clarity and readability');
    }

    const result: AutoPRResponse = responseSchema.parse({
      prUrl: prData.html_url,
      prNumber: prData.number,
      branch: newBranch,
      improvements,
    });

    logger.info({ userId, prUrl: result.prUrl }, 'GitHub PR created successfully');

    return successResponse(result, 201);
  } catch (err) {
    return handleError(err);
  }
}
