'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { targetColleges, CollegeInfo } from '@/lib/colleges-data';
import { useS3Storage } from '@/lib/useS3Storage';
import { STORAGE_KEYS } from '@/lib/s3-storage';
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
    Star,
    Plus,
    Trash2,
    Sparkles
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
    // Auto-generated activity that user can add
    suggestedActivity?: {
        name: string;
        role: string;
        organization: string;
        description: string;
        category: string;
        hoursPerWeek: number;
        weeksPerYear: number;
        expectedImpact: string;
        collegeConnection: string; // How it connects to this college
    };
}

// College-specific activity (created from recommendations)
interface CollegeSpecificActivity {
    id: string;
    collegeId: string;
    name: string;
    role: string;
    organization: string;
    description: string;
    category: string;
    hoursPerWeek: number;
    weeksPerYear: number;
    expectedImpact: string;
    collegeConnection: string;
    source: 'recommendation' | 'manual';
    sourceRecommendation?: string; // Original recommendation title
    status: 'planned' | 'in-progress' | 'completed';
    createdAt: string;
    // Track if this has been added to main activities
    addedToMainActivities: boolean;
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

    const { data: activities, isLoading: activitiesLoading } = useS3Storage<any[]>(STORAGE_KEYS.ACTIVITIES, { defaultValue: [] });
    const { data: achievements, isLoading: achievementsLoading } = useS3Storage<any[]>(STORAGE_KEYS.ACHIEVEMENTS, { defaultValue: [] });
    const { data: userProfile } = useS3Storage<any>(STORAGE_KEYS.USER_PROFILE, { defaultValue: {} });
    const { data: allCollegeActivities, setData: setAllCollegeActivities } = useS3Storage<Record<string, CollegeSpecificActivity[]>>(STORAGE_KEYS.COLLEGE_ACTIVITIES, { defaultValue: {} });

    // Get college-specific activities for this college
    const collegeSpecificActivities = allCollegeActivities?.[collegeId] || [];

    useEffect(() => {
        const foundCollege = targetColleges.find(c => c.id === collegeId);
        if (!foundCollege) {
            router.push('/transfer');
            return;
        }
        setCollege(foundCollege);
    }, [collegeId, router]);

    // Auto-analyze on mount when data is loaded
    useEffect(() => {
        if (college && !activitiesLoading && !achievementsLoading && activities.length > 0 && !readiness) {
            handleAnalyze();
        }
    }, [college, activities, activitiesLoading, achievementsLoading]);

    // Add activity from recommendation (using the suggested activity details)
    const handleAddActivityFromRecommendation = (rec: Recommendation) => {
        const suggested = rec.suggestedActivity;

        const newActivity: CollegeSpecificActivity = {
            id: `${collegeId}-${Date.now()}`,
            collegeId: collegeId,
            name: suggested?.name || rec.title,
            role: suggested?.role || 'Founder/Leader',
            organization: suggested?.organization || 'Self-initiated',
            description: suggested?.description || rec.description,
            category: suggested?.category || rec.category,
            hoursPerWeek: suggested?.hoursPerWeek || 5,
            weeksPerYear: suggested?.weeksPerYear || 30,
            expectedImpact: suggested?.expectedImpact || rec.impact,
            collegeConnection: suggested?.collegeConnection || rec.impact,
            source: 'recommendation',
            sourceRecommendation: rec.title,
            status: 'planned',
            createdAt: new Date().toISOString(),
            addedToMainActivities: false,
        };

        const updatedCollegeActivities = {
            ...allCollegeActivities,
            [collegeId]: [...collegeSpecificActivities, newActivity],
        };

        setAllCollegeActivities(updatedCollegeActivities);
    };

