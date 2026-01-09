'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Button, StatusBadge, Input, ProgressBar, Tag } from '@/components/ui';
import { useS3Storage } from '@/lib/useS3Storage';
import { toast } from '@/lib/error-handling';
import {
    Briefcase, Search, Filter, MapPin, Clock, DollarSign, Building2,
    Star, BookmarkPlus, Bookmark, ExternalLink, ChevronRight, ChevronDown,
    AlertCircle, CheckCircle2, TrendingUp, Calendar, Loader2, Send,
    FileText, Download, Copy, Check, RefreshCw, Sparkles, Globe, Laptop,
    Building, X, Eye, Zap
} from 'lucide-react';
import { runDiscoveryScan } from '@/app/actions/discovery';

// ============================================
// TYPES
// ============================================

type ApplicationStatus = 'not_started' | 'docs_generated' | 'applied' | 'interview' | 'rejected' | 'offer';
type LocationType = 'remote' | 'hybrid' | 'onsite';
type EmploymentType = 'internship' | 'full-time' | 'part-time' | 'contract';

interface EnhancedJob {
    id: string;
    title: string;
    company: string;
    companyLogo?: string;
    locations: string[];
    remoteType: LocationType;
    employmentType: EmploymentType;
    salary?: { min: number; max: number; currency: string; period: string };
    postedDate: string;
    deadline?: string;
    description: string;
    requiredSkills: string[];
    preferredSkills: string[];
    qualifications: string[];
    responsibilities: string[];
    sponsorsVisa: boolean;
    applyUrl: string;
    sourceUrl: string;
    sourceName: string;
    matchScore: number;
    matchExplanation: string[];
    applicationStatus: ApplicationStatus;
    saved: boolean;
    hidden: boolean;
    requiredDocuments: string[];
    generatedDocuments?: { cv?: string; coverLetter?: string };
}

interface JobFilters {
    query: string;
    remoteTypes: LocationType[];
    employmentTypes: EmploymentType[];
    minSalary?: number;
    sponsorsVisa?: boolean;
    postedWithin?: number;
    minMatchScore?: number;
}

type SortOption = 'match' | 'newest' | 'salary' | 'deadline';
type TabType = 'discover' | 'saved' | 'applied';

// ============================================
// SAMPLE DATA (will be replaced by scrapers)
// ============================================

