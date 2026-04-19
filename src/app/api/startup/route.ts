import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticate, successResponse, handleError } from '@/lib/api-utils';
import { aiClient } from '@/lib/ai-client';
import { storage } from '@/lib/storage';
import { generateId } from '@/lib/utils';
import { startupIdeatePrompt, marketResearchPrompt, businessCanvasPrompt } from '@/prompts/startup';
import { logger } from '@/lib/logger';

const inputSchema = z.object({
  action: z.enum(['ideate', 'research', 'canvas', 'save', 'list']),
  skills: z.array(z.string()).optional(),
  interests: z.array(z.string()).optional(),
  targetMarket: z.string().optional(),
  budget: z.string().optional(),
  idea: z.string().optional(),
  industry: z.string().optional(),
  targetCustomer: z.string().optional(),
  valueProposition: z.string().optional(),
  ideaId: z.string().optional(),
  ideaData: z.object({}).passthrough().optional(),
});

const ideateSchema = z.object({
  ideas: z.array(z.object({
    name: z.string(),
    tagline: z.string(),
    problem: z.string(),
    solution: z.string(),
    target_market: z.string(),
    revenue_model: z.string(),
    unfair_advantage: z.string().default(''),
    tech_stack: z.array(z.string()).default([]),
    estimated_mvp_time: z.string().default('3 months'),
    market_size: z.string().default(''),
    competition_level: z.string().default('moderate'),
  })).default([]),
});

const researchSchema = z.object({
  market_overview: z.string().default(''),
  tam: z.string().default(''),
  sam: z.string().default(''),
  som: z.string().default(''),
  growth_rate: z.string().default(''),
  competitors: z.array(z.object({
    name: z.string(),
    description: z.string(),
    strengths: z.array(z.string()).default([]),
    weaknesses: z.array(z.string()).default([]),
    funding: z.string().default('unknown'),
  })).default([]),
  customer_segments: z.array(z.object({
    segment: z.string(),
    pain_points: z.array(z.string()).default([]),
    willingness_to_pay: z.string().default(''),
  })).default([]),
  trends: z.array(z.string()).default([]),
  go_to_market: z.array(z.object({
    channel: z.string(),
    strategy: z.string(),
    estimated_cac: z.string().default('unknown'),
  })).default([]),
  risks: z.array(z.string()).default([]),
});

const canvasSchema = z.object({
  key_partners: z.array(z.string()).default([]),
  key_activities: z.array(z.string()).default([]),
  key_resources: z.array(z.string()).default([]),
  value_propositions: z.array(z.string()).default([]),
  customer_relationships: z.array(z.string()).default([]),
  channels: z.array(z.string()).default([]),
  customer_segments: z.array(z.string()).default([]),
  cost_structure: z.array(z.string()).default([]),
  revenue_streams: z.array(z.string()).default([]),
  metrics: z.array(z.string()).default([]),
  unfair_advantage: z.string().default(''),
});

interface SavedIdea {
  id: string;
  name: string;
  tagline: string;
  industry: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  data: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await authenticate(request);

    const body = await request.json();
    const input = inputSchema.parse(body);

    logger.info({ userId, action: input.action }, 'Startup lab request');

    // Load profile for skills context on AI actions
    let profileSkills: string[] = [];
    if (input.action === 'ideate' || input.action === 'research' || input.action === 'canvas') {
      try {
        const profile = await storage.getJSON<Record<string, unknown>>(`users/${userId}/profile.json`);
        if (profile) {
          const skills = profile.skills as Array<{ name: string; proficiency?: string }> | undefined;
          if (Array.isArray(skills)) {
            profileSkills = skills.map((s) => s.name);
          }
        }
      } catch (err) {
        logger.warn({ err }, 'Could not load profile for startup context');
      }
    }

    switch (input.action) {
      case 'ideate': {
        const skills = input.skills && input.skills.length > 0 ? input.skills : profileSkills;
        const interests = input.interests || [];

        const prompt = startupIdeatePrompt({
          skills,
          interests,
          targetMarket: input.targetMarket,
          budget: input.budget,
        });

        const result = await aiClient.completeJSON(
          prompt.system,
          prompt.user,
          ideateSchema,
          { model: 'balanced', maxTokens: 8192 }
        );

        return successResponse({ ideas: result.ideas });
      }

      case 'research': {
        if (!input.idea || !input.industry) {
          return successResponse({ error: 'Idea and industry are required for market research' }, 400);
        }

        const prompt = marketResearchPrompt({
          idea: input.idea,
          industry: input.industry,
          targetCustomer: input.targetCustomer,
        });

        const result = await aiClient.completeJSON(
          prompt.system,
          prompt.user,
          researchSchema,
          { model: 'balanced', maxTokens: 8192 }
        );

        return successResponse({ research: result });
      }

      case 'canvas': {
        if (!input.idea || !input.industry) {
          return successResponse({ error: 'Idea and industry are required for business canvas' }, 400);
        }

        const prompt = businessCanvasPrompt({
          idea: input.idea,
          industry: input.industry,
          valueProposition: input.valueProposition,
        });

        const result = await aiClient.completeJSON(
          prompt.system,
          prompt.user,
          canvasSchema,
          { model: 'balanced', maxTokens: 8192 }
        );

        return successResponse({ canvas: result });
      }

      case 'save': {
        if (!input.ideaData) {
          return successResponse({ error: 'ideaData is required to save' }, 400);
        }

        const ideaId = input.ideaId || generateId();
        const now = new Date().toISOString();

        const ideaRecord: SavedIdea = {
          id: ideaId,
          name: (input.ideaData.name as string) || 'Untitled Idea',
          tagline: (input.ideaData.tagline as string) || '',
          industry: (input.ideaData.industry as string) || (input.industry || ''),
          status: (input.ideaData.status as string) || 'draft',
          createdAt: (input.ideaData.createdAt as string) || now,
          updatedAt: now,
          data: input.ideaData,
        };

        // Save idea file
        await storage.putJSON(`users/${userId}/startup/ideas/${ideaId}.json`, ideaRecord);

        // Update index
        const indexKey = `users/${userId}/startup/ideas/index.json`;
        const existingIndex = await storage.getJSON<SavedIdea[]>(indexKey);
        const index: SavedIdea[] = Array.isArray(existingIndex) ? existingIndex : [];

        const existingIdx = index.findIndex((item) => item.id === ideaId);
        const indexEntry: SavedIdea = {
          id: ideaRecord.id,
          name: ideaRecord.name,
          tagline: ideaRecord.tagline,
          industry: ideaRecord.industry,
          status: ideaRecord.status,
          createdAt: ideaRecord.createdAt,
          updatedAt: ideaRecord.updatedAt,
          data: ideaRecord.data,
        };

        if (existingIdx >= 0) {
          index[existingIdx] = indexEntry;
        } else {
          index.unshift(indexEntry);
        }

        await storage.putJSON(indexKey, index);

        return successResponse({ idea: ideaRecord });
      }

      case 'list': {
        const indexKey = `users/${userId}/startup/ideas/index.json`;
        const raw = await storage.getJSON<SavedIdea[] | Record<string, unknown>>(indexKey);
        const ideas: SavedIdea[] = Array.isArray(raw) ? raw : [];

        return successResponse({ ideas });
      }

      default: {
        return successResponse({ error: 'Unknown action' }, 400);
      }
    }
  } catch (error) {
    logger.error({ error }, 'Startup lab API error');
    return handleError(error);
  }
}
