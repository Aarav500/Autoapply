'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, Button } from '@/components/ui';
import { targetColleges } from '@/lib/colleges-data';
import { useS3Storage } from '@/lib/useS3Storage';
import {
    Mail,
    Send,
    Download,
    RefreshCw,
    CheckCircle2,
    AlertCircle,
    Lightbulb,
    Heart
} from 'lucide-react';

// ============================================
// WAITLIST LOCI (LETTER OF CONTINUED INTEREST) GENERATOR
// Converts waitlists to acceptances (30-50% success rate)
// ============================================

export default function WaitlistLociPage() {
    const [selectedCollege, setSelectedCollege] = useState('');
    const [tone, setTone] = useState<'professional' | 'passionate' | 'humble' | 'confident'>('passionate');
    const [recentUpdates, setRecentUpdates] = useState({
        newActivities: '',
        newAwards: '',
        improvedGrades: '',
        newResearch: '',
    });
    const [whyThisCollege, setWhyThisCollege] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [lociResult, setLociResult] = useState<any>(null);

    const { data: activities } = useS3Storage<any[]>('activities', { defaultValue: [] });
    const { data: achievements } = useS3Storage<any[]>('achievements', { defaultValue: [] });
    const { data: userProfile } = useS3Storage<any>('profile', { defaultValue: {} });

    const selectedCollegeData = targetColleges.find(c => c.id === selectedCollege);

    const handleGenerate = async () => {
        if (!selectedCollege || !whyThisCollege.trim()) {
            alert('Please select a college and explain why you want to attend.');
            return;
        }

        setIsGenerating(true);

        try {
            const response = await fetch('/api/interview-intelligence/waitlist-loci', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    college: {
                        name: selectedCollegeData?.name || '',
                        fullName: selectedCollegeData?.fullName || '',
                        values: selectedCollegeData?.research.values || [],
                        whatTheyLookFor: selectedCollegeData?.research.whatTheyLookFor || [],
                        culture: selectedCollegeData?.research.culture || '',
                    },
                    userProfile: {
                        name: userProfile?.name || 'Student',
                        major: userProfile?.major,
                        gpa: parseFloat(userProfile?.gpa) || undefined,
                        values: userProfile?.values,
                        whyThisCollege,
                    },
                    activities: activities || [],
                    achievements: achievements || [],
                    recentUpdates: {
                        newActivities: recentUpdates.newActivities ? [recentUpdates.newActivities] : undefined,
                        newAwards: recentUpdates.newAwards ? [recentUpdates.newAwards] : undefined,
                        improvedGrades: recentUpdates.improvedGrades || undefined,
                        newResearch: recentUpdates.newResearch || undefined,
                    },
                    tone,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to generate LOCI');
            }

            const result = await response.json();
            setLociResult(result);
        } catch (error) {
            console.error('LOCI generation error:', error);
            alert('Failed to generate LOCI. Please check your API keys.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopyToClipboard = () => {
        if (lociResult?.loci) {
            navigator.clipboard.writeText(lociResult.loci);
            alert('LOCI copied to clipboard!');
        }
    };

    const handleDownload = () => {
        if (!lociResult?.loci) return;

        const blob = new Blob([lociResult.loci], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `LOCI_${selectedCollegeData?.name.replace(/\s+/g, '_')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
        >
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold flex items-center gap-3" style={{ fontFamily: 'var(--font-display)' }}>
                    <Heart className="w-8 h-8" style={{ color: 'var(--primary-400)' }} />
                    Waitlist LOCI Generator
                </h1>
                <p style={{ color: 'var(--text-secondary)' }}>
                    Convert waitlist to acceptance with a compelling Letter of Continued Interest (30-50% success rate)
                </p>
            </div>

            {/* Info Card */}
            <Card style={{ background: 'rgba(91, 111, 242, 0.1)', border: '2px solid rgba(91, 111, 242, 0.3)' }}>
                <div className="flex items-start gap-3">
                    <Lightbulb className="w-6 h-6 flex-shrink-0" style={{ color: 'var(--primary-400)' }} />
                    <div>
                        <h3 className="font-semibold mb-1">What is a LOCI?</h3>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                            A Letter of Continued Interest (LOCI) is sent after being waitlisted. It reaffirms your commitment,
                            shares new achievements since your application, and demonstrates why you're the perfect fit.
                            <strong> Studies show LOCIs can increase acceptance rates by 30-50% from waitlists.</strong>
                        </p>
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Input Section */}
                <div className="space-y-6">
                    <Card>
                        <h3 className="font-semibold mb-4">1. Select College</h3>
                        <select
                            value={selectedCollege}
                            onChange={(e) => setSelectedCollege(e.target.value)}
                            className="input-field w-full"
                        >
                            <option value="">-- Select a college --</option>
                            {targetColleges.map(college => (
                                <option key={college.id} value={college.id}>
                                    {college.name} - {college.fullName}
                                </option>
                            ))}
                        </select>
                    </Card>

                    <Card>
                        <h3 className="font-semibold mb-4">2. Why This College? (Original Essay)</h3>
                        <textarea
                            value={whyThisCollege}
                            onChange={(e) => setWhyThisCollege(e.target.value)}
                            className="input-field w-full"
                            rows={4}
                            placeholder="Paste your 'Why [College]' essay or explain in 2-3 sentences why you want to attend..."
                        />
                    </Card>

                    <Card>
                        <h3 className="font-semibold mb-4">3. Recent Updates (Since Application)</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="text-sm font-medium mb-1 block">New Activities</label>
                                <input
                                    type="text"
                                    value={recentUpdates.newActivities}
                                    onChange={(e) => setRecentUpdates({ ...recentUpdates, newActivities: e.target.value })}
                                    className="input-field w-full"
                                    placeholder="E.g., Started tutoring program, joined research lab..."
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">New Awards</label>
                                <input
                                    type="text"
                                    value={recentUpdates.newAwards}
                                    onChange={(e) => setRecentUpdates({ ...recentUpdates, newAwards: e.target.value })}
                                    className="input-field w-full"
                                    placeholder="E.g., Won hackathon, published paper..."
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Improved Grades</label>
                                <input
                                    type="text"
                                    value={recentUpdates.improvedGrades}
                                    onChange={(e) => setRecentUpdates({ ...recentUpdates, improvedGrades: e.target.value })}
                                    className="input-field w-full"
                                    placeholder="E.g., 4.0 this semester, Dean's List..."
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">New Research/Projects</label>
                                <input
                                    type="text"
                                    value={recentUpdates.newResearch}
                                    onChange={(e) => setRecentUpdates({ ...recentUpdates, newResearch: e.target.value })}
                                    className="input-field w-full"
                                    placeholder="E.g., Working on ML project, independent study..."
                                />
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <h3 className="font-semibold mb-4">4. Select Tone</h3>
                        <div className="grid grid-cols-2 gap-3">
                            {(['professional', 'passionate', 'humble', 'confident'] as const).map((t) => (
                                <button
                                    key={t}
                                    onClick={() => setTone(t)}
                                    className={`p-3 rounded-lg border-2 transition-all ${
                                        tone === t
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-slate-200 hover:border-blue-300'
                                    }`}
                                >
                                    <span className="font-medium capitalize">{t}</span>
                                </button>
                            ))}
                        </div>
                    </Card>

                    <Button
                        onClick={handleGenerate}
                        disabled={isGenerating || !selectedCollege || !whyThisCollege.trim()}
                        icon={isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        className="w-full"
                    >
                        {isGenerating ? 'Generating LOCI...' : 'Generate LOCI'}
                    </Button>
                </div>

                {/* Output Section */}
                <div className="space-y-6">
                    {lociResult && (
                        <>
                            {/* Quality Score */}
                            <Card style={{ background: 'var(--gradient-primary)' }}>
                                <div className="flex items-center justify-between text-white">
                                    <div>
                                        <h3 className="font-bold text-lg">Quality Score</h3>
                                        <p className="text-sm text-white/80">{lociResult.metadata.wordCount} words</p>
                                    </div>
                                    <div className="text-5xl font-bold">{lociResult.metadata.qualityScore}%</div>
                                </div>
                            </Card>

                            {/* LOCI Letter */}
                            <Card>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-bold text-lg">Your LOCI</h3>
                                    <div className="flex gap-2">
                                        <Button variant="secondary" size="sm" onClick={handleCopyToClipboard}>
                                            Copy
                                        </Button>
                                        <Button variant="secondary" size="sm" onClick={handleDownload} icon={<Download className="w-4 h-4" />}>
                                            Download
                                        </Button>
                                    </div>
                                </div>
                                <div
                                    className="p-4 rounded-lg whitespace-pre-line font-serif text-sm leading-relaxed"
                                    style={{ background: 'var(--bg-secondary)' }}
                                >
                                    {lociResult.loci}
                                </div>
                            </Card>

                            {/* Email Info */}
                            <Card>
                                <h3 className="font-bold mb-3 flex items-center gap-2">
                                    <Mail className="w-5 h-5" style={{ color: 'var(--primary-400)' }} />
                                    How to Send
                                </h3>
                                <div className="space-y-2 text-sm">
                                    <div>
                                        <strong>To:</strong> {lociResult.email.to}
                                    </div>
                                    <div>
                                        <strong>Subject:</strong> {lociResult.email.subject}
                                    </div>
                                </div>
                            </Card>

                            {/* Sending Tips */}
                            <Card style={{ background: 'rgba(34, 197, 94, 0.1)' }}>
                                <h3 className="font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--success)' }}>
                                    <CheckCircle2 className="w-5 h-5" />
                                    Sending Tips
                                </h3>
                                <ul className="space-y-2 text-sm">
                                    {lociResult.tips.sending.map((tip: string, i: number) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <span style={{ color: 'var(--success)' }}>•</span>
                                            <span>{tip}</span>
                                        </li>
                                    ))}
                                </ul>
                            </Card>

                            {/* Success Tips */}
                            <Card style={{ background: 'rgba(245, 158, 11, 0.1)' }}>
                                <h3 className="font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--warning)' }}>
                                    <AlertCircle className="w-5 h-5" />
                                    After Sending
                                </h3>
                                <ul className="space-y-2 text-sm">
                                    {lociResult.tips.success.map((tip: string, i: number) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <span style={{ color: 'var(--warning)' }}>•</span>
                                            <span>{tip}</span>
                                        </li>
                                    ))}
                                </ul>
                            </Card>
                        </>
                    )}

                    {!lociResult && (
                        <Card className="h-full flex items-center justify-center text-center p-12">
                            <div>
                                <Mail className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
                                <p style={{ color: 'var(--text-muted)' }}>
                                    Fill in the details and click "Generate LOCI" to create your letter
                                </p>
                            </div>
                        </Card>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
