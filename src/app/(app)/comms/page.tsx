"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import {
  Calendar,
  CheckCircle2,
  Send,
  Sparkles,
  RefreshCw,
  FileText,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Loader2,
  ArrowRight,
  Clock,
  X,
  Users,
  Mail,
  Building2,
  Plus,
  Trash2,
  ExternalLink,
  UserCheck,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

// ─── Types ────────────────────────────────────────────────────────────────────

type Sentiment = "positive" | "neutral" | "negative" | "urgent";
type ReplyTone = "professional" | "enthusiastic" | "concise";

interface ThreadSummary {
  summary: string;
  bullet_points: string[];
  action_items: string[];
  key_dates: string[];
  sentiment: Sentiment;
  next_step: string;
}

interface SmartReply {
  tone: ReplyTone;
  subject: string;
  body: string;
  why: string;
  word_count: number;
}

interface SmartReplyResult {
  replies: SmartReply[];
  recommended_tone: ReplyTone;
  reasoning: string;
}

type EmailThread = Record<string, unknown>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCategoryBadge(category: string): { color: string; label: string } {
  const badges: Record<string, { color: string; label: string }> = {
    interview_invite: { color: "#8B5CF6", label: "Interview" },
    rejection: { color: "#F87171", label: "Rejection" },
    recruiter_outreach: { color: "#536DFE", label: "Recruiter" },
    follow_up: { color: "#FBBF24", label: "Follow-up" },
    offer: { color: "#34D399", label: "Offer" },
    action_required: { color: "#FBBF24", label: "Action" },
  };
  return badges[category] || { color: "#9090B8", label: "Other" };
}

function getSentimentConfig(sentiment: Sentiment): { color: string; bg: string; border: string; label: string } {
  const map: Record<Sentiment, { color: string; bg: string; border: string; label: string }> = {
    positive: {
      color: "#34D399",
      bg: "rgba(52, 211, 153, 0.08)",
      border: "rgba(52, 211, 153, 0.2)",
      label: "Positive",
    },
    neutral: {
      color: "#9090B8",
      bg: "rgba(144, 144, 184, 0.08)",
      border: "rgba(144, 144, 184, 0.2)",
      label: "Neutral",
    },
    negative: {
      color: "#F87171",
      bg: "rgba(248, 113, 113, 0.08)",
      border: "rgba(248, 113, 113, 0.2)",
      label: "Negative",
    },
    urgent: {
      color: "#FBBF24",
      bg: "rgba(251, 191, 36, 0.08)",
      border: "rgba(251, 191, 36, 0.2)",
      label: "Urgent",
    },
  };
  return map[sentiment];
}

