'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Button } from '@/components/ui';
import {
    Zap, Play, Square, RefreshCw, AlertCircle, CheckCircle,
    Terminal, Rocket, Loader2, Settings, Search, Activity,
    Briefcase, GraduationCap, Building, Power, List, ExternalLink, FileText
} from 'lucide-react';
import { toast } from '@/lib/error-handling';
import Link from 'next/link';

interface AutomationStatus {
    running: boolean;
    lastDiscoveryScan: string | null;
    lastApplicationAttempt: string | null;
    applicationsToday: number;
    totalDiscovered: number;
    totalApplied: number;
    currentActivity: string;
    errors: string[];
}

// All scrapers list - COMPLETE
const ALL_SCRAPERS = [
    { id: 'linkedin', name: 'LinkedIn', icon: Briefcase, type: 'job' },
    { id: 'indeed', name: 'Indeed', icon: Briefcase, type: 'job' },
    { id: 'glassdoor', name: 'Glassdoor', icon: Briefcase, type: 'job' },
    { id: 'handshake', name: 'Handshake', icon: GraduationCap, type: 'job' },
    { id: 'ziprecruiter', name: 'ZipRecruiter', icon: Briefcase, type: 'job' },
    { id: 'companies', name: 'Tech Companies', icon: Building, type: 'job' },
    { id: 'bold-org', name: 'Bold.org', icon: GraduationCap, type: 'scholarship' },
    { id: 'fastweb', name: 'Fastweb', icon: GraduationCap, type: 'scholarship' },
    { id: 'scholarships-com', name: 'Scholarships.com', icon: GraduationCap, type: 'scholarship' },
    { id: 'chegg', name: 'Chegg Internships', icon: Briefcase, type: 'job' },
];

