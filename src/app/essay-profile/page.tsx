'use client';

import { useState } from 'react';
import { useS3Storage } from '@/lib/useS3Storage';
import { STORAGE_KEYS } from '@/lib/s3-storage';
import { useRouter } from 'next/navigation';

// ============================================
// SIMPLIFIED ESSAY PROFILE
// User only fills in basics - system auto-generates the rest!
// ============================================

export default function EssayProfilePage() {
    const router = useRouter();
    const [autoResearching, setAutoResearching] = useState(false);
    const [researchComplete, setResearchComplete] = useState(false);

    // Simple profile - only basics needed
    const { data: profile, setData: setProfile, isSaving } = useS3Storage<any>(
        STORAGE_KEYS.ESSAY_PERSONAL_PROFILE,
        {
            defaultValue: {
                name: '',
                email: '',
                currentSchool: 'UCR',
                major: 'Computer Science',
                gpa: 3.9,
                graduationYear: 2027,

                // ONLY these 2 fields needed from user!
                whyTransferringGeneral: '',
                careerGoalsGeneral: [],

                // These will be auto-filled
                interests: [],
                background: {
                    isInternational: true,
                    homeCountry: '',
                    languages: [],
                },
                updatedAt: new Date().toISOString(),
            },
        }
    );

    const [currentGoal, setCurrentGoal] = useState('');

    const addGoal = () => {
        if (currentGoal.trim()) {
            setProfile({
                ...profile,
                careerGoalsGeneral: [...(profile.careerGoalsGeneral || []), currentGoal.trim()],
            });
            setCurrentGoal('');
        }
    };

    const removeGoal = (index: number) => {
        setProfile({
            ...profile,
            careerGoalsGeneral: profile.careerGoalsGeneral.filter((_: any, i: number) => i !== index),
        });
    };

    const addInterest = (interest: string) => {
        if (interest.trim() && !profile.interests.includes(interest.trim())) {
            setProfile({
                ...profile,
                interests: [...profile.interests, interest.trim()],
            });
        }
    };

    const removeInterest = (interest: string) => {
        setProfile({
            ...profile,
            interests: profile.interests.filter((i: string) => i !== interest),
        });
    };

    // Auto-research all target colleges
    const handleAutoResearch = async () => {
        if (!profile.whyTransferringGeneral || profile.careerGoalsGeneral.length === 0) {
            alert('Please fill in "Why Transferring" and at least one Career Goal first!');
            return;
        }

        setAutoResearching(true);

        try {
            // Auto-research for each target college
            const colleges = ['mit', 'stanford', 'cmu', 'cornell', 'nyu'];

            for (const collegeId of colleges) {
                console.log(`🔬 Auto-researching ${collegeId}...`);

                const response = await fetch('/api/essay-intelligence/auto-research', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        collegeId,
                        userProfile: {
                            major: profile.major,
                            interests: profile.interests,
                            careerGoals: profile.careerGoalsGeneral,
                            currentSchool: profile.currentSchool,
                            whyTransferringGeneral: profile.whyTransferringGeneral,
                        },
                    }),
                });

                if (response.ok) {
                    const result = await response.json();

                    // Save college-specific research to S3
                    await fetch('/api/storage', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            key: `essay-intelligence/college-research/${collegeId}`,
                            value: result.collegeResearch,
                        }),
                    });

                    console.log(`✅ ${collegeId} research saved!`);
                }
            }

            setResearchComplete(true);
            alert('🎉 Auto-research complete! Your profile is now customized for each college.');

        } catch (error) {
            console.error('Auto-research error:', error);
            alert('Failed to auto-research. Please try again.');
        } finally {
            setAutoResearching(false);
        }
    };

    const isReadyForResearch = profile.whyTransferringGeneral &&
                                profile.careerGoalsGeneral?.length > 0 &&
                                profile.interests?.length > 0;

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8">
            <div className="max-w-4xl mx-auto">

                {/* Header */}
                <div className="bg-white rounded-2xl shadow-2xl p-8 mb-8">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                        Essay Profile - Simplified
                    </h1>
                    <p className="text-gray-600 text-lg">
                        Fill in just the basics below - we'll auto-generate everything else!
                    </p>
                    <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm text-blue-800">
                            <strong>✨ How it works:</strong> You fill in basic info + why you're transferring + career goals.
                            We automatically research professors, courses, labs for EACH college and customize your profile!
                        </p>
                    </div>
                </div>

                {/* Basic Info */}
                <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <span>📋</span> Basic Information
                    </h2>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                            <input
                                type="text"
                                value={profile.name}
                                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                                placeholder="Your full name"
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                            <input
                                type="email"
                                value={profile.email}
                                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                                placeholder="your.email@example.com"
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Major</label>
                            <input
                                type="text"
                                value={profile.major}
                                onChange={(e) => setProfile({ ...profile, major: e.target.value })}
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Current School</label>
                            <input
                                type="text"
                                value={profile.currentSchool}
                                onChange={(e) => setProfile({ ...profile, currentSchool: e.target.value })}
                                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>
                </div>

                {/* Interests (Quick) */}
                <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2 flex items-center gap-2">
                        <span>💡</span> Interests
                    </h2>
                    <p className="text-sm text-gray-600 mb-4">Add 3-5 academic/professional interests</p>

                    <div className="flex gap-2 mb-4">
                        <button
                            onClick={() => addInterest('Machine Learning')}
                            className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                        >
                            + Machine Learning
                        </button>
                        <button
                            onClick={() => addInterest('AI Ethics')}
                            className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                        >
                            + AI Ethics
                        </button>
                        <button
                            onClick={() => addInterest('Robotics')}
                            className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                        >
                            + Robotics
                        </button>
                        <button
                            onClick={() => addInterest('Data Science')}
                            className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                        >
                            + Data Science
                        </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {profile.interests?.map((interest: string, i: number) => (
                            <span
                                key={i}
                                className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                            >
                                {interest}
                                <button onClick={() => removeInterest(interest)} className="hover:text-blue-900">
                                    ×
                                </button>
                            </span>
                        ))}
                    </div>
                </div>

                {/* Why Transferring (CRITICAL) */}
                <div className="bg-gradient-to-br from-orange-50 to-red-50 border-2 border-orange-300 rounded-2xl shadow-xl p-8 mb-6">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2 flex items-center gap-2">
                        <span>🔄</span> Why Are You Transferring?
                    </h2>
                    <p className="text-sm text-orange-700 mb-4">
                        <strong>CRITICAL:</strong> This will be customized for EACH college automatically!
                    </p>

                    <textarea
                        value={profile.whyTransferringGeneral}
                        onChange={(e) => setProfile({ ...profile, whyTransferringGeneral: e.target.value })}
                        placeholder="Write 2-3 sentences about why you're leaving your current school. Be specific about what's lacking. Example: 'UCR's CS program is strong in theory but lacks hands-on AI/ML research opportunities. I need access to cutting-edge research labs and professors specializing in AI ethics, which UCR doesn't offer.'"
                        rows={5}
                        className="w-full px-4 py-3 rounded-lg border-2 border-orange-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />

                    <p className="text-xs text-gray-500 mt-2 italic">
                        💡 Tip: Be honest and specific. What's ACTUALLY missing at your current school?
                    </p>
                </div>

                {/* Career Goals (CRITICAL) */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-2xl shadow-xl p-8 mb-6">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2 flex items-center gap-2">
                        <span>🎯</span> Career Goals
                    </h2>
                    <p className="text-sm text-green-700 mb-4">
                        <strong>CRITICAL:</strong> These will be tailored to show how EACH college helps you achieve them!
                    </p>

                    <div className="flex gap-2 mb-4">
                        <input
                            type="text"
                            value={currentGoal}
                            onChange={(e) => setCurrentGoal(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addGoal())}
                            placeholder="Add a career goal (e.g., 'AI Research Scientist at Google DeepMind')"
                            className="flex-1 px-4 py-3 rounded-lg border-2 border-green-300 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                        <button
                            onClick={addGoal}
                            className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700"
                        >
                            Add
                        </button>
                    </div>

                    <div className="space-y-2">
                        {profile.careerGoalsGeneral?.map((goal: string, i: number) => (
                            <div
                                key={i}
                                className="bg-white rounded-lg p-4 flex items-center justify-between border border-green-200"
                            >
                                <span className="text-gray-800">{i + 1}. {goal}</span>
                                <button
                                    onClick={() => removeGoal(i)}
                                    className="text-red-500 hover:text-red-700 font-bold"
                                >
                                    Remove
                                </button>
                            </div>
                        ))}
                    </div>

                    <p className="text-xs text-gray-500 mt-4 italic">
                        💡 Examples: "Lead AI safety research at OpenAI", "Build fair ML systems for healthcare", "Found AI startup focused on education equity"
                    </p>
                </div>

                {/* Auto-Research Button */}
                <div className="bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl shadow-2xl p-8 mb-6">
                    <div className="text-center">
                        <h2 className="text-3xl font-bold text-gray-800 mb-3">
                            ✨ Ready to Auto-Generate Everything?
                        </h2>
                        <p className="text-gray-700 mb-6">
                            We'll automatically research <strong>professors, courses, and labs</strong> for MIT, Stanford, CMU, Cornell, and NYU.
                            <br />
                            Plus, we'll <strong>customize your transfer reason and career goals</strong> for EACH college!
                        </p>

                        {!isReadyForResearch && (
                            <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mb-4">
                                <p className="text-sm text-yellow-800">
                                    ⚠️ Please fill in: Why Transferring, Career Goals (at least 1), and Interests (at least 3)
                                </p>
                            </div>
                        )}

                        <button
                            onClick={handleAutoResearch}
                            disabled={!isReadyForResearch || autoResearching}
                            className={`px-8 py-4 rounded-xl font-bold text-lg transition-all ${
                                isReadyForResearch && !autoResearching
                                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl'
                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            }`}
                        >
                            {autoResearching ? (
                                <>
                                    <span className="animate-spin inline-block mr-2">⏳</span>
                                    Auto-Researching Colleges...
                                </>
                            ) : researchComplete ? (
                                <>✅ Research Complete!</>
                            ) : (
                                <>🚀 Auto-Generate College Research</>
                            )}
                        </button>

                        {researchComplete && (
                            <div className="mt-6 bg-green-50 border border-green-300 rounded-lg p-4">
                                <p className="text-green-800 font-semibold mb-2">
                                    🎉 Success! Your profile is now customized for each college.
                                </p>
                                <button
                                    onClick={() => router.push('/transfer')}
                                    className="mt-2 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700"
                                >
                                    Go to Transfer Hub →
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Save Indicator */}
                {isSaving && (
                    <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg">
                        ☁️ Saving to S3...
                    </div>
                )}
            </div>
        </div>
    );
}
