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
     * Claude's role and constraints
     */
    private buildSystemPrompt(mode: 'research' | 'industry' | 'college'): string {
        const basePrompt = `You are an expert CV compiler. Your job is to select and rank experiences for a specific target (job, research position, or college application).

CRITICAL RULES:
1. You DO NOT write text or bullets - you only SELECT and RANK experiences
2. Only choose experiences that are directly relevant to the target
3. Rank by relevance: most relevant first
4. For each selected experience, explain WHY it's relevant
5. For excluded experiences, briefly explain why they don't fit
6. Respond ONLY in JSON format

MODE-SPECIFIC GUIDANCE:`;

        const modeGuidance: Record<typeof mode, string> = {
            research: `
RESEARCH MODE:
- Prioritize: publications, research methods, datasets, experiments, technical depth
- Value: Novel approaches, rigorous methodology, measurable results
- Drop: Volunteer work, community service, leadership activities, entrepreneurship
- Drop: SAP internships, hackathons, Rotary clubs, farming, chess clubs
- Keep only: Research projects, published work, production ML/systems with scientific rigor`,

            industry: `
INDUSTRY MODE:
- Prioritize: Production deployments, scale metrics, business impact, technical systems
- Value: Real users, revenue impact, performance improvements, shipped products
- Drop: Academic research narratives, teaching, tutoring, community service
- Drop: Afghan curriculum, Rotary, farming, chess, olympiads, philosophy essays
- Keep only: Professional work, production systems, scalable technology`,

            college: `
COLLEGE MODE:
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
     * Provide target context and experience graph to Claude
     */
    private buildUserMessage(target: CVTarget, experiences: ExperienceNode[]): string {
        const targetContext = `TARGET INFORMATION:
Name: ${target.name}
Type: ${target.type}
${target.description ? `Description: ${target.description}` : ''}
${target.domains?.length ? `Domains: ${target.domains.join(', ')}` : ''}
${target.keywords?.length ? `Keywords: ${target.keywords.join(', ')}` : ''}
Page Limit: ${target.pageLimit} pages
Max Experiences: ${target.maxExperiences || this.getDefaultMaxExperiences(target.pageLimit)}
`;

        const experiencesJson = experiences.map((exp, idx) => ({
            id: exp.id,
            index: idx,
            title: exp.title,
            role: exp.role,
            organization: exp.organization,
            duration: exp.dates.duration,
            category: exp.category,
            domain: exp.domain,
            methods: exp.methods,
            tools: exp.tools,
            datasets: exp.datasets,
            scale: exp.scale,
            outcomes: exp.outcomes,
            hours: exp.hours,
            isPublished: exp.isPublished,
            isProduction: exp.isProduction
        }));

        return `${targetContext}

EXPERIENCE GRAPH:
${JSON.stringify(experiencesJson, null, 2)}

TASK:
1. Select the most relevant experiences for this target
2. Rank them by relevance (most relevant first)
3. Limit selection to ${target.maxExperiences || this.getDefaultMaxExperiences(target.pageLimit)} experiences
4. Explain why each selected experience is relevant
5. Briefly note why top excluded experiences don't fit

Respond with this exact JSON structure:
{
  "mode": "${target.type}",
  "rankedExperienceIds": ["exp_id_1", "exp_id_2", ...],
  "reasoning": {
    "exp_id_1": "Why this is most relevant...",
    "exp_id_2": "Why this is second most relevant..."
  },
  "dropReasons": {
    "exp_id_x": "Why this was excluded..."
  }
}`;
    }

    /**
     * PARSE CLAUDE RESPONSE
     * Extract JSON projection from Claude's output
     */
    private parseClaudeResponse(
        response: string,
        experiences: ExperienceNode[]
    ): ProjectionResponse {
        try {
            // Extract JSON from response (Claude sometimes adds explanation text)
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in Claude response');
            }

            const parsed = JSON.parse(jsonMatch[0]);

            // Validate structure
            if (!parsed.mode || !parsed.rankedExperienceIds || !Array.isArray(parsed.rankedExperienceIds)) {
                throw new Error('Invalid projection structure');
            }

            // Validate all IDs exist in experience graph
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
            console.error('Failed to parse Claude projection:', error);
            console.error('Raw response:', response);

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
