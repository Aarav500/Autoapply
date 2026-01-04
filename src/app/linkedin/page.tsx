'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Button, StatusBadge, ProgressBar } from '@/components/ui';
import {
    Linkedin, User, Briefcase, GraduationCap, Award, FileText,
    MessageSquare, Heart, Share2, Users, Eye, TrendingUp, Sparkles,
    CheckCircle2, Circle, Edit3, PlusCircle, Send, RefreshCw, Zap,
    Calendar, Target, Globe, Rocket, Lightbulb
} from 'lucide-react';
import { toast } from '@/lib/error-handling';

// LinkedIn Profile Sections
interface ProfileSection {
    id: string;
    name: string;
    icon: any;
    completeness: number;
    status: 'complete' | 'incomplete' | 'needs_improvement';
    suggestions: string[];
}

interface Post {
    id: string;
    content: string;
    type: 'achievement' | 'learning' | 'insight' | 'project';
    status: 'draft' | 'scheduled' | 'posted';
    scheduledDate?: Date;
    likes?: number;
    comments?: number;
    source?: string; // Source activity
}

interface ConnectionStrategy {
    target: string;
    reason: string;
    messageTemplate: string;
    status: 'pending' | 'sent' | 'connected';
}

// Sample profile data
const profileSections: ProfileSection[] = [
    {
        id: 'headline',
        name: 'Headline',
        icon: User,
        completeness: 60,
        status: 'needs_improvement',
        suggestions: [
            'Add keywords: "Software Engineer", "CS Student"',
            'Mention your target: "Seeking Summer 2026 Internship"',
            'Include school: "UC Riverside"',
        ],
    },
    {
        id: 'about',
        name: 'About Section',
        icon: FileText,
        completeness: 40,
        status: 'incomplete',
        suggestions: [
            'Add a compelling story about your journey',
            'Highlight key skills and achievements',
            'Include call-to-action for recruiters',
        ],
    },
    {
        id: 'experience',
        name: 'Experience',
        icon: Briefcase,
        completeness: 80,
        status: 'needs_improvement',
        suggestions: [
            'Add bullet points with quantified achievements',
            'Include technologies used in each role',
        ],
    },
    {
        id: 'education',
        name: 'Education',
        icon: GraduationCap,
        completeness: 100,
        status: 'complete',
        suggestions: [],
    },
    {
        id: 'skills',
        name: 'Skills & Endorsements',
        icon: Award,
        completeness: 50,
        status: 'incomplete',
        suggestions: [
            'Add: Python, JavaScript, React, Node.js',
            'Ask connections for endorsements',
            'Reorder to show top skills first',
        ],
    },
    {
        id: 'projects',
        name: 'Projects',
        icon: Rocket,
        completeness: 30,
        status: 'incomplete',
        suggestions: [
            'Add your F1 Race Insights project',
            'Include GitHub links and tech stack',
            'Add screenshots/demos',
        ],
    },
];

// Sample activities to convert to posts
const activitiesForPosts = [
    { id: '1', activity: 'Built F1 Race Insights with ML predictions', postIdea: 'Share the journey of building an ML-powered sports analytics platform' },
    { id: '2', activity: 'Led study group for 15 students', postIdea: 'Post about leadership lessons from peer tutoring' },
    { id: '3', activity: 'Published undergraduate research', postIdea: 'Announce your research publication and findings' },
    { id: '4', activity: 'Completed Machine Learning course with A', postIdea: 'Share key learnings and project outcomes' },
    { id: '5', activity: 'Volunteer teaching coding to kids', postIdea: 'Post about the impact of tech education' },
];

// Connection targets for networking
const connectionTargets: ConnectionStrategy[] = [
    {
        target: 'Google Recruiters',
        reason: 'Target company for internship',
        messageTemplate: "Hi! I'm a CS student at UC Riverside interested in Google's SWE internship. I'd love to connect and learn about the intern experience.",
        status: 'pending',
    },
    {
        target: 'Meta University Recruiters',
        reason: 'Target company for internship',
        messageTemplate: "Hello! I'm passionate about building products that connect people. Would love to learn about Meta's internship opportunities.",
        status: 'pending',
    },
    {
        target: 'UCR CS Alumni at FAANG',
        reason: 'Alumni network at target companies',
        messageTemplate: "Hi! Fellow UCR CS student here. I'd love to connect and hear about your journey from UCR to [Company].",
        status: 'pending',
    },
    {
        target: 'ML/AI Engineers',
        reason: 'Interest area networking',
        messageTemplate: "Hi! I'm an aspiring ML engineer researching [topic]. Would love to connect with fellow ML enthusiasts!",
        status: 'pending',
    },
];

