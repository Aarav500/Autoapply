"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  Building2,
  Search,
  Loader2,
  AlertCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Star,
  Users,
  DollarSign,
  Briefcase,
  MessageCircle,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Clock,
  BarChart2,
  ShieldAlert,
  Award,
  Lightbulb,
  History,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface CompanyOverview {
  founded: string;
  headquarters: string;
  size: string;
  stage: 'startup' | 'growth' | 'public' | 'enterprise' | 'big-tech';
  business_model: string;
  key_products: string[];
  mission: string;
  competitive_moat: string;
}

interface FinancialHealth {
  status: 'profitable' | 'growing' | 'burning' | 'declining' | 'unknown';
  funding: string;
  valuation?: string;
  revenue_signals: string;
  layoff_history: string;
  job_security_rating: number;
}

interface LeaderEntry {
  name: string;
  role: string;
  background: string;
  reputation: string;
  signal: 'positive' | 'neutral' | 'mixed' | 'concerning';
}

interface Culture {
  work_life_balance: number;
  eng_culture: string;
  diversity_inclusion: string;
  remote_policy: string;
  growth_opportunities: string;
  known_positives: string[];
  known_negatives: string[];
}

interface InterviewStage {
  stage: string;
  format: string;
  what_they_assess: string;
  tips: string;
}

interface InterviewProcess {
  typical_rounds: number;
  process_overview: string;
  stages: InterviewStage[];
  avg_timeline: string;
  difficulty: 'easy' | 'moderate' | 'hard' | 'brutal';
  known_questions: string[];
}

interface GlassdoorSentiment {
  overall_score: number;
  ceo_approval: string;
  recommend_to_friend: string;
  common_praise: string[];
  common_complaints: string[];
  recent_trend: 'improving' | 'stable' | 'declining';
}

interface RedFlag {
  flag: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  context: string;
}

interface Verdict {
  score: number;
  label: 'dream-company' | 'solid-choice' | 'proceed-with-caution' | 'avoid';
  summary: string;
  best_for: string;
  worst_for: string;
}

interface CompanyDeepDive {
  company: string;
  role?: string | null;
  researched_at: string;
  company_overview: CompanyOverview;
  financial_health: FinancialHealth;
  leadership: LeaderEntry[];
  culture: Culture;
  interview_process: InterviewProcess;
  glassdoor_sentiment: GlassdoorSentiment;
  red_flags: RedFlag[];
  verdict: Verdict;
  insider_tips: string[];
}

interface ResearchIndexEntry {
  slug: string;
  company: string;
  verdict_score: number;
  verdict_label: string;
  stage: string;
  researched_at: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'overview',   label: 'Overview',        icon: Building2 },
  { id: 'financial',  label: 'Financial Health', icon: DollarSign },
  { id: 'leadership', label: 'Leadership',       icon: Users },
  { id: 'culture',    label: 'Culture',          icon: MessageCircle },
  { id: 'interview',  label: 'Interview',        icon: Briefcase },
  { id: 'glassdoor',  label: 'Glassdoor',        icon: Star },
  { id: 'verdict',    label: 'Verdict',          icon: Award },
] as const;

type TabId = typeof TABS[number]['id'];

function stageBadge(stage: string) {
  const map: Record<string, { label: string; color: string; bg: string; border: string }> = {
    startup:    { label: 'Startup',    color: '#FBBF24', bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.25)' },
    growth:     { label: 'Growth',     color: '#34D399', bg: 'rgba(52,211,153,0.1)',  border: 'rgba(52,211,153,0.25)' },
    public:     { label: 'Public',     color: '#60A5FA', bg: 'rgba(96,165,250,0.1)',  border: 'rgba(96,165,250,0.25)' },
    enterprise: { label: 'Enterprise', color: '#A78BFA', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.25)' },
    'big-tech': { label: 'Big Tech',   color: '#F0F0FF', bg: 'rgba(240,240,255,0.1)', border: 'rgba(240,240,255,0.2)' },
  };
  const s = map[stage] ?? map.enterprise;
  return (
    <span
      className="text-[11px] font-semibold px-3 py-1 rounded-full uppercase tracking-widest"
      style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}
    >
      {s.label}
    </span>
  );
}

