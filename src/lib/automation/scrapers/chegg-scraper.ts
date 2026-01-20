// ============================================
// CHEGG INTERNSHIPS SCRAPER
// Discovers internship opportunities from Chegg
// ============================================

import { browserManager } from '../browser';
import { addOpportunity, Opportunity } from '../opportunity-store';
import { checkEligibility, calculateEnhancedScore } from '../eligibility-checker';
import { DEFAULT_PROFILE } from '../user-profile';

const CHEGG_URL = 'https://www.internships.com';

/**
 * Scrape Chegg Internships for opportunities
 */
export async function discoverCheggInternships(): Promise<number> {
    const bm = browserManager;
    let addedCount = 0;

    bm.log('🔍 Starting Chegg Internships scraper...');

    try {
        const page = await bm.getPage();
        if (!page) throw new Error('Failed to get browser page');

        const searchUrl = `${CHEGG_URL}/app/search?keywords=software%20engineering`;
        bm.log(`Navigating to Chegg Internships: ${searchUrl}`);

        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 45000 });
        await new Promise(r => setTimeout(r, 3000));

        const listings = await page.evaluate(() => {
            const results: Array<{ title: string; company: string; location: string; url: string }> = [];

            const cards = document.querySelectorAll('.internship-card, .job-listing, article');

            cards.forEach((card) => {
                try {
                    const titleEl = card.querySelector('.title, h2, h3');
                    const companyEl = card.querySelector('.company, .employer');
                    const locationEl = card.querySelector('.location');
                    const linkEl = card.querySelector('a[href*="internship"]');

                    if (titleEl) {
                        results.push({
                            title: titleEl.textContent?.trim() || '',
                            company: companyEl?.textContent?.trim() || 'Unknown',
                            location: locationEl?.textContent?.trim() || 'Remote',
                            url: (linkEl as HTMLAnchorElement)?.href || '',
                        });
                    }
                } catch { /* skip */ }
            });
            return results;
        });

        bm.log(`Found ${listings.length} internships on Chegg`);

        for (const job of listings) {
            const opp: Omit<Opportunity, 'id' | 'status' | 'discoveredAt'> = {
                type: 'job',
                title: job.title,
                organization: job.company,
                url: job.url || CHEGG_URL,
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
                bm.log(`✓ Added: ${job.title} @ ${job.company}`);
            }
        }

    } catch (error) {
        bm.log(`❌ Chegg Internships scraper error: ${error instanceof Error ? error.message : error}`);
    }

    browserManager.log(`Added ${addedCount} Chegg internships`);
    return addedCount;
}
