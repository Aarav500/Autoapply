import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticate, handleError, successResponse } from '@/lib/api-utils';
import { storage } from '@/lib/storage';
import { aiClient } from '@/lib/ai-client';
import { generateId } from '@/lib/utils';
import { logger } from '@/lib/logger';

interface Flashcard {
  id: string;
  question: string;
  answer: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  timesShown: number;
  timesCorrect: number;
  lastShown?: string;
  nextReview?: string;
}

interface FlashcardDeck {
  cards: Flashcard[];
  updatedAt: string;
}

const GenerateSchema = z.object({
  topic: z.string().min(1).max(200),
  count: z.number().min(1).max(20).default(10),
  difficulty: z.enum(['easy', 'medium', 'hard', 'mixed']).default('mixed'),
  category: z.string().optional(),
});

const ReviewSchema = z.object({
  cardId: z.string(),
  correct: z.boolean(),
});

const CardsOutputSchema = z.object({
  cards: z.array(z.object({
    question: z.string(),
    answer: z.string(),
    category: z.string(),
    difficulty: z.enum(['easy', 'medium', 'hard']),
  })),
});

export async function GET(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);
    const deck = await storage.getJSON<FlashcardDeck>(`users/${userId}/interview/flashcards.json`);
    const cards = deck?.cards ?? [];

    // Sort by due date (cards due for review first)
    const now = new Date().toISOString();
    const sorted = [...cards].sort((a, b) => {
      const aNext = a.nextReview ?? '';
      const bNext = b.nextReview ?? '';
      if (!aNext && !bNext) return 0;
      if (!aNext) return -1;
      if (!bNext) return 1;
      if (aNext <= now && bNext <= now) return (a.timesShown - a.timesCorrect) - (b.timesShown - b.timesCorrect);
      if (aNext <= now) return -1;
      if (bNext <= now) return 1;
      return aNext.localeCompare(bNext);
    });

    const dueCount = cards.filter((c) => !c.nextReview || c.nextReview <= now).length;
    return successResponse({ cards: sorted, dueCount, totalCards: cards.length });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);
    const body = await req.json() as Record<string, unknown>;

    // Review action
    const reviewParsed = ReviewSchema.safeParse(body);
    if (reviewParsed.success) {
      const { cardId, correct } = reviewParsed.data;
      await storage.updateJSON<FlashcardDeck>(`users/${userId}/interview/flashcards.json`, (deck) => {
        const cards = deck?.cards ?? [];
        const idx = cards.findIndex((c) => c.id === cardId);
        if (idx === -1) return deck ?? { cards: [], updatedAt: new Date().toISOString() };
        const card = { ...cards[idx] };
        card.timesShown = (card.timesShown ?? 0) + 1;
        card.timesCorrect = (card.timesCorrect ?? 0) + (correct ? 1 : 0);
        card.lastShown = new Date().toISOString();
        // Simple spaced repetition: correct → longer interval, wrong → 1 day
        const interval = correct
          ? Math.min(30, Math.max(1, Math.floor(card.timesCorrect * 1.5)))
          : 1;
        card.nextReview = new Date(Date.now() + interval * 86400000).toISOString();
        cards[idx] = card;
        return { cards, updatedAt: new Date().toISOString() };
      });
      return successResponse({ updated: true });
    }

    // Generate new cards
    const genParsed = GenerateSchema.safeParse(body);
    if (!genParsed.success) return handleError(new Error(genParsed.error.message));

    const { topic, count, difficulty, category } = genParsed.data;

    const { system, user } = {
      system: `You are an expert technical interviewer and educator. Generate concise, clear flashcards for interview preparation.
Each card should have a focused question and a complete but concise answer. Return exactly ${count} cards as JSON.`,
      user: `Topic: ${topic}
Difficulty: ${difficulty}
Category: ${category ?? 'General'}
Count: ${count}

Generate ${count} interview flashcards. Questions should be practical and commonly asked in technical interviews.
Answers should be clear, complete, and 2-4 sentences max.`,
    };

    const result = await aiClient.completeJSON(system, user, CardsOutputSchema, { model: 'fast' });

    const newCards: Flashcard[] = result.cards.map((c) => ({
      id: generateId(),
      ...c,
      timesShown: 0,
      timesCorrect: 0,
    }));

    await storage.updateJSON<FlashcardDeck>(`users/${userId}/interview/flashcards.json`, (deck) => {
      const existing = deck?.cards ?? [];
      return { cards: [...existing, ...newCards], updatedAt: new Date().toISOString() };
    });

    logger.info({ userId, topic, count: newCards.length }, 'Flashcards generated');
    return successResponse({ cards: newCards, generated: newCards.length });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);
    const { searchParams } = new URL(req.url);
    const cardId = searchParams.get('id');

    if (cardId) {
      await storage.updateJSON<FlashcardDeck>(`users/${userId}/interview/flashcards.json`, (deck) => ({
        cards: (deck?.cards ?? []).filter((c) => c.id !== cardId),
        updatedAt: new Date().toISOString(),
      }));
    } else {
      // Clear all
      await storage.putJSON(`users/${userId}/interview/flashcards.json`, { cards: [], updatedAt: new Date().toISOString() });
    }

    return successResponse({ deleted: true });
  } catch (error) {
    return handleError(error);
  }
}