const sampleJobs: EnhancedJob[] = [
    {
        id: 'job-google-swe-intern',
        title: 'Software Engineering Intern',
        company: 'Google',
        companyLogo: 'https://logo.clearbit.com/google.com',
        locations: ['Mountain View, CA', 'New York, NY'],
        remoteType: 'hybrid',
        employmentType: 'internship',
        salary: { min: 8000, max: 10000, currency: 'USD', period: 'monthly' },
        postedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Build next-generation technologies that impact billions of users. Join our team to work on cutting-edge projects.',
        requiredSkills: ['Python', 'JavaScript', 'Data Structures', 'Algorithms'],
        preferredSkills: ['React', 'TypeScript', 'Machine Learning'],
        qualifications: ['Pursuing BS/MS in Computer Science', 'Strong problem-solving skills'],
        responsibilities: ['Design and implement software features', 'Collaborate with cross-functional teams', 'Write clean, maintainable code'],
        sponsorsVisa: true,
        applyUrl: 'https://careers.google.com/jobs/results/',
        sourceUrl: 'https://careers.google.com',
        sourceName: 'Google Careers',
        matchScore: 92,
        matchExplanation: ['✓ Skills match: Python, JavaScript, React', '✓ Strong GPA: 3.9', '✓ Sponsors work visas', '✓ Posted recently (5 days ago)'],
        applicationStatus: 'not_started',
        saved: false,
        hidden: false,
        requiredDocuments: ['resume', 'cover_letter'],
    },
    {
        id: 'job-meta-swe-intern',
        title: 'Software Engineer Intern',
        company: 'Meta',
        companyLogo: 'https://logo.clearbit.com/meta.com',
        locations: ['Menlo Park, CA'],
        remoteType: 'hybrid',
        employmentType: 'internship',
        salary: { min: 8500, max: 9500, currency: 'USD', period: 'monthly' },
        postedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Join Meta to build products that bring the world closer together. Work on the metaverse and social platforms.',
        requiredSkills: ['Python', 'C++', 'Data Structures'],
        preferredSkills: ['React', 'GraphQL', 'Mobile Development'],
        qualifications: ['Currently enrolled in BS/MS/PhD in CS or related field'],
        responsibilities: ['Build new features for Meta products', 'Optimize existing systems', 'Participate in code reviews'],
        sponsorsVisa: true,
        applyUrl: 'https://www.metacareers.com/jobs/',
        sourceUrl: 'https://www.metacareers.com',
        sourceName: 'Meta Careers',
        matchScore: 88,
        matchExplanation: ['✓ Skills match: Python, React', '✓ Entry-level position', '✓ Sponsors work visas'],
        applicationStatus: 'not_started',
        saved: false,
        hidden: false,
        requiredDocuments: ['resume'],
    },
    {
        id: 'job-amazon-sde-intern',
        title: 'SDE Intern',
        company: 'Amazon',
        companyLogo: 'https://logo.clearbit.com/amazon.com',
        locations: ['Seattle, WA', 'Austin, TX'],
        remoteType: 'onsite',
        employmentType: 'internship',
        salary: { min: 7500, max: 8500, currency: 'USD', period: 'monthly' },
        postedDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Build and innovate at Amazon. Work on products used by millions worldwide.',
        requiredSkills: ['Java', 'Python', 'AWS', 'Distributed Systems'],
        preferredSkills: ['Docker', 'Kubernetes'],
        qualifications: ['Enrolled in CS or related degree program'],
        responsibilities: ['Design scalable solutions', 'Work with AWS services', 'Ship features to production'],
        sponsorsVisa: true,
        applyUrl: 'https://www.amazon.jobs/',
        sourceUrl: 'https://www.amazon.jobs',
        sourceName: 'Amazon Jobs',
        matchScore: 85,
        matchExplanation: ['✓ Skills match: Python, AWS', '✓ Strong GPA', '✓ Remote available'],
        applicationStatus: 'not_started',
        saved: false,
        hidden: false,
        requiredDocuments: ['resume', 'cover_letter'],
    },
    {
        id: 'job-microsoft-swe-intern',
        title: 'Software Engineering Intern',
        company: 'Microsoft',
        companyLogo: 'https://logo.clearbit.com/microsoft.com',
        locations: ['Redmond, WA'],
        remoteType: 'hybrid',
        employmentType: 'internship',
        salary: { min: 8000, max: 9000, currency: 'USD', period: 'monthly' },
        postedDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Empower every person and organization on the planet to achieve more.',
        requiredSkills: ['C#', 'TypeScript', 'Azure'],
        preferredSkills: ['React', '.NET', 'Cloud Computing'],
        qualifications: ['Pursuing degree in CS, CE, or related field'],
        responsibilities: ['Develop features for Microsoft products', 'Collaborate with PMs and designers'],
        sponsorsVisa: true,
        applyUrl: 'https://careers.microsoft.com/',
        sourceUrl: 'https://careers.microsoft.com',
        sourceName: 'Microsoft Careers',
        matchScore: 82,
        matchExplanation: ['✓ Skills match: TypeScript, React', '✓ Entry-level position', '✓ Sponsors visas'],
        applicationStatus: 'not_started',
        saved: false,
        hidden: false,
        requiredDocuments: ['resume'],
    },
    {
        id: 'job-netflix-swe-intern',
        title: 'Software Engineer Intern',
        company: 'Netflix',
        companyLogo: 'https://logo.clearbit.com/netflix.com',
        locations: ['Los Gatos, CA'],
        remoteType: 'remote',
        employmentType: 'internship',
        salary: { min: 9000, max: 11000, currency: 'USD', period: 'monthly' },
        postedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Join Netflix to build the future of entertainment. Work on streaming technology.',
        requiredSkills: ['Java', 'Python', 'Microservices'],
        preferredSkills: ['Machine Learning', 'Data Engineering'],
        qualifications: ['Currently pursuing CS degree'],
        responsibilities: ['Build scalable streaming systems', 'Optimize content delivery'],
        sponsorsVisa: false,
        applyUrl: 'https://jobs.netflix.com/',
        sourceUrl: 'https://jobs.netflix.com',
        sourceName: 'Netflix Jobs',
        matchScore: 78,
        matchExplanation: ['✓ Skills match: Python', '✓ Remote work available', '⚠ Does not sponsor visas'],
        applicationStatus: 'not_started',
        saved: false,
        hidden: false,
        requiredDocuments: ['resume', 'cover_letter'],
    },
];

