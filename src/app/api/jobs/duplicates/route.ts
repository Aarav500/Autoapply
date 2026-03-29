import { NextRequest } from 'next/server';
import { authenticate, handleError, successResponse } from '@/lib/api-utils';
import { storage } from '@/lib/storage';
import { logger } from '@/lib/logger';
import type { Job } from '@/types/job';

/** Normalize a string for comparison: lowercase, remove punctuation, collapse whitespace */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Compute simple bigram-based similarity between two normalized strings.
 * Returns a value in [0, 1].
 */
function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return a === b ? 1 : 0;

  const getBigrams = (str: string): Map<string, number> => {
    const map = new Map<string, number>();
    for (let i = 0; i < str.length - 1; i++) {
      const bg = str.slice(i, i + 2);
      map.set(bg, (map.get(bg) ?? 0) + 1);
    }
    return map;
  };

  const bigramsA = getBigrams(a);
  const bigramsB = getBigrams(b);

  let intersection = 0;
  for (const [bg, countA] of bigramsA) {
    const countB = bigramsB.get(bg) ?? 0;
    intersection += Math.min(countA, countB);
  }

  const totalA = a.length - 1;
  const totalB = b.length - 1;
  return (2 * intersection) / (totalA + totalB);
}

/** Returns true if two jobs are duplicates (title+company similarity >= 80% OR same URL) */
function areDuplicates(a: Job, b: Job): { isDupe: boolean; reason: string } {
  // Same URL check
  if (a.url && b.url) {
    const urlA = a.url.replace(/\/$/, '').toLowerCase();
    const urlB = b.url.replace(/\/$/, '').toLowerCase();
    if (urlA === urlB) {
      return { isDupe: true, reason: 'Same URL' };
    }
  }

  // Title + company similarity
  const titleSim = similarity(normalize(a.title), normalize(b.title));
  const companySim = similarity(normalize(a.company), normalize(b.company));
  const combinedSim = (titleSim + companySim) / 2;

  if (combinedSim >= 0.8) {
    const pct = Math.round(combinedSim * 100);
    return { isDupe: true, reason: `${pct}% title/company match` };
  }

  return { isDupe: false, reason: '' };
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);

    // Load jobs index
    const raw = await storage.getJSON<unknown>(`users/${userId}/jobs/index.json`);
    const jobs: Job[] = Array.isArray(raw)
      ? (raw as Job[])
      : ((raw as { jobs?: Job[] } | null)?.jobs ?? []);

    if (jobs.length === 0) {
      return successResponse({ duplicateGroups: [] });
    }

    // Union-Find to cluster duplicates
    const parent: number[] = jobs.map((_, i) => i);
    const reason: string[] = new Array(jobs.length).fill('');

    function find(x: number): number {
      if (parent[x] !== x) parent[x] = find(parent[x]);
      return parent[x];
    }

    function union(x: number, y: number, r: string) {
      const px = find(x);
      const py = find(y);
      if (px !== py) {
        parent[py] = px;
        if (!reason[px]) reason[px] = r;
      }
    }

    for (let i = 0; i < jobs.length; i++) {
      for (let j = i + 1; j < jobs.length; j++) {
        const check = areDuplicates(jobs[i], jobs[j]);
        if (check.isDupe) {
          union(i, j, check.reason);
        }
      }
    }

    // Group by root
    const groups = new Map<number, { indices: number[]; reason: string }>();
    for (let i = 0; i < jobs.length; i++) {
      const root = find(i);
      if (!groups.has(root)) groups.set(root, { indices: [], reason: reason[root] || 'Duplicate' });
      groups.get(root)!.indices.push(i);
    }

    // Only keep groups with > 1 job
    const duplicateGroups: Array<{ jobs: Job[]; reason: string }> = [];
    const duplicateIds = new Set<string>();

    for (const { indices, reason: groupReason } of groups.values()) {
      if (indices.length > 1) {
        const groupJobs = indices.map((idx) => jobs[idx]);
        duplicateGroups.push({ jobs: groupJobs, reason: groupReason });
        // Mark duplicates — keep first as canonical, rest as duplicates
        for (let k = 1; k < groupJobs.length; k++) {
          duplicateIds.add(groupJobs[k].id);
        }
      }
    }

    // Persist isDuplicate flags back to S3 (fire-and-forget)
    if (duplicateIds.size > 0) {
      const updated = jobs.map((j) => ({
        ...j,
        isDuplicate: duplicateIds.has(j.id),
      }));
      storage.putJSON(`users/${userId}/jobs/index.json`, updated).catch((err: unknown) => {
        logger.warn({ err }, 'Failed to persist isDuplicate flags');
      });
    }

    logger.info({ userId, groupCount: duplicateGroups.length }, 'Duplicate scan complete');

    return successResponse({ duplicateGroups });
  } catch (error) {
    logger.error({ error }, 'Duplicate scan error');
    return handleError(error);
  }
}
