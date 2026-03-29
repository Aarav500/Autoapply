import { NextRequest } from 'next/server';
import { z } from 'zod';
import { successResponse, errorResponse, authenticate, handleError } from '@/lib/api-utils';
import { storage } from '@/lib/storage';
import { logger } from '@/lib/logger';
import { AppError } from '@/lib/errors';
import { generateId } from '@/lib/utils';
import { aiClient } from '@/lib/ai-client';
import { cvGeneratorPrompt, CVGeneratorInput } from '@/prompts/cv-generator';
import { GeneratedCVSchema, GeneratedCV } from '@/types/ai';
import { CVContent } from '@/types/documents';
import { modernCleanTemplate } from '@/services/documents/templates/modern-clean';
import { htmlToPdf } from '@/services/documents/pdf-generator';
import { checkATS } from '@/services/documents/ats-checker';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CVVersion {
  id: string;
  name: string;
  description: string;
  targetRole?: string;
  targetIndustry?: string;
  createdAt: string;
  s3Key: string;
  atsScore?: number;
}

interface CVVersionIndex {
  versions: CVVersion[];
  lastUpdated: string;
}

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const createVersionSchema = z.object({
  action: z.literal('create-version'),
  name: z.string().min(1).max(100),
  description: z.string().max(500).default(''),
  targetRole: z.string().max(100).optional(),
  targetIndustry: z.string().max(100).optional(),
  jobDescription: z.string().max(10000).optional(),
});

const compareAtsSchema = z.object({
  action: z.literal('compare-ats'),
  versionIds: z.array(z.string()).min(2).max(6),
  jobDescription: z.string().min(10).max(10000),
});

const postBodySchema = z.discriminatedUnion('action', [
  createVersionSchema,
  compareAtsSchema,
]);

