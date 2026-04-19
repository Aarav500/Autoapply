"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import {
  Compass,
  AlertCircle,
  Loader2,
  Target,
  Rocket,
  FlaskConical,
  CalendarCheck,
  ChevronRight,
  Clock,
  Zap,
  Shield,
  TrendingUp,
  BookOpen,
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

interface TabConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const tabs: TabConfig[] = [
  { id: "roadmap", label: "Career Roadmap", icon: <Target size={14} /> },
  { id: "projects", label: "Project Ideas", icon: <Rocket size={14} /> },
  { id: "research-ideas", label: "Research Ideas", icon: <FlaskConical size={14} /> },
  { id: "weekly", label: "Weekly Actions", icon: <CalendarCheck size={14} /> },
];

const GOAL_OPTIONS = [
  "Transfer to MIT",
  "Transfer to CMU",
  "Transfer to Stanford",
  "Transfer to UC Berkeley",
  "Transfer to NUS",
  "VP at FAANG",
  "Master AI/ML",
  "Master Quant Finance",
  "Master Cybersecurity",
];

const TIMEFRAME_OPTIONS = [
  "3 months",
  "6 months",
  "1 year",
  "2 years",
  "5 years",
];

const FIELD_OPTIONS = ["AI", "Quant Finance", "Cybersecurity", "Full-Stack"];
const GOAL_TYPE_OPTIONS = ["Research", "Portfolio", "Startup"];

const difficultyColor = (d: string) => {
  const lower = d.toLowerCase();
  if (lower.includes("easy") || lower.includes("beginner")) return "#8B5CF6";
  if (lower.includes("hard") || lower.includes("advanced")) return "#F87171";
  return "#FFB347";
};

const priorityColor = (p: string) => {
  const lower = p.toLowerCase();
  if (lower === "high") return "#F87171";
  if (lower === "low") return "#8B5CF6";
  return "#FFB347";
};

