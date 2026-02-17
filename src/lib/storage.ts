/**
 * S3-based JSON storage client
 * This is the ONLY way to read/write data in this app (replaces a database)
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadBucketCommand,
  CreateBucketCommand,
  NoSuchKey,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

interface StorageConfig {
  endpoint?: string;
  region: string;
  credentials: {
    accessKeyId: string;
    secretAccessKey: string;
  };
  bucket: string;
  forcePathStyle: boolean;
}

class StorageClient {
  private s3: S3Client;
  private bucket: string;
  private maxRetries = 3;
  private retryDelay = 1000; // ms

  constructor(config: StorageConfig) {
    this.s3 = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      credentials: config.credentials,
      forcePathStyle: config.forcePathStyle,
    });
    this.bucket = config.bucket;
  }

  /**
   * Retry wrapper for S3 operations
   */
  private async retry<T>(
    operation: () => Promise<T>,
    attempt = 1
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= this.maxRetries) {
        throw error;
      }
      await this.sleep(this.retryDelay * attempt);
      return this.retry(operation, attempt + 1);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get JSON object from S3
   * Returns null if key doesn't exist (doesn't throw)
   */
  async getJSON<T>(key: string): Promise<T | null> {
    return this.retry(async () => {
      try {
        const command = new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        });
        const response = await this.s3.send(command);
        const body = await response.Body?.transformToString();
        if (!body) return null;
        return JSON.parse(body) as T;
      } catch (error) {
        // NoSuchKey means the object doesn't exist, return null
        if (error instanceof NoSuchKey || (error as any).name === 'NoSuchKey') {
          return null;
        }
        throw error;
      }
    });
  }

  /**
   * Put JSON object to S3
   */
  async putJSON<T>(key: string, data: T): Promise<void> {
    return this.retry(async () => {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: JSON.stringify(data, null, 2),
        ContentType: 'application/json',
      });
      await this.s3.send(command);
    });
  }

  /**
   * Update JSON object using an updater function
   * This is our "database update" operation
   */
  async updateJSON<T>(
    key: string,
    updater: (current: T | null) => T
  ): Promise<void> {
    const current = await this.getJSON<T>(key);
    const updated = updater(current);
    await this.putJSON(key, updated);
  }

  /**
   * Delete JSON object from S3
   */
  async deleteJSON(key: string): Promise<void> {
    return this.retry(async () => {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      await this.s3.send(command);
    });
  }

  /**
   * List all keys with a given prefix
   */
  async listKeys(prefix: string): Promise<string[]> {
    return this.retry(async () => {
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
      });
      const response = await this.s3.send(command);
      return response.Contents?.map((obj) => obj.Key!).filter(Boolean) || [];
    });
  }

  /**
   * Upload file (PDF, image, etc.)
   */
  async uploadFile(
    key: string,
    body: Buffer,
    contentType: string
  ): Promise<string> {
    return this.retry(async () => {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      });
      await this.s3.send(command);
      return key;
    });
  }

  /**
   * Download file from S3
   */
  async downloadFile(key: string): Promise<Buffer> {
    return this.retry(async () => {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      const response = await this.s3.send(command);
      const bytes = await response.Body?.transformToByteArray();
      if (!bytes) throw new Error('Failed to download file');
      return Buffer.from(bytes);
    });
  }

  /**
   * Get presigned URL for temporary file access
   */
  async getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
    return this.retry(async () => {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      return await getSignedUrl(this.s3, command, { expiresIn });
    });
  }

  /**
   * Delete file from S3
   */
  async deleteFile(key: string): Promise<void> {
    return this.deleteJSON(key); // Same as deleteJSON
  }

  /**
   * Ensure bucket exists, create if not
   * Call this on app startup
   */
  async ensureBucket(): Promise<void> {
    try {
      // Check if bucket exists
      const headCommand = new HeadBucketCommand({ Bucket: this.bucket });
      await this.s3.send(headCommand);
    } catch (error) {
      // Bucket doesn't exist, create it
      if ((error as any).name === 'NotFound' || (error as any).$metadata?.httpStatusCode === 404) {
        const createCommand = new CreateBucketCommand({ Bucket: this.bucket });
        await this.s3.send(createCommand);
      } else {
        throw error;
      }
    }
  }
}

// Singleton instance
const storageConfig: StorageConfig = {
  endpoint: process.env.S3_ENDPOINT, // Only for MinIO/local dev, omit for AWS S3
  region: process.env.AWS_REGION || process.env.S3_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY || 'minioadmin',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || process.env.S3_SECRET_KEY || 'minioadmin',
  },
  bucket: process.env.S3_BUCKET_NAME || process.env.S3_BUCKET || 'autoapply',
  forcePathStyle: !!process.env.S3_ENDPOINT, // Only for MinIO, not AWS S3
};

export const storage = new StorageClient(storageConfig);
export type { StorageClient };
