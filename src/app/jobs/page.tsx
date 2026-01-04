'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, Button, StatusBadge, Input, ProgressBar, Tag } from '@/components/ui';
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
    ExternalLink,
    ChevronRight,
    AlertCircle,
    CheckCircle2,
    TrendingUp,
    Calendar
} from 'lucide-react';

// Mock job data - will be fetched from Handshake
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

const internships = [
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

const appliedJobs = [
    { id: 201, title: 'Web Developer', company: 'UCR Housing', status: 'applied', date: '2025-12-15' },
    { id: 202, title: 'Research Intern', company: 'UCR Chemistry', status: 'interview', date: '2025-12-20' },
    { id: 203, title: 'Office Assistant', company: 'UCR Recreation', status: 'rejected', date: '2025-12-10' },
];

type TabType = 'on-campus' | 'internships' | 'applied';

export default function JobsPage() {
    const [activeTab, setActiveTab] = useState<TabType>('on-campus');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedJob, setSelectedJob] = useState<typeof onCampusJobs[0] | null>(null);

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

    const jobs = activeTab === 'on-campus' ? onCampusJobs : activeTab === 'internships' ? internships : [];
    const filteredJobs = jobs.filter(job =>
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    );

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
                        <p className="text-2xl font-bold">{onCampusJobs.length}</p>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>On-Campus Jobs</p>
                    </div>
                </Card>
                <Card className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(168, 85, 247, 0.15)' }}>
                        <TrendingUp className="w-6 h-6" style={{ color: 'var(--accent-purple)' }} />
                    </div>
                    <div>
                        <p className="text-2xl font-bold">{internships.length}</p>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Summer Internships</p>
                    </div>
                </Card>
                <Card className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(34, 197, 94, 0.15)' }}>
                        <CheckCircle2 className="w-6 h-6" style={{ color: 'var(--success)' }} />
                    </div>
                    <div>
                        <p className="text-2xl font-bold">{appliedJobs.length}</p>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Applications Sent</p>
                    </div>
                </Card>
                <Card className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(245, 158, 11, 0.15)' }}>
                        <Calendar className="w-6 h-6" style={{ color: 'var(--accent-gold)' }} />
                    </div>
                    <div>
                        <p className="text-2xl font-bold">1</p>
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
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Position</th>
                                        <th>Company</th>
                                        <th>Applied Date</th>
                                        <th>Status</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {appliedJobs.map((job) => (
                                        <tr key={job.id}>
                                            <td className="font-medium">{job.title}</td>
                                            <td style={{ color: 'var(--text-secondary)' }}>{job.company}</td>
                                            <td style={{ color: 'var(--text-muted)' }}>{job.date}</td>
                                            <td>
                                                <StatusBadge
                                                    status={job.status === 'interview' ? 'success' : job.status === 'applied' ? 'info' : 'error'}
                                                >
                                                    {job.status}
                                                </StatusBadge>
                                            </td>
                                            <td>
                                                <Button size="sm" variant="ghost">View</Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
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
                                        <Button className="flex-1" icon={<ExternalLink className="w-4 h-4" />}>
                                            Apply Now
                                        </Button>
                                        <Button variant="secondary" icon={<BookmarkPlus className="w-4 h-4" />}>
                                            Save
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
