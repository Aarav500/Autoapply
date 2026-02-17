/**
 * Custom error classes with HTTP status codes
 */

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR'
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, code: string = 'VALIDATION_ERROR') {
    super(message, 400, code);
  }
}

export class AuthError extends AppError {
  constructor(message: string, code: string = 'AUTH_ERROR') {
    super(message, 401, code);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string, code: string = 'FORBIDDEN') {
    super(message, 403, code);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, code: string = 'NOT_FOUND') {
    super(message, 404, code);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string, code: string = 'RATE_LIMIT_EXCEEDED') {
    super(message, 429, code);
  }
}

export class ExternalServiceError extends AppError {
  constructor(message: string, code: string = 'EXTERNAL_SERVICE_ERROR') {
    super(message, 502, code);
  }
}
