'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Button } from '@/components/ui';
import {
    Briefcase, GraduationCap, Building, ExternalLink, Calendar,
    DollarSign, MapPin, CheckCircle, Clock, AlertCircle, RefreshCw,
    Filter, Search, TrendingUp, Target, Star, Loader2
} from 'lucide-react';
import Link from 'next/link';

interface Opportunity {
    id: string;
    type: 'job' | 'scholarship';
    title: string;
    organization: string;
    url: string;
    deadline?: string;
    amount?: number;
    salary?: string;
    location?: string;
    requirements: string[];
    description: string;
    status: string;
    matchScore: number;
    discoveredAt: string;
    appliedAt?: string;
}

interface Stats {
    total: number;
    discovered: number;
    queued: number;
    applied: number;
    accepted: number;
}

export default function OpportunitiesPage() {
    const [opportunities, setOpportunities] = useState<{
        jobs: Opportunity[];
        scholarships: Opportunity[];
    }>({ jobs: [], scholarships: [] });
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'jobs' | 'scholarships'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const fetchOpportunities = useCallback(async () => {
        try {
            const res = await fetch('/api/automation/opportunities');
            const data = await res.json();
            if (data.success) {
                setOpportunities({
                    jobs: data.jobs || [],
                    scholarships: data.scholarships || [],
                });
                setStats(data.stats);
            }
        } catch (err) {
            console.error('Failed to fetch opportunities:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchOpportunities();
        // Poll every 5 seconds
        const interval = setInterval(fetchOpportunities, 5000);
        return () => clearInterval(interval);
    }, [fetchOpportunities]);

    const addSampleData = async () => {
        await fetch('/api/automation/opportunities', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'seed' }),
        });
        fetchOpportunities();
    };

    const filteredOpportunities = () => {
        let all: Opportunity[] = [];
        if (filter === 'all' || filter === 'jobs') {
            all = [...all, ...opportunities.jobs];
        }
        if (filter === 'all' || filter === 'scholarships') {
            all = [...all, ...opportunities.scholarships];
        }

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            all = all.filter(o =>
                o.title.toLowerCase().includes(query) ||
                o.organization.toLowerCase().includes(query) ||
                o.description.toLowerCase().includes(query)
            );
        }

        return all.sort((a, b) => b.matchScore - a.matchScore);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'applied': return 'text-green-400 bg-green-500/20';
            case 'queued': return 'text-yellow-400 bg-yellow-500/20';
            case 'discovered': return 'text-blue-400 bg-blue-500/20';
            case 'failed': return 'text-red-400 bg-red-500/20';
            default: return 'text-gray-400 bg-gray-500/20';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-16 h-16 animate-spin text-purple-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white">Loading Opportunities...</h2>
                </div>
            </div>
        );
    }

    const total = opportunities.jobs.length + opportunities.scholarships.length;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-bold text-white flex items-center gap-3">
                            <Target className="w-10 h-10 text-purple-400" />
                            Discovered Opportunities
                        </h1>
                        <p className="text-purple-300 text-lg">
                            All jobs and scholarships found by the automation system
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <Button
                            onClick={fetchOpportunities}
                            variant="secondary"
                            icon={<RefreshCw className="w-4 h-4" />}
                        >
                            Refresh
                        </Button>
                        <Link href="/automation">
                            <Button icon={<TrendingUp className="w-4 h-4" />}>
                                Automation Dashboard
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <Card className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 border-blue-500/30">
                        <div className="text-center p-4">
                            <div className="text-3xl font-bold text-blue-400">{total}</div>
                            <div className="text-blue-200 text-sm">Total Found</div>
                        </div>
                    </Card>
                    <Card className="bg-gradient-to-br from-indigo-600/20 to-indigo-800/20 border-indigo-500/30">
                        <div className="text-center p-4">
                            <Briefcase className="w-6 h-6 mx-auto text-indigo-400 mb-1" />
                            <div className="text-3xl font-bold text-indigo-400">{opportunities.jobs.length}</div>
                            <div className="text-indigo-200 text-sm">Jobs</div>
                        </div>
                    </Card>
                    <Card className="bg-gradient-to-br from-green-600/20 to-green-800/20 border-green-500/30">
                        <div className="text-center p-4">
                            <GraduationCap className="w-6 h-6 mx-auto text-green-400 mb-1" />
                            <div className="text-3xl font-bold text-green-400">{opportunities.scholarships.length}</div>
                            <div className="text-green-200 text-sm">Scholarships</div>
                        </div>
                    </Card>
                    <Card className="bg-gradient-to-br from-yellow-600/20 to-yellow-800/20 border-yellow-500/30">
                        <div className="text-center p-4">
                            <div className="text-3xl font-bold text-yellow-400">{stats?.queued || 0}</div>
                            <div className="text-yellow-200 text-sm">Queued</div>
                        </div>
                    </Card>
                    <Card className="bg-gradient-to-br from-emerald-600/20 to-emerald-800/20 border-emerald-500/30">
                        <div className="text-center p-4">
                            <CheckCircle className="w-6 h-6 mx-auto text-emerald-400 mb-1" />
                            <div className="text-3xl font-bold text-emerald-400">{stats?.applied || 0}</div>
                            <div className="text-emerald-200 text-sm">Applied</div>
                        </div>
                    </Card>
                </div>

                {/* Filters & Search */}
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex gap-2 bg-slate-800/50 p-1 rounded-xl">
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-4 py-2 rounded-lg font-medium transition-all ${filter === 'all' ? 'bg-purple-500 text-white' : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            All ({total})
                        </button>
                        <button
                            onClick={() => setFilter('jobs')}
                            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${filter === 'jobs' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            <Briefcase className="w-4 h-4" />
                            Jobs ({opportunities.jobs.length})
                        </button>
                        <button
                            onClick={() => setFilter('scholarships')}
                            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${filter === 'scholarships' ? 'bg-green-500 text-white' : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            <GraduationCap className="w-4 h-4" />
                            Scholarships ({opportunities.scholarships.length})
                        </button>
                    </div>

                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search opportunities..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-gray-400 focus:border-purple-500 outline-none"
                        />
                    </div>
                </div>

                {/* Empty State */}
                {total === 0 && (
                    <Card className="text-center py-16">
                        <AlertCircle className="w-16 h-16 mx-auto text-gray-500 mb-4" />
                        <h3 className="text-2xl font-bold text-white mb-2">No Opportunities Found Yet</h3>
                        <p className="text-gray-400 mb-6">
                            The automation system is discovering opportunities. Check the automation dashboard to ensure it's running.
                        </p>
                        <div className="flex gap-4 justify-center">
                            <Link href="/automation">
                                <Button>Go to Automation Dashboard</Button>
                            </Link>
                            <Button variant="secondary" onClick={addSampleData}>
                                Add Sample Data
                            </Button>
                        </div>
                    </Card>
                )}

                {/* Opportunities List */}
                <div className="space-y-4">
                    <AnimatePresence>
                        {filteredOpportunities().map((opp, index) => (
                            <motion.div
                                key={opp.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <Card className={`hover:border-purple-500/50 transition-all ${opp.type === 'scholarship' ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-blue-500'
                                    }`}>
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-4">
                                            <div className={`p-3 rounded-xl ${opp.type === 'scholarship'
                                                ? 'bg-green-500/20'
                                                : 'bg-blue-500/20'
                                                }`}>
                                                {opp.type === 'scholarship'
                                                    ? <GraduationCap className="w-6 h-6 text-green-400" />
                                                    : <Briefcase className="w-6 h-6 text-blue-400" />
                                                }
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-1">
                                                    <h3 className="text-xl font-bold text-white">{opp.title}</h3>
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(opp.status)}`}>
                                                        {opp.status.toUpperCase()}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-4 text-gray-400 text-sm mb-2">
                                                    <span className="flex items-center gap-1">
                                                        <Building className="w-4 h-4" />
                                                        {opp.organization}
                                                    </span>
                                                    {opp.location && (
                                                        <span className="flex items-center gap-1">
                                                            <MapPin className="w-4 h-4" />
                                                            {opp.location}
                                                        </span>
                                                    )}
                                                    {opp.deadline && (
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="w-4 h-4" />
                                                            {opp.deadline}
                                                        </span>
                                                    )}
                                                    {opp.amount && (
                                                        <span className="flex items-center gap-1 text-green-400">
                                                            <DollarSign className="w-4 h-4" />
                                                            ${opp.amount.toLocaleString()}
                                                        </span>
                                                    )}
                                                    {opp.salary && (
                                                        <span className="flex items-center gap-1 text-green-400">
                                                            <DollarSign className="w-4 h-4" />
                                                            {opp.salary}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-gray-300 text-sm line-clamp-2">{opp.description}</p>
                                                {opp.requirements.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-2">
                                                        {opp.requirements.slice(0, 4).map((req, i) => (
                                                            <span key={i} className="px-2 py-0.5 bg-slate-700 rounded text-xs text-gray-300">
                                                                {req}
                                                            </span>
                                                        ))}
                                                        {opp.requirements.length > 4 && (
                                                            <span className="text-xs text-gray-500">+{opp.requirements.length - 4} more</span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end gap-2">
                                            <div className="flex items-center gap-2">
                                                <Star className="w-4 h-4 text-yellow-400" />
                                                <span className="text-2xl font-bold text-white">{opp.matchScore}%</span>
                                            </div>
                                            <span className="text-xs text-gray-500">Match Score</span>
                                            <a
                                                href={opp.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-all"
                                            >
                                                View <ExternalLink className="w-3 h-3" />
                                            </a>
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="text-center text-gray-500 text-sm pt-8">
                    <p>Data updates every 5 seconds • Sorted by match score</p>
                </div>
            </div>
        </div>
    );
}
