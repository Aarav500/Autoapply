'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, X } from 'lucide-react';

/**
 * MIGRATION BANNER
 * Shows at top of page if user has data in old storage keys that needs migration
 */

export function MigrationBanner() {
    const [needsMigration, setNeedsMigration] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        // Check if banner was dismissed
        const wasDismissed = sessionStorage.getItem('migration-banner-dismissed');
        if (wasDismissed) {
            setDismissed(true);
            return;
        }

        // Check for old data
        const oldKeys = [
            's3_cache_activities',
            's3_cache_achievements',
            's3_cache_cv-profile',
        ];

        const hasOldData = oldKeys.some(key => {
            const data = localStorage.getItem(key);
            if (!data) return false;

            // Check if new key already has data
            const newKey = key === 's3_cache_activities' ? 's3_cache_activities/all' :
                           key === 's3_cache_achievements' ? 's3_cache_achievements/all' :
                           's3_cache_cv/profile';

            return !localStorage.getItem(newKey);
        });

        setNeedsMigration(hasOldData);
    }, []);

    const handleDismiss = () => {
        sessionStorage.setItem('migration-banner-dismissed', 'true');
        setDismissed(true);
    };

    if (!needsMigration || dismissed) return null;

    return (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <div className="flex items-start gap-3 max-w-6xl mx-auto">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                    <h3 className="font-semibold text-yellow-900 mb-1">
                        Data Migration Available
                    </h3>
                    <p className="text-sm text-yellow-800 mb-2">
                        We've updated the storage system. Your activities and data are safe, but need to be
                        migrated to the new format.
                    </p>
                    <a
                        href="/migrate-storage"
                        className="inline-block px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded hover:bg-yellow-700 transition-colors"
                    >
                        Migrate Now (1 minute)
                    </a>
                </div>
                <button
                    onClick={handleDismiss}
                    className="text-yellow-600 hover:text-yellow-800 transition-colors"
                    aria-label="Dismiss"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}
