
import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import { generateTailoredCV, generateTailoredEssay } from '../lib/automation/content-tailor';
import { buildFullProfile } from '../lib/automation/user-profile';
import { activityStorage, profileStorage, Activity } from '../lib/storage';

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

describe('Integration: Data Connections', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.restoreAllMocks();
    });

    it('buildFullProfile should load activities from storage', () => {
        // Setup: Save activity to storage
        const activity: Activity = {
            id: '123',
            name: 'Underwater Basket Weaving',
            description: 'Weaving baskets underwater',
            hours: 10,
            years: '2',
            type: 'Club',
            skills: ['Weaving', 'Swimming'],
            impact: 'Created 50 baskets'
        };

        // Use the storage API to save (verifies storage.ts works too)
        activityStorage.saveActivities([activity]);

        // Act: Build profile
        const profile = buildFullProfile();

        // Assert
        expect(profile.activities).toBeDefined();
        expect(profile.activities!.length).toBe(1);
        expect(profile.activities![0].name).toBe('Underwater Basket Weaving');
        expect(profile.activities![0].type).toBe('club'); // "Club" mapped to "club" via heuristic
    });

    it('generateTailoredCV should include top activities', () => {
        // Setup: Save activity to storage
        const activity: Activity = {
            id: '123',
            name: 'Underwater Basket Weaving',
            description: 'Weaving baskets underwater',
            hours: 10,
            years: '2',
            type: 'Club',
            skills: ['Weaving', 'Swimming'],
            impact: 'Created 50 baskets'
        };
        activityStorage.saveActivities([activity]);

        const profile = buildFullProfile();

        const opportunity = {
            id: 'opp1',
            type: 'job' as any,
            title: 'Weaver',
            organization: 'Ocean Weavers',
            requirements: ['Weaving'],
            description: 'Job desc',
            status: 'discovered' as any,
            matchScore: 90,
            discoveredAt: new Date(),
            url: 'http://example.com'
        };

        // Act
        const cv = generateTailoredCV(opportunity, profile);

        // Assert
        expect(cv).toContain('Underwater Basket Weaving');
        expect(cv).toContain('Weaving baskets underwater');
    });

    it('generateTailoredEssay should include most impactful activity', () => {
        // Setup: Save activity to storage
        const activity: Activity = {
            id: '123',
            name: 'Underwater Basket Weaving',
            description: 'Weaving baskets underwater.',
            hours: 10,
            years: '2',
            type: 'Club',
            skills: ['Weaving', 'Swimming'],
            impact: 'Created 50 baskets'
        };
        activityStorage.saveActivities([activity]);

        const profile = buildFullProfile();

        const opportunity = {
            id: 'opp1',
            type: 'scholarship' as any,
            title: 'Weaver Grant',
            organization: 'Ocean Weavers',
            requirements: ['Weaving'],
            description: 'Grant desc',
            status: 'discovered' as any,
            matchScore: 90,
            discoveredAt: new Date(),
            url: 'http://example.com'
        };

        // Act
        // Note: generateTailoredEssay takes (opportunity, prompt, profile)
        const essay = generateTailoredEssay(opportunity, undefined, profile);

        // Assert
        expect(essay).toContain('Underwater Basket Weaving');
        // Check for context injection
        expect(essay).toContain('Weaving baskets underwater');
    });
});
