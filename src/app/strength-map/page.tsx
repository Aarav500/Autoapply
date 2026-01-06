'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, Button, StatusBadge } from '@/components/ui';
import { targetColleges } from '@/lib/colleges-data';
import { useS3Storage } from '@/lib/useS3Storage';
import {
    Map,
    Target,
    TrendingUp,
    Star,
    Award,
    Lightbulb,
    ChevronRight,
    RefreshCw,
    ShieldCheck,
    AlertTriangle,
    Zap
} from 'lucide-react';
import Link from 'next/link';
import { matchAnalysisStorage, MatchAnalysis } from '@/lib/storage';

// Activity type from Document Hub
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

// Default profile - will be overwritten by loaded data
const defaultProfile = {
    gpa: 3.90,
    major: 'Computer Science',
    skills: [] as string[],
    activities: [] as string[],
    values: ['Innovation', 'Research', 'Technical Excellence', 'Impact'],
    interests: ['AI/ML', 'Data Science', 'Time Series Analysis'],
    experience: [] as string[],
};

// Calculate match score for each college
function calculateStrengthMatch(college: typeof targetColleges[0], userProfile: typeof defaultProfile) {
    let score = 0;
    let strengths: string[] = [];
    let gaps: string[] = [];

    // GPA match
    const avgGPA = parseFloat(college.transferInfo.avgGPA.replace('+', ''));
    if (userProfile.gpa >= avgGPA) {
        score += 20;
        strengths.push(`GPA (${userProfile.gpa}) meets requirement (${avgGPA}+)`);
    } else {
        score += Math.max(0, 10 - (avgGPA - userProfile.gpa) * 10);
        gaps.push(`GPA slightly below target (${avgGPA}+)`);
    }

    // Values alignment
    const valueMatches = college.research.values.filter((v: string) =>
        userProfile.values.some((uv: string) => v.toLowerCase().includes(uv.toLowerCase()) ||
            uv.toLowerCase().includes(v.toLowerCase()))
    );
    score += valueMatches.length * 8;
    if (valueMatches.length > 0) {
        strengths.push(`Strong alignment: ${valueMatches.slice(0, 2).join(', ')}`);
    }

    // Program match
    if (college.research.notablePrograms.some(p =>
        p.toLowerCase().includes('computer') || p.toLowerCase().includes('engineering'))) {
        score += 15;
        strengths.push(`Strong ${userProfile.major} program`);
    }

    // Activity-based matching (dynamic!)
    if (userProfile.activities.length > 0) {
        // Research match
        if (userProfile.activities.some(a => a.toLowerCase().includes('research')) &&
            college.research.whatTheyLookFor.some(t => t.toLowerCase().includes('research'))) {
            score += 15;
            strengths.push('Research experience valued');
        }
        // More activities = higher score
        score += Math.min(userProfile.activities.length * 3, 15);
    }

    // Skills matching
    const traitMatches = college.research.whatTheyLookFor.filter((trait: string) =>
        userProfile.skills.some((s: string) => trait.toLowerCase().includes(s.toLowerCase())) ||
        userProfile.values.some((v: string) => trait.toLowerCase().includes(v.toLowerCase()))
    );
    score += traitMatches.length * 10;
    if (traitMatches.length > 0) {
        strengths.push(`Matches: ${traitMatches.slice(0, 2).join(', ')}`);
    }

    // Acceptance rate consideration
    const acceptanceRate = parseFloat(college.transferInfo.acceptanceRate.replace(/[~%]/g, ''));
    if (acceptanceRate > 50) score += 5;
    else if (acceptanceRate < 10) gaps.push('Highly competitive admissions');

    // Cap at 100
    score = Math.min(100, score);

    return { score, strengths, gaps };
}

// College categories
type Category = 'reach' | 'match' | 'safety';

function getCategory(score: number, acceptanceRate: number): Category {
    if (score >= 70 && acceptanceRate > 30) return 'safety';
    if (score >= 50 || (score >= 40 && acceptanceRate > 40)) return 'match';
    return 'reach';
}

