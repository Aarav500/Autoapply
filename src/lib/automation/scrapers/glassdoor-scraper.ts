// ============================================
// GLASSDOOR SCRAPER
// Discovers job/internship opportunities from Glassdoor
// ============================================

import { browserManager } from '../browser';
import { addOpportunity, Opportunity } from '../opportunity-store';
import { checkEligibility, calculateEnhancedScore } from '../eligibility-checker';
import { DEFAULT_PROFILE } from '../user-profile';

const GLASSDOOR_BASE_URL = 'https://www.glassdoor.com';

interface GlassdoorJob {
    title: string;
    company: string;
    location: string;
    salary?: string;
    url: string;
}

/**
 * Scrape Glassdoor for job listings
 */
export async function scrapeGlassdoor(query: string = 'software engineer intern'): Promise<GlassdoorJob[]> {
    const bm = browserManager;
    const jobs: GlassdoorJob[] = [];

    bm.log('🔍 Starting Glassdoor scraper...');

    try {
        const page = await bm.getPage();
        if (!page) throw new Error('Failed to get browser page');

        const searchUrl = `${GLASSDOOR_BASE_URL}/Job/jobs.htm?sc.keyword=${encodeURIComponent(query)}`;
        bm.log(`Navigating to Glassdoor: ${searchUrl}`);

        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 45000 });
        await new Promise(r => setTimeout(r, 3000));

        const listings = await page.evaluate(() => {
            const results: Array<{ title: string; company: string; location: string; salary?: string; url: string }> = [];

            const cards = document.querySelectorAll('[data-test="job-link"], .JobCard, .jobLink, li[data-id]');

            cards.forEach((card) => {
                try {
                    const titleEl = card.querySelector('[data-test="job-title"], .jobTitle, h2, h3');
                    const companyEl = card.querySelector('[data-test="emp-name"], .companyName, .employer-name');
                    const locationEl = card.querySelector('[data-test="emp-location"], .location');
                    const salaryEl = card.querySelector('[data-test="detailSalary"], .salary');
                    const linkEl = card.closest('a') || card.querySelector('a');

                    if (titleEl) {
                        results.push({
                            title: titleEl.textContent?.trim() || '',
                            company: companyEl?.textContent?.trim() || 'Unknown Company',
                            location: locationEl?.textContent?.trim() || 'Multiple Locations',
                            salary: salaryEl?.textContent?.trim(),
                            url: (linkEl as HTMLAnchorElement)?.href || '',
                        });
                    }
                } catch { /* skip */ }
            });
            return results;
        });

        bm.log(`Found ${listings.length} jobs on Glassdoor`);
        jobs.push(...listings.filter(j =>
            j.title.toLowerCase().includes('intern') ||
            j.title.toLowerCase().includes('entry') ||
            j.title.toLowerCase().includes('junior')
        ));

    } catch (error) {
        bm.log(`❌ Glassdoor scraper error: ${error instanceof Error ? error.message : error}`);
    }

    return jobs;
}

/**
 * Discover and add Glassdoor jobs to opportunity store
 */
export async function discoverGlassdoorJobs(query: string = 'software engineer intern'): Promise<number> {
    const jobs = await scrapeGlassdoor(query);
    let addedCount = 0;

    for (const job of jobs) {
        const opp: Omit<Opportunity, 'id' | 'status' | 'discoveredAt'> = {
            type: 'job',
            title: job.title,
            organization: job.company,
            url: job.url || GLASSDOOR_BASE_URL,
            salary: job.salary,
            location: job.location,
            requirements: [],
            description: `${job.title} at ${job.company}`,
            matchScore: 0,
        };

        const tempOpp = { ...opp, id: 'temp', status: 'discovered', discoveredAt: new Date() } as Opportunity;
        const eligibility = checkEligibility(tempOpp, DEFAULT_PROFILE);

        if (eligibility.eligible) {
            opp.matchScore = calculateEnhancedScore(78, eligibility);
            addOpportunity(opp);
            addedCount++;
            browserManager.log(`✓ Added Glassdoor: ${job.title} @ ${job.company}`);
        }
    }

    browserManager.log(`Added ${addedCount}/${jobs.length} Glassdoor jobs`);
    return addedCount;
}
