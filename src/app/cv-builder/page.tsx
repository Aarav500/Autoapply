'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Button, StatusBadge, Input, Textarea, Tag } from '@/components/ui';
import { useS3Storage } from '@/lib/useS3Storage';
import { toast } from '@/lib/error-handling';
import { getAIConfig, AIConfig, AIProvider, setAPIKey } from '@/lib/ai-providers';
import { targetColleges } from '@/lib/colleges-data';
import {
    FileText,
    Briefcase,
    GraduationCap,
    Sparkles,
    Download,
    Copy,
    Eye,
    Loader2,
    User,
    Mail,
    Phone,
    MapPin,
    Globe,
    Github,
    Linkedin,
    ChevronRight,
    Plus,
    X,
    Key,
    RefreshCw
} from 'lucide-react';

// Types
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
    // NEW: Portfolio and research links
    portfolio: string;
    researchPaper: string;
}

type CVMode = 'job' | 'college';

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

export default function CVBuilderPage() {
    // Mode selection
    const [mode, setMode] = useState<CVMode>('job');
    const [selectedCollege, setSelectedCollege] = useState('mit');
    const [jobDescription, setJobDescription] = useState('');

    // User profile - fixed to use options object
    const profileStorage = useS3Storage<UserProfile>('cv-profile', { defaultValue: defaultProfile });
    const profile = profileStorage.data;
    const setProfile = profileStorage.setData;
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [profileForm, setProfileForm] = useState<UserProfile>(defaultProfile);

    // Data - fixed to use options object
    const activitiesStorage = useS3Storage<ActivityItem[]>('activities', { defaultValue: [] });
    const activities = activitiesStorage.data;
    const achievementsStorage = useS3Storage<Achievement[]>('achievements', { defaultValue: [] });
    const achievements = achievementsStorage.data;

    // Generation state
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedCV, setGeneratedCV] = useState('');

    // AI Config
    const [aiConfig, setAiConfig] = useState<AIConfig | null>(null);
    const [showAPIKeyModal, setShowAPIKeyModal] = useState(false);
    const [apiKeyInput, setApiKeyInput] = useState('');
    const [selectedProvider, setSelectedProvider] = useState<AIProvider>('gemini');

    const [hasServerKey, setHasServerKey] = useState(false);

    useEffect(() => {
        const checkServerKey = async () => {
            try {
                const response = await fetch('/api/ai/generate');
                if (response.ok) {
                    const data = await response.json();
                    if (data.available && data.providers.claude) {
                        setHasServerKey(true);
                        setAiConfig({ provider: 'claude', apiKey: 'env' });
                    }
                }
            } catch (err) {
                console.error('Failed to check server key:', err);
            }
        };

        checkServerKey();

        const config = getAIConfig();
        if (config) setAiConfig(config);
    }, []);

    useEffect(() => {
        if (profile) setProfileForm(profile);
    }, [profile]);

    const hasProfile = profile && profile.name && profile.email;
    const hasActivities = activities.length > 0;
    const college = targetColleges.find(c => c.id === selectedCollege) || targetColleges[0];

    // Generate CV
    const handleGenerateCV = async () => {
        if (!aiConfig && !hasServerKey) {
            setShowAPIKeyModal(true);
            toast.error('Please set up an AI API key first');
            return;
        }

        if (!hasProfile) {
            setShowProfileModal(true);
            toast.error('Please set up your profile first');
            return;
        }

        setIsGenerating(true);
        toast.info(`🚀 Generating ${mode === 'job' ? 'job-targeted' : 'college-targeted'} CV...`);

        try {
            const systemPrompt = mode === 'job'
                ? `You are an expert resume writer specializing in ATS-optimized resumes. Create a professional CV that:
- Matches keywords from the job description
- Quantifies achievements with numbers
- Uses strong action verbs
- Is concise and scannable
- Highlights relevant experience first

Format the CV in clean markdown with clear sections.`
                : `You are an expert at creating CVs for college applications. Create a CV that:
- Emphasizes leadership and initiative
- Shows breadth of interests and depth of commitment
- Highlights academic achievements
- Connects to ${college.name}'s values: ${college.research.values.join(', ')}
- What ${college.name} looks for: ${college.research.whatTheyLookFor.join(', ')}

Format the CV in clean markdown with clear sections.`;

            const activitiesText = activities.map(a =>
                `- ${a.name} | ${a.role} at ${a.organization} (${a.startDate} - ${a.endDate}): ${a.description}`
            ).join('\n');

            const achievementsText = achievements.map(a =>
                `- ${a.title} | ${a.org} (${a.date})`
            ).join('\n');

            const userMessage = mode === 'job'
                ? `Create a professional CV for this person targeting this job:

PERSONAL INFO:
Name: ${profile.name}
Email: ${profile.email}
Phone: ${profile.phone || 'Not provided'}
Location: ${profile.location || 'Not provided'}
${profile.linkedin ? `LinkedIn: ${profile.linkedin}` : ''}
${profile.github ? `GitHub: ${profile.github}` : ''}

PROFESSIONAL SUMMARY:
${profile.summary || 'Create a compelling summary based on my experience'}

MY ACTIVITIES & EXPERIENCE:
${activitiesText || 'No activities provided'}

MY ACHIEVEMENTS:
${achievementsText || 'No achievements provided'}

JOB DESCRIPTION TO TARGET:
${jobDescription || 'General software engineering position'}

Create a tailored, ATS-friendly CV in markdown format.`
                : `Create a CV for college application to ${college.name}:

PERSONAL INFO:
Name: ${profile.name}
Email: ${profile.email}
Phone: ${profile.phone || 'Not provided'}
Location: ${profile.location || 'Not provided'}
${profile.linkedin ? `LinkedIn: ${profile.linkedin}` : ''}
${profile.github ? `GitHub: ${profile.github}` : ''}

ABOUT ME:
${profile.summary || 'Create a compelling summary based on my activities'}

MY ACTIVITIES & EXPERIENCE:
${activitiesText || 'No activities provided'}

MY ACHIEVEMENTS:
${achievementsText || 'No achievements provided'}

TARGET COLLEGE: ${college.fullName}
College Values: ${college.research.values.join(', ')}
What They Look For: ${college.research.whatTheyLookFor.join(', ')}

Create a compelling CV that showcases my fit for ${college.name} in markdown format.`;

            // Call AI
            const response = await fetch('/api/ai/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: aiConfig?.provider || 'claude',
                    apiKey: aiConfig?.apiKey === 'env' ? '' : aiConfig?.apiKey,
                    systemPrompt,
                    userMessage,
                }),
            });

            if (!response.ok) {
                // Fallback: Generate locally with template
                const fallbackCV = generateFallbackCV(profile, activities, achievements, mode, college);
                setGeneratedCV(fallbackCV);
                toast.success('✨ CV generated with template!');
            } else {
                const data = await response.json();
                setGeneratedCV(data.text);
                toast.success('✨ CV generated successfully!');
            }
        } catch (error) {
            console.error('CV generation error:', error);
            // Use fallback
            const fallbackCV = generateFallbackCV(profile, activities, achievements, mode, college);
            setGeneratedCV(fallbackCV);
            toast.success('✨ CV generated with template!');
        } finally {
            setIsGenerating(false);
        }
    };

    // Fallback CV generator
    const generateFallbackCV = (
        profile: UserProfile,
        activities: ActivityItem[],
        achievements: Achievement[],
        mode: CVMode,
        college: typeof targetColleges[0]
    ): string => {
        const header = `# ${profile.name || 'Your Name'}

${profile.email || 'email@example.com'} | ${profile.phone || '(xxx) xxx-xxxx'} | ${profile.location || 'City, State'}
${profile.linkedin ? `[LinkedIn](${profile.linkedin})` : ''} ${profile.github ? `| [GitHub](${profile.github})` : ''}

---`;

        const summary = profile.summary
            ? `## Summary\n\n${profile.summary}\n\n---`
            : '';

        const experience = activities.length > 0
            ? `## Experience & Activities\n\n${activities.map(a => `### ${a.role} | ${a.organization}
*${a.startDate} - ${a.endDate}*

${a.description}

- Contributed ${a.hoursPerWeek * a.weeksPerYear} hours annually
`).join('\n')}\n---`
            : '';

        const achievementsSection = achievements.length > 0
            ? `## Achievements & Honors\n\n${achievements.map(a => `- **${a.title}** - ${a.org} (${a.date})`).join('\n')}\n\n---`
            : '';

        const footer = mode === 'college'
            ? `\n## Why ${college.name}\n\nI am excited to apply to ${college.name} because of its commitment to ${college.research.values[0].toLowerCase()} and ${college.research.values[1].toLowerCase()}. The ${college.research.notablePrograms[0]} program particularly aligns with my interests.`
            : '';

        return `${header}\n\n${summary}\n\n${experience}\n\n${achievementsSection}${footer}`;
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
                        <FileText className="w-8 h-8" style={{ color: 'var(--accent-primary)' }} />
                        CV Builder
                    </h1>
                    <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>
                        Generate tailored CVs for jobs or college applications
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button
                        variant="secondary"
                        onClick={() => setShowProfileModal(true)}
                        icon={<User className="w-4 h-4" />}
                    >
                        {hasProfile ? 'Edit Profile' : 'Setup Profile'}
                    </Button>
                    {!hasServerKey && !aiConfig && (
                        <Button
                            variant="secondary"
                            onClick={() => setShowAPIKeyModal(true)}
                            icon={<Key className="w-4 h-4" />}
                        >
                            Setup AI
                        </Button>
                    )}
                </div>
            </div>

            {/* Mode Selection */}
            <Card className="p-4">
                <div className="flex items-center gap-4">
                    <span className="font-medium">Target:</span>
                    <div className="flex gap-2">
                        <Button
                            variant={mode === 'job' ? 'primary' : 'secondary'}
                            onClick={() => setMode('job')}
                            icon={<Briefcase className="w-4 h-4" />}
                        >
                            Job Application
                        </Button>
                        <Button
                            variant={mode === 'college' ? 'primary' : 'secondary'}
                            onClick={() => setMode('college')}
                            icon={<GraduationCap className="w-4 h-4" />}
                        >
                            College Application
                        </Button>
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Panel - Configuration */}
                <div className="space-y-4">
                    {/* Target Input */}
                    <Card className="p-4">
                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                            {mode === 'job' ? (
                                <>
                                    <Briefcase className="w-5 h-5" style={{ color: 'var(--accent-gold)' }} />
                                    Job Description
                                </>
                            ) : (
                                <>
                                    <GraduationCap className="w-5 h-5" style={{ color: 'var(--accent-gold)' }} />
                                    Target College
                                </>
                            )}
                        </h3>

                        {mode === 'job' ? (
                            <Textarea
                                placeholder="Paste the job description here... The AI will match your experience to the requirements."
                                value={jobDescription}
                                onChange={e => setJobDescription(e.target.value)}
                                rows={8}
                            />
                        ) : (
                            <div className="space-y-3">
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
                                <div className="text-sm p-3 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                                    <p className="font-medium">{college.fullName}</p>
                                    <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>
                                        Values: {college.research.values.slice(0, 3).join(', ')}
                                    </p>
                                </div>
                            </div>
                        )}
                    </Card>

                    {/* Your Data */}
                    <Card className="p-4">
                        <h3 className="font-semibold mb-3">Your Data</h3>
                        <div className="space-y-2 text-sm">
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
                            <div className="flex items-center justify-between">
                                <span style={{ color: 'var(--text-secondary)' }}>Profile</span>
                                <StatusBadge status={hasProfile ? 'success' : 'warning'}>
                                    {hasProfile ? 'Complete' : 'Incomplete'}
                                </StatusBadge>
                            </div>
                        </div>
                        {!hasActivities && (
                            <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
                                Tip: Upload documents in /documents to auto-populate activities
                            </p>
                        )}
                    </Card>

                    {/* Generate Button */}
                    <Button
                        className="w-full"
                        onClick={handleGenerateCV}
                        loading={isGenerating}
                        disabled={isGenerating}
                        icon={<Sparkles className="w-5 h-5" />}
                    >
                        {isGenerating ? 'Generating...' : `Generate ${mode === 'job' ? 'Job' : 'College'} CV`}
                    </Button>
                </div>

                {/* Right Panel - Preview */}
                <Card className="p-4 min-h-[500px]">
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
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleGenerateCV}
                                    icon={<RefreshCw className="w-4 h-4" />}
                                >
                                    Regenerate
                                </Button>
                            </div>
                        )}
                    </div>

                    {generatedCV ? (
                        <div
                            className="prose prose-invert max-w-none p-4 rounded-lg overflow-auto"
                            style={{
                                background: 'var(--bg-secondary)',
                                maxHeight: '600px',
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
                            <p>Your generated CV will appear here</p>
                            <p className="text-sm mt-2">
                                {mode === 'job' ? 'Enter a job description and click Generate' : 'Select a college and click Generate'}
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

            {/* API Key Modal */}
            <AnimatePresence>
                {showAPIKeyModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center"
                        style={{ background: 'rgba(0, 0, 0, 0.7)' }}
                        onClick={() => setShowAPIKeyModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            className="w-full max-w-md mx-4"
                            onClick={e => e.stopPropagation()}
                        >
                            <Card className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-xl font-bold flex items-center gap-2">
                                        <Key className="w-5 h-5" style={{ color: 'var(--accent-gold)' }} />
                                        Claude API Key
                                    </h2>
                                    <Button variant="ghost" size="sm" onClick={() => setShowAPIKeyModal(false)}>
                                        <X className="w-5 h-5" />
                                    </Button>
                                </div>

                                <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                                    Enter your Claude API key for AI CV generation. Get one at{' '}
                                    <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer"
                                        style={{ color: 'var(--accent-primary)' }}>console.anthropic.com</a>
                                </p>

                                <div className="space-y-4">
                                    <Input
                                        type="password"
                                        placeholder="sk-ant-api03-..."
                                        value={apiKeyInput}
                                        onChange={e => setApiKeyInput(e.target.value)}
                                    />

                                    <Button
                                        className="w-full"
                                        onClick={() => {
                                            if (!apiKeyInput.trim()) {
                                                toast.error('Please enter an API key');
                                                return;
                                            }
                                            setAPIKey('claude', apiKeyInput);
                                            setAiConfig({ provider: 'claude', apiKey: apiKeyInput });
                                            setShowAPIKeyModal(false);
                                            setApiKeyInput('');
                                            toast.success('✅ Claude API key saved!');
                                        }}
                                    >
                                        Save API Key
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
