'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, Button, StatusBadge, Input, ProgressBar } from '@/components/ui';
import { CountdownTimer } from '@/components/CountdownTimer';
import { targetColleges, getTimeUntilDeadline } from '@/lib/colleges-data';
import {
    FileText,
    Plus,
    Search,
    Sparkles,
    ChevronRight,
    Clock,
    CheckCircle2,
    AlertCircle,
    TrendingUp,
    GraduationCap,
    MapPin,
    ExternalLink
} from 'lucide-react';
import Link from 'next/link';

type FilterType = 'all' | 'completed' | 'in-progress' | 'not-started';
type SortType = 'deadline' | 'name' | 'progress';

// Mock progress data - will be replaced with real data
const essayProgress: Record<string, { completed: number }> = {
    'mit': { completed: 0 },
    'stanford': { completed: 1 },
    'cmu': { completed: 2 },
    'nyu': { completed: 0 },
    'cornell': { completed: 0 },
    'uwash': { completed: 1 },
    'uiuc': { completed: 1 },
    'gatech': { completed: 0 },
    'usc': { completed: 1 },
    'utaustin': { completed: 0 },
    'northeastern': { completed: 1 },
    'nus': { completed: 0 },
    'umich': { completed: 0 },
    'purdue': { completed: 1 },
    'umd': { completed: 0 },
};

