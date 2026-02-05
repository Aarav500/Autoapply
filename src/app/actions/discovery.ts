'use server';

import { discoveryService, ScanResult } from '@/lib/automation/discovery-service';
import { revalidatePath } from 'next/cache';

type ScanSuccessResult = {
    success: true;
    results: ScanResult[];
};

type ScanErrorResult = {
    success: false;
    error: string;
};

type ScanResponse = ScanSuccessResult | ScanErrorResult;

export async function runDiscoveryScan(type: 'jobs'): Promise<ScanResponse> {
    try {
        console.log(`Starting discovery scan for: ${type}`);

        // Job scrapers - LinkedIn DISABLED (brittle, often returns 0 results)
        // Prioritize more reliable scrapers first
        const jobScrapers = ['indeed', 'handshake', 'companies', 'glassdoor', 'ziprecruiter', 'chegg'];
        // 'linkedin' - disabled temporarily until we fix its reliability issues

        const platforms = jobScrapers;

        // We can't return the full complex object easily, so we return a summary
        // The service updates the OpportunityStore which the UI should poll or read
        const results = await discoveryService.scan(platforms as any);

        // Revalidate all relevant pages to pick up new data
        revalidatePath('/jobs');
        revalidatePath('/job-hub');

        return { success: true, results } as ScanSuccessResult;
    } catch (error) {
        console.error('Scan failed:', error);
        return { success: false, error: String(error) } as ScanErrorResult;
    }
}
