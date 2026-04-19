/**
 * Temporary debug endpoint to verify environment variables in production.
 * Returns only whether keys are set (not their values) for security.
 * DELETE THIS FILE after debugging.
 */
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const envPath = path.join(process.cwd(), '.env');
    let envContent = 'File not found';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf-8');
      // Redact sensitive parts to be safe
      envContent = envContent.replace(/(sk-ant-[a-zA-Z0-9]+-)[a-zA-Z0-9_-]+(AAA)/g, '$1...$2');
      envContent = envContent.replace(/=[a-zA-Z0-9_-]{10,}/g, '=[REDACTED]');
    }

    return NextResponse.json({
      envContent,
      nodeVersion: process.version,
      platform: process.platform,
      cwd: process.cwd(),
      anthropicInProcessEnv: !!process.env.ANTHROPIC_API_KEY,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) });
  }
}
