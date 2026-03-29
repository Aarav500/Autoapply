import { JobSearchQuery, RawJob } from '@/types/job';
import { BaseJobPlatform } from './base';
import { logger } from '@/lib/logger';

interface DiceJobRaw {
  id: string;
  title: string;
  companyPageUrl?: string;
  companyDisplay?: string;
  employerType?: string;
  workplaceTypes?: string[];
  jobLocation?: string;
  postedDate?: string;
  applyUrl?: string;
  shortDesc?: string;
  salary?: string;
  employmentType?: string;
  skills?: string[];
}

interface DiceApiResponse {
  data: DiceJobRaw[];
  meta?: {
    totalResults?: number;
  };
}

function parseSalaryRange(salaryStr: string | undefined): { min?: number; max?: number; currency?: string } | undefined {
  if (!salaryStr) return undefined;

  // Patterns: "$80,000 - $120,000", "$80K - $120K", "80000", etc.
  const normalized = salaryStr.replace(/,/g, '');
  const rangeMatch = normalized.match(/\$?([\d.]+)K?\s*[-–]\s*\$?([\d.]+)K?/i);
  if (rangeMatch) {
    const multiplier = salaryStr.toLowerCase().includes('k') ? 1000 : 1;
    return {
      min: parseFloat(rangeMatch[1]) * multiplier,
      max: parseFloat(rangeMatch[2]) * multiplier,
      currency: 'USD',
    };
  }

  const singleMatch = normalized.match(/\$?([\d.]+)K?/i);
  if (singleMatch) {
    const multiplier = salaryStr.toLowerCase().includes('k') ? 1000 : 1;
    const val = parseFloat(singleMatch[1]) * multiplier;
    return { min: val, currency: 'USD' };
  }

  return undefined;
}

export class DicePlatform extends BaseJobPlatform {
  name = 'dice';
  private readonly BASE_URL =
    'https://job-search-api.svc.dhigroupinc.com/v1/dice/jobs/search';
  private readonly USER_AGENT =
    'Mozilla/5.0 (compatible; AutoApply/1.0; +https://github.com/autoapply)';

  async search(query: JobSearchQuery): Promise<RawJob[]> {
    try {
      const q = (query.keywords ?? []).join(' ');
      if (!q) return [];

      const params = new URLSearchParams({
        q,
        countryCode: 'US',
        radius: '30',
        radiusUnit: 'mi',
        page: '1',
        pageSize: '20',
        facets: 'employmentType|postedDate|workplaceTypes|employerType',
        currencyCode: 'USD',
        languageCode: 'en',
      });

      if (query.remote) {
        params.set('filters.workplaceTypes', 'Remote');
      }

      if (query.location && !query.remote) {
        params.set('location', query.location);
      }

      const url = `${this.BASE_URL}?${params.toString()}`;
      logger.info({ platform: this.name, url }, 'Fetching jobs from Dice');

      const response = await fetch(url, {
        headers: {
          'User-Agent': this.USER_AGENT,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        throw new Error(`Dice API returned HTTP ${response.status}`);
      }

      const data: DiceApiResponse = await response.json();
      const results = Array.isArray(data.data) ? data.data : [];

      const jobs: RawJob[] = results
        .map((j) => this.toRawJob(j))
        .filter((job) => this.matchesQuery(job, query));

      logger.info({ platform: this.name, count: jobs.length }, 'Fetched jobs from Dice');
      return jobs;
    } catch (error) {
      logger.error({ platform: this.name, error }, 'Dice search failed');
      return [];
    }
  }

  private toRawJob(j: DiceJobRaw): RawJob {
    const workplaceTypes = (j.workplaceTypes ?? []).map((w) => w.toLowerCase());
    const isRemote =
      workplaceTypes.includes('remote') ||
      (j.jobLocation ?? '').toLowerCase().includes('remote');

    const company = j.companyDisplay ?? j.companyPageUrl ?? 'Unknown Company';

    return {
      externalId: `dice-${j.id}`,
      platform: 'dice',
      title: j.title,
      company,
      location: j.jobLocation || undefined,
      remote: isRemote,
      description: j.shortDesc ?? '',
      url: j.applyUrl ?? undefined,
      salary: parseSalaryRange(j.salary),
      jobType: this.mapEmploymentType(j.employmentType),
      tags: j.skills && j.skills.length > 0 ? j.skills : undefined,
      postedAt: j.postedDate ? new Date(j.postedDate) : undefined,
      fetchedAt: new Date(),
    };
  }

  private mapEmploymentType(type: string | undefined): string | undefined {
    if (!type) return undefined;
    const t = type.toLowerCase();
    if (t.includes('full')) return 'full-time';
    if (t.includes('part')) return 'part-time';
    if (t.includes('contract') || t.includes('contractor')) return 'contract';
    if (t.includes('intern')) return 'internship';
    if (t.includes('third') || t.includes('c2c') || t.includes('c2h')) return 'contract';
    return type;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const params = new URLSearchParams({
        q: 'software engineer',
        countryCode: 'US',
        page: '1',
        pageSize: '1',
        languageCode: 'en',
        currencyCode: 'USD',
      });
      const res = await fetch(`${this.BASE_URL}?${params.toString()}`, {
        headers: { 'User-Agent': this.USER_AGENT },
        signal: AbortSignal.timeout(8000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}

export const dicePlatform = new DicePlatform();
