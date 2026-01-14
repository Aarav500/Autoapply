'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Button, StatusBadge, Input, Textarea } from '@/components/ui';
import { useS3Storage } from '@/lib/useS3Storage';
import { toast } from '@/lib/error-handling';
import { targetColleges } from '@/lib/colleges-data';
import {
    extractExperienceGraph,
    compileCV,
    CVTarget,
    PageLimit,
    ExperienceNode,
    CVCompilerOptions
} from '@/lib/cv-compiler';
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
    Target
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
    // Target selection
    const [target, setTarget] = useState<CVTarget>('industry');
    const [pageLimit, setPageLimit] = useState<PageLimit>(1);
    const [jobDescription, setJobDescription] = useState('');
    const [selectedCollege, setSelectedCollege] = useState('mit');

    // Data
    const profileStorage = useS3Storage<UserProfile>('cv-profile', { defaultValue: defaultProfile });
    const profile = profileStorage.data;
    const setProfile = profileStorage.setData;

    const activitiesStorage = useS3Storage<ActivityItem[]>('activities', { defaultValue: [] });
    const activities = activitiesStorage.data;

    const achievementsStorage = useS3Storage<Achievement[]>('achievements', { defaultValue: [] });
    const achievements = achievementsStorage.data;

    // Generated state
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedCV, setGeneratedCV] = useState('');
    const [experienceGraph, setExperienceGraph] = useState<ExperienceNode[]>([]);
    const [metadata, setMetadata] = useState<any>(null);

    // Profile modal
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [profileForm, setProfileForm] = useState<UserProfile>(defaultProfile);

    useEffect(() => {
        if (profile) setProfileForm(profile);
    }, [profile]);

    const hasProfile = profile && profile.name && profile.email;
    const hasActivities = activities.length > 0;

    // Generate CV using the compiler
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

        setIsGenerating(true);
        toast.info(`🚀 Compiling ${target} CV...`);

        try {
            // Step 1: Extract experience graph
            console.log('[CV Compiler] Extracting experience graph from activities...');
            const graph = extractExperienceGraph(activities, achievements);
            setExperienceGraph(graph);
            console.log(`[CV Compiler] Extracted ${graph.length} experience nodes`);

            // Step 2: Compile CV
            const options: CVCompilerOptions = {
                target,
                pageLimit,
                jobDescription: target === 'industry' ? jobDescription : undefined,
                collegeId: target === 'college' ? selectedCollege : undefined,
                emphasis: target === 'research' ? 'research' : target === 'industry' ? 'technical' : 'impact'
            };

            console.log('[CV Compiler] Compiling CV with options:', options);
            const result = compileCV(graph, profile, options);

            setGeneratedCV(result.content);
            setMetadata(result.metadata);

            toast.success(`✅ ${target.toUpperCase()} CV compiled successfully!`);
            console.log('[CV Compiler] Metadata:', result.metadata);

            // Show warnings if any
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

                <div className="grid grid-cols-3 gap-4 mb-6">
                    <Button
                        variant={target === 'industry' ? 'primary' : 'secondary'}
                        onClick={() => setTarget('industry')}
                        icon={<Briefcase className="w-4 h-4" />}
                        className="flex flex-col items-center gap-2 h-auto py-4"
                    >
                        <span>Industry</span>
                        <span className="text-xs opacity-70">Google • Meta • OpenAI</span>
                    </Button>
                    <Button
                        variant={target === 'research' ? 'primary' : 'secondary'}
                        onClick={() => setTarget('research')}
                        icon={<GraduationCap className="w-4 h-4" />}
                        className="flex flex-col items-center gap-2 h-auto py-4"
                    >
                        <span>Research</span>
                        <span className="text-xs opacity-70">MIT CSAIL • Labs • PhD</span>
                    </Button>
                    <Button
                        variant={target === 'college' ? 'primary' : 'secondary'}
                        onClick={() => setTarget('college')}
                        icon={<FileText className="w-4 h-4" />}
                        className="flex flex-col items-center gap-2 h-auto py-4"
                    >
                        <span>College</span>
                        <span className="text-xs opacity-70">Undergrad Admissions</span>
                    </Button>
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
                {target === 'industry' && (
                    <div>
                        <label className="block text-sm font-medium mb-2">Job Description</label>
                        <Textarea
                            placeholder="Paste the job description here... Keywords will be automatically extracted."
                            value={jobDescription}
                            onChange={e => setJobDescription(e.target.value)}
                            rows={6}
                        />
                    </div>
                )}

                {target === 'college' && (
                    <div>
                        <label className="block text-sm font-medium mb-2">Target College</label>
                        <select
                            value={selectedCollege}
                            onChange={e => setSelectedCollege(e.target.value)}
                            className="input-field w-full"
                        >
                            {targetColleges.map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.name} - {c.fullName}
                                </option>
                            ))}
                        </select>
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
                    {metadata && (
                        <Card className="p-4">
                            <h3 className="font-semibold mb-3">CV Metadata</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex items-center justify-between">
                                    <span style={{ color: 'var(--text-secondary)' }}>Word Count</span>
                                    <span>{metadata.wordCount}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span style={{ color: 'var(--text-secondary)' }}>Experiences</span>
                                    <span>{metadata.experienceCount}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span style={{ color: 'var(--text-secondary)' }}>Publications</span>
                                    <span>{metadata.publicationCount}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span style={{ color: 'var(--text-secondary)' }}>Signal Strength</span>
                                    <StatusBadge status={
                                        metadata.signal === 'strong' ? 'success' :
                                        metadata.signal === 'medium' ? 'warning' : 'error'
                                    }>
                                        {metadata.signal}
                                    </StatusBadge>
                                </div>
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
                        {isGenerating ? 'Compiling...' : `Compile ${target.toUpperCase()} CV`}
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
        </motion.div>
    );
}
