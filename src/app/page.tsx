'use client';

import { motion } from 'framer-motion';
import { Card, StatsCard, StatusBadge, ProgressBar, Button, ConfidenceMeter } from '@/components/ui';
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
  Calendar
} from 'lucide-react';
import Link from 'next/link';

// Mock data - will be replaced with real data from the database
const recentEssays = [
  { id: 1, college: 'UCLA', topic: 'Personal Statement', confidence: 87, status: 'review' },
  { id: 2, college: 'UC Berkeley', topic: 'Why This College', confidence: 72, status: 'draft' },
  { id: 3, college: 'USC', topic: 'Diversity Essay', confidence: 91, status: 'complete' },
];

const recentJobs = [
  { id: 1, title: 'Research Assistant', company: 'UCR Biology Dept', match: 94, deadline: '2026-01-15' },
  { id: 2, title: 'Library Student Worker', company: 'UCR Library', match: 88, deadline: '2026-01-20' },
  { id: 3, title: 'IT Help Desk', company: 'UCR ITS', match: 76, deadline: '2026-01-25' },
];

const upcomingDeadlines = [
  { type: 'essay', name: 'UCLA PIQs', date: '2026-01-10', daysLeft: 7 },
  { type: 'job', name: 'Research Assistant App', date: '2026-01-15', daysLeft: 12 },
  { type: 'essay', name: 'UC Berkeley Supplement', date: '2026-01-20', daysLeft: 17 },
];

export default function Dashboard() {
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
          <Button variant="secondary" icon={<Clock className="w-4 h-4" />}>
            Activity Log
          </Button>
          <Button icon={<Sparkles className="w-4 h-4" />}>
            AI Assistant
          </Button>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={itemVariants} className="card-grid">
        <StatsCard
          value="15"
          label="Target Colleges"
          icon={<GraduationCap className="w-6 h-6" style={{ color: 'var(--primary-400)' }} />}
        />
        <StatsCard
          value="8"
          label="Essays Completed"
          icon={<FileText className="w-6 h-6" style={{ color: 'var(--accent-teal)' }} />}
          trend={{ value: 12, isPositive: true }}
        />
        <StatsCard
          value="5"
          label="Jobs Applied"
          icon={<Briefcase className="w-6 h-6" style={{ color: 'var(--accent-purple)' }} />}
        />
        <StatsCard
          value="3"
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
            <div className="space-y-4">
              {upcomingDeadlines.map((deadline, index) => (
                <motion.div
                  key={index}
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recentJobs.map((job) => (
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
                You&apos;re making great progress! Keep it up.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">College Essays</span>
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>8 / 15</span>
              </div>
              <ProgressBar value={8} max={15} showLabel />
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Job Applications</span>
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>5 / 10</span>
              </div>
              <ProgressBar value={5} max={10} showLabel />
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Documents Uploaded</span>
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>6 / 8</span>
              </div>
              <ProgressBar value={6} max={8} showLabel />
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Interview Prep</span>
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>45%</span>
              </div>
              <ProgressBar value={45} showLabel />
            </div>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
