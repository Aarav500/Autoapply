// ============================================
// ZIPRECRUITER SCRAPER
// Discovers job opportunities from ZipRecruiter
// ============================================

import { browserManager } from '../browser';
import { addOpportunity, Opportunity } from '../opportunity-store';
import { checkEligibility, calculateEnhancedScore } from '../eligibility-checker';
import { DEFAULT_PROFILE } from '../user-profile';

const ZIPRECRUITER_BASE_URL = 'https://www.ziprecruiter.com';

/**
 * Scrape ZipRecruiter for job listings
 */
export async function scrapeZipRecruiter(query: string = 'software engineer intern'): Promise<number> {
    const bm = browserManager;
    let addedCount = 0;

    bm.log('🔍 Starting ZipRecruiter scraper...');

    try {
        const page = await bm.getPage();
        if (!page) throw new Error('Failed to get browser page');

        const searchUrl = `${ZIPRECRUITER_BASE_URL}/jobs-search?search=${encodeURIComponent(query)}&location=United+States`;
        bm.log(`Navigating to ZipRecruiter: ${searchUrl}`);

        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 45000 });
        await new Promise(r => setTimeout(r, 3000));

        const listings = await page.evaluate(() => {
            const results: Array<{ title: string; company: string; location: string; salary?: string; url: string }> = [];

            const cards = document.querySelectorAll('.job_result, [data-testid="job-card"], article.job_content');

            cards.forEach((card) => {
                try {
                    const titleEl = card.querySelector('.job_title, h2, [data-testid="job-title"]');
                    const companyEl = card.querySelector('.hiring_company, .company_name, [data-testid="company-name"]');
                    const locationEl = card.querySelector('.job_location, .location');
                    const salaryEl = card.querySelector('.job_salary, .salary');
                    const linkEl = card.querySelector('a[href*="job"]');

                    if (titleEl) {
                        results.push({
                            title: titleEl.textContent?.trim() || '',
                            company: companyEl?.textContent?.trim() || 'Unknown',
                            location: locationEl?.textContent?.trim() || 'Remote',
                            salary: salaryEl?.textContent?.trim(),
                            url: (linkEl as HTMLAnchorElement)?.href || '',
                        });
                    }
                } catch { /* skip */ }
            });
            return results;
        });

        bm.log(`Found ${listings.length} jobs on ZipRecruiter`);

        for (const job of listings) {
            if (!job.title.toLowerCase().includes('intern') &&
                !job.title.toLowerCase().includes('entry') &&
                !job.title.toLowerCase().includes('junior')) continue;

            const opp: Omit<Opportunity, 'id' | 'status' | 'discoveredAt'> = {
                type: 'job',
                title: job.title,
                organization: job.company,
                url: job.url || ZIPRECRUITER_BASE_URL,
                salary: job.salary,
                location: job.location,
                requirements: [],
                description: `${job.title} at ${job.company}`,
                matchScore: 0,
            };

            const tempOpp = { ...opp, id: 'temp', status: 'discovered', discoveredAt: new Date() } as Opportunity;
            const eligibility = checkEligibility(tempOpp, DEFAULT_PROFILE);

            if (eligibility.eligible) {
                opp.matchScore = calculateEnhancedScore(75, eligibility);
                addOpportunity(opp);
                addedCount++;
                bm.log(`✓ Added ZipRecruiter: ${job.title} @ ${job.company}`);
            }
        }

    } catch (error) {
        bm.log(`❌ ZipRecruiter scraper error: ${error instanceof Error ? error.message : error}`);
    }

    browserManager.log(`Added ${addedCount} ZipRecruiter jobs`);
    return addedCount;
}

export { scrapeZipRecruiter as discoverZipRecruiterJobs };
