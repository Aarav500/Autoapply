'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, Button, StatusBadge, ProgressBar, Tag } from '@/components/ui';
import {
    GraduationCap,
    Briefcase,
    MessageSquare,
    Clock,
    CheckCircle2,
    ChevronRight,
    Play,
    BookOpen,
    Target,
    Award,
    Lightbulb,
    Star
} from 'lucide-react';

interface Question {
    id: string;
    question: string;
    category: string;
    difficulty: 'easy' | 'medium' | 'hard';
    practiced: boolean;
}

const interviewQuestions: Question[] = [
    { id: '1', question: 'Tell me about yourself.', category: 'general', difficulty: 'easy', practiced: true },
    { id: '2', question: 'Why do you want to transfer to this university?', category: 'college', difficulty: 'medium', practiced: true },
    { id: '3', question: 'What is your greatest strength?', category: 'general', difficulty: 'easy', practiced: false },
    { id: '4', question: 'Describe a challenge you overcame.', category: 'behavioral', difficulty: 'medium', practiced: true },
    { id: '5', question: 'Why should we hire you?', category: 'job', difficulty: 'hard', practiced: false },
    { id: '6', question: 'Where do you see yourself in 5 years?', category: 'general', difficulty: 'medium', practiced: false },
    { id: '7', question: 'Tell me about a time you demonstrated leadership.', category: 'behavioral', difficulty: 'hard', practiced: true },
    { id: '8', question: 'How do you handle stress?', category: 'behavioral', difficulty: 'medium', practiced: false },
];

const starExamples = [
    {
        title: 'Leadership Example',
        situation: 'International Student Association needed restructuring due to low engagement.',
        task: 'As newly elected president, I needed to increase participation by 50%.',
        action: 'I implemented a mentorship program and organized cultural events that appealed to diverse interests.',
        result: 'Membership grew by 75% and we won the Best Student Organization award.',
    },
    {
        title: 'Problem-Solving Example',
        situation: 'Research project faced a critical bug that crashed the system before presentation.',
        task: 'I needed to identify and fix the issue within 24 hours.',
        action: 'I systematically debugged the code, consulted online resources, and reached out to peers.',
        result: 'Fixed the bug and successfully presented, receiving recognition from the professor.',
    },
];

type TabType = 'questions' | 'star' | 'tips';

