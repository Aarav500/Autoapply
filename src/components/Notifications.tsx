'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { toast as toastManager } from '@/lib/error-handling';

// ============================================
// TOAST TYPES
// ============================================

interface Toast {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    duration?: number;
}

// ============================================
// TOAST COMPONENT
// ============================================

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
    const icons = {
        success: <CheckCircle2 className="w-5 h-5" />,
        error: <XCircle className="w-5 h-5" />,
        warning: <AlertTriangle className="w-5 h-5" />,
        info: <Info className="w-5 h-5" />,
    };

    const colors = {
        success: { bg: 'rgba(34, 197, 94, 0.15)', border: 'rgba(34, 197, 94, 0.3)', icon: 'var(--success)' },
        error: { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.3)', icon: 'var(--error)' },
        warning: { bg: 'rgba(234, 179, 8, 0.15)', border: 'rgba(234, 179, 8, 0.3)', icon: 'var(--warning)' },
        info: { bg: 'rgba(91, 111, 242, 0.15)', border: 'rgba(91, 111, 242, 0.3)', icon: 'var(--primary-400)' },
    };

    const style = colors[toast.type];

    return (
        <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg backdrop-blur-lg max-w-md"
            style={{
                background: style.bg,
                border: `1px solid ${style.border}`,
            }}
        >
            <span style={{ color: style.icon }}>{icons[toast.type]}</span>
            <p className="flex-1 text-sm font-medium">{toast.message}</p>
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onDismiss}
                className="p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
                <X className="w-4 h-4" />
            </motion.button>
        </motion.div>
    );
}

// ============================================
// TOAST CONTAINER
// ============================================

export function ToastContainer() {
    const [toasts, setToasts] = useState<Toast[]>([]);

    useEffect(() => {
        // Subscribe to toast updates
        const unsubscribe = toastManager.subscribe(setToasts);
        return unsubscribe;
    }, []);

    return (
        <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
            <AnimatePresence>
                {toasts.map(toast => (
                    <ToastItem
                        key={toast.id}
                        toast={toast}
                        onDismiss={() => toastManager.dismiss(toast.id)}
                    />
                ))}
            </AnimatePresence>
        </div>
    );
}

// ============================================
// AUTO-SAVE INDICATOR
// ============================================

interface AutoSaveIndicatorProps {
    lastSaved: Date | null;
    isSaving: boolean;
}

export function AutoSaveIndicator({ lastSaved, isSaving }: AutoSaveIndicatorProps) {
    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-xs"
            style={{ color: 'var(--text-muted)' }}
        >
            {isSaving ? (
                <>
                    <motion.div
                        className="w-2 h-2 rounded-full"
                        style={{ background: 'var(--warning)' }}
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 1 }}
                    />
                    <span>Saving...</span>
                </>
            ) : lastSaved ? (
                <>
                    <div
                        className="w-2 h-2 rounded-full"
                        style={{ background: 'var(--success)' }}
                    />
                    <span>Saved at {formatTime(lastSaved)}</span>
                </>
            ) : null}
        </motion.div>
    );
}

// ============================================
// OFFLINE INDICATOR
// ============================================

export function OfflineIndicator() {
    const [isOnline, setIsOnline] = useState(true);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        setIsOnline(navigator.onLine);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    if (isOnline) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-0 left-0 right-0 z-[101] py-2 text-center text-sm font-medium"
            style={{
                background: 'var(--warning)',
                color: 'black'
            }}
        >
            📡 You're offline. Changes will sync when you're back online.
        </motion.div>
    );
}

// ============================================
// CONFIDENCE METER WITH ANIMATION
// ============================================

interface ConfidenceMeterProps {
    score: number;
    label?: string;
    showLabel?: boolean;
}

export function AnimatedConfidenceMeter({ score, label, showLabel = true }: ConfidenceMeterProps) {
    const getColor = () => {
        if (score >= 80) return 'var(--success)';
        if (score >= 60) return 'var(--warning)';
        return 'var(--error)';
    };

    return (
        <div className="space-y-2">
            {showLabel && (
                <div className="flex justify-between text-sm">
                    <span style={{ color: 'var(--text-muted)' }}>{label || 'Confidence Score'}</span>
                    <span className="font-medium" style={{ color: getColor() }}>{score}%</span>
                </div>
            )}
            <div
                className="h-2 rounded-full overflow-hidden"
                style={{ background: 'var(--bg-tertiary)' }}
            >
                <motion.div
                    className="h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${score}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    style={{ background: getColor() }}
                />
            </div>
        </div>
    );
}

// ============================================
// API KEY SETUP MODAL
// ============================================

import { setAPIKey, AIProvider } from '@/lib/ai-providers';

interface APIKeyModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function APIKeyModal({ isOpen, onClose }: APIKeyModalProps) {
    const [selectedProvider, setSelectedProvider] = useState<AIProvider>('claude');
    const [apiKey, setApiKey] = useState('');

    const handleSave = () => {
        if (apiKey.trim()) {
            setAPIKey(selectedProvider, apiKey.trim());
            toastManager.success(`${selectedProvider.charAt(0).toUpperCase() + selectedProvider.slice(1)} API key saved!`);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                className="w-full max-w-md rounded-2xl p-6"
                style={{ background: 'var(--bg-primary)', border: '1px solid var(--glass-border)' }}
                onClick={e => e.stopPropagation()}
            >
                <h3 className="text-xl font-bold mb-4">Configure AI Provider</h3>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">Provider</label>
                        <select
                            value={selectedProvider}
                            onChange={e => setSelectedProvider(e.target.value as AIProvider)}
                            className="w-full p-3 rounded-xl"
                            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)' }}
                        >
                            <option value="claude">Claude (Best for essays) ⭐</option>
                            <option value="gemini">Gemini (Free tier)</option>
                            <option value="openai">OpenAI GPT-4</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">API Key</label>
                        <input
                            type="password"
                            value={apiKey}
                            onChange={e => setApiKey(e.target.value)}
                            placeholder={`Enter your ${selectedProvider} API key`}
                            className="w-full p-3 rounded-xl"
                            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)' }}
                        />
                    </div>

                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {selectedProvider === 'claude' && (
                            <p>Get your key at <a href="https://console.anthropic.com" target="_blank" className="underline">console.anthropic.com</a></p>
                        )}
                        {selectedProvider === 'gemini' && (
                            <p>Get your key at <a href="https://aistudio.google.com" target="_blank" className="underline">aistudio.google.com</a></p>
                        )}
                        {selectedProvider === 'openai' && (
                            <p>Get your key at <a href="https://platform.openai.com" target="_blank" className="underline">platform.openai.com</a></p>
                        )}
                    </div>
                </div>

                <div className="flex gap-3 mt-6">
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={onClose}
                        className="flex-1 py-2 rounded-xl font-medium"
                        style={{ background: 'var(--bg-secondary)' }}
                    >
                        Cancel
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleSave}
                        className="flex-1 py-2 rounded-xl font-medium text-white"
                        style={{ background: 'var(--gradient-primary)' }}
                    >
                        Save
                    </motion.button>
                </div>
            </motion.div>
        </motion.div>
    );
}
