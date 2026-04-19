"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import {
  Brain,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  ExternalLink,
  Loader2,
  History,
  Target,
  Zap,
  TrendingUp,
  Calendar,
} from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

// ─── Types ─────────────────────────────────────────────────────────────────────

type Relevance = "critical" | "important" | "nice-to-have";
type Importance = "critical" | "important" | "nice-to-have";
type ResourceType = "course" | "documentation" | "book" | "project" | "tutorial";
type SeniorityLevel = "junior" | "mid" | "senior" | "staff" | "principal";

interface LearningResource {
  name: string;
  type: ResourceType;
  url_hint: string;
}

interface MatchedSkill {
  skill: string;
  proficiency: string;
  relevance: Relevance;
}

interface MissingSkill {
  skill: string;
  importance: Importance;
  time_to_learn: string;
  learning_resources: LearningResource[];
}

interface GapAnalysis {
  matched_skills: MatchedSkill[];
  missing_skills: MissingSkill[];
  readiness_score: number;
  summary: string;
  priority_actions: string[];
  estimated_prep_time: string;
}

interface AnalysisRecord {
  id: string;
  targetRole: string;
  targetCompany: string | undefined;
  seniorityLevel: string;
  analysis: GapAnalysis;
  createdAt: string;
}

interface PostResponse {
  record: AnalysisRecord;
}

interface GetResponse {
  analyses: AnalysisRecord[];
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const SENIORITY_OPTIONS: { value: SeniorityLevel; label: string }[] = [
  { value: "junior", label: "Junior" },
  { value: "mid", label: "Mid-Level" },
  { value: "senior", label: "Senior" },
  { value: "staff", label: "Staff" },
  { value: "principal", label: "Principal" },
];

const RESOURCE_TYPE_ICONS: Record<ResourceType, string> = {
  course: "🎓",
  documentation: "📄",
  book: "📚",
  project: "🛠",
  tutorial: "▶️",
};

// ─── Helper: relevance / importance badge colors ───────────────────────────────

function relevanceBadge(level: Relevance | Importance): { bg: string; text: string; label: string } {
  switch (level) {
    case "critical":
      return { bg: "rgba(248,113,113,0.15)", text: "#F87171", label: "Critical" };
    case "important":
      return { bg: "rgba(251,191,36,0.15)", text: "#FBBF24", label: "Important" };
    case "nice-to-have":
      return { bg: "rgba(52,211,153,0.15)", text: "#34D399", label: "Nice to have" };
  }
}

// ─── Helper: readiness score color ────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 70) return "#34D399";
  if (score >= 40) return "#FBBF24";
  return "#F87171";
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function ReadinessGauge({ score }: { score: number }) {
  const color = scoreColor(score);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const progress = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-3">
      <div style={{ position: "relative", width: 140, height: 140 }}>
        <svg width={140} height={140} viewBox="0 0 140 140">
          {/* Background ring */}
          <circle
            cx={70}
            cy={70}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={14}
          />
          {/* Progress ring */}
          <circle
            cx={70}
            cy={70}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={14}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={progress}
            transform="rotate(-90 70 70)"
            style={{ transition: "stroke-dashoffset 1s ease, stroke 0.5s ease" }}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              fontFamily: "monospace, monospace",
              fontSize: 32,
              fontWeight: 700,
              color,
              lineHeight: 1,
            }}
          >
            {score}
          </span>
          <span style={{ fontSize: 11, color: "#9090B8", marginTop: 2 }}>/ 100</span>
        </div>
      </div>
      <span style={{ color: "#9090B8", fontSize: 13 }}>
        <span style={{ color, fontWeight: 600 }}>{score}% ready</span> for this role
      </span>
    </div>
  );
}

