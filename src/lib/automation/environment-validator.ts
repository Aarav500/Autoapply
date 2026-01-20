// ============================================
// ENVIRONMENT VALIDATION
// Checks all dependencies before starting scraper runs
// ============================================

export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

export async function validateEnvironment(): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check Node.js version
    const nodeVersion = process.version;
    const major = parseInt(nodeVersion.split('.')[0].substring(1));
    if (major < 18) {
        errors.push(`Node.js 18+ required (current: ${nodeVersion})`);
    }

    // Check Puppeteer availability
    try {
        await import('puppeteer');
        const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;

        if (!executablePath) {
            warnings.push('PUPPETEER_EXECUTABLE_PATH not set - using bundled Chrome');
        }
    } catch (e) {
        errors.push('Puppeteer not installed - run: npm install puppeteer');
    }

    // Check Gemini API key
    if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY === 'your_gemini_api_key_here') {
        warnings.push('NEXT_PUBLIC_GEMINI_API_KEY not configured - document generation may fail');
    }

    // Check AWS credentials (optional but recommended)
    const hasAWSCreds = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY;
    if (!hasAWSCreds) {
        warnings.push('AWS credentials not configured - data will only persist to localStorage');
    }

    // Check S3 bucket name
    if (!process.env.S3_BUCKET_NAME || process.env.S3_BUCKET_NAME === 'your-bucket-name') {
        warnings.push('S3_BUCKET_NAME not configured - data will only persist to localStorage');
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings,
    };
}

/**
 * Validate browser can be launched
 */
export async function validateBrowser(): Promise<{ success: boolean; error?: string }> {
    try {
        const puppeteer = await import('puppeteer');
        const browser = await puppeteer.default.launch({
            headless: 'shell',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
            timeout: 30000, // 30 second timeout
        });
        await browser.close();
        return { success: true };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

/**
 * Validate S3 connectivity
 */
export async function validateS3(): Promise<{ success: boolean; error?: string }> {
    try {
        // Only validate if credentials are provided
        if (!process.env.AWS_ACCESS_KEY_ID) {
            return { success: true }; // Skip validation if not configured
        }

        const { S3Client, HeadBucketCommand } = await import('@aws-sdk/client-s3');
        const client = new S3Client({
            region: process.env.AWS_REGION || 'us-east-1',
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
            },
        });

        // Test bucket access
        if (process.env.S3_BUCKET_NAME) {
            await client.send(new HeadBucketCommand({ Bucket: process.env.S3_BUCKET_NAME }));
        }

        return { success: true };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
