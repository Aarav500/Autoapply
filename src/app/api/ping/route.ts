/**
 * Simple ping endpoint - no dependencies
 * Used for basic connectivity testing
 */

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    pong: true,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    nodeVersion: process.version,
    env: process.env.NODE_ENV,
  });
}
