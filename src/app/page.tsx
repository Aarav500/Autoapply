'use client';

import { motion } from 'framer-motion';
import { Card, StatsCard, StatusBadge, ProgressBar, Button, ConfidenceMeter } from '@/components/ui';
import { useS3Storage } from '@/lib/useS3Storage';
import {
  FileText,
  Briefcase,
  CheckCircle2,
  Clock,
  TrendingUp,
  Sparkles,
  ArrowRight,
  GraduationCap,
  Building2,
  Calendar,
  Loader2,
  Plus
} from 'lucide-react';
import Link from 'next/link';

// Types for stored data
interface ActivityItem {
  id: string;
  name: string;
  role: string;
  organization: string;
}

interface Essay {
  id: string;
  college: string;
  topic: string;
  confidence: number;
  status: 'draft' | 'review' | 'complete';
  deadline?: string;
}

interface Job {
  id: string;
  title: string;
  company: string;
  match: number;
  deadline: string;
  status: 'saved' | 'applied' | 'interview';
}

interface Deadline {
  id: string;
  type: 'essay' | 'job' | 'other';
  name: string;
  date: string;
}

export default function Dashboard() {
  // Load data from S3 storage
  const { data: activities, isLoading: activitiesLoading } = useS3Storage<ActivityItem[]>('activities', { defaultValue: [] });
  const { data: essays, isLoading: essaysLoading } = useS3Storage<Essay[]>('essays', { defaultValue: [] });
  const { data: jobs, isLoading: jobsLoading } = useS3Storage<Job[]>('jobs', { defaultValue: [] });
  const { data: deadlines, isLoading: deadlinesLoading } = useS3Storage<Deadline[]>('deadlines', { defaultValue: [] });

  const isLoading = activitiesLoading || essaysLoading || jobsLoading || deadlinesLoading;

  // Calculate stats from real data
  const completedEssays = essays.filter(e => e.status === 'complete').length;
  const appliedJobs = jobs.filter(j => j.status === 'applied' || j.status === 'interview').length;
  const interviews = jobs.filter(j => j.status === 'interview').length;

  // Get recent essays (top 3)
  const recentEssays = essays.slice(0, 3);

  // Get upcoming deadlines (sorted by date)
  const upcomingDeadlines = deadlines
    .map(d => ({
      ...d,
      daysLeft: Math.ceil((new Date(d.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    }))
    .filter(d => d.daysLeft > 0)
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 3);

  // Get top job matches
  const topJobs = jobs
    .filter(j => j.status === 'saved')
    .sort((a, b) => b.match - a.match)
    .slice(0, 3);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: 'var(--primary-400)' }} />
          <p style={{ color: 'var(--text-muted)' }}>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
            Welcome back! 👋
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Here&apos;s your application progress overview
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/activities">
            <Button variant="secondary" icon={<Clock className="w-4 h-4" />}>
              Add Activities
            </Button>
          </Link>
          <Button icon={<Sparkles className="w-4 h-4" />}>
            AI Assistant
          </Button>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={itemVariants} className="card-grid">
        <StatsCard
          value={activities.length.toString()}
          label="Activities"
          icon={<GraduationCap className="w-6 h-6" style={{ color: 'var(--primary-400)' }} />}
        />
        <StatsCard
          value={completedEssays.toString()}
          label="Essays Completed"
          icon={<FileText className="w-6 h-6" style={{ color: 'var(--accent-teal)' }} />}
          trend={completedEssays > 0 ? { value: completedEssays, isPositive: true } : undefined}
        />
        <StatsCard
          value={appliedJobs.toString()}
          label="Jobs Applied"
          icon={<Briefcase className="w-6 h-6" style={{ color: 'var(--accent-purple)' }} />}
        />
        <StatsCard
          value={interviews.toString()}
          label="Interviews Scheduled"
          icon={<CheckCircle2 className="w-6 h-6" style={{ color: 'var(--success)' }} />}
        />
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Essays */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
                Recent Essays
              </h2>
              <Link href="/essays">
                <Button variant="ghost" size="sm" icon={<ArrowRight className="w-4 h-4" />}>
                  View All
                </Button>
              </Link>
            </div>
            {recentEssays.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
                <p className="mb-4" style={{ color: 'var(--text-muted)' }}>No essays yet</p>
                <Link href="/essays">
                  <Button icon={<Plus className="w-4 h-4" />}>Start Writing</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {recentEssays.map((essay) => (
                  <motion.div
                    key={essay.id}
                    className="flex items-center gap-4 p-4 rounded-xl"
                    style={{ background: 'var(--bg-secondary)' }}
                    whileHover={{ x: 4 }}
                  >
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(91, 111, 242, 0.15)' }}>
                      <GraduationCap className="w-6 h-6" style={{ color: 'var(--primary-400)' }} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">{essay.college}</h3>
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{essay.topic}</p>
                    </div>
                    <ConfidenceMeter value={essay.confidence} />
                    <StatusBadge
                      status={essay.status === 'complete' ? 'success' : essay.status === 'review' ? 'warning' : 'info'}
                    >
                      {essay.status}
                    </StatusBadge>
                  </motion.div>
                ))}
              </div>
            )}
          </Card>
        </motion.div>

        {/* Upcoming Deadlines */}
        <motion.div variants={itemVariants}>
          <Card>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
                Upcoming Deadlines
              </h2>
              <Calendar className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
            </div>
            {upcomingDeadlines.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
                <p style={{ color: 'var(--text-muted)' }}>No upcoming deadlines</p>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingDeadlines.map((deadline) => (
                  <motion.div
                    key={deadline.id}
                    className="flex items-center gap-3 p-3 rounded-lg"
                    style={{ background: 'var(--bg-secondary)' }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{
                        background: deadline.type === 'essay'
                          ? 'rgba(168, 85, 247, 0.15)'
                          : 'rgba(20, 184, 166, 0.15)'
                      }}
                    >
                      {deadline.type === 'essay'
                        ? <FileText className="w-5 h-5" style={{ color: 'var(--accent-purple)' }} />
                        : <Briefcase className="w-5 h-5" style={{ color: 'var(--accent-teal)' }} />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{deadline.name}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{deadline.date}</p>
                    </div>
                    <div
                      className="text-xs font-bold px-2 py-1 rounded-full"
                      style={{
                        background: deadline.daysLeft <= 7 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                        color: deadline.daysLeft <= 7 ? 'var(--error)' : 'var(--warning)'
                      }}
                    >
                      {deadline.daysLeft}d left
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </Card>
        </motion.div>
      </div>

      {/* Job Opportunities */}
      <motion.div variants={itemVariants}>
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
              Top Job Matches
            </h2>
            <Link href="/jobs">
              <Button variant="ghost" size="sm" icon={<ArrowRight className="w-4 h-4" />}>
                View All Jobs
              </Button>
            </Link>
          </div>
          {topJobs.length === 0 ? (
            <div className="text-center py-8">
              <Briefcase className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
              <p className="mb-4" style={{ color: 'var(--text-muted)' }}>No saved jobs yet</p>
              <Link href="/job-hub">
                <Button icon={<Plus className="w-4 h-4" />}>Browse Jobs</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {topJobs.map((job) => (
                <motion.div
                  key={job.id}
                  className="p-5 rounded-xl"
                  style={{ background: 'var(--bg-secondary)' }}
                  whileHover={{ y: -4 }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(20, 184, 166, 0.15)' }}>
                      <Building2 className="w-6 h-6" style={{ color: 'var(--accent-teal)' }} />
                    </div>
                    <StatusBadge status="success">
                      {job.match}% match
                    </StatusBadge>
                  </div>
                  <h3 className="font-semibold text-lg mb-1">{job.title}</h3>
                  <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>{job.company}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Deadline: {job.deadline}
                    </span>
                    <Button size="sm" variant="secondary">
                      Apply
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </Card>
      </motion.div>

      {/* Overall Progress */}
      <motion.div variants={itemVariants}>
        <Card>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'var(--gradient-primary)' }}>
              <TrendingUp className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
                Overall Application Progress
              </h2>
              <p style={{ color: 'var(--text-secondary)' }}>
                {activities.length > 0 || essays.length > 0
                  ? "You're making great progress! Keep it up."
                  : "Get started by adding activities and writing essays."}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Activities Added</span>
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{activities.length}</span>
              </div>
              <ProgressBar value={activities.length} max={10} showLabel />
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Essays Completed</span>
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{completedEssays} / {essays.length || 5}</span>
              </div>
              <ProgressBar value={completedEssays} max={essays.length || 5} showLabel />
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Job Applications</span>
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{appliedJobs}</span>
              </div>
              <ProgressBar value={appliedJobs} max={10} showLabel />
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Interviews</span>
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{interviews}</span>
              </div>
              <ProgressBar value={interviews} max={5} showLabel />
            </div>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
