import { RawJob, ScoredJob, JobMatchAnalysis } from '@/types/job';
import { Profile, Skill } from '@/types/profile';
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
   * Score multiple jobs in batches
   */
  async batchScore(profile: Profile, jobs: RawJob[]): Promise<ScoredJob[]> {
    const batchSize = 5; // Process 5 jobs at a time to save tokens
    const scoredJobs: ScoredJob[] = [];

    logger.info({ total: jobs.length, batchSize }, 'Starting batch job scoring');

    for (let i = 0; i < jobs.length; i += batchSize) {
      const batch = jobs.slice(i, i + batchSize);

      // Score jobs in parallel within batch
      const batchPromises = batch.map((job) => this.scoreJob(profile, job));
      const batchResults = await Promise.allSettled(batchPromises);

      // Collect successful results
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          scoredJobs.push(result.value);
        } else {
          logger.error({ error: result.reason }, 'Job scoring failed in batch');
        }
      }

      logger.info(
        { processed: i + batch.length, total: jobs.length },
        'Batch scoring progress'
      );
    }

    return scoredJobs;
  }

  /**
   * Analyze job match using AI
   */
  private async analyzeMatch(
    profile: Profile,
    job: RawJob
  ): Promise<JobMatchAnalysis> {
    const systemPrompt = jobMatcherPrompt;

    const userPrompt = this.buildMatchPrompt(profile, job);

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
  private buildMatchPrompt(profile: Profile, job: RawJob): string {
    const profileSummary = {
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
      })),
      preferences: profile.preferences,
    };

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

**Tags:** ${job.tags?.join(', ') || 'None'}

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
   * Quick score without AI (fallback for rate limiting)
   */
  quickScore(profile: Profile, job: RawJob): number {
    let score = 50; // Base score

    // Check remote preference
    if (profile.preferences?.remotePreference === 'remote' && job.remote) {
      score += 10;
    } else if (profile.preferences?.remotePreference === 'remote' && !job.remote) {
      score -= 10;
    }

    // Check location
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

    // Check salary
    if (profile.preferences?.salaryMin && job.salary?.min) {
      if (job.salary.min >= profile.preferences.salaryMin) {
        score += 10;
      } else {
        score -= 10;
      }
    }

    // Skill matching (simple keyword match)
    if (profile.skills && profile.skills.length > 0) {
      const jobText = `${job.title} ${job.description}`.toLowerCase();
      const matchingSkills = profile.skills.filter((skill: Skill) =>
        jobText.includes(skill.name.toLowerCase())
      );

      const skillMatchRatio = matchingSkills.length / profile.skills.length;
      score += skillMatchRatio * 20;
    }

    // Clamp to 0-100
    return Math.max(0, Math.min(100, Math.round(score)));
  }
}

export const jobScorer = new JobScorer();
