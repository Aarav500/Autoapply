"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Linkedin, ArrowUp, AlertCircle, Copy, CheckCircle2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

interface SectionScore {
  score: number;
  suggestions: string[];
}

interface AnalysisResult {
  overall_score: number;
  headline_options: string[];
  sections: {
    headline: SectionScore;
    about: SectionScore;
    experience: SectionScore;
    skills: SectionScore;
    recommendations: SectionScore;
  };
}

interface ProfileSummary {
  name: string;
  headline: string;
  experienceCount: number;
  skillsCount: number;
  educationCount: number;
}

export default function LinkedInOptimizerPage() {
  const [targetRole, setTargetRole] = useState("");
  const [targetIndustry, setTargetIndustry] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const analyzeMutation = useMutation({
    mutationFn: (data: { targetRole?: string; targetIndustry?: string }) =>
      apiFetch<{ data: { analysis: AnalysisResult; profileSummary: ProfileSummary } }>("/api/optimize/linkedin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
  });

  const handleAnalyze = () => {
    analyzeMutation.mutate({
      targetRole: targetRole.trim() || undefined,
      targetIndustry: targetIndustry.trim() || undefined,
    });
  };

  const result = analyzeMutation.data as Record<string, unknown> | undefined;
  const resultData = result?.data as Record<string, unknown> | undefined;
  const analysis = resultData?.analysis as AnalysisResult | undefined;
  const profileSummary = resultData?.profileSummary as ProfileSummary | undefined;

  const getScoreColor = (score: number) => {
    if (score >= 90) return "#00E676";
    if (score >= 75) return "#00FFE0";
    if (score >= 60) return "#FFAB00";
    return "#FF4757";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return "Excellent";
    if (score >= 75) return "Good";
    if (score >= 60) return "Needs Work";
    return "Poor";
  };

  const copyHeadline = (headline: string, index: number) => {
    navigator.clipboard.writeText(headline);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ background: "rgba(83, 109, 254, 0.08)", border: "1px solid rgba(83, 109, 254, 0.2)" }}
        >
          <Linkedin size={20} style={{ color: "#536DFE" }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Outfit', sans-serif", color: "#E8E8F0" }}>
            LinkedIn Profile Optimizer
          </h1>
          <p className="text-sm" style={{ fontFamily: "'DM Sans', sans-serif", color: "#7E7E98" }}>
            Optimize your LinkedIn profile using your saved profile data
          </p>
        </div>
      </div>

      {/* Analysis Form */}
      <div
        className="p-6 rounded-lg border"
        style={{ background: "rgba(15, 15, 24, 0.7)", backdropFilter: "blur(12px)", borderColor: "rgba(255, 255, 255, 0.04)" }}
      >
        <p className="text-[12px] mb-4" style={{ fontFamily: "'DM Sans', sans-serif", color: "#7E7E98" }}>
          This analyzer uses your saved AutoApply profile. Make sure your profile is complete for the best results.
        </p>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-[12px] mb-2" style={{ fontFamily: "'Outfit', sans-serif", color: "#7E7E98" }}>
              Target Role (optional)
            </label>
            <input
              type="text"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
              placeholder="e.g. Senior Full-Stack Engineer"
              className="w-full px-4 py-2.5 rounded-lg border bg-transparent outline-none"
              style={{
                borderColor: "rgba(255, 255, 255, 0.08)",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "14px",
                color: "#E8E8F0",
              }}
            />
          </div>
          <div className="flex-1">
            <label className="block text-[12px] mb-2" style={{ fontFamily: "'Outfit', sans-serif", color: "#7E7E98" }}>
              Target Industry (optional)
            </label>
            <input
              type="text"
              value={targetIndustry}
              onChange={(e) => setTargetIndustry(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
              placeholder="e.g. FinTech, SaaS"
              className="w-full px-4 py-2.5 rounded-lg border bg-transparent outline-none"
              style={{
                borderColor: "rgba(255, 255, 255, 0.08)",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "14px",
                color: "#E8E8F0",
              }}
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleAnalyze}
              disabled={analyzeMutation.isPending}
              className="px-6 py-2.5 rounded-lg font-semibold transition-all disabled:opacity-50"
              style={{ background: "#536DFE", color: "#FFFFFF", fontFamily: "'Outfit', sans-serif" }}
            >
              {analyzeMutation.isPending ? "Analyzing..." : "Optimize"}
            </button>
          </div>
        </div>
      </div>

      {/* Loading */}
      {analyzeMutation.isPending && (
        <div className="text-center py-12">
          <div
            className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-4"
            style={{ borderColor: "rgba(83, 109, 254, 0.3)", borderTopColor: "transparent" }}
          />
          <p className="text-[#7E7E98]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Analyzing your profile with AI...
          </p>
        </div>
      )}

      {/* Error */}
      {analyzeMutation.isError && (
        <div
          className="p-4 rounded-lg flex items-center gap-3"
          style={{ background: "rgba(255, 71, 87, 0.08)", border: "1px solid rgba(255, 71, 87, 0.2)" }}
        >
          <AlertCircle size={20} className="text-[#FF4757]" />
          <p className="text-[#FF4757] text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            {(analyzeMutation.error as Error)?.message || "Failed to analyze profile. Make sure your profile is complete."}
          </p>
        </div>
      )}

      {/* Results */}
      {analysis && profileSummary && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Profile Summary + Overall Score */}
          <div className="flex gap-4">
            <div
              className="flex-1 p-6 rounded-lg border"
              style={{ background: "rgba(15, 15, 24, 0.7)", backdropFilter: "blur(12px)", borderColor: "rgba(255, 255, 255, 0.04)" }}
            >
              <h2 className="text-lg font-bold mb-1" style={{ fontFamily: "'Outfit', sans-serif", color: "#E8E8F0" }}>
                {profileSummary.name}
              </h2>
              <p className="text-sm mb-3" style={{ fontFamily: "'DM Sans', sans-serif", color: "#7E7E98" }}>
                {profileSummary.headline || "No headline set"}
              </p>
              <div className="flex gap-6 text-sm" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                <span className="text-[#7E7E98]">
                  <span className="text-[#E8E8F0] font-bold">{profileSummary.experienceCount}</span> positions
                </span>
                <span className="text-[#7E7E98]">
                  <span className="text-[#E8E8F0] font-bold">{profileSummary.skillsCount}</span> skills
                </span>
                <span className="text-[#7E7E98]">
                  <span className="text-[#E8E8F0] font-bold">{profileSummary.educationCount}</span> education
                </span>
              </div>
            </div>

            {/* Overall Score */}
            <div
              className="w-[200px] p-6 rounded-lg border flex flex-col items-center justify-center"
              style={{ background: "rgba(15, 15, 24, 0.7)", backdropFilter: "blur(12px)", borderColor: "rgba(255, 255, 255, 0.04)" }}
            >
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center mb-3"
                style={{
                  border: `3px solid ${getScoreColor(analysis.overall_score)}`,
                  background: `rgba(${getScoreColor(analysis.overall_score)}, 0.05)`,
                }}
              >
                <span
                  className="text-3xl font-bold"
                  style={{ fontFamily: "'IBM Plex Mono', monospace", color: getScoreColor(analysis.overall_score) }}
                >
                  {analysis.overall_score}
                </span>
              </div>
              <span className="text-sm font-semibold" style={{ fontFamily: "'Outfit', sans-serif", color: getScoreColor(analysis.overall_score) }}>
                {getScoreLabel(analysis.overall_score)}
              </span>
              <span className="text-[11px] text-[#4A4A64] mt-1">Overall Score</span>
            </div>
          </div>

          {/* Headline Options */}
          {analysis.headline_options && analysis.headline_options.length > 0 && (
            <div
              className="p-6 rounded-lg border"
              style={{ background: "rgba(15, 15, 24, 0.7)", backdropFilter: "blur(12px)", borderColor: "rgba(255, 255, 255, 0.04)" }}
            >
              <h3 className="text-sm font-semibold mb-4" style={{ fontFamily: "'Outfit', sans-serif", color: "#E8E8F0" }}>
                Suggested Headlines
              </h3>
              <div className="space-y-2">
                {analysis.headline_options.map((headline, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 rounded-lg border transition-all hover:border-[rgba(83,109,254,0.2)]"
                    style={{ background: "rgba(255, 255, 255, 0.02)", borderColor: "rgba(255, 255, 255, 0.04)" }}
                  >
                    <span className="text-[13px] flex-1" style={{ fontFamily: "'DM Sans', sans-serif", color: "#E8E8F0" }}>
                      {headline}
                    </span>
                    <button
                      onClick={() => copyHeadline(headline, i)}
                      className="ml-3 p-1.5 rounded hover:bg-white/5 transition-all flex-shrink-0"
                    >
                      {copiedIndex === i ? (
                        <CheckCircle2 size={14} className="text-[#00E676]" />
                      ) : (
                        <Copy size={14} className="text-[#4A4A64]" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section Scores */}
          <div className="grid grid-cols-2 gap-4">
            {(["headline", "about", "experience", "skills", "recommendations"] as const).map((section) => {
              const data = analysis.sections[section];
              const labels: Record<string, string> = {
                headline: "Headline",
                about: "About Section",
                experience: "Experience",
                skills: "Skills & Endorsements",
                recommendations: "Recommendations",
              };
              return (
                <div
                  key={section}
                  className="p-5 rounded-lg border"
                  style={{ background: "rgba(15, 15, 24, 0.7)", backdropFilter: "blur(12px)", borderColor: "rgba(255, 255, 255, 0.04)" }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold" style={{ fontFamily: "'Outfit', sans-serif", color: "#E8E8F0" }}>
                      {labels[section]}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span
                        className="text-lg font-bold"
                        style={{ fontFamily: "'IBM Plex Mono', monospace", color: getScoreColor(data.score) }}
                      >
                        {data.score}
                      </span>
                      <span className="text-[10px] text-[#4A4A64]">/100</span>
                    </div>
                  </div>
                  {/* Score bar */}
                  <div className="h-1.5 rounded-full mb-4" style={{ background: "rgba(255, 255, 255, 0.04)" }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${data.score}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className="h-full rounded-full"
                      style={{ background: getScoreColor(data.score) }}
                    />
                  </div>
                  <ul className="space-y-2">
                    {data.suggestions.map((suggestion, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <ArrowUp size={14} className="text-[#536DFE] flex-shrink-0 mt-0.5" />
                        <span className="text-[12px] leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif", color: "#7E7E98" }}>
                          {suggestion}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Empty State */}
      {!analyzeMutation.isPending && !analysis && !analyzeMutation.isError && (
        <div className="text-center py-16">
          <Linkedin size={48} className="mx-auto mb-4 text-[#4A4A64]" />
          <p className="text-lg font-semibold mb-2" style={{ fontFamily: "'Outfit', sans-serif", color: "#7E7E98" }}>
            Optimize your LinkedIn profile
          </p>
          <p className="text-sm text-[#4A4A64] mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Uses your saved AutoApply profile to generate LinkedIn-specific recommendations
          </p>
          <button
            onClick={handleAnalyze}
            disabled={analyzeMutation.isPending}
            className="px-6 py-2.5 rounded-lg font-semibold transition-all"
            style={{ background: "#536DFE", color: "#FFFFFF", fontFamily: "'Outfit', sans-serif" }}
          >
            Analyze My Profile
          </button>
        </div>
      )}
    </div>
  );
}
