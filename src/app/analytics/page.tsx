'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, Button } from '@/components/ui';
import { useS3Storage } from '@/lib/useS3Storage';
import {
    BarChart3, TrendingUp, Eye, Bookmark, FileText, Send, Clock,
    Target, Award, Briefcase, RefreshCw, Download, Calendar, ArrowUpRight,
    MousePointerClick, Search, Filter, Sparkles
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

interface AnalyticsStats {
    totalViews: number;
    totalSaves: number;
    totalDocsGenerated: number;
    totalApplyClicks: number;
    totalApplications: number;
    conversionRate: number;
    topViewedOpportunities: { id: string; title: string; views: number }[];
    activityByDay: { date: string; events: number }[];
    documentsByType: { type: string; count: number }[];
}

interface AnalyticsData {
    events: any[];
    stats: AnalyticsStats;
    lastUpdated: string;
}

// Sample data for demo
const sampleStats: AnalyticsStats = {
    totalViews: 47,
    totalSaves: 12,
    totalDocsGenerated: 8,
    totalApplyClicks: 15,
    totalApplications: 5,
    conversionRate: 0.11,
    topViewedOpportunities: [
        { id: '1', title: 'Software Engineering Intern - Google', views: 8 },
        { id: '2', title: 'Knight-Hennessy Scholars', views: 6 },
        { id: '3', title: 'SDE Intern - Amazon', views: 5 },
        { id: '4', title: 'Fulbright Scholarship', views: 4 },
        { id: '5', title: 'Meta Software Engineer Intern', views: 4 },
    ],
    activityByDay: [
        { date: '2026-01-03', events: 5 },
        { date: '2026-01-04', events: 8 },
        { date: '2026-01-05', events: 12 },
        { date: '2026-01-06', events: 7 },
        { date: '2026-01-07', events: 9 },
        { date: '2026-01-08', events: 15 },
        { date: '2026-01-09', events: 11 },
    ],
    documentsByType: [
        { type: 'cv', count: 4 },
        { type: 'cover_letter', count: 3 },
        { type: 'essay', count: 5 },
    ],
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function AnalyticsDashboard() {
    const [isLoading, setIsLoading] = useState(true);
    const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('7d');

    const { data: analyticsData } = useS3Storage<AnalyticsData>('analytics-events', {
        defaultValue: { events: [], stats: sampleStats, lastUpdated: new Date().toISOString() },
    });

    const stats = analyticsData?.stats || sampleStats;

    useEffect(() => {
        // Simulate loading
        const timer = setTimeout(() => setIsLoading(false), 500);
        return () => clearTimeout(timer);
    }, []);

    // Calculate max for chart scaling
    const maxActivity = Math.max(...stats.activityByDay.map(d => d.events));
    const maxViews = Math.max(...stats.topViewedOpportunities.map(o => o.views));

    // Format conversion rate
    const conversionPercent = (stats.conversionRate * 100).toFixed(1);

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
                        <BarChart3 className="w-8 h-8" style={{ color: 'var(--primary-400)' }} />
                        Analytics Dashboard
                    </h1>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        Track your job search and scholarship application progress
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex rounded-lg overflow-hidden" style={{ background: 'var(--bg-secondary)' }}>
                        {(['7d', '30d', 'all'] as const).map(range => (
                            <button
                                key={range}
                                onClick={() => setTimeRange(range)}
                                className={`px-4 py-2 text-sm transition-colors ${timeRange === range ? 'bg-white/10 font-medium' : ''
                                    }`}
                            >
                                {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : 'All Time'}
                            </button>
                        ))}
                    </div>
                    <Button
                        variant="secondary"
                        icon={<Download className="w-4 h-4" />}
                    >
                        Export
                    </Button>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <Card className="text-center">
                    <Eye className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--primary-400)' }} />
                    <p className="text-2xl font-bold">{stats.totalViews}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Views</p>
                </Card>
                <Card className="text-center">
                    <Bookmark className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--warning)' }} />
                    <p className="text-2xl font-bold">{stats.totalSaves}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Saved</p>
                </Card>
                <Card className="text-center" style={{ background: 'rgba(168, 85, 247, 0.1)' }}>
                    <FileText className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--accent-purple)' }} />
                    <p className="text-2xl font-bold">{stats.totalDocsGenerated}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Docs Generated</p>
                </Card>
                <Card className="text-center">
                    <MousePointerClick className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--accent-teal)' }} />
                    <p className="text-2xl font-bold">{stats.totalApplyClicks}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Apply Clicks</p>
                </Card>
                <Card className="text-center" style={{ background: 'rgba(34, 197, 94, 0.1)' }}>
                    <Send className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--success)' }} />
                    <p className="text-2xl font-bold">{stats.totalApplications}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Applied</p>
                </Card>
                <Card className="text-center" style={{ background: 'rgba(91, 111, 242, 0.1)' }}>
                    <Target className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--primary-400)' }} />
                    <p className="text-2xl font-bold">{conversionPercent}%</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Conversion</p>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Activity Chart */}
                <Card>
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" style={{ color: 'var(--primary-400)' }} />
                        Activity Over Time
                    </h3>
                    <div className="h-48 flex items-end gap-2">
                        {stats.activityByDay.map((day, index) => (
                            <div
                                key={day.date}
                                className="flex-1 flex flex-col items-center gap-1"
                            >
                                <motion.div
                                    className="w-full rounded-t-lg"
                                    style={{ background: 'var(--primary-400)' }}
                                    initial={{ height: 0 }}
                                    animate={{ height: `${(day.events / maxActivity) * 120}px` }}
                                    transition={{ delay: index * 0.1, duration: 0.3 }}
                                />
                                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                    {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                                </span>
                            </div>
                        ))}
                    </div>
                    <p className="text-sm mt-4 text-center" style={{ color: 'var(--text-muted)' }}>
                        Total: {stats.activityByDay.reduce((sum, d) => sum + d.events, 0)} events this week
                    </p>
                </Card>

                {/* Top Viewed */}
                <Card>
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <Sparkles className="w-5 h-5" style={{ color: 'var(--accent-gold)' }} />
                        Top Viewed Opportunities
                    </h3>
                    <div className="space-y-3">
                        {stats.topViewedOpportunities.map((opp, index) => (
                            <div key={opp.id} className="flex items-center gap-3">
                                <span
                                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                                    style={{ background: 'var(--bg-secondary)' }}
                                >
                                    {index + 1}
                                </span>
                                <div className="flex-1">
                                    <p className="text-sm font-medium truncate">{opp.title}</p>
                                    <div className="h-2 rounded-full mt-1" style={{ background: 'var(--bg-secondary)' }}>
                                        <motion.div
                                            className="h-full rounded-full"
                                            style={{ background: 'var(--primary-400)' }}
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(opp.views / maxViews) * 100}%` }}
                                            transition={{ delay: index * 0.1, duration: 0.3 }}
                                        />
                                    </div>
                                </div>
                                <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                                    {opp.views}
                                </span>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Documents by Type */}
                <Card>
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <FileText className="w-5 h-5" style={{ color: 'var(--accent-purple)' }} />
                        Documents Generated
                    </h3>
                    <div className="flex items-center justify-around py-4">
                        {stats.documentsByType.map((doc) => {
                            const total = stats.documentsByType.reduce((sum, d) => sum + d.count, 0);
                            const percent = total > 0 ? Math.round((doc.count / total) * 100) : 0;
                            const label = doc.type === 'cv' ? 'CVs' : doc.type === 'cover_letter' ? 'Cover Letters' : 'Essays';
                            const color = doc.type === 'cv' ? 'var(--primary-400)' : doc.type === 'cover_letter' ? 'var(--success)' : 'var(--accent-purple)';

                            return (
                                <div key={doc.type} className="text-center">
                                    <div
                                        className="w-20 h-20 rounded-full mx-auto mb-2 flex items-center justify-center text-xl font-bold relative"
                                        style={{
                                            background: `conic-gradient(${color} ${percent * 3.6}deg, var(--bg-secondary) 0deg)`,
                                        }}
                                    >
                                        <div
                                            className="w-14 h-14 rounded-full flex items-center justify-center"
                                            style={{ background: 'var(--bg-primary)' }}
                                        >
                                            {doc.count}
                                        </div>
                                    </div>
                                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{label}</p>
                                </div>
                            );
                        })}
                    </div>
                </Card>

                {/* Quick Actions */}
                <Card>
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <ArrowUpRight className="w-5 h-5" style={{ color: 'var(--accent-teal)' }} />
                        Quick Actions
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        <a
                            href="/jobs"
                            className="p-4 rounded-lg text-center hover:bg-white/5 transition-colors"
                            style={{ background: 'var(--bg-secondary)' }}
                        >
                            <Briefcase className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--primary-400)' }} />
                            <p className="font-medium">Browse Jobs</p>
                        </a>
                        <a
                            href="/scholarships"
                            className="p-4 rounded-lg text-center hover:bg-white/5 transition-colors"
                            style={{ background: 'var(--bg-secondary)' }}
                        >
                            <Award className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--accent-gold)' }} />
                            <p className="font-medium">Scholarships</p>
                        </a>
                        <a
                            href="/calendar"
                            className="p-4 rounded-lg text-center hover:bg-white/5 transition-colors"
                            style={{ background: 'var(--bg-secondary)' }}
                        >
                            <Calendar className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--warning)' }} />
                            <p className="font-medium">Deadlines</p>
                        </a>
                        <a
                            href="/automation/documents"
                            className="p-4 rounded-lg text-center hover:bg-white/5 transition-colors"
                            style={{ background: 'var(--bg-secondary)' }}
                        >
                            <FileText className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--accent-purple)' }} />
                            <p className="font-medium">Documents</p>
                        </a>
                    </div>
                </Card>
            </div>

            {/* Tips */}
            <Card style={{ background: 'rgba(91, 111, 242, 0.05)', borderLeft: '4px solid var(--primary-400)' }}>
                <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg" style={{ background: 'var(--primary-400)' }}>
                        <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h4 className="font-semibold mb-1">Improve Your Success Rate</h4>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                            Your conversion rate is {conversionPercent}%. To improve, try generating tailored documents
                            before applying, and focus on opportunities with 80%+ match scores.
                        </p>
                    </div>
                </div>
            </Card>
        </motion.div>
    );
}
