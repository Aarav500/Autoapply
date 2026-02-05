'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Trash2,
  Briefcase,
  Calendar,
  Mail,
  FileText,
  TrendingUp,
  Clock,
  Settings,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type NotificationType =
  | 'new_job_match'
  | 'application_status'
  | 'interview_scheduled'
  | 'interview_reminder'
  | 'email_received'
  | 'document_ready'
  | 'weekly_digest';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
  data?: Record<string, unknown>;
}

// Sample notifications
const sampleNotifications: Notification[] = [
  {
    id: '1',
    type: 'new_job_match',
    title: 'New Job Match: 92% Match',
    message: 'Senior Software Engineer at Google matches your profile excellently!',
    isRead: false,
    createdAt: new Date(Date.now() - 30 * 60 * 1000),
    data: { jobId: '1', matchScore: 92 },
  },
  {
    id: '2',
    type: 'application_status',
    title: 'Application Update',
    message: 'Your application for Full Stack Developer at Stripe moved to Interview stage.',
    isRead: false,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    data: { applicationId: '2', status: 'interview' },
  },
  {
    id: '3',
    type: 'interview_scheduled',
    title: 'Interview Scheduled',
    message: 'Technical interview with Meta scheduled for Friday at 2:00 PM PST.',
    isRead: false,
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
    data: { interviewId: '1' },
  },
  {
    id: '4',
    type: 'email_received',
    title: 'New Recruiter Email',
    message: 'Sarah from Amazon Tech Recruiting sent you a message about a position.',
    isRead: true,
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
    data: { emailId: '1' },
  },
  {
    id: '5',
    type: 'document_ready',
    title: 'Cover Letter Ready',
    message: 'Your personalized cover letter for Netflix is ready for review.',
    isRead: true,
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
    data: { documentId: '1' },
  },
  {
    id: '6',
    type: 'interview_reminder',
    title: 'Interview Tomorrow',
    message: 'Reminder: Your interview with Stripe is tomorrow at 10:00 AM.',
    isRead: true,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  },
  {
    id: '7',
    type: 'weekly_digest',
    title: 'Weekly Job Hunt Summary',
    message: 'This week: 15 new matches, 5 applications submitted, 2 interviews scheduled.',
    isRead: true,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
];

const notificationIcons: Record<NotificationType, React.ElementType> = {
  new_job_match: Briefcase,
  application_status: TrendingUp,
  interview_scheduled: Calendar,
  interview_reminder: Clock,
  email_received: Mail,
  document_ready: FileText,
  weekly_digest: TrendingUp,
};

const notificationColors: Record<NotificationType, string> = {
  new_job_match: 'bg-blue-500/20 text-blue-400',
  application_status: 'bg-emerald-500/20 text-emerald-400',
  interview_scheduled: 'bg-purple-500/20 text-purple-400',
  interview_reminder: 'bg-yellow-500/20 text-yellow-400',
  email_received: 'bg-pink-500/20 text-pink-400',
  document_ready: 'bg-cyan-500/20 text-cyan-400',
  weekly_digest: 'bg-orange-500/20 text-orange-400',
};

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

function NotificationItem({
  notification,
  onMarkRead,
  onDelete,
}: {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const Icon = notificationIcons[notification.type];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={cn(
        'p-4 rounded-xl transition-all group',
        notification.isRead
          ? 'bg-[var(--bg-tertiary)]/50'
          : 'bg-[var(--bg-tertiary)] border-l-4 border-[var(--accent-primary)]'
      )}
    >
      <div className="flex items-start gap-4">
        <div className={cn('p-2.5 rounded-xl shrink-0', notificationColors[notification.type])}>
          <Icon size={20} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3
                className={cn(
                  'font-medium',
                  !notification.isRead && 'text-[var(--text-primary)]'
                )}
              >
                {notification.title}
              </h3>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                {notification.message}
              </p>
            </div>
            <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">
              {formatTimeAgo(notification.createdAt)}
            </span>
          </div>

          <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
            {!notification.isRead && (
              <button
                onClick={() => onMarkRead(notification.id)}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1 transition-colors"
              >
                <Check size={14} />
                Mark read
              </button>
            )}
            <button
              onClick={() => onDelete(notification.id)}
              className="text-xs text-[var(--text-muted)] hover:text-red-400 flex items-center gap-1 transition-colors"
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        </div>

        {!notification.isRead && (
          <div className="w-2 h-2 rounded-full bg-[var(--accent-primary)] shrink-0 mt-2" />
        )}
      </div>
    </motion.div>
  );
}

function NotificationPreferences({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [preferences, setPreferences] = useState({
    new_job_match: { email: true, sms: false, push: true },
    application_status: { email: true, sms: true, push: true },
    interview_scheduled: { email: true, sms: true, push: true },
    interview_reminder: { email: true, sms: true, push: true },
    email_received: { email: false, sms: false, push: true },
    document_ready: { email: true, sms: false, push: true },
    weekly_digest: { email: true, sms: false, push: false },
  });

  const labels: Record<NotificationType, string> = {
    new_job_match: 'New Job Matches',
    application_status: 'Application Updates',
    interview_scheduled: 'Interview Scheduled',
    interview_reminder: 'Interview Reminders',
    email_received: 'Recruiter Emails',
    document_ready: 'Documents Ready',
    weekly_digest: 'Weekly Digest',
  };

  if (!isOpen) return null;

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
        className="glass-card w-full max-w-2xl max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-[var(--glass-border)] flex items-center justify-between">
          <h2 className="text-xl font-semibold">Notification Preferences</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="space-y-6">
            {/* Header */}
            <div className="grid grid-cols-4 gap-4 pb-2 border-b border-[var(--glass-border)]">
              <div className="text-sm font-medium">Notification Type</div>
              <div className="text-sm font-medium text-center">Email</div>
              <div className="text-sm font-medium text-center">SMS</div>
              <div className="text-sm font-medium text-center">Push</div>
            </div>

            {/* Preferences */}
            {Object.entries(preferences).map(([type, channels]) => (
              <div key={type} className="grid grid-cols-4 gap-4 items-center">
                <div className="text-sm">{labels[type as NotificationType]}</div>
                {(['email', 'sms', 'push'] as const).map((channel) => (
                  <div key={channel} className="flex justify-center">
                    <button
                      onClick={() =>
                        setPreferences((prev) => ({
                          ...prev,
                          [type]: {
                            ...prev[type as keyof typeof prev],
                            [channel]: !prev[type as keyof typeof prev][channel],
                          },
                        }))
                      }
                      className={cn(
                        'w-10 h-6 rounded-full transition-colors relative',
                        channels[channel] ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-tertiary)]'
                      )}
                    >
                      <div
                        className={cn(
                          'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                          channels[channel] ? 'translate-x-5' : 'translate-x-1'
                        )}
                      />
                    </button>
                  </div>
                ))}
              </div>
            ))}
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
            onClick={onClose}
            className="btn-gradient"
          >
            Save Preferences
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState(sampleNotifications);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [showPreferences, setShowPreferences] = useState(false);

  const filteredNotifications = notifications.filter(
    (n) => filter === 'all' || !n.isRead
  );

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-[var(--text-secondary)] mt-1">
            {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPreferences(true)}
            className="p-2 rounded-lg border border-[var(--glass-border)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            <Settings size={20} />
          </button>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="px-4 py-2 rounded-lg border border-[var(--glass-border)] hover:bg-[var(--bg-hover)] transition-colors flex items-center gap-2 text-sm"
            >
              <CheckCheck size={18} />
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilter('all')}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            filter === 'all'
              ? 'bg-[var(--accent-primary)] text-white'
              : 'bg-[var(--bg-tertiary)] hover:bg-[var(--bg-elevated)]'
          )}
        >
          All
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2',
            filter === 'unread'
              ? 'bg-[var(--accent-primary)] text-white'
              : 'bg-[var(--bg-tertiary)] hover:bg-[var(--bg-elevated)]'
          )}
        >
          Unread
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-xs">
              {unreadCount}
            </span>
          )}
        </button>
        {notifications.length > 0 && (
          <button
            onClick={clearAll}
            className="ml-auto px-4 py-2 rounded-lg text-sm text-[var(--text-muted)] hover:text-red-400 transition-colors flex items-center gap-2"
          >
            <Trash2 size={16} />
            Clear all
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        <AnimatePresence>
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkRead={markAsRead}
                onDelete={deleteNotification}
              />
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-card p-12 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mx-auto mb-4">
                <BellOff size={32} className="text-[var(--text-muted)]" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No notifications</h3>
              <p className="text-[var(--text-secondary)]">
                {filter === 'unread'
                  ? "You're all caught up! No unread notifications."
                  : "You don't have any notifications yet."}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Preferences Modal */}
      <AnimatePresence>
        {showPreferences && (
          <NotificationPreferences
            isOpen={showPreferences}
            onClose={() => setShowPreferences(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
