'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Button, StatusBadge, Input, Textarea, Tag } from '@/components/ui';
import { useS3Storage } from '@/lib/useS3Storage';
import { toast } from '@/lib/error-handling';
import { getAIConfig, AIConfig, AIProvider, setAPIKey } from '@/lib/ai-providers';
import { targetColleges } from '@/lib/colleges-data';
import {
    FileText,
    Briefcase,
    GraduationCap,
    Sparkles,
    Download,
    Copy,
    Eye,
    Loader2,
    User,
    Mail,
    Phone,
    MapPin,
    Globe,
    Github,
    Linkedin,
    ChevronRight,
    Plus,
    X,
    Key,
    RefreshCw
} from 'lucide-react';

// Types
interface ActivityItem {
    id: string;
    name: string;
    role: string;
    organization: string;
    startDate: string;
    endDate: string;
    description: string;
    hoursPerWeek: number;
    weeksPerYear: number;
}

interface Achievement {
    id: string;
    title: string;
    org: string;
    date: string;
}

interface UserProfile {
    name: string;
    email: string;
    phone: string;
    location: string;
    website: string;
    linkedin: string;
    github: string;
    summary: string;
    // NEW: Portfolio and research links
    portfolio: string;
    researchPaper: string;
}

type CVMode = 'job' | 'college';

const defaultProfile: UserProfile = {
    name: '',
    email: '',
    phone: '',
    location: '',
    website: '',
    linkedin: '',
    github: '',
    summary: '',
    portfolio: '',
    researchPaper: '',
};