export default function MentorPage() {
  const [activeTab, setActiveTab] = useState("roadmap");

  // Roadmap state
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [timeframe, setTimeframe] = useState("1 year");

  // Projects state
  const [targetField, setTargetField] = useState("AI");
  const [goalType, setGoalType] = useState("Portfolio");

  // Research state
  const [researchField, setResearchField] = useState("AI");

  // Weekly state
  const [weeklyGoals, setWeeklyGoals] = useState("");
  const [completedActions, setCompletedActions] = useState("");

  const roadmapMutation = useMutation({
    mutationFn: () =>
      apiFetch<Record<string, unknown>>("/api/mentor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "roadmap",
          goals: selectedGoals,
          timeframe,
        }),
      }),
  });

  const projectsMutation = useMutation({
    mutationFn: () =>
      apiFetch<Record<string, unknown>>("/api/mentor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "projects",
          targetField,
          goalType: goalType.toLowerCase(),
        }),
      }),
  });

  const researchMutation = useMutation({
    mutationFn: () =>
      apiFetch<Record<string, unknown>>("/api/mentor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "research-ideas",
          targetField: researchField,
        }),
      }),
  });

  const weeklyMutation = useMutation({
    mutationFn: () =>
      apiFetch<Record<string, unknown>>("/api/mentor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "weekly",
          goals: weeklyGoals
            .split("\n")
            .map((g) => g.trim())
            .filter(Boolean),
          completedActions: completedActions
            .split("\n")
            .map((a) => a.trim())
            .filter(Boolean),
        }),
      }),
  });

  const toggleGoal = (goal: string) => {
    setSelectedGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]
    );
  };

  const renderRoadmapTab = () => {
    const result = roadmapMutation.data as Record<string, unknown> | undefined;
    const resultData = result?.data as Record<string, unknown> | undefined;

    return (
      <div className="space-y-6">
        {/* Goal Selection */}
        <div
          className="rounded-xl p-6"
          style={{
            background: "rgba(11, 11, 20, 0.7)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255, 255, 255, 0.04)",
          }}
        >
          <h3
            className="text-base font-semibold mb-4"
            style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
          >
            Select Your Goals
          </h3>
          <div className="flex flex-wrap gap-2 mb-6">
            {GOAL_OPTIONS.map((goal) => (
              <button
                key={goal}
                onClick={() => toggleGoal(goal)}
                className="px-3 py-1.5 rounded-lg text-sm transition-all"
                style={{
                  background: selectedGoals.includes(goal)
                    ? "rgba(124, 58, 237, 0.15)"
                    : "rgba(255, 255, 255, 0.03)",
                  border: `1px solid ${
                    selectedGoals.includes(goal)
                      ? "rgba(124, 58, 237, 0.4)"
                      : "rgba(255, 255, 255, 0.06)"
                  }`,
                  color: selectedGoals.includes(goal) ? "#8B5CF6" : "#9090B8",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                {selectedGoals.includes(goal) ? "✓ " : ""}
                {goal}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <div>
              <label
                className="block text-xs mb-1"
                style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
              >
                Timeframe
              </label>
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="px-3 py-2 rounded-lg text-sm"
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                  color: "#F0F0FF",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                {TIMEFRAME_OPTIONS.map((t) => (
                  <option key={t} value={t} style={{ background: "#0C0C14" }}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => roadmapMutation.mutate()}
              disabled={roadmapMutation.isPending || selectedGoals.length === 0}
              className="px-6 py-2 rounded-lg font-semibold text-sm transition-all mt-4 disabled:opacity-40"
              style={{
                background: selectedGoals.length > 0 ? "#8B5CF6" : "rgba(124, 58, 237, 0.2)",
                color: "#050508",
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {roadmapMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" />
                  Generating...
                </span>
              ) : (
                "Generate Roadmap"
              )}
            </button>
          </div>
        </div>

        {/* Error */}
        {roadmapMutation.isError && (
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-lg"
            style={{
              background: "rgba(255, 71, 87, 0.1)",
              border: "1px solid rgba(255, 71, 87, 0.3)",
            }}
          >
            <AlertCircle size={16} style={{ color: "#F87171" }} />
            <span
              className="text-sm"
              style={{ fontFamily: "'Inter', sans-serif", color: "#F87171" }}
            >
              Failed to generate roadmap. Please try again.
            </span>
          </div>
        )}

        {/* Results */}
        {resultData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Summary */}
            {typeof resultData.summary === "string" && resultData.summary ? (
              <div
                className="rounded-xl p-6"
                style={{
                  background: "linear-gradient(135deg, rgba(124, 58, 237, 0.08) 0%, rgba(83, 109, 254, 0.04) 100%)",
                  border: "1px solid rgba(124, 58, 237, 0.15)",
                }}
              >
                <h3
                  className="text-base font-semibold mb-2"
                  style={{ fontFamily: "'Inter', sans-serif", color: "#8B5CF6" }}
                >
                  Strategy Overview
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
                >
                  {resultData.summary as string}
                </p>
              </div>
            ) : null}

            {/* Quarters */}
            {(resultData.quarters as Array<Record<string, unknown>>)?.map(
              (quarter, qi) => (
                <div
                  key={qi}
                  className="rounded-xl p-6"
                  style={{
                    background: "rgba(11, 11, 20, 0.7)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid rgba(255, 255, 255, 0.04)",
                  }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <span
                      className="px-3 py-1 rounded-full text-xs font-medium"
                      style={{
                        background: "rgba(124, 58, 237, 0.15)",
                        color: "#8B5CF6",
                        fontFamily: "monospace, monospace",
                      }}
                    >
                      {quarter.quarter as string}
                    </span>
                    <h4
                      className="text-base font-semibold"
                      style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
                    >
                      {quarter.theme as string}
                    </h4>
                  </div>

                  <div className="space-y-4">
                    {(
                      quarter.milestones as Array<Record<string, unknown>>
                    )?.map((ms, mi) => (
                      <div
                        key={mi}
                        className="pl-4"
                        style={{ borderLeft: "2px solid rgba(124, 58, 237, 0.2)" }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <ChevronRight size={14} style={{ color: "#8B5CF6" }} />
                          <span
                            className="text-sm font-medium"
                            style={{
                              fontFamily: "'Inter', sans-serif",
                              color: "#F0F0FF",
                            }}
                          >
                            {ms.milestone as string}
                          </span>
                        </div>

                        {(ms.actions as string[])?.length > 0 && (
                          <div className="ml-5 mb-2">
                            <span
                              className="text-xs uppercase tracking-wide"
                              style={{
                                fontFamily: "monospace, monospace",
                                color: "#3A3A60",
                              }}
                            >
                              Actions
                            </span>
                            <ul className="mt-1 space-y-1">
                              {(ms.actions as string[]).map((a, ai) => (
                                <li
                                  key={ai}
                                  className="text-xs"
                                  style={{
                                    fontFamily: "'Inter', sans-serif",
                                    color: "#9090B8",
                                  }}
                                >
                                  - {a}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {(ms.metrics as string[])?.length > 0 && (
                          <div className="ml-5 mb-2">
                            <span
                              className="text-xs uppercase tracking-wide"
                              style={{
                                fontFamily: "monospace, monospace",
                                color: "#3A3A60",
                              }}
                            >
                              Metrics
                            </span>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {(ms.metrics as string[]).map((m, mIdx) => (
                                <span
                                  key={mIdx}
                                  className="px-2 py-0.5 rounded text-xs"
                                  style={{
                                    background: "rgba(124, 58, 237, 0.08)",
                                    color: "#8B5CF6",
                                    fontFamily: "monospace, monospace",
                                  }}
                                >
                                  {m}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {(ms.resources as string[])?.length > 0 && (
                          <div className="ml-5">
                            <span
                              className="text-xs uppercase tracking-wide"
                              style={{
                                fontFamily: "monospace, monospace",
                                color: "#3A3A60",
                              }}
                            >
                              Resources
                            </span>
                            <ul className="mt-1 space-y-0.5">
                              {(ms.resources as string[]).map((r, ri) => (
                                <li
                                  key={ri}
                                  className="text-xs flex items-center gap-1"
                                  style={{
                                    fontFamily: "'Inter', sans-serif",
                                    color: "#9090B8",
                                  }}
                                >
                                  <BookOpen size={10} /> {r}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            )}

            {/* Risks & Advantages */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(resultData.key_risks as string[])?.length > 0 && (
                <div
                  className="rounded-xl p-5"
                  style={{
                    background: "rgba(11, 11, 20, 0.7)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid rgba(255, 71, 87, 0.15)",
                  }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Shield size={16} style={{ color: "#F87171" }} />
                    <h4
                      className="text-sm font-semibold"
                      style={{ fontFamily: "'Inter', sans-serif", color: "#F87171" }}
                    >
                      Key Risks
                    </h4>
                  </div>
                  <ul className="space-y-2">
                    {(resultData.key_risks as string[]).map((risk, ri) => (
                      <li
                        key={ri}
                        className="text-xs"
                        style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
                      >
                        - {risk}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(resultData.competitive_advantages as string[])?.length > 0 && (
                <div
                  className="rounded-xl p-5"
                  style={{
                    background: "rgba(11, 11, 20, 0.7)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid rgba(124, 58, 237, 0.15)",
                  }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp size={16} style={{ color: "#8B5CF6" }} />
                    <h4
                      className="text-sm font-semibold"
                      style={{ fontFamily: "'Inter', sans-serif", color: "#8B5CF6" }}
                    >
                      Your Advantages
                    </h4>
                  </div>
                  <ul className="space-y-2">
                    {(resultData.competitive_advantages as string[]).map(
                      (adv, ai) => (
                        <li
                          key={ai}
                          className="text-xs"
                          style={{
                            fontFamily: "'Inter', sans-serif",
                            color: "#9090B8",
                          }}
                        >
                          - {adv}
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    );
  };

  const renderProjectsTab = () => {
    const result = projectsMutation.data as Record<string, unknown> | undefined;
    const resultData = result?.data as Record<string, unknown> | undefined;
    const projects = (resultData?.projects as Array<Record<string, unknown>>) || [];

    return (
      <div className="space-y-6">
        {/* Controls */}
        <div
          className="rounded-xl p-6"
          style={{
            background: "rgba(11, 11, 20, 0.7)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255, 255, 255, 0.04)",
          }}
        >
          <h3
            className="text-base font-semibold mb-4"
            style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
          >
            Generate Project Ideas
          </h3>
          <div className="flex items-end gap-4 flex-wrap">
            <div>
              <label
                className="block text-xs mb-1"
                style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
              >
                Target Field
              </label>
              <select
                value={targetField}
                onChange={(e) => setTargetField(e.target.value)}
                className="px-3 py-2 rounded-lg text-sm"
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                  color: "#F0F0FF",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                {FIELD_OPTIONS.map((f) => (
                  <option key={f} value={f} style={{ background: "#0C0C14" }}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                className="block text-xs mb-1"
                style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
              >
                Goal Type
              </label>
              <select
                value={goalType}
                onChange={(e) => setGoalType(e.target.value)}
                className="px-3 py-2 rounded-lg text-sm"
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                  color: "#F0F0FF",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                {GOAL_TYPE_OPTIONS.map((g) => (
                  <option key={g} value={g} style={{ background: "#0C0C14" }}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => projectsMutation.mutate()}
              disabled={projectsMutation.isPending}
              className="px-6 py-2 rounded-lg font-semibold text-sm transition-all disabled:opacity-40"
              style={{
                background: "#8B5CF6",
                color: "#050508",
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {projectsMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" />
                  Generating...
                </span>
              ) : (
                "Generate Ideas"
              )}
            </button>
          </div>
        </div>

        {/* Error */}
        {projectsMutation.isError && (
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-lg"
            style={{
              background: "rgba(255, 71, 87, 0.1)",
              border: "1px solid rgba(255, 71, 87, 0.3)",
            }}
          >
            <AlertCircle size={16} style={{ color: "#F87171" }} />
            <span
              className="text-sm"
              style={{ fontFamily: "'Inter', sans-serif", color: "#F87171" }}
            >
              Failed to generate project ideas. Please try again.
            </span>
          </div>
        )}

        {/* Project Cards */}
        {projects.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-4"
          >
            {projects.map((project, pi) => (
              <div
                key={pi}
                className="rounded-xl p-5"
                style={{
                  background: "rgba(11, 11, 20, 0.7)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(255, 255, 255, 0.04)",
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <h4
                    className="text-sm font-semibold flex-1"
                    style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
                  >
                    {project.title as string}
                  </h4>
                  <span
                    className="px-2 py-0.5 rounded text-xs ml-2 whitespace-nowrap"
                    style={{
                      background: `${difficultyColor(project.difficulty as string)}15`,
                      color: difficultyColor(project.difficulty as string),
                      fontFamily: "monospace, monospace",
                    }}
                  >
                    {project.difficulty as string}
                  </span>
                </div>

                <p
                  className="text-xs mb-3 leading-relaxed"
                  style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
                >
                  {project.description as string}
                </p>

                <div className="flex items-center gap-3 mb-3">
                  <span
                    className="flex items-center gap-1 text-xs"
                    style={{ fontFamily: "monospace, monospace", color: "#3A3A60" }}
                  >
                    <Clock size={10} /> {project.time_estimate as string}
                  </span>
                  <span
                    className="flex items-center gap-1 text-xs"
                    style={{ fontFamily: "monospace, monospace", color: "#3A3A60" }}
                  >
                    <Zap size={10} /> Impact: {project.impact as string}
                  </span>
                </div>

                {/* Tech Stack */}
                {(project.tech_stack as string[])?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {(project.tech_stack as string[]).map((tech, ti) => (
                      <span
                        key={ti}
                        className="px-2 py-0.5 rounded text-xs"
                        style={{
                          background: "rgba(83, 109, 254, 0.1)",
                          color: "#536DFE",
                          fontFamily: "monospace, monospace",
                        }}
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                )}

                {/* Learning Outcomes */}
                {(project.learning_outcomes as string[])?.length > 0 && (
                  <div className="mb-3">
                    <span
                      className="text-xs uppercase tracking-wide"
                      style={{ fontFamily: "monospace, monospace", color: "#3A3A60" }}
                    >
                      You will learn
                    </span>
                    <ul className="mt-1 space-y-0.5">
                      {(project.learning_outcomes as string[]).map((lo, li) => (
                        <li
                          key={li}
                          className="text-xs"
                          style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
                        >
                          - {lo}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Steps */}
                {(project.steps as string[])?.length > 0 && (
                  <div>
                    <span
                      className="text-xs uppercase tracking-wide"
                      style={{ fontFamily: "monospace, monospace", color: "#3A3A60" }}
                    >
                      Steps
                    </span>
                    <ol className="mt-1 space-y-0.5">
                      {(project.steps as string[]).map((step, si) => (
                        <li
                          key={si}
                          className="text-xs"
                          style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
                        >
                          {si + 1}. {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            ))}
          </motion.div>
        )}
      </div>
    );
  };

  const renderResearchTab = () => {
    const result = researchMutation.data as Record<string, unknown> | undefined;
    const resultData = result?.data as Record<string, unknown> | undefined;
    const ideas = (resultData?.ideas as Array<Record<string, unknown>>) || [];

    return (
      <div className="space-y-6">
        {/* Controls */}
        <div
          className="rounded-xl p-6"
          style={{
            background: "rgba(11, 11, 20, 0.7)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255, 255, 255, 0.04)",
          }}
        >
          <h3
            className="text-base font-semibold mb-4"
            style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
          >
            Generate Research Ideas
          </h3>
          <div className="flex items-end gap-4 flex-wrap">
            <div>
              <label
                className="block text-xs mb-1"
                style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
              >
                Target Field
              </label>
              <select
                value={researchField}
                onChange={(e) => setResearchField(e.target.value)}
                className="px-3 py-2 rounded-lg text-sm"
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                  color: "#F0F0FF",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                {FIELD_OPTIONS.map((f) => (
                  <option key={f} value={f} style={{ background: "#0C0C14" }}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => researchMutation.mutate()}
              disabled={researchMutation.isPending}
              className="px-6 py-2 rounded-lg font-semibold text-sm transition-all disabled:opacity-40"
              style={{
                background: "#8B5CF6",
                color: "#050508",
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {researchMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" />
                  Generating...
                </span>
              ) : (
                "Generate Research Ideas"
              )}
            </button>
          </div>
        </div>

        {/* Error */}
        {researchMutation.isError && (
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-lg"
            style={{
              background: "rgba(255, 71, 87, 0.1)",
              border: "1px solid rgba(255, 71, 87, 0.3)",
            }}
          >
            <AlertCircle size={16} style={{ color: "#F87171" }} />
            <span
              className="text-sm"
              style={{ fontFamily: "'Inter', sans-serif", color: "#F87171" }}
            >
              Failed to generate research ideas. Please try again.
            </span>
          </div>
        )}

        {/* Research Idea Cards */}
        {ideas.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {ideas.map((idea, ii) => (
              <div
                key={ii}
                className="rounded-xl p-5"
                style={{
                  background: "rgba(11, 11, 20, 0.7)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(255, 255, 255, 0.04)",
                }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4
                      className="text-sm font-semibold"
                      style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
                    >
                      {idea.title as string}
                    </h4>
                    <span
                      className="text-xs"
                      style={{ fontFamily: "monospace, monospace", color: "#536DFE" }}
                    >
                      {idea.field as string}
                    </span>
                  </div>
                  <span
                    className="px-2 py-0.5 rounded text-xs ml-2 whitespace-nowrap"
                    style={{
                      background: "rgba(124, 58, 237, 0.1)",
                      color: "#8B5CF6",
                      fontFamily: "monospace, monospace",
                    }}
                  >
                    {idea.estimated_timeline as string}
                  </span>
                </div>

                <p
                  className="text-xs mb-3 leading-relaxed"
                  style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
                >
                  {idea.description as string}
                </p>

                {typeof idea.novelty === "string" && idea.novelty ? (
                  <div className="mb-2">
                    <span
                      className="text-xs uppercase tracking-wide"
                      style={{ fontFamily: "monospace, monospace", color: "#3A3A60" }}
                    >
                      Novelty
                    </span>
                    <p
                      className="text-xs mt-0.5"
                      style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
                    >
                      {idea.novelty as string}
                    </p>
                  </div>
                ) : null}

                {typeof idea.methodology === "string" && idea.methodology ? (
                  <div className="mb-2">
                    <span
                      className="text-xs uppercase tracking-wide"
                      style={{ fontFamily: "monospace, monospace", color: "#3A3A60" }}
                    >
                      Methodology
                    </span>
                    <p
                      className="text-xs mt-0.5"
                      style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
                    >
                      {idea.methodology as string}
                    </p>
                  </div>
                ) : null}

                {(idea.potential_venues as string[])?.length > 0 && (
                  <div className="mb-2">
                    <span
                      className="text-xs uppercase tracking-wide"
                      style={{ fontFamily: "monospace, monospace", color: "#3A3A60" }}
                    >
                      Publication Venues
                    </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(idea.potential_venues as string[]).map((venue, vi) => (
                        <span
                          key={vi}
                          className="px-2 py-0.5 rounded text-xs"
                          style={{
                            background: "rgba(255, 179, 71, 0.1)",
                            color: "#FFB347",
                            fontFamily: "monospace, monospace",
                          }}
                        >
                          {venue}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {(idea.required_skills as string[])?.length > 0 && (
                  <div>
                    <span
                      className="text-xs uppercase tracking-wide"
                      style={{ fontFamily: "monospace, monospace", color: "#3A3A60" }}
                    >
                      Required Skills
                    </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(idea.required_skills as string[]).map((skill, si) => (
                        <span
                          key={si}
                          className="px-2 py-0.5 rounded text-xs"
                          style={{
                            background: "rgba(83, 109, 254, 0.1)",
                            color: "#536DFE",
                            fontFamily: "monospace, monospace",
                          }}
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </motion.div>
        )}
      </div>
    );
  };

  const renderWeeklyTab = () => {
    const result = weeklyMutation.data as Record<string, unknown> | undefined;
    const resultData = result?.data as Record<string, unknown> | undefined;

    return (
      <div className="space-y-6">
        {/* Controls */}
        <div
          className="rounded-xl p-6"
          style={{
            background: "rgba(11, 11, 20, 0.7)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255, 255, 255, 0.04)",
          }}
        >
          <h3
            className="text-base font-semibold mb-4"
            style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
          >
            Generate Weekly Action Plan
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label
                className="block text-xs mb-1"
                style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
              >
                Your Goals (one per line)
              </label>
              <textarea
                value={weeklyGoals}
                onChange={(e) => setWeeklyGoals(e.target.value)}
                rows={4}
                placeholder={"Master system design\nBuild AI portfolio project\nPrepare for interviews"}
                className="w-full px-3 py-2 rounded-lg text-sm resize-none"
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                  color: "#F0F0FF",
                  fontFamily: "'Inter', sans-serif",
                }}
              />
            </div>
            <div>
              <label
                className="block text-xs mb-1"
                style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
              >
                Completed Last Week (one per line, optional)
              </label>
              <textarea
                value={completedActions}
                onChange={(e) => setCompletedActions(e.target.value)}
                rows={4}
                placeholder={"Finished 3 LeetCode problems\nRead chapter 4 of DDIA\nAttended tech meetup"}
                className="w-full px-3 py-2 rounded-lg text-sm resize-none"
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                  color: "#F0F0FF",
                  fontFamily: "'Inter', sans-serif",
                }}
              />
            </div>
          </div>

          <button
            onClick={() => weeklyMutation.mutate()}
            disabled={weeklyMutation.isPending || weeklyGoals.trim().length === 0}
            className="px-6 py-2 rounded-lg font-semibold text-sm transition-all disabled:opacity-40"
            style={{
              background: weeklyGoals.trim().length > 0 ? "#8B5CF6" : "rgba(124, 58, 237, 0.2)",
              color: "#050508",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {weeklyMutation.isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                Generating...
              </span>
            ) : (
              "Generate Weekly Plan"
            )}
          </button>
        </div>

        {/* Error */}
        {weeklyMutation.isError && (
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-lg"
            style={{
              background: "rgba(255, 71, 87, 0.1)",
              border: "1px solid rgba(255, 71, 87, 0.3)",
            }}
          >
            <AlertCircle size={16} style={{ color: "#F87171" }} />
            <span
              className="text-sm"
              style={{ fontFamily: "'Inter', sans-serif", color: "#F87171" }}
            >
              Failed to generate weekly plan. Please try again.
            </span>
          </div>
        )}

        {/* Results */}
        {resultData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Motivation */}
            {typeof resultData.motivation === "string" && resultData.motivation ? (
              <div
                className="rounded-xl p-5"
                style={{
                  background: "linear-gradient(135deg, rgba(124, 58, 237, 0.08) 0%, rgba(83, 109, 254, 0.04) 100%)",
                  border: "1px solid rgba(124, 58, 237, 0.15)",
                }}
              >
                <p
                  className="text-sm italic leading-relaxed"
                  style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
                >
                  &ldquo;{resultData.motivation as string}&rdquo;
                </p>
              </div>
            ) : null}

            {/* Focus Areas & Weekly Goals */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(resultData.focus_areas as string[])?.length > 0 && (
                <div
                  className="rounded-xl p-5"
                  style={{
                    background: "rgba(11, 11, 20, 0.7)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid rgba(255, 255, 255, 0.04)",
                  }}
                >
                  <h4
                    className="text-sm font-semibold mb-3 flex items-center gap-2"
                    style={{ fontFamily: "'Inter', sans-serif", color: "#8B5CF6" }}
                  >
                    <Target size={14} /> Focus Areas
                  </h4>
                  <ul className="space-y-2">
                    {(resultData.focus_areas as string[]).map((area, ai) => (
                      <li
                        key={ai}
                        className="text-xs flex items-center gap-2"
                        style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
                      >
                        <ChevronRight size={10} style={{ color: "#8B5CF6" }} />
                        {area}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(resultData.weekly_goals as string[])?.length > 0 && (
                <div
                  className="rounded-xl p-5"
                  style={{
                    background: "rgba(11, 11, 20, 0.7)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid rgba(255, 255, 255, 0.04)",
                  }}
                >
                  <h4
                    className="text-sm font-semibold mb-3 flex items-center gap-2"
                    style={{ fontFamily: "'Inter', sans-serif", color: "#FFB347" }}
                  >
                    <Zap size={14} /> Weekly Goals
                  </h4>
                  <ul className="space-y-2">
                    {(resultData.weekly_goals as string[]).map((goal, gi) => (
                      <li
                        key={gi}
                        className="text-xs flex items-center gap-2"
                        style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
                      >
                        <ChevronRight size={10} style={{ color: "#FFB347" }} />
                        {goal}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Daily Schedule */}
            {(resultData.daily_actions as Array<Record<string, unknown>>)?.map(
              (day, di) => (
                <div
                  key={di}
                  className="rounded-xl p-5"
                  style={{
                    background: "rgba(11, 11, 20, 0.7)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid rgba(255, 255, 255, 0.04)",
                  }}
                >
                  <h4
                    className="text-sm font-semibold mb-3"
                    style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
                  >
                    {day.day as string}
                  </h4>
                  <div className="space-y-2">
                    {(day.tasks as Array<Record<string, unknown>>)?.map(
                      (task, ti) => (
                        <div
                          key={ti}
                          className="flex items-center justify-between px-3 py-2 rounded-lg"
                          style={{
                            background: "rgba(255, 255, 255, 0.02)",
                            border: "1px solid rgba(255, 255, 255, 0.03)",
                          }}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <span
                              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                              style={{
                                background: priorityColor(task.priority as string),
                              }}
                            />
                            <span
                              className="text-xs"
                              style={{
                                fontFamily: "'Inter', sans-serif",
                                color: "#F0F0FF",
                              }}
                            >
                              {task.task as string}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                            <span
                              className="px-1.5 py-0.5 rounded text-xs"
                              style={{
                                background: "rgba(83, 109, 254, 0.1)",
                                color: "#536DFE",
                                fontFamily: "monospace, monospace",
                                fontSize: "10px",
                              }}
                            >
                              {task.category as string}
                            </span>
                            <span
                              className="text-xs"
                              style={{
                                fontFamily: "monospace, monospace",
                                color: "#3A3A60",
                                fontSize: "10px",
                              }}
                            >
                              {task.estimated_time as string}
                            </span>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )
            )}
          </motion.div>
        )}
      </div>
    );
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

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <Compass size={28} style={{ color: "#8B5CF6" }} />
          <h1
            className="text-3xl font-bold"
            style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
          >
            AI Mentor
          </h1>
        </div>
        <p
          className="text-sm"
          style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
        >
          Your personal career strategist powered by AI. Get tailored roadmaps, project ideas, research directions, and weekly action plans.
        </p>
      </motion.div>

      {/* Tab Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mb-6"
      >
        <div
          className="flex gap-1 p-1 rounded-lg inline-flex"
          style={{ background: "rgba(255, 255, 255, 0.03)" }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2"
              style={{
                background:
                  activeTab === tab.id
                    ? "rgba(124, 58, 237, 0.15)"
                    : "transparent",
                color: activeTab === tab.id ? "#8B5CF6" : "#9090B8",
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === "roadmap" && renderRoadmapTab()}
        {activeTab === "projects" && renderProjectsTab()}
        {activeTab === "research-ideas" && renderResearchTab()}
        {activeTab === "weekly" && renderWeeklyTab()}
      </motion.div>
    </div>
  );
}
