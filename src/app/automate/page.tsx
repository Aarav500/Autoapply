'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Button, StatusBadge, ProgressBar } from '@/components/ui';
import { CountdownTimer } from '@/components/CountdownTimer';
import { AutomationDashboard } from '@/components/AutomationEngine';
import { targetColleges, getTimeUntilDeadline } from '@/lib/colleges-data';
import {
    Brain,
    Sparkles,
    Target,
    ArrowRight,
    CheckCircle2,
    Clock,
    AlertTriangle,
    Zap,
    BookOpen,
    Users,
    Trophy,
    Lightbulb,
    Heart,
    Star,
    ChevronRight,
    Play,
    Pause,
    RotateCcw,
    List,
    Bot
} from 'lucide-react';
import Link from 'next/link';

// Tab for switching views
type ViewMode = 'queue' | 'automation';

// Sample activities - would come from user's document uploads
const sampleActivities = [
    {
        id: 1,
        name: 'AI Research Project',
        description: 'Built a machine learning model to predict stock prices using LSTM networks',
        hours: 200,
        years: '2024-2025',
        type: 'research',
        skills: ['Python', 'TensorFlow', 'Data Analysis', 'Research'],
        impact: 'Published paper in undergraduate journal',
    },
    {
        id: 2,
        name: 'Coding Club President',
        description: 'Led 50+ member club, organized hackathons and workshops',
        hours: 300,
        years: '2023-2025',
        type: 'leadership',
        skills: ['Leadership', 'Event Planning', 'Teaching', 'Community Building'],
        impact: 'Grew membership by 200%, hosted 3 major hackathons',
    },
    {
        id: 3,
        name: 'Internship at Tech Startup',
        description: 'Full-stack developer intern, built customer-facing features',
        hours: 480,
        years: 'Summer 2025',
        type: 'work',
        skills: ['React', 'Node.js', 'Agile', 'Professional Experience'],
        impact: 'Features used by 10,000+ users',
    },

    {
        id: 4,
        name: 'Volunteer Tutoring',
        description: 'Tutored underprivileged students in math and computer science',
        hours: 150,
        years: '2023-2025',
        type: 'service',
        skills: ['Teaching', 'Mentorship', 'Communication', 'Community Service'],
        impact: 'Helped 30+ students improve grades',
    },
    {
        id: 5,
        name: 'Robotics Competition Team',
        description: 'Designed and programmed autonomous robot for FIRST competition',
        hours: 250,
        years: '2024-2025',
        type: 'competition',
        skills: ['Robotics', 'C++', 'Mechanical Design', 'Teamwork'],
        impact: 'Regional finalist, Best Programming Award',
    },
];

// Activity recommendations for each college based on their values
function getActivityRecommendations(collegeId: string, activities: typeof sampleActivities) {
    const college = targetColleges.find(c => c.id === collegeId);
    if (!college) return [];

    const recommendations: { activity: typeof sampleActivities[0]; reason: string; score: number }[] = [];

    activities.forEach(activity => {
        let score = 0;
        let reason = '';

        // Match based on college values
        if (college.research.values.includes('Innovation') &&
            (activity.type === 'research' || activity.skills.includes('Research'))) {
            score += 30;
            reason = `Demonstrates innovation and research skills that ${college.name} values`;
        }

        if (college.research.values.includes('Leadership') && activity.type === 'leadership') {
            score += 30;
            reason = `Shows leadership qualities ${college.name} looks for`;
        }

        if (college.research.values.includes('Collaboration') &&
            (activity.skills.includes('Teamwork') || activity.skills.includes('Community Building'))) {
            score += 25;
            reason = `Exhibits collaborative spirit aligned with ${college.name}'s culture`;
        }

        if (college.research.whatTheyLookFor.some(trait =>
            trait.toLowerCase().includes('community')) && activity.type === 'service') {
            score += 25;
            reason = `Community service aligns with ${college.name}'s emphasis on community engagement`;
        }

        if (activity.type === 'competition' &&
            college.research.notablePrograms.some(p =>
                p.toLowerCase().includes('engineering') || p.toLowerCase().includes('computer'))) {
            score += 20;
            reason = `Technical competition experience relevant to ${college.name}'s strong engineering programs`;
        }

        if (activity.type === 'work') {
            score += 15;
            reason = `Professional experience demonstrates real-world application valued by ${college.name}`;
        }

        if (score > 0) {
            recommendations.push({ activity, reason, score });
        }
    });

    return recommendations.sort((a, b) => b.score - a.score);
}

