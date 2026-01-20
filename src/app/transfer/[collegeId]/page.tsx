'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { targetColleges, getTimeUntilDeadline, formatDeadline, CollegeInfo } from '@/lib/colleges-data';
import { useS3Storage } from '@/lib/s3-storage';
import { calculateCollegeFitScore, prioritizeActivitiesForCollege } from '@/lib/college-cv-optimizer';

// ============================================
// INDIVIDUAL COLLEGE APPLICATION PAGE
// Generate essays, match scholarships, track progress
// ============================================

interface EssayDraft {
    essayId: string;
    content: string;
    wordCount: number;
    score: number;
    lastUpdated: string;
    status: 'not-started' | 'draft' | 'review' | 'final';
}

interface ScholarshipMatch {
    id: string;
    title: string;
    amount: string;
    deadline: string;
    matchScore: number;
    requirements: string[];
}

export default function CollegeApplicationPage() {
    const params = useParams();
    const router = useRouter();
    const collegeId = params?.collegeId as string;

    const [college, setCollege] = useState<CollegeInfo | null>(null);
    const [selectedEssay, setSelectedEssay] = useState<string | null>(null);
    const [generatingEssay, setGeneratingEssay] = useState(false);
    const [scholarships, setScholarships] = useState<ScholarshipMatch[]>([]);

    const { data: activities } = useS3Storage<any[]>('activities', { defaultValue: [] });
    const { data: achievements } = useS3Storage<any[]>('user_achievements', { defaultValue: [] });
    const { data: userProfile } = useS3Storage<any>('user-profile', { defaultValue: {} });

    // Load college-specific essay drafts
    const { data: essayDrafts, setData: setEssayDrafts } = useS3Storage<Record<string, EssayDraft>>(
        `transfer-essays-${collegeId}`,
        { defaultValue: {} }
    );

    useEffect(() => {
        const foundCollege = targetColleges.find(c => c.id === collegeId);
        if (!foundCollege) {
            router.push('/transfer');
            return;
        }
        setCollege(foundCollege);

        // Auto-select first essay if none selected
        if (!selectedEssay && foundCollege.essays.length > 0) {
            setSelectedEssay(foundCollege.essays[0].id);
        }
    }, [collegeId, router, selectedEssay]);

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

    const timeUntil = getTimeUntilDeadline(college.deadline);
    const fitScore = calculateCollegeFitScore(activities, achievements, collegeId);
    const selectedEssayData = college.essays.find(e => e.id === selectedEssay);
    const currentDraft = essayDrafts[selectedEssay || ''];

    // Generate AI essay based on activities
    const handleGenerateEssay = async () => {
        if (!selectedEssayData) return;

        setGeneratingEssay(true);

        try {
            // Prioritize activities for this specific college
            const prioritizedActivities = prioritizeActivitiesForCollege(activities, collegeId, 5);

            const response = await fetch('/api/transfer/generate-essay', {
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
                        uniqueFeatures: college.research.uniqueFeatures,
                    },
                    essay: {
                        id: selectedEssayData.id,
                        title: selectedEssayData.title,
                        prompt: selectedEssayData.prompt,
                        wordLimit: selectedEssayData.wordLimit,
                    },
                    activities: prioritizedActivities.map(a => ({
                        name: a.name,
                        role: a.role,
                        organization: a.organization,
                        description: a.description,
                        hoursPerWeek: a.hoursPerWeek,
                        weeksPerYear: a.weeksPerYear,
                    })),
                    userProfile: {
                        name: userProfile.name,
                        major: userProfile.major,
                        gpa: userProfile.gpa,
                        values: userProfile.values,
                        interests: userProfile.interests,
                    },
                }),
            });

            if (!response.ok) {
                throw new Error('Essay generation failed');
            }

            const result = await response.json();

            // Save draft
            const newDraft: EssayDraft = {
                essayId: selectedEssayData.id,
                content: result.essay,
                wordCount: result.wordCount,
                score: result.score || 0,
                lastUpdated: new Date().toISOString(),
                status: 'draft',
            };

            setEssayDrafts({
                ...essayDrafts,
                [selectedEssayData.id]: newDraft,
            });
        } catch (error) {
            console.error('Essay generation error:', error);
            alert('Failed to generate essay. Please check your API keys.');
        } finally {
            setGeneratingEssay(false);
        }
    };

    // Perfect essay with iterative improvement
    const handlePerfectEssay = async () => {
        if (!selectedEssayData || !currentDraft) return;

        setGeneratingEssay(true);

        try {
            const response = await fetch('/api/essays/ultimate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    essay: currentDraft.content,
                    prompt: selectedEssayData.prompt,
                    college: {
                        name: college.name,
                        fullName: college.fullName,
                        values: college.research.values,
                        whatTheyLookFor: college.research.whatTheyLookFor,
                        culture: college.research.culture,
                        notablePrograms: college.research.notablePrograms,
                    },
                    wordLimit: selectedEssayData.wordLimit,
                }),
            });

            if (!response.ok) {
                throw new Error('Essay perfection failed');
            }

            const result = await response.json();

            // Update draft with perfected version
            const perfectedDraft: EssayDraft = {
                essayId: selectedEssayData.id,
                content: result.ultimateEssay,
                wordCount: result.wordCount,
                score: result.finalScore,
                lastUpdated: new Date().toISOString(),
                status: result.finalScore >= 95 ? 'final' : 'review',
            };

            setEssayDrafts({
                ...essayDrafts,
                [selectedEssayData.id]: perfectedDraft,
            });

            alert(`Essay perfected! Score: ${result.finalScore}% (${result.iterations} iterations)`);
        } catch (error) {
            console.error('Essay perfection error:', error);
            alert('Failed to perfect essay. Please try again.');
        } finally {
            setGeneratingEssay(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
            {/* Header */}
            <div className="max-w-7xl mx-auto mb-6">
                <button
                    onClick={() => router.push('/transfer')}
                    className="mb-4 text-blue-600 hover:text-blue-800 font-medium flex items-center gap-2"
                >
                    ← Back to Transfer Hub
                </button>

                <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-4xl font-bold text-slate-900 mb-2">{college.name}</h1>
                            <p className="text-slate-600 text-lg mb-4">{college.fullName}</p>
                            <div className="flex gap-3">
                                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                    timeUntil.isPast
                                        ? 'bg-gray-200 text-gray-700'
                                        : timeUntil.isUrgent
                                            ? 'bg-red-100 text-red-700'
                                            : 'bg-blue-100 text-blue-700'
                                }`}>
                                    {timeUntil.isPast ? 'Deadline Passed' : `Due in ${timeUntil.days} days`}
                                </span>
                                <span className="px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-700">
                                    Fit Score: {fitScore.overallScore}%
                                </span>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex gap-2">
                            <a
                                href={college.applicationUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                            >
                                Application Portal →
                            </a>
                            <a
                                href={college.portalUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 font-medium"
                            >
                                Student Portal
                            </a>
                        </div>
                    </div>

                    {/* Fit Analysis */}
                    <div className="mt-6 grid grid-cols-4 gap-4">
                        <div className="bg-blue-50 rounded-lg p-4">
                            <div className="text-2xl font-bold text-blue-700">{fitScore.valueAlignment}%</div>
                            <div className="text-sm text-blue-600">Value Alignment</div>
                        </div>
                        <div className="bg-green-50 rounded-lg p-4">
                            <div className="text-2xl font-bold text-green-700">{fitScore.depthScore}%</div>
                            <div className="text-sm text-green-600">Commitment Depth</div>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-4">
                            <div className="text-2xl font-bold text-purple-700">{fitScore.leadershipScore}%</div>
                            <div className="text-sm text-purple-600">Leadership</div>
                        </div>
                        <div className="bg-orange-50 rounded-lg p-4">
                            <div className="text-2xl font-bold text-orange-700">{fitScore.impactScore}%</div>
                            <div className="text-sm text-orange-600">Impact & Awards</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto grid grid-cols-3 gap-6">
                {/* Left: Essay List */}
                <div className="col-span-1">
                    <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-200 sticky top-6">
                        <h2 className="text-xl font-bold text-slate-900 mb-4">Essay Requirements</h2>
                        <div className="space-y-3">
                            {college.essays.map(essay => {
                                const draft = essayDrafts[essay.id];
                                const isSelected = selectedEssay === essay.id;

                                return (
                                    <button
                                        key={essay.id}
                                        onClick={() => setSelectedEssay(essay.id)}
                                        className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                                            isSelected
                                                ? 'border-blue-500 bg-blue-50'
                                                : 'border-slate-200 hover:border-blue-300'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-semibold text-slate-900">{essay.title}</h3>
                                            {essay.required && (
                                                <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full">
                                                    Required
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-slate-600 mb-2 line-clamp-2">{essay.prompt}</p>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-slate-500">{essay.wordLimit} words max</span>
                                            {draft && (
                                                <>
                                                    <span className="text-xs text-slate-400">•</span>
                                                    <span className={`text-xs font-semibold ${
                                                        draft.score >= 95 ? 'text-green-600' :
                                                        draft.score >= 90 ? 'text-blue-600' :
                                                        'text-orange-600'
                                                    }`}>
                                                        Score: {draft.score}%
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Scholarship Section */}
                        <div className="mt-6 pt-6 border-t border-slate-200">
                            <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                                <span>💰</span>
                                Matching Scholarships
                            </h3>
                            <button className="w-full py-2 px-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all">
                                Find Scholarships
                            </button>
                            <p className="text-xs text-slate-500 mt-2 text-center">
                                We'll match you with scholarships specific to {college.name}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right: Essay Editor */}
                <div className="col-span-2">
                    {selectedEssayData && (
                        <div className="bg-white rounded-xl shadow-lg p-8 border border-slate-200">
                            <div className="mb-6">
                                <h2 className="text-2xl font-bold text-slate-900 mb-2">{selectedEssayData.title}</h2>
                                <p className="text-slate-600 mb-4">{selectedEssayData.prompt}</p>
                                <div className="flex items-center gap-4">
                                    <span className="text-sm text-slate-500">
                                        Word Limit: {selectedEssayData.wordLimit}
                                    </span>
                                    {currentDraft && (
                                        <>
                                            <span className="text-sm text-slate-400">•</span>
                                            <span className="text-sm text-slate-500">
                                                Current: {currentDraft.wordCount} words
                                            </span>
                                            <span className="text-sm text-slate-400">•</span>
                                            <span className={`text-sm font-semibold ${
                                                currentDraft.score >= 95 ? 'text-green-600' :
                                                currentDraft.score >= 90 ? 'text-blue-600' :
                                                'text-orange-600'
                                            }`}>
                                                Score: {currentDraft.score}%
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="mb-6 flex gap-3">
                                {!currentDraft && (
                                    <button
                                        onClick={handleGenerateEssay}
                                        disabled={generatingEssay || activities.length === 0}
                                        className="flex-1 py-3 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {generatingEssay ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                Generating with AI...
                                            </span>
                                        ) : (
                                            `✨ Generate Essay (using ${activities.length} activities)`
                                        )}
                                    </button>
                                )}
                                {currentDraft && currentDraft.score < 95 && (
                                    <button
                                        onClick={handlePerfectEssay}
                                        disabled={generatingEssay}
                                        className="flex-1 py-3 px-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50"
                                    >
                                        {generatingEssay ? 'Perfecting...' : '🎯 Perfect Essay (Ultimate AI)'}
                                    </button>
                                )}
                            </div>

                            {/* Essay Editor */}
                            {currentDraft ? (
                                <div>
                                    <textarea
                                        value={currentDraft.content}
                                        onChange={(e) => {
                                            const updatedDraft = {
                                                ...currentDraft,
                                                content: e.target.value,
                                                wordCount: e.target.value.split(/\s+/).filter(Boolean).length,
                                                lastUpdated: new Date().toISOString(),
                                            };
                                            setEssayDrafts({
                                                ...essayDrafts,
                                                [selectedEssayData.id]: updatedDraft,
                                            });
                                        }}
                                        className="w-full h-96 p-4 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:outline-none resize-none font-serif text-slate-800 leading-relaxed"
                                        placeholder="Your essay will appear here..."
                                    />
                                    <div className="mt-4 flex justify-between items-center">
                                        <div className="text-sm text-slate-600">
                                            Last updated: {new Date(currentDraft.lastUpdated).toLocaleString()}
                                        </div>
                                        <button className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700">
                                            Export Essay
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-96 flex items-center justify-center border-2 border-dashed border-slate-300 rounded-lg">
                                    <div className="text-center">
                                        <p className="text-slate-500 mb-4">No essay draft yet</p>
                                        {activities.length === 0 ? (
                                            <div className="text-sm text-orange-600 bg-orange-50 rounded-lg p-4 max-w-md">
                                                ⚠️ Please add activities to your profile first. Go to the Activities page.
                                            </div>
                                        ) : (
                                            <p className="text-sm text-slate-400">
                                                Click "Generate Essay" to create an AI-powered draft based on your activities
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
