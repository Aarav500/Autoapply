"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import {
  Shield,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Building2,
  Mic,
  BookOpen,
  Trophy,
  ListChecks,
  MessageSquare,
  AlertTriangle,
  Zap,
  Clock,
  Calendar,
  Loader2,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────

interface CompanyIntel {
  mission: string;
  key_products: string[];
  culture_signals: string[];
  recent_news: string[];
  interview_style: string;
  known_red_flags: string[];
}

interface PersonalPitch {
  opening: string;
  full_pitch: string;
  why_this_company: string;
  why_this_role: string;
}

interface LikelyQuestion {
  question: string;
  category: "behavioral" | "technical" | "culture-fit" | "role-specific";
  talking_points: string[];
  trap_to_avoid: string;
}

interface Accomplishment {
  story: string;
  metrics: string;
  relevance: string;
}

interface ChecklistItem {
  item: string;
  timing: string;
  done: boolean;
}

interface QuestionToAsk {
  question: string;
  why_ask: string;
}

interface WarroomResult {
  company_intel: CompanyIntel;
  personal_pitch: PersonalPitch;
  likely_questions: LikelyQuestion[];
  accomplishments_to_mention: Accomplishment[];
  red_flags_to_avoid: string[];
  pre_interview_checklist: ChecklistItem[];
  confidence_boosters: string[];
  questions_to_ask: QuestionToAsk[];
}

interface WarroomRecord {
  id: string;
  company: string;
  role: string;
  interviewDate: string | undefined;
  interviewType: string;
  rounds: number;
  createdAt: string;
  result: WarroomResult;
}

interface WarroomListResponse {
  warrooms: WarroomRecord[];
}

interface WarroomGenerateResponse {
  id: string;
  company: string;
  role: string;
  interviewDate: string | undefined;
  interviewType: string;
  rounds: number;
  createdAt: string;
  result: WarroomResult;
}

type TabId = "intel" | "pitch" | "questions" | "accomplishments" | "checklist" | "ask";

// ── Helpers ────────────────────────────────────────────────────

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, ease: "easeOut" as const, delay },
});

function categoryColor(cat: LikelyQuestion["category"]): { bg: string; text: string } {
  const map: Record<LikelyQuestion["category"], { bg: string; text: string }> = {
    behavioral:    { bg: "rgba(139,92,246,0.15)", text: "#A78BFA" },
    technical:     { bg: "rgba(59,130,246,0.15)", text: "#60A5FA" },
    "culture-fit": { bg: "rgba(52,211,153,0.15)", text: "#34D399" },
    "role-specific": { bg: "rgba(251,191,36,0.15)", text: "#FBBF24" },
  };
  return map[cat];
}

function timingColor(timing: string): string {
  if (timing.toLowerCase().includes("night")) return "#8B5CF6";
  if (timing.toLowerCase().includes("hour")) return "#FBBF24";
  return "#34D399";
}

// ── Copy Button ────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all"
      style={{
        background: copied ? "rgba(52,211,153,0.1)" : "rgba(255,255,255,0.05)",
        color: copied ? "#34D399" : "#9090B8",
        border: `1px solid ${copied ? "rgba(52,211,153,0.3)" : "rgba(255,255,255,0.06)"}`,
      }}
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

// ── Pitch Block ────────────────────────────────────────────────

