import { JobSearchQuery, RawJob } from '@/types/job';

export interface JobPlatform {
  name: string;
  search(query: JobSearchQuery): Promise<RawJob[]>;
  isAvailable(): Promise<boolean>;
}

export abstract class BaseJobPlatform implements JobPlatform {
  abstract name: string;
  abstract search(query: JobSearchQuery): Promise<RawJob[]>;

  async isAvailable(): Promise<boolean> {
    try {
      await this.search({ keywords: ['test'], remote: true });
      return true;
    } catch {
      return false;
    }
  }

  protected matchesQuery(job: RawJob, query: JobSearchQuery): boolean {
    // Keyword matching
    if (query.keywords && query.keywords.length > 0) {
      const searchText = `${job.title} ${job.description} ${job.company}`.toLowerCase();
      const hasMatch = query.keywords.some((keyword) =>
        searchText.includes(keyword.toLowerCase())
      );
      if (!hasMatch) return false;
    }

    // Remote filter
    if (query.remote !== undefined && job.remote !== query.remote) {
      return false;
    }

    // Location filter (if not remote)
    if (
      query.location &&
      !job.remote &&
      job.location &&
      !job.location.toLowerCase().includes(query.location.toLowerCase())
    ) {
      return false;
    }

    // Salary filter
    if (query.minSalary && job.salary?.max && job.salary.max < query.minSalary) {
      return false;
    }

    // Company exclusion
    if (
      query.excludeCompanies &&
      query.excludeCompanies.some(
        (excluded) => job.company.toLowerCase().includes(excluded.toLowerCase())
      )
    ) {
      return false;
    }

    return true;
  }
}
