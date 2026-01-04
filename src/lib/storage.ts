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
        localStorage.removeItem(this.prefix + key);
    }

    // Get all keys
    getAllKeys(): string[] {
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

export interface Activity {
    id: string;
    name: string;
    description: string;
    hours: number;
    years: string;
    type: string;
    skills: string[];
    impact: string;
}

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
// 5. USER PROFILE STORAGE
// ============================================

export interface UserProfile {
    name: string;
    gpa: number;
    major: string;
    currentSchool: string;
    graduationYear: number;
    values: string[];
    interests: string[];
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
// 6. ONLINE/OFFLINE DETECTION
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
