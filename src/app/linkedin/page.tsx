'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Button, StatusBadge, ProgressBar } from '@/components/ui';
import {
    Linkedin, User, Briefcase, FileText,
    Users, Eye, TrendingUp, Sparkles,
    RefreshCw, Zap, Rocket, Globe,
    Upload, FileCode, CheckCircle2, ChevronRight
} from 'lucide-react';
import { toast } from '@/lib/error-handling';
import { ProfileReview } from '@/components/automation/ProfileReview';
import { ContentCalendar } from '@/components/automation/ContentCalendar';
import { LinkedInProfileGraph } from '@/lib/linkedin/profile-graph';
import { useDropzone } from 'react-dropzone';

export default function LinkedInPage() {
    const [profileData, setProfileData] = useState<LinkedInProfileGraph | null>(null);
    const [isIngesting, setIsIngesting] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'profile' | 'posts' | 'network'>('overview');

    const onDrop = async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (!file) return;

        setIsIngesting(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', file.name.endsWith('.pdf') ? 'pdf' : 'html');

        try {
            const res = await fetch('/api/linkedin/ingest', {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();
            if (data.success) {
                setProfileData({
                    snapshot: data.snapshot,
                    recommendations: data.analysis.recommendations,
                    score: data.analysis.score,
                });
                toast.success('Profile ingested successfully!');
                setActiveTab('profile');
            } else {
                toast.error(data.error || 'Failed to ingest profile');
            }
        } catch (err) {
            toast.error('Error uploading profile');
        } finally {
            setIsIngesting(false);
        }
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'text/html': ['.html', '.htm']
        },
        multiple: false
    });

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
                        <Linkedin className="w-8 h-8" style={{ color: '#0077B5' }} />
                        LinkedIn Intelligence
                    </h1>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        Ingest your profile data to get AI-powered optimizations and growth strategies.
                    </p>
                </div>

                {profileData && (
                    <div className="flex gap-3">
                        <Button
                            variant="secondary"
                            icon={<RefreshCw className="w-4 h-4" />}
                            onClick={() => setProfileData(null)}
                        >
                            Reset Snapshot
                        </Button>
                    </div>
                )}
            </div>

            {/* Ingestion Area (If no data) */}
            {!profileData && (
                <Card className="p-12 border-2 border-dashed border-gray-200 flex flex-col items-center text-center space-y-4 hover:border-blue-400 transition-colors cursor-pointer" {...getRootProps()}>
                    <input {...getInputProps()} />
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 mb-2">
                        {isIngesting ? <RefreshCw className="w-8 h-8 animate-spin" /> : <Upload className="w-8 h-8" />}
                    </div>
                    <div>
                        <h3 className="text-xl font-bold">Ingest LinkedIn Data</h3>
                        <p className="text-gray-500 max-w-md mx-auto">
                            Upload your LinkedIn "Profile PDF" or "Download your data" HTML export to begin the analysis.
                        </p>
                    </div>
                    <div className="flex gap-4 text-xs font-semibold text-gray-400 uppercase tracking-widest mt-4">
                        <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> No Scraper Required</span>
                        <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Privacy Focused</span>
                    </div>
                    {isDragActive && (
                        <div className="absolute inset-0 bg-blue-500/10 flex items-center justify-center rounded-xl">
                            <p className="font-bold text-blue-600">Drop your file here</p>
                        </div>
                    )}
                </Card>
            )}

            {profileData && (
                <>
                    {/* Tabs */}
                    <div className="flex gap-2 p-1 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
                        {[
                            { key: 'overview', label: 'Overview', icon: TrendingUp },
                            { key: 'profile', label: 'Profile Optimization', icon: User },
                            { key: 'posts', label: 'Content Factory', icon: FileCode },
                            { key: 'network', label: 'Strategic Growth', icon: Users },
                        ].map(({ key, label, icon: Icon }) => (
                            <button
                                key={key}
                                onClick={() => setActiveTab(key as any)}
                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all`}
                                style={{
                                    background: activeTab === key ? 'var(--gradient-primary)' : 'transparent',
                                    color: activeTab === key ? 'white' : 'var(--text-secondary)',
                                }}
                            >
                                <Icon className="w-4 h-4" />
                                {label}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <AnimatePresence mode="wait">
                        {activeTab === 'overview' && (
                            <motion.div
                                key="overview"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="grid grid-cols-1 md:grid-cols-2 gap-6"
                            >
                                <Card className="p-6 space-y-4">
                                    <h3 className="font-bold text-lg flex items-center gap-2">
                                        <Rocket className="w-5 h-5 text-blue-500" />
                                        Your Profile Snapshot
                                    </h3>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-start p-3 bg-gray-50 rounded-lg">
                                            <span className="text-sm font-medium">Full Name</span>
                                            <span className="text-sm text-gray-800 font-bold ml-4 text-right">
                                                {profileData.snapshot.fullName || 'Not Found'}
                                            </span>
                                        </div>
                                        <div className="p-3 bg-gray-50 rounded-lg">
                                            <span className="text-sm font-medium block mb-1">Headline</span>
                                            <span className="text-sm text-gray-700 italic leading-relaxed">
                                                {profileData.snapshot.headline ? `"${profileData.snapshot.headline}"` : 'No headline detected'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                            <span className="text-sm font-medium">Positions Detected</span>
                                            <span className="text-sm text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded">
                                                {profileData.snapshot.positions.length}
                                            </span>
                                        </div>
                                    </div>
                                </Card>

                                <Card className="p-6 space-y-4">
                                    <h3 className="font-bold text-lg flex items-center gap-2">
                                        <Zap className="w-5 h-5 text-yellow-500" />
                                        Quick Actions
                                    </h3>
                                    <div className="space-y-2">
                                        <Button
                                            className="w-full justify-between"
                                            variant="secondary"
                                            onClick={() => setActiveTab('profile')}
                                            icon={<ChevronRight className="w-4 h-4" />}
                                        >
                                            Fix {profileData.recommendations.length} profile issues
                                        </Button>
                                        <Button
                                            className="w-full justify-between"
                                            variant="secondary"
                                            onClick={() => setActiveTab('posts')}
                                            icon={<ChevronRight className="w-4 h-4" />}
                                        >
                                            Generate post from latest activity
                                        </Button>
                                    </div>
                                </Card>
                            </motion.div>
                        )}

                        {activeTab === 'profile' && (
                            <motion.div
                                key="profile"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                            >
                                <ProfileReview data={profileData} onRefresh={() => setProfileData(null)} />
                            </motion.div>
                        )}

                        {activeTab === 'posts' && (
                            <motion.div
                                key="posts"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-4"
                            >
                                <Card className="bg-blue-50 p-6">
                                    <h3 className="font-bold text-blue-900 mb-2">Automated Content Strategy</h3>
                                    <p className="text-sm text-blue-700 mb-4">
                                        Generate engagement-optimized posts from your activities and achievements.
                                        Every claim is verified against your internal data.
                                    </p>
                                    <Button
                                        icon={<Sparkles className="w-4 h-4" />}
                                        onClick={() => {
                                            toast.success("Initializing Post Factory Engine...");
                                            // Trigger generation logic here if API is ready
                                        }}
                                    >
                                        Run Post Factory
                                    </Button>
                                </Card>
                                <ContentCalendar schedule={[]} />
                            </motion.div>
                        )}

                        {activeTab === 'network' && (
                            <motion.div
                                key="network"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-4"
                            >
                                <Card className="p-8 text-center space-y-4">
                                    <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 mx-auto">
                                        <Users className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-xl font-bold">Strategic Growth Explorer</h3>
                                    <p className="text-gray-500 max-w-md mx-auto">
                                        Discover high-relevance networking targets from off-platform sources (tech blogs, GitHub, alumni pages).
                                    </p>
                                    <Button
                                        variant="secondary"
                                        onClick={() => {
                                            toast.success("Starting Target Discovery Crawl...");
                                        }}
                                    >
                                        Initialize Target Discovery
                                    </Button>
                                </Card>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </>
            )}
        </motion.div>
    );
}

