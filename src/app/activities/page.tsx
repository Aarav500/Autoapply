'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Button } from '@/components/ui';
import { useS3Storage } from '@/lib/useS3Storage';
import { STORAGE_KEYS } from '@/lib/s3-storage';
import {
    GraduationCap, Heart, Code, Music, Trophy, Star, Loader2,
    FileText, CheckCircle, Upload, File, Users, Briefcase, Award, Plus, X, Save,
    Trash2
} from 'lucide-react';
import { extractFromDocument } from '@/lib/automation/document-extractor';
import { toast } from '@/lib/error-handling';

// ============================================
// TYPES
// ============================================

interface Activity {
    id: string;
    name: string;
    role: string;
    organization: string;
    category: 'academic' | 'leadership' | 'work' | 'volunteer' | 'creative' | 'athletic' | 'other';
    description: string;
    startDate: string;
    endDate?: string;
    isOngoing: boolean;
    hoursPerWeek?: number;
    weeksPerYear?: number;
    achievements?: string[];
}

interface Achievement {
    id: string;
    title: string;
    category: 'academic' | 'award' | 'publication' | 'certification' | 'other';
    date: string;
    description: string;
    issuer?: string;
}

const ACTIVITY_CATEGORIES = [
    { value: 'academic', label: 'Academic', icon: GraduationCap, color: 'var(--primary-400)' },
    { value: 'leadership', label: 'Leadership', icon: Users, color: 'var(--accent-purple)' },
    { value: 'work', label: 'Work Experience', icon: Briefcase, color: 'var(--accent-teal)' },
    { value: 'volunteer', label: 'Volunteer', icon: Heart, color: 'var(--accent-rose)' },
    { value: 'creative', label: 'Creative/Arts', icon: Music, color: 'var(--warning)' },
    { value: 'athletic', label: 'Athletic', icon: Trophy, color: 'var(--success)' },
    { value: 'other', label: 'Other', icon: Star, color: 'var(--text-muted)' },
];

const ACHIEVEMENT_CATEGORIES = [
    { value: 'academic', label: 'Academic Honor' },
    { value: 'award', label: 'Award/Recognition' },
    { value: 'publication', label: 'Publication' },
    { value: 'certification', label: 'Certification' },
    { value: 'other', label: 'Other' },
];

// ============================================
// MAIN COMPONENT
// ============================================

