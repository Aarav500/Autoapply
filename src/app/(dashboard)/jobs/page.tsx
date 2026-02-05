'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Filter,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  MapPin,
  DollarSign,
  Clock,
  Briefcase,
  Star,
  MoreVertical,
  Eye,
  EyeOff,
  Send,
} from 'lucide-react';
import { cn, formatRelativeTime, formatSalary } from '@/lib/utils';

// Sample data - in production, fetch from API
const sampleJobs = [
  {
    id: '1',
    title: 'Senior Frontend Engineer',
    company: 'Vercel',
    companyLogo: 'V',
    location: 'San Francisco, CA',
    locationType: 'remote',
    salaryMin: 180000,
    salaryMax: 250000,
    description: 'Join our team building the future of web development...',
    requiredSkills: ['React', 'TypeScript', 'Next.js', 'CSS'],
    matchScore: 95,
    matchReasons: ['5+ years React experience', 'Next.js expertise', 'Remote-friendly'],
    missingSkills: [],
    sourcePlatform: 'linkedin',
    isBookmarked: true,
    postedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    application: null,
  },
  {
    id: '2',
    title: 'Full Stack Developer',
    company: 'Stripe',
    companyLogo: 'S',
    location: 'New York, NY',
    locationType: 'hybrid',
    salaryMin: 160000,
    salaryMax: 220000,
    description: 'Build payment infrastructure used by millions...',
    requiredSkills: ['Node.js', 'React', 'PostgreSQL', 'AWS'],
    matchScore: 91,
    matchReasons: ['Strong backend skills', 'Database experience'],
    missingSkills: ['AWS'],
    sourcePlatform: 'indeed',
    isBookmarked: false,
    postedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    application: null,
  },
  {
    id: '3',
    title: 'Software Engineer',
    company: 'Linear',
    companyLogo: 'L',
    location: 'Remote',
    locationType: 'remote',
    salaryMin: 150000,
    salaryMax: 200000,
    description: 'Help us build the best project management tool...',
    requiredSkills: ['TypeScript', 'React', 'GraphQL'],
    matchScore: 88,
    matchReasons: ['TypeScript proficiency', 'React experience'],
    missingSkills: ['GraphQL'],
    sourcePlatform: 'wellfound',
    isBookmarked: true,
    postedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    application: { status: 'applied' },
  },
];

const platforms = [
  { value: 'all', label: 'All Platforms' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'indeed', label: 'Indeed' },
  { value: 'glassdoor', label: 'Glassdoor' },
  { value: 'wellfound', label: 'Wellfound' },
  { value: 'remoteok', label: 'Remote OK' },
];

