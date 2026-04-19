"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo } from "react";
import {
  Target,
  Flame,
  CheckCircle2,
  Circle,
  Plus,
  Minus,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  TrendingUp,
  Calendar,
  X,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

// ─── Types ─────────────────────────────────────────────────────────────────────

type SearchPhase = "active-hunt" | "passive" | "targeting" | "interviewing";
type Mood = 1 | 2 | 3 | 4 | 5;
type CoachingTone = "celebrating" | "encouraging" | "challenging" | "supportive";

interface AccountabilityGoals {
  dailyApplications: number;
  weeklyApplications: number;
  weeklyConnections: number;
  weeklyInterviewPractice: number;
  searchPhase: SearchPhase;
  targetCompanies: string[];
  targetRoles: string[];
  deadline?: string;
}

interface DailyCheckIn {
  id: string;
  date: string;
  applicationsSubmitted: number;
  connectionsRequested: number;
  interviewPracticed: boolean;
  mood: Mood;
  wins: string[];
  blockers: string;
  notes: string;
  aiCoachingMessage?: string;
  aiTone?: string;
  aiActionForTomorrow?: string;
  createdAt: string;
}

interface WeeklyReview {
  id: string;
  weekOf: string;
  totalApplications: number;
  totalConnections: number;
  responseRate: number;
  streakDays: number;
  goalsMet: boolean;
  aiReview?: string;
  nextWeekStrategy?: string;
  highlights?: string[];
  goalAdjustment?: string | null;
  createdAt: string;
}

interface AccountabilityData {
  goals: AccountabilityGoals | null;
  recentCheckins: DailyCheckIn[];
  streak: number;
  weekOf: string;
  weekApps: number;
  weekConnections: number;
  latestWeeklyReview: WeeklyReview | null;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const PHASE_OPTIONS: { id: SearchPhase; label: string; desc: string; icon: string }[] = [
  { id: "active-hunt", label: "Active Hunt", desc: "Applying every day", icon: "A" },
  { id: "targeting", label: "Targeting", desc: "Specific companies / roles", icon: "T" },
  { id: "passive", label: "Passive", desc: "Open but not urgently searching", icon: "P" },
  { id: "interviewing", label: "Interviewing", desc: "In process, prep focus", icon: "I" },
];

const MOOD_COLORS: Record<Mood, string> = {
  1: "#F87171",
  2: "#FB923C",
  3: "#FBBF24",
  4: "#34D399",
  5: "#8B5CF6",
};

const MOOD_LABELS: Record<Mood, string> = {
  1: "Burnt out",
  2: "Low",
  3: "Neutral",
  4: "Good",
  5: "On fire",
};

const TONE_COLORS: Record<CoachingTone, string> = {
  celebrating: "#34D399",
  encouraging: "#8B5CF6",
  challenging: "#FBBF24",
  supportive: "#60A5FA",
};

const TONE_BORDER: Record<CoachingTone, string> = {
  celebrating: "rgba(52,211,153,0.25)",
  encouraging: "rgba(139,92,246,0.3)",
  challenging: "rgba(251,191,36,0.25)",
  supportive: "rgba(96,165,250,0.25)",
};

// ─── Shared styles ─────────────────────────────────────────────────────────────

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

// ─── Helpers ───────────────────────────────────────────────────────────────────

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function Stepper({
  value,
  onChange,
  min = 0,
  max = 99,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.08)",
          color: "#9090B8",
        }}
        type="button"
      >
        <Minus size={12} />
      </button>
      <span
        className="w-10 text-center text-[16px] font-bold tabular-nums"
        style={{ color: "#F0F0FF", fontFamily: "monospace, monospace" }}
      >
        {value}
      </span>
      <button
        onClick={() => onChange(Math.min(max, value + 1))}
        className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.08)",
          color: "#9090B8",
        }}
        type="button"
      >
        <Plus size={12} />
      </button>
    </div>
  );
}

