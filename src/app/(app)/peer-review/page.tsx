"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Star,
  ChevronDown,
  ChevronUp,
  Send,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  MessageSquare,
  Eye,
  BarChart2,
  Loader2,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FeedbackItem {
  section: string;
  comment: string;
  type: "praise" | "suggestion" | "critical";
}

interface PeerReview {
  id: string;
  reviewerHash: string;
  overall: number;
  feedback: FeedbackItem[];
  summary: string;
  wouldHireRating: number;
  submittedAt: string;
}

interface AIReviewSection {
  name: string;
  score: number;
  feedback: string;
}

interface AIReview {
  overall_score: number;
  sections: AIReviewSection[];
  top_strengths: string[];
  critical_improvements: string[];
  ats_compatibility: string;
  first_impression: string;
}

interface MySubmission {
  id: string;
  role: string;
  industry: string;
  yearsExp: number;
  submittedAt: string;
  reviewsReceived: PeerReview[];
  aiReview?: AIReview;
  status: "pending" | "reviewed" | "archived";
}

interface PoolSubmission {
  id: string;
  role: string;
  industry: string;
  yearsExp: number;
  cvText: string;
  submittedAt: string;
  reviewCount: number;
}

const CV_SECTIONS = ["Summary", "Experience", "Skills", "Education", "Format"];

const FEEDBACK_TYPE_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  praise:     { bg: "rgba(52,211,153,0.1)",  color: "#34D399", label: "Praise" },
  suggestion: { bg: "rgba(139,92,246,0.1)",  color: "#8B5CF6", label: "Suggestion" },
  critical:   { bg: "rgba(248,113,113,0.1)", color: "#F87171", label: "Critical" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, ease: "easeOut" as const, delay },
});

function StarRating({
  value,
  onChange,
  readonly = false,
  size = 18,
}: {
  value: number;
  onChange?: (v: number) => void;
  readonly?: boolean;
  size?: number;
}) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(n)}
          className={readonly ? "cursor-default" : "cursor-pointer hover:scale-110 transition-transform"}
        >
          <Star
            size={size}
            fill={n <= value ? "#FBBF24" : "transparent"}
            style={{ color: n <= value ? "#FBBF24" : "#3A3A60" }}
          />
        </button>
      ))}
    </div>
  );
}

