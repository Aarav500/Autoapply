// ============================================
// COMPANY CAREER SCRAPERS
// Direct scraping of major tech company career pages
// ============================================

import { browserManager } from '../browser';
import { addOpportunity, Opportunity } from '../opportunity-store';
import { checkEligibility, calculateEnhancedScore } from '../eligibility-checker';
import { DEFAULT_PROFILE } from '../user-profile';

interface CompanyJob {
    title: string;
    company: string;
    location: string;
    url: string;
    description: string;
}

type CompanyName = 'google' | 'meta' | 'amazon' | 'microsoft' | 'apple' | 'netflix';

interface CompanyConfig {
    name: string;
    careerUrl: string;
    internKeywords: string[];
}

const COMPANY_CONFIGS: Record<CompanyName, CompanyConfig> = {
    google: {
        name: 'Google',
        careerUrl: 'https://www.google.com/about/careers/applications/jobs/results/?q=intern&location=United%20States',
        internKeywords: ['intern', 'internship', 'student', 'new grad'],
    },
    meta: {
        name: 'Meta',
        careerUrl: 'https://www.metacareers.com/jobs?q=intern',
        internKeywords: ['intern', 'internship', 'university', 'early career'],
    },
    amazon: {
        name: 'Amazon',
        careerUrl: 'https://www.amazon.jobs/en/search?base_query=intern&loc_query=United+States',
        internKeywords: ['intern', 'internship', 'sde intern', 'software dev engineer intern'],
    },
    microsoft: {
        name: 'Microsoft',
        careerUrl: 'https://careers.microsoft.com/v2/global/en/search?q=intern&lc=United%20States',
        internKeywords: ['intern', 'internship', 'explore', 'new graduate'],
    },
    apple: {
        name: 'Apple',
        careerUrl: 'https://jobs.apple.com/en-us/search?search=intern&sort=relevance',
        internKeywords: ['intern', 'internship', 'student'],
    },
    netflix: {
        name: 'Netflix',
        careerUrl: 'https://jobs.netflix.com/search?q=intern',
        internKeywords: ['intern', 'internship', 'new grad'],
    },
};

/**
 * Generic company career page scraper
 */
export async function scrapeCompanyJobs(company: CompanyName): Promise<CompanyJob[]> {
    const bm = browserManager;
    const config = COMPANY_CONFIGS[company];
    const jobs: CompanyJob[] = [];

    bm.log(`🔍 Starting ${config.name} careers scraper...`);

    try {
        const page = await bm.getPage();
        if (!page) {
            throw new Error('Failed to get browser page');
        }

        bm.log(`Navigating to ${config.name} careers: ${config.careerUrl}`);
        await page.goto(config.careerUrl, { waitUntil: 'networkidle2', timeout: 45000 });
        await new Promise(r => setTimeout(r, 3000)); // Wait for dynamic content

        // Generic job card extraction with multiple selector patterns
        const jobListings = await page.evaluate((companyName) => {
            const results: Array<{
                title: string;
                location: string;
                url: string;
            }> = [];

            // Common job listing selectors across company sites
            const selectors = [
                '[role="listitem"]',
                '.job-result',
                '.job-listing',
                '.jobs-list-item',
                '.gc-card',
                '[data-job-id]',
                'article',
                '.opening',
                'li[data-id]',
            ];

            for (const selector of selectors) {
                const cards = document.querySelectorAll(selector);
                if (cards.length > 0) {
                    cards.forEach((card) => {
                        const titleEl = card.querySelector('h2, h3, h4, .title, [class*="title"], a');
                        const locationEl = card.querySelector('[class*="location"], .location, [class*="loc"]');
                        const linkEl = card.querySelector('a[href*="job"], a[href*="career"], a[href*="position"]') ||
                            card.querySelector('a');

                        if (titleEl) {
                            results.push({
                                title: titleEl.textContent?.trim() || '',
                                location: locationEl?.textContent?.trim() || 'Multiple Locations',
                                url: (linkEl as HTMLAnchorElement)?.href || '',
                            });
                        }
                    });
                    break; // Use first matching selector pattern
                }
            }

            return results;
        }, config.name);

        // Filter for intern positions and convert to our format
        for (const listing of jobListings) {
            const isIntern = config.internKeywords.some(kw =>
                listing.title.toLowerCase().includes(kw)
            );

            if (isIntern) {
                jobs.push({
                    title: listing.title,
                    company: config.name,
                    location: listing.location,
                    url: listing.url,
                    description: `${config.name} internship opportunity`,
                });
            }
        }

        bm.log(`Found ${jobs.length} intern positions at ${config.name}`);

    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        bm.log(`❌ ${config.name} scraper error: ${msg}`);
    }

    return jobs;
}

/**
 * Scrape all configured company career pages
 */
export async function scrapeAllCompanies(): Promise<CompanyJob[]> {
    const allJobs: CompanyJob[] = [];

    for (const company of Object.keys(COMPANY_CONFIGS) as CompanyName[]) {
        try {
            const jobs = await scrapeCompanyJobs(company);
            allJobs.push(...jobs);
            // Add delay between companies to avoid rate limiting
            await new Promise(r => setTimeout(r, 2000));
        } catch (error) {
            browserManager.log(`Failed to scrape ${company}: ${error}`);
        }
    }

    return allJobs;
}

/**
 * Discover and add company jobs to opportunity store
 */
export async function discoverCompanyJobs(): Promise<number> {
    const jobs = await scrapeAllCompanies();
    let addedCount = 0;

    for (const job of jobs) {
        const opp: Omit<Opportunity, 'id' | 'status' | 'discoveredAt'> = {
            type: 'job',
            title: job.title,
            organization: job.company,
            url: job.url,
            location: job.location,
            requirements: [],
            description: job.description,
            matchScore: 0,
        };

        // Tech giants get higher base score
        const baseScore = 85;
        const tempOpp = { ...opp, id: 'temp', status: 'discovered', discoveredAt: new Date() } as Opportunity;
        const eligibility = checkEligibility(tempOpp, DEFAULT_PROFILE);

        if (eligibility.eligible) {
            opp.matchScore = calculateEnhancedScore(baseScore, eligibility);
            addOpportunity(opp);
            addedCount++;
            browserManager.log(`✓ Added: ${job.title} @ ${job.company} (score: ${opp.matchScore})`);
        }
    }

    browserManager.log(`Added ${addedCount}/${jobs.length} company jobs to queue`);
    return addedCount;
}
