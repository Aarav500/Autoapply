// Scraper error types and handling

export type ScraperErrorCode =
  | 'NETWORK_ERROR'
  | 'AUTH_ERROR'
  | 'RATE_LIMIT'
  | 'PARSE_ERROR'
  | 'CAPTCHA_REQUIRED'
  | 'BLOCKED'
  | 'NOT_FOUND'
  | 'TIMEOUT'
  | 'UNKNOWN';

interface ScraperErrorOptions {
  code: ScraperErrorCode;
  message: string;
  scraper: string;
  retryable?: boolean;
  details?: Record<string, unknown>;
}

export class ScraperError extends Error {
  code: ScraperErrorCode;
  scraper: string;
  retryable: boolean;
  details?: Record<string, unknown>;

  constructor(options: ScraperErrorOptions) {
    super(options.message);
    this.name = 'ScraperError';
    this.code = options.code;
    this.scraper = options.scraper;
    this.retryable = options.retryable ?? false;
    this.details = options.details;
  }

  getUserMessage(): string {
    const messages: Record<ScraperErrorCode, string> = {
      NETWORK_ERROR: 'Unable to connect to the job site. Please check your internet connection.',
      AUTH_ERROR: 'Authentication failed. Please check your credentials.',
      RATE_LIMIT: 'Too many requests. Please wait before trying again.',
      PARSE_ERROR: 'The page structure has changed. This scraper may need updating.',
      CAPTCHA_REQUIRED: 'The site is requiring human verification.',
      BLOCKED: 'Access has been blocked by the job site.',
      NOT_FOUND: 'The requested resource was not found.',
      TIMEOUT: 'The request took too long to complete.',
      UNKNOWN: 'An unexpected error occurred.',
    };

    return messages[this.code] || messages.UNKNOWN;
  }

  getSuggestedAction(): string {
    const actions: Record<ScraperErrorCode, string> = {
      NETWORK_ERROR: 'Try again in a few minutes.',
      AUTH_ERROR: 'Update your credentials in settings.',
      RATE_LIMIT: 'Wait 15-30 minutes before retrying.',
      PARSE_ERROR: 'Contact support to report this issue.',
      CAPTCHA_REQUIRED: 'Try logging into the site manually first.',
      BLOCKED: 'Use a different network or wait 24 hours.',
      NOT_FOUND: 'Verify the URL or search criteria.',
      TIMEOUT: 'Try with a smaller search scope.',
      UNKNOWN: 'Try again or contact support.',
    };

    return actions[this.code] || actions.UNKNOWN;
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
}
