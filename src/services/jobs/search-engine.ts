import {
  JobSearchQuery,
  RawJob,
  ScoredJob,
  SearchResult,
  JobSummary,
  Job,
  JobPlatform,
  ApplicationUrgency,
} from '@/types/job';
import { remoteOKPlatform } from './platforms/remoteok';
import { hackerNewsPlatform } from './platforms/hackernews';
import { indeedPlatform } from './platforms/indeed';
import { handshakePlatform } from './platforms/handshake';
import { greenhousePlatform } from './platforms/greenhouse';
import { leverPlatform } from './platforms/lever';
import { workdayPlatform } from './platforms/workday';
import { wellfoundPlatform } from './platforms/wellfound';
import { dicePlatform } from './platforms/dice';
import { jobDeduplicator } from './deduplicator';
import { jobScorer } from './scorer';
import { storage } from '@/lib/storage';
import { logger } from '@/lib/logger';
import type { Profile } from '@/types/profile';

export class SearchEngine {
  private platforms = [
    remoteOKPlatform,
    hackerNewsPlatform,
    indeedPlatform,
    handshakePlatform,
    greenhousePlatform,
    leverPlatform,
    workdayPlatform,
    wellfoundPlatform,
    dicePlatform,
  ];

  /**
   * Main search orchestration
   */
  async searchJobs(userId: string, query: JobSearchQuery): Promise<SearchResult> {
    const startTime = Date.now();

    try {
      // 1. Load user profile
      logger.info({ userId, query }, 'Starting job search');
      const profile = await this.loadProfile(userId);

      // 2. Search all platforms in parallel
      const platformResults = await this.searchAllPlatforms(query);

      // 3. Collect successful results
      const allJobs = this.collectResults(platformResults);
      logger.info({ count: allJobs.length }, 'Collected jobs from platforms');

      // 4. Deduplicate
      const uniqueJobs = jobDeduplicator.deduplicate(allJobs);
      logger.info(
        { before: allJobs.length, after: uniqueJobs.length },
        'Deduplicated jobs'
      );

      // 5. Score jobs against profile
      const scoredJobs = await jobScorer.batchScore(profile, uniqueJobs);
      logger.info({ count: scoredJobs.length }, 'Scored jobs');

      // 5b. Enrich with posting age / urgency metadata
      const enrichedJobs = this.enrichWithPostingAge(scoredJobs);

      // 6. Sort by match score
      enrichedJobs.sort((a, b) => b.matchScore - a.matchScore);

      // 7. Save to S3
      await this.saveJobs(userId, enrichedJobs);

      const duration = Date.now() - startTime;
      logger.info({ userId, duration, count: enrichedJobs.length }, 'Search completed');

      return {
        query,
        totalResults: enrichedJobs.length,
        newJobs: enrichedJobs.length,
        platformResults: platformResults.map((pr) => ({
          platform: pr.platform,
          count: pr.jobs?.length || 0,
          error: pr.error,
        })),
        jobs: enrichedJobs,
        searchedAt: new Date(),
      };
    } catch (error) {
      logger.error({ userId, query, error }, 'Search failed');
      throw error;
    }
  }

  /**
   * Load user profile from S3
   */
  private async loadProfile(userId: string): Promise<Profile> {
    const profile = await storage.getJSON<Profile>(
      `users/${userId}/profile.json`
    );

    if (!profile) {
      throw new Error('User profile not found');
    }

    return profile;
  }

