'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, Button, StatusBadge, ProgressBar } from '@/components/ui';
import { targetColleges } from '@/lib/colleges-data';
import {
    Map,
    Target,
    TrendingUp,
    Star,
    Award,
    Users,
    Lightbulb,
    GraduationCap,
    Building2,
    ChevronRight,
    BarChart3
} from 'lucide-react';
import Link from 'next/link';

// Real user profile - Aarav Nikhil Shah @ UC Riverside, Bourns College of Engineering
const userProfile = {
    gpa: 3.90,
    major: 'Computer Science',
    skills: ['Python', 'Data Science', 'Statistical Analysis', 'Programming', 'Research', 'Academic Writing'],
    activities: ['ARIMA Time Series Research Paper (Published)', 'CS Coursework Projects', 'Data Science Analysis', 'Engineering Program'],
    values: ['Innovation', 'Research', 'Technical Excellence', 'Impact'],
    interests: ['AI/ML', 'Data Science', 'Time Series Analysis', 'Quantitative Finance', 'Research'],
    experience: ['Published Research', 'Engineering Coursework', 'Data Analysis Projects'],
};

// Calculate match score for each college
function calculateStrengthMatch(college: typeof targetColleges[0]) {
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
    const valueMatches = college.research.values.filter(v =>
        userProfile.values.some(uv => v.toLowerCase().includes(uv.toLowerCase()) ||
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

    // What they look for match
    const traitMatches = college.research.whatTheyLookFor.filter(trait =>
        userProfile.skills.some(s => trait.toLowerCase().includes(s.toLowerCase())) ||
        userProfile.values.some(v => trait.toLowerCase().includes(v.toLowerCase()))
    );
    score += traitMatches.length * 10;
    if (traitMatches.length > 0) {
        strengths.push(`Matches: ${traitMatches.slice(0, 2).join(', ')}`);
    }

    // Experience match
    if (userProfile.experience.includes('Research') &&
        college.research.whatTheyLookFor.some(t => t.toLowerCase().includes('research'))) {
        score += 10;
        strengths.push('Research experience valued');
    }
    if (userProfile.experience.includes('Leadership') &&
        college.research.values.includes('Leadership')) {
        score += 10;
        strengths.push('Leadership experience valued');
    }

    // Acceptance rate consideration (higher rate = slightly easier)
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

    const collegesWithScores = useMemo(() => {
        return targetColleges.map(college => {
            const match = calculateStrengthMatch(college);
            const acceptanceRate = parseFloat(college.transferInfo.acceptanceRate.replace(/[~%]/g, ''));
            return {
                ...college,
                ...match,
                category: getCategory(match.score, acceptanceRate),
                acceptanceRate,
            };
        });
    }, []);

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
            </div>

            {/* Your Profile Summary */}
            <Card style={{ background: 'var(--gradient-primary)' }}>
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-bold text-white mb-2">Your Profile</h3>
                        <div className="flex gap-4 text-white/80">
                            <span>GPA: {userProfile.gpa}</span>
                            <span>•</span>
                            <span>{userProfile.major}</span>
                            <span>•</span>
                            <span>{userProfile.activities.length} Activities</span>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-3">
                            {userProfile.values.map(v => (
                                <span key={v} className="px-2 py-1 rounded-full text-xs bg-white/20 text-white">{v}</span>
                            ))}
                        </div>
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
                                                <TrendingUp className="w-4 h-4" /> Your Strengths
                                            </h4>
                                            <ul className="space-y-1">
                                                {college.strengths.slice(0, 3).map((s, i) => (
                                                    <li key={i} className="text-sm" style={{ color: 'var(--text-secondary)' }}>• {s}</li>
                                                ))}
                                            </ul>
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--warning)' }}>
                                                <Lightbulb className="w-4 h-4" /> Areas to Address
                                            </h4>
                                            <ul className="space-y-1">
                                                {college.gaps.length > 0 ? college.gaps.slice(0, 2).map((g, i) => (
                                                    <li key={i} className="text-sm" style={{ color: 'var(--text-secondary)' }}>• {g}</li>
                                                )) : (
                                                    <li className="text-sm" style={{ color: 'var(--text-secondary)' }}>• Focus on essay quality</li>
                                                )}
                                            </ul>
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
