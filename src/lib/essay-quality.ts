// ============================================
// ESSAY QUALITY & DEDUPLICATION UTILITIES
// Semantic similarity, diversity scoring, and content analysis
// ============================================

/**
 * Calculate similarity between two texts using multiple methods
 * Returns score 0-100 where 100 = identical, 0 = completely different
 */
export function calculateSimilarity(text1: string, text2: string): number {
    // Normalize texts
    const norm1 = normalizeText(text1);
    const norm2 = normalizeText(text2);

    // Calculate multiple similarity metrics
    const wordOverlap = calculateWordOverlap(norm1, norm2);
    const ngramSimilarity = calculateNgramSimilarity(norm1, norm2, 3);
    const sentenceOverlap = calculateSentenceOverlap(text1, text2);

    // Weighted average (word overlap most important for essays)
    return Math.round(
        wordOverlap * 0.5 +
        ngramSimilarity * 0.3 +
        sentenceOverlap * 0.2
    );
}

/**
 * Normalize text for comparison
 */
function normalizeText(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Calculate word overlap between two texts
 */
function calculateWordOverlap(text1: string, text2: string): number {
    const words1 = new Set(text1.split(' ').filter(w => w.length > 3)); // Skip short words
    const words2 = new Set(text2.split(' ').filter(w => w.length > 3));

    if (words1.size === 0 || words2.size === 0) return 0;

    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    return (intersection.size / union.size) * 100;
}

/**
 * Calculate n-gram similarity (catches phrase-level copying)
 */
function calculateNgramSimilarity(text1: string, text2: string, n: number): number {
    const ngrams1 = getNgrams(text1, n);
    const ngrams2 = getNgrams(text2, n);

    if (ngrams1.size === 0 || ngrams2.size === 0) return 0;

    const intersection = new Set([...ngrams1].filter(ng => ngrams2.has(ng)));
    const union = new Set([...ngrams1, ...ngrams2]);

    return (intersection.size / union.size) * 100;
}

/**
 * Get n-grams from text
 */
function getNgrams(text: string, n: number): Set<string> {
    const words = text.split(' ');
    const ngrams = new Set<string>();

    for (let i = 0; i <= words.length - n; i++) {
        ngrams.add(words.slice(i, i + n).join(' '));
    }

    return ngrams;
}

/**
 * Calculate sentence-level overlap (catches structural copying)
 */
function calculateSentenceOverlap(text1: string, text2: string): number {
    const sentences1 = text1.split(/[.!?]+/).map(s => normalizeText(s)).filter(s => s.length > 10);
    const sentences2 = text2.split(/[.!?]+/).map(s => normalizeText(s)).filter(s => s.length > 10);

    if (sentences1.length === 0 || sentences2.length === 0) return 0;

    let matchCount = 0;
    for (const s1 of sentences1) {
        for (const s2 of sentences2) {
            // If sentences are >70% similar, count as match
            if (calculateWordOverlap(s1, s2) > 70) {
                matchCount++;
                break;
            }
        }
    }

    return (matchCount / Math.max(sentences1.length, sentences2.length)) * 100;
}

/**
 * Check if essay is too similar to any existing essays
 * Returns { isDuplicate: boolean, mostSimilar: number, details: string }
 */
export function checkForDuplication(
    newEssay: string,
    existingEssays: string[],
    threshold: number = 40
): {
    isDuplicate: boolean;
    mostSimilar: number;
    details: string;
    similarityScores: number[];
} {
    if (!existingEssays || existingEssays.length === 0) {
        return {
            isDuplicate: false,
            mostSimilar: 0,
            details: 'No existing essays to compare',
            similarityScores: [],
        };
    }

    const scores = existingEssays.map(essay => calculateSimilarity(newEssay, essay));
    const mostSimilar = Math.max(...scores);
    const isDuplicate = mostSimilar >= threshold;

    return {
        isDuplicate,
        mostSimilar,
        details: isDuplicate
            ? `Essay is ${mostSimilar}% similar to existing essay (threshold: ${threshold}%)`
            : `Essay is unique enough (max similarity: ${mostSimilar}%)`,
        similarityScores: scores,
    };
}

/**
 * Calculate content diversity score (0-100)
 * Higher score = more diverse, specific, and interesting
 */
export function calculateDiversityScore(essay: string): {
    score: number;
    breakdown: {
        specificityScore: number;
        vocabularyRichnessScore: number;
        detailDensityScore: number;
        structuralVarietyScore: number;
    };
    feedback: string[];
} {
    const specificityScore = calculateSpecificityScore(essay);
    const vocabularyRichnessScore = calculateVocabularyRichness(essay);
    const detailDensityScore = calculateDetailDensity(essay);
    const structuralVarietyScore = calculateStructuralVariety(essay);

    const overallScore = Math.round(
        specificityScore * 0.35 +
        vocabularyRichnessScore * 0.25 +
        detailDensityScore * 0.25 +
        structuralVarietyScore * 0.15
    );

    const feedback: string[] = [];
    if (specificityScore < 60) feedback.push('Add more specific details (numbers, names, dates)');
    if (vocabularyRichnessScore < 60) feedback.push('Use more varied vocabulary');
    if (detailDensityScore < 60) feedback.push('Include more concrete examples');
    if (structuralVarietyScore < 60) feedback.push('Vary sentence structure more');

    return {
        score: overallScore,
        breakdown: {
            specificityScore,
            vocabularyRichnessScore,
            detailDensityScore,
            structuralVarietyScore,
        },
        feedback: feedback.length > 0 ? feedback : ['Essay shows good diversity!'],
    };
}

/**
 * Calculate specificity score (numbers, proper nouns, dates)
 */
function calculateSpecificityScore(text: string): number {
    const words = text.split(/\s+/);
    const wordCount = words.length;

    // Count specific markers
    const numbers = (text.match(/\b\d+\b/g) || []).length;
    const properNouns = (text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g) || []).length;
    const dates = (text.match(/\b(?:January|February|March|April|May|June|July|August|September|October|November|December|\d{4})\b/gi) || []).length;

    const specificityDensity = ((numbers + properNouns + dates) / wordCount) * 100;

    // Scale to 0-100 (good essays have 8-15% specificity)
    return Math.min(100, (specificityDensity / 12) * 100);
}

