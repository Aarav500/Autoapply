'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Button, StatusBadge, ProgressBar } from '@/components/ui';
import {
    Briefcase, Search, Filter, MapPin, DollarSign, Building2,
    ExternalLink, Heart, Check, Clock, Sparkles, Zap, RefreshCw,
    ChevronDown, Star, Globe, GraduationCap, Play, Pause, Settings,
    Bookmark, Send, Target, TrendingUp, AlertTriangle, X
} from 'lucide-react';
import {
    Job, JobPlatform, SearchFilters, jobPlatforms, PlatformConfig
} from '@/lib/job-platforms';
import {
    aggregateJobs, calculateJobMatch, MatchResult, defaultProfile, UserProfile
} from '@/lib/job-matcher';
import { toast } from '@/lib/error-handling';

// Platform icons and colors
const platformInfo: Record<JobPlatform, { icon: string; color: string; name: string }> = {
    handshake: { icon: '🎓', color: '#FF7043', name: 'Handshake' },
    linkedin: { icon: '💼', color: '#0077B5', name: 'LinkedIn' },
    indeed: { icon: '📋', color: '#2164F3', name: 'Indeed' },
    glassdoor: { icon: '🏢', color: '#0CAA41', name: 'Glassdoor' },
    google_jobs: { icon: '🔍', color: '#4285F4', name: 'Google Jobs' },
    company_direct: { icon: '🏗️', color: '#6B7280', name: 'Company' },
    greenhouse: { icon: '🌱', color: '#3AB06E', name: 'Greenhouse' },
    lever: { icon: '⚡', color: '#6366F1', name: 'Lever' },
    workday: { icon: '☀️', color: '#F59E0B', name: 'Workday' },
};

