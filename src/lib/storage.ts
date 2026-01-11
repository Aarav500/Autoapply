'use client';

import { useState, useEffect, useCallback, useRef } from 'react';



// ============================================
// 1. AUTO-SAVE HOOK
// ============================================

interface AutoSaveOptions {
    key: string;
    debounceMs?: number;
    onSave?: (data: unknown) => void;
    onRestore?: (data: unknown) => void;
}

export function useAutoSave<T>(
    data: T,
    options: AutoSaveOptions
) {
    const { key, debounceMs = 30000, onSave, onRestore } = options;
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const initialLoadRef = useRef(false);

    // Restore from localStorage on mount
    useEffect(() => {
        if (initialLoadRef.current) return;
        initialLoadRef.current = true;

        try {
            const saved = localStorage.getItem(`autosave_${key}`);
            if (saved) {
                const parsed = JSON.parse(saved);
                onRestore?.(parsed.data);
                setLastSaved(new Date(parsed.timestamp));
            }
        } catch (error) {
            console.error('Failed to restore autosave:', error);
        }
    }, [key, onRestore]);

    // Auto-save when data changes
    useEffect(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            setIsSaving(true);
            try {
                const saveData = {
                    data,
                    timestamp: new Date().toISOString(),
                    version: 1,
                };
                localStorage.setItem(`autosave_${key}`, JSON.stringify(saveData));
                setLastSaved(new Date());
                onSave?.(data);
            } catch (error) {
                console.error('Failed to autosave:', error);
            } finally {
                setIsSaving(false);
            }
        }, debounceMs);

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [data, key, debounceMs, onSave]);

    // Manual save function
    const saveNow = useCallback(() => {
        setIsSaving(true);
        try {
            const saveData = {
                data,
                timestamp: new Date().toISOString(),
                version: 1,
            };
            localStorage.setItem(`autosave_${key}`, JSON.stringify(saveData));
            setLastSaved(new Date());
            onSave?.(data);
        } catch (error) {
            console.error('Failed to save:', error);
        } finally {
            setIsSaving(false);
        }
    }, [data, key, onSave]);

    // Clear saved data
    const clearSave = useCallback(() => {
        localStorage.removeItem(`autosave_${key}`);
        setLastSaved(null);
    }, [key]);

    return {
        lastSaved,
        isSaving,
        saveNow,
        clearSave,
    };
}

// ============================================
// 2. LOCAL STORAGE BACKUP SYSTEM
// ============================================

interface StorageData<T> {
    data: T;
    timestamp: string;
    version: number;
    synced: boolean;
}

class LocalStorageBackup {
    private prefix = 'essaypro_';

    // Save data with backup
    save<T>(key: string, data: T): void {
        if (typeof window === 'undefined') return;
        try {
            const storageData: StorageData<T> = {
                data,
                timestamp: new Date().toISOString(),
                version: 1,
                synced: false,
            };
            localStorage.setItem(this.prefix + key, JSON.stringify(storageData));
        } catch (error) {
            console.error('LocalStorage save failed:', error);
            // If quota exceeded, try to clear old data
            if (error instanceof DOMException && error.code === 22) {
                this.clearOldData();
                // Retry once
                try {
                    localStorage.setItem(this.prefix + key, JSON.stringify({ data, timestamp: new Date().toISOString(), version: 1, synced: false }));
                } catch {
                    console.error('Failed to save even after clearing old data');
                }
            }
        }
    }

    // Load data
    load<T>(key: string): T | null {
        if (typeof window === 'undefined') return null;
        try {
            const item = localStorage.getItem(this.prefix + key);
            if (!item) return null;
            const parsed: StorageData<T> = JSON.parse(item);
            return parsed.data;
        } catch (error) {
            console.error('LocalStorage load failed:', error);
            return null;
        }
    }

    // Load with metadata
    loadWithMeta<T>(key: string): StorageData<T> | null {
        if (typeof window === 'undefined') return null;
        try {
            const item = localStorage.getItem(this.prefix + key);
            if (!item) return null;
            return JSON.parse(item);
        } catch (error) {
            console.error('LocalStorage load failed:', error);
            return null;
        }
    }

    // Delete data
    delete(key: string): void {
        if (typeof window === 'undefined') return;
        localStorage.removeItem(this.prefix + key);
    }

