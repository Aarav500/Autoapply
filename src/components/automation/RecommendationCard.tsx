'use client';

import React, { useState } from 'react';
import { ProfileRecommendation } from '@/lib/linkedin/profile-graph';
import { Card, Button } from '@/components/ui';
import { Copy, Check, ChevronRight, Info } from 'lucide-react';
import { toast } from '@/lib/error-handling';

interface RecommendationCardProps {
    recommendation: ProfileRecommendation;
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({ recommendation }) => {
    const [isApplied, setIsApplied] = useState(false);
    const [isCopied, setIsCopied] = useState(false);

    const handleCopy = () => {
        if (!recommendation.contentToCopy) return;
        navigator.clipboard.writeText(recommendation.contentToCopy);
        setIsCopied(true);
        toast.success('Copied to clipboard!');
        setTimeout(() => setIsCopied(false), 2000);
    };

    const impactColors = {
        high: 'bg-red-500',
        medium: 'bg-yellow-500',
        low: 'bg-blue-500',
    };

    return (
        <Card className={`overflow-hidden border-l-4 ${recommendation.impact === 'high' ? 'border-l-red-500' : 'border-l-blue-500'} bg-white shadow-sm hover:shadow-md transition-shadow`}>
            <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full text-white ${impactColors[recommendation.impact]}`}>
                            {recommendation.impact} Impact
                        </span>
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            {recommendation.section}
                        </span>
                    </div>
                </div>

                <h4 className="font-bold text-gray-900 mb-1">{recommendation.message}</h4>
                <p className="text-sm text-gray-600 mb-4">{recommendation.suggestedAction}</p>

                {recommendation.contentToCopy && (
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 mb-4 font-mono text-xs text-gray-700 whitespace-pre-wrap">
                        {recommendation.contentToCopy}
                    </div>
                )}

                <div className="flex items-center justify-between gap-3">
                    <div className="flex gap-2">
                        {recommendation.contentToCopy && (
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleCopy}
                                icon={isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            >
                                {isCopied ? 'Copied' : 'Copy Text'}
                            </Button>
                        )}
                        <Button
                            size="sm"
                            variant={isApplied ? 'secondary' : 'primary'}
                            onClick={() => setIsApplied(!isApplied)}
                            icon={isApplied ? <Check className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        >
                            {isApplied ? 'Applied' : 'Mark as Done'}
                        </Button>
                    </div>

                    <a
                        href="https://www.linkedin.com/in/me/edit/forms/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                    >
                        Go to LinkedIn <Info className="w-3 h-3" />
                    </a>
                </div>
            </div>
        </Card>
    );
};
