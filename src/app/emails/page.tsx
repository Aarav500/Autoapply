'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, Button, StatusBadge, Input, Tag } from '@/components/ui';
import {
    Mail,
    Send,
    Inbox,
    Archive,
    Star,
    Trash2,
    RefreshCw,
    Plus,
    Search,
    Clock,
    CheckCircle2,
    AlertCircle,
    Sparkles,
    Copy
} from 'lucide-react';

interface Email {
    id: string;
    to: string;
    subject: string;
    preview: string;
    date: string;
    status: 'sent' | 'draft' | 'scheduled';
    starred: boolean;
    category: 'job' | 'college' | 'other';
}

const mockEmails: Email[] = [
    {
        id: '1',
        to: 'hr@ucr.edu',
        subject: 'Application Follow-up: Research Assistant Position',
        preview: 'Dear Hiring Manager, I am writing to follow up on my application for the Research Assistant position...',
        date: '2026-01-02',
        status: 'sent',
        starred: true,
        category: 'job',
    },
    {
        id: '2',
        to: 'admissions@ucla.edu',
        subject: 'Transfer Application Inquiry',
        preview: 'Hello, I had a question regarding the additional documents required for transfer applicants...',
        date: '2026-01-01',
        status: 'sent',
        starred: false,
        category: 'college',
    },
    {
        id: '3',
        to: 'professor.smith@ucr.edu',
        subject: 'Thank You - Research Discussion',
        preview: 'Thank you for meeting with me today to discuss research opportunities in your lab...',
        date: '2025-12-28',
        status: 'sent',
        starred: true,
        category: 'job',
    },
    {
        id: '4',
        to: 'career@ucb.edu',
        subject: 'Information Session Follow-up',
        preview: 'Dear Admissions Team, I wanted to thank you for the informative transfer student session...',
        date: '',
        status: 'draft',
        starred: false,
        category: 'college',
    },
];

const emailTemplates = [
    { id: '1', name: 'Thank You After Interview', category: 'job' },
    { id: '2', name: 'Application Follow-up', category: 'job' },
    { id: '3', name: 'Professor Introduction', category: 'job' },
    { id: '4', name: 'Admissions Inquiry', category: 'college' },
    { id: '5', name: 'Document Submission', category: 'college' },
    { id: '6', name: 'Recommendation Request', category: 'other' },
];

type TabType = 'all' | 'sent' | 'drafts' | 'starred';

