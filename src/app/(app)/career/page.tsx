"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import {
  Compass,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  Square,
  BarChart2,
  Star,
  Target,
  Zap,
  Clock,
  Building2,
  Sparkles,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Milestone1 {
  month: string;
  action: string;
  outcome: string;
}

interface Milestone3 {
  period: string;
  action: string;
  outcome: string;
}

interface Year1Phase {
  title: string;
  goal: string;
  milestones: Milestone1[];
  skills_to_acquire: string[];
  target_roles: string[];
  companies_to_target: string[];
}

interface Year3Phase {
  title: string;
  goal: string;
  milestones: Milestone3[];
  skills_to_acquire: string[];
  target_roles: string[];
  companies_to_target: string[];
}

interface Year5Phase {
  title: string;
  goal: string;
  vision: string;
  target_roles: string[];
  compensation_range: string;
}

interface GapAnalysis {
  current_level: string;
  target_level: string;
  difficulty: "easy" | "moderate" | "challenging" | "very-challenging";
  key_gaps: string[];
}

interface CareerRoadmap {
  gap_analysis: GapAnalysis;
  year_1: Year1Phase;
  year_3: Year3Phase;
  year_5: Year5Phase;
  quick_wins: string[];
  success_metrics: string[];
}

interface CareerPlan {
  id: string;
  currentRole: string;
  targetRole: string;
  currentIndustry?: string;
  targetIndustry?: string;
  roadmap: CareerRoadmap;
  generatedAt: string;
}

interface GenerateResponse {
  plan: CareerPlan;
}

