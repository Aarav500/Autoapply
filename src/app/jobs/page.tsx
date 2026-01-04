'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, Button, StatusBadge, Input, ProgressBar, Tag } from '@/components/ui';
import { useS3Storage } from '@/lib/useS3Storage';
import { toast } from '@/lib/error-handling';
import {
    Briefcase,
    Search,
    Filter,
    MapPin,
    Clock,
    DollarSign,
    Building2,
    Star,
    BookmarkPlus,
    Bookmark,
    ExternalLink,
    ChevronRight,
    AlertCircle,
    CheckCircle2,
    TrendingUp,
    Calendar,
    Loader2,
    Send
} from 'lucide-react';

// Job type definitions
interface Job {
    id: number;
    title: string;
    company: string;
    location: string;
    type: string;
    hours: string;
    pay: string;
    deadline: string;
    match: number;
    tags: string[];
    description: string;
    status: string;
}

interface SavedJob {
    jobId: number;
    savedAt: string;
}

interface JobApplication {
    id: string;
    jobId: number;
    title: string;
    company: string;
    status: 'applied' | 'interview' | 'offer' | 'rejected';
    appliedAt: string;
}

// Available jobs (mock data simulating Handshake API)
const availableOnCampusJobs: Job[] = [
    {
        id: 1,
        title: 'Research Assistant',
        company: 'UCR Biology Department',
        location: 'On Campus',
        type: 'Part-time',
        hours: '10-15 hrs/week',
        pay: '$17.50/hr',
        deadline: '2026-01-15',
        match: 94,
        tags: ['Research', 'Biology', 'Data Analysis'],
        description: 'Assist faculty with ongoing research projects in molecular biology.',
        status: 'open',
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
        match: 88,
        tags: ['Customer Service', 'Organization', 'Library'],
        description: 'Help library patrons, shelve books, and assist with daily operations.',
        status: 'open',
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
        match: 82,
        tags: ['IT Support', 'Technical', 'Customer Service'],
        description: 'Provide technical support to students and staff for various IT issues.',
        status: 'open',
    },
    {
        id: 4,
        title: 'Student Ambassador',
        company: 'UCR Admissions',
        location: 'On Campus',
        type: 'Part-time',
        hours: '8-12 hrs/week',
        pay: '$17.00/hr',
        deadline: '2026-01-30',
        match: 76,
        tags: ['Public Speaking', 'Campus Tours', 'Leadership'],
        description: 'Lead campus tours and represent UCR to prospective students.',
        status: 'open',
    },
    {
        id: 5,
        title: 'Tutoring Center Tutor',
        company: 'UCR Academic Resource Center',
        location: 'On Campus',
        type: 'Part-time',
        hours: '5-10 hrs/week',
        pay: '$18.50/hr',
        deadline: '2026-02-01',
        match: 91,
        tags: ['Teaching', 'Mathematics', 'Physics'],
        description: 'Tutor students in STEM subjects at the drop-in tutoring center.',
        status: 'open',
    },
];

const availableInternships: Job[] = [
    {
        id: 101,
        title: 'Software Engineering Intern',
        company: 'Google',
        location: 'Mountain View, CA',
        type: 'Summer 2026',
        hours: 'Full-time',
        pay: '$8,500/month',
        deadline: '2026-02-15',
        match: 87,
        tags: ['Software Development', 'Python', 'Machine Learning'],
        description: 'Work on core Google products with a team of engineers.',
        status: 'open',
    },
    {
        id: 102,
        title: 'Data Science Intern',
        company: 'Microsoft',
        location: 'Redmond, WA',
        type: 'Summer 2026',
        hours: 'Full-time',
        pay: '$8,000/month',
        deadline: '2026-02-20',
        match: 84,
        tags: ['Data Science', 'SQL', 'Python'],
        description: 'Analyze large datasets to drive product decisions.',
        status: 'open',
    },
    {
        id: 103,
        title: 'Product Management Intern',
        company: 'Amazon',
        location: 'Seattle, WA',
        type: 'Summer 2026',
        hours: 'Full-time',
        pay: '$7,500/month',
        deadline: '2026-02-28',
        match: 79,
        tags: ['Product', 'Strategy', 'Analytics'],
        description: 'Lead product features from conception to launch.',
        status: 'open',
    },
];

type TabType = 'on-campus' | 'internships' | 'applied';