  /**
   * Search all platforms in parallel
   */
  private async searchAllPlatforms(
    query: JobSearchQuery
  ): Promise<Array<{ platform: JobPlatform; jobs?: RawJob[]; error?: string }>> {
    const promises = this.platforms.map(async (platform) => {
      try {
        const jobs = await platform.search(query);
        return { platform: platform.name as JobPlatform, jobs };
      } catch (error) {
        logger.error({ platform: platform.name, error }, 'Platform search failed');
        return {
          platform: platform.name as JobPlatform,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    });

    return await Promise.allSettled(promises).then((results) =>
      results.map((result) =>
        result.status === 'fulfilled'
          ? result.value
          : { platform: 'remoteok' as JobPlatform, error: 'Platform failed' }
      )
    );
  }

  /**
   * Collect jobs from platform results
   */
  private collectResults(
    platformResults: Array<{ platform: JobPlatform; jobs?: RawJob[]; error?: string }>
  ): RawJob[] {
    return platformResults
      .filter((pr) => pr.jobs && pr.jobs.length > 0)
      .flatMap((pr) => pr.jobs!);
  }

  /**
   * Save jobs to S3
   */
  private async saveJobs(userId: string, jobs: ScoredJob[]): Promise<void> {
    // Load existing index
    const indexPath = `users/${userId}/jobs/index.json`;
    const existingIndex =
      (await storage.getJSON<JobSummary[]>(indexPath)) || [];

    // Create map of existing jobs by jobId
    const existingMap = new Map<string, JobSummary>(
      existingIndex.map((job) => [job.id, job])
    );

    // Process each new job
    for (const job of jobs) {
      const existing = existingMap.get(job.jobId);

      if (existing) {
        // Update existing job
        existing.matchScore = job.matchScore;
        existing.updatedAt = new Date();

        // Update full job detail
        await this.saveJobDetail(userId, job, existing.status);
      } else {
        // Add new job
        const summary: JobSummary = {
          id: job.jobId,
          externalId: job.externalId,
          platform: job.platform,
          title: job.title,
          company: job.company,
          location: job.location,
          remote: job.remote,
          matchScore: job.matchScore,
          status: 'discovered',
          savedAt: new Date(),
          updatedAt: new Date(),
          url: job.url,
        };

        existingMap.set(job.jobId, summary);

        // Save full job detail
        await this.saveJobDetail(userId, job, 'discovered');
      }
    }

    // Save updated index
    const updatedIndex = Array.from(existingMap.values()).sort(
      (a, b) => b.matchScore - a.matchScore
    );

    await storage.putJSON(indexPath, updatedIndex);

    logger.info(
      { userId, newJobs: jobs.length, totalJobs: updatedIndex.length },
      'Saved jobs to S3'
    );
  }

  /**
   * Save full job detail
   */
  private async saveJobDetail(
    userId: string,
    job: ScoredJob,
    status: JobSummary['status']
  ): Promise<void> {
    const jobPath = `users/${userId}/jobs/${job.jobId}.json`;

    const fullJob: Job = {
      id: job.jobId,
      externalId: job.externalId,
      platform: job.platform,
      title: job.title,
      company: job.company,
      location: job.location,
      remote: job.remote,
      description: job.description,
      url: job.url,
      salary: job.salary,
      jobType: job.jobType,
      tags: job.tags,
      postedAt: job.postedAt,
      fetchedAt: job.fetchedAt,
      matchScore: job.matchScore,
      analysis: job.analysis,
      status,
      savedAt: new Date(),
      updatedAt: new Date(),
    };

    await storage.putJSON(jobPath, fullJob);
  }

  /**
   * Compute posting age fields for all scored jobs
   */
  private enrichWithPostingAge(jobs: ScoredJob[]): ScoredJob[] {
    const now = Date.now();
    return jobs.map((job) => {
      if (!job.postedAt) return job;

      const postedMs = new Date(job.postedAt).getTime();
      const ageMs = now - postedMs;
      const postingAgeHours = Math.max(0, Math.round(ageMs / (1000 * 60 * 60)));
      const ageDays = postingAgeHours / 24;

      const isLikelyExpired = ageDays > 30;

      let applicationUrgency: ApplicationUrgency;
      if (ageDays > 30) {
        applicationUrgency = 'expired';
      } else if (ageDays > 7) {
        applicationUrgency = 'stale';
      } else if (ageDays > 3) {
        applicationUrgency = 'normal';
      } else if (ageDays > 1) {
        applicationUrgency = 'soon';
      } else {
        applicationUrgency = 'apply-now';
      }

      return { ...job, postingAgeHours, isLikelyExpired, applicationUrgency };
    });
  }

  /**
   * Get job by ID
   */
  async getJob(userId: string, jobId: string): Promise<Job | null> {
    const jobPath = `users/${userId}/jobs/${jobId}.json`;
    return await storage.getJSON<Job>(jobPath);
  }

  /**
   * List jobs with filters
   */
  async listJobs(
    userId: string,
    filters?: {
      status?: JobSummary['status'];
      minScore?: number;
      platform?: JobPlatform;
    }
  ): Promise<JobSummary[]> {
    const indexPath = `users/${userId}/jobs/index.json`;
    let jobs = (await storage.getJSON<JobSummary[]>(indexPath)) || [];

    // Apply filters
    if (filters?.status) {
      jobs = jobs.filter((job) => job.status === filters.status);
    }

    if (filters?.minScore !== undefined) {
      jobs = jobs.filter((job) => job.matchScore >= filters.minScore!);
    }

    if (filters?.platform) {
      jobs = jobs.filter((job) => job.platform === filters.platform);
    }

    return jobs;
  }

  /**
   * Update job status
   */
  async updateJobStatus(
    userId: string,
    jobId: string,
    status: JobSummary['status']
  ): Promise<Job> {
    // Update full job
    const job = await this.getJob(userId, jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    job.status = status;
    job.updatedAt = new Date();

    if (status === 'applied') {
      job.appliedAt = new Date();
    }

    await storage.putJSON(`users/${userId}/jobs/${jobId}.json`, job);

    // Update index
    const indexPath = `users/${userId}/jobs/index.json`;
    const currentIndex = await storage.getJSON<JobSummary[]>(indexPath);
    if (currentIndex) {
      const jobIndex = currentIndex.findIndex((j: JobSummary) => j.id === jobId);
      if (jobIndex !== -1) {
        currentIndex[jobIndex].status = status;
        currentIndex[jobIndex].updatedAt = new Date();
        await storage.putJSON(indexPath, currentIndex);
      }
    }

    return job;
  }
}

export const searchEngine = new SearchEngine();
