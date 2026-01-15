'use client';

import { useState, useEffect } from 'react';
import { Card, Button } from '@/components/ui';
import { STORAGE_KEYS } from '@/lib/s3-storage';

/**
 * STORAGE MIGRATION PAGE
 *
 * Helps users migrate data from old localStorage keys to new centralized keys
 * after the storage system update.
 */

interface MigrationStatus {
    oldKey: string;
    newKey: string;
    hasOldData: boolean;
    hasNewData: boolean;
    oldCount?: number;
    needsMigration: boolean;
}

export default function MigrateStoragePage() {
    const [status, setStatus] = useState<MigrationStatus[]>([]);
    const [migrating, setMigrating] = useState(false);
    const [complete, setComplete] = useState(false);

    // Migration map: old key -> new key
    const migrationMap: Record<string, string> = {
        's3_cache_activities': `s3_cache_${STORAGE_KEYS.ACTIVITIES}`,
        's3_cache_achievements': `s3_cache_${STORAGE_KEYS.ACHIEVEMENTS}`,
        's3_cache_cv-profile': `s3_cache_${STORAGE_KEYS.CV_PROFILE}`,
        's3_cache_user-profile': `s3_cache_${STORAGE_KEYS.USER_PROFILE}`,
        's3_cache_profile': `s3_cache_${STORAGE_KEYS.USER_PROFILE}`,
        's3_cache_enhanced-jobs': `s3_cache_${STORAGE_KEYS.JOBS_ALL}`,
        's3_cache_saved-job-ids': `s3_cache_${STORAGE_KEYS.SAVED_JOB_IDS}`,
        's3_cache_applied-job-ids': `s3_cache_${STORAGE_KEYS.APPLIED_JOB_IDS}`,
        's3_cache_enhanced-scholarships': `s3_cache_${STORAGE_KEYS.SCHOLARSHIPS_ALL}`,
        's3_cache_saved-scholarship-ids': `s3_cache_${STORAGE_KEYS.SAVED_SCHOLARSHIP_IDS}`,
        's3_cache_applied-scholarship-ids': `s3_cache_${STORAGE_KEYS.APPLIED_SCHOLARSHIP_IDS}`,
        's3_cache_essays': `s3_cache_${STORAGE_KEYS.ESSAYS}`,
        's3_cache_analytics-events': `s3_cache_${STORAGE_KEYS.ANALYTICS_EVENTS}`,
        's3_cache_deadlines': `s3_cache_${STORAGE_KEYS.DEADLINES}`,
    };

    // Check status on mount
    useEffect(() => {
        checkStatus();
    }, []);

    const checkStatus = () => {
        if (typeof window === 'undefined') return;

        const statusList: MigrationStatus[] = [];

        Object.entries(migrationMap).forEach(([oldKey, newKey]) => {
            const oldData = localStorage.getItem(oldKey);
            const newData = localStorage.getItem(newKey);

            let oldCount: number | undefined;
            if (oldData) {
                try {
                    const parsed = JSON.parse(oldData);
                    if (Array.isArray(parsed)) {
                        oldCount = parsed.length;
                    }
                } catch {
                    // Not JSON or not array
                }
            }

            statusList.push({
                oldKey: oldKey.replace('s3_cache_', ''),
                newKey: newKey.replace('s3_cache_', ''),
                hasOldData: !!oldData,
                hasNewData: !!newData,
                oldCount,
                needsMigration: !!oldData && !newData,
            });
        });

        setStatus(statusList.filter(s => s.hasOldData || s.hasNewData));
    };

    const runMigration = () => {
        if (typeof window === 'undefined') return;

        setMigrating(true);

        let migratedCount = 0;

        Object.entries(migrationMap).forEach(([oldKey, newKey]) => {
            const oldData = localStorage.getItem(oldKey);
            const newData = localStorage.getItem(newKey);

            // Only migrate if old data exists and new doesn't
            if (oldData && !newData) {
                localStorage.setItem(newKey, oldData);
                migratedCount++;
                console.log(`✓ Migrated: ${oldKey} → ${newKey}`);
            }
        });

        setMigrating(false);
        setComplete(true);
        checkStatus();

        console.log(`✓ Migration complete! Migrated ${migratedCount} keys.`);
    };

    const needsMigration = status.some(s => s.needsMigration);

    return (
        <div className="container mx-auto p-6 max-w-4xl">
            <h1 className="text-3xl font-bold mb-2">Storage Migration</h1>
            <p className="text-gray-600 mb-6">
                Migrate your data from old storage keys to the new centralized system.
            </p>

            {/* Status Cards */}
            <div className="grid gap-4 mb-6">
                {/* Summary Card */}
                <Card className="p-6">
                    <h2 className="text-xl font-semibold mb-4">Migration Status</h2>
                    {status.length === 0 ? (
                        <p className="text-gray-600">No data found in localStorage.</p>
                    ) : (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${needsMigration ? 'bg-yellow-500' : 'bg-green-500'}`} />
                                <span>
                                    {needsMigration
                                        ? `${status.filter(s => s.needsMigration).length} keys need migration`
                                        : 'All data migrated successfully'}
                                </span>
                            </div>
                            <div className="text-sm text-gray-600">
                                {status.filter(s => s.hasNewData).length} keys using new system
                            </div>
                        </div>
                    )}
                </Card>

                {/* Detailed Status */}
                {status.map((item, i) => (
                    <Card key={i} className="p-4">
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <div className="font-medium mb-1">{item.oldKey}</div>
                                <div className="text-sm text-gray-600 mb-2">
                                    → {item.newKey}
                                </div>
                                <div className="flex gap-4 text-xs">
                                    <span className={item.hasOldData ? 'text-yellow-600' : 'text-gray-400'}>
                                        Old: {item.hasOldData ? `✓ ${item.oldCount ? `(${item.oldCount} items)` : ''}` : '✗'}
                                    </span>
                                    <span className={item.hasNewData ? 'text-green-600' : 'text-gray-400'}>
                                        New: {item.hasNewData ? '✓' : '✗'}
                                    </span>
                                </div>
                            </div>
                            {item.needsMigration && (
                                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                                    Needs Migration
                                </span>
                            )}
                        </div>
                    </Card>
                ))}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
                {needsMigration && !complete && (
                    <Button
                        onClick={runMigration}
                        disabled={migrating}
                        className="flex-1"
                    >
                        {migrating ? 'Migrating...' : 'Run Migration'}
                    </Button>
                )}

                {complete && (
                    <Button
                        onClick={() => window.location.href = '/activities'}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                        ✓ Migration Complete - Go to Activities
                    </Button>
                )}

                <Button
                    variant="secondary"
                    onClick={checkStatus}
                    className="px-6"
                >
                    Refresh Status
                </Button>
            </div>

            {/* Info */}
            <Card className="mt-6 p-4 bg-blue-50">
                <h3 className="font-semibold mb-2">What does this do?</h3>
                <p className="text-sm text-gray-700">
                    This page migrates your activities, achievements, and profile data from the old storage
                    keys (like <code className="bg-white px-1 rounded">activities</code>) to the new centralized
                    keys (like <code className="bg-white px-1 rounded">activities/all</code>).
                </p>
                <p className="text-sm text-gray-700 mt-2">
                    Your original data is kept safe - we only copy it to the new location. After migration,
                    refresh any open pages to see your data.
                </p>
            </Card>
        </div>
    );
}
