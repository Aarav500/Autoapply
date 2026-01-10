'use client';

import React, { useState } from 'react';

type ActionType = 'post' | 'message' | 'profile_update';

interface ActionItem {
    id: string;
    type: ActionType;
    title: string;
    contentToCopy: string;
    destinationUrl: string; // The URL to act on (e.g. LinkedIn feed, DM)
    priority: number;
}

interface ActionCenterProps {
    items: ActionItem[];
    onComplete: (id: string) => void;
}

export const ActionCenter: React.FC<ActionCenterProps> = ({ items, onComplete }) => {
    return (
        <div className="bg-white rounded-lg shadow-lg border p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center">
                <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded mr-2">
                    {items.length} Ready
                </span>
                Action Center
            </h2>

            <div className="space-y-4">
                {items.length === 0 && (
                    <p className="text-gray-500 italic">No pending actions. You're all caught up!</p>
                )}

                {items.map(item => (
                    <ActionCard key={item.id} item={item} onComplete={onComplete} />
                ))}
            </div>
        </div>
    );
};

const ActionCard: React.FC<{ item: ActionItem, onComplete: (id: string) => void }> = ({ item, onComplete }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(item.contentToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);

        // Auto-open link after copy? Maybe too intrusive. 
        // Let user click "Open" separately for safety.
    };

    const handleOpen = () => {
        window.open(item.destinationUrl, '_blank');
    };

    return (
        <div className="border border-gray-200 rounded-md p-4 hover:border-blue-300 transition-colors flex flex-col md:flex-row gap-4 items-start bg-gray-50">
            <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                    <Badge type={item.type} />
                    <h3 className="font-semibold text-gray-900">{item.title}</h3>
                </div>
                <p className="text-sm text-gray-600 line-clamp-2 font-mono bg-white p-2 rounded border mt-2">
                    {item.contentToCopy}
                </p>
            </div>

            <div className="flex flex-col gap-2 min-w-[140px]">
                <button
                    onClick={handleCopy}
                    className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-white border border-gray-300 rounded hover:bg-gray-50 text-sm font-medium transition"
                >
                    {copied ? 'Copied! ✅' : '1. Copy Context'}
                </button>

                <button
                    onClick={handleOpen}
                    className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium transition"
                >
                    2. Go to LinkedIn ↗
                </button>

                <button
                    onClick={() => onComplete(item.id)}
                    className="text-xs text-gray-400 hover:text-gray-600 underline text-center mt-1"
                >
                    Mark done
                </button>
            </div>
        </div>
    );
};

const Badge: React.FC<{ type: ActionType }> = ({ type }) => {
    const styles = {
        post: 'bg-purple-100 text-purple-800',
        message: 'bg-blue-100 text-blue-800',
        profile_update: 'bg-orange-100 text-orange-800'
    };

    const labels = {
        post: 'Post',
        message: 'Message',
        profile_update: 'Profile'
    };

    return (
        <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${styles[type]}`}>
            {labels[type]}
        </span>
    );
};
