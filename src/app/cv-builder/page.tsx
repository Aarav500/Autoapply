'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Button, StatusBadge, Input, Textarea } from '@/components/ui';
import { useS3Storage } from '@/lib/useS3Storage';
import { STORAGE_KEYS } from '@/lib/s3-storage';
import { toast } from '@/lib/error-handling';
import { targetColleges } from '@/lib/colleges-data';
import {
    CVCompiler,
    CVTarget,
    ExperienceNode,
    CompiledCV
} from '@/lib/cv-compiler-v2';
import {
    extractExperienceGraph,
    PageLimit
} from '@/lib/cv-compiler';
import {
    RESEARCH_TARGETS,
    INDUSTRY_TARGETS,
    COLLEGE_TARGETS,
    ALL_TARGETS,
    getTargetById,
    GOLD_STANDARD
} from '@/lib/cv-targets';
import {
    FileText,
    Briefcase,
    GraduationCap,
    Sparkles,
    Download,
    Copy,
    Eye,
    User,
    X,
    Zap,
    Target,
    ChevronDown
} from 'lucide-react';


interface ActivityItem {
    id: string;
    name: string;
    role: string;
    organization: string;
    startDate: string;
    endDate: string;
    description: string;
    hoursPerWeek: number;
    weeksPerYear: number;
}

interface Achievement {
    id: string;
    title: string;
    org: string;
    date: string;
    category?: string;
    type?: string;
}

interface UserProfile {
    name: string;
    email: string;
    phone: string;
    location: string;
    website: string;
    linkedin: string;
    github: string;
    summary: string;
    portfolio: string;
    researchPaper: string;
}

const defaultProfile: UserProfile = {
    name: '',
    email: '',
    phone: '',
    location: '',
    website: '',
    linkedin: '',
    github: '',
    summary: '',
    portfolio: '',
    researchPaper: '',
};

