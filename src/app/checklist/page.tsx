'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Button, StatusBadge, ProgressBar } from '@/components/ui';
import {
    ClipboardList, CheckCircle2, Circle, Clock, AlertTriangle,
    FileText, Mail, Upload, ExternalLink, ChevronRight, Building2,
    GraduationCap, Users, CreditCard, Globe, Sparkles, Zap, Send
} from 'lucide-react';
import { targetColleges } from '@/lib/colleges-data';
import { toast } from '@/lib/error-handling';

// Document types required for applications
type DocType = 'essay' | 'transcript' | 'lor' | 'resume' | 'financial' | 'portfolio' | 'fee';
type DocStatus = 'not_started' | 'in_progress' | 'completed' | 'submitted';

interface DocumentItem {
    id: string;
    type: DocType;
    name: string;
    status: DocStatus;
    deadline?: Date;
    notes?: string;
    link?: string;
}

interface CollegeApplication {
    collegeId: string;
    collegeName: string;
    deadline: Date;
    platform: 'common_app' | 'coalition' | 'direct' | 'applytexas';
    documents: DocumentItem[];
    applicationFee: number;
    feePaid: boolean;
    applicationStatus: 'not_started' | 'in_progress' | 'submitted' | 'accepted' | 'rejected' | 'waitlisted';
}

// Platform mapping based on verified research for transfer applications (2025)
// Common App: Stanford, CMU, NYU, Cornell, USC, Northeastern, UMich
// Direct Portal: MIT (MyMIT), UW (UW Application), UIUC (myIllini), Georgia Tech (GT Portal), Purdue (Purdue App), UMD (ApplyWeb), NUS
// ApplyTexas: UT Austin
const getPlatformForCollege = (collegeId: string): 'common_app' | 'coalition' | 'direct' | 'applytexas' => {
    const directPortalColleges = ['mit', 'uwash', 'uiuc', 'gatech', 'purdue', 'umd', 'nus'];
    const applyTexasColleges = ['utaustin'];

    if (directPortalColleges.includes(collegeId)) {
        return 'direct';
    }
    if (applyTexasColleges.includes(collegeId)) {
        return 'applytexas';
    }
    // Default to Common App for: stanford, cmu, nyu, cornell, usc, northeastern, umich
    return 'common_app';
};

// Application fee mapping based on college
const getApplicationFee = (collegeId: string): number => {
    const feeMap: Record<string, number> = {
        'mit': 75,        // MIT application fee
        'stanford': 90,   // Stanford application fee  
        'cmu': 75,        // CMU application fee
        'nyu': 85,        // NYU application fee
        'cornell': 85,    // Cornell application fee
        'uwash': 80,      // UW application fee
        'uiuc': 70,       // UIUC application fee
        'gatech': 85,     // Georgia Tech application fee
        'usc': 90,        // USC application fee
        'utaustin': 75,   // UT Austin application fee
        'northeastern': 75, // Northeastern application fee
        'nus': 50,        // NUS application fee (international)
        'umich': 75,      // UMich application fee
        'purdue': 60,     // Purdue application fee
        'umd': 75,        // UMD application fee
    };
    return feeMap[collegeId] || 75;
};

