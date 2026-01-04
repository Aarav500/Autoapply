import { NextRequest, NextResponse } from 'next/server';
import { calculateJobMatch } from '@/lib/ai-engine';

// Mock job data - in production, this would fetch from Handshake/database
const onCampusJobs = [
    {
        id: 1,
        title: 'Research Assistant',
        company: 'UCR Biology Department',
        location: 'On Campus',
        type: 'Part-time',
        hours: '10-15 hrs/week',
        pay: '$17.50/hr',
        deadline: '2026-01-15',
        tags: ['Research', 'Biology', 'Data Analysis'],
        description: 'Assist faculty with ongoing research projects in molecular biology.',
        requirements: ['Currently enrolled student', 'Biology or related major preferred', 'GPA 3.0+'],
    },
    {
        id: 2,
        title: 'Library Student Assistant',
        company: 'UCR Library',
        location: 'On Campus',
        type: 'Part-time',
        hours: '15-20 hrs/week',
        pay: '$16.50/hr',
        deadline: '2026-01-20',
        tags: ['Customer Service', 'Organization', 'Library'],
        description: 'Help library patrons, shelve books, and assist with daily operations.',
        requirements: ['Currently enrolled student', 'Good communication skills', 'Detail-oriented'],
    },
    {
        id: 3,
        title: 'IT Help Desk Technician',
        company: 'UCR Information Technology',
        location: 'On Campus',
        type: 'Part-time',
        hours: '10-15 hrs/week',
        pay: '$18.00/hr',
        deadline: '2026-01-25',
        tags: ['IT Support', 'Technical', 'Customer Service'],
        description: 'Provide technical support to students and staff for various IT issues.',
        requirements: ['CS or IT major preferred', 'Basic troubleshooting skills', 'Customer service experience'],
    },
];

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type') || 'on-campus';
        const search = searchParams.get('search') || '';

        let jobs = type === 'on-campus' ? onCampusJobs : [];

        // Filter by search query
        if (search) {
            jobs = jobs.filter(
                (job) =>
                    job.title.toLowerCase().includes(search.toLowerCase()) ||
                    job.company.toLowerCase().includes(search.toLowerCase()) ||
                    job.tags.some((tag) => tag.toLowerCase().includes(search.toLowerCase()))
            );
        }

        return NextResponse.json({ jobs });
    } catch (error) {
        console.error('Jobs API error:', error);
        return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, jobDescription, resumeContent, skills } = body;

        if (action === 'calculate-match') {
            const match = await calculateJobMatch(jobDescription, resumeContent, skills);
            return NextResponse.json(match);
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        console.error('Jobs API error:', error);
        return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
    }
}
