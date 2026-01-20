'use client';

import { useState, useEffect, useCallback } from 'react';

// ============================================
// S3 Storage Hook
// Connects frontend to /api/storage endpoint
// ============================================

interface UseS3StorageOptions<T> {
    defaultValue: T;
    onLoad?: (data: T) => void;
    onSave?: (data: T) => void;
    onError?: (error: Error) => void;
}

interface UseS3StorageReturn<T> {
    data: T;
    setData: (data: T | ((prev: T) => T)) => void;
    isLoading: boolean;
    isSaving: boolean;
    error: Error | null;
    save: () => Promise<void>;
    refresh: () => Promise<void>;
    lastSaved: Date | null;
}

export function useS3Storage<T>(
    key: string,
    options: UseS3StorageOptions<T>
): UseS3StorageReturn<T> {
    const { defaultValue, onLoad, onSave, onError } = options;

    const [data, setDataInternal] = useState<T>(defaultValue);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [hasChanges, setHasChanges] = useState(false);

    // Load data on mount
    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            setError(null);

            try {
                // Try S3 first
                const response = await fetch(`/api/storage?key=${encodeURIComponent(key)}`);

                if (response.ok) {
                    const result = await response.json();
                    if (result !== null) {
                        setDataInternal(result);
                        onLoad?.(result);
                        // Also cache in localStorage
                        localStorage.setItem(`s3_cache_${key}`, JSON.stringify(result));
                    } else {
                        // No data in S3, try localStorage fallback
                        const cached = localStorage.getItem(`s3_cache_${key}`);
                        if (cached) {
                            const parsed = JSON.parse(cached);
                            setDataInternal(parsed);
                            onLoad?.(parsed);
                        } else {
                            setDataInternal(defaultValue);
                        }
                    }
                } else if (response.status === 404) {
                    // No data exists yet, use default
                    const cached = localStorage.getItem(`s3_cache_${key}`);
                    if (cached) {
                        const parsed = JSON.parse(cached);
                        setDataInternal(parsed);
                        onLoad?.(parsed);
                    } else {
                        setDataInternal(defaultValue);
                    }
                } else {
                    throw new Error(`Failed to load: ${response.statusText}`);
                }
            } catch (err) {
                console.error('S3 load error:', err);
                // Fallback to localStorage
                const cached = localStorage.getItem(`s3_cache_${key}`);
                if (cached) {
                    const parsed = JSON.parse(cached);
                    setDataInternal(parsed);
                    onLoad?.(parsed);
                } else {
                    setDataInternal(defaultValue);
                }
                setError(err instanceof Error ? err : new Error('Failed to load data'));
                onError?.(err instanceof Error ? err : new Error('Failed to load data'));
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

    // Set data with change tracking
    const setData = useCallback((updater: T | ((prev: T) => T)) => {
        setDataInternal(prev => {
            const newData = typeof updater === 'function'
                ? (updater as (prev: T) => T)(prev)
                : updater;
            setHasChanges(true);
            // Cache immediately in localStorage
            localStorage.setItem(`s3_cache_${key}`, JSON.stringify(newData));
            return newData;
        });
    }, [key]);

    // Save to S3
    const save = useCallback(async () => {
        if (isSaving) return;

        setIsSaving(true);
        setError(null);

        try {
            const response = await fetch('/api/storage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key, value: data }),
            });

            if (!response.ok) {
                throw new Error(`Failed to save: ${response.statusText}`);
            }

            setLastSaved(new Date());
            setHasChanges(false);
            onSave?.(data);
        } catch (err) {
            console.error('S3 save error:', err);
            setError(err instanceof Error ? err : new Error('Failed to save data'));
            onError?.(err instanceof Error ? err : new Error('Failed to save data'));
            // Data is still in localStorage, so not lost
        } finally {
            setIsSaving(false);
        }
    }, [key, data, isSaving, onSave, onError]);

    // Auto-save when data changes (debounced)
    useEffect(() => {
        if (!hasChanges) return;

        const timer = setTimeout(() => {
            save();
        }, 2000); // 2 second debounce

        return () => clearTimeout(timer);
    }, [data, hasChanges, save]);

    // Refresh from S3
    const refresh = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/storage?key=${encodeURIComponent(key)}`);
            if (response.ok) {
                const result = await response.json();
                if (result !== null) {
                    setDataInternal(result);
                    localStorage.setItem(`s3_cache_${key}`, JSON.stringify(result));
                }
            }
        } catch (err) {
            console.error('Refresh error:', err);
        } finally {
            setIsLoading(false);
        }
    }, [key]);

    return {
        data,
        setData,
        isLoading,
        isSaving,
        error,
        save,
        refresh,
        lastSaved,
    };
}

// ============================================
// Simple Storage Functions (for non-hook usage)
// ============================================

export async function getFromS3<T>(key: string): Promise<T | null> {
    try {
        const response = await fetch(`/api/storage?key=${encodeURIComponent(key)}`);
        if (response.ok) {
            const data = await response.json();
            if (data !== null) return data;
        }

        // Fallback to localStorage
        if (typeof window !== 'undefined') {
            const cached = localStorage.getItem(`s3_cache_${key}`);
            if (cached) {
                try {
                    return JSON.parse(cached);
                } catch {
                    return null;
                }
            }
        }
        return null;
    } catch {
        // Even on network error, try localStorage
        if (typeof window !== 'undefined') {
            const cached = localStorage.getItem(`s3_cache_${key}`);
            if (cached) {
                try {
                    return JSON.parse(cached);
                } catch {
                    return null;
                }
            }
        }
        return null;
    }
}

export async function saveToS3<T>(key: string, value: T): Promise<boolean> {
    try {
        const response = await fetch('/api/storage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key, value }),
        });
        return response.ok;
    } catch {
        return false;
    }
}

export async function deleteFromS3(key: string): Promise<boolean> {
    try {
        const response = await fetch(`/api/storage?key=${encodeURIComponent(key)}`, {
            method: 'DELETE',
        });
        return response.ok;
    } catch {
        return false;
    }
}
