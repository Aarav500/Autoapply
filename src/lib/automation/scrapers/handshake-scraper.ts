// ============================================
// HANDSHAKE SCRAPER
// Discovers opportunities from Handshake (college career platform)
// ============================================

import { browserManager } from '../browser';
import { addOpportunity, Opportunity } from '../opportunity-store';
import { checkEligibility, calculateEnhancedScore } from '../eligibility-checker';
import { DEFAULT_PROFILE } from '../user-profile';

const HANDSHAKE_BASE_URL = 'https://app.joinhandshake.com';

interface HandshakeJob {
    title: string;
    company: string;
    location: string;
    jobType: string;
    url: string;
}

/**
 * Scrape Handshake for job/internship listings
 * Note: Requires authentication - will attempt to use existing session
 */
export async function scrapeHandshake(): Promise<HandshakeJob[]> {
    const bm = browserManager;
    const jobs: HandshakeJob[] = [];

    bm.log('🔍 Starting Handshake scraper...');

    try {
        const page = await bm.getPage();
        if (!page) throw new Error('Failed to get browser page');

        // Navigate to Handshake jobs page
        const searchUrl = `${HANDSHAKE_BASE_URL}/stu/postings?page=1&per_page=25&sort_direction=desc&sort_column=default&category[]=3&category[]=4`;
        bm.log(`Navigating to Handshake: ${searchUrl}`);

        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 45000 });
        await new Promise(r => setTimeout(r, 3000));

        // Check if logged in
        const isLoggedIn = await page.evaluate(() => {
            return !document.querySelector('[data-hook="login-button"]') &&
                !window.location.href.includes('login');
        });

        if (!isLoggedIn) {
            bm.log('⚠️ Handshake requires login - please log in first at https://app.joinhandshake.com');
            return jobs;
        }

        const listings = await page.evaluate(() => {
            const results: Array<{ title: string; company: string; location: string; jobType: string; url: string }> = [];

            const cards = document.querySelectorAll('[data-hook="jobs-card"], .style__job-card, .posting-card');

            cards.forEach((card) => {
                try {
                    const titleEl = card.querySelector('[data-hook="job-title"], .style__job-title, h3');
                    const companyEl = card.querySelector('[data-hook="employer-name"], .style__employer-name');
                    const locationEl = card.querySelector('[data-hook="job-location"], .style__location');
                    const typeEl = card.querySelector('[data-hook="job-type"], .style__job-type');
                    const linkEl = card.querySelector('a');

                    if (titleEl) {
                        results.push({
                            title: titleEl.textContent?.trim() || '',
                            company: companyEl?.textContent?.trim() || 'Unknown',
                            location: locationEl?.textContent?.trim() || 'Remote',
                            jobType: typeEl?.textContent?.trim() || 'Internship',
                            url: (linkEl as HTMLAnchorElement)?.href || '',
                        });
                    }
                } catch { /* skip */ }
            });
            return results;
        });

        bm.log(`Found ${listings.length} opportunities on Handshake`);
        jobs.push(...listings);

    } catch (error) {
        bm.log(`❌ Handshake scraper error: ${error instanceof Error ? error.message : error}`);
    }

    return jobs;
}

/**
 * Discover and add Handshake jobs to opportunity store
 */
export async function discoverHandshakeJobs(): Promise<number> {
    const jobs = await scrapeHandshake();
    let addedCount = 0;

    for (const job of jobs) {
        const opp: Omit<Opportunity, 'id' | 'status' | 'discoveredAt'> = {
            type: 'job',
            title: job.title,
            organization: job.company,
            url: job.url || HANDSHAKE_BASE_URL,
            location: job.location,
            requirements: [],
            description: `${job.title} - ${job.jobType}`,
            matchScore: 0,
        };

        const tempOpp = { ...opp, id: 'temp', status: 'discovered', discoveredAt: new Date() } as Opportunity;
        const eligibility = checkEligibility(tempOpp, DEFAULT_PROFILE);

        if (eligibility.eligible) {
            opp.matchScore = calculateEnhancedScore(85, eligibility); // Higher score for campus recruiting
            addOpportunity(opp);
            addedCount++;
            browserManager.log(`✓ Added Handshake: ${job.title} @ ${job.company}`);
        }
    }

    browserManager.log(`Added ${addedCount}/${jobs.length} Handshake opportunities`);
    return addedCount;
}
