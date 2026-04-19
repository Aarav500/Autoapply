import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticate, successResponse, handleError } from '@/lib/api-utils';
import { aiClient } from '@/lib/ai-client';
import { storage } from '@/lib/storage';
import { generateId } from '@/lib/utils';
import { paperAnalyzerPrompt, publicationMatcherPrompt, paperGeneratorPrompt } from '@/prompts/research-hub';
import { logger } from '@/lib/logger';

const inputSchema = z.object({
  action: z.enum(['analyze', 'match', 'generate', 'list', 'save']),
  // analyze fields
  title: z.string().optional(),
  abstract: z.string().optional(),
  content: z.string().optional(),
  previousFeedback: z.string().optional(),
  targetVenue: z.string().optional(),
  // match fields
  field: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  // generate fields
  idea: z.string().optional(),
  methodology: z.string().optional(),
  existingWork: z.string().optional(),
  // save fields
  paperId: z.string().optional(),
  paperData: z.object({}).passthrough().optional(),
});

const sectionScoreSchema = z.object({
  score: z.number().default(0),
  feedback: z.string().default(""),
  suggestions: z.array(z.string()).default([]),
});

const analyzeResultSchema = z.object({
  overall_score: z.number().default(0),
  sections: z.object({
    abstract: sectionScoreSchema,
    introduction: sectionScoreSchema,
    methodology: sectionScoreSchema,
    results: sectionScoreSchema,
    discussion: sectionScoreSchema,
    conclusion: sectionScoreSchema,
  }),
  strengths: z.array(z.string()).default([]),
  weaknesses: z.array(z.string()).default([]),
  revision_priority: z.array(z.string()).default([]),
});

const matchResultSchema = z.object({
  venues: z.array(z.object({
    name: z.string(),
    type: z.string().default("journal"),
    field: z.string().default(""),
    acceptance_rate: z.string().default("unknown"),
    impact_factor: z.string().default("unknown"),
    review_time: z.string().default("unknown"),
    fit_score: z.number().default(0),
    why_good_fit: z.string().default(""),
    submission_tips: z.array(z.string()).default([]),
  })).default([]),
});

const generateResultSchema = z.object({
  title: z.string().default(""),
  abstract: z.string().default(""),
  sections: z.array(z.object({
    heading: z.string(),
    content: z.string(),
  })).default([]),
  references_needed: z.array(z.string()).default([]),
  methodology_notes: z.string().default(""),
});

interface PaperIndexEntry {
  id: string;
  title: string;
  field: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await authenticate(request);

    const body = await request.json();
    const data = inputSchema.parse(body);

    switch (data.action) {
      case 'analyze': {
        if (!data.title || !data.abstract || !data.content) {
          return successResponse({ error: 'Title, abstract, and content are required for analysis' }, 400);
        }

        const prompt = paperAnalyzerPrompt({
          title: data.title,
          abstract: data.abstract,
          content: data.content,
          previousFeedback: data.previousFeedback,
          targetVenue: data.targetVenue,
        });

        logger.info({ userId, title: data.title }, 'Research paper analysis requested');

        const result = await aiClient.completeJSON(
          prompt.system,
          prompt.user,
          analyzeResultSchema,
          { model: 'balanced', maxTokens: 8192 }
        );

        return successResponse({ analysis: result });
      }

      case 'match': {
        if (!data.title || !data.abstract || !data.field || !data.keywords) {
          return successResponse({ error: 'Title, abstract, field, and keywords are required for matching' }, 400);
        }

        const prompt = publicationMatcherPrompt({
          title: data.title,
          abstract: data.abstract,
          field: data.field,
          keywords: data.keywords,
        });

        logger.info({ userId, title: data.title, field: data.field }, 'Publication matching requested');

        const result = await aiClient.completeJSON(
          prompt.system,
          prompt.user,
          matchResultSchema,
          { model: 'balanced', maxTokens: 8192 }
        );

        return successResponse({ matches: result });
      }

      case 'generate': {
        if (!data.idea || !data.field) {
          return successResponse({ error: 'Research idea and field are required for generation' }, 400);
        }

        const prompt = paperGeneratorPrompt({
          idea: data.idea,
          field: data.field,
          methodology: data.methodology,
          existingWork: data.existingWork,
        });

        logger.info({ userId, field: data.field }, 'Paper generation requested');

        const result = await aiClient.completeJSON(
          prompt.system,
          prompt.user,
          generateResultSchema,
          { model: 'balanced', maxTokens: 8192 }
        );

        return successResponse({ paper: result });
      }

      case 'list': {
        const indexKey = `users/${userId}/research/papers/index.json`;
        const raw = await storage.getJSON<PaperIndexEntry[] | { papers: PaperIndexEntry[] }>(indexKey);
        const papers: PaperIndexEntry[] = Array.isArray(raw) ? raw : raw?.papers || [];

        logger.info({ userId, count: papers.length }, 'Research papers listed');

        return successResponse({ papers });
      }

      case 'save': {
        const paperId = data.paperId || generateId();
        const paperData = data.paperData || {};
        const now = new Date().toISOString();

        // Save paper data
        const paperKey = `users/${userId}/research/papers/${paperId}.json`;
        await storage.putJSON(paperKey, {
          id: paperId,
          ...paperData,
          updatedAt: now,
        });

        // Update index
        const indexKey = `users/${userId}/research/papers/index.json`;
        const raw = await storage.getJSON<PaperIndexEntry[] | { papers: PaperIndexEntry[] }>(indexKey);
        const papers: PaperIndexEntry[] = Array.isArray(raw) ? raw : raw?.papers || [];

        const existingIndex = papers.findIndex(p => p.id === paperId);
        const entry: PaperIndexEntry = {
          id: paperId,
          title: (paperData.title as string) || 'Untitled Paper',
          field: (paperData.field as string) || 'Unknown',
          status: (paperData.status as string) || 'draft',
          createdAt: existingIndex >= 0 ? papers[existingIndex].createdAt : now,
          updatedAt: now,
        };

        if (existingIndex >= 0) {
          papers[existingIndex] = entry;
        } else {
          papers.unshift(entry);
        }

        await storage.putJSON(indexKey, papers);

        logger.info({ userId, paperId }, 'Research paper saved');

        return successResponse({ paper: entry });
      }

      default: {
        return successResponse({ error: 'Invalid action' }, 400);
      }
    }
  } catch (error) {
    logger.error({ error }, 'Research API error');
    return handleError(error);
  }
}
