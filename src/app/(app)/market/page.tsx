"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import {
  TrendingUp,
  TrendingDown,
  Zap,
  Building2,
  MapPin,
  DollarSign,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Clock,
  Loader2,
  AlertCircle,
  Lightbulb,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TrendingRole {
  role: string;
  demand_change: string;
  avg_salary: string;
  top_hiring_companies: string[];
  reason: string;
}

interface InDemandSkill {
  skill: string;
  demand_level: "surging" | "growing" | "stable" | "declining";
  avg_salary_premium: string;
  roles_that_need_it: string[];
}

interface HiringCompany {
  company: string;
  open_roles_estimate: string;
  growth_stage: string;
  why_hiring: string;
  roles_they_need: string[];
}

interface DecliningArea {
  area: string;
  reason: string;
  pivot_suggestion: string;
}

interface SalaryTrends {
  overall_trend: string;
  highest_paying_roles: string[];
  fastest_growing_comp: string[];
}

interface HotLocation {
  location: string;
  why_hot: string;
  remote_ratio: string;
}

interface PersonalizedInsight {
  insight: string;
  action: string;
  urgency: "immediate" | "this-week" | "this-month";
}

interface MarketReport {
  id: string;
  report_date: string;
  generatedAt: string;
  timeframe: string;
  market_temperature: "hot" | "warm" | "cooling" | "cold";
  summary: string;
  trending_roles: TrendingRole[];
  in_demand_skills: InDemandSkill[];
  hiring_companies: HiringCompany[];
  declining_areas: DecliningArea[];
  salary_trends: SalaryTrends;
  hot_locations: HotLocation[];
  personalized_insights: PersonalizedInsight[];
  market_prediction: string;
}

interface GetResponse {
  report: MarketReport | null;
  stale: boolean;
  needsGeneration: boolean;
}

interface PostResponse {
  report: MarketReport;
  stale: boolean;
}

// ─── Animation helpers ────────────────────────────────────────────────────────

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: "easeOut" as const, delay },
});

// ─── Utility helpers ──────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function isStaleReport(iso: string): boolean {
  return Date.now() - new Date(iso).getTime() > 6 * 60 * 60 * 1000;
}

// ─── Market Temperature Banner ────────────────────────────────────────────────

const TEMP_CONFIG: Record<
  MarketReport["market_temperature"],
  { label: string; emoji: string; gradient: string; border: string; textColor: string }
> = {
  hot: {
    label: "Market is HOT",
    emoji: "🔥",
    gradient: "linear-gradient(135deg, rgba(52,211,153,0.15) 0%, rgba(16,185,129,0.08) 100%)",
    border: "rgba(52,211,153,0.3)",
    textColor: "#34D399",
  },
  warm: {
    label: "Market is WARM",
    emoji: "☀️",
    gradient: "linear-gradient(135deg, rgba(20,184,166,0.15) 0%, rgba(13,148,136,0.08) 100%)",
    border: "rgba(20,184,166,0.3)",
    textColor: "#2DD4BF",
  },
  cooling: {
    label: "Market is COOLING",
    emoji: "🌤",
    gradient: "linear-gradient(135deg, rgba(251,191,36,0.15) 0%, rgba(245,158,11,0.08) 100%)",
    border: "rgba(251,191,36,0.3)",
    textColor: "#FBBF24",
  },
  cold: {
    label: "Market is COLD",
    emoji: "❄️",
    gradient: "linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(67,56,202,0.08) 100%)",
    border: "rgba(99,102,241,0.3)",
    textColor: "#818CF8",
  },
};