const deleteSchema = z.object({
  id: z.string().min(1),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const VERSIONS_INDEX_KEY = (userId: string) =>
  `users/${userId}/documents/versions/index.json`;

async function loadVersionIndex(userId: string): Promise<CVVersionIndex> {
  const raw = await storage.getJSON<CVVersionIndex>(VERSIONS_INDEX_KEY(userId));
  return raw ?? { versions: [], lastUpdated: new Date().toISOString() };
}

async function saveVersionIndex(
  userId: string,
  index: CVVersionIndex
): Promise<void> {
  index.lastUpdated = new Date().toISOString();
  await storage.putJSON(VERSIONS_INDEX_KEY(userId), index);
}

/** Build CVContent from a user profile (mirrors the logic in ats-check route) */
function buildCVContentFromProfile(
  profile: Record<string, unknown>
): CVContent {
  const socialLinks: Array<{ platform: string; url: string }> =
    (profile.socialLinks as Array<{ platform: string; url: string }>) || [];

  const allSkillNames = (
    (profile.skills as Array<{ name: string } | string>) || []
  ).map((s) => (typeof s === 'string' ? s : s.name));

  return {
    contactInfo: {
      name: (profile.name as string) || '',
      email: (profile.email as string) || '',
      phone: (profile.phone as string) || undefined,
      location: (profile.location as string) || undefined,
      linkedin: socialLinks.find(
        (l) => l.platform?.toLowerCase() === 'linkedin'
      )?.url,
      github: socialLinks.find(
        (l) => l.platform?.toLowerCase() === 'github'
      )?.url,
      website: socialLinks.find(
        (l) =>
          l.platform?.toLowerCase() === 'website' ||
          l.platform?.toLowerCase() === 'portfolio'
      )?.url,
    },
    summary: (profile.summary as string) || '',
    experience: (
      (profile.experience as Array<Record<string, unknown>>) || []
    ).map((exp) => ({
      company: (exp.company as string) || '',
      position: ((exp.role as string) || (exp.title as string) || '') as string,
      location: (exp.location as string) || undefined,
      startDate: (exp.startDate as string) || '',
      endDate: (exp.endDate as string | null) ?? null,
      highlights: (
        Array.isArray(exp.responsibilities)
          ? (exp.responsibilities as string[])
          : Array.isArray(exp.highlights)
          ? (exp.highlights as string[])
          : Array.isArray(exp.achievements)
          ? (exp.achievements as string[])
          : exp.description
          ? [exp.description as string]
          : []
      ) as string[],
    })),
    education: (
      (profile.education as Array<Record<string, unknown>>) || []
    ).map((edu) => ({
      institution:
        ((edu.institution as string) || (edu.school as string) || '') as string,
      degree: (edu.degree as string) || '',
      field:
        (
          (edu.field as string) ||
          (edu.major as string) ||
          (edu.fieldOfStudy as string) ||
          ''
        ) as string,
      location: (edu.location as string) || undefined,
      startDate: (edu.startDate as string) || undefined,
      endDate: (edu.endDate as string) || undefined,
      gpa: edu.gpa ? String(edu.gpa) : undefined,
      honors: Array.isArray(edu.honors) ? (edu.honors as string[]) : [],
    })),
    skills: {
      technical: allSkillNames,
      soft: [],
      certifications: (
        (profile.certifications as Array<{ name: string; issuer: string }>) ||
        []
      ).map((c) => `${c.name} (${c.issuer})`),
    },
    projects: ((profile.projects as Array<Record<string, unknown>>) || []).map(
      (p) => ({
        name: ((p.name as string) || (p.title as string) || '') as string,
        description: (p.description as string) || '',
        technologies: Array.isArray(p.technologies)
          ? (p.technologies as string[])
          : [],
        link: (p.url as string) || (p.link as string) || undefined,
        highlights: (
          Array.isArray(p.achievements)
            ? (p.achievements as string[])
            : Array.isArray(p.highlights)
            ? (p.highlights as string[])
            : []
        ) as string[],
      })
    ),
  };
}

// Skill categorization keyword lists (copied from cv-builder for parity)
const LANG_KEYWORDS = [
  'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'ruby', 'php',
  'c', 'go', 'golang', 'rust', 'kotlin', 'swift', 'scala', 'r', 'matlab',
  'julia', 'dart', 'lua', 'haskell', 'elixir', 'clojure', 'erlang', 'f#',
  'sql', 'graphql', 'bash', 'shell', 'powershell', 'groovy', 'perl', 'zig',
  'nim', 'crystal', 'solidity',
];
const FW_KEYWORDS = [
  'react', 'vue', 'angular', 'svelte', 'solid', 'htmx', 'astro', 'remix',
  'next.js', 'nextjs', 'nuxt', 'gatsby', 'sveltekit', 'express', 'nest.js',
  'nestjs', 'fastify', 'hapi', 'koa', 'elysia', 'hono', 'django', 'flask',
  'fastapi', 'starlette', 'tornado', 'spring', 'spring boot', 'quarkus',
  'micronaut', 'ktor', 'rails', 'sinatra', 'laravel', 'symfony', 'flutter',
  'react native', 'expo', 'swiftui', 'jest', 'vitest', 'pytest', 'cypress',
  'playwright', 'selenium', 'mocha',
];
const AI_ML_KEYWORDS = [
  'pytorch', 'tensorflow', 'keras', 'scikit-learn', 'sklearn', 'pandas',
  'numpy', 'scipy', 'xgboost', 'lightgbm', 'langchain', 'llamaindex',
  'openai', 'anthropic', 'huggingface', 'transformers', 'mlflow', 'wandb',
  'dask', 'spark ml', 'computer vision', 'nlp', 'llm', 'rag', 'fine-tuning',
  'reinforcement learning', 'deep learning', 'machine learning',
];
const TOOL_KEYWORDS = [
  'git', 'github', 'gitlab', 'bitbucket', 'github actions', 'gitlab ci',
  'circleci', 'jenkins', 'docker', 'kubernetes', 'k8s', 'helm', 'terraform',
  'pulumi', 'ansible', 'aws', 'azure', 'gcp', 'google cloud', 'cloudflare',
  'vercel', 'netlify', 'datadog', 'grafana', 'prometheus', 'kafka',
  'rabbitmq', 'airflow', 'prefect', 'dagster', 'dbt', 'spark', 'flink',
  'hadoop', 'redshift', 'snowflake', 'bigquery', 'clickhouse', 'figma',
  'jira', 'notion', 'webpack', 'vite', 'rollup', 'esbuild',
];
const DB_KEYWORDS = [
  'postgresql', 'postgres', 'mysql', 'sqlite', 'mariadb', 'oracle',
  'mongodb', 'couchdb', 'firestore', 'redis', 'memcached', 'elasticsearch',
  'opensearch', 'cassandra', 'dynamodb', 'supabase', 'planetscale', 'neon',
  'cockroachdb', 'neo4j', 'pinecone', 'weaviate', 'qdrant', 'pgvector',
];
const ALL_CATEGORIZED = [
  ...LANG_KEYWORDS, ...FW_KEYWORDS, ...AI_ML_KEYWORDS, ...TOOL_KEYWORDS, ...DB_KEYWORDS,
];

const matchesAny = (skillName: string, keywords: string[]): boolean => {
  const lower = skillName.toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
};

/** Generate a tailored CV PDF and return the S3 key + ATS score */
async function generateVersionPDF(
  userId: string,
  profile: Record<string, unknown>,
  versionId: string,
  opts: {
    targetRole?: string;
    targetIndustry?: string;
    jobDescription?: string;
  }
): Promise<{ s3Key: string; atsScore: number }> {
  const skillsList: Array<{ name: string }> = (
    (profile.skills as Array<{ name: string } | string>) || []
  ).map((s) => (typeof s === 'string' ? { name: s } : s));

  const mappedExperience = (
    (profile.experience as Array<Record<string, unknown>>) || []
  ).map((exp) => ({
    company: (exp.company || exp.organization || '') as string,
    role: (exp.role || exp.title || exp.position || '') as string,
    startDate: (exp.startDate || '') as string,
    endDate: (exp.endDate || null) as string | null,
    location: (exp.location || '') as string,
    responsibilities: (
      Array.isArray(exp.responsibilities)
        ? exp.responsibilities
        : Array.isArray(exp.highlights)
        ? exp.highlights
        : Array.isArray(exp.achievements)
        ? exp.achievements
        : exp.description
        ? [exp.description]
        : []
    ) as string[],
    achievements: (
      Array.isArray(exp.achievements) ? exp.achievements : []
    ) as string[],
    technologies: (
      Array.isArray(exp.technologies) ? exp.technologies : []
    ) as string[],
  }));

  const mappedEducation = (
    (profile.education as Array<Record<string, unknown>>) || []
  ).map((edu) => ({
    institution: (edu.institution || edu.school || '') as string,
    degree: (edu.degree || '') as string,
    field: (edu.field || edu.major || edu.fieldOfStudy || '') as string,
    startDate: (edu.startDate || '') as string,
    endDate: (edu.endDate || null) as string | null,
    location: (edu.location || '') as string,
    gpa: edu.gpa ? String(edu.gpa) : undefined,
    honors: Array.isArray(edu.honors) ? (edu.honors as string[]) : [],
  }));

  const mappedProjects = (
    (profile.projects as Array<Record<string, unknown>>) || []
  ).map((p) => ({
    name: (p.name || p.title || '') as string,
    description: (p.description || '') as string,
    technologies: Array.isArray(p.technologies)
      ? (p.technologies as string[])
      : [],
    url: (p.url || p.link || undefined) as string | undefined,
    achievements: (
      Array.isArray(p.achievements)
        ? p.achievements
        : Array.isArray(p.highlights)
        ? p.highlights
        : []
    ) as string[],
  }));

  // Build a synthetic job listing if role/industry/JD provided
  const syntheticJob =
    opts.targetRole || opts.targetIndustry || opts.jobDescription
      ? {
          title: opts.targetRole || 'Software Engineer',
          company: opts.targetIndustry
            ? `${opts.targetIndustry} Company`
            : 'Target Company',
          description:
            opts.jobDescription ||
            `We are looking for a ${opts.targetRole || 'skilled professional'} in the ${opts.targetIndustry || 'technology'} industry.`,
          requirements: [] as string[],
        }
      : undefined;

  const cvInput: CVGeneratorInput = {
    profile: {
      name: (profile.name as string) || 'Unknown',
      email: (profile.email as string) || '',
      phone: (profile.phone as string) || '',
      location: (profile.location as string) || '',
      linkedin: (
        (profile.socialLinks as Array<{ platform: string; url: string }>) || []
      ).find((s) => s.platform === 'LinkedIn')?.url,
      github: (
        (profile.socialLinks as Array<{ platform: string; url: string }>) || []
      ).find((s) => s.platform === 'GitHub')?.url,
      website: (
        (profile.socialLinks as Array<{ platform: string; url: string }>) || []
      ).find(
        (s) => s.platform === 'Portfolio' || s.platform === 'Website'
      )?.url,
      title: (profile.headline as string) || opts.targetRole || '',
      summary: (profile.summary as string) || '',
      experience: mappedExperience,
      education: mappedEducation,
      skills: {
        languages: skillsList
          .filter((s) => matchesAny(s.name, LANG_KEYWORDS))
          .map((s) => s.name),
        frameworks: skillsList
          .filter(
            (s) =>
              !matchesAny(s.name, LANG_KEYWORDS) &&
              matchesAny(s.name, FW_KEYWORDS)
          )
          .map((s) => s.name),
        tools: skillsList
          .filter(
            (s) =>
              !matchesAny(s.name, LANG_KEYWORDS) &&
              !matchesAny(s.name, FW_KEYWORDS) &&
              !matchesAny(s.name, AI_ML_KEYWORDS)
          )
          .map((s) => s.name),
        methodologies: skillsList
          .filter((s) => matchesAny(s.name, AI_ML_KEYWORDS))
          .map((s) => s.name),
      },
      certifications: (Array.isArray(profile.certifications) ? profile.certifications : []).map(
        (c: Record<string, unknown>) => ({
          name: String(c.name ?? ''),
          issuer: String(c.issuer ?? ''),
          date: String(c.date ?? ''),
          url: c.url ? String(c.url) : undefined,
        })
      ),
      projects: mappedProjects,
    },
    jobListing: syntheticJob,
    templateName: 'modern-clean',
  };

  const prompt = cvGeneratorPrompt(cvInput);
  const generatedCV = await aiClient.completeJSON<GeneratedCV>(
    prompt.system,
    prompt.user,
    GeneratedCVSchema,
    { model: 'balanced' }
  );

  const cvContent: CVContent = {
    contactInfo: {
      name: generatedCV.header.name,
      email: generatedCV.header.email,
      phone: generatedCV.header.phone,
      location: generatedCV.header.location,
      linkedin: generatedCV.header.linkedin,
      github: generatedCV.header.github,
      website: generatedCV.header.website,
    },
    summary: generatedCV.summary,
    experience: generatedCV.experience.map((exp) => ({
      company: exp.company,
      position: exp.role,
      location: exp.location,
      startDate: exp.startDate,
      endDate: exp.endDate,
      highlights: exp.achievements,
    })),
    education: generatedCV.education.map((edu) => ({
      institution: edu.institution,
      degree: edu.degree,
      field: edu.field,
      location: edu.location,
      startDate: edu.startDate,
      endDate: edu.endDate ?? undefined,
      gpa: edu.gpa,
      honors: edu.honors,
    })),
    skills: {
      technical: [
        ...generatedCV.skills.languages,
        ...generatedCV.skills.frameworks,
        ...generatedCV.skills.tools,
      ],
      soft: [],
      certifications: generatedCV.certifications?.map(
        (c) => `${c.name} (${c.issuer})`
      ),
    },
    projects: generatedCV.projects?.map((p) => ({
      name: p.name,
      description: p.description,
      technologies: p.technologies,
      link: p.url,
      highlights: p.achievements,
    })),
    awards: profile.awards as CVContent['awards'],
  };

  const html = modernCleanTemplate(cvContent);
  const pdfBuffer = await htmlToPdf(html);

  const s3Key = `users/${userId}/documents/versions/cv-${versionId}.pdf`;
  await storage.uploadFile(s3Key, pdfBuffer, 'application/pdf');

  const atsResult = checkATS(
    cvContent,
    opts.jobDescription ||
      (syntheticJob ? syntheticJob.description : undefined)
  );

  return { s3Key, atsScore: atsResult.score };
}

// ─── GET ──────────────────────────────────────────────────────────────────────

/**
 * GET /api/documents/versions
 * List all named CV versions for the authenticated user.
 * Each entry includes a short-lived presigned download URL.
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);
    logger.info({ userId }, 'List CV versions request');

    const index = await loadVersionIndex(userId);

    const versionsWithUrls = await Promise.all(
      index.versions.map(async (v) => {
        const downloadUrl = await storage
          .getPresignedUrl(v.s3Key, 3600)
          .catch(() => null);
        return { ...v, downloadUrl };
      })
    );

    return successResponse({ versions: versionsWithUrls, total: versionsWithUrls.length });
  } catch (error) {
    logger.error({ error }, 'List CV versions error');
    return handleError(error);
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────

/**
 * POST /api/documents/versions
 * Body: { action: 'create-version', ... } | { action: 'compare-ats', ... }
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);
    const body: unknown = await req.json();

    const parsed = postBodySchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        `Invalid request: ${parsed.error.issues.map((i) => i.message).join(', ')}`,
        400,
        'VALIDATION_ERROR'
      );
    }

    // ── action: create-version ─────────────────────────────────────────────
    if (parsed.data.action === 'create-version') {
      const { name, description, targetRole, targetIndustry, jobDescription } =
        parsed.data;

      logger.info({ userId, name, targetRole, targetIndustry }, 'Create CV version');

      const profile = await storage.getJSON<Record<string, unknown>>(
        `users/${userId}/profile.json`
      );
      if (!profile) {
        return errorResponse('Profile not found', 404, 'PROFILE_NOT_FOUND');
      }

      const versionId = generateId();

      const { s3Key, atsScore } = await generateVersionPDF(
        userId,
        profile,
        versionId,
        { targetRole, targetIndustry, jobDescription }
      );

      const newVersion: CVVersion = {
        id: versionId,
        name,
        description,
        targetRole,
        targetIndustry,
        createdAt: new Date().toISOString(),
        s3Key,
        atsScore,
      };

      const index = await loadVersionIndex(userId);
      index.versions.push(newVersion);
      await saveVersionIndex(userId, index);

      const downloadUrl = await storage
        .getPresignedUrl(s3Key, 3600)
        .catch(() => null);

      logger.info({ userId, versionId, atsScore }, 'CV version created');

      return successResponse(
        { version: { ...newVersion, downloadUrl } },
        201
      );
    }

    // ── action: compare-ats ────────────────────────────────────────────────
    if (parsed.data.action === 'compare-ats') {
      const { versionIds, jobDescription } = parsed.data;

      logger.info({ userId, versionIds }, 'Compare ATS for CV versions');

      const index = await loadVersionIndex(userId);
      const profile = await storage.getJSON<Record<string, unknown>>(
        `users/${userId}/profile.json`
      );
      if (!profile) {
        return errorResponse('Profile not found', 404, 'PROFILE_NOT_FOUND');
      }

      const baseCVContent = buildCVContentFromProfile(profile);

      const comparisons = await Promise.all(
        versionIds.map(async (versionId) => {
          const version = index.versions.find((v) => v.id === versionId);
          if (!version) {
            return {
              versionId,
              name: 'Unknown version',
              atsScore: 0,
              missingKeywords: [] as string[],
              improvements: [] as string[],
            };
          }

          // Run ATS check on user profile content (best approximation without re-parsing PDF)
          const atsResult = checkATS(baseCVContent, jobDescription);

          // Extract missing keywords from the job description
          const jobWords = (
            jobDescription.match(/\b[a-zA-Z][a-zA-Z+#.]{2,}\b/g) || []
          )
            .map((w) => w.toLowerCase())
            .filter((w) => w.length > 3);

          const STOP_WORDS = new Set([
            'with', 'this', 'that', 'have', 'will', 'from', 'they', 'what',
            'when', 'your', 'more', 'also', 'been', 'were', 'their', 'which',
            'about', 'into', 'than',
          ]);

          const cvText = [
            baseCVContent.summary,
            ...(baseCVContent.experience || []).flatMap(
              (e) => e.highlights || []
            ),
            ...(Object.values(baseCVContent.skills || {}).flat() as string[]),
          ]
            .join(' ')
            .toLowerCase();

          const missingKeywords = [...new Set(jobWords)]
            .filter((w) => !STOP_WORDS.has(w) && !cvText.includes(w))
            .slice(0, 8);

          const improvements = atsResult.overallSuggestions.slice(0, 3);

          // Use stored atsScore if the version was created with a JD, otherwise use freshly computed one
          const finalScore =
            version.atsScore !== undefined
              ? version.atsScore
              : atsResult.score;

          return {
            versionId,
            name: version.name,
            atsScore: finalScore,
            missingKeywords,
            improvements,
          };
        })
      );

      // Sort highest score first
      comparisons.sort((a, b) => b.atsScore - a.atsScore);

      return successResponse({ comparisons });
    }

    // Discriminated union is exhaustive — this path is unreachable at runtime
    throw new AppError('Unhandled action', 400, 'BAD_REQUEST');
  } catch (error) {
    logger.error({ error }, 'CV versions POST error');
    return handleError(error);
  }
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

/**
 * DELETE /api/documents/versions?id=<versionId>
 * Removes a version from the index and deletes the PDF from S3.
 */
export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);

    const { searchParams } = new URL(req.url);
    const parsed = deleteSchema.safeParse({ id: searchParams.get('id') });
    if (!parsed.success) {
      return errorResponse('Missing or invalid version id', 400, 'VALIDATION_ERROR');
    }
    const { id } = parsed.data;

    logger.info({ userId, id }, 'Delete CV version request');

    const index = await loadVersionIndex(userId);
    const versionIdx = index.versions.findIndex((v) => v.id === id);

    if (versionIdx === -1) {
      return errorResponse('Version not found', 404, 'VERSION_NOT_FOUND');
    }

    const [version] = index.versions.splice(versionIdx, 1);
    await saveVersionIndex(userId, index);

    // Best-effort S3 deletion — do not surface errors to client
    await storage.deleteJSON(version.s3Key).catch((err: unknown) => {
      logger.warn({ err, s3Key: version.s3Key }, 'Failed to delete version PDF from S3');
    });

    logger.info({ userId, id }, 'CV version deleted');

    return successResponse({ deleted: true, id });
  } catch (error) {
    logger.error({ error }, 'Delete CV version error');
    return handleError(error);
  }
}
