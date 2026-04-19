"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import {
  Plus,
  Trash2,
  Copy,
  Check,
  Loader2,
  BarChart2,
  ChevronDown,
  ChevronUp,
  Send,
  Users,
  Sparkles,
  MessageSquare,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  MinusCircle,
  AlertCircle,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

// ─── Types ────────────────────────────────────────────────────────────────────

type GoalType = "connect" | "referral" | "coffee-chat" | "job-inquiry";
type ResponseType = "accepted" | "replied" | "ignored" | "declined" | "pending";

interface TargetInput {
  name: string;
  company: string;
  role: string;
  goal: GoalType;
  context: string;
}

interface GeneratedTarget {
  id: string;
  name: string;
  company: string;
  role: string;
  goal: GoalType;
  context?: string;
  connection_note: string;
  inmail_message: string;
  personalization_hooks: string[];
  response?: ResponseType;
  respondedAt?: string;
}

interface Batch {
  id: string;
  generatedAt: string;
  targets: GeneratedTarget[];
  stats: {
    total: number;
    accepted: number;
    replied: number;
    ignored: number;
    declined: number;
  };
}

interface HistoryResponse {
  batches: Batch[];
}

interface GenerateResponse {
  batch: Batch;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const GOAL_OPTIONS: { value: GoalType; label: string; color: string }[] = [
  { value: "connect", label: "Connect", color: "#8B5CF6" },
  { value: "referral", label: "Referral", color: "#34D399" },
  { value: "coffee-chat", label: "Coffee Chat", color: "#FBBF24" },
  { value: "job-inquiry", label: "Job Inquiry", color: "#60A5FA" },
];

const RESPONSE_CONFIG: Record<ResponseType, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: "Pending", color: "#9090B8", icon: Clock },
  accepted: { label: "Accepted", color: "#34D399", icon: CheckCircle2 },
  replied: { label: "Replied", color: "#8B5CF6", icon: MessageSquare },
  ignored: { label: "Ignored", color: "#6060A0", icon: MinusCircle },
  declined: { label: "Declined", color: "#F87171", icon: XCircle },
};

function emptyTarget(): TargetInput {
  return { name: "", company: "", role: "", goal: "connect", context: "" };
}

// ─── Target Input Row ─────────────────────────────────────────────────────────

