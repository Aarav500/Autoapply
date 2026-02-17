import { compareTwoStrings } from 'string-similarity';
import { RawJob, ScoredJob } from '@/types/job';
import { logger } from '@/lib/logger';

const SIMILARITY_THRESHOLD = 0.85;

export class JobDeduplicator {
  /**
   * Normalize company name for comparison
   */
  private normalizeCompany(company: string): string {
    return company
      .toLowerCase()
      .replace(/\b(inc|llc|ltd|corp|corporation|company|co)\b/g, '')
      .replace(/[.,\-_]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Normalize job title for comparison
   */
  private normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[.,\-_]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Check if two jobs are duplicates using Jaro-Winkler similarity
   */
  private areDuplicates(job1: RawJob | ScoredJob, job2: RawJob | ScoredJob): boolean {
    const company1 = this.normalizeCompany(job1.company);
    const company2 = this.normalizeCompany(job2.company);
    const title1 = this.normalizeTitle(job1.title);
    const title2 = this.normalizeTitle(job2.title);

    // Compare company names
    const companySimilarity = compareTwoStrings(company1, company2);

    // Compare titles
    const titleSimilarity = compareTwoStrings(title1, title2);

    // Both must be similar
    return (
      companySimilarity >= SIMILARITY_THRESHOLD && titleSimilarity >= SIMILARITY_THRESHOLD
    );
  }

  /**
   * Choose which job to keep when duplicates are found
   * Prefers jobs with longer descriptions and more complete data
   */
  private chooseBetterJob<T extends RawJob | ScoredJob>(job1: T, job2: T): T {
    // Prefer job with match score if available
    if ('matchScore' in job1 && 'matchScore' in job2) {
      if (job1.matchScore !== job2.matchScore) {
        return job1.matchScore > job2.matchScore ? job1 : job2;
      }
    }

    // Prefer job with longer description
    if (job1.description.length !== job2.description.length) {
      return job1.description.length > job2.description.length ? job1 : job2;
    }

    // Prefer job with salary info
    if (job1.salary && !job2.salary) return job1;
    if (!job1.salary && job2.salary) return job2;

    // Prefer job with URL
    if (job1.url && !job2.url) return job1;
    if (!job1.url && job2.url) return job2;

    // Prefer newer job
    const posted1 = job1.postedAt?.getTime() || 0;
    const posted2 = job2.postedAt?.getTime() || 0;
    if (posted1 !== posted2) {
      return posted1 > posted2 ? job1 : job2;
    }

    // Default to first job
    return job1;
  }

  /**
   * Remove duplicate jobs from a list
   */
  deduplicate<T extends RawJob | ScoredJob>(jobs: T[]): T[] {
    if (jobs.length === 0) return jobs;

    const unique: T[] = [];
    const duplicatesRemoved: Array<{ kept: string; removed: string }> = [];

    for (const job of jobs) {
      const duplicateIndex = unique.findIndex((existingJob) =>
        this.areDuplicates(job, existingJob)
      );

      if (duplicateIndex === -1) {
        // Not a duplicate, add to unique list
        unique.push(job);
      } else {
        // Found duplicate, keep the better one
        const existingJob = unique[duplicateIndex];
        const betterJob = this.chooseBetterJob(job, existingJob);

        if (betterJob === job) {
          // Replace existing with new job
          unique[duplicateIndex] = job;
          duplicatesRemoved.push({
            kept: `${job.company} - ${job.title}`,
            removed: `${existingJob.company} - ${existingJob.title}`,
          });
        } else {
          // Keep existing job
          duplicatesRemoved.push({
            kept: `${existingJob.company} - ${existingJob.title}`,
            removed: `${job.company} - ${job.title}`,
          });
        }
      }
    }

    if (duplicatesRemoved.length > 0) {
      logger.info(
        { duplicatesRemoved: duplicatesRemoved.length, total: jobs.length },
        'Removed duplicate jobs'
      );
    }

    return unique;
  }

  /**
   * Get statistics about duplicates without modifying the list
   */
  analyzeduplicates<T extends RawJob | ScoredJob>(
    jobs: T[]
  ): { total: number; unique: number; duplicates: number } {
    const deduplicated = this.deduplicate(jobs);
    return {
      total: jobs.length,
      unique: deduplicated.length,
      duplicates: jobs.length - deduplicated.length,
    };
  }
}

export const jobDeduplicator = new JobDeduplicator();