function JobCard({ job }: { job: typeof sampleJobs[0] }) {
  const [isBookmarked, setIsBookmarked] = useState(job.isBookmarked);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6 hover:border-[var(--accent-primary)]/30 transition-all group"
    >
      <div className="flex items-start gap-4">
        {/* Company Logo */}
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-xl shrink-0">
          {job.companyLogo}
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold text-lg text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
                {job.title}
              </h3>
              <p className="text-[var(--text-secondary)]">{job.company}</p>
            </div>

            {/* Match Score */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="text-right">
                <div className="flex items-center gap-1">
                  <Star size={14} className="text-yellow-400 fill-yellow-400" />
                  <span className="font-bold text-lg">{job.matchScore}%</span>
                </div>
                <span className="text-xs text-[var(--text-muted)]">match</span>
              </div>
            </div>
          </div>

          {/* Meta Info */}
          <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-[var(--text-muted)]">
            <span className="flex items-center gap-1.5">
              <MapPin size={14} />
              {job.location}
            </span>
            <span
              className={cn(
                'px-2 py-0.5 rounded-full text-xs font-medium',
                job.locationType === 'remote' && 'bg-emerald-500/20 text-emerald-400',
                job.locationType === 'hybrid' && 'bg-blue-500/20 text-blue-400',
                job.locationType === 'onsite' && 'bg-orange-500/20 text-orange-400'
              )}
            >
              {job.locationType}
            </span>
            <span className="flex items-center gap-1.5">
              <DollarSign size={14} />
              {formatSalary(job.salaryMin, job.salaryMax)}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock size={14} />
              {formatRelativeTime(job.postedAt)}
            </span>
          </div>

          {/* Skills */}
          <div className="flex flex-wrap gap-2 mt-4">
            {job.requiredSkills.map((skill) => (
              <span
                key={skill}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-medium',
                  job.missingSkills.includes(skill)
                    ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                    : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                )}
              >
                {skill}
              </span>
            ))}
          </div>

          {/* Match Reasons */}
          {job.matchReasons.length > 0 && (
            <div className="mt-3 text-xs text-[var(--text-muted)]">
              <span className="text-emerald-400">Why you match:</span>{' '}
              {job.matchReasons.slice(0, 2).join(' • ')}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-[var(--glass-border)]">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--text-muted)] capitalize">
            via {job.sourcePlatform}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsBookmarked(!isBookmarked)}
            className={cn(
              'p-2 rounded-lg transition-colors',
              isBookmarked
                ? 'text-yellow-400 bg-yellow-400/10'
                : 'text-[var(--text-muted)] hover:text-yellow-400 hover:bg-yellow-400/10'
            )}
          >
            {isBookmarked ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
          </button>

          <a
            href={`#`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            <ExternalLink size={18} />
          </a>

          {job.application ? (
            <span className="px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-500/20 text-blue-400">
              Applied
            </span>
          ) : (
            <button className="btn-gradient text-sm px-4 py-2 flex items-center gap-2">
              <Send size={16} />
              Apply
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function JobsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [showBookmarkedOnly, setShowBookmarkedOnly] = useState(false);
  const [showRemoteOnly, setShowRemoteOnly] = useState(false);

  const filteredJobs = sampleJobs.filter((job) => {
    if (showBookmarkedOnly && !job.isBookmarked) return false;
    if (showRemoteOnly && job.locationType !== 'remote') return false;
    if (selectedPlatform !== 'all' && job.sourcePlatform !== selectedPlatform) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        job.title.toLowerCase().includes(query) ||
        job.company.toLowerCase().includes(query)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Job Matches</h1>
          <p className="text-[var(--text-secondary)] mt-1">
            {filteredJobs.length} jobs found matching your profile
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
            />
            <input
              type="text"
              placeholder="Search jobs, companies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--glass-border)] rounded-xl text-sm focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
            />
          </div>

          {/* Platform Filter */}
          <select
            value={selectedPlatform}
            onChange={(e) => setSelectedPlatform(e.target.value)}
            className="px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--glass-border)] rounded-xl text-sm focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
          >
            {platforms.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>

          {/* Toggle Filters */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBookmarkedOnly(!showBookmarkedOnly)}
              className={cn(
                'px-4 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center gap-2',
                showBookmarkedOnly
                  ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                  : 'bg-[var(--bg-secondary)] border border-[var(--glass-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              )}
            >
              <Bookmark size={16} />
              Saved
            </button>

            <button
              onClick={() => setShowRemoteOnly(!showRemoteOnly)}
              className={cn(
                'px-4 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center gap-2',
                showRemoteOnly
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-[var(--bg-secondary)] border border-[var(--glass-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              )}
            >
              <MapPin size={16} />
              Remote
            </button>
          </div>
        </div>
      </div>

      {/* Jobs List */}
      <div className="space-y-4">
        {filteredJobs.map((job) => (
          <JobCard key={job.id} job={job} />
        ))}

        {filteredJobs.length === 0 && (
          <div className="glass-card p-12 text-center">
            <Briefcase size={48} className="mx-auto text-[var(--text-muted)] mb-4" />
            <h3 className="text-lg font-semibold mb-2">No jobs found</h3>
            <p className="text-[var(--text-muted)]">
              Try adjusting your filters or search query
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
