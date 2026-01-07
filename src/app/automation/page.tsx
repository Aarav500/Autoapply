'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Button, ProgressBar } from '@/components/ui';
import {
    Zap, Play, Pause, RefreshCw, AlertCircle, CheckCircle,
    Terminal, Clock, Rocket, KeyRound, Send, Loader2
} from 'lucide-react';
import { toast } from '@/lib/error-handling';

interface AutomationState {
    status: 'idle' | 'running' | 'paused_for_otp' | 'completed' | 'error';
    currentStep: string;
    logs: string[];
    progress: number;
    totalSteps: number;
    otpRequired?: boolean;
    otpPlatform?: string;
    error?: string;
}

export default function AutomationDashboard() {
    const [state, setState] = useState<AutomationState>({
        status: 'idle',
        currentStep: '',
        logs: [],
        progress: 0,
        totalSteps: 0,
    });
    const [otp, setOtp] = useState('');
    const [isPolling, setIsPolling] = useState(false);

    // Poll for status updates
    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (isPolling) {
            interval = setInterval(async () => {
                try {
                    const res = await fetch('/api/automation');
                    const data = await res.json();
                    if (data.state) {
                        setState(data.state);

                        if (data.state.status === 'completed' || data.state.status === 'error') {
                            setIsPolling(false);
                        }
                    }
                } catch (err) {
                    console.error('Polling error:', err);
                }
            }, 1000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isPolling]);

    const startAutomation = async (platform: string) => {
        try {
            const res = await fetch('/api/automation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'start', platform }),
            });
            const data = await res.json();

            if (data.success) {
                toast.success('🚀 Automation started!');
                setIsPolling(true);
            } else {
                toast.error(data.error || 'Failed to start');
            }
        } catch (err) {
            toast.error('Failed to start automation');
        }
    };

    const stopAutomation = async () => {
        try {
            await fetch('/api/automation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'stop' }),
            });
            setIsPolling(false);
            setState(prev => ({ ...prev, status: 'idle' }));
            toast.info('Automation stopped');
        } catch (err) {
            toast.error('Failed to stop');
        }
    };

    const submitOTP = async () => {
        if (!otp.trim()) {
            toast.error('Please enter the OTP');
            return;
        }

        try {
            const res = await fetch('/api/automation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'otp', otp: otp.trim() }),
            });
            const data = await res.json();

            if (data.success) {
                toast.success('OTP submitted, continuing...');
                setOtp('');
            }
        } catch (err) {
            toast.error('Failed to submit OTP');
        }
    };

    const statusColors = {
        idle: 'text-gray-400',
        running: 'text-blue-400',
        paused_for_otp: 'text-yellow-400',
        completed: 'text-green-400',
        error: 'text-red-400',
    };

    const statusIcons = {
        idle: Clock,
        running: Loader2,
        paused_for_otp: KeyRound,
        completed: CheckCircle,
        error: AlertCircle,
    };

    const StatusIcon = statusIcons[state.status];

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <Zap className="w-8 h-8 text-yellow-400" />
                        Automation Control Center
                    </h1>
                    <p className="text-gray-400">
                        Real browser automation for scholarships & jobs
                    </p>
                </div>

                <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${state.status === 'running' ? 'bg-blue-500/20' :
                        state.status === 'paused_for_otp' ? 'bg-yellow-500/20' :
                            state.status === 'completed' ? 'bg-green-500/20' :
                                state.status === 'error' ? 'bg-red-500/20' :
                                    'bg-gray-500/20'
                    }`}>
                    <StatusIcon className={`w-5 h-5 ${statusColors[state.status]} ${state.status === 'running' ? 'animate-spin' : ''
                        }`} />
                    <span className={`font-medium ${statusColors[state.status]}`}>
                        {state.status.replace(/_/g, ' ').toUpperCase()}
                    </span>
                </div>
            </div>

            {/* OTP Modal */}
            <AnimatePresence>
                {state.status === 'paused_for_otp' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                    >
                        <Card className="border-2 border-yellow-500 bg-yellow-500/10">
                            <div className="flex items-center gap-3 mb-4">
                                <KeyRound className="w-6 h-6 text-yellow-400" />
                                <div>
                                    <h3 className="font-bold text-lg">Verification Required</h3>
                                    <p className="text-sm text-gray-400">
                                        {state.otpPlatform} needs verification. Check your email/phone.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    placeholder="Enter OTP/verification code"
                                    className="flex-1 px-4 py-3 rounded-xl bg-black/30 border border-yellow-500/30 focus:border-yellow-500 outline-none"
                                />
                                <Button
                                    onClick={submitOTP}
                                    icon={<Send className="w-4 h-4" />}
                                    className="bg-yellow-500 hover:bg-yellow-600"
                                >
                                    Submit
                                </Button>
                            </div>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Control Buttons */}
            <div className="grid grid-cols-3 gap-4">
                <Card
                    className="cursor-pointer hover:border-blue-500/50 transition-all"
                    onClick={() => startAutomation('bold-org')}
                >
                    <div className="text-center">
                        <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mx-auto mb-3">
                            <Rocket className="w-6 h-6 text-blue-400" />
                        </div>
                        <h3 className="font-bold">Bold.org</h3>
                        <p className="text-xs text-gray-400">Scholarship Auto-Apply</p>
                    </div>
                </Card>

                <Card
                    className="cursor-pointer hover:border-green-500/50 transition-all opacity-50"
                    onClick={() => toast.info('LinkedIn coming soon!')}
                >
                    <div className="text-center">
                        <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center mx-auto mb-3">
                            <Zap className="w-6 h-6 text-green-400" />
                        </div>
                        <h3 className="font-bold">LinkedIn</h3>
                        <p className="text-xs text-gray-400">Easy Apply Jobs</p>
                    </div>
                </Card>

                <Card
                    className="cursor-pointer hover:border-red-500/50 transition-all"
                    onClick={stopAutomation}
                >
                    <div className="text-center">
                        <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center mx-auto mb-3">
                            <Pause className="w-6 h-6 text-red-400" />
                        </div>
                        <h3 className="font-bold">Stop All</h3>
                        <p className="text-xs text-gray-400">Kill automation</p>
                    </div>
                </Card>
            </div>

            {/* Progress */}
            {state.status !== 'idle' && (
                <Card>
                    <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{state.currentStep || 'Initializing...'}</span>
                        <span className="text-sm text-gray-400">
                            {state.progress}/{state.totalSteps}
                        </span>
                    </div>
                    <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-gradient-to-r from-blue-500 to-cyan-400"
                            initial={{ width: 0 }}
                            animate={{ width: `${(state.progress / Math.max(state.totalSteps, 1)) * 100}%` }}
                        />
                    </div>
                </Card>
            )}

            {/* Live Logs */}
            <Card>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium flex items-center gap-2">
                        <Terminal className="w-4 h-4" />
                        Live Logs
                    </h3>
                    {state.status === 'running' && (
                        <span className="flex items-center gap-1 text-xs text-green-400">
                            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                            LIVE
                        </span>
                    )}
                </div>

                <div className="bg-black/50 rounded-xl p-4 h-64 overflow-y-auto font-mono text-sm space-y-1">
                    {state.logs.length === 0 ? (
                        <p className="text-gray-500">No logs yet. Start an automation to see output.</p>
                    ) : (
                        state.logs.map((log, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="text-gray-300"
                            >
                                {log}
                            </motion.div>
                        ))
                    )}
                </div>
            </Card>

            {/* User Info */}
            <Card className="bg-slate-800/50">
                <h3 className="font-medium mb-3">Profile Being Used</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="text-gray-400">Email:</span>
                        <span className="ml-2">ashah264@ucr.edu</span>
                    </div>
                    <div>
                        <span className="text-gray-400">Phone:</span>
                        <span className="ml-2">+1 (950) 906-2964</span>
                    </div>
                    <div>
                        <span className="text-gray-400">School:</span>
                        <span className="ml-2">UC Riverside</span>
                    </div>
                    <div>
                        <span className="text-gray-400">Major:</span>
                        <span className="ml-2">Computer Science</span>
                    </div>
                </div>
            </Card>
        </div>
    );
}
