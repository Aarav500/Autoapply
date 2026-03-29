import { JobSearchQuery, RawJob } from '@/types/job';
import { BaseJobPlatform } from './base';
import { logger } from '@/lib/logger';

interface WellfoundJobRaw {
  id: string | number;
  title: string;
  company: string;
  location?: string;
  salaryMin?: number;
  salaryMax?: number;
  url?: string;
  postedAt?: string;
  remote?: boolean;
  description?: string;
  tags?: string[];
}

function parseWellfoundEmbeddedJson(html: string): WellfoundJobRaw[] {
  // Wellfound embeds job data in JSON inside <script> tags (Next.js __NEXT_DATA__ or similar)
  const patterns = [
    /__NEXT_DATA__\s*=\s*(\{[\s\S]*?\})\s*<\/script>/,
    /window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\})\s*;?\s*<\/script>/,
    /"jobs"\s*:\s*(\[[\s\S]*?\])\s*,\s*"(?:pagination|meta|total)"/,
    /"listings"\s*:\s*(\[[\s\S]*?\])\s*,\s*"(?:pagination|meta|total)"/,
  ];

  for (const pattern of patterns) {
    try {
      const match = html.match(pattern);
      if (!match) continue;

      const parsed: unknown = JSON.parse(match[1]);

      // Try to find job arrays nested inside the parsed object
      const jobs = extractJobsFromParsed(parsed);
      if (jobs.length > 0) {
        return jobs;
      }
    } catch {
      // Pattern failed, try next
    }
  }

  return [];
}

function extractJobsFromParsed(data: unknown): WellfoundJobRaw[] {
  if (Array.isArray(data)) {
    // Validate that this looks like job data
    if (data.length > 0 && isJobLike(data[0])) {
      return data.map(normalizeJobEntry);
    }
    return [];
  }

  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    // Recursively search for arrays in common keys
    const searchKeys = ['jobs', 'listings', 'results', 'props', 'pageProps', 'initialProps', 'data'];
    for (const key of searchKeys) {
      if (obj[key] !== undefined) {
        const found = extractJobsFromParsed(obj[key]);
        if (found.length > 0) {
          return found;
        }
      }
    }
  }

  return [];
}

function isJobLike(item: unknown): boolean {
  if (!item || typeof item !== 'object') return false;
  const obj = item as Record<string, unknown>;
  return (
    (typeof obj['title'] === 'string' || typeof obj['name'] === 'string') &&
    (typeof obj['company'] === 'string' ||
      (typeof obj['company'] === 'object' && obj['company'] !== null))
  );
}

function normalizeJobEntry(item: unknown): WellfoundJobRaw {
  const obj = item as Record<string, unknown>;

  const company =
    typeof obj['company'] === 'string'
      ? obj['company']
      : (obj['company'] as Record<string, unknown> | null)?.['name'] as string | undefined ?? 'Unknown';

  const salaryRange = obj['compensation'] as Record<string, unknown> | null;

  return {
    id: String(obj['id'] ?? obj['slug'] ?? Math.random()),
    title: String(obj['title'] ?? obj['name'] ?? 'Unknown Role'),
    company,
    location: obj['locationNames'] as string | undefined ??
      (Array.isArray(obj['locations'])
        ? (obj['locations'] as string[]).join(', ')
        : String(obj['location'] ?? '')),
    salaryMin: salaryRange?.['min'] as number | undefined ?? obj['salaryMin'] as number | undefined,
    salaryMax: salaryRange?.['max'] as number | undefined ?? obj['salaryMax'] as number | undefined,
    url: obj['jobUrl'] as string | undefined ?? obj['url'] as string | undefined,
    postedAt: obj['liveStartAt'] as string | undefined ?? obj['postedAt'] as string | undefined,
    remote: Boolean(obj['remote'] ?? obj['isRemote']),
    description: String(obj['description'] ?? obj['pitch'] ?? ''),
    tags: Array.isArray(obj['tags'])
      ? (obj['tags'] as string[])
      : Array.isArray(obj['skills'])
      ? (obj['skills'] as string[])
      : [],
  };
}

export class WellfoundPlatform extends BaseJobPlatform {
  name = 'wellfound';
  private readonly BASE_URL = 'https://wellfound.com';
  private readonly USER_AGENT =
    'Mozilla/5.0 (compatible; AutoApply/1.0; +https://github.com/autoapply)';

  async search(query: JobSearchQuery): Promise<RawJob[]> {
    try {
      const queryStr = (query.keywords ?? []).join(' ');
      const location = query.location ?? '';

      const params = new URLSearchParams();
      if (queryStr) params.set('role', queryStr);
      if (location) params.set('location', location);
      if (query.remote) params.set('remote', 'true');

      const url = `${this.BASE_URL}/jobs?${params.toString()}`;

      logger.info({ platform: this.name, url }, 'Fetching jobs from Wellfound');

      const response = await fetch(url, {
        headers: {
          'User-Agent': this.USER_AGENT,
          Accept: 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        throw new Error(`Wellfound returned HTTP ${response.status}`);
      }

      const html = await response.text();
      const rawJobs = parseWellfoundEmbeddedJson(html);

      if (rawJobs.length === 0) {
        logger.warn({ platform: this.name }, 'No jobs parsed from Wellfound HTML — page structure may have changed');
        return [];
      }

      const jobs: RawJob[] = rawJobs
        .filter((j) => j.title && j.company)
        .map((j) => this.toRawJob(j))
        .filter((job) => this.matchesQuery(job, query));

      logger.info({ platform: this.name, count: jobs.length }, 'Fetched jobs from Wellfound');
      return jobs;
    } catch (error) {
      logger.error({ platform: this.name, error }, 'Wellfound search failed');
      return [];
    }
  }

  private toRawJob(j: WellfoundJobRaw): RawJob {
    const isRemote =
      j.remote === true ||
      (j.location ?? '').toLowerCase().includes('remote');

    return {
      externalId: `wellfound-${String(j.id)}`,
      platform: 'wellfound',
      title: j.title,
      company: j.company,
      location: j.location || undefined,
      remote: isRemote,
      description: j.description ?? '',
      url: j.url
        ? j.url.startsWith('http')
          ? j.url
          : `${this.BASE_URL}${j.url}`
        : undefined,
      salary:
        j.salaryMin !== undefined || j.salaryMax !== undefined
          ? { min: j.salaryMin, max: j.salaryMax, currency: 'USD' }
          : undefined,
      tags: j.tags && j.tags.length > 0 ? j.tags : undefined,
      postedAt: j.postedAt ? new Date(j.postedAt) : undefined,
      fetchedAt: new Date(),
    };
  }

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${this.BASE_URL}/jobs`, {
        headers: { 'User-Agent': this.USER_AGENT },
        signal: AbortSignal.timeout(8000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}

export const wellfoundPlatform = new WellfoundPlatform();
