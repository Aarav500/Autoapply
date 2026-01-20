'use client';

import React, { useState, useEffect } from 'react';
import { targetColleges, getTimeUntilDeadline, formatDeadline } from '@/lib/colleges-data';
import { useS3Storage } from '@/lib/useS3Storage';
import Link from 'next/link';

// ============================================
// ULTIMATE TRANSFER HUB
// Your one-stop dashboard for all transfer applications
// ============================================

interface TransferProgress {
    collegeId: string;
    essaysCompleted: number;
    totalEssays: number;
    matchingScholarships: number;
    overallScore: number;
    lastUpdated: string;
}

export default function TransferHub() {
    const [selectedCollege, setSelectedCollege] = useState<string | null>(null);
    const [progressData, setProgressData] = useState<Record<string, TransferProgress>>({});
    const { data: activities } = useS3Storage<any[]>('activities', { defaultValue: [] });
    const { data: userProfile } = useS3Storage<any>('user-profile', { defaultValue: {} });

    // Sort colleges by deadline (earliest first)
    const sortedColleges = [...targetColleges].sort((a, b) =>
        a.deadline.getTime() - b.deadline.getTime()
    );

    // Calculate progress for each college
    useEffect(() => {
        const progress: Record<string, TransferProgress> = {};

        sortedColleges.forEach(college => {
            const essaysCompleted = 0; // TODO: Load from localStorage/S3
            const totalEssays = college.essays.filter(e => e.required).length;

            progress[college.id] = {
                collegeId: college.id,
                essaysCompleted,
                totalEssays,
                matchingScholarships: 0, // TODO: Calculate
                overallScore: 0, // TODO: Calculate based on activities
                lastUpdated: new Date().toISOString(),
            };
        });

        setProgressData(progress);
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-8">
            {/* Header */}
            <div className="max-w-7xl mx-auto mb-12">
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-slate-200">
                    <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-4">
                        🎓 Transfer Hub
                    </h1>
                    <p className="text-slate-600 text-lg">
                        Your journey to {sortedColleges.length} top universities starts here.
                        {activities?.length > 0 && ` We've loaded ${activities.length} activities from your profile.`}
                    </p>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-4 gap-4 mt-6">
                        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
                            <div className="text-3xl font-bold">{sortedColleges.length}</div>
                            <div className="text-blue-100 text-sm">Target Colleges</div>
                        </div>
                        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white">
                            <div className="text-3xl font-bold">
                                {Object.values(progressData).reduce((sum, p) => sum + p.essaysCompleted, 0)}
                            </div>
                            <div className="text-green-100 text-sm">Essays Completed</div>
                        </div>
                        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white">
                            <div className="text-3xl font-bold">{activities?.length || 0}</div>
                            <div className="text-purple-100 text-sm">Activities Loaded</div>
                        </div>
                        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-4 text-white">
                            <div className="text-3xl font-bold">
                                {sortedColleges.filter(c => {
                                    const time = getTimeUntilDeadline(c.deadline);
                                    return time.isUrgent && !time.isPast;
                                }).length}
                            </div>
                            <div className="text-orange-100 text-sm">Urgent Deadlines</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* College Grid */}
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sortedColleges.map(college => {
                    const timeUntil = getTimeUntilDeadline(college.deadline);
                    const progress = progressData[college.id];
                    const completionRate = progress
                        ? (progress.essaysCompleted / progress.totalEssays) * 100
                        : 0;

                    return (
                        <Link
                            key={college.id}
                            href={`/transfer/${college.id}`}
                            className="block group"
                        >
                            <div className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-slate-200 group-hover:scale-[1.02]">
                                {/* Header with deadline */}
                                <div className={`p-6 ${
                                    timeUntil.isPast
                                        ? 'bg-gray-400'
                                        : timeUntil.isUrgent
                                            ? 'bg-gradient-to-r from-red-500 to-orange-500'
                                            : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                                } text-white`}>
                                    <h2 className="text-2xl font-bold mb-1">{college.name}</h2>
                                    <p className="text-sm opacity-90">{college.fullName}</p>
                                    <div className="mt-3 flex items-center gap-2">
                                        <span className="text-xs font-semibold px-2 py-1 bg-white/20 rounded-full">
                                            {timeUntil.isPast ? '❌ Deadline Passed' : `⏰ ${timeUntil.days}d ${timeUntil.hours}h`}
                                        </span>
                                        <span className="text-xs font-semibold px-2 py-1 bg-white/20 rounded-full">
                                            {college.deadlineType}
                                        </span>
                                    </div>
                                </div>

                                {/* Progress */}
                                <div className="p-6">
                                    <div className="mb-4">
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="font-medium text-slate-700">Essay Progress</span>
                                            <span className="text-slate-600">
                                                {progress?.essaysCompleted || 0} / {progress?.totalEssays || college.essays.length}
                                            </span>
                                        </div>
                                        <div className="w-full bg-slate-200 rounded-full h-2">
                                            <div
                                                className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-500"
                                                style={{ width: `${completionRate}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Key Info */}
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-slate-600">Required Essays:</span>
                                            <span className="font-semibold text-slate-800">
                                                {college.essays.filter(e => e.required).length}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-600">Transfer Rate:</span>
                                            <span className="font-semibold text-slate-800">
                                                {college.transferInfo.acceptanceRate}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-600">Avg Transfer GPA:</span>
                                            <span className="font-semibold text-slate-800">
                                                {college.transferInfo.avgGPA}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Values Tags */}
                                    <div className="mt-4 flex flex-wrap gap-1">
                                        {college.research.values.slice(0, 3).map(value => (
                                            <span
                                                key={value}
                                                className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-full"
                                            >
                                                {value}
                                            </span>
                                        ))}
                                    </div>

                                    {/* CTA */}
                                    <button className="mt-4 w-full py-2 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold group-hover:shadow-lg transition-all">
                                        Start Application →
                                    </button>
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>

            {/* Bottom Tips */}
            <div className="max-w-7xl mx-auto mt-12 bg-amber-50 border border-amber-200 rounded-xl p-6">
                <h3 className="font-bold text-amber-900 mb-2">💡 Pro Tips for Transfer Success</h3>
                <ul className="text-sm text-amber-800 space-y-1">
                    <li>• Focus on colleges with deadlines in the next 30 days first</li>
                    <li>• Use our AI to generate personalized essays based on your {activities?.length || 0} activities</li>
                    <li>• Check scholarship matches for each college to maximize financial aid</li>
                    <li>• Export to Common App or Coalition App when ready</li>
                </ul>
            </div>
        </div>
    );
}