export default function JobHubPage() {
    const [jobs, setJobs] = useState<MatchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isAutoSearching, setIsAutoSearching] = useState(false);
    const [selectedJob, setSelectedJob] = useState<MatchResult | null>(null);
    const [savedJobs, setSavedJobs] = useState<Set<string>>(new Set());
    const [appliedJobs, setAppliedJobs] = useState<Set<string>>(new Set());
    const [showFilters, setShowFilters] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    // Search filters
    const [filters, setFilters] = useState<SearchFilters>({
        query: 'software engineer intern',
        location: '',
        remote: false,
        jobType: ['internship'],
        sponsorsVisa: true,
        postedWithin: 30,
    });

    // Platform configuration
    const [platformConfig, setPlatformConfig] = useState<Record<JobPlatform, PlatformConfig>>({
        handshake: { enabled: true, rateLimit: 10 },
        linkedin: { enabled: true, rateLimit: 10 },
        indeed: { enabled: true, rateLimit: 10 },
        glassdoor: { enabled: false, rateLimit: 5 },
        google_jobs: { enabled: true, rateLimit: 20 },
        company_direct: { enabled: true, rateLimit: 10 },
        greenhouse: { enabled: false, rateLimit: 10 },
        lever: { enabled: false, rateLimit: 10 },
        workday: { enabled: false, rateLimit: 10 },
    });

    // User profile (would come from settings)
    const [profile] = useState<UserProfile>(defaultProfile);

    // Search jobs
    const searchJobs = useCallback(async () => {
        setIsLoading(true);
        toast.info('🔍 Searching across all platforms...');

        try {
            const results = await aggregateJobs(filters, profile, {
                platforms: platformConfig,
                maxJobsPerPlatform: 20,
                deduplicateByTitle: true,
                sortBy: 'matchScore',
            });

            setJobs(results);
            toast.success(`✅ Found ${results.length} jobs matching your profile!`);
        } catch (error) {
            toast.error('Failed to search jobs');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, [filters, profile, platformConfig]);

    // Auto-search loop
    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (isAutoSearching) {
            // Initial search
            searchJobs();
            // Then every 30 minutes
            interval = setInterval(searchJobs, 30 * 60 * 1000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isAutoSearching, searchJobs]);

    // Toggle save job
    const toggleSaveJob = (jobId: string) => {
        setSavedJobs(prev => {
            const newSet = new Set(prev);
            if (newSet.has(jobId)) {
                newSet.delete(jobId);
                toast.info('Removed from saved');
            } else {
                newSet.add(jobId);
                toast.success('💾 Saved to your list');
            }
            return newSet;
        });
    };

    // Apply to job
    const applyToJob = async (job: Job) => {
        toast.info(`📝 Preparing application for ${job.company}...`);
        // In production, this would trigger the auto-apply flow
        await new Promise(r => setTimeout(r, 1500));
        setAppliedJobs(prev => new Set(prev).add(job.id));
        toast.success(`✅ Application submitted to ${job.company}!`);
    };

    // Stats
    const stats = useMemo(() => ({
        total: jobs.length,
        highMatch: jobs.filter(j => j.score >= 80).length,
        sponsorsVisa: jobs.filter(j => j.job.sponsorsVisa).length,
        saved: savedJobs.size,
        applied: appliedJobs.size,
    }), [jobs, savedJobs, appliedJobs]);

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
                        Job Hub
                    </h1>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        AI-powered job search across Handshake, LinkedIn, Indeed & more
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        variant="secondary"
                        size="sm"
                        icon={<Settings className="w-4 h-4" />}
                        onClick={() => setShowSettings(!showSettings)}
                    >
                        Platforms
                    </Button>

                    {isAutoSearching ? (
                        <Button
                            variant="secondary"
                            size="lg"
                            icon={<Pause className="w-4 h-4" />}
                            onClick={() => setIsAutoSearching(false)}
                        >
                            Stop Auto-Search
                        </Button>
                    ) : (
                        <Button
                            size="lg"
                            icon={<Zap className="w-4 h-4" />}
                            onClick={() => setIsAutoSearching(true)}
                        >
                            Auto-Search All
                        </Button>
                    )}
                </div>
            </div>

            {/* Platform Settings */}
            <AnimatePresence>
                {showSettings && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                    >
                        <Card>
                            <h3 className="font-semibold mb-4 flex items-center gap-2">
                                <Globe className="w-5 h-5" />
                                Job Platforms
                            </h3>
                            <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                                {Object.entries(platformConfig).map(([platform, config]) => {
                                    const info = platformInfo[platform as JobPlatform];
                                    return (
                                        <button
                                            key={platform}
                                            onClick={() => setPlatformConfig(prev => ({
                                                ...prev,
                                                [platform]: { ...config, enabled: !config.enabled }
                                            }))}
                                            className={`p-3 rounded-xl text-left transition-all ${config.enabled ? 'ring-2' : ''
                                                }`}
                                            style={{
                                                background: config.enabled
                                                    ? `${info.color}15`
                                                    : 'var(--bg-secondary)',
                                            }}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="text-xl">{info.icon}</span>
                                                <span className="font-medium text-sm">{info.name}</span>
                                            </div>
                                            <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                                                {config.enabled ? '✓ Enabled' : 'Disabled'}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Search Bar */}
            <Card>
                <div className="flex gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            value={filters.query}
                            onChange={e => setFilters({ ...filters, query: e.target.value })}
                            placeholder="Job title, skills, or company..."
                            className="w-full pl-10 pr-4 py-3 rounded-xl"
                            style={{ background: 'var(--bg-secondary)', border: 'none' }}
                        />
                    </div>

                    <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            value={filters.location || ''}
                            onChange={e => setFilters({ ...filters, location: e.target.value })}
                            placeholder="Location..."
                            className="w-48 pl-10 pr-4 py-3 rounded-xl"
                            style={{ background: 'var(--bg-secondary)', border: 'none' }}
                        />
                    </div>

                    <Button
                        variant="secondary"
                        icon={<Filter className="w-4 h-4" />}
                        onClick={() => setShowFilters(!showFilters)}
                    >
                        Filters
                    </Button>

                    <Button
                        icon={isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                        onClick={searchJobs}
                        disabled={isLoading}
                    >
                        Search
                    </Button>
                </div>

                {/* Filter Tags */}
                <AnimatePresence>
                    {showFilters && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="mt-4 pt-4 border-t"
                            style={{ borderColor: 'var(--glass-border)' }}
                        >
                            <div className="flex flex-wrap gap-3">
                                <label className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer" style={{ background: 'var(--bg-secondary)' }}>
                                    <input
                                        type="checkbox"
                                        checked={filters.remote}
                                        onChange={e => setFilters({ ...filters, remote: e.target.checked })}
                                    />
                                    <span className="text-sm">Remote Only</span>
                                </label>

                                <label className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer" style={{ background: filters.sponsorsVisa ? 'rgba(34, 197, 94, 0.15)' : 'var(--bg-secondary)' }}>
                                    <input
                                        type="checkbox"
                                        checked={filters.sponsorsVisa}
                                        onChange={e => setFilters({ ...filters, sponsorsVisa: e.target.checked })}
                                    />
                                    <span className="text-sm">Sponsors Visa</span>
                                </label>

                                <select
                                    value={filters.postedWithin || 30}
                                    onChange={e => setFilters({ ...filters, postedWithin: Number(e.target.value) })}
                                    className="px-3 py-2 rounded-lg text-sm"
                                    style={{ background: 'var(--bg-secondary)', border: 'none' }}
                                >
                                    <option value={1}>Past 24 hours</option>
                                    <option value={7}>Past week</option>
                                    <option value={14}>Past 2 weeks</option>
                                    <option value={30}>Past month</option>
                                </select>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-5 gap-4">
                <Card className="text-center">
                    <p className="text-2xl font-bold">{stats.total}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Total Jobs</p>
                </Card>
                <Card className="text-center" style={{ background: 'rgba(34, 197, 94, 0.1)' }}>
                    <p className="text-2xl font-bold" style={{ color: 'var(--success)' }}>{stats.highMatch}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>High Match (80%+)</p>
                </Card>
                <Card className="text-center" style={{ background: 'rgba(91, 111, 242, 0.1)' }}>
                    <p className="text-2xl font-bold" style={{ color: 'var(--primary-400)' }}>{stats.sponsorsVisa}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Sponsors Visa</p>
                </Card>
                <Card className="text-center">
                    <p className="text-2xl font-bold">{stats.saved}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Saved</p>
                </Card>
                <Card className="text-center" style={{ background: 'rgba(234, 179, 8, 0.1)' }}>
                    <p className="text-2xl font-bold" style={{ color: 'var(--warning)' }}>{stats.applied}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Applied</p>
                </Card>
            </div>

            {/* Job List */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" style={{ color: 'var(--primary-400)' }} />
                        Jobs Ranked by Match Score
                    </h3>

                    {jobs.length === 0 && !isLoading && (
                        <Card className="text-center py-12">
                            <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p style={{ color: 'var(--text-muted)' }}>
                                Click "Search" or "Auto-Search All" to find jobs
                            </p>
                        </Card>
                    )}

                    {isLoading && (
                        <Card className="text-center py-12">
                            <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin" style={{ color: 'var(--primary-400)' }} />
                            <p>Searching across all platforms...</p>
                        </Card>
                    )}

                    <AnimatePresence>
                        {jobs.map((match, index) => (
                            <JobCard
                                key={match.job.id}
                                match={match}
                                index={index}
                                isSelected={selectedJob?.job.id === match.job.id}
                                isSaved={savedJobs.has(match.job.id)}
                                isApplied={appliedJobs.has(match.job.id)}
                                onSelect={() => setSelectedJob(match)}
                                onSave={() => toggleSaveJob(match.job.id)}
                                onApply={() => applyToJob(match.job)}
                            />
                        ))}
                    </AnimatePresence>
                </div>

                {/* Job Details Panel */}
                <div className="lg:sticky lg:top-8 h-fit">
                    {selectedJob ? (
                        <JobDetailsPanel
                            match={selectedJob}
                            isSaved={savedJobs.has(selectedJob.job.id)}
                            isApplied={appliedJobs.has(selectedJob.job.id)}
                            onSave={() => toggleSaveJob(selectedJob.job.id)}
                            onApply={() => applyToJob(selectedJob.job)}
                            onClose={() => setSelectedJob(null)}
                        />
                    ) : (
                        <Card className="text-center py-16">
                            <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p style={{ color: 'var(--text-muted)' }}>
                                Select a job to see details
                            </p>
                        </Card>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

// ============================================
// JOB CARD COMPONENT
// ============================================

interface JobCardProps {
    match: MatchResult;
    index: number;
    isSelected: boolean;
    isSaved: boolean;
    isApplied: boolean;
    onSelect: () => void;
    onSave: () => void;
    onApply: () => void;
}

function JobCard({ match, index, isSelected, isSaved, isApplied, onSelect, onSave, onApply }: JobCardProps) {
    const { job, score, matchedSkills } = match;
    const platform = platformInfo[job.platform];

    const scoreColor = score >= 80 ? 'var(--success)' : score >= 60 ? 'var(--warning)' : 'var(--text-muted)';

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: index * 0.03 }}
            className={`p-4 rounded-xl cursor-pointer transition-all ${isSelected ? 'ring-2' : ''}`}
            style={{
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
            }}
            onClick={onSelect}
        >
            <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                    {job.companyLogo ? (
                        <img src={job.companyLogo} alt={job.company} className="w-12 h-12 rounded-xl object-cover" />
                    ) : (
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl" style={{ background: 'var(--bg-secondary)' }}>
                            <Building2 className="w-6 h-6" />
                        </div>
                    )}
                    <div>
                        <h4 className="font-semibold">{job.title}</h4>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{job.company}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                            <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {job.location}
                            </span>
                            <span>•</span>
                            <span>{platform.icon} {platform.name}</span>
                        </div>
                    </div>
                </div>

                <div className="text-right">
                    <div className="flex items-center gap-1 font-bold text-lg" style={{ color: scoreColor }}>
                        <Star className="w-4 h-4" />
                        {score}%
                    </div>
                    {job.sponsorsVisa && (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(34, 197, 94, 0.15)', color: 'var(--success)' }}>
                            Sponsors Visa ✓
                        </span>
                    )}
                </div>
            </div>

            {/* Salary & Skills */}
            <div className="mt-3 flex items-center justify-between">
                {job.salary && (
                    <div className="flex items-center gap-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                        <DollarSign className="w-4 h-4" />
                        ${job.salary.min.toLocaleString()}-${job.salary.max.toLocaleString()}/{job.salary.period === 'monthly' ? 'mo' : 'yr'}
                    </div>
                )}
                <div className="flex gap-1">
                    {matchedSkills.slice(0, 3).map(skill => (
                        <span key={skill} className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(91, 111, 242, 0.15)', color: 'var(--primary-400)' }}>
                            {skill}
                        </span>
                    ))}
                    {matchedSkills.length > 3 && (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-secondary)' }}>
                            +{matchedSkills.length - 3}
                        </span>
                    )}
                </div>
            </div>

            {/* Action buttons */}
            <div className="mt-3 flex gap-2">
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={e => { e.stopPropagation(); onSave(); }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm"
                    style={{
                        background: isSaved ? 'rgba(91, 111, 242, 0.15)' : 'var(--bg-secondary)',
                        color: isSaved ? 'var(--primary-400)' : 'inherit'
                    }}
                >
                    <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                    {isSaved ? 'Saved' : 'Save'}
                </motion.button>

                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={e => { e.stopPropagation(); onApply(); }}
                    disabled={isApplied}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm flex-1 justify-center font-medium"
                    style={{
                        background: isApplied ? 'rgba(34, 197, 94, 0.15)' : 'var(--gradient-primary)',
                        color: isApplied ? 'var(--success)' : 'white'
                    }}
                >
                    {isApplied ? (
                        <><Check className="w-4 h-4" /> Applied</>
                    ) : (
                        <><Send className="w-4 h-4" /> Quick Apply</>
                    )}
                </motion.button>
            </div>
        </motion.div>
    );
}

// ============================================
// JOB DETAILS PANEL
// ============================================

interface JobDetailsPanelProps {
    match: MatchResult;
    isSaved: boolean;
    isApplied: boolean;
    onSave: () => void;
    onApply: () => void;
    onClose: () => void;
}

function JobDetailsPanel({ match, isSaved, isApplied, onSave, onApply, onClose }: JobDetailsPanelProps) {
    const { job, score, matchedSkills, missingSkills, reasons } = match;
    const platform = platformInfo[job.platform];

    return (
        <Card>
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                    {job.companyLogo ? (
                        <img src={job.companyLogo} alt={job.company} className="w-16 h-16 rounded-xl object-cover" />
                    ) : (
                        <div className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl" style={{ background: 'var(--bg-secondary)' }}>
                            <Building2 className="w-8 h-8" />
                        </div>
                    )}
                    <div>
                        <h3 className="text-xl font-bold">{job.title}</h3>
                        <p style={{ color: 'var(--text-secondary)' }}>{job.company}</p>
                        <div className="flex items-center gap-2 mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                            <MapPin className="w-4 h-4" />
                            {job.location}
                            {job.locationType !== 'onsite' && (
                                <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: 'rgba(34, 197, 94, 0.15)', color: 'var(--success)' }}>
                                    {job.locationType}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <button onClick={onClose}>
                    <X className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                </button>
            </div>

            {/* Match Score */}
            <div className="p-4 rounded-xl mb-4" style={{ background: 'var(--bg-secondary)' }}>
                <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Match Score</span>
                    <span className="text-2xl font-bold" style={{ color: score >= 80 ? 'var(--success)' : score >= 60 ? 'var(--warning)' : 'var(--text-muted)' }}>
                        {score}%
                    </span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
                    <motion.div
                        className="h-full rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${score}%` }}
                        style={{ background: score >= 80 ? 'var(--success)' : score >= 60 ? 'var(--warning)' : 'var(--text-muted)' }}
                    />
                </div>
                <div className="mt-3 space-y-1">
                    {reasons.map((reason, i) => (
                        <p key={i} className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                            <Check className="w-3 h-3" style={{ color: 'var(--success)' }} />
                            {reason}
                        </p>
                    ))}
                </div>
            </div>

            {/* Skills Match */}
            <div className="mb-4">
                <h4 className="font-medium mb-2">Skills</h4>
                <div className="flex flex-wrap gap-1">
                    {matchedSkills.map(skill => (
                        <span key={skill} className="text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(34, 197, 94, 0.15)', color: 'var(--success)' }}>
                            ✓ {skill}
                        </span>
                    ))}
                    {missingSkills.slice(0, 5).map(skill => (
                        <span key={skill} className="text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(239, 68, 68, 0.15)', color: 'var(--error)' }}>
                            {skill}
                        </span>
                    ))}
                </div>
            </div>

            {/* Salary */}
            {job.salary && (
                <div className="p-3 rounded-xl mb-4" style={{ background: 'rgba(34, 197, 94, 0.1)' }}>
                    <div className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5" style={{ color: 'var(--success)' }} />
                        <span className="font-semibold">
                            ${job.salary.min.toLocaleString()} - ${job.salary.max.toLocaleString()}
                        </span>
                        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                            /{job.salary.period}
                        </span>
                    </div>
                </div>
            )}

            {/* Visa Sponsorship */}
            {job.sponsorsVisa && (
                <div className="p-3 rounded-xl mb-4 flex items-center gap-2" style={{ background: 'rgba(91, 111, 242, 0.1)' }}>
                    <GraduationCap className="w-5 h-5" style={{ color: 'var(--primary-400)' }} />
                    <span className="font-medium" style={{ color: 'var(--primary-400)' }}>
                        ✓ Sponsors Visa (H1B/OPT Friendly)
                    </span>
                </div>
            )}

            {/* Platform */}
            <div className="flex items-center gap-2 mb-4 text-sm" style={{ color: 'var(--text-muted)' }}>
                <span>Found on {platform.icon} {platform.name}</span>
                <span>•</span>
                <span>Posted {Math.floor((Date.now() - job.postedDate.getTime()) / (1000 * 60 * 60 * 24))} days ago</span>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
                <Button
                    variant="secondary"
                    className="flex-1"
                    icon={<Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />}
                    onClick={onSave}
                >
                    {isSaved ? 'Saved' : 'Save'}
                </Button>
                <Button
                    className="flex-2"
                    icon={isApplied ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                    onClick={onApply}
                    disabled={isApplied}
                >
                    {isApplied ? 'Applied' : 'Quick Apply'}
                </Button>
                <a href={job.applicationUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="secondary" icon={<ExternalLink className="w-4 h-4" />}>
                        View Original
                    </Button>
                </a>
            </div>
        </Card>
    );
}
