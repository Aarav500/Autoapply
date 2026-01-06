'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import { Card, Button, StatusBadge, ProgressBar, Input } from '@/components/ui';
import { CountdownTimer } from '@/components/CountdownTimer';
import { targetColleges } from '@/lib/colleges-data';
import { useS3Storage } from '@/lib/useS3Storage';
import { essayStorage, EssayDraft } from '@/lib/storage';
import { toast } from '@/lib/error-handling';
import {
    ArrowLeft,
    Sparkles,
    RefreshCw,
    Check,
    MessageSquare,
    History,
    Save,
    Copy,
    ThumbsUp,
    ThumbsDown,
    Lightbulb,
    AlertCircle,
    Send,
    Zap,
    Heart,
    GraduationCap,
    Users,
    Star,
    MapPin,
    ExternalLink,
    ChevronDown,
    ChevronUp,
    Key,
    X
} from 'lucide-react';
import Link from 'next/link';

interface Feedback {
    type: 'strength' | 'improvement' | 'suggestion';
    text: string;
    applied?: boolean;
}

interface EssayVersion {
    id: number;
    content: string;
    confidence: number;
    timestamp: Date;
}

// Activity interface from documents page
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

// Essay progress type
interface EssayProgressData {
    [collegeId: string]: { completed: number };
}

