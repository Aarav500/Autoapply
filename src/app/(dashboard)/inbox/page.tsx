'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail,
  Inbox,
  Star,
  Archive,
  Trash2,
  Reply,
  MoreVertical,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Calendar,
  Briefcase,
  AlertCircle,
  Sparkles,
  ChevronLeft,
  Send,
  Clock,
} from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';

// Email classification config
const classificationConfig = {
  recruiter: { label: 'Recruiter', color: 'blue', icon: Briefcase },
  interview: { label: 'Interview', color: 'purple', icon: Calendar },
  offer: { label: 'Offer', color: 'emerald', icon: CheckCircle2 },
  rejection: { label: 'Rejection', color: 'red', icon: XCircle },
  follow_up: { label: 'Follow Up', color: 'orange', icon: Clock },
  newsletter: { label: 'Newsletter', color: 'gray', icon: Mail },
};

type EmailClassification = keyof typeof classificationConfig;

// Sample emails
const sampleEmails = [
  {
    id: '1',
    from: 'sarah.johnson@vercel.com',
    fromName: 'Sarah Johnson',
    subject: 'Interview Invitation - Senior Frontend Engineer',
    snippet: 'Hi John, Thank you for applying to the Senior Frontend Engineer position at Vercel. We were impressed by your background and would love to schedule...',
    bodyText: `Hi John,

Thank you for applying to the Senior Frontend Engineer position at Vercel. We were impressed by your background and would love to schedule an interview to discuss the role further.

Would you be available for a 45-minute video call next week? Please let me know your availability for the following times:
- Tuesday, Feb 6th: 10am-12pm PST
- Wednesday, Feb 7th: 2pm-4pm PST
- Thursday, Feb 8th: 10am-12pm PST

Looking forward to hearing from you!

Best regards,
Sarah Johnson
Technical Recruiter, Vercel`,
    classification: 'interview' as EmailClassification,
    sentiment: 'positive',
    isRead: false,
    isStarred: true,
    needsResponse: true,
    suggestedReply: `Hi Sarah,

Thank you for reaching out! I'm very excited about the opportunity to interview for the Senior Frontend Engineer position at Vercel.

I'm available on Tuesday, Feb 6th from 10am-12pm PST. Would 10:30am work for you?

Looking forward to our conversation!

Best regards,
John`,
    receivedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    application: {
      job: { title: 'Senior Frontend Engineer', company: 'Vercel' },
    },
  },
  {
    id: '2',
    from: 'recruiting@stripe.com',
    fromName: 'Stripe Recruiting',
    subject: 'Your Application to Stripe',
    snippet: "Thank you for your interest in joining Stripe. We've received your application for the Full Stack Developer position and our team is currently reviewing...",
    bodyText: `Dear John,

Thank you for your interest in joining Stripe. We've received your application for the Full Stack Developer position and our team is currently reviewing your materials.

We receive many applications and carefully consider each one. We'll be in touch within the next two weeks if we'd like to move forward with your candidacy.

In the meantime, feel free to explore our engineering blog to learn more about the problems we're solving.

Best,
The Stripe Recruiting Team`,
    classification: 'recruiter' as EmailClassification,
    sentiment: 'neutral',
    isRead: true,
    isStarred: false,
    needsResponse: false,
    suggestedReply: null,
    receivedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    application: {
      job: { title: 'Full Stack Developer', company: 'Stripe' },
    },
  },
  {
    id: '3',
    from: 'hr@techcorp.com',
    fromName: 'TechCorp HR',
    subject: 'Application Status Update',
    snippet: "We regret to inform you that after careful consideration, we have decided to move forward with other candidates for the Software Engineer position...",
    bodyText: `Dear John,

Thank you for your interest in the Software Engineer position at TechCorp and for taking the time to interview with our team.

After careful consideration, we have decided to move forward with other candidates whose experience more closely aligns with our current needs.

We encourage you to apply for future positions that match your skills and experience. We wish you the best in your job search.

Best regards,
TechCorp HR Team`,
    classification: 'rejection' as EmailClassification,
    sentiment: 'negative',
    isRead: true,
    isStarred: false,
    needsResponse: false,
    suggestedReply: null,
    receivedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    application: {
      job: { title: 'Software Engineer', company: 'TechCorp' },
    },
  },
  {
    id: '4',
    from: 'lisa.chen@linear.app',
    fromName: 'Lisa Chen',
    subject: "We'd like to extend an offer!",
    snippet: "Hi John, I'm thrilled to inform you that after our interview process, we'd like to extend an offer for the Software Engineer position at Linear...",
    bodyText: `Hi John,

I'm thrilled to inform you that after our interview process, we'd like to extend an offer for the Software Engineer position at Linear!

We were impressed by your technical skills, problem-solving approach, and cultural fit with our team. The formal offer letter with complete details will be sent to you within 24 hours.

In the meantime, please don't hesitate to reach out if you have any questions.

We're excited about the possibility of having you join our team!

Best,
Lisa Chen
Engineering Manager, Linear`,
    classification: 'offer' as EmailClassification,
    sentiment: 'positive',
    isRead: false,
    isStarred: true,
    needsResponse: true,
    suggestedReply: `Hi Lisa,

Thank you so much for this exciting news! I'm thrilled about the opportunity to join Linear.

I look forward to receiving the formal offer letter and reviewing the details. I may have a few questions after reviewing, but I'm very enthusiastic about this opportunity.

Thank you again for considering me for this role!

Best regards,
John`,
    receivedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
    application: {
      job: { title: 'Software Engineer', company: 'Linear' },
    },
  },
];