export default function CVBuilderPage() {
    // Mode selection
    const [mode, setMode] = useState<CVMode>('job');
    const [selectedCollege, setSelectedCollege] = useState('mit');
    const [jobDescription, setJobDescription] = useState('');

    // User profile - fixed to use options object
    const profileStorage = useS3Storage<UserProfile>('cv-profile', { defaultValue: defaultProfile });
    const profile = profileStorage.data;
    const setProfile = profileStorage.setData;
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [profileForm, setProfileForm] = useState<UserProfile>(defaultProfile);

    // Data - fixed to use options object
    const activitiesStorage = useS3Storage<ActivityItem[]>('activities', { defaultValue: [] });
    const activities = activitiesStorage.data;
    const achievementsStorage = useS3Storage<Achievement[]>('achievements', { defaultValue: [] });
    const achievements = achievementsStorage.data;

    // Generation state
    const [isGenerating, setIsGenerating] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [generatedCV, setGeneratedCV] = useState('');

    // AI Config
    const [aiConfig, setAiConfig] = useState<AIConfig | null>(null);
    const [showAPIKeyModal, setShowAPIKeyModal] = useState(false);
    const [apiKeyInput, setApiKeyInput] = useState('');
    const [selectedProvider, setSelectedProvider] = useState<AIProvider>('gemini');

    const [hasServerKey, setHasServerKey] = useState(false);

    useEffect(() => {
        const checkServerKey = async () => {
            try {
                const response = await fetch('/api/ai/generate');
                if (response.ok) {
                    const data = await response.json();
                    if (data.available && data.providers.claude) {
                        setHasServerKey(true);
                        setAiConfig({ provider: 'claude', apiKey: 'env' });
                    }
                }
            } catch (err) {
                console.error('Failed to check server key:', err);
            }
        };

        checkServerKey();

        const config = getAIConfig();
        if (config) setAiConfig(config);
    }, []);

    useEffect(() => {
        if (profile) setProfileForm(profile);
    }, [profile]);

    const hasProfile = profile && profile.name && profile.email;
    const hasActivities = activities.length > 0;
    const college = targetColleges.find(c => c.id === selectedCollege) || targetColleges[0];

    // Generate CV
    const handleGenerateCV = async () => {
        if (!aiConfig && !hasServerKey) {
            setShowAPIKeyModal(true);
            toast.error('Please set up an AI API key first');
            return;
        }

        if (!hasProfile) {
            setShowProfileModal(true);
            toast.error('Please set up your profile first');
            return;
        }

        setIsGenerating(true);
        toast.info(`🚀 Generating ${mode === 'job' ? 'job-targeted' : 'college-targeted'} CV...`);

        try {
            const systemPrompt = mode === 'job'
                ? `You are a world-class executive resume writer with expertise in ATS optimization and applicant psychology. Create a compelling, tailored professional CV that positions the candidate as the PERFECT fit for the target role.

CRITICAL OPTIMIZATION STRATEGIES:

1. ATS OPTIMIZATION (Critical for passing automated screening):
   - Extract ALL technical keywords, tools, frameworks, and skills from the job description
   - Mirror the EXACT terminology used in the JD (e.g., if they say "React.js", use "React.js" not "React")
   - Include a dedicated "Technical Skills" or "Core Competencies" section with keyword-rich content
   - Use standard section headers: Professional Summary, Skills, Experience, Education, Achievements
   - Avoid tables, columns, images, or graphics that ATS cannot parse
   - Include relevant certifications and acronyms from the JD

2. TAILORED IMPACT STORYTELLING:
   - For EACH bullet point, use the X-Y-Z formula: "Accomplished [X] as measured by [Y] by doing [Z]"
   - ONLY include experiences that directly relate to job requirements (ruthlessly cut irrelevant content)
   - Prioritize experiences that match "required" skills over "nice-to-have" skills
   - Quantify everything: %, $, time saved, users impacted, performance improvements
   - Lead with results, not responsibilities (e.g., "Increased conversion by 40%" not "Responsible for conversion optimization")

3. STRATEGIC KEYWORD PLACEMENT:
   - First bullet of each role should contain the most relevant keywords for that position
   - Professional summary must include top 5-7 keywords from the job posting
   - Skills section should list technologies in order of relevance to the JD
   - Use both acronyms AND full forms (e.g., "CI/CD (Continuous Integration/Continuous Deployment)")

4. FORMATTING & READABILITY:
   - Professional summary: 3-4 sentences highlighting unique value proposition and top achievements
   - Each role: 3-5 achievement-focused bullets (not duties)
   - Keep total length to 1-2 pages maximum
   - Use powerful action verbs: spearheaded, architected, engineered, drove, accelerated, optimized
   - Ensure parallel structure in all bullet points (all start with past tense verbs)

5. EXPERIENCE PRIORITIZATION:
   - Rank experiences by relevance to target role, not chronologically
   - Give more detail (more bullets) to highly relevant roles
   - Consolidate or minimize less relevant experiences
   - If switching industries, emphasize transferable skills

STRUCTURE (in this exact order):
## Professional Summary
[3-4 sentences with top keywords and value proposition]

## Technical Skills / Core Competencies
[Keyword-optimized, comma-separated or categorized by type]

## Professional Experience
[Most relevant experiences first, achievement-focused bullets with metrics]

## Education
[Degree, institution, relevant coursework if early career]

## Achievements & Recognition
[Awards, publications, speaking engagements if relevant]

CRITICAL: This CV must pass ATS screening AND impress human recruiters. Every word must earn its place by demonstrating fit for THIS specific role.`
                : `You are an elite college admissions consultant specializing in Ivy League and top-tier university applications. Create a compelling, authentic CV that positions this student as an EXCEPTIONAL fit for ${college.name} specifically.

CRITICAL STRATEGIES FOR COLLEGE CVs:

1. INSTITUTIONAL ALIGNMENT (Most Important):
   - Study ${college.name}'s core values: ${college.research.values.join(', ')}
   - Understand what they seek: ${college.research.whatTheyLookFor.join(', ')}
   - Map EVERY activity to at least one college value with explicit connections
   - Use language that mirrors the college's mission statement and culture
   - Reference specific programs: ${college.research.notablePrograms.slice(0, 3).join(', ')}

2. DEMONSTRATE INTELLECTUAL VITALITY:
   - Show PASSION and DEPTH over breadth (colleges want "spiky" students, not well-rounded)
   - Highlight intellectual curiosity, research, independent projects
   - Connect activities to show a coherent narrative/theme
   - Emphasize learning, growth, and future aspirations
   - Include academic achievements that show rigor (AP, IB, advanced coursework)

3. LEADERSHIP & IMPACT STORYTELLING:
   - Use Context-Action-Result-Learning (CARL) framework for key activities:
     * Context: What was the challenge/opportunity?
     * Action: What did YOU specifically do?
     * Result: What changed/improved? (quantify!)
     * Learning: How did this shape your vision?
   - Focus on INITIATIVE and AGENCY (what you STARTED, not just participated in)
   - Show community impact and service with measurable outcomes
   - Demonstrate leadership in unconventional ways (not just titles)

4. ACTIVITY SELECTION & PRIORITIZATION:
   - Select 6-8 MOST SIGNIFICANT activities (quality >>> quantity)
   - Prioritize by: (1) Alignment with college values, (2) Leadership/impact, (3) Time commitment
   - Activities should show DEPTH: multi-year commitments with increasing responsibility
   - Include "spiky" achievements that differentiate from other applicants
   - Balance: academics, extracurriculars, service, personal pursuits

5. AUTHENTIC VOICE & PERSONALITY:
   - Personal summary should reveal character, values, and authentic passion
   - Avoid clichés and generic statements ("hard-working", "passionate about helping others")
   - Show SPECIFIC interests and WHY they matter to you
   - Convey intellectual humility and growth mindset
   - Let your unique perspective and experiences shine through

6. STRATEGIC FRAMING FOR ${college.name}:
   - Emphasize experiences that align with ${college.name}'s unique culture
   - If applying to STEM-focused: highlight technical depth and research
   - If applying to liberal arts: emphasize interdisciplinary thinking and humanities
   - Show fit with specific programs, research centers, or opportunities at ${college.name}
   - Demonstrate you've done deep research on the institution

STRUCTURE (in this exact order):
## Personal Statement / About Me
[2-3 sentences revealing authentic passion, intellectual vision, and core values]

## Academic Profile
[School, GPA if strong, key coursework, academic interests, research]

## Leadership & Significant Activities
[6-8 activities with CARL framework, prioritized by impact and alignment]
### Activity Name | Role
*Duration, Hours/week commitment*
[Context-Action-Result-Learning description with specific outcomes]

## Honors & Recognition
[Academic awards, competitions, publications - most impressive first]

## Skills & Additional Information
[Languages, technical skills, relevant interests that show depth]

## Why ${college.name}
[2-3 sentences on specific fit with programs, values, and opportunities]

CRITICAL: This CV must tell a COHERENT story of who this student is, what they care about, and why they're a perfect match for ${college.name}'s community and values. Admissions officers should finish reading and think "This student belongs here."`;

            const activitiesText = activities.map(a =>
                `- ${a.name} | ${a.role} at ${a.organization} (${a.startDate} - ${a.endDate}): ${a.description}`
            ).join('\n');

            const achievementsText = achievements.map(a =>
                `- ${a.title} | ${a.org} (${a.date})`
            ).join('\n');

            const userMessage = mode === 'job'
                ? `OBJECTIVE: Create an ATS-optimized, tailored CV that positions me as the IDEAL candidate for this specific role.

=== TARGET JOB DESCRIPTION ===
${jobDescription || 'General software engineering position requiring strong technical skills, problem-solving ability, and collaboration.'}

=== CANDIDATE PROFILE ===
Name: ${profile.name}
Contact: ${profile.email}${profile.phone ? ' | ' + profile.phone : ''}${profile.location ? ' | ' + profile.location : ''}
${profile.linkedin ? 'LinkedIn: ' + profile.linkedin : ''}
${profile.github ? 'GitHub: ' + profile.github : ''}
${profile.portfolio ? 'Portfolio: ' + profile.portfolio : ''}

Current Professional Summary: ${profile.summary || '[Create a compelling summary by analyzing my experience and the job requirements]'}

=== EXPERIENCE & ACTIVITIES ===
${activitiesText || '[No activities provided - create template sections]'}

=== ACHIEVEMENTS & HONORS ===
${achievementsText || '[No achievements provided]'}

=== GENERATION INSTRUCTIONS ===
1. Extract ALL keywords from the job description (technologies, skills, tools, methodologies)
2. ONLY include experiences that demonstrate relevant skills for this role
3. Reframe each experience to highlight transferable skills matching the JD
4. Quantify impact with specific metrics wherever possible
5. Ensure the CV passes ATS by using exact keyword matches from the JD
6. Create a professional summary that includes top 5 keywords and unique value proposition
7. Optimize for both ATS algorithms AND human recruiter review

This CV should make it OBVIOUS why I'm the perfect fit for this role.`
                : `OBJECTIVE: Create a compelling CV that demonstrates authentic fit and exceptional potential for ${college.name}.

=== TARGET INSTITUTION ===
College: ${college.fullName}
Core Values: ${college.research.values.join(', ')}
What They Look For: ${college.research.whatTheyLookFor.join(', ')}
Notable Programs: ${college.research.notablePrograms.join(', ')}

=== APPLICANT PROFILE ===
Name: ${profile.name}
Contact: ${profile.email}
${profile.portfolio ? 'Portfolio: ' + profile.portfolio : ''}
${profile.researchPaper ? 'Research: ' + profile.researchPaper : ''}

Personal Vision/Statement: ${profile.summary || '[Synthesize a vision from my activities that shows intellectual curiosity and values alignment]'}

=== ACTIVITIES & INVOLVEMENTS ===
${activitiesText || '[No activities provided - request student to add activities]'}

=== HONORS & ACHIEVEMENTS ===
${achievementsText || '[No achievements provided]'}

=== GENERATION INSTRUCTIONS ===
1. Select ONLY the 6-8 most impactful activities that align with ${college.name}'s values
2. For each activity, explicitly connect it to at least one of ${college.name}'s core values
3. Use the CARL framework (Context-Action-Result-Learning) for significant activities
4. Demonstrate depth and sustained commitment over breadth
5. Highlight leadership, initiative, and measurable community impact
6. Show intellectual vitality and passion for learning
7. Create a coherent narrative that shows WHO this student is beyond grades
8. Include a "Why ${college.name}" section that demonstrates genuine fit
9. Make the student sound authentic, not generic or cliché

The admissions reader should finish this CV thinking: "This student truly embodies our values and would thrive in our community."`;

            // Call AI
            const response = await fetch('/api/ai/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: aiConfig?.provider || 'claude',
                    apiKey: aiConfig?.apiKey === 'env' ? '' : aiConfig?.apiKey,
                    systemPrompt,
                    userMessage,
                }),
            });

            if (!response.ok) {
                // Fallback: Generate locally with template
                const fallbackCV = generateFallbackCV(profile, activities, achievements, mode, college);
                setGeneratedCV(fallbackCV);
                toast.success('✨ CV generated with template!');
            } else {
                const data = await response.json();
                setGeneratedCV(data.text);
                toast.success('✨ CV generated successfully!');
            }
        } catch (error) {
            console.error('CV generation error:', error);
            // Use fallback
            const fallbackCV = generateFallbackCV(profile, activities, achievements, mode, college);
            setGeneratedCV(fallbackCV);
            toast.success('✨ CV generated with template!');
        } finally {
            setIsGenerating(false);
        }
    };

    // Fallback CV generator with improved formatting
    const generateFallbackCV = (
        profile: UserProfile,
        activities: ActivityItem[],
        achievements: Achievement[],
        mode: CVMode,
        college: typeof targetColleges[0]
    ): string => {
        const header = `# ${profile.name || 'Your Name'}

${profile.email || 'email@example.com'} | ${profile.phone || '(555) 123-4567'} | ${profile.location || 'City, State'}
${profile.linkedin ? `[LinkedIn](${profile.linkedin})` : ''} ${profile.github ? `| [GitHub](${profile.github})` : ''} ${profile.portfolio ? `| [Portfolio](${profile.portfolio})` : ''}

---`;

        const summary = mode === 'job'
            ? `## Professional Summary\n\n${profile.summary || 'Results-driven professional with proven expertise in driving impact through technical excellence and collaborative problem-solving. Passionate about leveraging cutting-edge technologies to solve complex challenges and deliver measurable business value.'}\n\n---`
            : `## About Me\n\n${profile.summary || 'Passionate student with a deep commitment to learning, leadership, and community impact. Driven by intellectual curiosity and a desire to make meaningful contributions to society.'}\n\n---`;

        // For job CVs, add a skills section
        const skillsSection = mode === 'job' && activities.length > 0
            ? `## Technical Skills & Core Competencies\n\nProgramming Languages • Web Development • Data Analysis • Project Management • Team Leadership • Problem Solving • Communication\n\n---\n\n`
            : '';

        const experience = activities.length > 0
            ? `## ${mode === 'job' ? 'Professional Experience' : 'Leadership & Activities'}\n\n${activities.slice(0, mode === 'job' ? 7 : 8).map(a => {
                const totalHours = a.hoursPerWeek * a.weeksPerYear;
                return `### ${a.role} | ${a.organization}
*${a.startDate} - ${a.endDate}* ${totalHours > 0 ? `• ${a.hoursPerWeek} hrs/week` : ''}

${a.description || 'Contributed to team success through dedicated effort and collaboration.'}

${mode === 'job'
    ? `- Demonstrated strong problem-solving abilities and technical expertise
- Collaborated with cross-functional teams to achieve project goals
- Delivered measurable results and drove continuous improvement`
    : `- Total commitment: ${totalHours} hours annually
- Developed leadership and organizational skills
- Made meaningful impact on community and peers`}
`;
            }).join('\n')}\n---`
            : mode === 'job'
                ? `## Professional Experience\n\n*Add your work experience, internships, and relevant projects*\n\n---`
                : `## Leadership & Activities\n\n*Add your extracurricular activities, leadership roles, and community involvement*\n\n---`;

        const achievementsSection = achievements.length > 0
            ? `## ${mode === 'job' ? 'Achievements & Recognition' : 'Honors & Awards'}\n\n${achievements.map(a => `- **${a.title}** - ${a.org} (${a.date})`).join('\n')}\n\n---`
            : '';

        const education = mode === 'job'
            ? `\n## Education\n\n**[Your Degree]** - [University Name]\n*Expected Graduation: [Year]*\n- Relevant Coursework: [List key courses]\n- GPA: [X.XX/4.0]`
            : '';

        const footer = mode === 'college'
            ? `\n## Why ${college.name}\n\nI am deeply excited about ${college.name} because of its unwavering commitment to ${college.research.values[0].toLowerCase()} and ${college.research.values[1].toLowerCase()}. The ${college.research.notablePrograms[0]} program particularly resonates with my passion for ${college.research.values[0].toLowerCase()}, and I am eager to contribute to and learn from ${college.name}'s vibrant community of scholars and innovators.`
            : '';

        return mode === 'job'
            ? `${header}\n\n${summary}\n\n${skillsSection}${experience}\n\n${achievementsSection}${education}`
            : `${header}\n\n${summary}\n\n${experience}\n\n${achievementsSection}${footer}`;
    };

    // Copy to clipboard
    const copyToClipboard = () => {
        navigator.clipboard.writeText(generatedCV);
        toast.success('📋 CV copied to clipboard!');
    };

    // Download PDF
    const handleDownloadPDF = async () => {
        if (!generatedCV) return;

        setIsDownloading(true);
        toast.info('📝 Preparing your PDF...');

        try {
            const response = await fetch('/api/cv/download', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    markdown: generatedCV,
                    profile: profile
                }),
            });

            if (!response.ok) throw new Error('Failed to generate PDF');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `CV_${profile?.name?.replace(/\s+/g, '_') || 'Professional'}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast.success('✅ PDF downloaded successfully!');
        } catch (error) {
            console.error('PDF download error:', error);
            toast.error('Failed to download PDF. Please try again.');
        } finally {
            setIsDownloading(false);
        }
    };

    // Save profile
    const handleSaveProfile = () => {
        setProfile(profileForm);
        setShowProfileModal(false);
        toast.success('✅ Profile saved!');
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
        >
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <FileText className="w-8 h-8" style={{ color: 'var(--accent-primary)' }} />
                        CV Builder
                    </h1>
                    <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>
                        Generate tailored CVs for jobs or college applications
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button
                        variant="secondary"
                        onClick={() => setShowProfileModal(true)}
                        icon={<User className="w-4 h-4" />}
                    >
                        {hasProfile ? 'Edit Profile' : 'Setup Profile'}
                    </Button>
                    {!hasServerKey && !aiConfig && (
                        <Button
                            variant="secondary"
                            onClick={() => setShowAPIKeyModal(true)}
                            icon={<Key className="w-4 h-4" />}
                        >
                            Setup AI
                        </Button>
                    )}
                </div>
            </div>

            {/* Mode Selection */}
            <Card className="p-4">
                <div className="flex items-center gap-4">
                    <span className="font-medium">Target:</span>
                    <div className="flex gap-2">
                        <Button
                            variant={mode === 'job' ? 'primary' : 'secondary'}
                            onClick={() => setMode('job')}
                            icon={<Briefcase className="w-4 h-4" />}
                        >
                            Job Application
                        </Button>
                        <Button
                            variant={mode === 'college' ? 'primary' : 'secondary'}
                            onClick={() => setMode('college')}
                            icon={<GraduationCap className="w-4 h-4" />}
                        >
                            College Application
                        </Button>
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Panel - Configuration */}
                <div className="space-y-4">
                    {/* Target Input */}
                    <Card className="p-4">
                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                            {mode === 'job' ? (
                                <>
                                    <Briefcase className="w-5 h-5" style={{ color: 'var(--accent-gold)' }} />
                                    Job Description
                                </>
                            ) : (
                                <>
                                    <GraduationCap className="w-5 h-5" style={{ color: 'var(--accent-gold)' }} />
                                    Target College
                                </>
                            )}
                        </h3>

                        {mode === 'job' ? (
                            <Textarea
                                placeholder="Paste the job description here... The AI will match your experience to the requirements."
                                value={jobDescription}
                                onChange={e => setJobDescription(e.target.value)}
                                rows={8}
                            />
                        ) : (
                            <div className="space-y-3">
                                <select
                                    value={selectedCollege}
                                    onChange={e => setSelectedCollege(e.target.value)}
                                    className="input-field w-full"
                                >
                                    {targetColleges.map(c => (
                                        <option key={c.id} value={c.id}>
                                            {c.name} - {c.fullName}
                                        </option>
                                    ))}
                                </select>
                                <div className="text-sm p-3 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                                    <p className="font-medium">{college.fullName}</p>
                                    <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>
                                        Values: {college.research.values.slice(0, 3).join(', ')}
                                    </p>
                                </div>
                            </div>
                        )}
                    </Card>

                    {/* Your Data */}
                    <Card className="p-4">
                        <h3 className="font-semibold mb-3">Your Data</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex items-center justify-between">
                                <span style={{ color: 'var(--text-secondary)' }}>Activities</span>
                                <StatusBadge status={hasActivities ? 'success' : 'warning'}>
                                    {activities.length} loaded
                                </StatusBadge>
                            </div>
                            <div className="flex items-center justify-between">
                                <span style={{ color: 'var(--text-secondary)' }}>Achievements</span>
                                <StatusBadge status={achievements.length > 0 ? 'success' : 'neutral'}>
                                    {achievements.length} loaded
                                </StatusBadge>
                            </div>
                            <div className="flex items-center justify-between">
                                <span style={{ color: 'var(--text-secondary)' }}>Profile</span>
                                <StatusBadge status={hasProfile ? 'success' : 'warning'}>
                                    {hasProfile ? 'Complete' : 'Incomplete'}
                                </StatusBadge>
                            </div>
                        </div>
                        {!hasActivities && (
                            <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
                                Tip: Upload documents in /documents to auto-populate activities
                            </p>
                        )}
                    </Card>

                    {/* Generate Button */}
                    <Button
                        className="w-full"
                        onClick={handleGenerateCV}
                        loading={isGenerating}
                        disabled={isGenerating}
                        icon={<Sparkles className="w-5 h-5" />}
                    >
                        {isGenerating ? 'Generating...' : `Generate ${mode === 'job' ? 'Job' : 'College'} CV`}
                    </Button>
                </div>

                {/* Right Panel - Preview */}
                <Card className="p-4 min-h-[500px]">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold flex items-center gap-2">
                            <Eye className="w-5 h-5" />
                            CV Preview
                        </h3>
                        {generatedCV && (
                            <div className="flex gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleDownloadPDF}
                                    loading={isDownloading}
                                    icon={<Download className="w-4 h-4" />}
                                >
                                    Download
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={copyToClipboard}
                                    icon={<Copy className="w-4 h-4" />}
                                >
                                    Copy
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleGenerateCV}
                                    icon={<RefreshCw className="w-4 h-4" />}
                                >
                                    Regenerate
                                </Button>
                            </div>
                        )}
                    </div>

                    {generatedCV ? (
                        <div
                            className="prose prose-invert max-w-none p-4 rounded-lg overflow-auto"
                            style={{
                                background: 'var(--bg-secondary)',
                                maxHeight: '600px',
                                whiteSpace: 'pre-wrap',
                                fontFamily: 'monospace',
                                fontSize: '0.85rem'
                            }}
                        >
                            {generatedCV}
                        </div>
                    ) : (
                        <div
                            className="flex flex-col items-center justify-center h-full text-center"
                            style={{ color: 'var(--text-muted)' }}
                        >
                            <FileText className="w-16 h-16 mb-4 opacity-30" />
                            <p>Your generated CV will appear here</p>
                            <p className="text-sm mt-2">
                                {mode === 'job' ? 'Enter a job description and click Generate' : 'Select a college and click Generate'}
                            </p>
                        </div>
                    )}
                </Card>
            </div>

            {/* Profile Modal */}
            <AnimatePresence>
                {showProfileModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center"
                        style={{ background: 'rgba(0, 0, 0, 0.7)' }}
                        onClick={() => setShowProfileModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            className="w-full max-w-lg mx-4 max-h-[90vh] overflow-auto"
                            onClick={e => e.stopPropagation()}
                        >
                            <Card className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-xl font-bold flex items-center gap-2">
                                        <User className="w-5 h-5" />
                                        Your Profile
                                    </h2>
                                    <Button variant="ghost" size="sm" onClick={() => setShowProfileModal(false)}>
                                        <X className="w-5 h-5" />
                                    </Button>
                                </div>

                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Full Name *</label>
                                            <Input
                                                placeholder="John Doe"
                                                value={profileForm.name}
                                                onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Email *</label>
                                            <Input
                                                placeholder="john@example.com"
                                                value={profileForm.email}
                                                onChange={e => setProfileForm(p => ({ ...p, email: e.target.value }))}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Phone</label>
                                            <Input
                                                placeholder="(555) 123-4567"
                                                value={profileForm.phone}
                                                onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Location</label>
                                            <Input
                                                placeholder="San Francisco, CA"
                                                value={profileForm.location}
                                                onChange={e => setProfileForm(p => ({ ...p, location: e.target.value }))}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">LinkedIn</label>
                                            <Input
                                                placeholder="linkedin.com/in/you"
                                                value={profileForm.linkedin}
                                                onChange={e => setProfileForm(p => ({ ...p, linkedin: e.target.value }))}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">GitHub</label>
                                            <Input
                                                placeholder="github.com/you"
                                                value={profileForm.github}
                                                onChange={e => setProfileForm(p => ({ ...p, github: e.target.value }))}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Portfolio URL</label>
                                            <Input
                                                placeholder="yourportfolio.com"
                                                value={profileForm.portfolio}
                                                onChange={e => setProfileForm(p => ({ ...p, portfolio: e.target.value }))}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Research Paper</label>
                                            <Input
                                                placeholder="arxiv.org/your-paper"
                                                value={profileForm.researchPaper}
                                                onChange={e => setProfileForm(p => ({ ...p, researchPaper: e.target.value }))}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1">Summary</label>
                                        <Textarea
                                            placeholder="Brief professional summary or personal statement..."
                                            value={profileForm.summary}
                                            onChange={e => setProfileForm(p => ({ ...p, summary: e.target.value }))}
                                            rows={3}
                                        />
                                    </div>

                                    <Button className="w-full" onClick={handleSaveProfile}>
                                        Save Profile
                                    </Button>
                                </div>
                            </Card>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* API Key Modal */}
            <AnimatePresence>
                {showAPIKeyModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center"
                        style={{ background: 'rgba(0, 0, 0, 0.7)' }}
                        onClick={() => setShowAPIKeyModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            className="w-full max-w-md mx-4"
                            onClick={e => e.stopPropagation()}
                        >
                            <Card className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-xl font-bold flex items-center gap-2">
                                        <Key className="w-5 h-5" style={{ color: 'var(--accent-gold)' }} />
                                        Claude API Key
                                    </h2>
                                    <Button variant="ghost" size="sm" onClick={() => setShowAPIKeyModal(false)}>
                                        <X className="w-5 h-5" />
                                    </Button>
                                </div>

                                <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                                    Enter your Claude API key for AI CV generation. Get one at{' '}
                                    <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer"
                                        style={{ color: 'var(--accent-primary)' }}>console.anthropic.com</a>
                                </p>

                                <div className="space-y-4">
                                    <Input
                                        type="password"
                                        placeholder="sk-ant-api03-..."
                                        value={apiKeyInput}
                                        onChange={e => setApiKeyInput(e.target.value)}
                                    />

                                    <Button
                                        className="w-full"
                                        onClick={() => {
                                            if (!apiKeyInput.trim()) {
                                                toast.error('Please enter an API key');
                                                return;
                                            }
                                            setAPIKey('claude', apiKeyInput);
                                            setAiConfig({ provider: 'claude', apiKey: apiKeyInput });
                                            setShowAPIKeyModal(false);
                                            setApiKeyInput('');
                                            toast.success('✅ Claude API key saved!');
                                        }}
                                    >
                                        Save API Key
                                    </Button>
                                </div>
                            </Card>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
