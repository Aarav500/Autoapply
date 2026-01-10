'use client';

import React, { useEffect, useState } from 'react';
import { DiffViewer } from './DiffViewer';
import { getProfileReviewData, ProfileReviewData } from '@/app/actions/profile-automation';

interface ProfileReviewProps {
    userId: string;
}

export const ProfileReview: React.FC<ProfileReviewProps> = ({ userId }) => {
    const [data, setData] = useState<ProfileReviewData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        getProfileReviewData(userId)
            .then(setData)
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, [userId]);

    if (loading) return <div className="p-8 text-center text-gray-500">Generating Profile Preview...</div>;
    if (error) return <div className="p-8 text-red-500">Error: {error}</div>;
    if (!data) return null;

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8">
            <h1 className="text-2xl font-bold text-gray-900 border-b pb-4">
                Profile Audit & Optimization
            </h1>

            {/* Headline Section */}
            <section className="space-y-4">
                <h2 className="text-xl font-semibold text-blue-600">Headline</h2>
                <DiffViewer
                    oldText={data.headline.current}
                    newText={data.headline.proposed}
                    label="Headline Optimization"
                />
                <ActionButtons textToCopy={data.headline.proposed} />
            </section>

            {/* About Section */}
            <section className="space-y-4">
                <h2 className="text-xl font-semibold text-blue-600">About Section</h2>
                <DiffViewer
                    oldText={data.about.current}
                    newText={data.about.proposed}
                    label="About Summary"
                />
                <ActionButtons textToCopy={data.about.proposed} />
            </section>

            {/* Experience Section */}
            <section className="space-y-4">
                <h2 className="text-xl font-semibold text-blue-600">Experience & Projects</h2>
                {data.experiences.map((exp, idx) => (
                    <div key={idx} className="border-t pt-4">
                        <h3 className="font-medium text-gray-800 mb-2">{exp.role} at {exp.company}</h3>
                        <DiffViewer
                            oldText={exp.current}
                            newText={exp.proposed}
                        />
                        <ActionButtons textToCopy={exp.proposed} />
                    </div>
                ))}
            </section>
        </div>
    );
};

const ActionButtons: React.FC<{ textToCopy: string }> = ({ textToCopy }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex gap-3">
            <button
                onClick={handleCopy}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
                {copied ? 'Copied!' : 'Copy Optimized Text'}
            </button>
            <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition">
                Mark as Applied
            </button>
        </div>
    );
};
