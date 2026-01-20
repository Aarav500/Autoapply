'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Button, StatusBadge, ProgressBar } from '@/components/ui';
import { targetColleges } from '@/lib/colleges-data';
import {
    Recycle,
    FileText,
    ArrowRight,
    Copy,
    Check,
    Sparkles,
    Link2,
    Unlink,
    Eye,
    Edit3,
    Sliders,
    Heart,
    Zap,
    Coffee,
    Flame
} from 'lucide-react';

// Sample essay content - would come from saved essays
const sampleEssays: Record<string, { prompt: string; content: string; college: string }> = {
    'stanford-1': {
        prompt: 'What matters most to you, and why?',
        content: `What matters most to me is the pursuit of creating technology that genuinely improves people's lives. During my time leading our college's coding club, I witnessed firsthand how teaching programming to underprivileged students opened doors they never knew existed...`,
        college: 'Stanford',
    },
    'mit-1': {
        prompt: 'What excites you about MIT?',
        content: `MIT's culture of "productive weirdness" resonates deeply with my own approach to problem-solving. When I built my first machine learning model at 16, I was the only person in my school interested in such "weird" pursuits...`,
        college: 'MIT',
    },
};

// Tone presets
const tonePresets = [
    { id: 'casual', name: 'Casual', icon: Coffee, description: 'Friendly, conversational' },
    { id: 'formal', name: 'Formal', icon: FileText, description: 'Professional, polished' },
    { id: 'passionate', name: 'Passionate', icon: Heart, description: 'Emotional, compelling' },
    { id: 'confident', name: 'Confident', icon: Zap, description: 'Bold, assertive' },
    { id: 'reflective', name: 'Reflective', icon: Eye, description: 'Thoughtful, introspective' },
];

// Find similar prompts across colleges
function findSimilarPrompts(colleges: typeof targetColleges) {
    const groups: { theme: string; prompts: { college: typeof colleges[0]; essay: typeof colleges[0]['essays'][0] }[] }[] = [];

    const themes = [
        { name: 'Why This School', keywords: ['why', 'interest', 'motivates', 'choose'] },
        { name: 'Personal Challenge', keywords: ['challenge', 'overcome', 'difficult', 'obstacle'] },
        { name: 'Community & Contribution', keywords: ['community', 'contribute', 'role', 'engagement'] },
        { name: 'Personal Values', keywords: ['matters', 'meaningful', 'important', 'values'] },
        { name: 'Academic Goals', keywords: ['major', 'pursue', 'study', 'academic'] },
    ];

    themes.forEach(theme => {
        const matching: { college: typeof colleges[0]; essay: typeof colleges[0]['essays'][0] }[] = [];
        colleges.forEach(college => {
            college.essays.forEach(essay => {
                const promptLower = essay.prompt.toLowerCase();
                if (theme.keywords.some(kw => promptLower.includes(kw))) {
                    matching.push({ college, essay });
                }
            });
        });
        if (matching.length > 1) {
            groups.push({ theme: theme.name, prompts: matching });
        }
    });

    return groups;
}

