'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Button, StatusBadge, Input, Textarea, Tag } from '@/components/ui';
import { useS3Storage } from '@/lib/useS3Storage';
import { toast } from '@/lib/error-handling';
import { getAIConfig, AIConfig, AIProvider, setAPIKey } from '@/lib/ai-providers';
import { targetColleges } from '@/lib/colleges-data';
import {
    processActivitiesForCV,
    formatActivitiesForPrompt,
    generateQualityChecklist,
    validateCVCompleteness,
    EnrichedActivity
} from '@/lib/cv-intelligence';
import {
    deduplicateActivities,
    validateCVQuality,
    generateEliteCollegeCVPrompt,
    postProcessCV
} from '@/lib/cv-generator-elite';
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
            // ===== STEP 1: DEDUPLICATE ACTIVITIES =====
            console.log('[CV Builder] Deduplicating activities...');
            const deduplicated = deduplicateActivities(activities);
            console.log(`[CV Builder] Deduplicated: ${activities.length} → ${deduplicated.length} unique activities`);

            if (deduplicated.length === 0) {
                toast.error('No activities found. Please add activities first.');
                setIsGenerating(false);
                return;
            }

            // ===== STEP 2: USE ELITE PROMPT FOR COLLEGE CVs =====
            let systemPrompt: string;
            let userMessage: string;

            if (mode === 'college') {
                // Use the new elite system for college CVs
                const elitePrompt = generateEliteCollegeCVPrompt(
                    profile,
                    activities,
                    achievements,
                    college.name,
                    college.research.values
                );
                systemPrompt = elitePrompt.systemPrompt;
                userMessage = elitePrompt.userMessage;
            } else {
                // For job CVs, use the existing intelligence engine
                const enrichedActivities = processActivitiesForCV(activities, {
                    mode,
                    targetContext: jobDescription || '',
                    maxActivities: 10,
                    enforceQuantification: true
                });

                const activitiesText = formatActivitiesForPrompt(enrichedActivities);
                const qualityChecklist = generateQualityChecklist(enrichedActivities, mode);

                systemPrompt = `You are an ELITE executive resume writer who has helped 1000+ candidates land roles at FAANG, Fortune 500, and top startups. Your CVs have a 95% interview callback rate.

🎯 PRIMARY OBJECTIVE: Create an ATS-optimized, keyword-rich CV that positions this candidate as the #1 choice for THIS specific role.

═══════════════════════════════════════════════════════════════════
⚠️  CRITICAL REQUIREMENT - ACTIVITY INCLUSION ⚠️
═══════════════════════════════════════════════════════════════════

You will receive ${enrichedActivities.length} pre-scored activities below.

🚨 MANDATORY RULES (VIOLATION = FAILURE):
1. You MUST include ALL ${enrichedActivities.length} activities in the final CV
2. Each activity MUST appear with at least 2-3 achievement bullets
3. High-priority activities get 4-5 bullets with detailed metrics
4. Medium-priority activities get 2-3 bullets
5. Low-priority activities get 2 bullets minimum
6. DO NOT skip, merge, or omit any activity marked as provided

═══════════════════════════════════════════════════════════════════
📊 ATS OPTIMIZATION FRAMEWORK (Pass Rate: 98%)
═══════════════════════════════════════════════════════════════════

**Keyword Strategy:**
- Extract EVERY technical term from job description
- Use EXACT terminology (e.g., "React.js" if JD says "React.js", not "React")
- Include acronyms AND full forms: "CI/CD (Continuous Integration/Continuous Deployment)"
- Professional summary MUST contain top 7-10 keywords
- First bullet of each role MUST include 2-3 JD keywords

**ATS-Safe Formatting:**
- Standard headers: Professional Summary, Technical Skills, Professional Experience, Education
- No tables, columns, text boxes, headers/footers, images
- Left-aligned text, simple bullets (•)
- Date format: MM/YYYY - MM/YYYY

═══════════════════════════════════════════════════════════════════
💎 IMPACT STORYTELLING FRAMEWORK (X-Y-Z Formula)
═══════════════════════════════════════════════════════════════════

For EVERY bullet point, follow this formula:
**"Accomplished [X] as measured by [Y] by doing [Z]"**

✅ GOOD: "Increased user engagement by 40% (150K → 210K MAU) by implementing React-based infinite scroll and predictive content loading"
❌ BAD: "Responsible for improving user engagement through various technical implementations"

**Quantification Requirements:**
- Use numbers: %, $, time saved, users impacted, performance gains
- If no metrics exist, estimate reasonably: "~50 users", "5+ projects", "approximately 20% improvement"
- Include scale: team size, budget, user base, geographic reach

**Action Verb Bank (Power Verbs ONLY):**
- Impact: Accelerated, Amplified, Boosted, Maximized, Optimized
- Building: Architected, Built, Deployed, Engineered, Developed
- Leadership: Directed, Led, Managed, Spearheaded, Pioneered
- Analysis: Analyzed, Evaluated, Identified, Researched, Investigated

═══════════════════════════════════════════════════════════════════
🎨 STRUCTURE & FORMATTING
═══════════════════════════════════════════════════════════════════

## Professional Summary
[3-4 powerful sentences. Must include: (1) years of experience/background, (2) top 7 keywords from JD, (3) unique value proposition, (4) career highlight with metric]

## Technical Skills & Core Competencies
**Programming & Technologies:** [Most relevant to JD first]
**Tools & Platforms:** [Match JD terminology]
**Methodologies:** [Agile, Scrum, etc. if in JD]
**Soft Skills:** [Only if explicitly mentioned in JD]

## Professional Experience
[Order by RELEVANCE to role, not chronology - put most relevant first]

For each activity:
### [Role Title] | [Organization Name]
*[Start Date] - [End Date] • [Hours/week commitment if significant]*

- [X-Y-Z bullet with metrics and 2-3 JD keywords]
- [X-Y-Z bullet emphasizing leadership/initiative]
- [X-Y-Z bullet showing technical depth]
- [X-Y-Z bullet with business impact]
- [Optional 5th bullet for high-priority activities]

## Education
**[Degree]** in [Major] - [University]
[Graduation Date] • GPA: [X.XX/4.0] (if strong)
*Relevant Coursework:* [If early career and relevant to role]

## Achievements & Recognition
[Awards, publications, patents - only if impressive and relevant]

═══════════════════════════════════════════════════════════════════
✅ QUALITY CHECKLIST (Must satisfy ALL before submitting)
═══════════════════════════════════════════════════════════════════

${qualityChecklist.map(item => item).join('\n')}
✓ Every bullet starts with powerful past-tense action verb
✓ No generic statements like "responsible for" or "worked on"
✓ Parallel structure throughout (consistent tense and format)
✓ Total length: 1-2 pages (preferably 1 page if <5 years experience)
✓ Zero typos, perfect grammar, consistent formatting

═══════════════════════════════════════════════════════════════════

REMEMBER: This CV needs to get past ATS (keyword match) AND impress human recruiters (compelling narrative). You're not just listing experiences—you're telling the story of why this candidate is THE perfect hire.`;

                // Now construct the userMessage for job mode
                const achievementsText = achievements.map(a =>
                    `- ${a.title} | ${a.org} (${a.date})`
                ).join('\n');

                userMessage = `═══════════════════════════════════════════════════════════════════
🎯 MISSION: Create ATS-optimized CV for THIS role
═══════════════════════════════════════════════════════════════════

📄 TARGET JOB DESCRIPTION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${jobDescription || 'General software engineering position requiring strong technical skills, problem-solving ability, teamwork, and experience with modern development tools and methodologies.'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👤 CANDIDATE PROFILE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
**Name:** ${profile.name}
**Contact:** ${profile.email}${profile.phone ? ' | ' + profile.phone : ''}${profile.location ? ' | ' + profile.location : ''}
${profile.linkedin ? '**LinkedIn:** ' + profile.linkedin : ''}
${profile.github ? '**GitHub:** ' + profile.github : ''}
${profile.portfolio ? '**Portfolio:** ' + profile.portfolio : ''}

**Current Summary/Bio:**
${profile.summary || '[Analyze my activities below and create a compelling 3-4 sentence professional summary that includes top keywords from the job description and highlights my unique value proposition]'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💼 MY PROFESSIONAL EXPERIENCE & ACTIVITIES (${enrichedActivities.length} TOTAL):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${activitiesText}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏆 ACHIEVEMENTS & HONORS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${achievementsText || '[No achievements provided - focus on activities above]'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  CRITICAL EXECUTION REQUIREMENTS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Include ALL ${enrichedActivities.length} activities listed above (no exceptions)
✅ High-priority activities → 4-5 achievement bullets each
✅ Medium-priority activities → 2-3 achievement bullets each
✅ Low-priority activities → 2 achievement bullets minimum
✅ Use X-Y-Z formula for every single bullet point
✅ Extract and use EXACT keywords from job description
✅ Start every bullet with powerful action verb (past tense)
✅ Include quantifiable metrics in 100% of bullets
✅ Professional summary must include top 7-10 JD keywords
✅ Order experiences by relevance to role (high-priority first)
✅ Total length: 1-2 pages maximum
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This CV must make it CRYSTAL CLEAR why I'm the #1 candidate for this role.`;
            }
            // For college mode, elite prompt system already set systemPrompt and userMessage above (in the if block)

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
                // Log error details
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                console.error('AI API Error:', errorData);
                toast.error(`AI Generation Failed: ${errorData.message || errorData.error || 'Unknown error'}`);

                // Fallback: Generate locally with template
                const fallbackCV = generateFallbackCV(profile, activities, achievements, mode, college);
                setGeneratedCV(fallbackCV);
                toast.warning('⚠️ Using fallback template - Configure AI API key in Settings for AI-powered generation');
            } else {
                const data = await response.json();
                let generatedText = data.text;

                // ===== STEP 3: POST-PROCESS & VALIDATE =====
                console.log('[CV Builder] Post-processing generated CV...');

                // Apply elite post-processing (remove duplicates, generic phrases)
                generatedText = postProcessCV(generatedText);

                // Run quality validation
                const qualityCheck = validateCVQuality(generatedText, activities);
                console.log('[CV Builder] Quality check:', qualityCheck);

                if (!qualityCheck.passed) {
                    toast.warning(`⚠️ CV quality score: ${qualityCheck.score}/100. Issues: ${qualityCheck.issues.slice(0, 2).join(', ')}`);
                }

                // ===== QUALITY VALIDATION: Check if all activities are included =====
                const validation = validateCVCompleteness(generatedText, activities);

                if (!validation.isComplete && validation.missingActivities.length > 0) {
                    toast.warning(
                        `⚠️ Generated CV is missing ${validation.missingActivities.length} activities. Adding them now...`
                    );

                    // Append missing activities to CV
                    let enhancedCV = generatedText;
                    enhancedCV += '\n\n---\n\n## Additional Experience\n\n';

                    validation.missingActivities.forEach((missingName, idx) => {
                        const missingActivity = activities.find(a =>
                            missingName.includes(a.organization) || missingName.includes(a.role)
                        );

                        if (missingActivity) {
                            const totalHours = missingActivity.hoursPerWeek * missingActivity.weeksPerYear;
                            enhancedCV += `### ${missingActivity.role} | ${missingActivity.organization}\n`;
                            enhancedCV += `*${missingActivity.startDate} - ${missingActivity.endDate}* • ${totalHours} total hours\n\n`;
                            enhancedCV += `${missingActivity.description}\n\n`;
                        }
                    });

                    setGeneratedCV(enhancedCV);
                    toast.info(`✅ All ${activities.length} activities now included in CV!`);
                } else {
                    setGeneratedCV(generatedText);
                    toast.success(`✨ CV generated with all ${activities.length} activities included!`);
                }
            }
        } catch (error) {
            console.error('CV generation error:', error);
            toast.error(`Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);

            // Use fallback
            const fallbackCV = generateFallbackCV(profile, activities, achievements, mode, college);
            setGeneratedCV(fallbackCV);
            toast.warning('⚠️ Using fallback template - Check console for errors');
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