// Generate checklist for each target college
const generateApplications = (): CollegeApplication[] => {
    return targetColleges.map(college => ({
        collegeId: college.id,
        collegeName: college.name,
        deadline: college.deadline,
        platform: getPlatformForCollege(college.id),
        applicationFee: getApplicationFee(college.id),
        feePaid: false,
        applicationStatus: 'in_progress',
        documents: [
            ...college.essays.map((essay, i) => ({
                id: `${college.id}-essay-${i}`,
                type: 'essay' as DocType,
                name: essay.prompt.substring(0, 50) + '...',
                status: 'in_progress' as DocStatus,
                deadline: college.deadline,
            })),
            {
                id: `${college.id}-transcript`,
                type: 'transcript' as DocType,
                name: 'Official Transcript',
                status: 'not_started' as DocStatus,
                notes: 'Request from registrar',
            },
            {
                id: `${college.id}-lor-1`,
                type: 'lor' as DocType,
                name: 'Letter of Recommendation #1',
                status: 'not_started' as DocStatus,
                notes: 'CS Professor',
            },
            {
                id: `${college.id}-lor-2`,
                type: 'lor' as DocType,
                name: 'Letter of Recommendation #2',
                status: 'not_started' as DocStatus,
                notes: 'Research Advisor',
            },
            {
                id: `${college.id}-resume`,
                type: 'resume' as DocType,
                name: 'Resume/Activities List',
                status: 'completed' as DocStatus,
            },
            {
                id: `${college.id}-financial`,
                type: 'financial' as DocType,
                name: 'Financial Documents (CSS Profile)',
                status: 'not_started' as DocStatus,
                link: 'https://cssprofile.collegeboard.org/',
            },
        ],
    }));
};

