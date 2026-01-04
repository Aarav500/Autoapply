import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-west-2',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'college-essay-app-documents';

/**
 * Upload a file to S3
 */
export async function uploadFile(
    file: Buffer,
    fileName: string,
    contentType: string,
    userId: string
): Promise<{ key: string; url: string }> {
    const key = `${userId}/${Date.now()}-${fileName}`;

    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: file,
        ContentType: contentType,
        Metadata: {
            userId,
            originalName: fileName,
            uploadedAt: new Date().toISOString(),
        },
    });

    await s3Client.send(command);

    // Generate a signed URL for access
    const url = await getSignedUrl(
        s3Client,
        new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key }),
        { expiresIn: 3600 * 24 * 7 } // 7 days
    );

    return { key, url };
}

/**
 * Get a signed URL for file download
 */
export async function getFileUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
    });

    return getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour
}

/**
 * Delete a file from S3
 */
export async function deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
    });

    await s3Client.send(command);
}

/**
 * Get file content from S3
 */
export async function getFileContent(key: string): Promise<Buffer> {
    const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
    });

    const response = await s3Client.send(command);
    const chunks: Uint8Array[] = [];

    if (response.Body) {
        // @ts-ignore - Body is a readable stream
        for await (const chunk of response.Body) {
            chunks.push(chunk);
        }
    }

    return Buffer.concat(chunks);
}

/**
 * Generate upload presigned URL for direct browser uploads
 */
export async function getUploadUrl(
    fileName: string,
    contentType: string,
    userId: string
): Promise<{ uploadUrl: string; key: string }> {
    const key = `${userId}/${Date.now()}-${fileName}`;

    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour

    return { uploadUrl, key };
}
