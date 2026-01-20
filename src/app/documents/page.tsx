'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Button } from '@/components/ui';
import {
    FileText, File, Download, ExternalLink, Copy, Check, Loader2,
    Briefcase, GraduationCap, Building, Filter, Search, Star,
    ChevronDown, ChevronUp, RefreshCw, Trash2, Eye, FileCheck, Sparkles
} from 'lucide-react';
import Link from 'next/link';
import { toast } from '@/lib/error-handling';
import { runDiscoveryScan } from '@/app/actions/discovery';

interface StoredDocument {
    id: string;
    opportunityId: string;
    opportunityTitle: string;
    organization: string;
    type: 'cv' | 'essay' | 'cover_letter';
    content: string;
    createdAt: string;
    opportunityType: 'job' | 'scholarship';
    opportunityUrl: string;
    matchScore: number;
}

interface OpportunityDocuments {
    opportunity: {
        id: string;
        type: 'job' | 'scholarship';
        title: string;
        organization: string;
        url: string;
        matchScore: number;
    };
    cv: StoredDocument | null;
    essay: StoredDocument | null;
    coverLetter: StoredDocument | null;
    generatedAt: string;
}

interface DocumentStats {
    totalOpportunities: number;
    totalCVs: number;
    totalEssays: number;
    totalCoverLetters: number;
    jobDocuments: number;
    scholarshipDocuments: number;
}