function EmailRow({
  email,
  isSelected,
  onSelect,
  onClick,
}: {
  email: typeof sampleEmails[0];
  isSelected: boolean;
  onSelect: () => void;
  onClick: () => void;
}) {
  const config = classificationConfig[email.classification];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'flex items-center gap-4 p-4 border-b border-[var(--glass-border)] cursor-pointer transition-colors',
        !email.isRead && 'bg-[var(--accent-primary)]/5',
        isSelected && 'bg-[var(--accent-primary)]/10'
      )}
      onClick={onClick}
    >
      <input
        type="checkbox"
        checked={isSelected}
        onChange={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        className="w-4 h-4 rounded border-[var(--glass-border)]"
      />

      <button
        onClick={(e) => {
          e.stopPropagation();
          // Toggle star
        }}
        className={cn(
          'p-1',
          email.isStarred ? 'text-yellow-400' : 'text-[var(--text-muted)] hover:text-yellow-400'
        )}
      >
        <Star size={16} fill={email.isStarred ? 'currentColor' : 'none'} />
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn('font-medium truncate', !email.isRead && 'font-semibold')}>
            {email.fromName}
          </span>
          <span
            className={cn(
              'px-1.5 py-0.5 text-[10px] font-medium rounded flex items-center gap-1',
              config.color === 'blue' && 'bg-blue-500/20 text-blue-400',
              config.color === 'purple' && 'bg-purple-500/20 text-purple-400',
              config.color === 'emerald' && 'bg-emerald-500/20 text-emerald-400',
              config.color === 'red' && 'bg-red-500/20 text-red-400',
              config.color === 'orange' && 'bg-orange-500/20 text-orange-400',
              config.color === 'gray' && 'bg-gray-500/20 text-gray-400'
            )}
          >
            <Icon size={10} />
            {config.label}
          </span>
          {email.needsResponse && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-yellow-500/20 text-yellow-400">
              Needs Reply
            </span>
          )}
        </div>
        <p className={cn('text-sm truncate', email.isRead ? 'text-[var(--text-muted)]' : 'text-[var(--text-primary)]')}>
          {email.subject}
        </p>
        <p className="text-xs text-[var(--text-muted)] truncate">{email.snippet}</p>
      </div>

      <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">
        {formatRelativeTime(email.receivedAt)}
      </span>
    </div>
  );
}

