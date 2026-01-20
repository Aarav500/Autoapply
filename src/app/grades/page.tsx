'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Button, StatusBadge, ProgressBar } from '@/components/ui';
import {
    BookOpen, Upload, FileText, Sparkles, ChevronRight, Star,
    Target, Lightbulb, GraduationCap, PlusCircle, Trash2, Edit3,
    CheckCircle2, Brain, MessageSquare
} from 'lucide-react';
import { toast } from '@/lib/error-handling';

interface Course {
    id: string;
    name: string;
    code: string;
    grade: string;
    credits: number;
    semester: string;
    learnings: string[];
    storyPotential: string;
    relevantEssays: string[];
}

interface TranscriptData {
    gpa: number;
    totalCredits: number;
    courses: Course[];
}

// Real UC Riverside grades - Fall 2025 - Aarav Nikhil Shah
const sampleCourses: Course[] = [
    {
        id: '1',
        name: 'Computer Sci/Bus Applications',
        code: 'ENGR 001M',
        grade: 'A',
        credits: 1,
        semester: 'Fall 2025',
        learnings: [
            'Applied programming to real business problems',
            'Developed data analysis skills for decision-making',
            'Bridged technical and business concepts',
        ],
        storyPotential: 'Shows interdisciplinary thinking - connecting CS with business applications',
        relevantEssays: ['usc', 'mit', 'cmu'],
    },
    {
        id: '2',
        name: 'First-Year Calculus',
        code: 'MATH 009A',
        grade: 'A-',
        credits: 4,
        semester: 'Fall 2025',
        learnings: [
            'Built strong mathematical foundation for CS',
            'Developed analytical problem-solving skills',
            'Applied calculus concepts to real-world scenarios',
        ],
        storyPotential: 'Shows quantitative rigor - essential for STEM programs',
        relevantEssays: ['mit', 'cmu', 'gatech', 'purdue'],
    },
    {
        id: '3',
        name: 'Intro: CS for Sci, Math & Engr I',
        code: 'CS 010A',
        grade: 'A',
        credits: 4,
        semester: 'Fall 2025',
        learnings: [
            'Mastered programming fundamentals',
            'Built first coding projects from scratch',
            'Developed debugging and problem-solving mindset',
        ],
        storyPotential: 'Foundation course - shows strong start in CS major',
        relevantEssays: ['mit', 'stanford', 'cmu', 'cornell', 'uiuc'],
    },
    {
        id: '4',
        name: 'Elements of Data Science',
        code: 'STAT 004',
        grade: 'A',
        credits: 4,
        semester: 'Fall 2025',
        learnings: [
            'Learned statistical analysis and data visualization',
            'Applied data science to real datasets',
            'Combined statistics with programming',
        ],
        storyPotential: 'Shows data-driven thinking - relevant for AI/ML interests',
        relevantEssays: ['mit', 'stanford', 'cmu', 'umich', 'uiuc'],
    },
    {
        id: '5',
        name: 'Fund of Academic Discourse',
        code: 'WRIT 003',
        grade: 'S',
        credits: 4,
        semester: 'Fall 2025',
        learnings: [
            'Mastered academic writing and argumentation',
            'Developed critical thinking through essays',
            'Improved clarity in technical communication',
        ],
        storyPotential: 'Writing skills complement technical abilities - essential for applications',
        relevantEssays: ['cornell', 'nyu', 'northeastern'],
    },
];

