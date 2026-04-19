"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import {
  GraduationCap,
  Loader2,
  AlertCircle,
  TrendingUp,
  Clock,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Star,
  ChevronRight,
  BookOpen,
  Layers,
  History,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface CertificationOverview {
  full_name: string;
  issuer: string;
  difficulty: "beginner" | "intermediate" | "advanced" | "expert";
  study_hours: string;
  exam_cost: string;
  renewal_required: boolean;
  renewal_frequency?: string;
}

interface RoiAnalysis {
  salary_increase_estimate: string;
  break_even_months: number;
  "5_year_value": string;
  demand_trend: "surging" | "growing" | "stable" | "declining";
  hiring_priority: string;
}

interface Alternative {
  name: string;
  better_if: string;
  roi_comparison: string;
}

interface LearningStep {
  step: string;
  resource: string;
  duration: string;
  free: boolean;
}

interface Verdict {
  recommendation: "highly-recommended" | "recommended" | "situational" | "skip";
  reason: string;
  do_it_if: string;
  skip_if: string;
}

interface CertRoiResult {
  certification_overview: CertificationOverview;
  roi_analysis: RoiAnalysis;
  best_for_roles: string[];
  alternatives: Alternative[];
  learning_path: LearningStep[];
  verdict: Verdict;
}

interface StoredAnalysis {
  id: string;
  certification: string;
  targetRole?: string;
  currentSalary?: number;
  result: CertRoiResult;
  analyzedAt: string;
}

interface PostResponse {
  analysis: StoredAnalysis;
}

interface GetResponse {
  analyses: StoredAnalysis[];
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const VERDICT_CONFIG: Record<Verdict["recommendation"], { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  "highly-recommended": {
    label: "Highly Recommended",
    color: "#34D399",
    bg: "rgba(52,211,153,0.08)",
    border: "rgba(52,211,153,0.25)",
    icon: CheckCircle,
  },
  recommended: {
    label: "Recommended",
    color: "#A3E635",
    bg: "rgba(163,230,53,0.08)",
    border: "rgba(163,230,53,0.25)",
    icon: CheckCircle,
  },
  situational: {
    label: "Situational",
    color: "#FBBF24",
    bg: "rgba(251,191,36,0.08)",
    border: "rgba(251,191,36,0.25)",
    icon: AlertTriangle,
  },
  skip: {
    label: "Skip It",
    color: "#EF4444",
    bg: "rgba(239,68,68,0.08)",
    border: "rgba(239,68,68,0.25)",
    icon: XCircle,
  },
};

const DIFFICULTY_CONFIG: Record<CertificationOverview["difficulty"], { label: string; color: string }> = {
  beginner: { label: "Beginner", color: "#34D399" },
  intermediate: { label: "Intermediate", color: "#FBBF24" },
  advanced: { label: "Advanced", color: "#F97316" },
  expert: { label: "Expert", color: "#EF4444" },
};

const DEMAND_CONFIG: Record<RoiAnalysis["demand_trend"], { label: string; color: string }> = {
  surging: { label: "Surging", color: "#34D399" },
  growing: { label: "Growing", color: "#A3E635" },
  stable: { label: "Stable", color: "#FBBF24" },
  declining: { label: "Declining", color: "#EF4444" },
};

// ─── Shared Styles ─────────────────────────────────────────────────────────────

const cardStyle = {
  background: "#0C0C14",
  border: "1px solid rgba(255,255,255,0.06)",
};

const inputCls = "w-full px-4 py-2.5 rounded-xl text-[14px] outline-none transition-all";
const inputStyle = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.07)",
  color: "#F0F0FF",
  fontFamily: "'Inter', sans-serif",
};
const labelCls = "block text-[12px] font-medium mb-1.5";
const labelStyle = { color: "#9090B8", fontFamily: "'Inter', sans-serif" };

// ─── Sub-components ────────────────────────────────────────────────────────────