function getToneConfig(tone: ReplyTone): { color: string; bg: string; border: string; label: string } {
  const map: Record<ReplyTone, { color: string; bg: string; border: string; label: string }> = {
    professional: {
      color: "#8B5CF6",
      bg: "rgba(139, 92, 246, 0.08)",
      border: "rgba(139, 92, 246, 0.2)",
      label: "Professional",
    },
    enthusiastic: {
      color: "#34D399",
      bg: "rgba(52, 211, 153, 0.08)",
      border: "rgba(52, 211, 153, 0.2)",
      label: "Enthusiastic",
    },
    concise: {
      color: "#00B8D4",
      bg: "rgba(0, 184, 212, 0.08)",
      border: "rgba(0, 184, 212, 0.2)",
      label: "Concise",
    },
  };
  return map[tone];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ThreadSummaryPanel({ summary, onClose }: { summary: ThreadSummary; onClose: () => void }) {
  const sentiment = getSentimentConfig(summary.sentiment);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="mt-2 rounded-lg overflow-hidden"
      style={{
        background: "rgba(12, 12, 20, 0.95)",
        border: "1px solid rgba(124, 58, 237, 0.15)",
      }}
    >
      <div className="p-4">
        {/* Header row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles size={14} style={{ color: "#8B5CF6" }} />
            <span
              className="text-[12px] font-semibold"
              style={{ fontFamily: "'Inter', sans-serif", color: "#8B5CF6" }}
            >
              Thread Summary
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Sentiment badge */}
            <span
              className="px-2 py-0.5 rounded text-[10px] font-medium"
              style={{
                background: sentiment.bg,
                border: `1px solid ${sentiment.border}`,
                color: sentiment.color,
                fontFamily: "monospace, monospace",
              }}
            >
              {sentiment.label}
            </span>
            <button
              onClick={onClose}
              className="text-[#3A3A60] hover:text-[#9090B8] transition-colors text-[11px]"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Summary paragraph */}
        <p
          className="text-[12px] leading-relaxed mb-3"
          style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
        >
          {summary.summary}
        </p>

        {/* Bullet points */}
        {summary.bullet_points.length > 0 && (
          <ul className="space-y-1 mb-3">
            {summary.bullet_points.map((point, i) => (
              <li key={i} className="flex items-start gap-2">
                <span style={{ color: "#8B5CF6", fontSize: "10px", marginTop: "3px" }}>▸</span>
                <span
                  className="text-[12px]"
                  style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
                >
                  {point}
                </span>
              </li>
            ))}
          </ul>
        )}

        {/* Action items */}
        {summary.action_items.length > 0 && (
          <div className="mb-3">
            <p
              className="text-[11px] font-semibold mb-1.5 uppercase tracking-wider"
              style={{ fontFamily: "'Inter', sans-serif", color: "#3A3A60" }}
            >
              Action Items
            </p>
            <ul className="space-y-1">
              {summary.action_items.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2
                    size={12}
                    style={{ color: "#34D399", marginTop: "2px", flexShrink: 0 }}
                  />
                  <span
                    className="text-[12px]"
                    style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
                  >
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Key dates */}
        {summary.key_dates.length > 0 && (
          <div className="mb-3">
            <p
              className="text-[11px] font-semibold mb-1.5 uppercase tracking-wider"
              style={{ fontFamily: "'Inter', sans-serif", color: "#3A3A60" }}
            >
              Key Dates
            </p>
            <div className="flex flex-wrap gap-1.5">
              {summary.key_dates.map((date, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px]"
                  style={{
                    background: "rgba(251, 191, 36, 0.06)",
                    border: "1px solid rgba(251, 191, 36, 0.15)",
                    color: "#FBBF24",
                    fontFamily: "monospace, monospace",
                  }}
                >
                  <Calendar size={10} />
                  {date}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Next step callout */}
        <div
          className="flex items-start gap-2 p-3 rounded-lg"
          style={{
            background: "rgba(139, 92, 246, 0.06)",
            border: "1px solid rgba(139, 92, 246, 0.15)",
          }}
        >
          <ArrowRight size={13} style={{ color: "#A78BFA", marginTop: "1px", flexShrink: 0 }} />
          <div>
            <p
              className="text-[10px] font-semibold uppercase tracking-wider mb-0.5"
              style={{ fontFamily: "'Inter', sans-serif", color: "#7C3AED" }}
            >
              Next Step
            </p>
            <p
              className="text-[12px]"
              style={{ fontFamily: "'Inter', sans-serif", color: "#C4B5FD" }}
            >
              {summary.next_step}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function SmartReplyPanel({
  result,
  onSelectReply,
  onClose,
}: {
  result: SmartReplyResult;
  onSelectReply: (body: string) => void;
  onClose: () => void;
}) {
  const [copiedTone, setCopiedTone] = useState<ReplyTone | null>(null);

  const handleCopy = async (reply: SmartReply) => {
    try {
      await navigator.clipboard.writeText(reply.body);
      setCopiedTone(reply.tone);
      setTimeout(() => setCopiedTone(null), 2000);
    } catch {
      // Clipboard API not available, fall back to selecting
      onSelectReply(reply.body);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.2 }}
      className="mb-3 rounded-lg overflow-hidden"
      style={{
        background: "rgba(12, 12, 20, 0.95)",
        border: "1px solid rgba(124, 58, 237, 0.15)",
      }}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles size={14} style={{ color: "#8B5CF6" }} />
            <span
              className="text-[12px] font-semibold"
              style={{ fontFamily: "'Inter', sans-serif", color: "#8B5CF6" }}
            >
              Smart Reply Options
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-[#3A3A60] hover:text-[#9090B8] transition-colors text-[11px]"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            ✕
          </button>
        </div>

        <p
          className="text-[11px] mb-3"
          style={{ fontFamily: "'Inter', sans-serif", color: "#3A3A60" }}
        >
          {result.reasoning}
        </p>

        <div className="space-y-2">
          {result.replies.map((reply) => {
            const toneConfig = getToneConfig(reply.tone);
            const isRecommended = reply.tone === result.recommended_tone;
            const isCopied = copiedTone === reply.tone;

            return (
              <div
                key={reply.tone}
                className="rounded-lg p-3"
                style={{
                  background: isRecommended
                    ? "rgba(124, 58, 237, 0.06)"
                    : "rgba(255, 255, 255, 0.02)",
                  border: `1px solid ${isRecommended ? "rgba(124, 58, 237, 0.2)" : "rgba(255, 255, 255, 0.04)"}`,
                }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-medium"
                      style={{
                        background: toneConfig.bg,
                        border: `1px solid ${toneConfig.border}`,
                        color: toneConfig.color,
                        fontFamily: "monospace, monospace",
                      }}
                    >
                      {toneConfig.label}
                    </span>
                    {isRecommended && (
                      <span
                        className="text-[10px]"
                        style={{ fontFamily: "'Inter', sans-serif", color: "#8B5CF6" }}
                      >
                        ★ Recommended
                      </span>
                    )}
                  </div>
                  <span
                    className="text-[10px]"
                    style={{ fontFamily: "monospace, monospace", color: "#3A3A60" }}
                  >
                    {reply.word_count}w
                  </span>
                </div>

                {/* Preview */}
                <p
                  className="text-[12px] mb-1.5 line-clamp-2"
                  style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
                >
                  {reply.body.slice(0, 120)}
                  {reply.body.length > 120 ? "…" : ""}
                </p>

                <p
                  className="text-[10px] mb-2 italic"
                  style={{ fontFamily: "'Inter', sans-serif", color: "#3A3A60" }}
                >
                  {reply.why}
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={() => onSelectReply(reply.body)}
                    className="flex-1 px-3 py-1.5 rounded text-[11px] font-medium transition-all hover:opacity-90"
                    style={{
                      background: toneConfig.bg,
                      border: `1px solid ${toneConfig.border}`,
                      color: toneConfig.color,
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    Use This
                  </button>
                  <button
                    onClick={() => handleCopy(reply)}
                    className="px-3 py-1.5 rounded text-[11px] transition-all hover:bg-white/5"
                    style={{
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                      color: "#9090B8",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    {isCopied ? <Check size={12} /> : <Copy size={12} />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Pending Follow-ups Banner ────────────────────────────────────────────────

interface PendingFollowup {
  originalEmailId: string;
  threadId?: string;
  to: string;
  subject: string;
  body: string;
  generatedAt: string;
  status: string;
}

function PendingFollowupsPanel({
  followups,
  onApprove,
  onDismiss,
  approvingId,
  dismissingId,
}: {
  followups: PendingFollowup[];
  onApprove: (id: string) => void;
  onDismiss: (id: string) => void;
  approvingId: string | null;
  dismissingId: string | null;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (followups.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-3 rounded-xl overflow-hidden"
      style={{ border: "1px solid rgba(251,191,36,0.2)", background: "rgba(251,191,36,0.04)" }}
    >
      <div className="px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock size={13} style={{ color: "#FBBF24" }} />
          <span className="text-[12px] font-semibold" style={{ color: "#FBBF24" }}>
            {followups.length} AI Follow-up{followups.length > 1 ? "s" : ""} Ready to Send
          </span>
        </div>
        <span className="text-[10px]" style={{ color: "#5A5A60" }}>Click to review</span>
      </div>
      <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
        {followups.map((f) => {
          const id = f.originalEmailId;
          const isOpen = expanded === id;
          return (
            <div key={id} className="px-4 py-3">
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setExpanded(isOpen ? null : id)}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-medium truncate" style={{ color: "#F0F0FF" }}>{f.subject}</p>
                  <p className="text-[11px] truncate" style={{ color: "#5A5A80" }}>To: {f.to}</p>
                </div>
                <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); onApprove(id); }}
                    disabled={approvingId === id || dismissingId === id}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all disabled:opacity-50"
                    style={{ background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.25)", color: "#34D399" }}
                  >
                    {approvingId === id ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                    {approvingId === id ? "Sending…" : "Send"}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDismiss(id); }}
                    disabled={approvingId === id || dismissingId === id}
                    className="p-1 rounded-lg transition-all disabled:opacity-50"
                    style={{ color: "#5A5A80" }}
                    title="Dismiss"
                  >
                    <X size={13} />
                  </button>
                  {isOpen ? <ChevronUp size={13} style={{ color: "#5A5A80" }} /> : <ChevronDown size={13} style={{ color: "#5A5A80" }} />}
                </div>
              </div>
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="overflow-hidden"
                  >
                    <p
                      className="mt-2 text-[12px] leading-relaxed whitespace-pre-wrap rounded-lg px-3 py-2"
                      style={{ color: "#9090B8", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
                    >
                      {f.body}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CommsPage() {
  const [mainTab, setMainTab] = useState<"emails" | "recruiters">("emails");
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState("All");
  const [replyText, setReplyText] = useState("");
  const [isGeneratingReply, setIsGeneratingReply] = useState(false);
  const [generateReplyError, setGenerateReplyError] = useState<string | null>(null);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Thread summarization state — keyed by email/thread id
  const [summaries, setSummaries] = useState<Record<string, ThreadSummary>>({});
  const [summarizingId, setSummarizingId] = useState<string | null>(null);
  const [expandedSummaryId, setExpandedSummaryId] = useState<string | null>(null);

  // Smart reply state
  const [showSmartReplies, setShowSmartReplies] = useState(false);
  const [smartRepliesResult, setSmartRepliesResult] = useState<SmartReplyResult | null>(null);
  const [isGeneratingSmartReplies, setIsGeneratingSmartReplies] = useState(false);
  const [smartReplyError, setSmartReplyError] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const handleEmailSync = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await apiFetch<{ data: Record<string, unknown> }>("/api/comms/email/sync", {
        method: "POST",
      });
      const inner = (res as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
      const count = (inner?.newEmails as number) || 0;
      queryClient.invalidateQueries({ queryKey: ["emailThreads"] });
      setSyncFeedback({
        type: "success",
        text: count > 0 ? `Synced ${count} new email${count > 1 ? "s" : ""}` : "Inbox is up to date",
      });
      setTimeout(() => setSyncFeedback(null), 4000);
    } catch {
      setSyncFeedback({
        type: "error",
        text: "Sync failed. Make sure Gmail is connected in Settings.",
      });
      setTimeout(() => setSyncFeedback(null), 5000);
    } finally {
      setIsSyncing(false);
    }
  };

  // Fetch email threads
  const {
    data: threadsData,
    isLoading: threadsLoading,
    isError: threadsError,
  } = useQuery({
    queryKey: ["emailThreads"],
    queryFn: () => apiFetch<{ data: Record<string, unknown> }>("/api/comms/email/threads"),
    retry: false,
  });

  // Fetch selected email
  const { data: emailData, isLoading: emailLoading } = useQuery({
    queryKey: ["email", selectedThreadId],
    queryFn: () =>
      apiFetch<{ data: Record<string, unknown> }>(`/api/comms/email/${selectedThreadId}`),
    enabled: !!selectedThreadId,
    retry: false,
  });

  // Send reply mutation
  const replyMutation = useMutation({
    mutationFn: ({ emailId, body }: { emailId: string; body: string }) =>
      apiFetch("/api/comms/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inReplyTo: emailId, body }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emailThreads"] });
      queryClient.invalidateQueries({ queryKey: ["email", selectedThreadId] });
      setReplyText("");
      setShowSmartReplies(false);
      setSmartRepliesResult(null);
    },
  });

  const threadsInner = (threadsData as Record<string, unknown>)?.data as
    | Record<string, unknown>
    | undefined;
  const threads: EmailThread[] = useMemo(
    () => (threadsInner?.threads as EmailThread[]) || [],
    [threadsInner]
  );
  const emailInner = (emailData as Record<string, unknown>)?.data as
    | Record<string, unknown>
    | undefined;
  const selectedEmail = (emailInner?.email || emailInner) as Record<string, unknown> | undefined;

  // Set first thread as selected by default
  useEffect(() => {
    if (!selectedThreadId && threads.length > 0) {
      setSelectedThreadId(threads[0].id as string);
    }
  }, [threads, selectedThreadId]);

  // Pending follow-ups
  const [approvingFollowupId, setApprovingFollowupId] = useState<string | null>(null);
  const [dismissingFollowupId, setDismissingFollowupId] = useState<string | null>(null);

  const { data: followupsData, refetch: refetchFollowups } = useQuery({
    queryKey: ["pendingFollowups"],
    queryFn: () => apiFetch<{ data: { followups: PendingFollowup[] } }>("/api/comms/email/followups"),
    retry: false,
  });

  const pendingFollowups: PendingFollowup[] =
    ((followupsData as Record<string, unknown>)?.data as Record<string, unknown>)?.followups as PendingFollowup[] || [];

  const handleApproveFollowup = async (id: string) => {
    setApprovingFollowupId(id);
    try {
      await apiFetch("/api/comms/email/followups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followupId: id }),
      });
      refetchFollowups();
    } catch {
      // silently fail — user can retry
    } finally {
      setApprovingFollowupId(null);
    }
  };

  const handleDismissFollowup = async (id: string) => {
    setDismissingFollowupId(id);
    try {
      await apiFetch("/api/comms/email/followups", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followupId: id }),
      });
      refetchFollowups();
    } catch {
      // silently fail
    } finally {
      setDismissingFollowupId(null);
    }
  };

  // Reset smart reply panel when switching emails
  useEffect(() => {
    setShowSmartReplies(false);
    setSmartRepliesResult(null);
    setSmartReplyError(null);
  }, [selectedThreadId]);

  const filters = [
    { id: "All", label: "All", count: threads.length },
    {
      id: "Unread",
      label: "Unread",
      count: threads.filter((t) => t.unread).length,
    },
    {
      id: "Interview",
      label: "Interviews",
      count: threads.filter((t) => t.category === "interview_invite").length,
    },
    {
      id: "Action",
      label: "Action Required",
      count: threads.filter((t) => t.category === "action_required").length,
    },
  ];

  const filteredThreads =
    activeFilter === "All"
      ? threads
      : activeFilter === "Unread"
      ? threads.filter((t) => t.unread)
      : threads.filter((t) =>
          activeFilter === "Interview"
            ? t.category === "interview_invite"
            : t.category === "action_required"
        );

  // ── Summarize handler ────────────────────────────────────────────────────

  const handleSummarizeThread = async (threadId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent thread selection when clicking summarize

    // Toggle off if already expanded
    if (expandedSummaryId === threadId) {
      setExpandedSummaryId(null);
      return;
    }

    // Use cached result if available
    if (summaries[threadId]) {
      setExpandedSummaryId(threadId);
      return;
    }

    setSummarizingId(threadId);
    try {
      const res = await apiFetch<{ data: ThreadSummary }>("/api/comms/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId }),
      });
      const summary = (res as Record<string, unknown>)?.data as ThreadSummary;
      setSummaries((prev) => ({ ...prev, [threadId]: summary }));
      setExpandedSummaryId(threadId);
    } catch {
      // Silently fail — don't break the thread list
    } finally {
      setSummarizingId(null);
    }
  };

  // ── Smart reply handler ───────────────────────────────────────────────────

  const handleGenerateSmartReplies = async () => {
    if (!selectedThreadId) return;
    setIsGeneratingSmartReplies(true);
    setSmartReplyError(null);
    setShowSmartReplies(false);
    try {
      const res = await apiFetch<{ data: SmartReplyResult }>("/api/comms/smart-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailId: selectedThreadId }),
      });
      const result = (res as Record<string, unknown>)?.data as SmartReplyResult;
      setSmartRepliesResult(result);
      setShowSmartReplies(true);
    } catch {
      setSmartReplyError("Failed to generate smart replies. Please try again.");
    } finally {
      setIsGeneratingSmartReplies(false);
    }
  };

  // ── Legacy single-reply handler ───────────────────────────────────────────

  const handleGenerateReply = async () => {
    if (!selectedThreadId) return;
    setIsGeneratingReply(true);
    setGenerateReplyError(null);
    try {
      const response = await apiFetch<{ data: { suggestedReply: string } }>(
        "/api/comms/email/generate-reply",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emailId: selectedThreadId }),
        }
      );
      const data = (response as Record<string, unknown>)?.data as
        | { suggestedReply: string }
        | undefined;
      setReplyText(data?.suggestedReply || "");
    } catch {
      setGenerateReplyError("Failed to generate reply. Please try again.");
    } finally {
      setIsGeneratingReply(false);
    }
  };

  const handleSendReply = () => {
    if (!selectedThreadId || !replyText.trim()) return;
    replyMutation.mutate({ emailId: selectedThreadId, body: replyText });
  };

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Tab toggle */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
        {(["emails", "recruiters"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setMainTab(tab)}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm capitalize transition-all"
            style={{
              background: mainTab === tab ? "rgba(139,92,246,0.12)" : "transparent",
              border: `1px solid ${mainTab === tab ? "rgba(139,92,246,0.25)" : "transparent"}`,
              color: mainTab === tab ? "#8B5CF6" : "#9090B8",
              fontFamily: "'Inter', sans-serif",
              cursor: "pointer",
            }}
          >
            {tab === "emails" ? <Mail size={13} /> : <Users size={13} />}
            {tab === "emails" ? "Emails" : "Recruiters"}
          </button>
        ))}
      </div>

      {mainTab === "recruiters" ? (
        <RecruiterCRM />
      ) : (
      <div className="h-[calc(100vh-175px)] flex gap-4">
      {/* Background texture */}
      <div
        className="fixed inset-0 opacity-[0.015] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* LEFT PANEL - EMAIL THREADS */}
      <div className="w-[380px] flex flex-col gap-4">
        {/* Sync Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleEmailSync}
            disabled={isSyncing}
            className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all hover:bg-white/5 disabled:opacity-50"
            style={{
              border: "1px solid rgba(255, 255, 255, 0.06)",
              fontFamily: "'Inter', sans-serif",
              fontSize: "13px",
              color: "#9090B8",
            }}
          >
            <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
            {isSyncing ? "Syncing..." : "Sync Email"}
          </button>
          {syncFeedback && (
            <span
              className="text-[12px]"
              style={{
                fontFamily: "'Inter', sans-serif",
                color: syncFeedback.type === "success" ? "#34D399" : "#F87171",
              }}
            >
              {syncFeedback.text}
            </span>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className="flex-shrink-0 px-4 py-2 rounded-lg transition-all"
              style={{
                background:
                  activeFilter === filter.id ? "rgba(124, 58, 237, 0.08)" : "transparent",
                border: `1px solid ${
                  activeFilter === filter.id
                    ? "rgba(124, 58, 237, 0.2)"
                    : "rgba(255, 255, 255, 0.06)"
                }`,
                fontFamily: "'Inter', sans-serif",
                fontSize: "13px",
                fontWeight: 500,
                color: activeFilter === filter.id ? "#8B5CF6" : "#9090B8",
              }}
            >
              {filter.label} ({filter.count})
            </button>
          ))}
        </div>

        {/* Pending Follow-ups */}
        <AnimatePresence>
          {pendingFollowups.length > 0 && (
            <PendingFollowupsPanel
              followups={pendingFollowups}
              onApprove={handleApproveFollowup}
              onDismiss={handleDismissFollowup}
              approvingId={approvingFollowupId}
              dismissingId={dismissingFollowupId}
            />
          )}
        </AnimatePresence>

        {/* Thread List */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {threadsError ? (
            <div
              className="p-4 rounded-lg"
              style={{
                background: "rgba(255, 71, 87, 0.08)",
                border: "1px solid rgba(255, 71, 87, 0.2)",
              }}
            >
              <p
                className="text-sm"
                style={{ fontFamily: "'Inter', sans-serif", color: "#F87171" }}
              >
                Failed to load messages. Please try again later.
              </p>
            </div>
          ) : threadsLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="h-20 rounded-lg animate-pulse"
                  style={{ background: "rgba(255, 255, 255, 0.03)" }}
                />
              ))}
            </div>
          ) : filteredThreads.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[#9090B8]">No messages</p>
              <p className="text-sm text-[#3A3A60] mt-2">Your inbox is empty</p>
            </div>
          ) : (
            filteredThreads.map((thread) => {
              const badge = getCategoryBadge(thread.category as string);
              const threadId = thread.id as string;
              const isSummarizing = summarizingId === threadId;
              const hasSummary = !!summaries[threadId];
              const isExpanded = expandedSummaryId === threadId;

              return (
                <div key={threadId}>
                  <motion.div
                    onClick={() => setSelectedThreadId(threadId)}
                    className="p-3 rounded-lg border cursor-pointer transition-all"
                    style={{
                      background:
                        selectedThreadId === threadId
                          ? "rgba(124, 58, 237, 0.08)"
                          : "rgba(11, 11, 20, 0.7)",
                      backdropFilter: "blur(12px)",
                      borderColor:
                        selectedThreadId === threadId
                          ? "rgba(124, 58, 237, 0.2)"
                          : "rgba(255, 255, 255, 0.04)",
                    }}
                    whileHover={{ scale: 1.005 }}
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{
                          background:
                            "linear-gradient(135deg, #8B5CF6 0%, #00B8D4 100%)",
                        }}
                      >
                        <span
                          className="text-sm font-bold"
                          style={{
                            fontFamily: "monospace, monospace",
                            color: "#050508",
                          }}
                        >
                          {(thread.from as string)?.charAt(0) || "?"}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3
                            className="text-[13px] font-semibold truncate"
                            style={{
                              fontFamily: "'Inter', sans-serif",
                              color: thread.unread ? "#F0F0FF" : "#9090B8",
                            }}
                          >
                            {(thread.from as string) ||
                              (thread.company as string) ||
                              "Unknown"}
                          </h3>
                          <span
                            className="text-[10px] flex-shrink-0 ml-2"
                            style={{
                              fontFamily: "monospace, monospace",
                              color: "#3A3A60",
                            }}
                          >
                            {(thread.receivedAt as string) ||
                              (thread.time as string) ||
                              "Recent"}
                          </span>
                        </div>
                        <p
                          className="text-[12px] mb-1 truncate"
                          style={{
                            fontFamily: "'Inter', sans-serif",
                            color: thread.unread ? "#F0F0FF" : "#9090B8",
                          }}
                        >
                          {thread.subject as string}
                        </p>
                        <div className="flex items-center gap-2">
                          {Boolean(thread.category) && (
                            <span
                              className="inline-block px-2 py-0.5 rounded text-[10px]"
                              style={{
                                background: "rgba(255, 255, 255, 0.06)",
                                color: badge.color,
                                fontFamily: "monospace, monospace",
                              }}
                            >
                              {badge.label}
                            </span>
                          )}
                          {/* Summarize button */}
                          <button
                            onClick={(e) => handleSummarizeThread(threadId, e)}
                            disabled={isSummarizing}
                            className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] transition-all hover:bg-white/5 disabled:opacity-50"
                            style={{
                              background: hasSummary
                                ? "rgba(124, 58, 237, 0.08)"
                                : "transparent",
                              border: `1px solid ${
                                hasSummary
                                  ? "rgba(124, 58, 237, 0.2)"
                                  : "rgba(255, 255, 255, 0.06)"
                              }`,
                              color: hasSummary ? "#8B5CF6" : "#3A3A60",
                              fontFamily: "'Inter', sans-serif",
                            }}
                          >
                            {isSummarizing ? (
                              <Loader2 size={10} className="animate-spin" />
                            ) : (
                              <FileText size={10} />
                            )}
                            {isSummarizing
                              ? "..."
                              : isExpanded
                              ? "Hide"
                              : "Summary"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  {/* Summary panel — expands below the thread item */}
                  <AnimatePresence>
                    {isExpanded && summaries[threadId] && (
                      <ThreadSummaryPanel
                        summary={summaries[threadId]}
                        onClose={() => setExpandedSummaryId(null)}
                      />
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT PANEL - EMAIL CONVERSATION */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedEmail ? (
          <div
            className="flex-1 flex flex-col rounded-lg border overflow-hidden"
            style={{
              background: "rgba(11, 11, 20, 0.7)",
              backdropFilter: "blur(12px)",
              borderColor: "rgba(255, 255, 255, 0.04)",
            }}
          >
            {/* Email Header */}
            <div
              className="p-6 border-b"
              style={{ borderColor: "rgba(255, 255, 255, 0.04)" }}
            >
              <h2
                className="text-xl font-bold mb-2"
                style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
              >
                {selectedEmail.subject as string}
              </h2>
              <div className="flex items-center justify-between">
                <div>
                  <p
                    className="text-[13px] mb-1"
                    style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
                  >
                    From: {selectedEmail.from as string}
                  </p>
                  <p
                    className="text-[11px]"
                    style={{ fontFamily: "monospace, monospace", color: "#3A3A60" }}
                  >
                    {(selectedEmail.receivedAt as string) || "Recently"}
                  </p>
                </div>
                {Boolean(selectedEmail.category) && (
                  <span
                    className="px-3 py-1 rounded-lg text-[11px]"
                    style={{
                      background: "rgba(255, 255, 255, 0.06)",
                      color: getCategoryBadge(selectedEmail.category as string).color,
                      fontFamily: "monospace, monospace",
                    }}
                  >
                    {getCategoryBadge(selectedEmail.category as string).label}
                  </span>
                )}
              </div>
            </div>

            {/* Email Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {emailLoading ? (
                <div className="space-y-3">
                  <div className="h-4 bg-white/5 rounded w-3/4 animate-pulse" />
                  <div className="h-4 bg-white/5 rounded w-full animate-pulse" />
                  <div className="h-4 bg-white/5 rounded w-5/6 animate-pulse" />
                </div>
              ) : (
                <div
                  className="prose prose-invert max-w-none"
                  style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">
                    {(selectedEmail.body as string) ||
                      (selectedEmail.textBody as string) ||
                      "No content available"}
                  </p>
                </div>
              )}

              {/* AI Analysis */}
              {Boolean(selectedEmail.analysis) && (
                <div
                  className="mt-6 p-4 rounded-lg"
                  style={{
                    background: "rgba(124, 58, 237, 0.05)",
                    border: "1px solid rgba(124, 58, 237, 0.15)",
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={16} className="text-[#8B5CF6]" />
                    <span
                      className="text-sm font-semibold"
                      style={{ fontFamily: "'Inter', sans-serif", color: "#8B5CF6" }}
                    >
                      AI Insights
                    </span>
                  </div>
                  <p
                    className="text-sm"
                    style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
                  >
                    {(selectedEmail.analysis as Record<string, unknown>).summary as string ||
                      ((selectedEmail.analysis as Record<string, unknown>).actionItems as string[])?.[0] ||
                      "No insights available"}
                  </p>
                </div>
              )}
            </div>

            {/* Reply Section */}
            <div
              className="p-6 border-t"
              style={{ borderColor: "rgba(255, 255, 255, 0.04)" }}
            >
              <div className="flex items-center justify-between mb-3">
                <span
                  className="text-sm font-semibold"
                  style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
                >
                  Reply
                </span>
                <div className="flex items-center gap-2">
                  {/* Smart Replies button */}
                  <button
                    onClick={handleGenerateSmartReplies}
                    disabled={isGeneratingSmartReplies}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all hover:bg-white/5 disabled:opacity-50"
                    style={{
                      background: showSmartReplies
                        ? "rgba(124, 58, 237, 0.15)"
                        : "rgba(124, 58, 237, 0.08)",
                      border: `1px solid ${
                        showSmartReplies
                          ? "rgba(124, 58, 237, 0.35)"
                          : "rgba(124, 58, 237, 0.2)"
                      }`,
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "12px",
                      color: "#8B5CF6",
                    }}
                  >
                    {isGeneratingSmartReplies ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Sparkles size={14} />
                    )}
                    {isGeneratingSmartReplies
                      ? "Generating..."
                      : showSmartReplies
                      ? "Smart Replies"
                      : "Smart Replies"}
                    {showSmartReplies ? (
                      <ChevronUp size={12} />
                    ) : (
                      <ChevronDown size={12} />
                    )}
                  </button>
                  {/* Legacy single-reply button */}
                  <button
                    onClick={handleGenerateReply}
                    disabled={isGeneratingReply}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all hover:bg-white/5 disabled:opacity-50"
                    style={{
                      background: "rgba(255, 255, 255, 0.03)",
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "12px",
                      color: "#9090B8",
                    }}
                  >
                    <Sparkles size={14} />
                    {isGeneratingReply ? "Generating..." : "AI Draft"}
                  </button>
                </div>
              </div>

              {/* Smart reply error */}
              {smartReplyError && (
                <div
                  className="p-3 rounded-lg mb-3"
                  style={{
                    background: "rgba(255, 71, 87, 0.08)",
                    border: "1px solid rgba(255, 71, 87, 0.2)",
                  }}
                >
                  <p
                    className="text-sm"
                    style={{ fontFamily: "'Inter', sans-serif", color: "#F87171" }}
                  >
                    {smartReplyError}
                  </p>
                </div>
              )}

              {/* Smart reply options */}
              <AnimatePresence>
                {showSmartReplies && smartRepliesResult && (
                  <SmartReplyPanel
                    result={smartRepliesResult}
                    onSelectReply={(body) => {
                      setReplyText(body);
                      setShowSmartReplies(false);
                    }}
                    onClose={() => setShowSmartReplies(false)}
                  />
                )}
              </AnimatePresence>

              {/* Single-reply error */}
              {generateReplyError && (
                <div
                  className="p-3 rounded-lg mb-3"
                  style={{
                    background: "rgba(255, 71, 87, 0.08)",
                    border: "1px solid rgba(255, 71, 87, 0.2)",
                  }}
                >
                  <p
                    className="text-sm"
                    style={{ fontFamily: "'Inter', sans-serif", color: "#F87171" }}
                  >
                    {generateReplyError}
                  </p>
                </div>
              )}

              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your reply or use Smart Replies above..."
                rows={4}
                className="w-full px-4 py-3 rounded-lg border bg-transparent outline-none resize-none mb-3"
                style={{
                  borderColor: "rgba(255, 255, 255, 0.08)",
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "14px",
                  color: "#F0F0FF",
                }}
              />

              {replyMutation.isError && (
                <div
                  className="p-3 rounded-lg mb-3"
                  style={{
                    background: "rgba(255, 71, 87, 0.08)",
                    border: "1px solid rgba(255, 71, 87, 0.2)",
                  }}
                >
                  <p
                    className="text-sm"
                    style={{ fontFamily: "'Inter', sans-serif", color: "#F87171" }}
                  >
                    Failed to send reply. Please try again.
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleSendReply}
                  disabled={replyMutation.isPending || !replyText.trim()}
                  className="flex-1 px-4 py-2.5 rounded-lg font-semibold transition-all disabled:opacity-50"
                  style={{
                    background: "#8B5CF6",
                    color: "#050508",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  <Send size={16} className="inline mr-2" />
                  {replyMutation.isPending ? "Sending..." : "Send Reply"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[#9090B8]">
            Select a message to view conversation
          </div>
        )}
      </div>
      </div>
      )}
    </div>
  );
}

// ─── Recruiter CRM ────────────────────────────────────────────────────────────

interface RecruiterContact {
  id: string;
  name: string;
  company: string;
  email: string;
  phone?: string;
  linkedInUrl?: string;
  role?: string;
  conversionStatus: "cold" | "warm" | "active" | "placed" | "ghosted";
  emailCount: number;
  lastContactAt?: string;
  responseTimeHours?: number;
  notes?: string;
  linkedJobIds: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  cold: "#9090B8",
  warm: "#FBBF24",
  active: "#34D399",
  placed: "#8B5CF6",
  ghosted: "#F87171",
};

function RecruiterCRM() {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", company: "", email: "", role: "", notes: "" });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ recruiters: RecruiterContact[] }>({
    queryKey: ["recruiters"],
    queryFn: () => apiFetch<{ success: boolean; data: { recruiters: RecruiterContact[] } }>("/api/comms/recruiters").then((r) => r.data),
  });

  const addMutation = useMutation({
    mutationFn: (body: Record<string, string>) =>
      apiFetch("/api/comms/recruiters", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruiters"] });
      setShowAdd(false);
      setForm({ name: "", company: "", email: "", role: "", notes: "" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/comms/recruiters?id=${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruiters"] });
      setSelectedId(null);
    },
  });

  const recruiters = data?.recruiters ?? [];
  const selected = recruiters.find((r) => r.id === selectedId) ?? null;

  return (
    <div className="flex gap-4 h-[calc(100vh-175px)]">
      {/* Left: recruiter list */}
      <div className="w-[340px] flex flex-col gap-3 overflow-y-auto pr-1">
        <div className="flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <UserCheck size={16} color="#8B5CF6" />
            <span className="text-sm font-semibold" style={{ color: "#F0F0FF", fontFamily: "'Inter', sans-serif" }}>
              Recruiter CRM
            </span>
          </div>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all"
            style={{
              background: "rgba(139,92,246,0.12)",
              border: "1px solid rgba(139,92,246,0.25)",
              color: "#8B5CF6",
              cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            <Plus size={11} />
            Add
          </button>
        </div>

        {showAdd && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl space-y-3 flex-shrink-0"
            style={{ background: "#111120", border: "1px solid rgba(139,92,246,0.25)" }}
          >
            {[
              { key: "name", placeholder: "Name *", required: true },
              { key: "company", placeholder: "Company *", required: true },
              { key: "email", placeholder: "Email", required: false },
              { key: "role", placeholder: "Their role", required: false },
              { key: "notes", placeholder: "Notes", required: false },
            ].map(({ key, placeholder }) => (
              <input
                key={key}
                value={form[key as keyof typeof form]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                className="w-full px-3 py-2 rounded-lg text-xs"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  color: "#F0F0FF",
                  fontFamily: "'Inter', sans-serif",
                  outline: "none",
                }}
              />
            ))}
            <div className="flex gap-2">
              <button
                onClick={() => { if (form.name && form.company) addMutation.mutate(form); }}
                disabled={!form.name || !form.company || addMutation.isPending}
                className="flex-1 py-1.5 rounded-lg text-xs font-medium"
                style={{
                  background: "rgba(139,92,246,0.12)",
                  border: "1px solid rgba(139,92,246,0.25)",
                  color: "#8B5CF6",
                  cursor: "pointer",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                {addMutation.isPending ? "Saving…" : "Save"}
              </button>
              <button
                onClick={() => setShowAdd(false)}
                className="px-3 py-1.5 rounded-lg text-xs"
                style={{ background: "none", border: "1px solid rgba(255,255,255,0.06)", color: "#9090B8", cursor: "pointer", fontFamily: "'Inter', sans-serif" }}
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl" style={{ background: "#111120", border: "1px solid rgba(255,255,255,0.06)" }} />)}
          </div>
        ) : recruiters.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.25)" }}>
              <Users size={18} color="#8B5CF6" />
            </div>
            <p className="text-sm" style={{ color: "#9090B8", fontFamily: "'Inter', sans-serif" }}>No recruiters tracked yet</p>
            <p className="text-xs" style={{ color: "#3A3A60", fontFamily: "'Inter', sans-serif" }}>Add recruiters to track your network</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recruiters.map((r) => (
              <motion.button
                key={r.id}
                layout
                onClick={() => setSelectedId(selectedId === r.id ? null : r.id)}
                className="w-full text-left p-3 rounded-xl transition-all"
                style={{
                  background: selectedId === r.id ? "rgba(139,92,246,0.08)" : "#111120",
                  border: `1px solid ${selectedId === r.id ? "rgba(139,92,246,0.25)" : "rgba(255,255,255,0.06)"}`,
                }}
                whileHover={{ borderColor: "rgba(139,92,246,0.20)" }}
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold" style={{ background: "rgba(139,92,246,0.12)", color: "#8B5CF6", fontFamily: "'Inter', sans-serif" }}>
                    {r.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold truncate" style={{ color: "#F0F0FF", fontFamily: "'Inter', sans-serif" }}>{r.name}</span>
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full capitalize flex-shrink-0"
                        style={{
                          background: `${STATUS_COLORS[r.conversionStatus]}18`,
                          color: STATUS_COLORS[r.conversionStatus],
                          border: `1px solid ${STATUS_COLORS[r.conversionStatus]}30`,
                          fontFamily: "'Inter', sans-serif",
                        }}
                      >
                        {r.conversionStatus}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Building2 size={10} color="#3A3A60" />
                      <span className="text-[11px] truncate" style={{ color: "#9090B8", fontFamily: "'Inter', sans-serif" }}>{r.company}</span>
                    </div>
                    {r.lastContactAt && (
                      <span className="text-[10px]" style={{ color: "#3A3A60", fontFamily: "'Inter', sans-serif" }}>
                        Last contact: {new Date(r.lastContactAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* Right: detail panel */}
      <div className="flex-1 overflow-y-auto">
        {selected ? (
          <motion.div
            key={selected.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-xl space-y-5"
            style={{ background: "#111120", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold" style={{ color: "#F0F0FF", fontFamily: "'Inter', sans-serif" }}>{selected.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <Building2 size={12} color="#9090B8" />
                  <span className="text-sm" style={{ color: "#9090B8", fontFamily: "'Inter', sans-serif" }}>{selected.company}</span>
                  {selected.role && <span className="text-xs" style={{ color: "#3A3A60", fontFamily: "'Inter', sans-serif" }}>· {selected.role}</span>}
                </div>
              </div>
              <button
                onClick={() => deleteMutation.mutate(selected.id)}
                className="p-1.5 rounded-lg"
                style={{ background: "none", border: "none", cursor: "pointer", color: "#3A3A60" }}
              >
                <Trash2 size={14} />
              </button>
            </div>

            {/* Contact info */}
            <div className="grid grid-cols-2 gap-3">
              {selected.email && (
                <div className="flex items-center gap-2 p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <Mail size={13} color="#9090B8" />
                  <span className="text-xs truncate" style={{ color: "#9090B8", fontFamily: "'Inter', sans-serif" }}>{selected.email}</span>
                </div>
              )}
              {selected.linkedInUrl && (
                <a href={selected.linkedInUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-3 rounded-lg" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", textDecoration: "none" }}>
                  <ExternalLink size={13} color="#9090B8" />
                  <span className="text-xs" style={{ color: "#9090B8", fontFamily: "'Inter', sans-serif" }}>LinkedIn</span>
                </a>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg text-center" style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.15)" }}>
                <p className="text-lg font-bold" style={{ color: "#8B5CF6", fontFamily: "'Inter', sans-serif" }}>{selected.emailCount}</p>
                <p className="text-[10px]" style={{ color: "#9090B8", fontFamily: "'Inter', sans-serif" }}>Emails</p>
              </div>
              <div className="p-3 rounded-lg text-center" style={{ background: "rgba(96,165,250,0.06)", border: "1px solid rgba(96,165,250,0.15)" }}>
                <p className="text-lg font-bold" style={{ color: "#60A5FA", fontFamily: "'Inter', sans-serif" }}>{selected.linkedJobIds.length}</p>
                <p className="text-[10px]" style={{ color: "#9090B8", fontFamily: "'Inter', sans-serif" }}>Jobs</p>
              </div>
              <div className="p-3 rounded-lg text-center" style={{ background: `${STATUS_COLORS[selected.conversionStatus]}0A`, border: `1px solid ${STATUS_COLORS[selected.conversionStatus]}25` }}>
                <p className="text-sm font-bold capitalize" style={{ color: STATUS_COLORS[selected.conversionStatus], fontFamily: "'Inter', sans-serif" }}>{selected.conversionStatus}</p>
                <p className="text-[10px]" style={{ color: "#9090B8", fontFamily: "'Inter', sans-serif" }}>Status</p>
              </div>
            </div>

            {selected.notes && (
              <div className="p-4 rounded-lg" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: "#3A3A60", fontFamily: "'Inter', sans-serif" }}>Notes</p>
                <p className="text-sm leading-relaxed" style={{ color: "#9090B8", fontFamily: "'Inter', sans-serif" }}>{selected.notes}</p>
              </div>
            )}

            {selected.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selected.tags.map((tag) => (
                  <span key={tag} className="text-[11px] px-2.5 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.04)", color: "#9090B8", border: "1px solid rgba(255,255,255,0.06)", fontFamily: "'Inter', sans-serif" }}>{tag}</span>
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          <div className="h-full flex items-center justify-center" style={{ color: "#3A3A60", fontFamily: "'Inter', sans-serif", fontSize: 13 }}>
            Select a recruiter to view details
          </div>
        )}
      </div>
    </div>
  );
}
