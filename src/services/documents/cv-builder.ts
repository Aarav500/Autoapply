import { generateId } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { AppError } from '@/lib/errors';
import { storage } from '@/lib/storage';
import { aiClient } from '@/lib/ai-client';
import { cvGeneratorPrompt, CVGeneratorInput } from '@/prompts/cv-generator';
import { GeneratedCVSchema, GeneratedCV } from '@/types/ai';
import { CVContent, Document, DocumentIndex } from '@/types/documents';
import { modernCleanTemplate } from './templates/modern-clean';
import { minimalTemplate } from './templates/minimal';
import { executiveTemplate } from './templates/executive';
import { technicalTemplate } from './templates/technical';
import { htmlToPdf } from './pdf-generator';
import { contentToDocx } from './docx-generator';
import { checkATS } from './ats-checker';

export type TemplateName = 'modern-clean' | 'minimal' | 'executive' | 'technical';

export function renderCVTemplate(content: CVContent, templateName: TemplateName): string {
  switch (templateName) {
    case 'minimal':
      return minimalTemplate(content);
    case 'executive':
      return executiveTemplate(content);
    case 'technical':
      return technicalTemplate(content);
    case 'modern-clean':
    default:
      return modernCleanTemplate(content);
  }
}

interface GenerateCVOptions {
  userId: string;
  jobId?: string;
  templateName?: string;
}

interface RegenerateCVOptions {
  userId: string;
  templateName?: string;
  editedContent: {
    summary: string;
    bullets: Record<number, string[]>;
    skills: string[];
  };
}

interface RegenerateCVResult {
  documentId: string;
  pdfUrl: string;
  docxUrl: string;
  atsScore: number;
}

/**
 * Regenerate a CV PDF from user-edited content, merging edits into the existing profile structure
 */
