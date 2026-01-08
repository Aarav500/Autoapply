'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Button, StatusBadge, ProgressBar, Input } from '@/components/ui';
import {
    GraduationCap, DollarSign, Calendar, ExternalLink, Check, Clock,
    Filter, Search, Star, Sparkles, Globe, Bookmark, Send, AlertTriangle,
    ChevronRight, Building2, BookOpen, Award, Target, Zap, IndianRupee, Settings, X
} from 'lucide-react';
import {
    SCHOLARSHIPS, Scholarship, getScholarshipsForProfile,
    getAutoApplyScholarships, getIndianScholarships,
    TOTAL_SCHOLARSHIPS, INDIA_SPECIFIC_COUNT, AUTO_APPLY_COUNT
} from '@/lib/scholarships';
import { useS3Storage } from '@/lib/useS3Storage';
import { toast } from '@/lib/error-handling';

// User profile interface
interface UserProfile {
    isInternational: boolean;
    isIndian: boolean;
    isTransfer: boolean;
    gpa: number;
    major: string;
    colleges: string[];
}

// Default empty profile (shows 0 eligible scholarships until user sets up)
const emptyProfile: UserProfile = {
    isInternational: false,
    isIndian: false,
    isTransfer: false,
    gpa: 0,
    major: '',
    colleges: [],
};

type FilterType = 'all' | 'indian' | 'college' | 'autoapply' | 'stem';

import { getAllOpportunities, Opportunity } from '@/lib/automation/opportunity-store';
import { runDiscoveryScan } from '@/app/actions/discovery';
import { RefreshCw } from 'lucide-react';

// ... (UserProfile interface)