    // Get all keys
    getAllKeys(): string[] {
        if (typeof window === 'undefined') return [];
        const keys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(this.prefix)) {
                keys.push(key.replace(this.prefix, ''));
            }
        }
        return keys;
    }

    // Clear old data (older than 30 days)
    clearOldData(): void {
        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        const keys = this.getAllKeys();

        keys.forEach(key => {
            const meta = this.loadWithMeta(key);
            if (meta && new Date(meta.timestamp).getTime() < thirtyDaysAgo) {
                this.delete(key);
            }
        });
    }

    // Get unsynced items (for offline -> online sync)
    getUnsyncedItems(): { key: string; data: unknown }[] {
        const keys = this.getAllKeys();
        const unsynced: { key: string; data: unknown }[] = [];

        keys.forEach(key => {
            const meta = this.loadWithMeta(key);
            if (meta && !meta.synced) {
                unsynced.push({ key, data: meta.data });
            }
        });

        return unsynced;
    }

    // Mark as synced
    markSynced(key: string): void {
        if (typeof window === 'undefined') return;
        const meta = this.loadWithMeta(key);
        if (meta) {
            meta.synced = true;
            localStorage.setItem(this.prefix + key, JSON.stringify(meta));
        }
    }
}

export const storage = new LocalStorageBackup();

// ============================================
// 3. ESSAY STORAGE HELPERS
// ============================================

export interface EssayDraft {
    collegeId: string;
    essayId: string;
    content: string;
    wordCount: number;
    lastModified: string;
}

export const essayStorage = {
    saveEssay(collegeId: string, essayId: string, content: string) {
        const key = `essay_${collegeId}_${essayId}`;
        const draft: EssayDraft = {
            collegeId,
            essayId,
            content,
            wordCount: content.trim().split(/\s+/).filter(Boolean).length,
            lastModified: new Date().toISOString(),
        };
        storage.save(key, draft);
    },

    loadEssay(collegeId: string, essayId: string): EssayDraft | null {
        const key = `essay_${collegeId}_${essayId}`;
        return storage.load(key);
    },

    getAllEssays(): EssayDraft[] {
        const keys = storage.getAllKeys().filter(k => k.startsWith('essay_'));
        return keys
            .map(k => storage.load<EssayDraft>(k))
            .filter((e): e is EssayDraft => e !== null);
    },

    deleteEssay(collegeId: string, essayId: string): void {
        const key = `essay_${collegeId}_${essayId}`;
        storage.delete(key);
    },
};

// ============================================
// 4. ACTIVITY STORAGE
// ============================================

import { Activity, Achievement } from '@/types/common';
export type { Activity, Achievement };

export const activityStorage = {
    saveActivities(activities: Activity[]) {
        storage.save('user_activities', activities);
    },

    loadActivities(): Activity[] {
        return storage.load('user_activities') || [];
    },

    addActivity(activity: Activity) {
        const activities = this.loadActivities();
        activities.push(activity);
        this.saveActivities(activities);
    },

    removeActivity(id: string) {
        const activities = this.loadActivities().filter(a => a.id !== id);
        this.saveActivities(activities);
    },
};

// ============================================
// 4B. ACHIEVEMENT STORAGE
// ============================================

// Achievement interface moved to types

export const achievementStorage = {
    saveAchievements(achievements: Achievement[]) {
        storage.save('user_achievements', achievements);
    },

    loadAchievements(): Achievement[] {
        return storage.load('user_achievements') || [];
    },

    addAchievement(achievement: Achievement) {
        const list = this.loadAchievements();
        list.push(achievement);
        this.saveAchievements(list);
    },

    removeAchievement(id: string) {
        const list = this.loadAchievements().filter(a => a.id !== id);
        this.saveAchievements(list);
    },
};

// ============================================
// 5. USER PROFILE STORAGE
// ============================================

export interface UserProfile {
    name?: string;
    gpa?: string | number;
    major?: string;
    currentSchool?: string;
    graduationYear?: string | number;
    values?: string[];
    interests?: string[];
}

export const profileStorage = {
    saveProfile(profile: UserProfile) {
        storage.save('user_profile', profile);
    },

    loadProfile(): UserProfile | null {
        return storage.load('user_profile');
    },
};

// ============================================
// 6. MATCH ANALYSIS STORAGE
// ============================================

export interface MatchAnalysis {
    collegeId: string;
    overallScore: number;
    categoryScores: Record<string, number>;
    strengths: string[];
    improvements: string[];
    suggestions: string[];
    collegeSpecific: string;
    oneThingToFix: string;
    lastUpdated: string;
}