interface PlansResponse {
  plans: CareerPlan[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DIFFICULTY_CONFIG: Record<
  "easy" | "moderate" | "challenging" | "very-challenging",
  { label: string; color: string; bg: string; border: string }
> = {
  easy: {
    label: "Easy",
    color: "#34D399",
    bg: "rgba(52,211,153,0.10)",
    border: "rgba(52,211,153,0.25)",
  },
  moderate: {
    label: "Moderate",
    color: "#FBBF24",
    bg: "rgba(251,191,36,0.10)",
    border: "rgba(251,191,36,0.25)",
  },
  challenging: {
    label: "Challenging",
    color: "#FB923C",
    bg: "rgba(251,146,60,0.10)",
    border: "rgba(251,146,60,0.25)",
  },
  "very-challenging": {
    label: "Very Challenging",
    color: "#F87171",
    bg: "rgba(248,113,113,0.10)",
    border: "rgba(248,113,113,0.25)",
  },
};

// ─── Shared styles ────────────────────────────────────────────────────────────

const inputCls =
  "w-full px-4 py-2.5 rounded-xl text-[14px] outline-none transition-all";
const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.07)",
  color: "#F0F0FF",
  fontFamily: "'Inter', sans-serif",
};
const labelCls = "block text-[12px] font-medium mb-1.5";
const labelStyle: React.CSSProperties = {
  color: "#9090B8",
  fontFamily: "'Inter', sans-serif",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function DifficultyBadge({
  difficulty,
}: {
  difficulty: "easy" | "moderate" | "challenging" | "very-challenging";
}) {
  const cfg = DIFFICULTY_CONFIG[difficulty];
  return (
    <span
      className="text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-widest"
      style={{
        color: cfg.color,
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        fontFamily: "monospace, monospace",
      }}
    >
      {cfg.label}
    </span>
  );
}

function SkillChip({ label }: { label: string }) {
  return (
    <span
      className="text-[12px] px-2.5 py-1 rounded-lg"
      style={{
        background: "rgba(124,58,237,0.10)",
        color: "#8B5CF6",
        border: "1px solid rgba(124,58,237,0.20)",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {label}
    </span>
  );
}

function CompanyPill({ label }: { label: string }) {
  return (
    <span
      className="text-[12px] px-2.5 py-1 rounded-lg"
      style={{
        background: "rgba(255,255,255,0.04)",
        color: "#9090B8",
        border: "1px solid rgba(255,255,255,0.07)",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {label}
    </span>
  );
}

function SectionHeader({
  icon: Icon,
  title,
}: {
  icon: React.ElementType;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon size={14} style={{ color: "#8B5CF6" }} />
      <p
        className="text-[11px] font-bold uppercase tracking-widest"
        style={{ color: "#9090B8", fontFamily: "monospace, monospace" }}
      >
        {title}
      </p>
    </div>
  );
}

// ─── Gap Analysis Banner ──────────────────────────────────────────────────────

function GapAnalysisBanner({ gap }: { gap: GapAnalysis }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="rounded-xl p-5"
      style={{
        background: "#0C0C14",
        border: "1px solid rgba(124,58,237,0.25)",
      }}
    >
      <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
        <div>
          <p
            className="text-[11px] font-bold uppercase tracking-widest mb-1"
            style={{ color: "#9090B8", fontFamily: "monospace, monospace" }}
          >
            Gap Analysis
          </p>
          <div className="flex items-center gap-2 text-[13px]" style={{ fontFamily: "'Inter', sans-serif" }}>
            <span style={{ color: "#9090B8" }}>{gap.current_level}</span>
            <ArrowRight size={13} style={{ color: "#3A3A60" }} />
            <span style={{ color: "#F0F0FF" }}>{gap.target_level}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="text-[12px]"
            style={{ color: "#9090B8", fontFamily: "'Inter', sans-serif" }}
          >
            {gap.key_gaps.length} gaps identified
          </span>
          <DifficultyBadge difficulty={gap.difficulty} />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {gap.key_gaps.map((g, i) => (
          <span
            key={i}
            className="text-[12px] px-2.5 py-1 rounded-lg"
            style={{
              background: "rgba(248,113,113,0.07)",
              color: "#F87171",
              border: "1px solid rgba(248,113,113,0.18)",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {g}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Phase Panel ──────────────────────────────────────────────────────────────

function PhasePanel({
  phase,
  roadmap,
}: {
  phase: "year_1" | "year_3" | "year_5";
  roadmap: CareerRoadmap;
}) {
  if (phase === "year_1") {
    const y = roadmap.year_1;
    return (
      <div className="space-y-5">
        <p
          className="text-[13px] leading-relaxed"
          style={{ color: "#9090B8", fontFamily: "'Inter', sans-serif" }}
        >
          {y.goal}
        </p>

        {/* Milestones */}
        <div>
          <SectionHeader icon={Clock} title="Milestones" />
          <div className="relative ml-2">
            <div
              className="absolute left-0 top-0 bottom-0 w-px"
              style={{ background: "rgba(124,58,237,0.25)" }}
            />
            <div className="space-y-4 pl-6">
              {y.milestones.map((m, i) => (
                <div key={i} className="relative">
                  <div
                    className="absolute -left-[25px] top-1 w-2 h-2 rounded-full"
                    style={{ background: "#7C3AED" }}
                  />
                  <p
                    className="text-[10px] font-bold uppercase tracking-widest mb-0.5"
                    style={{
                      color: "#7C3AED",
                      fontFamily: "monospace, monospace",
                    }}
                  >
                    {m.month}
                  </p>
                  <p
                    className="text-[13px] font-medium mb-0.5"
                    style={{
                      color: "#F0F0FF",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    {m.action}
                  </p>
                  <p
                    className="text-[12px]"
                    style={{
                      color: "#9090B8",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    {m.outcome}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Skills */}
        <div>
          <SectionHeader icon={Sparkles} title="Skills to Acquire" />
          <div className="flex flex-wrap gap-2">
            {y.skills_to_acquire.map((s, i) => (
              <SkillChip key={i} label={s} />
            ))}
          </div>
        </div>

        {/* Target Roles */}
        <div>
          <SectionHeader icon={Target} title="Target Roles" />
          <div className="space-y-1.5">
            {y.target_roles.map((r, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-[13px]"
                style={{ color: "#F0F0FF", fontFamily: "'Inter', sans-serif" }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: "#8B5CF6" }}
                />
                {r}
              </div>
            ))}
          </div>
        </div>

        {/* Companies */}
        <div>
          <SectionHeader icon={Building2} title="Companies to Target" />
          <div className="flex flex-wrap gap-2">
            {y.companies_to_target.map((c, i) => (
              <CompanyPill key={i} label={c} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (phase === "year_3") {
    const y = roadmap.year_3;
    return (
      <div className="space-y-5">
        <p
          className="text-[13px] leading-relaxed"
          style={{ color: "#9090B8", fontFamily: "'Inter', sans-serif" }}
        >
          {y.goal}
        </p>

        {/* Milestones */}
        <div>
          <SectionHeader icon={Clock} title="Milestones" />
          <div className="relative ml-2">
            <div
              className="absolute left-0 top-0 bottom-0 w-px"
              style={{ background: "rgba(124,58,237,0.25)" }}
            />
            <div className="space-y-4 pl-6">
              {y.milestones.map((m, i) => (
                <div key={i} className="relative">
                  <div
                    className="absolute -left-[25px] top-1 w-2 h-2 rounded-full"
                    style={{ background: "#7C3AED" }}
                  />
                  <p
                    className="text-[10px] font-bold uppercase tracking-widest mb-0.5"
                    style={{
                      color: "#7C3AED",
                      fontFamily: "monospace, monospace",
                    }}
                  >
                    {m.period}
                  </p>
                  <p
                    className="text-[13px] font-medium mb-0.5"
                    style={{
                      color: "#F0F0FF",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    {m.action}
                  </p>
                  <p
                    className="text-[12px]"
                    style={{
                      color: "#9090B8",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    {m.outcome}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Skills */}
        <div>
          <SectionHeader icon={Sparkles} title="Skills to Acquire" />
          <div className="flex flex-wrap gap-2">
            {y.skills_to_acquire.map((s, i) => (
              <SkillChip key={i} label={s} />
            ))}
          </div>
        </div>

        {/* Target Roles */}
        <div>
          <SectionHeader icon={Target} title="Target Roles" />
          <div className="space-y-1.5">
            {y.target_roles.map((r, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-[13px]"
                style={{ color: "#F0F0FF", fontFamily: "'Inter', sans-serif" }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: "#8B5CF6" }}
                />
                {r}
              </div>
            ))}
          </div>
        </div>

        {/* Companies */}
        <div>
          <SectionHeader icon={Building2} title="Companies to Target" />
          <div className="flex flex-wrap gap-2">
            {y.companies_to_target.map((c, i) => (
              <CompanyPill key={i} label={c} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // year_5
  const y = roadmap.year_5;
  return (
    <div className="space-y-5">
      <p
        className="text-[13px] leading-relaxed"
        style={{ color: "#9090B8", fontFamily: "'Inter', sans-serif" }}
      >
        {y.goal}
      </p>

      {/* Vision */}
      <div
        className="rounded-xl p-4"
        style={{
          background: "rgba(124,58,237,0.06)",
          border: "1px solid rgba(124,58,237,0.18)",
        }}
      >
        <p
          className="text-[11px] font-bold uppercase tracking-widest mb-2"
          style={{ color: "#8B5CF6", fontFamily: "monospace, monospace" }}
        >
          The Vision
        </p>
        <p
          className="text-[13px] leading-relaxed italic"
          style={{ color: "#F0F0FF", fontFamily: "'Inter', sans-serif" }}
        >
          {y.vision}
        </p>
      </div>

      {/* Target Roles */}
      <div>
        <SectionHeader icon={Target} title="Roles You'll Be Qualified For" />
        <div className="space-y-1.5">
          {y.target_roles.map((r, i) => (
            <div
              key={i}
              className="flex items-center gap-2 text-[13px]"
              style={{ color: "#F0F0FF", fontFamily: "'Inter', sans-serif" }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: "#8B5CF6" }}
              />
              {r}
            </div>
          ))}
        </div>
      </div>

      {/* Compensation */}
      <div
        className="rounded-xl p-4"
        style={{
          background: "rgba(52,211,153,0.06)",
          border: "1px solid rgba(52,211,153,0.18)",
        }}
      >
        <p
          className="text-[11px] font-bold uppercase tracking-widest mb-1"
          style={{ color: "#34D399", fontFamily: "monospace, monospace" }}
        >
          Expected Compensation
        </p>
        <p
          className="text-[16px] font-bold"
          style={{ color: "#F0F0FF", fontFamily: "monospace, monospace" }}
        >
          {y.compensation_range}
        </p>
      </div>
    </div>
  );
}

// ─── Timeline ─────────────────────────────────────────────────────────────────

function RoadmapTimeline({ roadmap }: { roadmap: CareerRoadmap }) {
  const [activePhase, setActivePhase] = useState<"year_1" | "year_3" | "year_5">(
    "year_1"
  );

  const nodes: {
    id: "year_1" | "year_3" | "year_5";
    label: string;
    sublabel: string;
    title: string;
  }[] = [
    {
      id: "year_1",
      label: "1 Year",
      sublabel: "Foundation",
      title: roadmap.year_1.title,
    },
    {
      id: "year_3",
      label: "3 Years",
      sublabel: "Growth",
      title: roadmap.year_3.title,
    },
    {
      id: "year_5",
      label: "5 Years",
      sublabel: "Destination",
      title: roadmap.year_5.title,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Horizontal timeline */}
      <div className="relative flex items-center justify-between px-4 py-6">
        {/* Connector line */}
        <div
          className="absolute left-8 right-8 top-1/2 -translate-y-1/2 h-px"
          style={{ background: "rgba(124,58,237,0.25)" }}
        />

        {nodes.map((node) => {
          const active = activePhase === node.id;
          return (
            <button
              key={node.id}
              onClick={() => setActivePhase(node.id)}
              className="relative flex flex-col items-center gap-2 z-10 transition-all"
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center transition-all"
                style={{
                  background: active
                    ? "#7C3AED"
                    : "rgba(124,58,237,0.12)",
                  border: `2px solid ${active ? "#8B5CF6" : "rgba(124,58,237,0.30)"}`,
                  boxShadow: active
                    ? "0 0 20px rgba(124,58,237,0.50)"
                    : "none",
                }}
              >
                <TrendingUp
                  size={16}
                  style={{ color: active ? "#fff" : "#8B5CF6" }}
                />
              </div>
              <div className="text-center">
                <p
                  className="text-[12px] font-bold"
                  style={{
                    color: active ? "#F0F0FF" : "#9090B8",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  {node.label}
                </p>
                <p
                  className="text-[10px]"
                  style={{
                    color: active ? "#8B5CF6" : "#3A3A60",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  {node.title}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Phase content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activePhase}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.22 }}
          className="rounded-xl p-6"
          style={{
            background: "#0C0C14",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3
              className="text-[15px] font-bold"
              style={{ color: "#F0F0FF", fontFamily: "'Inter', sans-serif" }}
            >
              {activePhase === "year_1"
                ? roadmap.year_1.title
                : activePhase === "year_3"
                ? roadmap.year_3.title
                : roadmap.year_5.title}
            </h3>
          </div>
          <PhasePanel phase={activePhase} roadmap={roadmap} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ─── Quick Wins ───────────────────────────────────────────────────────────────

function QuickWins({ wins }: { wins: string[] }) {
  const [checked, setChecked] = useState<Set<number>>(new Set());

  const toggle = (i: number) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.1 }}
      className="rounded-xl p-5"
      style={{
        background: "#0C0C14",
        border: "1px solid rgba(251,191,36,0.20)",
      }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Zap size={15} style={{ color: "#FBBF24" }} />
        <p
          className="text-[14px] font-bold"
          style={{ color: "#F0F0FF", fontFamily: "'Inter', sans-serif" }}
        >
          This Week — Quick Wins
        </p>
      </div>
      <div className="space-y-2.5">
        {wins.map((win, i) => {
          const done = checked.has(i);
          return (
            <button
              key={i}
              onClick={() => toggle(i)}
              className="w-full flex items-start gap-3 text-left transition-opacity"
              style={{ opacity: done ? 0.5 : 1 }}
            >
              {done ? (
                <CheckSquare
                  size={16}
                  className="flex-shrink-0 mt-0.5"
                  style={{ color: "#34D399" }}
                />
              ) : (
                <Square
                  size={16}
                  className="flex-shrink-0 mt-0.5"
                  style={{ color: "#3A3A60" }}
                />
              )}
              <span
                className="text-[13px]"
                style={{
                  color: done ? "#9090B8" : "#F0F0FF",
                  fontFamily: "'Inter', sans-serif",
                  textDecoration: done ? "line-through" : "none",
                }}
              >
                {win}
              </span>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}

// ─── Success Metrics ──────────────────────────────────────────────────────────

function SuccessMetrics({ metrics }: { metrics: string[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.15 }}
      className="rounded-xl p-5"
      style={{
        background: "#0C0C14",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="flex items-center gap-2 mb-4">
        <BarChart2 size={15} style={{ color: "#8B5CF6" }} />
        <p
          className="text-[14px] font-bold"
          style={{ color: "#F0F0FF", fontFamily: "'Inter', sans-serif" }}
        >
          Success Metrics
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {metrics.map((m, i) => (
          <div
            key={i}
            className="flex items-start gap-2.5 p-3 rounded-xl"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <Star
              size={12}
              className="flex-shrink-0 mt-0.5"
              style={{ color: "#8B5CF6" }}
            />
            <span
              className="text-[12px]"
              style={{ color: "#9090B8", fontFamily: "'Inter', sans-serif" }}
            >
              {m}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── History Item ─────────────────────────────────────────────────────────────

function HistoryItem({
  plan,
  onSelect,
  isActive,
}: {
  plan: CareerPlan;
  onSelect: () => void;
  isActive: boolean;
}) {
  const diff = plan.roadmap.gap_analysis.difficulty;
  const cfg = DIFFICULTY_CONFIG[diff];
  const date = new Date(plan.generatedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <button
      onClick={onSelect}
      className="w-full text-left p-3.5 rounded-xl transition-all"
      style={{
        background: isActive
          ? "rgba(124,58,237,0.10)"
          : "rgba(255,255,255,0.02)",
        border: isActive
          ? "1px solid rgba(124,58,237,0.28)"
          : "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <div
          className="flex items-center gap-1.5 text-[13px] font-medium min-w-0"
          style={{ color: "#F0F0FF", fontFamily: "'Inter', sans-serif" }}
        >
          <span className="truncate">{plan.currentRole}</span>
          <ArrowRight size={12} style={{ color: "#3A3A60", flexShrink: 0 }} />
          <span className="truncate">{plan.targetRole}</span>
        </div>
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
          style={{
            color: cfg.color,
            background: cfg.bg,
            border: `1px solid ${cfg.border}`,
            fontFamily: "monospace, monospace",
          }}
        >
          {cfg.label}
        </span>
      </div>
      <p
        className="text-[11px]"
        style={{ color: "#3A3A60", fontFamily: "'Inter', sans-serif" }}
      >
        {date}
      </p>
    </button>
  );
}

// ─── Roadmap Results ──────────────────────────────────────────────────────────

function RoadmapResults({ plan }: { plan: CareerPlan }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-5"
    >
      <GapAnalysisBanner gap={plan.roadmap.gap_analysis} />
      <RoadmapTimeline roadmap={plan.roadmap} />
      <QuickWins wins={plan.roadmap.quick_wins} />
      <SuccessMetrics metrics={plan.roadmap.success_metrics} />
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CareerPage() {
  const [currentRole, setCurrentRole] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [currentIndustry, setCurrentIndustry] = useState("");
  const [targetIndustry, setTargetIndustry] = useState("");
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(true);

  // Fetch saved plans
  const plansQuery = useQuery<PlansResponse, Error>({
    queryKey: ["career-plans"],
    queryFn: () => apiFetch<PlansResponse>("/api/career"),
  });

  const plans = plansQuery.data?.plans ?? [];

  // Active plan: either from history selection or the freshly generated one
  const [freshPlan, setFreshPlan] = useState<CareerPlan | null>(null);

  const activePlan =
    activePlanId !== null
      ? (plans.find((p) => p.id === activePlanId) ?? freshPlan)
      : freshPlan;

  const mutation = useMutation<GenerateResponse, Error>({
    mutationFn: () =>
      apiFetch<GenerateResponse>("/api/career", {
        method: "POST",
        body: JSON.stringify({
          currentRole,
          targetRole,
          currentIndustry: currentIndustry || undefined,
          targetIndustry: targetIndustry || undefined,
        }),
      }),
    onSuccess: (data) => {
      setFreshPlan(data.plan);
      setActivePlanId(null);
      plansQuery.refetch();
    },
  });

  const canGenerate = !mutation.isPending && currentRole.trim() && targetRole.trim();

  const handleHistorySelect = (plan: CareerPlan) => {
    setActivePlanId(plan.id);
    setFreshPlan(null);
  };

  return (
    <div
      className="max-w-4xl mx-auto px-4 py-8 space-y-6"
      style={{ background: "#060608", minHeight: "100vh" }}
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-3 mb-1">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: "rgba(124,58,237,0.12)",
              border: "1px solid rgba(124,58,237,0.25)",
            }}
          >
            <Compass size={20} style={{ color: "#8B5CF6" }} />
          </div>
          <div>
            <h1
              className="text-[22px] font-bold"
              style={{ color: "#F0F0FF", fontFamily: "'Inter', sans-serif" }}
            >
              Career Path Planner
            </h1>
            <p
              className="text-[13px]"
              style={{ color: "#9090B8", fontFamily: "'Inter', sans-serif" }}
            >
              Map your journey to your dream role with AI guidance
            </p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        {/* Left column: input + history */}
        <div className="space-y-4">
          {/* Input card */}
          <div
            className="rounded-xl p-5 space-y-4"
            style={{
              background: "#0C0C14",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <p
              className="text-[13px] font-semibold"
              style={{ color: "#F0F0FF", fontFamily: "'Inter', sans-serif" }}
            >
              Define Your Transition
            </p>

            <div>
              <label className={labelCls} style={labelStyle}>
                Current Role *
              </label>
              <input
                type="text"
                value={currentRole}
                onChange={(e) => setCurrentRole(e.target.value)}
                placeholder="e.g. Software Engineer"
                className={inputCls}
                style={inputStyle}
              />
            </div>

            <div>
              <label className={labelCls} style={labelStyle}>
                Target Role *
              </label>
              <input
                type="text"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="e.g. VP of Engineering"
                className={inputCls}
                style={inputStyle}
              />
            </div>

            <div>
              <label className={labelCls} style={labelStyle}>
                Current Industry
                <span style={{ color: "#3A3A60" }}> (optional)</span>
              </label>
              <input
                type="text"
                value={currentIndustry}
                onChange={(e) => setCurrentIndustry(e.target.value)}
                placeholder="e.g. FinTech"
                className={inputCls}
                style={inputStyle}
              />
            </div>

            <div>
              <label className={labelCls} style={labelStyle}>
                Target Industry
                <span style={{ color: "#3A3A60" }}> (optional)</span>
              </label>
              <input
                type="text"
                value={targetIndustry}
                onChange={(e) => setTargetIndustry(e.target.value)}
                placeholder="e.g. AI / ML"
                className={inputCls}
                style={inputStyle}
              />
            </div>

            <button
              onClick={() => mutation.mutate()}
              disabled={!canGenerate}
              className="w-full py-3 rounded-xl text-[14px] font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              style={{
                background: mutation.isPending
                  ? "rgba(124,58,237,0.5)"
                  : "#7C3AED",
                color: "#F0F0FF",
                fontFamily: "'Inter', sans-serif",
                boxShadow: mutation.isPending
                  ? "none"
                  : "0 0 20px rgba(124,58,237,0.3)",
              }}
            >
              {mutation.isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Generating roadmap…
                </>
              ) : (
                <>
                  <Compass size={16} />
                  Generate Roadmap
                </>
              )}
            </button>

            {mutation.isError && (
              <div
                className="flex items-center gap-2 p-3 rounded-xl text-[13px]"
                style={{
                  background: "rgba(248,113,113,0.08)",
                  color: "#F87171",
                  border: "1px solid rgba(248,113,113,0.2)",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                <AlertCircle size={14} />
                {mutation.error.message}
              </div>
            )}
          </div>

          {/* History */}
          {plans.length > 0 && (
            <div
              className="rounded-xl overflow-hidden"
              style={{ border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <button
                onClick={() => setShowHistory((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 transition-colors"
                style={{ background: "#0C0C14" }}
              >
                <p
                  className="text-[12px] font-bold uppercase tracking-widest"
                  style={{
                    color: "#9090B8",
                    fontFamily: "monospace, monospace",
                  }}
                >
                  History ({plans.length})
                </p>
                {showHistory ? (
                  <ChevronUp size={14} style={{ color: "#9090B8" }} />
                ) : (
                  <ChevronDown size={14} style={{ color: "#9090B8" }} />
                )}
              </button>

              <AnimatePresence>
                {showHistory && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div
                      className="p-3 space-y-2"
                      style={{ background: "rgba(255,255,255,0.01)" }}
                    >
                      {plans.map((plan) => (
                        <HistoryItem
                          key={plan.id}
                          plan={plan}
                          onSelect={() => handleHistorySelect(plan)}
                          isActive={activePlanId === plan.id}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Right column: results */}
        <div>
          <AnimatePresence mode="wait">
            {activePlan ? (
              <motion.div
                key={activePlan.id}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.25 }}
              >
                <RoadmapResults plan={activePlan} />
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-24 text-center"
              >
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                  style={{
                    background: "rgba(124,58,237,0.08)",
                    border: "1px solid rgba(124,58,237,0.18)",
                  }}
                >
                  <Compass size={28} style={{ color: "#3A3A60" }} />
                </div>
                <p
                  className="text-[14px] font-medium mb-1"
                  style={{
                    color: "#9090B8",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  Your roadmap will appear here
                </p>
                <p
                  className="text-[12px]"
                  style={{
                    color: "#3A3A60",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  Enter your roles and generate a 5-year career plan
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