export async function regenerateCVFromEdits(options: RegenerateCVOptions): Promise<RegenerateCVResult> {
  const { userId, templateName = 'modern-clean', editedContent } = options;

  try {
    logger.info({ userId, templateName }, 'Regenerating CV from edited content');

    // Load existing profile for contact info and structure
    const profile = await storage.getJSON<Record<string, unknown>>(`users/${userId}/profile.json`);
    if (!profile) {
      throw new AppError('Profile not found', 404, 'PROFILE_NOT_FOUND');
    }

    // Load the most recent CV to get existing structure
    const indexKey = `users/${userId}/documents/index.json`;
    const index = await storage.getJSON<DocumentIndex>(indexKey);
    const existingCV = index?.documents
      .filter(d => d.type === 'cv')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    // Build CVContent merging profile data with edits
    const socialLinks = (profile.socialLinks as Array<{ platform: string; url: string }>) || [];

    const profileExperience = (profile.experience as Array<Record<string, unknown>>) || [];
    const mergedExperience = profileExperience.map((exp, idx) => ({
      company: String(exp.company || exp.organization || ''),
      position: String(exp.role || exp.title || exp.position || ''),
      location: exp.location ? String(exp.location) : undefined,
      startDate: String(exp.startDate || ''),
      endDate: exp.endDate ? String(exp.endDate) : null,
      highlights: editedContent.bullets[idx] || (
        Array.isArray(exp.responsibilities) ? (exp.responsibilities as string[]) :
        Array.isArray(exp.highlights) ? (exp.highlights as string[]) :
        exp.description ? [String(exp.description)] : []
      ),
    }));

    const profileEducation = (profile.education as Array<Record<string, unknown>>) || [];
    const mappedEducation = profileEducation.map(edu => ({
      institution: String(edu.institution || edu.school || ''),
      degree: String(edu.degree || ''),
      field: String(edu.field || edu.major || edu.fieldOfStudy || ''),
      location: edu.location ? String(edu.location) : undefined,
      startDate: edu.startDate ? String(edu.startDate) : undefined,
      endDate: edu.endDate ? String(edu.endDate) : undefined,
      gpa: edu.gpa ? String(edu.gpa) : undefined,
      honors: Array.isArray(edu.honors) ? (edu.honors as string[]) : [],
    }));

    const profileProjects = (profile.projects as Array<Record<string, unknown>>) || [];
    const mappedProjects = profileProjects.map(p => ({
      name: String(p.name || p.title || ''),
      description: String(p.description || ''),
      technologies: Array.isArray(p.technologies) ? (p.technologies as string[]) : [],
      link: p.url ? String(p.url) : (p.link ? String(p.link) : undefined),
      highlights: Array.isArray(p.achievements) ? (p.achievements as string[]) :
        Array.isArray(p.highlights) ? (p.highlights as string[]) : [],
    }));

    const cvContent: CVContent = {
      contactInfo: {
        name: String(profile.name || ''),
        email: String(profile.email || ''),
        phone: profile.phone ? String(profile.phone) : undefined,
        location: profile.location ? String(profile.location) : undefined,
        linkedin: socialLinks.find(s => s.platform === 'LinkedIn')?.url,
        github: socialLinks.find(s => s.platform === 'GitHub')?.url,
        website: socialLinks.find(s => s.platform === 'Portfolio' || s.platform === 'Website')?.url,
      },
      summary: editedContent.summary,
      experience: mergedExperience,
      education: mappedEducation,
      skills: {
        technical: editedContent.skills,
        soft: [],
      },
      projects: mappedProjects,
      awards: Array.isArray(profile.awards) ? (profile.awards as CVContent['awards']) : undefined,
    };

    const resolvedTemplate = (templateName as TemplateName) in { 'modern-clean': 1, minimal: 1, executive: 1, technical: 1 }
      ? (templateName as TemplateName)
      : 'modern-clean' as TemplateName;

    const html = renderCVTemplate(cvContent, resolvedTemplate);

    const [pdfBuffer, docxBuffer] = await Promise.all([
      htmlToPdf(html),
      contentToDocx(cvContent),
    ]);

    const atsResult = checkATS(cvContent);
    const documentId = generateId();
    const pdfKey = `users/${userId}/documents/cv/${documentId}.pdf`;
    const docxKey = `users/${userId}/documents/cv/${documentId}.docx`;

    await Promise.all([
      storage.uploadFile(pdfKey, pdfBuffer, 'application/pdf'),
      storage.uploadFile(docxKey, docxBuffer, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
    ]);

    const storedIndex = await storage.getJSON<DocumentIndex>(indexKey) || {
      documents: [],
      lastUpdated: new Date().toISOString(),
    };

    const now = new Date().toISOString();
    const document: Document = {
      id: documentId,
      userId,
      type: 'cv',
      name: existingCV ? `CV - Edited (${resolvedTemplate})` : `CV - ${resolvedTemplate}`,
      description: 'CV regenerated from manual edits',
      templateName: resolvedTemplate,
      createdAt: now,
      updatedAt: now,
      files: { pdf: pdfKey, docx: docxKey },
      metadata: {
        atsScore: atsResult.score,
        wordCount: cvContent.summary.split(/\s+/).length +
          cvContent.experience.flatMap(e => e.highlights).join(' ').split(/\s+/).length,
        pageCount: 1,
      },
    };

    storedIndex.documents.push(document);
    storedIndex.lastUpdated = now;
    await storage.putJSON(indexKey, storedIndex);

    const [pdfUrl, docxUrl] = await Promise.all([
      storage.getPresignedUrl(pdfKey, 3600),
      storage.getPresignedUrl(docxKey, 3600),
    ]);

    return { documentId, pdfUrl, docxUrl, atsScore: atsResult.score };
  } catch (error) {
    logger.error({ error, userId }, 'Failed to regenerate CV from edits');
    throw error instanceof AppError ? error : new AppError('Failed to regenerate CV', 500, 'CV_REGENERATION_FAILED');
  }
}

interface GenerateCVResult {
  documentId: string;
  pdfUrl: string;
  docxUrl: string;
  atsScore: number;
}

/**
 * Generate a CV (both PDF and DOCX) for a user, optionally tailored to a job
 */
export async function generateCV(options: GenerateCVOptions): Promise<GenerateCVResult> {
  const { userId, jobId, templateName = 'modern-clean' } = options;

  try {
    logger.info({ userId, jobId, templateName });

    // 1. Load user profile
    const profile = await storage.getJSON<any>(`users/${userId}/profile.json`);
    if (!profile) {
      throw new AppError('Profile not found', 404, 'PROFILE_NOT_FOUND');
    }

    // 2. Load job details if jobId provided
    let jobListing;
    if (jobId) {
      jobListing = await storage.getJSON<any>(`users/${userId}/jobs/${jobId}.json`);
      if (!jobListing) {
        throw new AppError('Job not found', 404, 'JOB_NOT_FOUND');
      }
    }

    // 3. Prepare input for AI CV generator
    // Map skills array - handle both {name: string} objects and plain strings
    const skillsList: Array<{name: string}> = (profile.skills || []).map((s: string | {name: string}) =>
      typeof s === 'string' ? { name: s } : s
    );

    // Map experience - handle both 'responsibilities' and 'description' fields
    const mappedExperience = (profile.experience || []).map((exp: Record<string, unknown>) => ({
      company: exp.company || exp.organization || '',
      role: exp.role || exp.title || exp.position || '',
      startDate: exp.startDate || '',
      endDate: exp.endDate || null,
      location: exp.location || '',
      responsibilities: Array.isArray(exp.responsibilities) ? exp.responsibilities :
        Array.isArray(exp.highlights) ? exp.highlights :
        Array.isArray(exp.achievements) ? exp.achievements :
        exp.description ? [exp.description] : [],
      achievements: Array.isArray(exp.achievements) ? exp.achievements : [],
      technologies: Array.isArray(exp.technologies) ? exp.technologies : [],
    }));

    // Map education
    const mappedEducation = (profile.education || []).map((edu: Record<string, unknown>) => ({
      institution: edu.institution || edu.school || '',
      degree: edu.degree || '',
      field: edu.field || edu.major || edu.fieldOfStudy || '',
      startDate: edu.startDate || '',
      endDate: edu.endDate || null,
      location: edu.location || '',
      gpa: edu.gpa ? String(edu.gpa) : undefined,
      honors: Array.isArray(edu.honors) ? edu.honors : [],
    }));

    // Map projects
    const mappedProjects = (profile.projects || []).map((p: Record<string, unknown>) => ({
      name: p.name || p.title || '',
      description: p.description || '',
      technologies: Array.isArray(p.technologies) ? p.technologies : [],
      url: p.url || p.link || undefined,
      achievements: Array.isArray(p.achievements) ? p.achievements :
        Array.isArray(p.highlights) ? p.highlights : [],
    }));

    // ── Skill categorization keyword lists ──────────────────────────────────
    const LANG_KEYWORDS = [
      // Classic
      'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'ruby', 'php', 'c',
      // Modern systems
      'go', 'golang', 'rust', 'kotlin', 'swift', 'scala',
      // Data / scientific
      'r', 'matlab', 'julia', 'octave',
      // Mobile / other
      'dart', 'lua', 'haskell', 'elixir', 'clojure', 'erlang', 'f#', 'ocaml',
      // Query / markup
      'sql', 'graphql', 'bash', 'shell', 'powershell', 'groovy', 'perl', 'cobol', 'fortran',
      // Newer
      'zig', 'nim', 'crystal', 'solidity', 'move', 'vyper',
    ];

    const FW_KEYWORDS = [
      // JS / TS front-end
      'react', 'vue', 'angular', 'svelte', 'solid', 'qwik', 'htmx', 'astro', 'remix',
      // JS / TS meta-frameworks
      'next.js', 'nextjs', 'nuxt', 'gatsby', 'sveltekit',
      // JS / TS back-end
      'express', 'nest.js', 'nestjs', 'fastify', 'hapi', 'koa', 'elysia', 'hono',
      // Python
      'django', 'flask', 'fastapi', 'starlette', 'tornado', 'litestar',
      // JVM
      'spring', 'spring boot', 'quarkus', 'micronaut', 'ktor',
      // Ruby
      'rails', 'sinatra',
      // PHP
      'laravel', 'symfony',
      // Mobile
      'flutter', 'react native', 'expo', 'swiftui', 'jetpack compose',
      // Testing
      'jest', 'vitest', 'pytest', 'cypress', 'playwright', 'selenium', 'mocha', 'rspec',
    ];

    const AI_ML_KEYWORDS = [
      // Core numeric / ML libs
      'pytorch', 'tensorflow', 'keras', 'scikit-learn', 'sklearn', 'pandas', 'numpy',
      'scipy', 'matplotlib', 'seaborn', 'plotly',
      // Boosting
      'xgboost', 'lightgbm', 'catboost',
      // LLM / GenAI
      'langchain', 'llamaindex', 'llama index', 'openai', 'anthropic', 'huggingface',
      'hugging face', 'transformers', 'diffusers', 'sentence-transformers',
      // Orchestration / tracking
      'mlflow', 'wandb', 'weights & biases', 'optuna', 'ray', 'ray tune',
      // Distributed data science
      'dask', 'spark ml', 'pyspark',
      // Concepts / roles
      'computer vision', 'nlp', 'natural language processing', 'llm', 'rag',
      'fine-tuning', 'reinforcement learning', 'deep learning', 'machine learning',
      // Generative model names
      'stable diffusion', 'midjourney', 'gpt', 'claude', 'gemini', 'bert',
      'gpt-4', 'llama', 'mistral', 'falcon',
    ];

    const TOOL_KEYWORDS = [
      // Version control
      'git', 'github', 'gitlab', 'bitbucket', 'mercurial',
      // CI/CD
      'github actions', 'gitlab ci', 'circleci', 'jenkins', 'teamcity', 'travis ci', 'argocd',
      // Containers / orchestration
      'docker', 'kubernetes', 'k8s', 'helm', 'podman', 'containerd',
      // IaC
      'terraform', 'pulumi', 'ansible', 'chef', 'puppet', 'crossplane',
      // Cloud platforms
      'aws', 'azure', 'gcp', 'google cloud', 'cloudflare', 'vercel', 'netlify', 'fly.io',
      // Observability
      'datadog', 'newrelic', 'splunk', 'grafana', 'prometheus', 'loki', 'tempo',
      'opentelemetry', 'jaeger', 'pagerduty', 'sentry',
      // Messaging / streaming
      'kafka', 'rabbitmq', 'sqs', 'pubsub', 'nats', 'pulsar',
      // Data pipeline / orchestration
      'airflow', 'prefect', 'dagster', 'luigi', 'dbt', 'fivetran', 'airbyte',
      'great expectations',
      // Big-data / analytics
      'spark', 'flink', 'hadoop', 'hive', 'presto', 'trino', 'databricks', 'duckdb',
      // Data warehouses
      'redshift', 'snowflake', 'bigquery', 'synapse', 'clickhouse',
      // Design / product
      'figma', 'sketch', 'adobe xd', 'jira', 'confluence', 'notion', 'linear',
      // Misc dev tools
      'webpack', 'vite', 'rollup', 'esbuild', 'turbopack', 'nx', 'turborepo',
    ];

    const DB_KEYWORDS = [
      // Relational
      'postgresql', 'postgres', 'mysql', 'sqlite', 'mariadb', 'oracle', 'mssql',
      // NoSQL document
      'mongodb', 'couchdb', 'firestore',
      // Key-value / cache
      'redis', 'memcached', 'valkey',
      // Search
      'elasticsearch', 'opensearch', 'solr', 'typesense',
      // Wide-column
      'cassandra', 'hbase', 'bigtable',
      // Managed / serverless
      'dynamodb', 'supabase', 'planetscale', 'neon', 'cockroachdb', 'tidb',
      'timescaledb', 'questdb',
      // Graph
      'neo4j', 'arangodb', 'neptune',
      // Vector
      'pinecone', 'weaviate', 'qdrant', 'chroma', 'pgvector',
    ];

    // All non-language categorized keywords (used for "tools" fallback exclusion)
    const ALL_CATEGORIZED = [
      ...LANG_KEYWORDS, ...FW_KEYWORDS, ...AI_ML_KEYWORDS, ...TOOL_KEYWORDS, ...DB_KEYWORDS,
    ];

    const matchesAny = (skillName: string, keywords: string[]): boolean => {
      const lower = skillName.toLowerCase();
      return keywords.some(kw => lower.includes(kw));
    };

    const cvInput: CVGeneratorInput = {
      profile: {
        name: profile.name || 'Unknown',
        email: profile.email || '',
        phone: profile.phone || '',
        location: profile.location || '',
        linkedin: profile.socialLinks?.find((s: { platform: string; url: string }) => s.platform === 'LinkedIn')?.url,
        github: profile.socialLinks?.find((s: { platform: string; url: string }) => s.platform === 'GitHub')?.url,
        website: profile.socialLinks?.find((s: { platform: string; url: string }) => s.platform === 'Portfolio' || s.platform === 'Website')?.url,
        title: profile.headline || '',
        summary: profile.summary || '',
        experience: mappedExperience,
        education: mappedEducation,
        skills: {
          languages: skillsList
            .filter(s => matchesAny(s.name, LANG_KEYWORDS))
            .map(s => s.name),
          frameworks: skillsList
            .filter(s => !matchesAny(s.name, LANG_KEYWORDS) && matchesAny(s.name, FW_KEYWORDS))
            .map(s => s.name),
          tools: skillsList
            .filter(s => !matchesAny(s.name, ALL_CATEGORIZED.filter(k => !TOOL_KEYWORDS.includes(k))) || matchesAny(s.name, [...TOOL_KEYWORDS, ...DB_KEYWORDS]))
            .filter(s => !matchesAny(s.name, LANG_KEYWORDS) && !matchesAny(s.name, FW_KEYWORDS) && !matchesAny(s.name, AI_ML_KEYWORDS))
            .map(s => s.name),
          methodologies: skillsList
            .filter(s => matchesAny(s.name, AI_ML_KEYWORDS))
            .map(s => s.name),
        },
        certifications: profile.certifications || [],
        projects: mappedProjects,
      },
      jobListing: jobListing ? {
        title: jobListing.title,
        company: jobListing.company,
        description: jobListing.description,
        requirements: jobListing.requirements || [],
      } : undefined,
      templateName,
    };

    // 4. Call AI to generate optimized CV content
    logger.info('Calling AI to generate CV content');
    const prompt = cvGeneratorPrompt(cvInput);
    const generatedCV = await aiClient.completeJSON<GeneratedCV>(
      prompt.system,
      prompt.user,
      GeneratedCVSchema,
      { model: 'balanced' }
    );

    // 5. Convert AI output to CVContent format
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
      experience: generatedCV.experience.map(exp => ({
        company: exp.company,
        position: exp.role,
        location: exp.location,
        startDate: exp.startDate,
        endDate: exp.endDate,
        highlights: exp.achievements,
      })),
      education: generatedCV.education.map(edu => ({
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
        soft: profile.skills?.soft || [],
        languages: profile.skills?.languages,
        certifications: generatedCV.certifications?.map(c => `${c.name} (${c.issuer})`),
      },
      projects: generatedCV.projects?.map(p => ({
        name: p.name,
        description: p.description,
        technologies: p.technologies,
        link: p.url,
        highlights: p.achievements,
      })),
      awards: profile.awards,
    };

    // 6. Render HTML using template
    const resolvedTemplateName = (templateName as TemplateName) in { 'modern-clean': 1, minimal: 1, executive: 1, technical: 1 }
      ? (templateName as TemplateName)
      : 'modern-clean' as TemplateName;
    const html = renderCVTemplate(cvContent, resolvedTemplateName);

    // 7. Generate PDF and DOCX
    logger.info('Generating PDF and DOCX files');
    const [pdfBuffer, docxBuffer] = await Promise.all([
      htmlToPdf(html),
      contentToDocx(cvContent),
    ]);

    // 8. Calculate ATS score
    const atsResult = checkATS(cvContent, jobListing?.description);

    // 9. Upload files to S3
    const documentId = generateId();
    const pdfKey = `users/${userId}/documents/cv/${documentId}.pdf`;
    const docxKey = `users/${userId}/documents/cv/${documentId}.docx`;

    await Promise.all([
      storage.uploadFile(pdfKey, pdfBuffer, 'application/pdf'),
      storage.uploadFile(docxKey, docxBuffer, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
    ]);

    // 10. Update documents index
    const indexKey = `users/${userId}/documents/index.json`;
    const index = await storage.getJSON<DocumentIndex>(indexKey) || {
      documents: [],
      lastUpdated: new Date().toISOString(),
    };

    const now = new Date().toISOString();
    const document: Document = {
      id: documentId,
      userId,
      type: 'cv',
      name: jobListing ? `CV - ${jobListing.company} - ${jobListing.title}` : 'CV - General',
      description: jobListing ? `Tailored CV for ${jobListing.company}` : 'General purpose CV',
      jobId,
      templateName,
      createdAt: now,
      updatedAt: now,
      files: {
        pdf: pdfKey,
        docx: docxKey,
      },
      metadata: {
        atsScore: atsResult.score,
        wordCount: cvContent.summary.split(/\s+/).length +
          cvContent.experience.flatMap(e => e.highlights).join(' ').split(/\s+/).length,
        pageCount: 1, // Estimate - could be calculated from PDF
      },
    };

    index.documents.push(document);
    index.lastUpdated = now;
    await storage.putJSON(indexKey, index);

    // 11. Generate presigned URLs for download
    const [pdfUrl, docxUrl] = await Promise.all([
      storage.getPresignedUrl(pdfKey, 3600),
      storage.getPresignedUrl(docxKey, 3600),
    ]);

    logger.info({
      documentId,
      atsScore: atsResult.score,
      pdfSizeBytes: pdfBuffer.length,
      docxSizeBytes: docxBuffer.length,
    });

    return {
      documentId,
      pdfUrl,
      docxUrl,
      atsScore: atsResult.score,
    };
  } catch (error) {
    logger.error({ error, userId, jobId });
    throw error instanceof AppError ? error : new AppError(
      'Failed to generate CV',
      500,
      'CV_GENERATION_FAILED'
    );
  }
}