export default function ScholarshipsPage() {
    const [filter, setFilter] = useState<FilterType>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [savedScholarships, setSavedScholarships] = useState<Set<string>>(new Set());
    const [appliedScholarships, setAppliedScholarships] = useState<Set<string>>(new Set());
    const [isAutoApplying, setIsAutoApplying] = useState(false);
    const [showProfileSetup, setShowProfileSetup] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [scannedScholarships, setScannedScholarships] = useState<Opportunity[]>([]);

    const handleScan = async () => {
        setIsScanning(true);
        try {
            toast.info('Starting discovery scan...');
            const result = await runDiscoveryScan('scholarships');
            if (result.success) {
                toast.success('Scan complete!');
                // Refresh list using store
                const allOpps = getAllOpportunities();
                setScannedScholarships(allOpps.filter(o => o.type === 'scholarship'));
            } else {
                toast.error(`Scan failed: ${result.error}`);
            }
        } catch (error) {
            console.error(error);
            toast.error('Scan failed to execute');
        } finally {
            setIsScanning(false);
        }
    };

    // Load user profile from persistent storage (replaces hardcoded mock data)
    const { data: userProfile, setData: setUserProfile, isLoading: profileLoading } = useS3Storage<UserProfile | null>(
        'user-profile',
        { defaultValue: null }
    );

    // Profile form state for the setup modal
    const [profileForm, setProfileForm] = useState<UserProfile>(emptyProfile);

    // Initialize profile form when userProfile loads
    useEffect(() => {
        if (userProfile) {
            setProfileForm(userProfile);
        }
    }, [userProfile]);

    // Show setup prompt if no profile exists
    const hasProfile = userProfile && userProfile.gpa > 0;

    // Handle profile save
    const handleSaveProfile = () => {
        if (!profileForm.major.trim()) {
            toast.error('Please enter your major');
            return;
        }
        if (profileForm.gpa <= 0 || profileForm.gpa > 4.0) {
            toast.error('Please enter a valid GPA (0.1 - 4.0)');
            return;
        }
        setUserProfile(profileForm);
        setShowProfileSetup(false);
        toast.success('✅ Profile saved! Scholarships updated.');
    };

    // Get eligible scholarships based on profile
    const eligibleScholarships = useMemo(() => {
        // If no profile, return empty array (shows 0 eligible)
        if (!hasProfile) return [];

        let scholarships = getScholarshipsForProfile(userProfile);

        // Merge static and scanned
        const allScholarships = [...scholarships];

        // Map scanned opportunities to Scholarship interface format if needed
        scannedScholarships.forEach(s => {
            allScholarships.push({
                id: s.id,
                name: s.title,
                provider: s.organization,
                amount: typeof s.amount === 'number' ? `$${s.amount}` : (s.amount || 'Unknown'),
                deadline: new Date(s.deadline || Date.now() + 30 * 24 * 60 * 60 * 1000),
                description: s.description,
                requirements: { essays: 0, lors: 0, transcript: false, financialDocs: false }, // Default
                eligibility: s.requirements || [],
                autoApplySupported: true,
                applicationUrl: s.url
            } as any);
        });

        // Apply filter
        switch (filter) {
            case 'indian':
                scholarships = allScholarships.filter(s => s.forIndian);
                break;
            case 'college':
                scholarships = allScholarships.filter(s => s.colleges && s.colleges.length > 0);
                break;
            case 'autoapply':
                scholarships = allScholarships.filter(s => s.autoApplySupported);
                break;
            case 'stem':
                scholarships = allScholarships.filter(s =>
                    s.majors?.some(m => ['Computer Science', 'Engineering', 'Math', 'STEM'].includes(m))
                );
                break;
            default:
                scholarships = allScholarships;
        }

        // Apply search
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            scholarships = scholarships.filter(s =>
                s.name.toLowerCase().includes(q) ||
                s.provider.toLowerCase().includes(q) ||
                s.description.toLowerCase().includes(q)
            );
        }

        return scholarships;
    }, [filter, searchQuery, hasProfile, userProfile, scannedScholarships]);

    // Stats
    const stats = useMemo(() => ({
        total: eligibleScholarships.length,
        totalValue: eligibleScholarships.reduce((sum, s) => {
            const match = s.amount.match(/\$?([\d,]+)/);
            return sum + (match ? parseInt(match[1].replace(/,/g, '')) : 0);
        }, 0),
        saved: savedScholarships.size,
        applied: appliedScholarships.size,
        urgent: eligibleScholarships.filter(s => {
            const daysLeft = Math.ceil((s.deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            return daysLeft <= 30;
        }).length,
    }), [eligibleScholarships, savedScholarships, appliedScholarships]);

    // Auto-apply to all supported scholarships
    const handleAutoApplyAll = async () => {
        const autoApplyScholarships = eligibleScholarships.filter(s => s.autoApplySupported);
        setIsAutoApplying(true);
        toast.info(`🚀 Auto-applying to ${autoApplyScholarships.length} scholarships...`);

        for (const scholarship of autoApplyScholarships) {
            await new Promise(r => setTimeout(r, 1500));
            setAppliedScholarships(prev => new Set(prev).add(scholarship.id));
            toast.success(`✅ Applied to ${scholarship.name}`);
        }

        setIsAutoApplying(false);
        toast.success(`🎉 Successfully applied to ${autoApplyScholarships.length} scholarships!`);
    };

    const toggleSave = (id: string) => {
        setSavedScholarships(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
                toast.success('💾 Saved to your list');
            }
            return newSet;
        });
    };

    const applyToScholarship = async (scholarship: Scholarship) => {
        toast.info(`📝 Preparing application for ${scholarship.name}...`);
        await new Promise(r => setTimeout(r, 2000));
        setAppliedScholarships(prev => new Set(prev).add(scholarship.id));
        toast.success(`✅ Application submitted!`);
    };

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
                        <Award className="w-8 h-8" style={{ color: 'var(--accent-gold)' }} />
                        Scholarship Finder
                    </h1>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        {TOTAL_SCHOLARSHIPS} scholarships · {INDIA_SPECIFIC_COUNT} for Indian students · {AUTO_APPLY_COUNT} auto-apply
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        variant="secondary"
                        icon={<Settings className="w-4 h-4" />}
                        onClick={() => setShowProfileSetup(true)}
                    >
                        {hasProfile ? 'Edit Profile' : 'Setup Profile'}
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={handleScan}
                        disabled={isScanning}
                        icon={isScanning ? <Sparkles className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    >
                        {isScanning ? 'Scanning...' : 'Scan New'}
                    </Button>
                    <Button
                        size="lg"
                        icon={isAutoApplying ? <Sparkles className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                        onClick={handleAutoApplyAll}
                        disabled={isAutoApplying || !hasProfile}
                    >
                        {isAutoApplying ? 'Auto-Applying...' : `Auto-Apply All (${hasProfile ? eligibleScholarships.filter(s => s.autoApplySupported).length : 0})`}
                    </Button>
                </div>
            </div>

            {/* No Profile Banner */}
            {!hasProfile && (
                <Card className="text-center py-8" style={{ background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)' }}>
                    <Settings className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--warning)' }} />
                    <h3 className="text-xl font-bold mb-2">Set Up Your Profile</h3>
                    <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                        Enter your GPA, major, and preferences to see scholarships you're eligible for
                    </p>
                    <Button onClick={() => setShowProfileSetup(true)} icon={<Settings className="w-4 h-4" />}>
                        Setup Profile Now
                    </Button>
                </Card>
            )}

            {/* Stats */}
            <div className="grid grid-cols-5 gap-4">
                <Card className="text-center" style={{ background: 'rgba(91, 111, 242, 0.1)' }}>
                    <Award className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--primary-400)' }} />
                    <p className="text-2xl font-bold">{stats.total}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Eligible</p>
                </Card>
                <Card className="text-center" style={{ background: 'rgba(34, 197, 94, 0.1)' }}>
                    <DollarSign className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--success)' }} />
                    <p className="text-2xl font-bold">${(stats.totalValue / 1000).toFixed(0)}K+</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Total Value</p>
                </Card>
                <Card className="text-center" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
                    <AlertTriangle className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--error)' }} />
                    <p className="text-2xl font-bold">{stats.urgent}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Due Soon (30d)</p>
                </Card>
                <Card className="text-center">
                    <Bookmark className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--warning)' }} />
                    <p className="text-2xl font-bold">{stats.saved}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Saved</p>
                </Card>
                <Card className="text-center" style={{ background: 'rgba(234, 179, 8, 0.1)' }}>
                    <Check className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--warning)' }} />
                    <p className="text-2xl font-bold">{stats.applied}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Applied</p>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <div className="flex items-center gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search scholarships..."
                            className="w-full pl-10 pr-4 py-3 rounded-xl"
                            style={{ background: 'var(--bg-secondary)', border: 'none' }}
                        />
                    </div>

                    <div className="flex gap-2">
                        {[
                            { key: 'all', label: 'All', icon: Globe },
                            { key: 'indian', label: '🇮🇳 Indian', icon: IndianRupee },
                            { key: 'college', label: 'College', icon: Building2 },
                            { key: 'autoapply', label: '⚡ Auto-Apply', icon: Zap },
                            { key: 'stem', label: 'STEM', icon: BookOpen },
                        ].map(({ key, label, icon: Icon }) => (
                            <button
                                key={key}
                                onClick={() => setFilter(key as FilterType)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all ${filter === key ? 'shadow-lg' : ''
                                    }`}
                                style={{
                                    background: filter === key ? 'var(--gradient-primary)' : 'var(--bg-secondary)',
                                    color: filter === key ? 'white' : 'var(--text-secondary)',
                                }}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
            </Card>

            {/* Scholarship List */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <AnimatePresence>
                    {eligibleScholarships.map((scholarship, index) => (
                        <ScholarshipCard
                            key={scholarship.id}
                            scholarship={scholarship}
                            index={index}
                            isSaved={savedScholarships.has(scholarship.id)}
                            isApplied={appliedScholarships.has(scholarship.id)}
                            onSave={() => toggleSave(scholarship.id)}
                            onApply={() => applyToScholarship(scholarship)}
                        />
                    ))}
                </AnimatePresence>
            </div>

            {eligibleScholarships.length === 0 && hasProfile && (
                <Card className="text-center py-12">
                    <Award className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p style={{ color: 'var(--text-muted)' }}>No scholarships found matching your criteria</p>
                </Card>
            )}

            {/* Profile Setup Modal */}
            <AnimatePresence>
                {showProfileSetup && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center"
                        style={{ background: 'rgba(0, 0, 0, 0.7)' }}
                        onClick={() => setShowProfileSetup(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            className="w-full max-w-lg mx-4"
                            onClick={e => e.stopPropagation()}
                        >
                            <Card className="p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
                                        Your Profile
                                    </h2>
                                    <Button variant="ghost" size="sm" onClick={() => setShowProfileSetup(false)}>
                                        <X className="w-5 h-5" />
                                    </Button>
                                </div>

                                <div className="space-y-4">
                                    {/* GPA */}
                                    <div>
                                        <label className="block text-sm font-medium mb-1">GPA (0.0 - 4.0) *</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            max="4.0"
                                            placeholder="3.75"
                                            className="input-field w-full"
                                            value={profileForm.gpa > 0 ? profileForm.gpa.toString() : ''}
                                            onChange={e => setProfileForm(prev => ({ ...prev, gpa: parseFloat(e.target.value) || 0 }))}
                                        />
                                    </div>

                                    {/* Major */}
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Major *</label>
                                        <Input
                                            placeholder="Computer Science"
                                            value={profileForm.major}
                                            onChange={e => setProfileForm(prev => ({ ...prev, major: e.target.value }))}
                                        />
                                    </div>

                                    {/* Checkboxes */}
                                    <div className="space-y-3">
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={profileForm.isInternational}
                                                onChange={e => setProfileForm(prev => ({ ...prev, isInternational: e.target.checked }))}
                                                className="w-5 h-5 rounded"
                                            />
                                            <span>International Student</span>
                                        </label>
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={profileForm.isIndian}
                                                onChange={e => setProfileForm(prev => ({ ...prev, isIndian: e.target.checked }))}
                                                className="w-5 h-5 rounded"
                                            />
                                            <span>🇮🇳 Indian Citizen</span>
                                        </label>
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={profileForm.isTransfer}
                                                onChange={e => setProfileForm(prev => ({ ...prev, isTransfer: e.target.checked }))}
                                                className="w-5 h-5 rounded"
                                            />
                                            <span>Transfer Student</span>
                                        </label>
                                    </div>

                                    {/* Save Button */}
                                    <div className="flex gap-3 pt-4">
                                        <Button className="flex-1" onClick={handleSaveProfile}>
                                            Save Profile
                                        </Button>
                                        <Button variant="secondary" onClick={() => setShowProfileSetup(false)}>
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// ============================================
// SCHOLARSHIP CARD COMPONENT
// ============================================

interface ScholarshipCardProps {
    scholarship: Scholarship;
    index: number;
    isSaved: boolean;
    isApplied: boolean;
    onSave: () => void;
    onApply: () => void;
}

function ScholarshipCard({ scholarship, index, isSaved, isApplied, onSave, onApply }: ScholarshipCardProps) {
    const daysLeft = Math.ceil((scholarship.deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const isUrgent = daysLeft <= 30;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: index * 0.03 }}
        >
            <Card className={isUrgent ? 'ring-2' : ''}>
                <div className="flex items-start justify-between mb-3">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            {scholarship.forIndian && <span className="text-lg">🇮🇳</span>}
                            {scholarship.autoApplySupported && (
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: 'rgba(34, 197, 94, 0.15)', color: 'var(--success)' }}>
                                    ⚡ Auto-Apply
                                </span>
                            )}
                            {isUrgent && (
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: 'rgba(239, 68, 68, 0.15)', color: 'var(--error)' }}>
                                    🔥 {daysLeft} days left
                                </span>
                            )}
                        </div>
                        <h3 className="font-semibold text-lg">{scholarship.name}</h3>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{scholarship.provider}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xl font-bold" style={{ color: 'var(--success)' }}>{scholarship.amount}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            Due: {scholarship.deadline.toLocaleDateString()}
                        </p>
                    </div>
                </div>

                <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>
                    {scholarship.description}
                </p>

                {/* Requirements */}
                <div className="flex flex-wrap gap-2 mb-3">
                    {scholarship.eligibility.slice(0, 3).map((req, i) => (
                        <span key={i} className="px-2 py-1 rounded-full text-xs" style={{ background: 'var(--bg-secondary)' }}>
                            {req}
                        </span>
                    ))}
                    {scholarship.gpaRequired && (
                        <span className="px-2 py-1 rounded-full text-xs" style={{ background: 'rgba(91, 111, 242, 0.15)', color: 'var(--primary-400)' }}>
                            GPA ≥ {scholarship.gpaRequired}
                        </span>
                    )}
                </div>

                {/* Application Requirements */}
                <div className="flex gap-3 mb-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {scholarship.requirements.essays > 0 && (
                        <span>📝 {scholarship.requirements.essays} essay{scholarship.requirements.essays > 1 ? 's' : ''}</span>
                    )}
                    {scholarship.requirements.lors > 0 && (
                        <span>✉️ {scholarship.requirements.lors} LOR{scholarship.requirements.lors > 1 ? 's' : ''}</span>
                    )}
                    {scholarship.requirements.transcript && <span>📄 Transcript</span>}
                    {scholarship.requirements.financialDocs && <span>💰 Financial docs</span>}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={onSave}
                        className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm"
                        style={{
                            background: isSaved ? 'rgba(91, 111, 242, 0.15)' : 'var(--bg-secondary)',
                            color: isSaved ? 'var(--primary-400)' : 'inherit'
                        }}
                    >
                        <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                        {isSaved ? 'Saved' : 'Save'}
                    </motion.button>

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={onApply}
                        disabled={isApplied}
                        className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm flex-1 justify-center font-medium"
                        style={{
                            background: isApplied ? 'rgba(34, 197, 94, 0.15)' : 'var(--gradient-primary)',
                            color: isApplied ? 'var(--success)' : 'white'
                        }}
                    >
                        {isApplied ? (
                            <><Check className="w-4 h-4" /> Applied</>
                        ) : (
                            <><Send className="w-4 h-4" /> Apply Now</>
                        )}
                    </motion.button>

                    <a href={scholarship.applicationUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="secondary" size="sm" icon={<ExternalLink className="w-4 h-4" />}>
                            Website
                        </Button>
                    </a>
                </div>
            </Card>
        </motion.div>
    );
}