/**
 * Calculate vocabulary richness (unique words / total words)
 */
function calculateVocabularyRichness(text: string): number {
    const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const uniqueWords = new Set(words);

    if (words.length === 0) return 0;

    const richness = (uniqueWords.size / words.length) * 100;

    // Scale to 0-100 (good essays have 60-80% unique words)
    return Math.min(100, (richness / 70) * 100);
}

/**
 * Calculate detail density (descriptive words per sentence)
 */
function calculateDetailDensity(text: string): number {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    if (sentences.length === 0) return 0;

    // Count descriptive indicators
    const descriptiveWords = text.match(/\b(?:specific|exactly|precisely|\d+|vivid|concrete|particular)\b/gi) || [];
    const sensoryWords = text.match(/\b(?:saw|heard|felt|smelled|tasted|looked|sounded|seemed)\b/gi) || [];
    const actionVerbs = text.match(/\b(?:ran|jumped|built|created|discovered|realized|noticed|watched)\b/gi) || [];

    const detailsPerSentence = (descriptiveWords.length + sensoryWords.length + actionVerbs.length) / sentences.length;

    // Scale to 0-100 (good essays have 1-3 details per sentence)
    return Math.min(100, (detailsPerSentence / 2) * 100);
}

/**
 * Calculate structural variety (sentence length variation)
 */
function calculateStructuralVariety(text: string): number {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 5);
    if (sentences.length < 3) return 50; // Not enough data

    const lengths = sentences.map(s => s.split(/\s+/).length);
    const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;

    // Calculate standard deviation
    const variance = lengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / lengths.length;
    const stdDev = Math.sqrt(variance);

    // Good essays have std dev of 5-10 words
    return Math.min(100, (stdDev / 8) * 100);
}

/**
 * Detect AI-generated content patterns
 * Returns confidence score 0-100 (100 = definitely AI, 0 = definitely human)
 */
