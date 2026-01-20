'use client';

// ============================================
// SCRAPER ERROR MODAL
// Displays detailed error information from failed scrapers
// ============================================

import { ScraperError } from '@/lib/automation/errors';
import { Button, Card } from '@/components/ui';
import { X, AlertCircle, RefreshCw, Info } from 'lucide-react';

interface Props {
    errors: ScraperError[];
    onClose: () => void;
    onRetry?: () => void;
}

export function ScraperErrorModal({ errors, onClose, onRetry }: Props) {
    const retryableErrors = errors.filter(e => e.retryable);
    const nonRetryableErrors = errors.filter(e => !e.retryable);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl max-h-[80vh] overflow-hidden"
                onClick={e => e.stopPropagation()}
                style={{ width: '90%', maxWidth: '800px' }}
            >
                {/* Header */}
                <div
                    className="flex items-center justify-between p-6 border-b"
                    style={{ borderColor: 'var(--border)' }}
                >
                    <div className="flex items-center gap-3">
                        <AlertCircle className="w-6 h-6 text-red-500" />
                        <h2 className="text-2xl font-bold">
                            Scraper Errors ({errors.length})
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Error List */}
                <div className="p-6 overflow-y-auto" style={{ maxHeight: '500px' }}>
                    {retryableErrors.length > 0 && (
                        <div className="mb-6">
                            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                <RefreshCw className="w-5 h-5 text-yellow-500" />
                                Retryable Errors ({retryableErrors.length})
                            </h3>
                            <div className="space-y-3">
                                {retryableErrors.map((err, i) => (
                                    <ErrorCard key={i} error={err} />
                                ))}
                            </div>
                        </div>
                    )}

                    {nonRetryableErrors.length > 0 && (
                        <div>
                            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                <AlertCircle className="w-5 h-5 text-red-500" />
                                Non-Retryable Errors ({nonRetryableErrors.length})
                            </h3>
                            <div className="space-y-3">
                                {nonRetryableErrors.map((err, i) => (
                                    <ErrorCard key={i} error={err} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div
                    className="flex items-center justify-between p-6 border-t"
                    style={{ borderColor: 'var(--border)' }}
                >
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                        {retryableErrors.length > 0 && (
                            <span className="flex items-center gap-2">
                                <Info className="w-4 h-4" />
                                {retryableErrors.length} error(s) can be retried automatically
                            </span>
                        )}
                    </div>
                    <div className="flex gap-3">
                        {retryableErrors.length > 0 && onRetry && (
                            <Button
                                variant="primary"
                                onClick={() => {
                                    onRetry();
                                    onClose();
                                }}
                                icon={<RefreshCw className="w-4 h-4" />}
                            >
                                Retry {retryableErrors.length} Failed Scrapers
                            </Button>
                        )}
                        <Button variant="secondary" onClick={onClose}>
                            Close
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ErrorCard({ error }: { error: ScraperError }) {
    return (
        <Card className="p-4">
            <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-red-600 dark:text-red-400">
                        {error.code}
                    </span>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {error.scraper}
                    </span>
                </div>
                {error.retryable ? (
                    <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded text-xs font-medium">
                        Retryable
                    </span>
                ) : (
                    <span className="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded text-xs font-medium">
                        Manual Fix Required
                    </span>
                )}
            </div>

            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                {error.getUserMessage()}
            </p>

            <div className="bg-gray-50 dark:bg-gray-900 rounded p-3 mb-2">
                <p className="text-xs font-mono text-gray-600 dark:text-gray-400">
                    {error.message}
                </p>
            </div>

            <p className="text-sm text-blue-600 dark:text-blue-400 flex items-center gap-2">
                <Info className="w-4 h-4" />
                {error.getSuggestedAction()}
            </p>
        </Card>
    );
}