export default function CVBuilderV2() {
    // Target selection - now uses predefined targets
    const [targetMode, setTargetMode] = useState<'research' | 'industry' | 'college'>('industry');
    const [selectedTargetId, setSelectedTargetId] = useState('google-ml');
    const [pageLimit, setPageLimit] = useState<PageLimit>(2);
    const [jobDescription, setJobDescription] = useState('');
    const [selectedCollege, setSelectedCollege] = useState('mit');

    // Data
    const profileStorage = useS3Storage<UserProfile>('cv-profile', { defaultValue: defaultProfile });
    const profile = profileStorage.data;
    const setProfile = profileStorage.setData;

    const activitiesStorage = useS3Storage<ActivityItem[]>(STORAGE_KEYS.ACTIVITIES, { defaultValue: [] });
    const activities = activitiesStorage.data;

    const achievementsStorage = useS3Storage<Achievement[]>(STORAGE_KEYS.ACHIEVEMENTS, { defaultValue: [] });
    const achievements = achievementsStorage.data;

    // Generated state
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedCV, setGeneratedCV] = useState('');
    const [experienceGraph, setExperienceGraph] = useState<ExperienceNode[]>([]);
    const [compiledResult, setCompiledResult] = useState<CompiledCV | null>(null);

    // Profile modal
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [profileForm, setProfileForm] = useState<UserProfile>(defaultProfile);

    // Get current targets based on mode
    const currentTargets = targetMode === 'research' ? RESEARCH_TARGETS :
        targetMode === 'industry' ? INDUSTRY_TARGETS : COLLEGE_TARGETS;

    // Auto-select first target when mode changes
    useEffect(() => {
        if (currentTargets.length > 0) {
            setSelectedTargetId(currentTargets[0].id);
        }
    }, [targetMode]);

    useEffect(() => {
        if (profile) setProfileForm(profile);
    }, [profile]);

    const hasProfile = profile && profile.name && profile.email;
    const hasActivities = activities.length > 0;

    // Get current target object
    const currentTarget = getTargetById(selectedTargetId) || currentTargets[0];

    // Generate CV using the new CVCompiler class
    const handleGenerateCV = () => {
        if (!hasProfile) {
            setShowProfileModal(true);
            toast.error('Please set up your profile first');
            return;
        }

        if (!hasActivities) {
            toast.error('No activities found. Please add activities first.');
            return;
        }

        if (!currentTarget) {
            toast.error('No target selected');
            return;
        }

        setIsGenerating(true);
        toast.info(`🚀 Compiling ${currentTarget.name} CV...`);

        try {
            // Step 1: Extract experience graph from activities
            console.log('[CV Compiler V2] Extracting experience graph from activities...');
            const graph = extractExperienceGraph(activities, achievements);
            setExperienceGraph(graph);
            console.log(`[CV Compiler V2] Extracted ${graph.length} experience nodes`);

            // Step 2: Create compiler and compile
            console.log('[CV Compiler V2] Creating compiler with target:', currentTarget);
            const compiler = new CVCompiler(graph, profile);
            const result = compiler.compile(currentTarget);

            setGeneratedCV(result.content);
            setCompiledResult(result);

            // Show gold standard expectation
            const goldStandard = GOLD_STANDARD[currentTarget.id];
            if (goldStandard) {
                console.log(`[CV Compiler V2] 🏆 Gold Standard: "${goldStandard}"`);
            }

            toast.success(`✅ ${currentTarget.name} CV compiled!`);
            console.log('[CV Compiler V2] Metadata:', result.metadata);

            // Show warnings/violations if any
            if (result.metadata.violations.length > 0) {
                toast.warning(`⚠️ ${result.metadata.violations.length} ban list violations removed`);
            }
            if (result.metadata.warnings.length > 0) {
                result.metadata.warnings.forEach(w => toast.warning(w));
            }

        } catch (error) {
            console.error('CV compilation error:', error);
            toast.error(`Compilation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsGenerating(false);
        }
    };

    // Copy to clipboard
    const copyToClipboard = () => {
        navigator.clipboard.writeText(generatedCV);
        toast.success('📋 CV copied to clipboard!');
    };

    // Save profile
    const handleSaveProfile = () => {
        setProfile(profileForm);
        setShowProfileModal(false);
        toast.success('✅ Profile saved!');
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
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <Zap className="w-8 h-8" style={{ color: 'var(--accent-primary)' }} />
                        CV Compiler v2
                    </h1>
                    <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>
                        Multi-target CV generation: Industry • Research • College
                    </p>
                </div>
                <Button
                    variant="secondary"
                    onClick={() => setShowProfileModal(true)}
                    icon={<User className="w-4 h-4" />}
                >
                    {hasProfile ? 'Edit Profile' : 'Setup Profile'}
                </Button>
            </div>

            {/* Target Selection */}
            <Card className="p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Target Audience
                </h3>

                {/* Mode selection */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                    <Button
                        variant={targetMode === 'industry' ? 'primary' : 'secondary'}
                        onClick={() => setTargetMode('industry')}
                        icon={<Briefcase className="w-4 h-4" />}
                        className="flex flex-col items-center gap-2 h-auto py-4"
                    >
                        <span>Industry</span>
                        <span className="text-xs opacity-70">Google • OpenAI • Quant</span>
                    </Button>
                    <Button
                        variant={targetMode === 'research' ? 'primary' : 'secondary'}
                        onClick={() => setTargetMode('research')}
                        icon={<GraduationCap className="w-4 h-4" />}
                        className="flex flex-col items-center gap-2 h-auto py-4"
                    >
                        <span>Research</span>
                        <span className="text-xs opacity-70">MIT ORC • CSAIL • PhD</span>
                    </Button>
                    <Button
                        variant={targetMode === 'college' ? 'primary' : 'secondary'}
                        onClick={() => setTargetMode('college')}
                        icon={<FileText className="w-4 h-4" />}
                        className="flex flex-col items-center gap-2 h-auto py-4"
                    >
                        <span>College</span>
                        <span className="text-xs opacity-70">Undergrad Admissions</span>
                    </Button>
                </div>

                {/* Specific target selector */}
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">
                        Specific Target ({currentTargets.length} available)
                    </label>
                    <select
                        value={selectedTargetId}
                        onChange={e => setSelectedTargetId(e.target.value)}
                        className="input-field w-full"
                    >
                        {currentTargets.map(t => (
                            <option key={t.id} value={t.id}>
                                {t.name}
                            </option>
                        ))}
                    </select>
                    {currentTarget && (
                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                            {currentTarget.description || `${currentTarget.type} CV, max ${currentTarget.pageLimit} pages`}
                        </p>
                    )}
                </div>

                {/* Page limit selector */}
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Page Limit</label>
                    <div className="flex gap-2">
                        {([1, 2, 3, 4] as PageLimit[]).map(limit => (
                            <Button
                                key={limit}
                                variant={pageLimit === limit ? 'primary' : 'secondary'}
                                size="sm"
                                onClick={() => setPageLimit(limit)}
                            >
                                {limit} page{limit > 1 ? 's' : ''}
                            </Button>
                        ))}
                    </div>
                </div>

                {/* Target-specific inputs */}
                {targetMode === 'industry' && (
                    <div>
                        <label className="block text-sm font-medium mb-2">Job Description (optional)</label>
                        <Textarea
                            placeholder="Paste the job description here... Keywords will boost matching experiences."
                            value={jobDescription}
                            onChange={e => setJobDescription(e.target.value)}
                            rows={4}
                        />
                    </div>
                )}
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Panel - Data Status */}
                <div className="space-y-4">
                    <Card className="p-4">
                        <h3 className="font-semibold mb-3">Data Status</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex items-center justify-between">
                                <span style={{ color: 'var(--text-secondary)' }}>Profile</span>
                                <StatusBadge status={hasProfile ? 'success' : 'warning'}>
                                    {hasProfile ? 'Complete' : 'Incomplete'}
                                </StatusBadge>
                            </div>
                            <div className="flex items-center justify-between">
                                <span style={{ color: 'var(--text-secondary)' }}>Activities</span>
                                <StatusBadge status={hasActivities ? 'success' : 'warning'}>
                                    {activities.length} loaded
                                </StatusBadge>
                            </div>
                            <div className="flex items-center justify-between">
                                <span style={{ color: 'var(--text-secondary)' }}>Achievements</span>
                                <StatusBadge status={achievements.length > 0 ? 'success' : 'neutral'}>
                                    {achievements.length} loaded
                                </StatusBadge>
                            </div>
                            {experienceGraph.length > 0 && (
                                <div className="flex items-center justify-between">
                                    <span style={{ color: 'var(--text-secondary)' }}>Experience Nodes</span>
                                    <StatusBadge status='success'>
                                        {experienceGraph.length} extracted
                                    </StatusBadge>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Metadata display */}
                    {compiledResult && (
                        <Card className="p-4">
                            <h3 className="font-semibold mb-3">CV Metadata</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex items-center justify-between">
                                    <span style={{ color: 'var(--text-secondary)' }}>Word Count</span>
                                    <span>{compiledResult.metadata.wordCount}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span style={{ color: 'var(--text-secondary)' }}>Experiences</span>
                                    <span>{compiledResult.metadata.experienceCount}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span style={{ color: 'var(--text-secondary)' }}>Publications</span>
                                    <span>{compiledResult.metadata.publicationCount}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span style={{ color: 'var(--text-secondary)' }}>Page Estimate</span>
                                    <span>{compiledResult.metadata.pageEstimate}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span style={{ color: 'var(--text-secondary)' }}>Signal Strength</span>
                                    <StatusBadge status={
                                        compiledResult.metadata.signal === 'elite' ? 'success' :
                                            compiledResult.metadata.signal === 'strong' ? 'success' :
                                                compiledResult.metadata.signal === 'medium' ? 'warning' : 'error'
                                    }>
                                        {compiledResult.metadata.signal}
                                    </StatusBadge>
                                </div>
                                {compiledResult.metadata.violations.length > 0 && (
                                    <div className="flex items-center justify-between">
                                        <span style={{ color: 'var(--text-secondary)' }}>Ban Violations</span>
                                        <StatusBadge status="error">
                                            {compiledResult.metadata.violations.length} removed
                                        </StatusBadge>
                                    </div>
                                )}
                            </div>
                        </Card>
                    )}

                    {/* Generate Button */}
                    <Button
                        className="w-full"
                        onClick={handleGenerateCV}
                        loading={isGenerating}
                        disabled={isGenerating}
                        icon={<Sparkles className="w-5 h-5" />}
                    >
                        {isGenerating ? 'Compiling...' : `Compile ${currentTarget?.name || 'CV'}`}
                    </Button>
                </div>

                {/* Right Panel - Preview */}
                <Card className="p-4 min-h-[600px]">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold flex items-center gap-2">
                            <Eye className="w-5 h-5" />
                            CV Preview
                        </h3>
                        {generatedCV && (
                            <div className="flex gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={async () => {
                                        try {
                                            const response = await fetch('/api/cv/download', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                    markdown: generatedCV,
                                                    profile: profile
                                                }),
                                            });
                                            if (!response.ok) throw new Error('Failed to generate PDF');
                                            const blob = await response.blob();
                                            const url = window.URL.createObjectURL(blob);
                                            const a = document.createElement('a');
                                            a.href = url;
                                            a.download = `CV_${profile?.name?.replace(/\s+/g, '_') || 'Professional'}.pdf`;
                                            document.body.appendChild(a);
                                            a.click();
                                            window.URL.revokeObjectURL(url);
                                            document.body.removeChild(a);
                                            toast.success('✅ PDF downloaded!');
                                        } catch (error) {
                                            toast.error('Failed to download PDF');
                                        }
                                    }}
                                    icon={<FileText className="w-4 h-4" />}
                                >
                                    Download PDF
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={copyToClipboard}
                                    icon={<Copy className="w-4 h-4" />}
                                >
                                    Copy
                                </Button>
                            </div>
                        )}
                    </div>

                    {generatedCV ? (
                        <div
                            className="prose prose-invert max-w-none p-4 rounded-lg overflow-auto"
                            style={{
                                background: 'var(--bg-secondary)',
                                maxHeight: '700px',
                                whiteSpace: 'pre-wrap',
                                fontFamily: 'monospace',
                                fontSize: '0.85rem'
                            }}
                        >
                            {generatedCV}
                        </div>
                    ) : (
                        <div
                            className="flex flex-col items-center justify-center h-full text-center"
                            style={{ color: 'var(--text-muted)' }}
                        >
                            <FileText className="w-16 h-16 mb-4 opacity-30" />
                            <p>Your compiled CV will appear here</p>
                            <p className="text-sm mt-2">
                                Select target and click Compile
                            </p>
                        </div>
                    )}
                </Card>
            </div>

            {/* Profile Modal */}
            <AnimatePresence>
                {showProfileModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center"
                        style={{ background: 'rgba(0, 0, 0, 0.7)' }}
                        onClick={() => setShowProfileModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            className="w-full max-w-lg mx-4 max-h-[90vh] overflow-auto"
                            onClick={e => e.stopPropagation()}
                        >
                            <Card className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-xl font-bold flex items-center gap-2">
                                        <User className="w-5 h-5" />
                                        Your Profile
                                    </h2>
                                    <Button variant="ghost" size="sm" onClick={() => setShowProfileModal(false)}>
                                        <X className="w-5 h-5" />
                                    </Button>
                                </div>

                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Full Name *</label>
                                            <Input
                                                placeholder="John Doe"
                                                value={profileForm.name}
                                                onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Email *</label>
                                            <Input
                                                placeholder="john@example.com"
                                                value={profileForm.email}
                                                onChange={e => setProfileForm(p => ({ ...p, email: e.target.value }))}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Phone</label>
                                            <Input
                                                placeholder="(555) 123-4567"
                                                value={profileForm.phone}
                                                onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Location</label>
                                            <Input
                                                placeholder="San Francisco, CA"
                                                value={profileForm.location}
                                                onChange={e => setProfileForm(p => ({ ...p, location: e.target.value }))}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">LinkedIn</label>
                                            <Input
                                                placeholder="linkedin.com/in/you"
                                                value={profileForm.linkedin}
                                                onChange={e => setProfileForm(p => ({ ...p, linkedin: e.target.value }))}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">GitHub</label>
                                            <Input
                                                placeholder="github.com/you"
                                                value={profileForm.github}
                                                onChange={e => setProfileForm(p => ({ ...p, github: e.target.value }))}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Portfolio URL</label>
                                            <Input
                                                placeholder="yourportfolio.com"
                                                value={profileForm.portfolio}
                                                onChange={e => setProfileForm(p => ({ ...p, portfolio: e.target.value }))}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Research Paper</label>
                                            <Input
                                                placeholder="arxiv.org/your-paper"
                                                value={profileForm.researchPaper}
                                                onChange={e => setProfileForm(p => ({ ...p, researchPaper: e.target.value }))}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">Summary</label>
                                        <Textarea
                                            placeholder="Brief professional summary or personal statement..."
                                            value={profileForm.summary}
                                            onChange={e => setProfileForm(p => ({ ...p, summary: e.target.value }))}
                                            rows={3}
                                        />
                                    </div>

                                    <Button className="w-full" onClick={handleSaveProfile}>
                                        Save Profile
                                    </Button>
                                </div>
                            </Card>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div >
    );
}
