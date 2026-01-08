// ============================================
// BOLD.ORG SCHOLARSHIP SCRAPER
// Scrapes real scholarships from Bold.org
// ============================================

import { Page } from 'puppeteer';
import { browserManager } from '../browser';
import { addOpportunity, Opportunity } from '../opportunity-store';
import { DEFAULT_PROFILE, UserProfile } from '../user-profile';

export interface ScrapedScholarship {
    title: string;
    organization: string;
    url: string;
    amount: number;
    deadline?: string;
    requirements: string[];
    description: string;
}

// Scrape scholarships from Bold.org
export async function scrapeBoldOrg(maxResults = 20): Promise<ScrapedScholarship[]> {
    const bm = browserManager;
    const scholarships: ScrapedScholarship[] = [];

    try {
        await bm.initialize();
        const page = bm.getPage();

        bm.log('📚 Scraping Bold.org scholarships...');
        bm.setStep('Navigating to Bold.org', 1, 5);

        await page.goto('https://bold.org/scholarships/', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        bm.log('Page loaded, extracting scholarships...');
        bm.setStep('Extracting scholarship data', 2, 5);

        // Wait for scholarship cards to load
        await page.waitForSelector('a[href*="/scholarships/"]', { timeout: 10000 }).catch(() => null);

        // Extract scholarship data
        const data = await page.evaluate((max: number) => {
            const results: any[] = [];

            // Find scholarship links/cards
            const cards = document.querySelectorAll('a[href*="/scholarships/"]');

            cards.forEach((card, i) => {
                if (i >= max) return;

                const href = card.getAttribute('href') || '';
                if (!href.includes('/scholarships/') || href === '/scholarships/') return;

                // Try to extract info from card
                const text = card.textContent || '';
                const titleMatch = text.match(/^([^$\n]+)/);
                const amountMatch = text.match(/\$([0-9,]+)/);

                if (titleMatch) {
                    results.push({
                        title: titleMatch[1].trim().substring(0, 100),
                        url: href.startsWith('http') ? href : `https://bold.org${href}`,
                        amount: amountMatch ? parseInt(amountMatch[1].replace(',', '')) : 1000,
                        organization: 'Bold.org',
                    });
                }
            });

            return results;
        }, maxResults);

        bm.log(`Found ${data.length} scholarship links`);

        // Get more details from each scholarship page
        bm.setStep('Getting scholarship details', 3, 5);

        for (let i = 0; i < Math.min(data.length, 10); i++) {
            const item = data[i];
            try {
                await page.goto(item.url, { waitUntil: 'networkidle2', timeout: 15000 });

                const details = await page.evaluate(() => {
                    const title = document.querySelector('h1')?.textContent?.trim() || '';
                    const amount = document.body.innerText.match(/\$([0-9,]+)/)?.[1] || '1000';
                    const deadline = document.body.innerText.match(/deadline[:\s]*([A-Za-z]+ \d+, \d+)/i)?.[1] || '';
                    const description = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';

                    // Extract requirements from page text
                    const pageText = document.body.innerText.toLowerCase();
                    const requirements: string[] = [];

                    if (pageText.includes('gpa')) requirements.push('GPA requirement');
                    if (pageText.includes('computer science') || pageText.includes('stem')) requirements.push('STEM major');
                    if (pageText.includes('undergraduate')) requirements.push('Undergraduate');
                    if (pageText.includes('essay')) requirements.push('Essay required');
                    if (pageText.includes('u.s. citizen')) requirements.push('US Citizen');

                    return { title, amount: parseInt(amount.replace(',', '')), deadline, description, requirements };
                });

                scholarships.push({
                    title: details.title || item.title,
                    organization: 'Bold.org',
                    url: item.url,
                    amount: details.amount || item.amount,
                    deadline: details.deadline,
                    requirements: details.requirements,
                    description: details.description,
                });

                bm.log(`✓ Scraped: ${details.title || item.title}`);

            } catch (err) {
                bm.log(`⚠ Failed to scrape ${item.url}`);
            }
        }

        bm.setStep('Complete', 5, 5);
        bm.log(`✅ Scraped ${scholarships.length} scholarships from Bold.org`);

    } catch (error) {
        bm.log(`❌ Bold.org scraping error: ${error}`);
    }

    return scholarships;
}

// Calculate match score based on user profile
export function calculateMatchScore(scholarship: ScrapedScholarship, profile: UserProfile = DEFAULT_PROFILE): number {
    let score = 70; // Base score

    const requirements = scholarship.requirements.map(r => r.toLowerCase()).join(' ');
    const description = scholarship.description.toLowerCase();
    const combined = requirements + ' ' + description;

    // Check major match
    if (combined.includes('computer science') || combined.includes('cs') || combined.includes('stem') || combined.includes('technology')) {
        score += 15;
    }

    // Check GPA (user has 3.9)
    if (combined.includes('gpa')) {
        const gpaMatch = combined.match(/gpa[:\s]*(\d\.\d)/);
        if (gpaMatch && parseFloat(gpaMatch[1]) <= profile.gpa) {
            score += 10;
        } else if (!gpaMatch) {
            score += 5; // GPA mentioned but no minimum
        }
    }

    // Check citizenship (user is international)
    if (combined.includes('u.s. citizen') || combined.includes('us citizen') || combined.includes('american citizen')) {
        score -= 30; // Not eligible
    }
    if (combined.includes('international') || combined.includes('all students')) {
        score += 10; // International friendly
    }

    // Check year
    if (combined.includes('junior') || combined.includes('senior') || combined.includes('undergraduate')) {
        score += 5;
    }

    // Essay requirement (user has essay capability)
    if (combined.includes('essay')) {
        score += 5;
    }

    return Math.max(0, Math.min(100, score));
}

// Discover and add scholarships to opportunity queue
export async function discoverScholarships(): Promise<number> {
    const bm = browserManager;
    bm.log('🔍 Starting scholarship discovery...');

    const scholarships = await scrapeBoldOrg(20);
    let addedCount = 0;

    for (const scholarship of scholarships) {
        const matchScore = calculateMatchScore(scholarship);

        // Only add if score is above threshold
        if (matchScore >= 50) {
            addOpportunity({
                type: 'scholarship',
                title: scholarship.title,
                organization: scholarship.organization,
                url: scholarship.url,
                amount: scholarship.amount,
                deadline: scholarship.deadline,
                requirements: scholarship.requirements,
                description: scholarship.description,
                matchScore,
            });
            addedCount++;
            bm.log(`➕ Added: ${scholarship.title} (${matchScore}% match)`);
        } else {
            bm.log(`⏭ Skipped: ${scholarship.title} (${matchScore}% match - too low)`);
        }
    }

    bm.log(`✅ Added ${addedCount} scholarships to queue`);
    return addedCount;
}
