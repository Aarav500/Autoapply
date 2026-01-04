import { NextRequest, NextResponse } from 'next/server';
import { uploadFile, getFileUrl, deleteFile, getUploadUrl } from '@/lib/s3-storage';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const userId = formData.get('userId') as string || 'default-user';

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const result = await uploadFile(buffer, file.name, file.type, userId);

        return NextResponse.json({
            success: true,
            key: result.key,
            url: result.url,
            name: file.name,
            size: file.size,
            type: file.type,
        });
    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const key = searchParams.get('key');
        const action = searchParams.get('action');

        if (!key) {
            return NextResponse.json({ error: 'No key provided' }, { status: 400 });
        }

        if (action === 'presigned') {
            const url = await getFileUrl(key);
            return NextResponse.json({ url });
        }

        // For upload presigned URL
        if (action === 'upload-url') {
            const fileName = searchParams.get('fileName') || 'file';
            const contentType = searchParams.get('contentType') || 'application/octet-stream';
            const userId = searchParams.get('userId') || 'default-user';

            const result = await getUploadUrl(fileName, contentType, userId);
            return NextResponse.json(result);
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        console.error('Document API error:', error);
        return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const key = searchParams.get('key');

        if (!key) {
            return NextResponse.json({ error: 'No key provided' }, { status: 400 });
        }

        await deleteFile(key);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete error:', error);
        return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
    }
}
