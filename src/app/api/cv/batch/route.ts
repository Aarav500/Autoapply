// ============================================
// BATCH CV GENERATION API
// Generate CVs for all targets at once
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { CVCompiler, ExperienceNode, CVTarget, buildTargetList } from '@/lib/cv-compiler-v2';
import { extractExperienceGraph } from '@/lib/cv-compiler';

export async function POST(request: NextRequest) {
    try {
        const { activities, achievements, profile, targets } = await request.json();

        if (!activities || !profile || !targets) {
            return NextResponse.json(
                { error: 'Missing required fields: activities, profile, targets' },
                { status: 400 }
            );
        }

        console.log(`[Batch CV] Generating ${targets.length} CVs...`);

        // Step 1: Build experience graph
        const experiences = extractExperienceGraph(activities, achievements || []);
        console.log(`[Batch CV] Extracted ${experiences.length} experiences`);

        // Step 2: Initialize compiler
        const compiler = new CVCompiler(experiences, profile);

        // Step 3: Compile all targets
        const results = compiler.compileAll(targets);

        // Step 4: Filter by quality
        const elite = results.filter(r => r.metadata.signal === 'elite' || r.metadata.signal === 'strong');
        const warnings = results.flatMap(r => r.metadata.warnings);
        const violations = results.flatMap(r => r.metadata.violations);

        console.log(`[Batch CV] Complete: ${results.length} CVs generated`);
        console.log(`[Batch CV] Elite: ${elite.length}, Warnings: ${warnings.length}, Violations: ${violations.length}`);

        return NextResponse.json({
            success: true,
            cvs: results,
            summary: {
                total: results.length,
                elite: elite.length,
                strong: results.filter(r => r.metadata.signal === 'strong').length,
                medium: results.filter(r => r.metadata.signal === 'medium').length,
                weak: results.filter(r => r.metadata.signal === 'weak').length,
                totalWarnings: warnings.length,
                totalViolations: violations.length
            }
        });
    } catch (error) {
        console.error('[Batch CV] Error:', error);
        return NextResponse.json(
            { error: 'Failed to generate CVs', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
