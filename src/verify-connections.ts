
// Standalone verification script
// Run with: npx tsx src/verify-connections.ts

// Polyfill localStorage
const store: Record<string, string> = {};
global.localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { for (const k in store) delete store[k]; },
    length: 0,
    key: (i: number) => '',
} as any;

// Mock window for client-side checks
global.window = {} as any;

// Import modules
// Note: We use relative paths assuming this is in src/
import { generateTailoredCV, generateTailoredEssay } from './lib/automation/content-tailor';
import { buildFullProfile } from './lib/automation/user-profile';
import { activityStorage, Activity } from './lib/storage';

async function runTest() {
    console.log('🧪 Starting Verification Tests...');

    // TEST 1: buildFullProfile
    console.log('\n--- Test 1: buildFullProfile ---');
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

    // Save to mocked storage
    activityStorage.saveActivities([activity]);

    const profile = buildFullProfile();

    if (profile.activities && profile.activities.length === 1 && profile.activities[0].name === 'Underwater Basket Weaving') {
        console.log('✅ PASS: Loaded activities from storage');
    } else {
        console.error('❌ FAIL: Did not load activities');
        console.log('Activities:', profile.activities);
        process.exit(1);
    }

    // TEST 2: CV Generation
    console.log('\n--- Test 2: CV Generation ---');
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

    const cv = generateTailoredCV(opportunity, profile);

    if (cv.includes('Underwater Basket Weaving') && cv.includes('Weaving baskets underwater')) {
        console.log('✅ PASS: CV includes activity info');
    } else {
        console.error('❌ FAIL: CV missing activity info');
        console.log('CV Content snippet:', cv.substring(0, 200));
        process.exit(1);
    }

    // TEST 3: Essay Generation
    console.log('\n--- Test 3: Essay Generation ---');
    const essay = generateTailoredEssay(opportunity, undefined, profile);

    if (essay.includes('Underwater Basket Weaving')) {
        console.log('✅ PASS: Essay includes most impactful activity');
    } else {
        console.error('❌ FAIL: Essay missing activity assignment');
        console.log('Essay Content:', essay);
        process.exit(1);
    }

    console.log('\n🎉 ALL TESTS PASSED');
}

runTest().catch(console.error);