    // Add a college-specific activity to main activities (for fit scoring)
    const handleAddToMainActivities = async (activity: CollegeSpecificActivity) => {
        const mainActivity = {
            id: `main-${activity.id}`,
            name: activity.name,
            role: activity.role,
            organization: activity.organization,
            description: activity.description,
            category: activity.category,
            hoursPerWeek: activity.hoursPerWeek,
            weeksPerYear: activity.weeksPerYear,
            startDate: new Date().toISOString().split('T')[0],
            endDate: 'Present',
            isCollegeSpecific: true,
            sourceCollege: collegeId,
        };

        // Add to main activities
        const updatedActivities = [...activities, mainActivity];

        // Update college-specific activity to mark as added
        const updatedCollegeActivities = collegeSpecificActivities.map(a =>
            a.id === activity.id ? { ...a, addedToMainActivities: true } : a
        );

        // Save both
        try {
            // We'll update local state and trigger S3 save through the hook
            const response = await fetch('/api/storage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: 'activities', value: updatedActivities }),
            });

            if (response.ok) {
                setAllCollegeActivities({
                    ...allCollegeActivities,
                    [collegeId]: updatedCollegeActivities,
                });
                // Trigger re-analysis to update fit score
                handleAnalyze();
            }
        } catch (error) {
            console.error('Failed to add to main activities:', error);
        }
    };

    // Remove college-specific activity
    const handleRemoveCollegeActivity = (activityId: string) => {
        const updatedActivities = collegeSpecificActivities.filter(a => a.id !== activityId);
        const updatedCollegeActivities = {
            ...allCollegeActivities,
            [collegeId]: updatedActivities,
        };
        setAllCollegeActivities(updatedCollegeActivities);
    };

    // Update activity status
    const handleUpdateActivityStatus = (activityId: string, status: 'planned' | 'in-progress' | 'completed') => {
        const updatedActivities = collegeSpecificActivities.map(a =>
            a.id === activityId ? { ...a, status } : a
        );
        const updatedCollegeActivities = {
            ...allCollegeActivities,
            [collegeId]: updatedActivities,
        };
        setAllCollegeActivities(updatedCollegeActivities);
    };

    // Check if a recommendation has already been added as an activity
    const isRecommendationAdded = (recTitle: string) => {
        return collegeSpecificActivities.some(a => a.sourceRecommendation === recTitle);
    };

    const handleAnalyze = async () => {
        if (!college) return;

        // Check if we have activities to analyze
        if (!activities || activities.length === 0) {
            alert('No activities found. Please add activities first on the Activities page.');
            return;
        }

        setAnalyzing(true);
        console.log(`🎯 Starting analysis for ${college.name} with ${activities.length} activities`);

        try {
            const requestBody = {
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
            };

            console.log(`📤 Sending ${requestBody.activities.length} activities to analyzer`);

            const response = await fetch('/api/college-activities/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || result.error || 'Analysis failed');
            }

            console.log(`✅ Analysis complete: ${result.readiness?.overall}% readiness`);

            setReadiness(result.readiness);
            setCustomizedActivities(result.activities?.prioritized || []);
            setRecommendations(result.recommendations || []);
        } catch (error) {
            console.error('Analysis error:', error);
            alert(`Failed to analyze activities: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

            {/* Show loading state while fetching data or analyzing */}
            {(activitiesLoading || achievementsLoading) && (
                <div className="max-w-7xl mx-auto mb-6">
                    <Card>
                        <div className="flex items-center gap-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <p className="text-slate-600">Loading your activities and achievements from S3...</p>
                        </div>
                    </Card>
                </div>
            )}

            {analyzing && (
                <div className="max-w-7xl mx-auto mb-6">
                    <Card>
                        <div className="flex items-center gap-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <p className="text-slate-600">Analyzing your {activities.length} activities and {achievements.length} achievements for {college.name}...</p>
                        </div>
                    </Card>
                </div>
            )}

            {/* Data Status Card - Shows what was loaded from S3 */}
            {!activitiesLoading && !achievementsLoading && !analyzing && (
                <div className="max-w-7xl mx-auto mb-6">
                    <Card>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2">
                                    <Award className="w-5 h-5 text-blue-600" />
                                    <span className="text-slate-700">
                                        <strong>{activities.length}</strong> Activities Loaded
                                    </span>
                                    {activities.length === 0 && (
                                        <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded-full">
                                            Add activities first
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Star className="w-5 h-5 text-yellow-600" />
                                    <span className="text-slate-700">
                                        <strong>{achievements.length}</strong> Achievements Loaded
                                    </span>
                                    {achievements.length === 0 && (
                                        <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full">
                                            Optional
                                        </span>
                                    )}
                                </div>
                            </div>
                            {(activities.length === 0) && (
                                <Button
                                    onClick={() => router.push('/activities')}
                                    variant="outline"
                                    size="sm"
                                >
                                    Go Add Activities
                                </Button>
                            )}
                        </div>
                    </Card>
                </div>
            )}

            {/* Show empty state if no activities loaded */}
            {!activitiesLoading && !achievementsLoading && activities.length === 0 && !analyzing && (
                <div className="max-w-7xl mx-auto mb-6">
                    <Card>
                        <div className="text-center py-8">
                            <AlertCircle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-slate-900 mb-2">No Activities Found</h3>
                            <p className="text-slate-600 mb-4">
                                You need to add activities before we can analyze your readiness for {college.name}.
                            </p>
                            <Button onClick={() => router.push('/activities')}>
                                Go to Activities Page
                            </Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* Show waiting state before analysis starts */}
            {!activitiesLoading && !achievementsLoading && activities.length > 0 && !readiness && !analyzing && (
                <div className="max-w-7xl mx-auto mb-6">
                    <Card>
                        <div className="text-center py-8">
                            <TrendingUp className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Ready to Analyze</h3>
                            <p className="text-slate-600 mb-4">
                                Click "Refresh Analysis" to analyze your {activities.length} activities for {college.name}.
                            </p>
                            <Button onClick={handleAnalyze}>
                                Start Analysis
                            </Button>
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

                    {/* Recommendations with Suggested Activities */}
                    {recommendations.length > 0 && (
                        <Card>
                            <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                                <Lightbulb className="w-6 h-6 text-yellow-600" />
                                Recommended Activities for {college.name}
                            </h2>
                            <p className="text-slate-600 mb-4">
                                These are AI-generated activities tailored for {college.name}. Add them to your profile to improve your fit score.
                            </p>
                            <div className="space-y-6">
                                {recommendations.map((rec, index) => {
                                    const alreadyAdded = isRecommendationAdded(rec.title);
                                    const suggested = rec.suggestedActivity;

                                    return (
                                        <div
                                            key={index}
                                            className={`rounded-xl border-2 overflow-hidden ${
                                                rec.priority === 'high'
                                                    ? 'border-red-300'
                                                    : rec.priority === 'medium'
                                                        ? 'border-yellow-300'
                                                        : 'border-blue-300'
                                            }`}
                                        >
                                            {/* Recommendation Header */}
                                            <div className={`p-4 ${
                                                rec.priority === 'high'
                                                    ? 'bg-red-50'
                                                    : rec.priority === 'medium'
                                                        ? 'bg-yellow-50'
                                                        : 'bg-blue-50'
                                            }`}>
                                                <div className="flex items-start justify-between mb-2">
                                                    <h4 className="font-bold text-lg text-slate-900">{rec.title}</h4>
                                                    <span
                                                        className={`text-xs px-2 py-1 rounded-full font-semibold ${
                                                            rec.priority === 'high'
                                                                ? 'bg-red-200 text-red-800'
                                                                : rec.priority === 'medium'
                                                                    ? 'bg-yellow-200 text-yellow-800'
                                                                    : 'bg-blue-200 text-blue-800'
                                                        }`}
                                                    >
                                                        {rec.priority.toUpperCase()} PRIORITY
                                                    </span>
                                                </div>
                                                <p className="text-sm text-slate-700">{rec.description}</p>
                                                <div className="flex gap-4 mt-3 text-xs text-slate-600">
                                                    <span>⏱️ {rec.timeframe}</span>
                                                    <span>📊 {rec.difficulty} difficulty</span>
                                                </div>
                                            </div>

                                            {/* Suggested Activity Preview */}
                                            {suggested && (
                                                <div className="p-4 bg-white border-t">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <Sparkles className="w-5 h-5 text-indigo-600" />
                                                        <h5 className="font-semibold text-slate-900">Auto-Generated Activity Preview</h5>
                                                    </div>

                                                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-200">
                                                        <div className="grid grid-cols-2 gap-3 mb-3">
                                                            <div>
                                                                <span className="text-xs text-slate-500">Activity Name</span>
                                                                <p className="font-semibold text-slate-900">{suggested.name}</p>
                                                            </div>
                                                            <div>
                                                                <span className="text-xs text-slate-500">Your Role</span>
                                                                <p className="font-semibold text-slate-900">{suggested.role}</p>
                                                            </div>
                                                            <div>
                                                                <span className="text-xs text-slate-500">Organization</span>
                                                                <p className="text-slate-700">{suggested.organization}</p>
                                                            </div>
                                                            <div>
                                                                <span className="text-xs text-slate-500">Time Commitment</span>
                                                                <p className="text-slate-700">{suggested.hoursPerWeek}h/week × {suggested.weeksPerYear} weeks</p>
                                                            </div>
                                                        </div>

                                                        <div className="mb-3">
                                                            <span className="text-xs text-slate-500">Description</span>
                                                            <p className="text-sm text-slate-700 mt-1">{suggested.description}</p>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div>
                                                                <span className="text-xs text-slate-500">Expected Impact</span>
                                                                <p className="text-sm text-green-700 font-medium">{suggested.expectedImpact}</p>
                                                            </div>
                                                            <div>
                                                                <span className="text-xs text-slate-500">{college.name} Connection</span>
                                                                <p className="text-sm text-indigo-700 font-medium">{suggested.collegeConnection}</p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <button
                                                        onClick={() => handleAddActivityFromRecommendation(rec)}
                                                        disabled={alreadyAdded}
                                                        className={`w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${
                                                            alreadyAdded
                                                                ? 'bg-green-100 text-green-700 cursor-default'
                                                                : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-md hover:shadow-lg'
                                                        }`}
                                                    >
                                                        {alreadyAdded ? (
                                                            <>
                                                                <CheckCircle2 className="w-5 h-5" />
                                                                Activity Added to {college.name} Profile
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Plus className="w-5 h-5" />
                                                                Add This Activity to My {college.name} Profile
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            )}

                                            {/* Fallback if no suggested activity */}
                                            {!suggested && (
                                                <div className="p-4 bg-white border-t">
                                                    <button
                                                        onClick={() => handleAddActivityFromRecommendation(rec)}
                                                        disabled={alreadyAdded}
                                                        className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                                            alreadyAdded
                                                                ? 'bg-green-100 text-green-700 cursor-default'
                                                                : 'bg-blue-600 text-white hover:bg-blue-700'
                                                        }`}
                                                    >
                                                        {alreadyAdded ? (
                                                            <>
                                                                <CheckCircle2 className="w-4 h-4" />
                                                                Added
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Plus className="w-4 h-4" />
                                                                Add to {college.name} Activities
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>
                    )}

                    {/* College-Specific Activities (Added from Recommendations) */}
                    {collegeSpecificActivities.length > 0 && (
                        <Card>
                            <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                                <Sparkles className="w-6 h-6 text-indigo-600" />
                                Your {college.name}-Specific Activities
                            </h2>
                            <p className="text-slate-600 mb-4">
                                These activities are planned specifically for your {college.name} application. Complete them and add to your main profile to improve your fit score.
                            </p>
                            <div className="space-y-4">
                                {collegeSpecificActivities.map((activity) => (
                                    <div
                                        key={activity.id}
                                        className={`rounded-xl border-2 overflow-hidden ${
                                            activity.status === 'completed'
                                                ? 'border-green-300'
                                                : activity.status === 'in-progress'
                                                    ? 'border-blue-300'
                                                    : 'border-slate-200'
                                        }`}
                                    >
                                        {/* Activity Header */}
                                        <div className={`p-4 ${
                                            activity.status === 'completed'
                                                ? 'bg-green-50'
                                                : activity.status === 'in-progress'
                                                    ? 'bg-blue-50'
                                                    : 'bg-slate-50'
                                        }`}>
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h4 className="font-bold text-lg text-slate-900">{activity.name}</h4>
                                                        {activity.addedToMainActivities && (
                                                            <span className="text-xs px-2 py-1 bg-green-200 text-green-800 rounded-full">
                                                                In Main Profile
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-slate-600">{activity.role} at {activity.organization}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleRemoveCollegeActivity(activity.id)}
                                                    className="text-slate-400 hover:text-red-600 transition-colors p-1"
                                                    title="Remove activity"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Activity Details */}
                                        <div className="p-4 bg-white">
                                            <p className="text-sm text-slate-700 mb-4">{activity.description}</p>

                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                                                <div className="bg-slate-50 rounded-lg p-2">
                                                    <span className="text-xs text-slate-500">Time</span>
                                                    <p className="text-sm font-medium">{activity.hoursPerWeek}h/week</p>
                                                </div>
                                                <div className="bg-slate-50 rounded-lg p-2">
                                                    <span className="text-xs text-slate-500">Duration</span>
                                                    <p className="text-sm font-medium">{activity.weeksPerYear} weeks/year</p>
                                                </div>
                                                <div className="bg-slate-50 rounded-lg p-2">
                                                    <span className="text-xs text-slate-500">Category</span>
                                                    <p className="text-sm font-medium">{activity.category}</p>
                                                </div>
                                                <div className="bg-slate-50 rounded-lg p-2">
                                                    <span className="text-xs text-slate-500">Added</span>
                                                    <p className="text-sm font-medium">{new Date(activity.createdAt).toLocaleDateString()}</p>
                                                </div>
                                            </div>

                                            {activity.expectedImpact && (
                                                <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
                                                    <span className="text-xs text-green-600 font-medium">Expected Impact</span>
                                                    <p className="text-sm text-green-800">{activity.expectedImpact}</p>
                                                </div>
                                            )}

                                            {activity.collegeConnection && (
                                                <div className="mb-4 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                                                    <span className="text-xs text-indigo-600 font-medium">{college.name} Connection</span>
                                                    <p className="text-sm text-indigo-800">{activity.collegeConnection}</p>
                                                </div>
                                            )}

                                            {/* Status Selector */}
                                            <div className="flex items-center gap-3 mb-4">
                                                <span className="text-sm text-slate-600">Progress:</span>
                                                <div className="flex gap-2">
                                                    {(['planned', 'in-progress', 'completed'] as const).map((status) => (
                                                        <button
                                                            key={status}
                                                            onClick={() => handleUpdateActivityStatus(activity.id, status)}
                                                            className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                                                                activity.status === status
                                                                    ? status === 'completed'
                                                                        ? 'bg-green-600 text-white shadow-md'
                                                                        : status === 'in-progress'
                                                                            ? 'bg-blue-600 text-white shadow-md'
                                                                            : 'bg-slate-600 text-white shadow-md'
                                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                            }`}
                                                        >
                                                            {status === 'in-progress' ? '🔄 In Progress' : status === 'completed' ? '✅ Completed' : '📋 Planned'}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Add to Main Activities Button */}
                                            {!activity.addedToMainActivities && activity.status === 'completed' && (
                                                <button
                                                    onClick={() => handleAddToMainActivities(activity)}
                                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all shadow-md hover:shadow-lg"
                                                >
                                                    <TrendingUp className="w-5 h-5" />
                                                    Add to Main Activities & Improve Fit Score
                                                </button>
                                            )}

                                            {!activity.addedToMainActivities && activity.status !== 'completed' && (
                                                <div className="text-center text-sm text-slate-500 py-2">
                                                    Complete this activity to add it to your main profile and improve your {college.name} fit score
                                                </div>
                                            )}

                                            {activity.addedToMainActivities && (
                                                <div className="flex items-center justify-center gap-2 text-green-600 py-2">
                                                    <CheckCircle2 className="w-5 h-5" />
                                                    <span className="font-medium">Added to main profile - contributing to your fit score!</span>
                                                </div>
                                            )}
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

                        {customizedActivities.length === 0 ? (
                            <div className="text-center py-8 text-slate-500">
                                <AlertCircle className="w-12 h-12 mx-auto mb-3 text-slate-400" />
                                <p className="text-lg font-medium">No customized activities available yet</p>
                                <p className="text-sm mt-2">
                                    Click "Refresh Analysis" to generate customized activity recommendations for {college.name}.
                                </p>
                            </div>
                        ) : (
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
                                                    {activity.customization.emphasize && (
                                                        <li><strong>Emphasize:</strong> {activity.customization.emphasize}</li>
                                                    )}
                                                    {activity.customization.reframe && (
                                                        <li><strong>Reframe:</strong> {activity.customization.reframe}</li>
                                                    )}
                                                    {activity.customization.connect && (
                                                        <li><strong>Connect:</strong> {activity.customization.connect}</li>
                                                    )}
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
                        )}
                    </Card>
                </div>
            )}
        </div>
    );
}
