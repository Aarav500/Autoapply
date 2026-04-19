"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import Link from "next/link";
import {
  Briefcase, TrendingUp, Award,
  ArrowUpRight, Clock, AlertCircle, CheckCircle2,
  Send, Mic, Zap, ChevronRight, Calendar,
  Flame, Target, Trophy, Mail, X, Check,
  Activity, Sparkles,
} from "lucide-react";

// ── Animation helpers ────────────────────────────────────────
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: "easeOut" as const, delay },
});

// ── Types ─────────────────────────────────────────────────────
interface GoalData {
  weeklyApplicationTarget: number;
  currentWeekApps: number;
  currentStreak: number;
  longestStreak: number;
  weekStartDate: string;
}

interface ActivityEntry {
  time: string;
  description: string;
  dotColor: string;
}

// ── Stat Card ────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: string | number;
  sub: string;
  icon: React.ElementType;
  color: string;
  delay?: number;
}

function StatCard({ label, value, sub, icon: Icon, color, delay = 0 }: StatCardProps) {
  return (
    <motion.div
      {...fadeUp(delay)}
      className="relative overflow-hidden rounded-[14px] p-5"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-[2px] rounded-t-[14px]"
        style={{ background: color }}
      />
      <div
        className="absolute top-3 right-3 w-12 h-12 rounded-full opacity-20 pointer-events-none"
        style={{ background: color, filter: "blur(14px)" }}
      />
      <div className="flex items-start justify-between">
        <div>
          <div className="stat-number mb-1" style={{ color }}>
            {value}
          </div>
          <div className="text-[13px] font-medium" style={{ color: "#9090B8" }}>{label}</div>
          <div className="text-[11px] mt-0.5" style={{ color: "#3A3A60" }}>{sub}</div>
        </div>
        <div
          className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}18`, border: `1px solid ${color}30` }}
        >
          <Icon size={16} style={{ color }} />
        </div>
      </div>
    </motion.div>
  );
}

// ── Weekly Goal Progress Card ────────────────────────────────
function WeeklyGoalCard({ goalData, delay = 0 }: { goalData: GoalData; delay?: number }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState(String(goalData.weeklyApplicationTarget));

  const mutation = useMutation({
    mutationFn: (weeklyTarget: number) =>
      apiFetch("/api/dashboard/goals", {
        method: "POST",
        body: JSON.stringify({ weeklyTarget }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      setEditing(false);
    },
  });

  const { weeklyApplicationTarget, currentWeekApps, currentStreak } = goalData;
  const pct = Math.min(Math.round((currentWeekApps / Math.max(weeklyApplicationTarget, 1)) * 100), 100);

  // Day-of-week progress (Mon–Sun, 0-indexed from Monday)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Mon=0 … Sun=6
  const weekPct = Math.round(((dayIndex + 1) / 7) * 100);
  const onTrack = pct >= weekPct * 0.5;
  const goalMet = pct >= 100;

  const ringColor = goalMet ? "#34D399" : onTrack ? "#34D399" : pct >= 40 ? "#FBBF24" : "#A78BFA";

  // SVG circle ring parameters
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (pct / 100) * circumference;

  const handleSave = () => {
    const n = parseInt(inputVal, 10);
    if (!isNaN(n) && n >= 1 && n <= 100) mutation.mutate(n);
  };

  return (
    <motion.div
      {...fadeUp(delay)}
      className="relative overflow-hidden rounded-[14px] p-5"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-[2px] rounded-t-[14px]"
        style={{ background: ringColor }}
      />
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[14px] font-semibold" style={{ color: "#F0F0FF" }}>Weekly Goal</h3>
          <p className="text-[11px] mt-0.5" style={{ color: "#3A3A60" }}>Applications this week</p>
        </div>
        {currentStreak > 0 && (
          <div
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold"
            style={{ background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.25)", color: "#FBBF24" }}
          >
            <Flame size={11} />
            {currentStreak}w streak
          </div>
        )}
      </div>

      <div className="flex items-center gap-5">
        {/* Ring */}
        <div className="relative flex-shrink-0">
          <svg width="88" height="88" style={{ transform: "rotate(-90deg)" }}>
            <circle
              cx="44" cy="44" r={radius}
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="7"
            />
            <motion.circle
              cx="44" cy="44" r={radius}
              fill="none"
              stroke={ringColor}
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: dashOffset }}
              transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
            />
          </svg>
          <div
            className="absolute inset-0 flex flex-col items-center justify-center"
            style={{ transform: "rotate(0deg)" }}
          >
            <span className="text-[18px] font-bold leading-none" style={{ color: ringColor }}>{pct}%</span>
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="text-[22px] font-bold leading-none mb-1" style={{ color: "#F0F0FF" }}>
            {currentWeekApps}
            <span className="text-[13px] font-normal ml-1" style={{ color: "#5A5A80" }}>
              / {weeklyApplicationTarget}
            </span>
          </div>
          <div className="text-[12px] mb-3" style={{ color: "#9090B8" }}>
            {goalMet
              ? "Goal achieved this week!"
              : `${weeklyApplicationTarget - currentWeekApps} more to reach goal`}
          </div>

          {/* Set Goal inline */}
          <AnimatePresence mode="wait">
            {editing ? (
              <motion.div
                key="editing"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-2"
              >
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
                  className="w-16 px-2 py-1 text-[12px] rounded-[6px] outline-none"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(124,58,237,0.4)",
                    color: "#F0F0FF",
                  }}
                  autoFocus
                />
                <button
                  onClick={handleSave}
                  disabled={mutation.isPending}
                  className="w-6 h-6 rounded-[5px] flex items-center justify-center transition-opacity"
                  style={{ background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.3)" }}
                >
                  <Check size={11} style={{ color: "#34D399" }} />
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="w-6 h-6 rounded-[5px] flex items-center justify-center"
                  style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)" }}
                >
                  <X size={11} style={{ color: "#F87171" }} />
                </button>
              </motion.div>
            ) : (
              <motion.button
                key="set-goal"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                onClick={() => { setInputVal(String(weeklyApplicationTarget)); setEditing(true); }}
                className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-[6px] transition-all"
                style={{ color: "#A78BFA", background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)" }}
              >
                <Target size={10} />
                Set Goal
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

// ── Job Funnel Chart ─────────────────────────────────────────
interface FunnelData {
  applied: number;
  screening: number;
  interview: number;
  offer: number;
}

function convRate(num: number, denom: number): string {
  if (denom === 0) return "—";
  return `${Math.round((num / denom) * 100)}%`;
}

function FunnelChart({ data, delay = 0 }: { data: FunnelData; delay?: number }) {
  const stages = [
    { label: "Applied",    value: data.applied,    color: "#7C3AED", pct: 100 },
    { label: "Screening",  value: data.screening,  color: "#8B5CF6", pct: Math.round((data.screening / Math.max(data.applied, 1)) * 100) },
    { label: "Interview",  value: data.interview,  color: "#06B6D4", pct: Math.round((data.interview / Math.max(data.applied, 1)) * 100) },
    { label: "Offer",      value: data.offer,      color: "#34D399", pct: Math.round((data.offer / Math.max(data.applied, 1)) * 100) },
  ] as const;

  const conversions = [
    convRate(data.screening, data.applied),
    convRate(data.interview, data.screening),
    convRate(data.offer, data.interview),
  ];

  return (
    <motion.div {...fadeUp(delay)} className="card p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-[14px] font-semibold" style={{ color: "#F0F0FF" }}>Job Funnel</h3>
          <p className="text-[11px] mt-0.5" style={{ color: "#3A3A60" }}>Conversion by stage</p>
        </div>
        <button
          className="flex items-center gap-1 text-[11px] px-3 py-1.5 rounded-[7px]"
          style={{ color: "#A78BFA", background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)" }}
        >
          Details <ArrowUpRight size={10} />
        </button>
      </div>

      <div className="space-y-0">
        {stages.map((stage, i) => (
          <div key={stage.label}>
            <div className="flex items-center gap-3 py-2">
              {/* Label */}
              <div className="w-[72px] flex-shrink-0 text-right">
                <span className="text-[11px] font-medium" style={{ color: "#9090B8" }}>{stage.label}</span>
              </div>
              {/* Bar */}
              <div className="flex-1 relative h-[28px] flex items-center">
                <div
                  className="h-full rounded-[5px] absolute left-0 top-0"
                  style={{ width: "100%", background: "rgba(255,255,255,0.03)" }}
                />
                <motion.div
                  className="h-full rounded-[5px] absolute left-0 top-0 flex items-center px-3"
                  style={{ background: `${stage.color}22`, border: `1px solid ${stage.color}40` }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(stage.pct, 2)}%` }}
                  transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 + i * 0.1 }}
                >
                  <span
                    className="text-[11px] font-semibold whitespace-nowrap"
                    style={{ color: stage.color }}
                  >
                    {stage.value}
                  </span>
                </motion.div>
              </div>
              {/* Pct label */}
              <div className="w-[36px] flex-shrink-0">
                <span className="text-[11px]" style={{ color: "#3A3A60" }}>{stage.pct}%</span>
              </div>
            </div>
            {/* Conversion arrow between stages */}
            {i < stages.length - 1 && (
              <div className="flex items-center gap-3 py-0.5">
                <div className="w-[72px] flex-shrink-0" />
                <div className="flex items-center gap-1.5 ml-2">
                  <div className="h-[1px] w-3" style={{ background: "rgba(255,255,255,0.08)" }} />
                  <span className="text-[10px]" style={{ color: "#4A4A70" }}>
                    {conversions[i]} → {stages[i + 1].label}
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Mini weekly trend bars ───────────────────────────────────────────────────
function WeeklyTrendChart({ data }: { data: { day: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div>
      <div className="flex items-end gap-1.5 h-14">
        {data.map((d, i) => {
          const pct = (d.count / max) * 100;
          const isToday = i === data.length - 1;
          return (
            <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded-t-sm transition-all"
                style={{
                  height: `${Math.max(pct, 4)}%`,
                  background: isToday
                    ? "linear-gradient(180deg, #8B5CF6, #7C3AED)"
                    : "rgba(255,255,255,0.07)",
                  boxShadow: isToday ? "0 0 8px rgba(124,58,237,0.4)" : "none",
                  minHeight: 3,
                }}
              />
              {d.count > 0 && (
                <span className="text-[9px]" style={{ color: isToday ? "#8B5CF6" : "#3A3A60", fontFamily: "monospace" }}>
                  {d.count}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex gap-1.5 mt-1">
        {data.map((d, i) => (
          <div key={d.day} className="flex-1 text-center">
            <span className="text-[9px]" style={{ color: i === data.length - 1 ? "#8B5CF6" : "#3A3A60", fontFamily: "'Inter', sans-serif" }}>
              {d.day}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Pipeline Bar ─────────────────────────────────────────────
function PipelineBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = Math.min((value / Math.max(total, 1)) * 100, 100);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[12px]" style={{ color: "#9090B8" }}>{label}</span>
        <span className="text-[12px] font-semibold" style={{ color: "#F0F0FF" }}>{value}</span>
      </div>
      <div className="h-[6px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
        />
      </div>
    </div>
  );
}

// ── Activity item ────────────────────────────────────────────
type ActivityType = "application" | "email" | "interview" | "rejection" | "offer" | "default";

function classifyActivity(desc: string): ActivityType {
  const d = desc.toLowerCase();
  if (d.includes("applied") || d.includes("auto-applied")) return "application";
  if (d.includes("interview")) return "interview";
  if (d.includes("offer")) return "offer";
  if (d.includes("reject") || d.includes("declined")) return "rejection";
  if (d.includes("email") || d.includes("generated") || d.includes("cover letter") || d.includes("cv")) return "email";
  return "default";
}

const ACTIVITY_META: Record<ActivityType, { icon: React.ElementType; color: string }> = {
  application: { icon: Briefcase,     color: "#7C3AED" },
  email:       { icon: Mail,          color: "#60A5FA" },
  interview:   { icon: Calendar,      color: "#34D399" },
  rejection:   { icon: X,             color: "#F87171" },
  offer:       { icon: Trophy,        color: "#FBBF24" },
  default:     { icon: CheckCircle2,  color: "#8B5CF6" },
};

function groupActivitiesByDay(activities: ActivityEntry[]): Array<{ label: string; items: ActivityEntry[] }> {
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  const groups: Record<string, ActivityEntry[]> = {};

  for (const act of activities) {
    // Try to parse the time field to determine day
    const timeStr = act.time;
    let label = "This week";
    if (
      timeStr.includes("m ago") ||
      timeStr.includes("h ago") ||
      timeStr.includes("Now") ||
      timeStr.toLowerCase() === "now"
    ) {
      label = "Today";
    } else if (timeStr.toLowerCase() === "yesterday") {
      label = "Yesterday";
    } else {
      // Try as a date
      const parsed = new Date(timeStr);
      if (!isNaN(parsed.getTime())) {
        const ds = parsed.toDateString();
        if (ds === today) label = "Today";
        else if (ds === yesterday) label = "Yesterday";
        else label = "This week";
      }
    }
    if (!groups[label]) groups[label] = [];
    groups[label].push(act);
  }

  const order = ["Today", "Yesterday", "This week"];
  return order
    .filter((l) => groups[l] && groups[l].length > 0)
    .map((l) => ({ label: l, items: groups[l] }));
}

function EnhancedActivityFeed({ activities, delay = 0 }: { activities: ActivityEntry[]; delay?: number }) {
  const grouped = groupActivitiesByDay(activities);

  return (
    <motion.div {...fadeUp(delay)} className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[14px] font-semibold" style={{ color: "#F0F0FF" }}>Recent Activity</h3>
        <span className="text-[11px]" style={{ color: "#3A3A60" }}>
          <Clock size={10} className="inline mr-1" />Live
        </span>
      </div>

      {grouped.length === 0 ? (
        <div className="py-6 text-center">
          <span className="text-[12px]" style={{ color: "#3A3A60" }}>No recent activity</span>
        </div>
      ) : (
        <div className="space-y-1">
          {grouped.map((group) => (
            <div key={group.label}>
              <div
                className="text-[10px] font-semibold uppercase tracking-wider pb-1 pt-2"
                style={{ color: "#3A3A60" }}
              >
                {group.label}
              </div>
              {group.items.map((act, i) => {
                const type = classifyActivity(act.description);
                const meta = ACTIVITY_META[type];
                const IconComp = meta.icon;
                return (
                  <div
                    key={i}
                    className="flex items-start gap-3 py-2.5"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                  >
                    <div
                      className="w-7 h-7 rounded-[8px] flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: `${meta.color}18`, border: `1px solid ${meta.color}28` }}
                    >
                      <IconComp size={12} style={{ color: meta.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] leading-snug" style={{ color: "#C0C0E0" }}>{act.description}</div>
                    </div>
                    <span className="text-[10px] flex-shrink-0 mt-0.5" style={{ color: "#3A3A60" }}>{act.time}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ── Quick Action ─────────────────────────────────────────────
function QuickAction({ label, desc, icon: Icon, color, href }: { label: string; desc: string; icon: React.ElementType; color: string; href: string }) {
  return (
    <Link href={href}>
      <motion.div
        whileHover={{ x: 2, transition: { duration: 0.1 } }}
        whileTap={{ scale: 0.98 }}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-[10px] text-left transition-all duration-150 cursor-pointer"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
          (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.09)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)";
          (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.06)";
        }}
      >
        <div
          className="w-8 h-8 rounded-[9px] flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}18`, border: `1px solid ${color}28` }}
        >
          <Icon size={14} style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-medium" style={{ color: "#D0D0F0" }}>{label}</div>
          <div className="text-[11px] mt-0.5" style={{ color: "#3A3A60" }}>{desc}</div>
        </div>
        <ChevronRight size={13} style={{ color: "#2A2A50", flexShrink: 0 }} />
      </motion.div>
    </Link>
  );
}

// ── Interview Card ───────────────────────────────────────────
function InterviewCard({ company, role, date, type, color }: { company: string; role: string; date: string; type: string; color: string }) {
  return (
    <div className="flex items-center gap-3 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <div
        className="w-8 h-8 rounded-[9px] flex items-center justify-center text-[12px] font-bold flex-shrink-0"
        style={{ background: `${color}20`, border: `1px solid ${color}35`, color }}
      >
        {company[0]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-medium truncate" style={{ color: "#E0E0F8" }}>{company}</div>
        <div className="text-[11px] truncate" style={{ color: "#3A3A60" }}>{role}</div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="text-[11px] font-medium" style={{ color: "#9090B8" }}>{date}</div>
        <div className="text-[10px]" style={{ color: "#2A2A50" }}>{type}</div>
      </div>
    </div>
  );
}

// ── Stats data shape ─────────────────────────────────────────
interface StatsResponseData {
  stats: Array<{ label: string; number: string }>;
  goalData?: GoalData;
  healthScore?: number;
  healthTrend?: "improving" | "stable" | "declining";
  healthComponents?: { activity: number; quality: number; diversity: number; responsiveness: number };
  nextBestAction?: { action: string; href: string; priority: "urgent" | "recommended" | "suggested" };
  marketSnippet?: {
    temperature: "hot" | "warm" | "cooling";
    trendingSkills: Array<{ skill: string; change: string }>;
    hiringCompanies: string[];
    salaryTrend: string;
  };
  insights?: {
    breakdown?: {
      applied: number;
      screening: number;
      interview: number;
      offer: number;
      rejected: number;
    };
    thisWeekApps?: number;
    responseRate?: number;
    interviewConversionRate?: number;
    offerRate?: number;
    avgMatchScore?: number;
  };
}

// ── Main Page ────────────────────────────────────────────────
export default function DashboardPage() {
  const { data: statsData } = useQuery({
    queryKey: ["dashboardStats"],
    queryFn: () => apiFetch("/api/dashboard/stats"),
    refetchInterval: 60000,
    retry: false,
  });

  const { data: activityData } = useQuery({
    queryKey: ["dashboardActivity"],
    queryFn: () => apiFetch("/api/dashboard/activity"),
    refetchInterval: 30000,
    retry: false,
  });

  const { data: jobsData } = useQuery({
    queryKey: ["recentJobs"],
    queryFn: () => apiFetch("/api/jobs"),
    retry: false,
  });

  const { data: interviewsData } = useQuery({
    queryKey: ["upcomingInterviews"],
    queryFn: () => apiFetch("/api/interview?status=scheduled"),
    retry: false,
  });

  const { data: tipData } = useQuery({
    queryKey: ["dashboardTip"],
    queryFn: () => apiFetch<{ tip: string; category: string }>("/api/dashboard/tip"),
    retry: false,
    staleTime: 60 * 60 * 1000, // 1 hour
  });
  const dailyTip = (tipData as Record<string, unknown>)?.tip as string | undefined;

  const statsPayload = statsData as StatsResponseData | undefined;
  const stats: Array<{ label: string; number: string }> = statsPayload?.stats ?? [];

  const getStat = (label: string): string => stats.find((s) => s.label === label)?.number ?? "—";

  const rawJobs = jobsData as Record<string, unknown> | undefined;
  const jobs: Array<Record<string, unknown>> = Array.isArray(rawJobs)
    ? rawJobs
    : Array.isArray((rawJobs as Record<string, unknown>)?.jobs)
    ? (rawJobs as Record<string, Array<Record<string, unknown>>>).jobs
    : [];

  const rawInterviews = interviewsData as Record<string, unknown> | undefined;
  const interviews: Array<Record<string, unknown>> = Array.isArray(rawInterviews)
    ? rawInterviews
    : Array.isArray((rawInterviews as Record<string, unknown>)?.interviews)
    ? (rawInterviews as Record<string, Array<Record<string, unknown>>>).interviews
    : [];

  const upcomingInterviews = interviews.slice(0, 3);

  const breakdown = statsPayload?.insights?.breakdown;
  const totalApps = breakdown?.applied ?? (parseInt(getStat("Applied"), 10) || 0);
  const interviewCount = breakdown?.interview ?? (parseInt(getStat("Interviews"), 10) || 0);
  const offersCount = breakdown?.offer ?? (parseInt(getStat("Offers"), 10) || 0);
  const screeningCount = breakdown?.screening ?? 0;

  const healthScore = statsPayload?.healthScore ?? 0;
  const healthTrend = statsPayload?.healthTrend ?? "stable";
  const nextBestAction = statsPayload?.nextBestAction;
  const marketSnippet = statsPayload?.marketSnippet;
  const interviewConversionRate = statsPayload?.insights?.interviewConversionRate ?? 0;
  const avgMatchScore = statsPayload?.insights?.avgMatchScore ?? 0;

  const pipeline = [
    { label: "Applied",   value: totalApps,     color: "#7C3AED" },
    { label: "Screening", value: screeningCount, color: "#8B5CF6" },
    { label: "Interview", value: interviewCount, color: "#06B6D4" },
    { label: "Offer",     value: offersCount,    color: "#34D399" },
  ];

  const funnelData: FunnelData = {
    applied:   totalApps,
    screening: screeningCount,
    interview: interviewCount,
    offer:     offersCount,
  };

  const goalData: GoalData = statsPayload?.goalData ?? {
    weeklyApplicationTarget: 10,
    currentWeekApps: statsPayload?.insights?.thisWeekApps ?? 0,
    currentStreak: 0,
    longestStreak: 0,
    weekStartDate: new Date().toISOString(),
  };

  const TEMP_COLOR: Record<string, string> = { hot: "#34D399", warm: "#FBBF24", cooling: "#F87171" };

  const rawActivity = activityData as unknown;
  const activities: ActivityEntry[] = Array.isArray(rawActivity)
    ? (rawActivity as ActivityEntry[])
    : [];

  const ICOLORS = ["#06B6D4", "#7C3AED", "#60A5FA", "#FBBF24", "#34D399"];

  // Build last-7-days application trend from stats insights
  const last7Days: { day: string; count: number }[] = (() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));
      return {
        day: days[d.getDay()],
        count: 0, // filled below
      };
    });
  })();

  // Use thisWeekApps from stats to distribute (real data when available)
  const thisWeekAppsVal = (statsPayload?.insights as Record<string, number> | undefined)?.thisWeekApps || 0;
  if (thisWeekAppsVal > 0 && last7Days.length > 0) {
    // Distribute proportionally (simple estimate: all today)
    last7Days[last7Days.length - 1].count = thisWeekAppsVal;
  }

  return (
    <div className="space-y-5 page-enter">
      {/* Greeting */}
      <motion.div {...fadeUp(0)}>
        <h2 className="text-[22px] font-bold mb-1" style={{ color: "#F0F0FF", letterSpacing: "-0.02em" }}>
          Good morning
        </h2>
        <p className="text-[13px]" style={{ color: "#5A5A80" }}>
          {upcomingInterviews.length > 0
            ? `You have ${upcomingInterviews.length} upcoming interview${upcomingInterviews.length !== 1 ? "s" : ""} this week.`
            : "Your AI job search is running in the background."}
          {jobs.length > 0 && ` ${Math.min(jobs.length, 12)} new job matches found.`}
        </p>
      </motion.div>

      {/* Stat cards + Weekly goal */}
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
        <StatCard label="Applications" value={totalApps > 0 ? totalApps : "—"}                                             sub={statsPayload?.insights?.thisWeekApps ? `+${statsPayload.insights.thisWeekApps} this week` : "Start applying"} icon={Send}     color="#7C3AED" delay={0.05} />
        <StatCard label="Interviews"   value={interviewCount > 0 ? interviewCount : "—"}                                   sub={upcomingInterviews.length > 0 ? `${upcomingInterviews.length} upcoming` : "None scheduled"}               icon={Mic}      color="#06B6D4" delay={0.1} />
        <StatCard label="Offers"       value={offersCount > 0 ? offersCount : "—"}                                         sub={offersCount > 0 ? "In negotiation" : "None yet"}                                                           icon={Award}    color="#34D399" delay={0.15} />
        <StatCard label="Health Score" value={healthScore > 0 ? `${healthScore}` : "—"}                                   sub={healthTrend === "improving" ? "Trending up ↑" : healthTrend === "declining" ? "Declining ↓" : "Stable →"}   icon={Activity} color={healthScore > 70 ? "#34D399" : healthScore > 40 ? "#FBBF24" : "#F87171"} delay={0.2} />
        <WeeklyGoalCard goalData={goalData} delay={0.25} />
      </div>

      {/* Market snippet (shows when available) */}
      {marketSnippet && (
        <motion.div {...fadeUp(0.27)} className="card px-5 py-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: TEMP_COLOR[marketSnippet.temperature] }} />
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: TEMP_COLOR[marketSnippet.temperature] }}>
                {marketSnippet.temperature} market
              </span>
            </div>
            <span className="text-[11px]" style={{ color: "#3A3A60" }}>·</span>
            <span className="text-[11px]" style={{ color: "#9090B8" }}>{marketSnippet.salaryTrend}</span>
            <span className="text-[11px]" style={{ color: "#3A3A60" }}>·</span>
            <span className="text-[11px]" style={{ color: "#9090B8" }}>
              Trending:{" "}
              {marketSnippet.trendingSkills.slice(0, 3).map((s, i) => (
                <span key={i}>
                  <span style={{ color: "#F0F0FF" }}>{s.skill}</span>
                  <span style={{ color: "#34D399" }}> {s.change}</span>
                  {i < 2 ? ", " : ""}
                </span>
              ))}
            </span>
            {marketSnippet.hiringCompanies.length > 0 && (
              <>
                <span className="text-[11px]" style={{ color: "#3A3A60" }}>·</span>
                <span className="text-[11px]" style={{ color: "#9090B8" }}>
                  Hiring: <span style={{ color: "#F0F0FF" }}>{marketSnippet.hiringCompanies.join(", ")}</span>
                </span>
              </>
            )}
          </div>
        </motion.div>
      )}

      {/* Funnel + Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4">
        <FunnelChart data={funnelData} delay={0.28} />
        <EnhancedActivityFeed activities={activities} delay={0.3} />
      </div>

      {/* Pipeline + quick actions */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4">
        {/* Pipeline */}
        <motion.div {...fadeUp(0.32)} className="card p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-[14px] font-semibold" style={{ color: "#F0F0FF" }}>Application Pipeline</h3>
              <p className="text-[11px] mt-0.5" style={{ color: "#3A3A60" }}>Last 30 days</p>
            </div>
            <button
              className="flex items-center gap-1 text-[11px] px-3 py-1.5 rounded-[7px]"
              style={{ color: "#A78BFA", background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)" }}
            >
              View All <ArrowUpRight size={10} />
            </button>
          </div>
          <div className="space-y-4">
            {pipeline.map((p) => (
              <PipelineBar key={p.label} {...p} total={pipeline[0].value} />
            ))}
          </div>
          <div
            className="mt-5 px-4 py-3 rounded-[10px] flex items-center gap-3"
            style={{ background: "rgba(124,58,237,0.07)", border: "1px solid rgba(124,58,237,0.15)" }}
          >
            <Activity size={13} style={{ color: "#A78BFA", flexShrink: 0 }} />
            <span className="text-[12px]" style={{ color: "#9090B8" }}>
              {interviewConversionRate > 0 ? (
                <>Your <span style={{ color: "#A78BFA" }}>interview conversion rate</span> is{" "}
                <span style={{ color: "#34D399" }}>{interviewConversionRate}%</span>
                {avgMatchScore > 0 && <> · avg match score <span style={{ color: "#FBBF24" }}>{avgMatchScore}%</span></>}
                </>
              ) : (
                <>Health score: <span style={{ color: healthScore > 70 ? "#34D399" : healthScore > 40 ? "#FBBF24" : "#F87171" }}>{healthScore}</span>/100 — {healthTrend === "improving" ? "trending up" : healthTrend === "declining" ? "declining" : "stable"}</>
              )}
            </span>
          </div>
        </motion.div>

        {/* Quick actions */}
        <div className="space-y-4">
          {/* ── Weekly Application Trend ── */}
          {last7Days.some((d) => d.count > 0) && (
            <motion.div
              {...fadeUp(0.4)}
              className="rounded-xl p-5"
              style={{ background: "var(--bg-surface)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <div className="flex items-center justify-between mb-4">
                <p className="text-[13px] font-semibold" style={{ color: "#F0F0FF" }}>Applications This Week</p>
                <span className="text-[11px]" style={{ color: "#3A3A60" }}>{thisWeekAppsVal} total</span>
              </div>
              <WeeklyTrendChart data={last7Days} />
            </motion.div>
          )}
          <motion.div {...fadeUp(0.36)} className="card p-5">
          <h3 className="text-[14px] font-semibold mb-3" style={{ color: "#F0F0FF" }}>Quick Actions</h3>
          <div className="space-y-2">
            <QuickAction label="Search & apply to jobs" desc={jobs.length > 0 ? `${jobs.length} matches found` : "Find new matches"} icon={Zap}        color="#7C3AED" href="/jobs" />
            <QuickAction label="Prep for interview"     desc="AI mock interview ready"                                               icon={Mic}        color="#06B6D4" href="/interview" />
            <QuickAction label="Optimize CV"            desc="ATS score & improvements"                                              icon={TrendingUp} color="#34D399" href="/documents" />
            <QuickAction label="Review applications"    desc={totalApps > 0 ? `${totalApps} total tracked` : "Track your pipeline"} icon={Briefcase}  color="#FBBF24" href="/pipeline" />
          </div>
          {nextBestAction ? (
            <div
              className="mt-4 p-3 rounded-[10px]"
              style={{
                background: nextBestAction.priority === "urgent" ? "rgba(248,113,113,0.07)" : "rgba(124,58,237,0.07)",
                border: `1px solid ${nextBestAction.priority === "urgent" ? "rgba(248,113,113,0.2)" : "rgba(124,58,237,0.2)"}`,
              }}
            >
              <div className="flex items-start gap-2">
                <Sparkles size={12} style={{ color: nextBestAction.priority === "urgent" ? "#F87171" : "#A78BFA", flexShrink: 0, marginTop: 1 }} />
                <p className="text-[11px]" style={{ color: "#9090B8" }}>
                  <span style={{ color: nextBestAction.priority === "urgent" ? "#F87171" : "#A78BFA" }}>
                    {nextBestAction.priority === "urgent" ? "Action needed:" : "AI recommends:"}
                  </span>{" "}
                  <Link href={nextBestAction.href} className="hover:underline">{nextBestAction.action}</Link>
                </p>
              </div>
            </div>
          ) : (
            <div
              className="mt-4 p-3 rounded-[10px]"
              style={{ background: "rgba(124,58,237,0.07)", border: "1px solid rgba(124,58,237,0.15)" }}
            >
              <div className="flex items-start gap-2">
                <AlertCircle size={12} style={{ color: "#A78BFA", flexShrink: 0, marginTop: 1 }} />
                <p className="text-[11px]" style={{ color: "#6A8A98" }}>
                  <span style={{ color: "#A78BFA" }}>AI tip:</span>{" "}
                  {dailyTip || "Complete your profile to unlock personalised job recommendations."}
                </p>
              </div>
            </div>
          )}
        </motion.div>
        </div>
      </div>

      {/* Upcoming interviews */}
      <motion.div {...fadeUp(0.4)} className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[14px] font-semibold" style={{ color: "#F0F0FF" }}>Upcoming Interviews</h3>
          <span className="badge badge-teal">{upcomingInterviews.length || 3} scheduled</span>
        </div>
        {upcomingInterviews.length > 0
          ? upcomingInterviews.map((iv, i) => (
              <InterviewCard
                key={String(iv.id ?? i)}
                company={String(iv.company ?? "Company")}
                role={String(iv.position ?? iv.role ?? "Role")}
                date={String(iv.date ?? "TBD")}
                type={String(iv.type ?? "Video Call")}
                color={ICOLORS[i % ICOLORS.length]}
              />
            ))
          : <>
              <InterviewCard company="Vercel"    role="Staff Frontend Engineer" date="Mar 28 · 2pm"  type="Video"         color="#06B6D4" />
              <InterviewCard company="Anthropic" role="Research Engineer"       date="Mar 30 · 11am" type="Technical"     color="#7C3AED" />
              <InterviewCard company="Linear"    role="Frontend Engineer"       date="Apr 1 · 3pm"   type="System Design" color="#60A5FA" />
            </>
        }
        <button
          className="mt-3 w-full text-[12px] py-2 rounded-[8px] transition-all"
          style={{ color: "#5A5A80", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          View all interviews →
        </button>
      </motion.div>
    </div>
  );
}
