'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Button, ProgressBar } from '@/components/ui';
import {
    Zap, Play, Pause, RefreshCw, AlertCircle, CheckCircle,
    Terminal, Clock, Rocket, KeyRound, Send, Loader2,
    Link, Globe, User, FileText, GraduationCap, Briefcase
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

const USER_PROFILE = {
    firstName: 'Aarav',
    lastName: 'Shah',
    email: 'ashah264@ucr.edu',
    phone: '+1 (950) 906-2964',
    school: 'UC Riverside',
    major: 'Computer Science',
    gpa: '3.9',
    graduationYear: '2026',
    linkedIn: 'linkedin.com/in/aarav-shah-9b878329a',
};

export default function FormFillerPage() {
    const [url, setUrl] = useState('');
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

    const startFillForm = async () => {
        if (!url.trim()) {
            toast.error('Please enter a URL');
            return;
        }

        try {
            const res = await fetch('/api/automation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'fill-form', url: url.trim() }),
            });
            const data = await res.json();

            if (data.success) {
                toast.success('🚀 Form filler started!');
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

    const statusColors: Record<string, string> = {
        idle: 'text-gray-400',
        running: 'text-blue-400',
        paused_for_otp: 'text-yellow-400',
        completed: 'text-green-400',
        error: 'text-red-400',
    };

    const StatusIcon = state.status === 'running' ? Loader2 :
        state.status === 'paused_for_otp' ? KeyRound :
            state.status === 'completed' ? CheckCircle :
                state.status === 'error' ? AlertCircle : Clock;

    return (
        <div className="max-w-5xl mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="text-center mb-8">
                <h1 className="text-4xl font-bold flex items-center justify-center gap-3 mb-2">
                    <Zap className="w-10 h-10 text-yellow-400" />
                    Universal Form Filler
                </h1>
                <p className="text-gray-400 text-lg">
                    Paste any URL. We'll detect the form and fill it automatically.
                </p>
            </div>

            {/* URL Input */}
            <Card className="p-6">
                <div className="flex gap-4">
                    <div className="flex-1 relative">
                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="url"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://bold.org/scholarships/example-scholarship"
                            className="w-full pl-12 pr-4 py-4 rounded-xl bg-black/30 border border-gray-700 focus:border-blue-500 outline-none text-lg"
                        />
                    </div>

                    {state.status === 'running' ? (
                        <Button
                            size="lg"
                            onClick={stopAutomation}
                            className="bg-red-500 hover:bg-red-600 px-8"
                            icon={<Pause className="w-5 h-5" />}
                        >
                            Stop
                        </Button>
                    ) : (
                        <Button
                            size="lg"
                            onClick={startFillForm}
                            className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 px-8"
                            icon={<Play className="w-5 h-5" />}
                        >
                            Fill Form
                        </Button>
                    )}
                </div>

                {/* Status Badge */}
                <div className="flex items-center justify-center mt-4">
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
            </Card>

            {/* OTP Modal */}
            <AnimatePresence>
                {state.status === 'paused_for_otp' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                    >
                        <Card className="border-2 border-yellow-500 bg-yellow-500/10 p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <KeyRound className="w-8 h-8 text-yellow-400" />
                                <div>
                                    <h3 className="font-bold text-xl">Verification Required</h3>
                                    <p className="text-gray-400">
                                        The website needs verification. Check your email/phone for a code.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    placeholder="Enter verification code"
                                    className="flex-1 px-4 py-3 rounded-xl bg-black/30 border border-yellow-500/30 focus:border-yellow-500 outline-none text-lg"
                                />
                                <Button
                                    onClick={submitOTP}
                                    icon={<Send className="w-5 h-5" />}
                                    className="bg-yellow-500 hover:bg-yellow-600 px-6"
                                >
                                    Submit
                                </Button>
                            </div>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Progress & Logs */}
            {state.status !== 'idle' && (
                <Card className="p-6">
                    <div className="flex items-center justify-between mb-3">
                        <span className="font-semibold text-lg">{state.currentStep || 'Initializing...'}</span>
                        <span className="text-gray-400">
                            Step {state.progress} of {state.totalSteps}
                        </span>
                    </div>
                    <div className="h-3 bg-gray-800 rounded-full overflow-hidden mb-4">
                        <motion.div
                            className="h-full bg-gradient-to-r from-blue-500 to-cyan-400"
                            initial={{ width: 0 }}
                            animate={{ width: `${(state.progress / Math.max(state.totalSteps, 1)) * 100}%` }}
                        />
                    </div>

                    {/* Logs */}
                    <div className="bg-black/50 rounded-xl p-4 h-48 overflow-y-auto font-mono text-sm space-y-1">
                        {state.logs.length === 0 ? (
                            <p className="text-gray-500">Waiting for logs...</p>
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
            )}

            {/* Profile Preview */}
            <Card className="p-6 bg-slate-800/50">
                <div className="flex items-center gap-3 mb-4">
                    <User className="w-6 h-6 text-blue-400" />
                    <h3 className="font-semibold text-lg">Profile Data (Auto-Fill Source)</h3>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="p-3 bg-black/30 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Name</p>
                        <p className="font-medium">{USER_PROFILE.firstName} {USER_PROFILE.lastName}</p>
                    </div>
                    <div className="p-3 bg-black/30 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Email</p>
                        <p className="font-medium">{USER_PROFILE.email}</p>
                    </div>
                    <div className="p-3 bg-black/30 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Phone</p>
                        <p className="font-medium">{USER_PROFILE.phone}</p>
                    </div>
                    <div className="p-3 bg-black/30 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">School</p>
                        <p className="font-medium">{USER_PROFILE.school}</p>
                    </div>
                    <div className="p-3 bg-black/30 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">Major</p>
                        <p className="font-medium">{USER_PROFILE.major}</p>
                    </div>
                    <div className="p-3 bg-black/30 rounded-lg">
                        <p className="text-xs text-gray-500 mb-1">GPA</p>
                        <p className="font-medium">{USER_PROFILE.gpa}</p>
                    </div>
                </div>
            </Card>

            {/* Quick Links */}
            <div className="grid grid-cols-3 gap-4">
                <Card
                    className="p-4 cursor-pointer hover:border-blue-500/50 transition-all text-center"
                    onClick={() => setUrl('https://bold.org/scholarships/')}
                >
                    <GraduationCap className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                    <p className="font-medium">Bold.org</p>
                    <p className="text-xs text-gray-400">Scholarships</p>
                </Card>

                <Card
                    className="p-4 cursor-pointer hover:border-green-500/50 transition-all text-center"
                    onClick={() => setUrl('https://www.linkedin.com/jobs/')}
                >
                    <Briefcase className="w-8 h-8 text-green-400 mx-auto mb-2" />
                    <p className="font-medium">LinkedIn</p>
                    <p className="text-xs text-gray-400">Jobs</p>
                </Card>

                <Card
                    className="p-4 cursor-pointer hover:border-purple-500/50 transition-all text-center"
                    onClick={() => setUrl('https://www.fastweb.com/')}
                >
                    <FileText className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                    <p className="font-medium">Fastweb</p>
                    <p className="text-xs text-gray-400">Scholarships</p>
                </Card>
            </div>
        </div>
    );
}