export default function AutomatePage() {
    const [selectedCollege, setSelectedCollege] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisComplete, setAnalysisComplete] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>('automation');

    // Sort colleges by deadline (priority)
    const sortedColleges = useMemo(() => {
        return [...targetColleges]
            .filter(c => c.deadline.getTime() > Date.now())
            .sort((a, b) => a.deadline.getTime() - b.deadline.getTime());
    }, []);

    const handleAnalyzeAll = async () => {
        setIsAnalyzing(true);
        await new Promise(resolve => setTimeout(resolve, 3000));
        setIsAnalyzing(false);
        setAnalysisComplete(true);
    };

    const recommendations = selectedCollege
        ? getActivityRecommendations(selectedCollege, sampleActivities)
        : [];

    const selectedCollegeData = targetColleges.find(c => c.id === selectedCollege);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
        >
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3" style={{ fontFamily: 'var(--font-display)' }}>
                        <Brain className="w-8 h-8" style={{ color: 'var(--primary-400)' }} />
                        AI Automation Hub
                    </h1>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        Let AI analyze your profile and write essays for all {sortedColleges.length} colleges
                    </p>
                </div>

                {/* View Toggle */}
                <div className="flex items-center gap-2 p-1 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
                    <button
                        onClick={() => setViewMode('automation')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${viewMode === 'automation' ? 'shadow-lg' : ''
                            }`}
                        style={{
                            background: viewMode === 'automation' ? 'var(--gradient-primary)' : 'transparent',
                            color: viewMode === 'automation' ? 'white' : 'var(--text-secondary)',
                        }}
                    >
                        <Bot className="w-4 h-4" />
                        Auto Mode
                    </button>
                    <button
                        onClick={() => setViewMode('queue')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${viewMode === 'queue' ? 'shadow-lg' : ''
                            }`}
                        style={{
                            background: viewMode === 'queue' ? 'var(--gradient-primary)' : 'transparent',
                            color: viewMode === 'queue' ? 'white' : 'var(--text-secondary)',
                        }}
                    >
                        <List className="w-4 h-4" />
                        Manual
                    </button>
                </div>
            </div>

            {/* Automation Mode - Full AI Processing */}
            {viewMode === 'automation' && (
                <AutomationDashboard />
            )}

            {/* Queue Mode - Manual Selection */}
            {viewMode === 'queue' && (
                <>
                    {/* Analyze Button */}
                    <div className="flex justify-end">
                        <Button
                            onClick={handleAnalyzeAll}
                            icon={isAnalyzing ? <RotateCcw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                            disabled={isAnalyzing}
                            size="lg"
                        >
                            {isAnalyzing ? 'Analyzing Profile...' : analysisComplete ? 'Re-Analyze' : 'Analyze My Profile'}
                        </Button>
                    </div>

                    {/* Priority Queue - Sorted by Deadline */}
                    <Card>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <Clock className="w-5 h-5" style={{ color: 'var(--warning)' }} />
                                Priority Queue (Sorted by Deadline)
                            </h3>
                            <Button variant="secondary" size="sm" icon={<Play className="w-4 h-4" />}>
                                Auto-Write All Essays
                            </Button>
                        </div>

                        <div className="space-y-3">
                            {sortedColleges.slice(0, 8).map((college, index) => {
                                const timeLeft = getTimeUntilDeadline(college.deadline);
                                const priority = index < 2 ? 'critical' : index < 5 ? 'high' : 'normal';

                                return (
                                    <motion.div
                                        key={college.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all ${selectedCollege === college.id ? 'ring-2' : ''}`}
                                        style={{
                                            background: priority === 'critical'
                                                ? 'rgba(239, 68, 68, 0.1)'
                                                : priority === 'high'
                                                    ? 'rgba(234, 179, 8, 0.1)'
                                                    : 'var(--bg-secondary)',
                                            borderLeft: `4px solid ${priority === 'critical' ? 'var(--error)' : priority === 'high' ? 'var(--warning)' : 'var(--primary-400)'}`,
                                            ringColor: 'var(--primary-500)'
                                        }}
                                        onClick={() => setSelectedCollege(college.id)}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold"
                                                style={{
                                                    background: priority === 'critical' ? 'var(--error)' : priority === 'high' ? 'var(--warning)' : 'var(--primary-400)',
                                                    color: 'white'
                                                }}>
                                                {index + 1}
                                            </div>
                                            <div>
                                                <h4 className="font-semibold">{college.name}</h4>
                                                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                                                    {college.essays.length} essays · {college.transferInfo.acceptanceRate} acceptance
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-6">
                                            <CountdownTimer deadline={college.deadline} compact />
                                            <StatusBadge status={priority === 'critical' ? 'error' : priority === 'high' ? 'warning' : 'neutral'}>
                                                {priority === 'critical' ? '🔥 Critical' : priority === 'high' ? '⚡ High' : 'Normal'}
                                            </StatusBadge>
                                            <Link href={`/essays/${college.id}`}>
                                                <Button size="sm" icon={<ArrowRight className="w-4 h-4" />}>
                                                    Write
                                                </Button>
                                            </Link>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </Card>

                    {/* Activity Analyzer */}
                    {selectedCollege && selectedCollegeData && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
                        >
                            {/* Activity Recommendations */}
                            <Card>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold flex items-center gap-2">
                                        <Target className="w-5 h-5" style={{ color: 'var(--accent-teal)' }} />
                                        Activities for {selectedCollegeData.name}
                                    </h3>
                                </div>

                                <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                                    Based on {selectedCollegeData.name}'s values: {selectedCollegeData.research.values.slice(0, 3).join(', ')}
                                </p>

                                <div className="space-y-3">
                                    {recommendations.map((rec, index) => (
                                        <motion.div
                                            key={rec.activity.id}
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.1 }}
                                            className="p-4 rounded-xl"
                                            style={{ background: 'var(--bg-secondary)' }}
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    {rec.activity.type === 'research' && <BookOpen className="w-4 h-4" style={{ color: 'var(--primary-400)' }} />}
                                                    {rec.activity.type === 'leadership' && <Users className="w-4 h-4" style={{ color: 'var(--accent-purple)' }} />}
                                                    {rec.activity.type === 'competition' && <Trophy className="w-4 h-4" style={{ color: 'var(--accent-gold)' }} />}
                                                    {rec.activity.type === 'service' && <Heart className="w-4 h-4" style={{ color: 'var(--accent-rose)' }} />}
                                                    {rec.activity.type === 'work' && <Zap className="w-4 h-4" style={{ color: 'var(--accent-teal)' }} />}
                                                    <h4 className="font-medium">{rec.activity.name}</h4>
                                                </div>
                                                <div className="flex items-center gap-1 text-sm" style={{ color: 'var(--success)' }}>
                                                    <Star className="w-4 h-4" />
                                                    <span>{rec.score}%</span>
                                                </div>
                                            </div>
                                            <p className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>
                                                {rec.activity.description}
                                            </p>
                                            <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'rgba(34, 197, 94, 0.1)' }}>
                                                <Lightbulb className="w-4 h-4" style={{ color: 'var(--success)' }} />
                                                <span className="text-xs" style={{ color: 'var(--success)' }}>{rec.reason}</span>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </Card>

                            {/* Story Finder */}
                            <Card>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold flex items-center gap-2">
                                        <Sparkles className="w-5 h-5" style={{ color: 'var(--accent-gold)' }} />
                                        Story Ideas for {selectedCollegeData.name}
                                    </h3>
                                </div>

                                <div className="space-y-4">
                                    {recommendations.slice(0, 3).map((rec, index) => (
                                        <div key={index} className="p-4 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
                                            <h4 className="font-medium mb-2 flex items-center gap-2">
                                                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                                                    style={{ background: 'var(--gradient-primary)', color: 'white' }}>
                                                    {index + 1}
                                                </span>
                                                Story Angle
                                            </h4>
                                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                                {index === 0 && `Start with a specific moment from your ${rec.activity.name} experience that shows ${selectedCollegeData.research.whatTheyLookFor[0].toLowerCase()}. Describe the challenge, your approach, and how it reflects ${selectedCollegeData.name}'s value of "${selectedCollegeData.research.values[0]}".`}
                                                {index === 1 && `Connect your ${rec.activity.name} to your future goals at ${selectedCollegeData.name}. Reference specific programs like ${selectedCollegeData.research.notablePrograms[0]} and how your experience prepared you.`}
                                                {index === 2 && `Highlight the impact of your ${rec.activity.name}: "${rec.activity.impact}". Show how this demonstrates ${selectedCollegeData.research.whatTheyLookFor[1] || selectedCollegeData.research.values[1].toLowerCase()}.`}
                                            </p>
                                            <Button variant="secondary" size="sm" className="mt-2" icon={<ChevronRight className="w-4 h-4" />}>
                                                Use This Story
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        </motion.div>
                    )}

                    {/* Quick Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(239, 68, 68, 0.15)' }}>
                                <AlertTriangle className="w-6 h-6" style={{ color: 'var(--error)' }} />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">2</p>
                                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Critical Priority</p>
                            </div>
                        </Card>
                        <Card className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(234, 179, 8, 0.15)' }}>
                                <Clock className="w-6 h-6" style={{ color: 'var(--warning)' }} />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{sortedColleges.length}</p>
                                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Upcoming Deadlines</p>
                            </div>
                        </Card>
                        <Card className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(34, 197, 94, 0.15)' }}>
                                <CheckCircle2 className="w-6 h-6" style={{ color: 'var(--success)' }} />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{sampleActivities.length}</p>
                                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Activities Loaded</p>
                            </div>
                        </Card>
                        <Card className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(91, 111, 242, 0.15)' }}>
                                <Sparkles className="w-6 h-6" style={{ color: 'var(--primary-400)' }} />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{analysisComplete ? '✓' : '—'}</p>
                                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Profile Analyzed</p>
                            </div>
                        </Card>
                    </div>
                </>
            )}
        </motion.div>
    );
}