function VerdictBadge({ recommendation }: { recommendation: Verdict["recommendation"] }) {
  const cfg = VERDICT_CONFIG[recommendation];
  const Icon = cfg.icon;
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1 rounded-full"
      style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`, fontFamily: "monospace, monospace" }}
    >
      <Icon size={11} />
      {cfg.label.toUpperCase()}
    </span>
  );
}

function DifficultyBadge({ difficulty }: { difficulty: CertificationOverview["difficulty"] }) {
  const cfg = DIFFICULTY_CONFIG[difficulty];
  return (
    <span
      className="inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
      style={{
        color: cfg.color,
        background: `${cfg.color}18`,
        border: `1px solid ${cfg.color}40`,
        fontFamily: "monospace, monospace",
      }}
    >
      {cfg.label}
    </span>
  );
}

function DemandBadge({ demand_trend }: { demand_trend: RoiAnalysis["demand_trend"] }) {
  const cfg = DEMAND_CONFIG[demand_trend];
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
      style={{
        color: cfg.color,
        background: `${cfg.color}18`,
        border: `1px solid ${cfg.color}40`,
        fontFamily: "monospace, monospace",
      }}
    >
      <TrendingUp size={10} />
      {cfg.label}
    </span>
  );
}

function StatBox({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div
      className="rounded-xl p-4 text-center"
      style={{
        background: accent ? "rgba(124, 58, 237,0.07)" : "rgba(255,255,255,0.02)",
        border: `1px solid ${accent ? "rgba(124, 58, 237,0.2)" : "rgba(255,255,255,0.05)"}`,
      }}
    >
      <p className="text-[10px] uppercase tracking-widest mb-1.5" style={{ color: "#3A3A60", fontFamily: "monospace, monospace" }}>
        {label}
      </p>
      <p className="text-[22px] font-bold leading-none mb-1" style={{ color: accent ? "#8B5CF6" : "#F0F0FF", fontFamily: "monospace, monospace" }}>
        {value}
      </p>
      {sub && (
        <p className="text-[11px]" style={{ color: "#9090B8", fontFamily: "'Inter', sans-serif" }}>
          {sub}
        </p>
      )}
    </div>
  );
}

function ResultPanel({ data }: { data: StoredAnalysis }) {
  const { result } = data;
  const { certification_overview: overview, roi_analysis: roi, verdict } = result;
  const verdictCfg = VERDICT_CONFIG[verdict.recommendation];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      {/* ROI Hero */}
      <div className="rounded-xl p-6" style={{ background: "#0C0C14", border: "1px solid rgba(124, 58, 237,0.25)" }}>
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <p className="text-[11px] uppercase tracking-widest mb-1" style={{ color: "#9090B8", fontFamily: "monospace, monospace" }}>
              Analysis for
            </p>
            <h2 className="text-[18px] font-bold" style={{ color: "#F0F0FF", fontFamily: "'Inter', sans-serif" }}>
              {overview.full_name}
            </h2>
            <p className="text-[13px] mt-0.5" style={{ color: "#9090B8", fontFamily: "'Inter', sans-serif" }}>
              by {overview.issuer}
            </p>
          </div>
          <VerdictBadge recommendation={verdict.recommendation} />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <StatBox
            label="Break Even"
            value={String(roi.break_even_months)}
            sub="months"
            accent
          />
          <StatBox
            label="5-Year Value"
            value={roi["5_year_value"]}
          />
          <StatBox
            label="Salary Increase"
            value={roi.salary_increase_estimate}
          />
        </div>

        <div className="flex items-center gap-2 mt-4 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <DemandBadge demand_trend={roi.demand_trend} />
          <span className="text-[12px]" style={{ color: "#9090B8", fontFamily: "'Inter', sans-serif" }}>
            market demand
          </span>
        </div>
      </div>

      {/* Cert Overview */}
      <div className="rounded-xl p-5 space-y-3" style={cardStyle}>
        <h3 className="text-[13px] font-semibold flex items-center gap-2" style={{ color: "#F0F0FF", fontFamily: "'Inter', sans-serif" }}>
          <Layers size={14} style={{ color: "#8B5CF6" }} />
          Certification Details
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Difficulty", value: <DifficultyBadge difficulty={overview.difficulty} /> },
            { label: "Study Time", value: overview.study_hours, icon: Clock },
            { label: "Exam Cost", value: overview.exam_cost, icon: DollarSign },
            {
              label: "Renewal",
              value: overview.renewal_required
                ? (overview.renewal_frequency ?? "Required")
                : "No renewal needed",
            },
          ].map((row, i) => (
            <div key={i} className="rounded-lg p-3" style={{ background: "rgba(255,255,255,0.02)" }}>
              <p className="text-[10px] uppercase tracking-widest mb-1.5" style={{ color: "#3A3A60", fontFamily: "monospace, monospace" }}>
                {row.label}
              </p>
              {typeof row.value === "string" ? (
                <p className="text-[13px] font-medium" style={{ color: "#F0F0FF", fontFamily: "'Inter', sans-serif" }}>
                  {row.value}
                </p>
              ) : (
                row.value
              )}
            </div>
          ))}
        </div>
        <div className="rounded-lg p-3" style={{ background: "rgba(255,255,255,0.02)" }}>
          <p className="text-[10px] uppercase tracking-widest mb-1.5" style={{ color: "#3A3A60", fontFamily: "monospace, monospace" }}>
            Hiring Manager Priority
          </p>
          <p className="text-[13px] leading-relaxed" style={{ color: "#9090B8", fontFamily: "'Inter', sans-serif" }}>
            {roi.hiring_priority}
          </p>
        </div>
      </div>

      {/* Verdict */}
      <div
        className="rounded-xl p-5 space-y-4"
        style={{ background: verdictCfg.bg, border: `1px solid ${verdictCfg.border}` }}
      >
        <div className="flex items-center gap-2">
          <verdictCfg.icon size={16} style={{ color: verdictCfg.color }} />
          <h3 className="text-[14px] font-semibold" style={{ color: verdictCfg.color, fontFamily: "'Inter', sans-serif" }}>
            Verdict: {verdictCfg.label}
          </h3>
        </div>
        <p className="text-[13px] leading-relaxed" style={{ color: "#F0F0FF", fontFamily: "'Inter', sans-serif" }}>
          {verdict.reason}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-lg p-3" style={{ background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.15)" }}>
            <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: "#34D399", fontFamily: "monospace, monospace" }}>
              Do it if…
            </p>
            <p className="text-[12px] leading-relaxed" style={{ color: "#F0F0FF", fontFamily: "'Inter', sans-serif" }}>
              {verdict.do_it_if}
            </p>
          </div>
          <div className="rounded-lg p-3" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
            <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: "#EF4444", fontFamily: "monospace, monospace" }}>
              Skip if…
            </p>
            <p className="text-[12px] leading-relaxed" style={{ color: "#F0F0FF", fontFamily: "'Inter', sans-serif" }}>
              {verdict.skip_if}
            </p>
          </div>
        </div>
      </div>

      {/* Learning Path */}
      <div className="rounded-xl p-5 space-y-3" style={cardStyle}>
        <h3 className="text-[13px] font-semibold flex items-center gap-2" style={{ color: "#F0F0FF", fontFamily: "'Inter', sans-serif" }}>
          <BookOpen size={14} style={{ color: "#8B5CF6" }} />
          Learning Path
        </h3>
        <div className="space-y-0">
          {result.learning_path.map((step, i) => (
            <div key={i} className="flex gap-3">
              {/* Timeline */}
              <div className="flex flex-col items-center">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold"
                  style={{ background: "rgba(124, 58, 237,0.15)", color: "#8B5CF6", fontFamily: "monospace, monospace", border: "1px solid rgba(124, 58, 237,0.3)" }}
                >
                  {i + 1}
                </div>
                {i < result.learning_path.length - 1 && (
                  <div className="w-px flex-1 my-1" style={{ background: "rgba(255,255,255,0.05)", minHeight: "16px" }} />
                )}
              </div>
              {/* Content */}
              <div className="pb-4 flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium" style={{ color: "#F0F0FF", fontFamily: "'Inter', sans-serif" }}>
                      {step.step}
                    </p>
                    <p className="text-[12px]" style={{ color: "#9090B8", fontFamily: "'Inter', sans-serif" }}>
                      {step.resource}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                      style={{
                        background: step.free ? "rgba(52,211,153,0.1)" : "rgba(251,191,36,0.1)",
                        color: step.free ? "#34D399" : "#FBBF24",
                        border: `1px solid ${step.free ? "rgba(52,211,153,0.25)" : "rgba(251,191,36,0.25)"}`,
                        fontFamily: "monospace, monospace",
                      }}
                    >
                      {step.free ? "Free" : "Paid"}
                    </span>
                    <span className="text-[11px]" style={{ color: "#9090B8", fontFamily: "monospace, monospace" }}>
                      {step.duration}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Alternatives */}
      {result.alternatives.length > 0 && (
        <div className="rounded-xl p-5 space-y-3" style={cardStyle}>
          <h3 className="text-[13px] font-semibold flex items-center gap-2" style={{ color: "#F0F0FF", fontFamily: "'Inter', sans-serif" }}>
            <ChevronRight size={14} style={{ color: "#8B5CF6" }} />
            Alternatives to Consider
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {result.alternatives.map((alt, i) => (
              <div key={i} className="rounded-xl p-4 space-y-2" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <p className="text-[13px] font-semibold" style={{ color: "#F0F0FF", fontFamily: "'Inter', sans-serif" }}>
                  {alt.name}
                </p>
                <p className="text-[11px]" style={{ color: "#9090B8", fontFamily: "'Inter', sans-serif" }}>
                  <span style={{ color: "#8B5CF6" }}>Choose if: </span>
                  {alt.better_if}
                </p>
                <p className="text-[11px]" style={{ color: "#9090B8", fontFamily: "'Inter', sans-serif" }}>
                  {alt.roi_comparison}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Best For Roles */}
      {result.best_for_roles.length > 0 && (
        <div className="rounded-xl p-5 space-y-3" style={cardStyle}>
          <h3 className="text-[13px] font-semibold flex items-center gap-2" style={{ color: "#F0F0FF", fontFamily: "'Inter', sans-serif" }}>
            <Star size={14} style={{ color: "#8B5CF6" }} />
            Best For These Roles
          </h3>
          <div className="flex flex-wrap gap-2">
            {result.best_for_roles.map((role, i) => (
              <span
                key={i}
                className="text-[12px] px-3 py-1.5 rounded-full"
                style={{
                  background: "rgba(124, 58, 237,0.1)",
                  color: "#C4B5FD",
                  border: "1px solid rgba(124, 58, 237,0.2)",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                {role}
              </span>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function CertRoiPage() {
  const qc = useQueryClient();
  const [certification, setCertification] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [currentSalaryStr, setCurrentSalaryStr] = useState("");

  const { data: historyData } = useQuery<GetResponse>({
    queryKey: ["cert-roi"],
    queryFn: () => apiFetch<GetResponse>("/api/cert-roi"),
  });

  const analyses = historyData?.analyses ?? [];

  const mutation = useMutation<PostResponse, Error>({
    mutationFn: () => {
      const salary = currentSalaryStr ? Number(currentSalaryStr) : undefined;
      return apiFetch<PostResponse>("/api/cert-roi", {
        method: "POST",
        body: JSON.stringify({
          certification: certification.trim(),
          targetRole: targetRole.trim() || undefined,
          currentSalary: salary && !isNaN(salary) ? salary : undefined,
        }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cert-roi"] });
    },
  });

  const activeResult = mutation.data?.analysis ?? null;

  return (
    <div
      className="max-w-2xl mx-auto px-4 py-8 space-y-6"
      style={{ background: "#060608", minHeight: "100vh" }}
    >
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(124, 58, 237,0.12)", border: "1px solid rgba(124, 58, 237,0.25)" }}
          >
            <GraduationCap size={20} style={{ color: "#8B5CF6" }} />
          </div>
          <div>
            <h1 className="text-[22px] font-bold" style={{ color: "#F0F0FF", fontFamily: "'Inter', sans-serif" }}>
              Certification ROI
            </h1>
            <p className="text-[13px]" style={{ color: "#9090B8", fontFamily: "'Inter', sans-serif" }}>
              Find out if that cert is actually worth it
            </p>
          </div>
        </div>
      </motion.div>

      {/* Input Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-xl p-6 space-y-4"
        style={cardStyle}
      >
        <div>
          <label className={labelCls} style={labelStyle}>
            Certification name <span style={{ color: "#EF4444" }}>*</span>
          </label>
          <input
            type="text"
            value={certification}
            onChange={(e) => setCertification(e.target.value)}
            placeholder="e.g. AWS Solutions Architect, GCP ACE, CKA, PMP, CISSP…"
            className={inputCls}
            style={inputStyle}
            onKeyDown={(e) => e.key === "Enter" && certification.trim() && !mutation.isPending && mutation.mutate()}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls} style={labelStyle}>
              Target role <span style={{ color: "#3A3A60" }}>(optional)</span>
            </label>
            <input
              type="text"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder="e.g. Cloud Architect"
              className={inputCls}
              style={inputStyle}
            />
          </div>
          <div>
            <label className={labelCls} style={labelStyle}>
              Current salary (USD) <span style={{ color: "#3A3A60" }}>(optional)</span>
            </label>
            <input
              type="number"
              value={currentSalaryStr}
              onChange={(e) => setCurrentSalaryStr(e.target.value)}
              placeholder="e.g. 95000"
              min={0}
              className={inputCls}
              style={inputStyle}
            />
          </div>
        </div>

        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !certification.trim()}
          className="w-full py-3 rounded-xl text-[14px] font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          style={{
            background: mutation.isPending ? "rgba(124, 58, 237,0.5)" : "#7C3AED",
            color: "#F0F0FF",
            fontFamily: "'Inter', sans-serif",
            boxShadow: mutation.isPending ? "none" : "0 0 20px rgba(124, 58, 237,0.25)",
          }}
        >
          {mutation.isPending ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Calculating ROI…
            </>
          ) : (
            <>
              <TrendingUp size={16} />
              Calculate ROI
            </>
          )}
        </button>

        {mutation.isError && (
          <div
            className="flex items-center gap-2 p-3 rounded-xl text-[13px]"
            style={{ background: "rgba(239,68,68,0.08)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.2)" }}
          >
            <AlertCircle size={14} />
            {mutation.error.message}
          </div>
        )}
      </motion.div>

      {/* Results */}
      <AnimatePresence mode="wait">
        {activeResult && (
          <motion.div
            key={activeResult.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <ResultPanel data={activeResult} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Past Analyses */}
      {analyses.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl p-5 space-y-3"
          style={cardStyle}
        >
          <h3 className="text-[13px] font-semibold flex items-center gap-2" style={{ color: "#F0F0FF", fontFamily: "'Inter', sans-serif" }}>
            <History size={14} style={{ color: "#8B5CF6" }} />
            Past Analyses
          </h3>
          <div className="space-y-2">
            {analyses.map((a) => (
              <button
                key={a.id}
                onClick={() => mutation.reset()}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl transition-all hover:bg-white/[0.02]"
                style={{ border: "1px solid rgba(255,255,255,0.04)" }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <GraduationCap size={14} style={{ color: "#9090B8", flexShrink: 0 }} />
                  <div className="text-left min-w-0">
                    <p className="text-[13px] font-medium truncate" style={{ color: "#F0F0FF", fontFamily: "'Inter', sans-serif" }}>
                      {a.result.certification_overview.full_name}
                    </p>
                    <p className="text-[11px]" style={{ color: "#9090B8", fontFamily: "monospace, monospace" }}>
                      {new Date(a.analyzedAt).toLocaleDateString()}
                      {a.targetRole ? ` · ${a.targetRole}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <VerdictBadge recommendation={a.result.verdict.recommendation} />
                  <span className="text-[11px]" style={{ color: "#9090B8", fontFamily: "monospace, monospace" }}>
                    {a.result.roi_analysis.break_even_months}mo
                  </span>
                </div>
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
