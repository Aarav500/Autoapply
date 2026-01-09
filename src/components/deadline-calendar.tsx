'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui';
import {
    ChevronLeft, ChevronRight, Calendar as CalendarIcon,
    Award, Briefcase, AlertTriangle, Clock, Tag
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

export interface DeadlineItem {
    id: string;
    title: string;
    organization: string;
    type: 'job' | 'scholarship';
    deadline: string;
    amount?: string;
    matchScore?: number;
    status: 'not_started' | 'docs_generated' | 'applied';
    url?: string;
}

interface CalendarDay {
    date: Date;
    isCurrentMonth: boolean;
    isToday: boolean;
    deadlines: DeadlineItem[];
}

interface DeadlineCalendarProps {
    deadlines: DeadlineItem[];
    onDeadlineClick?: (item: DeadlineItem) => void;
}

// ============================================
// CALENDAR COMPONENT
// ============================================

export function DeadlineCalendar({ deadlines, onDeadlineClick }: DeadlineCalendarProps) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);

    // Get calendar days for current month view
    const calendarDays = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        // First day of month
        const firstDay = new Date(year, month, 1);
        // Last day of month
        const lastDay = new Date(year, month + 1, 0);

        // Start from the Sunday before the first day (or first day if it's Sunday)
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - startDate.getDay());

        // End on the Saturday after the last day (or last day if it's Saturday)
        const endDate = new Date(lastDay);
        endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

        const days: CalendarDay[] = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const currentDateIterator = new Date(startDate);
        while (currentDateIterator <= endDate) {
            const dateStr = currentDateIterator.toISOString().split('T')[0];
            const dayDeadlines = deadlines.filter(d => {
                const deadlineDate = new Date(d.deadline).toISOString().split('T')[0];
                return deadlineDate === dateStr;
            });

            days.push({
                date: new Date(currentDateIterator),
                isCurrentMonth: currentDateIterator.getMonth() === month,
                isToday: currentDateIterator.getTime() === today.getTime(),
                deadlines: dayDeadlines,
            });

            currentDateIterator.setDate(currentDateIterator.getDate() + 1);
        }

        return days;
    }, [currentDate, deadlines]);

    // Group deadlines by urgency
    const upcomingDeadlines = useMemo(() => {
        const now = new Date();
        return deadlines
            .filter(d => new Date(d.deadline) >= now)
            .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
            .slice(0, 10);
    }, [deadlines]);

    const urgentCount = upcomingDeadlines.filter(d => {
        const daysLeft = Math.ceil((new Date(d.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return daysLeft <= 7;
    }).length;

    // Navigation
    const goToPreviousMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const goToNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const goToToday = () => {
        setCurrentDate(new Date());
    };

    // Format helpers
    const monthYearLabel = currentDate.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
    });

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const getDaysUntil = (deadline: string) => {
        return Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    };

    const getUrgencyColor = (daysLeft: number) => {
        if (daysLeft <= 3) return 'var(--error)';
        if (daysLeft <= 7) return 'var(--warning)';
        if (daysLeft <= 14) return 'var(--primary-400)';
        return 'var(--success)';
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    <CalendarIcon className="w-6 h-6" style={{ color: 'var(--primary-400)' }} />
                    Deadline Calendar
                </h2>
                <div className="flex items-center gap-2">
                    {urgentCount > 0 && (
                        <span
                            className="px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1"
                            style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)' }}
                        >
                            <AlertTriangle className="w-4 h-4" />
                            {urgentCount} urgent
                        </span>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Calendar Grid */}
                <Card className="lg:col-span-2">
                    {/* Month Navigation */}
                    <div className="flex items-center justify-between mb-4">
                        <button
                            onClick={goToPreviousMonth}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-3">
                            <h3 className="text-xl font-semibold">{monthYearLabel}</h3>
                            <button
                                onClick={goToToday}
                                className="px-3 py-1 text-sm rounded-lg"
                                style={{ background: 'var(--bg-secondary)' }}
                            >
                                Today
                            </button>
                        </div>
                        <button
                            onClick={goToNextMonth}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Day Headers */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                        {dayNames.map(day => (
                            <div
                                key={day}
                                className="text-center text-sm font-medium py-2"
                                style={{ color: 'var(--text-muted)' }}
                            >
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar Days */}
                    <div className="grid grid-cols-7 gap-1">
                        {calendarDays.map((day, index) => {
                            const hasDeadlines = day.deadlines.length > 0;
                            const jobCount = day.deadlines.filter(d => d.type === 'job').length;
                            const scholarshipCount = day.deadlines.filter(d => d.type === 'scholarship').length;

                            return (
                                <motion.button
                                    key={index}
                                    onClick={() => hasDeadlines && setSelectedDay(day)}
                                    className={`
                                        relative p-2 min-h-[80px] rounded-lg text-left transition-all
                                        ${day.isCurrentMonth ? '' : 'opacity-40'}
                                        ${day.isToday ? 'ring-2' : ''}
                                        ${hasDeadlines ? 'cursor-pointer hover:bg-white/5' : 'cursor-default'}
                                        ${selectedDay?.date.getTime() === day.date.getTime() ? 'bg-white/10' : ''}
                                    `}
                                    style={{
                                        background: hasDeadlines ? 'rgba(91, 111, 242, 0.05)' : 'transparent',
                                        borderColor: day.isToday ? 'var(--primary-400)' : 'transparent',
                                    }}
                                    whileHover={hasDeadlines ? { scale: 1.02 } : undefined}
                                >
                                    <span
                                        className={`text-sm font-medium ${day.isToday ? 'text-white' : ''
                                            }`}
                                        style={{
                                            color: day.isToday ? 'var(--primary-400)' : undefined,
                                        }}
                                    >
                                        {day.date.getDate()}
                                    </span>

                                    {hasDeadlines && (
                                        <div className="mt-1 space-y-0.5">
                                            {jobCount > 0 && (
                                                <div className="flex items-center gap-1">
                                                    <div
                                                        className="w-2 h-2 rounded-full"
                                                        style={{ background: 'var(--primary-400)' }}
                                                    />
                                                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                                        {jobCount} job{jobCount > 1 ? 's' : ''}
                                                    </span>
                                                </div>
                                            )}
                                            {scholarshipCount > 0 && (
                                                <div className="flex items-center gap-1">
                                                    <div
                                                        className="w-2 h-2 rounded-full"
                                                        style={{ background: 'var(--accent-gold)' }}
                                                    />
                                                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                                        {scholarshipCount} scholarship{scholarshipCount > 1 ? 's' : ''}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </motion.button>
                            );
                        })}
                    </div>

                    {/* Selected Day Details */}
                    <AnimatePresence>
                        {selectedDay && selectedDay.deadlines.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-4 pt-4 border-t"
                                style={{ borderColor: 'var(--border-color)' }}
                            >
                                <h4 className="font-medium mb-3">
                                    Deadlines for {selectedDay.date.toLocaleDateString('en-US', {
                                        weekday: 'long',
                                        month: 'long',
                                        day: 'numeric',
                                    })}
                                </h4>
                                <div className="space-y-2">
                                    {selectedDay.deadlines.map(item => (
                                        <div
                                            key={item.id}
                                            onClick={() => onDeadlineClick?.(item)}
                                            className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-white/5 transition-colors"
                                            style={{ background: 'var(--bg-secondary)' }}
                                        >
                                            {item.type === 'job' ? (
                                                <Briefcase className="w-5 h-5" style={{ color: 'var(--primary-400)' }} />
                                            ) : (
                                                <Award className="w-5 h-5" style={{ color: 'var(--accent-gold)' }} />
                                            )}
                                            <div className="flex-1">
                                                <p className="font-medium">{item.title}</p>
                                                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                                                    {item.organization}
                                                </p>
                                            </div>
                                            {item.amount && (
                                                <span className="text-sm" style={{ color: 'var(--success)' }}>
                                                    {item.amount}
                                                </span>
                                            )}
                                            {item.matchScore && (
                                                <span
                                                    className="px-2 py-0.5 rounded text-xs font-medium"
                                                    style={{ background: 'rgba(91, 111, 242, 0.1)', color: 'var(--primary-400)' }}
                                                >
                                                    {item.matchScore}%
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </Card>

                {/* Upcoming Deadlines List */}
                <Card>
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <Clock className="w-5 h-5" style={{ color: 'var(--warning)' }} />
                        Upcoming Deadlines
                    </h3>

                    {upcomingDeadlines.length === 0 ? (
                        <p className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                            No upcoming deadlines
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {upcomingDeadlines.map(item => {
                                const daysLeft = getDaysUntil(item.deadline);
                                const urgencyColor = getUrgencyColor(daysLeft);

                                return (
                                    <div
                                        key={item.id}
                                        onClick={() => onDeadlineClick?.(item)}
                                        className="p-3 rounded-lg cursor-pointer hover:bg-white/5 transition-colors"
                                        style={{
                                            background: 'var(--bg-secondary)',
                                            borderLeft: `3px solid ${urgencyColor}`,
                                        }}
                                    >
                                        <div className="flex items-start justify-between mb-1">
                                            <div className="flex items-center gap-2">
                                                {item.type === 'job' ? (
                                                    <Briefcase className="w-4 h-4" style={{ color: 'var(--primary-400)' }} />
                                                ) : (
                                                    <Award className="w-4 h-4" style={{ color: 'var(--accent-gold)' }} />
                                                )}
                                                <span className="font-medium text-sm">{item.title}</span>
                                            </div>
                                        </div>
                                        <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                                            {item.organization}
                                        </p>
                                        <div className="flex items-center justify-between">
                                            <span
                                                className="text-xs font-medium"
                                                style={{ color: urgencyColor }}
                                            >
                                                {daysLeft === 0
                                                    ? 'Due today!'
                                                    : daysLeft === 1
                                                        ? 'Due tomorrow'
                                                        : `${daysLeft} days left`}
                                            </span>
                                            {item.status !== 'not_started' && (
                                                <span
                                                    className="px-2 py-0.5 rounded text-xs"
                                                    style={{
                                                        background: item.status === 'applied'
                                                            ? 'rgba(34, 197, 94, 0.1)'
                                                            : 'rgba(234, 179, 8, 0.1)',
                                                        color: item.status === 'applied'
                                                            ? 'var(--success)'
                                                            : 'var(--warning)',
                                                    }}
                                                >
                                                    {item.status === 'applied' ? 'Applied' : 'Docs ready'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Legend */}
                    <div className="mt-6 pt-4 border-t" style={{ borderColor: 'var(--border-color)' }}>
                        <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
                            Urgency Legend
                        </p>
                        <div className="space-y-1">
                            {[
                                { label: '≤3 days', color: 'var(--error)' },
                                { label: '4-7 days', color: 'var(--warning)' },
                                { label: '8-14 days', color: 'var(--primary-400)' },
                                { label: '15+ days', color: 'var(--success)' },
                            ].map(({ label, color }) => (
                                <div key={label} className="flex items-center gap-2">
                                    <div
                                        className="w-3 h-3 rounded"
                                        style={{ background: color }}
                                    />
                                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                        {label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}

export default DeadlineCalendar;