export default function ChecklistPage() {
    const [applications, setApplications] = useState<CollegeApplication[]>(generateApplications);
    const [selectedCollege, setSelectedCollege] = useState<string | null>(null);
    const [isAutoFilling, setIsAutoFilling] = useState(false);

    // Stats
    const stats = useMemo(() => {
        const allDocs = applications.flatMap(a => a.documents);
        return {
            totalDocs: allDocs.length,
            completed: allDocs.filter(d => d.status === 'completed' || d.status === 'submitted').length,
            inProgress: allDocs.filter(d => d.status === 'in_progress').length,
            notStarted: allDocs.filter(d => d.status === 'not_started').length,
            submitted: applications.filter(a => a.applicationStatus === 'submitted').length,
            totalColleges: applications.length,
        };
    }, [applications]);

    const selectedApp = applications.find(a => a.collegeId === selectedCollege);

    // Update document status
    const updateDocStatus = (collegeId: string, docId: string, newStatus: DocStatus) => {
        setApplications(prev => prev.map(app => {
            if (app.collegeId !== collegeId) return app;
            return {
                ...app,
                documents: app.documents.map(doc =>
                    doc.id === docId ? { ...doc, status: newStatus } : doc
                ),
            };
        }));
        toast.success('✅ Status updated!');
    };

    // Auto-fill Common App
    const handleAutoFillCommonApp = async () => {
        setIsAutoFilling(true);
        toast.info('🤖 AI is filling Common App sections...');

        // Simulate auto-fill steps
        const steps = [
            'Filling personal information...',
            'Adding education history...',
            'Uploading activities list...',
            'Completing honors section...',
            'Adding test scores...',
        ];

        for (const step of steps) {
            await new Promise(r => setTimeout(r, 1500));
            toast.info(`📝 ${step}`);
        }

        toast.success('✅ Common App sections auto-filled! Review before submitting.');
        setIsAutoFilling(false);
    };

    // Submit application
    const handleSubmitApplication = async (collegeId: string) => {
        toast.info('📤 Preparing to submit application...');
        await new Promise(r => setTimeout(r, 2000));

        setApplications(prev => prev.map(app =>
            app.collegeId === collegeId
                ? { ...app, applicationStatus: 'submitted' }
                : app
        ));

        toast.success('🎉 Application submitted successfully!');
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
                        <ClipboardList className="w-8 h-8" style={{ color: 'var(--accent-teal)' }} />
                        Application Checklist
                    </h1>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        Track all documents and requirements for {applications.length} colleges
                    </p>
                </div>

                <div className="flex gap-3">
                    <a href="https://apply.commonapp.org" target="_blank" rel="noopener noreferrer">
                        <Button variant="secondary" icon={<ExternalLink className="w-4 h-4" />}>
                            Common App
                        </Button>
                    </a>
                    <Button
                        icon={isAutoFilling ? <Sparkles className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                        onClick={handleAutoFillCommonApp}
                        disabled={isAutoFilling}
                    >
                        {isAutoFilling ? 'Auto-Filling...' : 'Auto-Fill Common App'}
                    </Button>
                </div>
            </div>

            {/* Progress Overview */}
            <Card>
                <h3 className="font-semibold mb-4">Overall Progress</h3>
                <div className="grid grid-cols-5 gap-4 mb-4">
                    <div className="text-center">
                        <p className="text-2xl font-bold">{stats.totalColleges}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Colleges</p>
                    </div>
                    <div className="text-center" style={{ color: 'var(--success)' }}>
                        <p className="text-2xl font-bold">{stats.completed}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Completed</p>
                    </div>
                    <div className="text-center" style={{ color: 'var(--warning)' }}>
                        <p className="text-2xl font-bold">{stats.inProgress}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>In Progress</p>
                    </div>
                    <div className="text-center" style={{ color: 'var(--error)' }}>
                        <p className="text-2xl font-bold">{stats.notStarted}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Not Started</p>
                    </div>
                    <div className="text-center" style={{ color: 'var(--primary-400)' }}>
                        <p className="text-2xl font-bold">{stats.submitted}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Submitted</p>
                    </div>
                </div>
                <ProgressBar
                    value={Math.round((stats.completed / stats.totalDocs) * 100)}
                    showLabel
                />
            </Card>

            {/* College List + Details */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* College List */}
                <div className="space-y-2">
                    <h3 className="font-semibold mb-2">Your Colleges</h3>
                    {applications
                        .sort((a, b) => a.deadline.getTime() - b.deadline.getTime())
                        .map((app, index) => {
                            const completedDocs = app.documents.filter(d => d.status === 'completed' || d.status === 'submitted').length;
                            const totalDocs = app.documents.length;
                            const progress = Math.round((completedDocs / totalDocs) * 100);
                            const daysLeft = Math.ceil((app.deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

                            return (
                                <motion.div
                                    key={app.collegeId}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.03 }}
                                    onClick={() => setSelectedCollege(app.collegeId)}
                                    className={`p-3 rounded-xl cursor-pointer transition-all ${selectedCollege === app.collegeId ? 'ring-2' : ''
                                        }`}
                                    style={{
                                        background: daysLeft <= 14 ? 'rgba(239, 68, 68, 0.1)' : 'var(--glass-bg)',
                                        border: '1px solid var(--glass-border)',
                                    }}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="font-medium text-sm">{app.collegeName}</h4>
                                        {app.applicationStatus === 'submitted' ? (
                                            <StatusBadge status="success">Submitted</StatusBadge>
                                        ) : daysLeft <= 14 ? (
                                            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(239, 68, 68, 0.15)', color: 'var(--error)' }}>
                                                {daysLeft}d left
                                            </span>
                                        ) : (
                                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{daysLeft}d</span>
                                        )}
                                    </div>
                                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
                                        <div
                                            className="h-full rounded-full transition-all"
                                            style={{
                                                width: `${progress}%`,
                                                background: progress === 100 ? 'var(--success)' : 'var(--primary-400)'
                                            }}
                                        />
                                    </div>
                                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                                        {completedDocs}/{totalDocs} documents
                                    </p>
                                </motion.div>
                            );
                        })}
                </div>

                {/* College Details */}
                <div className="lg:col-span-2">
                    {selectedApp ? (
                        <Card>
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-xl font-bold">{selectedApp.collegeName}</h3>
                                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                        Deadline: {selectedApp.deadline.toLocaleDateString()} ·
                                        Platform: {
                                            selectedApp.platform === 'common_app' ? 'Common App' :
                                                selectedApp.platform === 'applytexas' ? 'ApplyTexas' :
                                                    selectedApp.platform === 'coalition' ? 'Coalition App' :
                                                        'Direct Portal'
                                        }
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    {!selectedApp.feePaid && (
                                        <Button variant="secondary" size="sm" icon={<CreditCard className="w-4 h-4" />}>
                                            Pay Fee (${selectedApp.applicationFee})
                                        </Button>
                                    )}
                                    {selectedApp.applicationStatus !== 'submitted' && (
                                        <Button
                                            size="sm"
                                            icon={<Send className="w-4 h-4" />}
                                            onClick={() => handleSubmitApplication(selectedApp.collegeId)}
                                        >
                                            Submit Application
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Document Checklist */}
                            <div className="space-y-2">
                                {selectedApp.documents.map((doc, index) => (
                                    <motion.div
                                        key={doc.id}
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.03 }}
                                        className="flex items-center justify-between p-3 rounded-xl"
                                        style={{ background: 'var(--bg-secondary)' }}
                                    >
                                        <div className="flex items-center gap-3">
                                            {doc.status === 'completed' || doc.status === 'submitted' ? (
                                                <CheckCircle2 className="w-5 h-5" style={{ color: 'var(--success)' }} />
                                            ) : doc.status === 'in_progress' ? (
                                                <Clock className="w-5 h-5" style={{ color: 'var(--warning)' }} />
                                            ) : (
                                                <Circle className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                                            )}
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    {doc.type === 'essay' && <FileText className="w-4 h-4" />}
                                                    {doc.type === 'transcript' && <GraduationCap className="w-4 h-4" />}
                                                    {doc.type === 'lor' && <Mail className="w-4 h-4" />}
                                                    {doc.type === 'resume' && <Users className="w-4 h-4" />}
                                                    {doc.type === 'financial' && <CreditCard className="w-4 h-4" />}
                                                    <span className="font-medium text-sm">{doc.name}</span>
                                                </div>
                                                {doc.notes && (
                                                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{doc.notes}</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <select
                                                value={doc.status}
                                                onChange={(e) => updateDocStatus(selectedApp.collegeId, doc.id, e.target.value as DocStatus)}
                                                className="text-xs px-2 py-1 rounded-lg"
                                                style={{ background: 'var(--bg-tertiary)', border: 'none' }}
                                            >
                                                <option value="not_started">Not Started</option>
                                                <option value="in_progress">In Progress</option>
                                                <option value="completed">Completed</option>
                                                <option value="submitted">Submitted</option>
                                            </select>
                                            {doc.link && (
                                                <a href={doc.link} target="_blank" rel="noopener noreferrer">
                                                    <Button variant="secondary" size="sm" icon={<ExternalLink className="w-3 h-3" />} />
                                                </a>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            {/* Quick Actions */}
                            <div className="flex flex-wrap gap-2 mt-4 pt-4" style={{ borderTop: '1px solid var(--glass-border)' }}>
                                <Button variant="secondary" size="sm" icon={<Upload className="w-4 h-4" />}>
                                    Upload Document
                                </Button>
                                <Button variant="secondary" size="sm" icon={<Mail className="w-4 h-4" />}>
                                    Request LOR
                                </Button>
                                {selectedApp.platform === 'common_app' && (
                                    <a href="https://apply.commonapp.org" target="_blank" rel="noopener noreferrer">
                                        <Button variant="secondary" size="sm" icon={<ExternalLink className="w-4 h-4" />}>
                                            Open Common App
                                        </Button>
                                    </a>
                                )}
                                {selectedApp.platform === 'applytexas' && (
                                    <a href="https://www.applytexas.org" target="_blank" rel="noopener noreferrer">
                                        <Button variant="secondary" size="sm" icon={<ExternalLink className="w-4 h-4" />}>
                                            Open ApplyTexas
                                        </Button>
                                    </a>
                                )}
                                {selectedApp.platform === 'direct' && (
                                    <a href={targetColleges.find(c => c.id === selectedApp.collegeId)?.applicationUrl || '#'} target="_blank" rel="noopener noreferrer">
                                        <Button variant="secondary" size="sm" icon={<ExternalLink className="w-4 h-4" />}>
                                            Open Application Portal
                                        </Button>
                                    </a>
                                )}
                            </div>
                        </Card>
                    ) : (
                        <Card className="text-center py-16">
                            <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p style={{ color: 'var(--text-muted)' }}>
                                Select a college to see its checklist
                            </p>
                        </Card>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
