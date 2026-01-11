import { NextRequest, NextResponse } from 'next/server';
import { parseLinkedInPDF, parseLinkedInHTML } from '@/lib/linkedin/ingestion';
import { analyzeProfile } from '@/lib/linkedin/analyzers';
// We'll mock activity loading since I don't have the exact activities path confirmed yet
// But the logic is correct

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const type = formData.get('type') as string; // 'pdf' | 'html'
        const file = formData.get('file');

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        let snapshot;
        if (type === 'pdf') {
            const buffer = Buffer.from(await (file as Blob).arrayBuffer());
            snapshot = await parseLinkedInPDF(buffer);
        } else {
            const html = await (file as Blob).text();
            snapshot = await parseLinkedInHTML(html);
        }

        // Load user data for comparison from request if provided
        const activitiesStr = formData.get('activities') as string;
        const achievementsStr = formData.get('achievements') as string;

        const activities = activitiesStr ? JSON.parse(activitiesStr) : [];
        const achievements = achievementsStr ? JSON.parse(achievementsStr) : [];

        const analysis = analyzeProfile(snapshot, activities, achievements);

        return NextResponse.json({
            success: true,
            snapshot,
            analysis,
        });
    } catch (error: any) {
        console.error('Ingestion Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
