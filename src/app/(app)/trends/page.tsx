"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { TrendingUp, TrendingDown, Zap, Sparkles, RefreshCw, Star, DollarSign, Building2 } from "lucide-react";

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
  teal: "#06B6D4",
};

interface TrendingSkill {
  skill: string;
  category: string;
  demandScore: number;
  growthPercent: number;
  avgSalaryPremium: number;
  topCompanies: string[];
  description: string;
}

interface DecliningSkill {
  skill: string;
  reason: string;
  dropPercent: number;
}

interface EmergingRole {
  role: string;
  salaryRange: string;
  skills: string[];
  outlook: string;
}

interface TrendsData {
  trending: TrendingSkill[];
  declining: DecliningSkill[];
  emergingRoles: EmergingRole[];
  marketInsight: string;
  lastUpdated: string;
}

const DOMAINS = ["Software Engineering", "Data Science / ML", "DevOps / Cloud", "Cybersecurity", "Product Management", "Design / UX", "Finance / Quant"];

const getDemandColor = (score: number) => score >= 80 ? C.green : score >= 60 ? C.amber : C.textMuted;

export default function TrendsPage() {
  const [domain, setDomain] = useState("Software Engineering");
  const [location, setLocation] = useState("US");

  const trendsMutation = useMutation({
    mutationFn: () => apiFetch<{ data: TrendsData }>("/api/trends", {
      method: "POST",
      body: JSON.stringify({ domain, location, refresh: false }),
    }),
  });

  const data = trendsMutation.data as TrendsData | undefined;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: C.accentMuted, border: `1px solid ${C.accentBorder}` }}>
            <TrendingUp size={20} style={{ color: C.accent }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: C.textPrimary, fontFamily: "'Inter', sans-serif" }}>Skill Trends</h1>
            <p className="text-sm mt-0.5" style={{ color: C.textSecondary, fontFamily: "'Inter', sans-serif" }}>AI-powered analysis of in-demand skills & emerging roles</p>
          </div>
        </div>
        {data && (
          <button
            onClick={() => trendsMutation.mutate()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] transition-all"
            style={{ background: "rgba(255,255,255,0.04)", color: C.textSecondary, border: `1px solid ${C.borderSubtle}`, fontFamily: "'Inter', sans-serif" }}
          >
            <RefreshCw size={12} /> Refresh
          </button>
        )}
      </motion.div>

      {/* Controls */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-2xl p-5" style={{ background: C.bgSurface, border: `1px solid ${C.cardBorder}` }}>
        <div className="flex flex-wrap gap-2 mb-4">
          {DOMAINS.map((d) => (
            <button key={d} onClick={() => setDomain(d)} className="px-3 py-1.5 rounded-xl text-[12px] font-medium transition-all" style={{ background: domain === d ? C.accentBright : "rgba(255,255,255,0.04)", color: domain === d ? "white" : C.textSecondary, border: `1px solid ${domain === d ? "transparent" : C.borderSubtle}`, fontFamily: "'Inter', sans-serif" }}>
              {d}
            </button>
          ))}
        </div>
        <div className="flex gap-3 items-center">
          <select value={location} onChange={(e) => setLocation(e.target.value)} className="px-3 py-2 rounded-xl text-[12px] outline-none cursor-pointer" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid rgba(255,255,255,0.07)`, color: C.textPrimary, fontFamily: "'Inter', sans-serif" }}>
            {["US", "UK", "Canada", "Australia", "Singapore", "India", "Global"].map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          <button
            onClick={() => trendsMutation.mutate()}
            disabled={trendsMutation.isPending}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-[13px] font-semibold transition-all disabled:opacity-50"
            style={{ background: C.accentBright, color: "white", fontFamily: "'Inter', sans-serif", boxShadow: "0 2px 12px rgba(124,58,237,0.3)" }}
          >
            {trendsMutation.isPending ? <><div className="w-3 h-3 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "white" }} /> Analyzing…</> : <><Sparkles size={13} /> Analyze Trends</>}
          </button>
        </div>
      </motion.div>

      {!data && !trendsMutation.isPending && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl" style={{ background: C.accentMuted }}>📈</div>
          <p className="text-base font-semibold" style={{ color: C.textPrimary, fontFamily: "'Inter', sans-serif" }}>Select a domain and analyze</p>
          <p className="text-sm" style={{ color: C.textSecondary, fontFamily: "'Inter', sans-serif" }}>Get AI-powered insights on in-demand skills for your field</p>
        </div>
      )}

      {trendsMutation.isPending && (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: C.accentBorder, borderTopColor: C.accent }} />
        </div>
      )}

      {data && (
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          {/* Market insight banner */}
          <div className="rounded-xl p-4" style={{ background: C.accentMuted, border: `1px solid ${C.accentBorder}` }}>
            <div className="flex items-center gap-2 mb-1.5">
              <Zap size={13} style={{ color: C.accent }} />
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: C.accent, fontFamily: "'Inter', sans-serif" }}>Market Insight</span>
            </div>
            <p className="text-[13px] leading-relaxed" style={{ color: C.textPrimary, fontFamily: "'Inter', sans-serif" }}>{data.marketInsight}</p>
          </div>

          <div className="grid grid-cols-3 gap-5">
            {/* Trending skills */}
            <div className="col-span-2 space-y-3">
              <h2 className="text-[13px] font-semibold flex items-center gap-2" style={{ color: C.textPrimary, fontFamily: "'Inter', sans-serif" }}>
                <TrendingUp size={14} style={{ color: C.green }} /> Trending Skills
              </h2>
              {data.trending.map((skill, i) => (
                <motion.div key={skill.skill} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                  className="rounded-xl p-4" style={{ background: C.bgSurface, border: `1px solid ${C.cardBorder}` }}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-semibold" style={{ color: C.textPrimary, fontFamily: "'Inter', sans-serif" }}>{skill.skill}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.05)", color: C.textMuted, fontFamily: "'Inter', sans-serif" }}>{skill.category}</span>
                      </div>
                      <p className="text-[11px] mt-0.5" style={{ color: C.textSecondary, fontFamily: "'Inter', sans-serif" }}>{skill.description}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
                      <TrendingUp size={11} style={{ color: C.green }} />
                      <span className="text-[12px] font-bold" style={{ color: C.green, fontFamily: "monospace" }}>+{skill.growthPercent}%</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {/* Demand bar */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px]" style={{ color: C.textMuted, fontFamily: "'Inter', sans-serif" }}>Demand</span>
                        <span className="text-[10px] font-bold" style={{ color: getDemandColor(skill.demandScore), fontFamily: "monospace" }}>{skill.demandScore}/100</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${skill.demandScore}%` }}
                          transition={{ delay: i * 0.04 + 0.2, duration: 0.6 }}
                          className="h-full rounded-full"
                          style={{ background: getDemandColor(skill.demandScore) }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <DollarSign size={11} style={{ color: C.amber }} />
                      <span className="text-[11px]" style={{ color: C.amber, fontFamily: "'Inter', sans-serif" }}>+{skill.avgSalaryPremium}% salary</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {skill.topCompanies.slice(0, 4).map((co) => (
                      <span key={co} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.04)", color: C.textMuted, fontFamily: "'Inter', sans-serif" }}>
                        <Building2 size={9} />{co}
                      </span>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Right column */}
            <div className="space-y-4">
              {/* Declining */}
              <div>
                <h2 className="text-[13px] font-semibold flex items-center gap-2 mb-3" style={{ color: C.textPrimary, fontFamily: "'Inter', sans-serif" }}>
                  <TrendingDown size={14} style={{ color: C.red }} /> Declining
                </h2>
                <div className="space-y-2">
                  {data.declining.map((skill, i) => (
                    <motion.div key={skill.skill} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                      className="rounded-xl p-3" style={{ background: C.redMuted, border: "1px solid rgba(248,113,113,0.12)" }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[12px] font-medium" style={{ color: C.textPrimary, fontFamily: "'Inter', sans-serif" }}>{skill.skill}</span>
                        <span className="text-[11px] font-bold" style={{ color: C.red, fontFamily: "monospace" }}>-{skill.dropPercent}%</span>
                      </div>
                      <p className="text-[10px]" style={{ color: C.textMuted, fontFamily: "'Inter', sans-serif" }}>{skill.reason}</p>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Emerging roles */}
              <div>
                <h2 className="text-[13px] font-semibold flex items-center gap-2 mb-3" style={{ color: C.textPrimary, fontFamily: "'Inter', sans-serif" }}>
                  <Star size={14} style={{ color: C.amber }} /> Emerging Roles
                </h2>
                <div className="space-y-2">
                  {data.emergingRoles.map((role, i) => (
                    <motion.div key={role.role} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 + 0.2 }}
                      className="rounded-xl p-3" style={{ background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.15)" }}>
                      <p className="text-[12px] font-semibold mb-0.5" style={{ color: C.textPrimary, fontFamily: "'Inter', sans-serif" }}>{role.role}</p>
                      <p className="text-[11px] mb-1.5" style={{ color: C.amber, fontFamily: "monospace" }}>{role.salaryRange}</p>
                      <p className="text-[10px] mb-1.5" style={{ color: C.textMuted, fontFamily: "'Inter', sans-serif" }}>{role.outlook}</p>
                      <div className="flex flex-wrap gap-1">
                        {role.skills.slice(0, 3).map((s) => (
                          <span key={s} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(251,191,36,0.1)", color: C.amber, fontFamily: "'Inter', sans-serif" }}>{s}</span>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