function TagInput({
  label,
  tags,
  onChange,
  placeholder,
}: {
  label: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder: string;
}) {
  const [input, setInput] = useState("");

  function add() {
    const trimmed = input.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInput("");
  }

  function remove(tag: string) {
    onChange(tags.filter((t) => t !== tag));
  }

  return (
    <div>
      <label className={labelCls} style={labelStyle}>
        {label}
      </label>
      <div
        className="rounded-xl p-2 flex flex-wrap gap-1.5 min-h-[44px]"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        {tags.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[12px]"
            style={{
              background: "rgba(124,58,237,0.12)",
              color: "#A78BFA",
              border: "1px solid rgba(124,58,237,0.2)",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {tag}
            <button
              onClick={() => remove(tag)}
              className="opacity-60 hover:opacity-100"
              type="button"
            >
              <X size={10} />
            </button>
          </span>
        ))}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className="flex-1 min-w-[120px] bg-transparent outline-none text-[13px] px-1"
          style={{ color: "#F0F0FF", fontFamily: "'Inter', sans-serif" }}
        />
      </div>
      <p className="mt-1 text-[11px]" style={{ color: "#3A3A60" }}>
        Press Enter or comma to add
      </p>
    </div>
  );
}

function ProgressBar({
  value,
  max,
  color = "#7C3AED",
}: {
  value: number;
  max: number;
  color?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div
      className="relative h-2 rounded-full overflow-hidden"
      style={{ background: "rgba(255,255,255,0.06)" }}
    >
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="absolute left-0 top-0 h-full rounded-full"
        style={{ background: color }}
      />
    </div>
  );
}

// ─── Mood trend SVG ────────────────────────────────────────────────────────────

function MoodTrend({ checkins }: { checkins: DailyCheckIn[] }) {
  const last14 = useMemo(() => {
    const sorted = [...checkins].sort((a, b) => a.date.localeCompare(b.date)).slice(-14);
    return sorted;
  }, [checkins]);

  if (last14.length < 2) {
    return (
      <p className="text-[12px] text-center py-4" style={{ color: "#3A3A60" }}>
        Check in more days to see your mood trend
      </p>
    );
  }

  const W = 320;
  const H = 72;
  const pad = 8;

  const points = last14.map((c, i) => {
    const x = pad + (i / (last14.length - 1)) * (W - pad * 2);
    const y = H - pad - ((c.mood - 1) / 4) * (H - pad * 2);
    return { x, y, mood: c.mood, date: c.date };
  });

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  const fillPath =
    path +
    ` L ${points[points.length - 1].x.toFixed(1)} ${H} L ${points[0].x.toFixed(1)} ${H} Z`;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="moodGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill="url(#moodGrad)" />
      <path d={path} fill="none" stroke="#8B5CF6" strokeWidth="1.5" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill={MOOD_COLORS[p.mood as Mood]} />
      ))}
    </svg>
  );
}

// ─── Weekly calendar ───────────────────────────────────────────────────────────

