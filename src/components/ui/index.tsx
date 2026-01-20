'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface CardProps {
    children: ReactNode;
    className?: string;
    hover?: boolean;
    gradient?: boolean;
    onClick?: () => void;
    style?: React.CSSProperties;
    onDragOver?: (e: React.DragEvent) => void;
    onDragLeave?: () => void;
    onDrop?: (e: React.DragEvent) => void;
}

export function Card({ children, className = '', hover = true, gradient = false, onClick, style, onDragOver, onDragLeave, onDrop }: CardProps) {
    return (
        <motion.div
            className={`glass-card p-6 ${className}`}
            style={{ ...(gradient ? { background: 'var(--gradient-primary)' } : {}), ...style }}
            whileHover={hover ? { y: -4, scale: 1.01 } : {}}
            transition={{ duration: 0.2 }}
            onClick={onClick}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
        >
            {children}
        </motion.div>
    );
}

interface StatsCardProps {
    value: string | number;
    label: string;
    icon?: ReactNode;
    trend?: { value: number; isPositive: boolean };
    className?: string;
}

export function StatsCard({ value, label, icon, trend, className = '' }: StatsCardProps) {
    return (
        <Card className={className}>
            <div className="flex items-start justify-between">
                <div className="stats-card">
                    <span className="stats-value">{value}</span>
                    <span className="stats-label">{label}</span>
                    {trend && (
                        <span className={`text-xs font-medium ${trend.isPositive ? 'text-green-400' : 'text-red-400'}`}>
                            {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
                        </span>
                    )}
                </div>
                {icon && (
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(91, 111, 242, 0.15)' }}>
                        {icon}
                    </div>
                )}
            </div>
        </Card>
    );
}

interface StatusBadgeProps {
    status: 'success' | 'warning' | 'error' | 'info' | 'neutral';
    children: ReactNode;
    className?: string;
}

export function StatusBadge({ status, children, className = '' }: StatusBadgeProps) {
    return (
        <span className={`badge badge-${status} ${className}`}>
            {children}
        </span>
    );
}

interface ButtonProps {
    children?: ReactNode;
    variant?: 'primary' | 'secondary' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    className?: string;
    onClick?: () => void;
    disabled?: boolean;
    loading?: boolean;
    icon?: ReactNode;
    style?: React.CSSProperties;
}

export function Button({
    children,
    variant = 'primary',
    size = 'md',
    className = '',
    onClick,
    disabled = false,
    loading = false,
    icon,
    style
}: ButtonProps) {
    const sizeClasses = {
        sm: 'px-3 py-1.5 text-xs',
        md: 'px-4 py-2 text-sm',
        lg: 'px-6 py-3 text-base',
    };

    const baseClass = variant === 'primary' ? 'btn-gradient' : variant === 'secondary' ? 'btn-secondary' : 'hover:bg-white/5 rounded-lg transition-colors';

    return (
        <motion.button
            className={`${baseClass} ${sizeClasses[size]} ${className} flex items-center justify-center gap-2`}
            onClick={onClick}
            disabled={disabled || loading}
            whileHover={{ scale: disabled ? 1 : 1.02 }}
            whileTap={{ scale: disabled ? 1 : 0.98 }}
            style={{ opacity: disabled ? 0.5 : 1, ...style }}
        >
            {loading ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : icon}
            {children}
        </motion.button>
    );
}

interface ProgressBarProps {
    value: number;
    max?: number;
    className?: string;
    showLabel?: boolean;
}

export function ProgressBar({ value, max = 100, className = '', showLabel = false }: ProgressBarProps) {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));

    return (
        <div className={`flex items-center gap-3 ${className}`}>
            <div className="progress-bar flex-1">
                <motion.div
                    className="progress-bar-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                />
            </div>
            {showLabel && (
                <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)', minWidth: '3rem' }}>
                    {Math.round(percentage)}%
                </span>
            )}
        </div>
    );
}

interface ConfidenceMeterProps {
    value: number;
    label?: string;
    className?: string;
}

export function ConfidenceMeter({ value, label, className = '' }: ConfidenceMeterProps) {
    const level = value < 50 ? 'low' : value < 80 ? 'medium' : 'high';

    return (
        <div className={`confidence-meter ${className}`}>
            {label && <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</span>}
            <div className="confidence-bar">
                <motion.div
                    className={`confidence-fill ${level}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${value}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                />
            </div>
            <span className="text-sm font-semibold" style={{
                color: level === 'low' ? 'var(--error)' : level === 'medium' ? 'var(--warning)' : 'var(--success)'
            }}>
                {Math.round(value)}%
            </span>
        </div>
    );
}

interface TagProps {
    children: ReactNode;
    variant?: 'default' | 'primary';
    onRemove?: () => void;
    className?: string;
}

export function Tag({ children, variant = 'default', onRemove, className = '' }: TagProps) {
    return (
        <span className={`tag ${variant === 'primary' ? 'primary' : ''} ${className}`}>
            {children}
            {onRemove && (
                <button onClick={onRemove} className="hover:text-white transition-colors">×</button>
            )}
        </span>
    );
}

interface InputProps {
    type?: string;
    placeholder?: string;
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    className?: string;
    icon?: ReactNode;
}

export function Input({ type = 'text', placeholder, value, onChange, className = '', icon }: InputProps) {
    return (
        <div className={`relative ${className}`}>
            {icon && (
                <div className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
                    {icon}
                </div>
            )}
            <input
                type={type}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                className={`input-field ${icon ? 'pl-10' : ''}`}
            />
        </div>
    );
}

interface TextareaProps {
    placeholder?: string;
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    className?: string;
    rows?: number;
}

export function Textarea({ placeholder, value, onChange, className = '', rows = 4 }: TextareaProps) {
    return (
        <textarea
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            rows={rows}
            className={`input-field resize-none ${className}`}
        />
    );
}
