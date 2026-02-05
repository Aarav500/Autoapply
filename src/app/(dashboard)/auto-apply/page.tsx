'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap,
  Play,
  Pause,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Settings,
  TrendingUp,
  Calendar,
  Briefcase,
  MapPin,
  DollarSign,
  Clock,
  X,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AutoApplyRule {
  id: string;
  name: string;
  isActive: boolean;
  criteria: {
    minMatchScore?: number;
    keywords?: string[];
    locations?: string[];
    excludeCompanies?: string[];
    jobTypes?: string[];
    experienceLevels?: string[];
    salaryMin?: number;
    remoteOnly?: boolean;
  };
  maxApplicationsPerDay: number;
  applicationsToday: number;
  totalApplications: number;
  lastRunAt?: Date;
}

// Sample rules
const sampleRules: AutoApplyRule[] = [
  {
    id: '1',
    name: 'Senior Frontend Roles',
    isActive: true,
    criteria: {
      minMatchScore: 80,
      keywords: ['React', 'TypeScript', 'Frontend'],
      locations: ['San Francisco, CA', 'Remote'],
      jobTypes: ['full-time'],
      experienceLevels: ['senior', 'lead'],
      salaryMin: 150000,
    },
    maxApplicationsPerDay: 10,
    applicationsToday: 7,
    totalApplications: 45,
    lastRunAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
  },
  {
    id: '2',
    name: 'FAANG Companies',
    isActive: true,
    criteria: {
      minMatchScore: 70,
      keywords: ['Software Engineer'],
      excludeCompanies: [],
      remoteOnly: false,
    },
    maxApplicationsPerDay: 5,
    applicationsToday: 3,
    totalApplications: 28,
    lastRunAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
  },
  {
    id: '3',
    name: 'Remote Startups',
    isActive: false,
    criteria: {
      minMatchScore: 75,
      keywords: ['Full Stack', 'Startup'],
      remoteOnly: true,
      salaryMin: 120000,
    },
    maxApplicationsPerDay: 15,
    applicationsToday: 0,
    totalApplications: 12,
  },
];

const sampleStats = {
  today: 10,
  week: 47,
  month: 156,
  total: 523,
  successRate: 12.4,
  averageMatchScore: 84,
};

const sampleRecentApplications = [
  { id: '1', company: 'Google', role: 'Senior Software Engineer', matchScore: 92, appliedAt: new Date(Date.now() - 30 * 60 * 1000) },
  { id: '2', company: 'Stripe', role: 'Full Stack Developer', matchScore: 88, appliedAt: new Date(Date.now() - 2 * 60 * 60 * 1000) },
  { id: '3', company: 'Airbnb', role: 'Frontend Engineer', matchScore: 85, appliedAt: new Date(Date.now() - 4 * 60 * 60 * 1000) },
  { id: '4', company: 'Netflix', role: 'Senior React Developer', matchScore: 82, appliedAt: new Date(Date.now() - 6 * 60 * 60 * 1000) },
  { id: '5', company: 'Shopify', role: 'Staff Engineer', matchScore: 79, appliedAt: new Date(Date.now() - 8 * 60 * 60 * 1000) },
];

function StatCard({ icon: Icon, label, value, subValue, color }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subValue?: string;
  color: string;
}) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={cn('p-2 rounded-lg', color)}>
          <Icon size={20} />
        </div>
        <span className="text-sm text-[var(--text-secondary)]">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {subValue && (
        <div className="text-xs text-[var(--text-muted)] mt-1">{subValue}</div>
      )}
    </div>
  );
}

