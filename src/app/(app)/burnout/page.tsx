"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useCallback } from "react";
import {
  Heart,
  Loader2,
  AlertCircle,
  Sparkles,
  Plus,
  X,
  TrendingUp,
  Zap,
  Trophy,
  BedDouble,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface BurnoutEntry {
  id: string;
  date: string;
  mood: 1 | 2 | 3 | 4 | 5;
  energy: 1 | 2 | 3 | 4 | 5;
  applicationsToday: number;
  wins: string[];
  feelings: string;
  aiMessage?: string;
}

type BurnoutRisk = "low" | "moderate" | "high" | "critical";

interface GetResponse {
  log: BurnoutEntry[];
  burnout_score: number;
  burnout_risk: BurnoutRisk;
}

interface LogResponse {
  entry: BurnoutEntry;
  burnout_risk: BurnoutRisk;
  message: string;
}

interface AdviceResponse {
  advice: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const MOOD_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: "Burned out", color: "#EF4444" },
  2: { label: "Struggling", color: "#F97316" },
  3: { label: "Holding on", color: "#FBBF24" },
  4: { label: "Pretty good", color: "#A3E635" },
  5: { label: "Energized", color: "#34D399" },
};

const ENERGY_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: "Depleted", color: "#EF4444" },
  2: { label: "Low", color: "#F97316" },
  3: { label: "Okay", color: "#FBBF24" },
  4: { label: "Good", color: "#A3E635" },
  5: { label: "High", color: "#34D399" },
};

const RISK_CONFIG: Record<BurnoutRisk, { label: string; color: string; bg: string; border: string; description: string }> = {
  low: {
    label: "Low Risk",
    color: "#34D399",
    bg: "rgba(52,211,153,0.08)",
    border: "rgba(52,211,153,0.25)",
    description: "You're in a healthy state. Keep up the good work.",
  },
  moderate: {
    label: "Moderate",
    color: "#FBBF24",
    bg: "rgba(251,191,36,0.08)",
    border: "rgba(251,191,36,0.25)",
    description: "Some signs of wear. Consider adding rest days.",
  },
  high: {
    label: "High Risk",
    color: "#F97316",
    bg: "rgba(249,115,22,0.08)",
    border: "rgba(249,115,22,0.25)",
    description: "Take a deliberate break soon. You're running low.",
  },
  critical: {
    label: "Critical",
    color: "#EF4444",
    bg: "rgba(239,68,68,0.08)",
    border: "rgba(239,68,68,0.25)",
    description: "Rest is not optional right now. Step away for at least a day.",
  },
};

// ─── Shared Styles ─────────────────────────────────────────────────────────────

const cardStyle = {
  background: "#0C0C14",
  border: "1px solid rgba(255,255,255,0.06)",
};

const labelCls = "block text-[12px] font-medium mb-2";
const labelStyle = { color: "#9090B8", fontFamily: "'Inter', sans-serif" };

// ─── Sub-components ────────────────────────────────────────────────────────────

function RiskBadge({ risk }: { risk: BurnoutRisk }) {
  const cfg = RISK_CONFIG[risk];
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1 rounded-full"
      style={{
        color: cfg.color,
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        fontFamily: "monospace, monospace",
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cfg.color }} />
      {cfg.label.toUpperCase()}
    </span>
  );
}

