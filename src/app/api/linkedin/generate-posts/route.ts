import { NextRequest, NextResponse } from 'next/server';
import { generatePostVariants } from '@/lib/linkedin/content-factory';
import { Activity } from '@/lib/storage';

export async function POST(req: NextRequest) {
    try {
        const { activities } = await req.json();

        if (!activities || !Array.isArray(activities) || activities.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'No activities found to generate posts from. Please add activities first.'
            }, { status: 400 });
        }

        const allPosts: any[] = [];

        // Use up to 5 most recent/impactful activities to generate posts
        const selectedActivities = activities.slice(0, 5);

        selectedActivities.forEach((activity: Activity) => {
            const variants = generatePostVariants(activity);
            allPosts.push(...variants);
        });

        return NextResponse.json({
            success: true,
            posts: allPosts
        });
    } catch (error: any) {
        console.error('Post Generation Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