export default function EssaysPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState<FilterType>('all');
    const [sortBy, setSortBy] = useState<SortType>('deadline');

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.05 },
        },
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
    };

    const collegesWithProgress = useMemo(() => {
        return targetColleges.map(college => ({
            ...college,
            completed: essayProgress[college.id]?.completed || 0,
            total: college.essays.length,
        }));
    }, []);

    const getStatus = (college: typeof collegesWithProgress[0]) => {
        if (college.completed === college.total) return 'completed';
        if (college.completed > 0) return 'in-progress';
        return 'not-started';
    };

    const filteredColleges = useMemo(() => {
        let result = collegesWithProgress.filter((college) => {
            const matchesSearch = college.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                college.fullName.toLowerCase().includes(searchQuery.toLowerCase());
            const status = getStatus(college);
            const matchesFilter = filter === 'all' || status === filter;
            return matchesSearch && matchesFilter;
        });

        // Sort
        result.sort((a, b) => {
            if (sortBy === 'deadline') {
                return a.deadline.getTime() - b.deadline.getTime();
            } else if (sortBy === 'name') {
                return a.name.localeCompare(b.name);
            } else {
                return (b.completed / b.total) - (a.completed / a.total);
            }
        });

        return result;
    }, [collegesWithProgress, searchQuery, filter, sortBy]);

    const stats = useMemo(() => {
        const total = collegesWithProgress.length;
        const completed = collegesWithProgress.filter(c => getStatus(c) === 'completed').length;
        const inProgress = collegesWithProgress.filter(c => getStatus(c) === 'in-progress').length;
        const notStarted = collegesWithProgress.filter(c => getStatus(c) === 'not-started').length;
        const totalEssays = collegesWithProgress.reduce((acc, c) => acc + c.total, 0);
        const completedEssays = collegesWithProgress.reduce((acc, c) => acc + c.completed, 0);

        // Next deadline
        const now = Date.now();
        const upcomingDeadlines = collegesWithProgress
            .filter(c => c.deadline.getTime() > now)
            .sort((a, b) => a.deadline.getTime() - b.deadline.getTime());
        const nextDeadline = upcomingDeadlines[0];

        return { total, completed, inProgress, notStarted, totalEssays, completedEssays, nextDeadline };
    }, [collegesWithProgress]);

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-8"
        >
            {/* Header */}
            <motion.div variants={itemVariants} className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
                        College Essays
                    </h1>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        Manage and write essays for your {stats.total} target colleges
                    </p>
                </div>
                <Button icon={<Plus className="w-4 h-4" />}>
                    Add College
                </Button>
            </motion.div>

            {/* Next Deadline Banner */}
            {stats.nextDeadline && (
                <motion.div variants={itemVariants}>
                    <Card
                        className="overflow-hidden"
                        style={{
                            background: getTimeUntilDeadline(stats.nextDeadline.deadline).isUrgent
                                ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.05) 100%)'
                                : 'var(--gradient-primary)',
                            border: getTimeUntilDeadline(stats.nextDeadline.deadline).isUrgent
                                ? '1px solid rgba(239, 68, 68, 0.3)'
                                : 'none'
                        }}
                    >
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div
                                    className="w-14 h-14 rounded-2xl flex items-center justify-center"
                                    style={{ background: 'rgba(255, 255, 255, 0.15)' }}
                                >
                                    <Clock className="w-7 h-7 text-white" />
                                </div>
                                <div>
                                    <p className="text-sm opacity-80">Next Deadline</p>
                                    <h3 className="text-xl font-bold">{stats.nextDeadline.name}</h3>
                                    <p className="text-sm opacity-80">{stats.nextDeadline.fullName}</p>
                                </div>
                            </div>
                            <CountdownTimer deadline={stats.nextDeadline.deadline} />
                        </div>
                    </Card>
                </motion.div>
            )}

            {/* Stats Overview */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <Card className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(34, 197, 94, 0.15)' }}>
                        <CheckCircle2 className="w-6 h-6" style={{ color: 'var(--success)' }} />
                    </div>
                    <div>
                        <p className="text-2xl font-bold">{stats.completed}</p>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Completed</p>
                    </div>
                </Card>
                <Card className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(234, 179, 8, 0.15)' }}>
                        <Clock className="w-6 h-6" style={{ color: 'var(--warning)' }} />
                    </div>
                    <div>
                        <p className="text-2xl font-bold">{stats.inProgress}</p>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>In Progress</p>
                    </div>
                </Card>
                <Card className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(156, 163, 175, 0.15)' }}>
                        <AlertCircle className="w-6 h-6" style={{ color: 'var(--text-muted)' }} />
                    </div>
                    <div>
                        <p className="text-2xl font-bold">{stats.notStarted}</p>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Not Started</p>
                    </div>
                </Card>
                <Card className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(91, 111, 242, 0.15)' }}>
                        <FileText className="w-6 h-6" style={{ color: 'var(--primary-400)' }} />
                    </div>
                    <div>
                        <p className="text-2xl font-bold">{stats.completedEssays}/{stats.totalEssays}</p>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Essays</p>
                    </div>
                </Card>
                <Card className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(20, 184, 166, 0.15)' }}>
                        <TrendingUp className="w-6 h-6" style={{ color: 'var(--accent-teal)' }} />
                    </div>
                    <div>
                        <p className="text-2xl font-bold">{Math.round((stats.completedEssays / stats.totalEssays) * 100)}%</p>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Progress</p>
                    </div>
                </Card>
            </motion.div>

            {/* Search, Filter, Sort */}
            <motion.div variants={itemVariants} className="flex flex-wrap gap-4 items-center">
                <Input
                    placeholder="Search colleges..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    icon={<Search className="w-4 h-4" />}
                    className="flex-1 min-w-[200px] max-w-md"
                />
                <div className="flex gap-2">
                    {(['all', 'completed', 'in-progress', 'not-started'] as FilterType[]).map((f) => (
                        <Button
                            key={f}
                            variant={filter === f ? 'primary' : 'secondary'}
                            size="sm"
                            onClick={() => setFilter(f)}
                        >
                            {f === 'all' ? 'All' : f === 'in-progress' ? 'In Progress' : f === 'not-started' ? 'Not Started' : 'Completed'}
                        </Button>
                    ))}
                </div>
                <select
                    className="input-field w-auto"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortType)}
                >
                    <option value="deadline">Sort by Deadline</option>
                    <option value="name">Sort by Name</option>
                    <option value="progress">Sort by Progress</option>
                </select>
            </motion.div>

            {/* College Cards Grid */}
            <motion.div variants={containerVariants} className="card-grid">
                {filteredColleges.map((college) => {
                    const status = getStatus(college);
                    const progress = (college.completed / college.total) * 100;
                    const timeLeft = getTimeUntilDeadline(college.deadline);

                    return (
                        <motion.div key={college.id} variants={itemVariants}>
                            <Link href={`/essays/${college.id}`}>
                                <Card className="cursor-pointer group h-full">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'var(--gradient-primary)' }}>
                                            <GraduationCap className="w-7 h-7 text-white" />
                                        </div>
                                        <StatusBadge
                                            status={status === 'completed' ? 'success' : status === 'in-progress' ? 'warning' : 'neutral'}
                                        >
                                            {status === 'completed' ? 'Complete' : status === 'in-progress' ? 'In Progress' : 'Not Started'}
                                        </StatusBadge>
                                    </div>

                                    <h3 className="text-xl font-bold mb-1">{college.name}</h3>
                                    <p className="text-sm mb-2 truncate" style={{ color: 'var(--text-muted)' }}>
                                        {college.fullName}
                                    </p>
                                    <div className="flex items-center gap-2 text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
                                        <MapPin className="w-3 h-3" />
                                        <span>{college.location}</span>
                                    </div>

                                    <div className="mb-4">
                                        <div className="flex justify-between text-sm mb-2">
                                            <span style={{ color: 'var(--text-secondary)' }}>Essays Progress</span>
                                            <span className="font-medium">{college.completed}/{college.total}</span>
                                        </div>
                                        <ProgressBar value={progress} />
                                    </div>

                                    {/* Live Countdown */}
                                    <div
                                        className="p-3 rounded-lg mb-4"
                                        style={{
                                            background: timeLeft.isUrgent
                                                ? 'rgba(239, 68, 68, 0.1)'
                                                : 'var(--bg-secondary)',
                                            border: timeLeft.isUrgent ? '1px solid rgba(239, 68, 68, 0.2)' : 'none'
                                        }}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Deadline</span>
                                            <CountdownTimer deadline={college.deadline} compact />
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: 'var(--glass-border)' }}>
                                        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                                            <span>{college.essays.length} essays</span>
                                            <span>•</span>
                                            <span>{college.transferInfo.acceptanceRate} acceptance</span>
                                        </div>
                                        <motion.div
                                            className="flex items-center gap-1 text-sm font-medium"
                                            style={{ color: 'var(--primary-400)' }}
                                            whileHover={{ x: 4 }}
                                        >
                                            <Sparkles className="w-4 h-4" />
                                            <span>Write</span>
                                            <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </motion.div>
                                    </div>
                                </Card>
                            </Link>
                        </motion.div>
                    );
                })}
            </motion.div>

            {filteredColleges.length === 0 && (
                <motion.div variants={itemVariants} className="text-center py-12">
                    <FileText className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
                    <h3 className="text-xl font-semibold mb-2">No colleges found</h3>
                    <p style={{ color: 'var(--text-muted)' }}>Try adjusting your search or filter</p>
                </motion.div>
            )}
        </motion.div>
    );
}
