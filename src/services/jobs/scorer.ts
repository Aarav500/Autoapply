import { RawJob, ScoredJob, JobMatchAnalysis } from '@/types/job';
import { Profile, Education } from '@/types/profile';
import { aiClient } from '@/lib/ai-client';
import { jobMatcherPrompt } from '@/lib/prompts/job-matcher';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const JobMatchSchema = z.object({
  matchScore: z.number().min(0).max(100),
  strengths: z.array(z.string()),
  concerns: z.array(z.string()),
  missingSkills: z.array(z.string()),
  recommendations: z.array(z.string()),
});

/**
 * Map of skills to their related/transferable skill keywords.
 * Used for generous matching so that e.g. "Python" also matches
 * "programming", "scripting", "coding", etc.
 */
const TRANSFERABLE_SKILLS_MAP: Record<string, string[]> = {
  python: ['programming', 'scripting', 'coding', 'software', 'developer', 'data analysis', 'automation'],
  javascript: ['programming', 'coding', 'web development', 'frontend', 'software', 'developer', 'typescript'],
  typescript: ['programming', 'coding', 'web development', 'frontend', 'software', 'developer', 'javascript'],
  java: ['programming', 'coding', 'software', 'developer', 'backend', 'object-oriented'],
  'c++': ['programming', 'coding', 'software', 'developer', 'systems', 'low-level'],
  c: ['programming', 'coding', 'software', 'developer', 'systems', 'embedded'],
  react: ['frontend', 'web development', 'ui', 'user interface', 'javascript', 'component'],
  angular: ['frontend', 'web development', 'ui', 'user interface', 'javascript', 'typescript'],
  vue: ['frontend', 'web development', 'ui', 'user interface', 'javascript'],
  node: ['backend', 'server', 'javascript', 'api', 'web development'],
  sql: ['database', 'data', 'queries', 'analytics', 'data analysis'],
  excel: ['data analysis', 'spreadsheet', 'analytics', 'reporting', 'data'],
  html: ['web development', 'frontend', 'web design', 'ui'],
  css: ['web development', 'frontend', 'web design', 'ui', 'styling'],
  git: ['version control', 'collaboration', 'software development'],
  linux: ['operating systems', 'command line', 'system administration', 'devops'],
  aws: ['cloud', 'infrastructure', 'devops', 'cloud computing'],
  docker: ['containerization', 'devops', 'deployment', 'infrastructure'],
  figma: ['design', 'ui', 'ux', 'prototyping', 'user interface'],
  photoshop: ['design', 'graphic design', 'visual', 'creative'],
  'machine learning': ['ai', 'data science', 'statistics', 'modeling', 'analytics'],
  'data analysis': ['analytics', 'statistics', 'reporting', 'insights', 'excel', 'sql'],
  communication: ['teamwork', 'collaboration', 'presentation', 'writing', 'interpersonal'],
  leadership: ['management', 'teamwork', 'project management', 'mentoring'],
  teamwork: ['collaboration', 'communication', 'interpersonal', 'team player'],
  'problem solving': ['analytical', 'critical thinking', 'troubleshooting', 'debugging'],
  research: ['analysis', 'analytical', 'data', 'investigation', 'academic'],
  writing: ['communication', 'content', 'documentation', 'copywriting', 'editing'],
  go: ['golang', 'backend', 'server', 'systems', 'concurrent programming', 'microservices'],
  golang: ['go', 'backend', 'server', 'systems', 'concurrent programming', 'microservices'],
  rust: ['systems', 'low-level', 'performance', 'memory safety', 'embedded', 'webassembly'],
  kotlin: ['android', 'jvm', 'java', 'mobile', 'backend', 'spring'],
  swift: ['ios', 'macos', 'apple', 'mobile', 'xcode'],
  ruby: ['rails', 'web development', 'backend', 'api', 'scripting'],
  php: ['web development', 'backend', 'laravel', 'wordpress'],
  scala: ['functional programming', 'jvm', 'spark', 'big data', 'distributed'],
  terraform: ['infrastructure as code', 'iac', 'devops', 'cloud', 'aws', 'gcp', 'azure'],
  kubernetes: ['k8s', 'container orchestration', 'devops', 'deployment', 'cloud native'],
  k8s: ['kubernetes', 'container orchestration', 'devops', 'deployment'],
  redis: ['caching', 'database', 'nosql', 'in-memory', 'session management'],
  graphql: ['api', 'rest', 'web development', 'backend', 'schema'],
  'next.js': ['react', 'frontend', 'web development', 'ssr', 'javascript'],
  nextjs: ['react', 'frontend', 'web development', 'ssr', 'javascript'],
  'nest.js': ['node', 'backend', 'typescript', 'api', 'microservices'],
  nestjs: ['node', 'backend', 'typescript', 'api', 'microservices'],
  django: ['python', 'web development', 'backend', 'api', 'framework'],
  flask: ['python', 'web development', 'backend', 'api', 'microservices'],
  fastapi: ['python', 'web development', 'backend', 'api', 'async'],
  spring: ['java', 'backend', 'enterprise', 'api', 'microservices'],
  express: ['node', 'backend', 'javascript', 'api', 'web development'],
  svelte: ['frontend', 'web development', 'javascript', 'ui'],
  pytorch: ['machine learning', 'deep learning', 'ai', 'neural network', 'python'],
  tensorflow: ['machine learning', 'deep learning', 'ai', 'neural network', 'python'],
  pandas: ['data analysis', 'python', 'data science', 'statistics'],
  numpy: ['data analysis', 'python', 'scientific computing', 'mathematics'],
  'scikit-learn': ['machine learning', 'python', 'data science', 'statistics', 'modeling'],
  r: ['statistics', 'data analysis', 'data science', 'research', 'analytics'],
  spark: ['big data', 'distributed computing', 'data engineering', 'scala', 'python'],
  hadoop: ['big data', 'distributed computing', 'data engineering', 'mapreduce'],
  dbt: ['data engineering', 'analytics', 'sql', 'data transformation', 'data pipeline'],
  airflow: ['data pipeline', 'workflow orchestration', 'data engineering', 'python'],
  mlflow: ['machine learning', 'mlops', 'model tracking', 'python'],
  elasticsearch: ['search', 'database', 'nosql', 'log analysis', 'analytics'],
  prometheus: ['monitoring', 'devops', 'observability', 'metrics', 'alerting'],
  grafana: ['monitoring', 'dashboards', 'observability', 'visualization', 'devops'],
  tailwind: ['css', 'frontend', 'web development', 'ui', 'styling'],
  mongodb: ['database', 'nosql', 'document store', 'backend'],
  postgresql: ['database', 'sql', 'relational database', 'backend'],
  postgres: ['database', 'sql', 'relational database', 'backend'],
  dynamodb: ['aws', 'database', 'nosql', 'cloud', 'serverless'],
  azure: ['cloud', 'microsoft', 'infrastructure', 'devops', 'cloud computing'],
  gcp: ['cloud', 'google cloud', 'infrastructure', 'devops', 'cloud computing'],
  'google cloud': ['gcp', 'cloud', 'infrastructure', 'devops'],
  grpc: ['api', 'microservices', 'backend', 'protocol buffers', 'distributed systems'],
  kafka: ['message queue', 'streaming', 'event driven', 'distributed systems', 'data pipeline'],
  rabbitmq: ['message queue', 'backend', 'event driven', 'microservices'],
  ansible: ['devops', 'automation', 'infrastructure', 'configuration management'],
  'ci/cd': ['devops', 'continuous integration', 'deployment', 'automation', 'jenkins', 'github actions'],
  jenkins: ['ci/cd', 'devops', 'automation', 'build tools'],
  github: ['version control', 'git', 'collaboration', 'open source'],
  'system design': ['architecture', 'distributed systems', 'scalability', 'backend'],
  'data structures': ['algorithms', 'computer science', 'programming', 'problem solving'],
  algorithms: ['data structures', 'computer science', 'programming', 'problem solving'],
};

