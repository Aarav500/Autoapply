'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Button, StatusBadge, Input, ProgressBar, Tag } from '@/components/ui';
import {
    FolderOpen,
    Upload,
    FileText,
    File,
    Trash2,
    Eye,
    Download,
    Plus,
    Search,
    GraduationCap,
    Briefcase,
    Award,
    BookOpen,
    Activity,
    CheckCircle2,
    X
} from 'lucide-react';

interface Document {
    id: string;
    name: string;
    type: 'resume' | 'paper' | 'transcript' | 'certificate' | 'other';
    size: string;
    uploadedAt: string;
    status: 'analyzed' | 'processing' | 'pending';
}

interface ActivityItem {
    id: string;
    name: string;
    role: string;
    organization: string;
    startDate: string;
    endDate: string;
    description: string;
    hoursPerWeek: number;
    weeksPerYear: number;
}

// Mock data
const mockDocuments: Document[] = [
    { id: '1', name: 'Resume_2026.pdf', type: 'resume', size: '245 KB', uploadedAt: '2025-12-28', status: 'analyzed' },
    { id: '2', name: 'Research_Paper_ML.pdf', type: 'paper', size: '1.2 MB', uploadedAt: '2025-12-25', status: 'analyzed' },
    { id: '3', name: 'UCR_Transcript.pdf', type: 'transcript', size: '890 KB', uploadedAt: '2025-12-20', status: 'analyzed' },
    { id: '4', name: 'AWS_Certification.pdf', type: 'certificate', size: '156 KB', uploadedAt: '2025-12-15', status: 'pending' },
];

const mockActivities: ActivityItem[] = [
    {
        id: '1',
        name: 'International Student Association',
        role: 'President',
        organization: 'UCR',
        startDate: '2025-09',
        endDate: 'Present',
        description: 'Lead a team of 15 officers to organize cultural events, workshops, and support services for 500+ international students.',
        hoursPerWeek: 10,
        weeksPerYear: 40,
    },
    {
        id: '2',
        name: 'Undergraduate Research',
        role: 'Research Assistant',
        organization: 'UCR Computer Science Department',
        startDate: '2025-06',
        endDate: 'Present',
        description: 'Conduct research on machine learning applications for healthcare diagnostics under Professor Smith.',
        hoursPerWeek: 15,
        weeksPerYear: 48,
    },
    {
        id: '3',
        name: 'Coding Bootcamp Volunteer',
        role: 'Teaching Assistant',
        organization: 'Code for Good',
        startDate: '2025-03',
        endDate: '2025-08',
        description: 'Taught Python programming fundamentals to underprivileged high school students in weekly sessions.',
        hoursPerWeek: 5,
        weeksPerYear: 20,
    },
];

type TabType = 'documents' | 'activities' | 'achievements';

