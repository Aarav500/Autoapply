'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface CountdownTimerProps {
    deadline: Date;
    className?: string;
    compact?: boolean;
}

export function CountdownTimer({ deadline, className = '', compact = false }: CountdownTimerProps) {
    const [timeLeft, setTimeLeft] = useState({
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        isPast: false,
        isUrgent: false,
    });

    useEffect(() => {
        const calculateTimeLeft = () => {
            const now = new Date();
            const diff = deadline.getTime() - now.getTime();
            const isPast = diff < 0;
            const absDiff = Math.abs(diff);

            const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((absDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((absDiff % (1000 * 60)) / 1000);

            setTimeLeft({
                days,
                hours,
                minutes,
                seconds,
                isPast,
                isUrgent: !isPast && days <= 7,
            });
        };

        calculateTimeLeft();
        const timer = setInterval(calculateTimeLeft, 1000);

        return () => clearInterval(timer);
    }, [deadline]);

    if (timeLeft.isPast) {
        return (
            <div className={`text-center ${className}`}>
                <span className="text-sm font-bold" style={{ color: 'var(--error)' }}>
                    Deadline Passed
                </span>
            </div>
        );
    }

    if (compact) {
        return (
            <div
                className={`flex items-center gap-1 text-xs font-mono ${className}`}
                style={{ color: timeLeft.isUrgent ? 'var(--error)' : 'var(--text-secondary)' }}
            >
                <motion.span
                    key={timeLeft.days}
                    initial={{ y: -10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="font-bold"
                >
                    {timeLeft.days}d
                </motion.span>
                <span>:</span>
                <motion.span
                    key={timeLeft.hours}
                    initial={{ y: -10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                >
                    {String(timeLeft.hours).padStart(2, '0')}h
                </motion.span>
                <span>:</span>
                <motion.span
                    key={timeLeft.minutes}
                    initial={{ y: -10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                >
                    {String(timeLeft.minutes).padStart(2, '0')}m
                </motion.span>
                <span>:</span>
                <motion.span
                    key={timeLeft.seconds}
                    initial={{ y: -10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className={timeLeft.isUrgent ? 'text-red-400' : ''}
                >
                    {String(timeLeft.seconds).padStart(2, '0')}s
                </motion.span>
            </div>
        );
    }

    return (
        <div
            className={`flex items-center justify-center gap-2 ${className}`}
            style={{ color: timeLeft.isUrgent ? 'var(--error)' : 'var(--text-primary)' }}
        >
            <TimeBlock value={timeLeft.days} label="Days" isUrgent={timeLeft.isUrgent} />
            <span className="text-2xl font-bold" style={{ color: 'var(--text-muted)' }}>:</span>
            <TimeBlock value={timeLeft.hours} label="Hrs" isUrgent={timeLeft.isUrgent} />
            <span className="text-2xl font-bold" style={{ color: 'var(--text-muted)' }}>:</span>
            <TimeBlock value={timeLeft.minutes} label="Min" isUrgent={timeLeft.isUrgent} />
            <span className="text-2xl font-bold" style={{ color: 'var(--text-muted)' }}>:</span>
            <TimeBlock value={timeLeft.seconds} label="Sec" isUrgent={timeLeft.isUrgent} />
        </div>
    );
}

interface TimeBlockProps {
    value: number;
    label: string;
    isUrgent: boolean;
}

function TimeBlock({ value, label, isUrgent }: TimeBlockProps) {
    return (
        <div className="flex flex-col items-center">
            <motion.div
                key={value}
                initial={{ scale: 1.1, opacity: 0.5 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-14 h-14 rounded-xl flex items-center justify-center font-mono text-2xl font-bold"
                style={{
                    background: isUrgent
                        ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(239, 68, 68, 0.1) 100%)'
                        : 'var(--bg-secondary)',
                    border: isUrgent ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--glass-border)',
                }}
            >
                {String(value).padStart(2, '0')}
            </motion.div>
            <span className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{label}</span>
        </div>
    );
}

// Dashboard Deadline Widget
interface DeadlineWidgetProps {
    colleges: { name: string; deadline: Date; completed: number; total: number }[];
}

export function DeadlineWidget({ colleges }: DeadlineWidgetProps) {
    // Sort by deadline
    const sorted = [...colleges].sort((a, b) => a.deadline.getTime() - b.deadline.getTime());
    const upcoming = sorted.filter(c => c.deadline.getTime() > Date.now()).slice(0, 5);

    return (
        <div className="space-y-3">
            {upcoming.map((college) => (
                <div
                    key={college.name}
                    className="flex items-center justify-between p-3 rounded-lg"
                    style={{ background: 'var(--bg-secondary)' }}
                >
                    <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{college.name}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {college.completed}/{college.total} essays
                        </p>
                    </div>
                    <CountdownTimer deadline={college.deadline} compact />
                </div>
            ))}
        </div>
    );
}
