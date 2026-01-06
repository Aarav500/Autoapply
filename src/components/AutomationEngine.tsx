'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Brain, Play, Pause, CheckCircle2, Clock, AlertCircle,
    Loader2, Zap, Settings, ChevronDown, ChevronUp
} from 'lucide-react';
import { toast } from '@/lib/error-handling';
import { essayStorage } from '@/lib/storage';
import { targetColleges } from '@/lib/colleges-data';
import { getFromS3 } from '@/lib/useS3Storage';

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

// ============================================
// AUTOMATION ENGINE HOOK
// ============================================

export function useAutomationEngine() {
    const [tasks, setTasks] = useState<AutomationTask[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [config, setConfig] = useState<AutomationConfig>({
        maxParallel: 3,
        delayBetweenTasks: 2000,
        autoStart: false,
        provider: 'gemini',
    });
    const [stats, setStats] = useState({
        completed: 0,
        failed: 0,
        totalTime: 0,
    });

    const runningRef = useRef(false);
    const tasksRef = useRef<AutomationTask[]>([]);
    const activeTasksRef = useRef<Set<string>>(new Set());

    // Keep refs in sync
    useEffect(() => {
        tasksRef.current = tasks;
    }, [tasks]);

    useEffect(() => {
        runningRef.current = isRunning;
    }, [isRunning]);

    // Generate tasks for all colleges
    const generateAllTasks = useCallback(() => {
        const newTasks: AutomationTask[] = [];

        // Sort by deadline (earliest first)
        const sortedColleges = [...targetColleges].sort(
            (a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
        );

        sortedColleges.forEach((college, index) => {
            college.essays.forEach((essay, promptIndex) => {
                newTasks.push({
                    id: `${college.id}-${promptIndex}`,
                    type: 'generate',
                    collegeId: college.id,
                    collegeName: college.name,
                    essayPrompt: essay.prompt,
                    status: 'pending',
                    progress: 0,
                    priority: index + 1,
                });
            });
        });

        setTasks(newTasks);
        toast.info(`Created ${newTasks.length} essay tasks sorted by deadline`);
        return newTasks;
    }, []);

    // Process a single task
    const processTask = useCallback(async (task: AutomationTask) => {
        // Update task status
        setTasks(prev => prev.map(t =>
            t.id === task.id
                ? { ...t, status: 'running' as TaskStatus, startedAt: new Date(), progress: 10 }
                : t
        ));

        const college = targetColleges.find(c => c.id === task.collegeId);
        if (!college) throw new Error(`College not found: ${task.collegeId}`);

        // Load REAL activities and achievements from S3 storage
        const rawActivities = await getFromS3<ActivityItem[]>('activities');
        const rawAchievements = await getFromS3<Achievement[]>('achievements');

        const activities = rawActivities || [];
        const achievements = rawAchievements || [];

        console.log(`📚 Loaded ${activities.length} activities and ${achievements.length} achievements for essay generation`);

        // Transform activities to the format expected by generateEssay
        const formattedActivities = activities.map(a => ({
            name: a.name,
            description: `${a.role} at ${a.organization}. ${a.description}`,
            impact: `${a.hoursPerWeek} hrs/week for ${a.weeksPerYear} weeks/year`,
        }));

        // Include achievements as additional context
        const achievementContext = achievements.length > 0
            ? achievements.map(a => `${a.title} - ${a.org} (${a.date})`).join('; ')
            : '';

        // Simulate progress updates
        const progressInterval = setInterval(() => {
            setTasks(prev => prev.map(t =>
                t.id === task.id && t.status === 'running'
                    ? { ...t, progress: Math.min(t.progress + 10, 90) }
                    : t
            ));
        }, 1000);

        try {
            // Get essay word limit from the essay prompt
            const essayInfo = college.essays.find(e => e.prompt === task.essayPrompt);
            const wordLimit = essayInfo?.wordLimit || 650;

            // Call SERVER-SIDE API (uses env vars from GitHub secrets - no client API key needed!)
            const response = await fetch('/api/essays/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: task.essayPrompt,
                    college: {
                        name: college.name,
                        values: college.research.values,
                        whatTheyLookFor: college.research.whatTheyLookFor,
                        culture: college.research.culture,
                        notablePrograms: college.research.notablePrograms,
                    },
                    activities: formattedActivities.length > 0 ? formattedActivities : [
                        { name: 'No activities loaded', description: 'Please add activities in Document Hub', impact: 'N/A' }
                    ],
                    achievements: achievementContext,
                    wordLimit: wordLimit,
                    tone: 'confident',
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to generate essay');
            }

            const result = await response.json();
            const essay = result.essay;

            console.log(`✅ Generated essay using ${result.provider} (${result.wordCount} words)`);

            clearInterval(progressInterval);

            // Save to local storage
            essayStorage.saveEssay(task.collegeId, task.id, essay);

            // Update task as completed
            setTasks(prev => prev.map(t =>
                t.id === task.id
                    ? {
                        ...t,
                        status: 'completed' as TaskStatus,
                        progress: 100,
                        result: essay.substring(0, 200) + '...',
                        completedAt: new Date()
                    }
                    : t
            ));

            setStats(prev => ({
                ...prev,
                completed: prev.completed + 1,
                totalTime: prev.totalTime + (Date.now() - (task.startedAt?.getTime() || Date.now())) / 1000,
            }));

            toast.success(`✅ Completed essay for ${college.name}`);
            return essay;

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
        toast.warning('⏸️ Automation paused');
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
            </motion.div>

            {/* Task List */}
            <div className="space-y-2">
                <AnimatePresence>
                    {tasks.map((task, index) => (
                        <TaskCard key={task.id} task={task} index={index} />
                    ))}
                </AnimatePresence>

                {tasks.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-12"
                        style={{ color: 'var(--text-muted)' }}
                    >
                        <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Click "Start All Essays" to begin automated processing</p>
                        <p className="text-sm mt-2">AI will write all 15 college essays in parallel</p>
                    </motion.div>
                )}
            </div>
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
