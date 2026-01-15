import { NextRequest, NextResponse } from 'next/server';

/**
 * S3 MIGRATION & DIAGNOSTIC ENDPOINT
 *
 * GET /api/s3-migrate - List all keys in S3 bucket
 * POST /api/s3-migrate - Migrate data from old keys to new keys
 */

const getS3Config = () => ({
    bucket: process.env.S3_BUCKET_NAME || '',
    region: process.env.AWS_REGION || 'us-east-1',
    accessKey: process.env.AWS_ACCESS_KEY_ID || '',
    secretKey: process.env.AWS_SECRET_ACCESS_KEY || '',
});

// Crypto helpers (same as storage route)
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
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);

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
        '',
        canonicalHeaders,
        signedHeaders,
        hashedPayload,
    ].join('\n');

    const credentialScope = `${dateStamp}/${config.region}/s3/aws4_request`;
    const stringToSign = [
        'AWS4-HMAC-SHA256',
        amzDate,
        credentialScope,
        await sha256(canonicalRequest),
    ].join('\n');

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

/**
 * GET - List all S3 keys and check for old vs new paths
 */
export async function GET(request: NextRequest) {
    try {
        const config = getS3Config();

        if (!config.bucket || !config.accessKey || !config.secretKey) {
            return NextResponse.json({
                error: 'S3 not configured',
                configured: false
            }, { status: 500 });
        }

        // List bucket contents
        const listPath = '/';
        const { url, headers } = await signRequest('GET', listPath + '?list-type=2&prefix=data/', config);

        const response = await fetch(url, { headers });

        if (!response.ok) {
            throw new Error(`S3 list error: ${response.status}`);
        }

        const xmlText = await response.text();

        // Parse XML to get keys (simple parser)
        const keyMatches = xmlText.matchAll(/<Key>([^<]+)<\/Key>/g);
        const keys = Array.from(keyMatches).map(m => m[1]);

        // Categorize keys
        const oldKeys = keys.filter(k =>
            k.includes('data/activities.json') ||
            k.includes('data/achievements.json') ||
            k.includes('data/cv-profile.json')
        );

        const newKeys = keys.filter(k =>
            k.includes('data/activities/all.json') ||
            k.includes('data/achievements/all.json') ||
            k.includes('data/cv/profile.json')
        );

        return NextResponse.json({
            configured: true,
            bucket: config.bucket,
            totalKeys: keys.length,
            allKeys: keys,
            oldKeys,
            newKeys,
            needsMigration: oldKeys.length > 0 && newKeys.length === 0,
            suggestion: oldKeys.length > 0 && newKeys.length === 0
                ? 'Old keys found. Run POST /api/s3-migrate to migrate.'
                : 'Data appears to be using new keys or no data found.'
        });
    } catch (error) {
        console.error('S3 diagnostic error:', error);
        return NextResponse.json({
            error: String(error),
            configured: true
        }, { status: 500 });
    }
}

/**
 * POST - Migrate data from old keys to new keys
 */
export async function POST(request: NextRequest) {
    try {
        const config = getS3Config();

        if (!config.bucket || !config.accessKey || !config.secretKey) {
            return NextResponse.json({
                error: 'S3 not configured'
            }, { status: 500 });
        }

        const migrations = [
            { from: 'activities', to: 'activities/all' },
            { from: 'achievements', to: 'achievements/all' },
            { from: 'cv-profile', to: 'cv/profile' },
            { from: 'user-profile', to: 'user/profile' },
            { from: 'profile', to: 'user/profile' },
        ];

        const results = [];

        for (const { from, to } of migrations) {
            try {
                // Try to read old key
                const fromPath = `/data/${from}.json`;
                const { url: fromUrl, headers: fromHeaders } = await signRequest('GET', fromPath, config);
                const fromResponse = await fetch(fromUrl, { headers: fromHeaders });

                if (fromResponse.ok) {
                    const data = await fromResponse.json();

                    // Write to new key
                    const toPath = `/data/${to}.json`;
                    const body = JSON.stringify(data);
                    const { url: toUrl, headers: toHeaders } = await signRequest('PUT', toPath, config, body, 'application/json');

                    const toResponse = await fetch(toUrl, {
                        method: 'PUT',
                        headers: toHeaders,
                        body,
                    });

                    if (toResponse.ok) {
                        results.push({
                            from,
                            to,
                            status: 'migrated',
                            recordCount: Array.isArray(data) ? data.length : 1
                        });
                    } else {
                        results.push({
                            from,
                            to,
                            status: 'failed',
                            error: `Write failed: ${toResponse.status}`
                        });
                    }
                } else if (fromResponse.status === 404) {
                    results.push({
                        from,
                        to,
                        status: 'not_found'
                    });
                } else {
                    results.push({
                        from,
                        to,
                        status: 'error',
                        error: `Read failed: ${fromResponse.status}`
                    });
                }
            } catch (err) {
                results.push({
                    from,
                    to,
                    status: 'error',
                    error: String(err)
                });
            }
        }

        const migratedCount = results.filter(r => r.status === 'migrated').length;

        return NextResponse.json({
            success: true,
            migratedCount,
            results
        });
    } catch (error) {
        console.error('S3 migration error:', error);
        return NextResponse.json({
            error: String(error)
        }, { status: 500 });
    }
}
