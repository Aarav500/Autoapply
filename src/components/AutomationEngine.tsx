'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Brain, Play, Pause, CheckCircle2, Clock, AlertCircle,
    Loader2, Zap, Settings, ChevronDown, ChevronUp
} from 'lucide-react';
import { toast } from '@/lib/error-handling';
import { essayStorage, matchAnalysisStorage, automationHistoryStorage, AutomationLog } from '@/lib/storage';
import { targetColleges } from '@/lib/colleges-data';
import { getFromS3 } from '@/lib/useS3Storage';
import { Button } from '@/components/ui';

// ============================================
// ACTIVITY & ACHIEVEMENT TYPES (from Document Hub)
// ============================================

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

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'paused';

export interface AutomationTask {
    id: string;
    type: 'generate' | 'review' | 'improve';
    collegeId: string;
    collegeName: string;
    essayPrompt: string;
    status: TaskStatus;
    progress: number;
    result?: string;
    error?: string;
    startedAt?: Date;
    completedAt?: Date;
    priority: number;
}

export interface AutomationConfig {
    maxParallel: number;
    delayBetweenTasks: number;
    autoStart: boolean;
    provider: 'claude' | 'gemini' | 'openai';
}

type Tab = 'tasks' | 'history';

// ============================================
// AUTOMATION ENGINE HOOK
// ============================================