export default function RecyclerPage() {
    const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
    const [selectedSourceEssay, setSelectedSourceEssay] = useState<string | null>(null);
    const [selectedTargetPrompt, setSelectedTargetPrompt] = useState<string | null>(null);
    const [isAdapting, setIsAdapting] = useState(false);
    const [adaptedContent, setAdaptedContent] = useState<string | null>(null);
    const [selectedTone, setSelectedTone] = useState<string>('confident');
    const [showToneAdjuster, setShowToneAdjuster] = useState(false);
    const [toneIntensity, setToneIntensity] = useState(50);

    const similarPrompts = useMemo(() => findSimilarPrompts(targetColleges), []);

    const selectedGroupData = similarPrompts.find(g => g.theme === selectedGroup);

    const handleAdaptEssay = async () => {
        if (!selectedSourceEssay || !selectedTargetPrompt) return;

        setIsAdapting(true);
        await new Promise(resolve => setTimeout(resolve, 2500));

        const sourceEssay = sampleEssays[selectedSourceEssay];
        const targetPrompt = selectedGroupData?.prompts.find(p => p.essay.id === selectedTargetPrompt);

        // Simulate adapted essay
        setAdaptedContent(`[Adapted from ${sourceEssay?.college || 'source'} essay for ${targetPrompt?.college.name}]

${sourceEssay?.content || 'Essay content would be adapted here...'}

[This section has been modified to address the specific prompt: "${targetPrompt?.essay.prompt}" and incorporate ${targetPrompt?.college.name}'s values of ${targetPrompt?.college.research.values.slice(0, 2).join(' and ')}.]`);

        setIsAdapting(false);
    };

    const handleAdjustTone = async () => {
        if (!adaptedContent) return;

        setIsAdapting(true);
        await new Promise(resolve => setTimeout(resolve, 1500));

        const preset = tonePresets.find(p => p.id === selectedTone);
        setAdaptedContent(prev =>
            `[Tone adjusted to: ${preset?.name} (${toneIntensity}% intensity)]\n\n${prev}`
        );

        setIsAdapting(false);
        setShowToneAdjuster(false);
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
                    <h1 className="text-3xl font-bold flex items-center gap-3" style={{ fontFamily: 'var(--font-display)' }}>
                        <Recycle className="w-8 h-8" style={{ color: 'var(--accent-teal)' }} />
                        Essay Recycler
                    </h1>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        Adapt essays across similar prompts while keeping them unique
                    </p>
                </div>
                <Button
                    variant="secondary"
                    icon={<Sliders className="w-4 h-4" />}
                    onClick={() => setShowToneAdjuster(true)}
                >
                    Tone Adjuster
                </Button>
            </div>

            {/* Similar Prompts Groups */}
            <Card>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Link2 className="w-5 h-5" style={{ color: 'var(--primary-400)' }} />
                    Similar Prompts Across Colleges
                </h3>
                <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
                    Essays can be adapted between these prompts that share similar themes
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {similarPrompts.map(group => (
                        <motion.div
                            key={group.theme}
                            whileHover={{ scale: 1.02 }}
                            className={`p-4 rounded-xl cursor-pointer transition-all ${selectedGroup === group.theme ? 'ring-2' : ''}`}
                            style={{
                                background: 'var(--bg-secondary)',
                            }}
                            onClick={() => setSelectedGroup(group.theme)}
                        >
                            <h4 className="font-medium mb-2">{group.theme}</h4>
                            <div className="flex flex-wrap gap-1">
                                {group.prompts.slice(0, 5).map(({ college }) => (
                                    <span
                                        key={college.id}
                                        className="tag primary text-xs"
                                    >
                                        {college.name}
                                    </span>
                                ))}
                                {group.prompts.length > 5 && (
                                    <span className="tag text-xs">+{group.prompts.length - 5}</span>
                                )}
                            </div>
                            <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                                {group.prompts.length} colleges share this theme
                            </p>
                        </motion.div>
                    ))}
                </div>
            </Card>

            {/* Selected Group - Recycler Interface */}
            <AnimatePresence>
                {selectedGroupData && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                    >
                        <Card>
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-semibold">{selectedGroupData.theme}</h3>
                                <Button variant="ghost" size="sm" onClick={() => setSelectedGroup(null)}>
                                    Clear Selection
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Source Essay */}
                                <div>
                                    <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                                        <FileText className="w-4 h-4" style={{ color: 'var(--accent-teal)' }} />
                                        Source Essay (Copy From)
                                    </h4>
                                    <div className="space-y-2">
                                        {selectedGroupData.prompts.map(({ college, essay }) => (
                                            <div
                                                key={essay.id}
                                                className={`p-3 rounded-lg cursor-pointer transition-all ${selectedSourceEssay === essay.id ? 'ring-2' : ''}`}
                                                style={{
                                                    background: selectedSourceEssay === essay.id ? 'rgba(20, 184, 166, 0.1)' : 'var(--bg-secondary)',
                                                }}
                                                onClick={() => setSelectedSourceEssay(essay.id)}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="font-medium text-sm">{college.name}</span>
                                                    {sampleEssays[essay.id] && (
                                                        <StatusBadge status="success">Has Draft</StatusBadge>
                                                    )}
                                                </div>
                                                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                                                    {essay.prompt.slice(0, 60)}...
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Arrow */}
                                <div className="flex items-center justify-center">
                                    <motion.div
                                        animate={{ x: [0, 10, 0] }}
                                        transition={{ repeat: Infinity, duration: 1.5 }}
                                    >
                                        <ArrowRight className="w-8 h-8" style={{ color: 'var(--primary-400)' }} />
                                    </motion.div>
                                </div>

                                {/* Target Prompt */}
                                <div>
                                    <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                                        <Edit3 className="w-4 h-4" style={{ color: 'var(--primary-400)' }} />
                                        Target Prompt (Adapt To)
                                    </h4>
                                    <div className="space-y-2">
                                        {selectedGroupData.prompts.map(({ college, essay }) => (
                                            <div
                                                key={essay.id}
                                                className={`p-3 rounded-lg cursor-pointer transition-all ${selectedTargetPrompt === essay.id ? 'ring-2' : ''} ${selectedSourceEssay === essay.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                style={{
                                                    background: selectedTargetPrompt === essay.id ? 'rgba(91, 111, 242, 0.1)' : 'var(--bg-secondary)',
                                                }}
                                                onClick={() => {
                                                    if (selectedSourceEssay !== essay.id) {
                                                        setSelectedTargetPrompt(essay.id);
                                                    }
                                                }}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="font-medium text-sm">{college.name}</span>
                                                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                                        {essay.wordLimit} words
                                                    </span>
                                                </div>
                                                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                                                    {essay.prompt.slice(0, 60)}...
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Adapt Button */}
                            <div className="mt-6 flex justify-center">
                                <Button
                                    onClick={handleAdaptEssay}
                                    disabled={!selectedSourceEssay || !selectedTargetPrompt || isAdapting}
                                    icon={isAdapting ? <Sparkles className="w-4 h-4 animate-spin" /> : <Recycle className="w-4 h-4" />}
                                    size="lg"
                                >
                                    {isAdapting ? 'Adapting Essay...' : 'Adapt Essay for Target'}
                                </Button>
                            </div>
                        </Card>

                        {/* Adapted Result */}
                        {adaptedContent && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <Card className="mt-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="font-semibold flex items-center gap-2">
                                            <Check className="w-5 h-5" style={{ color: 'var(--success)' }} />
                                            Adapted Essay
                                        </h4>
                                        <div className="flex gap-2">
                                            <Button variant="secondary" size="sm" icon={<Copy className="w-4 h-4" />}>
                                                Copy
                                            </Button>
                                            <Button size="sm" icon={<Edit3 className="w-4 h-4" />}>
                                                Edit
                                            </Button>
                                        </div>
                                    </div>
                                    <div
                                        className="p-4 rounded-lg max-h-64 overflow-y-auto"
                                        style={{ background: 'var(--bg-secondary)', whiteSpace: 'pre-wrap' }}
                                    >
                                        {adaptedContent}
                                    </div>
                                </Card>
                            </motion.div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Tone Adjuster Modal */}
            <AnimatePresence>
                {showToneAdjuster && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                        onClick={() => setShowToneAdjuster(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.9 }}
                            className="w-full max-w-md"
                            onClick={e => e.stopPropagation()}
                        >
                            <Card>
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-lg font-semibold flex items-center gap-2">
                                        <Sliders className="w-5 h-5" style={{ color: 'var(--primary-400)' }} />
                                        Tone Adjuster
                                    </h3>
                                    <Button variant="ghost" size="sm" onClick={() => setShowToneAdjuster(false)}>×</Button>
                                </div>

                                {/* Tone Presets */}
                                <div className="grid grid-cols-2 gap-3 mb-6">
                                    {tonePresets.map(preset => {
                                        const Icon = preset.icon;
                                        return (
                                            <motion.div
                                                key={preset.id}
                                                whileHover={{ scale: 1.02 }}
                                                className={`p-3 rounded-xl cursor-pointer transition-all ${selectedTone === preset.id ? 'ring-2' : ''}`}
                                                style={{
                                                    background: selectedTone === preset.id ? 'rgba(91, 111, 242, 0.1)' : 'var(--bg-secondary)',
                                                }}
                                                onClick={() => setSelectedTone(preset.id)}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Icon className="w-5 h-5" style={{ color: 'var(--primary-400)' }} />
                                                    <span className="font-medium">{preset.name}</span>
                                                </div>
                                                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                                                    {preset.description}
                                                </p>
                                            </motion.div>
                                        );
                                    })}
                                </div>

                                {/* Intensity Slider */}
                                <div className="mb-6">
                                    <div className="flex justify-between text-sm mb-2">
                                        <span>Intensity</span>
                                        <span>{toneIntensity}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={toneIntensity}
                                        onChange={(e) => setToneIntensity(Number(e.target.value))}
                                        className="w-full"
                                    />
                                    <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                                        <span>Subtle</span>
                                        <span>Strong</span>
                                    </div>
                                </div>

                                <Button
                                    onClick={handleAdjustTone}
                                    className="w-full"
                                    disabled={!adaptedContent || isAdapting}
                                    icon={<Flame className="w-4 h-4" />}
                                >
                                    Apply Tone Adjustment
                                </Button>
                            </Card>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
