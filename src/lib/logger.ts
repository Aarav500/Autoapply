/**
 * Pino structured logging with redaction
 */

import pino from 'pino';

const isDevelopment = process.env.NODE_ENV === 'development';

// Redact sensitive information
const redactPaths = [
  'email',
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'api_key',
  'apiKey',
  'secret',
  '*.email',
  '*.password',
  '*.token',
  '*.accessToken',
  '*.refreshToken',
  '*.api_key',
  '*.apiKey',
  '*.secret',
  'req.headers.authorization',
  'req.headers.cookie',
];

// Base logger configuration
const baseLogger = pino({
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  redact: {
    paths: redactPaths,
    censor: '[REDACTED]',
  },
  // Disable pino-pretty transport to avoid worker thread issues on Windows
  // transport: isDevelopment
  //   ? {
  //       target: 'pino-pretty',
  //       options: {
  //         colorize: true,
  //         translateTime: 'SYS:standard',
  //         ignore: 'pid,hostname',
  //       },
  //     }
  //   : undefined,
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
});

/**
 * Create a child logger with a specific context
 */
export function createLogger(context: string) {
  return baseLogger.child({ context });
}

// Default export
export const logger = baseLogger;