// ============================================
// MAIN COMPONENT
// ============================================

export default function EnhancedJobsPage() {
    const [activeTab, setActiveTab] = useState<TabType>('discover');
    const [selectedJob, setSelectedJob] = useState<EnhancedJob | null>(null);
    const [showFilters, setShowFilters] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [isGeneratingDocs, setIsGeneratingDocs] = useState(false);
    const [copied, setCopied] = useState<string | null>(null);

    // Filters
    const [filters, setFilters] = useState<JobFilters>({
        query: '',
        remoteTypes: [],
        employmentTypes: [],
    });
    const [sortBy, setSortBy] = useState<SortOption>('match');

    // S3 Storage for persistence
    const { data: jobs, setData: setJobs, isLoading: jobsLoading } =
        useS3Storage<EnhancedJob[]>('enhanced-jobs', { defaultValue: sampleJobs });

    const { data: savedJobIds, setData: setSavedJobIds } =
        useS3Storage<string[]>('saved-job-ids', { defaultValue: [] });

    const { data: appliedJobIds, setData: setAppliedJobIds } =
        useS3Storage<string[]>('applied-job-ids', { defaultValue: [] });

    // Scan for new jobs
    const handleScan = async () => {
        setIsScanning(true);
        toast.info('🔍 Scanning job platforms...');
        try {
            const result = await runDiscoveryScan('jobs');
            if (result.success) {
                toast.success('✅ Scan complete! Found new opportunities.');
                // In production, this would fetch from the opportunity store
            }
        } catch (error) {
            toast.error('Scan failed');
        } finally {
            setIsScanning(false);
        }
    };

    // Generate documents for a job
    const handleGenerateDocuments = async (job: EnhancedJob) => {
        setIsGeneratingDocs(true);
        toast.info(`📝 Generating documents for ${job.title}...`);

        try {
            // Simulate document generation (would call real API)
            await new Promise(r => setTimeout(r, 2000));

            // Update job with generated documents
            setJobs(prev => prev.map(j =>
                j.id === job.id
                    ? {
                        ...j,
                        applicationStatus: 'docs_generated',
                        generatedDocuments: {
                            cv: `Generated CV for ${job.title}`,
                            coverLetter: `Generated cover letter for ${job.company}`,
                        }
                    }
                    : j
            ));

            toast.success('✅ Documents generated! Ready to apply.');
        } catch (error) {
            toast.error('Document generation failed');
        } finally {
            setIsGeneratingDocs(false);
        }
    };

    // Save/unsave job
    const toggleSaveJob = (job: EnhancedJob) => {
        if (savedJobIds.includes(job.id)) {
            setSavedJobIds(prev => prev.filter(id => id !== job.id));
            toast.info('Removed from saved');
        } else {
            setSavedJobIds(prev => [...prev, job.id]);
            toast.success('💾 Saved!');
        }
    };

    // Mark as applied
    const markAsApplied = (job: EnhancedJob) => {
        setJobs(prev => prev.map(j =>
            j.id === job.id ? { ...j, applicationStatus: 'applied' } : j
        ));
        if (!appliedJobIds.includes(job.id)) {
            setAppliedJobIds(prev => [...prev, job.id]);
        }
        toast.success('🎉 Marked as applied!');
    };

    // Copy document to clipboard
    const copyDocument = async (content: string, type: string) => {
        await navigator.clipboard.writeText(content);
        setCopied(type);
        toast.success('Copied to clipboard!');
        setTimeout(() => setCopied(null), 2000);
    };

    // Apply filters and sort
    const filteredJobs = useMemo(() => {
        let result = [...jobs];

        // Filter by tab
        if (activeTab === 'saved') {
            result = result.filter(j => savedJobIds.includes(j.id));
        } else if (activeTab === 'applied') {
            result = result.filter(j => appliedJobIds.includes(j.id));
        } else {
            result = result.filter(j => !j.hidden);
        }

        // Search query
        if (filters.query) {
            const q = filters.query.toLowerCase();
            result = result.filter(j =>
                j.title.toLowerCase().includes(q) ||
                j.company.toLowerCase().includes(q) ||
                j.requiredSkills.some(s => s.toLowerCase().includes(q))
            );
        }

        // Remote type filter
        if (filters.remoteTypes.length > 0) {
            result = result.filter(j => filters.remoteTypes.includes(j.remoteType));
        }

        // Employment type filter
        if (filters.employmentTypes.length > 0) {
            result = result.filter(j => filters.employmentTypes.includes(j.employmentType));
        }

        // Visa sponsorship
        if (filters.sponsorsVisa) {
            result = result.filter(j => j.sponsorsVisa);
        }

        // Minimum match score
        if (filters.minMatchScore) {
            result = result.filter(j => j.matchScore >= filters.minMatchScore!);
        }

        // Sort
        switch (sortBy) {
            case 'match':
                result.sort((a, b) => b.matchScore - a.matchScore);
                break;
            case 'newest':
                result.sort((a, b) => new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime());
                break;
            case 'salary':
                result.sort((a, b) => (b.salary?.max || 0) - (a.salary?.max || 0));
                break;
            case 'deadline':
                result.sort((a, b) => {
                    if (!a.deadline) return 1;
                    if (!b.deadline) return -1;
                    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
                });
                break;
        }

        return result;
    }, [jobs, filters, sortBy, activeTab, savedJobIds, appliedJobIds]);

    // Stats
    const stats = useMemo(() => ({
        total: jobs.filter(j => !j.hidden).length,
        highMatch: jobs.filter(j => j.matchScore >= 80).length,
        saved: savedJobIds.length,
        applied: appliedJobIds.length,
        docsGenerated: jobs.filter(j => j.applicationStatus === 'docs_generated').length,
    }), [jobs, savedJobIds, appliedJobIds]);

    // Format helpers
    const formatSalary = (salary?: EnhancedJob['salary']) => {
        if (!salary) return null;
        return `$${salary.min.toLocaleString()}-$${salary.max.toLocaleString()}/${salary.period.replace('ly', '')}`;
    };

    const formatDate = (date: string) => {
        const d = new Date(date);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        return d.toLocaleDateString();
    };

    const getLocationIcon = (type: LocationType) => {
        switch (type) {
            case 'remote': return <Globe className="w-4 h-4" />;
            case 'hybrid': return <Laptop className="w-4 h-4" />;
            case 'onsite': return <Building className="w-4 h-4" />;
        }
    };

    const getStatusColor = (status: ApplicationStatus) => {
        switch (status) {
            case 'not_started': return 'var(--text-muted)';
            case 'docs_generated': return 'var(--warning)';
            case 'applied': return 'var(--primary-400)';
            case 'interview': return 'var(--success)';
            case 'offer': return 'var(--success)';
            case 'rejected': return 'var(--error)';
        }
    };

    if (jobsLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--primary-400)' }} />
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
        >
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3" style={{ fontFamily: 'var(--font-display)' }}>
                        <Briefcase className="w-8 h-8" style={{ color: 'var(--primary-400)' }} />
                        Job Opportunities
                    </h1>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        {stats.total} jobs · {stats.highMatch} high matches · Real-time scraping from 10+ sources
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="secondary"
                        onClick={handleScan}
                        disabled={isScanning}
                        icon={isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    >
                        {isScanning ? 'Scanning...' : 'Scan New Jobs'}
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={() => setShowFilters(!showFilters)}
                        icon={<Filter className="w-4 h-4" />}
                    >
                        Filters
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-5 gap-4">
                <Card className="text-center" style={{ background: 'rgba(91, 111, 242, 0.1)' }}>
                    <Briefcase className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--primary-400)' }} />
                    <p className="text-2xl font-bold">{stats.total}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Available</p>
                </Card>
                <Card className="text-center" style={{ background: 'rgba(34, 197, 94, 0.1)' }}>
                    <TrendingUp className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--success)' }} />
                    <p className="text-2xl font-bold">{stats.highMatch}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>High Match (80%+)</p>
                </Card>
                <Card className="text-center">
                    <Bookmark className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--warning)' }} />
                    <p className="text-2xl font-bold">{stats.saved}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Saved</p>
                </Card>
                <Card className="text-center" style={{ background: 'rgba(168, 85, 247, 0.1)' }}>
                    <FileText className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--accent-purple)' }} />
                    <p className="text-2xl font-bold">{stats.docsGenerated}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Docs Ready</p>
                </Card>
                <Card className="text-center" style={{ background: 'rgba(20, 184, 166, 0.1)' }}>
                    <Send className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--accent-teal)' }} />
                    <p className="text-2xl font-bold">{stats.applied}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Applied</p>
                </Card>
            </div>

            {/* Tabs & Search */}
            <div className="flex flex-wrap gap-4 items-center">
                <div className="flex gap-2">
                    {(['discover', 'saved', 'applied'] as TabType[]).map((tab) => (
                        <Button
                            key={tab}
                            variant={activeTab === tab ? 'primary' : 'secondary'}
                            onClick={() => setActiveTab(tab)}
                        >
                            {tab === 'discover' ? '🔍 Discover' : tab === 'saved' ? '💾 Saved' : '📤 Applied'}
                        </Button>
                    ))}
                </div>
                <div className="flex-1" />
                <Input
                    placeholder="Search jobs, companies, skills..."
                    value={filters.query}
                    onChange={(e) => setFilters(prev => ({ ...prev, query: e.target.value }))}
                    icon={<Search className="w-4 h-4" />}
                    className="max-w-md"
                />
                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="px-4 py-2 rounded-lg"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                >
                    <option value="match">Sort: Match Score</option>
                    <option value="newest">Sort: Newest</option>
                    <option value="salary">Sort: Salary</option>
                    <option value="deadline">Sort: Deadline</option>
                </select>
            </div>

            {/* Filters Panel */}
            <AnimatePresence>
                {showFilters && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                    >
                        <Card>
                            <div className="flex flex-wrap gap-6">
                                <div>
                                    <p className="text-sm font-medium mb-2">Location Type</p>
                                    <div className="flex gap-2">
                                        {(['remote', 'hybrid', 'onsite'] as LocationType[]).map(type => (
                                            <button
                                                key={type}
                                                onClick={() => setFilters(prev => ({
                                                    ...prev,
                                                    remoteTypes: prev.remoteTypes.includes(type)
                                                        ? prev.remoteTypes.filter(t => t !== type)
                                                        : [...prev.remoteTypes, type]
                                                }))}
                                                className={`px-3 py-1 rounded-lg text-sm capitalize ${filters.remoteTypes.includes(type) ? 'ring-2' : ''
                                                    }`}
                                                style={{ background: 'var(--bg-secondary)' }}
                                            >
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-sm font-medium mb-2">Job Type</p>
                                    <div className="flex gap-2">
                                        {(['internship', 'full-time', 'part-time'] as EmploymentType[]).map(type => (
                                            <button
                                                key={type}
                                                onClick={() => setFilters(prev => ({
                                                    ...prev,
                                                    employmentTypes: prev.employmentTypes.includes(type)
                                                        ? prev.employmentTypes.filter(t => t !== type)
                                                        : [...prev.employmentTypes, type]
                                                }))}
                                                className={`px-3 py-1 rounded-lg text-sm capitalize ${filters.employmentTypes.includes(type) ? 'ring-2' : ''
                                                    }`}
                                                style={{ background: 'var(--bg-secondary)' }}
                                            >
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-sm font-medium mb-2">Visa Sponsorship</p>
                                    <button
                                        onClick={() => setFilters(prev => ({
                                            ...prev,
                                            sponsorsVisa: !prev.sponsorsVisa
                                        }))}
                                        className={`px-3 py-1 rounded-lg text-sm ${filters.sponsorsVisa ? 'ring-2' : ''
                                            }`}
                                        style={{ background: 'var(--bg-secondary)' }}
                                    >
                                        🛂 Sponsors Visa
                                    </button>
                                </div>
                                <div>
                                    <p className="text-sm font-medium mb-2">Min Match Score</p>
                                    <select
                                        value={filters.minMatchScore || ''}
                                        onChange={(e) => setFilters(prev => ({
                                            ...prev,
                                            minMatchScore: e.target.value ? parseInt(e.target.value) : undefined
                                        }))}
                                        className="px-3 py-1 rounded-lg text-sm"
                                        style={{ background: 'var(--bg-secondary)' }}
                                    >
                                        <option value="">Any</option>
                                        <option value="70">70%+</option>
                                        <option value="80">80%+</option>
                                        <option value="90">90%+</option>
                                    </select>
                                </div>
                            </div>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Job List */}
                <div className="lg:col-span-2 space-y-4">
                    <AnimatePresence>
                        {filteredJobs.map((job, index) => (
                            <motion.div
                                key={job.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ delay: index * 0.03 }}
                            >
                                <Card
                                    className={`cursor-pointer transition-all hover:shadow-lg ${selectedJob?.id === job.id ? 'ring-2' : ''
                                        }`}
                                    style={{
                                        borderLeft: `4px solid ${job.matchScore >= 80 ? 'var(--success)' : 'var(--primary-400)'}`
                                    }}
                                    onClick={() => setSelectedJob(job)}
                                >
                                    <div className="flex items-start gap-4">
                                        {/* Company Logo */}
                                        <div
                                            className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
                                            style={{ background: 'var(--bg-secondary)' }}
                                        >
                                            {job.companyLogo ? (
                                                <img
                                                    src={job.companyLogo}
                                                    alt={job.company}
                                                    className="w-10 h-10 object-contain"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).style.display = 'none';
                                                    }}
                                                />
                                            ) : (
                                                <Building2 className="w-7 h-7" style={{ color: 'var(--text-muted)' }} />
                                            )}
                                        </div>

                                        {/* Job Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between mb-2">
                                                <div>
                                                    <h3 className="font-semibold text-lg">{job.title}</h3>
                                                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                                        {job.company}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <StatusBadge
                                                        status={job.matchScore >= 80 ? 'success' : 'info'}
                                                    >
                                                        {job.matchScore}% Match
                                                    </StatusBadge>
                                                </div>
                                            </div>

                                            {/* Meta Info */}
                                            <div className="flex flex-wrap gap-3 text-sm mb-3" style={{ color: 'var(--text-muted)' }}>
                                                <span className="flex items-center gap-1">
                                                    {getLocationIcon(job.remoteType)}
                                                    {job.locations[0]}
                                                    {job.locations.length > 1 && ` +${job.locations.length - 1}`}
                                                </span>
                                                {job.salary && (
                                                    <span className="flex items-center gap-1">
                                                        <DollarSign className="w-4 h-4" />
                                                        {formatSalary(job.salary)}
                                                    </span>
                                                )}
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-4 h-4" />
                                                    {formatDate(job.postedDate)}
                                                </span>
                                                {job.sponsorsVisa && (
                                                    <span className="flex items-center gap-1 text-green-500">
                                                        ✓ Visa Sponsor
                                                    </span>
                                                )}
                                            </div>

                                            {/* Skills */}
                                            <div className="flex flex-wrap gap-2">
                                                {job.requiredSkills.slice(0, 4).map(skill => (
                                                    <Tag key={skill}>{skill}</Tag>
                                                ))}
                                                {job.requiredSkills.length > 4 && (
                                                    <Tag>+{job.requiredSkills.length - 4}</Tag>
                                                )}
                                            </div>

                                            {/* Status indicator */}
                                            {job.applicationStatus !== 'not_started' && (
                                                <div
                                                    className="mt-2 text-xs font-medium"
                                                    style={{ color: getStatusColor(job.applicationStatus) }}
                                                >
                                                    {job.applicationStatus === 'docs_generated' && '📄 Documents ready'}
                                                    {job.applicationStatus === 'applied' && '✅ Applied'}
                                                    {job.applicationStatus === 'interview' && '🎯 Interview scheduled'}
                                                </div>
                                            )}
                                        </div>

                                        <ChevronRight className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                                    </div>
                                </Card>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {filteredJobs.length === 0 && (
                        <Card className="text-center py-12">
                            <Briefcase className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
                            <h3 className="text-xl font-semibold mb-2">No jobs found</h3>
                            <p style={{ color: 'var(--text-muted)' }}>
                                Try adjusting your filters or scan for new opportunities
                            </p>
                        </Card>
                    )}
                </div>

                {/* Job Details Panel */}
                <div className="space-y-4">
                    {selectedJob ? (
                        <>
                            <Card>
                                <div className="flex items-start gap-3 mb-4">
                                    <div
                                        className="w-14 h-14 rounded-xl flex items-center justify-center overflow-hidden"
                                        style={{ background: 'var(--bg-secondary)' }}
                                    >
                                        {selectedJob.companyLogo ? (
                                            <img
                                                src={selectedJob.companyLogo}
                                                alt={selectedJob.company}
                                                className="w-10 h-10 object-contain"
                                            />
                                        ) : (
                                            <Building2 className="w-7 h-7" style={{ color: 'var(--text-muted)' }} />
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-lg">{selectedJob.title}</h3>
                                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                            {selectedJob.company}
                                        </p>
                                    </div>
                                </div>

                                {/* Match Score */}
                                <div className="mb-4">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-medium">Match Score</span>
                                        <span className="font-bold" style={{
                                            color: selectedJob.matchScore >= 80 ? 'var(--success)' : 'var(--primary-400)'
                                        }}>
                                            {selectedJob.matchScore}%
                                        </span>
                                    </div>
                                    <ProgressBar value={selectedJob.matchScore} />
                                </div>

                                {/* Quick Info */}
                                <div className="grid grid-cols-2 gap-3 mb-4">
                                    <div className="p-2 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Location</p>
                                        <p className="text-sm font-medium">{selectedJob.locations[0]}</p>
                                    </div>
                                    <div className="p-2 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Type</p>
                                        <p className="text-sm font-medium capitalize">{selectedJob.employmentType}</p>
                                    </div>
                                    {selectedJob.salary && (
                                        <div className="p-2 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Salary</p>
                                            <p className="text-sm font-medium">{formatSalary(selectedJob.salary)}</p>
                                        </div>
                                    )}
                                    {selectedJob.deadline && (
                                        <div className="p-2 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Deadline</p>
                                            <p className="text-sm font-medium">
                                                {new Date(selectedJob.deadline).toLocaleDateString()}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Description */}
                                <div className="mb-4">
                                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                        {selectedJob.description}
                                    </p>
                                </div>

                                {/* Required Documents */}
                                <div className="mb-4">
                                    <p className="text-sm font-medium mb-2">Required Documents</p>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedJob.requiredDocuments.map(doc => (
                                            <span
                                                key={doc}
                                                className="px-2 py-1 rounded-lg text-xs capitalize"
                                                style={{ background: 'var(--bg-secondary)' }}
                                            >
                                                {doc.replace('_', ' ')}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex flex-col gap-2">
                                    {selectedJob.applicationStatus === 'not_started' && (
                                        <Button
                                            onClick={() => handleGenerateDocuments(selectedJob)}
                                            disabled={isGeneratingDocs}
                                            icon={isGeneratingDocs
                                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                                : <Zap className="w-4 h-4" />
                                            }
                                        >
                                            {isGeneratingDocs ? 'Generating...' : 'Generate Documents'}
                                        </Button>
                                    )}

                                    {selectedJob.applicationStatus === 'docs_generated' && (
                                        <>
                                            <Button
                                                onClick={() => window.open(selectedJob.applyUrl, '_blank')}
                                                icon={<ExternalLink className="w-4 h-4" />}
                                            >
                                                Open Apply Link
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                onClick={() => markAsApplied(selectedJob)}
                                                icon={<Check className="w-4 h-4" />}
                                            >
                                                Mark as Applied
                                            </Button>
                                        </>
                                    )}

                                    {selectedJob.applicationStatus === 'applied' && (
                                        <Button variant="secondary" disabled icon={<CheckCircle2 className="w-4 h-4" />}>
                                            Applied ✓
                                        </Button>
                                    )}

                                    <div className="flex gap-2">
                                        <Button
                                            variant="secondary"
                                            className="flex-1"
                                            onClick={() => toggleSaveJob(selectedJob)}
                                            icon={savedJobIds.includes(selectedJob.id)
                                                ? <Bookmark className="w-4 h-4 fill-current" />
                                                : <BookmarkPlus className="w-4 h-4" />
                                            }
                                        >
                                            {savedJobIds.includes(selectedJob.id) ? 'Saved' : 'Save'}
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            onClick={() => window.open(selectedJob.applyUrl, '_blank')}
                                            icon={<ExternalLink className="w-4 h-4" />}
                                        >
                                            View
                                        </Button>
                                    </div>
                                </div>
                            </Card>

                            {/* Why You Match */}
                            <Card>
                                <h4 className="font-semibold mb-3">Why You Match</h4>
                                <div className="space-y-2">
                                    {selectedJob.matchExplanation.map((reason, i) => (
                                        <div key={i} className="flex items-start gap-2 text-sm">
                                            <span>{reason}</span>
                                        </div>
                                    ))}
                                </div>
                            </Card>

                            {/* Generated Documents */}
                            {selectedJob.generatedDocuments && (
                                <Card>
                                    <h4 className="font-semibold mb-3">Generated Documents</h4>
                                    <div className="space-y-2">
                                        {selectedJob.generatedDocuments.cv && (
                                            <div className="flex items-center justify-between p-2 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                                                <span className="text-sm flex items-center gap-2">
                                                    <FileText className="w-4 h-4" />
                                                    Tailored CV
                                                </span>
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={() => copyDocument(selectedJob.generatedDocuments!.cv!, 'cv')}
                                                        className="p-1 hover:bg-white/10 rounded"
                                                    >
                                                        {copied === 'cv' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                                    </button>
                                                    <button className="p-1 hover:bg-white/10 rounded">
                                                        <Download className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                        {selectedJob.generatedDocuments.coverLetter && (
                                            <div className="flex items-center justify-between p-2 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                                                <span className="text-sm flex items-center gap-2">
                                                    <FileText className="w-4 h-4" />
                                                    Cover Letter
                                                </span>
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={() => copyDocument(selectedJob.generatedDocuments!.coverLetter!, 'cover')}
                                                        className="p-1 hover:bg-white/10 rounded"
                                                    >
                                                        {copied === 'cover' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                                    </button>
                                                    <button className="p-1 hover:bg-white/10 rounded">
                                                        <Download className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </Card>
                            )}
                        </>
                    ) : (
                        <Card className="text-center py-12">
                            <Eye className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                            <p style={{ color: 'var(--text-muted)' }}>Select a job to view details</p>
                        </Card>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