export default function LinkedInPage() {
    const [sections, setSections] = useState(profileSections);
    const [posts, setPosts] = useState<Post[]>([]);
    const [connections, setConnections] = useState(connectionTargets);
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [isGeneratingPosts, setIsGeneratingPosts] = useState(false);
    const [activeTab, setActiveTab] = useState<'profile' | 'posts' | 'network'>('profile');

    // Overall profile score
    const profileScore = useMemo(() => {
        return Math.round(sections.reduce((sum, s) => sum + s.completeness, 0) / sections.length);
    }, [sections]);

    // Optimize entire profile with AI
    const handleOptimizeProfile = async () => {
        setIsOptimizing(true);
        toast.info('🧠 AI is optimizing your LinkedIn profile...');

        const steps = [
            'Analyzing current profile...',
            'Generating optimized headline...',
            'Writing compelling About section...',
            'Adding keywords for SEO...',
            'Suggesting skill endorsements...',
        ];

        for (const step of steps) {
            await new Promise(r => setTimeout(r, 1500));
            toast.info(`✏️ ${step}`);
        }

        // Update sections to show improvement
        setSections(prev => prev.map(s => ({
            ...s,
            completeness: Math.min(100, s.completeness + 30),
            status: s.completeness + 30 >= 80 ? 'complete' : 'needs_improvement',
        })));

        toast.success('✅ Profile optimized! Review changes in LinkedIn.');
        setIsOptimizing(false);
    };

    // Generate posts from activities
    const handleGeneratePosts = async () => {
        setIsGeneratingPosts(true);
        toast.info('📝 AI is generating posts from your activities...');

        await new Promise(r => setTimeout(r, 3000));

        const newPosts: Post[] = activitiesForPosts.map((a, i) => ({
            id: `post-${i}`,
            content: generatePostContent(a.postIdea),
            type: i % 4 === 0 ? 'achievement' : i % 4 === 1 ? 'learning' : i % 4 === 2 ? 'insight' : 'project',
            status: 'draft',
            source: a.activity,
        }));

        setPosts(newPosts);
        toast.success(`✅ Generated ${newPosts.length} posts! Review and schedule.`);
        setIsGeneratingPosts(false);
    };

    // Generate post content (would use Claude in production)
    const generatePostContent = (idea: string): string => {
        const templates = [
            `🚀 Excited to share: ${idea}\n\nKey takeaways:\n• [Point 1]\n• [Point 2]\n• [Point 3]\n\nWhat's your experience with this? 👇\n\n#SoftwareEngineering #Tech #Learning`,
            `💡 ${idea}\n\nThis taught me:\n1️⃣ [Lesson 1]\n2️⃣ [Lesson 2]\n3️⃣ [Lesson 3]\n\nWould love to hear your thoughts!\n\n#ComputerScience #Growth`,
            `🎯 Just wrapped up: ${idea}\n\nThe journey was incredible. Here's what I learned...\n\n[Full story]\n\n#Coding #StudentLife #TechCommunity`,
        ];
        return templates[Math.floor(Math.random() * templates.length)];
    };

    // Schedule post
    const schedulePost = (postId: string, date: Date) => {
        setPosts(prev => prev.map(p =>
            p.id === postId ? { ...p, status: 'scheduled', scheduledDate: date } : p
        ));
        toast.success('📅 Post scheduled!');
    };

    // Post now
    const postNow = async (postId: string) => {
        toast.info('📤 Publishing to LinkedIn...');
        await new Promise(r => setTimeout(r, 2000));
        setPosts(prev => prev.map(p =>
            p.id === postId ? { ...p, status: 'posted', likes: 0, comments: 0 } : p
        ));
        toast.success('✅ Posted to LinkedIn!');
    };

    // Send connection requests
    const handleSendConnections = async () => {
        toast.info('📨 Sending connection requests...');

        for (let i = 0; i < connections.length; i++) {
            await new Promise(r => setTimeout(r, 1000));
            setConnections(prev => prev.map((c, idx) =>
                idx === i ? { ...c, status: 'sent' } : c
            ));
        }

        toast.success(`✅ Sent ${connections.length} connection requests!`);
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
                    <h1 className="text-3xl font-bold flex items-center gap-3" style={{ fontFamily: 'var(--font-display)' }}>
                        <Linkedin className="w-8 h-8" style={{ color: '#0077B5' }} />
                        LinkedIn Manager
                    </h1>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        AI-powered profile optimization, post generation, and networking
                    </p>
                </div>

                <div className="flex gap-3">
                    <a href="https://linkedin.com/in/your-profile" target="_blank" rel="noopener noreferrer">
                        <Button variant="secondary" icon={<Globe className="w-4 h-4" />}>
                            View Profile
                        </Button>
                    </a>
                    <Button
                        icon={isOptimizing ? <Sparkles className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                        onClick={handleOptimizeProfile}
                        disabled={isOptimizing}
                    >
                        {isOptimizing ? 'Optimizing...' : 'AI Optimize All'}
                    </Button>
                </div>
            </div>

            {/* Profile Score */}
            <Card style={{ background: 'linear-gradient(135deg, rgba(0,119,181,0.1) 0%, rgba(91,111,242,0.1) 100%)' }}>
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-medium mb-1">Profile Strength</h3>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                            {profileScore >= 80 ? 'All-Star' : profileScore >= 60 ? 'Intermediate' : 'Beginner'} Profile
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-4xl font-bold" style={{ color: '#0077B5' }}>{profileScore}%</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {100 - profileScore}% to All-Star
                        </p>
                    </div>
                </div>
                <div className="mt-3">
                    <ProgressBar value={profileScore} />
                </div>
            </Card>

            {/* Tabs */}
            <div className="flex gap-2 p-1 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
                {[
                    { key: 'profile', label: 'Profile Sections', icon: User },
                    { key: 'posts', label: 'Content & Posts', icon: FileText },
                    { key: 'network', label: 'Networking', icon: Users },
                ].map(({ key, label, icon: Icon }) => (
                    <button
                        key={key}
                        onClick={() => setActiveTab(key as any)}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all`}
                        style={{
                            background: activeTab === key ? 'var(--gradient-primary)' : 'transparent',
                            color: activeTab === key ? 'white' : 'var(--text-secondary)',
                        }}
                    >
                        <Icon className="w-4 h-4" />
                        {label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
                {activeTab === 'profile' && (
                    <motion.div
                        key="profile"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-4"
                    >
                        {sections.map((section, index) => (
                            <motion.div
                                key={section.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <Card>
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${section.status === 'complete' ? 'bg-green-500/20' :
                                                    section.status === 'needs_improvement' ? 'bg-yellow-500/20' : 'bg-red-500/20'
                                                }`}>
                                                <section.icon className={`w-5 h-5 ${section.status === 'complete' ? 'text-green-500' :
                                                        section.status === 'needs_improvement' ? 'text-yellow-500' : 'text-red-500'
                                                    }`} />
                                            </div>
                                            <div>
                                                <h4 className="font-medium">{section.name}</h4>
                                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                                    {section.completeness}% complete
                                                </p>
                                            </div>
                                        </div>
                                        {section.status === 'complete' ? (
                                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                                        ) : (
                                            <Button variant="secondary" size="sm" icon={<Edit3 className="w-3 h-3" />}>
                                                Improve
                                            </Button>
                                        )}
                                    </div>

                                    <div className="h-1.5 rounded-full overflow-hidden mb-3" style={{ background: 'var(--bg-tertiary)' }}>
                                        <div
                                            className="h-full rounded-full transition-all"
                                            style={{
                                                width: `${section.completeness}%`,
                                                background: section.status === 'complete' ? 'var(--success)' :
                                                    section.status === 'needs_improvement' ? 'var(--warning)' : 'var(--error)'
                                            }}
                                        />
                                    </div>

                                    {section.suggestions.length > 0 && (
                                        <div className="space-y-1">
                                            {section.suggestions.map((suggestion, i) => (
                                                <div key={i} className="flex items-start gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                                                    <Lightbulb className="w-3 h-3 mt-0.5 text-yellow-500" />
                                                    {suggestion}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </Card>
                            </motion.div>
                        ))}
                    </motion.div>
                )}

                {activeTab === 'posts' && (
                    <motion.div
                        key="posts"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-4"
                    >
                        {/* Generate Posts Button */}
                        <Card>
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-medium">Generate Posts from Activities</h3>
                                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                                        AI will create engaging posts from your activities and achievements
                                    </p>
                                </div>
                                <Button
                                    icon={isGeneratingPosts ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                    onClick={handleGeneratePosts}
                                    disabled={isGeneratingPosts}
                                >
                                    {isGeneratingPosts ? 'Generating...' : 'Generate Posts'}
                                </Button>
                            </div>
                        </Card>

                        {/* Posts List */}
                        {posts.length > 0 ? (
                            <div className="space-y-3">
                                {posts.map((post, index) => (
                                    <motion.div
                                        key={post.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                    >
                                        <Card>
                                            <div className="flex items-start justify-between mb-2">
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${post.type === 'achievement' ? 'bg-green-500/20 text-green-500' :
                                                        post.type === 'learning' ? 'bg-blue-500/20 text-blue-500' :
                                                            post.type === 'insight' ? 'bg-purple-500/20 text-purple-500' :
                                                                'bg-orange-500/20 text-orange-500'
                                                    }`}>
                                                    {post.type}
                                                </span>
                                                <StatusBadge status={
                                                    post.status === 'posted' ? 'success' :
                                                        post.status === 'scheduled' ? 'warning' : 'neutral'
                                                }>
                                                    {post.status}
                                                </StatusBadge>
                                            </div>

                                            <p className="text-sm mb-3 whitespace-pre-line">{post.content}</p>

                                            {post.source && (
                                                <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                                                    📌 From: {post.source}
                                                </p>
                                            )}

                                            {post.status === 'posted' && (
                                                <div className="flex gap-4 text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                                                    <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {post.likes} likes</span>
                                                    <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /> {post.comments} comments</span>
                                                </div>
                                            )}

                                            {post.status === 'draft' && (
                                                <div className="flex gap-2">
                                                    <Button variant="secondary" size="sm" icon={<Edit3 className="w-3 h-3" />}>
                                                        Edit
                                                    </Button>
                                                    <Button variant="secondary" size="sm" icon={<Calendar className="w-3 h-3" />}
                                                        onClick={() => schedulePost(post.id, new Date(Date.now() + 24 * 60 * 60 * 1000))}
                                                    >
                                                        Schedule
                                                    </Button>
                                                    <Button size="sm" icon={<Send className="w-3 h-3" />} onClick={() => postNow(post.id)}>
                                                        Post Now
                                                    </Button>
                                                </div>
                                            )}
                                        </Card>
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            <Card className="text-center py-12">
                                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p style={{ color: 'var(--text-muted)' }}>
                                    Click "Generate Posts" to create content from your activities
                                </p>
                            </Card>
                        )}
                    </motion.div>
                )}

                {activeTab === 'network' && (
                    <motion.div
                        key="network"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-4"
                    >
                        {/* Networking Strategy */}
                        <Card>
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="font-medium">Strategic Connections</h3>
                                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                                        AI-suggested connections to grow your network
                                    </p>
                                </div>
                                <Button
                                    icon={<Send className="w-4 h-4" />}
                                    onClick={handleSendConnections}
                                >
                                    Send All Requests
                                </Button>
                            </div>

                            <div className="space-y-3">
                                {connections.map((conn, index) => (
                                    <div key={index} className="p-3 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--bg-tertiary)' }}>
                                                    <Users className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-sm">{conn.target}</p>
                                                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{conn.reason}</p>
                                                </div>
                                            </div>
                                            <StatusBadge status={
                                                conn.status === 'connected' ? 'success' :
                                                    conn.status === 'sent' ? 'warning' : 'neutral'
                                            }>
                                                {conn.status}
                                            </StatusBadge>
                                        </div>
                                        <p className="text-xs p-2 rounded-lg" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
                                            📝 {conn.messageTemplate}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </Card>

                        {/* Stats */}
                        <div className="grid grid-cols-4 gap-4">
                            <Card className="text-center">
                                <Users className="w-6 h-6 mx-auto mb-2" style={{ color: '#0077B5' }} />
                                <p className="text-2xl font-bold">500+</p>
                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Connections</p>
                            </Card>
                            <Card className="text-center">
                                <Eye className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--success)' }} />
                                <p className="text-2xl font-bold">1.2K</p>
                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Profile Views</p>
                            </Card>
                            <Card className="text-center">
                                <TrendingUp className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--warning)' }} />
                                <p className="text-2xl font-bold">45</p>
                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Search Appearances</p>
                            </Card>
                            <Card className="text-center">
                                <Heart className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--error)' }} />
                                <p className="text-2xl font-bold">89</p>
                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Post Impressions</p>
                            </Card>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