function RelevanceBadge({ level }: { level: Relevance | Importance }) {
  const { bg, text, label } = relevanceBadge(level);
  return (
    <span
      style={{
        background: bg,
        color: text,
        borderRadius: 6,
        padding: "2px 8px",
        fontSize: 11,
        fontWeight: 600,
        fontFamily: "monospace, monospace",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

function MatchedSkillCard({ skill }: { skill: MatchedSkill }) {
  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: "#0C0C14",
        border: "1px solid rgba(52,211,153,0.20)",
      }}
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={15} color="#34D399" />
          <span style={{ color: "#F0F0FF", fontSize: 14, fontWeight: 500 }}>{skill.skill}</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            style={{
              color: "#9090B8",
              fontSize: 11,
              fontFamily: "monospace, monospace",
              background: "rgba(255,255,255,0.05)",
              borderRadius: 6,
              padding: "2px 7px",
            }}
          >
            {skill.proficiency}
          </span>
          <RelevanceBadge level={skill.relevance} />
        </div>
      </div>
    </div>
  );
}

function MissingSkillCard({ skill }: { skill: MissingSkill }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="rounded-xl"
      style={{
        background: "#0C0C14",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <button
        className="w-full text-left"
        onClick={() => setOpen((v) => !v)}
        style={{ padding: "14px 16px" }}
      >
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} color="#9090B8" />
            <span style={{ color: "#F0F0FF", fontSize: 14, fontWeight: 500 }}>{skill.skill}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1" style={{ color: "#9090B8", fontSize: 12 }}>
              <Clock size={12} />
              <span>{skill.time_to_learn}</span>
            </div>
            <RelevanceBadge level={skill.importance} />
            {open ? (
              <ChevronUp size={14} color="#9090B8" />
            ) : (
              <ChevronDown size={14} color="#9090B8" />
            )}
          </div>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="resources"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: "hidden" }}
          >
            <div
              style={{
                padding: "0 16px 14px",
                borderTop: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <p style={{ color: "#9090B8", fontSize: 12, marginBottom: 10, marginTop: 12 }}>
                Learning resources
              </p>
              <div className="flex flex-col gap-2">
                {skill.learning_resources.map((res, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-lg"
                    style={{
                      background: "rgba(124,58,237,0.06)",
                      border: "1px solid rgba(124,58,237,0.15)",
                      padding: "10px 12px",
                    }}
                  >
                    <span style={{ fontSize: 16 }}>{RESOURCE_TYPE_ICONS[res.type]}</span>
                    <div className="flex-1 min-w-0">
                      <p style={{ color: "#F0F0FF", fontSize: 13, fontWeight: 500 }}>{res.name}</p>
                      <p
                        style={{
                          color: "#9090B8",
                          fontSize: 11,
                          marginTop: 2,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {res.url_hint}
                      </p>
                    </div>
                    <span
                      style={{
                        color: "#8B5CF6",
                        fontSize: 11,
                        fontFamily: "monospace, monospace",
                        background: "rgba(139,92,246,0.12)",
                        borderRadius: 6,
                        padding: "2px 7px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {res.type}
                    </span>
                    <ExternalLink size={12} color="#3A3A60" />
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AnalysisResults({ record }: { record: AnalysisRecord }) {
  const { analysis, targetRole, targetCompany, seniorityLevel } = record;
  const [checkedActions, setCheckedActions] = useState<Set<number>>(new Set());

  const toggleAction = (i: number) => {
    setCheckedActions((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const criticalMissing = analysis.missing_skills.filter((s) => s.importance === "critical");
  const otherMissing = analysis.missing_skills.filter((s) => s.importance !== "critical");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col gap-6"
    >
      {/* Role heading */}
      <div
        className="rounded-xl p-5"
        style={{ background: "#0C0C14", border: "1px solid rgba(124,58,237,0.25)" }}
      >
        <div className="flex items-center gap-2 mb-1">
          <Target size={15} color="#8B5CF6" />
          <span style={{ color: "#9090B8", fontSize: 12 }}>Analysis for</span>
        </div>
        <p style={{ color: "#F0F0FF", fontSize: 18, fontWeight: 700 }}>
          {seniorityLevel.charAt(0).toUpperCase() + seniorityLevel.slice(1)} {targetRole}
          {targetCompany && (
            <span style={{ color: "#9090B8", fontWeight: 400 }}> · {targetCompany}</span>
          )}
        </p>
      </div>

      {/* Readiness score + summary */}
      <div
        className="rounded-xl p-6"
        style={{ background: "#0C0C14", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex flex-col md:flex-row items-center gap-6">
          <ReadinessGauge score={analysis.readiness_score} />
          <div className="flex-1">
            <h3
              style={{
                color: "#F0F0FF",
                fontSize: 15,
                fontWeight: 600,
                marginBottom: 8,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Zap size={15} color="#8B5CF6" />
              AI Assessment
            </h3>
            <p style={{ color: "#9090B8", fontSize: 14, lineHeight: 1.7 }}>{analysis.summary}</p>
            <div
              className="flex gap-4 mt-4"
              style={{ fontFamily: "monospace, monospace", fontSize: 12 }}
            >
              <div>
                <span style={{ color: "#34D399", fontWeight: 700 }}>
                  {analysis.matched_skills.length}
                </span>
                <span style={{ color: "#9090B8" }}> matched</span>
              </div>
              <div>
                <span style={{ color: "#F87171", fontWeight: 700 }}>
                  {analysis.missing_skills.length}
                </span>
                <span style={{ color: "#9090B8" }}> gaps</span>
              </div>
              <div>
                <span style={{ color: "#FBBF24", fontWeight: 700 }}>
                  {criticalMissing.length}
                </span>
                <span style={{ color: "#9090B8" }}> critical</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Skills you have */}
      {analysis.matched_skills.length > 0 && (
        <section>
          <h3
            style={{
              color: "#F0F0FF",
              fontSize: 15,
              fontWeight: 600,
              marginBottom: 12,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <CheckCircle2 size={15} color="#34D399" />
            Skills You Have
            <span
              style={{
                fontFamily: "monospace, monospace",
                fontSize: 11,
                color: "#34D399",
                background: "rgba(52,211,153,0.12)",
                borderRadius: 6,
                padding: "2px 7px",
              }}
            >
              {analysis.matched_skills.length}
            </span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {analysis.matched_skills.map((skill, i) => (
              <MatchedSkillCard key={i} skill={skill} />
            ))}
          </div>
        </section>
      )}

      {/* Skills to develop */}
      {analysis.missing_skills.length > 0 && (
        <section>
          <h3
            style={{
              color: "#F0F0FF",
              fontSize: 15,
              fontWeight: 600,
              marginBottom: 12,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <TrendingUp size={15} color="#FBBF24" />
            Skills to Develop
            <span
              style={{
                fontFamily: "monospace, monospace",
                fontSize: 11,
                color: "#FBBF24",
                background: "rgba(251,191,36,0.12)",
                borderRadius: 6,
                padding: "2px 7px",
              }}
            >
              {analysis.missing_skills.length}
            </span>
          </h3>
          <div className="flex flex-col gap-3">
            {criticalMissing.map((skill, i) => (
              <MissingSkillCard key={`critical-${i}`} skill={skill} />
            ))}
            {otherMissing.map((skill, i) => (
              <MissingSkillCard key={`other-${i}`} skill={skill} />
            ))}
          </div>
        </section>
      )}

      {/* Priority actions */}
      {analysis.priority_actions.length > 0 && (
        <section>
          <h3
            style={{
              color: "#F0F0FF",
              fontSize: 15,
              fontWeight: 600,
              marginBottom: 12,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <BookOpen size={15} color="#8B5CF6" />
            Priority Actions
          </h3>
          <div
            className="rounded-xl p-5 flex flex-col gap-3"
            style={{ background: "#0C0C14", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            {analysis.priority_actions.map((action, i) => (
              <button
                key={i}
                className="flex items-start gap-3 text-left w-full"
                onClick={() => toggleAction(i)}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 6,
                    border: checkedActions.has(i)
                      ? "2px solid #8B5CF6"
                      : "2px solid rgba(255,255,255,0.15)",
                    background: checkedActions.has(i) ? "#7C3AED" : "transparent",
                    flexShrink: 0,
                    marginTop: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.15s ease",
                  }}
                >
                  {checkedActions.has(i) && (
                    <CheckCircle2 size={11} color="#fff" style={{ marginTop: -1 }} />
                  )}
                </div>
                <span
                  style={{
                    color: checkedActions.has(i) ? "#3A3A60" : "#9090B8",
                    fontSize: 14,
                    lineHeight: 1.6,
                    textDecoration: checkedActions.has(i) ? "line-through" : "none",
                    transition: "color 0.15s ease",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "monospace, monospace",
                      color: checkedActions.has(i) ? "#3A3A60" : "#7C3AED",
                      marginRight: 6,
                      fontWeight: 700,
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}.
                  </span>
                  {action}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Estimated prep time */}
      <div
        className="rounded-xl p-5 flex items-center gap-4"
        style={{
          background: "rgba(124,58,237,0.08)",
          border: "1px solid rgba(124,58,237,0.25)",
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: "rgba(124,58,237,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Calendar size={20} color="#8B5CF6" />
        </div>
        <div>
          <p style={{ color: "#9090B8", fontSize: 12, marginBottom: 2 }}>
            Estimated preparation time to close all critical gaps
          </p>
          <p style={{ color: "#F0F0FF", fontSize: 18, fontWeight: 700 }}>
            {analysis.estimated_prep_time}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function HistoryItem({
  record,
  onSelect,
}: {
  record: AnalysisRecord;
  onSelect: (r: AnalysisRecord) => void;
}) {
  const color = scoreColor(record.analysis.readiness_score);
  const date = new Date(record.createdAt);
  const dateStr = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <button
      onClick={() => onSelect(record)}
      className="w-full text-left rounded-xl p-4 transition-colors"
      style={{
        background: "#0C0C14",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(124,58,237,0.35)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.06)";
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p style={{ color: "#F0F0FF", fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
            {record.seniorityLevel.charAt(0).toUpperCase() + record.seniorityLevel.slice(1)}{" "}
            {record.targetRole}
            {record.targetCompany && (
              <span style={{ color: "#9090B8", fontWeight: 400 }}> · {record.targetCompany}</span>
            )}
          </p>
          <p style={{ color: "#3A3A60", fontSize: 12 }}>{dateStr}</p>
        </div>
        <div
          style={{
            fontFamily: "monospace, monospace",
            fontSize: 20,
            fontWeight: 700,
            color,
            flexShrink: 0,
          }}
        >
          {record.analysis.readiness_score}
          <span style={{ fontSize: 11, color: "#9090B8", fontWeight: 400 }}>%</span>
        </div>
      </div>
    </button>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function SkillsGapPage() {
  const [tab, setTab] = useState<"analyze" | "history">("analyze");
  const [targetRole, setTargetRole] = useState("");
  const [targetCompany, setTargetCompany] = useState("");
  const [seniorityLevel, setSeniorityLevel] = useState<SeniorityLevel>("mid");
  const [currentResult, setCurrentResult] = useState<AnalysisRecord | null>(null);

  const { data: historyData, refetch: refetchHistory } = useQuery<GetResponse>({
    queryKey: ["skills-gap-history"],
    queryFn: () => apiFetch<GetResponse>("/api/skills-gap"),
  });

  const analysisMutation = useMutation<PostResponse, Error, { targetRole: string; targetCompany?: string; seniorityLevel: string }>({
    mutationFn: (payload) =>
      apiFetch<PostResponse>("/api/skills-gap", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: (data) => {
      setCurrentResult(data.record);
      refetchHistory();
    },
  });

  const handleAnalyze = () => {
    if (!targetRole.trim()) return;
    analysisMutation.mutate({
      targetRole: targetRole.trim(),
      targetCompany: targetCompany.trim() || undefined,
      seniorityLevel,
    });
  };

  const handleHistorySelect = (record: AnalysisRecord) => {
    setCurrentResult(record);
    setTab("analyze");
  };

  const analyses = historyData?.analyses ?? [];

  return (
    <div
      className="min-h-screen"
      style={{
        background: "#060608",
        fontFamily: "'Inter', sans-serif",
        padding: "32px 24px",
        maxWidth: 900,
        margin: "0 auto",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: "rgba(124,58,237,0.15)",
              border: "1px solid rgba(124,58,237,0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Brain size={20} color="#8B5CF6" />
          </div>
          <div>
            <h1 style={{ color: "#F0F0FF", fontSize: 22, fontWeight: 700, lineHeight: 1.2 }}>
              Skills Gap Analyzer
            </h1>
            <p style={{ color: "#9090B8", fontSize: 13, marginTop: 2 }}>
              Discover what to learn next for your target role
            </p>
          </div>
        </div>

        {/* Tab switcher */}
        <div
          className="flex"
          style={{
            background: "#0C0C14",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 10,
            padding: 4,
          }}
        >
          {(["analyze", "history"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: "7px 16px",
                borderRadius: 7,
                fontSize: 13,
                fontWeight: 500,
                background: tab === t ? "#7C3AED" : "transparent",
                color: tab === t ? "#fff" : "#9090B8",
                transition: "all 0.15s ease",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {t === "analyze" ? <Brain size={13} /> : <History size={13} />}
              {t === "analyze" ? "Analyze" : `History${analyses.length > 0 ? ` (${analyses.length})` : ""}`}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {tab === "analyze" ? (
          <motion.div
            key="analyze"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-6"
          >
            {/* Input form */}
            <div
              className="rounded-xl p-6"
              style={{
                background: "#0C0C14",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <h2
                style={{
                  color: "#F0F0FF",
                  fontSize: 15,
                  fontWeight: 600,
                  marginBottom: 20,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Target size={15} color="#8B5CF6" />
                Target Role
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Target role */}
                <div className="flex flex-col gap-2">
                  <label style={{ color: "#9090B8", fontSize: 12, fontWeight: 500 }}>
                    Role / Job Title <span style={{ color: "#F87171" }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Senior Software Engineer"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 10,
                      padding: "11px 14px",
                      color: "#F0F0FF",
                      fontSize: 14,
                      outline: "none",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "rgba(124,58,237,0.5)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                    }}
                  />
                </div>

                {/* Target company */}
                <div className="flex flex-col gap-2">
                  <label style={{ color: "#9090B8", fontSize: 12, fontWeight: 500 }}>
                    Company{" "}
                    <span style={{ color: "#3A3A60", fontWeight: 400 }}>(optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Stripe, Vercel, …"
                    value={targetCompany}
                    onChange={(e) => setTargetCompany(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 10,
                      padding: "11px 14px",
                      color: "#F0F0FF",
                      fontSize: 14,
                      outline: "none",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "rgba(124,58,237,0.5)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                    }}
                  />
                </div>
              </div>

              {/* Seniority */}
              <div className="flex flex-col gap-2 mb-6">
                <label style={{ color: "#9090B8", fontSize: 12, fontWeight: 500 }}>
                  Seniority Level
                </label>
                <div className="flex flex-wrap gap-2">
                  {SENIORITY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setSeniorityLevel(opt.value)}
                      style={{
                        padding: "8px 16px",
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 500,
                        background:
                          seniorityLevel === opt.value ? "rgba(124,58,237,0.2)" : "rgba(255,255,255,0.04)",
                        border:
                          seniorityLevel === opt.value
                            ? "1px solid rgba(124,58,237,0.5)"
                            : "1px solid rgba(255,255,255,0.08)",
                        color: seniorityLevel === opt.value ? "#8B5CF6" : "#9090B8",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleAnalyze}
                disabled={!targetRole.trim() || analysisMutation.isPending}
                className="w-full rounded-xl py-3 flex items-center justify-center gap-2"
                style={{
                  background:
                    !targetRole.trim() || analysisMutation.isPending
                      ? "rgba(124,58,237,0.4)"
                      : "#7C3AED",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 600,
                  boxShadow:
                    !targetRole.trim() || analysisMutation.isPending
                      ? "none"
                      : "0 0 20px rgba(124,58,237,0.3)",
                  cursor:
                    !targetRole.trim() || analysisMutation.isPending ? "not-allowed" : "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                {analysisMutation.isPending ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Analyzing your profile…
                  </>
                ) : (
                  <>
                    <Brain size={16} />
                    Analyze Skills Gap
                  </>
                )}
              </button>

              {analysisMutation.isError && (
                <p
                  style={{
                    color: "#F87171",
                    fontSize: 13,
                    marginTop: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <AlertCircle size={14} />
                  {analysisMutation.error.message}
                </p>
              )}
            </div>

            {/* Results */}
            <AnimatePresence>
              {currentResult && (
                <AnalysisResults key={currentResult.id} record={currentResult} />
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div
            key="history"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            {analyses.length === 0 ? (
              <div
                className="rounded-xl p-10 flex flex-col items-center gap-4"
                style={{
                  background: "#0C0C14",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <History size={36} color="#3A3A60" />
                <p style={{ color: "#9090B8", fontSize: 14 }}>
                  No past analyses yet. Run your first one!
                </p>
                <button
                  onClick={() => setTab("analyze")}
                  style={{
                    padding: "10px 20px",
                    borderRadius: 10,
                    background: "#7C3AED",
                    color: "#fff",
                    fontSize: 14,
                    fontWeight: 600,
                    boxShadow: "0 0 20px rgba(124,58,237,0.3)",
                  }}
                >
                  Analyze Now
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {analyses.map((record) => (
                  <HistoryItem key={record.id} record={record} onSelect={handleHistorySelect} />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
