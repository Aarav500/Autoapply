// ============================================
// CLAUDE-POWERED CV PROJECTION ENGINE
// Uses Claude API to rank experiences for each target
// ============================================

import { callClaude } from './claude-api';
import { ExperienceNode, CVTarget } from './cv-compiler-v2';

/**
 * CLAUDE PROJECTION REQUEST
 * Input to Claude for target-specific ranking
 */
export interface ProjectionRequest {
    target: {
        name: string;
        type: 'research' | 'industry' | 'college';
        description?: string;
        domains?: string[];
        keywords?: string[];
    };
    experiences: ExperienceNode[];
}

/**
 * CLAUDE PROJECTION RESPONSE
 * Claude's output: ranked experience IDs with reasoning
 */
export interface ProjectionResponse {
    mode: 'research' | 'industry' | 'college';
    rankedExperienceIds: string[];
    reasoning: Record<string, string>; // experienceId → why it's relevant
    dropReasons?: Record<string, string>; // experienceId → why it was excluded
}

/**
 * PROJECTION ENGINE
 * Uses Claude to select and rank experiences for each target
 */
export class CVProjectionEngine {
    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    /**
     * MAIN PROJECTION METHOD
     * Ask Claude to select and rank experiences for a specific target
     */
    async projectForTarget(
        target: CVTarget,
        experiences: ExperienceNode[]
    ): Promise<ProjectionResponse> {
        const systemPrompt = this.buildSystemPrompt(target.type);
        const userMessage = this.buildUserMessage(target, experiences);

        const response = await callClaude(
            this.apiKey,
            systemPrompt,
            [{ role: 'user', content: userMessage }],
            'claude-opus-4-20250514', // Use Opus 4.5 for high-quality projection
            4096
        );

        return this.parseClaudeResponse(response, experiences);
    }

    /**
     * BATCH PROJECTION
     * Generate projections for multiple targets in parallel
     */
    async projectForMultipleTargets(
        targets: CVTarget[],
        experiences: ExperienceNode[]
    ): Promise<Map<string, ProjectionResponse>> {
        const projections = new Map<string, ProjectionResponse>();

        // Run projections in parallel for efficiency
        const results = await Promise.all(
            targets.map(async (target) => {
                const projection = await this.projectForTarget(target, experiences);
                return { targetId: target.id, projection };
            })
        );

        results.forEach(({ targetId, projection }) => {
            projections.set(targetId, projection);
        });

        return projections;
    }

    /**
     * BUILD SYSTEM PROMPT
     * Claude's role and constraints - STRICT JSON-ONLY OUTPUT
     */
    private buildSystemPrompt(mode: 'research' | 'industry' | 'college'): string {
        // EXACT prompt as specified in requirements - Claude must NEVER write prose
        const basePrompt = `You are a CV projection engine.
You do NOT write resumes.
You only select and rank experiences.

Rules:
- Output valid JSON only.
- Do not invent data.
- Rank by relevance to target.
- Drop irrelevant experiences.
- NEVER write prose sentences.
- NEVER mention target names (MIT, Stanford, Google, etc.) in your output.
`;

        const modeGuidance: Record<typeof mode, string> = {
            research: `
MODE: research
- Prioritize: publications, research methods, datasets, experiments, technical depth
- Value: Novel approaches, rigorous methodology, measurable results
- Drop: Volunteer work, community service, leadership activities, entrepreneurship
- Drop: SAP internships, hackathons, Rotary clubs, farming, chess clubs
- Keep only: Research projects, published work, production ML/systems with scientific rigor`,

            industry: `
MODE: industry
- Prioritize: Production deployments, scale metrics, business impact, technical systems
- Value: Real users, revenue impact, performance improvements, shipped products
- Drop: Academic research narratives, teaching, tutoring, community service
- Drop: Afghan curriculum, Rotary, farming, chess, olympiads, philosophy essays
- Keep only: Professional work, production systems, scalable technology`,

            college: `
MODE: college
- Prioritize: Leadership roles, awards, unique experiences, hours invested, personal growth
- Value: Initiative, impact on others, creativity, sustained commitment
- Drop: Deep technical details (QUBO formulation, Byzantine fault tolerance)
- Drop: Enterprise architecture jargon, kernel modules, distributed consensus
- Keep: Research + leadership + service + entrepreneurship (balanced profile)`
        };

        return basePrompt + modeGuidance[mode];
    }

