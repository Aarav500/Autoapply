"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Phone,
  User,
  Building2,
  Briefcase,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  AlertTriangle,
  Sparkles,
  Loader2,
  AlertCircle,
  Clock,
  MessageSquare,
  ListChecks,
  BadgeCheck,
  History,
  Target,
} from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

// ─── Types ─────────────────────────────────────────────────────────────────────

type CallType = "phone-screen" | "video-intro" | "hr-round" | "hiring-manager";
type LikelyStyle = "structured" | "conversational" | "technical" | "culture-focused";
type ConfidenceLevel = "high" | "medium" | "challenging";

interface RecruiterProfile {
  background: string;
  years_in_recruiting: string;
  specialization: string;
  personality_signals: string[];
  likely_style: LikelyStyle;
}

interface CompanyScreeningStyle {
  what_they_screen_for: string[];
  deal_breakers: string[];
  green_flags_they_love: string[];
  typical_duration: string;
}

interface LikelyQuestion {
  question: string;
  why_they_ask: string;
  ideal_answer_direction: string;
  time_limit: string;
}

interface HowToPosition {
  opening_hook: string;
  key_narrative: string;
  skills_to_emphasize: string[];
  experience_to_highlight: string;
}

interface WhatNotToSayItem {
  dont_say: string;
  why: string;
  say_instead: string;
}

interface SalaryStrategy {
  when_to_discuss: string;
  how_to_deflect_early: string;
  what_to_say_when_pushed: string;
  anchoring_script: string;
}

interface QuestionToAsk {
  question: string;
  why_it_impresses: string;
}

interface CallStructure {
  opening: string;
  middle: string;
  closing: string;
}

interface RecruiterPrep {
  recruiter_profile: RecruiterProfile;
  company_screening_style: CompanyScreeningStyle;
  likely_questions: LikelyQuestion[];
  how_to_position: HowToPosition;
  what_not_to_say: WhatNotToSayItem[];
  salary_strategy: SalaryStrategy;
  questions_to_ask: QuestionToAsk[];
  call_structure: CallStructure;
  confidence_level: ConfidenceLevel;
  confidence_reason: string;
}

interface PrepSession {
  id: string;
  recruiterName: string;
  company: string;
  role: string;
  callType: string;
  generatedAt: string;
  prep: RecruiterPrep;
}

interface SessionsResponse {
  data: { sessions: PrepSession[] };
}

