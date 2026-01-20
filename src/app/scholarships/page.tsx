'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Button, StatusBadge, ProgressBar, Input } from '@/components/ui';
import {
    GraduationCap, DollarSign, Calendar, ExternalLink, Check, Clock,
    Filter, Search, Star, Sparkles, Globe, Bookmark, Send, AlertTriangle,
    ChevronRight, Building2, BookOpen, Award, Target, Zap, Settings, X,
    FileText, Download, Copy, Loader2, RefreshCw, Eye, Users, MapPin
} from 'lucide-react';
import { useS3Storage } from '@/lib/useS3Storage';
import { toast } from '@/lib/error-handling';
import { runDiscoveryScan } from '@/app/actions/discovery';

// ============================================
// TYPES
// ============================================

type ApplicationStatus = 'not_started' | 'docs_generated' | 'applied' | 'interview' | 'rejected' | 'offer';

interface EnhancedScholarship {
    id: string;
    name: string;
    sponsor: string;
    sponsorLogo?: string;
    amount: string;
    amountValue?: number;
    deadline: string;
    description: string;
    category: 'merit' | 'need' | 'diversity' | 'college' | 'field' | 'other';

    // Eligibility
    eligibility: {
        minGpa?: number;
        citizenship?: string[];
        majors?: string[];
        isTransferSpecific?: boolean;
        yearInSchool?: string[];
        demographics?: {
            firstGen?: boolean;
            lowIncome?: boolean;
        };
        customRequirements?: string[];
    };

    // Application
    applyUrl: string;
    sourceUrl: string;
    sourceName: string;
    requiredDocuments: string[];
    essayPrompts?: { prompt: string; wordLimit?: number }[];

    // Matching
    matchScore: number;
    matchExplanation: string[];

    // Status
    applicationStatus: ApplicationStatus;
    saved: boolean;
    hidden: boolean;

    // Generated
    generatedDocuments?: {
        essay?: string;
        cv?: string;
        personalStatement?: string;
    };
}

interface ScholarshipFilters {
    query: string;
    categories: string[];
    minAmount?: number;
    deadlineWithinDays?: number;
    forTransfer?: boolean;
    minMatchScore?: number;
}

type SortOption = 'match' | 'deadline' | 'amount' | 'newest';

// ============================================
// SAMPLE DATA
// ============================================

