// ============================================
// AUTO-APPLY ORCHESTRATOR
// Coordinates: Discover → Tailor → Fill → Submit
// ============================================

import { browserManager } from './browser';
import { Opportunity, updateOpportunity, getEligibleOpportunities, markApplied } from './opportunity-store';
import { generateAllContent } from './content-tailor';
import { fillFormAtUrl, DEFAULT_PROFILE } from './form-filler';

export interface ApplyResult {
    opportunityId: string;
    success: boolean;
    status: string;
    error?: string;
}

// Auto-apply to a single opportunity
export async function applyToOpportunity(opportunity: Opportunity): Promise<ApplyResult> {
    const bm = browserManager;

    try {
        bm.log(`\n=== Applying to: ${opportunity.title} @ ${opportunity.organization} ===`);

        // Step 1: Update status
        updateOpportunity(opportunity.id, { status: 'tailoring' });
        bm.setStep('Generating tailored content', 1, 4);

        // Step 2: Generate tailored content
        bm.log('Generating tailored CV, essay, and cover letter...');
        const content = generateAllContent(opportunity, DEFAULT_PROFILE);

        updateOpportunity(opportunity.id, {
            tailoredCV: content.cv,
            tailoredEssay: content.essay,
            tailoredCoverLetter: content.coverLetter,
        });
        bm.log('✓ Content generated');

        // Step 3: Fill the form
        updateOpportunity(opportunity.id, { status: 'applying' });
        bm.setStep('Filling application form', 2, 4);

        const fillResult = await fillFormAtUrl(opportunity.url);

        if (!fillResult.success) {
            throw new Error(fillResult.error || 'Form filling failed');
        }

        bm.log(`✓ Form filled (${fillResult.fieldsFilled}/${fillResult.fieldsFound} fields)`);

        // Step 4: Mark as applied
        bm.setStep('Completing application', 3, 4);
        markApplied(opportunity.id);

        bm.setStep('Done', 4, 4);
        bm.log(`✅ Successfully applied to ${opportunity.title}`);

        return {
            opportunityId: opportunity.id,
            success: true,
            status: 'applied',
        };

    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        bm.log(`❌ Failed to apply: ${errorMsg}`);

        updateOpportunity(opportunity.id, {
            status: 'failed',
            error: errorMsg,
        });

        return {
            opportunityId: opportunity.id,
            success: false,
            status: 'failed',
            error: errorMsg,
        };
    }
}

// Auto-apply to all eligible opportunities
export async function applyToAllEligible(minScore = 70): Promise<ApplyResult[]> {
    const bm = browserManager;
    const results: ApplyResult[] = [];

    const eligible = getEligibleOpportunities(minScore);
    bm.log(`Found ${eligible.length} eligible opportunities (score >= ${minScore})`);

    if (eligible.length === 0) {
        bm.log('No eligible opportunities to apply to.');
        return results;
    }

    bm.setStatus('running');

    for (let i = 0; i < eligible.length; i++) {
        const opp = eligible[i];
        bm.log(`\nProcessing ${i + 1}/${eligible.length}: ${opp.title}`);

        const result = await applyToOpportunity(opp);
        results.push(result);

        // Wait between applications to avoid rate limiting
        if (i < eligible.length - 1) {
            bm.log('Waiting 5 seconds before next application...');
            await new Promise(r => setTimeout(r, 5000));
        }
    }

    const successful = results.filter(r => r.success).length;
    bm.log(`\n=== Completed: ${successful}/${eligible.length} applications successful ===`);
    bm.setStatus('completed');

    return results;
}