export const matchAnalysisStorage = {
    saveAnalysis(collegeId: string, analysis: Omit<MatchAnalysis, 'collegeId' | 'lastUpdated'>) {
        const key = `match_analysis_${collegeId}`;
        const data: MatchAnalysis = {
            ...analysis,
            collegeId,
            lastUpdated: new Date().toISOString(),
        };
        storage.save(key, data);
    },

    loadAnalysis(collegeId: string): MatchAnalysis | null {
        const key = `match_analysis_${collegeId}`;
        return storage.load(key);
    },

    getAllAnalyses(): MatchAnalysis[] {
        const keys = storage.getAllKeys().filter(k => k.startsWith('match_analysis_'));
        return keys
            .map(k => storage.load<MatchAnalysis>(k))
            .filter((a): a is MatchAnalysis => a !== null);
    },

    clearAllAnalyses() {
        const keys = storage.getAllKeys().filter(k => k.startsWith('match_analysis_'));
        keys.forEach(k => storage.delete(k));
    },
};

// ============================================
// 6B. ESSAY VERSION HISTORY STORAGE
// ============================================

export interface EssayVersion {
    id: string;
    collegeId: string;
    essayId: string;
    version: number;
    originalContent: string;
    updatedContent: string;
    feedbackApplied: string[];
    timestamp: string;
    wordCountBefore: number;
    wordCountAfter: number;
}

export const essayVersionStorage = {
    saveVersion(
        collegeId: string,
        essayId: string,
        original: string,
        updated: string,
        feedback: string[]
    ): EssayVersion {
        const versions = this.getVersions(collegeId, essayId);
        const newVersion: EssayVersion = {
            id: `${collegeId}-${essayId}-v${versions.length + 1}`,
            collegeId,
            essayId,
            version: versions.length + 1,
            originalContent: original,
            updatedContent: updated,
            feedbackApplied: feedback,
            timestamp: new Date().toISOString(),
            wordCountBefore: original.trim().split(/\s+/).filter(Boolean).length,
            wordCountAfter: updated.trim().split(/\s+/).filter(Boolean).length,
        };
        const key = `essay_versions_${collegeId}_${essayId}`;
        storage.save(key, [...versions, newVersion]);
        return newVersion;
    },

    getVersions(collegeId: string, essayId: string): EssayVersion[] {
        const key = `essay_versions_${collegeId}_${essayId}`;
        return storage.load(key) || [];
    },

    getLatestVersion(collegeId: string, essayId: string): EssayVersion | null {
        const versions = this.getVersions(collegeId, essayId);
        return versions.length > 0 ? versions[versions.length - 1] : null;
    },

    getAllVersions(): EssayVersion[] {
        const keys = storage.getAllKeys().filter(k => k.startsWith('essay_versions_'));
        const allVersions: EssayVersion[] = [];
        keys.forEach(k => {
            const versions = storage.load<EssayVersion[]>(k);
            if (versions) allVersions.push(...versions);
        });
        return allVersions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    },

    clearVersions(collegeId: string, essayId: string) {
        const key = `essay_versions_${collegeId}_${essayId}`;
        storage.delete(key);
    },
};

// ============================================
// 7. AUTOMATION HISTORY STORAGE
// ============================================

export interface AutomationLog {
    id: string;
    collegeId: string;
    collegeName: string;
    taskType: string;
    essayPrompt: string;
    status: 'completed' | 'failed';
    result?: string;
    score?: number;
    timestamp: string;
}

export const automationHistoryStorage = {
    addLog(log: Omit<AutomationLog, 'id' | 'timestamp'>) {
        const history = this.getHistory();
        const newLog: AutomationLog = {
            ...log,
            id: Math.random().toString(36).substr(2, 9),
            timestamp: new Date().toISOString(),
        };
        // Keep last 100 logs
        const updated = [newLog, ...history].slice(0, 100);
        storage.save('automation_history', updated);
    },

    getHistory(): AutomationLog[] {
        return storage.load('automation_history') || [];
    },

    clearHistory() {
        storage.delete('automation_history');
    }
};

// ============================================
// 8. ONLINE/OFFLINE DETECTION
// ============================================

export function useOnlineStatus() {
    const [isOnline, setIsOnline] = useState(
        typeof navigator !== 'undefined' ? navigator.onLine : true
    );

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return isOnline;
}

// ============================================
// 7. SYNC MANAGER (for when back online)
// ============================================

export async function syncPendingChanges(
    syncFn: (key: string, data: unknown) => Promise<void>
) {
    const unsynced = storage.getUnsyncedItems();

    for (const item of unsynced) {
        try {
            await syncFn(item.key, item.data);
            storage.markSynced(item.key);
        } catch (error) {
            console.error(`Failed to sync ${item.key}:`, error);
        }
    }
}
