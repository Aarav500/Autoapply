"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { MapPin, ArrowRight, TrendingUp, TrendingDown, DollarSign, Home, Car, Utensils, Zap, Briefcase, Sparkles } from "lucide-react";

const C = {
  bgSurface: "#0C0C14",
  bgElevated: "#111120",
  accent: "#8B5CF6",
  accentBright: "#7C3AED",
  accentMuted: "rgba(124,58,237,0.12)",
  accentBorder: "rgba(124,58,237,0.25)",
  textPrimary: "#F0F0FF",
  textSecondary: "#9090B8",
  textMuted: "#3A3A60",
  borderSubtle: "rgba(255,255,255,0.05)",
  cardBorder: "rgba(255,255,255,0.07)",
  green: "#34D399",
  greenMuted: "rgba(52,211,153,0.1)",
  red: "#F87171",
  redMuted: "rgba(248,113,113,0.1)",
  amber: "#FBBF24",
};

interface ReloResult {
  adjustedSalary: number;
  adjustmentPercent: number;
  costOfLivingIndex: { current: number; target: number };
  breakdown: {
    housing: { current: number; target: number; diff: number };
    food: { current: number; target: number; diff: number };
    transport: { current: number; target: number; diff: number };
    utilities: { current: number; target: number; diff: number };
    tax: { current: number; target: number; diff: number };
  };
  purchasingPower: string;
  recommendation: string;
  negotiationTip: string;
  topEmployers: string[];
  averageSalaryRange: { min: number; max: number };
  currentCity: string;
  targetCity: string;
  currentSalary: number;
  currency: string;
}

const POPULAR_CITIES = ["San Francisco, CA", "New York, NY", "Austin, TX", "Seattle, WA", "Chicago, IL", "Remote", "London, UK", "Toronto, CA", "Singapore", "Berlin, DE"];

const formatK = (n: number) => `$${Math.round(n / 1000)}k`;

