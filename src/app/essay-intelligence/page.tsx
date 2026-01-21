'use client';

import { useState } from 'react';
import { useS3Storage } from '@/lib/useS3Storage';
import { STORAGE_KEYS, PersonalProfile, CollegeResearch, WritingSample } from '@/lib/s3-storage';

// ============================================
// ESSAY INTELLIGENCE SYSTEM DASHBOARD
// Complete data collection for 98% essay quality
// ============================================

export default function EssayIntelligencePage() {
    const [activeTab, setActiveTab] = useState<'profile' | 'research' | 'voice'>('profile');

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-2xl shadow-2xl p-8 mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                                Essay Intelligence System
                            </h1>
                            <p className="text-gray-600 mt-2 text-lg">
                                Complete these sections for <span className="font-bold text-purple-600">98%+ quality essays</span>
                            </p>
                        </div>
                        <div className="text-right">
                            <div className="text-4xl font-bold text-purple-600">98%</div>
                            <div className="text-sm text-gray-500">Target Quality</div>
                        </div>
                    </div>

                    {/* Progress Overview */}
                    <div className="grid grid-cols-3 gap-4 mt-6">
                        <CompletionCard
                            title="Personal Profile"
                            description="Your story & background"
                            storageKey={STORAGE_KEYS.ESSAY_PERSONAL_PROFILE}
                            fields={15}
                        />
                        <CompletionCard
                            title="College Research"
                            description="Specific resources per college"
                            storageKey={STORAGE_KEYS.ESSAY_COLLEGE_RESEARCH}
                            fields={8}
                        />
                        <CompletionCard
                            title="Writing Voice"
                            description="Your authentic style"
                            storageKey={STORAGE_KEYS.ESSAY_WRITING_SAMPLES}
                            fields={3}
                        />
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex gap-2 mb-6">
                    <TabButton
                        active={activeTab === 'profile'}
                        onClick={() => setActiveTab('profile')}
                        icon="👤"
                        label="Personal Profile"
                    />
                    <TabButton
                        active={activeTab === 'research'}
                        onClick={() => setActiveTab('research')}
                        icon="🎓"
                        label="College Research"
                    />
                    <TabButton
                        active={activeTab === 'voice'}
                        onClick={() => setActiveTab('voice')}
                        icon="✍️"
                        label="Writing Voice"
                    />
                </div>

                {/* Tab Content */}
                {activeTab === 'profile' && <PersonalProfileSection />}
                {activeTab === 'research' && <CollegeResearchSection />}
                {activeTab === 'voice' && <WritingVoiceSection />}
            </div>
        </div>
    );
}

// ============================================
// TAB COMPONENTS
// ============================================

