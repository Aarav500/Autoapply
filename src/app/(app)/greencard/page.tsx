"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import {
  Flag,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronRight,
  Plus,
  FileText,
  Award,
  BookOpen,
  Users,
  Newspaper,
  Lightbulb,
  Scale,
  Search,
  Globe,
  Building2,
  GraduationCap,
  Briefcase,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

// ---------- Types ----------

interface Criterion {
  name: string;
  met: boolean;
  strength: string;
  current_evidence: string;
  suggestions: string[];
}

interface Assessment {
  visa_type: string;
  overall_eligibility: string;
  overall_score: number;
  criteria: Criterion[];
  summary: string;
  next_steps: string[];
  estimated_timeline: string;
}

interface RoadmapAction {
  action: string;
  criterion: string;
  impact: string;
  details: string;
}

interface RoadmapMonth {
  month: string;
  focus: string;
  actions: RoadmapAction[];
}

interface Strategy {
  roadmap: RoadmapMonth[];
  priority_criteria: string[];
  attorney_recommendations: string[];
  estimated_filing_date: string;
}

interface EvidenceItem {
  id: string;
  type: string;
  title: string;
  description: string;
  date: string;
  link: string;
  createdAt: string;
}

interface VisaPathway {
  visa_type: string;
  visa_name: string;
  fit_level: string;
  reason: string;
  advantages: string[];
  gaps: string[];
  timeline: string;
  leads_to_green_card: boolean;
  green_card_path: string;
}

interface TopRecommendation {
  visa_type: string;
  rank: number;
  reason: string;
}

interface VisaFinderResult {
  pathways: VisaPathway[];
  top_recommendations: TopRecommendation[];
  multi_pathway_strategy: string;
  immediate_actions: string[];
}

// ---------- Constants ----------

const VISA_TYPES = [
  { value: "EB-1A", label: "EB-1A (Extraordinary Ability)" },
  { value: "EB-1B", label: "EB-1B (Outstanding Researcher)" },
  { value: "EB-2 NIW", label: "EB-2 NIW (National Interest Waiver)" },
  { value: "EB-2 PERM", label: "EB-2 with PERM (Labor Certification)" },
  { value: "EB-3", label: "EB-3 (Skilled Workers/Professionals)" },
  { value: "O-1", label: "O-1 (Extraordinary Ability)" },
  { value: "L-1A", label: "L-1A (Intracompany Transferee - Executive)" },
  { value: "L-1B", label: "L-1B (Intracompany Transferee - Specialized)" },
  { value: "E-2", label: "E-2 (Treaty Investor)" },
  { value: "TN", label: "TN Visa (USMCA - Canada/Mexico)" },
  { value: "J-1", label: "J-1 (Exchange Visitor)" },
  { value: "F-1 OPT", label: "F-1 OPT/CPT (Practical Training)" },
  { value: "STEM OPT", label: "STEM OPT Extension (24-month)" },
  { value: "H-1B", label: "H-1B (Specialty Occupation)" },
];

const EVIDENCE_TYPES = [
  "Publication",
  "Citation",
  "Award",
  "Patent",
  "Membership",
  "Media",
  "Judging",
  "Contribution",
];

const TABS = [
  { id: "visa-finder", label: "Visa Finder" },
  { id: "eligibility", label: "Eligibility Check" },
  { id: "strategy", label: "Strategy Builder" },
  { id: "evidence", label: "Evidence Tracker" },
];

// ---------- Helpers ----------

function getEligibilityColor(eligibility: string): string {
  switch (eligibility) {
    case "strong":
      return "#34D399";
    case "possible":
      return "#FBBF24";
    case "unlikely":
      return "#F87171";
    default:
      return "#9090B8";
  }
}

function getStrengthColor(strength: string): string {
  switch (strength) {
    case "strong":
      return "#34D399";
    case "moderate":
      return "#FBBF24";
    case "weak":
      return "#F87171";
    case "not-met":
      return "#3A3A60";
    default:
      return "#9090B8";
  }
}

function getImpactColor(impact: string): string {
  switch (impact) {
    case "high":
      return "#34D399";
    case "medium":
      return "#FBBF24";
    case "low":
      return "#9090B8";
    default:
      return "#9090B8";
  }
}

function getFitColor(fitLevel: string): string {
  switch (fitLevel) {
    case "strong_fit":
      return "#34D399";
    case "moderate_fit":
      return "#FBBF24";
    case "weak_fit":
      return "#F87171";
    case "not_eligible":
      return "#3A3A60";
    default:
      return "#9090B8";
  }
}

function getFitLabel(fitLevel: string): string {
  switch (fitLevel) {
    case "strong_fit":
      return "Strong Fit";
    case "moderate_fit":
      return "Moderate Fit";
    case "weak_fit":
      return "Weak Fit";
    case "not_eligible":
      return "Not Eligible";
    default:
      return fitLevel;
  }
}

function getVisaIcon(visaType: string) {
  if (visaType.startsWith("EB-")) return Award;
  if (visaType.startsWith("L-")) return Building2;
  if (visaType === "E-2") return Briefcase;
  if (visaType === "TN") return Globe;
  if (visaType.startsWith("J-") || visaType.startsWith("F-") || visaType === "STEM OPT") return GraduationCap;
  if (visaType === "O-1") return Award;
  if (visaType === "H-1B") return Briefcase;
  return FileText;
}

function getEvidenceIcon(type: string) {
  switch (type) {
    case "Publication":
      return BookOpen;
    case "Citation":
      return FileText;
    case "Award":
      return Award;
    case "Patent":
      return Lightbulb;
    case "Membership":
      return Users;
    case "Media":
      return Newspaper;
    case "Judging":
      return Scale;
    case "Contribution":
      return Lightbulb;
    default:
      return FileText;
  }
}

// ---------- Score Circle Component ----------