export default function RelocatePage() {
  const [currentCity, setCurrentCity] = useState("");
  const [targetCity, setTargetCity] = useState("");
  const [currentSalary, setCurrentSalary] = useState("");
  const [jobTitle, setJobTitle] = useState("");

  const calcMutation = useMutation({
    mutationFn: () => apiFetch<{ data: ReloResult }>("/api/relocate", {
      method: "POST",
      body: JSON.stringify({ currentCity, targetCity, currentSalary: Number(currentSalary), jobTitle: jobTitle || undefined }),
    }),
  });

  const result = calcMutation.data as ReloResult | undefined;
  const isHigher = (result?.adjustmentPercent ?? 0) > 0;

  const breakdownItems = result ? [
    { label: "Housing", icon: Home, current: result.breakdown.housing.current, target: result.breakdown.housing.target, diff: result.breakdown.housing.diff },
    { label: "Food", icon: Utensils, current: result.breakdown.food.current, target: result.breakdown.food.target, diff: result.breakdown.food.diff },
    { label: "Transport", icon: Car, current: result.breakdown.transport.current, target: result.breakdown.transport.target, diff: result.breakdown.transport.diff },
    { label: "Utilities", icon: Zap, current: result.breakdown.utilities.current, target: result.breakdown.utilities.target, diff: result.breakdown.utilities.diff },
    { label: "Tax", icon: DollarSign, current: result.breakdown.tax.current, target: result.breakdown.tax.target, diff: result.breakdown.tax.diff },
  ] : [];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: C.accentMuted, border: `1px solid ${C.accentBorder}` }}>
          <MapPin size={20} style={{ color: C.accent }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: C.textPrimary, fontFamily: "'Inter', sans-serif" }}>Relocation Calculator</h1>
          <p className="text-sm mt-0.5" style={{ color: C.textSecondary, fontFamily: "'Inter', sans-serif" }}>Understand the real cost of moving cities</p>
        </div>
      </motion.div>

      {/* Input form */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-2xl p-6" style={{ background: C.bgSurface, border: `1px solid ${C.cardBorder}` }}>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-[11px] mb-1.5 block" style={{ color: C.textMuted, fontFamily: "'Inter', sans-serif" }}>Current City</label>
            <input
              value={currentCity}
              onChange={(e) => setCurrentCity(e.target.value)}
              placeholder="San Francisco, CA"
              className="w-full px-3 py-2.5 rounded-xl text-[13px] outline-none"
              style={{ background: "rgba(255,255,255,0.04)", border: `1px solid rgba(255,255,255,0.07)`, color: C.textPrimary, fontFamily: "'Inter', sans-serif" }}
            />
          </div>
          <div>
            <label className="text-[11px] mb-1.5 block" style={{ color: C.textMuted, fontFamily: "'Inter', sans-serif" }}>Target City</label>
            <input
              value={targetCity}
              onChange={(e) => setTargetCity(e.target.value)}
              placeholder="Austin, TX"
              className="w-full px-3 py-2.5 rounded-xl text-[13px] outline-none"
              style={{ background: "rgba(255,255,255,0.04)", border: `1px solid rgba(255,255,255,0.07)`, color: C.textPrimary, fontFamily: "'Inter', sans-serif" }}
            />
          </div>
          <div>
            <label className="text-[11px] mb-1.5 block" style={{ color: C.textMuted, fontFamily: "'Inter', sans-serif" }}>Current Salary (USD)</label>
            <input
              type="number"
              value={currentSalary}
              onChange={(e) => setCurrentSalary(e.target.value)}
              placeholder="150000"
              className="w-full px-3 py-2.5 rounded-xl text-[13px] outline-none"
              style={{ background: "rgba(255,255,255,0.04)", border: `1px solid rgba(255,255,255,0.07)`, color: C.textPrimary, fontFamily: "'Inter', sans-serif" }}
            />
          </div>
          <div>
            <label className="text-[11px] mb-1.5 block" style={{ color: C.textMuted, fontFamily: "'Inter', sans-serif" }}>Job Title (optional)</label>
            <input
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="Software Engineer"
              className="w-full px-3 py-2.5 rounded-xl text-[13px] outline-none"
              style={{ background: "rgba(255,255,255,0.04)", border: `1px solid rgba(255,255,255,0.07)`, color: C.textPrimary, fontFamily: "'Inter', sans-serif" }}
            />
          </div>
        </div>

        {/* Quick city chips */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {POPULAR_CITIES.map((city) => (
            <button
              key={city}
              onClick={() => targetCity ? setCurrentCity(city) : setTargetCity(city)}
              className="text-[11px] px-2.5 py-1 rounded-lg transition-all"
              style={{ background: "rgba(255,255,255,0.03)", color: C.textMuted, border: `1px solid ${C.borderSubtle}`, fontFamily: "'Inter', sans-serif" }}
            >
              {city}
            </button>
          ))}
        </div>

        <button
          onClick={() => calcMutation.mutate()}
          disabled={!currentCity || !targetCity || !currentSalary || calcMutation.isPending}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-semibold transition-all disabled:opacity-50"
          style={{ background: C.accentBright, color: "white", fontFamily: "'Inter', sans-serif", boxShadow: "0 2px 12px rgba(124,58,237,0.3)" }}
        >
          {calcMutation.isPending ? <><div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "white" }} /> Calculating…</> : <><Sparkles size={14} /> Calculate Relocation Cost</>}
        </button>
      </motion.div>

      {/* Results */}
      {result && (
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Main result */}
          <div className="rounded-2xl p-6" style={{ background: isHigher ? "rgba(248,113,113,0.06)" : "rgba(52,211,153,0.06)", border: `1px solid ${isHigher ? "rgba(248,113,113,0.2)" : "rgba(52,211,153,0.2)"}` }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <MapPin size={15} style={{ color: C.textMuted }} />
                <span className="text-[13px] font-medium" style={{ color: C.textSecondary, fontFamily: "'Inter', sans-serif" }}>{result.currentCity}</span>
                <ArrowRight size={14} style={{ color: C.textMuted }} />
                <span className="text-[13px] font-medium" style={{ color: C.textPrimary, fontFamily: "'Inter', sans-serif" }}>{result.targetCity}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {isHigher ? <TrendingUp size={14} style={{ color: C.red }} /> : <TrendingDown size={14} style={{ color: C.green }} />}
                <span className="text-[13px] font-bold" style={{ color: isHigher ? C.red : C.green, fontFamily: "'Inter', sans-serif" }}>
                  {isHigher ? "+" : ""}{result.adjustmentPercent}%
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-[11px] mb-1" style={{ color: C.textMuted, fontFamily: "'Inter', sans-serif" }}>Current Salary</p>
                <p className="text-xl font-bold" style={{ color: C.textSecondary, fontFamily: "'Inter', sans-serif" }}>${Number(result.currentSalary).toLocaleString()}</p>
              </div>
              <div className="flex items-center justify-center">
                <ArrowRight size={20} style={{ color: C.textMuted }} />
              </div>
              <div>
                <p className="text-[11px] mb-1" style={{ color: C.textMuted, fontFamily: "'Inter', sans-serif" }}>Equivalent Salary Needed</p>
                <p className="text-xl font-bold" style={{ color: isHigher ? C.red : C.green, fontFamily: "'Inter', sans-serif" }}>${result.adjustedSalary.toLocaleString()}</p>
              </div>
            </div>

            <div className="mt-4 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
              <p className="text-[12px] leading-relaxed" style={{ color: C.textSecondary, fontFamily: "'Inter', sans-serif" }}>{result.purchasingPower}</p>
            </div>
          </div>

          {/* COL index */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl p-4" style={{ background: C.bgSurface, border: `1px solid ${C.cardBorder}` }}>
              <p className="text-[11px] mb-2" style={{ color: C.textMuted, fontFamily: "'Inter', sans-serif" }}>Cost of Living Index</p>
              <div className="flex items-end gap-3">
                <div className="text-center">
                  <div className="text-2xl font-bold" style={{ color: C.textSecondary, fontFamily: "'Inter', sans-serif" }}>{result.costOfLivingIndex.current}</div>
                  <div className="text-[10px]" style={{ color: C.textMuted, fontFamily: "'Inter', sans-serif" }}>{result.currentCity.split(',')[0]}</div>
                </div>
                <ArrowRight size={14} style={{ color: C.textMuted }} />
                <div className="text-center">
                  <div className="text-2xl font-bold" style={{ color: isHigher ? C.red : C.green, fontFamily: "'Inter', sans-serif" }}>{result.costOfLivingIndex.target}</div>
                  <div className="text-[10px]" style={{ color: C.textMuted, fontFamily: "'Inter', sans-serif" }}>{result.targetCity.split(',')[0]}</div>
                </div>
              </div>
              <p className="text-[10px] mt-2" style={{ color: C.textMuted, fontFamily: "'Inter', sans-serif" }}>US average = 100</p>
            </div>

            <div className="rounded-xl p-4" style={{ background: C.bgSurface, border: `1px solid ${C.cardBorder}` }}>
              <p className="text-[11px] mb-2" style={{ color: C.textMuted, fontFamily: "'Inter', sans-serif" }}>Market Salary Range ({jobTitle || "Software Eng."})</p>
              <div className="text-xl font-bold" style={{ color: C.accent, fontFamily: "'Inter', sans-serif" }}>{formatK(result.averageSalaryRange.min)} – {formatK(result.averageSalaryRange.max)}</div>
              <p className="text-[11px] mt-1" style={{ color: C.textMuted, fontFamily: "'Inter', sans-serif" }}>in {result.targetCity}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {result.topEmployers.slice(0, 4).map((e) => (
                  <span key={e} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: C.accentMuted, color: C.accent, fontFamily: "'Inter', sans-serif" }}>{e}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Monthly breakdown */}
          <div className="rounded-2xl p-5" style={{ background: C.bgSurface, border: `1px solid ${C.cardBorder}` }}>
            <p className="text-[12px] font-semibold mb-4" style={{ color: C.textPrimary, fontFamily: "'Inter', sans-serif" }}>Monthly Cost Breakdown</p>
            <div className="space-y-3">
              {breakdownItems.map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <item.icon size={13} style={{ color: C.textMuted, flexShrink: 0 }} />
                  <span className="text-[12px] w-20 flex-shrink-0" style={{ color: C.textSecondary, fontFamily: "'Inter', sans-serif" }}>{item.label}</span>
                  <div className="flex-1 flex items-center gap-2">
                    <span className="text-[12px] w-16 text-right" style={{ color: C.textMuted, fontFamily: "monospace" }}>${item.current.toLocaleString()}</span>
                    <ArrowRight size={10} style={{ color: C.textMuted, flexShrink: 0 }} />
                    <span className="text-[12px] w-16" style={{ color: C.textPrimary, fontFamily: "monospace" }}>${item.target.toLocaleString()}</span>
                    <span className="text-[11px] ml-auto" style={{ color: item.diff > 0 ? C.red : item.diff < 0 ? C.green : C.textMuted, fontFamily: "'Inter', sans-serif" }}>
                      {item.diff > 0 ? "+" : ""}{item.diff > 0 || item.diff < 0 ? `$${Math.abs(item.diff).toLocaleString()}/mo` : "same"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tips */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl p-4" style={{ background: "rgba(52,211,153,0.05)", border: "1px solid rgba(52,211,153,0.15)" }}>
              <div className="flex items-center gap-2 mb-2">
                <Briefcase size={12} style={{ color: C.green }} />
                <span className="text-[11px] font-semibold" style={{ color: C.green, fontFamily: "'Inter', sans-serif" }}>Negotiation Tip</span>
              </div>
              <p className="text-[12px] leading-relaxed" style={{ color: C.textSecondary, fontFamily: "'Inter', sans-serif" }}>{result.negotiationTip}</p>
            </div>
            <div className="rounded-xl p-4" style={{ background: C.accentMuted, border: `1px solid ${C.accentBorder}` }}>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={12} style={{ color: C.accent }} />
                <span className="text-[11px] font-semibold" style={{ color: C.accent, fontFamily: "'Inter', sans-serif" }}>Recommendation</span>
              </div>
              <p className="text-[12px] leading-relaxed" style={{ color: C.textSecondary, fontFamily: "'Inter', sans-serif" }}>{result.recommendation}</p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