function RuleCard({
  rule,
  onToggle,
  onEdit,
  onDelete,
}: {
  rule: AutoApplyRule;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      layout
      className={cn(
        'glass-card overflow-hidden transition-all',
        !rule.isActive && 'opacity-60'
      )}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <button
              onClick={onToggle}
              className={cn(
                'p-2 rounded-lg transition-colors',
                rule.isActive
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
              )}
            >
              {rule.isActive ? <Play size={20} /> : <Pause size={20} />}
            </button>
            <div>
              <h3 className="font-semibold">{rule.name}</h3>
              <div className="flex items-center gap-4 mt-2 text-sm text-[var(--text-secondary)]">
                <span className="flex items-center gap-1">
                  <Briefcase size={14} />
                  {rule.applicationsToday}/{rule.maxApplicationsPerDay} today
                </span>
                <span className="flex items-center gap-1">
                  <TrendingUp size={14} />
                  {rule.totalApplications} total
                </span>
                {rule.lastRunAt && (
                  <span className="flex items-center gap-1">
                    <Clock size={14} />
                    {formatTimeAgo(rule.lastRunAt)}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              <Edit2 size={18} />
            </button>
            <button
              onClick={onDelete}
              className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-red-400 transition-colors"
            >
              <Trash2 size={18} />
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={cn(
                'p-2 rounded-lg hover:bg-[var(--bg-hover)] transition-all',
                isExpanded && 'rotate-180'
              )}
            >
              <ChevronDown size={18} />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-4 pt-4 border-t border-[var(--glass-border)]"
            >
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {rule.criteria.minMatchScore && (
                  <div className="flex items-center gap-2 text-sm">
                    <TrendingUp size={16} className="text-[var(--accent-primary)]" />
                    <span>Min Match: {rule.criteria.minMatchScore}%</span>
                  </div>
                )}
                {rule.criteria.locations && rule.criteria.locations.length > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin size={16} className="text-[var(--accent-primary)]" />
                    <span>{rule.criteria.locations.join(', ')}</span>
                  </div>
                )}
                {rule.criteria.salaryMin && (
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign size={16} className="text-[var(--accent-primary)]" />
                    <span>Min: ${(rule.criteria.salaryMin / 1000).toFixed(0)}k</span>
                  </div>
                )}
                {rule.criteria.remoteOnly && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin size={16} className="text-[var(--accent-primary)]" />
                    <span>Remote Only</span>
                  </div>
                )}
                {rule.criteria.keywords && rule.criteria.keywords.length > 0 && (
                  <div className="col-span-full">
                    <div className="flex items-center gap-2 flex-wrap">
                      {rule.criteria.keywords.map((keyword) => (
                        <span
                          key={keyword}
                          className="px-2 py-1 rounded-full bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] text-xs"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-[var(--bg-tertiary)]">
        <div
          className={cn(
            'h-full transition-all',
            rule.isActive ? 'bg-gradient-to-r from-blue-500 to-purple-500' : 'bg-gray-500'
          )}
          style={{ width: `${(rule.applicationsToday / rule.maxApplicationsPerDay) * 100}%` }}
        />
      </div>
    </motion.div>
  );
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString();
}

function CreateRuleModal({
  isOpen,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (rule: Partial<AutoApplyRule>) => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    minMatchScore: 75,
    keywords: '',
    locations: '',
    excludeCompanies: '',
    salaryMin: '',
    maxApplicationsPerDay: 10,
    remoteOnly: false,
  });

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({
      name: formData.name,
      criteria: {
        minMatchScore: formData.minMatchScore,
        keywords: formData.keywords ? formData.keywords.split(',').map((k) => k.trim()) : undefined,
        locations: formData.locations ? formData.locations.split(',').map((l) => l.trim()) : undefined,
        excludeCompanies: formData.excludeCompanies ? formData.excludeCompanies.split(',').map((c) => c.trim()) : undefined,
        salaryMin: formData.salaryMin ? parseInt(formData.salaryMin) : undefined,
        remoteOnly: formData.remoteOnly,
      },
      maxApplicationsPerDay: formData.maxApplicationsPerDay,
      isActive: true,
    });
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="glass-card w-full max-w-lg max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-[var(--glass-border)] flex items-center justify-between">
          <h2 className="text-xl font-semibold">Create Auto-Apply Rule</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto max-h-[60vh]">
          {/* Rule Name */}
          <div>
            <label className="block text-sm font-medium mb-2">Rule Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Senior Frontend Roles"
              className="input-field"
            />
          </div>

          {/* Min Match Score */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Minimum Match Score: {formData.minMatchScore}%
            </label>
            <input
              type="range"
              min="50"
              max="100"
              value={formData.minMatchScore}
              onChange={(e) => setFormData({ ...formData, minMatchScore: parseInt(e.target.value) })}
              className="w-full accent-[var(--accent-primary)]"
            />
          </div>

          {/* Keywords */}
          <div>
            <label className="block text-sm font-medium mb-2">Keywords (comma-separated)</label>
            <input
              type="text"
              value={formData.keywords}
              onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
              placeholder="React, TypeScript, Frontend"
              className="input-field"
            />
          </div>

          {/* Locations */}
          <div>
            <label className="block text-sm font-medium mb-2">Locations (comma-separated)</label>
            <input
              type="text"
              value={formData.locations}
              onChange={(e) => setFormData({ ...formData, locations: e.target.value })}
              placeholder="San Francisco, CA, Remote, New York"
              className="input-field"
            />
          </div>

          {/* Exclude Companies */}
          <div>
            <label className="block text-sm font-medium mb-2">Exclude Companies (comma-separated)</label>
            <input
              type="text"
              value={formData.excludeCompanies}
              onChange={(e) => setFormData({ ...formData, excludeCompanies: e.target.value })}
              placeholder="Company A, Company B"
              className="input-field"
            />
          </div>

          {/* Minimum Salary */}
          <div>
            <label className="block text-sm font-medium mb-2">Minimum Salary</label>
            <input
              type="number"
              value={formData.salaryMin}
              onChange={(e) => setFormData({ ...formData, salaryMin: e.target.value })}
              placeholder="e.g., 150000"
              className="input-field"
            />
          </div>

          {/* Max Applications Per Day */}
          <div>
            <label className="block text-sm font-medium mb-2">Max Applications Per Day</label>
            <input
              type="number"
              min="1"
              max="50"
              value={formData.maxApplicationsPerDay}
              onChange={(e) => setFormData({ ...formData, maxApplicationsPerDay: parseInt(e.target.value) })}
              className="input-field"
            />
          </div>

          {/* Remote Only */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setFormData({ ...formData, remoteOnly: !formData.remoteOnly })}
              className={cn(
                'w-10 h-6 rounded-full transition-colors relative',
                formData.remoteOnly ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-tertiary)]'
              )}
            >
              <div
                className={cn(
                  'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                  formData.remoteOnly ? 'translate-x-5' : 'translate-x-1'
                )}
              />
            </button>
            <label className="text-sm">Remote positions only</label>
          </div>
        </div>

        <div className="p-6 border-t border-[var(--glass-border)] flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-[var(--glass-border)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!formData.name}
            className="btn-gradient disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create Rule
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function AutoApplyPage() {
  const [rules, setRules] = useState(sampleRules);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSystemActive, setIsSystemActive] = useState(true);

  const toggleRule = (id: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isActive: !r.isActive } : r))
    );
  };

  const deleteRule = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  const createRule = (newRule: Partial<AutoApplyRule>) => {
    setRules((prev) => [
      ...prev,
      {
        ...newRule,
        id: Date.now().toString(),
        applicationsToday: 0,
        totalApplications: 0,
      } as AutoApplyRule,
    ]);
  };

  const activeRulesCount = rules.filter((r) => r.isActive).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Auto-Apply</h1>
          <p className="text-[var(--text-secondary)] mt-1">
            Automatically apply to jobs that match your criteria
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSystemActive(!isSystemActive)}
            className={cn(
              'px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors',
              isSystemActive
                ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
            )}
          >
            {isSystemActive ? (
              <>
                <Zap size={18} />
                System Active
              </>
            ) : (
              <>
                <Pause size={18} />
                System Paused
              </>
            )}
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-gradient inline-flex items-center gap-2"
          >
            <Plus size={18} />
            New Rule
          </button>
        </div>
      </div>

      {/* System Status Alert */}
      {!isSystemActive && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-4 border-l-4 border-yellow-500 flex items-center gap-3"
        >
          <AlertCircle className="text-yellow-500" />
          <div>
            <span className="font-medium">Auto-apply system is paused.</span>
            <span className="text-[var(--text-secondary)] ml-1">
              No applications will be sent until you resume.
            </span>
          </div>
        </motion.div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Calendar}
          label="Today"
          value={sampleStats.today}
          subValue="applications"
          color="bg-blue-500/20 text-blue-400"
        />
        <StatCard
          icon={TrendingUp}
          label="This Week"
          value={sampleStats.week}
          subValue="applications"
          color="bg-purple-500/20 text-purple-400"
        />
        <StatCard
          icon={Briefcase}
          label="Total"
          value={sampleStats.total}
          subValue="auto-applications"
          color="bg-emerald-500/20 text-emerald-400"
        />
        <StatCard
          icon={CheckCircle2}
          label="Success Rate"
          value={`${sampleStats.successRate}%`}
          subValue="got responses"
          color="bg-orange-500/20 text-orange-400"
        />
      </div>

      {/* Rules Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            Auto-Apply Rules
            <span className="text-sm font-normal text-[var(--text-muted)] ml-2">
              {activeRulesCount} active
            </span>
          </h2>
        </div>

        <div className="space-y-4">
          {rules.length > 0 ? (
            rules.map((rule) => (
              <RuleCard
                key={rule.id}
                rule={rule}
                onToggle={() => toggleRule(rule.id)}
                onEdit={() => {}}
                onDelete={() => deleteRule(rule.id)}
              />
            ))
          ) : (
            <div className="glass-card p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mx-auto mb-4">
                <Settings size={32} className="text-[var(--text-muted)]" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No rules configured</h3>
              <p className="text-[var(--text-secondary)] mb-4">
                Create your first auto-apply rule to start automating your job applications.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-gradient inline-flex items-center gap-2"
              >
                <Plus size={18} />
                Create First Rule
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Recent Auto-Applications */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Recent Auto-Applications</h2>
        <div className="glass-card overflow-hidden">
          <div className="divide-y divide-[var(--glass-border)]">
            {sampleRecentApplications.map((app) => (
              <div
                key={app.id}
                className="p-4 flex items-center justify-between hover:bg-[var(--bg-hover)] transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                    {app.company[0]}
                  </div>
                  <div>
                    <h4 className="font-medium">{app.role}</h4>
                    <p className="text-sm text-[var(--text-secondary)]">{app.company}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm font-medium text-emerald-400">
                      {app.matchScore}% match
                    </div>
                    <div className="text-xs text-[var(--text-muted)]">
                      {formatTimeAgo(app.appliedAt)}
                    </div>
                  </div>
                  <CheckCircle2 size={20} className="text-emerald-500" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Create Rule Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateRuleModal
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onSave={createRule}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
