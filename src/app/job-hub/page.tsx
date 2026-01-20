'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Button } from '@/components/ui';
import {
    Briefcase, Search, Filter, MapPin, DollarSign, Building2,
    ExternalLink, Heart, Check, RefreshCw,
    Pause, Settings, Star, TrendingUp, X, Loader2, Zap, Play
} from 'lucide-react';
import {
    Job, JobPlatform, SearchFilters, PlatformConfig
} from '@/lib/job-platforms';
import { toast } from '@/lib/error-handling';
import { getAllOpportunities, Opportunity } from '@/lib/automation/opportunity-store';
import { runDiscoveryScan } from '@/app/actions/discovery';

// Platform icons and colors
const platformInfo: Record<string, { icon: string; color: string; name: string }> = {
    handshake: { icon: '🎓', color: '#FF7043', name: 'Handshake' },
    linkedin: { icon: '💼', color: '#0077B5', name: 'LinkedIn' },
    indeed: { icon: '📋', color: '#2164F3', name: 'Indeed' },
    glassdoor: { icon: '🏢', color: '#0CAA41', name: 'Glassdoor' },
    google_jobs: { icon: '🔍', color: '#4285F4', name: 'Google Jobs' },
    company_direct: { icon: '🏗️', color: '#6B7280', name: 'Company' },
    bold: { icon: '🎓', color: '#000000', name: 'Bold.org' }
};

