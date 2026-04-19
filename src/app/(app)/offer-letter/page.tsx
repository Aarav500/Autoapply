"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import {
  FileSearch,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Clock,
  Building2,
  Briefcase,
  TrendingUp,
  Shield,
  XCircle,
  Info,
  Star,
  MessageSquare,
  HelpCircle,
} from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Compensation {
  base_salary: string;
  bonus: string;
  equity: string;
  signing_bonus: string;
  total_comp_estimate: string;
  compensation_assessment: string;
}

interface EquityAnalysis {
  grant_amount: string;
  vesting_schedule: string;
  cliff: string;
  acceleration: string;
  strike_price?: string;
  assessment: string;
  is_standard: boolean;
  concerns: string[];
}

type ClauseType =
  | "nda"
  | "non-compete"
  | "ip-assignment"
  | "clawback"
  | "at-will"
  | "arbitration"
  | "benefits"
  | "pto"
  | "severance"
  | "other";

type ClauseAssessment = "favorable" | "standard" | "unusual" | "concerning" | "red-flag";

interface Clause {
  clause_type: ClauseType;
  extracted_text: string;
  assessment: ClauseAssessment;
  explanation: string;
  industry_standard: string;
  negotiation_tip?: string;
}

type RedFlagSeverity = "critical" | "high" | "medium" | "low";

interface RedFlag {
  issue: string;
  severity: RedFlagSeverity;
  explanation: string;
  ask_to_change: string;
}

interface NegotiationOpportunity {
  item: string;
  current: string;
  ask_for: string;
  script: string;
}

type Verdict = "excellent" | "good" | "fair" | "concerning" | "red-flags-present";

interface OfferAnalysis {
  id: string;
  company: string;
  role: string;
  analyzedAt: string;
  offer_health_score: number;
  overall_verdict: Verdict;
  summary: string;
  compensation: Compensation;
  equity_analysis: EquityAnalysis;
  clauses: Clause[];
  red_flags: RedFlag[];
  favorable_terms: string[];
  negotiation_opportunities: NegotiationOpportunity[];
  questions_to_ask_hr: string[];
  recommendation: string;
}

interface AnalyzeResponse {
  data: { analysis: OfferAnalysis };
}