function TemperatureBanner({ report }: { report: MarketReport }) {
  const cfg = TEMP_CONFIG[report.market_temperature];
  return (
    <motion.div
      {...fadeUp(0.05)}
      className="rounded-2xl p-5"
      style={{
        background: cfg.gradient,
        border: `1px solid ${cfg.border}`,
      }}
    >
      <div className="flex items-start gap-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
          style={{ background: `${cfg.textColor}18`, border: `1px solid ${cfg.border}` }}
        >
          {cfg.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1.5 flex-wrap">
            <span
              className="text-[13px] font-bold uppercase tracking-widest"
              style={{ color: cfg.textColor, fontFamily: "monospace, monospace" }}
            >
              {cfg.label}
            </span>
            <span
              className="text-[11px] px-2 py-0.5 rounded-full"
              style={{
                background: `${cfg.textColor}18`,
                color: cfg.textColor,
                border: `1px solid ${cfg.border}`,
                fontFamily: "monospace, monospace",
              }}
            >
              {report.report_date}
            </span>
          </div>
          <p className="text-[14px] leading-relaxed" style={{ color: "#C0C0D8" }}>
            {report.summary}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  title,
  count,
  color = "#8B5CF6",
}: {
  icon: React.ElementType;
  title: string;
  count?: number;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <div
        className="w-8 h-8 rounded-[9px] flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}18`, border: `1px solid ${color}28` }}
      >
        <Icon size={15} style={{ color }} />
      </div>
      <h2 className="text-[15px] font-semibold" style={{ color: "#F0F0FF" }}>
        {title}
      </h2>
      {count !== undefined && (
        <span
          className="text-[11px] px-2 py-0.5 rounded-full ml-1"
          style={{
            background: `${color}14`,
            color,
            border: `1px solid ${color}28`,
            fontFamily: "monospace, monospace",
          }}
        >
          {count}
        </span>
      )}
    </div>
  );
}

// ─── Trending Roles Section ───────────────────────────────────────────────────

function TrendingRolesSection({ roles }: { roles: TrendingRole[] }) {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <motion.div
      {...fadeUp(0.1)}
      className="rounded-2xl p-5"
      style={{ background: "#0C0C14", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <SectionHeader icon={TrendingUp} title="Trending Roles" count={roles.length} color="#34D399" />
      <div className="space-y-3">
        {roles.map((role, i) => (
          <div
            key={i}
            className="rounded-xl overflow-hidden"
            style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <button
              className="w-full flex items-start gap-3 p-3.5 text-left"
              onClick={() => setExpanded(expanded === i ? null : i)}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5"
                style={{
                  background: "rgba(52,211,153,0.12)",
                  color: "#34D399",
                  fontFamily: "monospace, monospace",
                  border: "1px solid rgba(52,211,153,0.2)",
                }}
              >
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <span className="text-[14px] font-semibold" style={{ color: "#F0F0FF" }}>
                    {role.role}
                  </span>
                  <span
                    className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                    style={{
                      background: role.demand_change.startsWith("+")
                        ? "rgba(52,211,153,0.12)"
                        : "rgba(248,113,113,0.12)",
                      color: role.demand_change.startsWith("+") ? "#34D399" : "#F87171",
                      border: `1px solid ${role.demand_change.startsWith("+") ? "rgba(52,211,153,0.2)" : "rgba(248,113,113,0.2)"}`,
                      fontFamily: "monospace, monospace",
                    }}
                  >
                    {role.demand_change}
                  </span>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-[12px]" style={{ color: "#8B5CF6" }}>
                    avg {role.avg_salary}
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {role.top_hiring_companies.map((co) => (
                      <span
                        key={co}
                        className="text-[11px] px-2 py-0.5 rounded-full"
                        style={{
                          background: "rgba(255,255,255,0.04)",
                          color: "#9090B8",
                          border: "1px solid rgba(255,255,255,0.07)",
                        }}
                      >
                        {co}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex-shrink-0 mt-1">
                {expanded === i ? (
                  <ChevronUp size={14} style={{ color: "#3A3A60" }} />
                ) : (
                  <ChevronDown size={14} style={{ color: "#3A3A60" }} />
                )}
              </div>
            </button>
            <AnimatePresence>
              {expanded === i && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div
                    className="px-4 pb-3 pt-0 text-[13px] leading-relaxed"
                    style={{ color: "#9090B8", borderTop: "1px solid rgba(255,255,255,0.05)" }}
                  >
                    <div className="pt-2.5">{role.reason}</div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── In-Demand Skills Section ─────────────────────────────────────────────────

const DEMAND_CONFIG: Record<
  InDemandSkill["demand_level"],
  { color: string; bg: string; border: string; label: string; pulse: boolean }
> = {
  surging: { color: "#34D399", bg: "rgba(52,211,153,0.12)", border: "rgba(52,211,153,0.25)", label: "Surging", pulse: true },
  growing: { color: "#60A5FA", bg: "rgba(96,165,250,0.12)", border: "rgba(96,165,250,0.25)", label: "Growing", pulse: false },
  stable: { color: "#9090B8", bg: "rgba(144,144,184,0.1)", border: "rgba(144,144,184,0.2)", label: "Stable", pulse: false },
  declining: { color: "#F87171", bg: "rgba(248,113,113,0.1)", border: "rgba(248,113,113,0.2)", label: "Declining", pulse: false },
};

function InDemandSkillsSection({ skills }: { skills: InDemandSkill[] }) {
  return (
    <motion.div
      {...fadeUp(0.12)}
      className="rounded-2xl p-5"
      style={{ background: "#0C0C14", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <SectionHeader icon={Zap} title="In-Demand Skills" count={skills.length} color="#FBBF24" />
      <div className="flex flex-wrap gap-2.5">
        {skills.map((skill, i) => {
          const cfg = DEMAND_CONFIG[skill.demand_level];
          const isDecline = skill.demand_level === "declining";
          return (
            <div
              key={i}
              className="group relative flex items-center gap-2 px-3 py-2 rounded-xl cursor-default"
              style={{
                background: cfg.bg,
                border: `1px solid ${cfg.border}`,
              }}
            >
              {cfg.pulse && (
                <span
                  className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full animate-pulse"
                  style={{ background: cfg.color }}
                />
              )}
              <span
                className={`text-[13px] font-medium ${isDecline ? "line-through opacity-60" : ""}`}
                style={{ color: isDecline ? "#F87171" : "#F0F0FF" }}
              >
                {skill.skill}
              </span>
              <span
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{
                  background: `${cfg.color}18`,
                  color: cfg.color,
                  fontFamily: "monospace, monospace",
                }}
              >
                {cfg.label}
              </span>
              {skill.avg_salary_premium && (
                <span
                  className="text-[11px] font-bold"
                  style={{ color: "#8B5CF6", fontFamily: "monospace, monospace" }}
                >
                  {skill.avg_salary_premium}
                </span>
              )}
              {/* Tooltip on hover */}
              <div
                className="absolute left-0 top-full mt-2 z-20 px-3 py-2 rounded-xl text-[12px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap"
                style={{
                  background: "#1A1A2E",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#9090B8",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                }}
              >
                Needed for: {skill.roles_that_need_it.join(", ")}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ─── Companies Hiring Section ─────────────────────────────────────────────────

function GrowthStageBadge({ stage }: { stage: string }) {
  const lower = stage.toLowerCase();
  let color = "#9090B8";
  let bg = "rgba(144,144,184,0.1)";
  let border = "rgba(144,144,184,0.2)";
  if (lower.includes("series") || lower.includes("startup") || lower.includes("seed")) {
    color = "#34D399"; bg = "rgba(52,211,153,0.1)"; border = "rgba(52,211,153,0.2)";
  } else if (lower.includes("unicorn") || lower.includes("pre-ipo") || lower.includes("growth")) {
    color = "#FBBF24"; bg = "rgba(251,191,36,0.1)"; border = "rgba(251,191,36,0.2)";
  } else if (lower.includes("public") || lower.includes("post-ipo") || lower.includes("nasdaq") || lower.includes("nyse")) {
    color = "#60A5FA"; bg = "rgba(96,165,250,0.1)"; border = "rgba(96,165,250,0.2)";
  }
  return (
    <span
      className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide"
      style={{ color, background: bg, border: `1px solid ${border}`, fontFamily: "monospace, monospace" }}
    >
      {stage}
    </span>
  );
}

function HiringCompaniesSection({ companies }: { companies: HiringCompany[] }) {
  return (
    <motion.div
      {...fadeUp(0.14)}
      className="rounded-2xl p-5"
      style={{ background: "#0C0C14", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <SectionHeader icon={Building2} title="Companies Hiring Most" count={companies.length} color="#60A5FA" />
      <div className="grid grid-cols-1 gap-3">
        {companies.map((co, i) => (
          <div
            key={i}
            className="rounded-xl p-4"
            style={{
              background: "rgba(255,255,255,0.025)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-[14px] font-semibold" style={{ color: "#F0F0FF" }}>
                  {co.company}
                </span>
                <GrowthStageBadge stage={co.growth_stage} />
              </div>
              <span
                className="text-[11px] font-bold flex-shrink-0"
                style={{ color: "#34D399", fontFamily: "monospace, monospace" }}
              >
                {co.open_roles_estimate}
              </span>
            </div>
            <p className="text-[12px] mb-2.5" style={{ color: "#9090B8" }}>
              {co.why_hiring}
            </p>
            <div className="flex items-center gap-1.5 flex-wrap">
              {co.roles_they_need.map((r) => (
                <span
                  key={r}
                  className="text-[11px] px-2 py-0.5 rounded-full"
                  style={{
                    background: "rgba(96,165,250,0.08)",
                    color: "#60A5FA",
                    border: "1px solid rgba(96,165,250,0.18)",
                  }}
                >
                  {r}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Declining Areas Section ──────────────────────────────────────────────────

function DecliningAreasSection({ areas }: { areas: DecliningArea[] }) {
  return (
    <motion.div
      {...fadeUp(0.16)}
      className="rounded-2xl p-5"
      style={{ background: "#0C0C14", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <SectionHeader icon={TrendingDown} title="Declining Areas" count={areas.length} color="#F87171" />
      <div className="space-y-3">
        {areas.map((area, i) => (
          <div
            key={i}
            className="rounded-xl p-4"
            style={{
              background: "rgba(248,113,113,0.05)",
              border: "1px solid rgba(248,113,113,0.15)",
            }}
          >
            <div className="flex items-start gap-2.5 mb-2">
              <AlertTriangle size={14} style={{ color: "#F87171", flexShrink: 0, marginTop: 1 }} />
              <span className="text-[14px] font-semibold" style={{ color: "#F0F0FF" }}>
                {area.area}
              </span>
            </div>
            <p className="text-[12px] mb-2.5 ml-5.5" style={{ color: "#9090B8" }}>
              {area.reason}
            </p>
            <div
              className="flex items-start gap-2 ml-5.5 p-2.5 rounded-lg"
              style={{ background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.15)" }}
            >
              <Lightbulb size={12} style={{ color: "#FBBF24", flexShrink: 0, marginTop: 1 }} />
              <span className="text-[12px]" style={{ color: "#FBBF24" }}>
                {area.pivot_suggestion}
              </span>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Salary Trends Section ────────────────────────────────────────────────────

function SalaryTrendsSection({ trends }: { trends: SalaryTrends }) {
  return (
    <motion.div
      {...fadeUp(0.18)}
      className="rounded-2xl p-5"
      style={{ background: "#0C0C14", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <SectionHeader icon={DollarSign} title="Salary Trends" color="#8B5CF6" />
      <div className="space-y-4">
        <p className="text-[14px] leading-relaxed" style={{ color: "#C0C0D8" }}>
          {trends.overall_trend}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            className="rounded-xl p-4"
            style={{ background: "rgba(139,92,246,0.07)", border: "1px solid rgba(139,92,246,0.18)" }}
          >
            <p className="text-[11px] font-bold uppercase tracking-widest mb-3"
              style={{ color: "#8B5CF6", fontFamily: "monospace, monospace" }}>
              Highest Paying Roles
            </p>
            <div className="space-y-1.5">
              {trends.highest_paying_roles.map((role, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span
                    className="text-[10px] font-bold w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(139,92,246,0.15)", color: "#8B5CF6", fontFamily: "monospace, monospace" }}
                  >
                    {i + 1}
                  </span>
                  <span className="text-[13px]" style={{ color: "#F0F0FF" }}>{role}</span>
                </div>
              ))}
            </div>
          </div>
          <div
            className="rounded-xl p-4"
            style={{ background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.15)" }}
          >
            <p className="text-[11px] font-bold uppercase tracking-widest mb-3"
              style={{ color: "#34D399", fontFamily: "monospace, monospace" }}>
              Fastest Growing Comp
            </p>
            <div className="space-y-1.5">
              {trends.fastest_growing_comp.map((role, i) => (
                <div key={i} className="flex items-center gap-2">
                  <TrendingUp size={11} style={{ color: "#34D399", flexShrink: 0 }} />
                  <span className="text-[13px]" style={{ color: "#F0F0FF" }}>{role}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Hot Locations Section ────────────────────────────────────────────────────

function HotLocationsSection({ locations }: { locations: HotLocation[] }) {
  return (
    <motion.div
      {...fadeUp(0.2)}
      className="rounded-2xl p-5"
      style={{ background: "#0C0C14", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <SectionHeader icon={MapPin} title="Hot Locations" count={locations.length} color="#2DD4BF" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {locations.map((loc, i) => (
          <div
            key={i}
            className="rounded-xl p-4"
            style={{ background: "rgba(45,212,191,0.06)", border: "1px solid rgba(45,212,191,0.15)" }}
          >
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2">
                <MapPin size={13} style={{ color: "#2DD4BF", flexShrink: 0 }} />
                <span className="text-[14px] font-semibold" style={{ color: "#F0F0FF" }}>
                  {loc.location}
                </span>
              </div>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                style={{
                  background: "rgba(139,92,246,0.12)",
                  color: "#8B5CF6",
                  border: "1px solid rgba(139,92,246,0.2)",
                  fontFamily: "monospace, monospace",
                }}
              >
                {loc.remote_ratio}
              </span>
            </div>
            <p className="text-[12px]" style={{ color: "#9090B8" }}>{loc.why_hot}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Personalized Insights Section ───────────────────────────────────────────

const URGENCY_CONFIG: Record<
  PersonalizedInsight["urgency"],
  { color: string; bg: string; border: string; label: string }
> = {
  immediate: { color: "#F87171", bg: "rgba(248,113,113,0.1)", border: "rgba(248,113,113,0.25)", label: "Immediate" },
  "this-week": { color: "#FBBF24", bg: "rgba(251,191,36,0.1)", border: "rgba(251,191,36,0.25)", label: "This Week" },
  "this-month": { color: "#60A5FA", bg: "rgba(96,165,250,0.1)", border: "rgba(96,165,250,0.25)", label: "This Month" },
};

function PersonalizedInsightsSection({ insights }: { insights: PersonalizedInsight[] }) {
  if (!insights.length) return null;

  return (
    <motion.div
      {...fadeUp(0.22)}
      className="rounded-2xl p-5"
      style={{
        background: "#0C0C14",
        border: "1px solid rgba(251,191,36,0.25)",
      }}
    >
      <SectionHeader icon={Sparkles} title="Personalized for You" count={insights.length} color="#FBBF24" />
      <div className="space-y-3">
        {insights.map((item, i) => {
          const cfg = URGENCY_CONFIG[item.urgency];
          return (
            <div
              key={i}
              className="rounded-xl p-4"
              style={{ background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.12)" }}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <p className="text-[13px] leading-relaxed flex-1" style={{ color: "#F0F0FF" }}>
                  {item.insight}
                </p>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 whitespace-nowrap"
                  style={{
                    background: cfg.bg,
                    color: cfg.color,
                    border: `1px solid ${cfg.border}`,
                    fontFamily: "monospace, monospace",
                  }}
                >
                  {cfg.label}
                </span>
              </div>
              <div
                className="flex items-start gap-2 p-2.5 rounded-lg"
                style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.15)" }}
              >
                <span className="text-[11px] font-semibold flex-shrink-0 mt-0.5" style={{ color: "#8B5CF6" }}>
                  Action:
                </span>
                <span className="text-[12px]" style={{ color: "#C0C0D8" }}>
                  {item.action}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ─── Market Prediction Block ──────────────────────────────────────────────────

function MarketPredictionBlock({ text }: { text: string }) {
  return (
    <motion.div
      {...fadeUp(0.24)}
      className="rounded-2xl p-6"
      style={{
        background: "linear-gradient(135deg, rgba(124,58,237,0.1) 0%, rgba(139,92,246,0.05) 100%)",
        border: "1px solid rgba(124,58,237,0.25)",
      }}
    >
      <div className="flex items-center gap-2.5 mb-3">
        <div
          className="w-8 h-8 rounded-[9px] flex items-center justify-center"
          style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.25)" }}
        >
          <TrendingUp size={15} style={{ color: "#8B5CF6" }} />
        </div>
        <span className="text-[14px] font-semibold" style={{ color: "#F0F0FF" }}>
          30-Day Outlook
        </span>
      </div>
      <blockquote
        className="relative pl-4 text-[14px] leading-relaxed italic"
        style={{
          color: "#C0C0D8",
          borderLeft: "2px solid rgba(124,58,237,0.5)",
        }}
      >
        {text}
      </blockquote>
    </motion.div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[120, 80, 200, 160, 140].map((h, i) => (
        <div
          key={i}
          className="rounded-2xl"
          style={{ height: h, background: "#0C0C14", border: "1px solid rgba(255,255,255,0.05)" }}
        />
      ))}
    </div>
  );
}

// ─── Error state ──────────────────────────────────────────────────────────────

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      className="rounded-2xl p-8 flex flex-col items-center gap-4 text-center"
      style={{ background: "#0C0C14", border: "1px solid rgba(248,113,113,0.2)" }}
    >
      <AlertCircle size={28} style={{ color: "#F87171" }} />
      <div>
        <p className="text-[15px] font-semibold mb-1" style={{ color: "#F0F0FF" }}>
          Could not load market data
        </p>
        <p className="text-[13px]" style={{ color: "#9090B8" }}>{message}</p>
      </div>
      <button
        onClick={onRetry}
        className="px-5 py-2 rounded-xl text-[13px] font-semibold transition-all"
        style={{
          background: "rgba(248,113,113,0.1)",
          color: "#F87171",
          border: "1px solid rgba(248,113,113,0.2)",
        }}
      >
        Try Again
      </button>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onGenerate, isPending }: { onGenerate: () => void; isPending: boolean }) {
  return (
    <motion.div
      {...fadeUp(0.05)}
      className="rounded-2xl p-12 flex flex-col items-center gap-5 text-center"
      style={{ background: "#0C0C14", border: "1px solid rgba(124,58,237,0.2)" }}
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.25)" }}
      >
        <TrendingUp size={28} style={{ color: "#8B5CF6" }} />
      </div>
      <div>
        <p className="text-[18px] font-bold mb-2" style={{ color: "#F0F0FF" }}>
          No report yet
        </p>
        <p className="text-[14px]" style={{ color: "#9090B8" }}>
          Generate your first market intelligence report to see what the job market looks like right now.
        </p>
      </div>
      <button
        onClick={onGenerate}
        disabled={isPending}
        className="px-6 py-3 rounded-xl text-[14px] font-semibold flex items-center gap-2 transition-all disabled:opacity-50"
        style={{
          background: isPending ? "rgba(124,58,237,0.5)" : "#7C3AED",
          color: "#F0F0FF",
          boxShadow: isPending ? "none" : "0 0 20px rgba(124,58,237,0.3)",
        }}
      >
        {isPending ? (
          <><Loader2 size={16} className="animate-spin" />Analyzing market...</>
        ) : (
          <><Sparkles size={16} />Generate Report</>
        )}
      </button>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MarketPage() {
  const [timeframe, setTimeframe] = useState<"this-week" | "this-month">("this-week");

  const { data: getResp, isLoading, isError, error, refetch } = useQuery<GetResponse, Error>({
    queryKey: ["market", "latest"],
    queryFn: () => apiFetch<GetResponse>("/api/market"),
    staleTime: 5 * 60 * 1000,
  });

  const generateMutation = useMutation<PostResponse, Error, { timeframe: "this-week" | "this-month" }>({
    mutationFn: (vars) =>
      apiFetch<PostResponse>("/api/market", {
        method: "POST",
        body: JSON.stringify({ timeframe: vars.timeframe }),
      }),
    onSuccess: () => {
      void refetch();
    },
  });

  const report = generateMutation.data?.report ?? getResp?.report ?? null;
  const stale = generateMutation.data
    ? generateMutation.data.stale
    : report
    ? isStaleReport(report.generatedAt)
    : false;

  const handleRefresh = () => {
    generateMutation.mutate({ timeframe });
  };

  return (
    <div className="min-h-screen" style={{ background: "#060608" }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Header */}
        <motion.div {...fadeUp(0)} className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0"
              style={{
                background: "rgba(124,58,237,0.15)",
                border: "1px solid rgba(124,58,237,0.3)",
              }}
            >
              <TrendingUp size={18} style={{ color: "#8B5CF6" }} />
            </div>
            <div>
              <h1 className="text-[22px] font-bold" style={{ color: "#F0F0FF" }}>
                Market Intelligence
              </h1>
              <p className="text-[13px]" style={{ color: "#9090B8" }}>
                What the job market looks like right now
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Timeframe selector */}
            <div
              className="flex rounded-xl overflow-hidden"
              style={{ border: "1px solid rgba(255,255,255,0.07)" }}
            >
              {(["this-week", "this-month"] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className="px-3 py-1.5 text-[12px] font-medium transition-all"
                  style={{
                    background: timeframe === tf ? "rgba(124,58,237,0.2)" : "transparent",
                    color: timeframe === tf ? "#8B5CF6" : "#9090B8",
                  }}
                >
                  {tf === "this-week" ? "This Week" : "This Month"}
                </button>
              ))}
            </div>
            {/* Refresh button */}
            <button
              onClick={handleRefresh}
              disabled={generateMutation.isPending}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-[13px] font-semibold transition-all disabled:opacity-50"
              style={{
                background: generateMutation.isPending
                  ? "rgba(124,58,237,0.3)"
                  : "rgba(124,58,237,0.15)",
                color: "#8B5CF6",
                border: "1px solid rgba(124,58,237,0.25)",
              }}
            >
              {generateMutation.isPending ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <RefreshCw size={13} />
              )}
              {generateMutation.isPending ? "Generating..." : "Refresh"}
            </button>
          </div>
        </motion.div>

        {/* Report metadata bar */}
        <AnimatePresence>
          {report && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-3 flex-wrap"
            >
              <div className="flex items-center gap-1.5" style={{ color: "#3A3A60" }}>
                <Clock size={12} />
                <span className="text-[12px]">Last updated {timeAgo(report.generatedAt)}</span>
              </div>
              {stale && (
                <span
                  className="text-[11px] px-2 py-0.5 rounded-full"
                  style={{
                    background: "rgba(251,191,36,0.08)",
                    color: "#FBBF24",
                    border: "1px solid rgba(251,191,36,0.2)",
                  }}
                >
                  Stale — refresh for latest
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error from generate mutation */}
        <AnimatePresence>
          {generateMutation.isError && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-center gap-2 p-3 rounded-xl text-[13px]"
              style={{
                background: "rgba(248,113,113,0.08)",
                color: "#F87171",
                border: "1px solid rgba(248,113,113,0.2)",
              }}
            >
              <AlertCircle size={14} />
              {generateMutation.error.message}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Body */}
        {isLoading ? (
          <LoadingSkeleton />
        ) : isError ? (
          <ErrorState
            message={(error as Error)?.message ?? "Something went wrong"}
            onRetry={() => void refetch()}
          />
        ) : !report && !generateMutation.isPending ? (
          <EmptyState
            onGenerate={handleRefresh}
            isPending={generateMutation.isPending}
          />
        ) : generateMutation.isPending && !report ? (
          <LoadingSkeleton />
        ) : report ? (
          <div className="space-y-5">
            <TemperatureBanner report={report} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <TrendingRolesSection roles={report.trending_roles} />
              <InDemandSkillsSection skills={report.in_demand_skills} />
            </div>

            <HiringCompaniesSection companies={report.hiring_companies} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <DecliningAreasSection areas={report.declining_areas} />
              <SalaryTrendsSection trends={report.salary_trends} />
            </div>

            <HotLocationsSection locations={report.hot_locations} />

            {report.personalized_insights.length > 0 && (
              <PersonalizedInsightsSection insights={report.personalized_insights} />
            )}

            <MarketPredictionBlock text={report.market_prediction} />
          </div>
        ) : null}

      </div>
    </div>
  );
}