export default function DocumentsPage() {
    const [documents, setDocuments] = useState<OpportunityDocuments[]>([]);
    const [stats, setStats] = useState<DocumentStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'jobs' | 'scholarships'>('all');
    const [search, setSearch] = useState('');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [viewingDoc, setViewingDoc] = useState<StoredDocument | null>(null);
    const [copied, setCopied] = useState<string | null>(null);
    const [isScanning, setIsScanning] = useState(false);

    const fetchDocuments = useCallback(async () => {
        try {
            const res = await fetch('/api/automation/documents');
            const data = await res.json();
            if (data.success) {
                setDocuments(data.documents || []);
                setStats(data.stats);
            }
        } catch (err) {
            console.error('Failed to fetch documents:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDocuments();
        const interval = setInterval(fetchDocuments, 5000);
        return () => clearInterval(interval);
    }, [fetchDocuments]);

    const copyToClipboard = async (content: string, docId: string) => {
        await navigator.clipboard.writeText(content);
        setCopied(docId);
        toast.success('Copied to clipboard!');
        setTimeout(() => setCopied(null), 2000);
    };

    const downloadDocument = (doc: StoredDocument) => {
        const blob = new Blob([doc.content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${doc.opportunityTitle.replace(/[^a-z0-9]/gi, '_')}_${doc.type}.md`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Downloaded!');
    };

    const downloadAll = async () => {
        window.open('/api/automation/documents?format=json', '_blank');
        toast.success('Downloading all documents...');
    };

    const handleScan = async () => {
        setIsScanning(true);
        toast.info('🔍 Scanning 10 platforms for opportunities...');
        try {
            const result = await runDiscoveryScan('all');
            if (result.success) {
                toast.success('✅ Scan complete! Generating documents...');
                // Wait a bit then refresh to get new docs
                setTimeout(() => fetchDocuments(), 2000);
            } else {
                toast.error(`Scan failed: ${result.error}`);
            }
        } catch (error) {
            toast.error('Scan failed');
        } finally {
            setIsScanning(false);
        }
    };

    const filteredDocs = documents.filter(d => {
        const matchesFilter =
            filter === 'all' ||
            (filter === 'jobs' && d.opportunity.type === 'job') ||
            (filter === 'scholarships' && d.opportunity.type === 'scholarship');

        const matchesSearch = search === '' ||
            d.opportunity.title.toLowerCase().includes(search.toLowerCase()) ||
            d.opportunity.organization.toLowerCase().includes(search.toLowerCase());

        return matchesFilter && matchesSearch;
    });

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
                <Loader2 className="w-16 h-16 animate-spin text-purple-400" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-bold text-white flex items-center gap-3">
                            <FileCheck className="w-10 h-10 text-green-400" />
                            Generated Documents
                        </h1>
                        <p className="text-purple-300 text-lg">
                            CVs, Cover Letters & Essays tailored for each opportunity
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <Button
                            onClick={handleScan}
                            disabled={isScanning}
                            icon={isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        >
                            {isScanning ? 'Scanning...' : 'Scan for Opportunities'}
                        </Button>
                        <Button onClick={fetchDocuments} variant="secondary" icon={<RefreshCw className="w-4 h-4" />}>
                            Refresh
                        </Button>
                        <Button onClick={downloadAll} variant="secondary" icon={<Download className="w-4 h-4" />}>
                            Export All
                        </Button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                    <Card className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 border-blue-500/30 p-4">
                        <div className="text-center">
                            <div className="text-3xl font-bold text-blue-400">{stats?.totalOpportunities || 0}</div>
                            <div className="text-blue-200 text-sm">Total</div>
                        </div>
                    </Card>
                    <Card className="bg-gradient-to-br from-green-600/20 to-green-800/20 border-green-500/30 p-4">
                        <div className="text-center">
                            <FileText className="w-5 h-5 mx-auto text-green-400 mb-1" />
                            <div className="text-2xl font-bold text-green-400">{stats?.totalCVs || 0}</div>
                            <div className="text-green-200 text-sm">CVs</div>
                        </div>
                    </Card>
                    <Card className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 border-purple-500/30 p-4">
                        <div className="text-center">
                            <File className="w-5 h-5 mx-auto text-purple-400 mb-1" />
                            <div className="text-2xl font-bold text-purple-400">{stats?.totalCoverLetters || 0}</div>
                            <div className="text-purple-200 text-sm">Cover Letters</div>
                        </div>
                    </Card>
                    <Card className="bg-gradient-to-br from-yellow-600/20 to-yellow-800/20 border-yellow-500/30 p-4">
                        <div className="text-center">
                            <GraduationCap className="w-5 h-5 mx-auto text-yellow-400 mb-1" />
                            <div className="text-2xl font-bold text-yellow-400">{stats?.totalEssays || 0}</div>
                            <div className="text-yellow-200 text-sm">Essays</div>
                        </div>
                    </Card>
                    <Card className="bg-gradient-to-br from-indigo-600/20 to-indigo-800/20 border-indigo-500/30 p-4">
                        <div className="text-center">
                            <Briefcase className="w-5 h-5 mx-auto text-indigo-400 mb-1" />
                            <div className="text-2xl font-bold text-indigo-400">{stats?.jobDocuments || 0}</div>
                            <div className="text-indigo-200 text-sm">Jobs</div>
                        </div>
                    </Card>
                    <Card className="bg-gradient-to-br from-emerald-600/20 to-emerald-800/20 border-emerald-500/30 p-4">
                        <div className="text-center">
                            <GraduationCap className="w-5 h-5 mx-auto text-emerald-400 mb-1" />
                            <div className="text-2xl font-bold text-emerald-400">{stats?.scholarshipDocuments || 0}</div>
                            <div className="text-emerald-200 text-sm">Scholarships</div>
                        </div>
                    </Card>
                </div>

                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex gap-2 bg-slate-800/50 p-1 rounded-xl">
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-4 py-2 rounded-lg font-medium transition-all ${filter === 'all' ? 'bg-purple-500 text-white' : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setFilter('jobs')}
                            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${filter === 'jobs' ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            <Briefcase className="w-4 h-4" />
                            Jobs
                        </button>
                        <button
                            onClick={() => setFilter('scholarships')}
                            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${filter === 'scholarships' ? 'bg-green-500 text-white' : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            <GraduationCap className="w-4 h-4" />
                            Scholarships
                        </button>
                    </div>

                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by title or organization..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-gray-400 focus:border-purple-500 outline-none"
                        />
                    </div>
                </div>

                {/* Empty State */}
                {filteredDocs.length === 0 && (
                    <Card className="text-center py-16">
                        <FileText className="w-16 h-16 mx-auto text-gray-500 mb-4" />
                        <h3 className="text-2xl font-bold text-white mb-2">No Documents Generated Yet</h3>
                        <p className="text-gray-400 mb-6">
                            The automation system will generate CVs, essays, and cover letters for each discovered opportunity.
                        </p>
                        <Link href="/automation">
                            <Button>Go to Automation Dashboard</Button>
                        </Link>
                    </Card>
                )}

                {/* Documents List */}
                <div className="space-y-4">
                    <AnimatePresence>
                        {filteredDocs.map((docSet, index) => (
                            <motion.div
                                key={docSet.opportunity.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <Card className={`hover:border-purple-500/50 transition-all ${docSet.opportunity.type === 'scholarship' ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-blue-500'
                                    }`}>
                                    {/* Header */}
                                    <div
                                        className="flex items-center justify-between cursor-pointer"
                                        onClick={() => setExpandedId(expandedId === docSet.opportunity.id ? null : docSet.opportunity.id)}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`p-3 rounded-xl ${docSet.opportunity.type === 'scholarship' ? 'bg-green-500/20' : 'bg-blue-500/20'
                                                }`}>
                                                {docSet.opportunity.type === 'scholarship'
                                                    ? <GraduationCap className="w-6 h-6 text-green-400" />
                                                    : <Briefcase className="w-6 h-6 text-blue-400" />
                                                }
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-white">{docSet.opportunity.title}</h3>
                                                <p className="text-gray-400 flex items-center gap-2">
                                                    <Building className="w-4 h-4" />
                                                    {docSet.opportunity.organization}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-2">
                                                <Star className="w-4 h-4 text-yellow-400" />
                                                <span className="text-xl font-bold text-white">{docSet.opportunity.matchScore}%</span>
                                            </div>
                                            <div className="flex gap-2">
                                                {docSet.cv && <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">CV</span>}
                                                {docSet.coverLetter && <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full">Cover</span>}
                                                {docSet.essay && <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">Essay</span>}
                                            </div>
                                            {expandedId === docSet.opportunity.id
                                                ? <ChevronUp className="w-5 h-5 text-gray-400" />
                                                : <ChevronDown className="w-5 h-5 text-gray-400" />
                                            }
                                        </div>
                                    </div>

                                    {/* Expanded Content */}
                                    <AnimatePresence>
                                        {expandedId === docSet.opportunity.id && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="mt-4 pt-4 border-t border-slate-700"
                                            >
                                                <div className="grid md:grid-cols-3 gap-4">
                                                    {/* CV */}
                                                    {docSet.cv && (
                                                        <div className="bg-slate-800/50 rounded-xl p-4">
                                                            <div className="flex items-center justify-between mb-3">
                                                                <h4 className="font-bold text-green-400 flex items-center gap-2">
                                                                    <FileText className="w-4 h-4" />
                                                                    Tailored CV
                                                                </h4>
                                                                <div className="flex gap-1">
                                                                    <button
                                                                        onClick={() => copyToClipboard(docSet.cv!.content, docSet.cv!.id)}
                                                                        className="p-1 hover:bg-slate-700 rounded"
                                                                        title="Copy"
                                                                    >
                                                                        {copied === docSet.cv.id ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
                                                                    </button>
                                                                    <button
                                                                        onClick={() => downloadDocument(docSet.cv!)}
                                                                        className="p-1 hover:bg-slate-700 rounded"
                                                                        title="Download"
                                                                    >
                                                                        <Download className="w-4 h-4 text-gray-400" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            <pre className="text-xs text-gray-300 whitespace-pre-wrap max-h-48 overflow-y-auto">
                                                                {docSet.cv.content.slice(0, 500)}...
                                                            </pre>
                                                        </div>
                                                    )}

                                                    {/* Cover Letter */}
                                                    {docSet.coverLetter && (
                                                        <div className="bg-slate-800/50 rounded-xl p-4">
                                                            <div className="flex items-center justify-between mb-3">
                                                                <h4 className="font-bold text-purple-400 flex items-center gap-2">
                                                                    <File className="w-4 h-4" />
                                                                    Cover Letter
                                                                </h4>
                                                                <div className="flex gap-1">
                                                                    <button
                                                                        onClick={() => copyToClipboard(docSet.coverLetter!.content, docSet.coverLetter!.id)}
                                                                        className="p-1 hover:bg-slate-700 rounded"
                                                                        title="Copy"
                                                                    >
                                                                        {copied === docSet.coverLetter.id ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
                                                                    </button>
                                                                    <button
                                                                        onClick={() => downloadDocument(docSet.coverLetter!)}
                                                                        className="p-1 hover:bg-slate-700 rounded"
                                                                        title="Download"
                                                                    >
                                                                        <Download className="w-4 h-4 text-gray-400" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            <pre className="text-xs text-gray-300 whitespace-pre-wrap max-h-48 overflow-y-auto">
                                                                {docSet.coverLetter.content.slice(0, 500)}...
                                                            </pre>
                                                        </div>
                                                    )}

                                                    {/* Essay */}
                                                    {docSet.essay && (
                                                        <div className="bg-slate-800/50 rounded-xl p-4">
                                                            <div className="flex items-center justify-between mb-3">
                                                                <h4 className="font-bold text-yellow-400 flex items-center gap-2">
                                                                    <GraduationCap className="w-4 h-4" />
                                                                    Essay
                                                                </h4>
                                                                <div className="flex gap-1">
                                                                    <button
                                                                        onClick={() => copyToClipboard(docSet.essay!.content, docSet.essay!.id)}
                                                                        className="p-1 hover:bg-slate-700 rounded"
                                                                        title="Copy"
                                                                    >
                                                                        {copied === docSet.essay.id ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
                                                                    </button>
                                                                    <button
                                                                        onClick={() => downloadDocument(docSet.essay!)}
                                                                        className="p-1 hover:bg-slate-700 rounded"
                                                                        title="Download"
                                                                    >
                                                                        <Download className="w-4 h-4 text-gray-400" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            <pre className="text-xs text-gray-300 whitespace-pre-wrap max-h-48 overflow-y-auto">
                                                                {docSet.essay.content.slice(0, 500)}...
                                                            </pre>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Action Buttons */}
                                                <div className="flex gap-3 mt-4">
                                                    <a
                                                        href={docSet.opportunity.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all"
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                        Apply Now
                                                    </a>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </Card>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="text-center text-gray-500 text-sm pt-8">
                    <p>Documents auto-generated for each discovered opportunity</p>
                    <p>Copy or download to use when applying manually</p>
                </div>
            </div>
        </div>
    );
}
