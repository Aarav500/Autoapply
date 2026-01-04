'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Button, StatusBadge, ProgressBar } from '@/components/ui';
import { CountdownTimer } from '@/components/CountdownTimer';
import { targetColleges, getTimeUntilDeadline } from '@/lib/colleges-data';
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    Clock,
    AlertTriangle,
    CheckCircle2,
    FileText,
    Bell,
    Filter,
    GraduationCap
} from 'lucide-react';
import Link from 'next/link';

type ViewMode = 'month' | 'list';

// Helper to get days in month
function getDaysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate();
}

// Helper to get first day of month (0 = Sunday)
function getFirstDayOfMonth(year: number, month: number) {
    return new Date(year, month, 1).getDay();
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarPage() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<ViewMode>('month');
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Get deadlines for current month
    const deadlinesThisMonth = useMemo(() => {
        return targetColleges.filter(college => {
            const deadline = college.deadline;
            return deadline.getFullYear() === year && deadline.getMonth() === month;
        });
    }, [year, month]);

    // Get all deadlines grouped by date
    const deadlinesByDate = useMemo(() => {
        const grouped: Record<string, typeof targetColleges> = {};
        targetColleges.forEach(college => {
            const dateKey = college.deadline.toDateString();
            if (!grouped[dateKey]) grouped[dateKey] = [];
            grouped[dateKey].push(college);
        });
        return grouped;
    }, []);

    // Calendar grid
    const calendarDays = useMemo(() => {
        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month);
        const days: (number | null)[] = [];

        // Empty cells for days before the 1st
        for (let i = 0; i < firstDay; i++) {
            days.push(null);
        }

        // Days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            days.push(day);
        }

        return days;
    }, [year, month]);

    // Sorted deadlines for list view
    const sortedDeadlines = useMemo(() => {
        return [...targetColleges]
            .filter(c => c.deadline.getTime() > Date.now())
            .sort((a, b) => a.deadline.getTime() - b.deadline.getTime());
    }, []);

    const goToPreviousMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1));
    };

    const goToNextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1));
    };

    const getDeadlinesForDay = (day: number) => {
        const date = new Date(year, month, day);
        return deadlinesByDate[date.toDateString()] || [];
    };

    const getPriorityColor = (daysLeft: number) => {
        if (daysLeft <= 7) return 'var(--error)';
        if (daysLeft <= 14) return 'var(--warning)';
        if (daysLeft <= 30) return 'var(--primary-400)';
        return 'var(--success)';
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
                        <CalendarIcon className="w-8 h-8" style={{ color: 'var(--primary-400)' }} />
                        Deadline Calendar
                    </h1>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        Track all your college application deadlines
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant={viewMode === 'month' ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => setViewMode('month')}
                    >
                        Month
                    </Button>
                    <Button
                        variant={viewMode === 'list' ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => setViewMode('list')}
                    >
                        List
                    </Button>
                </div>
            </div>

            {/* Upcoming Deadlines Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="flex items-center gap-4" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(239, 68, 68, 0.2)' }}>
                        <AlertTriangle className="w-6 h-6" style={{ color: 'var(--error)' }} />
                    </div>
                    <div>
                        <p className="text-2xl font-bold">{sortedDeadlines.filter(c => getTimeUntilDeadline(c.deadline).days <= 7).length}</p>
                        <p className="text-sm" style={{ color: 'var(--error)' }}>This Week</p>
                    </div>
                </Card>
                <Card className="flex items-center gap-4" style={{ background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.2)' }}>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(234, 179, 8, 0.2)' }}>
                        <Clock className="w-6 h-6" style={{ color: 'var(--warning)' }} />
                    </div>
                    <div>
                        <p className="text-2xl font-bold">{sortedDeadlines.filter(c => {
                            const days = getTimeUntilDeadline(c.deadline).days;
                            return days > 7 && days <= 30;
                        }).length}</p>
                        <p className="text-sm" style={{ color: 'var(--warning)' }}>This Month</p>
                    </div>
                </Card>
                <Card className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(91, 111, 242, 0.15)' }}>
                        <FileText className="w-6 h-6" style={{ color: 'var(--primary-400)' }} />
                    </div>
                    <div>
                        <p className="text-2xl font-bold">{targetColleges.reduce((acc, c) => acc + c.essays.length, 0)}</p>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Total Essays</p>
                    </div>
                </Card>
                <Card className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(34, 197, 94, 0.15)' }}>
                        <GraduationCap className="w-6 h-6" style={{ color: 'var(--success)' }} />
                    </div>
                    <div>
                        <p className="text-2xl font-bold">{targetColleges.length}</p>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Target Colleges</p>
                    </div>
                </Card>
            </div>

            {viewMode === 'month' ? (
                <Card>
                    {/* Calendar Header */}
                    <div className="flex items-center justify-between mb-6">
                        <Button variant="ghost" size="sm" onClick={goToPreviousMonth} icon={<ChevronLeft className="w-4 h-4" />} />
                        <h2 className="text-xl font-bold">{MONTHS[month]} {year}</h2>
                        <Button variant="ghost" size="sm" onClick={goToNextMonth} icon={<ChevronRight className="w-4 h-4" />} />
                    </div>

                    {/* Day Headers */}
                    <div className="grid grid-cols-7 gap-2 mb-2">
                        {DAYS.map(day => (
                            <div key={day} className="text-center text-sm font-medium py-2" style={{ color: 'var(--text-muted)' }}>
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-2">
                        {calendarDays.map((day, index) => {
                            if (day === null) {
                                return <div key={`empty-${index}`} className="h-24" />;
                            }

                            const deadlines = getDeadlinesForDay(day);
                            const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
                            const hasDeadlines = deadlines.length > 0;

                            return (
                                <motion.div
                                    key={day}
                                    className={`h-24 p-2 rounded-xl cursor-pointer transition-all ${isToday ? 'ring-2' : ''}`}
                                    style={{
                                        background: hasDeadlines
                                            ? 'rgba(91, 111, 242, 0.1)'
                                            : 'var(--bg-secondary)',
                                        ringColor: isToday ? 'var(--primary-500)' : undefined
                                    }}
                                    whileHover={{ scale: 1.02 }}
                                    onClick={() => setSelectedDate(new Date(year, month, day))}
                                >
                                    <div className="flex items-start justify-between">
                                        <span className={`text-sm font-medium ${isToday ? 'text-primary-400' : ''}`}>
                                            {day}
                                        </span>
                                        {hasDeadlines && (
                                            <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                                                style={{ background: 'var(--gradient-primary)', color: 'white' }}>
                                                {deadlines.length}
                                            </span>
                                        )}
                                    </div>
                                    <div className="mt-1 space-y-1">
                                        {deadlines.slice(0, 2).map(college => (
                                            <div
                                                key={college.id}
                                                className="text-xs truncate px-1 py-0.5 rounded"
                                                style={{
                                                    background: getPriorityColor(getTimeUntilDeadline(college.deadline).days),
                                                    color: 'white'
                                                }}
                                            >
                                                {college.name}
                                            </div>
                                        ))}
                                        {deadlines.length > 2 && (
                                            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                                +{deadlines.length - 2} more
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </Card>
            ) : (
                /* List View */
                <Card>
                    <h3 className="text-lg font-semibold mb-4">All Deadlines (Priority Order)</h3>
                    <div className="space-y-3">
                        {sortedDeadlines.map((college, index) => {
                            const timeLeft = getTimeUntilDeadline(college.deadline);
                            const priorityColor = getPriorityColor(timeLeft.days);

                            return (
                                <motion.div
                                    key={college.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.03 }}
                                    className="flex items-center justify-between p-4 rounded-xl"
                                    style={{
                                        background: 'var(--bg-secondary)',
                                        borderLeft: `4px solid ${priorityColor}`
                                    }}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold"
                                            style={{ background: priorityColor, color: 'white' }}>
                                            {index + 1}
                                        </div>
                                        <div>
                                            <h4 className="font-semibold">{college.name}</h4>
                                            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                                                {college.fullName} · {college.essays.length} essays
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <p className="font-medium">{college.deadline.toLocaleDateString('en-US', {
                                                weekday: 'short', month: 'short', day: 'numeric'
                                            })}</p>
                                            <CountdownTimer deadline={college.deadline} compact />
                                        </div>
                                        <Link href={`/essays/${college.id}`}>
                                            <Button size="sm">Write Essays</Button>
                                        </Link>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </Card>
            )}

            {/* Selected Date Popup */}
            <AnimatePresence>
                {selectedDate && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
                        onClick={() => setSelectedDate(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.9 }}
                            className="w-full max-w-md"
                            onClick={e => e.stopPropagation()}
                        >
                            <Card>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold">
                                        {selectedDate.toLocaleDateString('en-US', {
                                            weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
                                        })}
                                    </h3>
                                    <Button variant="ghost" size="sm" onClick={() => setSelectedDate(null)}>×</Button>
                                </div>

                                {deadlinesByDate[selectedDate.toDateString()]?.length > 0 ? (
                                    <div className="space-y-3">
                                        {deadlinesByDate[selectedDate.toDateString()].map(college => (
                                            <div key={college.id} className="p-3 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                                                <h4 className="font-medium">{college.name}</h4>
                                                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                                                    {college.fullName}
                                                </p>
                                                <p className="text-sm mt-1">{college.essays.length} essays due</p>
                                                <Link href={`/essays/${college.id}`}>
                                                    <Button size="sm" className="mt-2">Write Essays</Button>
                                                </Link>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-center py-4" style={{ color: 'var(--text-muted)' }}>
                                        No deadlines on this day
                                    </p>
                                )}
                            </Card>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