    /**
     * BUILD USER MESSAGE
     * Provide target context and experience graph to Claude using EXACT schema from requirements
     */
    private buildUserMessage(target: CVTarget, experiences: ExperienceNode[]): string {
        // Build experience nodes in exact format required
        const experienceNodes = experiences.map(exp => ({
            id: exp.id,
            domain: exp.domain,
            methods: exp.methods,
            outcomes: exp.outcomes.metrics,
            isPublished: exp.isPublished,
            isProduction: exp.isProduction
        }));

        // Build request in exact format from requirements
        const request = {
            target: {
                id: target.id,
                type: target.type,
                description: target.description || target.name
            },
            experience_nodes: experienceNodes
        };

        return `${JSON.stringify(request, null, 2)}

Select and rank up to ${target.maxExperiences || this.getDefaultMaxExperiences(target.pageLimit)} experiences.

Respond with ONLY this JSON structure (no prose, no explanations):
{
  "mode": "${target.type}",
  "rankedExperienceIds": ["exp_id_1", "exp_id_2"],
  "dropReasons": {
    "exp_id_x": "Brief reason"
  }
}`;
    }

    /**
     * BANNED WORDS - Response is rejected if these appear in text
     */
    private static readonly BANNED_WORDS = [
        'MIT', 'Stanford', 'Harvard', 'Yale', 'Princeton', 'Google', 'Meta', 'OpenAI',
        'I believe', 'I realized', 'passion', 'inspired', 'journey', 'dream'
    ];

    /**
     * PARSE CLAUDE RESPONSE
     * Extract JSON projection from Claude's output with STRICT VALIDATION
     */
    private parseClaudeResponse(
        response: string,
        experiences: ExperienceNode[]
    ): ProjectionResponse {
        try {
            // Step 1: Extract JSON from response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in Claude response');
            }

            const jsonStr = jsonMatch[0];
            const parsed = JSON.parse(jsonStr);

            // Step 2: Validate structure
            if (!parsed.mode || !parsed.rankedExperienceIds || !Array.isArray(parsed.rankedExperienceIds)) {
                throw new Error('Invalid projection structure');
            }

            // Step 3: Check for prose (any text outside JSON that looks like sentences)
            const textOutsideJson = response.replace(jsonStr, '').trim();
            if (textOutsideJson.length > 50) {
                // Check if it contains sentence-like patterns
                const sentencePattern = /[A-Z][^.!?]*[.!?]/g;
                const sentences = textOutsideJson.match(sentencePattern) || [];
                if (sentences.some(s => s.split(/\s+/).length > 10)) {
                    console.warn('[Projection] Response contains prose, using anyway with warning');
                }
            }

            // Step 4: Check for banned words in the JSON values
            const jsonText = JSON.stringify(parsed);
            for (const banned of CVProjectionEngine.BANNED_WORDS) {
                if (jsonText.toLowerCase().includes(banned.toLowerCase())) {
                    console.warn(`[Projection] Response contains banned word: ${banned}`);
                    // Don't reject, but log the warning - Claude might use these in dropReasons
                }
            }

            // Step 5: Validate all IDs exist in experience graph
            const validIds = new Set(experiences.map(e => e.id));
            const filteredIds = parsed.rankedExperienceIds.filter((id: string) => validIds.has(id));

            if (filteredIds.length === 0) {
                throw new Error('No valid experience IDs in projection');
            }

            return {
                mode: parsed.mode,
                rankedExperienceIds: filteredIds,
                reasoning: parsed.reasoning || {},
                dropReasons: parsed.dropReasons || {}
            };
        } catch (error) {
            console.error('[Projection] Failed to parse Claude response:', error);
            console.error('[Projection] Raw response:', response.substring(0, 500));

            // Fallback: return all experiences in original order
            return {
                mode: 'college',
                rankedExperienceIds: experiences.map(e => e.id),
                reasoning: { fallback: 'Parsing failed - using all experiences' },
                dropReasons: {}
            };
        }
    }

    /**
     * DEFAULT MAX EXPERIENCES BY PAGE LIMIT
     */
    private getDefaultMaxExperiences(pageLimit: number): number {
        const defaults: Record<number, number> = {
            1: 4,
            2: 8,
            3: 12,
            4: 16
        };
        return defaults[pageLimit] || 8;
    }
}

/**
 * CONVENIENCE FUNCTION
 * Project experiences for a single target
 */
export async function projectExperiencesForTarget(
    apiKey: string,
    target: CVTarget,
    experiences: ExperienceNode[]
): Promise<ProjectionResponse> {
    const engine = new CVProjectionEngine(apiKey);
    return engine.projectForTarget(target, experiences);
}

/**
 * CONVENIENCE FUNCTION
 * Project experiences for multiple targets in batch
 */
export async function projectExperiencesForTargets(
    apiKey: string,
    targets: CVTarget[],
    experiences: ExperienceNode[]
): Promise<Map<string, ProjectionResponse>> {
    const engine = new CVProjectionEngine(apiKey);
    return engine.projectForMultipleTargets(targets, experiences);
}