function financialStatusBadge(status: string) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    profitable: { label: 'Profitable',  color: '#34D399', bg: 'rgba(52,211,153,0.12)' },
    growing:    { label: 'Growing',     color: '#60A5FA', bg: 'rgba(96,165,250,0.12)' },
    burning:    { label: 'Cash Burning', color: '#F87171', bg: 'rgba(248,113,113,0.12)' },
    declining:  { label: 'Declining',   color: '#F87171', bg: 'rgba(248,113,113,0.12)' },
    unknown:    { label: 'Unknown',     color: '#9090B8', bg: 'rgba(144,144,184,0.12)' },
  };
  const s = map[status] ?? map.unknown;
  return (
    <span
      className="text-[12px] font-semibold px-3 py-1.5 rounded-full"
      style={{ color: s.color, background: s.bg }}
    >
      {s.label}
    </span>
  );
}

function difficultyBadge(difficulty: string) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    easy:     { label: 'Easy',     color: '#34D399', bg: 'rgba(52,211,153,0.12)' },
    moderate: { label: 'Moderate', color: '#FBBF24', bg: 'rgba(251,191,36,0.12)' },
    hard:     { label: 'Hard',     color: '#F97316', bg: 'rgba(249,115,22,0.12)' },
    brutal:   { label: 'Brutal',   color: '#F87171', bg: 'rgba(248,113,113,0.12)' },
  };
  const s = map[difficulty] ?? map.moderate;
  return (
    <span
      className="text-[12px] font-semibold px-3 py-1.5 rounded-full"
      style={{ color: s.color, background: s.bg }}
    >
      {s.label}
    </span>
  );
}

function leaderSignalBadge(signal: string) {
  const map: Record<string, { color: string; bg: string; label: string }> = {
    positive:   { color: '#34D399', bg: 'rgba(52,211,153,0.1)',  label: 'Positive' },
    neutral:    { color: '#9090B8', bg: 'rgba(144,144,184,0.1)', label: 'Neutral' },
    mixed:      { color: '#FBBF24', bg: 'rgba(251,191,36,0.1)',  label: 'Mixed' },
    concerning: { color: '#F87171', bg: 'rgba(248,113,113,0.1)', label: 'Concerning' },
  };
  const s = map[signal] ?? map.neutral;
  return (
    <span
      className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider"
      style={{ color: s.color, background: s.bg }}
    >
      {s.label}
    </span>
  );
}

function severityColor(severity: string): string {
  const map: Record<string, string> = {
    critical: '#F87171',
    high:     '#F97316',
    medium:   '#FBBF24',
    low:      '#9090B8',
  };
  return map[severity] ?? '#9090B8';
}

function severityBg(severity: string): string {
  const map: Record<string, string> = {
    critical: 'rgba(248,113,113,0.08)',
    high:     'rgba(249,115,22,0.08)',
    medium:   'rgba(251,191,36,0.08)',
    low:      'rgba(144,144,184,0.08)',
  };
  return map[severity] ?? 'rgba(144,144,184,0.08)';
}

function verdictStyle(label: string): { color: string; bg: string; border: string; text: string } {
  const map: Record<string, { color: string; bg: string; border: string; text: string }> = {
    'dream-company':          { color: '#34D399', bg: 'rgba(52,211,153,0.08)',  border: 'rgba(52,211,153,0.2)',  text: 'Dream Company' },
    'solid-choice':           { color: '#60A5FA', bg: 'rgba(96,165,250,0.08)',  border: 'rgba(96,165,250,0.2)',  text: 'Solid Choice' },
    'proceed-with-caution':   { color: '#FBBF24', bg: 'rgba(251,191,36,0.08)',  border: 'rgba(251,191,36,0.2)',  text: 'Proceed with Caution' },
    'avoid':                  { color: '#F87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.2)', text: 'Avoid' },
  };
  return map[label] ?? map['solid-choice'];
}

function scoreColor(score: number): string {
  if (score >= 8) return '#34D399';
  if (score >= 6) return '#60A5FA';
  if (score >= 4) return '#FBBF24';
  return '#F87171';
}

function RatingBar({ label, value, max = 10 }: { label: string; value: number; max?: number }) {
  const pct = Math.round((value / max) * 100);
  const color = scoreColor(value);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[12px]" style={{ color: '#9090B8' }}>{label}</span>
        <span className="text-[13px] font-semibold" style={{ color }}>{value}/{max}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

function StarRating({ score }: { score: number }) {
  const filled = Math.round(score);
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={14}
          style={{
            color: i <= filled ? '#FBBF24' : '#3A3A60',
            fill: i <= filled ? '#FBBF24' : 'none',
          }}
        />
      ))}
    </div>
  );
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === 'improving') return <TrendingUp size={14} color="#34D399" />;
  if (trend === 'declining') return <TrendingDown size={14} color="#F87171" />;
  return <Minus size={14} color="#9090B8" />;
}

function trendLabel(trend: string): string {
  const map: Record<string, string> = { improving: 'Improving', stable: 'Stable', declining: 'Declining' };
  return map[trend] ?? trend;
}

