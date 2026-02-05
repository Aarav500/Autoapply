'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Briefcase,
  FileText,
  Calendar,
  TrendingUp,
  Target,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Sparkles,
  Zap,
  Mail,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

// Types
interface DashboardStats {
  applications: number;
  interviews: number;
  offers: number;
  matchScore: number;
}

interface Activity {
  id: string;
  type: 'application' | 'interview' | 'document' | 'rejection' | 'reminder';
  title: string;
  description: string;
  time: string;
  status?: 'success' | 'error' | 'pending';
}

interface Interview {
  id: string;
  company: string;
  role: string;
  time: string;
  type: string;
}

interface JobMatch {
  id: string;
  title: string;
  company: string;
  score: number;
}

// Stats Card Component
function StatsCard({
  title,
  value,
  change,
  changeType,
  icon,
  color,
  loading,
}: {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
  color: string;
  loading?: boolean;
}) {
  return (
    <motion.div variants={itemVariants} className="glass-card p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[var(--text-secondary)] text-sm font-medium">{title}</p>
          {loading ? (
            <div className="skeleton h-9 w-16 mt-2" />
          ) : (
            <p className="text-3xl font-bold mt-2 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              {value}
            </p>
          )}
          {change && !loading && (
            <p
              className={cn(
                'text-sm mt-2 flex items-center gap-1',
                changeType === 'positive' && 'text-emerald-400',
                changeType === 'negative' && 'text-red-400',
                changeType === 'neutral' && 'text-[var(--text-muted)]'
              )}
            >
              {changeType === 'positive' && <TrendingUp size={14} />}
              {change}
            </p>
          )}
        </div>
        <div
          className={cn(
            'p-3 rounded-xl',
            color === 'blue' && 'bg-blue-500/20 text-blue-400',
            color === 'green' && 'bg-emerald-500/20 text-emerald-400',
            color === 'purple' && 'bg-purple-500/20 text-purple-400',
            color === 'orange' && 'bg-orange-500/20 text-orange-400'
          )}
        >
          {icon}
        </div>
      </div>
    </motion.div>
  );
}

// Quick Action Button
function QuickAction({
  href,
  icon,
  label,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="glass-card-subtle p-4 flex items-center gap-4 hover:border-[var(--accent-primary)] transition-all group"
    >
      <div className="p-3 rounded-xl bg-[var(--bg-tertiary)] text-[var(--accent-primary)] group-hover:bg-blue-500/20 transition-colors">
        {icon}
      </div>
      <div className="flex-1">
        <p className="font-medium text-[var(--text-primary)]">{label}</p>
        <p className="text-sm text-[var(--text-muted)]">{description}</p>
      </div>
      <ArrowRight size={18} className="text-[var(--text-muted)] group-hover:text-[var(--accent-primary)] transition-colors" />
    </Link>
  );
}

// Activity Item
function ActivityItem({
  icon,
  title,
  description,
  time,
  status,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  time: string;
  status?: 'success' | 'error' | 'pending';
}) {
  return (
    <div className="flex items-start gap-4 p-4 hover:bg-[var(--bg-hover)] rounded-xl transition-colors">
      <div
        className={cn(
          'p-2 rounded-lg',
          status === 'success' && 'bg-emerald-500/20 text-emerald-400',
          status === 'error' && 'bg-red-500/20 text-red-400',
          status === 'pending' && 'bg-blue-500/20 text-blue-400',
          !status && 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
        )}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-[var(--text-primary)] truncate">{title}</p>
        <p className="text-sm text-[var(--text-muted)] truncate">{description}</p>
      </div>
      <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">{time}</span>
    </div>
  );
}