interface HistoryResponse {
  data: { history: OfferAnalysis[] };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const verdictConfig: Record<Verdict, { label: string; color: string; bg: string; border: string }> =
  {
    excellent: {
      label: "Excellent",
      color: "#34D399",
      bg: "rgba(52,211,153,0.08)",
      border: "rgba(52,211,153,0.25)",
    },
    good: {
      label: "Good",
      color: "#2DD4BF",
      bg: "rgba(45,212,191,0.08)",
      border: "rgba(45,212,191,0.25)",
    },
    fair: {
      label: "Fair",
      color: "#FBBF24",
      bg: "rgba(251,191,36,0.08)",
      border: "rgba(251,191,36,0.25)",
    },
    concerning: {
      label: "Concerning",
      color: "#FB923C",
      bg: "rgba(251,146,60,0.08)",
      border: "rgba(251,146,60,0.25)",
    },
    "red-flags-present": {
      label: "Red Flags",
      color: "#F87171",
      bg: "rgba(248,113,113,0.08)",
      border: "rgba(248,113,113,0.25)",
    },
  };

const clauseTypeLabels: Record<ClauseType, string> = {
  nda: "NDA",
  "non-compete": "Non-Compete",
  "ip-assignment": "IP Assignment",
  clawback: "Clawback",
  "at-will": "At-Will",
  arbitration: "Arbitration",
  benefits: "Benefits",
  pto: "PTO",
  severance: "Severance",
  other: "Other",
};

const assessmentConfig: Record<
  ClauseAssessment,
  { label: string; color: string; bg: string; border: string; icon: React.ReactNode }
> = {
  favorable: {
    label: "Favorable",
    color: "#34D399",
    bg: "rgba(52,211,153,0.1)",
    border: "rgba(52,211,153,0.25)",
    icon: <CheckCircle2 size={12} />,
  },
  standard: {
    label: "Standard",
    color: "#9090B8",
    bg: "rgba(144,144,184,0.08)",
    border: "rgba(144,144,184,0.2)",
    icon: <Info size={12} />,
  },
  unusual: {
    label: "Unusual",
    color: "#FBBF24",
    bg: "rgba(251,191,36,0.1)",
    border: "rgba(251,191,36,0.25)",
    icon: <AlertTriangle size={12} />,
  },
  concerning: {
    label: "Concerning",
    color: "#FB923C",
    bg: "rgba(251,146,60,0.1)",
    border: "rgba(251,146,60,0.25)",
    icon: <AlertTriangle size={12} />,
  },
  "red-flag": {
    label: "Red Flag ⚠",
    color: "#F87171",
    bg: "rgba(248,113,113,0.1)",
    border: "rgba(248,113,113,0.3)",
    icon: <XCircle size={12} />,
  },
};

const severityConfig: Record<
  RedFlagSeverity,
  { label: string; color: string; bg: string; border: string }
> = {
  critical: {
    label: "Critical",
    color: "#F87171",
    bg: "rgba(248,113,113,0.1)",
    border: "rgba(248,113,113,0.3)",
  },
  high: {
    label: "High",
    color: "#FB923C",
    bg: "rgba(251,146,60,0.08)",
    border: "rgba(251,146,60,0.25)",
  },
  medium: {
    label: "Medium",
    color: "#FBBF24",
    bg: "rgba(251,191,36,0.08)",
    border: "rgba(251,191,36,0.2)",
  },
  low: {
    label: "Low",
    color: "#9090B8",
    bg: "rgba(144,144,184,0.06)",
    border: "rgba(144,144,184,0.15)",
  },
};

const severityOrder: RedFlagSeverity[] = ["critical", "high", "medium", "low"];

// ─── Small helpers ────────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 80) return "#34D399";
  if (score >= 65) return "#2DD4BF";
  if (score >= 50) return "#FBBF24";
  if (score >= 35) return "#FB923C";
  return "#F87171";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CircleScore({ score, verdict }: { score: number; verdict: Verdict }) {
  const color = scoreColor(score);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const dash = (score / 100) * circumference;
  const cfg = verdictConfig[verdict];

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-36 h-36">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="10"
          />
          <motion.circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference - dash }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold" style={{ color, fontFamily: "'Inter', sans-serif" }}>
            {score}
          </span>
          <span className="text-xs text-[#9090B8]" style={{ fontFamily: "'Inter', sans-serif" }}>
            / 100
          </span>
        </div>
      </div>
      <span
        className="px-3 py-1 rounded-full text-sm font-medium"
        style={{
          color: cfg.color,
          background: cfg.bg,
          border: `1px solid ${cfg.border}`,
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {cfg.label}
      </span>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard access failed silently
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-all"
      style={{
        color: copied ? "#34D399" : "#9090B8",
        background: copied ? "rgba(52,211,153,0.08)" : "rgba(255,255,255,0.04)",
        border: `1px solid ${copied ? "rgba(52,211,153,0.25)" : "rgba(255,255,255,0.08)"}`,
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? "Copied" : "Copy script"}
    </button>
  );
}

function ClauseCard({ clause }: { clause: Clause }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = assessmentConfig[clause.assessment];
  const typeLabel = clauseTypeLabels[clause.clause_type];

  return (
    <div
      className="rounded-xl p-4 transition-all"
      style={{
        background: "#0C0C14",
        border: `1px solid ${clause.assessment === "red-flag" ? "rgba(248,113,113,0.2)" : "rgba(255,255,255,0.06)"}`,
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="px-2 py-0.5 rounded text-xs font-semibold"
            style={{
              color: "#C4B5FD",
              background: "rgba(124,58,237,0.12)",
              border: "1px solid rgba(124,58,237,0.25)",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {typeLabel}
          </span>
          <span
            className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
            style={{
              color: cfg.color,
              background: cfg.bg,
              border: `1px solid ${cfg.border}`,
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {cfg.icon}
            {cfg.label}
          </span>
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-[#9090B8] hover:text-[#F0F0FF] transition-colors flex-shrink-0"
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      <p
        className="text-xs italic text-[#6060A0] mb-3 line-clamp-2"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        &ldquo;{clause.extracted_text}&rdquo;
      </p>

      <p className="text-sm text-[#C0C0E0]" style={{ fontFamily: "'Inter', sans-serif" }}>
        {clause.explanation}
      </p>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-4 space-y-3 pt-3 border-t border-[rgba(255,255,255,0.06)]">
              <div>
                <p
                  className="text-xs font-semibold text-[#9090B8] uppercase tracking-wider mb-1"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  Industry Standard
                </p>
                <p
                  className="text-sm text-[#C0C0E0]"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  {clause.industry_standard}
                </p>
              </div>
              {clause.negotiation_tip && (
                <div
                  className="p-3 rounded-lg"
                  style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)" }}
                >
                  <p
                    className="text-xs font-semibold text-[#C4B5FD] mb-1"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  >
                    Negotiation Tip
                  </p>
                  <p className="text-sm text-[#C0C0E0]" style={{ fontFamily: "'Inter', sans-serif" }}>
                    {clause.negotiation_tip}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RedFlagCard({ flag }: { flag: RedFlag }) {
  const cfg = severityConfig[flag.severity];
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: "#0C0C14", border: `1px solid ${cfg.border}` }}
    >
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle size={14} style={{ color: cfg.color }} />
        <span
          className="font-semibold text-sm"
          style={{ color: "#F0F0FF", fontFamily: "'Inter', sans-serif" }}
        >
          {flag.issue}
        </span>
        <span
          className="ml-auto px-2 py-0.5 rounded text-xs font-medium"
          style={{
            color: cfg.color,
            background: cfg.bg,
            border: `1px solid ${cfg.border}`,
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {cfg.label}
        </span>
      </div>
      <p className="text-sm text-[#9090B8] mb-3" style={{ fontFamily: "'Inter', sans-serif" }}>
        {flag.explanation}
      </p>
      <div
        className="p-3 rounded-lg"
        style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.15)" }}
      >
        <p
          className="text-xs font-semibold text-[#FBBF24] mb-1"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          What to ask them to change
        </p>
        <p className="text-sm text-[#E0E0F0]" style={{ fontFamily: "'Inter', sans-serif" }}>
          {flag.ask_to_change}
        </p>
      </div>
    </div>
  );
}

function NegotiationCard({ opp }: { opp: NegotiationOpportunity }) {
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: "#0C0C14", border: "1px solid rgba(124,58,237,0.2)" }}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <p
          className="font-semibold text-[#F0F0FF]"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          {opp.item}
        </p>
        <CopyButton text={opp.script} />
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div
          className="p-3 rounded-lg"
          style={{ background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.15)" }}
        >
          <p
            className="text-xs font-semibold text-[#F87171] mb-1"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            Current
          </p>
          <p className="text-sm text-[#E0E0F0]" style={{ fontFamily: "'Inter', sans-serif" }}>
            {opp.current}
          </p>
        </div>
        <div
          className="p-3 rounded-lg"
          style={{ background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.15)" }}
        >
          <p
            className="text-xs font-semibold text-[#34D399] mb-1"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            Ask For
          </p>
          <p className="text-sm text-[#E0E0F0]" style={{ fontFamily: "'Inter', sans-serif" }}>
            {opp.ask_for}
          </p>
        </div>
      </div>
      <div
        className="p-3 rounded-lg"
        style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)" }}
      >
        <p
          className="text-xs font-semibold text-[#C4B5FD] mb-1"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          Script
        </p>
        <p
          className="text-sm text-[#C0C0E0] italic"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          &ldquo;{opp.script}&rdquo;
        </p>
      </div>
    </div>
  );
}

function SectionHeader({ icon, title, count }: { icon: React.ReactNode; title: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)" }}
      >
        {icon}
      </div>
      <h2
        className="text-lg font-semibold text-[#F0F0FF]"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        {title}
      </h2>
      {count !== undefined && (
        <span
          className="ml-auto px-2 py-0.5 rounded-full text-xs font-medium text-[#9090B8]"
          style={{ background: "rgba(255,255,255,0.06)", fontFamily: "'Inter', sans-serif" }}
        >
          {count}
        </span>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OfferLetterPage() {
  const [offerText, setOfferText] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [result, setResult] = useState<OfferAnalysis | null>(null);
  const [checkedQuestions, setCheckedQuestions] = useState<Set<number>>(new Set());

  const historyQuery = useQuery<HistoryResponse>({
    queryKey: ["offer-letter-history"],
    queryFn: () => apiFetch<HistoryResponse>("/api/offer-letter"),
  });

  const history: OfferAnalysis[] = historyQuery.data?.data?.history ?? [];

  const analyzeMutation = useMutation({
    mutationFn: (payload: { offerText: string; company?: string; role?: string }) =>
      apiFetch<AnalyzeResponse>("/api/offer-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onSuccess: (data) => {
      setResult(data.data.analysis);
      historyQuery.refetch();
    },
  });

  const handleSubmit = () => {
    if (offerText.trim().length < 100) return;
    setResult(null);
    setCheckedQuestions(new Set());
    analyzeMutation.mutate({
      offerText: offerText.trim(),
      company: company.trim() || undefined,
      role: role.trim() || undefined,
    });
  };

  const toggleQuestion = (idx: number) => {
    setCheckedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const sortedRedFlags = result
    ? [...result.red_flags].sort(
        (a, b) => severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity)
      )
    : [];

  const inputStyle: React.CSSProperties = {
    background: "#0C0C14",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "10px",
    color: "#F0F0FF",
    fontFamily: "'Inter', sans-serif",
    fontSize: "14px",
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.25)" }}
        >
          <FileSearch size={20} style={{ color: "#8B5CF6" }} />
        </div>
        <div>
          <h1
            className="text-2xl font-bold text-[#F0F0FF]"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            Offer Letter Analyzer
          </h1>
          <p className="text-sm text-[#9090B8]" style={{ fontFamily: "'Inter', sans-serif" }}>
            Know every clause before you sign
          </p>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Main Content */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Input Card */}
          <div
            className="rounded-2xl p-6"
            style={{ background: "#0C0C14", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label
                  className="block text-xs font-semibold text-[#9090B8] mb-1.5 uppercase tracking-wider"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  Company (optional)
                </label>
                <div className="relative">
                  <Building2
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6060A0]"
                  />
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g. Acme Corp"
                    className="w-full pl-9 pr-3 py-2.5 outline-none placeholder:text-[#4040708]"
                    style={inputStyle}
                  />
                </div>
              </div>
              <div>
                <label
                  className="block text-xs font-semibold text-[#9090B8] mb-1.5 uppercase tracking-wider"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  Role (optional)
                </label>
                <div className="relative">
                  <Briefcase
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6060A0]"
                  />
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="e.g. Senior Engineer"
                    className="w-full pl-9 pr-3 py-2.5 outline-none placeholder:text-[#404070]"
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>

            <div>
              <label
                className="block text-xs font-semibold text-[#9090B8] mb-1.5 uppercase tracking-wider"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                Offer Letter Text
              </label>
              <textarea
                value={offerText}
                onChange={(e) => setOfferText(e.target.value)}
                rows={20}
                placeholder="Paste your offer letter text here…"
                className="w-full p-4 outline-none resize-none placeholder:text-[#404070] leading-relaxed"
                style={{ ...inputStyle, borderRadius: "10px" }}
              />
              <p
                className="text-xs text-[#4040A0] mt-1"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                {offerText.length.toLocaleString()} / 20,000 characters
              </p>
            </div>

            <button
              onClick={handleSubmit}
              disabled={offerText.trim().length < 100 || analyzeMutation.isPending}
              className="mt-4 w-full py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{
                background: "linear-gradient(135deg, #7C3AED, #6D28D9)",
                color: "#F0F0FF",
                fontFamily: "'Inter', sans-serif",
                boxShadow: analyzeMutation.isPending ? "none" : "0 0 24px rgba(124,58,237,0.3)",
              }}
            >
              {analyzeMutation.isPending ? (
                <>
                  <div
                    className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                    style={{ borderColor: "rgba(240,240,255,0.4)", borderTopColor: "transparent" }}
                  />
                  Analyzing offer letter…
                </>
              ) : (
                <>
                  <FileSearch size={16} />
                  Analyze Offer Letter
                </>
              )}
            </button>

            {analyzeMutation.isError && (
              <div
                className="mt-3 p-3 rounded-lg flex items-center gap-2"
                style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)" }}
              >
                <XCircle size={14} className="text-[#F87171]" />
                <p
                  className="text-sm text-[#F87171]"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  Analysis failed. Please try again.
                </p>
              </div>
            )}
          </div>

          {/* Results */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.4 }}
                className="space-y-6"
              >
                {/* ── 1. Health Score Hero ─────────────────────────────────── */}
                <div
                  className="rounded-2xl p-6"
                  style={{ background: "#0C0C14", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <div className="flex flex-col md:flex-row items-center gap-8">
                    <CircleScore
                      score={result.offer_health_score}
                      verdict={result.overall_verdict}
                    />
                    <div className="flex-1">
                      <h3
                        className="text-xl font-bold text-[#F0F0FF] mb-2"
                        style={{ fontFamily: "'Inter', sans-serif" }}
                      >
                        Offer Health Summary
                      </h3>
                      <p
                        className="text-sm text-[#9090B8] mb-4 leading-relaxed"
                        style={{ fontFamily: "'Inter', sans-serif" }}
                      >
                        {result.summary}
                      </p>
                      <div
                        className="p-4 rounded-xl"
                        style={{
                          background: "rgba(124,58,237,0.06)",
                          border: "1px solid rgba(124,58,237,0.2)",
                        }}
                      >
                        <p
                          className="text-xs font-semibold text-[#C4B5FD] mb-1 uppercase tracking-wider"
                          style={{ fontFamily: "'Inter', sans-serif" }}
                        >
                          Attorney Recommendation
                        </p>
                        <p
                          className="text-sm text-[#E0E0F0] leading-relaxed"
                          style={{ fontFamily: "'Inter', sans-serif" }}
                        >
                          {result.recommendation}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── 2. Compensation Breakdown ─────────────────────────────── */}
                <div
                  className="rounded-2xl p-6"
                  style={{ background: "#0C0C14", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <SectionHeader icon={<TrendingUp size={15} style={{ color: "#8B5CF6" }} />} title="Compensation Breakdown" />

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm" style={{ fontFamily: "'Inter', sans-serif" }}>
                      <thead>
                        <tr className="border-b border-[rgba(255,255,255,0.06)]">
                          <th className="text-left pb-2 text-xs font-semibold text-[#6060A0] uppercase tracking-wider">
                            Component
                          </th>
                          <th className="text-left pb-2 text-xs font-semibold text-[#6060A0] uppercase tracking-wider">
                            Value
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[rgba(255,255,255,0.04)]">
                        {[
                          { label: "Base Salary", value: result.compensation.base_salary },
                          { label: "Bonus", value: result.compensation.bonus },
                          { label: "Equity", value: result.compensation.equity },
                          { label: "Signing Bonus", value: result.compensation.signing_bonus },
                          {
                            label: "Total Comp Estimate",
                            value: result.compensation.total_comp_estimate,
                            highlight: true,
                          },
                        ].map((row) => (
                          <tr key={row.label}>
                            <td className="py-2.5 text-[#9090B8]">{row.label}</td>
                            <td
                              className="py-2.5 font-medium"
                              style={{ color: row.highlight ? "#34D399" : "#F0F0FF" }}
                            >
                              {row.value}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <span className="text-xs text-[#9090B8]" style={{ fontFamily: "'Inter', sans-serif" }}>
                      Market Assessment:
                    </span>
                    <span
                      className="px-2 py-0.5 rounded text-xs font-semibold"
                      style={{
                        color: result.compensation.compensation_assessment
                          .toLowerCase()
                          .includes("above")
                          ? "#34D399"
                          : result.compensation.compensation_assessment
                              .toLowerCase()
                              .includes("below")
                          ? "#F87171"
                          : "#FBBF24",
                        background: "rgba(255,255,255,0.06)",
                        fontFamily: "'Inter', sans-serif",
                      }}
                    >
                      {result.compensation.compensation_assessment}
                    </span>
                  </div>

                  {/* Equity sub-section */}
                  {(result.equity_analysis.grant_amount !== "N/A" &&
                    result.equity_analysis.grant_amount !== "") && (
                    <div
                      className="mt-4 p-4 rounded-xl"
                      style={{
                        background: "rgba(11,11,20,0.6)",
                        border: `1px solid ${result.equity_analysis.is_standard ? "rgba(52,211,153,0.2)" : "rgba(251,191,36,0.25)"}`,
                      }}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Star size={14} style={{ color: "#8B5CF6" }} />
                        <p
                          className="text-sm font-semibold text-[#F0F0FF]"
                          style={{ fontFamily: "'Inter', sans-serif" }}
                        >
                          Equity Analysis
                        </p>
                        <span
                          className="ml-auto text-xs px-2 py-0.5 rounded"
                          style={{
                            color: result.equity_analysis.is_standard ? "#34D399" : "#FBBF24",
                            background: result.equity_analysis.is_standard
                              ? "rgba(52,211,153,0.08)"
                              : "rgba(251,191,36,0.08)",
                            fontFamily: "'Inter', sans-serif",
                          }}
                        >
                          {result.equity_analysis.is_standard ? "Standard Structure" : "Non-Standard"}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm mb-3">
                        {[
                          ["Grant", result.equity_analysis.grant_amount],
                          ["Vesting", result.equity_analysis.vesting_schedule],
                          ["Cliff", result.equity_analysis.cliff],
                          ["Acceleration", result.equity_analysis.acceleration],
                          ...(result.equity_analysis.strike_price
                            ? [["Strike Price", result.equity_analysis.strike_price]]
                            : []),
                        ].map(([label, value]) => (
                          <div key={label}>
                            <span className="text-[#6060A0]" style={{ fontFamily: "'Inter', sans-serif" }}>
                              {label}:{" "}
                            </span>
                            <span className="text-[#E0E0F0]" style={{ fontFamily: "'Inter', sans-serif" }}>
                              {value}
                            </span>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-[#9090B8]" style={{ fontFamily: "'Inter', sans-serif" }}>
                        {result.equity_analysis.assessment}
                      </p>
                      {result.equity_analysis.concerns.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {result.equity_analysis.concerns.map((c, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-1.5 text-xs text-[#FBBF24]"
                              style={{ fontFamily: "'Inter', sans-serif" }}
                            >
                              <AlertTriangle size={11} className="mt-0.5 flex-shrink-0" />
                              {c}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>

                {/* ── 3. Clause Analysis ────────────────────────────────────── */}
                <div
                  className="rounded-2xl p-6"
                  style={{ background: "#0C0C14", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <SectionHeader
                    icon={<Shield size={15} style={{ color: "#8B5CF6" }} />}
                    title="Clause Analysis"
                    count={result.clauses.length}
                  />
                  <div className="space-y-3">
                    {result.clauses.map((clause, i) => (
                      <ClauseCard key={i} clause={clause} />
                    ))}
                  </div>
                </div>

                {/* ── 4. Red Flags ──────────────────────────────────────────── */}
                {sortedRedFlags.length > 0 && (
                  <div
                    className="rounded-2xl p-6"
                    style={{
                      background: "#0C0C14",
                      border: "1px solid rgba(248,113,113,0.2)",
                    }}
                  >
                    <SectionHeader
                      icon={<XCircle size={15} style={{ color: "#F87171" }} />}
                      title="Red Flags"
                      count={sortedRedFlags.length}
                    />
                    <div className="space-y-3">
                      {sortedRedFlags.map((flag, i) => (
                        <RedFlagCard key={i} flag={flag} />
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Favorable Terms ───────────────────────────────────────── */}
                {result.favorable_terms.length > 0 && (
                  <div
                    className="rounded-2xl p-6"
                    style={{ background: "#0C0C14", border: "1px solid rgba(52,211,153,0.15)" }}
                  >
                    <SectionHeader
                      icon={<CheckCircle2 size={15} style={{ color: "#34D399" }} />}
                      title="Favorable Terms"
                      count={result.favorable_terms.length}
                    />
                    <ul className="space-y-2">
                      {result.favorable_terms.map((term, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-sm text-[#C0C0E0]"
                          style={{ fontFamily: "'Inter', sans-serif" }}
                        >
                          <CheckCircle2
                            size={14}
                            className="mt-0.5 flex-shrink-0"
                            style={{ color: "#34D399" }}
                          />
                          {term}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* ── 5. Negotiation Opportunities ─────────────────────────── */}
                {result.negotiation_opportunities.length > 0 && (
                  <div
                    className="rounded-2xl p-6"
                    style={{ background: "#0C0C14", border: "1px solid rgba(124,58,237,0.2)" }}
                  >
                    <SectionHeader
                      icon={<MessageSquare size={15} style={{ color: "#8B5CF6" }} />}
                      title="Negotiation Opportunities"
                      count={result.negotiation_opportunities.length}
                    />
                    <div className="space-y-4">
                      {result.negotiation_opportunities.map((opp, i) => (
                        <NegotiationCard key={i} opp={opp} />
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Questions to ask HR ───────────────────────────────────── */}
                {result.questions_to_ask_hr.length > 0 && (
                  <div
                    className="rounded-2xl p-6"
                    style={{ background: "#0C0C14", border: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <SectionHeader
                      icon={<HelpCircle size={15} style={{ color: "#8B5CF6" }} />}
                      title="Questions to Ask HR"
                      count={result.questions_to_ask_hr.length}
                    />
                    <ul className="space-y-2">
                      {result.questions_to_ask_hr.map((q, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <button
                            onClick={() => toggleQuestion(i)}
                            className="mt-0.5 flex-shrink-0 w-4 h-4 rounded border transition-all"
                            style={{
                              background: checkedQuestions.has(i)
                                ? "#7C3AED"
                                : "transparent",
                              borderColor: checkedQuestions.has(i)
                                ? "#7C3AED"
                                : "rgba(255,255,255,0.2)",
                            }}
                          >
                            {checkedQuestions.has(i) && (
                              <Check size={10} className="text-white m-auto" />
                            )}
                          </button>
                          <span
                            className="text-sm leading-relaxed"
                            style={{
                              color: checkedQuestions.has(i) ? "#4040A0" : "#C0C0E0",
                              textDecoration: checkedQuestions.has(i) ? "line-through" : "none",
                              fontFamily: "'Inter', sans-serif",
                              transition: "color 0.2s",
                            }}
                          >
                            {q}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar — Past Analyses */}
        <div className="w-64 flex-shrink-0">
          <div
            className="rounded-2xl p-4 sticky top-6"
            style={{ background: "#0C0C14", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Clock size={14} style={{ color: "#8B5CF6" }} />
              <h3
                className="text-sm font-semibold text-[#F0F0FF]"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                Past Analyses
              </h3>
            </div>

            {historyQuery.isPending && (
              <div className="space-y-2">
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className="h-16 rounded-lg animate-pulse"
                    style={{ background: "rgba(255,255,255,0.04)" }}
                  />
                ))}
              </div>
            )}

            {!historyQuery.isPending && history.length === 0 && (
              <p
                className="text-xs text-[#4040A0] text-center py-4"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                No analyses yet
              </p>
            )}

            <div className="space-y-2">
              {history.map((item) => {
                const color = scoreColor(item.offer_health_score);
                const isActive = result?.id === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setResult(item);
                      setCheckedQuestions(new Set());
                    }}
                    className="w-full text-left p-3 rounded-xl transition-all"
                    style={{
                      background: isActive
                        ? "rgba(124,58,237,0.12)"
                        : "rgba(255,255,255,0.03)",
                      border: `1px solid ${isActive ? "rgba(124,58,237,0.3)" : "rgba(255,255,255,0.05)"}`,
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className="text-xs font-semibold text-[#F0F0FF] truncate max-w-[120px]"
                        style={{ fontFamily: "'Inter', sans-serif" }}
                      >
                        {item.company}
                      </span>
                      <span
                        className="text-sm font-bold"
                        style={{ color, fontFamily: "'Inter', sans-serif" }}
                      >
                        {item.offer_health_score}
                      </span>
                    </div>
                    <p
                      className="text-xs text-[#6060A0] truncate"
                      style={{ fontFamily: "'Inter', sans-serif" }}
                    >
                      {item.role}
                    </p>
                    <p
                      className="text-xs text-[#404060] mt-0.5"
                      style={{ fontFamily: "'Inter', sans-serif" }}
                    >
                      {formatDate(item.analyzedAt)}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