export function useAutomationEngine() {
    // Load persisted state from localStorage on initial render
    const loadPersistedState = () => {
        if (typeof window === 'undefined') return null;
        try {
            const saved = localStorage.getItem('automation_state');
            if (saved) return JSON.parse(saved);
        } catch (e) {
            console.error('Failed to load automation state:', e);
        }
        return null;
    };

    const persistedState = loadPersistedState();

    const [tasks, setTasks] = useState<AutomationTask[]>(persistedState?.tasks || []);
    const [isRunning, setIsRunning] = useState(false); // Always start paused
    const [config, setConfig] = useState<AutomationConfig>(persistedState?.config || {
        maxParallel: 3,
        delayBetweenTasks: 2000,
        autoStart: false,
        provider: 'gemini',
    });
    const [activeTab, setActiveTab] = useState<Tab>('tasks');
    const [stats, setStats] = useState<{ completed: number; failed: number; totalTime: number }>(persistedState?.stats || {
        completed: 0,
        failed: 0,
        totalTime: 0,
    });
    const [history, setHistory] = useState<AutomationLog[]>([]);

    const runningRef = useRef(false);
    const tasksRef = useRef<AutomationTask[]>([]);
    const activeTasksRef = useRef<Set<string>>(new Set());

    // Persist state to localStorage whenever it changes
    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            // Mark any 'running' tasks as 'paused' when persisting (since we can't resume mid-API call)
            const tasksToSave = tasks.map(t =>
                t.status === 'running' ? { ...t, status: 'paused' as TaskStatus } : t
            );
            localStorage.setItem('automation_state', JSON.stringify({
                tasks: tasksToSave,
                config,
                stats,
                savedAt: new Date().toISOString(),
            }));
        } catch (e) {
            console.error('Failed to persist automation state:', e);
        }
    }, [tasks, config, stats]);

    // Keep refs in sync
    useEffect(() => {
        tasksRef.current = tasks;
    }, [tasks]);

    useEffect(() => {
        runningRef.current = isRunning;
    }, [isRunning]);

    // Load history on mount
    useEffect(() => {
        setHistory(automationHistoryStorage.getHistory());
    }, []);

    // Generate tasks for all colleges
    const generateAllTasks = useCallback(() => {
        const newTasks: AutomationTask[] = [];

        // Sort by deadline (earliest first)
        const sortedColleges = [...targetColleges].sort(
            (a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
        );

        sortedColleges.forEach((college, index) => {
            college.essays.forEach((essay) => {
                const existingEssay = essayStorage.loadEssay(college.id, essay.id);
                const existingAnalysis = matchAnalysisStorage.loadAnalysis(college.id);

                // Skip essays that already have 85%+ score
                if (existingAnalysis && existingAnalysis.overallScore >= 85) {
                    console.log(`✅ Skipping ${college.name} - already at ${existingAnalysis.overallScore}%`);
                    newTasks.push({
                        id: essay.id,
                        type: 'improve',
                        collegeId: college.id,
                        collegeName: college.name,
                        essayPrompt: essay.prompt,
                        status: 'completed',
                        progress: 100,
                        priority: index + 1,
                        result: `Already at ${existingAnalysis.overallScore}% - skipped`,
                    });
                    return; // Skip to next essay
                }

                newTasks.push({
                    id: essay.id,
                    type: existingEssay ? 'improve' : 'generate',
                    collegeId: college.id,
                    collegeName: college.name,
                    essayPrompt: essay.prompt,
                    status: 'pending',
                    progress: 0,
                    priority: index + 1,
                });
            });
        });

        // Count skipped vs pending
        const skipped = newTasks.filter(t => t.status === 'completed').length;
        const pending = newTasks.filter(t => t.status === 'pending').length;

        setTasks(newTasks);
        if (skipped > 0) {
            toast.info(`Created ${pending} tasks (${skipped} already at 85%+ skipped)`);
        } else {
            toast.info(`Created ${newTasks.length} essay tasks sorted by deadline`);
        }
        return newTasks;
    }, []);

    // Process a single task with GENERATE -> REVIEW -> IMPROVE loop
    const processTask = useCallback(async (task: AutomationTask) => {
        // Target score for essay acceptance (85% is "Strong" tier)
        const TARGET_SCORE = 85;
        // Reduced max iterations to save API costs (most gains happen in 1-2 iterations)
        const MAX_ITERATIONS = 3;

        // Early exit: Check if essay already has high score
        const existingAnalysis = matchAnalysisStorage.loadAnalysis(task.collegeId);
        if (existingAnalysis && existingAnalysis.overallScore >= TARGET_SCORE) {
            console.log(`✅ Early exit: ${task.collegeName} already at ${existingAnalysis.overallScore}%`);
            setTasks(prev => prev.map(t =>
                t.id === task.id
                    ? { ...t, status: 'completed' as TaskStatus, progress: 100, result: `Already at ${existingAnalysis.overallScore}%` }
                    : t
            ));
            setStats(prev => ({ ...prev, completed: prev.completed + 1 }));
            return;
        }

        // Update task status
        setTasks(prev => prev.map(t =>
            t.id === task.id
                ? { ...t, status: 'running' as TaskStatus, startedAt: new Date(), progress: 10 }
                : t
        ));

        const college = targetColleges.find(c => c.id === task.collegeId);
        if (!college) throw new Error(`College not found: ${task.collegeId}`);

        // Get AI-driven feedback from Strength Map (if available)
        const matchAnalysis = matchAnalysisStorage.loadAnalysis(task.collegeId);
        const strengthMapFeedback = matchAnalysis ? [
            `STRENGTH MAP INTELLIGENCE for ${college.name}:`,
            `- Previous Gap: ${matchAnalysis.oneThingToFix}`,
            ...matchAnalysis.suggestions.map(s => `- Suggestion: ${s}`)
        ].join('\n') : '';

        // Load REAL activities and achievements from S3 storage
        console.log('🔄 Loading activities and achievements from S3...');
        const rawActivities = await getFromS3<ActivityItem[]>('activities');
        const rawAchievements = await getFromS3<Achievement[]>('achievements');
        const userProfile = await getFromS3<any>('profile');

        const activities = rawActivities || [];
        const achievements = rawAchievements || [];

        console.log(`📚 Loaded ${activities.length} activities, ${achievements.length} achievements, and profile: ${userProfile?.major || 'No major'}`);

        // Handle missing activities gracefully if we have profile goals
        if (activities.length === 0) {
            if (userProfile?.goals) {
                console.log('📝 No activities found, but using Profile Goals for personalization.');
                // Only toast once per session to avoid clutter
                if (!(window as any)._hasToastedProfileInfo) {
                    toast.info('📝 Using your Profile Goals to personalize essays (no activities found).');
                    (window as any)._hasToastedProfileInfo = true;
                }
            } else {
                console.warn('⚠️ NO ACTIVITIES OR GOALS LOADED! Essays will be generic.');
                if (!(window as any)._hasToastedProfileError) {
                    toast.error('⚠️ No activities or profile goals found! Add them in Document Hub for personalized essays.');
                    (window as any)._hasToastedProfileError = true;
                }
            }
        }

        // Transform activities with DETAILED information
        const formattedActivities = activities.map(a => ({
            name: a.name,
            description: `${a.role} at ${a.organization}. ${a.description}`,
            impact: `${a.hoursPerWeek} hours/week for ${a.weeksPerYear} weeks/year. Total commitment: ${a.hoursPerWeek * a.weeksPerYear} hours/year`,
        }));

        // Include achievements as context
        const achievementContext = achievements.length > 0
            ? achievements.map(a => `${a.title} - ${a.org} (${a.date})`).join('; ')
            : '';

        // Get essay word limit (using task.id which is the essay.id)
        const essayInfo = college.essays.find(e => e.id === task.id) || college.essays.find(e => e.prompt === task.essayPrompt);
        const wordLimit = essayInfo?.wordLimit || 650;

        // Initialize with existing essay if we're in "improve" mode or if it just exists
        const existingDraft = essayStorage.loadEssay(task.collegeId, task.id);
        let currentEssay = existingDraft?.content || '';
        let currentScore = 0;
        let iteration = 0;
        let previousFeedback = '';

        if (existingDraft) {
            console.log(`📝 Found existing draft for ${college.name}. Starting with perfection loop.`);
        }

        // Simulate progress updates
        const progressInterval = setInterval(() => {
            setTasks(prev => prev.map(t =>
                t.id === task.id && t.status === 'running'
                    ? { ...t, progress: Math.min(t.progress + 5, 95) }
                    : t
            ));
        }, 2000);

        try {
            // GENERATE -> REVIEW -> IMPROVE LOOP
            while (iteration < MAX_ITERATIONS) {
                // Check if paused - exit early if so
                if (!runningRef.current) {
                    console.log(`⏸️ Paused during iteration ${iteration} for ${college.name}`);
                    clearInterval(progressInterval);
                    setTasks(prev => prev.map(t =>
                        t.id === task.id
                            ? { ...t, status: 'paused' as TaskStatus }
                            : t
                    ));
                    return; // Exit early without marking as complete
                }

                iteration++;
                console.log(`\n📝 Iteration ${iteration}/${MAX_ITERATIONS} for ${college.name}`);

                // STEP 1: GENERATE (or IMPROVE if we have previous feedback)
                const generateResponse = await fetch('/api/essays/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        prompt: task.essayPrompt,
                        essayTitle: essayInfo?.title,
                        college: {
                            name: college.name,
                            values: college.research.values,
                            whatTheyLookFor: college.research.whatTheyLookFor,
                            culture: college.research.culture,
                            notablePrograms: college.research.notablePrograms,
                        },
                        activities: formattedActivities.length > 0 ? formattedActivities : [
                            { name: '⚠️ NO ACTIVITIES LOADED', description: 'User needs to add activities in Document Hub', impact: 'Cannot write personalized essay without activities' }
                        ],
                        achievements: achievementContext,
                        wordLimit: wordLimit,
                        tone: 'confident',
                        major: userProfile?.major,
                        goals: userProfile?.goals,
                        // Pass Strength Map feedback + previous loop feedback
                        previousFeedback: [strengthMapFeedback, previousFeedback].filter(Boolean).join('\n---\n') || undefined,
                        previousDraft: currentEssay || undefined,
                    }),
                });

                if (!generateResponse.ok) {
                    const errorData = await generateResponse.json();
                    throw new Error(errorData.message || 'Failed to generate essay');
                }

                const generateResult = await generateResponse.json();
                currentEssay = generateResult.essay;
                console.log(`✅ Generated essay (${generateResult.wordCount} words) using ${generateResult.provider}`);

                // STEP 2: REVIEW with college-specific AI
                toast.info(`🔍 Reviewing essay as ${college.name} admissions counselor (iteration ${iteration})...`);

                const reviewResponse = await fetch('/api/essays/review', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        essay: currentEssay,
                        prompt: task.essayPrompt,
                        college: {
                            name: college.name,
                            fullName: college.fullName,
                            values: college.research.values,
                            whatTheyLookFor: college.research.whatTheyLookFor,
                            culture: college.research.culture,
                            notablePrograms: college.research.notablePrograms,
                        },
                        wordLimit: wordLimit,
                    }),
                });

                if (reviewResponse.ok) {
                    const reviewResult = await reviewResponse.json();
                    currentScore = reviewResult.overallScore || 50;

                    console.log(`📊 Review score: ${currentScore}% (target: ${TARGET_SCORE}%)`);
                    toast.info(`📊 Essay scored ${currentScore}% (target: ${TARGET_SCORE}%)`);

                    // Save the match analysis for the Strength Map
                    matchAnalysisStorage.saveAnalysis(task.collegeId, {
                        overallScore: currentScore,
                        categoryScores: reviewResult.categoryScores || {},
                        strengths: reviewResult.strengths || [],
                        improvements: reviewResult.improvements || [],
                        suggestions: reviewResult.suggestions || [],
                        collegeSpecific: reviewResult.collegeSpecific || '',
                        oneThingToFix: reviewResult.oneThingToFix || '',
                    });

                    // If score meets target, we're done!
                    if (currentScore >= TARGET_SCORE) {
                        console.log(`✅ Target score reached! Essay is ready.`);
                        toast.success(`🎉 Essay reached ${currentScore}% - Ready to submit!`);
                        break;
                    }

                    // Build feedback for next iteration
                    const feedbackParts = [];
                    if (reviewResult.improvements) {
                        feedbackParts.push('IMPROVEMENTS NEEDED:', ...reviewResult.improvements);
                    }
                    if (reviewResult.suggestions) {
                        feedbackParts.push('SUGGESTIONS:', ...reviewResult.suggestions);
                    }
                    if (reviewResult.oneThingToFix) {
                        feedbackParts.push(`PRIORITY FIX: ${reviewResult.oneThingToFix}`);
                    }
                    if (reviewResult.collegeSpecific) {
                        feedbackParts.push(`${college.name} COUNSELOR FEEDBACK: ${reviewResult.collegeSpecific}`);
                    }
                    previousFeedback = feedbackParts.join('\n');

                    if (iteration < MAX_ITERATIONS) {
                        toast.info(`🔄 Improving essay based on ${college.name} counselor feedback...`);
                    }
                } else {
                    console.warn('Review failed, using essay as-is');
                    currentScore = 65; // Default score if review fails
                    break;
                }
            }

            clearInterval(progressInterval);

            // Save the best essay to local storage
            essayStorage.saveEssay(task.collegeId, task.id, currentEssay);

            // Add to automation history
            automationHistoryStorage.addLog({
                collegeId: task.collegeId,
                collegeName: task.collegeName,
                taskType: task.type,
                essayPrompt: task.essayPrompt,
                status: 'completed',
                result: currentEssay,
                score: currentScore,
            });
            setHistory(automationHistoryStorage.getHistory());

            // Update task as completed with score
            setTasks(prev => prev.map(t =>
                t.id === task.id
                    ? {
                        ...t,
                        status: 'completed' as TaskStatus,
                        progress: 100,
                        result: `Score: ${currentScore}% | ${currentEssay.substring(0, 150)}...`,
                        completedAt: new Date()
                    }
                    : t
            ));

            setStats(prev => ({
                ...prev,
                completed: prev.completed + 1,
                totalTime: prev.totalTime + (Date.now() - (task.startedAt?.getTime() || Date.now())) / 1000,
            }));

            toast.success(`✅ ${college.name} essay complete! Score: ${currentScore}% after ${iteration} iteration(s)`);
            return currentEssay;

        } catch (error) {
            clearInterval(progressInterval);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            setTasks(prev => prev.map(t =>
                t.id === task.id
                    ? { ...t, status: 'failed' as TaskStatus, progress: 0, error: errorMessage }
                    : t
            ));

            setStats(prev => ({ ...prev, failed: prev.failed + 1 }));
            toast.error(`❌ Failed: ${college.name} - ${errorMessage}`);
            throw error;
        }
    }, []);

    // Run the automation queue
    const runQueue = useCallback(async () => {
        if (!runningRef.current) return;

        const pendingTasks = tasksRef.current.filter(t => t.status === 'pending');
        const runningCount = activeTasksRef.current.size;
        const slotsAvailable = config.maxParallel - runningCount;

        if (slotsAvailable <= 0 || pendingTasks.length === 0) {
            // Check if all done
            const allDone = tasksRef.current.every(t =>
                t.status === 'completed' || t.status === 'failed'
            );

            if (allDone && tasksRef.current.length > 0) {
                setIsRunning(false);
                toast.success(`🎉 All ${stats.completed} essays completed!`);
            }
            return;
        }

        // Start new tasks in parallel
        const tasksToStart = pendingTasks.slice(0, slotsAvailable);

        tasksToStart.forEach(task => {
            activeTasksRef.current.add(task.id);

            processTask(task)
                .finally(() => {
                    activeTasksRef.current.delete(task.id);
                    // Continue processing after delay
                    setTimeout(() => runQueue(), config.delayBetweenTasks);
                });
        });
    }, [config.maxParallel, config.delayBetweenTasks, processTask, stats.completed]);

    // Start automation
    const start = useCallback(() => {
        if (tasks.length === 0) {
            generateAllTasks();
        } else {
            // Resume paused tasks by setting them back to pending
            setTasks(prev => prev.map(t =>
                t.status === 'paused' ? { ...t, status: 'pending' as TaskStatus } : t
            ));
        }
        setIsRunning(true);
        runningRef.current = true;
        toast.info('🚀 Starting AI automation...');
        setTimeout(runQueue, 500);
    }, [tasks.length, generateAllTasks, runQueue]);

    // Pause automation
    const pause = useCallback(() => {
        setIsRunning(false);
        runningRef.current = false;
        // Mark currently running tasks as paused for immediate visual feedback
        setTasks(prev => prev.map(t =>
            t.status === 'running' ? { ...t, status: 'paused' as TaskStatus } : t
        ));
        toast.warning('⏸️ Automation paused - tasks will stop after current API call');
    }, []);

    // Reset all tasks
    const reset = useCallback(() => {
        setIsRunning(false);
        runningRef.current = false;
        activeTasksRef.current.clear();
        setTasks([]);
        setStats({ completed: 0, failed: 0, totalTime: 0 });
        toast.info('🔄 Queue reset');
    }, []);

    // Retry failed tasks
    const retryFailed = useCallback(() => {
        setTasks(prev => prev.map(t =>
            t.status === 'failed' ? { ...t, status: 'pending' as TaskStatus, error: undefined } : t
        ));
        setStats(prev => ({ ...prev, failed: 0 }));
    }, []);

    return {
        tasks,
        isRunning,
        config,
        stats,
        activeTab,
        setActiveTab,
        history,
        setHistory,
        setConfig,
        start,
        pause,
        reset,
        retryFailed,
        generateAllTasks,
    };
}

