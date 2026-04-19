"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  DollarSign,
  TrendingUp,
  FileText,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  BarChart2,
  MessageSquare,
  Shield,
  Lightbulb,
} from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ResearchResult {
  salary_range: {
    min: number;
    max: number;
    median: number;
  };
  market_position: string;
  key_factors: string[];
  negotiation_room: string;
}

interface NegotiateResult {
  recommended_counter: number;
  negotiation_script: string;
  email_template: string;
  key_tactics: string[];
  what_to_avoid: string[];
  alternative_benefits: string[];
}

interface HistoryEntry {
  date: string;
  jobTitle: string;
  company: string;
  location: string;
  salary_range: { min: number; max: number; median: number };
  market_position: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatUSD(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function MarketPositionBadge({ position }: { position: string }) {
  const lower = position.toLowerCase();
  let color = "#9090B8";
  let bg = "rgba(136,136,170,0.12)";
  let border = "rgba(136,136,170,0.25)";
  if (lower.includes("above") || lower.includes("top")) {
    color = "#34D399"; bg = "rgba(74,222,128,0.12)"; border = "rgba(74,222,128,0.25)";
  } else if (lower.includes("at")) {
    color = "#FBBF24"; bg = "rgba(252,211,77,0.12)"; border = "rgba(252,211,77,0.25)";
  } else if (lower.includes("below")) {
    color = "#F87171"; bg = "rgba(248,113,113,0.12)"; border = "rgba(248,113,113,0.25)";
  }

  return (
    <span
      className="text-[11px] font-semibold px-3 py-1 rounded-full uppercase tracking-widest"
      style={{ color, background: bg, border: `1px solid ${border}`, fontFamily: "monospace, monospace" }}
    >
      {position}
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg transition-all"
      style={{
        background: copied ? "rgba(124, 58, 237,0.12)" : "rgba(255,255,255,0.05)",
        color: copied ? "#8B5CF6" : "#9090B8",
        border: `1px solid ${copied ? "rgba(124, 58, 237,0.25)" : "rgba(255,255,255,0.08)"}`,
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

// ─── Tab Definitions ─────────────────────────────────────────────────────────

type TabId = "research" | "negotiate";

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "research", label: "Research Salary", icon: BarChart2 },
  { id: "negotiate", label: "Negotiate Offer", icon: MessageSquare },
];

// ─── Shared Input Styles ──────────────────────────────────────────────────────

const inputCls = "w-full px-4 py-2.5 rounded-xl text-[14px] outline-none transition-all";
const inputStyle = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.07)",
  color: "#F0F0FF",
  fontFamily: "'Inter', sans-serif",
};
const labelCls = "block text-[12px] font-medium mb-1.5";
const labelStyle = { color: "#9090B8", fontFamily: "'Inter', sans-serif" };

// ─── Research Tab ─────────────────────────────────────────────────────────────

function ResearchTab({ initialTitle = "", initialCompany = "" }: { initialTitle?: string; initialCompany?: string }) {
  const [jobTitle, setJobTitle] = useState(initialTitle);
  const [company, setCompany] = useState(initialCompany);
  const [location, setLocation] = useState("");
  const [yearsExp, setYearsExp] = useState<number>(0);

  const mutation = useMutation<
    { action: string; data: ResearchResult },
    Error
  >({
    mutationFn: () =>
      apiFetch<{ action: string; data: ResearchResult }>("/api/salary", {
        method: "POST",
        body: JSON.stringify({
          action: "research",
          jobTitle,
          company,
          location,
          yearsExp,
        }),
      }),
  });

  const result = mutation.data?.data;

  return (
    <div className="space-y-5">
      {/* Input card */}
      <div
        className="rounded-xl p-6 space-y-4"
        style={{ background: "#0C0C14", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls} style={labelStyle}>Job Title</label>
            <input type="text" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g. Software Engineer" className={inputCls} style={inputStyle} />
          </div>
          <div>
            <label className={labelCls} style={labelStyle}>Company</label>
            <input type="text" value={company} onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g. Google" className={inputCls} style={inputStyle} />
          </div>
          <div>
            <label className={labelCls} style={labelStyle}>Location</label>
            <input type="text" value={location} onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. San Francisco, CA" className={inputCls} style={inputStyle} />
          </div>
          <div>
            <label className={labelCls} style={labelStyle}>Years of Experience</label>
            <input type="number" value={yearsExp} onChange={(e) => setYearsExp(Number(e.target.value))}
              min={0} max={50} className={inputCls} style={inputStyle} />
          </div>
        </div>

        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !jobTitle || !company || !location}
          className="w-full py-3 rounded-xl text-[14px] font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          style={{
            background: mutation.isPending ? "rgba(124, 58, 237,0.5)" : "#7C3AED",
            color: "#F0F0FF",
            fontFamily: "'Inter', sans-serif",
            boxShadow: mutation.isPending ? "none" : "0 0 20px rgba(124, 58, 237,0.3)",
          }}
        >
          {mutation.isPending ? (
            <><Loader2 size={16} className="animate-spin" />Researching market data...</>
          ) : (
            <><BarChart2 size={16} />Research Market Rate</>
          )}
        </button>

        {mutation.isError && (
          <div className="flex items-center gap-2 p-3 rounded-xl text-[13px]"
            style={{ background: "rgba(248,113,113,0.08)", color: "#F87171", border: "1px solid rgba(248,113,113,0.2)" }}>
            <AlertCircle size={14} />{mutation.error.message}
          </div>
        )}
      </div>

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="space-y-4"
          >
            {/* Salary Range Card */}
            <div
              className="rounded-xl p-6"
              style={{ background: "#0C0C14", border: "1px solid rgba(124, 58, 237,0.25)" }}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-[15px] font-semibold" style={{ color: "#F0F0FF", fontFamily: "'Inter', sans-serif" }}>
                  Market Salary Range
                </h3>
                <MarketPositionBadge position={result.market_position} />
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                {[
                  { label: "Minimum", value: result.salary_range.min, dim: true },
                  { label: "Median", value: result.salary_range.median, dim: false },
                  { label: "Maximum", value: result.salary_range.max, dim: true },
                ].map(({ label, value, dim }) => (
                  <div key={label} className="text-center">
                    <p className="text-[10px] uppercase tracking-widest mb-1.5"
                      style={{ color: "#3A3A60", fontFamily: "monospace, monospace" }}>{label}</p>
                    <p className="text-[20px] font-bold"
                      style={{ fontFamily: "monospace, monospace", color: dim ? "#9090B8" : "#8B5CF6" }}>
                      {formatUSD(value)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Visual range bar */}
              <div className="relative h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                <div className="absolute left-0 top-0 h-full rounded-full w-full"
                  style={{ background: "linear-gradient(90deg, #7C3AED, #8B5CF6)" }} />
                {/* Median marker */}
                <div className="absolute top-0 h-full w-0.5 bg-white/60 rounded-full"
                  style={{ left: `${((result.salary_range.median - result.salary_range.min) / (result.salary_range.max - result.salary_range.min)) * 100}%` }} />
              </div>
              <div className="flex justify-between mt-1.5">
                <span className="text-[10px]" style={{ color: "#3A3A60", fontFamily: "monospace, monospace" }}>
                  {formatUSD(result.salary_range.min)}
                </span>
                <span className="text-[10px]" style={{ color: "#9090B8", fontFamily: "monospace, monospace" }}>
                  median {formatUSD(result.salary_range.median)}
                </span>
                <span className="text-[10px]" style={{ color: "#3A3A60", fontFamily: "monospace, monospace" }}>
                  {formatUSD(result.salary_range.max)}
                </span>
              </div>
            </div>

            {/* Key Factors */}
            <div className="rounded-xl p-6" style={{ background: "#0C0C14", border: "1px solid rgba(255,255,255,0.06)" }}>
              <h3 className="text-[14px] font-semibold mb-4 flex items-center gap-2"
                style={{ color: "#F0F0FF", fontFamily: "'Inter', sans-serif" }}>
                <Lightbulb size={15} style={{ color: "#8B5CF6" }} />
                Key Compensation Factors
              </h3>
              <ul className="space-y-2.5">
                {result.key_factors.map((factor, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[13px]"
                    style={{ color: "#9090B8", fontFamily: "'Inter', sans-serif" }}>
                    <span className="mt-[5px] w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#7C3AED" }} />
                    {factor}
                  </li>
                ))}
              </ul>
            </div>

            {/* Negotiation Room */}
            <div className="rounded-xl p-4"
              style={{ background: "rgba(252,211,77,0.05)", border: "1px solid rgba(252,211,77,0.15)" }}>
              <p className="text-[11px] font-semibold mb-1.5 uppercase tracking-widest"
                style={{ color: "#FBBF24", fontFamily: "monospace, monospace" }}>Negotiation Room</p>
              <p className="text-[13px] leading-relaxed" style={{ color: "#F0F0FF", fontFamily: "'Inter', sans-serif" }}>
                {result.negotiation_room}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Negotiate Tab ────────────────────────────────────────────────────────────

function NegotiateTab() {
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [currentOffer, setCurrentOffer] = useState<number>(0);
  const [benefits, setBenefits] = useState("");
  const [expandedSection, setExpandedSection] = useState<string | null>("script");

  const mutation = useMutation<
    { action: string; data: NegotiateResult },
    Error
  >({
    mutationFn: () =>
      apiFetch<{ action: string; data: NegotiateResult }>("/api/salary", {
        method: "POST",
        body: JSON.stringify({
          action: "negotiate",
          jobTitle,
          company,
          location: "United States",
          currentOffer,
          yearsExp: 0,
        }),
      }),
  });

  const result = mutation.data?.data;

  function ExpandableSection({
    id,
    title,
    icon: Icon,
    children,
  }: {
    id: string;
    title: string;
    icon: React.ElementType;
    children: React.ReactNode;
  }) {
    const open = expandedSection === id;
    return (
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
        <button
          onClick={() => setExpandedSection(open ? null : id)}
          className="w-full px-5 py-4 flex items-center justify-between transition-colors"
          style={{ background: open ? "rgba(124, 58, 237,0.08)" : "#0C0C14" }}
        >
          <div className="flex items-center gap-2.5">
            <Icon size={15} style={{ color: "#8B5CF6" }} />
            <span className="text-[14px] font-semibold" style={{ color: "#F0F0FF", fontFamily: "'Inter', sans-serif" }}>
              {title}
            </span>
          </div>
          {open ? <ChevronUp size={15} style={{ color: "#9090B8" }} /> : <ChevronDown size={15} style={{ color: "#9090B8" }} />}
        </button>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
              style={{ background: "rgba(255,255,255,0.01)" }}
            >
              <div className="px-5 py-4">{children}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Input card */}
      <div className="rounded-xl p-6 space-y-4"
        style={{ background: "#0C0C14", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls} style={labelStyle}>Job Title</label>
            <input type="text" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g. Product Manager" className={inputCls} style={inputStyle} />
          </div>
          <div>
            <label className={labelCls} style={labelStyle}>Company</label>
            <input type="text" value={company} onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g. Stripe" className={inputCls} style={inputStyle} />
          </div>
          <div>
            <label className={labelCls} style={labelStyle}>Current Offer (Annual USD)</label>
            <input type="number" value={currentOffer || ""} onChange={(e) => setCurrentOffer(Number(e.target.value))}
              placeholder="e.g. 120000" min={0} className={inputCls} style={inputStyle} />
          </div>
          <div>
            <label className={labelCls} style={labelStyle}>Benefits Offered</label>
            <input type="text" value={benefits} onChange={(e) => setBenefits(e.target.value)}
              placeholder="e.g. 401k match, health, 15 PTO days" className={inputCls} style={inputStyle} />
          </div>
        </div>

        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !jobTitle || !company || !currentOffer}
          className="w-full py-3 rounded-xl text-[14px] font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          style={{
            background: mutation.isPending ? "rgba(124, 58, 237,0.5)" : "#7C3AED",
            color: "#F0F0FF",
            fontFamily: "'Inter', sans-serif",
            boxShadow: mutation.isPending ? "none" : "0 0 20px rgba(124, 58, 237,0.3)",
          }}
        >
          {mutation.isPending ? (
            <><Loader2 size={16} className="animate-spin" />Generating strategy...</>
          ) : (
            <><TrendingUp size={16} />Generate Negotiation Strategy</>
          )}
        </button>

        {mutation.isError && (
          <div className="flex items-center gap-2 p-3 rounded-xl text-[13px]"
            style={{ background: "rgba(248,113,113,0.08)", color: "#F87171", border: "1px solid rgba(248,113,113,0.2)" }}>
            <AlertCircle size={14} />{mutation.error.message}
          </div>
        )}
      </div>

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="space-y-4"
          >
            {/* Counter offer hero */}
            <div className="rounded-xl p-6 text-center"
              style={{ background: "rgba(124, 58, 237,0.08)", border: "1px solid rgba(124, 58, 237,0.25)" }}>
              <p className="text-[11px] uppercase tracking-widest mb-2"
                style={{ color: "#9090B8", fontFamily: "monospace, monospace" }}>
                Recommended Counter Offer
              </p>
              <p className="text-[44px] font-bold leading-none mb-2"
                style={{ fontFamily: "monospace, monospace", color: "#8B5CF6" }}>
                {formatUSD(result.recommended_counter)}
              </p>
              <p className="text-[13px]" style={{ color: "#9090B8", fontFamily: "'Inter', sans-serif" }}>
                Current offer: {formatUSD(currentOffer)}&nbsp;&nbsp;·&nbsp;&nbsp;Delta:{" "}
                <span style={{ color: "#34D399" }}>+{formatUSD(result.recommended_counter - currentOffer)}</span>
              </p>
            </div>

            {/* Expandable sections */}
            <ExpandableSection id="script" title="Negotiation Script" icon={MessageSquare}>
              <div className="flex justify-end mb-3">
                <CopyButton text={result.negotiation_script} />
              </div>
              <p className="text-[13px] leading-relaxed whitespace-pre-wrap"
                style={{ color: "#F0F0FF", fontFamily: "'Inter', sans-serif" }}>
                {result.negotiation_script}
              </p>
            </ExpandableSection>

            <ExpandableSection id="email" title="Email Template" icon={FileText}>
              <div className="flex justify-end mb-3">
                <CopyButton text={result.email_template} />
              </div>
              <pre className="text-[12px] leading-relaxed whitespace-pre-wrap"
                style={{ fontFamily: "monospace, monospace", color: "#F0F0FF" }}>
                {result.email_template}
              </pre>
            </ExpandableSection>

            <ExpandableSection id="tactics" title="Key Leverage Points" icon={TrendingUp}>
              <ul className="space-y-2.5">
                {result.key_tactics.map((tactic, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[13px]"
                    style={{ color: "#9090B8", fontFamily: "'Inter', sans-serif" }}>
                    <span className="mt-[5px] w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#7C3AED" }} />
                    {tactic}
                  </li>
                ))}
              </ul>
            </ExpandableSection>