function MoodSlider({
  value,
  onChange,
  labels,
  label,
  icon: Icon,
}: {
  value: number;
  onChange: (v: number) => void;
  labels: Record<number, { label: string; color: string }>;
  label: string;
  icon: React.ElementType;
}) {
  const cfg = labels[value];
  return (
    <div>
      <label className={labelCls} style={labelStyle}>
        {label}
      </label>
      <div
        className="rounded-xl p-4"
        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Icon size={14} style={{ color: cfg.color }} />
            <span className="text-[13px] font-semibold" style={{ color: cfg.color, fontFamily: "'Inter', sans-serif" }}>
              {value}/5 — {cfg.label}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px]" style={{ color: "#3A3A60", fontFamily: "monospace, monospace" }}>1</span>
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={value}
            onChange={(e) => onChange(Number(e.target.value) as 1 | 2 | 3 | 4 | 5)}
            className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(90deg, ${cfg.color} ${((value - 1) / 4) * 100}%, rgba(255,255,255,0.07) ${((value - 1) / 4) * 100}%)`,
              accentColor: cfg.color,
            }}
          />
          <span className="text-[11px]" style={{ color: "#3A3A60", fontFamily: "monospace, monospace" }}>5</span>
        </div>
        <div className="flex justify-between mt-1.5 px-4">
          {[1, 2, 3, 4, 5].map((n) => (
            <span key={n} className="text-[10px]" style={{ color: n === value ? cfg.color : "#3A3A60", fontFamily: "monospace, monospace" }}>
              {labels[n].label.split(" ")[0]}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function MoodChart({ entries }: { entries: BurnoutEntry[] }) {
  const last14 = entries.slice(-14);
  if (last14.length < 2) return null;

  const W = 560;
  const H = 120;
  const PAD = { left: 8, right: 8, top: 12, bottom: 28 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const points = last14.map((e, i) => ({
    x: PAD.left + (i / (last14.length - 1)) * innerW,
    y: PAD.top + ((5 - e.mood) / 4) * innerH,
    mood: e.mood,
    date: e.date,
  }));

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const fillD = `${pathD} L ${points[points.length - 1].x} ${H - PAD.bottom} L ${points[0].x} ${H - PAD.bottom} Z`;

  const moodColor = (mood: number) => MOOD_LABELS[mood]?.color ?? "#8B5CF6";

  return (
    <div>
      <h3 className="text-[13px] font-semibold mb-3 flex items-center gap-2" style={{ color: "#F0F0FF", fontFamily: "'Inter', sans-serif" }}>
        <TrendingUp size={14} style={{ color: "#8B5CF6" }} />
        14-Day Mood Trend
      </h3>
      <div className="rounded-xl p-4" style={cardStyle}>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="moodGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34D399" stopOpacity={0.18} />
              <stop offset="100%" stopColor="#EF4444" stopOpacity={0.04} />
            </linearGradient>
          </defs>
          {/* Grid lines */}
          {[1, 2, 3, 4, 5].map((n) => {
            const y = PAD.top + ((5 - n) / 4) * innerH;
            return (
              <line key={n} x1={PAD.left} y1={y} x2={W - PAD.right} y2={y}
                stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
            );
          })}
          {/* Fill */}
          <path d={fillD} fill="url(#moodGrad)" />
          {/* Line */}
          <path d={pathD} fill="none" stroke="#8B5CF6" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {/* Points */}
          {points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={4} fill={moodColor(p.mood)}
              stroke="#060608" strokeWidth={1.5} />
          ))}
          {/* Date labels */}
          {points.filter((_, i) => i % Math.ceil(last14.length / 7) === 0 || i === last14.length - 1).map((p, i) => (
            <text key={i} x={p.x} y={H - 4} textAnchor="middle"
              fill="#3A3A60" fontSize={9} fontFamily="monospace">
              {p.date.slice(5)}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}

function EnergyBarChart({ entries }: { entries: BurnoutEntry[] }) {
  const last7 = entries.slice(-7);
  if (last7.length === 0) return null;

  return (
    <div>
      <h3 className="text-[13px] font-semibold mb-3 flex items-center gap-2" style={{ color: "#F0F0FF", fontFamily: "'Inter', sans-serif" }}>
        <Zap size={14} style={{ color: "#FBBF24" }} />
        7-Day Energy Levels
      </h3>
      <div className="rounded-xl p-4" style={cardStyle}>
        <div className="flex items-end gap-2 h-20">
          {last7.map((e, i) => {
            const cfg = ENERGY_LABELS[e.energy];
            const pct = (e.energy / 5) * 100;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col justify-end" style={{ height: "64px" }}>
                  <div
                    className="w-full rounded-t-sm transition-all"
                    style={{
                      height: `${pct}%`,
                      background: cfg.color,
                      opacity: 0.8,
                    }}
                  />
                </div>
                <span className="text-[9px]" style={{ color: "#3A3A60", fontFamily: "monospace, monospace" }}>
                  {e.date.slice(5)}
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-2">
          {last7.map((e, i) => {
            const cfg = ENERGY_LABELS[e.energy];
            return (
              <div key={i} className="flex-1 text-center">
                <span className="text-[9px] font-bold" style={{ color: cfg.color, fontFamily: "monospace, monospace" }}>
                  {e.energy}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MilestonesSection({ entries }: { entries: BurnoutEntry[] }) {
  const allWins = entries.flatMap((e) => e.wins);
  const totalApps = entries.reduce((acc, e) => acc + e.applicationsToday, 0);

  const milestones = [
    {
      id: "first-app",
      label: "First Application",
      icon: "🚀",
      achieved: totalApps >= 1,
      description: "You sent out your first application!",
    },
    {
      id: "ten-apps",
      label: "10 Applications",
      icon: "📬",
      achieved: totalApps >= 10,
      description: `${totalApps} total applications sent`,
    },
    {
      id: "first-win",
      label: "First Win",
      icon: "⭐",
      achieved: allWins.length >= 1,
      description: allWins[0] ? `"${allWins[0]}"` : "Log your first win",
    },
    {
      id: "streak",
      label: "7-Day Streak",
      icon: "🔥",
      achieved: entries.length >= 7,
      description: `${entries.length} days logged`,
    },
  ];

  return (
    <div>
      <h3 className="text-[13px] font-semibold mb-3 flex items-center gap-2" style={{ color: "#F0F0FF", fontFamily: "'Inter', sans-serif" }}>
        <Trophy size={14} style={{ color: "#FBBF24" }} />
        Milestones
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {milestones.map((m) => (
          <div
            key={m.id}
            className="rounded-xl p-3 flex items-start gap-3"
            style={{
              background: m.achieved ? "rgba(124, 58, 237,0.08)" : "rgba(255,255,255,0.02)",
              border: `1px solid ${m.achieved ? "rgba(124, 58, 237,0.2)" : "rgba(255,255,255,0.04)"}`,
              opacity: m.achieved ? 1 : 0.45,
            }}
          >
            <span className="text-[20px] leading-none">{m.icon}</span>
            <div className="min-w-0">
              <p className="text-[12px] font-semibold truncate" style={{ color: m.achieved ? "#F0F0FF" : "#9090B8", fontFamily: "'Inter', sans-serif" }}>
                {m.label}
              </p>
              <p className="text-[11px] truncate" style={{ color: "#9090B8", fontFamily: "'Inter', sans-serif" }}>
                {m.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RestRecommendationCard({ risk }: { risk: BurnoutRisk }) {
  if (risk !== "high" && risk !== "critical") return null;

  const tips =
    risk === "critical"
      ? [
          "Take at least 1-2 full days away from job searching",
          "Tell someone you trust how you're feeling",
          "Do something completely unrelated to work or career",
          "Remember: you are not your job search outcomes",
        ]
      : [
          "Block one afternoon this week as a no-apply zone",
          "Go for a walk without your phone for 30 minutes",
          "Revisit a hobby you've been neglecting",
          "Connect with a friend — not to network, just to talk",
        ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl p-5"
      style={{
        background: RISK_CONFIG[risk].bg,
        border: `1px solid ${RISK_CONFIG[risk].border}`,
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <BedDouble size={16} style={{ color: RISK_CONFIG[risk].color }} />
        <h3 className="text-[13px] font-semibold" style={{ color: RISK_CONFIG[risk].color, fontFamily: "'Inter', sans-serif" }}>
          {risk === "critical" ? "Time to step back — seriously" : "Rest recommendations"}
        </h3>
      </div>
      <ul className="space-y-2">
        {tips.map((tip, i) => (
          <li key={i} className="flex items-start gap-2.5 text-[12px]" style={{ color: "#F0F0FF", fontFamily: "'Inter', sans-serif" }}>
            <span className="mt-[5px] w-1 h-1 rounded-full flex-shrink-0" style={{ background: RISK_CONFIG[risk].color }} />
            {tip}
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function BurnoutPage() {
  const qc = useQueryClient();

  // Form state
  const [mood, setMood] = useState<number>(3);
  const [energy, setEnergy] = useState<number>(3);
  const [applicationsToday, setApplicationsToday] = useState<number>(0);
  const [wins, setWins] = useState<string[]>([]);
  const [winInput, setWinInput] = useState<string>("");
  const [feelings, setFeelings] = useState<string>("");
  const [lastMessage, setLastMessage] = useState<string | null>(null);

  // Data query
  const { data, isLoading } = useQuery<GetResponse>({
    queryKey: ["burnout"],
    queryFn: () => apiFetch<GetResponse>("/api/burnout"),
  });

  // Log mutation
  const logMutation = useMutation<LogResponse, Error>({
    mutationFn: () =>
      apiFetch<LogResponse>("/api/burnout", {
        method: "POST",
        body: JSON.stringify({
          action: "log",
          mood,
          energy,
          applicationsToday,
          wins,
          feelings,
        }),
      }),
    onSuccess: (res) => {
      setLastMessage(res.message);
      qc.invalidateQueries({ queryKey: ["burnout"] });
    },
  });

  // Advice mutation
  const adviceMutation = useMutation<AdviceResponse, Error>({
    mutationFn: () =>
      apiFetch<AdviceResponse>("/api/burnout", {
        method: "POST",
        body: JSON.stringify({ action: "get-advice" }),
      }),
  });

  const addWin = useCallback(() => {
    const trimmed = winInput.trim();
    if (trimmed && !wins.includes(trimmed)) {
      setWins((prev) => [...prev, trimmed]);
    }
    setWinInput("");
  }, [winInput, wins]);

  const removeWin = useCallback((w: string) => {
    setWins((prev) => prev.filter((x) => x !== w));
  }, []);

  const log = data?.log ?? [];
  const risk = logMutation.data?.burnout_risk ?? data?.burnout_risk ?? "low";
  const riskCfg = RISK_CONFIG[risk];

  return (
    <div
      className="max-w-2xl mx-auto px-4 py-8 space-y-6"
      style={{ background: "#060608", minHeight: "100vh" }}
    >
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(124, 58, 237,0.12)", border: "1px solid rgba(124, 58, 237,0.25)" }}
            >
              <Heart size={20} style={{ color: "#8B5CF6" }} />
            </div>
            <div>
              <h1 className="text-[22px] font-bold" style={{ color: "#F0F0FF", fontFamily: "'Inter', sans-serif" }}>
                Wellbeing Tracker
              </h1>
              <p className="text-[13px]" style={{ color: "#9090B8", fontFamily: "'Inter', sans-serif" }}>
                Sustainable job searching starts with taking care of yourself
              </p>
            </div>
          </div>
          {!isLoading && <RiskBadge risk={risk} />}
        </div>
      </motion.div>

      {/* Risk description */}
      <AnimatePresence mode="wait">
        <motion.div
          key={risk}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl px-4 py-3 flex items-center justify-between gap-3"
          style={{ background: riskCfg.bg, border: `1px solid ${riskCfg.border}` }}
        >
          <p className="text-[13px]" style={{ color: "#F0F0FF", fontFamily: "'Inter', sans-serif" }}>
            {riskCfg.description}
          </p>
          {!isLoading && data && (
            <span className="text-[12px] flex-shrink-0" style={{ color: "#9090B8", fontFamily: "monospace, monospace" }}>
              Score: {data.burnout_score}/100
            </span>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Today's Log Form */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-xl p-6 space-y-5"
        style={cardStyle}
      >
        <h2 className="text-[15px] font-semibold" style={{ color: "#F0F0FF", fontFamily: "'Inter', sans-serif" }}>
          Today&apos;s Check-In
        </h2>

        {/* Mood slider */}
        <MoodSlider
          value={mood}
          onChange={setMood}
          labels={MOOD_LABELS}
          label="How are you feeling?"
          icon={Heart}
        />

        {/* Energy slider */}
        <MoodSlider
          value={energy}
          onChange={setEnergy}
          labels={ENERGY_LABELS}
          label="Energy level"
          icon={Zap}
        />

        {/* Applications today */}
        <div>
          <label className={labelCls} style={labelStyle}>Applications submitted today</label>
          <input
            type="number"
            min={0}
            max={100}
            value={applicationsToday}
            onChange={(e) => setApplicationsToday(Math.max(0, Number(e.target.value)))}
            className="w-full px-4 py-2.5 rounded-xl text-[14px] outline-none"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
              color: "#F0F0FF",
              fontFamily: "'Inter', sans-serif",
            }}
          />
        </div>

        {/* Wins */}
        <div>
          <label className={labelCls} style={labelStyle}>Wins today (interviews, responses, connections…)</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={winInput}
              onChange={(e) => setWinInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addWin())}
              placeholder="e.g. Got a callback from Stripe"
              className="flex-1 px-4 py-2.5 rounded-xl text-[14px] outline-none"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
                color: "#F0F0FF",
                fontFamily: "'Inter', sans-serif",
              }}
            />
            <button
              onClick={addWin}
              className="px-3 py-2.5 rounded-xl flex items-center gap-1 text-[13px] font-medium transition-all"
              style={{ background: "rgba(124, 58, 237,0.15)", color: "#8B5CF6", border: "1px solid rgba(124, 58, 237,0.25)" }}
            >
              <Plus size={14} />
              Add
            </button>
          </div>
          {wins.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {wins.map((w) => (
                <span
                  key={w}
                  className="flex items-center gap-1.5 text-[12px] px-3 py-1 rounded-full"
                  style={{ background: "rgba(52,211,153,0.1)", color: "#34D399", border: "1px solid rgba(52,211,153,0.2)" }}
                >
                  {w}
                  <button onClick={() => removeWin(w)} className="hover:opacity-70 transition-opacity">
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Feelings */}
        <div>
          <label className={labelCls} style={labelStyle}>How does today feel? (optional)</label>
          <textarea
            value={feelings}
            onChange={(e) => setFeelings(e.target.value)}
            rows={3}
            placeholder="Anything on your mind about the job search today…"
            className="w-full px-4 py-3 rounded-xl text-[14px] outline-none resize-none"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
              color: "#F0F0FF",
              fontFamily: "'Inter', sans-serif",
            }}
          />
        </div>

        {/* Submit */}
        <button
          onClick={() => logMutation.mutate()}
          disabled={logMutation.isPending}
          className="w-full py-3 rounded-xl text-[14px] font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          style={{
            background: logMutation.isPending ? "rgba(124, 58, 237,0.5)" : "#7C3AED",
            color: "#F0F0FF",
            fontFamily: "'Inter', sans-serif",
            boxShadow: logMutation.isPending ? "none" : "0 0 20px rgba(124, 58, 237,0.25)",
          }}
        >
          {logMutation.isPending ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Heart size={16} />
              Log Today
            </>
          )}
        </button>

        {logMutation.isError && (
          <div
            className="flex items-center gap-2 p-3 rounded-xl text-[13px]"
            style={{ background: "rgba(239,68,68,0.08)", color: "#EF4444", border: "1px solid rgba(239,68,68,0.2)" }}
          >
            <AlertCircle size={14} />
            {logMutation.error.message}
          </div>
        )}
      </motion.div>

      {/* AI Message */}
      <AnimatePresence>
        {(lastMessage ?? logMutation.data?.message) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-xl p-5"
            style={{
              background: "rgba(124, 58, 237,0.07)",
              border: "1px solid rgba(124, 58, 237,0.2)",
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={14} style={{ color: "#8B5CF6" }} />
              <span className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: "#8B5CF6", fontFamily: "monospace, monospace" }}>
                Message for you
              </span>
            </div>
            <p className="text-[14px] leading-relaxed" style={{ color: "#F0F0FF", fontFamily: "'Inter', sans-serif" }}>
              {lastMessage ?? logMutation.data?.message}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rest Recommendations */}
      <RestRecommendationCard risk={risk} />

      {/* Charts */}
      <AnimatePresence>
        {log.length >= 2 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="space-y-5"
          >
            <MoodChart entries={log} />
            <EnergyBarChart entries={log} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Milestones */}
      {log.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <MilestonesSection entries={log} />
        </motion.div>
      )}

      {/* Deeper Advice */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
        className="rounded-xl p-5 space-y-3"
        style={cardStyle}
      >
        <div>
          <h3 className="text-[14px] font-semibold mb-1" style={{ color: "#F0F0FF", fontFamily: "'Inter', sans-serif" }}>
            Personalized Wellbeing Advice
          </h3>
          <p className="text-[12px]" style={{ color: "#9090B8", fontFamily: "'Inter', sans-serif" }}>
            AI analyzes your full log pattern to give you tailored guidance.
          </p>
        </div>

        <button
          onClick={() => adviceMutation.mutate()}
          disabled={adviceMutation.isPending}
          className="w-full py-2.5 rounded-xl text-[13px] font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          style={{
            background: "rgba(124, 58, 237,0.12)",
            color: "#8B5CF6",
            border: "1px solid rgba(124, 58, 237,0.2)",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {adviceMutation.isPending ? (
            <><Loader2 size={14} className="animate-spin" />Analyzing your patterns…</>
          ) : (
            <><Sparkles size={14} />Get Personalized Advice</>
          )}
        </button>

        <AnimatePresence>
          {adviceMutation.data && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <p className="text-[13px] leading-relaxed pt-1" style={{ color: "#F0F0FF", fontFamily: "'Inter', sans-serif" }}>
                {adviceMutation.data.advice}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