function TargetRow({
  target,
  index,
  onChange,
  onRemove,
  canRemove,
}: {
  target: TargetInput;
  index: number;
  onChange: (t: TargetInput) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const inputStyle = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 6,
    color: "#E0E0FF",
    fontSize: 12,
    padding: "6px 10px",
    outline: "none",
    width: "100%",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="grid gap-2 p-3 rounded-lg"
      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-medium" style={{ color: "#6060A0" }}>
          #{index + 1}
        </span>
        {canRemove && (
          <button onClick={onRemove} className="hover:text-red-400 transition-colors" style={{ color: "#3A3A60" }}>
            <Trash2 size={13} />
          </button>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <input
          placeholder="Full name"
          value={target.name}
          onChange={(e) => onChange({ ...target, name: e.target.value })}
          style={inputStyle}
        />
        <input
          placeholder="Company"
          value={target.company}
          onChange={(e) => onChange({ ...target, company: e.target.value })}
          style={inputStyle}
        />
        <input
          placeholder="Their role / title"
          value={target.role}
          onChange={(e) => onChange({ ...target, role: e.target.value })}
          style={inputStyle}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <select
          value={target.goal}
          onChange={(e) => onChange({ ...target, goal: e.target.value as GoalType })}
          style={{ ...inputStyle, cursor: "pointer" }}
        >
          {GOAL_OPTIONS.map((g) => (
            <option key={g.value} value={g.value} style={{ background: "#0C0C14" }}>
              {g.label}
            </option>
          ))}
        </select>
        <input
          placeholder="Extra context (optional)"
          value={target.context}
          onChange={(e) => onChange({ ...target, context: e.target.value })}
          style={inputStyle}
        />
      </div>
    </motion.div>
  );
}

// ─── Copy Button ──────────────────────────────────────────────────────────────

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 px-2 py-1 rounded text-[10px] transition-colors"
      style={{
        background: copied ? "rgba(52,211,153,0.12)" : "rgba(255,255,255,0.05)",
        color: copied ? "#34D399" : "#6060A0",
        border: `1px solid ${copied ? "rgba(52,211,153,0.2)" : "rgba(255,255,255,0.06)"}`,
      }}
    >
      {copied ? <Check size={10} /> : <Copy size={10} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

// ─── Generated Target Card ────────────────────────────────────────────────────

function TargetCard({
  target,
  batchId,
  onTrack,
}: {
  target: GeneratedTarget;
  batchId: string;
  onTrack: (batchId: string, targetId: string, response: Exclude<ResponseType, "pending">) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const goal = GOAL_OPTIONS.find((g) => g.value === target.goal);
  const response = RESPONSE_CONFIG[target.response ?? "pending"];
  const ResponseIcon = response.icon;

  const charCount = target.connection_note.length;

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ background: "rgba(12,12,20,0.7)", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)", color: "white" }}
          >
            {target.name[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-medium truncate" style={{ color: "#E0E0FF" }}>
              {target.name}
            </p>
            <p className="text-[11px] truncate" style={{ color: "#6060A0" }}>
              {target.role} @ {target.company}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-medium"
            style={{
              background: `${goal?.color}18`,
              color: goal?.color,
              border: `1px solid ${goal?.color}30`,
            }}
          >
            {goal?.label}
          </span>
          <span
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px]"
            style={{ color: response.color, background: `${response.color}14`, border: `1px solid ${response.color}25` }}
          >
            <ResponseIcon size={9} />
            {response.label}
          </span>
          <button onClick={() => setExpanded(!expanded)} style={{ color: "#4A4A70" }}>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              {/* Connection Note */}
              <div className="pt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold" style={{ color: "#8B5CF6" }}>
                    Connection Note
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[10px]"
                      style={{ color: charCount > 280 ? "#F87171" : charCount > 250 ? "#FBBF24" : "#34D399" }}
                    >
                      {charCount}/300
                    </span>
                    <CopyBtn text={target.connection_note} />
                  </div>
                </div>
                <p
                  className="text-[12px] leading-relaxed p-3 rounded"
                  style={{
                    background: "rgba(139,92,246,0.06)",
                    border: "1px solid rgba(139,92,246,0.12)",
                    color: "#C0C0E8",
                    fontStyle: "italic",
                  }}
                >
                  &ldquo;{target.connection_note}&rdquo;
                </p>
              </div>

              {/* InMail Message */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold" style={{ color: "#60A5FA" }}>
                    InMail Message
                  </span>
                  <CopyBtn text={target.inmail_message} />
                </div>
                <p
                  className="text-[12px] leading-relaxed p-3 rounded"
                  style={{
                    background: "rgba(96,165,250,0.06)",
                    border: "1px solid rgba(96,165,250,0.12)",
                    color: "#C0C0E8",
                  }}
                >
                  {target.inmail_message}
                </p>
              </div>

              {/* Personalization Hooks */}
              {target.personalization_hooks.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold mb-2" style={{ color: "#34D399" }}>
                    Personalization Hooks
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {target.personalization_hooks.map((hook, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded text-[10px]"
                        style={{
                          background: "rgba(52,211,153,0.08)",
                          border: "1px solid rgba(52,211,153,0.15)",
                          color: "#34D399",
                        }}
                      >
                        ✓ {hook}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Track Response */}
              <div>
                <p className="text-[11px] mb-2" style={{ color: "#4A4A70" }}>
                  Track response:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(["accepted", "replied", "ignored", "declined"] as const).map((r) => {
                    const cfg = RESPONSE_CONFIG[r];
                    const active = target.response === r;
                    return (
                      <button
                        key={r}
                        onClick={() => onTrack(batchId, target.id, r)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] transition-all"
                        style={{
                          background: active ? `${cfg.color}18` : "rgba(255,255,255,0.03)",
                          color: active ? cfg.color : "#6060A0",
                          border: `1px solid ${active ? `${cfg.color}35` : "rgba(255,255,255,0.06)"}`,
                          fontWeight: active ? 500 : 400,
                        }}
                      >
                        <cfg.icon size={10} />
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Batch Card ───────────────────────────────────────────────────────────────

function BatchCard({
  batch,
  onTrack,
}: {
  batch: Batch;
  onTrack: (batchId: string, targetId: string, response: Exclude<ResponseType, "pending">) => void;
}) {
  const [open, setOpen] = useState(true);
  const responseRate =
    batch.stats.total > 0
      ? Math.round(((batch.stats.accepted + batch.stats.replied) / batch.stats.total) * 100)
      : 0;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: "#0C0C14", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      {/* Batch header */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <Users size={15} style={{ color: "#8B5CF6" }} />
          <div className="text-left">
            <p className="text-[13px] font-medium" style={{ color: "#E0E0FF" }}>
              {batch.stats.total} target{batch.stats.total !== 1 ? "s" : ""}
            </p>
            <p className="text-[11px]" style={{ color: "#4A4A70" }}>
              {new Date(batch.generatedAt).toLocaleDateString([], {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Mini stats */}
          <div className="flex items-center gap-2 text-[11px]">
            {batch.stats.accepted > 0 && (
              <span style={{ color: "#34D399" }}>✓ {batch.stats.accepted}</span>
            )}
            {batch.stats.replied > 0 && (
              <span style={{ color: "#8B5CF6" }}>↩ {batch.stats.replied}</span>
            )}
            {batch.stats.ignored > 0 && (
              <span style={{ color: "#4A4A70" }}>- {batch.stats.ignored}</span>
            )}
            {responseRate > 0 && (
              <span
                className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                style={{ background: "rgba(139,92,246,0.12)", color: "#8B5CF6" }}
              >
                {responseRate}% rate
              </span>
            )}
          </div>
          {open ? <ChevronUp size={14} style={{ color: "#4A4A70" }} /> : <ChevronDown size={14} style={{ color: "#4A4A70" }} />}
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-2" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
              {batch.targets.map((target) => (
                <TargetCard key={target.id} target={target} batchId={batch.id} onTrack={onTrack} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Stats Strip ──────────────────────────────────────────────────────────────

function StatsStrip({ batches }: { batches: Batch[] }) {
  const totals = batches.reduce(
    (acc, b) => ({
      total: acc.total + b.stats.total,
      accepted: acc.accepted + b.stats.accepted,
      replied: acc.replied + b.stats.replied,
      ignored: acc.ignored + b.stats.ignored,
    }),
    { total: 0, accepted: 0, replied: 0, ignored: 0 }
  );
  const rate = totals.total > 0 ? Math.round(((totals.accepted + totals.replied) / totals.total) * 100) : 0;

  const stats = [
    { label: "Sent", value: totals.total, color: "#9090B8" },
    { label: "Accepted", value: totals.accepted, color: "#34D399" },
    { label: "Replied", value: totals.replied, color: "#8B5CF6" },
    { label: "Response Rate", value: `${rate}%`, color: "#FBBF24" },
  ];

  return (
    <div
      className="grid grid-cols-4 gap-3 rounded-xl p-4 mb-6"
      style={{ background: "#0C0C14", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      {stats.map((s) => (
        <div key={s.label} className="text-center">
          <p className="text-[22px] font-bold" style={{ color: s.color }}>
            {s.value}
          </p>
          <p className="text-[11px]" style={{ color: "#4A4A70" }}>
            {s.label}
          </p>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LinkedInToolsPage() {
  const queryClient = useQueryClient();
  const [targets, setTargets] = useState<TargetInput[]>([emptyTarget()]);
  const [activeTab, setActiveTab] = useState<"generate" | "history">("generate");
  const [activeBatch, setActiveBatch] = useState<Batch | null>(null);

  const { data: historyData, isLoading: loadingHistory } = useQuery({
    queryKey: ["linkedin-tools"],
    queryFn: () => apiFetch<HistoryResponse>("/api/linkedin-tools"),
  });

  const generateMutation = useMutation({
    mutationFn: (targets: TargetInput[]) =>
      apiFetch<GenerateResponse>("/api/linkedin-tools", {
        method: "POST",
        body: JSON.stringify({ action: "batch-generate", targets }),
      }),
    onSuccess: (data) => {
      setActiveBatch(data.batch);
      setTargets([emptyTarget()]);
      setActiveTab("history");
      queryClient.invalidateQueries({ queryKey: ["linkedin-tools"] });
    },
  });

  const trackMutation = useMutation({
    mutationFn: ({
      batchId,
      targetId,
      responseType,
    }: {
      batchId: string;
      targetId: string;
      responseType: Exclude<ResponseType, "pending">;
    }) =>
      apiFetch("/api/linkedin-tools", {
        method: "POST",
        body: JSON.stringify({ action: "track-response", batchId, targetId, responseType }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["linkedin-tools"] });
    },
  });

  const handleTrack = (batchId: string, targetId: string, response: Exclude<ResponseType, "pending">) => {
    trackMutation.mutate({ batchId, targetId, responseType: response });
    // Optimistic update in activeBatch
    if (activeBatch && activeBatch.id === batchId) {
      setActiveBatch((prev) =>
        prev
          ? {
              ...prev,
              targets: prev.targets.map((t) => (t.id === targetId ? { ...t, response } : t)),
            }
          : null
      );
    }
  };

  const addTarget = () => {
    if (targets.length < 20) setTargets([...targets, emptyTarget()]);
  };

  const removeTarget = (i: number) => setTargets(targets.filter((_, idx) => idx !== i));

  const updateTarget = (i: number, t: TargetInput) => setTargets(targets.map((x, idx) => (idx === i ? t : x)));

  const validTargets = targets.filter((t) => t.name && t.company && t.role);

  const batches = historyData?.batches ?? [];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #0077B5 0%, #004182 100%)" }}
          >
            <Send size={15} className="text-white" />
          </div>
          <h1 className="text-[20px] font-bold" style={{ color: "#F0F0FF" }}>
            LinkedIn Outreach Toolkit
          </h1>
        </div>
        <p className="text-[13px] ml-11" style={{ color: "#6060A0" }}>
          AI-powered connection notes &amp; InMail messages — personalized, not generic
        </p>
      </div>

      {/* Stats */}
      {batches.length > 0 && <StatsStrip batches={batches} />}

      {/* Tabs */}
      <div className="flex gap-1 mb-5 p-1 rounded-lg w-fit" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
        {[
          { key: "generate", label: "Generate Messages", icon: Sparkles },
          { key: "history", label: "History & Tracking", icon: BarChart2 },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as "generate" | "history")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] transition-all"
            style={{
              background: activeTab === key ? "rgba(124,58,237,0.18)" : "transparent",
              color: activeTab === key ? "#A78BFA" : "#6060A0",
              fontWeight: activeTab === key ? 500 : 400,
            }}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "generate" && (
          <motion.div
            key="generate"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            {/* Goal legend */}
            <div className="flex flex-wrap gap-2 mb-4">
              {GOAL_OPTIONS.map((g) => (
                <span
                  key={g.value}
                  className="px-2 py-0.5 rounded-full text-[11px]"
                  style={{ background: `${g.color}14`, color: g.color, border: `1px solid ${g.color}28` }}
                >
                  {g.label}
                </span>
              ))}
            </div>

            {/* Target list */}
            <div className="space-y-2 mb-3">
              <AnimatePresence>
                {targets.map((t, i) => (
                  <TargetRow
                    key={i}
                    target={t}
                    index={i}
                    onChange={(updated) => updateTarget(i, updated)}
                    onRemove={() => removeTarget(i)}
                    canRemove={targets.length > 1}
                  />
                ))}
              </AnimatePresence>
            </div>

            {/* Add row / Generate */}
            <div className="flex items-center justify-between mt-4">
              <button
                onClick={addTarget}
                disabled={targets.length >= 20}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] transition-all disabled:opacity-40"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#9090B8" }}
              >
                <Plus size={13} />
                Add target ({targets.length}/20)
              </button>

              <button
                onClick={() => generateMutation.mutate(validTargets)}
                disabled={validTargets.length === 0 || generateMutation.isPending}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-[13px] font-semibold transition-all disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, #7C3AED, #5B21B6)",
                  color: "white",
                  boxShadow: "0 4px 14px rgba(124,58,237,0.35)",
                }}
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    Generate {validTargets.length > 0 ? `${validTargets.length} message${validTargets.length !== 1 ? "s" : ""}` : "messages"}
                  </>
                )}
              </button>
            </div>

            {generateMutation.isError && (
              <div
                className="flex items-center gap-2 mt-3 px-3 py-2 rounded-lg text-[12px]"
                style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", color: "#F87171" }}
              >
                <AlertCircle size={13} />
                Generation failed. Please try again.
              </div>
            )}

            {/* Tips */}
            <div
              className="mt-5 p-4 rounded-xl"
              style={{ background: "rgba(139,92,246,0.05)", border: "1px solid rgba(139,92,246,0.12)" }}
            >
              <p className="text-[12px] font-semibold mb-2 flex items-center gap-1.5" style={{ color: "#8B5CF6" }}>
                <TrendingUp size={13} /> Tips for high response rates
              </p>
              <ul className="space-y-1.5">
                {[
                  "Add context about where you found them (e.g. 'Saw your talk at…')",
                  "Use 'referral' goal for companies you're actively interviewing at",
                  "Coffee chat goals get 2-3x higher acceptance than direct job inquiries",
                  "Keep connection notes personal — no templates or mass messages",
                ].map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-[11px]" style={{ color: "#9090B8" }}>
                    <span style={{ color: "#8B5CF6", marginTop: 1 }}>›</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}

        {activeTab === "history" && (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            {loadingHistory ? (
              <div className="flex items-center justify-center py-16" style={{ color: "#4A4A70" }}>
                <Loader2 size={20} className="animate-spin mr-2" />
                Loading history…
              </div>
            ) : batches.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-center" style={{ color: "#4A4A70" }}>
                <Users size={32} className="mb-3 opacity-30" />
                <p className="text-[14px] font-medium" style={{ color: "#6060A0" }}>No batches yet</p>
                <p className="text-[12px] mt-1">Generate your first batch to start tracking responses</p>
              </div>
            ) : (
              <div className="space-y-4">
                {batches.map((batch) => (
                  <BatchCard key={batch.id} batch={batch} onTrack={handleTrack} />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
