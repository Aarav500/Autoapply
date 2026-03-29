import { JobSearchQuery, RawJob } from '@/types/job';
import { BaseJobPlatform } from './base';
import { createLogger } from '@/lib/logger';

const logger = createLogger('platform:greenhouse');

interface GreenhouseLocation {
  name: string;
}

interface GreenhouseJob {
  id: number;
  title: string;
  location: GreenhouseLocation;
  updated_at: string;
  absolute_url: string;
}

interface GreenhouseResponse {
  jobs?: GreenhouseJob[];
}

// Known companies on Greenhouse (add more as needed)
const GREENHOUSE_COMPANIES = [
  'airbnb', 'stripe', 'figma', 'notion', 'linear', 'vercel', 'supabase',
  'anthropic', 'openai', 'scale', 'databricks', 'snowflake', 'gitlab',
  'hashicorp', 'datadog', 'confluent', 'coda', 'rippling', 'gusto',
];

export class GreenhousePlatform extends BaseJobPlatform {
  name = 'greenhouse';
  private readonly BATCH_SIZE = 5;

  async search(query: JobSearchQuery): Promise<RawJob[]> {
    const results: RawJob[] = [];
    const queryLower = (query.keywords ?? []).join(' ').toLowerCase();

    // Try companies in batches to avoid overwhelming the API
    const companies = GREENHOUSE_COMPANIES.slice(0, this.BATCH_SIZE);

    await Promise.allSettled(
      companies.map(async (company) => {
        try {
          const res = await fetch(
            `https://boards-api.greenhouse.io/v1/boards/${company}/jobs?content=false`,
            { signal: AbortSignal.timeout(8000) }
          );

          if (!res.ok) return;

          const data = await res.json() as GreenhouseResponse;
          const jobs = data.jobs ?? [];

          const matching = jobs.filter((j) =>
            j.title.toLowerCase().includes(queryLower) ||
            queryLower.split(' ').some(
              (word) => word.length > 3 && j.title.toLowerCase().includes(word)
            )
          );

          for (const j of matching) {
            const isRemote = j.location?.name?.toLowerCase().includes('remote') ?? false;
            const locationName = j.location?.name ?? query.location ?? '';
            const matchesLocation =
              !query.location ||
              isRemote ||
              locationName.toLowerCase().includes((query.location ?? '').toLowerCase());

            if (!matchesLocation) continue;

            results.push({
              externalId: `greenhouse-${j.id}`,
              platform: 'greenhouse' as RawJob['platform'],
              title: j.title,
              company: company.charAt(0).toUpperCase() + company.slice(1),
              location: locationName || undefined,
              remote: isRemote,
              description: '',
              url: j.absolute_url,
              postedAt: j.updated_at ? new Date(j.updated_at) : undefined,
              fetchedAt: new Date(),
            });
          }
        } catch (error) {
          logger.debug({ error, company }, 'Greenhouse fetch failed for company');
        }
      })
    );

    return results;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(
        'https://boards-api.greenhouse.io/v1/boards/stripe/jobs?content=false',
        { signal: AbortSignal.timeout(5000) }
      );
      return res.ok;
    } catch {
      return false;
    }
  }
}

export const greenhousePlatform = new GreenhousePlatform();
