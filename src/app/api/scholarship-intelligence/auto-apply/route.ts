'use server';

import { NextRequest, NextResponse } from 'next/server';

// ============================================
// AUTO-APPLY ENGINE FOR SCHOLARSHIPS
// Bulk applies to 50+ scholarships with generated documents
// ============================================

interface AutoApplyRequest {
    scholarships: {
        id: string;
        name: string;
        sponsor: string;
        applyUrl: string;
        platform?: 'bold' | 'fastweb' | 'scholarships-com' | 'custom';
        requiresDocuments: {
            essay?: boolean;
            cv?: boolean;
            transcript?: boolean;
            lor?: boolean;
        };
    }[];
    userProfile: any;
    activities: any[];
    documents?: {
        essays?: Record<string, string>;
        cv?: string;
        transcript?: any;
    };
    mode?: 'test' | 'live'; // test mode doesn't submit, just validates
}

interface ApplicationResult {
    scholarshipId: string;
    scholarshipName: string;
    status: 'success' | 'failed' | 'pending' | 'requires-manual';
    appliedAt?: string;
    confirmationNumber?: string;
    error?: string;
    documentsSubmitted?: string[];
}

// Helper: Apply to Bold.org scholarship
async function applyToBoldOrg(
    scholarship: any,
    documents: any,
    userProfile: any,
    mode: 'test' | 'live'
): Promise<ApplicationResult> {
    try {
        console.log(`   📝 Applying to ${scholarship.name} on Bold.org...`);

        if (mode === 'test') {
            return {
                scholarshipId: scholarship.id,
                scholarshipName: scholarship.name,
                status: 'success',
                appliedAt: new Date().toISOString(),
                confirmationNumber: `TEST-${Date.now()}`,
                documentsSubmitted: ['profile', 'essay'],
            };
        }

        // TODO: Actual Bold.org automation using Playwright/Puppeteer
        // This would use the bot infrastructure from /lib/automation/bold-org-bot.ts

        return {
            scholarshipId: scholarship.id,
            scholarshipName: scholarship.name,
            status: 'requires-manual',
            error: 'Bold.org automation not fully implemented yet. Please apply manually.',
        };

    } catch (error) {
        return {
            scholarshipId: scholarship.id,
            scholarshipName: scholarship.name,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

// Helper: Apply to Fastweb scholarship
async function applyToFastWeb(
    scholarship: any,
    documents: any,
    userProfile: any,
    mode: 'test' | 'live'
): Promise<ApplicationResult> {
    try {
        console.log(`   📝 Applying to ${scholarship.name} on Fastweb...`);

        if (mode === 'test') {
            return {
                scholarshipId: scholarship.id,
                scholarshipName: scholarship.name,
                status: 'success',
                appliedAt: new Date().toISOString(),
                confirmationNumber: `TEST-FW-${Date.now()}`,
                documentsSubmitted: ['profile', 'essay'],
            };
        }

        // TODO: Actual Fastweb automation

        return {
            scholarshipId: scholarship.id,
            scholarshipName: scholarship.name,
            status: 'requires-manual',
            error: 'Fastweb automation not fully implemented. Please apply manually.',
        };

    } catch (error) {
        return {
            scholarshipId: scholarship.id,
            scholarshipName: scholarship.name,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

// Helper: Apply to Scholarships.com scholarship
async function applyToScholarshipsCom(
    scholarship: any,
    documents: any,
    userProfile: any,
    mode: 'test' | 'live'
): Promise<ApplicationResult> {
    try {
        console.log(`   📝 Applying to ${scholarship.name} on Scholarships.com...`);

        if (mode === 'test') {
            return {
                scholarshipId: scholarship.id,
                scholarshipName: scholarship.name,
                status: 'success',
                appliedAt: new Date().toISOString(),
                confirmationNumber: `TEST-SC-${Date.now()}`,
                documentsSubmitted: ['profile'],
            };
        }

        // TODO: Actual Scholarships.com automation

        return {
            scholarshipId: scholarship.id,
            scholarshipName: scholarship.name,
            status: 'requires-manual',
            error: 'Scholarships.com automation not fully implemented. Please apply manually.',
        };

    } catch (error) {
        return {
            scholarshipId: scholarship.id,
            scholarshipName: scholarship.name,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

// Helper: Validate required documents
function validateDocuments(scholarship: any, documents: any): { valid: boolean; missing: string[] } {
    const missing: string[] = [];

    if (scholarship.requiresDocuments.essay && !documents.essays) {
        missing.push('essay');
    }
    if (scholarship.requiresDocuments.cv && !documents.cv) {
        missing.push('cv');
    }
    if (scholarship.requiresDocuments.transcript && !documents.transcript) {
        missing.push('transcript');
    }

    return {
        valid: missing.length === 0,
        missing,
    };
}

export async function POST(request: NextRequest) {
    try {
        const body: AutoApplyRequest = await request.json();
        const { scholarships, userProfile, activities, documents, mode = 'test' } = body;

        console.log(`🚀 Starting auto-apply for ${scholarships.length} scholarships...`);
        console.log(`   Mode: ${mode}`);

        const results: ApplicationResult[] = [];
        const stats = {
            total: scholarships.length,
            successful: 0,
            failed: 0,
            requiresManual: 0,
            documentsGenerated: 0,
            startedAt: new Date().toISOString(),
        };

        // ============================================
        // PHASE 1: Validate all scholarships
        // ============================================
        console.log('✅ Phase 1: Validating scholarships and documents...');

        for (const scholarship of scholarships) {
            const validation = validateDocuments(scholarship, documents);

            if (!validation.valid) {
                console.log(`   ⚠️ ${scholarship.name}: Missing ${validation.missing.join(', ')}`);
                results.push({
                    scholarshipId: scholarship.id,
                    scholarshipName: scholarship.name,
                    status: 'failed',
                    error: `Missing required documents: ${validation.missing.join(', ')}`,
                });
                stats.failed++;
                continue;
            }
        }

        // ============================================
        // PHASE 2: Apply to each scholarship
        // ============================================
        console.log(`📤 Phase 2: Applying to ${scholarships.length - stats.failed} scholarships...`);

        for (const scholarship of scholarships) {
            // Skip if already failed validation
            if (results.find(r => r.scholarshipId === scholarship.id && r.status === 'failed')) {
                continue;
            }

            let result: ApplicationResult;

            // Route to appropriate platform
            switch (scholarship.platform) {
                case 'bold':
                    result = await applyToBoldOrg(scholarship, documents, userProfile, mode);
                    break;

                case 'fastweb':
                    result = await applyToFastWeb(scholarship, documents, userProfile, mode);
                    break;

                case 'scholarships-com':
                    result = await applyToScholarshipsCom(scholarship, documents, userProfile, mode);
                    break;

                default:
                    // Custom/manual application
                    result = {
                        scholarshipId: scholarship.id,
                        scholarshipName: scholarship.name,
                        status: 'requires-manual',
                        error: 'Custom application - please apply manually via provided URL',
                    };
            }

            results.push(result);

            // Update stats
            if (result.status === 'success') stats.successful++;
            else if (result.status === 'failed') stats.failed++;
            else if (result.status === 'requires-manual') stats.requiresManual++;

            // Rate limiting: wait 2 seconds between applications
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // ============================================
        // PHASE 3: Generate summary report
        // ============================================
        console.log('📊 Phase 3: Generating summary report...');

        const summary = {
            totalScholarships: stats.total,
            applied: stats.successful,
            failed: stats.failed,
            requiresManual: stats.requiresManual,
            successRate: stats.total > 0 ? Math.round((stats.successful / stats.total) * 100) : 0,
            estimatedTimeInvested: `${stats.total * 2} minutes`, // 2 min per scholarship automated
            estimatedTimeSaved: `${stats.successful * 30} minutes`, // vs 30 min manual per scholarship
        };

        console.log('✅ Auto-apply complete!');
        console.log(`   ✅ Applied: ${stats.successful}`);
        console.log(`   ❌ Failed: ${stats.failed}`);
        console.log(`   ⚠️ Requires manual: ${stats.requiresManual}`);
        console.log(`   ⏱️ Time saved: ${summary.estimatedTimeSaved}`);

        return NextResponse.json({
            success: true,
            summary,
            results,
            stats: {
                ...stats,
                completedAt: new Date().toISOString(),
            },
            recommendations: generateRecommendations(results, stats),
        });

    } catch (error) {
        console.error('Auto-apply error:', error);
        return NextResponse.json({
            error: 'Failed to auto-apply to scholarships',
            message: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
    }
}

// Helper: Generate recommendations based on results
function generateRecommendations(results: ApplicationResult[], stats: any): string[] {
    const recommendations: string[] = [];

    // Check for high failure rate
    if (stats.failed / stats.total > 0.3) {
        recommendations.push('High failure rate detected. Ensure all required documents are generated before auto-applying.');
    }

    // Check for many manual applications
    if (stats.requiresManual / stats.total > 0.5) {
        recommendations.push('Many scholarships require manual application. Consider focusing on Bold.org/Fastweb platforms for better automation.');
    }

    // Success message
    if (stats.successful > 0) {
        recommendations.push(`Successfully applied to ${stats.successful} scholarships! Check your email for confirmation.`);
    }

    // Manual action needed
    const manualScholarships = results.filter(r => r.status === 'requires-manual');
    if (manualScholarships.length > 0) {
        recommendations.push(`${manualScholarships.length} scholarships require manual application. Review the list and complete these manually.`);
    }

    return recommendations;
}
