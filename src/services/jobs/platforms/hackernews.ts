import { JobSearchQuery, RawJob, JobCache } from '@/types/job';
import { BaseJobPlatform } from './base';
import { logger } from '@/lib/logger';
import { aiClient } from '@/lib/ai-client';
import { storage } from '@/lib/storage';
import { z } from 'zod';

interface HNStory {
  objectID: string;
  title: string;
  created_at: string;
}

interface HNItem {
  id: number;
  text?: string;
  children?: HNItem[];
}

const ExtractedJobSchema = z.object({
  title: z.string(),
  company: z.string(),
  location: z.string().optional(),
  remote: z.boolean(),
  description: z.string(),
  url: z.string().optional(),
  salary: z
    .object({
      min: z.number().optional(),
      max: z.number().optional(),
      currency: z.string().optional(),
    })
    .optional(),
  jobType: z.string().optional(),
});

type ExtractedJob = z.infer<typeof ExtractedJobSchema>;

export class HackerNewsPlatform extends BaseJobPlatform {
  name = 'hackernews';
  private readonly CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours
  private readonly CACHE_KEY = 'cache/hn-jobs.json';
  private readonly ALGOLIA_SEARCH = 'https://hn.algolia.com/api/v1/search';
  private readonly ALGOLIA_ITEMS = 'https://hn.algolia.com/api/v1/items';

  async search(query: JobSearchQuery): Promise<RawJob[]> {
    try {
      // Check S3 cache
      const cachedJobs = await this.getCachedJobs();
      if (cachedJobs) {
        logger.info({ platform: this.name }, 'Using cached HN jobs');
        return cachedJobs.filter((job) => this.matchesQuery(job, query));
      }

      // Fetch and parse new jobs
      logger.info({ platform: this.name }, 'Fetching fresh HN jobs');
      const jobs = await this.fetchAndParseJobs();

      // Save to cache
      await this.cacheJobs(jobs);

      return jobs.filter((job) => this.matchesQuery(job, query));
    } catch (error) {
      logger.error({ platform: this.name, error }, 'Failed to fetch HN jobs');
      throw error;
    }
  }

  private async getCachedJobs(): Promise<RawJob[] | null> {
    try {
      const cache = await storage.getJSON<JobCache>(this.CACHE_KEY);
      if (!cache) return null;

      const expiresAt = new Date(cache.expiresAt);
      if (new Date() > expiresAt) {
        logger.info({ platform: this.name }, 'Cache expired');
        return null;
      }

      return cache.jobs;
    } catch {
      return null;
    }
  }

  private async cacheJobs(jobs: RawJob[]): Promise<void> {
    const cache: JobCache = {
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + this.CACHE_TTL),
      jobs,
    };

    await storage.putJSON(this.CACHE_KEY, cache);
    logger.info({ platform: this.name, count: jobs.length }, 'Cached HN jobs');
  }

  private async fetchAndParseJobs(): Promise<RawJob[]> {
    // Find latest "Who is hiring" thread
    const searchResponse = await fetch(
      `${this.ALGOLIA_SEARCH}?query=who+is+hiring&tags=story`
    );
    const searchData = await searchResponse.json();

    if (!searchData.hits || searchData.hits.length === 0) {
      logger.warn({ platform: this.name }, 'No "Who is hiring" thread found');
      return [];
    }

    const latestStory: HNStory = searchData.hits[0];
    logger.info(
      { platform: this.name, storyId: latestStory.objectID, title: latestStory.title },
      'Found latest hiring thread'
    );

    // Fetch comments from the story
    const itemResponse = await fetch(`${this.ALGOLIA_ITEMS}/${latestStory.objectID}`);
    const itemData: HNItem = await itemResponse.json();

    if (!itemData.children) {
      logger.warn({ platform: this.name }, 'No comments in hiring thread');
      return [];
    }

    // Parse comments with AI (batch process)
    const jobs = await this.parseComments(itemData.children);

    logger.info({ platform: this.name, count: jobs.length }, 'Parsed HN jobs');
    return jobs;
  }

  private async parseComments(comments: HNItem[]): Promise<RawJob[]> {
    const jobs: RawJob[] = [];
    const batchSize = 10; // Process 10 comments at a time

    for (let i = 0; i < comments.length; i += batchSize) {
      const batch = comments.slice(i, i + batchSize);
      const batchJobs = await this.parseBatch(batch);
      jobs.push(...batchJobs);

      // Log progress
      logger.info(
        { platform: this.name, processed: i + batch.length, total: comments.length },
        'Processing comments'
      );
    }

    return jobs;
  }

  private async parseBatch(comments: HNItem[]): Promise<RawJob[]> {
    const jobs: RawJob[] = [];

    for (const comment of comments) {
      if (!comment.text) continue;

      try {
        const extracted = await this.extractJobFromComment(comment.text, comment.id);
        if (extracted) {
          jobs.push(extracted);
        }
      } catch (error) {
        logger.warn(
          { platform: this.name, commentId: comment.id, error },
          'Failed to extract job from comment'
        );
      }
    }

    return jobs;
  }

  private async extractJobFromComment(
    text: string,
    commentId: number
  ): Promise<RawJob | null> {
    const systemPrompt = `Extract job posting details from HackerNews comment HTML.
Return null if the comment is not a job posting (e.g., it's a question, meta-comment, or seeking freelancer).

The comment may contain HTML tags. Extract:
- title: Job title
- company: Company name
- location: Location (extract city/country if mentioned)
- remote: true if mentions "remote", "work from home", "distributed", "anywhere"
- description: Clean text description (remove HTML, keep key details)
- url: Application URL or company website if present
- salary: Extract if mentioned (look for $, USD, EUR, etc.)
- jobType: full-time, part-time, contract, internship (infer if not explicit)

Return null if this is clearly not a job posting.`;

    try {
      const result = await aiClient.completeJSON<ExtractedJob | null>(
        systemPrompt,
        text,
        z.union([ExtractedJobSchema, z.null()]),
        { model: 'fast' }
      );

      if (!result) return null;

      return {
        externalId: `hn-${commentId}`,
        platform: 'hackernews',
        title: result.title,
        company: result.company,
        location: result.location,
        remote: result.remote,
        description: result.description,
        url: result.url || `https://news.ycombinator.com/item?id=${commentId}`,
        salary: result.salary,
        jobType: result.jobType,
        fetchedAt: new Date(),
      };
    } catch (error) {
      logger.warn(
        { platform: this.name, commentId, error },
        'AI extraction failed for comment'
      );
      return null;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.ALGOLIA_SEARCH}?query=who+is+hiring&tags=story`
      );
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const hackerNewsPlatform = new HackerNewsPlatform();
