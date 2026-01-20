// ============================================
// RETRY LOGIC WITH EXPONENTIAL BACKOFF
// ============================================

export interface RetryConfig {
    maxAttempts: number;
    initialDelay: number; // ms
    maxDelay: number; // ms
    backoffMultiplier: number;
    jitter: boolean;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    jitter: true,
};

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    shouldRetry: (error: unknown) => boolean,
    config: RetryConfig = DEFAULT_RETRY_CONFIG,
    onRetry?: (attempt: number, error: unknown) => void
): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            // Don't retry if this is the last attempt or error is not retryable
            if (!shouldRetry(error) || attempt === config.maxAttempts) {
                throw error;
            }

            // Calculate delay with exponential backoff
            let delay = Math.min(
                config.initialDelay * Math.pow(config.backoffMultiplier, attempt - 1),
                config.maxDelay
            );

            // Add jitter to prevent thundering herd
            if (config.jitter) {
                delay = delay * (0.5 + Math.random() * 0.5);
            }

            onRetry?.(attempt, error);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError;
}