export default function CollegeEssayPage() {
    const params = useParams();
    const router = useRouter();
    const collegeId = params.college as string;

    // Find college data
    const college = useMemo(() =>
        targetColleges.find(c => c.id === collegeId),
        [collegeId]
    );

    const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
    const [essayContent, setEssayContent] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isReviewing, setIsReviewing] = useState(false);
    const [confidence, setConfidence] = useState(0);
    const [feedback, setFeedback] = useState<Feedback[]>([]);
    const [showChat, setShowChat] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [showResearch, setShowResearch] = useState(true);
    const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [versions, setVersions] = useState<EssayVersion[]>([]);

    // Load activities from storage (to pass to AI)
    const { data: activities } = useS3Storage<ActivityItem[]>('activities', { defaultValue: [] });

    // Load and save essay progress
    const { data: essayProgress, setData: setEssayProgress } = useS3Storage<EssayProgressData>(
        'essay-progress',
        { defaultValue: {} }
    );

    // Load saved essay from essayStorage on mount or when prompt changes
    useEffect(() => {
        if (collegeId && selectedPromptId) {
            const savedEssay = essayStorage.loadEssay(collegeId, selectedPromptId);
            if (savedEssay && savedEssay.content) {
                setEssayContent(savedEssay.content);
                toast.success(`📂 Loaded saved essay draft (${savedEssay.wordCount} words)`);
            }
        }
    }, [collegeId, selectedPromptId]);

    // Auto-save essay when content changes
    useEffect(() => {
        if (collegeId && selectedPromptId && essayContent.trim()) {
            const timeoutId = setTimeout(() => {
                essayStorage.saveEssay(collegeId, selectedPromptId, essayContent);
                console.log('📝 Auto-saved essay');
            }, 2000);
            return () => clearTimeout(timeoutId);
        }
    }, [essayContent, collegeId, selectedPromptId]);

    const selectedPrompt = useMemo(() =>
        college?.essays.find(e => e.id === selectedPromptId),
        [college, selectedPromptId]
    );

    if (!college) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <AlertCircle className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--error)' }} />
                    <h2 className="text-xl font-bold mb-2">College Not Found</h2>
                    <p className="text-muted mb-4">The college "{collegeId}" was not found.</p>
                    <Link href="/essays">
                        <Button>Back to Essays</Button>
                    </Link>
                </div>
            </div>
        );
    }

    const wordCount = essayContent.trim().split(/\s+/).filter(Boolean).length;
    const wordLimit = selectedPrompt?.wordLimit || 250;
    const isOverLimit = wordCount > wordLimit;

    const handleGenerateEssay = async () => {
        if (!selectedPrompt || !college) return;

        setIsGenerating(true);
        toast.info('🚀 Generating personalized essay with AI...');

        try {
            // Prepare activities for AI
            const formattedActivities = activities.slice(0, 5).map(a => ({
                name: a.name,
                description: `${a.role} at ${a.organization}. ${a.description}`,
                impact: `${a.hoursPerWeek * a.weeksPerYear} total hours committed`,
            }));

            // Call SERVER-SIDE API (uses GitHub secrets - no client API key needed!)
            const response = await fetch('/api/essays/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: selectedPrompt.prompt,
                    college: {
                        name: college.name,
                        values: college.research.values,
                        whatTheyLookFor: college.research.whatTheyLookFor,
                        culture: college.research.culture,
                        notablePrograms: college.research.notablePrograms,
                    },
                    activities: formattedActivities.length > 0 ? formattedActivities : [
                        { name: 'Your Activity', description: 'Add activities in Documents page', impact: 'AI will personalize based on your experiences' }
                    ],
                    wordLimit: selectedPrompt.wordLimit,
                    tone: 'confident',
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to generate essay');
            }

            const result = await response.json();
            const generatedEssay = result.essay;

            setEssayContent(generatedEssay);

            // Save to essayStorage
            essayStorage.saveEssay(collegeId, selectedPromptId!, generatedEssay);

            toast.success(`✨ Essay generated with ${result.provider}! (${result.wordCount} words)`);

            // Auto-review
            await handleReviewEssay(generatedEssay);
        } catch (error) {
            console.error('AI generation error:', error);
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            toast.error(`❌ Failed to generate essay: ${errorMsg}`);
        } finally {
            setIsGenerating(false);
        }
    };


    const handleReviewEssay = async (content?: string) => {
        if (!college || !selectedPrompt) return;

        setIsReviewing(true);
        const textToReview = content || essayContent;
        const words = textToReview.trim().split(/\s+/).length;
        const wordLimit = selectedPrompt.wordLimit;

        // Simulate review delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        try {
            // Calculate confidence based on various factors
            let score = 50;

            // Word count scoring
            if (words >= wordLimit * 0.9 && words <= wordLimit) {
                score += 20; // Good word count
            } else if (words >= wordLimit * 0.7) {
                score += 10; // Acceptable word count
            }

            // Check for college name mentions
            if (textToReview.toLowerCase().includes(college.name.toLowerCase())) {
                score += 10;
            }

            // Check for specific details (longer sentences indicate more detail)
            const avgSentenceLength = words / (textToReview.split(/[.!?]+/).length || 1);
            if (avgSentenceLength > 15 && avgSentenceLength < 25) {
                score += 10;
            }

            // Cap at 95
            score = Math.min(score, 95);

            setConfidence(score);

            const aiFeedback: Feedback[] = [];

            if (words < wordLimit * 0.9) {
                aiFeedback.push({
                    type: 'improvement',
                    text: `Essay is ${wordLimit - words} words short of the limit. Add more specific examples.`
                });
            }
            if (words > wordLimit) {
                aiFeedback.push({
                    type: 'improvement',
                    text: `Essay is ${words - wordLimit} words over the limit. Consider condensing.`
                });
            }
            if (!textToReview.toLowerCase().includes(college.name.toLowerCase())) {
                aiFeedback.push({
                    type: 'suggestion',
                    text: `Consider mentioning ${college.name} directly to show specific interest.`
                });
            }
            if (score >= 80) {
                aiFeedback.push({
                    type: 'strength',
                    text: 'Good essay structure and length!'
                });
            }

            setFeedback(aiFeedback.slice(0, 6));
            toast.success(`📊 Essay scored ${score}% confidence`);

            // Save version
            setVersions(prev => [...prev, {
                id: prev.length + 1,
                content: textToReview,
                confidence: score,
                timestamp: new Date(),
            }]);
        } catch (error) {
            console.error('Review error:', error);
            setConfidence(60);
            setFeedback([{
                type: 'suggestion',
                text: 'Continue refining your essay for better results.',
            }]);
        } finally {
            setIsReviewing(false);
        }
    };

    const handleApplyAllSuggestions = async () => {
        setIsGenerating(true);
        await new Promise(resolve => setTimeout(resolve, 2500));

        // Simulate improved essay
        const improved = essayContent + '\n\n[Essay improved based on feedback - references to specific programs and deeper personal reflection added]';
        setEssayContent(improved);
        setConfidence(Math.min(confidence + 15, 95));

        // Mark feedback as applied
        setFeedback(feedback.map(f => ({ ...f, applied: true })));
        setIsGenerating(false);
    };

    const handleSendChat = () => {
        if (!chatInput.trim()) return;

        setChatMessages(prev => [
            ...prev,
            { role: 'user', content: chatInput },
            {
                role: 'assistant',
                content: `Based on ${college.name}'s emphasis on "${college.research.values[0]}" and your question about "${chatInput.slice(0, 30)}...", I'd suggest focusing on specific examples from your activities that demonstrate this quality. ${college.name}'s admissions looks for students who show "${college.research.whatTheyLookFor[0]}" - can you think of a moment that captures this?`
            }
        ]);
        setChatInput('');
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
        >
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/essays">
                        <Button variant="ghost" size="sm" icon={<ArrowLeft className="w-4 h-4" />}>
                            Back
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <span>{college.name}</span>
                            <span className="text-sm font-normal" style={{ color: 'var(--text-muted)' }}>
                                {college.fullName}
                            </span>
                        </h1>
                        <div className="flex items-center gap-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                            <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> {college.location}
                            </span>
                            <span>•</span>
                            <span>Acceptance: {college.transferInfo.acceptanceRate}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <CountdownTimer deadline={college.deadline} compact />
                    <a href={college.applicationUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="secondary" size="sm" icon={<ExternalLink className="w-4 h-4" />}>
                            Apply
                        </Button>
                    </a>
                </div>
            </div>

            {/* College Research Panel (Collapsible) */}
            <Card className="overflow-hidden">
                <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setShowResearch(!showResearch)}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--gradient-accent)' }}>
                            <Lightbulb className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="font-semibold">College Research & Insights</h3>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                Use these to personalize your essay with a human touch
                            </p>
                        </div>
                    </div>
                    <Button variant="ghost" size="sm">
                        {showResearch ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                </div>

                <AnimatePresence>
                    {showResearch && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t"
                            style={{ borderColor: 'var(--glass-border)' }}
                        >
                            {/* Values */}
                            <div>
                                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                    <Heart className="w-4 h-4" style={{ color: 'var(--accent-rose)' }} />
                                    Core Values
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {college.research.values.map((value, i) => (
                                        <span
                                            key={i}
                                            className="tag primary text-xs"
                                        >
                                            {value}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* What They Look For */}
                            <div>
                                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                    <Star className="w-4 h-4" style={{ color: 'var(--accent-gold)' }} />
                                    What They Look For
                                </h4>
                                <ul className="text-xs space-y-1" style={{ color: 'var(--text-secondary)' }}>
                                    {college.research.whatTheyLookFor.map((item, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <Check className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: 'var(--success)' }} />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Culture */}
                            <div>
                                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                    <Users className="w-4 h-4" style={{ color: 'var(--accent-teal)' }} />
                                    Campus Culture
                                </h4>
                                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                    {college.research.campusVibe}
                                </p>
                            </div>

                            {/* Notable Programs */}
                            <div>
                                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                    <GraduationCap className="w-4 h-4" style={{ color: 'var(--primary-400)' }} />
                                    Notable Programs
                                </h4>
                                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                    {college.research.notablePrograms.slice(0, 4).join(' • ')}
                                </p>
                            </div>

                            {/* Transfer Tips */}
                            <div className="md:col-span-2">
                                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                    <Zap className="w-4 h-4" style={{ color: 'var(--accent-purple)' }} />
                                    Transfer Admission Tips
                                </h4>
                                <ul className="text-xs space-y-1" style={{ color: 'var(--text-secondary)' }}>
                                    {college.transferInfo.tips.map((tip, i) => (
                                        <li key={i}>• {tip}</li>
                                    ))}
                                </ul>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Card>

            {/* Essay Prompt Selection */}
            <div>
                <h3 className="text-lg font-semibold mb-3">Select Essay Prompt</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {college.essays.map((essay) => (
                        <Card
                            key={essay.id}
                            className={`cursor-pointer transition-all ${selectedPromptId === essay.id ? 'ring-2' : ''}`}
                            style={{
                                background: selectedPromptId === essay.id ? 'rgba(91, 111, 242, 0.1)' : undefined
                            }}
                            onClick={() => setSelectedPromptId(essay.id)}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <h4 className="font-medium">{essay.title}</h4>
                                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                                        {essay.prompt.length > 120 ? essay.prompt.slice(0, 120) + '...' : essay.prompt}
                                    </p>
                                    <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                                        Word limit: {essay.wordLimit} words
                                    </p>
                                </div>
                                {selectedPromptId === essay.id && (
                                    <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'var(--gradient-primary)' }}>
                                        <Check className="w-4 h-4 text-white" />
                                    </div>
                                )}
                            </div>
                        </Card>
                    ))}
                </div>
            </div>

            {/* Main Content Area */}
            {selectedPrompt && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Essay Editor */}
                    <div className="lg:col-span-2 space-y-4">
                        <Card>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold">Essay Editor</h3>
                                <div className="flex items-center gap-2">
                                    <span className={`text-sm ${isOverLimit ? 'text-red-400' : ''}`} style={{ color: isOverLimit ? undefined : 'var(--text-muted)' }}>
                                        {wordCount}/{wordLimit} words
                                    </span>
                                    <Button variant="secondary" size="sm" icon={<Save className="w-4 h-4" />}>
                                        Save
                                    </Button>
                                </div>
                            </div>

                            {/* Full Prompt Display */}
                            <div className="p-3 rounded-lg mb-4" style={{ background: 'var(--bg-secondary)' }}>
                                <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                                    {selectedPrompt.prompt}
                                </p>
                            </div>

                            <textarea
                                className="input-field min-h-[400px] resize-none"
                                placeholder={`Start writing your essay here...\n\nTip: Think about how your experiences connect to ${college.name}'s values of ${college.research.values.slice(0, 2).join(' and ')}.`}
                                value={essayContent}
                                onChange={(e) => setEssayContent(e.target.value)}
                            />

                            <div className="flex items-center justify-between mt-4">
                                <div className="flex gap-2">
                                    <Button
                                        onClick={handleGenerateEssay}
                                        icon={isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                        disabled={isGenerating}
                                    >
                                        {isGenerating ? 'Generating...' : essayContent ? 'Regenerate with AI' : 'Generate with AI'}
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        onClick={() => handleReviewEssay()}
                                        icon={isReviewing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                                        disabled={!essayContent || isReviewing}
                                    >
                                        {isReviewing ? 'Reviewing...' : 'Review Essay'}
                                    </Button>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setShowHistory(!showHistory)}
                                        icon={<History className="w-4 h-4" />}
                                    >
                                        History ({versions.length})
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setShowChat(!showChat)}
                                        icon={<MessageSquare className="w-4 h-4" />}
                                    >
                                        AI Chat
                                    </Button>
                                </div>
                            </div>
                        </Card>

                        {/* Version History */}
                        <AnimatePresence>
                            {showHistory && versions.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                >
                                    <Card>
                                        <h4 className="font-semibold mb-3">Version History</h4>
                                        <div className="space-y-2 max-h-48 overflow-y-auto">
                                            {versions.map((version) => (
                                                <div
                                                    key={version.id}
                                                    className="p-3 rounded-lg cursor-pointer hover:bg-opacity-80 transition-colors"
                                                    style={{ background: 'var(--bg-secondary)' }}
                                                    onClick={() => setEssayContent(version.content)}
                                                >
                                                    <div className="flex justify-between items-center">
                                                        <span className="font-medium text-sm">Version {version.id}</span>
                                                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                                            {version.timestamp.toLocaleTimeString()}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <div className="w-24 h-2 rounded" style={{ background: 'var(--bg-tertiary)' }}>
                                                            <div
                                                                className="h-2 rounded"
                                                                style={{
                                                                    width: `${version.confidence}%`,
                                                                    background: version.confidence >= 85 ? 'var(--success)' : version.confidence >= 70 ? 'var(--warning)' : 'var(--error)'
                                                                }}
                                                            />
                                                        </div>
                                                        <span className="text-xs">{version.confidence}%</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </Card>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Sidebar: Confidence & Feedback */}
                    <div className="space-y-4">
                        {/* Confidence Score */}
                        <Card>
                            <h4 className="font-semibold mb-3">Essay Confidence</h4>
                            <div className="relative">
                                <div className="w-32 h-32 mx-auto relative">
                                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                                        <circle
                                            cx="50"
                                            cy="50"
                                            r="40"
                                            stroke="var(--bg-tertiary)"
                                            strokeWidth="10"
                                            fill="none"
                                        />
                                        <motion.circle
                                            cx="50"
                                            cy="50"
                                            r="40"
                                            stroke={confidence >= 85 ? 'var(--success)' : confidence >= 70 ? 'var(--warning)' : 'var(--error)'}
                                            strokeWidth="10"
                                            fill="none"
                                            strokeLinecap="round"
                                            initial={{ strokeDasharray: '0 251.2' }}
                                            animate={{ strokeDasharray: `${confidence * 2.512} 251.2` }}
                                            transition={{ duration: 0.8, ease: 'easeOut' }}
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                                        <span className="text-3xl font-bold">{confidence}%</span>
                                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Confidence</span>
                                    </div>
                                </div>
                            </div>
                            <p className="text-center text-sm mt-3" style={{ color: 'var(--text-secondary)' }}>
                                {confidence >= 90 ? "Ready to submit!" :
                                    confidence >= 75 ? "Getting there!" :
                                        confidence >= 50 ? "Needs improvement" :
                                            "Keep working on it"}
                            </p>
                        </Card>

                        {/* AI Feedback */}
                        {feedback.length > 0 && (
                            <Card>
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="font-semibold">AI Feedback</h4>
                                    <Button
                                        size="sm"
                                        onClick={handleApplyAllSuggestions}
                                        disabled={isGenerating}
                                    >
                                        Apply All
                                    </Button>
                                </div>
                                <div className="space-y-3">
                                    {feedback.map((item, index) => (
                                        <motion.div
                                            key={index}
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.1 }}
                                            className={`p-3 rounded-lg ${item.applied ? 'opacity-50' : ''}`}
                                            style={{
                                                background: item.type === 'strength'
                                                    ? 'rgba(34, 197, 94, 0.1)'
                                                    : item.type === 'improvement'
                                                        ? 'rgba(234, 179, 8, 0.1)'
                                                        : 'rgba(59, 130, 246, 0.1)',
                                                borderLeft: `3px solid ${item.type === 'strength' ? 'var(--success)' : item.type === 'improvement' ? 'var(--warning)' : 'var(--info)'}`,
                                            }}
                                        >
                                            <div className="flex items-start gap-2">
                                                {item.type === 'strength' ? (
                                                    <ThumbsUp className="w-4 h-4 mt-0.5" style={{ color: 'var(--success)' }} />
                                                ) : item.type === 'improvement' ? (
                                                    <ThumbsDown className="w-4 h-4 mt-0.5" style={{ color: 'var(--warning)' }} />
                                                ) : (
                                                    <Lightbulb className="w-4 h-4 mt-0.5" style={{ color: 'var(--info)' }} />
                                                )}
                                                <p className="text-sm">{item.text}</p>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </Card>
                        )}

                        {/* AI Chat */}
                        <AnimatePresence>
                            {showChat && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 20 }}
                                >
                                    <Card>
                                        <h4 className="font-semibold mb-3">AI Writing Assistant</h4>
                                        <div className="h-48 overflow-y-auto space-y-2 mb-3">
                                            {chatMessages.length === 0 && (
                                                <p className="text-sm text-center py-4" style={{ color: 'var(--text-muted)' }}>
                                                    Ask me anything about writing your {college.name} essay!
                                                </p>
                                            )}
                                            {chatMessages.map((msg, i) => (
                                                <div
                                                    key={i}
                                                    className={`ai-message ${msg.role}`}
                                                >
                                                    <p className="text-sm">{msg.content}</p>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                className="input-field flex-1"
                                                placeholder="Ask for help..."
                                                value={chatInput}
                                                onChange={(e) => setChatInput(e.target.value)}
                                                onKeyPress={(e) => e.key === 'Enter' && handleSendChat()}
                                            />
                                            <Button size="sm" onClick={handleSendChat} icon={<Send className="w-4 h-4" />} />
                                        </div>
                                    </Card>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            )}


        </motion.div>
    );
}

// Helper function to generate personalized essay
function generatePersonalizedEssay(prompt: string, college: (typeof targetColleges)[0]): string {
    // This would call the actual AI API - for now returns a template
    return `As I reflect on my journey, I realize that my passion for innovation aligns deeply with ${college.name}'s commitment to ${college.research.values[0].toLowerCase()} and ${college.research.values[1].toLowerCase()}. 

What draws me to ${college.name} isn't just its renowned ${college.research.notablePrograms[0]} program, but the culture that ${college.research.campusVibe.split('.')[0].toLowerCase()}. This resonates with my own experiences leading projects where collaboration and creative problem-solving were essential.

[This is a draft generated by AI. Add your personal experiences and specific examples to make it authentic.]

I believe my background in [YOUR ACTIVITIES] has prepared me to contribute to ${college.name}'s community, particularly because ${college.research.whatTheyLookFor[0].toLowerCase()} is something I've consistently demonstrated through [YOUR SPECIFIC EXAMPLE].

${college.name}'s emphasis on "${college.research.motto}" inspires me because [EXPLAIN WHY THIS RESONATES WITH YOU].`;
}