const sampleScholarships: EnhancedScholarship[] = [
    {
        id: 'sch-knight-hennessy',
        name: 'Knight-Hennessy Scholars',
        sponsor: 'Stanford University',
        sponsorLogo: 'https://logo.clearbit.com/stanford.edu',
        amount: 'Full Funding (Tuition + Stipend)',
        amountValue: 100000,
        deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Full funding for graduate study at Stanford for leaders worldwide.',
        category: 'merit',
        eligibility: {
            minGpa: 3.5,
            citizenship: ['any'],
            majors: ['any'],
        },
        applyUrl: 'https://knight-hennessy.stanford.edu/',
        sourceUrl: 'https://stanford.edu',
        sourceName: 'Stanford',
        requiredDocuments: ['essay', 'resume', 'lor'],
        essayPrompts: [
            { prompt: 'What matters most to you and why?', wordLimit: 750 },
            { prompt: 'Describe your leadership experience', wordLimit: 500 },
        ],
        matchScore: 88,
        matchExplanation: ['✓ GPA 3.9 exceeds minimum 3.5', '✓ Computer Science matches eligible fields', '✓ Strong leadership potential'],
        applicationStatus: 'not_started',
        saved: false,
        hidden: false,
    },
    {
        id: 'sch-fulbright',
        name: 'Fulbright Foreign Student Program',
        sponsor: 'U.S. Department of State',
        amount: 'Full Funding',
        amountValue: 80000,
        deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Prestigious scholarship for international students to study in the United States.',
        category: 'merit',
        eligibility: {
            minGpa: 3.0,
            citizenship: ['international'],
            majors: ['any'],
        },
        applyUrl: 'https://foreign.fulbrightonline.org/',
        sourceUrl: 'https://eca.state.gov/fulbright',
        sourceName: 'Fulbright',
        requiredDocuments: ['essay', 'resume', 'lor', 'transcript'],
        essayPrompts: [
            { prompt: 'Statement of Purpose', wordLimit: 800 },
        ],
        matchScore: 92,
        matchExplanation: ['✓ International student eligible', '✓ GPA exceeds minimum', '✓ STEM field highly valued'],
        applicationStatus: 'not_started',
        saved: false,
        hidden: false,
    },
    {
        id: 'sch-tata-cornell',
        name: 'Tata Scholarship at Cornell',
        sponsor: 'Tata Education and Development Trust',
        sponsorLogo: 'https://logo.clearbit.com/tata.com',
        amount: 'Full Financial Need',
        amountValue: 75000,
        deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'For students from India attending Cornell University.',
        category: 'need',
        eligibility: {
            minGpa: 3.0,
            citizenship: ['India'],
            majors: ['any'],
        },
        applyUrl: 'https://www.cornell.edu/tata-scholarship/',
        sourceUrl: 'https://cornell.edu',
        sourceName: 'Cornell',
        requiredDocuments: ['essay', 'resume', 'financial_docs'],
        matchScore: 95,
        matchExplanation: ['✓ Indian citizenship matches', '✓ GPA exceeds requirement', '✓ Computer Science eligible'],
        applicationStatus: 'not_started',
        saved: false,
        hidden: false,
    },
    {
        id: 'sch-inlaks',
        name: 'Inlaks Shivdasani Foundation Scholarship',
        sponsor: 'Inlaks Foundation',
        amount: 'Up to $100,000 (Tuition + Living)',
        amountValue: 100000,
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'For Indians pursuing graduate studies at top universities abroad.',
        category: 'merit',
        eligibility: {
            minGpa: 3.5,
            citizenship: ['India'],
            majors: ['any'],
        },
        applyUrl: 'https://www.inlaksfoundation.org/',
        sourceUrl: 'https://inlaksfoundation.org',
        sourceName: 'Inlaks',
        requiredDocuments: ['essay', 'resume', 'lor', 'transcript'],
        essayPrompts: [
            { prompt: 'Describe your academic and career goals', wordLimit: 1000 },
        ],
        matchScore: 90,
        matchExplanation: ['✓ Indian citizenship eligible', '✓ Strong academic record', '✓ Top US university target'],
        applicationStatus: 'not_started',
        saved: false,
        hidden: false,
    },
    {
        id: 'sch-aauw',
        name: 'AAUW International Fellowship',
        sponsor: 'American Association of University Women',
        amount: '$18,000 - $30,000',
        amountValue: 24000,
        deadline: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'For international women pursuing graduate degrees in the US.',
        category: 'diversity',
        eligibility: {
            citizenship: ['international'],
            demographics: {},
        },
        applyUrl: 'https://www.aauw.org/resources/programs/fellowships-grants/current-opportunities/international/',
        sourceUrl: 'https://aauw.org',
        sourceName: 'AAUW',
        requiredDocuments: ['essay', 'resume', 'lor'],
        matchScore: 0,
        matchExplanation: ['✗ For women applicants only'],
        applicationStatus: 'not_started',
        saved: false,
        hidden: true,
    },
    {
        id: 'sch-jack-kent',
        name: 'Jack Kent Cooke Transfer Scholarship',
        sponsor: 'Jack Kent Cooke Foundation',
        sponsorLogo: 'https://logo.clearbit.com/jkcf.org',
        amount: 'Up to $55,000/year',
        amountValue: 55000,
        deadline: new Date(Date.now() + 75 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'For high-achieving community college students transferring to 4-year institutions.',
        category: 'merit',
        eligibility: {
            minGpa: 3.5,
            isTransferSpecific: true,
            demographics: { lowIncome: true },
        },
        applyUrl: 'https://www.jkcf.org/our-scholarships/transfer-scholarship/',
        sourceUrl: 'https://jkcf.org',
        sourceName: 'JKCF',
        requiredDocuments: ['essay', 'resume', 'lor', 'financial_docs'],
        essayPrompts: [
            { prompt: 'Describe a challenge you have overcome', wordLimit: 650 },
            { prompt: 'What are your educational and career goals?', wordLimit: 650 },
        ],
        matchScore: 85,
        matchExplanation: ['✓ Transfer student eligible', '✓ High GPA', '✓ Substantial award amount'],
        applicationStatus: 'not_started',
        saved: false,
        hidden: false,
    },
];

// ============================================
// MAIN COMPONENT
// ============================================

export default function EnhancedScholarshipsPage() {
    const [selectedScholarship, setSelectedScholarship] = useState<EnhancedScholarship | null>(null);
    const [showFilters, setShowFilters] = useState(false);
    const [showProfileSetup, setShowProfileSetup] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [isGeneratingDocs, setIsGeneratingDocs] = useState(false);
    const [copied, setCopied] = useState<string | null>(null);

    // Filters
    const [filters, setFilters] = useState<ScholarshipFilters>({
        query: '',
        categories: [],
    });
    const [sortBy, setSortBy] = useState<SortOption>('match');

    // S3 Storage
    const { data: scholarships, setData: setScholarships, isLoading } =
        useS3Storage<EnhancedScholarship[]>('enhanced-scholarships', { defaultValue: sampleScholarships });

    const { data: savedIds, setData: setSavedIds } =
        useS3Storage<string[]>('saved-scholarship-ids', { defaultValue: [] });

    const { data: appliedIds, setData: setAppliedIds } =
        useS3Storage<string[]>('applied-scholarship-ids', { defaultValue: [] });

    const { data: userProfile } = useS3Storage<any>('user-profile', { defaultValue: null });

    const hasProfile = userProfile && userProfile.gpa > 0;

    // Scan for new scholarships
    const handleScan = async () => {
        setIsScanning(true);
        toast.info('🔍 Scanning scholarship databases...');
        try {
            const result = await runDiscoveryScan('scholarships');
            if (result.success) {
                toast.success('✅ Scan complete!');
            }
        } catch (error) {
            toast.error('Scan failed');
        } finally {
            setIsScanning(false);
        }
    };

    // Generate documents
    const handleGenerateDocuments = async (scholarship: EnhancedScholarship) => {
        setIsGeneratingDocs(true);
        toast.info(`📝 Generating documents for ${scholarship.name}...`);

        try {
            await new Promise(r => setTimeout(r, 2500));

            setScholarships(prev => prev.map(s =>
                s.id === scholarship.id
                    ? {
                        ...s,
                        applicationStatus: 'docs_generated',
                        generatedDocuments: {
                            essay: `Generated essay for ${scholarship.name}`,
                            cv: `Tailored CV for ${scholarship.sponsor}`,
                        }
                    }
                    : s
            ));

            toast.success('✅ Documents generated!');
        } catch (error) {
            toast.error('Generation failed');
        } finally {
            setIsGeneratingDocs(false);
        }
    };

    // Save/unsave
    const toggleSave = (scholarship: EnhancedScholarship) => {
        if (savedIds.includes(scholarship.id)) {
            setSavedIds(prev => prev.filter(id => id !== scholarship.id));
            toast.info('Removed from saved');
        } else {
            setSavedIds(prev => [...prev, scholarship.id]);
            toast.success('💾 Saved!');
        }
    };

    // Mark as applied
    const markAsApplied = (scholarship: EnhancedScholarship) => {
        setScholarships(prev => prev.map(s =>
            s.id === scholarship.id ? { ...s, applicationStatus: 'applied' } : s
        ));
        if (!appliedIds.includes(scholarship.id)) {
            setAppliedIds(prev => [...prev, scholarship.id]);
        }
        toast.success('🎉 Marked as applied!');
    };

    // Copy document
    const copyDocument = async (content: string, type: string) => {
        await navigator.clipboard.writeText(content);
        setCopied(type);
        toast.success('Copied!');
        setTimeout(() => setCopied(null), 2000);
    };

    // Filter and sort
    const filteredScholarships = useMemo(() => {
        let result = scholarships.filter(s => !s.hidden && s.matchScore > 0);

        // Query search
        if (filters.query) {
            const q = filters.query.toLowerCase();
            result = result.filter(s =>
                s.name.toLowerCase().includes(q) ||
                s.sponsor.toLowerCase().includes(q) ||
                s.description.toLowerCase().includes(q)
            );
        }

        // Categories
        if (filters.categories.length > 0) {
            result = result.filter(s => filters.categories.includes(s.category));
        }

        // Transfer specific
        if (filters.forTransfer) {
            result = result.filter(s => s.eligibility.isTransferSpecific);
        }

        // Min match score
        if (filters.minMatchScore) {
            result = result.filter(s => s.matchScore >= filters.minMatchScore!);
        }

        // Deadline within days
        if (filters.deadlineWithinDays) {
            const cutoff = Date.now() + filters.deadlineWithinDays * 24 * 60 * 60 * 1000;
            result = result.filter(s => new Date(s.deadline).getTime() <= cutoff);
        }

        // Sort
        switch (sortBy) {
            case 'match':
                result.sort((a, b) => b.matchScore - a.matchScore);
                break;
            case 'deadline':
                result.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
                break;
            case 'amount':
                result.sort((a, b) => (b.amountValue || 0) - (a.amountValue || 0));
                break;
            case 'newest':
                result.sort((a, b) => b.matchScore - a.matchScore);
                break;
        }

        return result;
    }, [scholarships, filters, sortBy]);

    // Stats
    const stats = useMemo(() => {
        const eligible = scholarships.filter(s => !s.hidden && s.matchScore > 0);
        return {
            total: eligible.length,
            totalValue: eligible.reduce((sum, s) => sum + (s.amountValue || 0), 0),
            urgent: eligible.filter(s => {
                const daysLeft = Math.ceil((new Date(s.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                return daysLeft <= 30 && daysLeft > 0;
            }).length,
            saved: savedIds.length,
            applied: appliedIds.length,
        };
    }, [scholarships, savedIds, appliedIds]);

    // Helpers
    const getDaysUntilDeadline = (deadline: string) => {
        return Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    };

    const getCategoryColor = (category: string) => {
        const colors: Record<string, string> = {
            merit: 'var(--primary-400)',
            need: 'var(--success)',
            diversity: 'var(--accent-purple)',
            college: 'var(--accent-teal)',
            field: 'var(--warning)',
        };
        return colors[category] || 'var(--text-muted)';
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--primary-400)' }} />
            </div>
        );
    }

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
                        {stats.total} eligible · ${(stats.totalValue / 1000).toFixed(0)}K+ total value · {stats.urgent} urgent deadlines
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="secondary"
                        onClick={() => setShowProfileSetup(true)}
                        icon={<Settings className="w-4 h-4" />}
                    >
                        {hasProfile ? 'Edit Profile' : 'Setup Profile'}
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={handleScan}
                        disabled={isScanning}
                        icon={isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    >
                        {isScanning ? 'Scanning...' : 'Scan New'}
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={() => setShowFilters(!showFilters)}
                        icon={<Filter className="w-4 h-4" />}
                    >
                        Filters
                    </Button>
                </div>
            </div>

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
                <Card className="text-center" style={{ background: 'rgba(20, 184, 166, 0.1)' }}>
                    <Check className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--accent-teal)' }} />
                    <p className="text-2xl font-bold">{stats.applied}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Applied</p>
                </Card>
            </div>

            {/* Search and Sort */}
            <div className="flex flex-wrap gap-4 items-center">
                <Input
                    placeholder="Search scholarships..."
                    value={filters.query}
                    onChange={(e) => setFilters(prev => ({ ...prev, query: e.target.value }))}
                    icon={<Search className="w-4 h-4" />}
                    className="flex-1 max-w-md"
                />
                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="px-4 py-2 rounded-lg"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                >
                    <option value="match">Sort: Match Score</option>
                    <option value="deadline">Sort: Deadline Soon</option>
                    <option value="amount">Sort: Highest Amount</option>
                </select>
            </div>

            {/* Filters Panel */}
            <AnimatePresence>
                {showFilters && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                    >
                        <Card>
                            <div className="flex flex-wrap gap-6">
                                <div>
                                    <p className="text-sm font-medium mb-2">Category</p>
                                    <div className="flex gap-2">
                                        {['merit', 'need', 'diversity', 'college', 'field'].map(cat => (
                                            <button
                                                key={cat}
                                                onClick={() => setFilters(prev => ({
                                                    ...prev,
                                                    categories: prev.categories.includes(cat)
                                                        ? prev.categories.filter(c => c !== cat)
                                                        : [...prev.categories, cat]
                                                }))}
                                                className={`px-3 py-1 rounded-lg text-sm capitalize ${filters.categories.includes(cat) ? 'ring-2' : ''
                                                    }`}
                                                style={{ background: 'var(--bg-secondary)' }}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-sm font-medium mb-2">Deadline</p>
                                    <select
                                        value={filters.deadlineWithinDays || ''}
                                        onChange={(e) => setFilters(prev => ({
                                            ...prev,
                                            deadlineWithinDays: e.target.value ? parseInt(e.target.value) : undefined
                                        }))}
                                        className="px-3 py-1 rounded-lg text-sm"
                                        style={{ background: 'var(--bg-secondary)' }}
                                    >
                                        <option value="">Any</option>
                                        <option value="30">Next 30 days</option>
                                        <option value="60">Next 60 days</option>
                                        <option value="90">Next 90 days</option>
                                    </select>
                                </div>
                                <div>
                                    <p className="text-sm font-medium mb-2">Special</p>
                                    <button
                                        onClick={() => setFilters(prev => ({
                                            ...prev,
                                            forTransfer: !prev.forTransfer
                                        }))}
                                        className={`px-3 py-1 rounded-lg text-sm ${filters.forTransfer ? 'ring-2' : ''
                                            }`}
                                        style={{ background: 'var(--bg-secondary)' }}
                                    >
                                        🔄 Transfer-specific
                                    </button>
                                </div>
                                <div>
                                    <p className="text-sm font-medium mb-2">Min Match</p>
                                    <select
                                        value={filters.minMatchScore || ''}
                                        onChange={(e) => setFilters(prev => ({
                                            ...prev,
                                            minMatchScore: e.target.value ? parseInt(e.target.value) : undefined
                                        }))}
                                        className="px-3 py-1 rounded-lg text-sm"
                                        style={{ background: 'var(--bg-secondary)' }}
                                    >
                                        <option value="">Any</option>
                                        <option value="70">70%+</option>
                                        <option value="80">80%+</option>
                                        <option value="90">90%+</option>
                                    </select>
                                </div>
                            </div>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Scholarship List */}
                <div className="lg:col-span-2 space-y-4">
                    <AnimatePresence>
                        {filteredScholarships.map((scholarship, index) => {
                            const daysLeft = getDaysUntilDeadline(scholarship.deadline);
                            const isUrgent = daysLeft <= 30 && daysLeft > 0;

                            return (
                                <motion.div
                                    key={scholarship.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ delay: index * 0.03 }}
                                >
                                    <Card
                                        className={`cursor-pointer transition-all hover:shadow-lg ${selectedScholarship?.id === scholarship.id ? 'ring-2' : ''
                                            } ${isUrgent ? 'ring-1 ring-red-500/50' : ''}`}
                                        style={{
                                            borderLeft: `4px solid ${getCategoryColor(scholarship.category)}`
                                        }}
                                        onClick={() => setSelectedScholarship(scholarship)}
                                    >
                                        <div className="flex items-start gap-4">
                                            {/* Sponsor Logo */}
                                            <div
                                                className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
                                                style={{ background: 'var(--bg-secondary)' }}
                                            >
                                                {scholarship.sponsorLogo ? (
                                                    <img
                                                        src={scholarship.sponsorLogo}
                                                        alt={scholarship.sponsor}
                                                        className="w-10 h-10 object-contain"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).style.display = 'none';
                                                        }}
                                                    />
                                                ) : (
                                                    <GraduationCap className="w-7 h-7" style={{ color: getCategoryColor(scholarship.category) }} />
                                                )}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between mb-2">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            {isUrgent && (
                                                                <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: 'rgba(239, 68, 68, 0.15)', color: 'var(--error)' }}>
                                                                    🔥 {daysLeft} days
                                                                </span>
                                                            )}
                                                            <span className="px-2 py-0.5 rounded-full text-xs font-medium capitalize" style={{ background: 'var(--bg-secondary)', color: getCategoryColor(scholarship.category) }}>
                                                                {scholarship.category}
                                                            </span>
                                                        </div>
                                                        <h3 className="font-semibold text-lg">{scholarship.name}</h3>
                                                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                                            {scholarship.sponsor}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xl font-bold" style={{ color: 'var(--success)' }}>
                                                            {scholarship.amount}
                                                        </p>
                                                        <StatusBadge status={scholarship.matchScore >= 85 ? 'success' : 'info'}>
                                                            {scholarship.matchScore}% Match
                                                        </StatusBadge>
                                                    </div>
                                                </div>

                                                {/* Meta Info */}
                                                <div className="flex flex-wrap gap-3 text-sm mb-2" style={{ color: 'var(--text-muted)' }}>
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-4 h-4" />
                                                        Due: {new Date(scholarship.deadline).toLocaleDateString()}
                                                    </span>
                                                    {scholarship.eligibility.minGpa && (
                                                        <span className="flex items-center gap-1">
                                                            📚 Min GPA: {scholarship.eligibility.minGpa}
                                                        </span>
                                                    )}
                                                    {scholarship.eligibility.isTransferSpecific && (
                                                        <span className="flex items-center gap-1 text-purple-400">
                                                            🔄 Transfer-specific
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Description */}
                                                <p className="text-sm line-clamp-2" style={{ color: 'var(--text-muted)' }}>
                                                    {scholarship.description}
                                                </p>

                                                {/* Status */}
                                                {scholarship.applicationStatus !== 'not_started' && (
                                                    <div
                                                        className="mt-2 text-xs font-medium"
                                                        style={{ color: scholarship.applicationStatus === 'docs_generated' ? 'var(--warning)' : 'var(--success)' }}
                                                    >
                                                        {scholarship.applicationStatus === 'docs_generated' && '📄 Documents ready'}
                                                        {scholarship.applicationStatus === 'applied' && '✅ Applied'}
                                                    </div>
                                                )}
                                            </div>

                                            <ChevronRight className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                                        </div>
                                    </Card>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>

                    {filteredScholarships.length === 0 && (
                        <Card className="text-center py-12">
                            <Award className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
                            <h3 className="text-xl font-semibold mb-2">No scholarships found</h3>
                            <p style={{ color: 'var(--text-muted)' }}>
                                Try adjusting your filters or set up your profile
                            </p>
                        </Card>
                    )}
                </div>

                {/* Details Panel */}
                <div className="space-y-4">
                    {selectedScholarship ? (
                        <>
                            <Card>
                                <div className="flex items-start gap-3 mb-4">
                                    <div
                                        className="w-14 h-14 rounded-xl flex items-center justify-center overflow-hidden"
                                        style={{ background: 'var(--bg-secondary)' }}
                                    >
                                        {selectedScholarship.sponsorLogo ? (
                                            <img
                                                src={selectedScholarship.sponsorLogo}
                                                alt={selectedScholarship.sponsor}
                                                className="w-10 h-10 object-contain"
                                            />
                                        ) : (
                                            <GraduationCap className="w-7 h-7" style={{ color: getCategoryColor(selectedScholarship.category) }} />
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-lg">{selectedScholarship.name}</h3>
                                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                            {selectedScholarship.sponsor}
                                        </p>
                                    </div>
                                </div>

                                {/* Match Score */}
                                <div className="mb-4">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-medium">Match Score</span>
                                        <span className="font-bold" style={{
                                            color: selectedScholarship.matchScore >= 85 ? 'var(--success)' : 'var(--primary-400)'
                                        }}>
                                            {selectedScholarship.matchScore}%
                                        </span>
                                    </div>
                                    <ProgressBar value={selectedScholarship.matchScore} />
                                </div>

                                {/* Quick Info */}
                                <div className="grid grid-cols-2 gap-3 mb-4">
                                    <div className="p-2 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Amount</p>
                                        <p className="text-sm font-medium" style={{ color: 'var(--success)' }}>
                                            {selectedScholarship.amount}
                                        </p>
                                    </div>
                                    <div className="p-2 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Deadline</p>
                                        <p className="text-sm font-medium">
                                            {new Date(selectedScholarship.deadline).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="p-2 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Category</p>
                                        <p className="text-sm font-medium capitalize">{selectedScholarship.category}</p>
                                    </div>
                                    {selectedScholarship.eligibility.minGpa && (
                                        <div className="p-2 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Min GPA</p>
                                            <p className="text-sm font-medium">{selectedScholarship.eligibility.minGpa}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Description */}
                                <div className="mb-4">
                                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                        {selectedScholarship.description}
                                    </p>
                                </div>

                                {/* Required Documents */}
                                <div className="mb-4">
                                    <p className="text-sm font-medium mb-2">Required Documents</p>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedScholarship.requiredDocuments.map(doc => (
                                            <span
                                                key={doc}
                                                className="px-2 py-1 rounded-lg text-xs capitalize"
                                                style={{ background: 'var(--bg-secondary)' }}
                                            >
                                                {doc.replace('_', ' ')}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Essay Prompts */}
                                {selectedScholarship.essayPrompts && selectedScholarship.essayPrompts.length > 0 && (
                                    <div className="mb-4">
                                        <p className="text-sm font-medium mb-2">Essay Prompts</p>
                                        <div className="space-y-2">
                                            {selectedScholarship.essayPrompts.map((prompt, i) => (
                                                <div key={i} className="p-2 rounded-lg text-sm" style={{ background: 'var(--bg-secondary)' }}>
                                                    <p>{prompt.prompt}</p>
                                                    {prompt.wordLimit && (
                                                        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                                                            Max: {prompt.wordLimit} words
                                                        </p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex flex-col gap-2">
                                    {selectedScholarship.applicationStatus === 'not_started' && (
                                        <Button
                                            onClick={() => handleGenerateDocuments(selectedScholarship)}
                                            disabled={isGeneratingDocs}
                                            icon={isGeneratingDocs
                                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                                : <Zap className="w-4 h-4" />
                                            }
                                        >
                                            {isGeneratingDocs ? 'Generating...' : 'Generate Documents'}
                                        </Button>
                                    )}

                                    {selectedScholarship.applicationStatus === 'docs_generated' && (
                                        <>
                                            <Button
                                                onClick={() => window.open(selectedScholarship.applyUrl, '_blank')}
                                                icon={<ExternalLink className="w-4 h-4" />}
                                            >
                                                Open Apply Link
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                onClick={() => markAsApplied(selectedScholarship)}
                                                icon={<Check className="w-4 h-4" />}
                                            >
                                                Mark as Applied
                                            </Button>
                                        </>
                                    )}

                                    {selectedScholarship.applicationStatus === 'applied' && (
                                        <Button variant="secondary" disabled icon={<Check className="w-4 h-4" />}>
                                            Applied ✓
                                        </Button>
                                    )}

                                    <div className="flex gap-2">
                                        <Button
                                            variant="secondary"
                                            className="flex-1"
                                            onClick={() => toggleSave(selectedScholarship)}
                                            icon={savedIds.includes(selectedScholarship.id)
                                                ? <Bookmark className="w-4 h-4 fill-current" />
                                                : <Bookmark className="w-4 h-4" />
                                            }
                                        >
                                            {savedIds.includes(selectedScholarship.id) ? 'Saved' : 'Save'}
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            onClick={() => window.open(selectedScholarship.applyUrl, '_blank')}
                                            icon={<ExternalLink className="w-4 h-4" />}
                                        >
                                            View
                                        </Button>
                                    </div>
                                </div>
                            </Card>

                            {/* Why You Match */}
                            <Card>
                                <h4 className="font-semibold mb-3">Why You Match</h4>
                                <div className="space-y-2">
                                    {selectedScholarship.matchExplanation.map((reason, i) => (
                                        <div key={i} className="flex items-start gap-2 text-sm">
                                            <span>{reason}</span>
                                        </div>
                                    ))}
                                </div>
                            </Card>

                            {/* Generated Documents */}
                            {selectedScholarship.generatedDocuments && (
                                <Card>
                                    <h4 className="font-semibold mb-3">Generated Documents</h4>
                                    <div className="space-y-2">
                                        {selectedScholarship.generatedDocuments.essay && (
                                            <div className="flex items-center justify-between p-2 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                                                <span className="text-sm flex items-center gap-2">
                                                    <FileText className="w-4 h-4" />
                                                    Scholarship Essay
                                                </span>
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={() => copyDocument(selectedScholarship.generatedDocuments!.essay!, 'essay')}
                                                        className="p-1 hover:bg-white/10 rounded"
                                                    >
                                                        {copied === 'essay' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                                    </button>
                                                    <button className="p-1 hover:bg-white/10 rounded">
                                                        <Download className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                        {selectedScholarship.generatedDocuments.cv && (
                                            <div className="flex items-center justify-between p-2 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                                                <span className="text-sm flex items-center gap-2">
                                                    <FileText className="w-4 h-4" />
                                                    Tailored CV
                                                </span>
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={() => copyDocument(selectedScholarship.generatedDocuments!.cv!, 'cv')}
                                                        className="p-1 hover:bg-white/10 rounded"
                                                    >
                                                        {copied === 'cv' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                                    </button>
                                                    <button className="p-1 hover:bg-white/10 rounded">
                                                        <Download className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </Card>
                            )}
                        </>
                    ) : (
                        <Card className="text-center py-12">
                            <Eye className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                            <p style={{ color: 'var(--text-muted)' }}>Select a scholarship to view details</p>
                        </Card>
                    )}
                </div>
            </div>

            {/* Profile Setup Modal - Would be similar to existing one */}
        </motion.div>
    );
}