function PitchBlock({ label, text, highlight = false }: { label: string; text: string; highlight?: boolean }) {
  return (
    <div
      className="rounded-xl p-5 mb-4"
      style={{
        background: highlight ? "rgba(124,58,237,0.08)" : "#0C0C14",
        border: `1px solid ${highlight ? "rgba(124,58,237,0.25)" : "rgba(255,255,255,0.06)"}`,
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#9090B8" }}>{label}</span>
        <CopyButton text={text} />
      </div>
      <p className="text-[14px] leading-relaxed" style={{ color: "#F0F0FF" }}>{text}</p>
    </div>
  );
}

// ── Question Card ──────────────────────────────────────────────

function QuestionCard({ q, index }: { q: LikelyQuestion; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const cat = categoryColor(q.category);

  return (
    <motion.div
      {...fadeUp(index * 0.04)}
      className="rounded-xl overflow-hidden mb-3"
      style={{ background: "#0C0C14", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <button
        className="w-full flex items-center justify-between p-4 text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span
            className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold mt-0.5"
            style={{ background: "rgba(124,58,237,0.15)", color: "#A78BFA" }}
          >
            {index + 1}
          </span>
          <span className="text-[13px] font-medium pr-2" style={{ color: "#F0F0FF" }}>{q.question}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
            style={{ background: cat.bg, color: cat.text }}
          >
            {q.category}
          </span>
          {expanded ? <ChevronUp size={14} style={{ color: "#9090B8" }} /> : <ChevronDown size={14} style={{ color: "#9090B8" }} />}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: "hidden" }}
          >
            <div className="px-4 pb-4 pt-0 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <div className="mt-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: "#9090B8" }}>Talking Points</p>
                <ul className="space-y-1.5">
                  {q.talking_points.map((pt, i) => (
                    <li key={i} className="flex items-start gap-2 text-[13px]" style={{ color: "#C0C0E8" }}>
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#8B5CF6" }} />
                      {pt}
                    </li>
                  ))}
                </ul>
              </div>
              <div
                className="flex items-start gap-2 mt-4 p-3 rounded-lg"
                style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)" }}
              >
                <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" style={{ color: "#F87171" }} />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: "#F87171" }}>Trap to avoid</p>
                  <p className="text-[12px]" style={{ color: "#FCA5A5" }}>{q.trap_to_avoid}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Checklist ─────────────────────────────────────────────────

function Checklist({ items, onToggle }: { items: ChecklistItem[]; onToggle: (index: number) => void }) {
  const groups = ["Night before", "1 hour before", "10 min before"] as const;
  type TimingGroup = typeof groups[number];

  const grouped = groups.reduce<Record<TimingGroup, Array<{ item: ChecklistItem; originalIndex: number }>>>(
    (acc, g) => {
      acc[g] = [];
      return acc;
    },
    { "Night before": [], "1 hour before": [], "10 min before": [] }
  );

  const other: Array<{ item: ChecklistItem; originalIndex: number }> = [];

  items.forEach((item, idx) => {
    const timing = item.timing;
    if (timing.toLowerCase().includes("night")) {
      grouped["Night before"].push({ item, originalIndex: idx });
    } else if (timing.toLowerCase().includes("hour")) {
      grouped["1 hour before"].push({ item, originalIndex: idx });
    } else if (timing.toLowerCase().includes("min") || timing.toLowerCase().includes("10")) {
      grouped["10 min before"].push({ item, originalIndex: idx });
    } else {
      other.push({ item, originalIndex: idx });
    }
  });

  const renderGroup = (label: string, entries: Array<{ item: ChecklistItem; originalIndex: number }>) => {
    if (!entries.length) return null;
    const color = timingColor(label);
    return (
      <div key={label} className="mb-5">
        <div className="flex items-center gap-2 mb-3">
          <Clock size={12} style={{ color }} />
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color }}>{label}</span>
        </div>
        <div className="space-y-2">
          {entries.map(({ item, originalIndex }) => (
            <button
              key={originalIndex}
              onClick={() => onToggle(originalIndex)}
              className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all"
              style={{
                background: item.done ? "rgba(52,211,153,0.06)" : "rgba(255,255,255,0.02)",
                border: `1px solid ${item.done ? "rgba(52,211,153,0.2)" : "rgba(255,255,255,0.06)"}`,
              }}
            >
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                style={{
                  background: item.done ? "#34D399" : "transparent",
                  border: `2px solid ${item.done ? "#34D399" : "#3A3A60"}`,
                }}
              >
                {item.done && <Check size={10} className="text-black" />}
              </div>
              <span
                className="text-[13px] flex-1"
                style={{
                  color: item.done ? "#9090B8" : "#F0F0FF",
                  textDecoration: item.done ? "line-through" : "none",
                }}
              >
                {item.item}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: "rgba(255,255,255,0.04)", color: "#6060A0" }}>
                {item.timing}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div>
      {groups.map((g) => renderGroup(g, grouped[g]))}
      {other.length > 0 && renderGroup("Other", other)}
    </div>
  );
}

// ── Confidence Bar ─────────────────────────────────────────────

function ConfidenceBar({ checklist }: { checklist: ChecklistItem[] }) {
  const total = checklist.length;
  const done = checklist.filter((c) => c.done).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const color = pct >= 80 ? "#34D399" : pct >= 50 ? "#FBBF24" : "#8B5CF6";
  const label = pct >= 80 ? "Battle-ready" : pct >= 50 ? "Getting there" : "Just started";

  return (
    <div
      className="rounded-xl p-4 mb-6 flex items-center gap-4"
      style={{ background: "#0C0C14", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div className="flex-1">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[12px] font-semibold" style={{ color: "#F0F0FF" }}>Preparation Progress</span>
          <span className="text-[12px] font-bold" style={{ color }}>{pct}% — {label}</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: color }}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="text-[20px] font-bold" style={{ color }}>{done}/{total}</div>
        <div className="text-[10px]" style={{ color: "#9090B8" }}>tasks done</div>
      </div>
    </div>
  );
}

// ── Tab Button ─────────────────────────────────────────────────

function TabButton({ id, label, icon: Icon, active, onClick }: {
  id: TabId;
  label: string;
  icon: React.ElementType;
  active: boolean;
  onClick: (id: TabId) => void;
}) {
  return (
    <button
      onClick={() => onClick(id)}
      className="flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-medium transition-all whitespace-nowrap"
      style={{
        background: active ? "rgba(124,58,237,0.15)" : "transparent",
        color: active ? "#A78BFA" : "#9090B8",
        border: `1px solid ${active ? "rgba(124,58,237,0.3)" : "transparent"}`,
      }}
    >
      <Icon size={13} />
      {label}
    </button>
  );
}

// ── Past War Room Row ──────────────────────────────────────────

function PastWarroomRow({ record, onSelect, isActive }: { record: WarroomRecord; onSelect: () => void; isActive: boolean }) {
  return (
    <button
      onClick={onSelect}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all"
      style={{
        background: isActive ? "rgba(124,58,237,0.1)" : "rgba(255,255,255,0.02)",
        border: `1px solid ${isActive ? "rgba(124,58,237,0.25)" : "rgba(255,255,255,0.06)"}`,
      }}
    >
      <Building2 size={14} style={{ color: isActive ? "#A78BFA" : "#3A3A60", flexShrink: 0 }} />
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium truncate" style={{ color: isActive ? "#F0F0FF" : "#9090B8" }}>
          {record.role} @ {record.company}
        </div>
        <div className="text-[11px]" style={{ color: "#3A3A60" }}>
          {record.interviewDate ? new Date(record.interviewDate).toLocaleDateString() : new Date(record.createdAt).toLocaleDateString()}
          {" · "}{record.interviewType}
        </div>
      </div>
    </button>
  );
}

// ── Main Page ──────────────────────────────────────────────────

export default function WarroomPage() {
  const queryClient = useQueryClient();

  // Form state
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [interviewDate, setInterviewDate] = useState("");
  const [interviewType, setInterviewType] = useState<"phone" | "video" | "onsite" | "technical" | "final">("video");
  const [rounds, setRounds] = useState(1);
  const [additionalContext, setAdditionalContext] = useState("");

  // Results state
  const [activeRecord, setActiveRecord] = useState<WarroomRecord | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("intel");
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);

  // Past war rooms
  const { data: pastData } = useQuery<WarroomListResponse>({
    queryKey: ["warrooms"],
    queryFn: async () => {
      const res = await apiFetch<{ data: WarroomListResponse }>("/api/warroom");
      return res.data;
    },
  });

  // Generate mutation
  const generateMutation = useMutation<WarroomGenerateResponse, Error, void>({
    mutationFn: async () => {
      const res = await apiFetch<{ data: WarroomGenerateResponse }>("/api/warroom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company,
          role,
          interviewDate: interviewDate || undefined,
          interviewType,
          rounds,
          additionalContext: additionalContext || undefined,
        }),
      });
      return res.data;
    },
    onSuccess: (data) => {
      const record: WarroomRecord = data;
      setActiveRecord(record);
      setChecklist(record.result.pre_interview_checklist);
      setActiveTab("intel");
      queryClient.invalidateQueries({ queryKey: ["warrooms"] });
    },
  });

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim() || !role.trim()) return;
    generateMutation.mutate();
  };

  const handleSelectPast = (record: WarroomRecord) => {
    setActiveRecord(record);
    setChecklist(record.result.pre_interview_checklist);
    setActiveTab("intel");
  };

  const handleToggleChecklistItem = (index: number) => {
    setChecklist((prev) =>
      prev.map((item, i) => (i === index ? { ...item, done: !item.done } : item))
    );
  };

  const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: "intel", label: "Intel", icon: Building2 },
    { id: "pitch", label: "Your Pitch", icon: Mic },
    { id: "questions", label: "Questions", icon: BookOpen },
    { id: "accomplishments", label: "Wins", icon: Trophy },
    { id: "checklist", label: "Checklist", icon: ListChecks },
    { id: "ask", label: "Ask Them", icon: MessageSquare },
  ];

  const result = activeRecord?.result;

  return (
    <div className="min-h-screen p-6" style={{ background: "#060608" }}>
      <div className="max-w-4xl mx-auto">

        {/* ── Header ─────────────────────────────────────────── */}
        <motion.div {...fadeUp(0)} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)",
                boxShadow: "0 0 20px rgba(124,58,237,0.35)",
              }}
            >
              <Shield size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-[22px] font-bold" style={{ color: "#F0F0FF", letterSpacing: "-0.02em" }}>
                Interview War Room
              </h1>
              <p className="text-[13px]" style={{ color: "#9090B8" }}>
                Your complete battle plan for every interview
              </p>
            </div>
          </div>
        </motion.div>

        {/* ── Form ───────────────────────────────────────────── */}
        <motion.div
          {...fadeUp(0.05)}
          className="rounded-xl p-6 mb-6"
          style={{ background: "#0C0C14", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <form onSubmit={handleGenerate}>
            {/* Row 1: Company + Role */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "#9090B8" }}>
                  Company
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g. Stripe, Google, Notion..."
                  className="w-full px-3 py-2.5 rounded-xl text-[13px] outline-none transition-all"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "#F0F0FF",
                  }}
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "#9090B8" }}>
                  Role
                </label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g. Senior Software Engineer"
                  className="w-full px-3 py-2.5 rounded-xl text-[13px] outline-none transition-all"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "#F0F0FF",
                  }}
                  required
                />
              </div>
            </div>

            {/* Row 2: Date + Type */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "#9090B8" }}>
                  Interview Date &amp; Time
                </label>
                <div className="relative">
                  <Calendar size={13} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#3A3A60" }} />
                  <input
                    type="datetime-local"
                    value={interviewDate}
                    onChange={(e) => setInterviewDate(e.target.value)}
                    className="w-full pl-8 pr-3 py-2.5 rounded-xl text-[13px] outline-none"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "#F0F0FF",
                      colorScheme: "dark",
                    }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "#9090B8" }}>
                  Interview Type
                </label>
                <select
                  value={interviewType}
                  onChange={(e) => setInterviewType(e.target.value as typeof interviewType)}
                  className="w-full px-3 py-2.5 rounded-xl text-[13px] outline-none"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "#F0F0FF",
                  }}
                >
                  <option value="phone">Phone Screen</option>
                  <option value="video">Video Call</option>
                  <option value="technical">Technical</option>
                  <option value="onsite">On-Site</option>
                  <option value="final">Final Round</option>
                </select>
              </div>
            </div>

            {/* Row 3: Rounds + Context */}
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "#9090B8" }}>
                  Number of Rounds
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={rounds}
                  onChange={(e) => setRounds(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl text-[13px] outline-none"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "#F0F0FF",
                  }}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "#9090B8" }}>
                  Additional Context <span style={{ color: "#3A3A60", fontWeight: 400 }}>(optional)</span>
                </label>
                <input
                  type="text"
                  value={additionalContext}
                  onChange={(e) => setAdditionalContext(e.target.value)}
                  placeholder="e.g. focus on system design, referral from Jane..."
                  maxLength={500}
                  className="w-full px-3 py-2.5 rounded-xl text-[13px] outline-none"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "#F0F0FF",
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={generateMutation.isPending || !company.trim() || !role.trim()}
              className="w-full py-3 rounded-xl text-[14px] font-semibold flex items-center justify-center gap-2 transition-all"
              style={{
                background: generateMutation.isPending ? "rgba(124,58,237,0.4)" : "#7C3AED",
                color: "#fff",
                boxShadow: "0 0 20px rgba(124,58,237,0.3)",
                opacity: !company.trim() || !role.trim() ? 0.5 : 1,
                cursor: !company.trim() || !role.trim() ? "not-allowed" : "pointer",
              }}
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Generating your war room...
                </>
              ) : (
                <>
                  <Zap size={15} />
                  Generate War Room
                </>
              )}
            </button>

            {generateMutation.isError && (
              <p className="text-center text-[12px] mt-3" style={{ color: "#F87171" }}>
                {generateMutation.error.message}
              </p>
            )}
          </form>
        </motion.div>

        {/* ── Past War Rooms ─────────────────────────────────── */}
        {pastData?.warrooms && pastData.warrooms.length > 0 && (
          <motion.div {...fadeUp(0.1)} className="mb-6">
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: "#3A3A60" }}>
              Recent War Rooms
            </p>
            <div className="space-y-1.5">
              {pastData.warrooms.map((record) => (
                <PastWarroomRow
                  key={record.id}
                  record={record}
                  onSelect={() => handleSelectPast(record)}
                  isActive={activeRecord?.id === record.id}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Results ────────────────────────────────────────── */}
        <AnimatePresence>
          {result && activeRecord && (
            <motion.div
              key={activeRecord.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.35 }}
            >
              {/* Title bar */}
              <div className="flex items-center gap-3 mb-5">
                <div>
                  <h2 className="text-[18px] font-bold" style={{ color: "#F0F0FF", letterSpacing: "-0.01em" }}>
                    {activeRecord.role} <span style={{ color: "#A78BFA" }}>@ {activeRecord.company}</span>
                  </h2>
                  <p className="text-[12px]" style={{ color: "#9090B8" }}>
                    {activeRecord.interviewType} interview
                    {activeRecord.interviewDate && ` · ${new Date(activeRecord.interviewDate).toLocaleString()}`}
                    {activeRecord.rounds > 1 && ` · ${activeRecord.rounds} rounds`}
                  </p>
                </div>
              </div>

              {/* Confidence bar */}
              <ConfidenceBar checklist={checklist} />

              {/* Confidence boosters */}
              {result.confidence_boosters.length > 0 && (
                <div
                  className="rounded-xl p-4 mb-5 flex items-start gap-3"
                  style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.2)" }}
                >
                  <Zap size={15} style={{ color: "#A78BFA", flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "#8B5CF6" }}>
                      Remember this
                    </p>
                    <ul className="space-y-1">
                      {result.confidence_boosters.map((b, i) => (
                        <li key={i} className="text-[13px]" style={{ color: "#C0C0E8" }}>{b}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 mb-5 scrollbar-hide">
                {tabs.map((tab) => (
                  <TabButton key={tab.id} {...tab} active={activeTab === tab.id} onClick={setActiveTab} />
                ))}
              </div>

              {/* Tab content */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                  transition={{ duration: 0.18 }}
                >

                  {/* ── Intel tab ─────────────────────────────── */}
                  {activeTab === "intel" && (
                    <div>
                      {/* Mission */}
                      <div
                        className="rounded-xl p-5 mb-4"
                        style={{ background: "#0C0C14", border: "1px solid rgba(255,255,255,0.06)" }}
                      >
                        <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: "#9090B8" }}>Mission</p>
                        <p className="text-[13px] leading-relaxed" style={{ color: "#F0F0FF" }}>{result.company_intel.mission}</p>
                      </div>

                      {/* Products */}
                      <div
                        className="rounded-xl p-5 mb-4"
                        style={{ background: "#0C0C14", border: "1px solid rgba(255,255,255,0.06)" }}
                      >
                        <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: "#9090B8" }}>Key Products</p>
                        <div className="flex flex-wrap gap-2">
                          {result.company_intel.key_products.map((p, i) => (
                            <span key={i} className="px-3 py-1 rounded-full text-[12px]" style={{ background: "rgba(139,92,246,0.12)", color: "#A78BFA" }}>
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Culture */}
                      <div
                        className="rounded-xl p-5 mb-4"
                        style={{ background: "#0C0C14", border: "1px solid rgba(255,255,255,0.06)" }}
                      >
                        <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: "#9090B8" }}>Culture Signals</p>
                        <ul className="space-y-2">
                          {result.company_intel.culture_signals.map((c, i) => (
                            <li key={i} className="flex items-start gap-2 text-[13px]" style={{ color: "#C0C0E8" }}>
                              <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#34D399" }} />
                              {c}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Recent News */}
                      <div
                        className="rounded-xl p-5 mb-4"
                        style={{ background: "#0C0C14", border: "1px solid rgba(255,255,255,0.06)" }}
                      >
                        <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: "#9090B8" }}>Recent News</p>
                        <ul className="space-y-2">
                          {result.company_intel.recent_news.map((n, i) => (
                            <li key={i} className="flex items-start gap-2 text-[13px]" style={{ color: "#C0C0E8" }}>
                              <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#FBBF24" }} />
                              {n}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Interview Style */}
                      <div
                        className="rounded-xl p-5 mb-4"
                        style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.2)" }}
                      >
                        <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: "#60A5FA" }}>Their Interview Style</p>
                        <p className="text-[13px] leading-relaxed" style={{ color: "#C0C0E8" }}>{result.company_intel.interview_style}</p>
                      </div>

                      {/* Red Flags */}
                      {result.company_intel.known_red_flags.length > 0 && (
                        <div
                          className="rounded-xl p-5"
                          style={{ background: "#0C0C14", border: "1px solid rgba(255,255,255,0.06)" }}
                        >
                          <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: "#9090B8" }}>Known Red Flags</p>
                          <div className="flex flex-wrap gap-2">
                            {result.company_intel.known_red_flags.map((rf, i) => (
                              <span key={i} className="px-3 py-1 rounded-full text-[12px]" style={{ background: "rgba(248,113,113,0.1)", color: "#F87171" }}>
                                {rf}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Pitch tab ─────────────────────────────── */}
                  {activeTab === "pitch" && (
                    <div>
                      <PitchBlock label="30-Second Opener" text={result.personal_pitch.opening} highlight />
                      <PitchBlock label="Full 2-Minute Pitch" text={result.personal_pitch.full_pitch} />
                      <PitchBlock label="Why This Company" text={result.personal_pitch.why_this_company} />
                      <PitchBlock label="Why This Role" text={result.personal_pitch.why_this_role} />
                    </div>
                  )}

                  {/* ── Questions tab ─────────────────────────── */}
                  {activeTab === "questions" && (
                    <div>
                      {/* Red flags to avoid */}
                      {result.red_flags_to_avoid.length > 0 && (
                        <div
                          className="rounded-xl p-4 mb-5"
                          style={{ background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.2)" }}
                        >
                          <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: "#F87171" }}>Global Red Flags to Avoid</p>
                          <ul className="space-y-1">
                            {result.red_flags_to_avoid.map((rf, i) => (
                              <li key={i} className="flex items-start gap-2 text-[12px]" style={{ color: "#FCA5A5" }}>
                                <AlertTriangle size={11} className="flex-shrink-0 mt-0.5" style={{ color: "#F87171" }} />
                                {rf}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {result.likely_questions.map((q, i) => (
                        <QuestionCard key={i} q={q} index={i} />
                      ))}
                    </div>
                  )}

                  {/* ── Accomplishments tab ───────────────────── */}
                  {activeTab === "accomplishments" && (
                    <div className="space-y-4">
                      {result.accomplishments_to_mention.map((acc, i) => (
                        <motion.div
                          key={i}
                          {...fadeUp(i * 0.05)}
                          className="rounded-xl p-5"
                          style={{ background: "#0C0C14", border: "1px solid rgba(255,255,255,0.06)" }}
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <span
                              className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                              style={{ background: "rgba(251,191,36,0.15)", color: "#FBBF24" }}
                            >
                              {i + 1}
                            </span>
                            <span className="text-[12px] font-semibold" style={{ color: "#FBBF24" }}>Story #{i + 1}</span>
                          </div>
                          <p className="text-[13px] leading-relaxed mb-3" style={{ color: "#F0F0FF" }}>{acc.story}</p>
                          <div
                            className="rounded-lg px-3 py-2 mb-3"
                            style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)" }}
                          >
                            <span className="text-[10px] font-semibold uppercase tracking-wider block mb-0.5" style={{ color: "#8B5CF6" }}>Metrics</span>
                            <span className="text-[13px] font-medium" style={{ color: "#A78BFA" }}>{acc.metrics}</span>
                          </div>
                          <div
                            className="rounded-lg px-3 py-2"
                            style={{ background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.15)" }}
                          >
                            <span className="text-[10px] font-semibold uppercase tracking-wider block mb-0.5" style={{ color: "#34D399" }}>Why it matters for this role</span>
                            <span className="text-[12px]" style={{ color: "#A7F3D0" }}>{acc.relevance}</span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {/* ── Checklist tab ─────────────────────────── */}
                  {activeTab === "checklist" && (
                    <div>
                      <Checklist items={checklist} onToggle={handleToggleChecklistItem} />
                    </div>
                  )}

                  {/* ── Ask Them tab ──────────────────────────── */}
                  {activeTab === "ask" && (
                    <div className="space-y-3">
                      {result.questions_to_ask.map((q, i) => (
                        <motion.div
                          key={i}
                          {...fadeUp(i * 0.05)}
                          className="rounded-xl p-5"
                          style={{ background: "#0C0C14", border: "1px solid rgba(255,255,255,0.06)" }}
                        >
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <p className="text-[14px] font-medium" style={{ color: "#F0F0FF" }}>{q.question}</p>
                            <CopyButton text={q.question} />
                          </div>
                          <div
                            className="rounded-lg px-3 py-2"
                            style={{ background: "rgba(139,92,246,0.07)", border: "1px solid rgba(139,92,246,0.15)" }}
                          >
                            <span className="text-[10px] font-semibold uppercase tracking-wider block mb-0.5" style={{ color: "#8B5CF6" }}>Why ask this</span>
                            <span className="text-[12px]" style={{ color: "#C0C0E8" }}>{q.why_ask}</span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}

                </motion.div>
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