export default function StrengthMapPage() {
    const [sortBy, setSortBy] = useState<'score' | 'name' | 'deadline'>('score');
    const [filterCategory, setFilterCategory] = useState<Category | 'all'>('all');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [analysisVersion, setAnalysisVersion] = useState(0); // Force refresh on reset

    // Load AI-driven Match Analysis (re-fetch when analysisVersion changes)
    const aiAnalyses = useMemo(() => {
        return matchAnalysisStorage.getAllAnalyses();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isRefreshing, analysisVersion]);

    // Load activities from S3 storage (same source as Document Hub)
    const {
        data: activities,
        isLoading: activitiesLoading,
        refresh: refreshActivities,
    } = useS3Storage<ActivityItem[]>('activities', { defaultValue: [] });

    // Load achievements from S3 storage
    const {
        data: achievements,
        isLoading: achievementsLoading,
        refresh: refreshAchievements,
    } = useS3Storage<{ id: string; title: string; org: string; date: string }[]>('achievements', { defaultValue: [] });

    // Load profile from S3 storage
    const {
        data: profile,
        isLoading: profileLoading,
        refresh: refreshProfile,
    } = useS3Storage<any>('profile', {
        defaultValue: {
            gpa: '3.90',
            major: 'Computer Science',
            targetMajor: '',
            values: ['Innovation', 'Technical Excellence', 'Design', 'Impact'],
            interests: ['Artificial Intelligence', 'Software Engineering', 'Robotics'],
            goals: '',
        }
    });

    const isLoading = activitiesLoading || achievementsLoading || profileLoading;

    // Build user profile from activities and achievements
    const userProfile = useMemo(() => {
        const activityNames = activities.map(a => a.name);
        const achievementTitles = achievements.map(a => a.title);
        const allDescriptions = activities.map(a => a.description).join(' ');

        // Extract skills from descriptions (simple keyword extraction)
        const skillKeywords = ['python', 'java', 'research', 'data', 'analysis', 'leadership', 'programming', 'machine learning', 'ai', 'statistics'];
        const foundSkills = skillKeywords.filter(skill =>
            allDescriptions.toLowerCase().includes(skill)
        );

        return {
            gpa: parseFloat(profile?.gpa) || 3.90,
            major: profile?.major || 'Computer Science',
            skills: foundSkills.length > 0 ? foundSkills : (profile?.interests || defaultProfile.skills),
            activities: activityNames,
            achievements: achievementTitles,
            values: profile?.values || defaultProfile.values,
            interests: profile?.interests || defaultProfile.interests,
            experience: activityNames,
            goals: profile?.goals || '',
        };
    }, [activities, achievements, profile]);

    // Manual refresh
    const handleRefresh = async () => {
        setIsRefreshing(true);
        refreshActivities();
        refreshAchievements();
        refreshProfile();
        // Also trigger intelligence scraper
        try {
            await fetch('/api/intelligence?action=all');
        } catch (e) {
            console.log('Intelligence refresh skipped');
        }
        setTimeout(() => setIsRefreshing(false), 1000);
    };

    // Reset all AI analyses and re-evaluate
    const handleResetAnalyses = async () => {
        setIsResetting(true);
        // Clear all stored match analyses
        matchAnalysisStorage.clearAllAnalyses();
        // Trigger version update to re-fetch
        setAnalysisVersion(v => v + 1);
        setTimeout(() => setIsResetting(false), 500);
    };

    const collegesWithScores = useMemo(() => {
        return targetColleges.map(college => {
            const match = calculateStrengthMatch(college, userProfile);
            const aiMatch = aiAnalyses.find(a => a.collegeId === college.id);
            const acceptanceRate = parseFloat(college.transferInfo.acceptanceRate.replace(/[~%]/g, ''));

            // Overlay AI insights if available
            const finalScore = aiMatch ? aiMatch.overallScore : match.score;
            const finalStrengths = aiMatch && aiMatch.strengths.length > 0 ? aiMatch.strengths : match.strengths;
            const finalGaps = aiMatch && aiMatch.improvements.length > 0 ? aiMatch.improvements : match.gaps;

            return {
                ...college,
                score: finalScore,
                strengths: finalStrengths,
                gaps: finalGaps,
                aiAnalysis: aiMatch,
                isVerified: !!aiMatch,
                category: getCategory(finalScore, acceptanceRate),
                acceptanceRate,
            };
        });
    }, [userProfile, aiAnalyses]);

    const sortedColleges = useMemo(() => {
        let result = [...collegesWithScores];

        if (filterCategory !== 'all') {
            result = result.filter(c => c.category === filterCategory);
        }

        if (sortBy === 'score') result.sort((a, b) => b.score - a.score);
        else if (sortBy === 'name') result.sort((a, b) => a.name.localeCompare(b.name));
        else result.sort((a, b) => a.deadline.getTime() - b.deadline.getTime());

        return result;
    }, [collegesWithScores, sortBy, filterCategory]);

    const stats = useMemo(() => ({
        reach: collegesWithScores.filter(c => c.category === 'reach').length,
        match: collegesWithScores.filter(c => c.category === 'match').length,
        safety: collegesWithScores.filter(c => c.category === 'safety').length,
        avgScore: Math.round(collegesWithScores.reduce((sum, c) => sum + c.score, 0) / collegesWithScores.length),
    }), [collegesWithScores]);

    const getCategoryStyles = (category: Category) => {
        switch (category) {
            case 'safety': return { bg: 'rgba(34, 197, 94, 0.15)', color: 'var(--success)', icon: '🟢' };
            case 'match': return { bg: 'rgba(234, 179, 8, 0.15)', color: 'var(--warning)', icon: '🟡' };
            case 'reach': return { bg: 'rgba(239, 68, 68, 0.15)', color: 'var(--error)', icon: '🔴' };
        }
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
                        <Map className="w-8 h-8" style={{ color: 'var(--primary-400)' }} />
                        Strength Map
                    </h1>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        See how your profile matches each college
                    </p>
                </div>
                <Button
                    variant="secondary"
                    onClick={handleResetAnalyses}
                    disabled={isResetting}
                    icon={<RefreshCw className={`w-4 h-4 ${isResetting ? 'animate-spin' : ''}`} />}
                >
                    {isResetting ? 'Resetting...' : `Reset All Scores (${Object.keys(aiAnalyses).length})`}
                </Button>
            </div>

            {/* Your Profile Summary */}
            <Card style={{ background: 'var(--gradient-primary)' }}>
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-bold text-white">Your Profile</h3>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleRefresh}
                                disabled={isRefreshing || isLoading}
                                className="text-white/80 hover:text-white"
                            >
                                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                            </Button>
                        </div>
                        {isLoading ? (
                            <p className="text-white/80">Loading your data...</p>
                        ) : (
                            <>
                                <div className="flex gap-4 text-white/80">
                                    <span>GPA: {userProfile.gpa}</span>
                                    <span>•</span>
                                    <span>{userProfile.major}</span>
                                    <span>•</span>
                                    <span>{userProfile.activities.length} Activities</span>
                                    <span>•</span>
                                    <span>{userProfile.achievements?.length || 0} Achievements</span>
                                </div>
                                <div className="flex flex-wrap gap-2 mt-3">
                                    {userProfile.values.map((v: string) => (
                                        <span key={v} className="px-2 py-1 rounded-full text-xs bg-white/20 text-white">{v}</span>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                    <div className="text-center">
                        <div className="text-5xl font-bold text-white">{stats.avgScore}%</div>
                        <p className="text-white/80 text-sm">Average Match</p>
                    </div>
                </div>
            </Card>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card
                    className={`cursor-pointer transition-all ${filterCategory === 'safety' ? 'ring-2 ring-green-500' : ''}`}
                    onClick={() => setFilterCategory(filterCategory === 'safety' ? 'all' : 'safety')}
                >
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(34, 197, 94, 0.15)' }}>
                            <Target className="w-7 h-7" style={{ color: 'var(--success)' }} />
                        </div>
                        <div>
                            <p className="text-3xl font-bold">{stats.safety}</p>
                            <p className="text-sm" style={{ color: 'var(--success)' }}>🟢 Safety Schools</p>
                        </div>
                    </div>
                </Card>
                <Card
                    className="cursor-pointer transition-all"
                    onClick={() => setFilterCategory(filterCategory === 'match' ? 'all' : 'match')}
                >
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(234, 179, 8, 0.15)' }}>
                            <Award className="w-7 h-7" style={{ color: 'var(--warning)' }} />
                        </div>
                        <div>
                            <p className="text-3xl font-bold">{stats.match}</p>
                            <p className="text-sm" style={{ color: 'var(--warning)' }}>🟡 Match Schools</p>
                        </div>
                    </div>
                </Card>
                <Card
                    className="cursor-pointer transition-all"
                    onClick={() => setFilterCategory(filterCategory === 'reach' ? 'all' : 'reach')}
                >
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(239, 68, 68, 0.15)' }}>
                            <Star className="w-7 h-7" style={{ color: 'var(--error)' }} />
                        </div>
                        <div>
                            <p className="text-3xl font-bold">{stats.reach}</p>
                            <p className="text-sm" style={{ color: 'var(--error)' }}>🔴 Reach Schools</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Sort Controls */}
            <div className="flex gap-2">
                <Button variant={sortBy === 'score' ? 'primary' : 'secondary'} size="sm" onClick={() => setSortBy('score')}>
                    By Match Score
                </Button>
                <Button variant={sortBy === 'deadline' ? 'primary' : 'secondary'} size="sm" onClick={() => setSortBy('deadline')}>
                    By Deadline
                </Button>
                <Button variant={sortBy === 'name' ? 'primary' : 'secondary'} size="sm" onClick={() => setSortBy('name')}>
                    By Name
                </Button>
                {filterCategory !== 'all' && (
                    <Button variant="ghost" size="sm" onClick={() => setFilterCategory('all')}>
                        Clear Filter
                    </Button>
                )}
            </div>

            {/* College Cards */}
            <div className="space-y-4">
                {sortedColleges.map((college, index) => {
                    const categoryStyle = getCategoryStyles(college.category);

                    return (
                        <motion.div
                            key={college.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03 }}
                        >
                            <Card className="overflow-hidden">
                                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                                    {/* Score Circle */}
                                    <div className="flex items-center gap-4">
                                        <div className="relative w-20 h-20">
                                            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                                                <circle cx="50" cy="50" r="40" stroke="var(--bg-tertiary)" strokeWidth="8" fill="none" />
                                                <motion.circle
                                                    cx="50" cy="50" r="40"
                                                    stroke={categoryStyle.color}
                                                    strokeWidth="8"
                                                    fill="none"
                                                    strokeLinecap="round"
                                                    initial={{ strokeDasharray: '0 251.2' }}
                                                    animate={{ strokeDasharray: `${college.score * 2.512} 251.2` }}
                                                    transition={{ duration: 0.8, delay: index * 0.05 }}
                                                />
                                            </svg>
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <span className="text-xl font-bold">{college.score}%</span>
                                            </div>
                                        </div>

                                        <div>
                                            <h3 className="text-xl font-bold flex items-center gap-2">
                                                {college.name}
                                                <span className="text-sm font-normal" style={{ color: 'var(--text-muted)' }}>
                                                    {categoryStyle.icon}
                                                </span>
                                            </h3>
                                            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{college.fullName}</p>
                                            <StatusBadge status={college.category === 'safety' ? 'success' : college.category === 'match' ? 'warning' : 'error'}>
                                                {college.category.charAt(0).toUpperCase() + college.category.slice(1)} ({college.acceptanceRate}%)
                                            </StatusBadge>
                                        </div>
                                    </div>

                                    {/* Strengths & Gaps */}
                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--success)' }}>
                                                {college.isVerified ? <ShieldCheck className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                                                {college.isVerified ? 'AI-Verified Strengths' : 'Your Strengths'}
                                            </h4>
                                            <ul className="space-y-1">
                                                {college.strengths.slice(0, 3).map((s, i) => (
                                                    <li key={i} className="text-sm" style={{ color: 'var(--text-secondary)' }}>• {s}</li>
                                                ))}
                                            </ul>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--warning)' }}>
                                                {college.isVerified ? <AlertTriangle className="w-4 h-4" /> : <Lightbulb className="w-4 h-4" />}
                                                {college.isVerified ? 'AI-Detected Gaps' : 'Areas to Address'}
                                            </h4>
                                            <ul className="space-y-1">
                                                {college.gaps.length > 0 ? college.gaps.slice(0, 2).map((g, i) => (
                                                    <li key={i} className="text-sm" style={{ color: 'var(--text-secondary)' }}>• {g}</li>
                                                )) : (
                                                    <li className="text-sm" style={{ color: 'var(--text-secondary)' }}>• Focus on essay quality</li>
                                                )}
                                            </ul>
                                            {college.aiAnalysis?.oneThingToFix && (
                                                <div className="mt-2 p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                                                    <p className="text-[10px] uppercase font-bold text-orange-400 mb-1 flex items-center gap-1">
                                                        <Zap className="w-3 h-3" /> Priority Fix
                                                    </p>
                                                    <p className="text-xs text-orange-200 leading-tight">
                                                        {college.aiAnalysis.oneThingToFix}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action */}
                                    <Link href={`/essays/${college.id}`}>
                                        <Button icon={<ChevronRight className="w-4 h-4" />}>
                                            Write Essays
                                        </Button>
                                    </Link>
                                </div>
                            </Card>
                        </motion.div>
                    );
                })}
            </div>
        </motion.div>
    );
}