// Interview Card
function InterviewCard({
  company,
  role,
  time,
  type,
}: {
  company: string;
  role: string;
  time: string;
  type: string;
}) {
  return (
    <div className="glass-card-subtle p-4 flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
        {company[0]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-[var(--text-primary)] truncate">{role}</p>
        <p className="text-sm text-[var(--text-muted)]">{company}</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-medium text-[var(--accent-primary)]">{time}</p>
        <p className="text-xs text-[var(--text-muted)]">{type}</p>
      </div>
    </div>
  );
}

// Empty State
function EmptyState({ title, description, icon }: { title: string; description: string; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="w-12 h-12 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-muted)] mb-3">
        {icon}
      </div>
      <p className="font-medium text-[var(--text-secondary)]">{title}</p>
      <p className="text-sm text-[var(--text-muted)] mt-1">{description}</p>
    </div>
  );
}

// Loading Skeleton
function ActivitySkeleton() {
  return (
    <div className="flex items-start gap-4 p-4">
      <div className="skeleton w-10 h-10 rounded-lg" />
      <div className="flex-1">
        <div className="skeleton h-4 w-3/4 mb-2" />
        <div className="skeleton h-3 w-1/2" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    applications: 0,
    interviews: 0,
    offers: 0,
    matchScore: 0,
  });
  const [activities, setActivities] = useState<Activity[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [jobMatches, setJobMatches] = useState<JobMatch[]>([]);
  const [profileCompletion, setProfileCompletion] = useState(0);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        // Fetch all dashboard data in parallel
        const [applicationsRes, interviewsRes, jobsRes, profileRes] = await Promise.allSettled([
          fetch('/api/applications?limit=5'),
          fetch('/api/interviews?upcoming=true'),
          fetch('/api/jobs?limit=3&sortBy=matchScore'),
          fetch('/api/profile'),
        ]);

        // Process applications
        if (applicationsRes.status === 'fulfilled' && applicationsRes.value.ok) {
          const appData = await applicationsRes.value.json();
          const apps = appData.items || [];

          // Calculate stats
          const offers = apps.filter((a: { status: string }) => a.status === 'offer').length;

          setStats(prev => ({
            ...prev,
            applications: appData.total || apps.length,
            offers,
          }));

          // Convert to activities
          const recentActivities: Activity[] = apps.slice(0, 5).map((app: {
            id: string;
            status: string;
            job?: { title: string; company: string };
            appliedAt: string;
          }) => ({
            id: app.id,
            type: app.status === 'rejected' ? 'rejection' : 'application',
            title: app.status === 'rejected' ? 'Application rejected' : 'Application submitted',
            description: `${app.job?.title || 'Position'} at ${app.job?.company || 'Company'}`,
            time: formatTimeAgo(new Date(app.appliedAt)),
            status: app.status === 'rejected' ? 'error' : 'success',
          }));
          setActivities(recentActivities);
        }

        // Process interviews
        if (interviewsRes.status === 'fulfilled' && interviewsRes.value.ok) {
          const interviewData = await interviewsRes.value.json();
          const upcomingInterviews = (interviewData.items || []).slice(0, 3);

          setStats(prev => ({
            ...prev,
            interviews: interviewData.items?.length || 0,
          }));

          setInterviews(upcomingInterviews.map((interview: {
            id: string;
            type: string;
            scheduledAt: string;
            application?: { job?: { title: string; company: string } };
          }) => ({
            id: interview.id,
            company: interview.application?.job?.company || 'Company',
            role: interview.application?.job?.title || 'Position',
            time: formatInterviewTime(new Date(interview.scheduledAt)),
            type: interview.type?.replace('_', ' ') || 'Interview',
          })));
        }

        // Process jobs
        if (jobsRes.status === 'fulfilled' && jobsRes.value.ok) {
          const jobsData = await jobsRes.value.json();
          const topJobs = (jobsData.items || []).slice(0, 3);

          setJobMatches(topJobs.map((job: {
            id: string;
            title: string;
            company: string;
            matchScore: number;
          }) => ({
            id: job.id,
            title: job.title,
            company: job.company,
            score: job.matchScore || 0,
          })));

          // Calculate average match score
          if (topJobs.length > 0) {
            const avgScore = Math.round(
              topJobs.reduce((sum: number, job: { matchScore: number }) => sum + (job.matchScore || 0), 0) / topJobs.length
            );
            setStats(prev => ({ ...prev, matchScore: avgScore }));
          }
        }

        // Process profile
        if (profileRes.status === 'fulfilled' && profileRes.value.ok) {
          const profileData = await profileRes.value.json();
          // Calculate profile completion based on filled fields
          const fields = ['firstName', 'lastName', 'email', 'phone', 'headline', 'summary', 'location'];
          const filledFields = fields.filter(f => profileData[f]);
          const completion = Math.round((filledFields.length / fields.length) * 100);
          setProfileCompletion(completion);
        }

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Welcome back!</h1>
          <p className="text-[var(--text-secondary)] mt-1">
            Here&apos;s what&apos;s happening with your job search
          </p>
        </div>
        <Link
          href="/jobs"
          className="btn-gradient inline-flex items-center gap-2 self-start"
        >
          <Zap size={18} />
          Find Jobs
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Applications"
          value={stats.applications}
          change={stats.applications > 0 ? 'Active' : undefined}
          changeType="neutral"
          icon={<FileText size={24} />}
          color="blue"
          loading={loading}
        />
        <StatsCard
          title="Interviews"
          value={stats.interviews}
          change={stats.interviews > 0 ? `${stats.interviews} upcoming` : undefined}
          changeType="neutral"
          icon={<Calendar size={24} />}
          color="purple"
          loading={loading}
        />
        <StatsCard
          title="Offers"
          value={stats.offers}
          change={stats.offers > 0 ? 'Congratulations!' : undefined}
          changeType="positive"
          icon={<Briefcase size={24} />}
          color="green"
          loading={loading}
        />
        <StatsCard
          title="Match Score"
          value={stats.matchScore > 0 ? `${stats.matchScore}%` : '-'}
          change={stats.matchScore >= 80 ? 'Excellent' : stats.matchScore >= 60 ? 'Good' : undefined}
          changeType={stats.matchScore >= 70 ? 'positive' : 'neutral'}
          icon={<Target size={24} />}
          color="orange"
          loading={loading}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Activity & Quick Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Actions */}
          <motion.div variants={itemVariants}>
            <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <QuickAction
                href="/documents"
                icon={<FileText size={20} />}
                label="Generate Resume"
                description="AI-powered resume builder"
              />
              <QuickAction
                href="/auto-apply"
                icon={<Sparkles size={20} />}
                label="Auto Apply"
                description="Apply to matching jobs"
              />
              <QuickAction
                href="/optimize"
                icon={<Target size={20} />}
                label="Optimize Profile"
                description="Improve GitHub & LinkedIn"
              />
              <QuickAction
                href="/inbox"
                icon={<Mail size={20} />}
                label="Check Inbox"
                description="Review recruiter emails"
              />
            </div>
          </motion.div>

          {/* Recent Activity */}
          <motion.div variants={itemVariants} className="glass-card overflow-hidden">
            <div className="p-4 border-b border-[var(--glass-border)] flex items-center justify-between">
              <h2 className="font-semibold">Recent Activity</h2>
              <Link
                href="/applications"
                className="text-sm text-[var(--accent-primary)] hover:underline"
              >
                View all
              </Link>
            </div>
            <div className="divide-y divide-[var(--glass-border)]">
              {loading ? (
                <>
                  <ActivitySkeleton />
                  <ActivitySkeleton />
                  <ActivitySkeleton />
                </>
              ) : activities.length > 0 ? (
                activities.map((activity) => (
                  <ActivityItem
                    key={activity.id}
                    icon={getActivityIcon(activity.type)}
                    title={activity.title}
                    description={activity.description}
                    time={activity.time}
                    status={activity.status}
                  />
                ))
              ) : (
                <EmptyState
                  title="No recent activity"
                  description="Start applying to jobs to see your activity here"
                  icon={<Clock size={24} />}
                />
              )}
            </div>
          </motion.div>
        </div>

        {/* Right Column - Profile & Interviews */}
        <div className="space-y-6">
          {/* Profile Completion */}
          <motion.div variants={itemVariants} className="glass-card p-6">
            <h2 className="font-semibold mb-4">Profile Strength</h2>
            <div className="flex items-center gap-4 mb-4">
              <div className="relative w-20 h-20">
                <svg className="w-20 h-20 transform -rotate-90">
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    fill="none"
                    stroke="var(--bg-tertiary)"
                    strokeWidth="8"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    fill="none"
                    stroke="url(#gradient)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${profileCompletion * 2.26} 226`}
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  {loading ? (
                    <Loader2 size={20} className="animate-spin text-[var(--text-muted)]" />
                  ) : (
                    <span className="text-xl font-bold">{profileCompletion}%</span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-[var(--text-secondary)] text-sm">
                  {profileCompletion < 50
                    ? 'Complete your profile to get better job matches'
                    : profileCompletion < 80
                    ? 'Good progress! Add more details to stand out'
                    : 'Great profile! Ready to apply'}
                </p>
              </div>
            </div>
            <Link
              href="/profile"
              className="btn-secondary w-full text-center block"
            >
              {profileCompletion < 100 ? 'Complete Profile' : 'View Profile'}
            </Link>
          </motion.div>

          {/* Upcoming Interviews */}
          <motion.div variants={itemVariants} className="glass-card overflow-hidden">
            <div className="p-4 border-b border-[var(--glass-border)] flex items-center justify-between">
              <h2 className="font-semibold">Upcoming Interviews</h2>
              <Link
                href="/interviews"
                className="text-sm text-[var(--accent-primary)] hover:underline"
              >
                View all
              </Link>
            </div>
            <div className="p-4 space-y-4">
              {loading ? (
                <div className="space-y-4">
                  <div className="skeleton h-16 w-full rounded-xl" />
                  <div className="skeleton h-16 w-full rounded-xl" />
                </div>
              ) : interviews.length > 0 ? (
                interviews.map((interview) => (
                  <InterviewCard
                    key={interview.id}
                    company={interview.company}
                    role={interview.role}
                    time={interview.time}
                    type={interview.type}
                  />
                ))
              ) : (
                <EmptyState
                  title="No upcoming interviews"
                  description="Keep applying - interviews will appear here"
                  icon={<Calendar size={24} />}
                />
              )}
            </div>
          </motion.div>

          {/* Job Match Score */}
          <motion.div variants={itemVariants} className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Top Job Matches</h2>
              <span className="badge badge-info">AI Powered</span>
            </div>
            <div className="space-y-3">
              {loading ? (
                <>
                  <div className="skeleton h-14 w-full rounded-lg" />
                  <div className="skeleton h-14 w-full rounded-lg" />
                  <div className="skeleton h-14 w-full rounded-lg" />
                </>
              ) : jobMatches.length > 0 ? (
                jobMatches.map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-tertiary)]"
                  >
                    <div>
                      <p className="font-medium text-sm">{job.title}</p>
                      <p className="text-xs text-[var(--text-muted)]">{job.company}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                          style={{ width: `${job.score}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-[var(--accent-primary)]">
                        {job.score}%
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  title="No job matches yet"
                  description="Complete your profile to see personalized matches"
                  icon={<Target size={24} />}
                />
              )}
            </div>
            <Link
              href="/jobs"
              className="btn-ghost w-full text-center block mt-4 text-[var(--accent-primary)]"
            >
              View All Matches
            </Link>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

// Helper functions
function getActivityIcon(type: string) {
  switch (type) {
    case 'application':
      return <CheckCircle2 size={18} />;
    case 'interview':
      return <Calendar size={18} />;
    case 'document':
      return <FileText size={18} />;
    case 'rejection':
      return <XCircle size={18} />;
    case 'reminder':
      return <Clock size={18} />;
    default:
      return <Briefcase size={18} />;
  }
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays}d ago`;
}

function formatInterviewTime(date: Date): string {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isToday = date.toDateString() === now.toDateString();
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  if (isToday) return `Today, ${timeStr}`;
  if (isTomorrow) return `Tomorrow, ${timeStr}`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  }) + `, ${timeStr}`;
}
