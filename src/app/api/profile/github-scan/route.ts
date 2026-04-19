/**
 * POST /api/profile/github-scan
 * Scans GitHub repos for a user and auto-populates skills and projects in their profile.
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticate, successResponse, errorResponse, handleError } from '@/lib/api-utils';
import { storage } from '@/lib/storage';
import { logger } from '@/lib/logger';
import { generateId } from '@/lib/utils';
import type { Profile, Skill, Project } from '@/types/profile';

const inputSchema = z.object({
  username: z.string().optional(),
});

interface GitHubRepo {
  name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  topics: string[];
  stargazers_count: number;
  fork: boolean;
}

interface GitHubLanguageMap {
  [lang: string]: number;
}

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

// Known framework/library names to detect from package.json deps
const FRAMEWORK_NAMES: Record<string, string> = {
  react: 'React',
  'react-dom': 'React',
  next: 'Next.js',
  'next.js': 'Next.js',
  vue: 'Vue.js',
  '@angular/core': 'Angular',
  svelte: 'Svelte',
  express: 'Express.js',
  fastify: 'Fastify',
  nestjs: 'NestJS',
  '@nestjs/core': 'NestJS',
  django: 'Django',
  flask: 'Flask',
  fastapi: 'FastAPI',
  graphql: 'GraphQL',
  'apollo-server': 'Apollo GraphQL',
  prisma: 'Prisma',
  mongoose: 'Mongoose',
  typeorm: 'TypeORM',
  sequelize: 'Sequelize',
  tailwindcss: 'Tailwind CSS',
  redux: 'Redux',
  zustand: 'Zustand',
  jest: 'Jest',
  vitest: 'Vitest',
  playwright: 'Playwright',
  puppeteer: 'Puppeteer',
  docker: 'Docker',
  kubernetes: 'Kubernetes',
  tensorflow: 'TensorFlow',
  '@tensorflow/tfjs': 'TensorFlow.js',
  torch: 'PyTorch',
  pandas: 'Pandas',
  numpy: 'NumPy',
  'socket.io': 'Socket.IO',
  rxjs: 'RxJS',
  gatsby: 'Gatsby',
  remix: 'Remix',
  astro: 'Astro',
  electron: 'Electron',
  tauri: 'Tauri',
  'react-native': 'React Native',
  expo: 'Expo',
  drizzle: 'Drizzle ORM',
  'drizzle-orm': 'Drizzle ORM',
};

function githubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'AutoApply-App/1.0',
  };
  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}

async function fetchJSON<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: githubHeaders() });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function determineProficiency(
  totalBytes: number,
  maxBytes: number,
  repoCount: number
): Skill['proficiency'] {
  const fraction = totalBytes / maxBytes;
  if (fraction >= 0.4 || repoCount >= 5) return 'advanced';
  if (fraction >= 0.15 || repoCount >= 2) return 'intermediate';
  return 'beginner';
}

/**
 * POST /api/profile/github-scan
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);

    const body = await req.json();
    const validation = inputSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse('Invalid request body', 400, 'VALIDATION_ERROR');
    }

    // Load profile to get GitHub username from socialLinks
    const profile = await storage.getJSON<Profile>(`users/${userId}/profile.json`);
    if (!profile) {
      return errorResponse('Profile not found. Please complete your profile first.', 404, 'PROFILE_NOT_FOUND');
    }

    // Resolve username: body override or from profile socialLinks
    let username = validation.data.username;
    if (!username) {
      const ghLink = (profile.socialLinks || []).find(
        (l) => l.platform.toLowerCase() === 'github'
      );
      if (ghLink) {
        // Extract username from URL like https://github.com/username
        const match = ghLink.url.match(/github\.com\/([^/]+)/);
        username = match ? match[1] : undefined;
      }
    }

    if (!username) {
      return errorResponse(
        'No GitHub username found. Provide a username in the request body or add a GitHub link to your profile.',
        400,
        'NO_GITHUB_USERNAME'
      );
    }

    logger.info({ userId, username }, 'Starting GitHub scan');

    // Fetch repos
    const repos = await fetchJSON<GitHubRepo[]>(
      `https://api.github.com/users/${username}/repos?sort=updated&per_page=30`
    );

    if (!repos || !Array.isArray(repos)) {
      return errorResponse(
        `Could not fetch repos for GitHub user "${username}". Ensure the username is correct and public.`,
        422,
        'GITHUB_FETCH_ERROR'
      );
    }

    // Aggregate language bytes across all repos (skip forks)
    const languageBytesMap: Record<string, number> = {};
    const languageRepoCountMap: Record<string, number> = {};
    const detectedFrameworks = new Set<string>();

    // Process each repo: fetch languages and optionally package.json
    await Promise.all(
      repos
        .filter((r) => !r.fork)
        .map(async (repo) => {
          // Fetch language bytes for this repo
          const langs = await fetchJSON<GitHubLanguageMap>(
            `https://api.github.com/repos/${username}/${repo.name}/languages`
          );
          if (langs) {
            for (const [lang, bytes] of Object.entries(langs)) {
              languageBytesMap[lang] = (languageBytesMap[lang] || 0) + bytes;
              languageRepoCountMap[lang] = (languageRepoCountMap[lang] || 0) + 1;
            }
          }

          // Detect topics-based frameworks (GitHub topics like "react", "django", etc.)
          for (const topic of repo.topics || []) {
            const normalised = topic.toLowerCase().replace(/[^a-z0-9-]/g, '');
            const frameworkName = FRAMEWORK_NAMES[normalised];
            if (frameworkName) detectedFrameworks.add(frameworkName);
          }

          // Try to parse package.json for framework detection
          const pkgRaw = await fetchJSON<PackageJson>(
            `https://api.github.com/repos/${username}/${repo.name}/contents/package.json`
          );

          if (pkgRaw && typeof pkgRaw === 'object' && 'content' in pkgRaw) {
            try {
              const content = Buffer.from(
                (pkgRaw as { content: string }).content,
                'base64'
              ).toString('utf-8');
              const pkg = JSON.parse(content) as PackageJson;
              const allDeps = {
                ...(pkg.dependencies || {}),
                ...(pkg.devDependencies || {}),
              };
              for (const depName of Object.keys(allDeps)) {
                const mapped = FRAMEWORK_NAMES[depName.toLowerCase()];
                if (mapped) detectedFrameworks.add(mapped);
              }
            } catch {
              // Ignore parse errors for package.json
            }
          }
        })
    );

    // Build language skills with proficiency
    const maxBytes = Math.max(...Object.values(languageBytesMap), 1);
    const existingSkillNames = new Set(
      (profile.skills || []).map((s) => s.name.toLowerCase())
    );

    const detectedSkills: Skill[] = [];

    // Language-based skills
    for (const [lang, bytes] of Object.entries(languageBytesMap)) {
      const repoCount = languageRepoCountMap[lang] || 0;
      const proficiency = determineProficiency(bytes, maxBytes, repoCount);
      detectedSkills.push({ name: lang, proficiency });
    }

    // Framework skills from topics/package.json (default to intermediate)
    for (const fw of detectedFrameworks) {
      if (!detectedSkills.find((s) => s.name.toLowerCase() === fw.toLowerCase())) {
        detectedSkills.push({ name: fw, proficiency: 'intermediate' });
      }
    }

    // Merge with existing skills: update proficiency if existing, add if new
    const mergedSkills: Skill[] = [...(profile.skills || [])];
    for (const skill of detectedSkills) {
      const existing = mergedSkills.find(
        (s) => s.name.toLowerCase() === skill.name.toLowerCase()
      );
      if (!existing) {
        mergedSkills.push(skill);
      } else if (
        existing.proficiency === 'beginner' &&
        (skill.proficiency === 'intermediate' || skill.proficiency === 'advanced')
      ) {
        existing.proficiency = skill.proficiency;
      }
    }

    // Build detected projects from non-fork repos with descriptions
    const existingProjectUrls = new Set(
      (profile.projects || []).map((p) => p.githubUrl).filter(Boolean)
    );

    const detectedProjects: Project[] = repos
      .filter(
        (r) =>
          !r.fork &&
          r.description &&
          r.description.trim().length > 0 &&
          !existingProjectUrls.has(r.html_url)
      )
      .slice(0, 10)
      .map((r) => ({
        id: generateId(),
        name: r.name,
        description: r.description ?? undefined,
        technologies: r.language ? [r.language] : [],
        githubUrl: r.html_url,
        url: r.html_url,
      }));

    const mergedProjects = [...(profile.projects || []), ...detectedProjects];

    // Persist updated profile
    await storage.updateJSON<Profile>(`users/${userId}/profile.json`, (current) => {
      if (!current) return profile;
      return {
        ...current,
        skills: mergedSkills,
        projects: mergedProjects,
        updatedAt: new Date().toISOString(),
      };
    });

    const newSkills = detectedSkills.filter(
      (s) => !existingSkillNames.has(s.name.toLowerCase())
    );

    logger.info(
      { userId, username, repoCount: repos.length, newSkillCount: newSkills.length, newProjectCount: detectedProjects.length },
      'GitHub scan complete'
    );

    return successResponse({
      detectedSkills,
      detectedProjects,
      newSkillsAdded: newSkills.length,
      newProjectsAdded: detectedProjects.length,
      repoCount: repos.filter((r) => !r.fork).length,
      username,
    });
  } catch (error) {
    logger.error({ error }, 'GitHub scan error');
    return handleError(error);
  }
}