function WeekCalendar({
  weekOf,
  checkins,
}: {
  weekOf: string;
  checkins: DailyCheckIn[];
}) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekOf);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    const today = isoToday();
    const checkin = checkins.find((c) => c.date === dateStr);
    const isPast = dateStr < today;
    const isToday = dateStr === today;
    return { dateStr, checkin, isPast, isToday, label: ["M", "T", "W", "T", "F", "S", "S"][i] };
  });

  return (
    <div className="flex gap-2 justify-between">
      {days.map((day) => {
        let dotColor = "rgba(255,255,255,0.08)";
        let textColor = "#3A3A60";
        if (day.checkin) {
          dotColor = "#34D399";
          textColor = "#34D399";
        } else if (day.isPast) {
          dotColor = "rgba(248,113,113,0.25)";
          textColor = "#9090B8";
        } else if (day.isToday) {
          dotColor = "rgba(139,92,246,0.3)";
          textColor = "#A78BFA";
        }
        return (
          <div key={day.dateStr} className="flex flex-col items-center gap-1.5">
            <span
              className="text-[10px] font-semibold uppercase"
              style={{ color: textColor, fontFamily: "monospace, monospace" }}
            >
              {day.label}
            </span>
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ background: dotColor, border: `1px solid ${dotColor}` }}
            >
              {day.checkin && <CheckCircle2 size={12} style={{ color: "#34D399" }} />}
              {!day.checkin && day.isPast && (
                <Circle size={10} style={{ color: "rgba(248,113,113,0.5)" }} />
              )}
              {!day.checkin && day.isToday && (
                <Circle size={10} style={{ color: "#A78BFA" }} />
              )}
            </div>
            <span
              className="text-[9px] tabular-nums"
              style={{ color: "#3A3A60", fontFamily: "monospace, monospace" }}
            >
              {day.dateStr.slice(8)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Setup section ─────────────────────────────────────────────────────────────

function SetupSection({
  onSaved,
}: {
  onSaved: () => void;
}) {
  const [phase, setPhase] = useState<SearchPhase>("active-hunt");
  const [dailyApps, setDailyApps] = useState(5);
  const [weeklyApps, setWeeklyApps] = useState(25);
  const [weeklyConns, setWeeklyConns] = useState(10);
  const [weeklyPractice, setWeeklyPractice] = useState(3);
  const [companies, setCompanies] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [deadline, setDeadline] = useState("");

  const mutation = useMutation<unknown, Error>({
    mutationFn: () =>
      apiFetch("/api/accountability", {
        method: "POST",
        body: JSON.stringify({
          action: "set-goals",
          dailyApplications: dailyApps,
          weeklyApplications: weeklyApps,
          weeklyConnections: weeklyConns,
          weeklyInterviewPractice: weeklyPractice,
          searchPhase: phase,
          targetCompanies: companies,
          targetRoles: roles,
          deadline: deadline || undefined,
        }),
      }),
    onSuccess: onSaved,
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      {/* Phase */}
      <div
        className="rounded-xl p-6 space-y-4"
        style={{ background: "#0C0C14", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <h2 className="text-[15px] font-semibold" style={{ color: "#F0F0FF", fontFamily: "'Inter', sans-serif" }}>
          Where are you in your search?
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {PHASE_OPTIONS.map((opt) => {
            const active = phase === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setPhase(opt.id)}
                type="button"
                className="rounded-xl p-4 text-left transition-all"
                style={{
                  background: active ? "rgba(124,58,237,0.1)" : "rgba(255,255,255,0.02)",
                  border: `1px solid ${active ? "rgba(124,58,237,0.35)" : "rgba(255,255,255,0.06)"}`,
                }}
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center mb-2 text-[11px] font-bold"
                  style={{
                    background: active ? "rgba(124,58,237,0.2)" : "rgba(255,255,255,0.05)",
                    color: active ? "#A78BFA" : "#3A3A60",
                    fontFamily: "monospace, monospace",
                  }}
                >
                  {opt.icon}
                </div>
                <p
                  className="text-[13px] font-semibold"
                  style={{ color: active ? "#F0F0FF" : "#9090B8", fontFamily: "'Inter', sans-serif" }}
                >
                  {opt.label}
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: "#3A3A60", fontFamily: "'Inter', sans-serif" }}>
                  {opt.desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Targets */}
      <div
        className="rounded-xl p-6 space-y-5"
        style={{ background: "#0C0C14", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <h2 className="text-[15px] font-semibold" style={{ color: "#F0F0FF", fontFamily: "'Inter', sans-serif" }}>
          Set your targets
        </h2>
        <div className="grid grid-cols-2 gap-5">
          {[
            { label: "Daily applications", value: dailyApps, set: setDailyApps, max: 30 },
            { label: "Weekly applications", value: weeklyApps, set: setWeeklyApps, max: 100 },
            { label: "Weekly connections", value: weeklyConns, set: setWeeklyConns, max: 50 },
            { label: "Interview practice / week", value: weeklyPractice, set: setWeeklyPractice, max: 7 },
          ].map((item) => (
            <div key={item.label}>
              <label className={labelCls} style={labelStyle}>
                {item.label}
              </label>
              <Stepper
                value={item.value}
                onChange={item.set}
                max={item.max}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Focus */}
      <div
        className="rounded-xl p-6 space-y-4"
        style={{ background: "#0C0C14", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <h2 className="text-[15px] font-semibold" style={{ color: "#F0F0FF", fontFamily: "'Inter', sans-serif" }}>
          Focus (optional)
        </h2>
        <TagInput
          label="Target companies"
          tags={companies}
          onChange={setCompanies}
          placeholder="e.g. Stripe, Vercel..."
        />
        <TagInput
          label="Target roles"
          tags={roles}
          onChange={setRoles}
          placeholder="e.g. Senior Engineer..."
        />
        <div>
          <label className={labelCls} style={labelStyle}>
            Target employment date
          </label>
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className={inputCls}
            style={inputStyle}
          />
        </div>
      </div>

      {mutation.isError && (
        <div
          className="flex items-center gap-2 p-3 rounded-xl text-[13px]"
          style={{
            background: "rgba(248,113,113,0.08)",
            color: "#F87171",
            border: "1px solid rgba(248,113,113,0.2)",
          }}
        >
          <AlertCircle size={14} /> {mutation.error.message}
        </div>
      )}

      <button
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
        className="w-full py-3.5 rounded-xl text-[14px] font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
        style={{
          background: mutation.isPending ? "rgba(124,58,237,0.5)" : "#7C3AED",
          color: "#F0F0FF",
          fontFamily: "'Inter', sans-serif",
          boxShadow: mutation.isPending ? "none" : "0 0 24px rgba(124,58,237,0.35)",
        }}
      >
        {mutation.isPending ? (
          <><Loader2 size={16} className="animate-spin" /> Setting up...</>
        ) : (
          <><Target size={16} /> Start Accountability Tracking</>
        )}
      </button>
    </motion.div>
  );
}

// ─── Check-in card ─────────────────────────────────────────────────────────────

function CheckInCard({
  goals,
  existingToday,
  onCheckedIn,
}: {
  goals: AccountabilityGoals;
  existingToday: DailyCheckIn | undefined;
  onCheckedIn: () => void;
}) {
  const today = isoToday();
  const [apps, setApps] = useState(existingToday?.applicationsSubmitted ?? 0);
  const [conns, setConns] = useState(existingToday?.connectionsRequested ?? 0);
  const [practiced, setPracticed] = useState(existingToday?.interviewPracticed ?? false);
  const [mood, setMood] = useState<Mood>(existingToday?.mood ?? 3);
  const [wins, setWins] = useState<string[]>(existingToday?.wins ?? []);
  const [winInput, setWinInput] = useState("");
  const [blockers, setBlockers] = useState(existingToday?.blockers ?? "");
  const [notes, setNotes] = useState(existingToday?.notes ?? "");

  interface CheckInResponse {
    checkin: DailyCheckIn;
    streak: number;
    coaching: { message: string; tone: CoachingTone; actionForTomorrow: string };
  }

  const mutation = useMutation<CheckInResponse, Error>({
    mutationFn: () =>
      apiFetch<CheckInResponse>("/api/accountability", {
        method: "POST",
        body: JSON.stringify({
          action: "checkin",
          date: today,
          applicationsSubmitted: apps,
          connectionsRequested: conns,
          interviewPracticed: practiced,
          mood,
          wins,
          blockers,
          notes,
        }),
      }),
    onSuccess: onCheckedIn,
  });

  function addWin() {
    const w = winInput.trim();
    if (w && !wins.includes(w)) setWins([...wins, w]);
    setWinInput("");
  }

  return (
    <div
      className="rounded-xl p-6 space-y-5"
      style={{
        background: "#0C0C14",
        border: "1px solid rgba(124,58,237,0.3)",
        boxShadow: "0 0 30px rgba(124,58,237,0.06)",
      }}
    >
      <div className="flex items-center gap-2">
        <CheckCircle2 size={16} style={{ color: "#8B5CF6" }} />
        <h2
          className="text-[15px] font-semibold"
          style={{ color: "#F0F0FF", fontFamily: "'Inter', sans-serif" }}
        >
          Today&apos;s Check-In
        </h2>
        <span
          className="ml-auto text-[11px] font-medium px-2.5 py-1 rounded-full"
          style={{
            background: "rgba(124,58,237,0.1)",
            color: "#A78BFA",
            border: "1px solid rgba(124,58,237,0.2)",
            fontFamily: "monospace, monospace",
          }}
        >
          {today}
        </span>
      </div>

      {/* Apps + connections */}
      <div className="grid grid-cols-2 gap-5">
        <div>
          <label className={labelCls} style={labelStyle}>
            Applications submitted
          </label>
          <div className="flex items-center gap-3">
            <Stepper value={apps} onChange={setApps} max={50} />
            <span className="text-[11px]" style={{ color: "#3A3A60", fontFamily: "monospace, monospace" }}>
              / {goals.dailyApplications} goal
            </span>
          </div>
        </div>
        <div>
          <label className={labelCls} style={labelStyle}>
            Connections requested
          </label>
          <Stepper value={conns} onChange={setConns} max={50} />
        </div>
      </div>

      {/* Interview practiced */}
      <button
        onClick={() => setPracticed(!practiced)}
        type="button"
        className="flex items-center gap-3 py-2.5 px-4 rounded-xl w-full transition-all"
        style={{
          background: practiced ? "rgba(52,211,153,0.08)" : "rgba(255,255,255,0.03)",
          border: `1px solid ${practiced ? "rgba(52,211,153,0.25)" : "rgba(255,255,255,0.06)"}`,
        }}
      >
        <div
          className="w-5 h-5 rounded-md flex items-center justify-center transition-all"
          style={{
            background: practiced ? "#34D399" : "rgba(255,255,255,0.06)",
            border: `1px solid ${practiced ? "#34D399" : "rgba(255,255,255,0.1)"}`,
          }}
        >
          {practiced && <CheckCircle2 size={12} style={{ color: "#fff" }} />}
        </div>
        <span
          className="text-[13px]"
          style={{ color: practiced ? "#34D399" : "#9090B8", fontFamily: "'Inter', sans-serif" }}
        >
          Practiced interview today
        </span>
      </button>

      {/* Mood */}
      <div>
        <label className={labelCls} style={labelStyle}>
          How are you feeling?
        </label>
        <div className="flex gap-2">
          {([1, 2, 3, 4, 5] as Mood[]).map((m) => (
            <button
              key={m}
              onClick={() => setMood(m)}
              type="button"
              className="flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-xl transition-all"
              style={{
                background:
                  mood === m ? `${MOOD_COLORS[m]}18` : "rgba(255,255,255,0.02)",
                border: `1px solid ${mood === m ? MOOD_COLORS[m] + "55" : "rgba(255,255,255,0.05)"}`,
              }}
            >
              <div
                className="w-5 h-5 rounded-full"
                style={{ background: MOOD_COLORS[m], opacity: mood === m ? 1 : 0.35 }}
              />
              <span
                className="text-[9px] font-semibold uppercase tracking-wider"
                style={{
                  color: mood === m ? MOOD_COLORS[m] : "#3A3A60",
                  fontFamily: "monospace, monospace",
                }}
              >
                {MOOD_LABELS[m]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Wins */}
      <div>
        <label className={labelCls} style={labelStyle}>
          Wins today
        </label>
        <div className="flex gap-2 mb-2">
          <input
            value={winInput}
            onChange={(e) => setWinInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); addWin(); }
            }}
            placeholder="Got a recruiter email, finished resume..."
            className={`${inputCls} flex-1`}
            style={inputStyle}
          />
          <button
            onClick={addWin}
            type="button"
            className="px-3 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(124,58,237,0.15)", color: "#A78BFA", border: "1px solid rgba(124,58,237,0.2)" }}
          >
            <Plus size={14} />
          </button>
        </div>
        {wins.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {wins.map((w) => (
              <span
                key={w}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[12px]"
                style={{
                  background: "rgba(52,211,153,0.08)",
                  color: "#34D399",
                  border: "1px solid rgba(52,211,153,0.2)",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                {w}
                <button onClick={() => setWins(wins.filter((x) => x !== w))} type="button">
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Blockers + notes */}
      <div className="grid grid-cols-1 gap-3">
        <div>
          <label className={labelCls} style={labelStyle}>
            Blockers (optional)
          </label>
          <input
            value={blockers}
            onChange={(e) => setBlockers(e.target.value)}
            placeholder="What's slowing you down?"
            className={inputCls}
            style={inputStyle}
          />
        </div>
        <div>
          <label className={labelCls} style={labelStyle}>
            Notes (optional)
          </label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything else worth noting..."
            className={inputCls}
            style={inputStyle}
          />
        </div>
      </div>

      {mutation.isError && (
        <div
          className="flex items-center gap-2 p-3 rounded-xl text-[13px]"
          style={{
            background: "rgba(248,113,113,0.08)",
            color: "#F87171",
            border: "1px solid rgba(248,113,113,0.2)",
          }}
        >
          <AlertCircle size={14} /> {mutation.error.message}
        </div>
      )}

      <button
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
        className="w-full py-3 rounded-xl text-[14px] font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
        style={{
          background: mutation.isPending ? "rgba(124,58,237,0.5)" : "#7C3AED",
          color: "#F0F0FF",
          fontFamily: "'Inter', sans-serif",
          boxShadow: mutation.isPending ? "none" : "0 0 20px rgba(124,58,237,0.3)",
        }}
      >
        {mutation.isPending ? (
          <><Loader2 size={16} className="animate-spin" /> Getting your coaching message...</>
        ) : (
          <><Sparkles size={16} /> Submit Check-In</>
        )}
      </button>
    </div>
  );
}

// ─── Coaching message ──────────────────────────────────────────────────────────

function CoachingCard({ checkin }: { checkin: DailyCheckIn }) {
  if (!checkin.aiCoachingMessage) return null;
  const tone = (checkin.aiTone ?? "encouraging") as CoachingTone;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl p-5 space-y-3"
      style={{
        background: "#0C0C14",
        border: `1px solid ${TONE_BORDER[tone]}`,
      }}
    >
      <div className="flex items-center gap-2">
        <Sparkles size={14} style={{ color: TONE_COLORS[tone] }} />
        <span
          className="text-[11px] font-semibold uppercase tracking-widest"
          style={{ color: TONE_COLORS[tone], fontFamily: "monospace, monospace" }}
        >
          AI Coach · {tone}
        </span>
      </div>
      <p
        className="text-[14px] leading-relaxed"
        style={{ color: "#F0F0FF", fontFamily: "'Inter', sans-serif" }}
      >
        {checkin.aiCoachingMessage}
      </p>
      {checkin.aiActionForTomorrow && (
        <div
          className="rounded-lg px-4 py-3"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
        >
          <p className="text-[11px] font-semibold mb-1" style={{ color: "#3A3A60", fontFamily: "monospace, monospace" }}>
            TOMORROW
          </p>
          <p className="text-[13px]" style={{ color: "#9090B8", fontFamily: "'Inter', sans-serif" }}>
            {checkin.aiActionForTomorrow}
          </p>
        </div>
      )}
    </motion.div>
  );
}

// ─── Weekly review card ────────────────────────────────────────────────────────

function WeeklyReviewCard({ review }: { review: WeeklyReview }) {
  const [open, setOpen] = useState(true);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl overflow-hidden"
      style={{ background: "#0C0C14", border: "1px solid rgba(124,58,237,0.25)" }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-6 py-4 flex items-center justify-between"
        style={{ background: open ? "rgba(124,58,237,0.06)" : "#0C0C14" }}
        type="button"
      >
        <div className="flex items-center gap-2.5">
          <TrendingUp size={15} style={{ color: "#8B5CF6" }} />
          <span
            className="text-[14px] font-semibold"
            style={{ color: "#F0F0FF", fontFamily: "'Inter', sans-serif" }}
          >
            Weekly Review — {review.weekOf}
          </span>
          {review.goalsMet && (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest"
              style={{
                background: "rgba(52,211,153,0.12)",
                color: "#34D399",
                border: "1px solid rgba(52,211,153,0.25)",
                fontFamily: "monospace, monospace",
              }}
            >
              Goals met
            </span>
          )}
        </div>
        {open ? (
          <ChevronUp size={14} style={{ color: "#9090B8" }} />
        ) : (
          <ChevronDown size={14} style={{ color: "#9090B8" }} />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 pt-4">
                {[
                  { label: "Applications", value: review.totalApplications },
                  { label: "Connections", value: review.totalConnections },
                  { label: "Streak days", value: review.streakDays },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="rounded-lg p-3 text-center"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}
                  >
                    <p
                      className="text-[22px] font-bold tabular-nums"
                      style={{ color: "#8B5CF6", fontFamily: "monospace, monospace" }}
                    >
                      {s.value}
                    </p>
                    <p
                      className="text-[10px] uppercase tracking-widest"
                      style={{ color: "#3A3A60", fontFamily: "monospace, monospace" }}
                    >
                      {s.label}
                    </p>
                  </div>
                ))}
              </div>

              {/* Highlights */}
              {review.highlights && review.highlights.length > 0 && (
                <div>
                  <p
                    className="text-[11px] font-semibold uppercase tracking-widest mb-2"
                    style={{ color: "#3A3A60", fontFamily: "monospace, monospace" }}
                  >
                    Highlights
                  </p>
                  <ul className="space-y-1.5">
                    {review.highlights.map((h, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-[13px]"
                        style={{ color: "#9090B8", fontFamily: "'Inter', sans-serif" }}
                      >
                        <span
                          className="mt-[6px] w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ background: "#34D399" }}
                        />
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Review */}
              {review.aiReview && (
                <div>
                  <p
                    className="text-[11px] font-semibold uppercase tracking-widest mb-2"
                    style={{ color: "#3A3A60", fontFamily: "monospace, monospace" }}
                  >
                    Analysis
                  </p>
                  <p
                    className="text-[13px] leading-relaxed"
                    style={{ color: "#9090B8", fontFamily: "'Inter', sans-serif" }}
                  >
                    {review.aiReview}
                  </p>
                </div>
              )}

              {/* Next week strategy */}
              {review.nextWeekStrategy && (
                <div
                  className="rounded-lg px-4 py-3"
                  style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.15)" }}
                >
                  <p
                    className="text-[11px] font-semibold uppercase tracking-widest mb-2"
                    style={{ color: "#8B5CF6", fontFamily: "monospace, monospace" }}
                  >
                    Next week strategy
                  </p>
                  <p
                    className="text-[13px] leading-relaxed"
                    style={{ color: "#F0F0FF", fontFamily: "'Inter', sans-serif" }}
                  >
                    {review.nextWeekStrategy}
                  </p>
                </div>
              )}

              {/* Goal adjustment */}
              {review.goalAdjustment && (
                <div
                  className="rounded-lg px-4 py-3"
                  style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.2)" }}
                >
                  <p
                    className="text-[11px] font-semibold uppercase tracking-widest mb-1"
                    style={{ color: "#FBBF24", fontFamily: "monospace, monospace" }}
                  >
                    Suggested goal adjustment
                  </p>
                  <p
                    className="text-[13px] leading-relaxed"
                    style={{ color: "#F0F0FF", fontFamily: "'Inter', sans-serif" }}
                  >
                    {review.goalAdjustment}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Dashboard ─────────────────────────────────────────────────────────────────

function Dashboard({
  data,
  onRefresh,
}: {
  data: AccountabilityData;
  onRefresh: () => void;
}) {
  const { goals, recentCheckins, streak, weekOf, weekApps, weekConnections, latestWeeklyReview } = data;

  const todayCheckin = recentCheckins.find((c) => c.date === isoToday());
  const isMonday = new Date().getDay() === 1;

  interface WeeklyReviewResponse {
    review: WeeklyReview;
  }

  const weeklyMutation = useMutation<WeeklyReviewResponse, Error>({
    mutationFn: () =>
      apiFetch<WeeklyReviewResponse>("/api/accountability", {
        method: "POST",
        body: JSON.stringify({ action: "weekly-review" }),
      }),
    onSuccess: onRefresh,
  });

  if (!goals) return null;

  const weeklyGoalPct =
    goals.weeklyApplications > 0
      ? Math.min(100, Math.round((weekApps / goals.weeklyApplications) * 100))
      : 0;

  return (
    <div className="space-y-5">
      {/* Check-in card */}
      <CheckInCard
        goals={goals}
        existingToday={todayCheckin}
        onCheckedIn={onRefresh}
      />

      {/* Coaching message */}
      {todayCheckin && <CoachingCard checkin={todayCheckin} />}

      {/* Streak + progress strip */}
      <div
        className="rounded-xl p-5 grid grid-cols-3 gap-5"
        style={{ background: "#0C0C14", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        {/* Streak */}
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-1.5">
            <Flame size={18} style={{ color: streak > 0 ? "#FBBF24" : "#3A3A60" }} />
            <span
              className="text-[28px] font-bold tabular-nums"
              style={{
                color: streak > 0 ? "#FBBF24" : "#3A3A60",
                fontFamily: "monospace, monospace",
              }}
            >
              {streak}
            </span>
          </div>
          <span
            className="text-[10px] uppercase tracking-widest"
            style={{ color: "#3A3A60", fontFamily: "monospace, monospace" }}
          >
            Day streak
          </span>
        </div>

        {/* Weekly apps */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px]" style={{ color: "#9090B8", fontFamily: "'Inter', sans-serif" }}>
              This week
            </span>
            <span
              className="text-[13px] font-bold tabular-nums"
              style={{ color: "#F0F0FF", fontFamily: "monospace, monospace" }}
            >
              {weekApps}/{goals.weeklyApplications}
            </span>
          </div>
          <ProgressBar value={weekApps} max={goals.weeklyApplications} color="#8B5CF6" />
          <p className="text-[10px]" style={{ color: "#3A3A60", fontFamily: "monospace, monospace" }}>
            {weeklyGoalPct}% of weekly goal
          </p>
        </div>

        {/* Connections */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px]" style={{ color: "#9090B8", fontFamily: "'Inter', sans-serif" }}>
              Connections
            </span>
            <span
              className="text-[13px] font-bold tabular-nums"
              style={{ color: "#F0F0FF", fontFamily: "monospace, monospace" }}
            >
              {weekConnections}/{goals.weeklyConnections}
            </span>
          </div>
          <ProgressBar value={weekConnections} max={goals.weeklyConnections} color="#34D399" />
        </div>
      </div>

      {/* Week calendar */}
      <div
        className="rounded-xl p-5 space-y-3"
        style={{ background: "#0C0C14", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center gap-2 mb-1">
          <Calendar size={13} style={{ color: "#8B5CF6" }} />
          <span
            className="text-[12px] font-semibold"
            style={{ color: "#9090B8", fontFamily: "'Inter', sans-serif" }}
          >
            This week
          </span>
        </div>
        <WeekCalendar weekOf={weekOf} checkins={recentCheckins} />
      </div>

      {/* Mood trend */}
      <div
        className="rounded-xl p-5 space-y-3"
        style={{ background: "#0C0C14", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <span
          className="text-[12px] font-semibold block"
          style={{ color: "#9090B8", fontFamily: "'Inter', sans-serif" }}
        >
          Mood trend (14 days)
        </span>
        <MoodTrend checkins={recentCheckins} />
        <div className="flex items-center justify-between">
          {([1, 2, 3, 4, 5] as Mood[]).map((m) => (
            <div key={m} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ background: MOOD_COLORS[m] }} />
              <span
                className="text-[9px]"
                style={{ color: "#3A3A60", fontFamily: "monospace, monospace" }}
              >
                {MOOD_LABELS[m]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly review — show on Mondays or if one exists */}
      {(isMonday || latestWeeklyReview) && (
        <div className="space-y-3">
          {latestWeeklyReview && (
            <WeeklyReviewCard review={latestWeeklyReview} />
          )}
          {isMonday && (
            <button
              onClick={() => weeklyMutation.mutate()}
              disabled={weeklyMutation.isPending}
              className="w-full py-3 rounded-xl text-[13px] font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              style={{
                background: "rgba(124,58,237,0.1)",
                color: "#A78BFA",
                border: "1px solid rgba(124,58,237,0.2)",
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {weeklyMutation.isPending ? (
                <><Loader2 size={14} className="animate-spin" /> Generating review...</>
              ) : (
                <><TrendingUp size={14} /> Generate This Week&apos;s Review</>
              )}
            </button>
          )}
          {weeklyMutation.isError && (
            <div
              className="flex items-center gap-2 p-3 rounded-xl text-[12px]"
              style={{
                background: "rgba(248,113,113,0.08)",
                color: "#F87171",
                border: "1px solid rgba(248,113,113,0.2)",
              }}
            >
              <AlertCircle size={13} /> {weeklyMutation.error.message}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function AccountabilityPage() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery<AccountabilityData, Error>({
    queryKey: ["accountability"],
    queryFn: () =>
      apiFetch<{ data: AccountabilityData }>("/api/accountability").then((r) => r.data),
  });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["accountability"] });
  }

  return (
    <div
      className="max-w-2xl mx-auto px-4 py-8 space-y-6"
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
            <Target size={20} style={{ color: "#8B5CF6" }} />
          </div>
          <div>
            <h1
              className="text-[22px] font-bold"
              style={{ color: "#F0F0FF", fontFamily: "'Inter', sans-serif" }}
            >
              Accountability Partner
            </h1>
            <p
              className="text-[13px]"
              style={{ color: "#9090B8", fontFamily: "'Inter', sans-serif" }}
            >
              Your AI coach for the job search marathon
            </p>
          </div>
        </div>
      </motion.div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin" style={{ color: "#8B5CF6" }} />
        </div>
      )}

      {/* Error */}
      {isError && (
        <div
          className="flex items-center gap-2 p-4 rounded-xl text-[13px]"
          style={{
            background: "rgba(248,113,113,0.08)",
            color: "#F87171",
            border: "1px solid rgba(248,113,113,0.2)",
          }}
        >
          <AlertCircle size={15} /> {error.message}
        </div>
      )}

      <AnimatePresence mode="wait">
        {data && !data.goals && (
          <motion.div
            key="setup"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <SetupSection onSaved={refresh} />
          </motion.div>
        )}

        {data && data.goals && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Dashboard data={data} onRefresh={refresh} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
