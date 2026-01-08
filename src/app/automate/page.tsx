'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Button, ProgressBar, StatusBadge } from '@/components/ui';
import {
    Zap, Play, Pause, RefreshCw, CheckCircle, XCircle,
    Terminal, Clock, Rocket, FileText, Briefcase, GraduationCap,
    DollarSign, MapPin, Calendar, Loader2, Target
} from 'lucide-react';
import { toast } from '@/lib/error-handling';

interface Opportunity {
    id: string;
    type: 'scholarship' | 'job';
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
    tailoredCV?: string;
    tailoredEssay?: string;
    tailoredCoverLetter?: string;
}

interface AutomationState {
    status: 'idle' | 'running' | 'paused_for_otp' | 'completed' | 'error';
    currentStep: string;
    logs: string[];
    progress: number;
    totalSteps: number;
}

export default function AutoApplyDashboard() {
    const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
    const [stats, setStats] = useState({ total: 0, discovered: 0, queued: 0, applied: 0, accepted: 0 });
    const [state, setState] = useState<AutomationState>({
        status: 'idle', currentStep: '', logs: [], progress: 0, totalSteps: 0
    });
    const [isPolling, setIsPolling] = useState(false);
    const [selectedTab, setSelectedTab] = useState<'all' | 'scholarships' | 'jobs'>('all');

    // Load opportunities
    const loadOpportunities = async () => {
        try {
            const res = await fetch('/api/opportunities');
            const data = await res.json();
            if (data.opportunities) {
                setOpportunities(data.opportunities);
            }

            const statsRes = await fetch('/api/opportunities?action=stats');
            const statsData = await statsRes.json();
            if (statsData.stats) {
                setStats(statsData.stats);
            }
        } catch (err) {
            console.error('Failed to load opportunities:', err);
        }
    };

    // Seed sample data
    const seedData = async () => {
        try {
            await fetch('/api/opportunities?action=seed');
            await loadOpportunities();
            toast.success('Sample opportunities loaded!');
        } catch (err) {
            toast.error('Failed to seed data');
        }
    };

    // Poll for status
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isPolling) {
            interval = setInterval(async () => {
                try {
                    const res = await fetch('/api/apply');
                    const data = await res.json();
                    if (data.state) {
                        setState(data.state);
                        if (['completed', 'error'].includes(data.state.status)) {
                            setIsPolling(false);
                            loadOpportunities();
                        }
                    }
                } catch (err) { }
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isPolling]);

    useEffect(() => {
        loadOpportunities();
    }, []);

    // Start auto-apply
    const startAutoApply = async () => {
        try {
            const res = await fetch('/api/apply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'apply-all', minScore: 70 }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success('🚀 Auto-apply started!');
                setIsPolling(true);
            } else {
                toast.error(data.error);
            }
        } catch (err) {
            toast.error('Failed to start');
        }
    };

    const stopAutoApply = async () => {
        await fetch('/api/apply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'stop' }),
        });
        setIsPolling(false);
        setState(prev => ({ ...prev, status: 'idle' }));
    };

    const filtered = opportunities.filter(o =>
        selectedTab === 'all' ? true :
            selectedTab === 'scholarships' ? o.type === 'scholarship' : o.type === 'job'
    );

    const statusColors: Record<string, string> = {
        discovered: 'bg-blue-500/20 text-blue-400',
        queued: 'bg-yellow-500/20 text-yellow-400',
        tailoring: 'bg-purple-500/20 text-purple-400',
        applying: 'bg-orange-500/20 text-orange-400',
        applied: 'bg-green-500/20 text-green-400',
        failed: 'bg-red-500/20 text-red-400',
    };

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <Target className="w-8 h-8 text-cyan-400" />
                        Auto-Apply Pipeline
                    </h1>
                    <p className="text-gray-400">Discover → Tailor → Apply → Track</p>
                </div>

                <div className="flex gap-3">
                    <Button variant="secondary" onClick={seedData} icon={<RefreshCw className="w-4 h-4" />}>
                        Load Samples
                    </Button>
                    {state.status === 'running' ? (
                        <Button onClick={stopAutoApply} className="bg-red-500" icon={<Pause className="w-4 h-4" />}>
                            Stop
                        </Button>
                    ) : (
                        <Button onClick={startAutoApply} className="bg-gradient-to-r from-cyan-500 to-blue-500" icon={<Rocket className="w-4 h-4" />}>
                            Apply to All Eligible
                        </Button>
                    )}
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-5 gap-4">
                {[
                    { label: 'Total', value: stats.total, icon: FileText, color: 'text-gray-400' },
                    { label: 'Discovered', value: stats.discovered, icon: Target, color: 'text-blue-400' },
                    { label: 'Queued', value: stats.queued, icon: Clock, color: 'text-yellow-400' },
                    { label: 'Applied', value: stats.applied, icon: CheckCircle, color: 'text-green-400' },
                    { label: 'Accepted', value: stats.accepted, icon: Rocket, color: 'text-cyan-400' },
                ].map(({ label, value, icon: Icon, color }) => (
                    <Card key={label} className="text-center py-4">
                        <Icon className={`w-6 h-6 mx-auto mb-2 ${color}`} />
                        <p className="text-2xl font-bold">{value}</p>
                        <p className="text-xs text-gray-400">{label}</p>
                    </Card>
                ))}
            </div>

            {/* Progress (when running) */}
            {state.status !== 'idle' && (
                <Card className="border border-cyan-500/30">
                    <div className="flex items-center justify-between mb-2">
                        <span className="font-medium flex items-center gap-2">
                            {state.status === 'running' && <Loader2 className="w-4 h-4 animate-spin" />}
                            {state.currentStep || 'Processing...'}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs ${state.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                state.status === 'error' ? 'bg-red-500/20 text-red-400' :
                                    'bg-blue-500/20 text-blue-400'
                            }`}>
                            {state.status.toUpperCase()}
                        </span>
                    </div>
                    <ProgressBar value={(state.progress / Math.max(state.totalSteps, 1)) * 100} />

                    <div className="mt-3 bg-black/50 rounded-lg p-3 h-32 overflow-y-auto font-mono text-xs">
                        {state.logs.slice(-10).map((log, i) => (
                            <div key={i} className="text-gray-400">{log}</div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Tabs */}
            <div className="flex gap-2">
                {(['all', 'scholarships', 'jobs'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setSelectedTab(tab)}
                        className={`px-4 py-2 rounded-lg capitalize ${selectedTab === tab ? 'bg-cyan-500 text-white' : 'bg-gray-800 text-gray-400'
                            }`}
                    >
                        {tab === 'all' ? 'All' : tab}
                    </button>
                ))}
            </div>

            {/* Opportunities List */}
            <div className="space-y-4">
                {filtered.length === 0 ? (
                    <Card className="text-center py-12">
                        <p className="text-gray-400">No opportunities yet. Click "Load Samples" to get started.</p>
                    </Card>
                ) : (
                    filtered.map(opp => (
                        <Card key={opp.id} className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${opp.type === 'scholarship' ? 'bg-purple-500/20' : 'bg-green-500/20'
                                }`}>
                                {opp.type === 'scholarship'
                                    ? <GraduationCap className="w-6 h-6 text-purple-400" />
                                    : <Briefcase className="w-6 h-6 text-green-400" />
                                }
                            </div>

                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-semibold">{opp.title}</h3>
                                    <span className={`px-2 py-0.5 rounded text-xs ${statusColors[opp.status] || 'bg-gray-500/20'}`}>
                                        {opp.status}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-400">{opp.organization}</p>
                                <div className="flex gap-4 mt-1 text-xs text-gray-500">
                                    {opp.amount && <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />${opp.amount}</span>}
                                    {opp.salary && <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{opp.salary}</span>}
                                    {opp.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{opp.location}</span>}
                                    {opp.deadline && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{opp.deadline}</span>}
                                </div>
                            </div>

                            <div className="text-right">
                                <div className={`text-2xl font-bold ${opp.matchScore >= 90 ? 'text-green-400' :
                                        opp.matchScore >= 80 ? 'text-yellow-400' : 'text-gray-400'
                                    }`}>
                                    {opp.matchScore}%
                                </div>
                                <p className="text-xs text-gray-500">match</p>
                            </div>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