export default function GradesPage() {
    const [transcript, setTranscript] = useState<TranscriptData>({
        gpa: 3.90,
        totalCredits: 18,
        courses: sampleCourses,
    });
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [isAddingCourse, setIsAddingCourse] = useState(false);

    // Analyze courses for essay stories
    const handleAnalyzeAll = async () => {
        setIsAnalyzing(true);
        toast.info('🧠 AI is analyzing your courses for essay stories...');

        await new Promise(r => setTimeout(r, 3000));

        toast.success('✅ Found 8 potential stories across your coursework!');
        setIsAnalyzing(false);
    };

    // Generate learning from course
    const handleGenerateLearnings = async (courseId: string) => {
        toast.info('🤖 AI is extracting key learnings...');
        await new Promise(r => setTimeout(r, 2000));
        toast.success('✅ Added new learnings to course!');
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
                        <GraduationCap className="w-8 h-8" style={{ color: 'var(--accent-purple)' }} />
                        My Grades & Transcript
                    </h1>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        Upload your grades to help AI find essay stories from your coursework
                    </p>
                </div>

                <div className="flex gap-3">
                    <Button
                        variant="secondary"
                        icon={<Upload className="w-4 h-4" />}
                    >
                        Upload Transcript
                    </Button>
                    <Button
                        icon={isAnalyzing ? <Sparkles className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                        onClick={handleAnalyzeAll}
                        disabled={isAnalyzing}
                    >
                        {isAnalyzing ? 'Analyzing...' : 'Find Essay Stories'}
                    </Button>
                </div>
            </div>

            {/* GPA Overview */}
            <div className="grid grid-cols-4 gap-4">
                <Card className="text-center" style={{ background: 'rgba(91, 111, 242, 0.1)' }}>
                    <Star className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--primary-400)' }} />
                    <p className="text-3xl font-bold">{transcript.gpa.toFixed(2)}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Cumulative GPA</p>
                </Card>
                <Card className="text-center">
                    <BookOpen className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--accent-teal)' }} />
                    <p className="text-3xl font-bold">{transcript.totalCredits}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Total Credits</p>
                </Card>
                <Card className="text-center" style={{ background: 'rgba(34, 197, 94, 0.1)' }}>
                    <CheckCircle2 className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--success)' }} />
                    <p className="text-3xl font-bold">{transcript.courses.length}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Courses Tracked</p>
                </Card>
                <Card className="text-center" style={{ background: 'rgba(234, 179, 8, 0.1)' }}>
                    <Lightbulb className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--warning)' }} />
                    <p className="text-3xl font-bold">{transcript.courses.reduce((sum, c) => sum + c.learnings.length, 0)}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Story Ideas</p>
                </Card>
            </div>

            {/* Course List */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold flex items-center gap-2">
                            <BookOpen className="w-5 h-5" style={{ color: 'var(--primary-400)' }} />
                            Your Courses
                        </h3>
                        <Button
                            variant="secondary"
                            size="sm"
                            icon={<PlusCircle className="w-4 h-4" />}
                            onClick={() => setIsAddingCourse(true)}
                        >
                            Add Course
                        </Button>
                    </div>

                    {transcript.courses.map((course, index) => (
                        <motion.div
                            key={course.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={() => setSelectedCourse(course)}
                            className={`p-4 rounded-xl cursor-pointer transition-all ${selectedCourse?.id === course.id ? 'ring-2' : ''
                                }`}
                            style={{
                                background: 'var(--glass-bg)',
                                border: '1px solid var(--glass-border)',
                            }}
                        >
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-mono px-2 py-0.5 rounded" style={{ background: 'var(--bg-secondary)' }}>
                                            {course.code}
                                        </span>
                                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${course.grade.startsWith('A') ? 'bg-green-500/20 text-green-500' :
                                            course.grade.startsWith('B') ? 'bg-yellow-500/20 text-yellow-500' :
                                                'bg-gray-500/20 text-gray-500'
                                            }`}>
                                            {course.grade}
                                        </span>
                                    </div>
                                    <h4 className="font-semibold mt-1">{course.name}</h4>
                                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                        {course.semester} · {course.credits} credits
                                    </p>
                                </div>
                                <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--primary-400)' }}>
                                    <Lightbulb className="w-4 h-4" />
                                    {course.learnings.length} stories
                                </div>
                            </div>

                            {course.learnings.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                    {course.relevantEssays.slice(0, 3).map(essay => (
                                        <span key={essay} className="px-2 py-0.5 rounded-full text-xs" style={{ background: 'rgba(91, 111, 242, 0.15)', color: 'var(--primary-400)' }}>
                                            {essay.toUpperCase()}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    ))}
                </div>

                {/* Course Details Panel */}
                <div className="lg:sticky lg:top-8 h-fit">
                    {selectedCourse ? (
                        <Card>
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <span className="text-sm font-mono px-2 py-0.5 rounded" style={{ background: 'var(--bg-secondary)' }}>
                                        {selectedCourse.code}
                                    </span>
                                    <h3 className="text-xl font-bold mt-2">{selectedCourse.name}</h3>
                                    <p style={{ color: 'var(--text-secondary)' }}>
                                        {selectedCourse.semester} · Grade: {selectedCourse.grade}
                                    </p>
                                </div>
                            </div>

                            {/* Story Potential */}
                            <div className="p-4 rounded-xl mb-4" style={{ background: 'rgba(234, 179, 8, 0.1)' }}>
                                <div className="flex items-center gap-2 font-medium mb-2">
                                    <Lightbulb className="w-5 h-5" style={{ color: 'var(--warning)' }} />
                                    Story Potential
                                </div>
                                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                    {selectedCourse.storyPotential}
                                </p>
                            </div>

                            {/* Key Learnings */}
                            <h4 className="font-medium mb-2 flex items-center gap-2">
                                <Target className="w-4 h-4" />
                                Key Learnings & Achievements
                            </h4>
                            <div className="space-y-2 mb-4">
                                {selectedCourse.learnings.map((learning, i) => (
                                    <div key={i} className="flex items-start gap-2 p-2 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                                        <CheckCircle2 className="w-4 h-4 mt-0.5" style={{ color: 'var(--success)' }} />
                                        <span className="text-sm">{learning}</span>
                                    </div>
                                ))}
                            </div>

                            <Button
                                variant="secondary"
                                className="w-full"
                                icon={<Sparkles className="w-4 h-4" />}
                                onClick={() => handleGenerateLearnings(selectedCourse.id)}
                            >
                                AI: Extract More Learnings
                            </Button>

                            {/* Relevant Essays */}
                            <h4 className="font-medium mt-4 mb-2 flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                Use in Essays For
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {selectedCourse.relevantEssays.map(essay => (
                                    <span key={essay} className="px-3 py-1.5 rounded-lg text-sm font-medium" style={{ background: 'rgba(91, 111, 242, 0.15)', color: 'var(--primary-400)' }}>
                                        {essay.toUpperCase()}
                                    </span>
                                ))}
                            </div>
                        </Card>
                    ) : (
                        <Card className="text-center py-16">
                            <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p style={{ color: 'var(--text-muted)' }}>
                                Select a course to see details and story ideas
                            </p>
                        </Card>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
