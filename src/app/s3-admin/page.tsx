'use client';

import { useState, useEffect } from 'react';
import { Card, Button } from '@/components/ui';
import { RefreshCw, Database, ArrowRight, CheckCircle, XCircle } from 'lucide-react';

/**
 * S3 ADMIN PAGE
 * Diagnostics and migration for S3 storage
 */

interface S3Status {
    configured: boolean;
    bucket?: string;
    totalKeys: number;
    allKeys: string[];
    oldKeys: string[];
    newKeys: string[];
    needsMigration: boolean;
    suggestion?: string;
}

interface MigrationResult {
    from: string;
    to: string;
    status: 'migrated' | 'not_found' | 'error' | 'failed';
    recordCount?: number;
    error?: string;
}

export default function S3AdminPage() {
    const [status, setStatus] = useState<S3Status | null>(null);
    const [loading, setLoading] = useState(false);
    const [migrating, setMigrating] = useState(false);
    const [migrationResults, setMigrationResults] = useState<MigrationResult[] | null>(null);

    const checkStatus = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/s3-migrate');
            const data = await res.json();
            setStatus(data);
        } catch (error) {
            console.error('Failed to check S3 status:', error);
        } finally {
            setLoading(false);
        }
    };

    const runMigration = async () => {
        setMigrating(true);
        try {
            const res = await fetch('/api/s3-migrate', { method: 'POST' });
            const data = await res.json();
            setMigrationResults(data.results || []);
            // Refresh status after migration
            await checkStatus();
        } catch (error) {
            console.error('Migration failed:', error);
        } finally {
            setMigrating(false);
        }
    };

    useEffect(() => {
        checkStatus();
    }, []);

    return (
        <div className="container mx-auto p-6 max-w-5xl">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold mb-2">S3 Storage Admin</h1>
                    <p className="text-gray-600">Diagnostics and migration for AWS S3 storage</p>
                </div>
                <Button onClick={checkStatus} disabled={loading} variant="secondary">
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Status Card */}
            <Card className="p-6 mb-6">
                <div className="flex items-center gap-3 mb-4">
                    <Database className="w-6 h-6" />
                    <h2 className="text-xl font-semibold">S3 Configuration</h2>
                </div>

                {status ? (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            {status.configured ? (
                                <CheckCircle className="w-5 h-5 text-green-500" />
                            ) : (
                                <XCircle className="w-5 h-5 text-red-500" />
                            )}
                            <span className="font-medium">
                                {status.configured ? 'S3 Configured' : 'S3 Not Configured'}
                            </span>
                        </div>

                        {status.configured && status.bucket && (
                            <>
                                <div className="text-sm text-gray-600">
                                    <strong>Bucket:</strong> {status.bucket}
                                </div>
                                <div className="text-sm text-gray-600">
                                    <strong>Total Keys:</strong> {status.totalKeys}
                                </div>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="text-gray-500">Loading...</div>
                )}
            </Card>

            {/* Keys Analysis */}
            {status?.configured && (
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <Card className="p-6">
                        <h3 className="font-semibold mb-3 text-yellow-700">Old Keys Found</h3>
                        {status.oldKeys.length > 0 ? (
                            <div className="space-y-2">
                                <div className="text-2xl font-bold text-yellow-600">
                                    {status.oldKeys.length}
                                </div>
                                <div className="text-xs text-gray-600 space-y-1">
                                    {status.oldKeys.slice(0, 3).map((key, i) => (
                                        <div key={i} className="truncate">{key}</div>
                                    ))}
                                    {status.oldKeys.length > 3 && (
                                        <div>... and {status.oldKeys.length - 3} more</div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="text-gray-500">No old keys found</div>
                        )}
                    </Card>

                    <Card className="p-6">
                        <h3 className="font-semibold mb-3 text-green-700">New Keys Found</h3>
                        {status.newKeys.length > 0 ? (
                            <div className="space-y-2">
                                <div className="text-2xl font-bold text-green-600">
                                    {status.newKeys.length}
                                </div>
                                <div className="text-xs text-gray-600 space-y-1">
                                    {status.newKeys.slice(0, 3).map((key, i) => (
                                        <div key={i} className="truncate">{key}</div>
                                    ))}
                                    {status.newKeys.length > 3 && (
                                        <div>... and {status.newKeys.length - 3} more</div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="text-gray-500">No new keys found</div>
                        )}
                    </Card>
                </div>
            )}

            {/* Migration Section */}
            {status?.needsMigration && (
                <Card className="p-6 mb-6 bg-yellow-50 border-yellow-200">
                    <h3 className="font-semibold mb-2 text-yellow-900">Migration Required</h3>
                    <p className="text-sm text-yellow-800 mb-4">
                        Old storage keys detected. Click below to migrate data to the new centralized key structure.
                    </p>
                    <Button
                        onClick={runMigration}
                        disabled={migrating}
                        className="bg-yellow-600 hover:bg-yellow-700"
                    >
                        {migrating ? (
                            <>
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                Migrating...
                            </>
                        ) : (
                            <>
                                <ArrowRight className="w-4 h-4 mr-2" />
                                Run Migration
                            </>
                        )}
                    </Button>
                </Card>
            )}

            {/* Migration Results */}
            {migrationResults && (
                <Card className="p-6">
                    <h3 className="font-semibold mb-4">Migration Results</h3>
                    <div className="space-y-2">
                        {migrationResults.map((result, i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                                <div className="flex items-center gap-3">
                                    {result.status === 'migrated' ? (
                                        <CheckCircle className="w-5 h-5 text-green-500" />
                                    ) : result.status === 'not_found' ? (
                                        <div className="w-5 h-5 text-gray-400">-</div>
                                    ) : (
                                        <XCircle className="w-5 h-5 text-red-500" />
                                    )}
                                    <div>
                                        <div className="font-medium text-sm">
                                            {result.from} → {result.to}
                                        </div>
                                        {result.status === 'migrated' && result.recordCount && (
                                            <div className="text-xs text-gray-600">
                                                {result.recordCount} records migrated
                                            </div>
                                        )}
                                        {result.error && (
                                            <div className="text-xs text-red-600">{result.error}</div>
                                        )}
                                    </div>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded ${
                                    result.status === 'migrated' ? 'bg-green-100 text-green-800' :
                                    result.status === 'not_found' ? 'bg-gray-100 text-gray-600' :
                                    'bg-red-100 text-red-800'
                                }`}>
                                    {result.status}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
                        <p className="text-sm text-green-800">
                            ✓ Migration complete! Refresh your activities page to see the data.
                        </p>
                        <a
                            href="/activities"
                            className="inline-block mt-2 text-sm font-medium text-green-700 hover:text-green-900"
                        >
                            Go to Activities →
                        </a>
                    </div>
                </Card>
            )}

            {/* All Keys Debug */}
            {status?.allKeys && status.allKeys.length > 0 && (
                <Card className="p-6 mt-6">
                    <h3 className="font-semibold mb-3">All S3 Keys ({status.allKeys.length})</h3>
                    <div className="max-h-64 overflow-y-auto bg-gray-50 p-3 rounded text-xs font-mono space-y-1">
                        {status.allKeys.map((key, i) => (
                            <div key={i}>{key}</div>
                        ))}
                    </div>
                </Card>
            )}
        </div>
    );
}
