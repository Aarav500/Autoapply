import { JobSearchQuery, RawJob } from '@/types/job';
import { BaseJobPlatform } from './base';
import { createLogger } from '@/lib/logger';

const logger = createLogger('platform:lever');

interface LeverCategories {
  location?: string;
  team?: string;
}

interface LeverPosting {
  id: string;
  text: string;
  categories: LeverCategories;
  hostedUrl: string;
  createdAt: number; // Unix timestamp ms
  description?: string;
  lists?: Array<{ text: string; content: string }>;
}

const LEVER_COMPANIES = [
  'netflix', 'lyft', 'pinterest', 'reddit', 'dropbox', 'spotify', 'plaid',
  'brex', 'ramp', 'mercury', 'deel', 'remote', 'clearbit', 'segment', 'amplitude',
];

const SALARY_REGEX = /\$[\d,]+(?:\s*[-–]\s*\$[\d,]+)?/g;

function extractSalaryFromDescription(description: string): { min?: number; max?: number; currency?: string } | undefined {
  const matches = description.match(SALARY_REGEX);
  if (!matches || matches.length === 0) return undefined;

  const parseAmount = (str: string): number =>
    parseInt(str.replace(/[$,]/g, ''), 10);

  const first = matches[0];
  const parts = first.split(/[-–]/).map((s) => s.trim());

  if (parts.length === 2) {
    return {
      min: parseAmount(parts[0]),
      max: parseAmount(parts[1]),
      currency: 'USD',
    };
  }

  const amount = parseAmount(first);
  return { min: amount, max: amount, currency: 'USD' };
}

export class LeverPlatform extends BaseJobPlatform {
  name = 'lever';
  private readonly BATCH_SIZE = 5;

  async search(query: JobSearchQuery): Promise<RawJob[]> {
    const results: RawJob[] = [];
    const queryLower = (query.keywords ?? []).join(' ').toLowerCase();
    const companies = LEVER_COMPANIES.slice(0, this.BATCH_SIZE);

    await Promise.allSettled(
      companies.map(async (company) => {
        try {
          const res = await fetch(
            `https://api.lever.co/v0/postings/${company}?mode=json`,
            { signal: AbortSignal.timeout(8000) }
          );

          if (!res.ok) return;

          const postings = await res.json() as LeverPosting[];
          if (!Array.isArray(postings)) return;

          const matching = postings.filter((p) =>
            p.text.toLowerCase().includes(queryLower) ||
            queryLower.split(' ').some(
              (word) => word.length > 3 && p.text.toLowerCase().includes(word)
            )
          );

          for (const p of matching) {
            const locationText = p.categories?.location ?? query.location ?? '';
            const isRemote = locationText.toLowerCase().includes('remote');

            const matchesLocation =
              !query.location ||
              isRemote ||
              locationText.toLowerCase().includes((query.location ?? '').toLowerCase());

            if (!matchesLocation) continue;

            const description = p.description ?? '';
            const salary = extractSalaryFromDescription(description);

            results.push({
              externalId: `lever-${p.id}`,
              platform: 'lever' as RawJob['platform'],
              title: p.text,
              company: company.charAt(0).toUpperCase() + company.slice(1),
              location: locationText || undefined,
              remote: isRemote,
              description,
              url: p.hostedUrl,
              salary,
              tags: p.categories?.team ? [p.categories.team] : undefined,
              postedAt: p.createdAt ? new Date(p.createdAt) : undefined,
              fetchedAt: new Date(),
            });
          }
        } catch (error) {
          logger.debug({ error, company }, 'Lever fetch failed for company');
        }
      })
    );

    return results;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(
        'https://api.lever.co/v0/postings/netflix?mode=json',
        { signal: AbortSignal.timeout(5000) }
      );
      return res.ok;
    } catch {
      return false;
    }
  }
}

export const leverPlatform = new LeverPlatform();