function trendColor(trend: string): string {
  if (trend === 'improving') return '#34D399';
  if (trend === 'declining') return '#F87171';
  return '#9090B8';
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl p-5 ${className}`}
      style={{ background: '#0C0C14', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[13px] font-semibold uppercase tracking-widest mb-4" style={{ color: '#3A3A60' }}>
      {children}
    </h3>
  );
}

// ─── Tab Panels ────────────────────────────────────────────────────────────────

function OverviewTab({ data }: { data: CompanyDeepDive }) {
  const o = data.company_overview;
  const grid: { label: string; value: string }[] = [
    { label: 'Founded',      value: o.founded },
    { label: 'Headquarters', value: o.headquarters },
    { label: 'Team Size',    value: o.size },
    { label: 'Stage',        value: o.stage },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-4"
    >
      {/* Stage + facts grid */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <SectionTitle>Company Facts</SectionTitle>
          {stageBadge(o.stage)}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {grid.map((item) => (
            <div key={item.label} className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <div className="text-[11px] uppercase tracking-widest mb-1" style={{ color: '#3A3A60' }}>{item.label}</div>
              <div className="text-[13px] font-medium" style={{ color: '#F0F0FF' }}>{item.value}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Mission */}
      <Card>
        <SectionTitle>Mission</SectionTitle>
        <p className="text-[14px] leading-relaxed italic" style={{ color: '#9090B8' }}>&ldquo;{o.mission}&rdquo;</p>
      </Card>

      {/* Business model */}
      <Card>
        <SectionTitle>Business Model</SectionTitle>
        <p className="text-[14px] leading-relaxed" style={{ color: '#C0C0E0' }}>{o.business_model}</p>
      </Card>

      {/* Key products */}
      <Card>
        <SectionTitle>Key Products &amp; Services</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {o.key_products.map((p) => (
            <span
              key={p}
              className="text-[12px] px-3 py-1.5 rounded-lg"
              style={{ background: 'rgba(124,58,237,0.1)', color: '#A78BFA', border: '1px solid rgba(124,58,237,0.2)' }}
            >
              {p}
            </span>
          ))}
        </div>
      </Card>

      {/* Competitive moat */}
      <Card>
        <SectionTitle>Competitive Moat</SectionTitle>
        <p className="text-[14px] leading-relaxed" style={{ color: '#C0C0E0' }}>{o.competitive_moat}</p>
      </Card>
    </motion.div>
  );
}

function FinancialTab({ data }: { data: CompanyDeepDive }) {
  const f = data.financial_health;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-4"
    >
      {/* Job security hero */}
      <Card>
        <div className="flex items-start justify-between">
          <div>
            <SectionTitle>Job Security Rating</SectionTitle>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black" style={{ color: scoreColor(f.job_security_rating) }}>
                {f.job_security_rating}
              </span>
              <span className="text-[16px]" style={{ color: '#3A3A60' }}>/10</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {financialStatusBadge(f.status)}
            {f.valuation && (
              <span className="text-[12px]" style={{ color: '#9090B8' }}>Valuation: {f.valuation}</span>
            )}
          </div>
        </div>
        <div className="mt-4">
          <RatingBar label="Job Security" value={f.job_security_rating} />
        </div>
      </Card>

      {/* Funding */}
      <Card>
        <SectionTitle>Funding</SectionTitle>
        <p className="text-[14px] leading-relaxed" style={{ color: '#C0C0E0' }}>{f.funding}</p>
      </Card>

      {/* Revenue signals */}
      <Card>
        <SectionTitle>Revenue Signals</SectionTitle>
        <p className="text-[14px] leading-relaxed" style={{ color: '#C0C0E0' }}>{f.revenue_signals}</p>
      </Card>

      {/* Layoff history */}
      <Card>
        <SectionTitle>Layoff History</SectionTitle>
        <p className="text-[14px] leading-relaxed" style={{ color: '#C0C0E0' }}>{f.layoff_history}</p>
      </Card>
    </motion.div>
  );
}

function LeadershipTab({ data }: { data: CompanyDeepDive }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-3"
    >
      {data.leadership.map((leader, i) => (
        <Card key={i}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="text-[15px] font-semibold" style={{ color: '#F0F0FF' }}>{leader.name}</div>
              <div className="text-[12px] mt-0.5" style={{ color: '#7C3AED' }}>{leader.role}</div>
            </div>
            {leaderSignalBadge(leader.signal)}
          </div>
          <div className="space-y-2">
            <div>
              <div className="text-[11px] uppercase tracking-widest mb-1" style={{ color: '#3A3A60' }}>Background</div>
              <p className="text-[13px] leading-relaxed" style={{ color: '#9090B8' }}>{leader.background}</p>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-widest mb-1" style={{ color: '#3A3A60' }}>Reputation</div>
              <p className="text-[13px] leading-relaxed" style={{ color: '#C0C0E0' }}>{leader.reputation}</p>
            </div>
          </div>
        </Card>
      ))}
    </motion.div>
  );
}

function CultureTab({ data }: { data: CompanyDeepDive }) {
  const c = data.culture;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-4"
    >
      {/* Ratings */}
      <Card>
        <SectionTitle>Culture Ratings</SectionTitle>
        <div className="space-y-4">
          <RatingBar label="Work-Life Balance" value={c.work_life_balance} />
        </div>
      </Card>

      {/* Remote + Growth */}
      <div className="grid grid-cols-1 gap-4">
        <Card>
          <SectionTitle>Remote Policy</SectionTitle>
          <p className="text-[14px] leading-relaxed" style={{ color: '#C0C0E0' }}>{c.remote_policy}</p>
        </Card>
        <Card>
          <SectionTitle>Growth Opportunities</SectionTitle>
          <p className="text-[14px] leading-relaxed" style={{ color: '#C0C0E0' }}>{c.growth_opportunities}</p>
        </Card>
      </div>

      {/* Engineering culture */}
      <Card>
        <SectionTitle>Engineering Culture</SectionTitle>
        <p className="text-[14px] leading-relaxed" style={{ color: '#C0C0E0' }}>{c.eng_culture}</p>
      </Card>

      {/* D&I */}
      <Card>
        <SectionTitle>Diversity &amp; Inclusion</SectionTitle>
        <p className="text-[14px] leading-relaxed" style={{ color: '#C0C0E0' }}>{c.diversity_inclusion}</p>
      </Card>

      {/* Positives / Negatives */}
      <div className="grid grid-cols-1 gap-4">
        <Card>
          <SectionTitle>What People Love</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {c.known_positives.map((p) => (
              <span
                key={p}
                className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg"
                style={{ background: 'rgba(52,211,153,0.08)', color: '#34D399', border: '1px solid rgba(52,211,153,0.15)' }}
              >
                <CheckCircle2 size={11} />
                {p}
              </span>
            ))}
          </div>
        </Card>
        <Card>
          <SectionTitle>Common Complaints</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {c.known_negatives.map((n) => (
              <span
                key={n}
                className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg"
                style={{ background: 'rgba(248,113,113,0.08)', color: '#F87171', border: '1px solid rgba(248,113,113,0.15)' }}
              >
                <XCircle size={11} />
                {n}
              </span>
            ))}
          </div>
        </Card>
      </div>
    </motion.div>
  );
}

function InterviewTab({ data }: { data: CompanyDeepDive }) {
  const p = data.interview_process;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-4"
    >
      {/* Hero stats */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <SectionTitle>Interview Overview</SectionTitle>
          {difficultyBadge(p.difficulty)}
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <div className="text-[11px] uppercase tracking-widest mb-1" style={{ color: '#3A3A60' }}>Rounds</div>
            <div className="text-[20px] font-bold" style={{ color: '#F0F0FF' }}>{p.typical_rounds}</div>
          </div>
          <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <div className="text-[11px] uppercase tracking-widest mb-1" style={{ color: '#3A3A60' }}>Timeline</div>
            <div className="text-[13px] font-medium" style={{ color: '#F0F0FF' }}>{p.avg_timeline}</div>
          </div>
        </div>
        <p className="text-[13px] leading-relaxed" style={{ color: '#9090B8' }}>{p.process_overview}</p>
      </Card>

      {/* Stages timeline */}
      <Card>
        <SectionTitle>Interview Stages</SectionTitle>
        <div className="space-y-4">
          {p.stages.map((stage, i) => (
            <div key={i} className="flex gap-3">
              {/* Step indicator */}
              <div className="flex flex-col items-center flex-shrink-0">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                  style={{ background: 'rgba(124,58,237,0.2)', color: '#A78BFA', border: '1px solid rgba(124,58,237,0.3)' }}
                >
                  {i + 1}
                </div>
                {i < p.stages.length - 1 && (
                  <div className="w-px flex-1 mt-2" style={{ background: 'rgba(124,58,237,0.15)', minHeight: 24 }} />
                )}
              </div>
              {/* Stage content */}
              <div className="flex-1 pb-2">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[13px] font-semibold" style={{ color: '#F0F0FF' }}>{stage.stage}</span>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.05)', color: '#9090B8' }}
                  >
                    {stage.format}
                  </span>
                </div>
                <p className="text-[12px] leading-relaxed mb-1.5" style={{ color: '#9090B8' }}>
                  <span style={{ color: '#3A3A60' }}>Assesses: </span>{stage.what_they_assess}
                </p>
                <div
                  className="rounded-lg p-2.5 flex items-start gap-2"
                  style={{ background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.1)' }}
                >
                  <Lightbulb size={11} color="#FBBF24" className="flex-shrink-0 mt-0.5" />
                  <p className="text-[12px] leading-relaxed" style={{ color: '#C0C0A0' }}>{stage.tips}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Known questions */}
      {p.known_questions.length > 0 && (
        <Card>
          <SectionTitle>Known Questions</SectionTitle>
          <div className="space-y-2">
            {p.known_questions.map((q, i) => (
              <div
                key={i}
                className="flex items-start gap-2.5 p-3 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.03)' }}
              >
                <ChevronRight size={13} color="#7C3AED" className="flex-shrink-0 mt-0.5" />
                <span className="text-[13px] leading-relaxed" style={{ color: '#C0C0E0' }}>{q}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </motion.div>
  );
}

function GlassdoorTab({ data }: { data: CompanyDeepDive }) {
  const g = data.glassdoor_sentiment;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-4"
    >
      {/* Hero score */}
      <Card>
        <div className="flex items-start justify-between mb-4">
          <div>
            <SectionTitle>Overall Rating</SectionTitle>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black" style={{ color: '#FBBF24' }}>
                {g.overall_score.toFixed(1)}
              </span>
              <span className="text-[14px]" style={{ color: '#3A3A60' }}>/5</span>
            </div>
            <div className="mt-1.5">
              <StarRating score={g.overall_score} />
            </div>
          </div>
          <div
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg"
            style={{ background: `rgba(${g.recent_trend === 'improving' ? '52,211,153' : g.recent_trend === 'declining' ? '248,113,113' : '144,144,184'},0.08)` }}
          >
            <TrendIcon trend={g.recent_trend} />
            <span className="text-[12px] font-medium" style={{ color: trendColor(g.recent_trend) }}>
              {trendLabel(g.recent_trend)}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <div className="text-[11px] uppercase tracking-widest mb-1" style={{ color: '#3A3A60' }}>CEO Approval</div>
            <div className="text-[13px] font-medium" style={{ color: '#F0F0FF' }}>{g.ceo_approval}</div>
          </div>
          <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <div className="text-[11px] uppercase tracking-widest mb-1" style={{ color: '#3A3A60' }}>Recommend</div>
            <div className="text-[13px] font-medium" style={{ color: '#F0F0FF' }}>{g.recommend_to_friend}</div>
          </div>
        </div>
      </Card>

      {/* Common praise */}
      <Card>
        <SectionTitle>Common Praise</SectionTitle>
        <div className="space-y-1.5">
          {g.common_praise.map((item, i) => (
            <div key={i} className="flex items-center gap-2.5 py-1.5">
              <CheckCircle2 size={13} color="#34D399" className="flex-shrink-0" />
              <span className="text-[13px]" style={{ color: '#C0C0E0' }}>{item}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Common complaints */}
      <Card>
        <SectionTitle>Common Complaints</SectionTitle>
        <div className="space-y-1.5">
          {g.common_complaints.map((item, i) => (
            <div key={i} className="flex items-center gap-2.5 py-1.5">
              <XCircle size={13} color="#F87171" className="flex-shrink-0" />
              <span className="text-[13px]" style={{ color: '#C0C0E0' }}>{item}</span>
            </div>
          ))}
        </div>
      </Card>
    </motion.div>
  );
}

function VerdictTab({ data }: { data: CompanyDeepDive }) {
  const v = data.verdict;
  const style = verdictStyle(v.label);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-4"
    >
      {/* Hero verdict */}
      <div
        className="rounded-xl p-6 text-center"
        style={{ background: style.bg, border: `1px solid ${style.border}` }}
      >
        <div className="text-6xl font-black mb-2" style={{ color: style.color }}>
          {v.score}<span className="text-2xl font-bold" style={{ color: style.color, opacity: 0.5 }}>/10</span>
        </div>
        <div
          className="inline-flex items-center px-4 py-1.5 rounded-full text-[13px] font-bold uppercase tracking-widest mb-4"
          style={{ background: style.bg, color: style.color, border: `1px solid ${style.border}` }}
        >
          {style.text}
        </div>
        <p className="text-[14px] leading-relaxed max-w-lg mx-auto" style={{ color: '#C0C0E0' }}>{v.summary}</p>
      </div>

      {/* Best / Worst for */}
      <div className="grid grid-cols-1 gap-4">
        <Card>
          <div className="flex items-start gap-3">
            <CheckCircle2 size={18} color="#34D399" className="flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-[12px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#34D399' }}>
                Best For
              </div>
              <p className="text-[14px] leading-relaxed" style={{ color: '#C0C0E0' }}>{v.best_for}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-start gap-3">
            <XCircle size={18} color="#F87171" className="flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-[12px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#F87171' }}>
                Not For
              </div>
              <p className="text-[14px] leading-relaxed" style={{ color: '#C0C0E0' }}>{v.worst_for}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Insider tips */}
      {data.insider_tips.length > 0 && (
        <Card>
          <SectionTitle>Insider Tips</SectionTitle>
          <div className="space-y-2.5">
            {data.insider_tips.map((tip, i) => (
              <div
                key={i}
                className="flex items-start gap-2.5 p-3 rounded-lg"
                style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.12)' }}
              >
                <Lightbulb size={13} color="#A78BFA" className="flex-shrink-0 mt-0.5" />
                <p className="text-[13px] leading-relaxed" style={{ color: '#C0C0E0' }}>{tip}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </motion.div>
  );
}

function RedFlagsSection({ flags }: { flags: RedFlag[] }) {
  if (flags.length === 0) return null;

  const sorted = [...flags].sort((a, b) => {
    const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return (order[a.severity] ?? 3) - (order[b.severity] ?? 3);
  });

  return (
    <div
      className="rounded-xl p-5"
      style={{ background: 'rgba(248,113,113,0.04)', border: '1px solid rgba(248,113,113,0.12)' }}
    >
      <div className="flex items-center gap-2 mb-4">
        <ShieldAlert size={16} color="#F87171" />
        <span className="text-[13px] font-semibold uppercase tracking-widest" style={{ color: '#F87171' }}>
          Red Flags ({sorted.length})
        </span>
      </div>
      <div className="space-y-2.5">
        {sorted.map((flag, i) => (
          <div
            key={i}
            className="rounded-lg p-3"
            style={{ background: severityBg(flag.severity), border: `1px solid ${severityColor(flag.severity)}20` }}
          >
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle size={11} style={{ color: severityColor(flag.severity), flexShrink: 0 }} />
              <span className="text-[12px] font-semibold" style={{ color: severityColor(flag.severity) }}>
                {flag.flag}
              </span>
              <span
                className="ml-auto text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                style={{ color: severityColor(flag.severity), background: `${severityColor(flag.severity)}15` }}
              >
                {flag.severity}
              </span>
            </div>
            <p className="text-[12px] leading-relaxed" style={{ color: '#9090B8' }}>{flag.context}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── History sidebar ───────────────────────────────────────────────────────────

function HistoryEntry({
  entry,
  onClick,
  active,
}: {
  entry: ResearchIndexEntry;
  onClick: () => void;
  active: boolean;
}) {
  const style = verdictStyle(entry.verdict_label);
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 transition-colors"
      style={{
        background: active ? 'rgba(124,58,237,0.1)' : 'transparent',
        border: active ? '1px solid rgba(124,58,237,0.2)' : '1px solid transparent',
      }}
    >
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0"
        style={{ background: style.bg, color: style.color }}
      >
        {entry.verdict_score}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-medium truncate" style={{ color: active ? '#F0F0FF' : '#9090B8' }}>
          {entry.company}
        </div>
        <div className="text-[10px] uppercase tracking-wider" style={{ color: style.color, opacity: 0.8 }}>
          {style.text}
        </div>
      </div>
    </button>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function CompanyResearchPage() {
  const searchParams = useSearchParams();
  const [company, setCompany] = useState(() => searchParams.get('company') ?? '');
  const [role, setRole] = useState(() => searchParams.get('role') ?? '');
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [activeResult, setActiveResult] = useState<CompanyDeepDive | null>(null);
  const queryClient = useQueryClient();

  // Load history
  const { data: historyData } = useQuery({
    queryKey: ['company-research-history'],
    queryFn: () =>
      apiFetch<{ data: { entries: ResearchIndexEntry[] } }>('/api/company-research'),
    staleTime: 30000,
  });
  const history: ResearchIndexEntry[] = historyData?.data?.entries ?? [];

  // Load cached result for a company
  const loadCachedMutation = useMutation({
    mutationFn: (companyName: string) =>
      apiFetch<{ data: { result: CompanyDeepDive | null } }>(
        `/api/company-research?company=${encodeURIComponent(companyName)}`
      ),
    onSuccess: (res, companyName) => {
      if (res?.data?.result) {
        setActiveResult(res.data.result);
        setCompany(companyName);
        setActiveTab('overview');
      }
    },
  });

  // Research mutation
  const researchMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ data: { result: CompanyDeepDive } }>('/api/company-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company: company.trim(), role: role.trim() || undefined }),
      }),
    onSuccess: (res) => {
      if (res?.data?.result) {
        setActiveResult(res.data.result);
        setActiveTab('overview');
        queryClient.invalidateQueries({ queryKey: ['company-research-history'] });
      }
    },
  });

  const handleResearch = useCallback(() => {
    if (!company.trim()) return;
    researchMutation.mutate();
  }, [company, researchMutation]);

  const handleHistoryClick = useCallback((entry: ResearchIndexEntry) => {
    loadCachedMutation.mutate(entry.company);
  }, [loadCachedMutation]);

  const isLoading = researchMutation.isPending || loadCachedMutation.isPending;
  const error = researchMutation.error ?? loadCachedMutation.error;

  return (
    <div className="min-h-screen" style={{ background: '#060608' }}>
      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* ─── Header ─── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)', boxShadow: '0 4px 20px rgba(124,58,237,0.35)' }}
            >
              <Building2 size={18} color="white" />
            </div>
            <div>
              <h1 className="text-[22px] font-bold leading-tight" style={{ color: '#F0F0FF' }}>
                Company Deep Dive
              </h1>
              <p className="text-[13px]" style={{ color: '#9090B8' }}>
                The inside story before you walk in the door
              </p>
            </div>
          </div>
        </motion.div>

        {/* ─── Search Bar ─── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="mb-8"
        >
          <div
            className="rounded-2xl p-5"
            style={{ background: '#0C0C14', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-[11px] uppercase tracking-widest mb-2 block" style={{ color: '#3A3A60' }}>
                  Company Name
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleResearch()}
                  placeholder="e.g. Stripe, OpenAI, Shopify..."
                  className="w-full h-10 px-3 rounded-lg text-[14px] outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: '#F0F0FF',
                  }}
                  disabled={isLoading}
                />
              </div>
              <div className="flex-1">
                <label className="text-[11px] uppercase tracking-widest mb-2 block" style={{ color: '#3A3A60' }}>
                  Target Role (Optional)
                </label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleResearch()}
                  placeholder="e.g. Software Engineer, PM..."
                  className="w-full h-10 px-3 rounded-lg text-[14px] outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: '#F0F0FF',
                  }}
                  disabled={isLoading}
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleResearch}
                  disabled={isLoading || !company.trim()}
                  className="h-10 px-5 rounded-lg flex items-center gap-2 text-[13px] font-semibold transition-all"
                  style={{
                    background: isLoading || !company.trim() ? 'rgba(124,58,237,0.3)' : 'linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)',
                    color: isLoading || !company.trim() ? '#6060A0' : 'white',
                    boxShadow: isLoading || !company.trim() ? 'none' : '0 4px 14px rgba(124,58,237,0.3)',
                    cursor: isLoading || !company.trim() ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isLoading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Search size={14} />
                  )}
                  {isLoading ? 'Researching...' : 'Research'}
                </button>
              </div>
            </div>

            {/* Loading state */}
            <AnimatePresence>
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 overflow-hidden"
                >
                  <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'rgba(124,58,237,0.06)' }}>
                    <Loader2 size={14} color="#7C3AED" className="animate-spin flex-shrink-0" />
                    <div>
                      <div className="text-[13px] font-medium" style={{ color: '#A78BFA' }}>
                        Running deep-dive analysis...
                      </div>
                      <div className="text-[12px]" style={{ color: '#6060A0' }}>
                        Analyzing culture, financials, leadership, interview process, and more. This may take 30–60 seconds.
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error state */}
            <AnimatePresence>
              {error && !isLoading && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 overflow-hidden"
                >
                  <div className="flex items-center gap-2.5 p-3 rounded-lg" style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.15)' }}>
                    <AlertCircle size={14} color="#F87171" className="flex-shrink-0" />
                    <p className="text-[13px]" style={{ color: '#F87171' }}>
                      {error instanceof Error ? error.message : 'Research failed. Please try again.'}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* ─── Main Content ─── */}
        <div className="flex gap-6">

          {/* ─── Results area ─── */}
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              {activeResult ? (
                <motion.div
                  key={activeResult.company}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Result header */}
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h2 className="text-[20px] font-bold" style={{ color: '#F0F0FF' }}>
                        {activeResult.company}
                      </h2>
                      {activeResult.role && (
                        <p className="text-[13px]" style={{ color: '#7C3AED' }}>
                          For: {activeResult.role}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {stageBadge(activeResult.company_overview.stage)}
                      <div
                        className="text-[12px] font-bold px-3 py-1.5 rounded-full"
                        style={{ ...verdictStyle(activeResult.verdict.label), color: verdictStyle(activeResult.verdict.label).color, background: verdictStyle(activeResult.verdict.label).bg, border: `1px solid ${verdictStyle(activeResult.verdict.label).border}` }}
                      >
                        {activeResult.verdict.score}/10
                      </div>
                    </div>
                  </div>

                  {/* Red flags — always visible above tabs */}
                  {activeResult.red_flags.length > 0 && (
                    <div className="mb-5">
                      <RedFlagsSection flags={activeResult.red_flags} />
                    </div>
                  )}

                  {/* Tab navigation */}
                  <div
                    className="flex gap-1 mb-5 p-1 rounded-xl overflow-x-auto"
                    style={{ background: '#0C0C14', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    {TABS.map((tab) => {
                      const Icon = tab.icon;
                      const isActive = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium whitespace-nowrap flex-shrink-0 transition-all"
                          style={{
                            background: isActive ? 'rgba(124,58,237,0.2)' : 'transparent',
                            color: isActive ? '#A78BFA' : '#3A3A60',
                            border: isActive ? '1px solid rgba(124,58,237,0.3)' : '1px solid transparent',
                          }}
                        >
                          <Icon size={13} />
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Tab panel */}
                  <AnimatePresence mode="wait">
                    {activeTab === 'overview'   && <OverviewTab   key="overview"   data={activeResult} />}
                    {activeTab === 'financial'  && <FinancialTab  key="financial"  data={activeResult} />}
                    {activeTab === 'leadership' && <LeadershipTab key="leadership" data={activeResult} />}
                    {activeTab === 'culture'    && <CultureTab    key="culture"    data={activeResult} />}
                    {activeTab === 'interview'  && <InterviewTab  key="interview"  data={activeResult} />}
                    {activeTab === 'glassdoor'  && <GlassdoorTab  key="glassdoor"  data={activeResult} />}
                    {activeTab === 'verdict'    && <VerdictTab    key="verdict"    data={activeResult} />}
                  </AnimatePresence>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-24 text-center"
                >
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                    style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.15)' }}
                  >
                    <Building2 size={28} color="#3A3A60" />
                  </div>
                  <h3 className="text-[16px] font-semibold mb-2" style={{ color: '#F0F0FF' }}>
                    Enter a company to research
                  </h3>
                  <p className="text-[13px] max-w-sm" style={{ color: '#3A3A60' }}>
                    Get a comprehensive AI-powered deep dive covering culture, financials, leadership, interview process, and an honest verdict.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ─── History sidebar ─── */}
          {history.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="w-52 flex-shrink-0"
            >
              <div
                className="rounded-xl p-4"
                style={{ background: '#0C0C14', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <History size={13} color="#3A3A60" />
                  <span className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: '#3A3A60' }}>
                    Previously Researched
                  </span>
                </div>
                <div className="space-y-1">
                  {history.slice(0, 10).map((entry) => (
                    <HistoryEntry
                      key={entry.slug}
                      entry={entry}
                      onClick={() => handleHistoryClick(entry)}
                      active={activeResult?.company === entry.company}
                    />
                  ))}
                </div>
              </div>

              {/* Stat summary */}
              <div className="mt-3 rounded-xl p-4" style={{ background: '#0C0C14', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="text-[11px] uppercase tracking-widest mb-3 font-semibold" style={{ color: '#3A3A60' }}>
                  Quick Stats
                </div>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px]" style={{ color: '#9090B8' }}>Companies researched</span>
                    <span className="text-[12px] font-bold" style={{ color: '#F0F0FF' }}>{history.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px]" style={{ color: '#9090B8' }}>Avg verdict score</span>
                    <span
                      className="text-[12px] font-bold"
                      style={{ color: scoreColor(Math.round(history.reduce((s, e) => s + e.verdict_score, 0) / history.length)) }}
                    >
                      {(history.reduce((s, e) => s + e.verdict_score, 0) / history.length).toFixed(1)}/10
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px]" style={{ color: '#9090B8' }}>Dream companies</span>
                    <span className="text-[12px] font-bold" style={{ color: '#34D399' }}>
                      {history.filter(e => e.verdict_label === 'dream-company').length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px]" style={{ color: '#9090B8' }}>Flagged as Avoid</span>
                    <span className="text-[12px] font-bold" style={{ color: '#F87171' }}>
                      {history.filter(e => e.verdict_label === 'avoid').length}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Bottom spacer */}
        <div className="h-16" />
      </div>
    </div>
  );
}
