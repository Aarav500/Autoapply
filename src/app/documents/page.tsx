'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Button, StatusBadge, Input, Tag } from '@/components/ui';
import { useS3Storage } from '@/lib/useS3Storage';
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
    RefreshCw
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

type TabType = 'documents' | 'activities' | 'achievements';

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
        const files = Array.from(e.dataTransfer.files);
        // TODO: Implement S3 file upload
        console.log('Dropped files:', files);
        alert('File upload coming soon! Files will be stored in S3.');
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

    // Activity CRUD operations
    const handleAddActivity = () => {
        if (!newActivity.name || !newActivity.role) {
            alert('Please fill in at least the activity name and role');
            return;
        }

        const activity: ActivityItem = {
            id: Date.now().toString(),
            name: newActivity.name || '',
            role: newActivity.role || '',
            organization: newActivity.organization || '',
            startDate: newActivity.startDate || '',
            endDate: newActivity.endDate || 'Present',
            description: newActivity.description || '',
            hoursPerWeek: newActivity.hoursPerWeek || 0,
            weeksPerYear: newActivity.weeksPerYear || 0,
        };

        setActivities(prev => [...prev, activity]);
        setNewActivity(emptyActivity);
        setShowActivityModal(false);
    };

    const handleEditActivity = (activity: ActivityItem) => {
        setEditingActivity(activity);
        setNewActivity(activity);
        setShowActivityModal(true);
    };

    const handleUpdateActivity = () => {
        if (!editingActivity || !newActivity.name) return;

        setActivities(prev =>
            prev.map(a => a.id === editingActivity.id
                ? { ...a, ...newActivity } as ActivityItem
                : a
            )
        );
        setEditingActivity(null);
        setNewActivity(emptyActivity);
        setShowActivityModal(false);
    };

    const handleDeleteActivity = (id: string) => {
        if (confirm('Are you sure you want to delete this activity?')) {
            setActivities(prev => prev.filter(a => a.id !== id));
        }
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
        if (confirm('Delete this achievement?')) {
            setAchievements(prev => prev.filter(a => a.id !== id));
        }
    };

    const filteredDocuments = documents.filter(doc =>
        doc.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const isLoading = docsLoading || activitiesLoading || achievementsLoading;
    const isSaving = docsSaving || activitiesSaving || achievementsSaving;

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
                                <Input
                                    placeholder="Activity Name *"
                                    value={newActivity.name || ''}
                                    onChange={(e) => setNewActivity(prev => ({ ...prev, name: e.target.value }))}
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        placeholder="Your Role *"
                                        value={newActivity.role || ''}
                                        onChange={(e) => setNewActivity(prev => ({ ...prev, role: e.target.value }))}
                                    />
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