function ScoreCircle({ score, eligibility }: { score: number; eligibility: string }) {
  const color = getEligibilityColor(eligibility);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: 140, height: 140 }}>
      <svg width="140" height="140" className="transform -rotate-90">
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.04)"
          strokeWidth="8"
        />
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-3xl font-bold"
          style={{ fontFamily: "monospace, monospace", color }}
        >
          {score}
        </span>
        <span
          className="text-[10px] uppercase mt-1"
          style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
        >
          {eligibility}
        </span>
      </div>
    </div>
  );
}

// ---------- Main Page ----------

export default function GreenCardPage() {
  const [activeTab, setActiveTab] = useState("visa-finder");

  return (
    <div className="w-full">
      {/* Background texture */}
      <div
        className="fixed inset-0 opacity-[0.015] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <Flag size={28} style={{ color: "#8B5CF6" }} />
          <h1
            className="text-3xl font-bold"
            style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
          >
            Immigration Assistant
          </h1>
        </div>
        <p
          className="text-sm ml-[40px]"
          style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
        >
          All US Visa Pathways — EB-1A, EB-1B, EB-2, EB-3, O-1, L-1, E-2, TN, H-1B, J-1, F-1 OPT & More
        </p>
      </motion.div>

      {/* Tab Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mb-8"
      >
        <div className="flex gap-1 p-1 rounded-lg flex-wrap" style={{ background: "rgba(255, 255, 255, 0.03)" }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="px-4 py-2 rounded-md text-sm font-medium transition-all"
              style={{
                background: activeTab === tab.id ? "rgba(124, 58, 237, 0.15)" : "transparent",
                color: activeTab === tab.id ? "#8B5CF6" : "#9090B8",
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {activeTab === "visa-finder" ? <VisaFinderTab /> : null}
        {activeTab === "eligibility" ? <EligibilityTab /> : null}
        {activeTab === "strategy" ? <StrategyTab /> : null}
        {activeTab === "evidence" ? <EvidenceTab /> : null}
      </motion.div>
    </div>
  );
}

// ---------- Visa Finder Tab ----------

function VisaFinderTab() {
  const [result, setResult] = useState<VisaFinderResult | null>(null);
  const [expandedPathway, setExpandedPathway] = useState<string | null>(null);

  const finderMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch<Record<string, unknown>>("/api/greencard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "visa-finder" }),
      });
      const inner = (res as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
      return (inner?.visaFinder as VisaFinderResult) || null;
    },
    onSuccess: (data) => {
      if (data) setResult(data);
    },
  });

  const eligiblePathways = result
    ? result.pathways.filter((p) => p.fit_level !== "not_eligible")
    : [];
  const ineligiblePathways = result
    ? result.pathways.filter((p) => p.fit_level === "not_eligible")
    : [];

  return (
    <div className="space-y-6">
      {/* Launch Card */}
      <div
        className="rounded-xl p-6 border"
        style={{
          background: "rgba(11, 11, 20, 0.7)",
          backdropFilter: "blur(12px)",
          borderColor: "rgba(255, 255, 255, 0.04)",
        }}
      >
        <div className="flex items-start gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(124, 58, 237, 0.1)" }}
          >
            <Search size={24} style={{ color: "#8B5CF6" }} />
          </div>
          <div className="flex-1">
            <h3
              className="text-lg font-semibold mb-1"
              style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
            >
              Find Your Best Visa Pathways
            </h3>
            <p
              className="text-sm mb-4"
              style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
            >
              AI will analyze your profile against all 14+ US visa categories and recommend the best pathways for your situation. This includes employment-based green cards, temporary work visas, investor visas, and student pathways.
            </p>
            <button
              onClick={() => finderMutation.mutate()}
              disabled={finderMutation.isPending}
              className="px-6 py-2.5 rounded-lg font-semibold transition-all disabled:opacity-50 flex items-center gap-2"
              style={{
                background: "#8B5CF6",
                color: "#050508",
                fontFamily: "'Inter', sans-serif",
              }}
            >
              <Globe size={16} />
              {finderMutation.isPending ? "Analyzing All Pathways..." : "Find My Best Visa Pathways"}
            </button>
          </div>
        </div>

        {finderMutation.isError ? (
          <p
            className="mt-3 text-sm"
            style={{ fontFamily: "'Inter', sans-serif", color: "#F87171" }}
          >
            Analysis failed. Please ensure your profile is complete and try again.
          </p>
        ) : null}
      </div>

      {/* Loading State */}
      {finderMutation.isPending ? (
        <div className="text-center py-12">
          <div
            className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-4"
            style={{ borderColor: "rgba(124, 58, 237, 0.3)", borderTopColor: "transparent" }}
          />
          <p
            className="text-sm"
            style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
          >
            Evaluating your profile against all US visa categories...
          </p>
        </div>
      ) : null}

      {/* Results */}
      {result && !finderMutation.isPending ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Top Recommendations */}
          {result.top_recommendations.length > 0 ? (
            <div
              className="rounded-xl p-6 border"
              style={{
                background: "linear-gradient(135deg, rgba(124, 58, 237, 0.05) 0%, rgba(83, 109, 254, 0.03) 100%)",
                border: "1px solid rgba(124, 58, 237, 0.15)",
              }}
            >
              <h3
                className="text-lg font-semibold mb-4"
                style={{ fontFamily: "'Inter', sans-serif", color: "#8B5CF6" }}
              >
                Top Recommended Pathways
              </h3>
              <div className="space-y-3">
                {result.top_recommendations.map((rec, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex items-start gap-3"
                  >
                    <span
                      className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{
                        background: idx === 0 ? "rgba(74, 222, 128, 0.2)" : idx === 1 ? "rgba(255, 171, 0, 0.2)" : "rgba(126, 126, 152, 0.2)",
                        color: idx === 0 ? "#34D399" : idx === 1 ? "#FBBF24" : "#9090B8",
                        fontFamily: "monospace, monospace",
                      }}
                    >
                      {idx + 1}
                    </span>
                    <div>
                      <span
                        className="text-sm font-semibold"
                        style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
                      >
                        {rec.visa_type}
                      </span>
                      <p
                        className="text-xs mt-0.5"
                        style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
                      >
                        {rec.reason}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Multi-Pathway Strategy */}
          {result.multi_pathway_strategy ? (
            <div
              className="rounded-xl p-6 border"
              style={{
                background: "rgba(11, 11, 20, 0.7)",
                backdropFilter: "blur(12px)",
                borderColor: "rgba(255, 171, 0, 0.15)",
              }}
            >
              <h3
                className="text-lg font-semibold mb-3 flex items-center gap-2"
                style={{ fontFamily: "'Inter', sans-serif", color: "#FBBF24" }}
              >
                <Lightbulb size={18} />
                Multi-Pathway Strategy
              </h3>
              <p
                className="text-sm leading-relaxed"
                style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
              >
                {result.multi_pathway_strategy}
              </p>
            </div>
          ) : null}

          {/* Eligible Pathways */}
          {eligiblePathways.length > 0 ? (
            <div
              className="rounded-xl border overflow-hidden"
              style={{
                background: "rgba(11, 11, 20, 0.7)",
                backdropFilter: "blur(12px)",
                borderColor: "rgba(255, 255, 255, 0.04)",
              }}
            >
              <div className="px-6 py-4 border-b" style={{ borderColor: "rgba(255, 255, 255, 0.04)" }}>
                <h3
                  className="text-lg font-semibold"
                  style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
                >
                  Viable Pathways ({eligiblePathways.length})
                </h3>
              </div>
              <div className="divide-y" style={{ borderColor: "rgba(255, 255, 255, 0.04)" }}>
                {eligiblePathways.map((pathway, idx) => {
                  const IconComponent = getVisaIcon(pathway.visa_type);
                  return (
                    <div
                      key={idx}
                      className="divide-y"
                      style={{ borderColor: "rgba(255, 255, 255, 0.04)" }}
                    >
                      <button
                        onClick={() =>
                          setExpandedPathway(expandedPathway === pathway.visa_type ? null : pathway.visa_type)
                        }
                        className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <IconComponent size={18} style={{ color: getFitColor(pathway.fit_level) }} />
                          <div className="text-left">
                            <span
                              className="text-sm font-medium block"
                              style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
                            >
                              {pathway.visa_type}
                            </span>
                            {pathway.visa_name ? (
                              <span
                                className="text-xs"
                                style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
                              >
                                {pathway.visa_name}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {pathway.leads_to_green_card ? (
                            <span
                              className="px-2 py-0.5 rounded text-[9px] font-semibold uppercase"
                              style={{
                                background: "rgba(74, 222, 128, 0.1)",
                                color: "#34D399",
                                fontFamily: "monospace, monospace",
                              }}
                            >
                              GC Path
                            </span>
                          ) : null}
                          <span
                            className="px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase"
                            style={{
                              background: `${getFitColor(pathway.fit_level)}15`,
                              color: getFitColor(pathway.fit_level),
                              fontFamily: "monospace, monospace",
                            }}
                          >
                            {getFitLabel(pathway.fit_level)}
                          </span>
                          <ChevronRight
                            size={16}
                            className="transition-transform"
                            style={{
                              color: "#3A3A60",
                              transform: expandedPathway === pathway.visa_type ? "rotate(90deg)" : "rotate(0deg)",
                            }}
                          />
                        </div>
                      </button>

                      {expandedPathway === pathway.visa_type ? (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="px-6 py-4 space-y-3"
                          style={{ background: "rgba(255, 255, 255, 0.01)" }}
                        >
                          <p
                            className="text-sm leading-relaxed"
                            style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
                          >
                            {pathway.reason}
                          </p>

                          {pathway.advantages.length > 0 ? (
                            <div>
                              <span
                                className="text-[11px] uppercase font-semibold block mb-1"
                                style={{ fontFamily: "monospace, monospace", color: "#34D399" }}
                              >
                                Your Advantages
                              </span>
                              <ul className="space-y-1">
                                {pathway.advantages.map((adv, aIdx) => (
                                  <li
                                    key={aIdx}
                                    className="text-sm flex items-start gap-2"
                                    style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
                                  >
                                    <CheckCircle2 size={12} className="mt-1 flex-shrink-0" style={{ color: "#34D399" }} />
                                    <span>{adv}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null}

                          {pathway.gaps.length > 0 ? (
                            <div>
                              <span
                                className="text-[11px] uppercase font-semibold block mb-1"
                                style={{ fontFamily: "monospace, monospace", color: "#F87171" }}
                              >
                                Gaps / Missing Requirements
                              </span>
                              <ul className="space-y-1">
                                {pathway.gaps.map((gap, gIdx) => (
                                  <li
                                    key={gIdx}
                                    className="text-sm flex items-start gap-2"
                                    style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
                                  >
                                    <XCircle size={12} className="mt-1 flex-shrink-0" style={{ color: "#F87171" }} />
                                    <span>{gap}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null}

                          <div className="flex items-center gap-4 pt-2">
                            <div>
                              <span
                                className="text-[11px] uppercase font-semibold block"
                                style={{ fontFamily: "monospace, monospace", color: "#9090B8" }}
                              >
                                Timeline
                              </span>
                              <span
                                className="text-sm"
                                style={{ fontFamily: "monospace, monospace", color: "#FBBF24" }}
                              >
                                {pathway.timeline}
                              </span>
                            </div>
                            {pathway.leads_to_green_card && pathway.green_card_path ? (
                              <div>
                                <span
                                  className="text-[11px] uppercase font-semibold block"
                                  style={{ fontFamily: "monospace, monospace", color: "#9090B8" }}
                                >
                                  Green Card Path
                                </span>
                                <span
                                  className="text-sm"
                                  style={{ fontFamily: "'Inter', sans-serif", color: "#34D399" }}
                                >
                                  {pathway.green_card_path}
                                </span>
                              </div>
                            ) : null}
                          </div>
                        </motion.div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* Not Eligible Pathways (collapsed) */}
          {ineligiblePathways.length > 0 ? (
            <div
              className="rounded-xl border overflow-hidden"
              style={{
                background: "rgba(11, 11, 20, 0.5)",
                borderColor: "rgba(255, 255, 255, 0.03)",
              }}
            >
              <div className="px-6 py-4 border-b" style={{ borderColor: "rgba(255, 255, 255, 0.04)" }}>
                <h3
                  className="text-sm font-semibold"
                  style={{ fontFamily: "'Inter', sans-serif", color: "#3A3A60" }}
                >
                  Not Eligible ({ineligiblePathways.length})
                </h3>
              </div>
              <div className="divide-y" style={{ borderColor: "rgba(255, 255, 255, 0.03)" }}>
                {ineligiblePathways.map((pathway, idx) => (
                  <div key={idx} className="px-6 py-3 flex items-center justify-between">
                    <span
                      className="text-sm"
                      style={{ fontFamily: "'Inter', sans-serif", color: "#3A3A60" }}
                    >
                      {pathway.visa_type}
                    </span>
                    <span
                      className="text-xs"
                      style={{ fontFamily: "'Inter', sans-serif", color: "#3A3A60" }}
                    >
                      {pathway.reason}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Immediate Actions */}
          {result.immediate_actions.length > 0 ? (
            <div
              className="rounded-xl p-6 border"
              style={{
                background: "rgba(11, 11, 20, 0.7)",
                backdropFilter: "blur(12px)",
                borderColor: "rgba(255, 255, 255, 0.04)",
              }}
            >
              <h3
                className="text-lg font-semibold mb-4"
                style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
              >
                Immediate Actions
              </h3>
              <ol className="space-y-3">
                {result.immediate_actions.map((action, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span
                      className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold"
                      style={{
                        background: "rgba(124, 58, 237, 0.15)",
                        color: "#8B5CF6",
                        fontFamily: "monospace, monospace",
                      }}
                    >
                      {idx + 1}
                    </span>
                    <p
                      className="text-sm leading-relaxed"
                      style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
                    >
                      {action}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
        </motion.div>
      ) : null}
    </div>
  );
}

// ---------- Eligibility Tab ----------

function EligibilityTab() {
  const [visaType, setVisaType] = useState("EB-1A");
  const [publications, setPublications] = useState("");
  const [citations, setCitations] = useState("");
  const [awards, setAwards] = useState("");
  const [patents, setPatents] = useState("");
  const [memberships, setMemberships] = useState("");
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [expandedCriterion, setExpandedCriterion] = useState<string | null>(null);

  const assessMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        action: "assess",
        visaType,
      };
      if (publications) payload.publications = parseInt(publications, 10);
      if (citations) payload.citations = parseInt(citations, 10);
      if (awards) payload.awards = awards.split(",").map((a) => a.trim()).filter(Boolean);
      if (patents) payload.patents = parseInt(patents, 10);
      if (memberships) payload.memberships = memberships.split(",").map((m) => m.trim()).filter(Boolean);

      const res = await apiFetch<Record<string, unknown>>("/api/greencard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const inner = (res as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
      return (inner?.assessment as Assessment) || null;
    },
    onSuccess: (data) => {
      if (data) setAssessment(data);
    },
  });

  const criteriaMetCount = assessment ? assessment.criteria.filter((c) => c.met).length : 0;

  return (
    <div className="space-y-6">
      {/* Input Form */}
      <div
        className="rounded-xl p-6 border"
        style={{
          background: "rgba(11, 11, 20, 0.7)",
          backdropFilter: "blur(12px)",
          borderColor: "rgba(255, 255, 255, 0.04)",
        }}
      >
        <h3
          className="text-lg font-semibold mb-4"
          style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
        >
          Assessment Parameters
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Visa Type */}
          <div>
            <label
              className="block text-xs font-medium mb-1.5"
              style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
            >
              Visa Type
            </label>
            <select
              value={visaType}
              onChange={(e) => setVisaType(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border bg-transparent outline-none text-sm"
              style={{
                borderColor: "rgba(255, 255, 255, 0.08)",
                color: "#F0F0FF",
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {VISA_TYPES.map((vt) => (
                <option key={vt.value} value={vt.value} style={{ background: "#0C0C14", color: "#F0F0FF" }}>
                  {vt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Publications */}
          <div>
            <label
              className="block text-xs font-medium mb-1.5"
              style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
            >
              Publications Count
            </label>
            <input
              type="number"
              value={publications}
              onChange={(e) => setPublications(e.target.value)}
              placeholder="e.g. 12"
              className="w-full px-3 py-2.5 rounded-lg border bg-transparent outline-none text-sm"
              style={{
                borderColor: "rgba(255, 255, 255, 0.08)",
                color: "#F0F0FF",
                fontFamily: "monospace, monospace",
              }}
            />
          </div>

          {/* Citations */}
          <div>
            <label
              className="block text-xs font-medium mb-1.5"
              style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
            >
              Total Citations
            </label>
            <input
              type="number"
              value={citations}
              onChange={(e) => setCitations(e.target.value)}
              placeholder="e.g. 350"
              className="w-full px-3 py-2.5 rounded-lg border bg-transparent outline-none text-sm"
              style={{
                borderColor: "rgba(255, 255, 255, 0.08)",
                color: "#F0F0FF",
                fontFamily: "monospace, monospace",
              }}
            />
          </div>

          {/* Awards */}
          <div>
            <label
              className="block text-xs font-medium mb-1.5"
              style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
            >
              Awards (comma-separated)
            </label>
            <input
              type="text"
              value={awards}
              onChange={(e) => setAwards(e.target.value)}
              placeholder="e.g. Best Paper Award, NSF Fellowship"
              className="w-full px-3 py-2.5 rounded-lg border bg-transparent outline-none text-sm"
              style={{
                borderColor: "rgba(255, 255, 255, 0.08)",
                color: "#F0F0FF",
                fontFamily: "'Inter', sans-serif",
              }}
            />
          </div>

          {/* Patents */}
          <div>
            <label
              className="block text-xs font-medium mb-1.5"
              style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
            >
              Patents Filed/Granted
            </label>
            <input
              type="number"
              value={patents}
              onChange={(e) => setPatents(e.target.value)}
              placeholder="e.g. 3"
              className="w-full px-3 py-2.5 rounded-lg border bg-transparent outline-none text-sm"
              style={{
                borderColor: "rgba(255, 255, 255, 0.08)",
                color: "#F0F0FF",
                fontFamily: "monospace, monospace",
              }}
            />
          </div>

          {/* Memberships */}
          <div>
            <label
              className="block text-xs font-medium mb-1.5"
              style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
            >
              Professional Memberships (comma-separated)
            </label>
            <input
              type="text"
              value={memberships}
              onChange={(e) => setMemberships(e.target.value)}
              placeholder="e.g. IEEE Senior Member, ACM"
              className="w-full px-3 py-2.5 rounded-lg border bg-transparent outline-none text-sm"
              style={{
                borderColor: "rgba(255, 255, 255, 0.08)",
                color: "#F0F0FF",
                fontFamily: "'Inter', sans-serif",
              }}
            />
          </div>
        </div>

        <button
          onClick={() => assessMutation.mutate()}
          disabled={assessMutation.isPending}
          className="mt-6 px-6 py-2.5 rounded-lg font-semibold transition-all disabled:opacity-50"
          style={{
            background: "#8B5CF6",
            color: "#050508",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {assessMutation.isPending ? "Analyzing..." : "Run Eligibility Assessment"}
        </button>

        {assessMutation.isError ? (
          <p
            className="mt-3 text-sm"
            style={{ fontFamily: "'Inter', sans-serif", color: "#F87171" }}
          >
            Assessment failed. Please ensure your profile is complete and try again.
          </p>
        ) : null}
      </div>

      {/* Loading State */}
      {assessMutation.isPending ? (
        <div className="text-center py-12">
          <div
            className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-4"
            style={{ borderColor: "rgba(124, 58, 237, 0.3)", borderTopColor: "transparent" }}
          />
          <p
            className="text-sm"
            style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
          >
            AI is evaluating your eligibility across all criteria...
          </p>
        </div>
      ) : null}

      {/* Assessment Results */}
      {assessment && !assessMutation.isPending ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Score Overview */}
          <div
            className="rounded-xl p-6 border"
            style={{
              background: "linear-gradient(135deg, rgba(124, 58, 237, 0.05) 0%, rgba(83, 109, 254, 0.03) 100%)",
              border: `1px solid ${getEligibilityColor(assessment.overall_eligibility)}33`,
            }}
          >
            <div className="flex flex-col md:flex-row items-center gap-8">
              <ScoreCircle score={assessment.overall_score} eligibility={assessment.overall_eligibility} />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="inline-block px-3 py-1 rounded-full text-[11px] font-semibold uppercase"
                    style={{
                      background: `${getEligibilityColor(assessment.overall_eligibility)}20`,
                      color: getEligibilityColor(assessment.overall_eligibility),
                      fontFamily: "monospace, monospace",
                    }}
                  >
                    {assessment.visa_type}
                  </span>
                  <span
                    className="inline-block px-3 py-1 rounded-full text-[11px] font-semibold uppercase"
                    style={{
                      background: `${getEligibilityColor(assessment.overall_eligibility)}20`,
                      color: getEligibilityColor(assessment.overall_eligibility),
                      fontFamily: "monospace, monospace",
                    }}
                  >
                    {assessment.overall_eligibility}
                  </span>
                </div>
                <p
                  className="text-sm leading-relaxed mb-3"
                  style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
                >
                  {assessment.summary}
                </p>
                <div className="flex items-center gap-4 text-xs" style={{ fontFamily: "monospace, monospace" }}>
                  <span style={{ color: "#34D399" }}>
                    {criteriaMetCount} criteria met
                  </span>
                  <span style={{ color: "#3A3A60" }}>|</span>
                  <span style={{ color: "#9090B8" }}>
                    {assessment.criteria.length - criteriaMetCount} remaining
                  </span>
                  <span style={{ color: "#3A3A60" }}>|</span>
                  <span style={{ color: "#FBBF24" }}>
                    {assessment.estimated_timeline}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Criteria Table */}
          <div
            className="rounded-xl border overflow-hidden"
            style={{
              background: "rgba(11, 11, 20, 0.7)",
              backdropFilter: "blur(12px)",
              borderColor: "rgba(255, 255, 255, 0.04)",
            }}
          >
            <div className="px-6 py-4 border-b" style={{ borderColor: "rgba(255, 255, 255, 0.04)" }}>
              <h3
                className="text-lg font-semibold"
                style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
              >
                Criteria Breakdown
              </h3>
            </div>
            <div className="divide-y" style={{ borderColor: "rgba(255, 255, 255, 0.04)" }}>
              {assessment.criteria.map((criterion, idx) => (
                <div
                  key={idx}
                  className="divide-y"
                  style={{ borderColor: "rgba(255, 255, 255, 0.04)" }}
                >
                  <button
                    onClick={() =>
                      setExpandedCriterion(expandedCriterion === criterion.name ? null : criterion.name)
                    }
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {criterion.met ? (
                        <CheckCircle2 size={18} style={{ color: "#34D399" }} />
                      ) : (
                        <XCircle size={18} style={{ color: getStrengthColor(criterion.strength) }} />
                      )}
                      <span
                        className="text-sm font-medium"
                        style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
                      >
                        {criterion.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className="px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase"
                        style={{
                          background: `${getStrengthColor(criterion.strength)}15`,
                          color: getStrengthColor(criterion.strength),
                          fontFamily: "monospace, monospace",
                        }}
                      >
                        {criterion.strength}
                      </span>
                      <ChevronRight
                        size={16}
                        className="transition-transform"
                        style={{
                          color: "#3A3A60",
                          transform: expandedCriterion === criterion.name ? "rotate(90deg)" : "rotate(0deg)",
                        }}
                      />
                    </div>
                  </button>

                  {expandedCriterion === criterion.name ? (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="px-6 py-4"
                      style={{ background: "rgba(255, 255, 255, 0.01)" }}
                    >
                      {criterion.current_evidence ? (
                        <div className="mb-3">
                          <span
                            className="text-[11px] uppercase font-semibold block mb-1"
                            style={{ fontFamily: "monospace, monospace", color: "#8B5CF6" }}
                          >
                            Current Evidence
                          </span>
                          <p
                            className="text-sm leading-relaxed"
                            style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
                          >
                            {criterion.current_evidence}
                          </p>
                        </div>
                      ) : null}
                      {criterion.suggestions.length > 0 ? (
                        <div>
                          <span
                            className="text-[11px] uppercase font-semibold block mb-1"
                            style={{ fontFamily: "monospace, monospace", color: "#FBBF24" }}
                          >
                            Suggestions
                          </span>
                          <ul className="space-y-1.5">
                            {criterion.suggestions.map((suggestion, sIdx) => (
                              <li
                                key={sIdx}
                                className="text-sm flex items-start gap-2"
                                style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
                              >
                                <span style={{ color: "#FBBF24" }}>-</span>
                                <span>{suggestion}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </motion.div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          {/* Next Steps */}
          {assessment.next_steps.length > 0 ? (
            <div
              className="rounded-xl p-6 border"
              style={{
                background: "rgba(11, 11, 20, 0.7)",
                backdropFilter: "blur(12px)",
                borderColor: "rgba(255, 255, 255, 0.04)",
              }}
            >
              <h3
                className="text-lg font-semibold mb-4"
                style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
              >
                Recommended Next Steps
              </h3>
              <ol className="space-y-3">
                {assessment.next_steps.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span
                      className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold"
                      style={{
                        background: "rgba(124, 58, 237, 0.15)",
                        color: "#8B5CF6",
                        fontFamily: "monospace, monospace",
                      }}
                    >
                      {idx + 1}
                    </span>
                    <p
                      className="text-sm leading-relaxed"
                      style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
                    >
                      {step}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
        </motion.div>
      ) : null}
    </div>
  );
}

// ---------- Strategy Tab ----------

function StrategyTab() {
  const [visaType, setVisaType] = useState("EB-1A");
  const [strategy, setStrategy] = useState<Strategy | null>(null);

  const strategyMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch<Record<string, unknown>>("/api/greencard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "strategy", visaType }),
      });
      const inner = (res as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
      return (inner?.strategy as Strategy) || null;
    },
    onSuccess: (data) => {
      if (data) setStrategy(data);
    },
  });

  return (
    <div className="space-y-6">
      {/* Strategy Launch */}
      <div
        className="rounded-xl p-6 border"
        style={{
          background: "rgba(11, 11, 20, 0.7)",
          backdropFilter: "blur(12px)",
          borderColor: "rgba(255, 255, 255, 0.04)",
        }}
      >
        <h3
          className="text-lg font-semibold mb-2"
          style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
        >
          Build Your Strategy
        </h3>
        <p
          className="text-sm mb-4"
          style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
        >
          Generate a 12-month roadmap based on your profile. If you have run an eligibility assessment, it will be used as additional context for a more tailored strategy.
        </p>

        <div className="flex items-end gap-4">
          <div>
            <label
              className="block text-xs font-medium mb-1.5"
              style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
            >
              Visa Type
            </label>
            <select
              value={visaType}
              onChange={(e) => setVisaType(e.target.value)}
              className="px-3 py-2.5 rounded-lg border bg-transparent outline-none text-sm"
              style={{
                borderColor: "rgba(255, 255, 255, 0.08)",
                color: "#F0F0FF",
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {VISA_TYPES.map((vt) => (
                <option key={vt.value} value={vt.value} style={{ background: "#0C0C14", color: "#F0F0FF" }}>
                  {vt.label}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => strategyMutation.mutate()}
            disabled={strategyMutation.isPending}
            className="px-6 py-2.5 rounded-lg font-semibold transition-all disabled:opacity-50"
            style={{
              background: "#8B5CF6",
              color: "#050508",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {strategyMutation.isPending ? "Building Roadmap..." : "Generate Strategy"}
          </button>
        </div>

        {strategyMutation.isError ? (
          <p
            className="mt-3 text-sm"
            style={{ fontFamily: "'Inter', sans-serif", color: "#F87171" }}
          >
            Failed to generate strategy. Please ensure your profile is complete and try again.
          </p>
        ) : null}
      </div>

      {/* Loading State */}
      {strategyMutation.isPending ? (
        <div className="text-center py-12">
          <div
            className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-4"
            style={{ borderColor: "rgba(124, 58, 237, 0.3)", borderTopColor: "transparent" }}
          />
          <p
            className="text-sm"
            style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
          >
            Building your personalized 12-month roadmap...
          </p>
        </div>
      ) : null}

      {/* Strategy Results */}
      {strategy && !strategyMutation.isPending ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Priority Criteria & Filing Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              className="rounded-xl p-5 border"
              style={{
                background: "rgba(11, 11, 20, 0.7)",
                backdropFilter: "blur(12px)",
                borderColor: "rgba(255, 255, 255, 0.04)",
              }}
            >
              <h4
                className="text-sm font-semibold mb-3"
                style={{ fontFamily: "'Inter', sans-serif", color: "#8B5CF6" }}
              >
                Priority Criteria
              </h4>
              <div className="flex flex-wrap gap-2">
                {strategy.priority_criteria.map((criterion, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 rounded-full text-xs"
                    style={{
                      background: "rgba(124, 58, 237, 0.1)",
                      color: "#8B5CF6",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    {criterion}
                  </span>
                ))}
              </div>
            </div>
            <div
              className="rounded-xl p-5 border"
              style={{
                background: "rgba(11, 11, 20, 0.7)",
                backdropFilter: "blur(12px)",
                borderColor: "rgba(255, 255, 255, 0.04)",
              }}
            >
              <h4
                className="text-sm font-semibold mb-3"
                style={{ fontFamily: "'Inter', sans-serif", color: "#FBBF24" }}
              >
                Estimated Filing Date
              </h4>
              <p
                className="text-2xl font-bold"
                style={{ fontFamily: "monospace, monospace", color: "#F0F0FF" }}
              >
                {strategy.estimated_filing_date}
              </p>
            </div>
          </div>

          {/* Monthly Roadmap */}
          <div
            className="rounded-xl border overflow-hidden"
            style={{
              background: "rgba(11, 11, 20, 0.7)",
              backdropFilter: "blur(12px)",
              borderColor: "rgba(255, 255, 255, 0.04)",
            }}
          >
            <div className="px-6 py-4 border-b" style={{ borderColor: "rgba(255, 255, 255, 0.04)" }}>
              <h3
                className="text-lg font-semibold"
                style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
              >
                12-Month Roadmap
              </h3>
            </div>
            <div className="p-6 space-y-4">
              {strategy.roadmap.map((month, mIdx) => (
                <motion.div
                  key={mIdx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: mIdx * 0.05 }}
                  className="rounded-lg p-5 border"
                  style={{
                    background: "rgba(255, 255, 255, 0.02)",
                    borderColor: "rgba(255, 255, 255, 0.04)",
                  }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span
                      className="px-3 py-1 rounded-full text-[11px] font-bold"
                      style={{
                        background: "rgba(124, 58, 237, 0.15)",
                        color: "#8B5CF6",
                        fontFamily: "monospace, monospace",
                      }}
                    >
                      {month.month}
                    </span>
                    <h4
                      className="text-sm font-semibold"
                      style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
                    >
                      {month.focus}
                    </h4>
                  </div>
                  <div className="space-y-2.5 ml-1">
                    {month.actions.map((action, aIdx) => (
                      <div key={aIdx} className="flex items-start gap-3">
                        <ChevronRight size={14} className="mt-0.5 flex-shrink-0" style={{ color: "#3A3A60" }} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span
                              className="text-sm"
                              style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
                            >
                              {action.action}
                            </span>
                            <span
                              className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase"
                              style={{
                                background: `${getImpactColor(action.impact)}15`,
                                color: getImpactColor(action.impact),
                                fontFamily: "monospace, monospace",
                              }}
                            >
                              {action.impact}
                            </span>
                          </div>
                          <span
                            className="text-[11px]"
                            style={{ fontFamily: "monospace, monospace", color: "#3A3A60" }}
                          >
                            {action.criterion}
                          </span>
                          {action.details ? (
                            <p
                              className="text-xs mt-1"
                              style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
                            >
                              {action.details}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Attorney Recommendations */}
          {strategy.attorney_recommendations.length > 0 ? (
            <div
              className="rounded-xl p-6 border"
              style={{
                background: "rgba(11, 11, 20, 0.7)",
                backdropFilter: "blur(12px)",
                borderColor: "rgba(255, 255, 255, 0.04)",
              }}
            >
              <h3
                className="text-lg font-semibold mb-4"
                style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
              >
                <AlertTriangle size={18} className="inline mr-2" style={{ color: "#FBBF24" }} />
                Attorney Recommendations
              </h3>
              <ul className="space-y-3">
                {strategy.attorney_recommendations.map((rec, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-3 text-sm"
                    style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
                  >
                    <span style={{ color: "#FBBF24" }}>-</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </motion.div>
      ) : null}
    </div>
  );
}

// ---------- Evidence Tab ----------

function EvidenceTab() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [evidenceType, setEvidenceType] = useState("Publication");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [link, setLink] = useState("");

  // Fetch evidence list
  const { data: evidenceData, isLoading } = useQuery({
    queryKey: ["greencard-evidence"],
    queryFn: async () => {
      const res = await apiFetch<Record<string, unknown>>("/api/greencard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "evidence-list" }),
      });
      const inner = (res as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
      return (inner?.evidence as EvidenceItem[]) || [];
    },
    retry: false,
  });

  const evidence: EvidenceItem[] = evidenceData || [];

  // Save evidence mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch<Record<string, unknown>>("/api/greencard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "evidence-save",
          evidenceType,
          evidenceData: { title, description, date, link },
        }),
      });
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["greencard-evidence"] });
      setTitle("");
      setDescription("");
      setDate("");
      setLink("");
      setShowForm(false);
    },
  });

  // Group evidence by type
  const groupedEvidence: Record<string, EvidenceItem[]> = {};
  for (const item of evidence) {
    if (!groupedEvidence[item.type]) {
      groupedEvidence[item.type] = [];
    }
    groupedEvidence[item.type].push(item);
  }

  return (
    <div className="space-y-6">
      {/* Header + Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3
            className="text-lg font-semibold"
            style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
          >
            Evidence Portfolio
          </h3>
          <p
            className="text-sm"
            style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
          >
            Track and organize evidence for your petition. {evidence.length} items collected.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-lg font-semibold text-sm transition-all flex items-center gap-2"
          style={{
            background: showForm ? "rgba(255, 71, 87, 0.15)" : "#8B5CF6",
            color: showForm ? "#F87171" : "#050508",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {showForm ? (
            <>Cancel</>
          ) : (
            <>
              <Plus size={16} />
              Add Evidence
            </>
          )}
        </button>
      </div>

      {/* Add Evidence Form */}
      {showForm ? (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl p-6 border"
          style={{
            background: "rgba(11, 11, 20, 0.7)",
            backdropFilter: "blur(12px)",
            borderColor: "rgba(124, 58, 237, 0.15)",
          }}
        >
          <h4
            className="text-sm font-semibold mb-4"
            style={{ fontFamily: "'Inter', sans-serif", color: "#8B5CF6" }}
          >
            New Evidence Item
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                className="block text-xs font-medium mb-1.5"
                style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
              >
                Evidence Type
              </label>
              <select
                value={evidenceType}
                onChange={(e) => setEvidenceType(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border bg-transparent outline-none text-sm"
                style={{
                  borderColor: "rgba(255, 255, 255, 0.08)",
                  color: "#F0F0FF",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                {EVIDENCE_TYPES.map((type) => (
                  <option key={type} value={type} style={{ background: "#0C0C14", color: "#F0F0FF" }}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                className="block text-xs font-medium mb-1.5"
                style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
              >
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border bg-transparent outline-none text-sm"
                style={{
                  borderColor: "rgba(255, 255, 255, 0.08)",
                  color: "#F0F0FF",
                  fontFamily: "monospace, monospace",
                }}
              />
            </div>
            <div className="md:col-span-2">
              <label
                className="block text-xs font-medium mb-1.5"
                style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
              >
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Published in Nature Communications"
                className="w-full px-3 py-2.5 rounded-lg border bg-transparent outline-none text-sm"
                style={{
                  borderColor: "rgba(255, 255, 255, 0.08)",
                  color: "#F0F0FF",
                  fontFamily: "'Inter', sans-serif",
                }}
              />
            </div>
            <div className="md:col-span-2">
              <label
                className="block text-xs font-medium mb-1.5"
                style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
              >
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the evidence and its significance..."
                rows={3}
                className="w-full px-3 py-2.5 rounded-lg border bg-transparent outline-none text-sm resize-none"
                style={{
                  borderColor: "rgba(255, 255, 255, 0.08)",
                  color: "#F0F0FF",
                  fontFamily: "'Inter', sans-serif",
                }}
              />
            </div>
            <div className="md:col-span-2">
              <label
                className="block text-xs font-medium mb-1.5"
                style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
              >
                Link (optional)
              </label>
              <input
                type="url"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2.5 rounded-lg border bg-transparent outline-none text-sm"
                style={{
                  borderColor: "rgba(255, 255, 255, 0.08)",
                  color: "#F0F0FF",
                  fontFamily: "monospace, monospace",
                }}
              />
            </div>
          </div>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !title.trim()}
            className="mt-4 px-6 py-2.5 rounded-lg font-semibold transition-all disabled:opacity-50"
            style={{
              background: "#8B5CF6",
              color: "#050508",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {saveMutation.isPending ? "Saving..." : "Save Evidence"}
          </button>
          {saveMutation.isError ? (
            <p
              className="mt-2 text-sm"
              style={{ fontFamily: "'Inter', sans-serif", color: "#F87171" }}
            >
              Failed to save evidence. Please try again.
            </p>
          ) : null}
        </motion.div>
      ) : null}

      {/* Evidence Count Badges */}
      {evidence.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {EVIDENCE_TYPES.map((type) => {
            const count = groupedEvidence[type]?.length || 0;
            if (count === 0) return null;
            const IconComponent = getEvidenceIcon(type);
            return (
              <div
                key={type}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                style={{
                  background: "rgba(124, 58, 237, 0.08)",
                  border: "1px solid rgba(124, 58, 237, 0.15)",
                }}
              >
                <IconComponent size={12} style={{ color: "#8B5CF6" }} />
                <span
                  className="text-xs"
                  style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
                >
                  {type}
                </span>
                <span
                  className="text-[11px] font-bold"
                  style={{ fontFamily: "monospace, monospace", color: "#8B5CF6" }}
                >
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Loading State */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-20 rounded-lg animate-pulse"
              style={{ background: "rgba(255, 255, 255, 0.03)" }}
            />
          ))}
        </div>
      ) : null}

      {/* Evidence Cards Grouped by Type */}
      {!isLoading && evidence.length === 0 ? (
        <div className="text-center py-16">
          <FileText size={48} className="mx-auto mb-4" style={{ color: "#3A3A60" }} />
          <h3
            className="text-xl font-semibold mb-2"
            style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
          >
            No Evidence Yet
          </h3>
          <p
            className="text-sm"
            style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
          >
            Start building your evidence portfolio by adding publications, awards, and other supporting materials.
          </p>
        </div>
      ) : null}

      {!isLoading
        ? Object.entries(groupedEvidence).map(([type, items]) => (
            <div key={type}>
              <div className="flex items-center gap-2 mb-3">
                {(() => {
                  const IconComponent = getEvidenceIcon(type);
                  return <IconComponent size={16} style={{ color: "#8B5CF6" }} />;
                })()}
                <h4
                  className="text-sm font-semibold"
                  style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
                >
                  {type}
                </h4>
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                  style={{
                    background: "rgba(124, 58, 237, 0.1)",
                    color: "#8B5CF6",
                    fontFamily: "monospace, monospace",
                  }}
                >
                  {items.length}
                </span>
              </div>
              <div className="space-y-2 mb-6">
                {items.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="rounded-lg p-4 border flex items-start justify-between gap-4"
                    style={{
                      background: "rgba(11, 11, 20, 0.7)",
                      backdropFilter: "blur(12px)",
                      borderColor: "rgba(255, 255, 255, 0.04)",
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <h5
                        className="text-sm font-medium truncate"
                        style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
                      >
                        {item.title}
                      </h5>
                      {item.description ? (
                        <p
                          className="text-xs mt-1 line-clamp-2"
                          style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
                        >
                          {item.description}
                        </p>
                      ) : null}
                      <div className="flex items-center gap-3 mt-2">
                        {item.date ? (
                          <span
                            className="text-[11px]"
                            style={{ fontFamily: "monospace, monospace", color: "#3A3A60" }}
                          >
                            {item.date}
                          </span>
                        ) : null}
                        {item.link ? (
                          <a
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] hover:underline"
                            style={{ fontFamily: "monospace, monospace", color: "#8B5CF6" }}
                          >
                            View Link
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))
        : null}
    </div>
  );
}