function ScoreBar({ score, color = "#8B5CF6" }: { score: number; color?: string }) {
  return (
    <div className="relative h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
      <motion.div
        className="absolute left-0 top-0 h-full rounded-full"
        style={{ background: color }}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(score, 100)}%` }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      />
    </div>
  );
}

// ─── Submit Form ──────────────────────────────────────────────────────────────

interface SubmitResponse {
  data: {
    submission: MySubmission;
    aiReview: AIReview | null;
  };
}

function SubmitForm({ onSuccess }: { onSuccess: () => void }) {
  const [role, setRole] = useState("");
  const [industry, setIndustry] = useState("");
  const [yearsExp, setYearsExp] = useState(0);
  const [cvText, setCvText] = useState("");
  const [lastResult, setLastResult] = useState<AIReview | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch<SubmitResponse>("/api/peer-review", {
        method: "POST",
        body: JSON.stringify({ action: "submit", role, industry, yearsExp, cvText }),
      }),
    onSuccess: (res) => {
      setLastResult(res.data?.aiReview ?? null);
      onSuccess();
    },
  });

  const inputStyle = {
    background: "#111120",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 10,
    color: "#F0F0FF",
    padding: "10px 14px",
    fontSize: 14,
    width: "100%",
    outline: "none",
  } as React.CSSProperties;

  return (
    <div className="space-y-6">
      <div
        className="rounded-[14px] p-5 space-y-4"
        style={{ background: "#0C0C14", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div className="text-[13px] font-semibold" style={{ color: "#9090B8" }}>
          SUBMIT YOUR CV FOR ANONYMOUS PEER REVIEW
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <label className="text-[12px]" style={{ color: "#9090B8" }}>Role applying for</label>
            <input
              style={inputStyle}
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Senior Software Engineer"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[12px]" style={{ color: "#9090B8" }}>Industry</label>
            <input
              style={inputStyle}
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="e.g. Fintech"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[12px]" style={{ color: "#9090B8" }}>Years of experience</label>
            <input
              style={inputStyle}
              type="number"
              min={0}
              max={50}
              value={yearsExp}
              onChange={(e) => setYearsExp(parseInt(e.target.value, 10) || 0)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[12px]" style={{ color: "#9090B8" }}>
            CV Text{" "}
            <span style={{ color: "#3A3A60" }}>
              — Remove your name, email, phone, and address before pasting
            </span>
          </label>
          <textarea
            style={{ ...inputStyle, minHeight: 180, resize: "vertical" }}
            value={cvText}
            onChange={(e) => setCvText(e.target.value)}
            placeholder="Paste your anonymized CV here..."
          />
          <div className="text-right text-[11px]" style={{ color: "#3A3A60" }}>
            {cvText.length} / 8000 chars
          </div>
        </div>

        {mutation.isError && (
          <div
            className="flex items-center gap-2 rounded-[10px] px-4 py-3 text-[13px]"
            style={{ background: "rgba(248,113,113,0.1)", color: "#F87171", border: "1px solid rgba(248,113,113,0.2)" }}
          >
            <AlertCircle size={15} />
            {mutation.error instanceof Error ? mutation.error.message : "Submission failed"}
          </div>
        )}

        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !role || !industry || cvText.length < 100}
          className="flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-[13px] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: "linear-gradient(135deg,#7C3AED,#8B5CF6)", color: "#fff" }}
        >
          {mutation.isPending ? (
            <><Loader2 size={15} className="animate-spin" /> Running AI Review + Submitting...</>
          ) : (
            <><Send size={15} /> Submit for Review</>
          )}
        </button>
      </div>

      {/* AI Review Result */}
      {mutation.isSuccess && lastResult && (
        <motion.div
          {...fadeUp(0.1)}
          className="rounded-[14px] p-5 space-y-4"
          style={{ background: "#0C0C14", border: "1px solid rgba(124,58,237,0.3)" }}
        >
          <div className="flex items-center gap-2">
            <Sparkles size={16} style={{ color: "#8B5CF6" }} />
            <span className="text-[14px] font-semibold" style={{ color: "#F0F0FF" }}>
              Instant AI Review
            </span>
            <div
              className="ml-auto text-[22px] font-bold"
              style={{ color: lastResult.overall_score >= 70 ? "#34D399" : lastResult.overall_score >= 50 ? "#FBBF24" : "#F87171" }}
            >
              {lastResult.overall_score}
              <span className="text-[13px] font-normal" style={{ color: "#9090B8" }}>/100</span>
            </div>
          </div>

          <p className="text-[13px] italic" style={{ color: "#9090B8" }}>
            &ldquo;{lastResult.first_impression}&rdquo;
          </p>

          <div className="space-y-3">
            {lastResult.sections.map((sec) => (
              <div key={sec.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[12px] font-medium" style={{ color: "#9090B8" }}>{sec.name}</span>
                  <span className="text-[12px] font-semibold" style={{ color: "#8B5CF6" }}>{sec.score}</span>
                </div>
                <ScoreBar score={sec.score} />
                <p className="mt-1 text-[12px]" style={{ color: "#3A3A60" }}>{sec.feedback}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="text-[11px] font-semibold mb-2" style={{ color: "#34D399" }}>TOP STRENGTHS</div>
              <ul className="space-y-1">
                {lastResult.top_strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-[12px]" style={{ color: "#9090B8" }}>
                    <CheckCircle2 size={12} className="mt-0.5 flex-shrink-0" style={{ color: "#34D399" }} />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-[11px] font-semibold mb-2" style={{ color: "#F87171" }}>CRITICAL IMPROVEMENTS</div>
              <ul className="space-y-1">
                {lastResult.critical_improvements.map((s, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-[12px]" style={{ color: "#9090B8" }}>
                    <AlertCircle size={12} className="mt-0.5 flex-shrink-0" style={{ color: "#F87171" }} />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div
            className="flex items-center gap-2 rounded-[8px] px-3 py-2 text-[12px]"
            style={{ background: "rgba(96,165,250,0.1)", color: "#60A5FA", border: "1px solid rgba(96,165,250,0.2)" }}
          >
            <BarChart2 size={13} />
            ATS: {lastResult.ats_compatibility}
          </div>
        </motion.div>
      )}

      {mutation.isSuccess && !lastResult && (
        <div
          className="flex items-center gap-2 rounded-[10px] px-4 py-3 text-[13px]"
          style={{ background: "rgba(52,211,153,0.1)", color: "#34D399", border: "1px solid rgba(52,211,153,0.2)" }}
        >
          <CheckCircle2 size={15} /> CV submitted! Peer reviews will appear here once received.
        </div>
      )}
    </div>
  );
}

// ─── My Submissions ───────────────────────────────────────────────────────────

function MySubmissions() {
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["peer-review-my"],
    queryFn: () => apiFetch<{ data: { submissions: MySubmission[] } }>("/api/peer-review?action=my-submissions"),
  });

  const submissions: MySubmission[] = data?.data?.submissions ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={22} className="animate-spin" style={{ color: "#8B5CF6" }} />
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div
        className="rounded-[14px] p-8 text-center"
        style={{ background: "#0C0C14", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        <Eye size={28} className="mx-auto mb-3" style={{ color: "#3A3A60" }} />
        <div className="text-[14px]" style={{ color: "#9090B8" }}>No submissions yet</div>
        <div className="text-[12px] mt-1" style={{ color: "#3A3A60" }}>Submit your CV above to get started</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {submissions.map((sub) => {
        const avgRating =
          sub.reviewsReceived.length > 0
            ? sub.reviewsReceived.reduce((a, r) => a + r.overall, 0) / sub.reviewsReceived.length
            : 0;
        const isOpen = expanded === sub.id;

        return (
          <motion.div
            key={sub.id}
            {...fadeUp(0)}
            className="rounded-[14px] overflow-hidden"
            style={{ background: "#0C0C14", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <button
              className="w-full flex items-center gap-4 p-4 text-left"
              onClick={() => setExpanded(isOpen ? null : sub.id)}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[14px] font-semibold" style={{ color: "#F0F0FF" }}>{sub.role}</span>
                  <span
                    className="text-[11px] px-2 py-0.5 rounded-full"
                    style={{
                      background: sub.status === "reviewed" ? "rgba(52,211,153,0.1)" : "rgba(251,191,36,0.1)",
                      color: sub.status === "reviewed" ? "#34D399" : "#FBBF24",
                    }}
                  >
                    {sub.status}
                  </span>
                </div>
                <div className="text-[12px] mt-0.5" style={{ color: "#9090B8" }}>
                  {sub.industry} · {sub.yearsExp}y exp · Submitted {new Date(sub.submittedAt).toLocaleDateString()}
                </div>
              </div>

              <div className="flex items-center gap-4 flex-shrink-0">
                <div className="text-center">
                  <div className="text-[18px] font-bold" style={{ color: "#8B5CF6" }}>{sub.reviewsReceived.length}</div>
                  <div className="text-[10px]" style={{ color: "#3A3A60" }}>reviews</div>
                </div>
                {avgRating > 0 && (
                  <div className="text-center">
                    <div className="flex items-center gap-1">
                      <Star size={13} fill="#FBBF24" style={{ color: "#FBBF24" }} />
                      <span className="text-[14px] font-semibold" style={{ color: "#F0F0FF" }}>
                        {avgRating.toFixed(1)}
                      </span>
                    </div>
                    <div className="text-[10px]" style={{ color: "#3A3A60" }}>avg</div>
                  </div>
                )}
                {isOpen ? <ChevronUp size={16} style={{ color: "#9090B8" }} /> : <ChevronDown size={16} style={{ color: "#9090B8" }} />}
              </div>
            </button>

            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div
                    className="px-4 pb-4 space-y-4"
                    style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
                  >
                    {/* AI Review Summary */}
                    {sub.aiReview && (
                      <div className="mt-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <Sparkles size={13} style={{ color: "#8B5CF6" }} />
                          <span className="text-[12px] font-semibold" style={{ color: "#8B5CF6" }}>
                            AI Score: {sub.aiReview.overall_score}/100
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                          {sub.aiReview.sections.map((sec) => (
                            <div key={sec.name} className="text-center">
                              <div className="text-[11px]" style={{ color: "#9090B8" }}>{sec.name}</div>
                              <div className="text-[16px] font-bold" style={{ color: "#8B5CF6" }}>{sec.score}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Peer Reviews */}
                    {sub.reviewsReceived.length === 0 ? (
                      <div className="py-4 text-center text-[13px]" style={{ color: "#3A3A60" }}>
                        No peer reviews yet. Give reviews to unlock yours!
                      </div>
                    ) : (
                      <div className="space-y-4 mt-2">
                        {sub.reviewsReceived.map((review) => (
                          <div
                            key={review.id}
                            className="rounded-[10px] p-4 space-y-3"
                            style={{ background: "#111120", border: "1px solid rgba(255,255,255,0.05)" }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <StarRating value={review.overall} readonly size={14} />
                                <span className="text-[11px]" style={{ color: "#3A3A60" }}>
                                  Overall
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[11px]" style={{ color: "#9090B8" }}>Would hire:</span>
                                <StarRating value={review.wouldHireRating} readonly size={13} />
                              </div>
                            </div>

                            <p className="text-[13px]" style={{ color: "#F0F0FF" }}>{review.summary}</p>

                            <div className="space-y-2">
                              {review.feedback.map((fb, i) => {
                                const cfg = FEEDBACK_TYPE_COLORS[fb.type];
                                return (
                                  <div
                                    key={i}
                                    className="flex gap-2 rounded-[8px] p-2.5"
                                    style={{ background: cfg.bg }}
                                  >
                                    <span
                                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 self-start"
                                      style={{ color: cfg.color, background: `${cfg.color}20` }}
                                    >
                                      {fb.section}
                                    </span>
                                    <span className="text-[12px]" style={{ color: "#F0F0FF" }}>{fb.comment}</span>
                                  </div>
                                );
                              })}
                            </div>

                            <div className="text-[11px]" style={{ color: "#3A3A60" }}>
                              {new Date(review.submittedAt).toLocaleDateString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── Give Reviews Tab ─────────────────────────────────────────────────────────

interface SectionFeedback {
  section: string;
  comment: string;
  type: "praise" | "suggestion" | "critical";
}

interface ReviewDraft {
  overall: number;
  wouldHireRating: number;
  summary: string;
  feedback: SectionFeedback[];
}

interface GiveReviewResponse {
  data: {
    review: PeerReview;
    reviewsGivenCount: number;
  };
}

function GiveReviewsTab() {
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["peer-review-pool"],
    queryFn: () => apiFetch<{ data: { submissions: PoolSubmission[] } }>("/api/peer-review?action=pool"),
  });

  const pool: PoolSubmission[] = data?.data?.submissions ?? [];

  const [drafts, setDrafts] = useState<Record<string, ReviewDraft>>({});
  const [submitted, setSubmitted] = useState<Set<string>>(new Set());
  const [reviewsGiven, setReviewsGiven] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (submissionId: string) => {
      const draft = drafts[submissionId];
      return apiFetch<GiveReviewResponse>("/api/peer-review", {
        method: "POST",
        body: JSON.stringify({
          action: "give-review",
          submissionId,
          overall: draft.overall,
          wouldHireRating: draft.wouldHireRating,
          summary: draft.summary,
          feedback: draft.feedback.filter((f) => f.comment.trim().length >= 50),
        }),
      });
    },
    onSuccess: (res, submissionId) => {
      setSubmitted((prev) => new Set(prev).add(submissionId));
      setReviewsGiven(res.data?.reviewsGivenCount ?? reviewsGiven + 1);
      queryClient.invalidateQueries({ queryKey: ["peer-review-pool"] });
      setTimeout(() => refetch(), 500);
    },
  });

  function getDraft(id: string): ReviewDraft {
    return (
      drafts[id] ?? {
        overall: 0,
        wouldHireRating: 0,
        summary: "",
        feedback: CV_SECTIONS.map((s) => ({ section: s, comment: "", type: "suggestion" as const })),
      }
    );
  }

  function updateDraft(id: string, updater: (d: ReviewDraft) => ReviewDraft) {
    setDrafts((prev) => ({ ...prev, [id]: updater(getDraft(id)) }));
  }

  function updateFeedback(subId: string, sectionIdx: number, field: keyof SectionFeedback, value: string) {
    updateDraft(subId, (d) => {
      const feedback = [...d.feedback];
      feedback[sectionIdx] = { ...feedback[sectionIdx], [field]: value };
      return { ...d, feedback };
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={22} className="animate-spin" style={{ color: "#8B5CF6" }} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviewsGiven > 0 && (
        <div
          className="flex items-center gap-2 rounded-[10px] px-4 py-3 text-[13px]"
          style={{ background: "rgba(52,211,153,0.1)", color: "#34D399", border: "1px solid rgba(52,211,153,0.2)" }}
        >
          <CheckCircle2 size={15} />
          Reviews you&apos;ve given: <strong>{reviewsGiven}</strong>
        </div>
      )}

      {pool.length === 0 ? (
        <div
          className="rounded-[14px] p-8 text-center"
          style={{ background: "#0C0C14", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <MessageSquare size={28} className="mx-auto mb-3" style={{ color: "#3A3A60" }} />
          <div className="text-[14px]" style={{ color: "#9090B8" }}>No CVs available to review</div>
          <div className="text-[12px] mt-1" style={{ color: "#3A3A60" }}>Check back soon as more people submit</div>
        </div>
      ) : (
        pool.map((sub, idx) => {
          const draft = getDraft(sub.id);
          const isOpen = expanded === sub.id;
          const isSubmitted = submitted.has(sub.id);

          return (
            <motion.div
              key={sub.id}
              {...fadeUp(idx * 0.05)}
              className="rounded-[14px] overflow-hidden"
              style={{ background: "#0C0C14", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <button
                className="w-full flex items-center gap-4 p-4 text-left"
                onClick={() => setExpanded(isOpen ? null : sub.id)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[14px] font-semibold" style={{ color: "#F0F0FF" }}>{sub.role}</span>
                    <span className="text-[12px]" style={{ color: "#9090B8" }}>· {sub.industry}</span>
                    <span className="text-[11px]" style={{ color: "#3A3A60" }}>{sub.yearsExp}y exp</span>
                  </div>
                  <div className="text-[12px] mt-0.5" style={{ color: "#3A3A60" }}>
                    {sub.reviewCount} reviews received
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {isSubmitted && (
                    <span
                      className="text-[11px] px-2 py-0.5 rounded-full font-semibold"
                      style={{ background: "rgba(52,211,153,0.1)", color: "#34D399" }}
                    >
                      Reviewed
                    </span>
                  )}
                  {isOpen ? <ChevronUp size={16} style={{ color: "#9090B8" }} /> : <ChevronDown size={16} style={{ color: "#9090B8" }} />}
                </div>
              </button>

              <AnimatePresence>
                {isOpen && !isSubmitted && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div
                      className="px-4 pb-4 space-y-5"
                      style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
                    >
                      {/* CV Text */}
                      <div className="mt-4">
                        <div className="text-[12px] font-semibold mb-2" style={{ color: "#9090B8" }}>CV CONTENT</div>
                        <div
                          className="rounded-[10px] p-4 text-[12px] max-h-56 overflow-y-auto whitespace-pre-wrap"
                          style={{
                            background: "#111120",
                            border: "1px solid rgba(255,255,255,0.05)",
                            color: "#9090B8",
                            lineHeight: 1.6,
                          }}
                        >
                          {sub.cvText}
                        </div>
                      </div>

                      {/* Overall Ratings */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <div className="text-[12px] mb-2" style={{ color: "#9090B8" }}>Overall Rating</div>
                          <StarRating value={draft.overall} onChange={(v) => updateDraft(sub.id, (d) => ({ ...d, overall: v }))} />
                        </div>
                        <div>
                          <div className="text-[12px] mb-2" style={{ color: "#9090B8" }}>Would Hire Rating</div>
                          <StarRating
                            value={draft.wouldHireRating}
                            onChange={(v) => updateDraft(sub.id, (d) => ({ ...d, wouldHireRating: v }))}
                          />
                        </div>
                      </div>

                      {/* Section Feedback */}
                      <div className="space-y-3">
                        <div className="text-[12px] font-semibold" style={{ color: "#9090B8" }}>
                          SECTION-BY-SECTION FEEDBACK <span style={{ color: "#3A3A60" }}>(min 50 chars each)</span>
                        </div>
                        {CV_SECTIONS.map((section, sIdx) => {
                          const fb = draft.feedback[sIdx] ?? { section, comment: "", type: "suggestion" };
                          return (
                            <div key={section} className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[12px] font-medium" style={{ color: "#F0F0FF" }}>{section}</span>
                                <select
                                  value={fb.type}
                                  onChange={(e) => updateFeedback(sub.id, sIdx, "type", e.target.value)}
                                  className="text-[11px] px-2 py-0.5 rounded-[6px] outline-none"
                                  style={{
                                    background: "#111120",
                                    border: "1px solid rgba(255,255,255,0.08)",
                                    color: FEEDBACK_TYPE_COLORS[fb.type]?.color ?? "#9090B8",
                                  }}
                                >
                                  <option value="praise">Praise</option>
                                  <option value="suggestion">Suggestion</option>
                                  <option value="critical">Critical</option>
                                </select>
                              </div>
                              <textarea
                                rows={2}
                                placeholder={`Comment on the ${section} section...`}
                                value={fb.comment}
                                onChange={(e) => updateFeedback(sub.id, sIdx, "comment", e.target.value)}
                                style={{
                                  width: "100%",
                                  background: "#111120",
                                  border: "1px solid rgba(255,255,255,0.08)",
                                  borderRadius: 8,
                                  color: "#F0F0FF",
                                  padding: "8px 12px",
                                  fontSize: 13,
                                  outline: "none",
                                  resize: "vertical",
                                }}
                              />
                              <div className="text-right text-[10px]" style={{ color: fb.comment.length < 50 ? "#F87171" : "#3A3A60" }}>
                                {fb.comment.length} chars
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Summary */}
                      <div className="space-y-1.5">
                        <label className="text-[12px] font-semibold" style={{ color: "#9090B8" }}>
                          OVERALL SUMMARY <span style={{ color: "#3A3A60" }}>(min 50 chars)</span>
                        </label>
                        <textarea
                          rows={3}
                          placeholder="Summarize your overall impression and top recommendation..."
                          value={draft.summary}
                          onChange={(e) => updateDraft(sub.id, (d) => ({ ...d, summary: e.target.value }))}
                          style={{
                            width: "100%",
                            background: "#111120",
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: 8,
                            color: "#F0F0FF",
                            padding: "10px 14px",
                            fontSize: 13,
                            outline: "none",
                            resize: "vertical",
                          }}
                        />
                      </div>

                      {mutation.isError && (
                        <div
                          className="flex items-center gap-2 rounded-[10px] px-4 py-3 text-[13px]"
                          style={{ background: "rgba(248,113,113,0.1)", color: "#F87171", border: "1px solid rgba(248,113,113,0.2)" }}
                        >
                          <AlertCircle size={15} />
                          {mutation.error instanceof Error ? mutation.error.message : "Failed to submit review"}
                        </div>
                      )}

                      <button
                        onClick={() => mutation.mutate(sub.id)}
                        disabled={
                          mutation.isPending ||
                          draft.overall === 0 ||
                          draft.wouldHireRating === 0 ||
                          draft.summary.length < 50
                        }
                        className="flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-[13px] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ background: "linear-gradient(135deg,#7C3AED,#8B5CF6)", color: "#fff" }}
                      >
                        {mutation.isPending ? (
                          <><Loader2 size={14} className="animate-spin" /> Submitting...</>
                        ) : (
                          <><Send size={14} /> Submit Review</>
                        )}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PeerReviewPage() {
  const [tab, setTab] = useState<"get" | "give">("get");
  const queryClient = useQueryClient();

  function handleSubmitSuccess() {
    queryClient.invalidateQueries({ queryKey: ["peer-review-my"] });
  }

  return (
    <div className="min-h-screen" style={{ background: "#060608" }}>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <motion.div {...fadeUp(0)} className="flex items-start gap-4">
          <div
            className="w-12 h-12 rounded-[14px] flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg,rgba(124,58,237,0.2),rgba(139,92,246,0.1))", border: "1px solid rgba(124,58,237,0.3)" }}
          >
            <Users size={22} style={{ color: "#8B5CF6" }} />
          </div>
          <div>
            <h1 className="text-[24px] font-bold" style={{ color: "#F0F0FF" }}>
              Peer Resume Review
            </h1>
            <p className="text-[14px] mt-0.5" style={{ color: "#9090B8" }}>
              Real feedback from real job seekers — anonymously
            </p>
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div {...fadeUp(0.05)}>
          <div
            className="inline-flex rounded-[10px] p-1"
            style={{ background: "#0C0C14", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            {[
              { key: "get", label: "Get Reviews" },
              { key: "give", label: "Give Reviews" },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTab(key as "get" | "give")}
                className="px-5 py-2 rounded-[8px] text-[13px] font-medium transition-all"
                style={
                  tab === key
                    ? { background: "linear-gradient(135deg,#7C3AED,#8B5CF6)", color: "#fff" }
                    : { color: "#9090B8" }
                }
              >
                {label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {tab === "get" ? (
            <motion.div
              key="get"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <SubmitForm onSuccess={handleSubmitSuccess} />
              <div>
                <div className="text-[13px] font-semibold mb-3" style={{ color: "#9090B8" }}>
                  MY SUBMISSIONS
                </div>
                <MySubmissions />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="give"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <GiveReviewsTab />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
