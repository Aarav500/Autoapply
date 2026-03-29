import { JobSearchQuery, RawJob } from '@/types/job';
import { BaseJobPlatform } from './base';
import { logger } from '@/lib/logger';

interface AdzunaCompany {
  display_name: string;
}

interface AdzunaLocation {
  display_name: string;
}

interface AdzunaCategory {
  label: string;
}

interface AdzunaJob {
  id: string;
  title: string;
  company: AdzunaCompany;
  location: AdzunaLocation;
  description: string;
  redirect_url: string;
  salary_min?: number;
  salary_max?: number;
  category: AdzunaCategory;
  contract_type?: string;
  created: string;
}

interface AdzunaResponse {
  results: AdzunaJob[];
  count?: number;
}

interface CacheEntry {
  timestamp: Date;
  data: RawJob[];
}

const INTERNSHIP_EXPANSION_TERMS = ['intern', 'internship', 'co-op', 'entry level', 'new grad'];

export class IndeedPlatform extends BaseJobPlatform {
  name = 'indeed';
  private cache: Map<string, CacheEntry> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly BASE_URL = 'https://api.adzuna.com/v1/api/jobs/us/search/1';
  private readonly USER_AGENT = 'Autoapply/1.0 (Job Search Platform)';

  async search(query: JobSearchQuery): Promise<RawJob[]> {
    try {
      const cacheKey = this.getCacheKey(query);
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp.getTime() < this.CACHE_TTL) {
        logger.info({ platform: this.name }, 'Using cached Adzuna results');
        return cached.data;
      }

      const keywords = this.buildKeywords(query);
      const url = this.buildUrl(keywords);

      logger.info({ platform: this.name, query, url }, 'Fetching jobs from Adzuna');

      const response = await fetch(url, {
        headers: {
          'User-Agent': this.USER_AGENT,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Adzuna API error: ${response.status} ${response.statusText}`);
      }

      const data: AdzunaResponse = await response.json();
      const results: AdzunaJob[] = Array.isArray(data.results) ? data.results : [];

      const rawJobs: RawJob[] = results
        .map((job) => this.convertToRawJob(job))
        .filter((job) => this.matchesQuery(job, query));

      this.cache.set(cacheKey, {
        timestamp: new Date(),
        data: rawJobs,
      });

      logger.info(
        { platform: this.name, count: rawJobs.length },
        'Successfully fetched jobs from Adzuna'
      );

      return rawJobs;
    } catch (error) {
      logger.error({ platform: this.name, error }, 'Failed to fetch jobs from Adzuna');
      throw error;
    }
  }

  private buildKeywords(query: JobSearchQuery): string {
    const base = query.keywords ?? [];
    const hasInternshipKeyword = base.some(
      (k) => k.toLowerCase() === 'intern' || k.toLowerCase() === 'internship'
    );

    const terms = hasInternshipKeyword
      ? Array.from(new Set([...base, ...INTERNSHIP_EXPANSION_TERMS]))
      : base;

    return terms.join(' ');
  }

  private buildUrl(keywords: string): string {
    const params = new URLSearchParams({
      app_id: 'test',
      app_key: 'test',
      results_per_page: '50',
      what: keywords,
      'content-type': 'application/json',
    });

    return `${this.BASE_URL}?${params.toString()}`;
  }

  private convertToRawJob(job: AdzunaJob): RawJob {
    const locationText = job.location?.display_name ?? '';
    const isRemote =
      locationText.toLowerCase().includes('remote') ||
      job.title.toLowerCase().includes('remote');

    return {
      externalId: `adzuna-${job.id}`,
      platform: 'indeed',
      title: job.title,
      company: job.company?.display_name ?? 'Unknown Company',
      location: locationText || undefined,
      remote: isRemote,
      description: job.description ?? '',
      url: job.redirect_url,
      salary:
        job.salary_min !== undefined || job.salary_max !== undefined
          ? {
              min: job.salary_min,
              max: job.salary_max,
              currency: 'USD',
            }
          : undefined,
      jobType: this.mapContractType(job.contract_type),
      tags: job.category?.label ? [job.category.label] : undefined,
      postedAt: job.created ? new Date(job.created) : undefined,
      fetchedAt: new Date(),
    };
  }

  private mapContractType(contractType: string | undefined): string | undefined {
    if (!contractType) return undefined;

    const normalized = contractType.toLowerCase();
    if (normalized === 'permanent') return 'full-time';
    if (normalized === 'contract') return 'contract';
    if (normalized === 'part_time' || normalized === 'part-time') return 'part-time';
    if (normalized === 'internship') return 'internship';
    if (normalized === 'temporary') return 'contract';

    return contractType;
  }

  private getCacheKey(query: JobSearchQuery): string {
    return JSON.stringify({
      keywords: query.keywords?.slice().sort(),
      location: query.location,
      remote: query.remote,
    });
  }

  async isAvailable(): Promise<boolean> {
    try {
      const url = this.buildUrl('software engineer');
      const response = await fetch(url, {
        headers: { 'User-Agent': this.USER_AGENT },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const indeedPlatform = new IndeedPlatform();
