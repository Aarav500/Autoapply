// ============================================
// BATCH CV GENERATION API
// Generate CVs for all targets at once
// Now with Claude-powered projection engine
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { CVCompiler, ExperienceNode, CVTarget, CompiledCV, buildTargetList } from '@/lib/cv-compiler-v2';
import { extractExperienceGraph } from '@/lib/cv-compiler';
import { CVProjectionEngine } from '@/lib/cv-projection-engine';
import { getClaudeApiKey } from '@/lib/claude-api';

export const maxDuration = 300; // 5 minutes for batch processing

export async function POST(request: NextRequest) {
    try {
        const { activities, achievements, profile, targets, useClaudeProjection } = await request.json();

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

        // Step 2: Claude projection (if enabled)
        const apiKey = getClaudeApiKey();
        const shouldUseProjection = useClaudeProjection !== false && apiKey !== null;
        let projections: Map<string, any> | null = null;

        if (shouldUseProjection && apiKey) {
            try {
                console.log('[Batch CV] Using Claude projection engine...');
                const engine = new CVProjectionEngine(apiKey);
                projections = await engine.projectForMultipleTargets(targets, experiences);
                console.log(`[Batch CV] Claude projected ${projections.size} target-specific experience sets`);
            } catch (error) {
                console.error('[Batch CV] Claude projection failed, using fallback:', error);
            }
        } else {
            console.log('[Batch CV] Using deterministic ranking (Claude projection disabled)');
        }

        // Step 3: Compile CVs for each target
        // When Claude projection is available, use compileWithRankedIds
        // This ensures Claude only ranks, compiler only renders
        const results = targets.map((target: CVTarget) => {
            const compiler = new CVCompiler(experiences, profile);

            if (projections && projections.has(target.id)) {
                // Use Claude's ranking, then deterministic render
                const projection = projections.get(target.id);
                console.log(`[Batch CV] Target ${target.id}: Using Claude projection (${projection.rankedExperienceIds.length} experiences)`);
                return compiler.compileWithRankedIds(target, projection.rankedExperienceIds);
            } else {
                // Fallback: fully deterministic ranking + render
                console.log(`[Batch CV] Target ${target.id}: Using deterministic ranking`);
                return compiler.compile(target);
            }
        });

        // Step 4: Filter by quality
        const elite = results.filter((r: CompiledCV) => r.metadata.signal === 'elite' || r.metadata.signal === 'strong');
        const warnings = results.flatMap((r: CompiledCV) => r.metadata.warnings);
        const violations = results.flatMap((r: CompiledCV) => r.metadata.violations);

        console.log(`[Batch CV] Complete: ${results.length} CVs generated`);
        console.log(`[Batch CV] Elite: ${elite.length}, Warnings: ${warnings.length}, Violations: ${violations.length}`);

        return NextResponse.json({
            success: true,
            cvs: results,
            projectionUsed: shouldUseProjection && projections !== null,
            summary: {
                total: results.length,
                elite: elite.length,
                strong: results.filter((r: CompiledCV) => r.metadata.signal === 'strong').length,
                medium: results.filter((r: CompiledCV) => r.metadata.signal === 'medium').length,
                weak: results.filter((r: CompiledCV) => r.metadata.signal === 'weak').length,
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
