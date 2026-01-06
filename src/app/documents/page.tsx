'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Button, StatusBadge, Input, Tag } from '@/components/ui';
import { useS3Storage } from '@/lib/useS3Storage';
import { toast } from '@/lib/error-handling';
import { getAIConfig, extractFromDocument, ExtractedActivity, ExtractedAchievement } from '@/lib/ai-providers';
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
    X,
    Loader2,
    Save,
    RefreshCw,
    AlertCircle,
    Sparkles,
    Brain,
    Link,
    ExternalLink,
    Target
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

interface Achievement {
    id: string;
    title: string;
    org: string;
    date: string;
}

interface UserProfile {
    gpa: string;
    major: string;
    targetMajor: string;
    values: string[];
    interests: string[];
    goals: string;
}

type TabType = 'documents' | 'activities' | 'achievements' | 'profile';

const emptyActivity: Partial<ActivityItem> = {
    name: '',
    role: '',
    organization: '',
    startDate: '',
    endDate: '',
    description: '',
    hoursPerWeek: 0,
    weeksPerYear: 0,
};

export default function DocumentsPage() {
    const [activeTab, setActiveTab] = useState<TabType>('documents');
    const [searchQuery, setSearchQuery] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [showActivityModal, setShowActivityModal] = useState(false);
    const [editingActivity, setEditingActivity] = useState<ActivityItem | null>(null);
    const [newActivity, setNewActivity] = useState<Partial<ActivityItem>>(emptyActivity);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // S3 Storage hooks for persistent data
    const {
        data: documents,
        setData: setDocuments,
        isLoading: docsLoading,
        isSaving: docsSaving,
        lastSaved: docsLastSaved,
    } = useS3Storage<Document[]>('documents', { defaultValue: [] });

    const {
        data: activities,
        setData: setActivities,
        isLoading: activitiesLoading,
        isSaving: activitiesSaving,
        lastSaved: activitiesLastSaved,
        save: saveActivities,
    } = useS3Storage<ActivityItem[]>('activities', { defaultValue: [] });

    const {
        data: achievements,
        setData: setAchievements,
        isLoading: achievementsLoading,
        isSaving: achievementsSaving,
    } = useS3Storage<Achievement[]>('achievements', { defaultValue: [] });

    // Research and Application Links
    interface LinksData {
        researchPaperUrl: string;
        applicationUrl: string;
        portfolioUrl: string;
        otherLinks: string[];
    }
    const defaultLinks: LinksData = {
        researchPaperUrl: '',
        applicationUrl: '',
        portfolioUrl: '',
        otherLinks: [],
    };
    const {
        data: links,
        setData: setLinks,
    } = useS3Storage<LinksData>('user-links', { defaultValue: defaultLinks });

    const defaultProfile: UserProfile = {
        gpa: '3.90',
        major: 'Computer Science',
        targetMajor: '',
        values: ['Innovation', 'Technical Excellence', 'Design', 'Impact'],
        interests: ['Artificial Intelligence', 'Software Engineering', 'Robotics'],
        goals: 'I want to transfer to a top university to deepen my knowledge in Computer Science and work on cutting-edge research.',
    };

    const {
        data: profile,
        setData: setProfile,
        isLoading: profileLoading,
        isSaving: profileSaving,
    } = useS3Storage<UserProfile>('profile', { defaultValue: defaultProfile });

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

    // Detect document type from file name/extension
    const detectDocumentType = (fileName: string): Document['type'] => {
        const lower = fileName.toLowerCase();
        if (lower.includes('resume') || lower.includes('cv')) return 'resume';
        if (lower.includes('paper') || lower.includes('research')) return 'paper';
        if (lower.includes('transcript') || lower.includes('grade')) return 'transcript';
        if (lower.includes('certificate') || lower.includes('award')) return 'certificate';
        return 'other';
    };

    // Format file size for display
    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    // Process and upload files
    const uploadFiles = useCallback(async (files: File[]) => {
        if (files.length === 0) return;

        // Validate files
        const validExtensions = ['.pdf', '.doc', '.docx', '.txt'];
        const maxSize = 10 * 1024 * 1024; // 10MB

        const validFiles = files.filter(file => {
            const ext = '.' + file.name.split('.').pop()?.toLowerCase();
            if (!validExtensions.includes(ext)) {
                toast.error(`${file.name}: Invalid file type. Supports PDF, DOC, DOCX, TXT`);
                return false;
            }
            if (file.size > maxSize) {
                toast.error(`${file.name}: File too large (max 10MB)`);
                return false;
            }
            return true;
        });

        if (validFiles.length === 0) return;

        setIsUploading(true);
        toast.info(`📁 Processing ${validFiles.length} file(s)...`);

        try {
            for (const file of validFiles) {
                const docId = Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9);
                const docType = detectDocumentType(file.name);

                // Add document with pending status
                const newDoc: Document = {
                    id: docId,
                    name: file.name,
                    type: docType,
                    size: formatFileSize(file.size),
                    uploadedAt: new Date().toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric'
                    }),
                    status: 'pending' as const,
                };
                setDocuments(prev => [...prev, newDoc]);

                // Parse document to extract text
                toast.info(`🔍 Parsing ${file.name}...`);
                const formData = new FormData();
                formData.append('file', file);

                try {
                    const parseResponse = await fetch('/api/documents/parse', {
                        method: 'POST',
                        body: formData,
                    });

                    if (!parseResponse.ok) {
                        throw new Error('Failed to parse document');
                    }

                    const parseResult = await parseResponse.json();

                    // Check if AI is configured for extraction
                    if (parseResult.text && parseResult.text.length > 100) {
                        toast.info(`🧠 AI extracting activities from ${file.name}...`);

                        // Call server-side AI extraction API (uses runtime CLAUDE_API_KEY)
                        const extractResponse = await fetch('/api/documents/extract', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                text: parseResult.text,
                                documentType: docType,
                            }),
                        });

                        const extraction = await extractResponse.json();

                        if (extraction.error === 'AI not configured') {
                            // AI not configured on server - fallback to local config
                            const aiConfig = getAIConfig();
                            if (aiConfig) {
                                const clientExtraction = await extractFromDocument(
                                    aiConfig,
                                    parseResult.text,
                                    docType as 'resume' | 'paper' | 'transcript' | 'certificate' | 'other'
                                );
                                extraction.activities = clientExtraction.activities;
                                extraction.achievements = clientExtraction.achievements;
                                extraction.summary = clientExtraction.summary;
                            } else {
                                setDocuments(prev => prev.map(doc =>
                                    doc.id === docId ? { ...doc, status: 'analyzed' as const } : doc
                                ));
                                toast.info(`📄 ${file.name} processed. Set up AI API key for auto-extraction.`);
                                continue;
                            }
                        }

                        // Add extracted activities
                        if (extraction.activities && extraction.activities.length > 0) {
                            const newActivities: ActivityItem[] = extraction.activities.map((a: ExtractedActivity) => ({
                                id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9),
                                name: a.name,
                                role: a.role,
                                organization: a.organization,
                                startDate: a.startDate,
                                endDate: a.endDate,
                                description: a.description,
                                hoursPerWeek: a.hoursPerWeek,
                                weeksPerYear: a.weeksPerYear,
                            }));
                            setActivities(prev => [...prev, ...newActivities]);
                            toast.success(`✨ Extracted ${extraction.activities.length} activities from ${file.name}`);
                        }

                        // Add extracted achievements
                        if (extraction.achievements && extraction.achievements.length > 0) {
                            const newAchievements: Achievement[] = extraction.achievements.map((a: ExtractedAchievement) => ({
                                id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9),
                                title: a.title,
                                org: a.description, // Map description to org field
                                date: a.date,
                            }));
                            setAchievements(prev => [...prev, ...newAchievements]);
                            toast.success(`🏆 Extracted ${extraction.achievements.length} achievements from ${file.name}`);
                        }

                        // Add extracted profile info
                        if (extraction.major || extraction.gpa) {
                            setProfile(prev => ({
                                ...prev,
                                major: extraction.major || prev.major,
                                gpa: extraction.gpa || prev.gpa,
                            }));
                            if (extraction.major && extraction.gpa) {
                                toast.success(`🎓 Extracted Profile: ${extraction.major} (GPA: ${extraction.gpa})`);
                            } else if (extraction.major) {
                                toast.success(`🎓 Extracted Major: ${extraction.major}`);
                            } else if (extraction.gpa) {
                                toast.success(`📈 Extracted GPA: ${extraction.gpa}`);
                            }
                        }

                        // Update document status to analyzed
                        setDocuments(prev => prev.map(doc =>
                            doc.id === docId ? { ...doc, status: 'analyzed' as const } : doc
                        ));

                        if (extraction.summary) {
                            toast.success(`📄 ${extraction.summary}`);
                        }
                    } else {
                        // Document too short
                        setDocuments(prev => prev.map(doc =>
                            doc.id === docId ? { ...doc, status: 'analyzed' as const } : doc
                        ));
                        toast.info(`📄 ${file.name} processed.`);
                    }
                } catch (parseError) {
                    console.error('Parse error:', parseError);
                    setDocuments(prev => prev.map(doc =>
                        doc.id === docId ? { ...doc, status: 'pending' as const } : doc
                    ));
                    toast.error(`Failed to process ${file.name}`);
                }
            }

            toast.success(`✅ All documents processed!`);

        } catch (error) {
            console.error('Upload error:', error);
            toast.error('Failed to process files. Please try again.');
        } finally {
            setIsUploading(false);
        }
    }, [setDocuments, setActivities, setAchievements]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files);
        uploadFiles(files);
    }, [uploadFiles]);

    const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files ? Array.from(e.target.files) : [];
        uploadFiles(files);
        // Reset input so same file can be selected again
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, [uploadFiles]);

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

    // Activity CRUD operations with validation
    const validateActivity = () => {
        const errors: Record<string, string> = {};
        if (!newActivity.name?.trim()) errors.name = 'Activity name is required';
        if (!newActivity.role?.trim()) errors.role = 'Your role is required';
        if (newActivity.hoursPerWeek && (newActivity.hoursPerWeek < 0 || newActivity.hoursPerWeek > 168)) {
            errors.hoursPerWeek = 'Hours must be between 0-168';
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleAddActivity = () => {
        if (!validateActivity()) {
            toast.error('Please fix the errors in the form');
            return;
        }

        const activity: ActivityItem = {
            id: Date.now().toString(),
            name: newActivity.name?.trim() || '',
            role: newActivity.role?.trim() || '',
            organization: newActivity.organization?.trim() || '',
            startDate: newActivity.startDate || '',
            endDate: newActivity.endDate || 'Present',
            description: newActivity.description?.trim() || '',
            hoursPerWeek: newActivity.hoursPerWeek || 0,
            weeksPerYear: newActivity.weeksPerYear || 0,
        };

        setActivities(prev => [...prev, activity]);
        setNewActivity(emptyActivity);
        setFormErrors({});
        setShowActivityModal(false);
        toast.success('Activity added successfully!');
    };

    const handleEditActivity = (activity: ActivityItem) => {
        setEditingActivity(activity);
        setNewActivity(activity);
        setShowActivityModal(true);
    };

    const handleUpdateActivity = () => {
        if (!editingActivity) return;
        if (!validateActivity()) {
            toast.error('Please fix the errors in the form');
            return;
        }

        setActivities(prev =>
            prev.map(a => a.id === editingActivity.id
                ? { ...a, ...newActivity } as ActivityItem
                : a
            )
        );
        setEditingActivity(null);
        setNewActivity(emptyActivity);
        setFormErrors({});
        setShowActivityModal(false);
        toast.success('Activity updated successfully!');
    };

    const handleDeleteActivity = (id: string) => {
        setActivities(prev => prev.filter(a => a.id !== id));
        setShowDeleteConfirm(null);
        toast.success('Activity deleted');
    };

    const handleAddAchievement = () => {
        const title = prompt('Achievement title:');
        const org = prompt('Organization:');
        const date = prompt('Date (e.g., 2025):');

        if (title && org && date) {
            setAchievements(prev => [...prev, {
                id: Date.now().toString(),
                title,
                org,
                date,
            }]);
        }
    };

    const handleDeleteAchievement = (id: string) => {
        setAchievements(prev => prev.filter(a => a.id !== id));
        setShowDeleteConfirm(null);
        toast.success('Achievement deleted');
    };

    const filteredDocuments = documents.filter(doc =>
        doc.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const isLoading = docsLoading || activitiesLoading || achievementsLoading || profileLoading;
    const isSaving = docsSaving || activitiesSaving || achievementsSaving || profileSaving;

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
                <div className="flex items-center gap-3">
                    {isSaving && (
                        <span className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Saving...
                        </span>
                    )}
                    {!isSaving && activitiesLastSaved && (
                        <span className="flex items-center gap-2 text-sm" style={{ color: 'var(--success)' }}>
                            <CheckCircle2 className="w-4 h-4" />
                            Saved
                        </span>
                    )}
                </div>
            </motion.div>

            {/* Loading State */}
            {isLoading && (
                <Card className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--primary-400)' }} />
                    <span className="ml-3">Loading your data...</span>
                </Card>
            )}

            {!isLoading && (
                <>
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
                                <p className="text-2xl font-bold">{achievements.length}</p>
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
                    <motion.div variants={itemVariants} className="flex flex-wrap gap-2">
                        {(['documents', 'activities', 'achievements', 'profile'] as TabType[]).map((tab) => (
                            <Button
                                key={tab}
                                variant={activeTab === tab ? 'primary' : 'secondary'}
                                onClick={() => setActiveTab(tab)}
                                icon={
                                    tab === 'documents' ? <FolderOpen className="w-4 h-4" /> :
                                        tab === 'activities' ? <Activity className="w-4 h-4" /> :
                                            tab === 'achievements' ? <Award className="w-4 h-4" /> :
                                                <GraduationCap className="w-4 h-4" />
                                }
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
                                {/* Hidden file input - outside Card to prevent double-trigger */}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    multiple
                                    accept=".pdf,.doc,.docx,.txt"
                                    onChange={handleFileInputChange}
                                    className="hidden"
                                    style={{ display: 'none' }}
                                />
                                <Card
                                    className={`border-2 border-dashed transition-colors cursor-pointer ${isDragging ? 'border-primary-500' : ''}`}
                                    style={{ borderColor: isDragging ? 'var(--primary-500)' : 'var(--glass-border)' }}
                                    onClick={() => !isUploading && fileInputRef.current?.click()}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                >
                                    <div className="py-8 text-center">
                                        <Upload className="w-12 h-12 mx-auto mb-4" style={{ color: isUploading ? 'var(--primary-400)' : 'var(--text-muted)' }} />
                                        <h3 className="font-semibold mb-2">
                                            {isUploading ? 'Uploading...' : 'Drop files here or click to upload'}
                                        </h3>
                                        <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
                                            Supports PDF, DOC, DOCX, TXT (Max 10MB)
                                        </p>
                                        <div
                                            className="inline-block"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <Button
                                                icon={<Plus className="w-4 h-4" />}
                                                disabled={isUploading}
                                                onClick={() => fileInputRef.current?.click()}
                                            >
                                                Choose Files
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>

                            {/* Important Links Section */}
                            <motion.div variants={itemVariants}>
                                <Card>
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(139, 92, 246, 0.15)' }}>
                                            <Link className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold">Important Links</h3>
                                            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Share your research papers, applications, and portfolio</p>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Research Paper / Preprint</label>
                                            <div className="flex gap-2">
                                                <Input
                                                    placeholder="https://arxiv.org/your-paper"
                                                    value={links.researchPaperUrl}
                                                    onChange={(e) => setLinks(prev => ({ ...prev, researchPaperUrl: e.target.value }))}
                                                    icon={<BookOpen className="w-4 h-4" />}
                                                    className="flex-1"
                                                />
                                                {links.researchPaperUrl && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => window.open(links.researchPaperUrl, '_blank')}
                                                        icon={<ExternalLink className="w-4 h-4" />}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Application Link</label>
                                            <div className="flex gap-2">
                                                <Input
                                                    placeholder="https://commonapp.org/your-application"
                                                    value={links.applicationUrl}
                                                    onChange={(e) => setLinks(prev => ({ ...prev, applicationUrl: e.target.value }))}
                                                    icon={<GraduationCap className="w-4 h-4" />}
                                                    className="flex-1"
                                                />
                                                {links.applicationUrl && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => window.open(links.applicationUrl, '_blank')}
                                                        icon={<ExternalLink className="w-4 h-4" />}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Portfolio</label>
                                            <div className="flex gap-2">
                                                <Input
                                                    placeholder="https://your-portfolio.com"
                                                    value={links.portfolioUrl}
                                                    onChange={(e) => setLinks(prev => ({ ...prev, portfolioUrl: e.target.value }))}
                                                    icon={<Briefcase className="w-4 h-4" />}
                                                    className="flex-1"
                                                />
                                                {links.portfolioUrl && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => window.open(links.portfolioUrl, '_blank')}
                                                        icon={<ExternalLink className="w-4 h-4" />}
                                                    />
                                                )}
                                            </div>
                                        </div>
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
                            {filteredDocuments.length === 0 ? (
                                <Card className="text-center py-12">
                                    <FileText className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
                                    <h3 className="font-semibold mb-2">No documents yet</h3>
                                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                                        Upload your first document to get started
                                    </p>
                                </Card>
                            ) : (
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
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        icon={<Trash2 className="w-4 h-4" style={{ color: 'var(--error)' }} />}
                                                        onClick={() => setDocuments(prev => prev.filter(d => d.id !== doc.id))}
                                                    />
                                                </div>
                                            </Card>
                                        </motion.div>
                                    ))}
                                </motion.div>
                            )}
                        </>
                    )}

                    {/* Activities Tab */}
                    {activeTab === 'activities' && (
                        <>
                            <motion.div variants={itemVariants} className="flex justify-between items-center">
                                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                                    {activities.length} activities • Data saves automatically
                                </p>
                                <Button
                                    icon={<Plus className="w-4 h-4" />}
                                    onClick={() => {
                                        setEditingActivity(null);
                                        setNewActivity(emptyActivity);
                                        setShowActivityModal(true);
                                    }}
                                >
                                    Add Activity
                                </Button>
                            </motion.div>

                            {activities.length === 0 ? (
                                <Card className="text-center py-12">
                                    <Activity className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
                                    <h3 className="font-semibold mb-2">No activities yet</h3>
                                    <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
                                        Add your extracurricular activities, work experience, and involvement
                                    </p>
                                    <Button
                                        icon={<Plus className="w-4 h-4" />}
                                        onClick={() => setShowActivityModal(true)}
                                    >
                                        Add Your First Activity
                                    </Button>
                                </Card>
                            ) : (
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
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            icon={<FileText className="w-4 h-4" />}
                                                            onClick={() => handleEditActivity(activity)}
                                                        >
                                                            Edit
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            icon={<Trash2 className="w-4 h-4" style={{ color: 'var(--error)' }} />}
                                                            onClick={() => handleDeleteActivity(activity.id)}
                                                        />
                                                    </div>
                                                </div>
                                            </Card>
                                        </motion.div>
                                    ))}
                                </motion.div>
                            )}

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
                            {achievements.map((achievement) => (
                                <motion.div key={achievement.id} variants={itemVariants}>
                                    <Card className="relative">
                                        <button
                                            className="absolute top-2 right-2 p-1 rounded hover:bg-red-500/20"
                                            onClick={() => handleDeleteAchievement(achievement.id)}
                                        >
                                            <X className="w-4 h-4" style={{ color: 'var(--error)' }} />
                                        </button>
                                        <div className="flex items-center gap-4 mb-4">
                                            <div
                                                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                                                style={{ background: 'var(--gradient-warm)' }}
                                            >
                                                <Award className="w-6 h-6 text-white" />
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
                                    className="flex items-center justify-center h-full min-h-[150px] border-2 border-dashed cursor-pointer hover:border-primary-500 transition-colors"
                                    style={{ borderColor: 'var(--glass-border)' }}
                                    onClick={handleAddAchievement}
                                >
                                    <div className="text-center">
                                        <Plus className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
                                        <p style={{ color: 'var(--text-muted)' }}>Add Achievement</p>
                                    </div>
                                </Card>
                            </motion.div>
                        </motion.div>
                    )}
                    {/* Profile Tab */}
                    {activeTab === 'profile' && (
                        <motion.div variants={containerVariants} className="space-y-6">
                            <Card>
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(20, 184, 166, 0.15)' }}>
                                        <GraduationCap className="w-6 h-6" style={{ color: 'var(--accent-teal)' }} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold">Academic Profile</h3>
                                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>This information is used to personalize your essays and match you with colleges</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Cumulative GPA</label>
                                            <Input
                                                placeholder="e.g. 3.95"
                                                value={profile.gpa}
                                                onChange={(e) => setProfile(prev => ({ ...prev, gpa: e.target.value }))}
                                                icon={<Award className="w-4 h-4" />}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Current/Intended Major</label>
                                            <Input
                                                placeholder="e.g. Computer Science"
                                                value={profile.major}
                                                onChange={(e) => setProfile(prev => ({ ...prev, major: e.target.value }))}
                                                icon={<BookOpen className="w-4 h-4" />}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Target Transfer Major (if different)</label>
                                            <Input
                                                placeholder="e.g. Artificial Intelligence"
                                                value={profile.targetMajor}
                                                onChange={(e) => setProfile(prev => ({ ...prev, targetMajor: e.target.value }))}
                                                icon={<Target className="w-4 h-4" />}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Personal Goals & Aspirations</label>
                                            <textarea
                                                className="input-field w-full"
                                                rows={8}
                                                placeholder="What do you hope to achieve by transferring? What are your long-term career goals?"
                                                value={profile.goals}
                                                onChange={(e) => setProfile(prev => ({ ...prev, goals: e.target.value }))}
                                            />
                                            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                                                💡 Mention specific research interests or career paths to help the AI write more authentically.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </Card>

                            <Card className="bg-primary-500/5 border-primary-500/20">
                                <h4 className="font-semibold mb-2 flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-primary-400" />
                                    AI Personalization Tip
                                </h4>
                                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                    Your GPA and Major help the AI understand your academic standing, but your **Goals** are what make your essays truly unique.
                                    The more specific you are about your "Why", the better the AI can weave your activities into a compelling narrative for {profile.major || 'your field'}.
                                </p>
                            </Card>
                        </motion.div>
                    )}
                </>
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
                                    {editingActivity ? 'Edit Activity' : 'Add New Activity'}
                                </h2>
                                <Button variant="ghost" size="sm" onClick={() => setShowActivityModal(false)}>
                                    <X className="w-5 h-5" />
                                </Button>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <Input
                                        placeholder="Activity Name *"
                                        value={newActivity.name || ''}
                                        onChange={(e) => {
                                            setNewActivity(prev => ({ ...prev, name: e.target.value }));
                                            if (formErrors.name) setFormErrors(prev => ({ ...prev, name: '' }));
                                        }}
                                        className={formErrors.name ? 'border-red-500' : ''}
                                    />
                                    {formErrors.name && (
                                        <p className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--error)' }}>
                                            <AlertCircle className="w-3 h-3" /> {formErrors.name}
                                        </p>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Input
                                            placeholder="Your Role *"
                                            value={newActivity.role || ''}
                                            onChange={(e) => {
                                                setNewActivity(prev => ({ ...prev, role: e.target.value }));
                                                if (formErrors.role) setFormErrors(prev => ({ ...prev, role: '' }));
                                            }}
                                            className={formErrors.role ? 'border-red-500' : ''}
                                        />
                                        {formErrors.role && (
                                            <p className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--error)' }}>
                                                <AlertCircle className="w-3 h-3" /> {formErrors.role}
                                            </p>
                                        )}
                                    </div>
                                    <Input
                                        placeholder="Organization"
                                        value={newActivity.organization || ''}
                                        onChange={(e) => setNewActivity(prev => ({ ...prev, organization: e.target.value }))}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        placeholder="Start Date"
                                        type="month"
                                        value={newActivity.startDate || ''}
                                        onChange={(e) => setNewActivity(prev => ({ ...prev, startDate: e.target.value }))}
                                    />
                                    <Input
                                        placeholder="End Date"
                                        type="month"
                                        value={newActivity.endDate || ''}
                                        onChange={(e) => setNewActivity(prev => ({ ...prev, endDate: e.target.value }))}
                                    />
                                </div>
                                <textarea
                                    className="input-field w-full"
                                    rows={4}
                                    placeholder="Describe your involvement and achievements..."
                                    value={newActivity.description || ''}
                                    onChange={(e) => setNewActivity(prev => ({ ...prev, description: e.target.value }))}
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        placeholder="Hours per week"
                                        type="number"
                                        value={newActivity.hoursPerWeek?.toString() || ''}
                                        onChange={(e) => setNewActivity(prev => ({ ...prev, hoursPerWeek: parseInt(e.target.value) || 0 }))}
                                    />
                                    <Input
                                        placeholder="Weeks per year"
                                        type="number"
                                        value={newActivity.weeksPerYear?.toString() || ''}
                                        onChange={(e) => setNewActivity(prev => ({ ...prev, weeksPerYear: parseInt(e.target.value) || 0 }))}
                                    />
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <Button
                                        className="flex-1"
                                        onClick={editingActivity ? handleUpdateActivity : handleAddActivity}
                                        icon={<Save className="w-4 h-4" />}
                                    >
                                        {editingActivity ? 'Update Activity' : 'Save Activity'}
                                    </Button>
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
