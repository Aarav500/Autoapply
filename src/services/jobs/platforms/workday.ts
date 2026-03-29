import { JobSearchQuery, RawJob } from '@/types/job';
import { BaseJobPlatform } from './base';
import { createLogger } from '@/lib/logger';

const logger = createLogger('platform:workday');

interface WorkdayJobPosting {
  title: string;
  locationsText: string;
  postedOn?: string;
  externalPath: string;
}

interface WorkdayResponse {
  jobPostings?: WorkdayJobPosting[];
}

interface WorkdayTenant {
  company: string;
  tenant: string;
}

const WORKDAY_TENANTS: WorkdayTenant[] = [
  { company: 'Microsoft', tenant: 'microsoft' },
  { company: 'Amazon', tenant: 'amazon' },
  { company: 'Apple', tenant: 'apple' },
  { company: 'Meta', tenant: 'meta' },
  { company: 'Salesforce', tenant: 'salesforce' },
  { company: 'Oracle', tenant: 'oracle' },
  { company: 'Adobe', tenant: 'adobe' },
  { company: 'Intel', tenant: 'intel' },
];

export class WorkdayPlatform extends BaseJobPlatform {
  name = 'workday';
  private readonly BATCH_SIZE = 4;

  async search(query: JobSearchQuery): Promise<RawJob[]> {
    const results: RawJob[] = [];
    const searchText = (query.keywords ?? []).join(' ');
    const tenants = WORKDAY_TENANTS.slice(0, this.BATCH_SIZE);

    await Promise.allSettled(
      tenants.map(async ({ company, tenant }) => {
        try {
          const url = `https://${tenant}.wd5.myworkdayjobs.com/wday/cxs/${tenant}/External/jobs`;

          const res = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify({
              appliedFacets: {},
              limit: 20,
              offset: 0,
              searchText,
            }),
            signal: AbortSignal.timeout(10000),
          });

          if (!res.ok) return;

          const data = await res.json() as WorkdayResponse;
          const postings = data.jobPostings ?? [];

          for (const posting of postings) {
            const locationText = posting.locationsText ?? '';
            const isRemote = locationText.toLowerCase().includes('remote');

            const matchesLocation =
              !query.location ||
              isRemote ||
              locationText.toLowerCase().includes((query.location ?? '').toLowerCase());

            if (!matchesLocation) continue;

            const fullUrl = posting.externalPath
              ? `https://${tenant}.wd5.myworkdayjobs.com${posting.externalPath}`
              : undefined;

            results.push({
              externalId: `workday-${tenant}-${posting.externalPath.replace(/\//g, '-').replace(/^-/, '')}`,
              platform: 'workday' as RawJob['platform'],
              title: posting.title,
              company,
              location: locationText || undefined,
              remote: isRemote,
              description: '',
              url: fullUrl,
              postedAt: posting.postedOn ? new Date(posting.postedOn) : undefined,
              fetchedAt: new Date(),
            });
          }
        } catch (error) {
          logger.debug({ error, company, tenant }, 'Workday fetch failed for tenant');
        }
      })
    );

    return results;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(
        'https://microsoft.wd5.myworkdayjobs.com/wday/cxs/microsoft/External/jobs',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ appliedFacets: {}, limit: 1, offset: 0, searchText: 'engineer' }),
          signal: AbortSignal.timeout(5000),
        }
      );
      return res.ok;
    } catch {
      return false;
    }
  }
}

export const workdayPlatform = new WorkdayPlatform();
