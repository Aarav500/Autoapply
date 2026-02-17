import Anthropic from '@anthropic-ai/sdk';
import { z, ZodSchema } from 'zod';
import { logger } from './logger';
import { ExternalServiceError } from './errors';
import type { AIClientOptions, AIModel, AIUsageMetrics } from '@/types/ai';

const MODEL_MAP: Record<AIModel, string> = {
  fast: 'claude-haiku-4-5-20251001',
  balanced: 'claude-sonnet-4-5-20250929',
  powerful: 'claude-opus-4-6',
};

const DEFAULT_OPTIONS: Required<AIClientOptions> = {
  model: 'balanced',
  temperature: 1,
  maxTokens: 4096,
  timeout: 30000,
};

class AIClient {
  private client: Anthropic | null = null;

  private getClient(): Anthropic {
    if (!this.client) {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new ExternalServiceError('Anthropic API key not configured');
      }
      this.client = new Anthropic({ apiKey });
    }
    return this.client;
  }

  private getTimeout(options?: AIClientOptions): number {
    if (options?.timeout) return options.timeout;
    if (options?.model === 'powerful') return 60000;
    return DEFAULT_OPTIONS.timeout;
  }

  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxAttempts = 3,
    baseDelay = 1000
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        // Check if it's a rate limit error
        if (error instanceof Anthropic.APIError && error.status === 429) {
          if (attempt < maxAttempts) {
            const delay = baseDelay * Math.pow(2, attempt - 1);
            logger.warn(`Rate limited. Retrying in ${delay}ms (attempt ${attempt}/${maxAttempts})`);
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }
        }

        // For non-rate-limit errors, throw immediately
        throw error;
      }
    }

    throw lastError;
  }

  private stripMarkdownCodeFences(text: string): string {
    // Remove markdown code fences like ```json ... ``` or ``` ... ```
    return text.replace(/^```(?:json)?\n?/gm, '').replace(/\n?```$/gm, '').trim();
  }

  async complete(
    system: string,
    user: string,
    options?: AIClientOptions
  ): Promise<string> {
    const client = this.getClient();
    const model = options?.model ?? DEFAULT_OPTIONS.model;
    const temperature = options?.temperature ?? DEFAULT_OPTIONS.temperature;
    const maxTokens = options?.maxTokens ?? DEFAULT_OPTIONS.maxTokens;
    const timeout = this.getTimeout(options);

    const startTime = Date.now();

    try {
      const response = await this.retryWithBackoff(async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
          return await client.messages.create(
            {
              model: MODEL_MAP[model],
              max_tokens: maxTokens,
              temperature,
              system,
              messages: [{ role: 'user', content: user }],
            },
            { signal: controller.signal as AbortSignal }
          );
        } finally {
          clearTimeout(timeoutId);
        }
      });

      const duration = Date.now() - startTime;

      // Log usage metrics
      const metrics: AIUsageMetrics = {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
        model: MODEL_MAP[model],
        duration_ms: duration,
      };

      logger.info({ metrics }, 'AI completion successful');

      // Extract text from response
      const content = response.content[0];
      if (content.type !== 'text') {
        throw new ExternalServiceError('Unexpected response type from AI');
      }

      return content.text;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          duration_ms: duration,
          model: MODEL_MAP[model],
        },
        'AI completion failed'
      );

      if (error instanceof Anthropic.APIError) {
        throw new ExternalServiceError(`AI API error: ${error.message}`);
      }

      throw error;
    }
  }

  async completeJSON<T>(
    system: string,
    user: string,
    schema: ZodSchema<T>,
    options?: AIClientOptions
  ): Promise<T> {
    const enhancedSystem = `${system}\n\nIMPORTANT: Respond ONLY with valid JSON. Do not include any explanatory text, markdown formatting, or code fences. Output must be pure JSON only.`;

    let lastError: Error | null = null;
    const maxRetries = 2;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const responseText = await this.complete(enhancedSystem, user, options);

        // Strip markdown code fences if present
        const cleanedResponse = this.stripMarkdownCodeFences(responseText);

        // Parse JSON
        let parsed: unknown;
        try {
          parsed = JSON.parse(cleanedResponse);
        } catch (parseError) {
          logger.warn(
            {
              attempt,
              error: parseError instanceof Error ? parseError.message : String(parseError),
            },
            'JSON parse error, attempting to extract JSON from response'
          );

          // Try to extract JSON object from the response
          const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0]);
          } else {
            throw parseError;
          }
        }

        // Validate against schema
        const validated = schema.parse(parsed);
        return validated;
      } catch (error) {
        lastError = error as Error;

        if (attempt < maxRetries) {
          logger.warn(
            {
              attempt,
              error: error instanceof Error ? error.message : String(error),
            },
            'JSON validation failed, retrying with error feedback'
          );

          // Add error feedback to the user prompt for retry
          const errorMessage =
            error instanceof z.ZodError
              ? `The previous response had validation errors: ${JSON.stringify(error.issues)}. Please ensure the JSON matches the required schema exactly.`
              : `The previous response was not valid JSON: ${error instanceof Error ? error.message : String(error)}. Please respond with valid JSON only.`;

          user = `${user}\n\n${errorMessage}`;
        } else {
          logger.error(
            {
              error: error instanceof Error ? error.message : String(error),
            },
            'JSON validation failed after all retries'
          );
        }
      }
    }

    throw new ExternalServiceError(
      `Failed to get valid JSON response after ${maxRetries + 1} attempts: ${lastError?.message ?? 'Unknown error'}`
    );
  }
}

export const aiClient = new AIClient();
