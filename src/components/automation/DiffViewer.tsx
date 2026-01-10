'use client';

import React, { useMemo } from 'react';
import DiffMatchPatch from 'diff-match-patch';

interface DiffViewerProps {
    oldText: string;
    newText: string;
    label?: string;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ oldText, newText, label }) => {
    const diffs = useMemo(() => {
        const dmp = new DiffMatchPatch();
        const d = dmp.diff_main(oldText, newText);
        dmp.diff_cleanupSemantic(d);
        return d;
    }, [oldText, newText]);

    return (
        <div className="border rounded-lg p-4 bg-white shadow-sm mb-4">
            {label && <h4 className="font-semibold mb-2 text-gray-700">{label}</h4>}
            <div className="font-mono text-sm whitespace-pre-wrap leading-relaxed">
                {diffs.map((part, index) => {
                    const [type, text] = part;
                    // type: -1 = delete, 0 = equal, 1 = insert
                    if (type === 1) {
                        return (
                            <span key={index} className="bg-green-100 text-green-800 px-1 rounded">
                                {text}
                            </span>
                        );
                    } else if (type === -1) {
                        return (
                            <span key={index} className="bg-red-100 text-red-800 px-1 rounded line-through opacity-70">
                                {text}
                            </span>
                        );
                    } else {
                        return <span key={index}>{text}</span>;
                    }
                })}
            </div>
        </div>
    );
};
