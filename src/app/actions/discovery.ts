'use server';

import { discoveryService } from '@/lib/automation/discovery-service';
import { revalidatePath } from 'next/cache';

export async function runDiscoveryScan(type: 'jobs' | 'scholarships' | 'all') {
    try {
        console.log(`Starting discovery scan for: ${type}`);

        const platforms = type === 'all'
            ? ['linkedin', 'bold-org']
            : type === 'jobs'
                ? ['linkedin']
                : ['bold-org'];

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