            <ExpandableSection id="avoid" title="What to Avoid" icon={Shield}>
              <ul className="space-y-2.5">
                {result.what_to_avoid.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[13px]"
                    style={{ color: "#9090B8", fontFamily: "'Inter', sans-serif" }}>
                    <span className="mt-[5px] w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#F87171" }} />
                    {item}
                  </li>
                ))}
              </ul>
            </ExpandableSection>

            <ExpandableSection id="benefits" title="Alternative Benefits to Negotiate" icon={Lightbulb}>
              <ul className="space-y-2.5">
                {result.alternative_benefits.map((benefit, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[13px]"
                    style={{ color: "#9090B8", fontFamily: "'Inter', sans-serif" }}>
                    <span className="mt-[5px] w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#FBBF24" }} />
                    {benefit}
                  </li>
                ))}
              </ul>
            </ExpandableSection>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── History Panel ───────────────────────────────────────────────────────────

function HistoryPanel() {
  const { data, isLoading } = useQuery<{ data: { history: HistoryEntry[] } }>({
    queryKey: ["salaryHistory"],
    queryFn: () => apiFetch("/api/salary"),
    staleTime: 60_000,
  });

  const history = data?.data?.history ?? [];

  if (isLoading) {
    return (
      <div className="rounded-xl p-5 space-y-3" style={{ background: "#0C0C14", border: "1px solid rgba(255,255,255,0.06)" }}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 rounded-lg animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
        ))}
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="rounded-xl p-8 text-center" style={{ background: "#0C0C14", border: "1px solid rgba(255,255,255,0.06)" }}>
        <BarChart2 size={28} className="mx-auto mb-3" style={{ color: "#3A3A60" }} />
        <p className="text-[13px]" style={{ color: "#4A4A70", fontFamily: "'Inter', sans-serif" }}>No previous research</p>
        <p className="text-[11px] mt-1" style={{ color: "#3A3A60", fontFamily: "'Inter', sans-serif" }}>Your salary research history will appear here</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
      {history.map((entry, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-5 py-3.5"
          style={{
            background: i % 2 === 0 ? "#0C0C14" : "rgba(255,255,255,0.015)",
            borderBottom: i < history.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
          }}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[13px] font-medium truncate" style={{ color: "#F0F0FF", fontFamily: "'Inter', sans-serif" }}>
                {entry.jobTitle}
              </span>
              <span className="text-[11px] flex-shrink-0" style={{ color: "#4A4A70", fontFamily: "'Inter', sans-serif" }}>
                @ {entry.company}
              </span>
            </div>
            <span className="text-[11px]" style={{ color: "#4A4A70", fontFamily: "'Inter', sans-serif" }}>{entry.location}</span>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-[13px] font-semibold" style={{ color: "#F0F0FF", fontFamily: "monospace, monospace" }}>
              {formatUSD(entry.salary_range.median)}<span className="text-[10px] font-normal" style={{ color: "#4A4A70" }}>/yr</span>
            </div>
            <div className="text-[10px] mt-0.5" style={{ color: "#4A4A70", fontFamily: "'Inter', sans-serif" }}>
              {formatUSD(entry.salary_range.min)} – {formatUSD(entry.salary_range.max)}
            </div>
          </div>
          <MarketPositionBadge position={entry.market_position} />
          <div className="text-[10px] flex-shrink-0" style={{ color: "#3A3A60", fontFamily: "'Inter', sans-serif" }}>
            {new Date(entry.date).toLocaleDateString()}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SalaryPage() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabId>("research");

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6" style={{ background: "#060608", minHeight: "100vh" }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(124, 58, 237,0.12)", border: "1px solid rgba(124, 58, 237,0.25)" }}>
            <DollarSign size={20} style={{ color: "#8B5CF6" }} />
          </div>
          <div>
            <h1 className="text-[22px] font-bold" style={{ color: "#F0F0FF", fontFamily: "'Inter', sans-serif" }}>
              Salary Coach
            </h1>
            <p className="text-[13px]" style={{ color: "#9090B8", fontFamily: "'Inter', sans-serif" }}>
              Research market rates and negotiate your best offer
            </p>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex p-1 rounded-xl gap-1"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[13px] font-medium transition-all"
              style={{
                background: active ? "rgba(124, 58, 237,0.12)" : "transparent",
                color: active ? "#8B5CF6" : "#9090B8",
                border: active ? "1px solid rgba(124, 58, 237,0.25)" : "1px solid transparent",
                fontFamily: "'Inter', sans-serif",
              }}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "research" ? <ResearchTab initialTitle={searchParams.get('title') ?? ''} initialCompany={searchParams.get('company') ?? ''} /> : <NegotiateTab />}
        </motion.div>
      </AnimatePresence>

      {/* Research history */}
      {activeTab === "research" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <h3 className="text-[13px] font-semibold mb-3" style={{ color: "#9090B8", fontFamily: "'Inter', sans-serif" }}>
            Research History
          </h3>
          <HistoryPanel />
        </motion.div>
      )}
    </div>
  );
}
