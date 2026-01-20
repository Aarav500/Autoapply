'use client';

import { useMemo } from 'react';
import { DeadlineCalendar, DeadlineItem } from '@/components/deadline-calendar';
import { useS3Storage } from '@/lib/useS3Storage';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

// Sample deadlines for demo (would come from opportunity store)
const sampleDeadlines: DeadlineItem[] = [
    {
        id: 'job-google-swe-intern',
        title: 'Software Engineering Intern',
        organization: 'Google',
        type: 'job',
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        matchScore: 92,
        status: 'not_started',
        url: 'https://careers.google.com',
    },
    {
        id: 'job-meta-swe-intern',
        title: 'Software Engineer Intern',
        organization: 'Meta',
        type: 'job',
        deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
        matchScore: 88,
        status: 'docs_generated',
        url: 'https://www.metacareers.com',
    },
    {
        id: 'sch-knight-hennessy',
        title: 'Knight-Hennessy Scholars',
        organization: 'Stanford University',
        type: 'scholarship',
        deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        amount: 'Full Funding',
        matchScore: 88,
        status: 'not_started',
        url: 'https://knight-hennessy.stanford.edu',
    },
    {
        id: 'sch-fulbright',
        title: 'Fulbright Scholarship',
        organization: 'U.S. Department of State',
        type: 'scholarship',
        deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        amount: 'Full Funding',
        matchScore: 92,
        status: 'not_started',
        url: 'https://foreign.fulbrightonline.org',
    },
    {
        id: 'sch-inlaks',
        title: 'Inlaks Shivdasani Foundation',
        organization: 'Inlaks Foundation',
        type: 'scholarship',
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        amount: 'Up to $100,000',
        matchScore: 90,
        status: 'not_started',
        url: 'https://www.inlaksfoundation.org',
    },
    {
        id: 'job-amazon-sde-intern',
        title: 'SDE Intern',
        organization: 'Amazon',
        type: 'job',
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Urgent!
        matchScore: 85,
        status: 'not_started',
        url: 'https://www.amazon.jobs',
    },
    {
        id: 'sch-tata-cornell',
        title: 'Tata Scholarship at Cornell',
        organization: 'Tata Trust',
        type: 'scholarship',
        deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        amount: 'Full Financial Need',
        matchScore: 95,
        status: 'docs_generated',
        url: 'https://cornell.edu',
    },
    {
        id: 'job-microsoft-swe',
        title: 'Software Engineering Intern',
        organization: 'Microsoft',
        type: 'job',
        deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // Very urgent!
        matchScore: 82,
        status: 'applied',
        url: 'https://careers.microsoft.com',
    },
];

export default function OpportunityDeadlinesPage() {
    const router = useRouter();

    // In production, would load from S3 storage
    const { data: savedJobs, isLoading: jobsLoading } = useS3Storage<any[]>('enhanced-jobs', {
        defaultValue: [],
    });

    const { data: savedScholarships, isLoading: scholarshipsLoading } = useS3Storage<any[]>('enhanced-scholarships', {
        defaultValue: [],
    });

    // Merge real data with samples
    const deadlines = useMemo(() => {
        const merged: DeadlineItem[] = [...sampleDeadlines];

        // Add jobs with deadlines
        savedJobs?.forEach(job => {
            if (job.deadline && !merged.find(d => d.id === job.id)) {
                merged.push({
                    id: job.id,
                    title: job.title,
                    organization: job.company,
                    type: 'job',
                    deadline: job.deadline,
                    matchScore: job.matchScore,
                    status: job.applicationStatus || 'not_started',
                    url: job.applyUrl,
                });
            }
        });

        // Add scholarships with deadlines
        savedScholarships?.forEach(sch => {
            if (sch.deadline && !merged.find(d => d.id === sch.id)) {
                merged.push({
                    id: sch.id,
                    title: sch.name,
                    organization: sch.sponsor,
                    type: 'scholarship',
                    deadline: sch.deadline,
                    amount: sch.amount,
                    matchScore: sch.matchScore,
                    status: sch.applicationStatus || 'not_started',
                    url: sch.applyUrl,
                });
            }
        });

        return merged;
    }, [savedJobs, savedScholarships]);

    const handleDeadlineClick = (item: DeadlineItem) => {
        if (item.type === 'job') {
            router.push('/jobs');
        } else {
            router.push('/scholarships');
        }
    };

    if (jobsLoading || scholarshipsLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--primary-400)' }} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <DeadlineCalendar
                deadlines={deadlines}
                onDeadlineClick={handleDeadlineClick}
            />
        </div>
    );
}
