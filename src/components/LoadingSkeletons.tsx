'use client';

import { motion } from 'framer-motion';

// ============================================
// SKELETON COMPONENTS
// ============================================

interface SkeletonProps {
    className?: string;
    width?: string | number;
    height?: string | number;
    borderRadius?: string;
}

export function Skeleton({
    className = '',
    width,
    height,
    borderRadius = '8px'
}: SkeletonProps) {
    return (
        <motion.div
            className={`skeleton ${className}`}
            style={{
                width: width || '100%',
                height: height || '20px',
                borderRadius,
                background: 'linear-gradient(90deg, var(--bg-secondary) 25%, var(--bg-tertiary) 50%, var(--bg-secondary) 75%)',
                backgroundSize: '200% 100%',
            }}
            animate={{
                backgroundPosition: ['200% 0', '-200% 0'],
            }}
            transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'linear',
            }}
        />
    );
}

// ============================================
// CARD SKELETON
// ============================================

export function CardSkeleton({ className = '' }: { className?: string }) {
    return (
        <div
            className={`p-6 rounded-2xl ${className}`}
            style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}
        >
            <div className="flex items-start justify-between mb-4">
                <Skeleton width={120} height={24} />
                <Skeleton width={80} height={24} borderRadius="12px" />
            </div>
            <Skeleton className="mb-3" height={16} />
            <Skeleton className="mb-3" height={16} width="80%" />
            <Skeleton height={16} width="60%" />
        </div>
    );
}

// ============================================
// STATS CARD SKELETON
// ============================================

export function StatsCardSkeleton() {
    return (
        <div
            className="p-6 rounded-2xl"
            style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}
        >
            <div className="flex items-center gap-4">
                <Skeleton width={48} height={48} borderRadius="12px" />
                <div className="flex-1">
                    <Skeleton width={60} height={32} className="mb-2" />
                    <Skeleton width={100} height={14} />
                </div>
            </div>
        </div>
    );
}

// ============================================
// TABLE ROW SKELETON
// ============================================

export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
    return (
        <div className="flex items-center gap-4 p-4">
            {Array.from({ length: columns }).map((_, i) => (
                <Skeleton
                    key={i}
                    width={i === 0 ? '40%' : '20%'}
                    height={20}
                />
            ))}
        </div>
    );
}

// ============================================
// LIST ITEM SKELETON
// ============================================

export function ListItemSkeleton() {
    return (
        <div
            className="flex items-center gap-4 p-4 rounded-xl"
            style={{ background: 'var(--bg-secondary)' }}
        >
            <Skeleton width={48} height={48} borderRadius="12px" />
            <div className="flex-1">
                <Skeleton width="60%" height={20} className="mb-2" />
                <Skeleton width="40%" height={14} />
            </div>
            <Skeleton width={80} height={32} borderRadius="8px" />
        </div>
    );
}

// ============================================
// COLLEGE CARD SKELETON
// ============================================

export function CollegeCardSkeleton() {
    return (
        <div
            className="p-6 rounded-2xl"
            style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}
        >
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <Skeleton width={56} height={56} borderRadius="16px" />
                    <div>
                        <Skeleton width={120} height={24} className="mb-2" />
                        <Skeleton width={180} height={14} />
                    </div>
                </div>
                <Skeleton width={100} height={28} borderRadius="8px" />
            </div>
            <div className="space-y-3">
                <div className="flex justify-between">
                    <Skeleton width={100} height={14} />
                    <Skeleton width={60} height={14} />
                </div>
                <Skeleton height={8} borderRadius="4px" />
            </div>
            <div className="flex gap-2 mt-4">
                <Skeleton width={80} height={32} borderRadius="8px" />
                <Skeleton width={80} height={32} borderRadius="8px" />
            </div>
        </div>
    );
}

// ============================================
// ESSAY EDITOR SKELETON
// ============================================

export function EssayEditorSkeleton() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <Skeleton width={200} height={32} className="mb-2" />
                    <Skeleton width={300} height={16} />
                </div>
                <div className="flex gap-2">
                    <Skeleton width={100} height={40} borderRadius="12px" />
                    <Skeleton width={100} height={40} borderRadius="12px" />
                </div>
            </div>

            {/* Main content */}
            <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2 space-y-4">
                    {/* Prompt */}
                    <CardSkeleton />

                    {/* Editor */}
                    <div
                        className="p-6 rounded-2xl"
                        style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}
                    >
                        <Skeleton height={300} borderRadius="12px" />
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-4">
                    <CardSkeleton />
                    <CardSkeleton />
                </div>
            </div>
        </div>
    );
}

// ============================================
// DASHBOARD SKELETON
// ============================================

export function DashboardSkeleton() {
    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <Skeleton width={250} height={36} className="mb-2" />
                    <Skeleton width={350} height={18} />
                </div>
                <Skeleton width={120} height={44} borderRadius="12px" />
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <StatsCardSkeleton key={i} />
                ))}
            </div>

            {/* Main content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <ListItemSkeleton key={i} />
                    ))}
                </div>
                <CardSkeleton className="h-fit" />
            </div>
        </div>
    );
}

// ============================================
// CALENDAR SKELETON
// ============================================

export function CalendarSkeleton() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <Skeleton width={200} height={32} />
                <div className="flex gap-2">
                    <Skeleton width={80} height={36} borderRadius="8px" />
                    <Skeleton width={80} height={36} borderRadius="8px" />
                </div>
            </div>

            {/* Calendar Grid */}
            <div
                className="p-6 rounded-2xl"
                style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}
            >
                {/* Day headers */}
                <div className="grid grid-cols-7 gap-2 mb-4">
                    {Array.from({ length: 7 }).map((_, i) => (
                        <Skeleton key={i} height={20} />
                    ))}
                </div>

                {/* Calendar cells */}
                <div className="grid grid-cols-7 gap-2">
                    {Array.from({ length: 35 }).map((_, i) => (
                        <Skeleton key={i} height={80} borderRadius="12px" />
                    ))}
                </div>
            </div>
        </div>
    );
}

// ============================================
// INLINE LOADING SPINNER
// ============================================

export function LoadingSpinner({ size = 20 }: { size?: number }) {
    return (
        <motion.div
            style={{
                width: size,
                height: size,
                border: '2px solid var(--bg-tertiary)',
                borderTopColor: 'var(--primary-400)',
                borderRadius: '50%',
            }}
            animate={{ rotate: 360 }}
            transition={{
                duration: 1,
                repeat: Infinity,
                ease: 'linear',
            }}
        />
    );
}

// ============================================
// FULL PAGE LOADER
// ============================================

export function FullPageLoader({ message = 'Loading...' }: { message?: string }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 flex items-center justify-center z-50"
            style={{ background: 'var(--bg-primary)' }}
        >
            <div className="text-center">
                <motion.div
                    className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
                    style={{ background: 'var(--gradient-primary)' }}
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                >
                    <LoadingSpinner size={32} />
                </motion.div>
                <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>
                    {message}
                </p>
            </div>
        </motion.div>
    );
}
