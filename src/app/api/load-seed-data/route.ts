// ============================================
// API: Load Seed Data for Activities & Achievements
// POST /api/load-seed-data - Loads Aarav Shah's profile data into S3
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import seedData from '@/data/import-activities-achievements.json';

// Direct S3 save using AWS Signature V4 (same as storage route)
async function saveDirectlyToS3(key: string, value: any): Promise<boolean> {
    const bucket = process.env.S3_BUCKET_NAME || '';
    const region = process.env.AWS_REGION || 'us-east-1';
    const accessKey = process.env.AWS_ACCESS_KEY_ID || '';
    const secretKey = process.env.AWS_SECRET_ACCESS_KEY || '';

    if (!bucket || !accessKey || !secretKey) {
        console.error('S3 not configured - bucket:', !!bucket, 'accessKey:', !!accessKey);
        return false;
    }

    const host = `${bucket}.s3.${region}.amazonaws.com`;
    const path = `/data/${key}.json`;
    const url = `https://${host}${path}`;
    const body = JSON.stringify(value);

    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);

    // Hash payload
    const encoder = new TextEncoder();
    const payloadHash = await crypto.subtle.digest('SHA-256', encoder.encode(body));
    const hashedPayload = Array.from(new Uint8Array(payloadHash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

    // Create canonical request
    const canonicalHeaders = [
        `host:${host}`,
        `x-amz-content-sha256:${hashedPayload}`,
        `x-amz-date:${amzDate}`,
    ].join('\n') + '\n';

    const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';

    const canonicalRequest = [
        'PUT',
        path,
        '',
        canonicalHeaders,
        signedHeaders,
        hashedPayload,
    ].join('\n');

    // Hash canonical request
    const canonicalHash = await crypto.subtle.digest('SHA-256', encoder.encode(canonicalRequest));
    const hashedCanonical = Array.from(new Uint8Array(canonicalHash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

    // Create string to sign
    const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
    const stringToSign = [
        'AWS4-HMAC-SHA256',
        amzDate,
        credentialScope,
        hashedCanonical,
    ].join('\n');

    // Calculate signature
    async function hmacSha256(key: ArrayBuffer | string, message: string): Promise<ArrayBuffer> {
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

    const kDate = await hmacSha256(`AWS4${secretKey}`, dateStamp);
    const kRegion = await hmacSha256(kDate, region);
    const kService = await hmacSha256(kRegion, 's3');
    const kSigning = await hmacSha256(kService, 'aws4_request');
    const signatureBuffer = await hmacSha256(kSigning, stringToSign);
    const signature = Array.from(new Uint8Array(signatureBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

    const authHeader = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    try {
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Host': host,
                'x-amz-date': amzDate,
                'x-amz-content-sha256': hashedPayload,
                'Authorization': authHeader,
                'Content-Type': 'application/json',
            },
            body,
        });

        if (!response.ok) {
            console.error('S3 PUT failed:', response.status, await response.text());
            return false;
        }

        return true;
    } catch (error) {
        console.error('S3 save error:', error);
        return false;
    }
}

export async function POST(request: NextRequest) {
    try {
        console.log('Loading seed data to S3...');
        console.log(`Activities: ${seedData.activities.length}, Achievements: ${seedData.achievements.length}`);

        // Save directly to S3
        const activitiesSaved = await saveDirectlyToS3('activities', seedData.activities);
        const achievementsSaved = await saveDirectlyToS3('achievements', seedData.achievements);

        console.log('Activities saved:', activitiesSaved);
        console.log('Achievements saved:', achievementsSaved);

        if (!activitiesSaved || !achievementsSaved) {
            return NextResponse.json({
                success: false,
                error: 'Failed to save to S3',
                details: {
                    activitiesSaved,
                    achievementsSaved
                }
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: `Loaded ${seedData.activities.length} activities and ${seedData.achievements.length} achievements to S3`,
            data: {
                activities: seedData.activities.length,
                achievements: seedData.achievements.length
            }
        });
    } catch (error) {
        console.error('Load seed data error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to load seed data', details: String(error) },
            { status: 500 }
        );
    }
}

export async function GET() {
    // Return the seed data for preview
    return NextResponse.json({
        success: true,
        data: seedData,
        summary: {
            activities: seedData.activities.length,
            achievements: seedData.achievements.length,
            categories: {
                activities: {
                    academic: seedData.activities.filter(a => a.category === 'academic').length,
                    leadership: seedData.activities.filter(a => a.category === 'leadership').length,
                    work: seedData.activities.filter(a => a.category === 'work').length,
                    volunteer: seedData.activities.filter(a => a.category === 'volunteer').length,
                    creative: seedData.activities.filter(a => a.category === 'creative').length,
                },
                achievements: {
                    award: seedData.achievements.filter(a => a.category === 'award').length,
                    publication: seedData.achievements.filter(a => a.category === 'publication').length,
                    certification: seedData.achievements.filter(a => a.category === 'certification').length,
                    academic: seedData.achievements.filter(a => a.category === 'academic').length,
                    other: seedData.achievements.filter(a => a.category === 'other').length,
                }
            }
        }
    });
}
