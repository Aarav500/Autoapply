// ============================================
// FASTWEB SCRAPER
// Discovers scholarship opportunities from Fastweb
// ============================================

import { browserManager } from '../browser';
import { addOpportunity, Opportunity } from '../opportunity-store';
import { checkEligibility, calculateEnhancedScore } from '../eligibility-checker';
import { DEFAULT_PROFILE } from '../user-profile';

const FASTWEB_BASE_URL = 'https://www.fastweb.com';

interface FastwebScholarship {
    title: string;
    provider: string;
    amount: string;
    deadline: string;
    description: string;
    url: string;
}

/**
 * Scrape Fastweb for scholarships
 */
export async function scrapeFastweb(): Promise<FastwebScholarship[]> {
    const bm = browserManager;
    const scholarships: FastwebScholarship[] = [];

    bm.log('🔍 Starting Fastweb scraper...');

    try {
        const page = await bm.getPage();
        if (!page) {
            throw new Error('Failed to get browser page');
        }

        // Navigate to scholarship search
        const searchUrl = `${FASTWEB_BASE_URL}/college-scholarships`;
        bm.log(`Navigating to Fastweb: ${searchUrl}`);

        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForSelector('body', { timeout: 10000 });
        await new Promise(r => setTimeout(r, 2000));

        // Extract scholarship listings
        const listings = await page.evaluate(() => {
            const results: Array<{
                title: string;
                provider: string;
                amount: string;
                deadline: string;
                description: string;
                url: string;
            }> = [];

            // Fastweb scholarship card selectors
            const cards = document.querySelectorAll('.scholarship-result, .result-card, [data-scholarship]');

            cards.forEach((card) => {
                try {
                    const titleEl = card.querySelector('h3, .scholarship-title, .result-title');
                    const providerEl = card.querySelector('.provider, .sponsor, .scholarship-sponsor');
                    const amountEl = card.querySelector('.amount, .award-amount');
                    const deadlineEl = card.querySelector('.deadline, .due-date');
                    const descriptionEl = card.querySelector('.description, .summary');
                    const linkEl = card.querySelector('a[href*="scholarship"]');

                    results.push({
                        title: titleEl?.textContent?.trim() || 'Unnamed Scholarship',
                        provider: providerEl?.textContent?.trim() || 'Fastweb',
                        amount: amountEl?.textContent?.trim() || 'Varies',
                        deadline: deadlineEl?.textContent?.trim() || '',
                        description: descriptionEl?.textContent?.trim() || '',
                        url: (linkEl as HTMLAnchorElement)?.href || '',
                    });
                } catch (e) {
                    // Skip malformed cards
                }
            });

            return results;
        });

        bm.log(`Found ${listings.length} scholarships on Fastweb`);
        scholarships.push(...listings);

    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        bm.log(`❌ Fastweb scraper error: ${msg}`);
    }

    return scholarships;
}

/**
 * Discover and add Fastweb scholarships to opportunity store
 */
export async function discoverFastwebScholarships(): Promise<number> {
    const scholarships = await scrapeFastweb();
    let addedCount = 0;

    for (const scholarship of scholarships) {
        // Parse deadline
        let deadline: string | undefined;
        if (scholarship.deadline) {
            try {
                const parsed = new Date(scholarship.deadline);
                if (!isNaN(parsed.getTime())) {
                    deadline = parsed.toISOString().split('T')[0];
                }
            } catch {
                // Invalid date, skip
            }
        }

        // Parse amount
        let amount: number | undefined;
        const amountMatch = scholarship.amount.match(/\$?([\d,]+)/);
        if (amountMatch) {
            amount = parseInt(amountMatch[1].replace(/,/g, ''), 10);
        }

        // Create opportunity
        const opp: Omit<Opportunity, 'id' | 'status' | 'discoveredAt'> = {
            type: 'scholarship',
            title: scholarship.title,
            organization: scholarship.provider,
            url: scholarship.url || FASTWEB_BASE_URL,
            deadline,
            amount,
            requirements: [],
            description: scholarship.description,
            matchScore: 0,
        };

        // Check eligibility
        const tempOpp = { ...opp, id: 'temp', status: 'discovered', discoveredAt: new Date() } as Opportunity;
        const eligibility = checkEligibility(tempOpp, DEFAULT_PROFILE);

        if (eligibility.eligible) {
            opp.matchScore = calculateEnhancedScore(75, eligibility);
            addOpportunity(opp);
            addedCount++;
            browserManager.log(`✓ Added: ${scholarship.title} - ${scholarship.amount} (score: ${opp.matchScore})`);
        } else {
            browserManager.log(`✗ Skipped: ${scholarship.title} - ${eligibility.failedCriteria.join(', ')}`);
        }
    }

    browserManager.log(`Added ${addedCount}/${scholarships.length} Fastweb scholarships to queue`);
    return addedCount;
}
