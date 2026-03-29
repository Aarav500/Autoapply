"use client";

import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Video,
  AlertTriangle,
  Send,
  Mail,
  Timer,
  Play,
  Square,
  RotateCcw,
  Building2,
  Search,
  ChevronRight as PracticeIcon,
} from "lucide-react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

// ==================== Types ====================

interface Section {
  id: string;
  title: string;
  count?: number;
  isExpanded: boolean;
}

interface FeedbackMessage {
  type: "success" | "error";
  text: string;
}

type DifficultyLevel = "warm-up" | "standard" | "challenging" | "intense";

interface QuestionBankItem {
  question: string;
  category: "behavioral" | "technical" | "culture-fit" | "situational";
  difficulty: "easy" | "medium" | "hard";
  tips: string;
}

interface QuestionBankResult {
  company: string;
  companySlug: string;
  questions: QuestionBankItem[];
  generatedAt: string;
}

// ==================== Difficulty Badge ====================

function DifficultyBadge({ level }: { level: DifficultyLevel }) {
  const config: Record<DifficultyLevel, { label: string; color: string; bg: string }> = {
    "warm-up":    { label: "Warm-Up",    color: "#34D399", bg: "rgba(52, 211, 153, 0.1)" },
    "standard":   { label: "Standard",   color: "#8B5CF6", bg: "rgba(139, 92, 246, 0.1)" },
    "challenging":{ label: "Challenging",color: "#FBBF24", bg: "rgba(251, 191, 36, 0.1)" },
    "intense":    { label: "Intense",    color: "#F87171", bg: "rgba(248, 113, 113, 0.1)" },
  };
  const c = config[level];
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold"
      style={{ background: c.bg, color: c.color, fontFamily: "monospace, monospace" }}
    >
      <span
        className="inline-block w-1.5 h-1.5 rounded-full"
        style={{ background: c.color }}
      />
      {c.label.toUpperCase()}
    </span>
  );
}

// ==================== Answer Timer ====================

function AnswerTimer() {
  const TOTAL = 120; // seconds
  const [remaining, setRemaining] = useState(TOTAL);
  const [running, setRunning] = useState(false);
  const [expired, setExpired] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = () => {
    if (running) return;
    setRunning(true);
    setExpired(false);
  };

  const stop = () => {
    setRunning(false);
  };

  const reset = () => {
    setRunning(false);
    setExpired(false);
    setRemaining(TOTAL);
  };

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      return;
    }
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          setRunning(false);
          setExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  const percent = remaining / TOTAL;
  const circumference = 2 * Math.PI * 44; // r=44
  const strokeDashoffset = circumference * (1 - percent);

  const ringColor =
    remaining > 60 ? "#34D399" :
    remaining > 30 ? "#FBBF24" :
    "#F87171";

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const timeStr = `${mins}:${String(secs).padStart(2, "0")}`;

  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: "rgba(11, 11, 20, 0.8)",
        border: "1px solid rgba(255, 255, 255, 0.06)",
      }}
    >
      <div className="flex items-start gap-4">
        {/* Circular progress ring */}
        <div className="relative flex-shrink-0" style={{ width: 100, height: 100 }}>
          <svg width="100" height="100" viewBox="0 0 100 100" className="-rotate-90">
            {/* Track */}
            <circle
              cx="50"
              cy="50"
              r="44"
              fill="none"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="6"
            />
            {/* Progress */}
            <circle
              cx="50"
              cy="50"
              r="44"
              fill="none"
              stroke={ringColor}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{ transition: "stroke-dashoffset 1s linear, stroke 0.3s ease" }}
            />
          </svg>
          <div
            className="absolute inset-0 flex flex-col items-center justify-center"
          >
            <span
              className="text-xl font-bold"
              style={{
                fontFamily: "monospace, monospace",
                color: expired ? "#F87171" : remaining <= 30 ? "#F87171" : remaining <= 60 ? "#FBBF24" : "#F0F0FF",
              }}
            >
              {timeStr}
            </span>
            <span className="text-[10px] mt-0.5" style={{ color: "#9090B8", fontFamily: "'Inter', sans-serif" }}>
              {running ? "running" : expired ? "expired" : "paused"}
            </span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          {/* STAR guide */}
          <p className="text-[11px] font-semibold mb-2" style={{ color: "#8B5CF6", fontFamily: "monospace, monospace" }}>
            STAR FORMAT GUIDE
          </p>
          <div className="space-y-1">
            {[
              { label: "S", title: "Situation", words: "30-50w" },
              { label: "T", title: "Task",      words: "20-30w" },
              { label: "A", title: "Action",    words: "120-150w" },
              { label: "R", title: "Result",    words: "30-50w" },
            ].map((part) => (
              <div key={part.label} className="flex items-center gap-2">
                <span
                  className="w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(124, 58, 237, 0.2)", color: "#8B5CF6", fontFamily: "monospace, monospace" }}
                >
                  {part.label}
                </span>
                <span className="text-[12px]" style={{ color: "#F0F0FF", fontFamily: "'Inter', sans-serif" }}>
                  {part.title}
                </span>
                <span className="text-[11px] ml-auto" style={{ color: "#3A3A60", fontFamily: "monospace, monospace" }}>
                  {part.words}
                </span>
              </div>
            ))}
          </div>

          {/* Controls */}
          <div className="flex gap-2 mt-3">
            {!running ? (
              <button
                onClick={start}
                disabled={expired}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all disabled:opacity-40"
                style={{ background: "#34D399", color: "#050508", fontFamily: "'Inter', sans-serif" }}
              >
                <Play size={11} />
                Start
              </button>
            ) : (
              <button
                onClick={stop}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all"
                style={{ background: "#FBBF24", color: "#050508", fontFamily: "'Inter', sans-serif" }}
              >
                <Square size={11} />
                Pause
              </button>
            )}
            <button
              onClick={reset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-all hover:bg-white/5"
              style={{ borderColor: "rgba(255,255,255,0.08)", color: "#9090B8", fontFamily: "'Inter', sans-serif" }}
            >
              <RotateCcw size={11} />
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Expired alert */}
      {expired && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 px-3 py-2 rounded-lg text-[12px]"
          style={{
            background: "rgba(248, 113, 113, 0.08)",
            border: "1px solid rgba(248, 113, 113, 0.2)",
            color: "#F87171",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          <Timer size={12} className="inline mr-1.5" />
          Time&apos;s up — aim for 2-minute answers in real interviews
        </motion.div>
      )}
    </div>
  );
}