export default function PreparePage() {
    const [activeTab, setActiveTab] = useState<TabType>('questions');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [showPractice, setShowPractice] = useState(false);
    const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
    const [userAnswer, setUserAnswer] = useState('');

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

    const categories = ['all', 'general', 'behavioral', 'college', 'job'];
    const filteredQuestions = selectedCategory === 'all'
        ? interviewQuestions
        : interviewQuestions.filter(q => q.category === selectedCategory);

    const practicedCount = interviewQuestions.filter(q => q.practiced).length;
    const progress = (practicedCount / interviewQuestions.length) * 100;

    const startPractice = (question: Question) => {
        setCurrentQuestion(question);
        setShowPractice(true);
        setUserAnswer('');
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
                        Interview Preparation
                    </h1>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        Practice for college and job interviews with AI feedback
                    </p>
                </div>
                <Button icon={<Play className="w-4 h-4" />}>
                    Start Practice Session
                </Button>
            </motion.div>

            {/* Stats */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(91, 111, 242, 0.15)' }}>
                        <MessageSquare className="w-6 h-6" style={{ color: 'var(--primary-400)' }} />
                    </div>
                    <div>
                        <p className="text-2xl font-bold">{interviewQuestions.length}</p>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Questions</p>
                    </div>
                </Card>
                <Card className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(34, 197, 94, 0.15)' }}>
                        <CheckCircle2 className="w-6 h-6" style={{ color: 'var(--success)' }} />
                    </div>
                    <div>
                        <p className="text-2xl font-bold">{practicedCount}</p>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Practiced</p>
                    </div>
                </Card>
                <Card className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(245, 158, 11, 0.15)' }}>
                        <Clock className="w-6 h-6" style={{ color: 'var(--accent-gold)' }} />
                    </div>
                    <div>
                        <p className="text-2xl font-bold">2</p>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Upcoming</p>
                    </div>
                </Card>
                <Card className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(168, 85, 247, 0.15)' }}>
                        <Target className="w-6 h-6" style={{ color: 'var(--accent-purple)' }} />
                    </div>
                    <div>
                        <p className="text-2xl font-bold">{Math.round(progress)}%</p>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Ready</p>
                    </div>
                </Card>
            </motion.div>

            {/* Progress */}
            <motion.div variants={itemVariants}>
                <Card>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold">Overall Preparation Progress</h3>
                        <span className="font-bold" style={{ color: 'var(--primary-400)' }}>{Math.round(progress)}%</span>
                    </div>
                    <ProgressBar value={progress} />
                </Card>
            </motion.div>

            {/* Tabs */}
            <motion.div variants={itemVariants} className="flex gap-2">
                {(['questions', 'star', 'tips'] as TabType[]).map((tab) => (
                    <Button
                        key={tab}
                        variant={activeTab === tab ? 'primary' : 'secondary'}
                        onClick={() => setActiveTab(tab)}
                        icon={tab === 'questions' ? <MessageSquare className="w-4 h-4" /> : tab === 'star' ? <Star className="w-4 h-4" /> : <Lightbulb className="w-4 h-4" />}
                    >
                        {tab === 'questions' ? 'Question Bank' : tab === 'star' ? 'STAR Method' : 'Interview Tips'}
                    </Button>
                ))}
            </motion.div>

            {/* Questions Tab */}
            {activeTab === 'questions' && (
                <>
                    <motion.div variants={itemVariants} className="flex gap-2 flex-wrap">
                        {categories.map((cat) => (
                            <Button
                                key={cat}
                                variant={selectedCategory === cat ? 'primary' : 'secondary'}
                                size="sm"
                                onClick={() => setSelectedCategory(cat)}
                            >
                                {cat.charAt(0).toUpperCase() + cat.slice(1)}
                            </Button>
                        ))}
                    </motion.div>

                    <motion.div variants={containerVariants} className="space-y-3">
                        {filteredQuestions.map((question) => (
                            <motion.div key={question.id} variants={itemVariants}>
                                <Card className="flex items-center gap-4">
                                    <div
                                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                        style={{
                                            background: question.practiced
                                                ? 'rgba(34, 197, 94, 0.15)'
                                                : 'rgba(156, 163, 175, 0.15)'
                                        }}
                                    >
                                        {question.practiced
                                            ? <CheckCircle2 className="w-5 h-5" style={{ color: 'var(--success)' }} />
                                            : <MessageSquare className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                                        }
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium">{question.question}</p>
                                        <div className="flex gap-2 mt-1">
                                            <Tag>{question.category}</Tag>
                                            <Tag variant={question.difficulty === 'hard' ? 'primary' : 'default'}>
                                                {question.difficulty}
                                            </Tag>
                                        </div>
                                    </div>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => startPractice(question)}
                                        icon={<Play className="w-4 h-4" />}
                                    >
                                        Practice
                                    </Button>
                                </Card>
                            </motion.div>
                        ))}
                    </motion.div>
                </>
            )}

            {/* STAR Method Tab */}
            {activeTab === 'star' && (
                <motion.div variants={containerVariants} className="space-y-6">
                    <motion.div variants={itemVariants}>
                        <Card>
                            <h3 className="text-xl font-bold mb-4" style={{ fontFamily: 'var(--font-display)' }}>
                                The STAR Method
                            </h3>
                            <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
                                Use this framework to structure your behavioral interview answers effectively.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                {[
                                    { letter: 'S', title: 'Situation', desc: 'Set the scene and give context' },
                                    { letter: 'T', title: 'Task', desc: 'Describe your responsibility' },
                                    { letter: 'A', title: 'Action', desc: 'Explain what you did' },
                                    { letter: 'R', title: 'Result', desc: 'Share the outcome' },
                                ].map((item) => (
                                    <div key={item.letter} className="p-4 rounded-xl text-center" style={{ background: 'var(--bg-secondary)' }}>
                                        <div
                                            className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                                            style={{ background: 'var(--gradient-primary)' }}
                                        >
                                            <span className="text-xl font-bold text-white">{item.letter}</span>
                                        </div>
                                        <h4 className="font-semibold mb-1">{item.title}</h4>
                                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{item.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </motion.div>

                    <motion.div variants={itemVariants}>
                        <h3 className="font-semibold mb-4">Your STAR Examples (from activities)</h3>
                    </motion.div>

                    {starExamples.map((example, index) => (
                        <motion.div key={index} variants={itemVariants}>
                            <Card>
                                <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                                    <Star className="w-5 h-5" style={{ color: 'var(--accent-gold)' }} />
                                    {example.title}
                                </h4>
                                <div className="space-y-4">
                                    {Object.entries(example).filter(([key]) => key !== 'title').map(([key, value]) => (
                                        <div key={key} className="flex gap-3">
                                            <div
                                                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                                style={{ background: 'var(--gradient-primary)' }}
                                            >
                                                <span className="text-sm font-bold text-white">{key[0].toUpperCase()}</span>
                                            </div>
                                            <div>
                                                <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                                                    {key.charAt(0).toUpperCase() + key.slice(1)}
                                                </p>
                                                <p className="text-sm">{value}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        </motion.div>
                    ))}
                </motion.div>
            )}

            {/* Tips Tab */}
            {activeTab === 'tips' && (
                <motion.div variants={containerVariants} className="card-grid">
                    {[
                        { icon: <Clock />, title: 'Arrive Early', desc: 'Be 10-15 minutes early to show punctuality and professionalism.' },
                        { icon: <BookOpen />, title: 'Research', desc: 'Know the company/university values, recent news, and your interviewer if possible.' },
                        { icon: <Target />, title: 'Be Specific', desc: 'Use concrete examples and numbers when describing your achievements.' },
                        { icon: <MessageSquare />, title: 'Ask Questions', desc: 'Prepare thoughtful questions that show your interest and research.' },
                        { icon: <Star />, title: 'Follow Up', desc: 'Send a thank-you email within 24 hours after the interview.' },
                        { icon: <Award />, title: 'Practice', desc: 'Rehearse common questions but dont sound scripted. Be natural.' },
                    ].map((tip, index) => (
                        <motion.div key={index} variants={itemVariants}>
                            <Card>
                                <div
                                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                                    style={{ background: 'rgba(91, 111, 242, 0.15)' }}
                                >
                                    <span style={{ color: 'var(--primary-400)' }}>{tip.icon}</span>
                                </div>
                                <h3 className="font-semibold mb-2">{tip.title}</h3>
                                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{tip.desc}</p>
                            </Card>
                        </motion.div>
                    ))}
                </motion.div>
            )}

            {/* Practice Modal */}
            {showPractice && currentQuestion && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="modal-overlay"
                    onClick={() => setShowPractice(false)}
                >
                    <motion.div
                        initial={{ scale: 0.95, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        className="modal-content glass-card p-6 w-full max-w-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                                    style={{ background: 'var(--gradient-primary)' }}
                                >
                                    <MessageSquare className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="font-bold" style={{ fontFamily: 'var(--font-display)' }}>
                                        Practice Question
                                    </h2>
                                    <div className="flex gap-2 mt-1">
                                        <Tag>{currentQuestion.category}</Tag>
                                        <Tag variant="primary">{currentQuestion.difficulty}</Tag>
                                    </div>
                                </div>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setShowPractice(false)}>✕</Button>
                        </div>

                        <Card className="mb-4" style={{ background: 'var(--bg-secondary)' }}>
                            <p className="text-lg font-medium">"{currentQuestion.question}"</p>
                        </Card>

                        <textarea
                            className="input-field w-full mb-4"
                            rows={8}
                            placeholder="Type your answer here... Use the STAR method for behavioral questions."
                            value={userAnswer}
                            onChange={(e) => setUserAnswer(e.target.value)}
                        />

                        <div className="flex gap-3">
                            <Button icon={<Lightbulb className="w-4 h-4" />}>
                                Get AI Feedback
                            </Button>
                            <Button variant="secondary" icon={<CheckCircle2 className="w-4 h-4" />}>
                                Mark as Practiced
                            </Button>
                            <Button variant="ghost">
                                Skip
                            </Button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </motion.div>
    );
}
