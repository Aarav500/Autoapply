'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Button, StatusBadge } from '@/components/ui';
import { CountdownTimer } from '@/components/CountdownTimer';
import { targetColleges } from '@/lib/colleges-data';
import {
    Focus,
    Moon,
    Sun,
    Volume2,
    VolumeX,
    Clock,
    Target,
    Sparkles,
    Save,
    ArrowLeft,
    Maximize2,
    Minimize2,
    Play,
    Pause,
    RotateCcw,
    Coffee,
    Zap
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

// Pomodoro timer durations (in seconds)
const FOCUS_TIME = 25 * 60; // 25 minutes
const SHORT_BREAK = 5 * 60; // 5 minutes
const LONG_BREAK = 15 * 60; // 15 minutes

type TimerMode = 'focus' | 'shortBreak' | 'longBreak';

// Ambient sounds (would be actual audio files)
const ambientSounds = [
    { id: 'rain', name: 'Rain', icon: '🌧️' },
    { id: 'forest', name: 'Forest', icon: '🌲' },
    { id: 'cafe', name: 'Coffee Shop', icon: '☕' },
    { id: 'fire', name: 'Fireplace', icon: '🔥' },
    { id: 'ocean', name: 'Ocean Waves', icon: '🌊' },
];

export default function FocusModePage() {
    const params = useParams();
    const [collegeId, setCollegeId] = useState<string | null>(params?.college as string || null);
    const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);

    const [essayContent, setEssayContent] = useState('');
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isSoundOn, setIsSoundOn] = useState(false);
    const [selectedSound, setSelectedSound] = useState<string | null>(null);

    // Timer state
    const [timerMode, setTimerMode] = useState<TimerMode>('focus');
    const [timeLeft, setTimeLeft] = useState(FOCUS_TIME);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [pomodoroCount, setPomodoroCount] = useState(0);

    // Session stats
    const [wordsWritten, setWordsWritten] = useState(0);
    const [sessionStart, setSessionStart] = useState<Date | null>(null);

    const college = targetColleges.find(c => c.id === collegeId);
    const selectedPrompt = college?.essays.find(e => e.id === selectedPromptId);

    // Word count
    const wordCount = essayContent.trim().split(/\s+/).filter(Boolean).length;
    const wordLimit = selectedPrompt?.wordLimit || 250;

    // Timer logic
    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;

        if (isTimerRunning && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft(t => t - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            // Timer finished
            if (timerMode === 'focus') {
                setPomodoroCount(c => c + 1);
                // After 4 pomodoros, long break
                if ((pomodoroCount + 1) % 4 === 0) {
                    setTimerMode('longBreak');
                    setTimeLeft(LONG_BREAK);
                } else {
                    setTimerMode('shortBreak');
                    setTimeLeft(SHORT_BREAK);
                }
            } else {
                setTimerMode('focus');
                setTimeLeft(FOCUS_TIME);
            }
            setIsTimerRunning(false);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isTimerRunning, timeLeft, timerMode, pomodoroCount]);

    // Track session
    useEffect(() => {
        if (!sessionStart) setSessionStart(new Date());
    }, [sessionStart]);

    // Track words written
    useEffect(() => {
        setWordsWritten(prev => Math.max(prev, wordCount));
    }, [wordCount]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    const resetTimer = () => {
        setIsTimerRunning(false);
        switch (timerMode) {
            case 'focus': setTimeLeft(FOCUS_TIME); break;
            case 'shortBreak': setTimeLeft(SHORT_BREAK); break;
            case 'longBreak': setTimeLeft(LONG_BREAK); break;
        }
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    // Session time
    const sessionMinutes = sessionStart
        ? Math.floor((Date.now() - sessionStart.getTime()) / 60000)
        : 0;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`min-h-screen transition-colors duration-500 ${isDarkMode ? 'bg-gray-950' : 'bg-gray-100'}`}
            style={{
                background: isDarkMode
                    ? 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%)'
                    : 'linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 100%)'
            }}
        >
            {/* Top Bar */}
            <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <div className="flex items-center gap-4">
                    <Link href="/essays">
                        <Button variant="ghost" size="sm" icon={<ArrowLeft className="w-4 h-4" />}>
                            Exit Focus
                        </Button>
                    </Link>
                    <div className="flex items-center gap-2">
                        <Focus className="w-5 h-5" style={{ color: 'var(--primary-400)' }} />
                        <span className="font-semibold">Focus Mode</span>
                        {college && <span style={{ color: 'var(--text-muted)' }}>• {college.name}</span>}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Theme Toggle */}
                    <Button variant="ghost" size="sm" onClick={() => setIsDarkMode(!isDarkMode)}>
                        {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    </Button>

                    {/* Sound Toggle */}
                    <Button variant="ghost" size="sm" onClick={() => setIsSoundOn(!isSoundOn)}>
                        {isSoundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    </Button>

                    {/* Fullscreen */}
                    <Button variant="ghost" size="sm" onClick={toggleFullscreen}>
                        {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </Button>

                    <Button size="sm" icon={<Save className="w-4 h-4" />}>Save</Button>
                </div>
            </div>

            <div className="flex h-[calc(100vh-73px)]">
                {/* Main Writing Area */}
                <div className="flex-1 flex flex-col items-center justify-center p-8">
                    {/* Select College/Prompt if not selected */}
                    {!selectedPrompt ? (
                        <Card className="w-full max-w-2xl">
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <Target className="w-5 h-5" style={{ color: 'var(--primary-400)' }} />
                                Select Essay to Focus On
                            </h3>

                            <div className="space-y-3 max-h-96 overflow-y-auto">
                                {targetColleges.slice(0, 8).map(c => (
                                    <div
                                        key={c.id}
                                        className={`p-3 rounded-lg cursor-pointer transition-all ${collegeId === c.id ? 'ring-2' : ''}`}
                                        style={{
                                            background: 'var(--bg-secondary)',
                                            ringColor: 'var(--primary-500)'
                                        }}
                                        onClick={() => setCollegeId(c.id)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className="font-medium">{c.name}</h4>
                                                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                                                    {c.essays.length} essays
                                                </p>
                                            </div>
                                            <CountdownTimer deadline={c.deadline} compact />
                                        </div>

                                        {collegeId === c.id && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                className="mt-3 pt-3 space-y-2"
                                                style={{ borderTop: '1px solid var(--glass-border)' }}
                                            >
                                                {c.essays.map(essay => (
                                                    <div
                                                        key={essay.id}
                                                        className={`p-2 rounded-lg cursor-pointer ${selectedPromptId === essay.id ? 'bg-primary-500/20' : ''}`}
                                                        style={{ background: 'var(--bg-tertiary)' }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedPromptId(essay.id);
                                                        }}
                                                    >
                                                        <p className="text-sm font-medium">{essay.title}</p>
                                                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                                            {essay.wordLimit} words
                                                        </p>
                                                    </div>
                                                ))}
                                            </motion.div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </Card>
                    ) : (
                        /* Writing Interface */
                        <div className="w-full max-w-3xl">
                            {/* Prompt */}
                            <motion.div
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-center mb-8"
                            >
                                <h2 className="text-xl font-light italic" style={{ color: 'var(--text-secondary)' }}>
                                    "{selectedPrompt.prompt}"
                                </h2>
                                <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
                                    {college?.name} • {selectedPrompt.title}
                                </p>
                            </motion.div>

                            {/* Textarea */}
                            <motion.textarea
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="w-full h-96 p-6 rounded-2xl resize-none text-lg leading-relaxed focus:outline-none focus:ring-2 transition-all"
                                style={{
                                    background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)',
                                    color: isDarkMode ? '#e2e8f0' : '#1a202c',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    fontFamily: "'Georgia', serif",
                                }}
                                placeholder="Start writing your essay..."
                                value={essayContent}
                                onChange={(e) => setEssayContent(e.target.value)}
                                autoFocus
                            />

                            {/* Word Count */}
                            <div className="flex items-center justify-between mt-4">
                                <div className="flex gap-4">
                                    <span className={`text-sm ${wordCount > wordLimit ? 'text-red-400' : ''}`} style={{ color: wordCount > wordLimit ? undefined : 'var(--text-muted)' }}>
                                        {wordCount}/{wordLimit} words
                                    </span>
                                    <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                                        {sessionMinutes} min session
                                    </span>
                                </div>
                                <Button icon={<Sparkles className="w-4 h-4" />}>
                                    AI Improve
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Side Panel - Timer & Sounds */}
                <div className="w-80 p-4 space-y-4" style={{ borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
                    {/* Pomodoro Timer */}
                    <Card>
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="font-semibold flex items-center gap-2">
                                <Clock className="w-4 h-4" style={{ color: 'var(--primary-400)' }} />
                                Pomodoro Timer
                            </h4>
                            <div className="flex gap-1">
                                {[...Array(pomodoroCount % 4 || (pomodoroCount > 0 ? 4 : 0))].map((_, i) => (
                                    <div key={i} className="w-2 h-2 rounded-full" style={{ background: 'var(--primary-400)' }} />
                                ))}
                            </div>
                        </div>

                        {/* Timer Mode Selector */}
                        <div className="flex gap-2 mb-4">
                            {(['focus', 'shortBreak', 'longBreak'] as TimerMode[]).map(mode => (
                                <Button
                                    key={mode}
                                    variant={timerMode === mode ? 'primary' : 'secondary'}
                                    size="sm"
                                    className="flex-1"
                                    onClick={() => {
                                        setTimerMode(mode);
                                        setIsTimerRunning(false);
                                        switch (mode) {
                                            case 'focus': setTimeLeft(FOCUS_TIME); break;
                                            case 'shortBreak': setTimeLeft(SHORT_BREAK); break;
                                            case 'longBreak': setTimeLeft(LONG_BREAK); break;
                                        }
                                    }}
                                >
                                    {mode === 'focus' ? <Zap className="w-3 h-3" /> : <Coffee className="w-3 h-3" />}
                                </Button>
                            ))}
                        </div>

                        {/* Timer Display */}
                        <div className="text-center">
                            <div
                                className="text-5xl font-mono font-bold mb-4"
                                style={{ color: timerMode === 'focus' ? 'var(--primary-400)' : 'var(--success)' }}
                            >
                                {formatTime(timeLeft)}
                            </div>
                            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
                                {timerMode === 'focus' ? '🎯 Focus Time' : timerMode === 'shortBreak' ? '☕ Short Break' : '🌴 Long Break'}
                            </p>
                            <div className="flex gap-2 justify-center">
                                <Button
                                    onClick={() => setIsTimerRunning(!isTimerRunning)}
                                    icon={isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                >
                                    {isTimerRunning ? 'Pause' : 'Start'}
                                </Button>
                                <Button variant="secondary" onClick={resetTimer} icon={<RotateCcw className="w-4 h-4" />} />
                            </div>
                        </div>
                    </Card>

                    {/* Ambient Sounds */}
                    <Card>
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <Volume2 className="w-4 h-4" style={{ color: 'var(--accent-teal)' }} />
                            Ambient Sounds
                        </h4>
                        <div className="grid grid-cols-3 gap-2">
                            {ambientSounds.map(sound => (
                                <motion.button
                                    key={sound.id}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className={`p-3 rounded-xl text-center transition-all ${selectedSound === sound.id ? 'ring-2' : ''}`}
                                    style={{
                                        background: selectedSound === sound.id ? 'var(--primary-500)/20' : 'var(--bg-secondary)',
                                        ringColor: 'var(--primary-500)'
                                    }}
                                    onClick={() => {
                                        setSelectedSound(selectedSound === sound.id ? null : sound.id);
                                        setIsSoundOn(true);
                                    }}
                                >
                                    <span className="text-2xl">{sound.icon}</span>
                                    <p className="text-xs mt-1">{sound.name}</p>
                                </motion.button>
                            ))}
                        </div>
                    </Card>

                    {/* Session Stats */}
                    <Card>
                        <h4 className="font-semibold mb-3">Session Stats</h4>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Words Written</span>
                                <span className="font-medium">{wordsWritten}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Pomodoros</span>
                                <span className="font-medium">{pomodoroCount}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Session Time</span>
                                <span className="font-medium">{sessionMinutes}m</span>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </motion.div>
    );
}
