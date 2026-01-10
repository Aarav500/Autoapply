'use client';

import React, { useState } from 'react';

interface ScheduledPost {
    date: Date;
    post: {
        type: string;
        content: string;
        hookScore?: number;
    }
}

interface ContentCalendarProps {
    schedule: ScheduledPost[];
}

export const ContentCalendar: React.FC<ContentCalendarProps> = ({ schedule }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
            {schedule.map((slot, idx) => (
                <div key={idx} className="border rounded p-3 bg-gray-50 hover:bg-white transition shadow-sm h-40 overflow-hidden relative group">
                    <div className="text-xs text-gray-500 font-bold uppercase mb-2">
                        {slot.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </div>

                    <div className="space-y-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${getTypeColor(slot.post.type)}`}>
                            {slot.post.type}
                        </span>

                        <p className="text-xs text-gray-800 line-clamp-3 mt-2">
                            {slot.post.content}
                        </p>
                    </div>

                    {slot.post.hookScore && (
                        <div className="absolute bottom-2 right-2 text-xs font-mono text-purple-600 bg-purple-100 px-1 rounded">
                            Hook: {slot.post.hookScore}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

function getTypeColor(type: string) {
    switch (type) {
        case 'story': return 'bg-yellow-100 text-yellow-800';
        case 'technical': return 'bg-blue-100 text-blue-800';
        case 'lesson': return 'bg-green-100 text-green-800';
        default: return 'bg-gray-100 text-gray-800';
    }
}