export default function EmailsPage() {
    const [activeTab, setActiveTab] = useState<TabType>('all');
    const [emails, setEmails] = useState<Email[]>(mockEmails);
    const [searchQuery, setSearchQuery] = useState('');
    const [showCompose, setShowCompose] = useState(false);
    const [composeData, setComposeData] = useState({ to: '', subject: '', body: '' });

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.05 },
        },
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
    };

    const filteredEmails = emails.filter(email => {
        const matchesSearch = email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
            email.to.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesTab = activeTab === 'all' ||
            (activeTab === 'sent' && email.status === 'sent') ||
            (activeTab === 'drafts' && email.status === 'draft') ||
            (activeTab === 'starred' && email.starred);
        return matchesSearch && matchesTab;
    });

    const handleGenerateEmail = async (template: string) => {
        // Simulate AI generation
        setComposeData({
            to: '',
            subject: `Generated: ${template}`,
            body: `Dear [Recipient],\n\nI hope this email finds you well. [AI-generated content based on your template and context from your documents and activities.]\n\nThank you for your time and consideration.\n\nBest regards,\n[Your Name]`,
        });
        setShowCompose(true);
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6"
        >
            {/* Header */}
            <motion.div variants={itemVariants} className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
                        Email Manager
                    </h1>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        Manage application-related emails with AI assistance
                    </p>
                </div>
                <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowCompose(true)}>
                    Compose
                </Button>
            </motion.div>

            {/* Stats */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(20, 184, 166, 0.15)' }}>
                        <Send className="w-6 h-6" style={{ color: 'var(--accent-teal)' }} />
                    </div>
                    <div>
                        <p className="text-2xl font-bold">{emails.filter(e => e.status === 'sent').length}</p>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Sent</p>
                    </div>
                </Card>
                <Card className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(234, 179, 8, 0.15)' }}>
                        <Archive className="w-6 h-6" style={{ color: 'var(--warning)' }} />
                    </div>
                    <div>
                        <p className="text-2xl font-bold">{emails.filter(e => e.status === 'draft').length}</p>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Drafts</p>
                    </div>
                </Card>
                <Card className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(245, 158, 11, 0.15)' }}>
                        <Star className="w-6 h-6" style={{ color: 'var(--accent-gold)' }} />
                    </div>
                    <div>
                        <p className="text-2xl font-bold">{emails.filter(e => e.starred).length}</p>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Starred</p>
                    </div>
                </Card>
                <Card className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(34, 197, 94, 0.15)' }}>
                        <CheckCircle2 className="w-6 h-6" style={{ color: 'var(--success)' }} />
                    </div>
                    <div>
                        <p className="text-2xl font-bold">2</p>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Responses</p>
                    </div>
                </Card>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Email List */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Tabs and Search */}
                    <motion.div variants={itemVariants} className="flex flex-wrap gap-4 items-center">
                        <div className="flex gap-2">
                            {(['all', 'sent', 'drafts', 'starred'] as TabType[]).map((tab) => (
                                <Button
                                    key={tab}
                                    variant={activeTab === tab ? 'primary' : 'secondary'}
                                    size="sm"
                                    onClick={() => setActiveTab(tab)}
                                >
                                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                </Button>
                            ))}
                        </div>
                        <Input
                            placeholder="Search emails..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            icon={<Search className="w-4 h-4" />}
                            className="flex-1 max-w-xs"
                        />
                    </motion.div>

                    {/* Email List */}
                    <motion.div variants={containerVariants} className="space-y-3">
                        {filteredEmails.map((email) => (
                            <motion.div key={email.id} variants={itemVariants}>
                                <Card className="cursor-pointer">
                                    <div className="flex items-start gap-4">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setEmails(prev => prev.map(e => e.id === email.id ? { ...e, starred: !e.starred } : e));
                                            }}
                                        >
                                            <Star
                                                className="w-5 h-5"
                                                fill={email.starred ? 'var(--accent-gold)' : 'none'}
                                                style={{ color: email.starred ? 'var(--accent-gold)' : 'var(--text-muted)' }}
                                            />
                                        </button>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="font-medium truncate">{email.to}</p>
                                                <Tag variant={email.category === 'job' ? 'primary' : 'default'}>
                                                    {email.category}
                                                </Tag>
                                            </div>
                                            <p className="text-sm font-medium mb-1">{email.subject}</p>
                                            <p className="text-sm truncate" style={{ color: 'var(--text-muted)' }}>
                                                {email.preview}
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                                {email.date || 'Draft'}
                                            </span>
                                            <StatusBadge
                                                status={email.status === 'sent' ? 'success' : email.status === 'scheduled' ? 'warning' : 'info'}
                                            >
                                                {email.status}
                                            </StatusBadge>
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        ))}

                        {filteredEmails.length === 0 && (
                            <Card className="text-center py-12">
                                <Mail className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
                                <h3 className="text-xl font-semibold mb-2">No emails found</h3>
                                <p style={{ color: 'var(--text-muted)' }}>Try a different search or tab</p>
                            </Card>
                        )}
                    </motion.div>
                </div>

                {/* Templates Sidebar */}
                <motion.div variants={itemVariants} className="space-y-4">
                    <Card>
                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                            <Sparkles className="w-5 h-5" style={{ color: 'var(--primary-400)' }} />
                            AI Email Templates
                        </h3>
                        <div className="space-y-2">
                            {emailTemplates.map((template) => (
                                <motion.button
                                    key={template.id}
                                    className="w-full p-3 rounded-lg text-left flex items-center gap-3 transition-colors"
                                    style={{ background: 'var(--bg-secondary)' }}
                                    whileHover={{ x: 4, background: 'var(--bg-tertiary)' }}
                                    onClick={() => handleGenerateEmail(template.name)}
                                >
                                    <Mail className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                                    <span className="text-sm">{template.name}</span>
                                    <Tag className="ml-auto">{template.category}</Tag>
                                </motion.button>
                            ))}
                        </div>
                    </Card>

                    <Card>
                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                            <Clock className="w-5 h-5" style={{ color: 'var(--warning)' }} />
                            Follow-up Reminders
                        </h3>
                        <div className="space-y-3">
                            <div className="p-3 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                                <p className="text-sm font-medium">Research Assistant Application</p>
                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Follow up in 3 days</p>
                            </div>
                            <div className="p-3 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                                <p className="text-sm font-medium">Professor Smith Meeting</p>
                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Send thank you email</p>
                            </div>
                        </div>
                    </Card>
                </motion.div>
            </div>

            {/* Compose Modal */}
            {showCompose && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="modal-overlay"
                    onClick={() => setShowCompose(false)}
                >
                    <motion.div
                        initial={{ scale: 0.95, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        className="modal-content glass-card p-6 w-full max-w-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
                                Compose Email
                            </h2>
                            <div className="flex gap-2">
                                <Button variant="ghost" size="sm" icon={<Sparkles className="w-4 h-4" />}>
                                    AI Improve
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => setShowCompose(false)}>
                                    ✕
                                </Button>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <Input
                                placeholder="To: email@example.com"
                                value={composeData.to}
                                onChange={(e) => setComposeData(prev => ({ ...prev, to: e.target.value }))}
                            />
                            <Input
                                placeholder="Subject"
                                value={composeData.subject}
                                onChange={(e) => setComposeData(prev => ({ ...prev, subject: e.target.value }))}
                            />
                            <textarea
                                className="input-field w-full"
                                rows={12}
                                placeholder="Write your email..."
                                value={composeData.body}
                                onChange={(e) => setComposeData(prev => ({ ...prev, body: e.target.value }))}
                            />
                            <div className="flex gap-3">
                                <Button icon={<Send className="w-4 h-4" />}>Send</Button>
                                <Button variant="secondary" icon={<Clock className="w-4 h-4" />}>Schedule</Button>
                                <Button variant="ghost" icon={<Archive className="w-4 h-4" />}>Save Draft</Button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </motion.div>
    );
}
