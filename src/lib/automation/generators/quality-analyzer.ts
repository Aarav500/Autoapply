
export class QualityAnalyzer {

    /**
     * Calculates a readability score (0-100).
     * Simple heuristic based on sentence length and word complexity.
     * Higher is easier to read.
     */
    static calculateReadability(text: string): number {
        const sentences = text.split(/[.!?]+/).filter(Boolean);
        const words = text.split(/\s+/).filter(Boolean);

        if (sentences.length === 0 || words.length === 0) return 100;

        const avgWordsPerSentence = words.length / sentences.length;
        const longWords = words.filter(w => w.length > 6).length;
        const complexityRatio = longWords / words.length;

        // Base score 100, penalize for long sentences and complex words
        let score = 100 - (avgWordsPerSentence * 1.5) - (complexityRatio * 100);
        return Math.max(0, Math.min(100, Math.round(score)));
    }

    /**
     * Calculates a Hook Score (0-100).
     * Based on engagement patterns: questions, numbers, strong openers.
     */
    static calculateHookScore(text: string): number {
        const firstLine = text.split('\n')[0];
        if (!firstLine) return 0;

        let score = 50; // Base

        // 1. Length check (Short openers are punchy)
        if (firstLine.length < 60) score += 10;
        else if (firstLine.length > 120) score -= 10;

        // 2. Question check
        if (firstLine.includes('?')) score += 15;

        // 3. Numbers check (e.g. "5 ways to...")
        if (/\d/.test(firstLine)) score += 10;

        // 4. Strong words check
        const strongWords = ['how', 'why', 'mistake', 'secret', 'learned', 'stop', 'start'];
        if (strongWords.some(w => firstLine.toLowerCase().includes(w))) score += 10;

        return Math.min(100, score);
    }
}
