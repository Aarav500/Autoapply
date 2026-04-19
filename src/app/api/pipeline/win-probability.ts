import { Job } from '@/types/job';

const TIER1_COMPANIES = new Set([
  'google', 'meta', 'apple', 'amazon', 'microsoft', 'netflix',
  'openai', 'deepmind', 'stripe', 'airbnb', 'uber', 'lyft',
]);

function isStartup(company: string): boolean {
  const name = company.toLowerCase();
  return (
    name.includes('labs') ||
    name.includes('ai') ||
    name.includes('io') ||
    name.includes('hq') ||
    name.includes('.co') ||
    name.length < 8
  );
}

export function computeWinProbForExport(job: Job): number {
  const baseByStage: Record<string, number> = {
    saved: 5,
    applying: 8,
    applied: 10,
    screening: 25,
    interview: 45,
    offer: 75,
    discovered: 3,
    rejected: 0,
  };

  let prob = baseByStage[job.status] ?? 10;

  if (job.matchScore >= 80) prob += 10;
  else if (job.matchScore < 50) prob -= 5;

  const name = job.company.toLowerCase();
  if (TIER1_COMPANIES.has(name)) {
    prob -= 5;
  } else if (isStartup(job.company)) {
    prob += 5;
  }

  return Math.max(0, Math.min(100, Math.round(prob)));
}
