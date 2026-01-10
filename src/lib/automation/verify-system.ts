
// VERIFICATION SCRIPT
// Run with: npx ts-node src/lib/automation/verify-system.ts

import { ProfileGenerator } from './generators/profile-generator';
import { PostFactory } from './generators/post-factory';
import { QualityAnalyzer } from './generators/quality-analyzer';
import { ProfileGraph } from './profile-schema';

// MOCK DATA for verification (since we might not have DB access in this script context easily)
const mockProfile: ProfileGraph = {
    userId: 'user-123',
    fullName: 'Aarav Shah',
    email: 'aarav@example.com',
    education: [{
        school: 'University of California, Riverside',
        degree: 'BS',
        major: 'Computer Science',
        startDate: '2023-09-01',
        description: 'GPA 3.9'
    }],
    workExperience: [{
        id: '1',
        name: 'Tech Internship',
        role: 'Software Intern',
        organization: 'TechCorp',
        startDate: '2024-06-01',
        endDate: '2024-09-01',
        isCurrent: false,
        description: 'Built a React dashboard that improved load times by 40%.',
        skills: ['React', 'TypeScript', 'Performance']
    }],
    projects: [],
    skills: [
        { skillName: 'React', proficiency: 'advanced', verified: true },
        { skillName: 'TypeScript', proficiency: 'intermediate', verified: true }
    ],
    generatedPosts: [],
    leads: []
};


async function verifySystem() {
    console.log('>>> STARTING SYSTEM VERIFICATION <<<\n');

    // 1. Profile Generation
    console.log('[1] Testing Profile Generator...');
    const headline = ProfileGenerator.generateHeadline(mockProfile);
    const about = ProfileGenerator.generateAbout(mockProfile);
    console.log('    Headline:', headline);
    if (!headline.includes('Software Engineer')) throw new Error('Headline failed');
    console.log('    ✅ Profile Logic OK\n');

    // 2. Post Factory
    console.log('[2] Testing Post Factory...');
    const activity = mockProfile.workExperience[0];
    const variants = PostFactory.generateVariants(activity as any);
    console.log(`    Generated ${variants.length} variants.`);
    variants.forEach(v => {
        console.log(`    - [${v.type}] Hook Score: ${v.hookScore}, Readability: ${v.readability}`);
    });
    if (variants.length !== 3) throw new Error('Post Factory failed to generate 3 variants');
    console.log('    ✅ Content Factory OK\n');

    // 3. Quality Analysis
    console.log('[3] Testing Quality Analyzer...');
    const score = QualityAnalyzer.calculateHookScore('5 ways to improve your React code?');
    console.log('    Hook Score check:', score);
    if (score < 50) throw new Error('Hook scorer logic suspicious');
    console.log('    ✅ Quality Logic OK\n');

    console.log('>>> SYSTEM VERIFICATION COMPLETE: ALL SYSTEMS NOMINAL <<<');
}

verifySystem().catch(console.error);
