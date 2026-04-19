"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import {
  Send,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Sparkles,
  Mail,
  Linkedin,
  Twitter,
  MessageSquare,
  AlertCircle,
  Lightbulb,
  Users,
  Coffee,
  Briefcase,
  Info,
  RotateCcw,
} from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

// ── Types ─────────────────────────────────────────────────────────────────────

type Goal = "referral" | "coffee-chat" | "job-inquiry" | "networking" | "informational-interview";
type Platform = "email" | "linkedin-message" | "linkedin-inmail" | "twitter-dm";

interface OutreachResult {
  subject_line: string;
  message: string;
  message_short: string;
  personalization_hooks: string[];
  why_it_works: string;
  follow_up_timing: string;
  alternative_angle: string;
}

interface OutreachHistoryItem {
  id: string;
  createdAt: string;
  targetName: string;
  targetCompany: string;
  targetRole: string;
  targetBio: string;
  sharedContext?: string;
  goal: Goal;
  platform: Platform;
  result: OutreachResult;
}

interface GeneratePayload {
  action: "generate";
  targetName: string;
  targetCompany: string;
  targetRole: string;
  targetBio: string;
  sharedContext?: string;
  goal: Goal;
  platform: Platform;
}

interface OutreachResponse {
  outreach: OutreachResult;
  historyItem: OutreachHistoryItem;
}

interface HistoryResponse {
  history: OutreachHistoryItem[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const GOALS: { id: Goal; label: string; icon: React.ElementType; description: string }[] = [
  {
    id: "referral",
    label: "Referral Request",
    icon: Users,
    description: "Ask for an internal referral",
  },
  {
    id: "coffee-chat",
    label: "Coffee Chat",
    icon: Coffee,
    description: "Casual 20-min virtual chat",
  },
  {
    id: "job-inquiry",
    label: "Job Inquiry",
    icon: Briefcase,
    description: "Ask about open opportunities",
  },
  {
    id: "networking",
    label: "Networking",
    icon: Sparkles,
    description: "Build a professional relationship",
  },
  {
    id: "informational-interview",
    label: "Info Interview",
    icon: Info,
    description: "Learn about their career path",
  },
];

const PLATFORMS: { id: Platform; label: string; icon: React.ElementType; limit: string }[] = [
  { id: "email", label: "Email", icon: Mail, limit: "150 words" },
  { id: "linkedin-message", label: "LinkedIn Message", icon: Linkedin, limit: "300 chars" },
  { id: "linkedin-inmail", label: "LinkedIn InMail", icon: Linkedin, limit: "300 words" },
  { id: "twitter-dm", label: "Twitter DM", icon: Twitter, limit: "280 chars" },
];

const GOAL_BADGE_COLORS: Record<Goal, string> = {
  referral: "#8B5CF6",
  "coffee-chat": "#34D399",
  "job-inquiry": "#FBBF24",
  networking: "#60A5FA",
  "informational-interview": "#F472B6",
};

// ── Animation helpers ─────────────────────────────────────────────────────────

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: "easeOut" as const, delay },
});

// ── CopyButton ────────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] text-[11px] font-medium transition-all"
      style={{
        background: copied ? "rgba(52,211,153,0.12)" : "rgba(255,255,255,0.05)",
        border: copied ? "1px solid rgba(52,211,153,0.3)" : "1px solid rgba(255,255,255,0.08)",
        color: copied ? "#34D399" : "#9090B8",
      }}
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

// ── MessageBlock ──────────────────────────────────────────────────────────────

function MessageBlock({
  label,
  content,
  mono = false,
}: {
  label: string;
  content: string;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-[11px] font-semibold uppercase tracking-widest"
          style={{ color: "#3A3A60", fontFamily: "monospace" }}
        >
          {label}
        </span>
        <CopyButton text={content} />
      </div>
      <div
        className="rounded-[10px] p-4 text-[13px] leading-relaxed whitespace-pre-wrap"
        style={{
          background: "rgba(7,7,16,0.6)",
          border: "1px solid rgba(255,255,255,0.05)",
          color: "#F0F0FF",
          fontFamily: mono ? "monospace" : "'Inter', sans-serif",
        }}
      >
        {content}
      </div>
    </div>
  );
}

// ── GoalCard ──────────────────────────────────────────────────────────────────