// ============================================
// AUTOMATION DASHBOARD COMPONENT
// ============================================

export function AutomationDashboard() {
    const {
        tasks,
        isRunning,
        config,
        stats,
        activeTab,
        setActiveTab,
        history,
        setHistory,
        setConfig,
        start,
        pause,
        reset,
        retryFailed,
        generateAllTasks,
    } = useAutomationEngine();

    const [showSettings, setShowSettings] = useState(false);

    const pendingCount = tasks.filter(t => t.status === 'pending').length;
    const runningCount = tasks.filter(t => t.status === 'running').length;
    const failedCount = tasks.filter(t => t.status === 'failed').length;

    return (
        <div className="space-y-6">
            {/* Control Panel */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 rounded-2xl"
                style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)' }}
            >
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center"
                            style={{ background: 'var(--gradient-primary)' }}
                        >
                            <Brain className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">AI Automation Engine</h2>
                            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                                {isRunning ? `Processing ${runningCount} essays in parallel...` : 'Ready to automate'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setShowSettings(!showSettings)}
                            className="p-2 rounded-xl"
                            style={{ background: 'var(--bg-secondary)' }}
                        >
                            <Settings className="w-5 h-5" />
                        </motion.button>

                        {isRunning ? (
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={pause}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium"
                                style={{ background: 'var(--warning)', color: 'black' }}
                            >
                                <Pause className="w-4 h-4" />
                                Pause
                            </motion.button>
                        ) : (
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={start}
                                className="flex items-center gap-2 px-6 py-2 rounded-xl font-medium text-white"
                                style={{ background: 'var(--gradient-primary)' }}
                            >
                                <Zap className="w-4 h-4" />
                                {tasks.length === 0 ? 'Start All Essays' : 'Resume'}
                            </motion.button>
                        )}

                        {failedCount > 0 && (
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => {
                                    retryFailed();
                                    toast.info(`🔄 Retrying ${failedCount} failed essays...`);
                                    if (!isRunning) start();
                                }}
                                className="px-4 py-2 rounded-xl font-medium"
                                style={{ background: 'rgba(239, 68, 68, 0.15)', color: 'var(--error)' }}
                            >
                                Retry Failed ({failedCount})
                            </motion.button>
                        )}

                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={reset}
                            className="px-4 py-2 rounded-xl font-medium"
                            style={{ background: 'var(--bg-secondary)' }}
                        >
                            Reset
                        </motion.button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-4 mb-4">
                    <div className="p-3 rounded-xl text-center" style={{ background: 'var(--bg-secondary)' }}>
                        <div className="text-2xl font-bold">{tasks.length}</div>
                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Total Tasks</div>
                    </div>
                    <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(34, 197, 94, 0.1)' }}>
                        <div className="text-2xl font-bold" style={{ color: 'var(--success)' }}>{stats.completed}</div>
                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Completed</div>
                    </div>
                    <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(91, 111, 242, 0.1)' }}>
                        <div className="text-2xl font-bold" style={{ color: 'var(--primary-400)' }}>{runningCount}</div>
                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Running</div>
                    </div>
                    <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
                        <div className="text-2xl font-bold" style={{ color: 'var(--error)' }}>{failedCount}</div>
                        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Failed</div>
                    </div>
                </div>

                {/* Settings Panel */}
                <AnimatePresence>
                    {showSettings && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="pt-4 border-t" style={{ borderColor: 'var(--glass-border)' }}>
                                <h3 className="text-sm font-semibold mb-3">Automation Settings</h3>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                                            Parallel Tasks
                                        </label>
                                        <select
                                            value={config.maxParallel}
                                            onChange={e => setConfig({ ...config, maxParallel: Number(e.target.value) })}
                                            className="w-full p-2 rounded-lg text-sm"
                                            style={{ background: 'var(--bg-tertiary)', border: 'none' }}
                                        >
                                            <option value={1}>1 at a time</option>
                                            <option value={2}>2 parallel</option>
                                            <option value={3}>3 parallel</option>
                                            <option value={5}>5 parallel</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                                            Delay Between
                                        </label>
                                        <select
                                            value={config.delayBetweenTasks}
                                            onChange={e => setConfig({ ...config, delayBetweenTasks: Number(e.target.value) })}
                                            className="w-full p-2 rounded-lg text-sm"
                                            style={{ background: 'var(--bg-tertiary)', border: 'none' }}
                                        >
                                            <option value={1000}>1 second</option>
                                            <option value={2000}>2 seconds</option>
                                            <option value={5000}>5 seconds</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                                            AI Provider
                                        </label>
                                        <select
                                            value={config.provider}
                                            onChange={e => setConfig({ ...config, provider: e.target.value as typeof config.provider })}
                                            className="w-full p-2 rounded-lg text-sm"
                                            style={{ background: 'var(--bg-tertiary)', border: 'none' }}
                                        >
                                            <option value="claude">Claude (Best)</option>
                                            <option value="gemini">Gemini (Free)</option>
                                            <option value="openai">OpenAI GPT-4</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Failed tasks retry */}
                {failedCount > 0 && (
                    <motion.button
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        whileHover={{ scale: 1.02 }}
                        onClick={retryFailed}
                        className="w-full mt-4 py-2 rounded-xl text-sm font-medium"
                        style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)' }}
                    >
                        Retry {failedCount} Failed Tasks
                    </motion.button>
                )}

                {/* Tabs */}
                <div className="flex items-center gap-4 mt-6 border-b" style={{ borderColor: 'var(--glass-border)' }}>
                    <button
                        onClick={() => setActiveTab('tasks')}
                        className={`pb-2 px-1 text-sm font-medium transition-colors relative`}
                        style={{ color: activeTab === 'tasks' ? 'var(--primary-400)' : 'var(--text-muted)' }}
                    >
                        Active Tasks ({tasks.length})
                        {activeTab === 'tasks' && (
                            <motion.div
                                layoutId="activeTab"
                                className="absolute bottom-0 left-0 right-0 h-0.5"
                                style={{ background: 'var(--primary-400)' }}
                            />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`pb-2 px-1 text-sm font-medium transition-colors relative`}
                        style={{ color: activeTab === 'history' ? 'var(--primary-400)' : 'var(--text-muted)' }}
                    >
                        History ({history.length})
                        {activeTab === 'history' && (
                            <motion.div
                                layoutId="activeTab"
                                className="absolute bottom-0 left-0 right-0 h-0.5"
                                style={{ background: 'var(--primary-400)' }}
                            />
                        )}
                    </button>
                </div>

                {/* Main Content Area */}
                <div className="mt-4 min-h-[400px]">
                    {activeTab === 'tasks' ? (
                        tasks.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
                                <Clock className="w-12 h-12 mb-4" />
                                <p>No tasks in queue</p>
                                <Button
                                    variant="secondary"
                                    className="mt-4"
                                    onClick={generateAllTasks}
                                >
                                    Generate Drafts for All Deadlines
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <AnimatePresence mode="popLayout">
                                    {tasks.map((task) => (
                                        <motion.div
                                            key={task.id}
                                            layout
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            className="p-4 rounded-xl border flex items-center justify-between group"
                                            style={{
                                                background: task.status === 'running' ? 'rgba(91, 111, 242, 0.05)' : 'var(--bg-secondary)',
                                                borderColor: task.status === 'running' ? 'var(--primary-400)' : 'var(--glass-border)'
                                            }}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
                                                    {task.status === 'completed' ? <CheckCircle2 className="w-5 h-5 text-green-400" /> :
                                                        task.status === 'failed' ? <AlertCircle className="w-5 h-5 text-red-400" /> :
                                                            task.status === 'running' ? <Loader2 className="w-5 h-5 animate-spin text-blue-400" /> :
                                                                <Clock className="w-5 h-5 text-gray-400" />}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-sm">{task.collegeName}</span>
                                                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-white/5" style={{ color: 'var(--text-muted)' }}>
                                                            {task.type}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs truncate max-w-[300px]" style={{ color: 'var(--text-muted)' }}>
                                                        {task.essayPrompt}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-6">
                                                {task.status === 'running' && (
                                                    <div className="w-32">
                                                        <div className="flex justify-between text-[10px] mb-1">
                                                            <span>Progress</span>
                                                            <span>{task.progress}%</span>
                                                        </div>
                                                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                                            <motion.div
                                                                className="h-full bg-blue-500"
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${task.progress}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-2">
                                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full`}
                                                        style={{
                                                            background: task.status === 'completed' ? 'rgba(34, 197, 94, 0.1)' :
                                                                task.status === 'running' ? 'rgba(59, 130, 246, 0.1)' :
                                                                    'rgba(255,255,255,0.05)',
                                                            color: task.status === 'completed' ? '#4ade80' :
                                                                task.status === 'running' ? '#60a5fa' :
                                                                    'var(--text-muted)'
                                                        }}
                                                    >
                                                        {task.status.toUpperCase()}
                                                    </span>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        )
                    ) : (
                        <div className="space-y-3">
                            {history.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
                                    <Clock className="w-12 h-12 mb-4" />
                                    <p>No automation history yet</p>
                                </div>
                            ) : (
                                <>
                                    <div className="flex justify-end mb-2">
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => {
                                                automationHistoryStorage.clearHistory();
                                                setHistory([]);
                                            }}
                                            className="text-[10px]"
                                        >
                                            Clear History
                                        </Button>
                                    </div>
                                    <div className="space-y-2">
                                        {history.map((log) => (
                                            <div
                                                key={log.id}
                                                className="p-3 rounded-xl border flex items-center justify-between bg-white/5 border-white/10"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                                                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-xs">{log.collegeName}</span>
                                                            {log.score && (
                                                                <span className="text-[10px] font-bold text-green-400">
                                                                    {log.score}% Score
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-[10px] truncate max-w-[400px]" style={{ color: 'var(--text-muted)' }}>
                                                            {log.essayPrompt}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-[10px] text-right" style={{ color: 'var(--text-muted)' }}>
                                                    <div>{new Date(log.timestamp).toLocaleDateString()}</div>
                                                    <div>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}

// ============================================
// TASK CARD COMPONENT
// ============================================

function TaskCard({ task, index }: { task: AutomationTask; index: number }) {
    const statusIcons = {
        pending: <Clock className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />,
        running: <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--primary-400)' }} />,
        completed: <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--success)' }} />,
        failed: <AlertCircle className="w-4 h-4" style={{ color: 'var(--error)' }} />,
        paused: <Pause className="w-4 h-4" style={{ color: 'var(--warning)' }} />,
    };

    const statusColors = {
        pending: 'var(--bg-secondary)',
        running: 'rgba(91, 111, 242, 0.1)',
        completed: 'rgba(34, 197, 94, 0.1)',
        failed: 'rgba(239, 68, 68, 0.1)',
        paused: 'rgba(234, 179, 8, 0.1)',
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ delay: index * 0.02 }}
            className="flex items-center gap-4 p-4 rounded-xl"
            style={{ background: statusColors[task.status] }}
        >
            <div className="w-8 text-center font-bold" style={{ color: 'var(--text-muted)' }}>
                #{task.priority}
            </div>

            {statusIcons[task.status]}

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="font-medium">{task.collegeName}</span>
                    <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
                    >
                        {task.type}
                    </span>
                </div>
                <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                    {task.essayPrompt.substring(0, 60)}...
                </p>
            </div>

            {/* Progress bar for running tasks */}
            {task.status === 'running' && (
                <div className="w-24">
                    <div
                        className="h-1 rounded-full overflow-hidden"
                        style={{ background: 'var(--bg-tertiary)' }}
                    >
                        <motion.div
                            className="h-full rounded-full"
                            style={{ background: 'var(--gradient-primary)' }}
                            initial={{ width: 0 }}
                            animate={{ width: `${task.progress}%` }}
                        />
                    </div>
                    <div className="text-xs text-center mt-1" style={{ color: 'var(--text-muted)' }}>
                        {task.progress}%
                    </div>
                </div>
            )}

            {/* Error message for failed tasks */}
            {task.status === 'failed' && task.error && (
                <div className="text-xs" style={{ color: 'var(--error)' }}>
                    {task.error.substring(0, 30)}...
                </div>
            )}

            {/* Completion indicator */}
            {task.status === 'completed' && (
                <span className="text-xs" style={{ color: 'var(--success)' }}>
                    ✓ Done
                </span>
            )}
        </motion.div>
    );
}
