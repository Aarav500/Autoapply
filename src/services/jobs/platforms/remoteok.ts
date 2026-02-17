import { JobSearchQuery, RawJob } from '@/types/job';
import { BaseJobPlatform } from './base';
import { logger } from '@/lib/logger';

interface RemoteOKJob {
  id: string;
  slug: string;
  company: string;
  company_logo?: string;
  position: string;
  tags?: string[];
  description: string;
  location: string;
  url: string;
  salary_min?: number;
  salary_max?: number;
  date: string;
  logo?: string;
}

interface CacheEntry {
  timestamp: Date;
  data: RawJob[];
}

export class RemoteOKPlatform extends BaseJobPlatform {
  name = 'remoteok';
  private cache: Map<string, CacheEntry> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly API_URL = 'https://remoteok.com/api';
  private readonly USER_AGENT = 'Autoapply/1.0 (Job Search Platform)';

  async search(query: JobSearchQuery): Promise<RawJob[]> {
    try {
      // Check cache first
      const cacheKey = this.getCacheKey(query);
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp.getTime() < this.CACHE_TTL) {
        logger.info({ platform: this.name }, 'Using cached results');
        return cached.data;
      }

      // Fetch from API
      logger.info({ platform: this.name, query }, 'Fetching jobs from RemoteOK');
      const response = await fetch(this.API_URL, {
        headers: {
          'User-Agent': this.USER_AGENT,
        },
      });

      if (!response.ok) {
        throw new Error(`RemoteOK API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // RemoteOK returns an array, first item is metadata, rest are jobs
      const jobs: RemoteOKJob[] = Array.isArray(data) ? data.slice(1) : [];

      // Convert to RawJob format
      const rawJobs: RawJob[] = jobs
        .map((job) => this.convertToRawJob(job))
        .filter((job) => this.matchesQuery(job, query));

      // Update cache
      this.cache.set(cacheKey, {
        timestamp: new Date(),
        data: rawJobs,
      });

      logger.info(
        { platform: this.name, count: rawJobs.length },
        'Successfully fetched jobs'
      );

      return rawJobs;
    } catch (error) {
      logger.error({ platform: this.name, error }, 'Failed to fetch jobs');
      throw error;
    }
  }

  private convertToRawJob(job: RemoteOKJob): RawJob {
    return {
      externalId: job.id || job.slug,
      platform: 'remoteok',
      title: job.position,
      company: job.company,
      location: job.location || 'Remote',
      remote: true,
      description: job.description || '',
      url: job.url,
      salary: job.salary_min || job.salary_max
        ? {
            min: job.salary_min,
            max: job.salary_max,
            currency: 'USD',
          }
        : undefined,
      tags: job.tags,
      postedAt: job.date ? new Date(job.date) : undefined,
      fetchedAt: new Date(),
    };
  }

  private getCacheKey(query: JobSearchQuery): string {
    return JSON.stringify({
      keywords: query.keywords?.sort(),
      location: query.location,
      remote: query.remote,
    });
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(this.API_URL, {
        headers: {
          'User-Agent': this.USER_AGENT,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const remoteOKPlatform = new RemoteOKPlatform();
