// ============================================
// INDEED SCRAPER
// Discovers internship and job opportunities from Indeed
// ============================================

import { browserManager } from '../browser';
import { addOpportunity, Opportunity } from '../opportunity-store';
import { checkEligibility, calculateEnhancedScore } from '../eligibility-checker';
import { DEFAULT_PROFILE } from '../user-profile';

const INDEED_BASE_URL = 'https://www.indeed.com';

interface IndeedJob {
    title: string;
    company: string;
    location: string;
    salary?: string;
    description: string;
    url: string;
}

/**
 * Scrape Indeed for job listings
 */
export async function scrapeIndeed(
    query: string = 'software engineer intern',
    location: string = 'United States'
): Promise<IndeedJob[]> {
    const bm = browserManager;
    const jobs: IndeedJob[] = [];

    bm.log('🔍 Starting Indeed scraper...');

    try {
        const page = await bm.getPage();
        if (!page) {
            throw new Error('Failed to get browser page');
        }

        // Build search URL
        const searchQuery = encodeURIComponent(query);
        const locationQuery = encodeURIComponent(location);
        const searchUrl = `${INDEED_BASE_URL}/jobs?q=${searchQuery}&l=${locationQuery}&vjk=`;

        bm.log(`Navigating to Indeed: ${searchUrl}`);
        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForSelector('body', { timeout: 10000 });

        // Wait a bit for dynamic content
        await new Promise(r => setTimeout(r, 2000));

        // Extract job listings
        const jobListings = await page.evaluate(() => {
            const results: Array<{
                title: string;
                company: string;
                location: string;
                salary?: string;
                snippet: string;
                jobKey: string;
            }> = [];

            // Indeed uses various selectors, try multiple
            const jobCards = document.querySelectorAll('.job_seen_beacon, .jobsearch-ResultsList > li, [data-jk]');

            jobCards.forEach((card) => {
                try {
                    const titleEl = card.querySelector('h2 a, .jobTitle a, [data-jk] a');
                    const companyEl = card.querySelector('.companyName, [data-testid="company-name"], .company');
                    const locationEl = card.querySelector('.companyLocation, [data-testid="text-location"]');
                    const salaryEl = card.querySelector('.salary-snippet-container, .estimated-salary, .metadata .salary');
                    const snippetEl = card.querySelector('.job-snippet, .job-summary');
                    const jobKey = card.getAttribute('data-jk') || '';

                    if (titleEl && companyEl) {
                        results.push({
                            title: titleEl.textContent?.trim() || '',
                            company: companyEl.textContent?.trim() || '',
                            location: locationEl?.textContent?.trim() || 'Remote',
                            salary: salaryEl?.textContent?.trim(),
                            snippet: snippetEl?.textContent?.trim() || '',
                            jobKey,
                        });
                    }
                } catch (e) {
                    // Skip malformed cards
                }
            });

            return results;
        });

        bm.log(`Found ${jobListings.length} jobs on Indeed`);

        // Convert to our format
        for (const listing of jobListings) {
            jobs.push({
                title: listing.title,
                company: listing.company,
                location: listing.location,
                salary: listing.salary,
                description: listing.snippet,
                url: listing.jobKey
                    ? `${INDEED_BASE_URL}/viewjob?jk=${listing.jobKey}`
                    : INDEED_BASE_URL,
            });
        }

    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        bm.log(`❌ Indeed scraper error: ${msg}`);
    }

    return jobs;
}

/**
 * Discover and add Indeed jobs to opportunity store
 */
export async function discoverIndeedJobs(
    query: string = 'software engineer intern'
): Promise<number> {
    const jobs = await scrapeIndeed(query);
    let addedCount = 0;

    for (const job of jobs) {
        // Create opportunity
        const opp: Omit<Opportunity, 'id' | 'status' | 'discoveredAt'> = {
            type: 'job',
            title: job.title,
            organization: job.company,
            url: job.url,
            salary: job.salary,
            location: job.location,
            requirements: extractRequirements(job.description),
            description: job.description,
            matchScore: 0, // Will be calculated
        };

        // Check eligibility and calculate score
        const tempOpp = { ...opp, id: 'temp', status: 'discovered', discoveredAt: new Date() } as Opportunity;
        const eligibility = checkEligibility(tempOpp, DEFAULT_PROFILE);

        if (eligibility.eligible) {
            opp.matchScore = calculateEnhancedScore(80, eligibility); // Base score 80 for Indeed jobs
            addOpportunity(opp);
            addedCount++;
            browserManager.log(`✓ Added: ${job.title} @ ${job.company} (score: ${opp.matchScore})`);
        } else {
            browserManager.log(`✗ Skipped: ${job.title} - ${eligibility.failedCriteria.join(', ')}`);
        }
    }

    browserManager.log(`Added ${addedCount}/${jobs.length} Indeed jobs to queue`);
    return addedCount;
}

/**
 * Extract requirements from job description
 */
function extractRequirements(description: string): string[] {
    const requirements: string[] = [];
    const text = description.toLowerCase();

    // Look for common requirement patterns
    const patterns = [
        { pattern: /python/i, req: 'Python' },
        { pattern: /javascript|js/i, req: 'JavaScript' },
        { pattern: /react/i, req: 'React' },
        { pattern: /node\.?js/i, req: 'Node.js' },
        { pattern: /java[^s]/i, req: 'Java' },
        { pattern: /c\+\+/i, req: 'C++' },
        { pattern: /sql/i, req: 'SQL' },
        { pattern: /aws/i, req: 'AWS' },
        { pattern: /machine learning|ml/i, req: 'Machine Learning' },
        { pattern: /gpa\s*[\d\.]+/i, req: text.match(/gpa\s*[\d\.]+/i)?.[0] || 'GPA requirement' },
    ];

    for (const { pattern, req } of patterns) {
        if (pattern.test(text)) {
            requirements.push(req);
        }
    }

    return requirements;
}