export default function DocumentsPage() {
    const [activeTab, setActiveTab] = useState<TabType>('documents');
    const [documents, setDocuments] = useState<Document[]>(mockDocuments);
    const [activities, setActivities] = useState<ActivityItem[]>(mockActivities);
    const [searchQuery, setSearchQuery] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [showActivityModal, setShowActivityModal] = useState(false);
    const [newActivity, setNewActivity] = useState<Partial<ActivityItem>>({});

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.05 },
        },
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
    };

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback(() => {
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        // Handle file drop - in real implementation, would upload to S3
        const files = Array.from(e.dataTransfer.files);
        console.log('Dropped files:', files);
    }, []);

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'resume': return <Briefcase className="w-5 h-5" />;
            case 'paper': return <BookOpen className="w-5 h-5" />;
            case 'transcript': return <GraduationCap className="w-5 h-5" />;
            case 'certificate': return <Award className="w-5 h-5" />;
            default: return <File className="w-5 h-5" />;
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'resume': return 'var(--accent-teal)';
            case 'paper': return 'var(--primary-400)';
            case 'transcript': return 'var(--accent-purple)';
            case 'certificate': return 'var(--accent-gold)';
            default: return 'var(--text-muted)';
        }
    };

    const filteredDocuments = documents.filter(doc =>
        doc.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6"
        >
            {/* Header */}
            <motion.div variants={itemVariants} className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
                        Document Hub
                    </h1>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        Manage your documents, activities, and achievements for applications
                    </p>
                </div>
            </motion.div>

            {/* Stats */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(20, 184, 166, 0.15)' }}>
                        <FileText className="w-6 h-6" style={{ color: 'var(--accent-teal)' }} />
                    </div>
                    <div>
                        <p className="text-2xl font-bold">{documents.length}</p>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Documents</p>
                    </div>
                </Card>
                <Card className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(168, 85, 247, 0.15)' }}>
                        <Activity className="w-6 h-6" style={{ color: 'var(--accent-purple)' }} />
                    </div>
                    <div>
                        <p className="text-2xl font-bold">{activities.length}</p>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Activities</p>
                    </div>
                </Card>
                <Card className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(245, 158, 11, 0.15)' }}>
                        <Award className="w-6 h-6" style={{ color: 'var(--accent-gold)' }} />
                    </div>
                    <div>
                        <p className="text-2xl font-bold">5</p>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Achievements</p>
                    </div>
                </Card>
                <Card className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(34, 197, 94, 0.15)' }}>
                        <CheckCircle2 className="w-6 h-6" style={{ color: 'var(--success)' }} />
                    </div>
                    <div>
                        <p className="text-2xl font-bold">{documents.filter(d => d.status === 'analyzed').length}</p>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>AI Analyzed</p>
                    </div>
                </Card>
            </motion.div>

            {/* Tabs */}
            <motion.div variants={itemVariants} className="flex gap-2">
                {(['documents', 'activities', 'achievements'] as TabType[]).map((tab) => (
                    <Button
                        key={tab}
                        variant={activeTab === tab ? 'primary' : 'secondary'}
                        onClick={() => setActiveTab(tab)}
                        icon={tab === 'documents' ? <FolderOpen className="w-4 h-4" /> : tab === 'activities' ? <Activity className="w-4 h-4" /> : <Award className="w-4 h-4" />}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </Button>
                ))}
            </motion.div>

            {/* Documents Tab */}
            {activeTab === 'documents' && (
                <>
                    {/* Upload Area */}
                    <motion.div variants={itemVariants}>
                        <Card
                            className={`border-2 border-dashed transition-colors cursor-pointer ${isDragging ? 'border-primary-500' : ''}`}
                            style={{ borderColor: isDragging ? 'var(--primary-500)' : 'var(--glass-border)' }}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                        >
                            <div className="py-8 text-center">
                                <Upload className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
                                <h3 className="font-semibold mb-2">Drop files here or click to upload</h3>
                                <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
                                    Supports PDF, DOC, DOCX, TXT (Max 10MB)
                                </p>
                                <Button icon={<Plus className="w-4 h-4" />}>
                                    Choose Files
                                </Button>
                            </div>
                        </Card>
                    </motion.div>

                    {/* Search */}
                    <motion.div variants={itemVariants}>
                        <Input
                            placeholder="Search documents..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            icon={<Search className="w-4 h-4" />}
                            className="max-w-md"
                        />
                    </motion.div>

                    {/* Documents List */}
                    <motion.div variants={containerVariants} className="space-y-3">
                        {filteredDocuments.map((doc) => (
                            <motion.div key={doc.id} variants={itemVariants}>
                                <Card className="flex items-center gap-4">
                                    <div
                                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                                        style={{ background: `${getTypeColor(doc.type)}20` }}
                                    >
                                        <span style={{ color: getTypeColor(doc.type) }}>
                                            {getTypeIcon(doc.type)}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-medium truncate">{doc.name}</h3>
                                        <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                                            <span>{doc.size}</span>
                                            <span>•</span>
                                            <span className="capitalize">{doc.type}</span>
                                            <span>•</span>
                                            <span>{doc.uploadedAt}</span>
                                        </div>
                                    </div>
                                    <StatusBadge
                                        status={doc.status === 'analyzed' ? 'success' : doc.status === 'processing' ? 'warning' : 'neutral'}
                                    >
                                        {doc.status}
                                    </StatusBadge>
                                    <div className="flex gap-2">
                                        <Button variant="ghost" size="sm" icon={<Eye className="w-4 h-4" />} />
                                        <Button variant="ghost" size="sm" icon={<Download className="w-4 h-4" />} />
                                        <Button variant="ghost" size="sm" icon={<Trash2 className="w-4 h-4" style={{ color: 'var(--error)' }} />} />
                                    </div>
                                </Card>
                            </motion.div>
                        ))}
                    </motion.div>
                </>
            )}

            {/* Activities Tab */}
            {activeTab === 'activities' && (
                <>
                    <motion.div variants={itemVariants} className="flex justify-end">
                        <Button
                            icon={<Plus className="w-4 h-4" />}
                            onClick={() => setShowActivityModal(true)}
                        >
                            Add Activity
                        </Button>
                    </motion.div>

                    <motion.div variants={containerVariants} className="space-y-4">
                        {activities.map((activity, index) => (
                            <motion.div key={activity.id} variants={itemVariants}>
                                <Card>
                                    <div className="flex items-start gap-4">
                                        <div
                                            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                                            style={{ background: 'var(--gradient-primary)' }}
                                        >
                                            <span className="text-xl font-bold text-white">{index + 1}</span>
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-start justify-between mb-2">
                                                <div>
                                                    <h3 className="font-semibold text-lg">{activity.name}</h3>
                                                    <p className="text-sm" style={{ color: 'var(--primary-400)' }}>
                                                        {activity.role} • {activity.organization}
                                                    </p>
                                                </div>
                                                <Tag variant="primary">
                                                    {activity.startDate} - {activity.endDate}
                                                </Tag>
                                            </div>
                                            <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                                                {activity.description}
                                            </p>
                                            <div className="flex gap-4 text-sm" style={{ color: 'var(--text-muted)' }}>
                                                <span>{activity.hoursPerWeek} hrs/week</span>
                                                <span>•</span>
                                                <span>{activity.weeksPerYear} weeks/year</span>
                                                <span>•</span>
                                                <span className="font-medium" style={{ color: 'var(--accent-teal)' }}>
                                                    {activity.hoursPerWeek * activity.weeksPerYear} total hours
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <Button variant="ghost" size="sm" icon={<FileText className="w-4 h-4" />}>
                                                Edit
                                            </Button>
                                            <Button variant="ghost" size="sm" icon={<Trash2 className="w-4 h-4" style={{ color: 'var(--error)' }} />} />
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        ))}
                    </motion.div>

                    <motion.div variants={itemVariants}>
                        <Card className="text-center py-6" style={{ background: 'var(--bg-secondary)' }}>
                            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                                💡 Tip: Activities are shared with the essay AI to create personalized content
                            </p>
                        </Card>
                    </motion.div>
                </>
            )}

            {/* Achievements Tab */}
            {activeTab === 'achievements' && (
                <motion.div variants={containerVariants} className="card-grid">
                    {[
                        { title: "Dean's List", org: 'UCR', date: 'Fall 2025', icon: <GraduationCap className="w-6 h-6" /> },
                        { title: 'Best Research Poster', org: 'UCR Research Symposium', date: '2025', icon: <Award className="w-6 h-6" /> },
                        { title: 'AWS Cloud Practitioner', org: 'Amazon Web Services', date: '2025', icon: <Award className="w-6 h-6" /> },
                        { title: 'Hackathon Winner', org: 'CalHacks', date: '2025', icon: <Award className="w-6 h-6" /> },
                        { title: 'Community Service Award', org: 'Volunteer UCR', date: '2025', icon: <Award className="w-6 h-6" /> },
                    ].map((achievement, index) => (
                        <motion.div key={index} variants={itemVariants}>
                            <Card>
                                <div className="flex items-center gap-4 mb-4">
                                    <div
                                        className="w-14 h-14 rounded-2xl flex items-center justify-center"
                                        style={{ background: 'var(--gradient-warm)' }}
                                    >
                                        <span className="text-white">{achievement.icon}</span>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">{achievement.title}</h3>
                                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{achievement.org}</p>
                                    </div>
                                </div>
                                <Tag variant="primary">{achievement.date}</Tag>
                            </Card>
                        </motion.div>
                    ))}

                    <motion.div variants={itemVariants}>
                        <Card
                            className="flex items-center justify-center h-full min-h-[150px] border-2 border-dashed cursor-pointer"
                            style={{ borderColor: 'var(--glass-border)' }}
                        >
                            <div className="text-center">
                                <Plus className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                                <p style={{ color: 'var(--text-muted)' }}>Add Achievement</p>
                            </div>
                        </Card>
                    </motion.div>
                </motion.div>
            )}

            {/* Activity Modal */}
            <AnimatePresence>
                {showActivityModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="modal-overlay"
                        onClick={() => setShowActivityModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            className="modal-content glass-card p-6 w-full max-w-lg"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
                                    Add New Activity
                                </h2>
                                <Button variant="ghost" size="sm" onClick={() => setShowActivityModal(false)}>
                                    <X className="w-5 h-5" />
                                </Button>
                            </div>
                            <div className="space-y-4">
                                <Input placeholder="Activity Name" />
                                <div className="grid grid-cols-2 gap-4">
                                    <Input placeholder="Your Role" />
                                    <Input placeholder="Organization" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <Input placeholder="Start Date" type="month" />
                                    <Input placeholder="End Date" type="month" />
                                </div>
                                <textarea
                                    className="input-field w-full"
                                    rows={4}
                                    placeholder="Describe your involvement and achievements..."
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <Input placeholder="Hours per week" type="number" />
                                    <Input placeholder="Weeks per year" type="number" />
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <Button className="flex-1">Save Activity</Button>
                                    <Button variant="secondary" onClick={() => setShowActivityModal(false)}>
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
