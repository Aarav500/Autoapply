'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Github,
  Linkedin,
  CheckCircle2,
  Circle,
  ArrowRight,
  Sparkles,
  TrendingUp,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Sample GitHub analysis
const sampleGithubAnalysis = {
  overallScore: 72,
  profileUrl: 'https://github.com/johndoe',
  lastAnalyzedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
  sections: [
    {
      name: 'Profile Completeness',
      score: 85,
      suggestions: [
        'Add a professional profile photo',
        'Include your location for local opportunities',
      ],
    },
    {
      name: 'README',
      score: 60,
      suggestions: [
        'Create a profile README to showcase your work',
        'Add badges for your key technologies',
        'Include links to your best projects',
      ],
    },
    {
      name: 'Repositories',
      score: 75,
      suggestions: [
        'Add descriptions to all repositories',
        'Pin your 6 best repositories',
        'Add topics/tags to repositories',
      ],
    },
    {
      name: 'Activity',
      score: 68,
      suggestions: [
        'Increase contribution frequency',
        'Contribute to open source projects',
      ],
    },
  ],
  tasks: [
    { id: '1', title: 'Create profile README', description: 'Add a README.md to your profile repository', priority: 'high', completed: false },
    { id: '2', title: 'Add profile photo', description: 'Upload a professional headshot', priority: 'high', completed: true },
    { id: '3', title: 'Pin best repositories', description: 'Select 6 repositories to pin', priority: 'medium', completed: false },
    { id: '4', title: 'Add repo descriptions', description: 'Write descriptions for all repositories', priority: 'medium', completed: false },
    { id: '5', title: 'Update bio', description: 'Write a compelling bio with keywords', priority: 'low', completed: true },
  ],
};

// Sample LinkedIn analysis
const sampleLinkedinAnalysis = {
  overallScore: 65,
  profileUrl: 'https://linkedin.com/in/johndoe',
  lastAnalyzedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  sections: [
    {
      name: 'Headline',
      score: 70,
      suggestions: [
        'Include your specialty and value proposition',
        'Add relevant keywords for searchability',
        'Keep it under 120 characters',
      ],
    },
    {
      name: 'About Section',
      score: 55,
      suggestions: [
        'Expand to at least 2000 characters',
        'Tell your professional story',
        'Include a call-to-action',
      ],
    },
    {
      name: 'Experience',
      score: 75,
      suggestions: [
        'Add quantified achievements to each role',
        'Use bullet points for readability',
        'Include relevant media',
      ],
    },
    {
      name: 'Skills & Endorsements',
      score: 60,
      suggestions: [
        'Add more relevant skills',
        'Request endorsements from colleagues',
        'Reorder skills by importance',
      ],
    },
  ],
  tasks: [
    { id: '1', title: 'Optimize headline', description: 'Rewrite headline with keywords', priority: 'high', completed: false },
    { id: '2', title: 'Expand About section', description: 'Write a compelling 2000+ character summary', priority: 'high', completed: false },
    { id: '3', title: 'Add achievements', description: 'Add 3+ quantified achievements per role', priority: 'medium', completed: false },
    { id: '4', title: 'Add banner image', description: 'Create a professional banner', priority: 'medium', completed: true },
    { id: '5', title: 'Get recommendations', description: 'Request 3+ recommendations', priority: 'low', completed: false },
  ],
};

function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--bg-tertiary)"
          strokeWidth="8"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#scoreGradient)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${progress} ${circumference}`}
        />
        <defs>
          <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold">{score}%</span>
        <span className="text-xs text-[var(--text-muted)]">Score</span>
      </div>
    </div>
  );
}