// ==================== Question Bank Section ====================

function QuestionBankSection({
  onPractice,
}: {
  onPractice: (question: string) => void;
}) {
  const [companyInput, setCompanyInput] = useState("");
  const [searchedCompany, setSearchedCompany] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<QuestionBankResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const categoryColors: Record<QuestionBankItem["category"], { color: string; bg: string }> = {
    behavioral:   { color: "#8B5CF6", bg: "rgba(139, 92, 246, 0.1)" },
    technical:    { color: "#34D399", bg: "rgba(52, 211, 153, 0.1)" },
    "culture-fit":{ color: "#FBBF24", bg: "rgba(251, 191, 36, 0.1)" },
    situational:  { color: "#60A5FA", bg: "rgba(96, 165, 250, 0.1)" },
  };

  const difficultyColors: Record<QuestionBankItem["difficulty"], string> = {
    easy:   "#34D399",
    medium: "#FBBF24",
    hard:   "#F87171",
  };

  const search = async () => {
    const company = companyInput.trim();
    if (!company) return;
    setIsLoading(true);
    setError(null);
    setResult(null);
    setExpandedIdx(null);
    try {
      const res = await apiFetch<{ data: QuestionBankResult }>(
        `/api/interview?action=question-bank&company=${encodeURIComponent(company)}`
      );
      const inner = (res as Record<string, unknown>)?.data as QuestionBankResult | undefined;
      if (!inner?.questions) throw new Error("No questions returned");
      setResult(inner);
      setSearchedCompany(company);
    } catch {
      setError(`Failed to load questions for "${company}". Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="rounded-xl border p-6"
      style={{
        background: "rgba(11, 11, 20, 0.7)",
        backdropFilter: "blur(12px)",
        borderColor: "rgba(255, 255, 255, 0.06)",
      }}
    >
      <div className="flex items-center gap-3 mb-5">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: "rgba(124, 58, 237, 0.15)" }}
        >
          <Building2 size={16} className="text-[#8B5CF6]" />
        </div>
        <div>
          <h3
            className="text-base font-semibold"
            style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
          >
            Company Question Bank
          </h3>
          <p className="text-[12px]" style={{ color: "#9090B8", fontFamily: "'Inter', sans-serif" }}>
            AI-generated questions based on Glassdoor reports & public interviews
          </p>
        </div>
      </div>

      {/* Search input */}
      <div className="flex gap-2 mb-5">
        <div className="relative flex-1">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "#3A3A60" }}
          />
          <input
            type="text"
            value={companyInput}
            onChange={(e) => setCompanyInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") search(); }}
            placeholder="Google, Meta, Amazon, Stripe..."
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border bg-transparent outline-none"
            style={{
              borderColor: "rgba(255, 255, 255, 0.08)",
              fontFamily: "'Inter', sans-serif",
              fontSize: "14px",
              color: "#F0F0FF",
            }}
          />
        </div>
        <button
          onClick={search}
          disabled={isLoading || !companyInput.trim()}
          className="px-4 py-2.5 rounded-lg font-semibold text-sm transition-all disabled:opacity-40"
          style={{ background: "#7C3AED", color: "#F0F0FF", fontFamily: "'Inter', sans-serif" }}
        >
          {isLoading ? "Loading..." : "Search"}
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="text-center py-8">
          <div
            className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-3"
            style={{ borderColor: "rgba(139, 92, 246, 0.3)", borderTopColor: "transparent" }}
          />
          <p className="text-sm" style={{ color: "#9090B8", fontFamily: "'Inter', sans-serif" }}>
            Generating questions for {companyInput}...
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          className="px-4 py-3 rounded-lg text-sm"
          style={{
            background: "rgba(248, 113, 113, 0.08)",
            border: "1px solid rgba(248, 113, 113, 0.2)",
            color: "#F87171",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex items-center justify-between mb-3">
            <span
              className="text-sm font-semibold"
              style={{ color: "#F0F0FF", fontFamily: "'Inter', sans-serif" }}
            >
              {result.questions.length} Questions for {searchedCompany}
            </span>
            <span
              className="text-[11px]"
              style={{ color: "#3A3A60", fontFamily: "monospace, monospace" }}
            >
              cached {new Date(result.generatedAt).toLocaleDateString()}
            </span>
          </div>

          <div className="space-y-2">
            {result.questions.map((q, idx) => {
              const cat = categoryColors[q.category];
              const isExpanded = expandedIdx === idx;
              return (
                <div
                  key={idx}
                  className="rounded-lg border overflow-hidden"
                  style={{
                    background: "rgba(255, 255, 255, 0.02)",
                    borderColor: isExpanded ? "rgba(124, 58, 237, 0.25)" : "rgba(255, 255, 255, 0.04)",
                  }}
                >
                  <button
                    className="w-full px-4 py-3 flex items-start gap-3 text-left hover:bg-white/[0.02] transition-colors"
                    onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                  >
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-[13px] leading-relaxed"
                        style={{ color: "#F0F0FF", fontFamily: "'Inter', sans-serif" }}
                      >
                        {q.question}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-semibold"
                          style={{ background: cat.bg, color: cat.color, fontFamily: "monospace, monospace" }}
                        >
                          {q.category.toUpperCase()}
                        </span>
                        <span
                          className="text-[11px] font-semibold"
                          style={{ color: difficultyColors[q.difficulty], fontFamily: "monospace, monospace" }}
                        >
                          {q.difficulty}
                        </span>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronDown size={16} style={{ color: "#9090B8", flexShrink: 0, marginTop: 2 }} />
                    ) : (
                      <PracticeIcon size={16} style={{ color: "#3A3A60", flexShrink: 0, marginTop: 2 }} />
                    )}
                  </button>

                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="px-4 pb-3 border-t"
                      style={{ borderColor: "rgba(255, 255, 255, 0.04)" }}
                    >
                      <p
                        className="text-[12px] leading-relaxed mt-3 mb-3"
                        style={{ color: "#9090B8", fontFamily: "'Inter', sans-serif" }}
                      >
                        <span style={{ color: "#8B5CF6" }}>Tip:</span> {q.tips}
                      </p>
                      <button
                        onClick={() => onPractice(q.question)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all"
                        style={{ background: "rgba(124, 58, 237, 0.15)", color: "#8B5CF6", fontFamily: "'Inter', sans-serif" }}
                      >
                        <MessageSquare size={12} />
                        Practice This
                      </button>
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ==================== Main Page ====================

export default function InterviewPrepPage() {
  const [activeTab, setActiveTab] = useState("prep");
  const [feedbackMessage, setFeedbackMessage] = useState<FeedbackMessage | null>(null);
  const [sections, setSections] = useState<Section[]>([
    { id: "company", title: "Company Research", isExpanded: true },
    { id: "behavioral", title: "Behavioral Questions", count: 10, isExpanded: false },
    { id: "technical", title: "Technical Questions", count: 7, isExpanded: false },
    { id: "questions", title: "Questions to Ask Them", count: 5, isExpanded: false },
  ]);
  const [practiceQuestion, setPracticeQuestion] = useState<string | null>(null);

  useQueryClient();

  const showFeedback = (type: "success" | "error", text: string) => {
    setFeedbackMessage({ type, text });
    setTimeout(() => setFeedbackMessage(null), 5000);
  };

  const { data: interviewsData, isLoading: _interviewsLoading, isError: interviewsError } = useQuery({
    queryKey: ["upcomingInterviews"],
    queryFn: () => apiFetch<{ data: Record<string, unknown> }>("/api/interview?status=scheduled"),
    retry: false,
  });

  const interviewsInner = (interviewsData as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
  const interviews: Record<string, unknown>[] = (interviewsInner?.interviews as Record<string, unknown>[]) || [];
  const nextInterview = interviews[0] as Record<string, unknown> | undefined;

  // Fetch prep package for next interview
  const { data: prepData, isLoading: prepLoading } = useQuery({
    queryKey: ["interviewPrep", nextInterview?.id],
    queryFn: () => apiFetch<{ data: Record<string, unknown> }>(`/api/interview/${nextInterview?.id}/prep`),
    enabled: !!nextInterview,
    retry: false,
  });

  const prepInner = (prepData as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
  const prep = prepInner;

  // Countdown timer
  const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const scheduledAt = nextInterview?.scheduledAt as string | undefined;
    if (!scheduledAt) return;

    const timer = setInterval(() => {
      try {
        const now = new Date().getTime();
        const target = new Date(scheduledAt).getTime();
        if (isNaN(target)) return;
        const diff = target - now;

        if (diff > 0) {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
          setCountdown({ hours, minutes, seconds });
        } else {
          setCountdown({ hours: 0, minutes: 0, seconds: 0 });
        }
      } catch {
        setCountdown({ hours: 0, minutes: 0, seconds: 0 });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [nextInterview]);

  const toggleSection = (id: string) => {
    setSections((prev) =>
      prev.map((section) =>
        section.id === id ? { ...section, isExpanded: !section.isExpanded } : section
      )
    );
  };

  const formatTime = (num: number) => String(num).padStart(2, "0");

  const handlePracticeQuestion = (question: string) => {
    setPracticeQuestion(question);
    setActiveTab("mock");
  };

  return (
    <div className="w-full">
      {/* Background texture */}
      <div
        className="fixed inset-0 opacity-[0.015] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {feedbackMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="mb-4 px-4 py-3 rounded-lg text-sm font-medium"
          style={{
            background: feedbackMessage.type === "success" ? "rgba(124, 58, 237, 0.1)" : "rgba(255, 71, 87, 0.1)",
            border: `1px solid ${feedbackMessage.type === "success" ? "rgba(124, 58, 237, 0.3)" : "rgba(255, 71, 87, 0.3)"}`,
            color: feedbackMessage.type === "success" ? "#8B5CF6" : "#F87171",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {feedbackMessage.text}
        </motion.div>
      )}

      {interviewsError ? (
        <div className="text-center py-20">
          <AlertTriangle size={64} className="mx-auto mb-4" style={{ color: "#F87171" }} />
          <h2
            className="text-2xl font-bold mb-2"
            style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
          >
            Failed to Load Interviews
          </h2>
          <p
            className="text-sm"
            style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
          >
            Could not fetch your interviews. Please try refreshing the page.
          </p>
        </div>
      ) : nextInterview ? (
        <>
          {/* HERO CARD - Next Interview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative rounded-2xl p-8 mb-8"
            style={{
              background: "linear-gradient(135deg, rgba(124, 58, 237, 0.1) 0%, rgba(83, 109, 254, 0.05) 100%)",
              border: "1px solid rgba(124, 58, 237, 0.2)",
            }}
          >
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <span
                  className="inline-block px-3 py-1 rounded-full mb-3 text-[11px]"
                  style={{
                    background: "rgba(124, 58, 237, 0.15)",
                    color: "#8B5CF6",
                    fontFamily: "monospace, monospace",
                  }}
                >
                  NEXT INTERVIEW
                </span>
                <h2
                  className="text-3xl font-bold mb-2"
                  style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
                >
                  {(nextInterview.role as string) || "Interview"}
                </h2>
                <p
                  className="text-lg mb-1"
                  style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
                >
                  {nextInterview.company as string}
                </p>
                <p
                  className="text-sm"
                  style={{ fontFamily: "monospace, monospace", color: "#3A3A60" }}
                >
                  {(() => { try { return new Date(nextInterview.scheduledAt as string).toLocaleString(); } catch { return "Date unavailable"; } })()} · {(nextInterview.type as string) || "Video Call"}
                </p>
              </div>

              {/* Countdown Timer */}
              <div
                className="flex gap-3 px-6 py-4 rounded-xl"
                style={{
                  background: "rgba(11, 11, 20, 0.8)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                <div className="text-center">
                  <div
                    className="text-4xl font-bold"
                    style={{ fontFamily: "monospace, monospace", color: "#8B5CF6" }}
                  >
                    {formatTime(countdown.hours)}
                  </div>
                  <div
                    className="text-[10px] uppercase mt-1"
                    style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
                  >
                    Hours
                  </div>
                </div>
                <div
                  className="text-4xl font-bold self-center"
                  style={{ fontFamily: "monospace, monospace", color: "#3A3A60" }}
                >
                  :
                </div>
                <div className="text-center">
                  <div
                    className="text-4xl font-bold"
                    style={{ fontFamily: "monospace, monospace", color: "#8B5CF6" }}
                  >
                    {formatTime(countdown.minutes)}
                  </div>
                  <div
                    className="text-[10px] uppercase mt-1"
                    style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
                  >
                    Minutes
                  </div>
                </div>
                <div
                  className="text-4xl font-bold self-center"
                  style={{ fontFamily: "monospace, monospace", color: "#3A3A60" }}
                >
                  :
                </div>
                <div className="text-center">
                  <div
                    className="text-4xl font-bold"
                    style={{ fontFamily: "monospace, monospace", color: "#8B5CF6" }}
                  >
                    {formatTime(countdown.seconds)}
                  </div>
                  <div
                    className="text-[10px] uppercase mt-1"
                    style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
                  >
                    Seconds
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => {
                  const link = nextInterview.meetingLink as string | undefined;
                  if (link) {
                    window.open(link, "_blank");
                  } else {
                    showFeedback("error", "No meeting link available yet. Check your email for the interview link.");
                  }
                }}
                className="px-5 py-2.5 rounded-lg font-semibold transition-all"
                style={{
                  background: "#8B5CF6",
                  color: "#050508",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                <Video size={16} className="inline mr-2" />
                Join Interview
              </button>
              <button
                className="px-5 py-2.5 rounded-lg font-semibold border transition-all hover:bg-white/5"
                style={{
                  borderColor: "rgba(255, 255, 255, 0.08)",
                  color: "#F0F0FF",
                  fontFamily: "'Inter', sans-serif",
                }}
                onClick={() => setActiveTab("mock")}
              >
                <MessageSquare size={16} className="inline mr-2" />
                Practice Mock Interview
              </button>
              <Link
                href={`/company-research?company=${encodeURIComponent(String(nextInterview.company || ""))}`}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold transition-all hover:opacity-80"
                style={{
                  background: "rgba(96,165,250,0.10)",
                  border: "1px solid rgba(96,165,250,0.2)",
                  color: "#60A5FA",
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "14px",
                }}
              >
                <Building2 size={15} />
                Research Company
              </Link>
              <Link
                href={`/recruiter-prep?role=${encodeURIComponent(String(nextInterview.role || ""))}&company=${encodeURIComponent(String(nextInterview.company || ""))}`}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold transition-all hover:opacity-80"
                style={{
                  background: "rgba(52,211,153,0.08)",
                  border: "1px solid rgba(52,211,153,0.2)",
                  color: "#34D399",
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "14px",
                }}
              >
                <Search size={15} />
                Recruiter Prep
              </Link>
            </div>
          </motion.div>

          {/* TAB BAR */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="border-b mb-6"
            style={{ borderColor: "rgba(255, 255, 255, 0.04)" }}
          >
            <div className="flex gap-8">
              {[
                { id: "prep", label: "Prep Materials" },
                { id: "mock", label: "Mock Interview" },
                { id: "questions", label: "Question Bank" },
                { id: "follow-up", label: "Post-Interview" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="relative pb-3 transition-all"
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: activeTab === tab.id ? "#F0F0FF" : "#9090B8",
                  }}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="activeInterviewTab"
                      className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#8B5CF6]"
                    />
                  )}
                </button>
              ))}
            </div>
          </motion.div>

          {/* TAB CONTENT */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* PREP TAB */}
            {activeTab === "prep" && (
              <div className="space-y-4">
                {prepLoading ? (
                  <div className="space-y-4">
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        className="h-24 rounded-lg animate-pulse"
                        style={{ background: "rgba(255, 255, 255, 0.03)" }}
                      />
                    ))}
                  </div>
                ) : (
                  sections.map((section) => (
                    <div
                      key={section.id}
                      className="rounded-lg border overflow-hidden"
                      style={{
                        background: "rgba(11, 11, 20, 0.7)",
                        backdropFilter: "blur(12px)",
                        borderColor: "rgba(255, 255, 255, 0.04)",
                      }}
                    >
                      {/* Section Header */}
                      <button
                        onClick={() => toggleSection(section.id)}
                        className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <BookOpen size={20} className="text-[#8B5CF6]" />
                          <h3
                            className="text-lg font-semibold"
                            style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
                          >
                            {section.title}
                          </h3>
                          {section.count && (
                            <span
                              className="px-2 py-0.5 rounded-full text-[11px]"
                              style={{
                                background: "rgba(124, 58, 237, 0.1)",
                                color: "#8B5CF6",
                                fontFamily: "monospace, monospace",
                              }}
                            >
                              {section.count}
                            </span>
                          )}
                        </div>
                        {section.isExpanded ? (
                          <ChevronDown size={20} className="text-[#9090B8]" />
                        ) : (
                          <ChevronRight size={20} className="text-[#9090B8]" />
                        )}
                      </button>

                      {/* Section Content */}
                      {section.isExpanded && (
                        <div className="px-6 pb-6">
                          {section.id === "company" && Boolean(prep?.companyResearch) && (
                            <div className="space-y-4">
                              <div>
                                <h4 className="text-sm font-semibold mb-2 text-[#F0F0FF]">Overview</h4>
                                <p className="text-sm text-[#9090B8] leading-relaxed">
                                  {String((prep!.companyResearch as Record<string, unknown>).overview ?? '')}
                                </p>
                              </div>
                              {Boolean((prep!.companyResearch as Record<string, unknown>).keyProducts) && (
                                <div>
                                  <h4 className="text-sm font-semibold mb-2 text-[#F0F0FF]">Key Products</h4>
                                  <ul className="space-y-1">
                                    {((prep!.companyResearch as Record<string, unknown>).keyProducts as string[]).map((product: string, idx: number) => (
                                      <li key={idx} className="text-sm text-[#9090B8] flex items-start gap-2">
                                        <span className="text-[#8B5CF6]">•</span>
                                        <span>{product}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}

                          {section.id === "behavioral" && Boolean(prep?.questions) && (
                            <div className="space-y-3">
                              {(prep!.questions as Record<string, unknown>[])
                                .filter((q) => q.type === "behavioral")
                                .slice(0, 10)
                                .map((question, idx: number) => (
                                  <div
                                    key={idx}
                                    className="p-4 rounded-lg"
                                    style={{
                                      background: "rgba(255, 255, 255, 0.02)",
                                      border: "1px solid rgba(255, 255, 255, 0.04)",
                                    }}
                                  >
                                    <p className="text-sm text-[#F0F0FF] mb-2">{String(question.question ?? '')}</p>
                                    {Boolean(question.starAnswer) && (
                                      <p className="text-xs text-[#9090B8]">
                                        <span className="text-[#8B5CF6]">STAR:</span> {String(((question.starAnswer as Record<string, unknown>).situation) ?? '')}
                                      </p>
                                    )}
                                  </div>
                                ))}
                            </div>
                          )}

                          {!prep && (
                            <p className="text-sm text-[#9090B8]">Generating prep materials...</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* MOCK INTERVIEW TAB */}
            {activeTab === "mock" && (
              <MockInterviewTab
                interviewId={nextInterview?.id as string | undefined}
                showFeedback={showFeedback}
                initialQuestion={practiceQuestion}
                onConsumeInitialQuestion={() => setPracticeQuestion(null)}
              />
            )}

            {/* QUESTION BANK TAB */}
            {activeTab === "questions" && (
              <QuestionBankSection onPractice={handlePracticeQuestion} />
            )}

            {/* POST-INTERVIEW TAB */}
            {activeTab === "follow-up" && (
              <PostInterviewTab interviewId={nextInterview?.id as string | undefined} showFeedback={showFeedback} />
            )}
          </motion.div>
        </>
      ) : (
        <div className="space-y-6">
          <div className="text-center py-16">
            <Video size={64} className="mx-auto mb-4 text-[#3A3A60]" />
            <h2 className="text-2xl font-bold mb-2 text-[#F0F0FF]">No Upcoming Interviews</h2>
            <p className="text-[#9090B8] mb-2">Schedule an interview to access prep materials</p>
            <p className="text-sm text-[#3A3A60]">You can still use the Question Bank below to practice</p>
          </div>
          <QuestionBankSection onPractice={() => {}} />
        </div>
      )}
    </div>
  );
}

/* ============================================================
   MOCK INTERVIEW TAB — Conversational Q&A with AI feedback
   ============================================================ */
interface MockMessage {
  role: "interviewer" | "candidate";
  text: string;
  score?: number;
  feedback?: string;
}

function MockInterviewTab({
  interviewId,
  showFeedback,
  initialQuestion,
  onConsumeInitialQuestion,
}: {
  interviewId?: string;
  showFeedback: (type: "success" | "error", text: string) => void;
  initialQuestion: string | null;
  onConsumeInitialQuestion: () => void;
}) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MockMessage[]>([]);
  const [answer, setAnswer] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [assessment, setAssessment] = useState<Record<string, unknown> | null>(null);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("warm-up");

  const { data: historyData } = useQuery({
    queryKey: ["mockHistory", interviewId],
    queryFn: () => apiFetch<{ data: { sessions: Record<string, unknown>[] } }>(`/api/interview/${interviewId}/mock`),
    enabled: !!interviewId && !sessionId,
    retry: false,
  });
  const pastSessions: Record<string, unknown>[] =
    ((historyData as Record<string, unknown>)?.data as Record<string, unknown>)?.sessions as Record<string, unknown>[] ?? [];

  // If an initialQuestion was passed from question bank, pre-fill it when not in session
  useEffect(() => {
    if (initialQuestion && !sessionId) {
      // It will be used when startMock is called; nothing to prefill here.
      // We just keep it available via prop until consumed.
    }
  }, [initialQuestion, sessionId]);

  const startMock = async (mode: "behavioral" | "technical", questionOverride?: string) => {
    if (!interviewId) return;
    setIsStarting(true);
    try {
      const res = await apiFetch<Record<string, unknown>>(`/api/interview/${interviewId}/mock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, difficulty: "warm-up" }),
      });
      const inner = (res as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
      const sid = (inner?.sessionId as string) || "";
      const firstQ = questionOverride
        || (inner?.question as string)
        || (inner?.message as string)
        || (inner?.firstQuestion as string)
        || "Tell me about yourself.";
      setSessionId(sid);
      setDifficulty("warm-up");
      setMessages([{ role: "interviewer", text: firstQ }]);
      setAssessment(null);
      if (questionOverride) onConsumeInitialQuestion();
    } catch {
      showFeedback("error", "Failed to start mock interview.");
    } finally {
      setIsStarting(false);
    }
  };

  const sendAnswer = async () => {
    if (!interviewId || !sessionId || !answer.trim()) return;
    setIsSending(true);
    setMessages((prev) => [...prev, { role: "candidate", text: answer }]);
    const currentAnswer = answer;
    setAnswer("");
    try {
      const res = await apiFetch<Record<string, unknown>>(`/api/interview/${interviewId}/mock/${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer: currentAnswer }),
      });
      const inner = (res as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
      const score = inner?.score as number | undefined;
      const fb = inner?.feedback as string | undefined;
      const nextQ = inner?.nextQuestion as string | undefined;
      const overall = inner?.overallAssessment as Record<string, unknown> | undefined;
      const nextDiff = inner?.nextDifficulty as DifficultyLevel | undefined;

      // Add feedback for the answer
      if (fb) {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { ...updated[updated.length - 1], score, feedback: fb };
          return updated;
        });
      }

      // Update difficulty
      if (nextDiff) {
        setDifficulty(nextDiff);
      }

      // Add next question or show assessment
      if (overall) {
        setAssessment(overall);
      } else if (nextQ) {
        setMessages((prev) => [...prev, { role: "interviewer", text: nextQ }]);
      }
    } catch {
      showFeedback("error", "Failed to send answer. Try again.");
    } finally {
      setIsSending(false);
    }
  };

  // Not started yet
  if (!sessionId) {
    return (
      <div className="text-center py-12">
        <MessageSquare size={48} className="mx-auto mb-4 text-[#8B5CF6]" />
        <h3 className="text-xl font-semibold mb-2 text-[#F0F0FF]" style={{ fontFamily: "'Inter', sans-serif" }}>
          Mock Interview Simulator
        </h3>
        <p className="text-sm text-[#9090B8] mb-2" style={{ fontFamily: "'Inter', sans-serif" }}>
          Practice with an AI interviewer and get real-time scoring and feedback
        </p>
        {initialQuestion && (
          <div
            className="mx-auto max-w-xl mb-5 px-4 py-3 rounded-lg text-sm text-left"
            style={{
              background: "rgba(124, 58, 237, 0.06)",
              border: "1px solid rgba(124, 58, 237, 0.2)",
              color: "#F0F0FF",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            <span style={{ color: "#8B5CF6" }}>Practice question:</span> {initialQuestion}
          </div>
        )}
        {!interviewId && (
          <p className="text-xs text-[#3A3A60] mb-4" style={{ fontFamily: "'Inter', sans-serif" }}>
            Schedule an interview first to use the mock simulator
          </p>
        )}
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => startMock("behavioral", initialQuestion ?? undefined)}
            disabled={isStarting || !interviewId}
            className="px-5 py-2.5 rounded-lg font-semibold transition-all disabled:opacity-50"
            style={{ background: "#8B5CF6", color: "#050508", fontFamily: "'Inter', sans-serif" }}
          >
            {isStarting ? "Starting..." : "Start Behavioral Mock"}
          </button>
          <button
            onClick={() => startMock("technical", initialQuestion ?? undefined)}
            disabled={isStarting || !interviewId}
            className="px-5 py-2.5 rounded-lg font-semibold border transition-all hover:bg-white/5 disabled:opacity-50"
            style={{ borderColor: "rgba(255, 255, 255, 0.08)", color: "#F0F0FF", fontFamily: "'Inter', sans-serif" }}
          >
            {isStarting ? "Starting..." : "Start Technical Mock"}
          </button>
        </div>

        {/* Session history */}
        {pastSessions.length > 0 && (
          <div className="mt-8 max-w-xl mx-auto w-full">
            <p
              className="text-[11px] font-semibold uppercase tracking-wider mb-3 text-left"
              style={{ fontFamily: "'Inter', sans-serif", color: "#3A3A60" }}
            >
              Past Sessions
            </p>
            <div className="space-y-2">
              {pastSessions.slice(0, 5).map((s, i) => {
                const score = s.overallScore as number | undefined;
                const mode = s.mode as string | undefined;
                const startedAt = s.startedAt ? new Date(s.startedAt as string).toLocaleDateString() : "Unknown";
                const msgCount = s.messageCount as number | undefined;
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between px-4 py-3 rounded-xl text-left"
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: "rgba(124,58,237,0.1)" }}
                      >
                        <MessageSquare size={14} color="#8B5CF6" />
                      </div>
                      <div>
                        <p className="text-[12px] font-medium" style={{ color: "#F0F0FF", fontFamily: "'Inter', sans-serif" }}>
                          {mode ? mode.charAt(0).toUpperCase() + mode.slice(1) : "Mock"} Interview
                        </p>
                        <p className="text-[11px]" style={{ color: "#3A3A60", fontFamily: "monospace" }}>
                          {startedAt} · {msgCount ?? 0} exchanges
                        </p>
                      </div>
                    </div>
                    {score !== undefined && score > 0 && (
                      <span
                        className="text-[12px] font-bold px-2.5 py-1 rounded-lg"
                        style={{
                          background: score >= 80 ? "rgba(52,211,153,0.1)" : score >= 60 ? "rgba(251,191,36,0.1)" : "rgba(248,113,113,0.1)",
                          color: score >= 80 ? "#34D399" : score >= 60 ? "#FBBF24" : "#F87171",
                          fontFamily: "monospace",
                        }}
                      >
                        {score}/100
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Active session
  return (
    <div className="flex flex-col" style={{ minHeight: "400px" }}>
      {/* Difficulty badge + Answer Timer row */}
      <div className="flex items-start gap-4 mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-[12px]" style={{ color: "#9090B8", fontFamily: "'Inter', sans-serif" }}>
              Current difficulty:
            </span>
            <DifficultyBadge level={difficulty} />
          </div>
          <AnswerTimer />
        </div>
      </div>

      {/* Conversation */}
      <div className="flex-1 space-y-4 mb-4 max-h-[500px] overflow-y-auto">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === "candidate" ? "justify-end" : "justify-start"}`}>
            <div
              className="max-w-[80%] p-4 rounded-lg"
              style={{
                background: msg.role === "interviewer" ? "rgba(124, 58, 237, 0.06)" : "rgba(83, 109, 254, 0.08)",
                border: `1px solid ${msg.role === "interviewer" ? "rgba(124, 58, 237, 0.15)" : "rgba(83, 109, 254, 0.15)"}`,
              }}
            >
              <span className="text-[10px] uppercase font-semibold block mb-1" style={{
                fontFamily: "monospace, monospace",
                color: msg.role === "interviewer" ? "#8B5CF6" : "#536DFE",
              }}>
                {msg.role === "interviewer" ? "Interviewer" : "You"}
              </span>
              <p className="text-sm leading-relaxed" style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}>
                {msg.text}
              </p>
              {msg.score !== undefined && (
                <div className="mt-2 pt-2 border-t" style={{ borderColor: "rgba(255, 255, 255, 0.06)" }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] text-[#9090B8]">Score:</span>
                    <span className="text-sm font-bold" style={{
                      fontFamily: "monospace, monospace",
                      color: (msg.score ?? 0) >= 7 ? "#34D399" : (msg.score ?? 0) >= 5 ? "#FBBF24" : "#F87171",
                    }}>
                      {msg.score}/10
                    </span>
                  </div>
                  {msg.feedback && (
                    <p className="text-[12px] text-[#9090B8]" style={{ fontFamily: "'Inter', sans-serif" }}>{msg.feedback}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {isSending && (
          <div className="flex justify-start">
            <div className="px-4 py-3 rounded-lg" style={{ background: "rgba(124, 58, 237, 0.06)", border: "1px solid rgba(124, 58, 237, 0.15)" }}>
              <span className="text-sm text-[#9090B8] animate-pulse">AI is evaluating...</span>
            </div>
          </div>
        )}
      </div>

      {/* Overall Assessment */}
      {assessment && (
        <div className="mb-4 p-5 rounded-lg" style={{ background: "rgba(74, 222, 128, 0.06)", border: "1px solid rgba(74, 222, 128, 0.2)" }}>
          <h4 className="text-sm font-semibold mb-2 text-[#34D399]" style={{ fontFamily: "'Inter', sans-serif" }}>Overall Assessment</h4>
          <p className="text-sm text-[#9090B8] mb-2" style={{ fontFamily: "'Inter', sans-serif" }}>{assessment.summary as string}</p>
          {(assessment.strengths as string[])?.length > 0 && (
            <div className="mb-1"><span className="text-[11px] text-[#34D399]">Strengths:</span> <span className="text-[12px] text-[#9090B8]">{(assessment.strengths as string[]).join(", ")}</span></div>
          )}
          {(assessment.improvements as string[])?.length > 0 && (
            <div><span className="text-[11px] text-[#FBBF24]">Improve:</span> <span className="text-[12px] text-[#9090B8]">{(assessment.improvements as string[]).join(", ")}</span></div>
          )}
          <button
            onClick={() => { setSessionId(null); setMessages([]); setAssessment(null); setDifficulty("warm-up"); }}
            className="mt-3 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:bg-white/5"
            style={{ border: "1px solid rgba(255, 255, 255, 0.08)", color: "#9090B8", fontFamily: "'Inter', sans-serif" }}
          >
            Start New Mock
          </button>
        </div>
      )}

      {/* Answer Input */}
      {!assessment && (
        <div className="flex gap-2">
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendAnswer(); } }}
            placeholder="Type your answer... (Enter to send, Shift+Enter for newline)"
            rows={3}
            className="flex-1 px-4 py-3 rounded-lg border bg-transparent outline-none resize-none"
            style={{ borderColor: "rgba(255, 255, 255, 0.08)", fontFamily: "'Inter', sans-serif", fontSize: "14px", color: "#F0F0FF" }}
          />
          <button
            onClick={sendAnswer}
            disabled={isSending || !answer.trim()}
            className="self-end px-4 py-3 rounded-lg font-semibold transition-all disabled:opacity-50"
            style={{ background: "#8B5CF6", color: "#050508", fontFamily: "'Inter', sans-serif" }}
          >
            <Send size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   POST-INTERVIEW TAB — Generate + Send thank-you email
   ============================================================ */
function PostInterviewTab({ interviewId, showFeedback }: { interviewId?: string; showFeedback: (type: "success" | "error", text: string) => void }) {
  const [thankYouDraft, setThankYouDraft] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const generateThankYou = async () => {
    if (!interviewId) return;
    setIsGenerating(true);
    try {
      const res = await apiFetch<Record<string, unknown>>(`/api/interview/${interviewId}/thank-you`, { method: "POST" });
      const inner = (res as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
      const draft = (inner?.draft as string) || (inner?.body as string) || (inner?.email as string) || "";
      setThankYouDraft(draft || "Thank you for taking the time to interview me...");
    } catch {
      showFeedback("error", "Failed to generate thank-you email.");
    } finally {
      setIsGenerating(false);
    }
  };

  const sendThankYou = async () => {
    if (!interviewId || !thankYouDraft) return;
    setIsSending(true);
    try {
      await apiFetch(`/api/interview/${interviewId}/thank-you`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: thankYouDraft }),
      });
      showFeedback("success", "Thank-you email sent successfully!");
      setThankYouDraft(null);
    } catch {
      showFeedback("error", "Failed to send. Make sure Gmail is connected in Settings.");
    } finally {
      setIsSending(false);
    }
  };

  if (!thankYouDraft && !isGenerating) {
    return (
      <div className="text-center py-12">
        <Mail size={48} className="mx-auto mb-4 text-[#34D399]" />
        <h3 className="text-xl font-semibold mb-2 text-[#F0F0FF]" style={{ fontFamily: "'Inter', sans-serif" }}>Post-Interview Actions</h3>
        <p className="text-sm text-[#9090B8] mb-6" style={{ fontFamily: "'Inter', sans-serif" }}>
          Generate and send a professional thank-you email
        </p>
        <button
          onClick={generateThankYou}
          className="px-5 py-2.5 rounded-lg font-semibold transition-all"
          style={{ background: "#8B5CF6", color: "#050508", fontFamily: "'Inter', sans-serif" }}
        >
          Generate Thank You Email
        </button>
      </div>
    );
  }

  if (isGenerating) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-4" style={{ borderColor: "rgba(74, 222, 128, 0.3)", borderTopColor: "transparent" }} />
        <p className="text-sm text-[#9090B8]" style={{ fontFamily: "'Inter', sans-serif" }}>Generating thank-you email...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}>Thank-You Email Draft</h3>
        <span className="text-[11px] text-[#3A3A60]">Edit before sending</span>
      </div>
      <textarea
        value={thankYouDraft || ""}
        onChange={(e) => setThankYouDraft(e.target.value)}
        rows={10}
        className="w-full px-4 py-3 rounded-lg border bg-transparent outline-none resize-none"
        style={{ borderColor: "rgba(255, 255, 255, 0.08)", fontFamily: "'Inter', sans-serif", fontSize: "14px", color: "#F0F0FF" }}
      />
      <div className="flex gap-3">
        <button
          onClick={sendThankYou}
          disabled={isSending || !thankYouDraft?.trim()}
          className="flex-1 px-4 py-3 rounded-lg font-semibold transition-all disabled:opacity-50"
          style={{ background: "#34D399", color: "#050508", fontFamily: "'Inter', sans-serif" }}
        >
          <Send size={16} className="inline mr-2" />
          {isSending ? "Sending..." : "Send via Gmail"}
        </button>
        <button
          onClick={generateThankYou}
          disabled={isGenerating}
          className="px-4 py-3 rounded-lg font-semibold border transition-all hover:bg-white/5"
          style={{ borderColor: "rgba(255, 255, 255, 0.08)", color: "#9090B8", fontFamily: "'Inter', sans-serif" }}
        >
          Regenerate
        </button>
      </div>
    </div>
  );
}
