// ============================================
// SCHOLARSHIPS.COM SCRAPER
// Discovers scholarship opportunities
// ============================================

import { browserManager } from '../browser';
import { addOpportunity, Opportunity } from '../opportunity-store';
import { checkEligibility, calculateEnhancedScore } from '../eligibility-checker';
import { DEFAULT_PROFILE } from '../user-profile';

const SCHOLARSHIPS_COM_URL = 'https://www.scholarships.com';

/**
 * Scrape Scholarships.com for scholarship listings
 */
export async function discoverScholarshipsCom(): Promise<number> {
    const bm = browserManager;
    let addedCount = 0;

    bm.log('🔍 Starting Scholarships.com scraper...');

    try {
        const page = await bm.getPage();
        if (!page) throw new Error('Failed to get browser page');

        const searchUrl = `${SCHOLARSHIPS_COM_URL}/scholarship-search.aspx`;
        bm.log(`Navigating to Scholarships.com: ${searchUrl}`);

        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 45000 });
        await new Promise(r => setTimeout(r, 3000));

        const listings = await page.evaluate(() => {
            const results: Array<{ title: string; amount: string; deadline: string; url: string }> = [];

            const cards = document.querySelectorAll('.scholarship-result, .sch_result, tr[data-scholarship-id]');

            cards.forEach((card) => {
                try {
                    const titleEl = card.querySelector('.scholarship-title, .sch_name, a');
                    const amountEl = card.querySelector('.amount, .award-amount');
                    const deadlineEl = card.querySelector('.deadline, .due-date');
                    const linkEl = card.querySelector('a[href]');

                    if (titleEl) {
                        results.push({
                            title: titleEl.textContent?.trim() || '',
                            amount: amountEl?.textContent?.trim() || 'Varies',
                            deadline: deadlineEl?.textContent?.trim() || '',
                            url: (linkEl as HTMLAnchorElement)?.href || '',
                        });
                    }
                } catch { /* skip */ }
            });
            return results;
        });

        bm.log(`Found ${listings.length} scholarships on Scholarships.com`);

        for (const sch of listings) {
            const opp: Omit<Opportunity, 'id' | 'status' | 'discoveredAt'> = {
                type: 'scholarship',
                title: sch.title,
                organization: 'Scholarships.com',
                url: sch.url || SCHOLARSHIPS_COM_URL,
                deadline: sch.deadline,
                requirements: [],
                description: `${sch.title} - ${sch.amount}`,
                matchScore: 0,
            };

            const tempOpp = { ...opp, id: 'temp', status: 'discovered', discoveredAt: new Date() } as Opportunity;
            const eligibility = checkEligibility(tempOpp, DEFAULT_PROFILE);

            if (eligibility.eligible) {
                opp.matchScore = calculateEnhancedScore(75, eligibility);
                addOpportunity(opp);
                addedCount++;
                bm.log(`✓ Added: ${sch.title}`);
            }
        }

    } catch (error) {
        bm.log(`❌ Scholarships.com scraper error: ${error instanceof Error ? error.message : error}`);
    }

    browserManager.log(`Added ${addedCount} Scholarships.com opportunities`);
    return addedCount;
}
