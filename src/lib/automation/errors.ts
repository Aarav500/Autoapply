// ============================================
// STRUCTURED ERROR TYPES FOR SCRAPER SYSTEM
// ============================================

export enum ScraperErrorCode {
    NETWORK_ERROR = 'NETWORK_ERROR',
    TIMEOUT = 'TIMEOUT',
    SELECTOR_NOT_FOUND = 'SELECTOR_NOT_FOUND',
    AUTH_REQUIRED = 'AUTH_REQUIRED',
    RATE_LIMITED = 'RATE_LIMITED',
    CLOUDFLARE_CHALLENGE = 'CLOUDFLARE_CHALLENGE',
    BROWSER_CRASH = 'BROWSER_CRASH',
    ENVIRONMENT_ERROR = 'ENVIRONMENT_ERROR',
    UNKNOWN = 'UNKNOWN',
}

export class ScraperError extends Error {
    constructor(
        public code: ScraperErrorCode,
        message: string,
        public scraper: string,
        public retryable: boolean = true,
        public details?: any
    ) {
        super(message);
        this.name = 'ScraperError';
    }

    toJSON() {
        return {
            code: this.code,
            message: this.message,
            scraper: this.scraper,
            retryable: this.retryable,
            details: this.details,
        };
    }

    /**
     * Get user-friendly error message with suggested action
     */
    getUserMessage(): string {
        switch (this.code) {
            case ScraperErrorCode.NETWORK_ERROR:
                return `Network error while scraping ${this.scraper}. Check your internet connection and try again.`;
            case ScraperErrorCode.TIMEOUT:
                return `${this.scraper} timed out. The site may be slow or temporarily unavailable.`;
            case ScraperErrorCode.SELECTOR_NOT_FOUND:
                return `${this.scraper} page structure changed. This scraper may need updating.`;
            case ScraperErrorCode.AUTH_REQUIRED:
                return `${this.scraper} requires authentication. Please log in manually in your browser.`;
            case ScraperErrorCode.RATE_LIMITED:
                return `${this.scraper} rate limit exceeded. Please wait a few minutes before trying again.`;
            case ScraperErrorCode.CLOUDFLARE_CHALLENGE:
                return `${this.scraper} is protected by Cloudflare. Try again later.`;
            case ScraperErrorCode.BROWSER_CRASH:
                return `Browser crashed while scraping ${this.scraper}. Try restarting the application.`;
            case ScraperErrorCode.ENVIRONMENT_ERROR:
                return `Environment setup error: ${this.message}`;
            default:
                return `Error scraping ${this.scraper}: ${this.message}`;
        }
    }

    /**
     * Get suggested action for user
     */
    getSuggestedAction(): string {
        if (!this.retryable) {
            return 'This error cannot be automatically retried. Manual intervention required.';
        }

        switch (this.code) {
            case ScraperErrorCode.NETWORK_ERROR:
            case ScraperErrorCode.TIMEOUT:
                return 'Click "Retry Failed Scrapers" to try again.';
            case ScraperErrorCode.RATE_LIMITED:
                return 'Wait 5-10 minutes, then retry.';
            case ScraperErrorCode.CLOUDFLARE_CHALLENGE:
                return 'Try again later or use a different network.';
            case ScraperErrorCode.AUTH_REQUIRED:
                return 'Log into the site manually in a browser, then try again.';
            case ScraperErrorCode.SELECTOR_NOT_FOUND:
                return 'Report this issue - the scraper may need updating.';
            default:
                return 'Click "Retry Failed Scrapers" to try again.';
        }
    }
}

/**
 * Classify unknown errors into structured error types
 */
export function classifyError(error: unknown, scraper: string): ScraperError {
    const msg = error instanceof Error ? error.message : String(error);

    // Timeout errors
    if (msg.includes('timeout') || msg.includes('Timeout') || msg.includes('Navigation timeout')) {
        return new ScraperError(ScraperErrorCode.TIMEOUT, msg, scraper, true);
    }

    // Network errors
    if (
        msg.includes('Navigation failed') ||
        msg.includes('net::ERR') ||
        msg.includes('ECONNREFUSED') ||
        msg.includes('ENOTFOUND') ||
        msg.includes('ETIMEDOUT')
    ) {
        return new ScraperError(ScraperErrorCode.NETWORK_ERROR, msg, scraper, true);
    }

    // Selector errors
    if (
        msg.includes('waiting for selector') ||
        msg.includes('No element') ||
        msg.includes('querySelector') ||
        msg.includes('Cannot read property')
    ) {
        return new ScraperError(ScraperErrorCode.SELECTOR_NOT_FOUND, msg, scraper, false);
    }

    // Authentication errors
    if (msg.includes('login') || msg.includes('authentication') || msg.includes('sign in')) {
        return new ScraperError(ScraperErrorCode.AUTH_REQUIRED, msg, scraper, false);
    }

    // Rate limiting
    if (msg.includes('rate limit') || msg.includes('429') || msg.includes('too many requests')) {
        return new ScraperError(ScraperErrorCode.RATE_LIMITED, msg, scraper, true, { waitTime: 300000 }); // 5 min
    }

    // Cloudflare/CAPTCHA
    if (msg.includes('cloudflare') || msg.includes('captcha') || msg.includes('challenge')) {
        return new ScraperError(ScraperErrorCode.CLOUDFLARE_CHALLENGE, msg, scraper, false);
    }

    // Browser crash
    if (msg.includes('Target closed') || msg.includes('Session closed') || msg.includes('Browser closed')) {
        return new ScraperError(ScraperErrorCode.BROWSER_CRASH, msg, scraper, true);
    }

    // Unknown - assume retryable
    return new ScraperError(ScraperErrorCode.UNKNOWN, msg, scraper, true);
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
    if (error instanceof ScraperError) {
        return error.retryable;
    }

    // Default: classify and check
    const classified = classifyError(error, 'unknown');
    return classified.retryable;
}
