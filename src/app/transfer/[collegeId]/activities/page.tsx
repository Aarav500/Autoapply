'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { targetColleges, CollegeInfo } from '@/lib/colleges-data';
import { useS3Storage } from '@/lib/useS3Storage';
import { motion } from 'framer-motion';
import { Card, Button } from '@/components/ui';
import {
    TrendingUp,
    Target,
    Lightbulb,
    Award,
    ChevronLeft,
    RefreshCw,
    CheckCircle2,
    AlertCircle,
    Star
} from 'lucide-react';

// ============================================
// COLLEGE-SPECIFIC ACTIVITIES PAGE
// Shows customized activities + readiness pie chart + recommendations
// ============================================

interface ReadinessAnalysis {
    scores: {
        academic: number;
        leadership: number;
        researchTechnical: number;
        communityImpact: number;
        fitPassion: number;
    };
    overall: number;
    category: string;
    strengths: string[];
    gaps: string[];
}

interface CustomizedActivity {
    id: string;
    name: string;
    role: string;
    description: string;
    relevanceScore: number;
    priority: number;
    customization: {
        emphasize: string;
        reframe: string;
        connect: string;
    };
    reasoning: string;
    customizedDescription: string;
}

interface Recommendation {
    priority: 'high' | 'medium' | 'low';
    category: string;
    title: string;
    description: string;
    impact: string;
    timeframe: string;
    difficulty: string;
}