/** Keywords in job title/description that indicate student-friendly positions */
const STUDENT_JOB_TYPE_KEYWORDS = [
  'intern', 'internship', 'co-op', 'coop', 'on-campus', 'on campus',
  'work-study', 'work study', 'fellowship', 'apprentice', 'apprenticeship',
  'student worker', 'student assistant', 'campus ambassador', 'student position',
  'part-time student', 'undergraduate', 'graduate assistant',
];

/** Keywords that indicate entry-level / no-experience-required positions */
const ENTRY_LEVEL_KEYWORDS = [
  'entry-level', 'entry level', 'junior', 'associate',
  'no experience required', 'no experience necessary', 'no prior experience',
  '0-1 years', '0-2 years', '0 - 1 year', '0 - 2 year',
  'recent graduate', 'new grad', 'early career',
  'student', 'intern', 'trainee',
];

const TIER1_COMPANIES = new Set([
  'google', 'meta', 'microsoft', 'amazon', 'apple', 'netflix', 'openai',
  'anthropic', 'deepmind', 'nvidia', 'salesforce', 'adobe', 'uber', 'airbnb',
  'stripe', 'palantir', 'spacex', 'tesla', 'twitter', 'x', 'linkedin',
  'snapchat', 'bytedance', 'tiktok', 'databricks', 'snowflake', 'figma',
  'notion', 'vercel', 'github', 'gitlab', 'atlassian', 'twilio', 'coinbase',
  'robinhood', 'square', 'block', 'doordash', 'instacart', 'lyft', 'waymo',
]);