export function detectAIPatterns(text: string): {
    confidence: number;
    patterns: string[];
    suggestions: string[];
} {
    const patterns: string[] = [];
    const suggestions: string[] = [];

    // Check for AI tells
    const aiPhrases = [
        'Ever since I was young',
        'From a young age',
        'I have always been passionate',
        'sparked my interest',
        'ignited my passion',
        'pushed me out of my comfort zone',
        'making a difference',
        'giving back to the community',
        'diverse perspectives',
        'transformative experience',
        'journey of self-discovery',
        'shaped me into the person I am',
        'I realized that',
        'This experience taught me',
        'In conclusion',
        'In today\'s society',
    ];

    let aiPhraseCount = 0;
    for (const phrase of aiPhrases) {
        const regex = new RegExp(phrase, 'gi');
        const matches = (text.match(regex) || []).length;
        if (matches > 0) {
            aiPhraseCount += matches;
            patterns.push(`Found AI cliché: "${phrase}"`);
            suggestions.push(`Remove or rephrase: "${phrase}"`);
        }
    }

    // Check for overly perfect structure
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const avgSentenceLength = sentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0) / sentences.length;
    const lengthStdDev = Math.sqrt(
        sentences.reduce((sum, s) => {
            const len = s.split(/\s+/).length;
            return sum + Math.pow(len - avgSentenceLength, 2);
        }, 0) / sentences.length
    );

    // AI tends to have very consistent sentence lengths (low std dev)
    if (lengthStdDev < 3) {
        patterns.push('Sentences too uniform in length (AI indicator)');
        suggestions.push('Vary sentence length more - use fragments and longer complex sentences');
    }

    // Check for lack of contractions (AI often avoids them)
    const contractionCount = (text.match(/\b(?:don't|can't|won't|I'm|it's|we're|you're|hasn't|haven't|isn't|aren't)\b/gi) || []).length;
    const contractionDensity = (contractionCount / (text.split(/\s+/).length)) * 100;

    if (contractionDensity < 1 && text.split(/\s+/).length > 200) {
        patterns.push('Too few contractions (AI often writes too formally)');
        suggestions.push('Add natural contractions - write like you speak');
    }

    // Calculate confidence score
    const aiPhraseWeight = Math.min(aiPhraseCount * 15, 70);
    const structureWeight = lengthStdDev < 3 ? 20 : 0;
    const contractionWeight = contractionDensity < 1 ? 10 : 0;

    const confidence = Math.min(100, aiPhraseWeight + structureWeight + contractionWeight);

    return {
        confidence,
        patterns,
        suggestions,
    };
}

/**
 * Compare multiple essays for diversity
 * Returns analysis of how different they are from each other
 */
export function analyzeEssayPortfolio(essays: string[]): {
    overallDiversity: number;
    pairwiseSimilarities: number[][];
    concerns: string[];
    recommendations: string[];
} {
    if (essays.length < 2) {
        return {
            overallDiversity: 100,
            pairwiseSimilarities: [],
            concerns: [],
            recommendations: ['Add more essays to analyze portfolio diversity'],
        };
    }

    // Calculate pairwise similarities
    const similarities: number[][] = [];
    for (let i = 0; i < essays.length; i++) {
        similarities[i] = [];
        for (let j = 0; j < essays.length; j++) {
            if (i === j) {
                similarities[i][j] = 100;
            } else if (j < i) {
                similarities[i][j] = similarities[j][i]; // Use previously calculated
            } else {
                similarities[i][j] = calculateSimilarity(essays[i], essays[j]);
            }
        }
    }

    // Get all unique pairs
    const uniquePairs: number[] = [];
    for (let i = 0; i < essays.length; i++) {
        for (let j = i + 1; j < essays.length; j++) {
            uniquePairs.push(similarities[i][j]);
        }
    }

    const avgSimilarity = uniquePairs.reduce((a, b) => a + b, 0) / uniquePairs.length;
    const overallDiversity = 100 - avgSimilarity;

    const concerns: string[] = [];
    const recommendations: string[] = [];

    // Identify problematic pairs
    for (let i = 0; i < essays.length; i++) {
        for (let j = i + 1; j < essays.length; j++) {
            const sim = similarities[i][j];
            if (sim > 50) {
                concerns.push(`Essay ${i + 1} and Essay ${j + 1} are ${sim}% similar (too high)`);
            }
        }
    }

    if (overallDiversity < 40) {
        recommendations.push('Essays are too similar - showcase different aspects of yourself');
        recommendations.push('Use different activities/experiences for each essay');
        recommendations.push('Vary your narrative style and tone across essays');
    } else if (overallDiversity > 80) {
        recommendations.push('Great diversity! Each essay tells a unique story');
    }

    return {
        overallDiversity,
        pairwiseSimilarities: similarities,
        concerns,
        recommendations,
    };
}