function TabButton({ active, onClick, icon, label }: any) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-3 px-6 py-4 rounded-xl font-semibold transition-all ${
                active
                    ? 'bg-white shadow-lg text-purple-600 scale-105'
                    : 'bg-white/50 text-gray-600 hover:bg-white hover:shadow'
            }`}
        >
            <span className="text-2xl">{icon}</span>
            <span>{label}</span>
        </button>
    );
}

// ============================================
// PERSONAL PROFILE SECTION
// ============================================

function PersonalProfileSection() {
    const { data: profile, setData, isSaving } = useS3Storage<PersonalProfile>(
        STORAGE_KEYS.ESSAY_PERSONAL_PROFILE,
        {
            defaultValue: {
                name: '',
                email: '',
                currentSchool: 'UCR',
                major: 'Computer Science',
                gpa: 3.9,
                graduationYear: 2027,
                background: {
                    isInternational: true,
                    homeCountry: '',
                    ethnicity: '',
                    firstGeneration: false,
                    languages: [],
                    immigrationStory: '',
                },
                transferReason: {
                    whyLeaving: '',
                    whatsMissing: '',
                    specificNeeds: [],
                    urgency: '',
                },
                personalStory: {
                    familyBackground: '',
                    culturalIdentity: '',
                    challenges: [],
                    pivotalMoments: [],
                    uniquePerspective: '',
                },
                goals: {
                    careerGoals: [],
                    dreamCompanies: [],
                    problemsToSolve: [],
                    impactVision: '',
                    fiveYearPlan: '',
                    tenYearPlan: '',
                },
                values: [],
                interests: [],
                passions: [],
                updatedAt: new Date().toISOString(),
            },
        }
    );

    const updateField = (path: string, value: any) => {
        setData((prev) => {
            const keys = path.split('.');
            const updated: any = { ...prev };
            let current = updated;

            for (let i = 0; i < keys.length - 1; i++) {
                current[keys[i]] = { ...current[keys[i]] };
                current = current[keys[i]];
            }

            current[keys[keys.length - 1]] = value;
            updated.updatedAt = new Date().toISOString();
            return updated;
        });
    };

    return (
        <div className="space-y-6">
            {/* Save Indicator */}
            {isSaving && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-blue-700 text-sm">
                    ☁️ Saving to S3...
                </div>
            )}

            {/* Basic Info */}
            <Section title="Basic Information" icon="📋">
                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Full Name"
                        value={profile.name}
                        onChange={(v: string) => updateField('name', v)}
                        placeholder="Your full name"
                    />
                    <Input
                        label="Email"
                        value={profile.email}
                        onChange={(v: string) => updateField('email', v)}
                        placeholder="your.email@example.com"
                    />
                    <Input
                        label="Current School"
                        value={profile.currentSchool}
                        onChange={(v: string) => updateField('currentSchool', v)}
                    />
                    <Input
                        label="Major"
                        value={profile.major}
                        onChange={(v: string) => updateField('major', v)}
                    />
                </div>
            </Section>

            {/* Background & Identity */}
            <Section title="Background & Identity" icon="🌍" description="Help AI understand your unique perspective">
                <div className="space-y-4">
                    <Input
                        label="Home Country"
                        value={profile.background.homeCountry || ''}
                        onChange={(v: string) => updateField('background.homeCountry', v)}
                        placeholder="e.g., India, China, Mexico..."
                    />
                    <TextArea
                        label="Immigration Story (if applicable)"
                        value={profile.background.immigrationStory || ''}
                        onChange={(v: string) => updateField('background.immigrationStory', v)}
                        placeholder="Share your immigration journey, challenges, and how it shaped you..."
                        rows={4}
                    />
                    <TagInput
                        label="Languages You Speak"
                        values={profile.background.languages}
                        onChange={(v: string) => updateField('background.languages', v)}
                        placeholder="Add language..."
                    />
                </div>
            </Section>

            {/* Transfer Context */}
            <Section
                title="Why You're Transferring"
                icon="🔄"
                description="Critical for transfer essays - be specific!"
            >
                <div className="space-y-4">
                    <TextArea
                        label="Why are you leaving your current school?"
                        value={profile.transferReason.whyLeaving}
                        onChange={(v: string) => updateField('transferReason.whyLeaving', v)}
                        placeholder="Be honest and specific. What's not working at your current school?"
                        rows={4}
                        hint="Example: 'UCR's CS program focuses heavily on theory, but lacks hands-on research opportunities in AI/ML that align with my career goals.'"
                    />
                    <TextArea
                        label="What's missing at your current school?"
                        value={profile.transferReason.whatsMissing}
                        onChange={(v: string) => updateField('transferReason.whatsMissing', v)}
                        placeholder="What specific resources, programs, or opportunities are you lacking?"
                        rows={4}
                        hint="Be specific: mention labs, professors, courses, culture, etc."
                    />
                    <TagInput
                        label="Specific needs from target schools"
                        values={profile.transferReason.specificNeeds}
                        onChange={(v: string) => updateField('transferReason.specificNeeds', v)}
                        placeholder="e.g., AI research labs, entrepreneurship ecosystem, specific professors..."
                    />
                </div>
            </Section>

            {/* Personal Story */}
            <Section title="Your Personal Story" icon="📖" description="What makes you uniquely YOU?">
                <div className="space-y-4">
                    <TextArea
                        label="Family Background"
                        value={profile.personalStory.familyBackground || ''}
                        onChange={(v: string) => updateField('personalStory.familyBackground', v)}
                        placeholder="Tell us about your family, their influence on you, and any challenges or unique circumstances..."
                        rows={4}
                    />
                    <TextArea
                        label="Cultural Identity"
                        value={profile.personalStory.culturalIdentity || ''}
                        onChange={(v: string) => updateField('personalStory.culturalIdentity', v)}
                        placeholder="How does your cultural background shape your perspective and goals?"
                        rows={4}
                    />
                    <TagInput
                        label="Major Challenges You've Overcome"
                        values={profile.personalStory.challenges}
                        onChange={(v: string) => updateField('personalStory.challenges', v)}
                        placeholder="Add challenge..."
                        hint="Financial hardship, language barriers, family obligations, health issues, etc."
                    />
                    <TagInput
                        label="Pivotal Life Moments"
                        values={profile.personalStory.pivotalMoments}
                        onChange={(v: string) => updateField('personalStory.pivotalMoments', v)}
                        placeholder="Add moment..."
                        hint="Life-changing experiences that shaped who you are today"
                    />
                    <TextArea
                        label="What Makes You Unique?"
                        value={profile.personalStory.uniquePerspective || ''}
                        onChange={(v: string) => updateField('personalStory.uniquePerspective', v)}
                        placeholder="What perspective or experience do you bring that most students don't have?"
                        rows={4}
                    />
                </div>
            </Section>

            {/* Goals & Vision */}
            <Section title="Goals & Future Vision" icon="🎯" description="Where are you headed?">
                <div className="space-y-4">
                    <TagInput
                        label="Career Goals"
                        values={profile.goals.careerGoals}
                        onChange={(v: string) => updateField('goals.careerGoals', v)}
                        placeholder="e.g., AI Research Scientist, Tech Entrepreneur, Product Manager..."
                    />
                    <TagInput
                        label="Dream Companies / Organizations"
                        values={profile.goals.dreamCompanies || []}
                        onChange={(v: string) => updateField('goals.dreamCompanies', v)}
                        placeholder="e.g., Google DeepMind, OpenAI, NASA, own startup..."
                    />
                    <TagInput
                        label="Problems You Want to Solve"
                        values={profile.goals.problemsToSolve}
                        onChange={(v: string) => updateField('goals.problemsToSolve', v)}
                        placeholder="e.g., AI safety, climate change, healthcare access..."
                    />
                    <TextArea
                        label="Impact Vision - How do you want to change the world?"
                        value={profile.goals.impactVision}
                        onChange={(v: string) => updateField('goals.impactVision', v)}
                        placeholder="Describe the impact you want to have on the world..."
                        rows={4}
                    />
                    <TextArea
                        label="5-Year Plan"
                        value={profile.goals.fiveYearPlan || ''}
                        onChange={(v: string) => updateField('goals.fiveYearPlan', v)}
                        placeholder="Where do you see yourself in 5 years?"
                        rows={3}
                    />
                </div>
            </Section>

            {/* Values & Passions */}
            <Section title="Values & Passions" icon="💜">
                <div className="space-y-4">
                    <TagInput
                        label="Core Values"
                        values={profile.values}
                        onChange={(v: string) => updateField('values', v)}
                        placeholder="e.g., Innovation, Equity, Collaboration, Impact..."
                    />
                    <TagInput
                        label="Interests"
                        values={profile.interests}
                        onChange={(v: string) => updateField('interests', v)}
                        placeholder="e.g., Machine Learning, Philosophy, Music Production..."
                    />
                    <TagInput
                        label="Passions (what drives you?)"
                        values={profile.passions}
                        onChange={(v: string) => updateField('passions', v)}
                        placeholder="What are you genuinely passionate about?"
                    />
                </div>
            </Section>
        </div>
    );
}

// ============================================
// COLLEGE RESEARCH SECTION
// ============================================

function CollegeResearchSection() {
    return (
        <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center py-12">
                <div className="text-6xl mb-4">🎓</div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">College Deep Research</h2>
                <p className="text-gray-600 mb-6">
                    Add specific professors, courses, labs, and organizations for each target college
                </p>
                <button className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700">
                    Coming Soon - Under Construction
                </button>
                <p className="text-sm text-gray-500 mt-4">
                    This will allow you to save detailed research about MIT, Stanford, CMU, etc.
                </p>
            </div>
        </div>
    );
}

// ============================================
// WRITING VOICE SECTION
// ============================================

function WritingVoiceSection() {
    return (
        <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center py-12">
                <div className="text-6xl mb-4">✍️</div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Writing Voice Analyzer</h2>
                <p className="text-gray-600 mb-6">
                    Upload writing samples so AI can match your authentic voice
                </p>
                <button className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700">
                    Coming Soon - Under Construction
                </button>
                <p className="text-sm text-gray-500 mt-4">
                    Paste previous essays, emails, or casual writing to train AI on your style
                </p>
            </div>
        </div>
    );
}

// ============================================
// UI COMPONENTS
// ============================================

function Section({ title, icon, description, children }: any) {
    return (
        <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">{icon}</span>
                <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
            </div>
            {description && <p className="text-gray-600 mb-6">{description}</p>}
            {children}
        </div>
    );
}

function Input({ label, value, onChange, placeholder, hint }: any) {
    return (
        <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
        </div>
    );
}

function TextArea({ label, value, onChange, placeholder, rows = 3, hint }: any) {
    return (
        <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>
            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                rows={rows}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            {hint && <p className="text-xs text-gray-500 mt-1 italic">💡 {hint}</p>}
        </div>
    );
}

function TagInput({ label, values, onChange, placeholder, hint }: any) {
    const [input, setInput] = useState('');

    const addTag = () => {
        if (input.trim() && !values.includes(input.trim())) {
            onChange([...values, input.trim()]);
            setInput('');
        }
    };

    const removeTag = (tag: string) => {
        onChange(values.filter((v: string) => v !== tag));
    };

    return (
        <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>
            <div className="flex gap-2 mb-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    placeholder={placeholder}
                    className="flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <button
                    onClick={addTag}
                    className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700"
                >
                    Add
                </button>
            </div>
            <div className="flex flex-wrap gap-2">
                {values.map((tag: string, i: number) => (
                    <span
                        key={i}
                        className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                    >
                        {tag}
                        <button onClick={() => removeTag(tag)} className="hover:text-purple-900">
                            ×
                        </button>
                    </span>
                ))}
            </div>
            {hint && <p className="text-xs text-gray-500 mt-1 italic">💡 {hint}</p>}
        </div>
    );
}

function CompletionCard({ title, description, storageKey, fields }: any) {
    const { data, isLoading } = useS3Storage(storageKey, { defaultValue: {} });

    // Calculate completion percentage
    const calculateCompletion = () => {
        if (isLoading) return 0;
        // Simple heuristic: count non-empty top-level fields
        const filledFields = Object.values(data || {}).filter((v) => {
            if (Array.isArray(v)) return v.length > 0;
            if (typeof v === 'object') return Object.keys(v || {}).length > 0;
            return v && v !== '';
        }).length;
        return Math.round((filledFields / fields) * 100);
    };

    const completion = calculateCompletion();

    return (
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
            <h3 className="font-bold text-gray-800 mb-1">{title}</h3>
            <p className="text-xs text-gray-600 mb-3">{description}</p>
            <div className="flex items-center gap-3">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                        className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all"
                        style={{ width: `${completion}%` }}
                    />
                </div>
                <span className="text-sm font-bold text-purple-600">{completion}%</span>
            </div>
        </div>
    );
}