function SectionScore({ section }: { section: { name: string; score: number; suggestions: string[] } }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border-b border-[var(--glass-border)] last:border-0">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-[var(--bg-hover)] transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                section.score >= 80 && 'bg-emerald-500',
                section.score >= 60 && section.score < 80 && 'bg-yellow-500',
                section.score < 60 && 'bg-red-500'
              )}
              style={{ width: `${section.score}%` }}
            />
          </div>
          <span className="font-medium">{section.name}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold">{section.score}%</span>
          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </button>

      {isExpanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="px-4 pb-4"
        >
          <ul className="space-y-2 ml-16">
            {section.suggestions.map((suggestion, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <AlertCircle size={14} className="text-yellow-500 mt-0.5 shrink-0" />
                {suggestion}
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </div>
  );
}

function TaskItem({
  task,
  onToggle,
}: {
  task: { id: string; title: string; description: string; priority: string; completed: boolean };
  onToggle: () => void;
}) {
  return (
    <div
      className={cn(
        'p-4 rounded-xl transition-all cursor-pointer',
        task.completed ? 'bg-emerald-500/10' : 'bg-[var(--bg-tertiary)] hover:bg-[var(--bg-elevated)]'
      )}
      onClick={onToggle}
    >
      <div className="flex items-start gap-3">
        <button className="mt-0.5 shrink-0">
          {task.completed ? (
            <CheckCircle2 size={20} className="text-emerald-500" />
          ) : (
            <Circle size={20} className="text-[var(--text-muted)]" />
          )}
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={cn('font-medium', task.completed && 'line-through text-[var(--text-muted)]')}>
              {task.title}
            </span>
            <span
              className={cn(
                'px-1.5 py-0.5 text-[10px] font-medium rounded',
                task.priority === 'high' && 'bg-red-500/20 text-red-400',
                task.priority === 'medium' && 'bg-yellow-500/20 text-yellow-400',
                task.priority === 'low' && 'bg-blue-500/20 text-blue-400'
              )}
            >
              {task.priority}
            </span>
          </div>
          <p className="text-sm text-[var(--text-muted)] mt-1">{task.description}</p>
        </div>
      </div>
    </div>
  );
}

function PlatformCard({
  platform,
  icon: Icon,
  analysis,
  color,
}: {
  platform: string;
  icon: React.ElementType;
  analysis: typeof sampleGithubAnalysis;
  color: string;
}) {
  const [tasks, setTasks] = useState(analysis.tasks);
  const completedCount = tasks.filter((t) => t.completed).length;

  const toggleTask = (taskId: string) => {
    setTasks(tasks.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t)));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card overflow-hidden"
    >
      {/* Header */}
      <div className="p-6 border-b border-[var(--glass-border)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'p-3 rounded-xl',
                color === 'gray' && 'bg-gray-500/20 text-gray-400',
                color === 'blue' && 'bg-blue-500/20 text-blue-400'
              )}
            >
              <Icon size={24} />
            </div>
            <div>
              <h2 className="text-lg font-semibold">{platform}</h2>
              <a
                href={analysis.profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[var(--accent-primary)] hover:underline flex items-center gap-1"
              >
                View Profile <ExternalLink size={12} />
              </a>
            </div>
          </div>
          <button className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
            <RefreshCw size={18} />
          </button>
        </div>

        {/* Score */}
        <div className="flex items-center gap-6 mt-6">
          <ScoreRing score={analysis.overallScore} />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={16} className="text-emerald-400" />
              <span className="text-sm text-[var(--text-secondary)]">
                {analysis.overallScore >= 80
                  ? 'Excellent profile!'
                  : analysis.overallScore >= 60
                  ? 'Good, with room to improve'
                  : 'Needs attention'}
              </span>
            </div>
            <div className="text-xs text-[var(--text-muted)]">
              Last analyzed {analysis.lastAnalyzedAt.toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="border-b border-[var(--glass-border)]">
        <div className="p-4 bg-[var(--bg-tertiary)]/50">
          <h3 className="font-medium text-sm">Section Scores</h3>
        </div>
        {analysis.sections.map((section) => (
          <SectionScore key={section.name} section={section} />
        ))}
      </div>

      {/* Tasks */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Improvement Tasks</h3>
          <span className="text-sm text-[var(--text-muted)]">
            {completedCount}/{tasks.length} completed
          </span>
        </div>
        <div className="space-y-3">
          {tasks.map((task) => (
            <TaskItem key={task.id} task={task} onToggle={() => toggleTask(task.id)} />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export default function OptimizePage() {
  const [activeTab, setActiveTab] = useState<'github' | 'linkedin'>('github');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Profile Optimizer</h1>
          <p className="text-[var(--text-secondary)] mt-1">
            Optimize your GitHub and LinkedIn profiles to attract recruiters
          </p>
        </div>
        <button className="btn-gradient inline-flex items-center gap-2 self-start">
          <Sparkles size={18} />
          Analyze All
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="glass-card-subtle p-1.5 inline-flex gap-1">
        <button
          onClick={() => setActiveTab('github')}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
            activeTab === 'github'
              ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          )}
        >
          <Github size={18} />
          GitHub
        </button>
        <button
          onClick={() => setActiveTab('linkedin')}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
            activeTab === 'linkedin'
              ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          )}
        >
          <Linkedin size={18} />
          LinkedIn
        </button>
      </div>

      {/* Platform Card */}
      {activeTab === 'github' && (
        <PlatformCard
          platform="GitHub"
          icon={Github}
          analysis={sampleGithubAnalysis}
          color="gray"
        />
      )}

      {activeTab === 'linkedin' && (
        <PlatformCard
          platform="LinkedIn"
          icon={Linkedin}
          analysis={sampleLinkedinAnalysis}
          color="blue"
        />
      )}
    </div>
  );
}