export default function ActivitiesPage() {
    const [activeTab, setActiveTab] = useState<'activities' | 'achievements' | 'documents'>('activities');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [uploadContent, setUploadContent] = useState('');
    const [extractionResult, setExtractionResult] = useState<{ activities: Activity[], achievements: Achievement[] } | null>(null);

    // Load from S3 - using centralized storage keys
    const {
        data: activities,
        setData: setActivities,
        save: saveActivitiesData,
        isLoading: activitiesLoading
    } = useS3Storage<Activity[]>(STORAGE_KEYS.ACTIVITIES, { defaultValue: [] });

    const {
        data: achievements,
        setData: setAchievements,
        save: saveAchievementsData,
        isLoading: achievementsLoading
    } = useS3Storage<Achievement[]>(STORAGE_KEYS.ACHIEVEMENTS, { defaultValue: [] });


    const isLoading = activitiesLoading || achievementsLoading;

    // ============================================
    // ACTIVITY CRUD
    // ============================================

    const [newActivity, setNewActivity] = useState<Partial<Activity>>({
        category: 'academic',
        isOngoing: false,
    });

    const handleAddActivity = async () => {
        if (!newActivity.name || !newActivity.role || !newActivity.organization) {
            toast.error('Please fill in all required fields');
            return;
        }

        const activity: Activity = {
            id: `act_${Date.now()}`,
            name: newActivity.name || '',
            role: newActivity.role || '',
            organization: newActivity.organization || '',
            category: newActivity.category as Activity['category'] || 'other',
            description: newActivity.description || '',
            startDate: newActivity.startDate || new Date().toISOString().split('T')[0],
            endDate: newActivity.endDate,
            isOngoing: newActivity.isOngoing || false,
            hoursPerWeek: newActivity.hoursPerWeek,
            weeksPerYear: newActivity.weeksPerYear,
            achievements: [],
        };

        setActivities([...activities, activity]);
        setNewActivity({ category: 'academic', isOngoing: false });
        setIsAddingNew(false);
        toast.success('Activity added!');
    };

    const handleDeleteActivity = (id: string) => {
        setActivities(activities.filter(a => a.id !== id));
        toast.success('Activity deleted');
    };

    // ============================================
    // ACHIEVEMENT CRUD
    // ============================================

    const [newAchievement, setNewAchievement] = useState<Partial<Achievement>>({
        category: 'award',
    });

    const handleAddAchievement = () => {
        if (!newAchievement.title) {
            toast.error('Please enter a title');
            return;
        }

        const achievement: Achievement = {
            id: `ach_${Date.now()}`,
            title: newAchievement.title || '',
            category: newAchievement.category as Achievement['category'] || 'other',
            date: newAchievement.date || new Date().toISOString().split('T')[0],
            description: newAchievement.description || '',
            issuer: newAchievement.issuer,
        };

        setAchievements([...achievements, achievement]);
        setNewAchievement({ category: 'award' });
        setIsAddingNew(false);
        toast.success('Achievement added!');
    };

    const handleDeleteAchievement = (id: string) => {
        setAchievements(achievements.filter(a => a.id !== id));
        toast.success('Achievement deleted');
    };


    // ============================================
    // RENDER
    // ============================================

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
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
                        <Award className="w-8 h-8" style={{ color: 'var(--primary-400)' }} />
                        Activities & Achievements
                    </h1>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        Add your activities to personalize essays and applications
                    </p>
                </div>
                <Button
                    icon={<Plus className="w-4 h-4" />}
                    onClick={() => setIsAddingNew(true)}
                >
                    Add {activeTab === 'activities' ? 'Activity' : 'Achievement'}
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="text-center">
                    <p className="text-3xl font-bold" style={{ color: 'var(--primary-400)' }}>
                        {activities.length}
                    </p>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Activities</p>
                </Card>
                <Card className="text-center">
                    <p className="text-3xl font-bold" style={{ color: 'var(--accent-gold)' }}>
                        {achievements.length}
                    </p>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Achievements</p>
                </Card>
                <Card className="text-center">
                    <p className="text-3xl font-bold" style={{ color: 'var(--success)' }}>
                        {activities.filter(a => a.isOngoing).length}
                    </p>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Ongoing</p>
                </Card>
                <Card className="text-center">
                    <p className="text-3xl font-bold" style={{ color: 'var(--accent-purple)' }}>
                        {activities.filter(a => a.category === 'leadership').length}
                    </p>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Leadership</p>
                </Card>
            </div>

            {/* Tabs */}
            <div className="flex gap-2">
                <button
                    onClick={() => setActiveTab('activities')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'activities' ? 'bg-white/10' : ''
                        }`}
                    style={{
                        background: activeTab === 'activities' ? 'var(--gradient-primary)' : 'var(--bg-secondary)',
                        color: activeTab === 'activities' ? 'white' : 'var(--text-secondary)',
                    }}
                >
                    Activities ({activities.length})
                </button>
                <button
                    onClick={() => setActiveTab('achievements')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors`}
                    style={{
                        background: activeTab === 'achievements' ? 'var(--gradient-accent)' : 'var(--bg-secondary)',
                        color: activeTab === 'achievements' ? 'white' : 'var(--text-secondary)',
                    }}
                >
                    Achievements ({achievements.length})
                </button>
                <button
                    onClick={() => setActiveTab('documents')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors`}
                    style={{
                        background: activeTab === 'documents' ? 'var(--gradient-primary)' : 'var(--bg-secondary)',
                        color: activeTab === 'documents' ? 'white' : 'var(--text-secondary)',
                    }}
                >
                    Documents
                </button>
            </div>

            {/* Add New Form */}
            <AnimatePresence>
                {isAddingNew && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                    >
                        <Card>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold">
                                    Add New {activeTab === 'activities' ? 'Activity' : 'Achievement'}
                                </h3>
                                <button
                                    onClick={() => setIsAddingNew(false)}
                                    className="p-2 hover:bg-white/10 rounded-lg"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {activeTab === 'activities' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <input
                                        type="text"
                                        placeholder="Activity Name *"
                                        value={newActivity.name || ''}
                                        onChange={e => setNewActivity({ ...newActivity, name: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg"
                                        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Your Role *"
                                        value={newActivity.role || ''}
                                        onChange={e => setNewActivity({ ...newActivity, role: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg"
                                        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                                    />
                                    <input
                                        type="text"
                                        placeholder="Organization *"
                                        value={newActivity.organization || ''}
                                        onChange={e => setNewActivity({ ...newActivity, organization: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg"
                                        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                                    />
                                    <select
                                        value={newActivity.category || 'academic'}
                                        onChange={e => setNewActivity({ ...newActivity, category: e.target.value as Activity['category'] })}
                                        className="w-full px-4 py-2 rounded-lg"
                                        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                                    >
                                        {ACTIVITY_CATEGORIES.map(cat => (
                                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                                        ))}
                                    </select>
                                    <textarea
                                        placeholder="Description"
                                        value={newActivity.description || ''}
                                        onChange={e => setNewActivity({ ...newActivity, description: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg md:col-span-2"
                                        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                                        rows={3}
                                    />
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={newActivity.isOngoing || false}
                                            onChange={e => setNewActivity({ ...newActivity, isOngoing: e.target.checked })}
                                        />
                                        <label>Currently ongoing</label>
                                    </div>
                                    <div className="flex gap-2 md:col-span-2">
                                        <Button onClick={handleAddActivity} icon={<Save className="w-4 h-4" />}>
                                            Save Activity
                                        </Button>
                                        <Button variant="secondary" onClick={() => setIsAddingNew(false)}>
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <input
                                        type="text"
                                        placeholder="Achievement Title *"
                                        value={newAchievement.title || ''}
                                        onChange={e => setNewAchievement({ ...newAchievement, title: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg"
                                        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                                    />
                                    <select
                                        value={newAchievement.category || 'award'}
                                        onChange={e => setNewAchievement({ ...newAchievement, category: e.target.value as Achievement['category'] })}
                                        className="w-full px-4 py-2 rounded-lg"
                                        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                                    >
                                        {ACHIEVEMENT_CATEGORIES.map(cat => (
                                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                                        ))}
                                    </select>
                                    <input
                                        type="text"
                                        placeholder="Issuer/Organization"
                                        value={newAchievement.issuer || ''}
                                        onChange={e => setNewAchievement({ ...newAchievement, issuer: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg"
                                        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                                    />
                                    <input
                                        type="date"
                                        value={newAchievement.date || ''}
                                        onChange={e => setNewAchievement({ ...newAchievement, date: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg"
                                        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                                    />
                                    <textarea
                                        placeholder="Description"
                                        value={newAchievement.description || ''}
                                        onChange={e => setNewAchievement({ ...newAchievement, description: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg md:col-span-2"
                                        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                                        rows={3}
                                    />
                                    <div className="flex gap-2 md:col-span-2">
                                        <Button onClick={handleAddAchievement} icon={<Save className="w-4 h-4" />}>
                                            Save Achievement
                                        </Button>
                                        <Button variant="secondary" onClick={() => setIsAddingNew(false)}>
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Activities List */}
            {
                activeTab === 'activities' && (
                    <div className="space-y-3">
                        {activities.length === 0 ? (
                            <Card className="text-center py-12">
                                <Award className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
                                <p className="text-lg font-medium mb-2">No activities yet</p>
                                <p style={{ color: 'var(--text-muted)' }} className="mb-4">
                                    Add your extracurricular activities, work experience, and projects
                                </p>
                                <Button onClick={() => setIsAddingNew(true)} icon={<Plus className="w-4 h-4" />}>
                                    Add Your First Activity
                                </Button>
                            </Card>
                        ) : (
                            activities.map((activity, index) => {
                                const cat = ACTIVITY_CATEGORIES.find(c => c.value === activity.category);
                                const Icon = cat?.icon || Star;

                                return (
                                    <motion.div
                                        key={activity.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                    >
                                        <Card>
                                            <div className="flex items-start gap-4">
                                                <div
                                                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                                                    style={{ background: `${cat?.color}20` }}
                                                >
                                                    <Icon className="w-6 h-6" style={{ color: cat?.color }} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between">
                                                        <div>
                                                            <h3 className="font-semibold">{activity.name}</h3>
                                                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                                                {activity.role} at {activity.organization}
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {activity.isOngoing && (
                                                                <span
                                                                    className="px-2 py-0.5 rounded-full text-xs font-medium"
                                                                    style={{ background: 'rgba(34, 197, 94, 0.1)', color: 'var(--success)' }}
                                                                >
                                                                    Ongoing
                                                                </span>
                                                            )}
                                                            <button
                                                                onClick={() => handleDeleteActivity(activity.id)}
                                                                className="p-2 hover:bg-white/10 rounded-lg text-red-400"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    {activity.description && (
                                                        <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
                                                            {activity.description}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </Card>
                                    </motion.div>
                                );
                            })
                        )}
                    </div>
                )
            }

            {/* Achievements List */}
            {
                activeTab === 'achievements' && (
                    <div className="space-y-3">
                        {achievements.length === 0 ? (
                            <Card className="text-center py-12">
                                <Trophy className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
                                <p className="text-lg font-medium mb-2">No achievements yet</p>
                                <p style={{ color: 'var(--text-muted)' }} className="mb-4">
                                    Add your awards, honors, and recognitions
                                </p>
                                <Button onClick={() => setIsAddingNew(true)} icon={<Plus className="w-4 h-4" />}>
                                    Add Your First Achievement
                                </Button>
                            </Card>
                        ) : (
                            achievements.map((achievement, index) => (
                                <motion.div
                                    key={achievement.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                >
                                    <Card>
                                        <div className="flex items-start gap-4">
                                            <div
                                                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                                                style={{ background: 'rgba(251, 191, 36, 0.15)' }}
                                            >
                                                <Trophy className="w-6 h-6" style={{ color: 'var(--accent-gold)' }} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <h3 className="font-semibold">{achievement.title}</h3>
                                                        {achievement.issuer && (
                                                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                                                {achievement.issuer}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                                                            {new Date(achievement.date).toLocaleDateString()}
                                                        </span>
                                                        <button
                                                            onClick={() => handleDeleteAchievement(achievement.id)}
                                                            className="p-2 hover:bg-white/10 rounded-lg text-red-400"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                                {achievement.description && (
                                                    <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
                                                        {achievement.description}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </Card>
                                </motion.div>
                            ))
                        )}
                    </div>
                )
            }

            {/* Tips */}
            <Card style={{ background: 'rgba(91, 111, 242, 0.05)', borderLeft: '4px solid var(--primary-400)' }}>
                <div className="flex items-start gap-4">
                    <FileText className="w-6 h-6" style={{ color: 'var(--primary-400)' }} />
                    <div>
                        <h4 className="font-semibold mb-1">Pro Tip</h4>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                            Activities you add here will be used to personalize your essays and make your applications more authentic.
                            Be specific about your role and impact!
                        </p>
                    </div>
                </div>
            </Card>

            {/* Documents Tab */}
            {
                activeTab === 'documents' && (
                    <div className="space-y-6">
                        <Card>
                            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                                <Upload className="w-5 h-5" />
                                Upload CV or Paper
                            </h3>
                            <p className="mb-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                                Paste the text from your CV, Resume, or Research Paper here.
                                AI will automatically extract your activities and achievements.
                            </p>

                            <textarea
                                value={uploadContent}
                                onChange={(e) => setUploadContent(e.target.value)}
                                className="w-full p-4 rounded-lg min-h-[200px] mb-4 font-mono text-sm"
                                placeholder="Paste your CV text here..."
                                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                            />

                            <div className="flex justify-end">
                                <Button
                                    onClick={() => {
                                        const result = extractFromDocument(uploadContent);
                                        setExtractionResult(result as any);
                                        toast.success(`Found ${result.activities.length} activities & ${result.achievements.length} achievements!`);
                                    }}
                                    disabled={!uploadContent}
                                >
                                    Analyze & Extract
                                </Button>
                            </div>
                        </Card>

                        {extractionResult && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-4"
                            >
                                <div className="flex items-center justify-between">
                                    <h3 className="font-semibold text-lg">Extraction Results</h3>
                                    <div className="flex gap-2">
                                        <Button variant="secondary" onClick={() => setExtractionResult(null)}>Discard</Button>
                                        <Button onClick={() => {
                                            setActivities([...activities, ...extractionResult.activities]);
                                            setAchievements([...achievements, ...extractionResult.achievements]);
                                            setExtractionResult(null);
                                            setUploadContent('');
                                            toast.success('Added to profile!');
                                            setActiveTab('activities');
                                        }}>
                                            Save All to Profile
                                        </Button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {extractionResult.activities.length > 0 && (
                                        <Card>
                                            <h4 className="font-medium mb-3 flex items-center gap-2">
                                                <Briefcase className="w-4 h-4" /> New Activities ({extractionResult.activities.length})
                                            </h4>
                                            <div className="space-y-2">
                                                {extractionResult.activities.map((a, i) => (
                                                    <div key={i} className="p-2 rounded bg-white/5 text-sm">
                                                        <p className="font-semibold">{a.name}</p>
                                                        <p className="text-xs opacity-70">{a.description?.substring(0, 50)}...</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </Card>
                                    )}

                                    {extractionResult.achievements.length > 0 && (
                                        <Card>
                                            <h4 className="font-medium mb-3 flex items-center gap-2">
                                                <Trophy className="w-4 h-4" /> New Achievements ({extractionResult.achievements.length})
                                            </h4>
                                            <div className="space-y-2">
                                                {extractionResult.achievements.map((a, i) => (
                                                    <div key={i} className="p-2 rounded bg-white/5 text-sm">
                                                        <p className="font-semibold">{a.title}</p>
                                                        <p className="text-xs opacity-70">{a.date}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </Card>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </div>
                )
            }
        </motion.div >
    );
}