export default function CollegeActivitiesPage() {
    const params = useParams();
    const router = useRouter();
    const collegeId = params?.collegeId as string;

    const [college, setCollege] = useState<CollegeInfo | null>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [readiness, setReadiness] = useState<ReadinessAnalysis | null>(null);
    const [customizedActivities, setCustomizedActivities] = useState<CustomizedActivity[]>([]);
    const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

    const { data: activities } = useS3Storage<any[]>('activities', { defaultValue: [] });
    const { data: achievements } = useS3Storage<any[]>('achievements', { defaultValue: [] });
    const { data: userProfile } = useS3Storage<any>('profile', { defaultValue: {} });

    useEffect(() => {
        const foundCollege = targetColleges.find(c => c.id === collegeId);
        if (!foundCollege) {
            router.push('/transfer');
            return;
        }
        setCollege(foundCollege);
    }, [collegeId, router]);

    // Auto-analyze on mount
    useEffect(() => {
        if (college && activities.length > 0 && !readiness) {
            handleAnalyze();
        }
    }, [college, activities]);

    const handleAnalyze = async () => {
        if (!college) return;

        setAnalyzing(true);

        try {
            const response = await fetch('/api/college-activities/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    college: {
                        id: college.id,
                        name: college.name,
                        fullName: college.fullName,
                        values: college.research.values,
                        whatTheyLookFor: college.research.whatTheyLookFor,
                        culture: college.research.culture,
                        notablePrograms: college.research.notablePrograms,
                    },
                    activities: activities || [],
                    achievements: achievements || [],
                    userProfile: {
                        major: userProfile?.major,
                        gpa: parseFloat(userProfile?.gpa) || undefined,
                        interests: userProfile?.interests,
                    },
                }),
            });

            if (!response.ok) {
                throw new Error('Analysis failed');
            }

            const result = await response.json();

            setReadiness(result.readiness);
            setCustomizedActivities(result.activities.prioritized || []);
            setRecommendations(result.recommendations || []);
        } catch (error) {
            console.error('Analysis error:', error);
            alert('Failed to analyze activities. Please check your API keys.');
        } finally {
            setAnalyzing(false);
        }
    };

    if (!college) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-slate-600">Loading college data...</p>
                </div>
            </div>
        );
    }

    const readinessScores = readiness?.scores || {
        academic: 0,
        leadership: 0,
        researchTechnical: 0,
        communityImpact: 0,
        fitPassion: 0,
    };

    const readinessData = [
        { label: 'Academic', value: readinessScores.academic, color: '#3b82f6' },
        { label: 'Leadership', value: readinessScores.leadership, color: '#8b5cf6' },
        { label: 'Research/Tech', value: readinessScores.researchTechnical, color: '#06b6d4' },
        { label: 'Community', value: readinessScores.communityImpact, color: '#10b981' },
        { label: 'Fit & Passion', value: readinessScores.fitPassion, color: '#f59e0b' },
    ];

    // Calculate pie chart segments
    const total = 100;
    let cumulativePercentage = 0;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
            {/* Header */}
            <div className="max-w-7xl mx-auto mb-6">
                <button
                    onClick={() => router.push(`/transfer/${collegeId}`)}
                    className="mb-4 text-blue-600 hover:text-blue-800 font-medium flex items-center gap-2"
                >
                    <ChevronLeft className="w-4 h-4" />
                    Back to {college.name}
                </button>

                <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-4xl font-bold text-slate-900 mb-2">
                                Activities for {college.name}
                            </h1>
                            <p className="text-slate-600 text-lg">
                                Customized activities, readiness analysis, and recommendations
                            </p>
                        </div>
                        <Button
                            onClick={handleAnalyze}
                            disabled={analyzing}
                            icon={<RefreshCw className={`w-4 h-4 ${analyzing ? 'animate-spin' : ''}`} />}
                        >
                            {analyzing ? 'Analyzing...' : 'Refresh Analysis'}
                        </Button>
                    </div>
                </div>
            </div>

            {analyzing && (
                <div className="max-w-7xl mx-auto mb-6">
                    <Card>
                        <div className="flex items-center gap-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <p className="text-slate-600">Analyzing your activities for {college.name}...</p>
                        </div>
                    </Card>
                </div>
            )}

            {readiness && (
                <div className="max-w-7xl mx-auto space-y-6">
                    {/* Readiness Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Pie Chart */}
                        <Card className="col-span-1">
                            <h3 className="text-xl font-bold text-slate-900 mb-4">Overall Readiness</h3>
                            <div className="flex flex-col items-center">
                                <div className="relative w-48 h-48 mb-4">
                                    <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
                                        {readinessData.map((segment, index) => {
                                            const percentage = segment.value / 5; // Since max is 100 for each
                                            const startAngle = (cumulativePercentage / 100) * 360;
                                            const endAngle = startAngle + (percentage / 100) * 360;

                                            const startX = 100 + 80 * Math.cos((startAngle * Math.PI) / 180);
                                            const startY = 100 + 80 * Math.sin((startAngle * Math.PI) / 180);
                                            const endX = 100 + 80 * Math.cos((endAngle * Math.PI) / 180);
                                            const endY = 100 + 80 * Math.sin((endAngle * Math.PI) / 180);

                                            const largeArcFlag = percentage > 50 ? 1 : 0;

                                            const pathData = [
                                                `M 100 100`,
                                                `L ${startX} ${startY}`,
                                                `A 80 80 0 ${largeArcFlag} 1 ${endX} ${endY}`,
                                                `Z`
                                            ].join(' ');

                                            cumulativePercentage += percentage;

                                            return (
                                                <path
                                                    key={index}
                                                    d={pathData}
                                                    fill={segment.color}
                                                    opacity="0.8"
                                                />
                                            );
                                        })}
                                        {/* Center circle for donut effect */}
                                        <circle cx="100" cy="100" r="50" fill="white" />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <div className="text-4xl font-bold text-slate-900">
                                            {readiness.overall}%
                                        </div>
                                        <div className="text-sm text-slate-600 capitalize">
                                            {readiness.category.replace('-', ' ')}
                                        </div>
                                    </div>
                                </div>
                                <div className="w-full space-y-2">
                                    {readinessData.map((segment, index) => (
                                        <div key={index} className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="w-3 h-3 rounded-full"
                                                    style={{ backgroundColor: segment.color }}
                                                />
                                                <span className="text-slate-700">{segment.label}</span>
                                            </div>
                                            <span className="font-semibold text-slate-900">{segment.value}%</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </Card>

                        {/* Strengths */}
                        <Card>
                            <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <CheckCircle2 className="w-6 h-6 text-green-600" />
                                Your Strengths
                            </h3>
                            <ul className="space-y-2">
                                {readiness.strengths.map((strength, i) => (
                                    <li key={i} className="flex items-start gap-2 text-slate-700">
                                        <Star className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />
                                        <span>{strength}</span>
                                    </li>
                                ))}
                            </ul>
                        </Card>

                        {/* Gaps */}
                        <Card>
                            <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <AlertCircle className="w-6 h-6 text-orange-600" />
                                Areas to Improve
                            </h3>
                            <ul className="space-y-2">
                                {readiness.gaps.map((gap, i) => (
                                    <li key={i} className="flex items-start gap-2 text-slate-700">
                                        <Target className="w-4 h-4 text-orange-600 mt-1 flex-shrink-0" />
                                        <span>{gap}</span>
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    </div>

                    {/* Recommendations */}
                    {recommendations.length > 0 && (
                        <Card>
                            <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                                <Lightbulb className="w-6 h-6 text-yellow-600" />
                                Recommendations to Strengthen Your Application
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {recommendations.map((rec, index) => (
                                    <div
                                        key={index}
                                        className={`p-4 rounded-lg border-2 ${
                                            rec.priority === 'high'
                                                ? 'border-red-300 bg-red-50'
                                                : rec.priority === 'medium'
                                                    ? 'border-yellow-300 bg-yellow-50'
                                                    : 'border-blue-300 bg-blue-50'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <h4 className="font-bold text-slate-900">{rec.title}</h4>
                                            <span
                                                className={`text-xs px-2 py-1 rounded-full font-semibold ${
                                                    rec.priority === 'high'
                                                        ? 'bg-red-200 text-red-800'
                                                        : rec.priority === 'medium'
                                                            ? 'bg-yellow-200 text-yellow-800'
                                                            : 'bg-blue-200 text-blue-800'
                                                }`}
                                            >
                                                {rec.priority.toUpperCase()}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-700 mb-3">{rec.description}</p>
                                        <div className="space-y-1 text-xs text-slate-600">
                                            <div><strong>Impact:</strong> {rec.impact}</div>
                                            <div><strong>Timeframe:</strong> {rec.timeframe}</div>
                                            <div><strong>Difficulty:</strong> {rec.difficulty}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}

                    {/* Customized Activities */}
                    <Card>
                        <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                            <Award className="w-6 h-6 text-purple-600" />
                            Your Activities (Customized for {college.name})
                        </h2>
                        <div className="space-y-4">
                            {customizedActivities.map((activity, index) => (
                                <div
                                    key={activity.id || index}
                                    className="p-5 rounded-lg border-2 border-slate-200 hover:border-blue-300 transition-all"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h4 className="font-bold text-lg text-slate-900">{activity.name}</h4>
                                                <span
                                                    className={`text-xs px-2 py-1 rounded-full font-semibold ${
                                                        activity.priority === 1
                                                            ? 'bg-purple-200 text-purple-800'
                                                            : activity.priority === 2
                                                                ? 'bg-blue-200 text-blue-800'
                                                                : 'bg-slate-200 text-slate-800'
                                                    }`}
                                                >
                                                    Priority {activity.priority}
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-600 mb-1">{activity.role}</p>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <div className="text-2xl font-bold text-blue-600">{activity.relevanceScore}%</div>
                                            <div className="text-xs text-slate-500">Relevance</div>
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <h5 className="text-sm font-semibold text-slate-700 mb-1">Original Description:</h5>
                                        <p className="text-sm text-slate-600">{activity.description}</p>
                                    </div>

                                    {activity.customization && (
                                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                            <h5 className="text-sm font-semibold text-blue-900 mb-2">
                                                🎯 How to Present for {college.name}:
                                            </h5>
                                            <ul className="space-y-1 text-sm text-blue-800">
                                                <li><strong>Emphasize:</strong> {activity.customization.emphasize}</li>
                                                <li><strong>Reframe:</strong> {activity.customization.reframe}</li>
                                                <li><strong>Connect:</strong> {activity.customization.connect}</li>
                                            </ul>
                                        </div>
                                    )}

                                    {activity.reasoning && (
                                        <div className="mt-2 text-xs text-slate-500 italic">
                                            💡 {activity.reasoning}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