export default function JobsPage() {
    const [activeTab, setActiveTab] = useState<TabType>('on-campus');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedJob, setSelectedJob] = useState<Job | null>(null);

    // S3 Storage for saved jobs and applications
    const {
        data: savedJobs,
        setData: setSavedJobs,
        isLoading: savedJobsLoading
    } = useS3Storage<SavedJob[]>('savedJobs', { defaultValue: [] });

    const {
        data: applications,
        setData: setApplications,
        isLoading: applicationsLoading
    } = useS3Storage<JobApplication[]>('jobApplications', { defaultValue: [] });

    const isLoading = savedJobsLoading || applicationsLoading;

    // Check if a job is saved
    const isJobSaved = (jobId: number) => savedJobs.some(s => s.jobId === jobId);

    // Check if user applied to a job
    const getApplicationStatus = (jobId: number) => applications.find(a => a.jobId === jobId);

    // Save/unsave a job
    const toggleSaveJob = (job: Job) => {
        if (isJobSaved(job.id)) {
            setSavedJobs(prev => prev.filter(s => s.jobId !== job.id));
            toast.info('Job removed from saved');
        } else {
            setSavedJobs(prev => [...prev, { jobId: job.id, savedAt: new Date().toISOString() }]);
            toast.success('Job saved!');
        }
    };

    // Apply to a job
    const applyToJob = (job: Job) => {
        if (getApplicationStatus(job.id)) {
            toast.warning('You already applied to this job');
            return;
        }

        const application: JobApplication = {
            id: Date.now().toString(),
            jobId: job.id,
            title: job.title,
            company: job.company,
            status: 'applied',
            appliedAt: new Date().toISOString(),
        };

        setApplications(prev => [...prev, application]);
        toast.success(`Applied to ${job.title}!`);
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.05 },
        },
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
    };

    const availableJobs = activeTab === 'on-campus' ? availableOnCampusJobs : activeTab === 'internships' ? availableInternships : [];
    const filteredJobs = availableJobs.filter(job =>
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    // Stats
    const stats = useMemo(() => ({
        onCampus: availableOnCampusJobs.length,
        internships: availableInternships.length,
        applied: applications.length,
        interviews: applications.filter(a => a.status === 'interview').length,
        saved: savedJobs.length,
    }), [applications, savedJobs]);

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6"
        >
            {/* Header */}
            <motion.div variants={itemVariants} className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
                        Job Opportunities
                    </h1>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        Find and apply to jobs matched to your skills
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="px-4 py-2 rounded-lg flex items-center gap-2" style={{ background: 'var(--bg-tertiary)' }}>
                        <AlertCircle className="w-4 h-4" style={{ color: 'var(--warning)' }} />
                        <span className="text-sm">On-campus only until Summer 2026</span>
                    </div>
                </div>
            </motion.div>

            {/* Stats */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(20, 184, 166, 0.15)' }}>
                        <Briefcase className="w-6 h-6" style={{ color: 'var(--accent-teal)' }} />
                    </div>
                    <div>
                        <p className="text-2xl font-bold">{stats.onCampus}</p>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>On-Campus Jobs</p>
                    </div>
                </Card>
                <Card className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(168, 85, 247, 0.15)' }}>
                        <TrendingUp className="w-6 h-6" style={{ color: 'var(--accent-purple)' }} />
                    </div>
                    <div>
                        <p className="text-2xl font-bold">{stats.internships}</p>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Summer Internships</p>
                    </div>
                </Card>
                <Card className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(34, 197, 94, 0.15)' }}>
                        <CheckCircle2 className="w-6 h-6" style={{ color: 'var(--success)' }} />
                    </div>
                    <div>
                        <p className="text-2xl font-bold">{stats.applied}</p>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Applications Sent</p>
                    </div>
                </Card>
                <Card className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(245, 158, 11, 0.15)' }}>
                        <Calendar className="w-6 h-6" style={{ color: 'var(--accent-gold)' }} />
                    </div>
                    <div>
                        <p className="text-2xl font-bold">{stats.interviews}</p>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Interviews</p>
                    </div>
                </Card>
            </motion.div>

            {/* Tabs and Search */}
            <motion.div variants={itemVariants} className="flex flex-wrap gap-4 items-center">
                <div className="flex gap-2">
                    {(['on-campus', 'internships', 'applied'] as TabType[]).map((tab) => (
                        <Button
                            key={tab}
                            variant={activeTab === tab ? 'primary' : 'secondary'}
                            onClick={() => setActiveTab(tab)}
                        >
                            {tab === 'on-campus' ? 'On-Campus Jobs' : tab === 'internships' ? 'Summer Internships' : 'My Applications'}
                        </Button>
                    ))}
                </div>
                <div className="flex-1" />
                {activeTab !== 'applied' && (
                    <Input
                        placeholder="Search jobs..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        icon={<Search className="w-4 h-4" />}
                        className="max-w-md"
                    />
                )}
            </motion.div>

            {/* Content */}
            {activeTab === 'applied' ? (
                <motion.div variants={itemVariants}>
                    <Card>
                        <h3 className="font-semibold mb-4">Application Tracker</h3>
                        {applications.length === 0 ? (
                            <div className="text-center py-12">
                                <Send className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
                                <p className="mb-2" style={{ color: 'var(--text-muted)' }}>No applications yet</p>
                                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Apply to jobs to track them here</p>
                            </div>
                        ) : (
                            <div className="table-container">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Position</th>
                                            <th>Company</th>
                                            <th>Applied Date</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {applications.map((app) => (
                                            <tr key={app.id}>
                                                <td className="font-medium">{app.title}</td>
                                                <td style={{ color: 'var(--text-secondary)' }}>{app.company}</td>
                                                <td style={{ color: 'var(--text-muted)' }}>
                                                    {new Date(app.appliedAt).toLocaleDateString()}
                                                </td>
                                                <td>
                                                    <StatusBadge
                                                        status={app.status === 'interview' ? 'success' : app.status === 'applied' ? 'info' : app.status === 'offer' ? 'success' : 'error'}
                                                    >
                                                        {app.status}
                                                    </StatusBadge>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>
                </motion.div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Job List */}
                    <motion.div variants={containerVariants} className="lg:col-span-2 space-y-4">
                        {filteredJobs.map((job) => (
                            <motion.div key={job.id} variants={itemVariants}>
                                <Card
                                    className={`cursor-pointer ${selectedJob?.id === job.id ? 'ring-2' : ''}`}
                                    onClick={() => setSelectedJob(job)}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--gradient-accent)' }}>
                                            <Building2 className="w-7 h-7 text-white" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between mb-2">
                                                <div>
                                                    <h3 className="font-semibold text-lg">{job.title}</h3>
                                                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{job.company}</p>
                                                </div>
                                                <StatusBadge status="success">{job.match}% Match</StatusBadge>
                                            </div>
                                            <div className="flex flex-wrap gap-3 text-sm mb-3" style={{ color: 'var(--text-muted)' }}>
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="w-4 h-4" /> {job.location}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-4 h-4" /> {job.hours}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <DollarSign className="w-4 h-4" /> {job.pay}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {job.tags.map((tag) => (
                                                    <Tag key={tag}>{tag}</Tag>
                                                ))}
                                            </div>
                                        </div>
                                        <ChevronRight className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                                    </div>
                                </Card>
                            </motion.div>
                        ))}

                        {filteredJobs.length === 0 && (
                            <Card className="text-center py-12">
                                <Briefcase className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
                                <h3 className="text-xl font-semibold mb-2">No jobs found</h3>
                                <p style={{ color: 'var(--text-muted)' }}>Try adjusting your search terms</p>
                            </Card>
                        )}
                    </motion.div>

                    {/* Job Details Panel */}
                    <motion.div variants={itemVariants} className="space-y-4">
                        {selectedJob ? (
                            <>
                                <Card>
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: 'var(--gradient-accent)' }}>
                                            <Building2 className="w-7 h-7 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-lg">{selectedJob.title}</h3>
                                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{selectedJob.company}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4 mb-6">
                                        <div>
                                            <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Match Score</p>
                                            <div className="flex items-center gap-3">
                                                <ProgressBar value={selectedJob.match} className="flex-1" />
                                                <span className="font-bold" style={{ color: 'var(--success)' }}>{selectedJob.match}%</span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Location</p>
                                                <p className="text-sm font-medium">{selectedJob.location}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Hours</p>
                                                <p className="text-sm font-medium">{selectedJob.hours}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Pay Rate</p>
                                                <p className="text-sm font-medium">{selectedJob.pay}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Deadline</p>
                                                <p className="text-sm font-medium">{selectedJob.deadline}</p>
                                            </div>
                                        </div>

                                        <div>
                                            <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Description</p>
                                            <p className="text-sm">{selectedJob.description}</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        {getApplicationStatus(selectedJob.id) ? (
                                            <Button className="flex-1" variant="secondary" disabled icon={<CheckCircle2 className="w-4 h-4" />}>
                                                Applied ✓
                                            </Button>
                                        ) : (
                                            <Button
                                                className="flex-1"
                                                icon={<Send className="w-4 h-4" />}
                                                onClick={() => applyToJob(selectedJob)}
                                            >
                                                Apply Now
                                            </Button>
                                        )}
                                        <Button
                                            variant="secondary"
                                            icon={isJobSaved(selectedJob.id) ? <Bookmark className="w-4 h-4" /> : <BookmarkPlus className="w-4 h-4" />}
                                            onClick={() => toggleSaveJob(selectedJob)}
                                        >
                                            {isJobSaved(selectedJob.id) ? 'Saved' : 'Save'}
                                        </Button>
                                    </div>
                                </Card>

                                <Card>
                                    <h4 className="font-semibold mb-3">Why You Match</h4>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-sm">
                                            <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--success)' }} />
                                            <span>Your resume highlights relevant skills</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--success)' }} />
                                            <span>Previous research experience</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--success)' }} />
                                            <span>Strong academic background in STEM</span>
                                        </div>
                                    </div>
                                </Card>
                            </>
                        ) : (
                            <Card className="text-center py-12">
                                <Briefcase className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                                <p style={{ color: 'var(--text-muted)' }}>Select a job to view details</p>
                            </Card>
                        )}
                    </motion.div>
                </div>
            )}
        </motion.div>
    );
}
