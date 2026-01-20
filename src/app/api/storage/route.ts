// ============================================
// S3 STORAGE API ROUTE
// Handles all S3 operations server-side
// ============================================

import { NextRequest, NextResponse } from 'next/server';

// AWS SDK v3 lite - using fetch instead of full SDK to reduce bundle size
// These are read at runtime from process.env
const getS3Config = () => ({
    bucket: process.env.S3_BUCKET_NAME || '',
    region: process.env.AWS_REGION || 'us-east-1',
    accessKey: process.env.AWS_ACCESS_KEY_ID || '',
    secretKey: process.env.AWS_SECRET_ACCESS_KEY || '',
});

// Simple AWS Signature V4 implementation
async function signRequest(
    method: string,
    path: string,
    config: ReturnType<typeof getS3Config>,
    body?: string,
    contentType?: string
): Promise<{ url: string; headers: Record<string, string> }> {
    const host = `${config.bucket}.s3.${config.region}.amazonaws.com`;
    const url = `https://${host}${path}`;

    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);

    // Create canonical request
    const hashedPayload = await sha256(body || '');

    const canonicalHeaders = [
        `host:${host}`,
        `x-amz-content-sha256:${hashedPayload}`,
        `x-amz-date:${amzDate}`,
    ].join('\n') + '\n';

    const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';

    const canonicalRequest = [
        method,
        path,
        '', // query string
        canonicalHeaders,
        signedHeaders,
        hashedPayload,
    ].join('\n');

    // Create string to sign
    const credentialScope = `${dateStamp}/${config.region}/s3/aws4_request`;
    const stringToSign = [
        'AWS4-HMAC-SHA256',
        amzDate,
        credentialScope,
        await sha256(canonicalRequest),
    ].join('\n');

    // Calculate signature
    const kDate = await hmacSha256(`AWS4${config.secretKey}`, dateStamp);
    const kRegion = await hmacSha256(kDate, config.region);
    const kService = await hmacSha256(kRegion, 's3');
    const kSigning = await hmacSha256(kService, 'aws4_request');
    const signature = await hmacSha256Hex(kSigning, stringToSign);

    const authHeader = `AWS4-HMAC-SHA256 Credential=${config.accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const headers: Record<string, string> = {
        'Host': host,
        'x-amz-date': amzDate,
        'x-amz-content-sha256': hashedPayload,
        'Authorization': authHeader,
    };

    if (contentType) {
        headers['Content-Type'] = contentType;
    }

    return { url, headers };
}

// Crypto helpers
async function sha256(message: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

async function hmacSha256(key: string | ArrayBuffer, message: string): Promise<ArrayBuffer> {
    const encoder = new TextEncoder();
    const keyData = typeof key === 'string' ? encoder.encode(key) : key;
    const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    return crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message));
}

async function hmacSha256Hex(key: ArrayBuffer, message: string): Promise<string> {
    const signature = await hmacSha256(key, message);
    return Array.from(new Uint8Array(signature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

// ============================================
// GET - Retrieve data from S3
// ============================================
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const key = searchParams.get('key');

        if (!key) {
            return NextResponse.json({ error: 'Key is required' }, { status: 400 });
        }

        // Get config at runtime
        const config = getS3Config();

        // Check if S3 is configured
        if (!config.bucket || !config.accessKey || !config.secretKey) {
            console.log('S3 not configured - bucket:', !!config.bucket, 'accessKey:', !!config.accessKey);
            // Fallback: return empty for unconfigured S3
            return NextResponse.json(null, { status: 404 });
        }

        const path = `/data/${key}.json`;
        const { url, headers } = await signRequest('GET', path, config);

        const response = await fetch(url, { headers });

        if (response.status === 404) {
            return NextResponse.json(null, { status: 404 });
        }

        if (!response.ok) {
            throw new Error(`S3 error: ${response.status}`);
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('S3 GET error:', error);
        return NextResponse.json({ error: 'Failed to get data' }, { status: 500 });
    }
}

// ============================================
// POST - Save data to S3
// ============================================
export async function POST(request: NextRequest) {
    try {
        const { key, value } = await request.json();

        if (!key || value === undefined) {
            return NextResponse.json({ error: 'Key and value are required' }, { status: 400 });
        }

        // Get config at runtime
        const config = getS3Config();

        // Check if S3 is configured
        if (!config.bucket || !config.accessKey || !config.secretKey) {
            // Return success anyway - data will be stored in localStorage fallback
            return NextResponse.json({ success: true, fallback: true });
        }

        const path = `/data/${key}.json`;
        const body = JSON.stringify(value);
        const { url, headers } = await signRequest('PUT', path, config, body, 'application/json');

        const response = await fetch(url, {
            method: 'PUT',
            headers,
            body,
        });

        if (!response.ok) {
            throw new Error(`S3 error: ${response.status}`);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('S3 POST error:', error);
        return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
    }
}

// ============================================
// DELETE - Remove data from S3
// ============================================
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const key = searchParams.get('key');

        if (!key) {
            return NextResponse.json({ error: 'Key is required' }, { status: 400 });
        }

        // Get config at runtime
        const config = getS3Config();

        // Check if S3 is configured
        if (!config.bucket || !config.accessKey || !config.secretKey) {
            return NextResponse.json({ success: true, fallback: true });
        }

        const path = `/data/${key}.json`;
        const { url, headers } = await signRequest('DELETE', path, config);

        const response = await fetch(url, {
            method: 'DELETE',
            headers,
        });

        if (!response.ok && response.status !== 404) {
            throw new Error(`S3 error: ${response.status}`);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('S3 DELETE error:', error);
        return NextResponse.json({ error: 'Failed to delete data' }, { status: 500 });
    }
}