interface PrepResponse {
  data: { session: PrepSession };
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const CALL_TYPE_OPTIONS: { value: CallType; label: string; desc: string }[] = [
  { value: "phone-screen", label: "Phone Screen", desc: "Initial HR call" },
  { value: "video-intro", label: "Video Intro", desc: "Recorded or live intro" },
  { value: "hr-round", label: "HR Round", desc: "Formal HR interview" },
  { value: "hiring-manager", label: "Hiring Manager", desc: "Decision maker call" },
];

const TABS = [
  { id: "profile", label: "Recruiter Profile", icon: User },
  { id: "call", label: "The Call", icon: Phone },
  { id: "qa", label: "Questions & Answers", icon: MessageSquare },
  { id: "strategy", label: "Strategy", icon: Target },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ─── Small helpers ─────────────────────────────────────────────────────────────

function StyleBadge({ style }: { style: LikelyStyle }) {
  const map: Record<LikelyStyle, { label: string; color: string; bg: string }> = {
    structured: { label: "Structured", color: "#8B5CF6", bg: "rgba(139,92,246,0.12)" },
    conversational: { label: "Conversational", color: "#34D399", bg: "rgba(52,211,153,0.12)" },
    technical: { label: "Technical", color: "#FBBF24", bg: "rgba(251,191,36,0.12)" },
    "culture-focused": { label: "Culture-Focused", color: "#F87171", bg: "rgba(248,113,113,0.12)" },
  };
  const c = map[style];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider"
      style={{ color: c.color, background: c.bg, border: `1px solid ${c.color}33` }}
    >
      {c.label}
    </span>
  );
}

function ConfidenceBadge({ level, reason }: { level: ConfidenceLevel; reason: string }) {
  const map: Record<ConfidenceLevel, { label: string; color: string; bg: string; icon: React.ElementType }> = {
    high: { label: "High Confidence", color: "#34D399", bg: "rgba(52,211,153,0.10)", icon: BadgeCheck },
    medium: { label: "Medium Confidence", color: "#FBBF24", bg: "rgba(251,191,36,0.10)", icon: AlertTriangle },
    challenging: { label: "Challenging", color: "#F87171", bg: "rgba(248,113,113,0.10)", icon: AlertCircle },
  };
  const c = map[level];
  const Icon = c.icon;
  return (
    <div
      className="flex items-start gap-3 p-4 rounded-xl"
      style={{ background: c.bg, border: `1px solid ${c.color}33` }}
    >
      <Icon size={18} style={{ color: c.color, flexShrink: 0, marginTop: 2 }} />
      <div>
        <p className="text-[12px] font-bold uppercase tracking-wider mb-1" style={{ color: c.color }}>
          {c.label}
        </p>
        <p className="text-[13px]" style={{ color: "#D0D0F0" }}>
          {reason}
        </p>
      </div>
    </div>
  );
}

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg transition-all"
      style={{
        background: copied ? "rgba(124,58,237,0.15)" : "rgba(255,255,255,0.05)",
        color: copied ? "#8B5CF6" : "#9090B8",
        border: `1px solid ${copied ? "rgba(124,58,237,0.3)" : "rgba(255,255,255,0.07)"}`,
      }}
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {copied ? "Copied!" : label}
    </button>
  );
}

function Chip({ label, color = "#9090B8" }: { label: string; color?: string }) {
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium"
      style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}
    >
      {label}
    </span>
  );
}

function SectionCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl p-5 ${className}`}
      style={{ background: "#0C0C14", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: "#9090B8" }}>
      {children}
    </p>
  );
}

// ─── Tab: Recruiter Profile ────────────────────────────────────────────────────

function RecruiterProfileTab({ data }: { data: RecruiterPrep }) {
  const rp = data.recruiter_profile;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <SectionCard>
        <SectionLabel>Background</SectionLabel>
        <p className="text-[14px] leading-relaxed" style={{ color: "#D0D0F0" }}>
          {rp.background}
        </p>
      </SectionCard>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SectionCard>
          <SectionLabel>Years in Recruiting</SectionLabel>
          <p className="text-[20px] font-bold" style={{ color: "#F0F0FF" }}>
            {rp.years_in_recruiting}
          </p>
        </SectionCard>
        <SectionCard>
          <SectionLabel>Specialization</SectionLabel>
          <p className="text-[14px] font-semibold" style={{ color: "#F0F0FF" }}>
            {rp.specialization}
          </p>
        </SectionCard>
        <SectionCard>
          <SectionLabel>Likely Style</SectionLabel>
          <StyleBadge style={rp.likely_style} />
        </SectionCard>
      </div>

      <SectionCard>
        <SectionLabel>Personality Signals</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {rp.personality_signals.map((signal, i) => (
            <Chip key={i} label={signal} color="#8B5CF6" />
          ))}
        </div>
      </SectionCard>

      <ConfidenceBadge
        level={data.confidence_level}
        reason={data.confidence_reason}
      />
    </motion.div>
  );
}

// ─── Tab: The Call ─────────────────────────────────────────────────────────────

function TheCallTab({ data }: { data: RecruiterPrep }) {
  const cs = data.company_screening_style;
  const structure = data.call_structure;

  const steps = [
    { label: "Opening", content: structure.opening, color: "#34D399" },
    { label: "Middle", content: structure.middle, color: "#8B5CF6" },
    { label: "Closing", content: structure.closing, color: "#FBBF24" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Call structure */}
      <SectionCard>
        <SectionLabel>Call Structure</SectionLabel>
        <div className="relative">
          {steps.map((step, i) => (
            <div key={step.label} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold flex-shrink-0"
                  style={{ background: `${step.color}20`, color: step.color, border: `1.5px solid ${step.color}` }}
                >
                  {i + 1}
                </div>
                {i < steps.length - 1 && (
                  <div className="w-px flex-1 my-1" style={{ background: "rgba(255,255,255,0.08)" }} />
                )}
              </div>
              <div className={`pb-5 ${i < steps.length - 1 ? "" : "pb-0"}`}>
                <p className="text-[12px] font-bold uppercase tracking-wider mb-1" style={{ color: step.color }}>
                  {step.label}
                </p>
                <p className="text-[13px] leading-relaxed" style={{ color: "#D0D0F0" }}>
                  {step.content}
                </p>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Duration */}
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-xl"
        style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)" }}
      >
        <Clock size={15} style={{ color: "#8B5CF6" }} />
        <span className="text-[13px]" style={{ color: "#D0D0F0" }}>
          <span className="font-semibold" style={{ color: "#F0F0FF" }}>Typical duration: </span>
          {cs.typical_duration}
        </span>
      </div>

      {/* Screening grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SectionCard>
          <SectionLabel>What They Screen For</SectionLabel>
          <ul className="space-y-2">
            {cs.what_they_screen_for.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-[13px]" style={{ color: "#D0D0F0" }}>
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#9090B8" }} />
                {item}
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard>
          <SectionLabel>Deal Breakers</SectionLabel>
          <ul className="space-y-2">
            {cs.deal_breakers.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-[13px]" style={{ color: "#F87171" }}>
                <AlertTriangle size={12} className="mt-1 flex-shrink-0" style={{ color: "#F87171" }} />
                {item}
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard>
          <SectionLabel>Green Flags They Love</SectionLabel>
          <ul className="space-y-2">
            {cs.green_flags_they_love.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-[13px]" style={{ color: "#34D399" }}>
                <BadgeCheck size={13} className="mt-0.5 flex-shrink-0" style={{ color: "#34D399" }} />
                {item}
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </motion.div>
  );
}

// ─── Tab: Questions & Answers ─────────────────────────────────────────────────

function QATab({ data }: { data: RecruiterPrep }) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      {data.likely_questions.map((q, i) => {
        const isOpen = expandedIndex === i;
        return (
          <div
            key={i}
            className="rounded-xl overflow-hidden"
            style={{ border: `1px solid ${isOpen ? "rgba(124,58,237,0.3)" : "rgba(255,255,255,0.06)"}`, background: "#0C0C14" }}
          >
            <button
              className="w-full flex items-center justify-between gap-4 p-4 text-left transition-colors"
              style={{ background: isOpen ? "rgba(124,58,237,0.06)" : "transparent" }}
              onClick={() => setExpandedIndex(isOpen ? null : i)}
            >
              <div className="flex items-center gap-3">
                <span
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                  style={{ background: "rgba(139,92,246,0.15)", color: "#8B5CF6" }}
                >
                  {i + 1}
                </span>
                <p className="text-[14px] font-medium" style={{ color: "#F0F0FF" }}>
                  {q.question}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span
                  className="text-[11px] px-2 py-0.5 rounded-full font-mono"
                  style={{ background: "rgba(251,191,36,0.1)", color: "#FBBF24", border: "1px solid rgba(251,191,36,0.2)" }}
                >
                  {q.time_limit}
                </span>
                {isOpen ? (
                  <ChevronUp size={15} style={{ color: "#9090B8" }} />
                ) : (
                  <ChevronDown size={15} style={{ color: "#9090B8" }} />
                )}
              </div>
            </button>

            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 space-y-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="pt-3">
                      <p className="text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "#9090B8" }}>
                        Why they ask this
                      </p>
                      <p className="text-[13px]" style={{ color: "#B0B0D0" }}>
                        {q.why_they_ask}
                      </p>
                    </div>
                    <div
                      className="p-3 rounded-xl"
                      style={{ background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.15)" }}
                    >
                      <p className="text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "#34D399" }}>
                        Ideal answer direction
                      </p>
                      <p className="text-[13px]" style={{ color: "#D0F0E8" }}>
                        {q.ideal_answer_direction}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      {/* Questions to ask — shown at bottom of this tab */}
      <div className="pt-2">
        <p className="text-[11px] font-bold uppercase tracking-widest mb-3 px-1" style={{ color: "#9090B8" }}>
          Questions to ask the recruiter
        </p>
        <div className="space-y-3">
          {data.questions_to_ask.map((q, i) => (
            <div
              key={i}
              className="flex items-start gap-3 p-4 rounded-xl"
              style={{ background: "#0C0C14", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <ListChecks size={15} className="mt-0.5 flex-shrink-0" style={{ color: "#8B5CF6" }} />
              <div>
                <p className="text-[13px] font-semibold mb-1" style={{ color: "#F0F0FF" }}>
                  {q.question}
                </p>
                <p className="text-[12px]" style={{ color: "#9090B8" }}>
                  {q.why_it_impresses}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Tab: Strategy ─────────────────────────────────────────────────────────────

function StrategyTab({ data }: { data: RecruiterPrep }) {
  const pos = data.how_to_position;
  const salary = data.salary_strategy;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* How to position */}
      <SectionCard>
        <SectionLabel>How to Position Yourself</SectionLabel>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[12px] font-bold uppercase tracking-wider" style={{ color: "#8B5CF6" }}>
                Opening Hook (first 30 seconds)
              </p>
              <CopyButton text={pos.opening_hook} />
            </div>
            <div
              className="p-3 rounded-xl font-mono text-[13px] leading-relaxed"
              style={{
                background: "rgba(124,58,237,0.08)",
                border: "1px solid rgba(124,58,237,0.2)",
                color: "#E0E0FF",
              }}
            >
              {pos.opening_hook}
            </div>
          </div>

          <div>
            <p className="text-[12px] font-bold uppercase tracking-wider mb-2" style={{ color: "#9090B8" }}>
              Key Narrative
            </p>
            <p className="text-[13px] leading-relaxed" style={{ color: "#D0D0F0" }}>
              {pos.key_narrative}
            </p>
          </div>

          <div>
            <p className="text-[12px] font-bold uppercase tracking-wider mb-2" style={{ color: "#9090B8" }}>
              Skills to Emphasize
            </p>
            <div className="flex flex-wrap gap-2">
              {pos.skills_to_emphasize.map((s, i) => (
                <Chip key={i} label={s} color="#34D399" />
              ))}
            </div>
          </div>

          <div>
            <p className="text-[12px] font-bold uppercase tracking-wider mb-2" style={{ color: "#9090B8" }}>
              Experience to Highlight
            </p>
            <p className="text-[13px] leading-relaxed" style={{ color: "#D0D0F0" }}>
              {pos.experience_to_highlight}
            </p>
          </div>
        </div>
      </SectionCard>

      {/* What not to say */}
      <SectionCard>
        <SectionLabel>What NOT to Say</SectionLabel>
        <div className="grid grid-cols-1 gap-3">
          {data.what_not_to_say.map((item, i) => (
            <div
              key={i}
              className="grid grid-cols-3 gap-3 p-3 rounded-xl"
              style={{ background: "rgba(248,113,113,0.04)", border: "1px solid rgba(248,113,113,0.12)" }}
            >
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "#F87171" }}>
                  Don&apos;t say
                </p>
                <p className="text-[12px] leading-relaxed" style={{ color: "#F0C0C0" }}>
                  &ldquo;{item.dont_say}&rdquo;
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "#9090B8" }}>
                  Why
                </p>
                <p className="text-[12px] leading-relaxed" style={{ color: "#B0B0D0" }}>
                  {item.why}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "#34D399" }}>
                  Say instead
                </p>
                <p className="text-[12px] leading-relaxed" style={{ color: "#C0F0D8" }}>
                  &ldquo;{item.say_instead}&rdquo;
                </p>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Salary strategy */}
      <SectionCard>
        <SectionLabel>Salary Strategy</SectionLabel>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-[12px] font-bold uppercase tracking-wider mb-2" style={{ color: "#FBBF24" }}>
                When to Discuss
              </p>
              <p className="text-[13px] leading-relaxed" style={{ color: "#D0D0F0" }}>
                {salary.when_to_discuss}
              </p>
            </div>
            <div>
              <p className="text-[12px] font-bold uppercase tracking-wider mb-2" style={{ color: "#9090B8" }}>
                How to Deflect Early
              </p>
              <p className="text-[13px] leading-relaxed" style={{ color: "#D0D0F0" }}>
                {salary.how_to_deflect_early}
              </p>
            </div>
            <div>
              <p className="text-[12px] font-bold uppercase tracking-wider mb-2" style={{ color: "#9090B8" }}>
                When Pushed for a Number
              </p>
              <p className="text-[13px] leading-relaxed" style={{ color: "#D0D0F0" }}>
                {salary.what_to_say_when_pushed}
              </p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[12px] font-bold uppercase tracking-wider" style={{ color: "#34D399" }}>
                Anchoring Script (read verbatim)
              </p>
              <CopyButton text={salary.anchoring_script} />
            </div>
            <div
              className="p-3 rounded-xl font-mono text-[13px] leading-relaxed whitespace-pre-wrap"
              style={{
                background: "rgba(52,211,153,0.06)",
                border: "1px solid rgba(52,211,153,0.2)",
                color: "#D0F0E8",
              }}
            >
              {salary.anchoring_script}
            </div>
          </div>
        </div>
      </SectionCard>
    </motion.div>
  );
}

// ─── Past Sessions ─────────────────────────────────────────────────────────────

function PastSessions({
  sessions,
  onSelect,
}: {
  sessions: PrepSession[];
  onSelect: (session: PrepSession) => void;
}) {
  if (sessions.length === 0) return null;

  const callTypeLabel: Record<string, string> = {
    "phone-screen": "Phone Screen",
    "video-intro": "Video Intro",
    "hr-round": "HR Round",
    "hiring-manager": "Hiring Manager",
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <History size={14} style={{ color: "#9090B8" }} />
        <p className="text-[12px] font-bold uppercase tracking-widest" style={{ color: "#9090B8" }}>
          Past Sessions
        </p>
      </div>
      <div className="space-y-2">
        {sessions.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelect(s)}
            className="w-full text-left px-4 py-3 rounded-xl transition-all"
            style={{
              background: "#0C0C14",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(124,58,237,0.3)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.06)";
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <User size={13} style={{ color: "#8B5CF6", flexShrink: 0 }} />
                <span className="text-[13px] font-semibold truncate" style={{ color: "#F0F0FF" }}>
                  {s.recruiterName}
                </span>
                <span className="text-[12px] truncate" style={{ color: "#9090B8" }}>
                  @ {s.company}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                  style={{
                    background: "rgba(139,92,246,0.12)",
                    color: "#8B5CF6",
                    border: "1px solid rgba(139,92,246,0.2)",
                  }}
                >
                  {callTypeLabel[s.callType] ?? s.callType}
                </span>
                <span className="text-[11px]" style={{ color: "#3A3A60" }}>
                  {new Date(s.generatedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
            <p className="text-[12px] mt-1 ml-[22px]" style={{ color: "#9090B8" }}>
              {s.role}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function RecruiterPrepPage() {
  const searchParams = useSearchParams();
  const [recruiterName, setRecruiterName] = useState("");
  const [company, setCompany] = useState(() => searchParams.get('company') ?? '');
  const [role, setRole] = useState(() => searchParams.get('role') ?? '');
  const [callType, setCallType] = useState<CallType>("phone-screen");
  const [recruiterInfo, setRecruiterInfo] = useState("");
  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const [activeSession, setActiveSession] = useState<PrepSession | null>(null);

  // Load past sessions
  const sessionsQuery = useQuery({
    queryKey: ["recruiter-prep-sessions"],
    queryFn: () =>
      apiFetch<SessionsResponse>("/api/recruiter-prep").then(
        (res) => res.data.sessions
      ),
  });

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch<PrepResponse>("/api/recruiter-prep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recruiterInfo, recruiterName, company, role, callType }),
      }),
    onSuccess: (data) => {
      setActiveSession(data.data.session);
      setActiveTab("profile");
      sessionsQuery.refetch();
    },
  });

  const handleGenerate = () => {
    if (!recruiterName.trim() || !company.trim() || !role.trim() || recruiterInfo.trim().length < 20) return;
    mutation.mutate();
  };

  const prep = activeSession?.prep ?? null;

  const inputStyle = {
    background: "#0C0C14",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "#F0F0FF",
    borderRadius: "12px",
    outline: "none",
  } as React.CSSProperties;

  const focusStyle = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = "rgba(124,58,237,0.5)";
    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.08)";
  };
  const blurStyle = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
    e.currentTarget.style.boxShadow = "none";
  };

  return (
    <div className="min-h-screen p-6 md:p-8" style={{ background: "#060608" }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-4 mb-8"
        >
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)" }}
          >
            <Phone size={22} style={{ color: "#8B5CF6" }} />
          </div>
          <div>
            <h1 className="text-[26px] font-bold" style={{ color: "#F0F0FF" }}>
              Recruiter Prep
            </h1>
            <p className="text-[14px] mt-0.5" style={{ color: "#9090B8" }}>
              Know exactly what your recruiter is looking for
            </p>
          </div>
        </motion.div>

        {/* Input form */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl p-6 mb-6"
          style={{ background: "#0C0C14", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          {/* Row 1: name / company / role */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "#9090B8" }}>
                Recruiter Name
              </label>
              <div className="relative">
                <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#9090B8" }} />
                <input
                  type="text"
                  placeholder="e.g. Sarah Chen"
                  value={recruiterName}
                  onChange={(e) => setRecruiterName(e.target.value)}
                  onFocus={focusStyle}
                  onBlur={blurStyle}
                  className="w-full pl-9 pr-3 py-2.5 text-[13px] transition-all"
                  style={inputStyle}
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "#9090B8" }}>
                Company
              </label>
              <div className="relative">
                <Building2 size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#9090B8" }} />
                <input
                  type="text"
                  placeholder="e.g. Stripe"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  onFocus={focusStyle}
                  onBlur={blurStyle}
                  className="w-full pl-9 pr-3 py-2.5 text-[13px] transition-all"
                  style={inputStyle}
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "#9090B8" }}>
                Role
              </label>
              <div className="relative">
                <Briefcase size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#9090B8" }} />
                <input
                  type="text"
                  placeholder="e.g. Senior Engineer"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  onFocus={focusStyle}
                  onBlur={blurStyle}
                  className="w-full pl-9 pr-3 py-2.5 text-[13px] transition-all"
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          {/* Call type selector */}
          <div className="mb-4">
            <label className="block text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "#9090B8" }}>
              Call Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CALL_TYPE_OPTIONS.map((opt) => {
                const active = callType === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setCallType(opt.value)}
                    className="p-3 rounded-xl text-left transition-all"
                    style={{
                      background: active ? "rgba(124,58,237,0.15)" : "rgba(255,255,255,0.03)",
                      border: `1px solid ${active ? "rgba(124,58,237,0.4)" : "rgba(255,255,255,0.07)"}`,
                    }}
                  >
                    <p className="text-[12px] font-semibold" style={{ color: active ? "#C4A7FF" : "#F0F0FF" }}>
                      {opt.label}
                    </p>
                    <p className="text-[11px] mt-0.5" style={{ color: "#9090B8" }}>
                      {opt.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recruiter info textarea */}
          <div className="mb-5">
            <label className="block text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "#9090B8" }}>
              Recruiter Information
            </label>
            <textarea
              rows={5}
              placeholder="Paste the recruiter's LinkedIn bio, any email they sent, or anything you know about them. The more detail, the better the brief."
              value={recruiterInfo}
              onChange={(e) => setRecruiterInfo(e.target.value)}
              onFocus={focusStyle}
              onBlur={blurStyle}
              className="w-full px-4 py-3 text-[13px] leading-relaxed resize-none transition-all"
              style={{ ...inputStyle, borderRadius: "12px" }}
            />
            <p className="text-[11px] mt-1" style={{ color: "#3A3A60" }}>
              {recruiterInfo.length} / 2000 characters
            </p>
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={
              mutation.isPending ||
              !recruiterName.trim() ||
              !company.trim() ||
              !role.trim() ||
              recruiterInfo.trim().length < 20
            }
            className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl font-semibold text-[14px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background:
                mutation.isPending
                  ? "rgba(124,58,237,0.4)"
                  : "linear-gradient(135deg, #7C3AED, #8B5CF6)",
              color: "#fff",
              boxShadow: mutation.isPending ? "none" : "0 4px 20px rgba(124,58,237,0.35)",
            }}
          >
            {mutation.isPending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Analyzing recruiter...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Generate Recruiter Brief
              </>
            )}
          </button>

          {/* Error */}
          {mutation.isError && (
            <div
              className="flex items-center gap-2 mt-3 p-3 rounded-xl text-[13px]"
              style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", color: "#F87171" }}
            >
              <AlertCircle size={14} />
              {mutation.error instanceof Error ? mutation.error.message : "Failed to generate brief. Try again."}
            </div>
          )}
        </motion.div>

        {/* Results */}
        <AnimatePresence mode="wait">
          {prep && (
            <motion.div
              key={activeSession?.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {/* Session meta */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[16px] font-bold" style={{ color: "#F0F0FF" }}>
                    {activeSession?.recruiterName} — {activeSession?.company}
                  </p>
                  <p className="text-[12px]" style={{ color: "#9090B8" }}>
                    {activeSession?.role}
                  </p>
                </div>
                <ConfidenceBadge
                  level={prep.confidence_level}
                  reason=""
                />
              </div>

              {/* Tabs */}
              <div
                className="flex gap-1 p-1 rounded-xl mb-5"
                style={{ background: "#0C0C14", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[12px] font-semibold transition-all"
                      style={{
                        background: active ? "rgba(124,58,237,0.2)" : "transparent",
                        color: active ? "#C4A7FF" : "#9090B8",
                        border: active ? "1px solid rgba(124,58,237,0.3)" : "1px solid transparent",
                      }}
                    >
                      <Icon size={13} />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Tab content */}
              {activeTab === "profile" && <RecruiterProfileTab data={prep} />}
              {activeTab === "call" && <TheCallTab data={prep} />}
              {activeTab === "qa" && <QATab data={prep} />}
              {activeTab === "strategy" && <StrategyTab data={prep} />}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Past sessions */}
        {sessionsQuery.data && sessionsQuery.data.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-8"
          >
            <PastSessions
              sessions={sessionsQuery.data}
              onSelect={(s) => {
                setActiveSession(s);
                setActiveTab("profile");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          </motion.div>
        )}
      </div>
    </div>
  );
}