function GoalCard({
  goal,
  selected,
  onSelect,
}: {
  goal: (typeof GOALS)[number];
  selected: boolean;
  onSelect: () => void;
}) {
  const Icon = goal.icon;
  return (
    <button
      onClick={onSelect}
      className="flex flex-col gap-1 p-3 rounded-[10px] text-left transition-all"
      style={{
        background: selected ? "rgba(124,58,237,0.15)" : "rgba(255,255,255,0.03)",
        border: selected ? "1px solid rgba(124,58,237,0.4)" : "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="flex items-center gap-2">
        <Icon
          size={13}
          style={{ color: selected ? "#8B5CF6" : "#3A3A60", flexShrink: 0 }}
        />
        <span
          className="text-[12px] font-semibold"
          style={{ color: selected ? "#F0F0FF" : "#9090B8" }}
        >
          {goal.label}
        </span>
      </div>
      <span className="text-[11px]" style={{ color: selected ? "#9090B8" : "#3A3A60" }}>
        {goal.description}
      </span>
    </button>
  );
}

// ── PlatformCard ──────────────────────────────────────────────────────────────

function PlatformCard({
  platform,
  selected,
  onSelect,
}: {
  platform: (typeof PLATFORMS)[number];
  selected: boolean;
  onSelect: () => void;
}) {
  const Icon = platform.icon;
  return (
    <button
      onClick={onSelect}
      className="flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] transition-all"
      style={{
        background: selected ? "rgba(124,58,237,0.15)" : "rgba(255,255,255,0.03)",
        border: selected ? "1px solid rgba(124,58,237,0.4)" : "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <Icon size={13} style={{ color: selected ? "#8B5CF6" : "#3A3A60" }} />
      <div className="text-left">
        <div
          className="text-[12px] font-medium leading-none"
          style={{ color: selected ? "#F0F0FF" : "#9090B8" }}
        >
          {platform.label}
        </div>
        <div
          className="text-[10px] mt-0.5"
          style={{ color: selected ? "#9090B8" : "#3A3A60", fontFamily: "monospace" }}
        >
          {platform.limit}
        </div>
      </div>
    </button>
  );
}

// ── OutputPanel ───────────────────────────────────────────────────────────────

function OutputPanel({ result }: { result: OutreachResult }) {
  const [alternativeOpen, setAlternativeOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-4"
    >
      {result.subject_line && (
        <MessageBlock label="Subject Line" content={result.subject_line} />
      )}

      <MessageBlock label="Full Message" content={result.message} />

      <MessageBlock label="Short Version (LinkedIn-safe)" content={result.message_short} />

      {/* Personalization hooks */}
      <div>
        <div
          className="text-[11px] font-semibold uppercase tracking-widest mb-2"
          style={{ color: "#3A3A60", fontFamily: "monospace" }}
        >
          Why This Message Is Personalized
        </div>
        <div
          className="rounded-[10px] p-4"
          style={{
            background: "rgba(124,58,237,0.06)",
            border: "1px solid rgba(124,58,237,0.15)",
          }}
        >
          <ul className="flex flex-col gap-2">
            {result.personalization_hooks.map((hook, i) => (
              <li key={i} className="flex items-start gap-2 text-[13px]">
                <span style={{ color: "#8B5CF6", marginTop: "2px", flexShrink: 0 }}>•</span>
                <span style={{ color: "#D0D0F0" }}>{hook}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Why it works */}
      <div
        className="rounded-[10px] p-4 flex gap-3"
        style={{
          background: "rgba(52,211,153,0.06)",
          border: "1px solid rgba(52,211,153,0.15)",
        }}
      >
        <Lightbulb size={15} style={{ color: "#34D399", flexShrink: 0, marginTop: "1px" }} />
        <div>
          <div
            className="text-[11px] font-semibold uppercase tracking-wider mb-1"
            style={{ color: "#34D399", fontFamily: "monospace" }}
          >
            Why It Works
          </div>
          <p className="text-[13px] leading-relaxed" style={{ color: "#D0D0F0" }}>
            {result.why_it_works}
          </p>
        </div>
      </div>

      {/* Follow-up timing */}
      <div
        className="rounded-[10px] p-4 flex gap-3"
        style={{
          background: "rgba(251,191,36,0.06)",
          border: "1px solid rgba(251,191,36,0.15)",
        }}
      >
        <Clock size={15} style={{ color: "#FBBF24", flexShrink: 0, marginTop: "1px" }} />
        <div>
          <div
            className="text-[11px] font-semibold uppercase tracking-wider mb-1"
            style={{ color: "#FBBF24", fontFamily: "monospace" }}
          >
            Follow-up Timing
          </div>
          <p className="text-[13px] leading-relaxed" style={{ color: "#D0D0F0" }}>
            {result.follow_up_timing}
          </p>
        </div>
      </div>

      {/* Alternative angle — collapsible */}
      <div
        className="rounded-[10px] overflow-hidden"
        style={{ border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <button
          onClick={() => setAlternativeOpen((prev) => !prev)}
          className="w-full flex items-center justify-between px-4 py-3 transition-colors"
          style={{
            background: "rgba(255,255,255,0.03)",
          }}
        >
          <div className="flex items-center gap-2">
            <RotateCcw size={13} style={{ color: "#9090B8" }} />
            <span className="text-[12px] font-medium" style={{ color: "#9090B8" }}>
              Alternative Angle
            </span>
          </div>
          {alternativeOpen ? (
            <ChevronUp size={13} style={{ color: "#3A3A60" }} />
          ) : (
            <ChevronDown size={13} style={{ color: "#3A3A60" }} />
          )}
        </button>
        <AnimatePresence initial={false}>
          {alternativeOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div
                className="px-4 pb-4 pt-3 text-[13px] leading-relaxed"
                style={{ color: "#D0D0F0" }}
              >
                {result.alternative_angle}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ── EmptyOutputPanel ──────────────────────────────────────────────────────────

function EmptyOutputPanel() {
  const tips = [
    "Reference something specific — a recent post, project, or career transition",
    "Make one clear ask at the end — don't ask multiple things",
    "Keep it under 150 words — if it's long, it won't get read",
    "Sound like a human: avoid 'synergies', 'leverage', 'circle back'",
    "Shared context (mutual connection, same school) dramatically increases reply rate",
  ];

  return (
    <div
      className="rounded-[14px] p-6 h-full flex flex-col"
      style={{
        background: "#0C0C14",
        border: "1px solid rgba(255,255,255,0.06)",
        minHeight: "400px",
      }}
    >
      <div className="flex items-center gap-2 mb-6">
        <div
          className="w-8 h-8 rounded-[10px] flex items-center justify-center"
          style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.25)" }}
        >
          <MessageSquare size={15} style={{ color: "#8B5CF6" }} />
        </div>
        <span
          className="text-[13px] font-semibold uppercase tracking-wider"
          style={{ color: "#3A3A60", fontFamily: "monospace" }}
        >
          Your Message Will Appear Here
        </span>
      </div>

      <div className="flex-1 flex flex-col justify-center">
        <div
          className="text-[12px] font-semibold uppercase tracking-widest mb-4"
          style={{ color: "#3A3A60", fontFamily: "monospace" }}
        >
          Tips for Better Responses
        </div>
        <ul className="flex flex-col gap-3">
          {tips.map((tip, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span
                className="text-[11px] font-bold mt-0.5 flex-shrink-0"
                style={{ color: "#8B5CF6" }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-[13px] leading-relaxed" style={{ color: "#9090B8" }}>
                {tip}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ── HistoryPanel ──────────────────────────────────────────────────────────────

function HistoryPanel({
  items,
  onRestore,
}: {
  items: OutreachHistoryItem[];
  onRestore: (item: OutreachHistoryItem) => void;
}) {
  const displayed = items.slice(0, 10);

  return (
    <motion.div {...fadeUp(0.1)} className="mt-8">
      <div
        className="text-[11px] font-semibold uppercase tracking-widest mb-4"
        style={{ color: "#3A3A60", fontFamily: "monospace" }}
      >
        Recent Messages
      </div>
      <div className="flex flex-col gap-2">
        {displayed.map((item) => {
          const goalLabel = GOALS.find((g) => g.id === item.goal)?.label ?? item.goal;
          const badgeColor = GOAL_BADGE_COLORS[item.goal];
          const date = new Date(item.createdAt);
          const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

          return (
            <motion.button
              key={item.id}
              onClick={() => onRestore(item)}
              className="flex items-start gap-4 p-4 rounded-[12px] text-left transition-all"
              style={{
                background: "#0C0C14",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
              whileHover={{
                borderColor: "rgba(124,58,237,0.25)",
                background: "rgba(124,58,237,0.05)",
                transition: { duration: 0.15 },
              }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-[13px] font-semibold" style={{ color: "#F0F0FF" }}>
                    {item.targetName}
                  </span>
                  <span style={{ color: "#3A3A60" }}>·</span>
                  <span className="text-[12px]" style={{ color: "#9090B8" }}>
                    {item.targetRole} @ {item.targetCompany}
                  </span>
                </div>
                <p
                  className="text-[12px] leading-relaxed overflow-hidden"
                  style={{
                    color: "#9090B8",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical" as React.CSSProperties["WebkitBoxOrient"],
                    overflow: "hidden",
                  }}
                >
                  {item.result.message}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    background: `${badgeColor}18`,
                    border: `1px solid ${badgeColor}30`,
                    color: badgeColor,
                  }}
                >
                  {goalLabel}
                </span>
                <span className="text-[11px]" style={{ color: "#3A3A60" }}>
                  {dateStr}
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function OutreachPage() {
  const [targetName, setTargetName] = useState("");
  const [targetCompany, setTargetCompany] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [targetBio, setTargetBio] = useState("");
  const [sharedContext, setSharedContext] = useState("");
  const [goal, setGoal] = useState<Goal>("coffee-chat");
  const [platform, setPlatform] = useState<Platform>("linkedin-message");
  const [outputResult, setOutputResult] = useState<OutreachResult | null>(null);

  const inputStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: "10px",
    padding: "10px 13px",
    fontSize: "13px",
    color: "#F0F0FF",
    fontFamily: "'Inter', sans-serif",
    outline: "none",
    width: "100%",
    resize: "vertical" as const,
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "11px",
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
    color: "#3A3A60",
    fontFamily: "monospace",
    marginBottom: "6px",
  };

  const generateMutation = useMutation<
    { data: OutreachResponse },
    Error,
    GeneratePayload
  >({
    mutationFn: (payload) =>
      apiFetch("/api/outreach", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: (res) => {
      setOutputResult(res.data.outreach);
      historyQuery.refetch();
    },
  });

  const historyQuery = useQuery<{ data: HistoryResponse }>({
    queryKey: ["outreach-history"],
    queryFn: () => apiFetch("/api/outreach"),
    staleTime: 30_000,
  });

  const history: OutreachHistoryItem[] = historyQuery.data?.data?.history ?? [];
  const isLoading = generateMutation.isPending;
  const canSubmit =
    targetName.trim() &&
    targetCompany.trim() &&
    targetRole.trim() &&
    targetBio.trim() &&
    !isLoading;

  function handleGenerate() {
    if (!canSubmit) return;
    generateMutation.mutate({
      action: "generate",
      targetName: targetName.trim(),
      targetCompany: targetCompany.trim(),
      targetRole: targetRole.trim(),
      targetBio: targetBio.trim(),
      sharedContext: sharedContext.trim() || undefined,
      goal,
      platform,
    });
  }

  function handleRestore(item: OutreachHistoryItem) {
    setTargetName(item.targetName);
    setTargetCompany(item.targetCompany);
    setTargetRole(item.targetRole);
    setTargetBio(item.targetBio);
    setSharedContext(item.sharedContext ?? "");
    setGoal(item.goal);
    setPlatform(item.platform);
    setOutputResult(item.result);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div
      className="min-h-screen p-6"
      style={{ background: "#060608", fontFamily: "'Inter', sans-serif" }}
    >
      <div className="max-w-[1200px] mx-auto">
        {/* Header */}
        <motion.div {...fadeUp(0)} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-10 h-10 rounded-[12px] flex items-center justify-center"
              style={{
                background: "rgba(124,58,237,0.15)",
                border: "1px solid rgba(124,58,237,0.25)",
              }}
            >
              <Send size={18} style={{ color: "#8B5CF6" }} />
            </div>
            <h1
              className="text-[22px] font-bold"
              style={{ color: "#F0F0FF", letterSpacing: "-0.02em" }}
            >
              Cold Outreach
            </h1>
          </div>
          <p className="text-[14px]" style={{ color: "#9090B8", marginLeft: "52px" }}>
            Write personalized messages that actually get responses
          </p>
        </motion.div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ── Left: Input Form ── */}
          <motion.div {...fadeUp(0.05)}>
            <div
              className="rounded-[16px] p-6"
              style={{
                background: "#0C0C14",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div className="flex flex-col gap-5">
                {/* Target name / company / role */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label style={labelStyle}>Target Name</label>
                    <input
                      type="text"
                      value={targetName}
                      onChange={(e) => setTargetName(e.target.value)}
                      placeholder="Jane Smith"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Company</label>
                    <input
                      type="text"
                      value={targetCompany}
                      onChange={(e) => setTargetCompany(e.target.value)}
                      placeholder="Stripe"
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Their Role</label>
                  <input
                    type="text"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    placeholder="Senior Software Engineer"
                    style={inputStyle}
                  />
                </div>

                {/* Target bio */}
                <div>
                  <label style={labelStyle}>Their Bio / Background</label>
                  <textarea
                    value={targetBio}
                    onChange={(e) => setTargetBio(e.target.value)}
                    rows={4}
                    placeholder="Paste their LinkedIn bio or any context about their background, recent posts, achievements, career path..."
                    style={inputStyle}
                  />
                </div>

                {/* Shared context */}
                <div>
                  <label style={labelStyle}>
                    Shared Context{" "}
                    <span style={{ color: "#3A3A60", fontWeight: 400 }}>(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={sharedContext}
                    onChange={(e) => setSharedContext(e.target.value)}
                    placeholder="Any mutual connection, shared company, common interest, or specific reason you're reaching out..."
                    style={inputStyle}
                  />
                </div>

                {/* Goal selector */}
                <div>
                  <label style={labelStyle}>Your Goal</label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {GOALS.map((g) => (
                      <GoalCard
                        key={g.id}
                        goal={g}
                        selected={goal === g.id}
                        onSelect={() => setGoal(g.id)}
                      />
                    ))}
                  </div>
                </div>

                {/* Platform selector */}
                <div>
                  <label style={labelStyle}>Platform</label>
                  <div className="grid grid-cols-2 gap-2">
                    {PLATFORMS.map((p) => (
                      <PlatformCard
                        key={p.id}
                        platform={p}
                        selected={platform === p.id}
                        onSelect={() => setPlatform(p.id)}
                      />
                    ))}
                  </div>
                </div>

                {/* Error */}
                {generateMutation.isError && (
                  <div
                    className="flex items-center gap-2.5 p-3 rounded-[10px]"
                    style={{
                      background: "rgba(248,113,113,0.08)",
                      border: "1px solid rgba(248,113,113,0.2)",
                    }}
                  >
                    <AlertCircle size={14} style={{ color: "#F87171", flexShrink: 0 }} />
                    <span className="text-[12px]" style={{ color: "#F87171" }}>
                      {generateMutation.error?.message ?? "Something went wrong. Please try again."}
                    </span>
                  </div>
                )}

                {/* Generate button */}
                <motion.button
                  onClick={handleGenerate}
                  disabled={!canSubmit}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-[10px] text-[14px] font-semibold transition-all"
                  style={{
                    background: canSubmit ? "#7C3AED" : "rgba(124,58,237,0.2)",
                    color: canSubmit ? "#fff" : "#3A3A60",
                    cursor: canSubmit ? "pointer" : "not-allowed",
                    border: "none",
                  }}
                  whileHover={canSubmit ? { scale: 1.01 } : {}}
                  whileTap={canSubmit ? { scale: 0.99 } : {}}
                >
                  {isLoading ? (
                    <>
                      <div
                        className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                        style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "transparent" }}
                      />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles size={15} />
                      Generate Message
                    </>
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>

          {/* ── Right: Output Panel ── */}
          <motion.div {...fadeUp(0.1)}>
            <AnimatePresence mode="wait">
              {outputResult ? (
                <div
                  key="output"
                  className="rounded-[16px] p-6"
                  style={{
                    background: "#0C0C14",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <div className="flex items-center justify-between mb-5">
                    <span
                      className="text-[11px] font-semibold uppercase tracking-widest"
                      style={{ color: "#3A3A60", fontFamily: "monospace" }}
                    >
                      Generated Message
                    </span>
                    <button
                      onClick={() => setOutputResult(null)}
                      className="text-[11px] px-2.5 py-1 rounded-[8px] transition-colors"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.07)",
                        color: "#9090B8",
                      }}
                    >
                      Clear
                    </button>
                  </div>
                  <OutputPanel result={outputResult} />
                </div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <EmptyOutputPanel />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* History */}
        {history.length > 0 && (
          <HistoryPanel items={history} onRestore={handleRestore} />
        )}
      </div>
    </div>
  );
}