export default function JobHubPage() {
    const [jobs, setJobs] = useState<Opportunity[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedJob, setSelectedJob] = useState<Opportunity | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [savedJobs, setSavedJobs] = useState<Set<string>>(new Set());
    const [appliedJobs, setAppliedJobs] = useState<Set<string>>(new Set());
    const [showFilters, setShowFilters] = useState(false);

    // Search filters
    const [query, setQuery] = useState('');
    const [location, setLocation] = useState('');

    // Initial load
    useEffect(() => {
        refreshJobs();
    }, []);

    const refreshJobs = () => {
        const allOpps = getAllOpportunities();
        setJobs(allOpps.filter(o => o.type === 'job'));
    };

    const handleScan = async () => {
        setIsScanning(true);
        try {
            toast.info('Starting discovery scan...');
            const result = await runDiscoveryScan('jobs');
            if (result.success) {
                toast.success('Scan complete!');
                refreshJobs();
            } else {
                toast.error(`Scan failed: ${result.error}`);
            }
        } catch (error) {
            console.error(error);
            toast.error('Scan failed to execute');
        } finally {
            setIsScanning(false);
        }
    };

    // Filter jobs
    const filteredJobs = useMemo(() => {
        return jobs.filter(job => {
            const matchesQuery = !query ||
                job.title.toLowerCase().includes(query.toLowerCase()) ||
                job.organization.toLowerCase().includes(query.toLowerCase());
            const matchesLocation = !location ||
                (job.location && job.location.toLowerCase().includes(location.toLowerCase()));
            return matchesQuery && matchesLocation;
        }).sort((a, b) => b.matchScore - a.matchScore);
    }, [jobs, query, location]);

    const toggleSaveJob = (jobId: string) => {
        setSavedJobs(prev => {
            const newSet = new Set(prev);
            if (newSet.has(jobId)) newSet.delete(jobId);
            else newSet.add(jobId);
            return newSet;
        });
    };

    const applyToJob = async (job: Opportunity) => {
        if (!job.url) return;
        window.open(job.url, '_blank');
        setAppliedJobs(prev => new Set(prev).add(job.id));
    };

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
                        AI-powered job search across LinkedIn & more
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        variant="primary"
                        onClick={handleScan}
                        disabled={isScanning}
                        icon={isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    >
                        {isScanning ? 'Scanning...' : 'Scan New Jobs'}
                    </Button>
                </div>
            </div>

            {/* Search Bar */}
            <Card>
                <div className="flex gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="Job title, skills, or company..."
                            className="w-full pl-10 pr-4 py-3 rounded-xl"
                            style={{ background: 'var(--bg-secondary)', border: 'none' }}
                        />
                    </div>
                    <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            value={location}
                            onChange={e => setLocation(e.target.value)}
                            placeholder="Location..."
                            className="w-48 pl-10 pr-4 py-3 rounded-xl"
                            style={{ background: 'var(--bg-secondary)', border: 'none' }}
                        />
                    </div>
                </div>
            </Card>

            {/* Content */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" style={{ color: 'var(--primary-400)' }} />
                        Found Opportunities ({filteredJobs.length})
                    </h3>

                    <AnimatePresence>
                        {filteredJobs.map((job, index) => (
                            <JobCard
                                key={job.id}
                                job={job}
                                index={index}
                                isSelected={selectedJob?.id === job.id}
                                isSaved={savedJobs.has(job.id)}
                                isApplied={appliedJobs.has(job.id)}
                                onSelect={() => setSelectedJob(job)}
                                onSave={() => toggleSaveJob(job.id)}
                                onApply={() => applyToJob(job)}
                            />
                        ))}
                        {filteredJobs.length === 0 && (
                            <div className="text-center py-10 opacity-50">
                                No jobs found. Try scanning!
                            </div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="lg:sticky lg:top-8 h-fit">
                    {selectedJob ? (
                        <JobDetailsPanel
                            job={selectedJob}
                            isSaved={savedJobs.has(selectedJob.id)}
                            isApplied={appliedJobs.has(selectedJob.id)}
                            onSave={() => toggleSaveJob(selectedJob.id)}
                            onApply={() => applyToJob(selectedJob)}
                            onClose={() => setSelectedJob(null)}
                        />
                    ) : (
                        <Card className="text-center py-16">
                            <p style={{ color: 'var(--text-muted)' }}>Select a job to see details</p>
                        </Card>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

// Sub-components adapted for Opportunity schema
function JobCard({ job, index, isSelected, isSaved, isApplied, onSelect, onSave, onApply }: any) {
    const scoreColor = job.matchScore >= 80 ? 'var(--success)' : job.matchScore >= 60 ? 'var(--warning)' : 'var(--text-muted)';
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={onSelect}
            className={`p-4 rounded-xl cursor-pointer transition-all ${isSelected ? 'ring-2' : ''}`}
            style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}
        >
            <div className="flex justify-between">
                <div>
                    <h4 className="font-semibold">{job.title}</h4>
                    <p className="text-sm opacity-70">{job.organization}</p>
                </div>
                <div className="text-right">
                    <div className="flex items-center gap-1 font-bold text-lg" style={{ color: scoreColor }}>
                        <Star className="w-4 h-4" />
                        {job.matchScore}%
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

function JobDetailsPanel({ job, isSaved, isApplied, onSave, onApply, onClose }: any) {
    // Determine category based on score for display
    const category = job.matchScore >= 90 ? 'Safety' : job.matchScore >= 70 ? 'Target' : 'Reach';

    return (
        <Card>
            <div className="flex justify-between mb-4">
                <h3 className="text-xl font-bold">{job.title}</h3>
                <button onClick={onClose}><X className="w-5 h-5" /></button>
            </div>
            <div className="mb-4">
                <h4 className="font-semibold">Match Analysis</h4>
                <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-1 rounded text-sm ${category === 'Safety' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>
                        {category} ({job.matchScore}%)
                    </span>
                </div>
            </div>
            <div className="mb-4">
                <h4 className="font-semibold">Description</h4>
                <p className="text-sm opacity-80 max-h-60 overflow-y-auto whitespace-pre-wrap">{job.description}</p>
            </div>
            <div className="flex gap-3">
                <Button onClick={onApply} disabled={isApplied} variant="primary">
                    {isApplied ? 'Applied' : 'Apply Now'}
                </Button>
                <Button onClick={onSave} variant="secondary">
                    {isSaved ? 'Saved' : 'Save'}
                </Button>
            </div>
        </Card>
    );
}
