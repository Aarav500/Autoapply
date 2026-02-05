'use client';

import React, { useState } from 'react';
import { RecommendationCard } from './RecommendationCard';
import { LinkedInProfileGraph, ProfileRecommendation } from '@/lib/linkedin/profile-graph';
import { Card, Button, ProgressBar } from '@/components/ui';
import { Sparkles, AlertCircle, Copy, CheckCircle2 } from 'lucide-react';

interface ProfileReviewProps {
    data: LinkedInProfileGraph;
    onRefresh: () => void;
}

export const ProfileReview: React.FC<ProfileReviewProps> = ({ data, onRefresh }) => {
    const { snapshot, recommendations, score } = data;

    return (
        <div className="space-y-6">
            <Card className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h2 className="text-2xl font-bold">LinkedIn Optimization Score</h2>
                        <p className="text-blue-100">Based on your latest profile snapshot</p>
                    </div>
                    <div className="text-4xl font-black">{score}%</div>
                </div>
                <ProgressBar value={score} className="bg-white/20" />
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                    label="Snapshot Updated"
                    value={snapshot.lastUpdated ? new Date(snapshot.lastUpdated).toLocaleDateString() : 'Never'}
                    icon={<CheckCircle2 className="w-4 h-4 text-green-400" />}
                />
                <StatCard
                    label="Recommendations"
                    value={recommendations.length.toString()}
                    icon={<Sparkles className="w-4 h-4 text-yellow-400" />}
                />
                <StatCard
                    label="Missing Sections"
                    value={recommendations.filter(r => r.type === 'missing').length.toString()}
                    icon={<AlertCircle className="w-4 h-4 text-red-400" />}
                />
            </div>

            <div className="space-y-4">
                <h3 className="text-xl font-bold flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-blue-500" />
                    Actionable Improvements
                </h3>
                {recommendations.length === 0 ? (
                    <Card className="p-8 text-center text-gray-500">
                        No immediate improvements suggested. Your profile looks great!
                    </Card>
                ) : (
                    recommendations.map((rec, idx) => (
                        <RecommendationCard key={idx} recommendation={rec} />
                    ))
                )}
            </div>

            <div className="flex justify-center">
                <Button onClick={onRefresh} variant="secondary">
                    Ingest Fresh Data
                </Button>
            </div>
        </div>
    );
};

const StatCard = ({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) => (
    <Card className="p-4 flex flex-col items-center justify-center text-center">
        <div className="mb-1">{icon}</div>
        <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">{label}</div>
        <div className="text-xl font-bold">{value}</div>
    </Card>
);