export default function FullyAutomatedDashboard() {
    const [status, setStatus] = useState<AutomationStatus | null>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const [autoStarted, setAutoStarted] = useState(false);
    const [loading, setLoading] = useState(true);
    const logsEndRef = useRef<HTMLDivElement>(null);

    // Fetch status
    const fetchStatus = useCallback(async () => {
        try {
            const res = await fetch('/api/automation/engine');
            const data = await res.json();
            if (data.success) {
                setStatus(data.status);
                setLogs(data.logs || []);
            }
        } catch {
            // API may not be ready
        } finally {
            setLoading(false);
        }
    }, []);

    // AUTO-START on page load - NO BUTTON NEEDED
    useEffect(() => {
        const autoStart = async () => {
            // Wait a bit for initial fetch
            await new Promise(r => setTimeout(r, 500));
            await fetchStatus();

            // Auto-start if not already running
            if (!autoStarted) {
                try {
                    const res = await fetch('/api/automation/engine?action=start', { method: 'POST' });
                    const data = await res.json();
                    if (data.success) {
                        toast.success('🚀 Automation started automatically!');
                        setAutoStarted(true);
                    }
                } catch (err) {
                    console.error('Auto-start failed:', err);
                }
            }
        };

        autoStart();
    }, [fetchStatus, autoStarted]);

    // Poll for updates every 2 seconds
    useEffect(() => {
        const interval = setInterval(fetchStatus, 2000);
        return () => clearInterval(interval);
    }, [fetchStatus]);

    // Auto-scroll logs
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    // STOP automation
    const handleStop = async () => {
        try {
            await fetch('/api/automation/engine?action=stop', { method: 'POST' });
            toast.success('Automation stopped');
            setAutoStarted(false);
            await fetchStatus();
        } catch {
            toast.error('Failed to stop');
        }
    };

    // RESTART automation
    const handleRestart = async () => {
        try {
            await fetch('/api/automation/engine?action=start', { method: 'POST' });
            toast.success('🚀 Automation restarted!');
            setAutoStarted(true);
            await fetchStatus();
        } catch {
            toast.error('Failed to restart');
        }
    };

    // Trigger immediate scan
    const handleScanNow = async () => {
        try {
            await fetch('/api/automation/engine?action=discover', { method: 'POST' });
            toast.success('🔍 Full scan triggered!');
        } catch {
            toast.error('Failed to scan');
        }
    };

    const isRunning = status?.running ?? false;

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-16 h-16 animate-spin text-purple-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white">Starting Automation...</h2>
                    <p className="text-gray-400 mt-2">The system is initializing automatically</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header with PROMINENT STOP button */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-bold flex items-center gap-3 text-white">
                            <Zap className="w-10 h-10 text-yellow-400" />
                            FULLY AUTOMATED
                        </h1>
                        <p className="text-purple-300 text-lg">
                            Applying to ALL jobs & scholarships automatically - no action needed
                        </p>
                    </div>

                    {/* BIG STOP BUTTON - Always visible */}
                    <div className="flex gap-3">
                        <Link href="/opportunities">
                            <button className="flex items-center gap-2 px-4 py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl shadow-lg shadow-purple-500/30 transition-all hover:scale-105">
                                <List className="w-5 h-5" />
                                Opportunities
                            </button>
                        </Link>
                        <Link href="/documents">
                            <button className="flex items-center gap-2 px-4 py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-2xl shadow-lg shadow-green-500/30 transition-all hover:scale-105">
                                <FileText className="w-5 h-5" />
                                Documents
                            </button>
                        </Link>
                        {isRunning ? (
                            <button
                                onClick={handleStop}
                                className="flex items-center gap-3 px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-bold text-xl rounded-2xl shadow-lg shadow-red-500/30 transition-all hover:scale-105"
                            >
                                <Square className="w-6 h-6" />
                                STOP
                            </button>
                        ) : (
                            <button
                                onClick={handleRestart}
                                className="flex items-center gap-3 px-8 py-4 bg-green-600 hover:bg-green-700 text-white font-bold text-xl rounded-2xl shadow-lg shadow-green-500/30 transition-all hover:scale-105"
                            >
                                <Play className="w-6 h-6" />
                                START
                            </button>
                        )}
                    </div>
                </div>

                {/* Status Banner */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`rounded-2xl p-6 ${isRunning
                        ? 'bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-500/30'
                        : 'bg-gradient-to-r from-gray-600/20 to-slate-600/20 border border-gray-500/30'
                        }`}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`w-4 h-4 rounded-full ${isRunning ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
                            <div>
                                <span className={`text-2xl font-bold ${isRunning ? 'text-green-400' : 'text-gray-400'}`}>
                                    {isRunning ? '● RUNNING' : '○ STOPPED'}
                                </span>
                                <p className="text-gray-300">{status?.currentActivity || 'Idle'}</p>
                            </div>
                        </div>

                        <button
                            onClick={handleScanNow}
                            disabled={!isRunning}
                            className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all"
                        >
                            <Search className="w-5 h-5" />
                            Scan All Sources Now
                        </button>
                    </div>
                </motion.div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 border-blue-500/30">
                        <div className="text-center p-4">
                            <div className="text-4xl font-bold text-blue-400">{status?.totalDiscovered || 0}</div>
                            <div className="text-blue-200 mt-1">Opportunities Found</div>
                        </div>
                    </Card>
                    <Card className="bg-gradient-to-br from-green-600/20 to-green-800/20 border-green-500/30">
                        <div className="text-center p-4">
                            <div className="text-4xl font-bold text-green-400">{status?.totalApplied || 0}</div>
                            <div className="text-green-200 mt-1">Applications Sent</div>
                        </div>
                    </Card>
                    <Card className="bg-gradient-to-br from-yellow-600/20 to-yellow-800/20 border-yellow-500/30">
                        <div className="text-center p-4">
                            <div className="text-4xl font-bold text-yellow-400">{status?.applicationsToday || 0}</div>
                            <div className="text-yellow-200 mt-1">Applied Today</div>
                        </div>
                    </Card>
                    <Card className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 border-purple-500/30">
                        <div className="text-center p-4">
                            <div className="text-4xl font-bold text-purple-400">{ALL_SCRAPERS.length}</div>
                            <div className="text-purple-200 mt-1">Active Sources</div>
                        </div>
                    </Card>
                </div>

                {/* Active Sources */}
                <Card className="bg-slate-800/50 border-slate-700">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-purple-400" />
                        Monitoring {ALL_SCRAPERS.length} Sources
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {ALL_SCRAPERS.map((scraper) => {
                            const Icon = scraper.icon;
                            return (
                                <div
                                    key={scraper.id}
                                    className={`flex items-center gap-2 p-3 rounded-xl ${scraper.type === 'job'
                                        ? 'bg-blue-500/10 border border-blue-500/30'
                                        : 'bg-green-500/10 border border-green-500/30'
                                        }`}
                                >
                                    <Icon className={`w-5 h-5 ${scraper.type === 'job' ? 'text-blue-400' : 'text-green-400'}`} />
                                    <span className="text-white font-medium">{scraper.name}</span>
                                    {isRunning && <CheckCircle className="w-4 h-4 text-green-400 ml-auto" />}
                                </div>
                            );
                        })}
                    </div>
                </Card>

                {/* Live Logs */}
                <Card className="bg-slate-800/50 border-slate-700">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Terminal className="w-5 h-5 text-gray-400" />
                            Live Activity
                        </h2>
                        {isRunning && (
                            <span className="flex items-center gap-2 text-sm text-green-400">
                                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                LIVE
                            </span>
                        )}
                    </div>

                    <div className="bg-black/50 rounded-xl p-4 h-80 overflow-y-auto font-mono text-sm">
                        {logs.length === 0 ? (
                            <div className="text-gray-500 text-center py-8">
                                <Rocket className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                <p>Automation starting...</p>
                                <p className="text-xs mt-1">Logs will appear here</p>
                            </div>
                        ) : (
                            logs.slice(-100).map((log, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className={`py-0.5 ${log.includes('✅') || log.includes('✓') ? 'text-green-400' :
                                        log.includes('❌') || log.includes('error') ? 'text-red-400' :
                                            log.includes('🔍') || log.includes('🚀') ? 'text-blue-400' :
                                                log.includes('⚠️') ? 'text-yellow-400' :
                                                    'text-gray-300'
                                        }`}
                                >
                                    {log}
                                </motion.div>
                            ))
                        )}
                        <div ref={logsEndRef} />
                    </div>
                </Card>

                {/* Errors */}
                <AnimatePresence>
                    {status?.errors && status.errors.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <Card className="bg-red-900/20 border-red-500/30">
                                <h3 className="font-bold text-red-400 mb-2 flex items-center gap-2">
                                    <AlertCircle className="w-5 h-5" />
                                    Errors ({status.errors.length})
                                </h3>
                                <ul className="text-sm space-y-1 text-red-300">
                                    {status.errors.slice(-5).map((err, i) => (
                                        <li key={i}>• {err}</li>
                                    ))}
                                </ul>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Info Footer */}
                <div className="text-center text-gray-500 text-sm">
                    <p>This system automatically discovers and applies to opportunities 24/7</p>
                    <p>Jobs: LinkedIn, Indeed, Glassdoor, Handshake, ZipRecruiter, Tech Companies</p>
                    <p>Scholarships: Bold.org, Fastweb</p>
                </div>
            </div>
        </div>
    );
}
