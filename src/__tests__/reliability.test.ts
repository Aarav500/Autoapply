// ============================================
// BASIC TESTS FOR CRITICAL FUNCTIONS
// Run with: npm test
// ============================================

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => { store[key] = value; },
        removeItem: (key: string) => { delete store[key]; },
        clear: () => { store = {}; },
        get length() { return Object.keys(store).length; },
        key: (index: number) => Object.keys(store)[index] || null,
    };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

// ============================================
// STORAGE TESTS
// ============================================

describe('LocalStorage Backup', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('should save and load data correctly', () => {
        const testData = { name: 'Test Essay', content: 'Hello world' };
        localStorage.setItem('essaypro_test', JSON.stringify({
            data: testData,
            timestamp: new Date().toISOString(),
            version: 1,
            synced: false,
        }));

        const loaded = JSON.parse(localStorage.getItem('essaypro_test') || '{}');
        expect(loaded.data.name).toBe('Test Essay');
        expect(loaded.data.content).toBe('Hello world');
    });

    it('should handle missing data gracefully', () => {
        const result = localStorage.getItem('nonexistent');
        expect(result).toBeNull();
    });
});

// ============================================
// DEADLINE CALCULATION TESTS
// ============================================

describe('Deadline Calculations', () => {
    it('should calculate days until deadline correctly', () => {
        const now = new Date();
        const futureDate = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000); // 5 days from now

        const diffTime = futureDate.getTime() - now.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        expect(diffDays).toBe(5);
    });

    it('should identify urgent deadlines (< 7 days)', () => {
        const deadline = new Date();
        deadline.setDate(deadline.getDate() + 3); // 3 days from now

        const daysUntil = Math.floor((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        const isUrgent = daysUntil < 7;

        expect(isUrgent).toBe(true);
    });

    it('should handle past deadlines', () => {
        const pastDeadline = new Date();
        pastDeadline.setDate(pastDeadline.getDate() - 5); // 5 days ago

        const daysUntil = Math.floor((pastDeadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

        expect(daysUntil).toBeLessThan(0);
    });
});

// ============================================
// WORD COUNT TESTS
// ============================================

describe('Word Count', () => {
    const countWords = (text: string) => {
        return text.trim().split(/\s+/).filter(Boolean).length;
    };

    it('should count words correctly', () => {
        expect(countWords('Hello world')).toBe(2);
        expect(countWords('The quick brown fox jumps over the lazy dog')).toBe(9);
    });

    it('should handle empty strings', () => {
        expect(countWords('')).toBe(0);
        expect(countWords('   ')).toBe(0);
    });

    it('should handle extra whitespace', () => {
        expect(countWords('  Hello   world  ')).toBe(2);
        expect(countWords('Hello\n\nworld\t\tthere')).toBe(3);
    });

    it('should check word limit', () => {
        const essay = 'Word '.repeat(250);
        const wordCount = countWords(essay);
        const wordLimit = 250;

        expect(wordCount).toBeLessThanOrEqual(wordLimit);
    });
});

// ============================================
// ESSAY VALIDATION TESTS
// ============================================

describe('Essay Validation', () => {
    interface ValidationResult {
        isValid: boolean;
        errors: string[];
    }

    const validateEssay = (essay: string, wordLimit: number): ValidationResult => {
        const errors: string[] = [];
        const wordCount = essay.trim().split(/\s+/).filter(Boolean).length;

        if (wordCount === 0) {
            errors.push('Essay cannot be empty');
        }
        if (wordCount > wordLimit) {
            errors.push(`Essay exceeds word limit (${wordCount}/${wordLimit})`);
        }
        if (wordCount < 50 && wordCount > 0) {
            errors.push('Essay is too short (minimum 50 words recommended)');
        }

        return { isValid: errors.length === 0, errors };
    };

    it('should accept valid essays', () => {
        const essay = 'Word '.repeat(200);
        const result = validateEssay(essay, 250);
        expect(result.isValid).toBe(true);
        expect(result.errors.length).toBe(0);
    });

    it('should reject empty essays', () => {
        const result = validateEssay('', 250);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Essay cannot be empty');
    });

    it('should reject essays over word limit', () => {
        const essay = 'Word '.repeat(300);
        const result = validateEssay(essay, 250);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('exceeds word limit'))).toBe(true);
    });

    it('should warn about short essays', () => {
        const essay = 'Short essay.';
        const result = validateEssay(essay, 250);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('too short'))).toBe(true);
    });
});

