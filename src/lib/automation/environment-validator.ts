// Environment validation utilities for health checks

import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';

interface ValidationResult {
  valid: boolean;
  missing: string[];
  present: string[];
}

interface BrowserValidation {
  success: boolean;
  error?: string;
}

interface S3Validation {
  success: boolean;
  error?: string;
}

// Required environment variables
const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'NEXTAUTH_SECRET',
];

// Optional but recommended
const OPTIONAL_ENV_VARS = [
  'CLAUDE_API_KEY',
  'ANTHROPIC_API_KEY',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'S3_BUCKET_NAME',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'SENDGRID_API_KEY',
];

/**
 * Validates required environment variables are set
 */
export async function validateEnvironment(): Promise<ValidationResult> {
  const missing: string[] = [];
  const present: string[] = [];

  for (const envVar of REQUIRED_ENV_VARS) {
    if (process.env[envVar]) {
      present.push(envVar);
    } else {
      missing.push(envVar);
    }
  }

  // Check at least one AI API key is present
  const hasAIKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (hasAIKey) {
    present.push('AI_API_KEY (CLAUDE or ANTHROPIC)');
  } else {
    missing.push('AI_API_KEY (CLAUDE or ANTHROPIC)');
  }

  return {
    valid: missing.length === 0,
    missing,
    present,
  };
}

/**
 * Validates browser/Playwright availability
 * Note: In production Docker, Playwright may not be available
 */
export async function validateBrowser(): Promise<BrowserValidation> {
  try {
    // Just check if playwright can be imported
    // Don't actually launch a browser as it's expensive
    const playwright = await import('playwright');

    // Check if chromium is available
    if (playwright.chromium) {
      return { success: true };
    }

    return { success: false, error: 'Chromium not available' };
  } catch (error) {
    // Browser not available is acceptable - not all features need it
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Browser validation failed'
    };
  }
}

/**
 * Validates S3 connectivity
 */
export async function validateS3(): Promise<S3Validation> {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION || 'us-east-1';
  const bucketName = process.env.S3_BUCKET_NAME;

  // Check if S3 is configured
  if (!accessKeyId || !secretAccessKey || !bucketName) {
    return {
      success: false,
      error: 'S3 not configured (missing credentials or bucket name)'
    };
  }

  try {
    const s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    // Test bucket access
    await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'S3 validation failed'
    };
  }
}
