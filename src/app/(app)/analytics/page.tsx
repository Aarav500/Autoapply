"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { motion } from "framer-motion";
import { BarChart2, Flame, TrendingUp, Send, CalendarDays, Clock, Target, Award } from "lucide-react";

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bgBase:       "#060608",
  bgSurface:    "#0C0C14",
  bgElevated:   "#111120",
  accent:       "#8B5CF6",
  accentBright: "#7C3AED",
  textPrimary:  "#F0F0FF",
  textSecondary:"#9090B8",
  textMuted:    "#3A3A60",
  border:       "rgba(255,255,255,0.07)",
  green:        "#34D399",
  amber:        "#FBBF24",
  red:          "#F87171",
  blue:         "#60A5FA",
} as const;

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: "easeOut" as const, delay },
});

// ── Types ──────────────────────────────────────────────────────────────────────
interface DailyEntry  { date: string; count: number }
interface WeeklyEntry { week: string; count: number; responseRate: number }
interface ConversionFunnel {
  applied: number; screening: number; interview: number; offer: number; rejected: number;
}
interface Analytics {
  dailyApps:        DailyEntry[];
  weeklyApps:       WeeklyEntry[];
  responseRate:     number;
  conversionFunnel: ConversionFunnel;
  bestApplyDay:     string;
  bestApplyHour:    string;
  avgTimeToResponse:number;
  streak:           number;
  longestStreak:    number;
  totalApplied:     number;
  thisWeekApps:     number;
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({
  label, value, sub, icon: Icon, color, delay = 0,
}: {
  label: string; value: string | number; sub: string;
  icon: React.ElementType; color: string; delay?: number;
}) {
  return (
    <motion.div
      {...fadeUp(delay)}
      className="relative overflow-hidden rounded-[14px] p-5"
      style={{ background: C.bgSurface, border: `1px solid ${C.border}` }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
    >
      <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-[14px]" style={{ background: color }} />
      <div className="absolute top-3 right-3 w-12 h-12 rounded-full opacity-20 pointer-events-none" style={{ background: color, filter: "blur(14px)" }} />
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[28px] font-bold leading-none mb-1" style={{ color }}>{value}</div>
          <div className="text-[13px] font-medium" style={{ color: C.textSecondary }}>{label}</div>
          <div className="text-[11px] mt-0.5" style={{ color: C.textMuted }}>{sub}</div>
        </div>
        <div className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
          <Icon size={16} style={{ color }} />
        </div>
      </div>
    </motion.div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton({ h = 20, w = "100%", rounded = 8 }: { h?: number; w?: string | number; rounded?: number }) {
  return (
    <div
      className="animate-pulse"
      style={{ height: h, width: w, borderRadius: rounded, background: "rgba(255,255,255,0.05)" }}
    />
  );
}

// ── Conversion Funnel ─────────────────────────────────────────────────────────
function ConversionFunnelChart({ funnel }: { funnel: ConversionFunnel }) {
  const stages = [
    { label: "Applied",   value: funnel.applied,   color: C.accentBright },
    { label: "Screening", value: funnel.screening, color: C.accent },
    { label: "Interview", value: funnel.interview, color: C.blue },
    { label: "Offer",     value: funnel.offer,     color: C.green },
  ];
  const base = Math.max(funnel.applied, 1);

  return (
    <div className="space-y-0">
      {stages.map((stage, i) => {
        const pct = Math.round((stage.value / base) * 100);
        const nextStage = stages[i + 1];
        const dropPct = nextStage
          ? stage.value > 0 ? Math.round((1 - nextStage.value / Math.max(stage.value, 1)) * 100) : 0
          : null;

        return (
          <div key={stage.label}>
            <div className="flex items-center gap-3 py-2">
              <div className="w-[80px] text-right flex-shrink-0">
                <span className="text-[12px] font-medium" style={{ color: C.textSecondary }}>{stage.label}</span>
              </div>
              <div className="flex-1 relative h-[30px] flex items-center">
                <div className="h-full rounded-[5px] absolute inset-0" style={{ background: "rgba(255,255,255,0.03)" }} />
                <motion.div
                  className="h-full rounded-[5px] absolute left-0 top-0 flex items-center px-3"
                  style={{ background: `${stage.color}22`, border: `1px solid ${stage.color}40` }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(pct, 2)}%` }}
                  transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 + i * 0.1 }}
                >
                  <span className="text-[11px] font-semibold whitespace-nowrap" style={{ color: stage.color }}>
                    {stage.value}
                  </span>
                </motion.div>
              </div>
              <div className="w-[42px] flex-shrink-0 text-right">
                <span className="text-[11px]" style={{ color: C.textMuted }}>{pct}%</span>
              </div>
            </div>
            {dropPct !== null && (
              <div className="flex items-center gap-3 py-0.5">
                <div className="w-[80px]" />
                <div className="flex items-center gap-1.5 ml-2">
                  <div className="h-[1px] w-3" style={{ background: "rgba(255,255,255,0.08)" }} />
                  <span className="text-[10px]" style={{ color: "#4A4A70" }}>
                    {dropPct}% drop-off → {stages[i + 1]?.label}
                  </span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Weekly Velocity Chart (pure CSS bars) ─────────────────────────────────────
function WeeklyVelocityChart({ weeks }: { weeks: WeeklyEntry[] }) {
  const maxCount = Math.max(...weeks.map((w) => w.count), 1);
  const currentWeekIdx = weeks.length - 1;

  return (
    <div>
      <div className="flex items-end gap-1.5 h-24">
        {weeks.map((w, i) => {
          const pct = (w.count / maxCount) * 100;
          const isCurrent = i === currentWeekIdx;
          return (
            <div key={w.week} className="flex-1 flex flex-col items-center gap-1 group relative">
              {/* Tooltip */}
              <div
                className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 px-2 py-1 rounded-[6px] text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10"
                style={{ background: C.bgElevated, border: `1px solid ${C.border}`, color: C.textSecondary }}
              >
                {w.count} apps · {w.responseRate}% resp
              </div>
              <motion.div
                className="w-full rounded-t-sm"
                style={{
                  background: isCurrent
                    ? `linear-gradient(180deg, ${C.accent}, ${C.accentBright})`
                    : "rgba(255,255,255,0.07)",
                  boxShadow: isCurrent ? `0 0 8px rgba(124,58,237,0.4)` : "none",
                  minHeight: 3,
                }}
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(pct, 4)}%` }}
                transition={{ duration: 0.6, ease: "easeOut", delay: i * 0.03 }}
              />
              {w.count > 0 && (
                <span className="text-[9px]" style={{ color: isCurrent ? C.accent : C.textMuted, fontFamily: "monospace" }}>
                  {w.count}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex gap-1.5 mt-1">
        {weeks.map((w, i) => {
          const d = new Date(w.week + 'T00:00:00');
          const label = isNaN(d.getTime()) ? w.week.slice(5) : `${d.getMonth() + 1}/${d.getDate()}`;
          return (
            <div key={w.week} className="flex-1 text-center">
              <span className="text-[9px]" style={{ color: i === weeks.length - 1 ? C.accent : C.textMuted }}>
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Daily Heatmap (5-week calendar grid) ─────────────────────────────────────
function DailyHeatmap({ daily }: { daily: DailyEntry[] }) {
  // Build 35-day grid (5 weeks) ending today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayMap = new Map(daily.map((d) => [d.date, d.count]));
  const maxCount = Math.max(...daily.map((d) => d.count), 1);

  const cells: Array<{ date: string; count: number; label: string }> = [];
  for (let i = 34; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const count = dayMap.get(key) ?? 0;
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    cells.push({ date: key, count, label });
  }

  // Intensity colour
  const getColor = (count: number): string => {
    if (count === 0) return "rgba(255,255,255,0.04)";
    const intensity = count / maxCount;
    if (intensity > 0.75) return C.accent;
    if (intensity > 0.5)  return `${C.accent}BB`;
    if (intensity > 0.25) return `${C.accent}70`;
    return `${C.accent}35`;
  };

  const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];

  // Pad so grid starts on Monday
  const firstCell = cells[0];
  const firstDate = new Date(firstCell.date + 'T00:00:00');
  const firstDow = firstDate.getDay(); // 0=Sun
  const padBefore = firstDow === 0 ? 6 : firstDow - 1; // days to pad at start

  const paddedCells: Array<{ date: string; count: number; label: string } | null> = [
    ...Array(padBefore).fill(null),
    ...cells,
  ];
  // Trim to complete rows of 7
  while (paddedCells.length % 7 !== 0) paddedCells.push(null);

  const rows: Array<Array<{ date: string; count: number; label: string } | null>> = [];
  for (let i = 0; i < paddedCells.length; i += 7) {
    rows.push(paddedCells.slice(i, i + 7));
  }

  return (
    <div>
      {/* Day-of-week header */}
      <div className="grid gap-1.5 mb-1.5" style={{ gridTemplateColumns: "repeat(7, 1fr)" }}>
        {dayLabels.map((d, i) => (
          <div key={i} className="text-center">
            <span className="text-[9px] font-medium" style={{ color: C.textMuted }}>{d}</span>
          </div>
        ))}
      </div>
      {/* Rows */}
      <div className="space-y-1.5">
        {rows.map((row, ri) => (
          <div key={ri} className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(7, 1fr)" }}>
            {row.map((cell, ci) => (
              <div key={ci} className="group relative">
                <div
                  className="rounded-[4px] transition-all cursor-default"
                  style={{
                    height: 14,
                    background: cell ? getColor(cell.count) : "transparent",
                    border: cell ? `1px solid ${cell.count > 0 ? `${C.accent}30` : "rgba(255,255,255,0.03)"}` : "none",
                  }}
                />
                {cell && cell.count > 0 && (
                  <div
                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded-[5px] text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10"
                    style={{ background: C.bgElevated, border: `1px solid ${C.border}`, color: C.textSecondary }}
                  >
                    {cell.label}: {cell.count} app{cell.count !== 1 ? "s" : ""}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
      {/* Legend */}
      <div className="flex items-center gap-1.5 mt-3 justify-end">
        <span className="text-[10px]" style={{ color: C.textMuted }}>Less</span>
        {[0, 0.25, 0.5, 0.75, 1].map((intensity, i) => (
          <div
            key={i}
            className="rounded-[3px]"
            style={{
              width: 10, height: 10,
              background: intensity === 0 ? "rgba(255,255,255,0.04)" : `${C.accent}${Math.round(intensity * 255).toString(16).padStart(2, '0')}`,
              border: "1px solid rgba(255,255,255,0.04)",
            }}
          />
        ))}
        <span className="text-[10px]" style={{ color: C.textMuted }}>More</span>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const { data: raw, isLoading, isError } = useQuery({
    queryKey: ["applicationAnalytics"],
    queryFn: () => apiFetch<Analytics>("/api/analytics/applications"),
    refetchInterval: 120000,
    retry: false,
  });

  const analytics: Analytics | null = (raw as Analytics) ?? null;

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <motion.div {...fadeUp(0)}>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-[10px] flex items-center justify-center" style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.25)" }}>
            <BarChart2 size={17} style={{ color: C.accent }} />
          </div>
          <h1 className="text-[22px] font-bold" style={{ color: C.textPrimary, letterSpacing: "-0.02em" }}>Application Analytics</h1>
        </div>
        <p className="text-[13px] ml-12" style={{ color: C.textMuted }}>
          Insights into your application velocity, response rates, and timing patterns.
        </p>
      </motion.div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {isLoading ? (
          <>
            {[0, 0.05, 0.1, 0.15].map((d, i) => (
              <motion.div key={i} {...fadeUp(d)} className="rounded-[14px] p-5" style={{ background: C.bgSurface, border: `1px solid ${C.border}` }}>
                <Skeleton h={28} w="60%" />
                <div className="mt-2"><Skeleton h={13} w="80%" /></div>
                <div className="mt-1"><Skeleton h={11} w="50%" /></div>
              </motion.div>
            ))}
          </>
        ) : isError ? (
          <div className="col-span-4 text-center py-8" style={{ color: C.textMuted }}>Failed to load analytics.</div>
        ) : analytics ? (
          <>
            <StatCard label="Total Applied"   value={analytics.totalApplied}              sub="All time"                          icon={Send}       color={C.accent}  delay={0}    />
            <StatCard label="This Week"       value={analytics.thisWeekApps}              sub="Mon–Sun"                           icon={CalendarDays} color={C.blue}  delay={0.05} />
            <StatCard label="Response Rate"   value={`${analytics.responseRate}%`}        sub="Screening, interview, or offer"    icon={TrendingUp} color={C.green}   delay={0.1}  />
            <StatCard
              label="Current Streak"
              value={analytics.streak > 0 ? `${analytics.streak}d` : "0"}
              sub={analytics.streak > 0 ? `Longest: ${analytics.longestStreak}d` : "Apply today to start!"}
              icon={Flame}
              color={analytics.streak > 0 ? C.amber : C.textMuted}
              delay={0.15}
            />
          </>
        ) : null}
      </div>

      {/* Conversion Funnel + Best Timing */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-4">
        {/* Funnel */}
        <motion.div {...fadeUp(0.2)} className="rounded-[14px] p-5" style={{ background: C.bgSurface, border: `1px solid ${C.border}` }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-[14px] font-semibold" style={{ color: C.textPrimary }}>Conversion Funnel</h2>
              <p className="text-[11px] mt-0.5" style={{ color: C.textMuted }}>Applied → Offer pipeline</p>
            </div>
            <Award size={16} style={{ color: C.textMuted }} />
          </div>
          {isLoading ? (
            <div className="space-y-3">
              {[0, 1, 2, 3].map((i) => <Skeleton key={i} h={30} />)}
            </div>
          ) : analytics ? (
            <ConversionFunnelChart funnel={analytics.conversionFunnel} />
          ) : null}
        </motion.div>

        {/* Best apply timing */}
        <motion.div {...fadeUp(0.25)} className="rounded-[14px] p-5" style={{ background: C.bgSurface, border: `1px solid ${C.border}` }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-[14px] font-semibold" style={{ color: C.textPrimary }}>Optimal Apply Times</h2>
              <p className="text-[11px] mt-0.5" style={{ color: C.textMuted }}>Based on your response data</p>
            </div>
            <Clock size={16} style={{ color: C.textMuted }} />
          </div>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton h={56} />
              <Skeleton h={56} />
              <Skeleton h={40} />
            </div>
          ) : analytics ? (
            <div className="space-y-3">
              <div className="rounded-[10px] p-3.5" style={{ background: "rgba(52,211,153,0.07)", border: "1px solid rgba(52,211,153,0.18)" }}>
                <div className="flex items-center gap-2 mb-1">
                  <CalendarDays size={12} style={{ color: C.green }} />
                  <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: C.green }}>Best Day</span>
                </div>
                <div className="text-[20px] font-bold" style={{ color: C.textPrimary }}>{analytics.bestApplyDay}</div>
                <p className="text-[11px] mt-0.5" style={{ color: C.textMuted }}>Highest response rate per application</p>
              </div>

              <div className="rounded-[10px] p-3.5" style={{ background: "rgba(139,92,246,0.07)", border: "1px solid rgba(139,92,246,0.18)" }}>
                <div className="flex items-center gap-2 mb-1">
                  <Clock size={12} style={{ color: C.accent }} />
                  <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: C.accent }}>Best Hours</span>
                </div>
                <div className="text-[20px] font-bold" style={{ color: C.textPrimary }}>{analytics.bestApplyHour}</div>
                <p className="text-[11px] mt-0.5" style={{ color: C.textMuted }}>Recruiters review early in the day</p>
              </div>

              {analytics.avgTimeToResponse > 0 && (
                <div className="rounded-[10px] p-3.5" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}` }}>
                  <div className="flex items-center gap-2 mb-1">
                    <Target size={12} style={{ color: C.blue }} />
                    <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: C.blue }}>Avg. Time to Response</span>
                  </div>
                  <div className="text-[20px] font-bold" style={{ color: C.textPrimary }}>
                    {analytics.avgTimeToResponse}d
                  </div>
                  <p className="text-[11px] mt-0.5" style={{ color: C.textMuted }}>Days from application to first reply</p>
                </div>
              )}
            </div>
          ) : null}
        </motion.div>
      </div>

      {/* Weekly velocity chart */}
      <motion.div {...fadeUp(0.3)} className="rounded-[14px] p-5" style={{ background: C.bgSurface, border: `1px solid ${C.border}` }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-[14px] font-semibold" style={{ color: C.textPrimary }}>Weekly Application Velocity</h2>
            <p className="text-[11px] mt-0.5" style={{ color: C.textMuted }}>Last 12 weeks · hover a bar for response rate</p>
          </div>
          <TrendingUp size={16} style={{ color: C.textMuted }} />
        </div>
        {isLoading ? (
          <Skeleton h={100} />
        ) : analytics && analytics.weeklyApps.length > 0 ? (
          <WeeklyVelocityChart weeks={analytics.weeklyApps} />
        ) : (
          <div className="h-24 flex items-center justify-center">
            <span className="text-[12px]" style={{ color: C.textMuted }}>No application data yet</span>
          </div>
        )}
      </motion.div>

      {/* Daily heatmap */}
      <motion.div {...fadeUp(0.35)} className="rounded-[14px] p-5" style={{ background: C.bgSurface, border: `1px solid ${C.border}` }}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-[14px] font-semibold" style={{ color: C.textPrimary }}>Activity Heatmap</h2>
            <p className="text-[11px] mt-0.5" style={{ color: C.textMuted }}>Last 35 days · darker = more applications</p>
          </div>
          <div className="flex items-center gap-2">
            {analytics && analytics.streak > 0 && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.25)", color: C.amber }}>
                <Flame size={11} />
                {analytics.streak}-day streak
              </div>
            )}
          </div>
        </div>
        {isLoading ? (
          <div className="space-y-1.5">
            {[0,1,2,3,4].map((i) => <Skeleton key={i} h={14} />)}
          </div>
        ) : analytics && analytics.dailyApps.length > 0 ? (
          <DailyHeatmap daily={analytics.dailyApps} />
        ) : (
          <div className="h-20 flex items-center justify-center">
            <span className="text-[12px]" style={{ color: C.textMuted }}>No activity data yet</span>
          </div>
        )}
      </motion.div>
    </div>
  );
}
