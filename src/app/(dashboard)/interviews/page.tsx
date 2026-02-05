'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  Phone,
  Building,
  Users,
  ChevronRight,
  Plus,
  ExternalLink,
  Sparkles,
  MessageSquare,
  BookOpen,
  Target,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';

// Interview type config
const interviewTypes = {
  phone_screen: { label: 'Phone Screen', icon: Phone, color: 'blue' },
  video: { label: 'Video Call', icon: Video, color: 'purple' },
  technical: { label: 'Technical', icon: Target, color: 'cyan' },
  behavioral: { label: 'Behavioral', icon: MessageSquare, color: 'orange' },
  onsite: { label: 'On-site', icon: Building, color: 'emerald' },
  panel: { label: 'Panel', icon: Users, color: 'pink' },
  final: { label: 'Final Round', icon: CheckCircle2, color: 'yellow' },
};

type InterviewType = keyof typeof interviewTypes;

// Sample interviews
const sampleInterviews = [
  {
    id: '1',
    type: 'technical' as InterviewType,
    title: 'Technical Interview - Frontend',
    round: 2,
    scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    duration: 60,
    platform: 'zoom',
    meetingLink: 'https://zoom.us/j/123456789',
    status: 'confirmed',
    interviewers: [
      { name: 'David Chen', title: 'Senior Engineer' },
      { name: 'Emily Wong', title: 'Tech Lead' },
    ],
    application: {
      job: {
        title: 'Senior Frontend Engineer',
        company: 'Vercel',
        companyLogo: 'V',
      },
    },
    prepMaterials: {
      companyOverview: 'Vercel is the platform for frontend developers, providing the speed and reliability innovators need to create at the moment of inspiration.',
      tips: [
        'Be prepared to discuss React performance optimization',
        'Have examples of complex state management',
        'Show understanding of Next.js internals',
      ],
    },
    practiceQuestions: [
      'Explain the React rendering lifecycle',
      'How would you optimize a slow React component?',
      'Describe your experience with server-side rendering',
    ],
    questionsToAsk: [
      'What does a typical day look like for the team?',
      'How do you approach technical debt?',
      'What are the biggest challenges the team is facing?',
    ],
  },
  {
    id: '2',
    type: 'behavioral' as InterviewType,
    title: 'Hiring Manager Interview',
    round: 3,
    scheduledAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    duration: 45,
    platform: 'google_meet',
    meetingLink: 'https://meet.google.com/abc-defg-hij',
    status: 'pending',
    interviewers: [
      { name: 'Sarah Johnson', title: 'Engineering Manager' },
    ],
    application: {
      job: {
        title: 'Full Stack Developer',
        company: 'Stripe',
        companyLogo: 'S',
      },
    },
    prepMaterials: null,
    practiceQuestions: [],
    questionsToAsk: [],
  },
  {
    id: '3',
    type: 'phone_screen' as InterviewType,
    title: 'Initial Screen',
    round: 1,
    scheduledAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    duration: 30,
    platform: 'phone',
    meetingLink: null,
    status: 'completed',
    interviewers: [
      { name: 'Mike Thompson', title: 'Recruiter' },
    ],
    application: {
      job: {
        title: 'Software Engineer',
        company: 'Linear',
        companyLogo: 'L',
      },
    },
    prepMaterials: null,
    practiceQuestions: [],
    questionsToAsk: [],
  },
];

