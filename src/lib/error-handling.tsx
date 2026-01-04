'use client';

import React, { Component, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import Link from 'next/link';

// ============================================
// ERROR BOUNDARY COMPONENT
// ============================================

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        this.setState({ errorInfo });
        this.props.onError?.(error, errorInfo);

        // Log to console in development
        console.error('Error caught by boundary:', error);
        console.error('Error info:', errorInfo);

        // In production, you would send to error tracking service
        // sendToErrorTracking(error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="min-h-[400px] flex items-center justify-center p-8"
                >
                    <div className="text-center max-w-md">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', delay: 0.1 }}
                            className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center"
                            style={{ background: 'rgba(239, 68, 68, 0.15)' }}
                        >
                            <AlertTriangle className="w-10 h-10" style={{ color: 'var(--error)' }} />
                        </motion.div>

                        <h2 className="text-2xl font-bold mb-2">Oops! Something went wrong</h2>
                        <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
                            Don't worry, your work is saved. Try refreshing or go back to the dashboard.
                        </p>

                        <div className="flex gap-3 justify-center mb-6">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={this.handleRetry}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium"
                                style={{
                                    background: 'var(--gradient-primary)',
                                    color: 'white'
                                }}
                            >
                                <RefreshCw className="w-4 h-4" />
                                Try Again
                            </motion.button>

                            <Link href="/">
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium"
                                    style={{
                                        background: 'var(--bg-secondary)',
                                        color: 'var(--text-primary)'
                                    }}
                                >
                                    <Home className="w-4 h-4" />
                                    Dashboard
                                </motion.button>
                            </Link>
                        </div>

                        {/* Error details (collapsible in production) */}
                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <details className="text-left mt-4 p-4 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
                                <summary className="cursor-pointer flex items-center gap-2 text-sm font-medium">
                                    <Bug className="w-4 h-4" />
                                    Error Details (Dev Only)
                                </summary>
                                <pre className="mt-2 text-xs overflow-auto p-2 rounded" style={{ background: 'var(--bg-tertiary)' }}>
                                    {this.state.error.toString()}
                                    {this.state.errorInfo?.componentStack}
                                </pre>
                            </details>
                        )}
                    </div>
                </motion.div>
            );
        }

        return this.props.children;
    }
}

// ============================================
// PAGE ERROR BOUNDARY WRAPPER
// ============================================

export function PageErrorBoundary({ children }: { children: ReactNode }) {
    return (
        <ErrorBoundary
            onError={(error, errorInfo) => {
                // Could send to analytics/error tracking
                console.error('Page error:', error.message);
            }}
        >
            {children}
        </ErrorBoundary>
    );
}

// ============================================
// API ERROR HANDLER
// ============================================

export class APIError extends Error {
    status: number;
    code: string;

    constructor(message: string, status: number, code: string = 'UNKNOWN') {
        super(message);
        this.name = 'APIError';
        this.status = status;
        this.code = code;
    }
}

export async function handleAPIError(response: Response): Promise<never> {
    let message = 'An unexpected error occurred';
    let code = 'UNKNOWN';

    try {
        const data = await response.json();
        message = data.message || data.error || message;
        code = data.code || code;
    } catch {
        message = response.statusText || message;
    }

    throw new APIError(message, response.status, code);
}

// ============================================
// FETCH WITH RETRY
// ============================================

interface FetchWithRetryOptions extends RequestInit {
    retries?: number;
    retryDelay?: number;
    timeout?: number;
}

export async function fetchWithRetry(
    url: string,
    options: FetchWithRetryOptions = {}
): Promise<Response> {
    const { retries = 3, retryDelay = 1000, timeout = 30000, ...fetchOptions } = options;

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            const response = await fetch(url, {
                ...fetchOptions,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok && attempt < retries) {
                // Retry on 5xx errors
                if (response.status >= 500) {
                    await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
                    continue;
                }
            }

            return response;
        } catch (error) {
            if (attempt === retries) throw error;

            // Retry on network errors
            if (error instanceof TypeError || (error as Error).name === 'AbortError') {
                await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
                continue;
            }

            throw error;
        }
    }

    throw new Error('Max retries exceeded');
}

// ============================================
// TOAST NOTIFICATIONS FOR ERRORS
// ============================================

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
    id: string;
    type: ToastType;
    message: string;
    duration?: number;
}

// Simple toast state (in real app, use context or state management)
let toasts: Toast[] = [];
let listeners: ((toasts: Toast[]) => void)[] = [];

export const toast = {
    show(type: ToastType, message: string, duration = 5000) {
        const id = Math.random().toString(36).slice(2);
        const newToast: Toast = { id, type, message, duration };
        toasts = [...toasts, newToast];
        listeners.forEach(l => l(toasts));

        if (duration > 0) {
            setTimeout(() => this.dismiss(id), duration);
        }

        return id;
    },

    success(message: string) {
        return this.show('success', message);
    },

    error(message: string) {
        return this.show('error', message, 8000);
    },

    warning(message: string) {
        return this.show('warning', message);
    },

    info(message: string) {
        return this.show('info', message);
    },

    dismiss(id: string) {
        toasts = toasts.filter(t => t.id !== id);
        listeners.forEach(l => l(toasts));
    },

    subscribe(listener: (toasts: Toast[]) => void) {
        listeners.push(listener);
        return () => {
            listeners = listeners.filter(l => l !== listener);
        };
    },

    getToasts() {
        return toasts;
    },
};
