'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Button, StatusBadge, ProgressBar } from '@/components/ui';
import {
    GraduationCap, CheckCircle2, Play, Pause, ChevronRight,
    Sparkles, FileText, Loader2, Trophy, Clock
} from 'lucide-react';
import {
    SCHOLARSHIPS, Scholarship, getScholarshipsForProfile
} from '@/lib/scholarships';
import { toast } from '@/lib/error-handling';

// User Profile (Hardcoded for Aarav Shah based on context)
const USER_PROFILE = {
    isInternational: true,
    isIndian: true,
    isTransfer: true,
    gpa: 3.8,
    major: 'Computer Science',
    colleges: ['umich', 'usc', 'generic']
};

export default function ScholarshipAutoApplyPage() {
    const [eligible, setEligible] = useState<Scholarship[]>([]);
    const [isApplying, setIsApplying] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(-1);
    const [progress, setProgress] = useState(0);
    const [logs, setLogs] = useState<string[]>([]);

    // Load eligible scholarships
    useEffect(() => {
        const matches = getScholarshipsForProfile(USER_PROFILE);
        setEligible(matches);
    }, []);

    // Application Simulator
    useEffect(() => {
        if (!isApplying || currentIndex >= eligible.length) return;

        const currentScholarship = eligible[currentIndex];
        const steps = [
            `Analyzing requirements for ${currentScholarship.name}...`,
            `Drafting essay for "${currentScholarship.provider}"...`,
            `Attaching transcripts (GPA 3.8)...`,
            `Submitting application...`
        ];

        let stepIndex = 0;

        const interval = setInterval(() => {
            if (stepIndex >= steps.length) {
                // Done with this scholarship
                clearInterval(interval);
                setCurrentIndex(prev => prev + 1);
                setProgress(((currentIndex + 1) / eligible.length) * 100);
            } else {
                setLogs(prev => [steps[stepIndex], ...prev].slice(0, 5));
                stepIndex++;
            }
        }, 800); // 800ms per step

        return () => clearInterval(interval);
    }, [isApplying, currentIndex, eligible]);

    // Cleanup when done
    useEffect(() => {
        if (currentIndex === eligible.length && isApplying) {
            setIsApplying(false);
            toast.success("🎉 All applications submitted successfully!");
            setProgress(100);
        }
    }, [currentIndex, eligible.length, isApplying]);

    const startAutoApply = () => {
        setIsApplying(true);
        setCurrentIndex(0);
        setLogs(['Starting autonomous application sequence...']);
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3" style={{ fontFamily: 'var(--font-display)' }}>
                        <Sparkles className="w-8 h-8 text-yellow-400" />
                        Scholarship Auto-Pilot
                    </h1>
                    <p className="text-gray-400">
                        Autonomous matching and application engine for Aarav Shah
                    </p>
                </div>
                {!isApplying && currentIndex < eligible.length && (
                    <Button
                        size="lg"
                        onClick={startAutoApply}
                        className="bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white shadow-lg shadow-yellow-500/20"
                        icon={<Play className="w-5 h-5" />}
                    >
                        Auto-Apply to {eligible.length} Scholarships
                    </Button>
                )}
            </div>

            {/* Main Progress Dashboard */}
            <Card className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-yellow-400" />
                        Total Potential Value:
                        <span className="text-green-400 font-mono ml-2">$145,000+</span>
                    </h2>
                    <div className="text-right">
                        <span className="text-2xl font-bold text-blue-400">{Math.round(progress)}%</span>
                        <span className="text-xs text-gray-500 block">SEQUENCE COMPLETION</span>
                    </div>
                </div>

                <div className="h-4 bg-slate-700 rounded-full overflow-hidden border border-slate-600">
                    <motion.div
                        className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 relative"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ type: "spring", stiffness: 50 }}
                    >
                        <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]" />
                    </motion.div>
                </div>

                {/* Live Logs */}
                <div className="mt-6 p-4 rounded-xl bg-black/40 font-mono text-sm h-32 overflow-hidden relative border border-white/5">
                    <div className="absolute top-2 right-2 flex items-center gap-2">
                        {isApplying && <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />}
                        <span className="text-xs text-gray-500">{isApplying ? 'LIVE' : 'STANDBY'}</span>
                    </div>
                    <AnimatePresence mode="popLayout">
                        {logs.map((log, i) => (
                            <motion.div
                                key={log + i}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0 }}
                                className="text-green-400/80 mb-1"
                            >
                                <span className="text-gray-600 mr-2">[{new Date().toLocaleTimeString()}]</span>
                                {log}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    {logs.length === 0 && <span className="text-gray-600">Waiting to initialize sequence...</span>}
                </div>
            </Card>

            {/* Scholarship List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {eligible.map((scholarship, index) => {
                    const status = index < currentIndex ? 'applied' : index === currentIndex && isApplying ? 'applying' : 'pending';

                    return (
                        <motion.div
                            key={scholarship.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                        >
                            <Card className={`h-full border transition-all duration-300 ${status === 'applying' ? 'border-yellow-500/50 shadow-lg shadow-yellow-500/10 scale-105 z-10' :
                                    status === 'applied' ? 'border-green-500/30 opacity-75' :
                                        'border-slate-700 opacity-60'
                                }`}>
                                <div className="flex justify-between items-start mb-3">
                                    <div className={`p-2 rounded-lg ${status === 'applied' ? 'bg-green-500/20 text-green-400' :
                                            status === 'applying' ? 'bg-yellow-500/20 text-yellow-400' :
                                                'bg-slate-700/50 text-slate-400'
                                        }`}>
                                        <GraduationCap className="w-5 h-5" />
                                    </div>
                                    <StatusBadge status={
                                        status === 'applied' ? 'success' :
                                            status === 'applying' ? 'warning' : 'neutral'
                                    }>
                                        {status === 'applied' ? 'APPLIED' : status === 'applying' ? 'PROCESSING' : 'QUEUED'}
                                    </StatusBadge>
                                </div>

                                <h3 className="font-bold text-lg mb-1 line-clamp-1">{scholarship.name}</h3>
                                <p className="text-sm text-gray-400 mb-4">{scholarship.provider}</p>

                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between items-center p-2 bg-white/5 rounded-lg">
                                        <span className="text-gray-400">Amount</span>
                                        <span className="font-semibold text-green-400">{scholarship.amount}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-2 bg-white/5 rounded-lg">
                                        <span className="text-gray-400">Deadline</span>
                                        <span className="font-semibold text-blue-400">
                                            {scholarship.deadline.toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>

                                {status === 'applying' && (
                                    <div className="mt-4 flex items-center gap-2 text-xs text-yellow-500 font-mono animate-pulse">
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                        GENERATING ESSAY...
                                    </div>
                                )}
                            </Card>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