function InterviewCard({
  interview,
  onSelect,
}: {
  interview: typeof sampleInterviews[0];
  onSelect: () => void;
}) {
  const typeConfig = interviewTypes[interview.type];
  const TypeIcon = typeConfig.icon;
  const isUpcoming = interview.scheduledAt > new Date();
  const isPast = !isUpcoming;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'glass-card p-6 cursor-pointer hover:border-[var(--accent-primary)]/30 transition-all',
        isPast && 'opacity-70'
      )}
      onClick={onSelect}
    >
      <div className="flex items-start gap-4">
        {/* Company Logo */}
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg shrink-0">
          {interview.application.job.companyLogo}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold">{interview.title}</h3>
              <p className="text-sm text-[var(--text-secondary)]">
                {interview.application.job.title} at {interview.application.job.company}
              </p>
            </div>
            <span
              className={cn(
                'px-2 py-1 rounded-lg text-xs font-medium flex items-center gap-1',
                typeConfig.color === 'blue' && 'bg-blue-500/20 text-blue-400',
                typeConfig.color === 'purple' && 'bg-purple-500/20 text-purple-400',
                typeConfig.color === 'cyan' && 'bg-cyan-500/20 text-cyan-400',
                typeConfig.color === 'orange' && 'bg-orange-500/20 text-orange-400',
                typeConfig.color === 'emerald' && 'bg-emerald-500/20 text-emerald-400',
                typeConfig.color === 'pink' && 'bg-pink-500/20 text-pink-400',
                typeConfig.color === 'yellow' && 'bg-yellow-500/20 text-yellow-400'
              )}
            >
              <TypeIcon size={12} />
              {typeConfig.label}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-[var(--text-muted)]">
            <span className="flex items-center gap-1.5">
              <Calendar size={14} />
              {formatDate(interview.scheduledAt)}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock size={14} />
              {interview.scheduledAt.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
              })}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock size={14} />
              {interview.duration} min
            </span>
            {interview.interviewers.length > 0 && (
              <span className="flex items-center gap-1.5">
                <Users size={14} />
                {interview.interviewers.map((i) => i.name).join(', ')}
              </span>
            )}
          </div>

          {isUpcoming && interview.meetingLink && (
            <a
              href={interview.meetingLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-lg bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] text-sm font-medium hover:bg-[var(--accent-primary)]/20 transition-colors"
            >
              <Video size={14} />
              Join Meeting
              <ExternalLink size={12} />
            </a>
          )}
        </div>

        <ChevronRight size={20} className="text-[var(--text-muted)]" />
      </div>
    </motion.div>
  );
}

