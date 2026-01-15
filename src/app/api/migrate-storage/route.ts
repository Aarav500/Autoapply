import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

// Migration endpoint to move data from old storage keys to new STORAGE_KEYS paths
// This fixes the issue where activities were stored at 'activities' but code now looks at 'activities/all'

const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
});

const BUCKET = process.env.S3_BUCKET_NAME!;
const DATA_PREFIX = 'data/';

// Old key -> New key mapping
const MIGRATION_MAP: Record<string, string> = {
    'activities': 'activities/all',
    'achievements': 'achievements/all',
    'cv-profile': 'cv/profile',
    'enhanced-jobs': 'jobs/all',
    'enhanced-scholarships': 'scholarships/all',
};

async function getS3Data(key: string): Promise<any | null> {
    try {
        const response = await s3Client.send(
            new GetObjectCommand({
                Bucket: BUCKET,
                Key: `${DATA_PREFIX}${key}.json`,
            })
        );
        const bodyString = await response.Body?.transformToString();
        return bodyString ? JSON.parse(bodyString) : null;
    } catch (error: any) {
        if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
            return null;
        }
        throw error;
    }
}

async function putS3Data(key: string, data: any): Promise<void> {
    await s3Client.send(
        new PutObjectCommand({
            Bucket: BUCKET,
            Key: `${DATA_PREFIX}${key}.json`,
            Body: JSON.stringify(data, null, 2),
            ContentType: 'application/json',
        })
    );
}

async function listS3Keys(prefix: string): Promise<string[]> {
    const response = await s3Client.send(
        new ListObjectsV2Command({
            Bucket: BUCKET,
            Prefix: `${DATA_PREFIX}${prefix}`,
        })
    );
    return (response.Contents || []).map(item => item.Key || '').filter(key => key.endsWith('.json'));
}

export async function GET(request: NextRequest) {
    // List all data keys to see what exists
    try {
        const allKeys = await listS3Keys('');

        // Check old paths
        const oldPaths: Record<string, any> = {};
        const newPaths: Record<string, any> = {};

        for (const [oldKey, newKey] of Object.entries(MIGRATION_MAP)) {
            const oldData = await getS3Data(oldKey);
            const newData = await getS3Data(newKey);

            if (oldData) oldPaths[oldKey] = { exists: true, count: Array.isArray(oldData) ? oldData.length : 1 };
            if (newData) newPaths[newKey] = { exists: true, count: Array.isArray(newData) ? newData.length : 1 };
        }

        return NextResponse.json({
            bucket: BUCKET,
            allKeys: allKeys.slice(0, 50), // First 50 keys
            oldPaths,
            newPaths,
            needsMigration: Object.keys(oldPaths).length > 0 && Object.keys(newPaths).length === 0,
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    // Run the migration
    const results: Record<string, { success: boolean; message: string }> = {};

    try {
        for (const [oldKey, newKey] of Object.entries(MIGRATION_MAP)) {
            const oldData = await getS3Data(oldKey);

            if (!oldData) {
                results[oldKey] = { success: true, message: 'No data at old path' };
                continue;
            }

            // Check if new path already has data
            const newData = await getS3Data(newKey);
            if (newData) {
                results[oldKey] = { success: true, message: 'New path already has data, skipping' };
                continue;
            }

            // Copy data to new path
            await putS3Data(newKey, oldData);

            const count = Array.isArray(oldData) ? oldData.length : 1;
            results[oldKey] = {
                success: true,
                message: `Migrated ${count} items from '${oldKey}' to '${newKey}'`
            };
        }

        return NextResponse.json({
            success: true,
            message: 'Migration complete',
            results,
        });
    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message,
            results,
        }, { status: 500 });
    }
}
