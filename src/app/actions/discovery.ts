'use server';

import { discoveryService } from '@/lib/automation/discovery-service';
import { revalidatePath } from 'next/cache';

export async function runDiscoveryScan(type: 'jobs' | 'scholarships' | 'all') {
    try {
        console.log(`Starting discovery scan for: ${type}`);

        // Use ALL available scrapers for comprehensive coverage
        const jobScrapers = ['linkedin', 'indeed', 'glassdoor', 'handshake', 'ziprecruiter', 'chegg', 'companies'];
        const scholarshipScrapers = ['bold-org', 'fastweb', 'scholarships-com'];

        const platforms = type === 'all'
            ? [...jobScrapers, ...scholarshipScrapers]
            : type === 'jobs'
                ? jobScrapers
                : scholarshipScrapers;

        // We can't return the full complex object easily, so we return a summary
        // The service updates the OpportunityStore which the UI should poll or read
        const results = await discoveryService.scan(platforms as any);

        revalidatePath('/job-hub');
        revalidatePath('/scholarships');

        return { success: true, results };
    } catch (error) {
        console.error('Scan failed:', error);
        return { success: false, error: String(error) };
    }
}
