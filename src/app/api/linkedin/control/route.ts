
import { NextResponse } from 'next/server';
import { linkedInManager } from '@/lib/automation/linkedin-manager';

export async function POST(req: Request) {
    try {
        const { action, payload } = await req.json();

        if (action === 'updateHeadline') {
            await linkedInManager.updateHeadline(payload.text);
            return NextResponse.json({ success: true, message: 'Headline updated' });
        }

        if (action === 'updateAbout') {
            await linkedInManager.updateAbout(payload.text);
            return NextResponse.json({ success: true, message: 'About section updated' });
        }

        if (action === 'engageFeed') {
            await linkedInManager.engageWithFeed(payload.count || 3);
            return NextResponse.json({ success: true, message: `Engaged with ${payload.count || 3} posts` });
        }

        if (action === 'connectPeople') {
            await linkedInManager.connectWithNewPeople(payload.keywords, payload.limit || 2);
            return NextResponse.json({ success: true, message: `Sent connection requests for "${payload.keywords}"` });
        }

        if (action === 'createPost') {
            await linkedInManager.createPost(payload.content);
            return NextResponse.json({ success: true, message: 'New post published' });
        }

        if (action === 'addExperience') {
            await linkedInManager.addExperience(payload.experience);
            return NextResponse.json({ success: true, message: 'Experience added' });
        }

        if (action === 'addEducation') {
            await linkedInManager.addEducation(payload.education);
            return NextResponse.json({ success: true, message: 'Education added' });
        }

        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    } catch (error: any) {
        console.error('LinkedIn Control Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Automation failed'
        }, { status: 500 });
    }
}