function EmailDetail({
  email,
  onBack,
}: {
  email: typeof sampleEmails[0];
  onBack: () => void;
}) {
  const [replyText, setReplyText] = useState(email.suggestedReply || '');
  const config = classificationConfig[email.classification];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="h-full flex flex-col"
    >
      {/* Header */}
      <div className="p-4 border-b border-[var(--glass-border)] flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)]"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1">
          <h2 className="font-semibold">{email.subject}</h2>
          <p className="text-sm text-[var(--text-muted)]">
            From: {email.fromName} &lt;{email.from}&gt;
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)]">
            <Archive size={18} />
          </button>
          <button className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)]">
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* Application Context */}
      {email.application && (
        <div className="p-4 bg-[var(--bg-tertiary)]/50 border-b border-[var(--glass-border)]">
          <div className="flex items-center gap-2 text-sm">
            <Briefcase size={14} className="text-[var(--text-muted)]" />
            <span className="text-[var(--text-muted)]">Related to:</span>
            <span className="font-medium">
              {email.application.job.title} at {email.application.job.company}
            </span>
          </div>
        </div>
      )}

      {/* Email Body */}
      <div className="flex-1 overflow-y-auto p-6">
        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
          {email.bodyText}
        </pre>
      </div>

      {/* Reply Section */}
      {email.needsResponse && (
        <div className="border-t border-[var(--glass-border)] p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={16} className="text-[var(--accent-primary)]" />
            <span className="text-sm font-medium">AI Suggested Reply</span>
          </div>
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            rows={6}
            className="w-full p-3 bg-[var(--bg-secondary)] border border-[var(--glass-border)] rounded-xl text-sm resize-none focus:outline-none focus:border-[var(--accent-primary)]"
          />
          <div className="flex justify-end gap-3 mt-3">
            <button className="btn-secondary flex items-center gap-2">
              <Reply size={16} />
              Edit Reply
            </button>
            <button className="btn-gradient flex items-center gap-2">
              <Send size={16} />
              Send Reply
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default function InboxPage() {
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<typeof sampleEmails[0] | null>(null);
  const [filter, setFilter] = useState<EmailClassification | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEmails = sampleEmails.filter((email) => {
    if (filter !== 'all' && email.classification !== filter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        email.subject.toLowerCase().includes(query) ||
        email.fromName.toLowerCase().includes(query) ||
        email.snippet.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const unreadCount = sampleEmails.filter((e) => !e.isRead).length;
  const needsResponseCount = sampleEmails.filter((e) => e.needsResponse).length;

  if (selectedEmail) {
    return (
      <div className="glass-card h-[calc(100vh-12rem)]">
        <EmailDetail email={selectedEmail} onBack={() => setSelectedEmail(null)} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Inbox</h1>
          <p className="text-[var(--text-secondary)] mt-1">
            {unreadCount} unread, {needsResponseCount} need response
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
            />
            <input
              type="text"
              placeholder="Search emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--glass-border)] rounded-xl text-sm focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
            />
          </div>

          {/* Classification Filter */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('all')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                filter === 'all'
                  ? 'bg-[var(--accent-primary)] text-white'
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              )}
            >
              All
            </button>
            {Object.entries(classificationConfig).map(([key, config]) => (
              <button
                key={key}
                onClick={() => setFilter(key as EmailClassification)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5',
                  filter === key
                    ? 'bg-[var(--accent-primary)] text-white'
                    : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                )}
              >
                <config.icon size={14} />
                {config.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Email List */}
      <div className="glass-card overflow-hidden">
        {/* Toolbar */}
        {selectedEmails.length > 0 && (
          <div className="p-3 bg-[var(--bg-tertiary)] border-b border-[var(--glass-border)] flex items-center gap-4">
            <span className="text-sm text-[var(--text-muted)]">
              {selectedEmails.length} selected
            </span>
            <button className="p-1.5 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)]">
              <Archive size={16} />
            </button>
            <button className="p-1.5 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)]">
              <Trash2 size={16} />
            </button>
            <button className="p-1.5 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)]">
              <Mail size={16} />
            </button>
          </div>
        )}

        {/* Emails */}
        <div className="divide-y divide-[var(--glass-border)]">
          {filteredEmails.map((email) => (
            <EmailRow
              key={email.id}
              email={email}
              isSelected={selectedEmails.includes(email.id)}
              onSelect={() => {
                setSelectedEmails((prev) =>
                  prev.includes(email.id)
                    ? prev.filter((id) => id !== email.id)
                    : [...prev, email.id]
                );
              }}
              onClick={() => setSelectedEmail(email)}
            />
          ))}
        </div>

        {filteredEmails.length === 0 && (
          <div className="p-12 text-center">
            <Inbox size={48} className="mx-auto text-[var(--text-muted)] mb-4" />
            <h3 className="text-lg font-semibold mb-2">No emails found</h3>
            <p className="text-[var(--text-muted)]">
              {filter !== 'all'
                ? `No ${classificationConfig[filter].label.toLowerCase()} emails`
                : 'Your inbox is empty'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