// ============================================
// STRENGTH MAP CALCULATION TESTS
// ============================================

describe('Strength Map Calculations', () => {
    const calculateMatch = (userGPA: number, collegeGPA: number, valueMatches: number) => {
        let score = 0;

        // GPA match
        if (userGPA >= collegeGPA) {
            score += 20;
        } else {
            score += Math.max(0, 10 - (collegeGPA - userGPA) * 10);
        }

        // Value matches
        score += valueMatches * 8;

        return Math.min(100, score);
    };

    it('should give higher scores for GPA match', () => {
        const highGPA = calculateMatch(3.9, 3.5, 2);
        const lowGPA = calculateMatch(3.2, 3.5, 2);

        expect(highGPA).toBeGreaterThan(lowGPA);
    });

    it('should give higher scores for more value matches', () => {
        const moreMatches = calculateMatch(3.5, 3.5, 4);
        const fewerMatches = calculateMatch(3.5, 3.5, 1);

        expect(moreMatches).toBeGreaterThan(fewerMatches);
    });

    it('should cap score at 100', () => {
        const score = calculateMatch(4.0, 3.0, 10);
        expect(score).toBeLessThanOrEqual(100);
    });
});

// ============================================
// COLLEGE SORTING TESTS
// ============================================

describe('College Sorting', () => {
    const colleges = [
        { id: 'mit', deadline: new Date('2026-03-15') },
        { id: 'usc', deadline: new Date('2026-02-01') },
        { id: 'cornell', deadline: new Date('2026-03-15') },
        { id: 'nyu', deadline: new Date('2026-04-01') },
    ];

    it('should sort by deadline (earliest first)', () => {
        const sorted = [...colleges].sort((a, b) =>
            a.deadline.getTime() - b.deadline.getTime()
        );

        expect(sorted[0].id).toBe('usc');
        expect(sorted[sorted.length - 1].id).toBe('nyu');
    });

    it('should sort by name alphabetically', () => {
        const sorted = [...colleges].sort((a, b) =>
            a.id.localeCompare(b.id)
        );

        expect(sorted[0].id).toBe('cornell');
    });
});

// ============================================
// API ERROR HANDLING TESTS
// ============================================

describe('API Error Handling', () => {
    it('should create proper error objects', () => {
        class APIError extends Error {
            status: number;
            code: string;

            constructor(message: string, status: number, code: string) {
                super(message);
                this.status = status;
                this.code = code;
            }
        }

        const error = new APIError('Not found', 404, 'NOT_FOUND');

        expect(error.message).toBe('Not found');
        expect(error.status).toBe(404);
        expect(error.code).toBe('NOT_FOUND');
    });

    it('should handle network errors', () => {
        const isNetworkError = (error: Error) => {
            return error instanceof TypeError || error.message.includes('network');
        };

        const networkError = new TypeError('Failed to fetch');
        expect(isNetworkError(networkError)).toBe(true);

        const otherError = new Error('Something else');
        expect(isNetworkError(otherError)).toBe(false);
    });
});

// ============================================
// DATE FORMATTING TESTS
// ============================================

describe('Date Formatting', () => {
    it('should format deadline dates correctly', () => {
        const date = new Date('2026-02-01T23:59:00');
        const formatted = date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });

        expect(formatted).toContain('Feb');
        expect(formatted).toContain('2026');
    });

    it('should format countdown correctly', () => {
        const formatCountdown = (days: number, hours: number, mins: number) => {
            return `${days}d ${hours}h ${mins}m`;
        };

        expect(formatCountdown(5, 12, 30)).toBe('5d 12h 30m');
        expect(formatCountdown(0, 3, 45)).toBe('0d 3h 45m');
    });
});