const TIER2_COMPANIES = new Set([
  'ibm', 'oracle', 'intel', 'qualcomm', 'cisco', 'vmware', 'servicenow',
  'workday', 'zendesk', 'hubspot', 'shopify', 'cloudflare', 'fastly', 'datadog',
  'pagerduty', 'okta', 'crowdstrike', 'splunk', 'elastic', 'mongodb', 'redis',
  'docker', 'hashicorp', 'confluent', 'dbt', 'fivetran', 'airbyte', 'segment',
]);

/** Keywords suggesting growth mindset / willingness to learn culture */
const GROWTH_MINDSET_KEYWORDS = [
  'eager to learn', 'willingness to learn', 'self-starter', 'growth mindset',
  'fast learner', 'quick learner', 'curious', 'passion for learning',
  'mentorship', 'training provided', 'we will teach', 'learn and grow',
  'develop your skills', 'on-the-job training',
];

export class JobScorer {
  /**
   * Score a single job against user profile
   */
  async scoreJob(profile: Profile, job: RawJob): Promise<ScoredJob> {
    try {
      const analysis = await this.analyzeMatch(profile, job);

      return {
        ...job,
        jobId: this.generateJobId(job),
        matchScore: analysis.matchScore,
        analysis,
      };
    } catch (error) {
      logger.error(
        { jobId: job.externalId, platform: job.platform, error },
        'Failed to score job'
      );

      // Return job with default score on error
      return {
        ...job,
        jobId: this.generateJobId(job),
        matchScore: 50, // Default neutral score
      };
    }
  }

