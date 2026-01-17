// ============================================
// MULTI-TARGET CV GENERATION API
// Uses Claude projection engine to generate CVs for all targets
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { CVCompiler, ExperienceNode, CVTarget, CompiledCV } from '@/lib/cv-compiler-v2';
import { CVProjectionEngine } from '@/lib/cv-projection-engine';
import { getClaudeApiKey } from '@/lib/claude-api';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for batch processing

/**
 * REQUEST BODY
 */
interface GenerateMultiRequest {
    experiences: ExperienceNode[];
    profile: {
        name: string;
        email: string;
        phone?: string;
        location?: string;
        linkedin?: string;
        github?: string;
        researchPaper?: string;
        education?: string;
    };
    targets: CVTarget[];
    useClaudeProjection?: boolean; // Default: true
}

/**
 * RESPONSE BODY
 */
interface GenerateMultiResponse {
    success: boolean;
    cvs: CompiledCV[];
    projections?: Record<string, {
        rankedExperienceIds: string[];
        reasoning: Record<string, string>;
    }>;
    metadata: {
        totalTargets: number;
        successfulCompilations: number;
        failedCompilations: number;
        averageExperiencesPerCV: number;
        totalProcessingTime: number;
    };
    errors?: string[];
}

/**
 * POST /api/cv/generate-multi
 * Generate CVs for multiple targets using Claude projection
 */
export async function POST(request: NextRequest) {
    const startTime = Date.now();

    try {
        const body: GenerateMultiRequest = await request.json();

        // Validate input
        if (!body.experiences || !Array.isArray(body.experiences)) {
            return NextResponse.json(
                { success: false, error: 'experiences array is required' },
                { status: 400 }
            );
        }

        if (!body.profile || !body.profile.name || !body.profile.email) {
            return NextResponse.json(
                { success: false, error: 'profile with name and email is required' },
                { status: 400 }
            );
        }

        if (!body.targets || !Array.isArray(body.targets) || body.targets.length === 0) {
            return NextResponse.json(
                { success: false, error: 'targets array is required and cannot be empty' },
                { status: 400 }
            );
        }

        // Get Claude API key
        const apiKey = getClaudeApiKey();
        if (!apiKey && body.useClaudeProjection !== false) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Claude API key not found. Set CLAUDE_API_KEY or NEXT_PUBLIC_CLAUDE_API_KEY environment variable.'
                },
                { status: 500 }
            );
        }

        const useProjection = body.useClaudeProjection !== false && apiKey !== null;

        console.log(`[CV Generation] Starting multi-target compilation for ${body.targets.length} targets`);
        console.log(`[CV Generation] Using Claude projection: ${useProjection}`);

        let projections: Map<string, any> | null = null;
        const cvs: CompiledCV[] = [];
        const errors: string[] = [];

        // Step 1: Use Claude to project experiences for all targets (if enabled)
        if (useProjection && apiKey) {
            try {
                console.log('[CV Generation] Requesting Claude projections...');
                const engine = new CVProjectionEngine(apiKey);
                projections = await engine.projectForMultipleTargets(body.targets, body.experiences);
                console.log(`[CV Generation] Received ${projections.size} projections from Claude`);
            } catch (error) {
                console.error('[CV Generation] Claude projection failed:', error);
                errors.push(`Claude projection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
                // Continue with fallback ranking
            }
        }

        // Step 2: Compile CVs for each target
        for (const target of body.targets) {
            try {
                let selectedExperiences: ExperienceNode[];

                if (projections && projections.has(target.id)) {
                    // Use Claude's projection
                    const projection = projections.get(target.id);
                    const experienceMap = new Map(body.experiences.map(exp => [exp.id, exp]));
                    selectedExperiences = projection.rankedExperienceIds
                        .map((id: string) => experienceMap.get(id))
                        .filter((exp: ExperienceNode | undefined): exp is ExperienceNode => exp !== undefined);

                    console.log(`[CV Generation] ${target.name}: Using ${selectedExperiences.length} Claude-selected experiences`);
                } else {
                    // Fallback: use all experiences (compiler will rank internally)
                    selectedExperiences = body.experiences;
                    console.log(`[CV Generation] ${target.name}: Using fallback ranking (${selectedExperiences.length} experiences)`);
                }

                // Compile CV
                const compiler = new CVCompiler(selectedExperiences, body.profile);
                const cv = compiler.compile(target);
                cvs.push(cv);

                console.log(`[CV Generation] ${target.name}: Compiled ${cv.metadata.experienceCount} experiences, ` +
                    `${cv.metadata.wordCount} words, signal: ${cv.metadata.signal}`);
            } catch (error) {
                console.error(`[CV Generation] Failed to compile CV for ${target.name}:`, error);
                errors.push(`${target.name}: ${error instanceof Error ? error.message : 'Compilation failed'}`);
            }
        }

        // Step 3: Build response
        const endTime = Date.now();
        const totalProcessingTime = endTime - startTime;

        const response: GenerateMultiResponse = {
            success: cvs.length > 0,
            cvs: cvs,
            projections: projections ? Object.fromEntries(
                Array.from(projections.entries()).map(([targetId, proj]) => [
                    targetId,
                    {
                        rankedExperienceIds: proj.rankedExperienceIds,
                        reasoning: proj.reasoning
                    }
                ])
            ) : undefined,
            metadata: {
                totalTargets: body.targets.length,
                successfulCompilations: cvs.length,
                failedCompilations: body.targets.length - cvs.length,
                averageExperiencesPerCV: cvs.length > 0
                    ? Math.round(cvs.reduce((sum, cv) => sum + cv.metadata.experienceCount, 0) / cvs.length)
                    : 0,
                totalProcessingTime
            },
            errors: errors.length > 0 ? errors : undefined
        };

        console.log(`[CV Generation] Completed in ${totalProcessingTime}ms`);
        console.log(`[CV Generation] Success: ${response.metadata.successfulCompilations}/${response.metadata.totalTargets}`);

        return NextResponse.json(response);
    } catch (error) {
        console.error('[CV Generation] Unexpected error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
                metadata: {
                    totalTargets: 0,
                    successfulCompilations: 0,
                    failedCompilations: 0,
                    averageExperiencesPerCV: 0,
                    totalProcessingTime: Date.now() - startTime
                }
            },
            { status: 500 }
        );
    }
}
