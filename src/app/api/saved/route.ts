import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticate, successResponse, handleError } from '@/lib/api-utils';
import { aiClient } from '@/lib/ai-client';
import { storage } from '@/lib/storage';
import { generateId } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { categorizeContentPrompt, recommendContentPrompt } from '@/prompts/saved-content';

interface SavedItem {
  id: string;
  title: string;
  url: string | null;
  notes: string | null;
  source: string | null;
  category: string;
  tags: string[];
  summary: string;
  createdAt: string;
}

const postSchema = z.object({
  action: z.enum(['add', 'categorize', 'recommend']).default('add'),
  title: z.string().optional(),
  url: z.string().optional(),
  notes: z.string().optional(),
  source: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const deleteSchema = z.object({
  id: z.string().min(1, 'Item ID is required'),
});

const categorizeSchema = z.object({
  category: z.string().default('Other'),
  tags: z.array(z.string()).default([]),
  summary: z.string().default(''),
});

const recommendSchema = z.object({
  recommendations: z.array(z.object({
    title: z.string(),
    type: z.string().default('Article'),
    description: z.string(),
    why_relevant: z.string(),
    url_hint: z.string().default(''),
  })).default([]),
});

function getStorageKey(userId: string): string {
  return `users/${userId}/saved/items/index.json`;
}

async function loadItems(userId: string): Promise<SavedItem[]> {
  const raw = await storage.getJSON<SavedItem[] | { items: SavedItem[] }>(getStorageKey(userId));
  if (!raw) return [];
  return Array.isArray(raw) ? raw : raw?.items || [];
}

async function saveItems(userId: string, items: SavedItem[]): Promise<void> {
  await storage.putJSON(getStorageKey(userId), items);
}

/**
 * GET /api/saved
 * List all saved items with optional filtering
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);
    const searchParams = req.nextUrl.searchParams;
    const categoryFilter = searchParams.get('category');
    const searchFilter = searchParams.get('search');
    const sourceFilter = searchParams.get('source');

    let items = await loadItems(userId);

    if (categoryFilter) {
      items = items.filter((item) => item.category === categoryFilter);
    }

    if (sourceFilter) {
      items = items.filter((item) => item.source === sourceFilter);
    }

    if (searchFilter) {
      const lower = searchFilter.toLowerCase();
      items = items.filter((item) =>
        item.title.toLowerCase().includes(lower) ||
        (item.notes && item.notes.toLowerCase().includes(lower)) ||
        item.tags.some((tag) => tag.toLowerCase().includes(lower)) ||
        item.summary.toLowerCase().includes(lower)
      );
    }

    // Sort by createdAt descending
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    logger.info({ userId, count: items.length, categoryFilter, searchFilter, sourceFilter }, 'Saved items listed');

    return successResponse({ items, total: items.length });
  } catch (error) {
    logger.error({ error }, 'List saved items error');
    return handleError(error);
  }
}

/**
 * POST /api/saved
 * Add, categorize, or get recommendations
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);
    const body = await req.json();
    const parsed = postSchema.parse(body);

    if (parsed.action === 'recommend') {
      const items = await loadItems(userId);
      const savedItems = items.map((item) => ({
        title: item.title,
        category: item.category,
        tags: item.tags,
      }));

      const interests: string[] = [];
      // Extract interests from unique tags across all items
      const tagCounts = new Map<string, number>();
      for (const item of items) {
        for (const tag of item.tags) {
          tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        }
      }
      const sortedTags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]);
      for (const [tag] of sortedTags.slice(0, 10)) {
        interests.push(tag);
      }

      const prompt = recommendContentPrompt({ savedItems, interests });
      const recommendations = await aiClient.completeJSON(
        prompt.system,
        prompt.user,
        recommendSchema,
        { model: 'fast', maxTokens: 2048 }
      );

      logger.info({ userId, count: recommendations.recommendations.length }, 'Content recommendations generated');

      return successResponse({ recommendations: recommendations.recommendations });
    }

    if (parsed.action === 'categorize') {
      if (!parsed.title) {
        return successResponse({ error: 'Title is required for categorization' });
      }

      const prompt = categorizeContentPrompt({
        title: parsed.title,
        url: parsed.url,
        notes: parsed.notes,
        source: parsed.source,
      });

      const result = await aiClient.completeJSON(
        prompt.system,
        prompt.user,
        categorizeSchema,
        { model: 'fast', maxTokens: 1024 }
      );

      logger.info({ userId, category: result.category }, 'Content categorized');

      return successResponse({
        category: result.category,
        tags: result.tags,
        summary: result.summary,
      });
    }

    // action === 'add'
    if (!parsed.title) {
      return successResponse({ error: 'Title is required to add an item' });
    }

    let category = parsed.category || '';
    let tags = parsed.tags || [];
    let summary = '';

    if (!category) {
      // Auto-categorize using AI (gracefully degrade if AI unavailable)
      try {
        const prompt = categorizeContentPrompt({
          title: parsed.title,
          url: parsed.url,
          notes: parsed.notes,
          source: parsed.source,
        });

        const result = await aiClient.completeJSON(
          prompt.system,
          prompt.user,
          categorizeSchema,
          { model: 'fast', maxTokens: 1024 }
        );

        category = result.category;
        tags = result.tags;
        summary = result.summary;
      } catch {
        category = 'Other';
      }
    }

    const newItem: SavedItem = {
      id: generateId(),
      title: parsed.title,
      url: parsed.url || null,
      notes: parsed.notes || null,
      source: parsed.source || null,
      category,
      tags,
      summary,
      createdAt: new Date().toISOString(),
    };

    const items = await loadItems(userId);
    items.unshift(newItem);
    await saveItems(userId, items);

    logger.info({ userId, itemId: newItem.id, category }, 'Saved item added');

    return successResponse({ item: newItem }, 201);
  } catch (error) {
    logger.error({ error }, 'Saved content POST error');
    return handleError(error);
  }
}

/**
 * DELETE /api/saved
 * Remove a saved item by ID
 */
export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);
    const body = await req.json();
    const { id } = deleteSchema.parse(body);

    const items = await loadItems(userId);
    const index = items.findIndex((item) => item.id === id);

    if (index === -1) {
      logger.warn({ userId, itemId: id }, 'Saved item not found for deletion');
      return successResponse({ deleted: false, message: 'Item not found' });
    }

    items.splice(index, 1);
    await saveItems(userId, items);

    logger.info({ userId, itemId: id }, 'Saved item deleted');

    return successResponse({ deleted: true, id });
  } catch (error) {
    logger.error({ error }, 'Delete saved item error');
    return handleError(error);
  }
}