  /**
   * Score multiple jobs in batches.
   * Strategy: quick-score all jobs first (no AI), keep top 50 candidates,
   * then AI-score only those to keep latency under 30s.
   */
  async batchScore(profile: Profile, jobs: RawJob[]): Promise<ScoredJob[]> {
    const AI_SCORE_LIMIT = 50; // Max jobs to deep-score with AI
    const batchSize = 5;

    logger.info({ total: jobs.length }, 'Starting batch job scoring');

    // 1. Quick-score all jobs with local heuristics (no AI calls)
    const quickScored = jobs.map((job) => ({
      job,
      quickScore: this.quickScore(profile, job),
    }));

    // 2. Sort by quick score and keep top candidates for AI scoring
    quickScored.sort((a, b) => b.quickScore - a.quickScore);
    const topCandidates = quickScored.slice(0, AI_SCORE_LIMIT);
    const remaining = quickScored.slice(AI_SCORE_LIMIT);

    logger.info({ aiScoring: topCandidates.length, quickOnly: remaining.length }, 'Split for AI scoring');

    // 3. AI-score the top candidates in batches
    const aiScoredJobs: ScoredJob[] = [];
    for (let i = 0; i < topCandidates.length; i += batchSize) {
      const batch = topCandidates.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(
        batch.map(({ job }) => this.scoreJob(profile, job))
      );
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          aiScoredJobs.push(result.value);
        } else {
          logger.error({ error: result.reason }, 'Job AI scoring failed in batch');
        }
      }
      logger.info({ processed: i + batch.length, total: topCandidates.length }, 'AI scoring progress');
    }

    // 4. Convert remaining jobs using quick score only
    const quickOnlyJobs: ScoredJob[] = remaining.map(({ job, quickScore }) => ({
      ...job,
      jobId: this.generateJobId(job),
      matchScore: quickScore,
    }));

    return [...aiScoredJobs, ...quickOnlyJobs];
  }

  /**
   * Analyze job match using AI
   */
  private async analyzeMatch(
    profile: Profile,
    job: RawJob
  ): Promise<JobMatchAnalysis> {
    const isStudent = this.isStudentProfile(profile);
    const systemPrompt = jobMatcherPrompt(isStudent);

    const userPrompt = this.buildMatchPrompt(profile, job, isStudent);

    const result = await aiClient.completeJSON<JobMatchAnalysis>(
      systemPrompt,
      userPrompt,
      JobMatchSchema,
      { model: 'balanced' }
    );

    return result;
  }

  /**
   * Build prompt for job matching
   */
  private buildMatchPrompt(profile: Profile, job: RawJob, isStudent: boolean): string {
    const profileSummary: Record<string, unknown> = {
      skills: profile.skills,
      experience: profile.experience?.map((exp) => ({
        title: exp.role,
        company: exp.company,
        description: exp.description,
        duration: `${exp.startDate} - ${exp.endDate || 'Present'}`,
      })),
      education: profile.education?.map((edu) => ({
        degree: edu.degree,
        field: edu.field,
        institution: edu.institution,
        gpa: edu.gpa,
        endDate: edu.endDate,
      })),
      preferences: profile.preferences,
    };

    if (profile.projects && profile.projects.length > 0) {
      profileSummary.projects = profile.projects.map((proj) => ({
        name: proj.name,
        description: proj.description,
        technologies: proj.technologies,
        url: proj.url,
        githubUrl: proj.githubUrl,
      }));
    }

    if (profile.certifications && profile.certifications.length > 0) {
      profileSummary.certifications = profile.certifications.map((cert) => ({
        name: cert.name,
        issuer: cert.issuer,
        date: cert.date,
      }));
    }

    let studentContext = '';
    if (isStudent) {
      studentContext = `\n\n**IMPORTANT: This candidate is a student/early-career professional.** Evaluate based on potential, coursework relevance, projects, academic achievements, and transferable skills rather than years of professional experience. For internships and entry-level roles, a student with relevant coursework and personal projects should be scored favorably (70+).`;
    }

    return `# Candidate Profile
${JSON.stringify(profileSummary, null, 2)}

# Job Posting
**Title:** ${job.title}
**Company:** ${job.company}
**Location:** ${job.location || 'Not specified'}
**Remote:** ${job.remote ? 'Yes' : 'No'}
**Salary:** ${job.salary ? `${job.salary.min || '?'} - ${job.salary.max || '?'} ${job.salary.currency || 'USD'}` : 'Not specified'}
**Type:** ${job.jobType || 'Not specified'}

**Description:**
${job.description}

**Tags:** ${job.tags?.join(', ') || 'None'}${studentContext}

Analyze this match and provide:
1. Match score (0-100)
2. Key strengths (why this candidate is a good fit)
3. Concerns (potential issues or gaps)
4. Missing skills (what the candidate needs to learn)
5. Recommendations (how to improve match or approach application)`;
  }

  /**
   * Generate unique job ID from external ID and platform
   */
  private generateJobId(job: RawJob): string {
    const normalized = `${job.platform}-${job.externalId}`
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-');
    return normalized;
  }

  /**
   * Detect whether the profile belongs to a student or early-career candidate.
   * Checks explicit preference flags, education dates, and experience count.
   */
  isStudentProfile(profile: Profile): boolean {
    // Explicit flag from preferences
    if (profile.preferences?.isStudent) {
      return true;
    }

    // Check class year
    if (profile.preferences?.classYear) {
      return true;
    }

    // Few or no professional experiences (< 2 entries)
    const experienceCount = profile.experience?.length ?? 0;
    if (experienceCount < 2) {
      // Also check if education suggests current student or recent grad
      const hasRecentOrCurrentEducation = profile.education?.some((edu: Education) => {
        if (!edu.endDate) {
          // Currently enrolled (no end date)
          return true;
        }
        const endYear = new Date(edu.endDate).getFullYear();
        const currentYear = new Date().getFullYear();
        // Graduated within the last 2 years
        return endYear >= currentYear - 1;
      });
      if (hasRecentOrCurrentEducation) {
        return true;
      }
    }

    // No experience at all with any education
    if (experienceCount === 0 && profile.education && profile.education.length > 0) {
      return true;
    }

    return false;
  }

  /**
   * Quick score without AI — enhanced for student profiles with generous
   * transferable skill matching, job type bonuses, and education matching.
   */
  quickScore(profile: Profile, job: RawJob): number {
    const isStudent = this.isStudentProfile(profile);
    let score = isStudent ? 55 : 50; // Higher base for students

    const jobText = `${job.title} ${job.description} ${job.tags?.join(' ') || ''}`.toLowerCase();
    const jobTitle = job.title.toLowerCase();

    // ── Title-level boost (checked before all other bonuses) ──
    const isStudentTitleMatch =
      jobTitle.includes('intern') ||
      jobTitle.includes('internship') ||
      jobTitle.includes('co-op') ||
      jobTitle.includes('coop');
    const isNewGradTitleMatch =
      jobTitle.includes('new grad') ||
      jobTitle.includes('new graduate') ||
      jobTitle.includes('entry') ||
      jobTitle.includes('junior') ||
      jobTitle.includes('associate');
    const isSeniorTitle =
      jobTitle.includes('senior') ||
      jobTitle.includes('lead') ||
      jobTitle.includes('principal') ||
      jobTitle.includes('staff') ||
      jobTitle.includes('director') ||
      jobTitle.includes('vp') ||
      jobTitle.includes('head of');

    if (isStudentTitleMatch) {
      score += isStudent ? 20 : 5;
    } else if (isNewGradTitleMatch) {
      score += isStudent ? 15 : 5;
    }
    if (isSeniorTitle && isStudent) {
      score -= 15;
    }

    // ── Company prestige boost ──
    const companyLower = job.company.toLowerCase();
    const isTier1 = Array.from(TIER1_COMPANIES).some((c) => companyLower.includes(c));
    const isTier2 = !isTier1 && Array.from(TIER2_COMPANIES).some((c) => companyLower.includes(c));

    if (isTier1) {
      score += isStudent ? 15 : 5;
    } else if (isTier2) {
      score += isStudent ? 8 : 3;
    }

    // ── Remote preference ──
    if (profile.preferences?.remotePreference === 'remote' && job.remote) {
      score += 10;
    } else if (profile.preferences?.remotePreference === 'remote' && !job.remote) {
      score -= 10;
    }

    // ── Location match ──
    if (
      profile.preferences?.locations &&
      profile.preferences.locations.length > 0 &&
      job.location
    ) {
      const matchesLocation = profile.preferences.locations.some((loc) =>
        job.location?.toLowerCase().includes(loc.toLowerCase())
      );
      if (matchesLocation) {
        score += 10;
      }
    }

    // ── Salary match ──
    if (profile.preferences?.salaryMin && job.salary?.min) {
      if (job.salary.min >= profile.preferences.salaryMin) {
        score += 10;
      } else {
        score -= 10;
      }
    }

    // ── Student-friendly job type bonus (+15) ──
    if (isStudent) {
      const isStudentFriendlyJob = STUDENT_JOB_TYPE_KEYWORDS.some(
        (keyword) => jobText.includes(keyword)
      );
      const jobTypeField = (job.jobType || '').toLowerCase();
      const isStudentJobType = ['internship', 'co-op', 'on-campus', 'work-study', 'fellowship', 'apprenticeship']
        .some((t) => jobTypeField.includes(t));

      if (isStudentFriendlyJob || isStudentJobType) {
        score += 15;
      }
    }

    // ── Entry-level / no-experience bonus (+15 for students, +5 for others) ──
    const isEntryLevel = ENTRY_LEVEL_KEYWORDS.some(
      (keyword) => jobText.includes(keyword)
    );
    if (isEntryLevel) {
      score += isStudent ? 15 : 5;
    }

    // ── Growth mindset / willingness to learn bonus (+5) ──
    if (isStudent) {
      const hasGrowthMindset = GROWTH_MINDSET_KEYWORDS.some(
        (keyword) => jobText.includes(keyword)
      );
      if (hasGrowthMindset) {
        score += 5;
      }
    }

    // ── Skill matching (enhanced with transferable skills) ──
    if (profile.skills && profile.skills.length > 0) {
      let matchedSkillCount = 0;

      for (const skill of profile.skills) {
        const skillName = skill.name.toLowerCase();

        // Direct match (includes partial word matching)
        if (jobText.includes(skillName)) {
          matchedSkillCount++;
          continue;
        }

        // Partial/stem match: e.g. "python" matches "python3", "pythonic"
        // or "javascript" matches "js" and vice versa
        const partialMatched = this.partialSkillMatch(skillName, jobText);
        if (partialMatched) {
          matchedSkillCount += 0.7; // Partial credit
          continue;
        }

        // Transferable skill match
        if (isStudent) {
          const transferableMatch = this.transferableSkillMatch(skillName, jobText);
          if (transferableMatch) {
            matchedSkillCount += 0.5; // Partial credit for transferable
          }
        }
      }

      const skillMatchRatio = matchedSkillCount / profile.skills.length;
      // Students get up to 25 points for skills, others get up to 20
      const maxSkillPoints = isStudent ? 25 : 20;
      score += skillMatchRatio * maxSkillPoints;
    }

    // ── Education field match (+10) ──
    if (profile.education && profile.education.length > 0) {
      const educationFieldMatch = profile.education.some((edu: Education) => {
        const field = (edu.field || '').toLowerCase();
        const degree = edu.degree.toLowerCase();
        if (!field && !degree) return false;

        // Check if field of study matches job text
        const fieldWords = field.split(/\s+/).filter((w) => w.length > 3);
        const degreeWords = degree.split(/\s+/).filter((w) => w.length > 3);
        const allWords = [...fieldWords, ...degreeWords];

        return allWords.some((word) => jobText.includes(word));
      });

      if (educationFieldMatch) {
        score += 10;
      }
    }

    // ── Target role match (+10) ──
    if (profile.preferences?.targetRoles && profile.preferences.targetRoles.length > 0) {
      const matchesTargetRole = profile.preferences.targetRoles.some((role) => {
        const roleWords = role.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
        return roleWords.some((word) => jobTitle.includes(word));
      });
      if (matchesTargetRole) {
        score += 10;
      }
    }

    // ── Project relevance bonus for students (+5) ──
    if (isStudent && profile.projects && profile.projects.length > 0) {
      const hasRelevantProject = profile.projects.some((project) => {
        const projectTech = project.technologies.map((t) => t.toLowerCase());
        const projectDesc = (project.description || '').toLowerCase();
        const projectName = project.name.toLowerCase();
        const projectText = `${projectName} ${projectDesc} ${projectTech.join(' ')}`;

        // Check if any project tech/keywords appear in job text
        return projectTech.some((tech) => jobText.includes(tech)) ||
          projectText.split(/\s+/)
            .filter((w) => w.length > 3)
            .some((word) => jobText.includes(word));
      });

      if (hasRelevantProject) {
        score += 5;
      }
    }

    // ── Deal-breaker penalties ──
    // Salary below candidate minimum
    if (profile.preferences?.salaryMin && job.salary?.max) {
      if (job.salary.max < profile.preferences.salaryMin * 0.8) {
        score -= 20; // Job pays significantly less than minimum requirement
      }
    }

    // Seniority mismatch — student applying to senior/director/VP roles
    if (isStudent && (
      jobTitle.includes('vp ') ||
      jobTitle.includes('vice president') ||
      jobTitle.includes('director') ||
      jobTitle.includes('principal') ||
      jobTitle.includes('manager') ||
      jobTitle.includes('head of')
    )) {
      score -= 20;
    }

    // Experience requirement mismatch — detect "X+ years" requirements
    const expRequirementMatch = job.description?.match(/(\d+)\+?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:experience|exp)/i);
    if (expRequirementMatch) {
      const requiredYears = parseInt(expRequirementMatch[1], 10);
      const candidateYears = (() => {
        if (!profile.experience || profile.experience.length === 0) return 0;
        const totalMonths = profile.experience.reduce((acc, exp) => {
          const start = new Date(exp.startDate || '2020-01-01');
          const end = exp.endDate ? new Date(exp.endDate) : new Date();
          return acc + Math.max(0, (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth());
        }, 0);
        return Math.round(totalMonths / 12);
      })();
      if (requiredYears > candidateYears + 2) {
        score -= Math.min(25, (requiredYears - candidateYears) * 4);
      }
    }

    // Dealbreaker skills: blocklist matching
    if (profile.preferences?.dealBreakers && profile.preferences.dealBreakers.length > 0) {
      const hasBreaker = profile.preferences.dealBreakers.some((breaker: string) =>
        jobText.includes(breaker.toLowerCase())
      );
      if (hasBreaker) {
        score -= 30;
      }
    }

    // ── Recency timing bonus: jobs posted < 24h ago get +5 ──
    if (job.postedAt) {
      const ageHours = (Date.now() - new Date(job.postedAt).getTime()) / (1000 * 60 * 60);
      if (ageHours < 24) {
        score += 5;
      }
    }

    // Clamp to 0-100
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Check for partial / alias skill matches.
   * E.g., "javascript" matches "js", "node.js" matches "node", etc.
   */
  private partialSkillMatch(skillName: string, jobText: string): boolean {
    const SKILL_ALIASES: Record<string, string[]> = {
      javascript: ['js', 'ecmascript', 'es6', 'es2015'],
      typescript: ['ts'],
      python: ['python3', 'py'],
      'c++': ['cpp', 'cplusplus'],
      'c#': ['csharp', 'dotnet', '.net'],
      react: ['reactjs', 'react.js'],
      angular: ['angularjs', 'angular.js'],
      vue: ['vuejs', 'vue.js'],
      node: ['nodejs', 'node.js'],
      'machine learning': ['ml', 'deep learning', 'neural network'],
      'artificial intelligence': ['ai'],
      postgres: ['postgresql', 'psql'],
      mongodb: ['mongo'],
      kubernetes: ['k8s'],
    };

    const aliases = SKILL_ALIASES[skillName];
    if (aliases) {
      return aliases.some((alias) => jobText.includes(alias));
    }

    // Check reverse: if job mentions full name and skill is an alias
    for (const [fullName, aliasList] of Object.entries(SKILL_ALIASES)) {
      if (aliasList.includes(skillName) && jobText.includes(fullName)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if a skill has transferable relevance to the job description.
   * E.g., knowing "Python" is transferable to a job asking for "programming".
   */
  private transferableSkillMatch(skillName: string, jobText: string): boolean {
    const relatedKeywords = TRANSFERABLE_SKILLS_MAP[skillName];
    if (!relatedKeywords) {
      return false;
    }

    return relatedKeywords.some((keyword) => jobText.includes(keyword));
  }
}

export const jobScorer = new JobScorer();
