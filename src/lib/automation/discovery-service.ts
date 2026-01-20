import { browserManager } from './browser';
import { Opportunity, addOpportunity } from './opportunity-store';
import { scrapeLinkedInJobs, discoverJobs } from './scrapers/linkedin-scraper';
import { scrapeBoldOrg, discoverScholarships } from './scrapers/bold-org-scraper';
import { discoverIndeedJobs } from './scrapers/indeed-scraper';
import { discoverFastwebScholarships } from './scrapers/fastweb-scraper';
import { discoverCompanyJobs } from './scrapers/company-scrapers';
import { discoverGlassdoorJobs } from './scrapers/glassdoor-scraper';
import { discoverHandshakeJobs } from './scrapers/handshake-scraper';
import { discoverZipRecruiterJobs } from './scrapers/ziprecruiter-scraper';
import { discoverScholarshipsCom } from './scrapers/scholarships-com-scraper';
import { discoverCheggInternships } from './scrapers/chegg-scraper';
import { retryWithBackoff } from './retry-logic';
import { CircuitBreaker } from './circuit-breaker';
import { classifyError, isRetryableError } from './errors';

// All available scrapers - COMPREHENSIVE LIST
export type ScraperType =
    | 'linkedin'
    | 'bold-org'
    | 'indeed'
    | 'fastweb'
    | 'companies'
    | 'glassdoor'
    | 'handshake'
    | 'ziprecruiter'
    | 'scholarships-com'
    | 'chegg';

// Default: run ALL scrapers for maximum coverage
export const ALL_SCRAPERS: ScraperType[] = [
    'linkedin',
    'bold-org',
    'indeed',
    'fastweb',
    'companies',
    'glassdoor',
    'handshake',
    'ziprecruiter',
    'scholarships-com',
    'chegg',
];

export interface ScanResult {
    scraper: ScraperType;
    success: boolean;
    found: number;
    error?: any;  // Can be ScraperError.toJSON() or string
}

/**
 * Unified Discovery Service
 * Orchestrates ALL scrapers to find opportunities
 */
export class DiscoveryService {
    private static instance: DiscoveryService;
    private isScanning = false;
    private circuitBreakers: Map<ScraperType, CircuitBreaker> = new Map();

    private constructor() {
        // Initialize circuit breakers for all scrapers
        ALL_SCRAPERS.forEach(scraper => {
            this.circuitBreakers.set(scraper, new CircuitBreaker(scraper, 3, 120000));
        });
    }

    static getInstance(): DiscoveryService {
        if (!DiscoveryService.instance) {
            DiscoveryService.instance = new DiscoveryService();
        }
        return DiscoveryService.instance;
    }

    /**
     * Start a discovery scan for ALL platforms
     */
    async scan(platforms: ScraperType[] = ALL_SCRAPERS): Promise<ScanResult[]> {
        if (this.isScanning) {
            throw new Error('A scan is already in progress');
        }

        this.isScanning = true;
        const results: ScanResult[] = [];
        browserManager.log(`🚀 Starting FULL discovery scan for ${platforms.length} platforms...`);

        try {
            await browserManager.initialize();

            // Run scrapers sequentially to avoid overwhelming the browser/network
            for (const platform of platforms) {
                const result = await this.runScraper(platform);
                results.push(result);

                // Add delay between scrapers
                await new Promise(r => setTimeout(r, 2000));
            }

        } catch (error) {
            browserManager.setError(`Global scan error: ${error}`);
        } finally {
            this.isScanning = false;
            const totalFound = results.reduce((sum, r) => sum + r.found, 0);
            browserManager.log(`🏁 Discovery complete! Found ${totalFound} total opportunities`);
        }

        return results;
    }

    /**
     * Run a specific scraper with retry logic and circuit breaker
     */
    private async runScraper(platform: ScraperType): Promise<ScanResult> {
        browserManager.log(`🔍 Starting ${platform} scraper...`);

        const circuitBreaker = this.circuitBreakers.get(platform)!;

        try {
            const count = await retryWithBackoff(
                async () => {
                    return await circuitBreaker.execute(async () => {
                        // Load real profile for dynamic queries
                        const { buildFullProfile } = await import('./user-profile');
                        const profile = buildFullProfile();

                        // Generate queries based on profile
                        const majorQuery = `${profile.major} intern`;
                        const skillQuery = profile.skills.length > 0 ? `${profile.skills[0]} intern` : 'intern';
                        const jobQuery = majorQuery;

                        let count = 0;

                        switch (platform) {
                            case 'linkedin':
                                count = await discoverJobs(jobQuery, profile);
                                break;
                            case 'bold-org':
                                count = await discoverScholarships();
                                break;
                            case 'indeed':
                                count = await discoverIndeedJobs(jobQuery);
                                break;
                            case 'fastweb':
                                count = await discoverFastwebScholarships();
                                break;
                            case 'companies':
                                count = await discoverCompanyJobs();
                                break;
                            case 'glassdoor':
                                count = await discoverGlassdoorJobs(jobQuery);
                                break;
                            case 'handshake':
                                count = await discoverHandshakeJobs();
                                break;
                            case 'ziprecruiter':
                                count = await discoverZipRecruiterJobs(jobQuery);
                                break;
                            case 'scholarships-com':
                                count = await discoverScholarshipsCom();
                                break;
                            case 'chegg':
                                count = await discoverCheggInternships();
                                break;
                        }

                        return count;
                    });
                },
                (error) => isRetryableError(error),
                { maxAttempts: 3, initialDelay: 2000, maxDelay: 10000, backoffMultiplier: 2, jitter: true },
                (attempt, error) => {
                    browserManager.log(`⏳ ${platform} retry ${attempt}/3: ${error instanceof Error ? error.message : String(error)}`);
                }
            );

            browserManager.log(`✅ ${platform}: Found ${count} opportunities`);
            return { scraper: platform, success: true, found: count };
        } catch (error) {
            const scraperError = classifyError(error, platform);
            browserManager.log(`❌ ${platform} failed: ${scraperError.message}`);
            return {
                scraper: platform,
                success: false,
                found: 0,
                error: scraperError.toJSON(),
            };
        }
    }

    /**
     * Get current status from BrowserManager
     */
    getStatus() {
        return browserManager.getState();
    }
}

export const discoveryService = DiscoveryService.getInstance();


