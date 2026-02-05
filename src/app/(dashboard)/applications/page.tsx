'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Mail,
  Calendar,
  MoreVertical,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';

// Application status configuration
const statusConfig = {
  applied: { label: 'Applied', color: 'blue', icon: FileText },
  screening: { label: 'Screening', color: 'yellow', icon: Clock },
  phone_screen: { label: 'Phone Screen', color: 'purple', icon: Mail },
  interview: { label: 'Interview', color: 'indigo', icon: Calendar },
  technical: { label: 'Technical', color: 'cyan', icon: FileText },
  offer: { label: 'Offer', color: 'emerald', icon: CheckCircle2 },
  rejected: { label: 'Rejected', color: 'red', icon: XCircle },
  withdrawn: { label: 'Withdrawn', color: 'gray', icon: XCircle },
};

type ApplicationStatus = keyof typeof statusConfig;

// Sample data
const sampleApplications = [
  {
    id: '1',
    status: 'interview' as ApplicationStatus,
    appliedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    job: {
      title: 'Senior Frontend Engineer',
      company: 'Vercel',
      companyLogo: 'V',
      location: 'San Francisco, CA',
    },
    nextInterview: {
      type: 'Technical',
      scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    },
    emailCount: 3,
  },
  {
    id: '2',
    status: 'applied' as ApplicationStatus,
    appliedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    job: {
      title: 'Full Stack Developer',
      company: 'Stripe',
      companyLogo: 'S',
      location: 'New York, NY',
    },
    nextInterview: null,
    emailCount: 0,
  },
  {
    id: '3',
    status: 'offer' as ApplicationStatus,
    appliedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    job: {
      title: 'Software Engineer',
      company: 'Linear',
      companyLogo: 'L',
      location: 'Remote',
    },
    nextInterview: null,
    emailCount: 5,
  },
  {
    id: '4',
    status: 'screening' as ApplicationStatus,
    appliedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    job: {
      title: 'Backend Engineer',
      company: 'Notion',
      companyLogo: 'N',
      location: 'San Francisco, CA',
    },
    nextInterview: null,
    emailCount: 1,
  },
  {
    id: '5',
    status: 'rejected' as ApplicationStatus,
    appliedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    job: {
      title: 'Product Engineer',
      company: 'Figma',
      companyLogo: 'F',
      location: 'San Francisco, CA',
    },
    nextInterview: null,
    emailCount: 2,
  },
];

function ApplicationCard({ application }: { application: typeof sampleApplications[0] }) {
  const config = statusConfig[application.status];
  const StatusIcon = config.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-card-subtle p-4 cursor-pointer hover:border-[var(--accent-primary)]/30 transition-all"
    >
      <div className="flex items-start gap-3">
        {/* Company Logo */}
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
          {application.job.companyLogo}
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm truncate">{application.job.title}</h4>
          <p className="text-xs text-[var(--text-muted)] truncate">
            {application.job.company}
          </p>
        </div>

        <button className="p-1 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)]">
          <MoreVertical size={16} />
        </button>
      </div>

      {/* Interview Info */}
      {application.nextInterview && (
        <div className="mt-3 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <div className="flex items-center gap-2 text-xs">
            <Calendar size={12} className="text-blue-400" />
            <span className="text-blue-400 font-medium">
              {application.nextInterview.type}
            </span>
            <span className="text-[var(--text-muted)]">
              {application.nextInterview.scheduledAt.toLocaleDateString()}
            </span>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--glass-border)]">
        <span className="text-xs text-[var(--text-muted)]">
          {formatRelativeTime(application.appliedAt)}
        </span>
        <div className="flex items-center gap-2">
          {application.emailCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
              <Mail size={12} />
              {application.emailCount}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function KanbanColumn({
  status,
  applications,
}: {
  status: ApplicationStatus;
  applications: typeof sampleApplications;
}) {
  const config = statusConfig[status];
  const filteredApps = applications.filter((app) => app.status === status);

  return (
    <div className="flex-1 min-w-[280px] max-w-[320px]">
      {/* Column Header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'w-3 h-3 rounded-full',
              config.color === 'blue' && 'bg-blue-500',
              config.color === 'yellow' && 'bg-yellow-500',
              config.color === 'purple' && 'bg-purple-500',
              config.color === 'indigo' && 'bg-indigo-500',
              config.color === 'cyan' && 'bg-cyan-500',
              config.color === 'emerald' && 'bg-emerald-500',
              config.color === 'red' && 'bg-red-500',
              config.color === 'gray' && 'bg-gray-500'
            )}
          />
          <h3 className="font-semibold text-sm">{config.label}</h3>
          <span className="text-xs text-[var(--text-muted)] bg-[var(--bg-tertiary)] px-2 py-0.5 rounded-full">
            {filteredApps.length}
          </span>
        </div>
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {filteredApps.map((app) => (
          <ApplicationCard key={app.id} application={app} />
        ))}

        {filteredApps.length === 0 && (
          <div className="p-4 text-center text-xs text-[var(--text-muted)] border-2 border-dashed border-[var(--glass-border)] rounded-xl">
            No applications
          </div>
        )}
      </div>
    </div>
  );
}

export default function ApplicationsPage() {
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

  // Stats
  const stats = {
    total: sampleApplications.length,
    active: sampleApplications.filter((a) => !['rejected', 'withdrawn'].includes(a.status)).length,
    interviews: sampleApplications.filter((a) => a.nextInterview).length,
    offers: sampleApplications.filter((a) => a.status === 'offer').length,
  };

  const activeStatuses: ApplicationStatus[] = [
    'applied',
    'screening',
    'phone_screen',
    'interview',
    'technical',
    'offer',
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Applications</h1>
          <p className="text-[var(--text-secondary)] mt-1">
            Track and manage your job applications
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Applications', value: stats.total, color: 'blue' },
          { label: 'Active', value: stats.active, color: 'emerald' },
          { label: 'Interviews', value: stats.interviews, color: 'purple' },
          { label: 'Offers', value: stats.offers, color: 'yellow' },
        ].map((stat) => (
          <div key={stat.label} className="glass-card-subtle p-4">
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-xs text-[var(--text-muted)]">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Kanban Board */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {activeStatuses.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              applications={sampleApplications}
            />
          ))}
        </div>
      </div>

      {/* Rejected/Withdrawn Section */}
      <div className="glass-card p-6">
        <h3 className="font-semibold mb-4 text-[var(--text-secondary)]">
          Closed Applications
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sampleApplications
            .filter((a) => ['rejected', 'withdrawn'].includes(a.status))
            .map((app) => (
              <ApplicationCard key={app.id} application={app} />
            ))}
        </div>
      </div>
    </div>
  );
}
