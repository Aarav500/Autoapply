import { JobSearchQuery, RawJob } from '@/types/job';
import { BaseJobPlatform } from './base';
import { logger } from '@/lib/logger';

interface MuseCompany {
  name: string;
}

interface MuseLocation {
  name: string;
}

interface MuseLevel {
  name: string;
}

interface MuseCategory {
  name: string;
}

interface MuseRefs {
  landing_page: string;
}

interface MuseJob {
  id: number;
  name: string;
  company: MuseCompany;
  locations: MuseLocation[];
  levels: MuseLevel[];
  categories: MuseCategory[];
  publication_date: string;
  refs: MuseRefs;
  contents?: string;
}

interface MuseResponse {
  results: MuseJob[];
  page_count?: number;
  total?: number;
}

interface CacheEntry {
  timestamp: Date;
  data: RawJob[];
}

const INTERNSHIP_LEVELS = ['Internship', 'Entry Level'];

export class HandshakePlatform extends BaseJobPlatform {
  name = 'handshake';
  private cache: Map<string, CacheEntry> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly BASE_URL = 'https://www.themuse.com/api/public/jobs';
  private readonly USER_AGENT = 'Autoapply/1.0 (Job Search Platform)';

  async search(query: JobSearchQuery): Promise<RawJob[]> {
    try {
      const cacheKey = this.getCacheKey(query);
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp.getTime() < this.CACHE_TTL) {
        logger.info({ platform: this.name }, 'Using cached Muse results');
        return cached.data;
      }

      const url = this.buildUrl(query);

      logger.info({ platform: this.name, query, url }, 'Fetching jobs from The Muse');

      const response = await fetch(url, {
        headers: {
          'User-Agent': this.USER_AGENT,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`The Muse API error: ${response.status} ${response.statusText}`);
      }

      const data: MuseResponse = await response.json();
      const results: MuseJob[] = Array.isArray(data.results) ? data.results : [];

      const rawJobs: RawJob[] = results
        .map((job) => this.convertToRawJob(job))
        .filter((job) => this.matchesQuery(job, query));

      this.cache.set(cacheKey, {
        timestamp: new Date(),
        data: rawJobs,
      });

      logger.info(
        { platform: this.name, count: rawJobs.length },
        'Successfully fetched jobs from The Muse'
      );

      return rawJobs;
    } catch (error) {
      logger.error({ platform: this.name, error }, 'Failed to fetch jobs from The Muse');
      throw error;
    }
  }

  private buildUrl(query: JobSearchQuery): string {
    const params = new URLSearchParams({
      page: '0',
      level: 'Internship',
    });

    // Also include entry-level
    params.append('level', 'Entry Level');

    // Append category if keywords hint at a domain
    const category = this.inferCategory(query.keywords ?? []);
    if (category) {
      params.append('category', category);
    }

    return `${this.BASE_URL}?${params.toString()}`;
  }

  private inferCategory(keywords: string[]): string | null {
    const joined = keywords.join(' ').toLowerCase();

    if (joined.includes('software') || joined.includes('engineer') || joined.includes('developer') || joined.includes('coding')) {
      return 'Engineering';
    }
    if (joined.includes('data') || joined.includes('analytics') || joined.includes('science')) {
      return 'Data Science';
    }
    if (joined.includes('design') || joined.includes('ux') || joined.includes('ui')) {
      return 'Design & UX';
    }
    if (joined.includes('marketing') || joined.includes('content') || joined.includes('seo')) {
      return 'Marketing & PR';
    }
    if (joined.includes('finance') || joined.includes('accounting')) {
      return 'Finance';
    }
    if (joined.includes('product') || joined.includes('pm')) {
      return 'Product';
    }
    if (joined.includes('operations') || joined.includes('ops')) {
      return 'Operations';
    }
    if (joined.includes('sales') || joined.includes('business development')) {
      return 'Sales';
    }

    return null;
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  private convertToRawJob(job: MuseJob): RawJob {
    const locationName = job.locations?.[0]?.name ?? '';
    const isRemote =
      locationName.toLowerCase().includes('remote') ||
      locationName.toLowerCase().includes('flexible') ||
      job.name.toLowerCase().includes('remote');

    const levelNames = (job.levels ?? []).map((l) => l.name);
    const isInternship = levelNames.some((l) => INTERNSHIP_LEVELS.includes(l));
    const jobType = isInternship ? 'internship' : 'full-time';

    const description = job.contents ? this.stripHtml(job.contents) : '';
    const tags = (job.categories ?? []).map((c) => c.name).filter(Boolean);

    return {
      externalId: `muse-${job.id}`,
      platform: 'handshake',
      title: job.name,
      company: job.company?.name ?? 'Unknown Company',
      location: locationName || undefined,
      remote: isRemote,
      description,
      url: job.refs?.landing_page,
      salary: undefined,
      jobType,
      tags: tags.length > 0 ? tags : undefined,
      postedAt: job.publication_date ? new Date(job.publication_date) : undefined,
      fetchedAt: new Date(),
    };
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
      const response = await fetch(
        `${this.BASE_URL}?page=0&level=Internship`,
        { headers: { 'User-Agent': this.USER_AGENT } }
      );
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const handshakePlatform = new HandshakePlatform();