function InterviewDetail({
  interview,
  onBack,
}: {
  interview: typeof sampleInterviews[0];
  onBack: () => void;
}) {
  const typeConfig = interviewTypes[interview.type];
  const [activeTab, setActiveTab] = useState<'prep' | 'questions' | 'ask'>('prep');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <button
        onClick={onBack}
        className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center gap-1"
      >
        <ChevronRight size={16} className="rotate-180" />
        Back to interviews
      </button>

      {/* Interview Info */}
      <div className="glass-card p-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-2xl">
            {interview.application.job.companyLogo}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{interview.title}</h1>
            <p className="text-[var(--text-secondary)]">
              {interview.application.job.title} at {interview.application.job.company}
            </p>

            <div className="flex flex-wrap items-center gap-4 mt-4 text-sm">
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)]">
                <Calendar size={14} className="text-[var(--accent-primary)]" />
                {formatDate(interview.scheduledAt)}
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)]">
                <Clock size={14} className="text-[var(--accent-primary)]" />
                {interview.scheduledAt.toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                })} ({interview.duration} min)
              </span>
              {interview.meetingLink && (
                <a
                  href={interview.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent-primary)] text-white"
                >
                  <Video size={14} />
                  Join Meeting
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Interviewers */}
        {interview.interviewers.length > 0 && (
          <div className="mt-6 pt-6 border-t border-[var(--glass-border)]">
            <h3 className="text-sm font-medium text-[var(--text-muted)] mb-3">Interviewers</h3>
            <div className="flex flex-wrap gap-3">
              {interview.interviewers.map((interviewer, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[var(--bg-tertiary)]"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-medium">
                    {interviewer.name.split(' ').map((n) => n[0]).join('')}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{interviewer.name}</p>
                    {interviewer.title && (
                      <p className="text-xs text-[var(--text-muted)]">{interviewer.title}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Prep Materials */}
      <div className="glass-card overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-[var(--glass-border)]">
          {[
            { id: 'prep', label: 'Preparation', icon: BookOpen },
            { id: 'questions', label: 'Practice Questions', icon: MessageSquare },
            { id: 'ask', label: 'Questions to Ask', icon: Target },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={cn(
                'flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors',
                activeTab === tab.id
                  ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border-b-2 border-[var(--accent-primary)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              )}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'prep' && (
            <div className="space-y-6">
              {interview.prepMaterials ? (
                <>
                  <div>
                    <h3 className="font-semibold mb-2">Company Overview</h3>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {interview.prepMaterials.companyOverview}
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Tips for Success</h3>
                    <ul className="space-y-2">
                      {interview.prepMaterials.tips.map((tip, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                          <CheckCircle2 size={16} className="text-emerald-400 mt-0.5 shrink-0" />
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <Sparkles size={48} className="mx-auto text-[var(--text-muted)] mb-4" />
                  <h3 className="font-semibold mb-2">Prep materials generating...</h3>
                  <p className="text-sm text-[var(--text-muted)]">
                    AI is preparing your interview materials
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'questions' && (
            <div className="space-y-4">
              {interview.practiceQuestions.length > 0 ? (
                interview.practiceQuestions.map((question, i) => (
                  <div key={i} className="p-4 rounded-xl bg-[var(--bg-tertiary)]">
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] flex items-center justify-center text-sm font-medium shrink-0">
                        {i + 1}
                      </span>
                      <p className="text-sm">{question}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-[var(--text-muted)]">
                  No practice questions yet
                </div>
              )}
            </div>
          )}

          {activeTab === 'ask' && (
            <div className="space-y-4">
              {interview.questionsToAsk.length > 0 ? (
                interview.questionsToAsk.map((question, i) => (
                  <div key={i} className="p-4 rounded-xl bg-[var(--bg-tertiary)]">
                    <div className="flex items-start gap-3">
                      <AlertCircle size={16} className="text-yellow-400 mt-0.5 shrink-0" />
                      <p className="text-sm">{question}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-[var(--text-muted)]">
                  No suggested questions yet
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function InterviewsPage() {
  const [selectedInterview, setSelectedInterview] = useState<typeof sampleInterviews[0] | null>(null);

  const upcomingInterviews = sampleInterviews.filter((i) => i.scheduledAt > new Date());
  const pastInterviews = sampleInterviews.filter((i) => i.scheduledAt <= new Date());

  if (selectedInterview) {
    return (
      <InterviewDetail
        interview={selectedInterview}
        onBack={() => setSelectedInterview(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Interviews</h1>
          <p className="text-[var(--text-secondary)] mt-1">
            {upcomingInterviews.length} upcoming interviews
          </p>
        </div>
      </div>

      {/* Upcoming Interviews */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Calendar size={20} className="text-[var(--accent-primary)]" />
          Upcoming
        </h2>
        {upcomingInterviews.length > 0 ? (
          <div className="space-y-4">
            {upcomingInterviews.map((interview) => (
              <InterviewCard
                key={interview.id}
                interview={interview}
                onSelect={() => setSelectedInterview(interview)}
              />
            ))}
          </div>
        ) : (
          <div className="glass-card p-8 text-center">
            <Calendar size={48} className="mx-auto text-[var(--text-muted)] mb-4" />
            <h3 className="font-semibold mb-2">No upcoming interviews</h3>
            <p className="text-sm text-[var(--text-muted)]">
              Interviews will appear here when scheduled
            </p>
          </div>
        )}
      </div>

      {/* Past Interviews */}
      {pastInterviews.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-[var(--text-muted)]">
            <Clock size={20} />
            Past Interviews
          </h2>
          <div className="space-y-4">
            {pastInterviews.map((interview) => (
              <InterviewCard
                key={interview.id}
                interview={interview}
                onSelect={() => setSelectedInterview(interview)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
