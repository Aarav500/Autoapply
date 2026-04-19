/**
 * Temporary debug endpoint to verify environment variables in production.
 * Returns only whether keys are set (not their values) for security.
 * DELETE THIS FILE after debugging.
 */
import { NextResponse } from 'next/server';

export async function GET() {
  const keys = [
    'ANTHROPIC_API_KEY',
    'JWT_SECRET',
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
    'ENCRYPTION_KEY',
    'S3_BUCKET_NAME',
    'S3_REGION',
    'AWS_REGION',
    'NODE_ENV',
    'PORT',
    'APP_URL',
    'NEXT_PUBLIC_APP_URL',
  ];

  const status: Record<string, string> = {};
  for (const key of keys) {
    const val = process.env[key];
    if (!val) {
      status[key] = '❌ NOT SET';
    } else if (val.length > 4) {
      status[key] = `✅ SET (${val.slice(0, 4)}...${val.slice(-4)}, len=${val.length})`;
    } else {
      status[key] = `✅ SET (len=${val.length})`;
    }
  }

  return NextResponse.json({
    envStatus: status,
    nodeVersion: process.version,
    platform: process.platform,
    cwd: process.cwd(),
  });
}
