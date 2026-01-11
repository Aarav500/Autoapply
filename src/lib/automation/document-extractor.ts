
import { Activity, Achievement } from '@/types/common';

export interface ExtractedData {
    activities: Activity[];
    achievements: Achievement[];
}

/**
 * Smart Document Parser
 * Uses regex and heuristics to extract structured data from unstructured CV/Resume text.
 */
export function extractFromDocument(text: string): ExtractedData {
    const data: ExtractedData = {
        activities: [],
        achievements: []
    };

    // Normalize text
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    // Context tracking
    let currentSection: 'none' | 'experience' | 'projects' | 'education' | 'skills' | 'awards' = 'none';
    let currentItem: Partial<Activity> | null = null;
    let bufferDescription: string[] = [];

    // Helper to finalize an item
    const flushItem = () => {
        if (currentItem && currentItem.name) {
            currentItem.description = bufferDescription.join(' ');

            // finalize activity type
            if (!currentItem.type) {
                if (currentSection === 'projects') currentItem.type = 'project';
                else if (currentSection === 'experience') currentItem.type = 'work';
                else currentItem.type = 'other';
            }

            // defaults
            if (!currentItem.id) currentItem.id = `doc-${Date.now()}-${Math.random()}`;
            if (!currentItem.startDate) currentItem.startDate = '2023';
            if (!currentItem.isOngoing) currentItem.isOngoing = false;

            data.activities.push(currentItem as Activity);
            currentItem = null;
            bufferDescription = [];
        }
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lowerMean = line.toLowerCase();

        // 1. Detect Section Headers
        if (['experience', 'work history', 'employment'].some(k => lowerMean === k || lowerMean.endsWith(k + ':'))) {
            flushItem();
            currentSection = 'experience';
            continue;
        }
        if (['projects', 'personal projects'].some(k => lowerMean === k || lowerMean.endsWith(k + ':'))) {
            flushItem();
            currentSection = 'projects';
            continue;
        }
        if (['awards', 'honors', 'achievements', 'certifications'].some(k => lowerMean.includes(k))) {
            flushItem();
            currentSection = 'awards';
            continue;
        }

        // 2. Parse Section Content
        if (currentSection === 'experience' || currentSection === 'projects') {
            // Detect new item (Date pattern or bold text heuristics often imply new item)
            // Heuristic: Line starts with a date or looks like a title
            const isDateLine = /\b(20\d\d|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i.test(line);

            if (isDateLine || (line.length < 50 && !line.startsWith('•') && !line.startsWith('-'))) {
                flushItem();
                currentItem = { name: line }; // Start new item
            } else {
                // Determine if it's description
                if (currentItem) {
                    bufferDescription.push(line.replace(/^[•-]\s*/, ''));
                }
            }
        }

        else if (currentSection === 'awards') {
            // Awards are usually one-liners
            // "1st Place, National Science Fair (2023)"
            if (line.length > 5 && line.length < 100) {
                const extractedDate = line.match(/\b(20\d\d)\b/)?.[1] || new Date().getFullYear().toString();

                data.achievements.push({
                    id: `doc-aw-${Date.now()}-${Math.random()}`,
                    title: line,
                    type: lowerMean.includes('scholarship') ? 'honor' : 'award',
                    date: extractedDate,
                    description: 'Extracted from uploaded document',
                    issuer: 'Unknown'
                });
            }
        }
    }

    // Flush last item
    flushItem();

    return data;
}
