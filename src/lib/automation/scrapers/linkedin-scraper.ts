// ============================================
// LINKEDIN JOBS SCRAPER
// Scrapes real jobs from LinkedIn
// ============================================

import { Page } from 'puppeteer';
import { browserManager } from '../browser';
import { addOpportunity } from '../opportunity-store';
import { DEFAULT_PROFILE, UserProfile } from '../user-profile';

export interface ScrapedJob {
    title: string;
    company: string;
    url: string;
    location: string;
    salary?: string;
    requirements: string[];
    description: string;
    easyApply: boolean;
}

// Scrape jobs from LinkedIn
export async function scrapeLinkedInJobs(keywords = 'software engineer intern', maxResults = 20): Promise<ScrapedJob[]> {
    const bm = browserManager;
    const jobs: ScrapedJob[] = [];

    try {
        await bm.initialize();
        const page = bm.getPage();

        bm.log(`💼 Scraping LinkedIn jobs for: ${keywords}`);
        bm.setStep('Navigating to LinkedIn Jobs', 1, 5);

        // LinkedIn public job search (no login required)
        const searchUrl = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(keywords)}&f_AL=true&f_E=1,2`;

        await page.goto(searchUrl, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        bm.log('Page loaded, extracting jobs...');
        bm.setStep('Extracting job listings', 2, 5);

        // Wait for job cards to load
        await page.waitForSelector('.job-card-container, .jobs-search__results-list li', { timeout: 10000 }).catch(() => null);

        // Scroll to load more
        await page.evaluate(() => {
            window.scrollBy(0, 1000);
        });
        await new Promise(r => setTimeout(r, 2000));

        // Extract job data
        const data = await page.evaluate((max: number) => {
            const results: any[] = [];

            // Find job cards
            const cards = document.querySelectorAll('.job-card-container, .jobs-search__results-list li, .base-card');

            cards.forEach((card, i) => {
                if (i >= max) return;

                const titleEl = card.querySelector('.job-card-list__title, .base-search-card__title, h3');
                const companyEl = card.querySelector('.job-card-container__company-name, .base-search-card__subtitle, h4');
                const locationEl = card.querySelector('.job-card-container__metadata-item, .job-search-card__location');
                const linkEl = card.querySelector('a[href*="/jobs/"]') as HTMLAnchorElement;

                if (titleEl && linkEl) {
                    results.push({
                        title: titleEl.textContent?.trim() || '',
                        company: companyEl?.textContent?.trim() || 'Unknown Company',
                        location: locationEl?.textContent?.trim() || 'Remote',
                        url: linkEl.href || '',
                        easyApply: card.textContent?.includes('Easy Apply') || false,
                    });
                }
            });

            return results;
        }, maxResults);

        bm.log(`Found ${data.length} job listings`);

        // Get more details from each job page
        bm.setStep('Getting job details', 3, 5);

        for (let i = 0; i < Math.min(data.length, 10); i++) {
            const item = data[i];
            if (!item.url) continue;

            try {
                await page.goto(item.url, { waitUntil: 'networkidle2', timeout: 15000 });

                const details = await page.evaluate(() => {
                    const description = document.querySelector('.description__text, .show-more-less-html__markup')?.textContent?.trim() || '';
                    const pageText = document.body.innerText.toLowerCase();

                    // Extract requirements from description
                    const requirements: string[] = [];
                    if (pageText.includes('python')) requirements.push('Python');
                    if (pageText.includes('javascript')) requirements.push('JavaScript');
                    if (pageText.includes('react')) requirements.push('React');
                    if (pageText.includes('java ') || pageText.includes('java,')) requirements.push('Java');
                    if (pageText.includes('aws')) requirements.push('AWS');
                    if (pageText.includes('machine learning') || pageText.includes('ml')) requirements.push('Machine Learning');
                    if (pageText.includes('bachelor')) requirements.push('Bachelor\'s degree');

                    // Extract salary if present
                    const salaryMatch = pageText.match(/\$[\d,]+\s*-\s*\$[\d,]+/) ||
                        pageText.match(/\$[\d,]+\s*(?:per hour|\/hr|an hour)/);
                    const salary = salaryMatch ? salaryMatch[0] : undefined;

                    return { description: description.substring(0, 500), requirements, salary };
                });

                jobs.push({
                    title: item.title,
                    company: item.company,
                    url: item.url,
                    location: item.location,
                    salary: details.salary,
                    requirements: details.requirements,
                    description: details.description,
                    easyApply: item.easyApply,
                });

                bm.log(`✓ Scraped: ${item.title} at ${item.company}`);

            } catch (err) {
                bm.log(`⚠ Failed to scrape job: ${item.title}`);
            }
        }

        bm.setStep('Complete', 5, 5);
        bm.log(`✅ Scraped ${jobs.length} jobs from LinkedIn`);

    } catch (error) {
        bm.log(`❌ LinkedIn scraping error: ${error}`);
    }

    return jobs;
}

// Calculate job match score based on user profile
export function calculateJobMatchScore(job: ScrapedJob, profile: UserProfile = DEFAULT_PROFILE): number {
    let score = 60; // Base score

    const requirements = job.requirements.map(r => r.toLowerCase());
    const description = job.description.toLowerCase();
    const combined = requirements.join(' ') + ' ' + description;

    // Check skill matches
    const userSkills = profile.skills.map(s => s.toLowerCase());
    let matchedSkills = 0;

    for (const skill of userSkills) {
        if (combined.includes(skill)) {
            matchedSkills++;
        }
    }

    // More skill matches = higher score
    score += Math.min(matchedSkills * 5, 25);

    // Check if it's an internship (user is student)
    if (combined.includes('intern') || combined.includes('internship') || combined.includes('entry level')) {
        score += 10;
    }

    // Easy Apply bonus
    if (job.easyApply) {
        score += 5;
    }

    // Remote/location preference
    if (job.location.toLowerCase().includes('remote') || job.location.toLowerCase().includes('california')) {
        score += 5;
    }

    return Math.max(0, Math.min(100, score));
}

// Discover and add jobs to opportunity queue
export async function discoverJobs(keywords = 'software engineer intern'): Promise<number> {
    const bm = browserManager;
    bm.log('🔍 Starting job discovery...');

    const jobs = await scrapeLinkedInJobs(keywords, 20);
    let addedCount = 0;

    // Dynamically import MatchEngine to avoid circular dependencies if any
    const { MatchEngine } = await import('../../intelligence/match-engine');

    for (const job of jobs) {
        // Create temp opportunity object for analysis
        const tempOpp: any = {
            title: job.title,
            description: job.description,
            requirements: job.requirements,
            organization: job.company,
            // ... other fields
        };

        const analysis = MatchEngine.analyze(tempOpp as any);

        // Only add if it's at least a Reach (not "Not Eligible")
        if (analysis.category !== 'Not Eligible') {
            addOpportunity({
                type: 'job',
                title: job.title,
                organization: job.company,
                url: job.url,
                location: job.location,
                salary: job.salary,
                requirements: job.requirements,
                description: job.description,
                matchScore: analysis.score,
            });
            addedCount++;
            bm.log(`➕ Added: ${job.title} at ${job.company} (${analysis.category} - ${analysis.score}%)`);
        } else {
            bm.log(`⏭ Skipped: ${job.title} (Not Eligible: ${analysis.missingRequirements.join(', ')})`);
        }
    }

    bm.log(`✅ Added ${addedCount} jobs to queue`);
    return addedCount;
}
