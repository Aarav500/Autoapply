"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useState } from "react";
import { Github, Search, Star, GitFork, ExternalLink, AlertCircle, CheckCircle2, ArrowUp } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

interface SectionScore {
  score: number;
  suggestions: string[];
}

interface AnalysisResult {
  overall_score: number;
  sections: {
    bio: SectionScore;
    readme: SectionScore;
    repos: SectionScore;
    contributions: SectionScore;
  };
}

interface RepoInfo {
  name: string;
  description: string;
  stars: number;
  forks: number;
  language: string;
  topics: string[];
  isForked: boolean;
}

interface ProfileInfo {
  username: string;
  name: string;
  bio: string;
  avatarUrl: string;
  publicRepos: number;
  followers: number;
  following: number;
  location: string;
  company: string;
  blog: string;
  createdAt: string;
  hasReadme: boolean;
}

export default function GitHubOptimizerPage() {
  const [username, setUsername] = useState("");
  const [targetRole, setTargetRole] = useState("");

  const analyzeMutation = useMutation({
    mutationFn: (data: { username: string; targetRole?: string }) =>
      apiFetch<{ data: { analysis: AnalysisResult; profile: ProfileInfo; topRepos: RepoInfo[] } }>("/api/optimize/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
  });

  const handleAnalyze = () => {
    if (!username.trim()) return;
    analyzeMutation.mutate({
      username: username.trim(),
      targetRole: targetRole.trim() || undefined,
    });
  };

  const result = analyzeMutation.data as Record<string, unknown> | undefined;
  const resultData = result?.data as Record<string, unknown> | undefined;
  const analysis = resultData?.analysis as AnalysisResult | undefined;
  const profile = resultData?.profile as ProfileInfo | undefined;
  const topRepos = (resultData?.topRepos as RepoInfo[]) || [];

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

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ background: "rgba(0, 255, 224, 0.08)", border: "1px solid rgba(0, 255, 224, 0.2)" }}
        >
          <Github size={20} className="text-[#00FFE0]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Outfit', sans-serif", color: "#E8E8F0" }}>
            GitHub Profile Optimizer
          </h1>
          <p className="text-sm" style={{ fontFamily: "'DM Sans', sans-serif", color: "#7E7E98" }}>
            Analyze and optimize your GitHub profile for recruiters
          </p>
        </div>
      </div>

      {/* Search Form */}
      <div
        className="p-6 rounded-lg border"
        style={{ background: "rgba(15, 15, 24, 0.7)", backdropFilter: "blur(12px)", borderColor: "rgba(255, 255, 255, 0.04)" }}
      >
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-[12px] mb-2" style={{ fontFamily: "'Outfit', sans-serif", color: "#7E7E98" }}>
              GitHub Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
              placeholder="e.g. octocat"
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
          <div className="flex items-end">
            <button
              onClick={handleAnalyze}
              disabled={!username.trim() || analyzeMutation.isPending}
              className="px-6 py-2.5 rounded-lg font-semibold transition-all disabled:opacity-50"
              style={{ background: "#00FFE0", color: "#050508", fontFamily: "'Outfit', sans-serif" }}
            >
              <Search size={16} className="inline mr-2" />
              {analyzeMutation.isPending ? "Analyzing..." : "Analyze"}
            </button>
          </div>
        </div>
      </div>

      {/* Loading */}
      {analyzeMutation.isPending && (
        <div className="text-center py-12">
          <div
            className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-4"
            style={{ borderColor: "rgba(0, 255, 224, 0.3)", borderTopColor: "transparent" }}
          />
          <p className="text-[#7E7E98]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Fetching GitHub data and running AI analysis...
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
            {(analyzeMutation.error as Error)?.message || "Failed to analyze profile. Please check the username and try again."}
          </p>
        </div>
      )}

      {/* Results */}
      {analysis && profile && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Profile Summary + Overall Score */}
          <div className="flex gap-4">
            {/* Profile Card */}
            <div
              className="flex-1 p-6 rounded-lg border"
              style={{ background: "rgba(15, 15, 24, 0.7)", backdropFilter: "blur(12px)", borderColor: "rgba(255, 255, 255, 0.04)" }}
            >
              <div className="flex items-center gap-4 mb-4">
                {profile.avatarUrl && (
                  <Image
                    src={profile.avatarUrl}
                    alt={profile.username}
                    width={64}
                    height={64}
                    className="w-16 h-16 rounded-full"
                    style={{ border: "2px solid rgba(0, 255, 224, 0.2)" }}
                    unoptimized
                  />
                )}
                <div>
                  <h2 className="text-lg font-bold" style={{ fontFamily: "'Outfit', sans-serif", color: "#E8E8F0" }}>
                    {profile.name || profile.username}
                  </h2>
                  <p className="text-sm" style={{ fontFamily: "'DM Sans', sans-serif", color: "#7E7E98" }}>
                    @{profile.username}
                  </p>
                  {profile.bio && (
                    <p className="text-sm mt-1" style={{ fontFamily: "'DM Sans', sans-serif", color: "#7E7E98" }}>
                      {profile.bio}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-6 text-sm" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                <span className="text-[#7E7E98]">
                  <span className="text-[#E8E8F0] font-bold">{profile.publicRepos}</span> repos
                </span>
                <span className="text-[#7E7E98]">
                  <span className="text-[#E8E8F0] font-bold">{profile.followers}</span> followers
                </span>
                <span className="text-[#7E7E98]">
                  <span className="text-[#E8E8F0] font-bold">{profile.following}</span> following
                </span>
              </div>
              {(profile.location || profile.company) && (
                <div className="flex gap-4 mt-3 text-xs text-[#4A4A64]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  {profile.location && <span>{profile.location}</span>}
                  {profile.company && <span>{profile.company}</span>}
                </div>
              )}
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

          {/* Section Scores */}
          <div className="grid grid-cols-2 gap-4">
            {(["bio", "readme", "repos", "contributions"] as const).map((section) => {
              const data = analysis.sections[section];
              const labels: Record<string, string> = {
                bio: "Bio & Profile",
                readme: "Profile README",
                repos: "Repositories",
                contributions: "Contributions",
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
                        <ArrowUp size={14} className="text-[#00FFE0] flex-shrink-0 mt-0.5" />
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

          {/* Top Repos */}
          {topRepos.length > 0 && (
            <div
              className="p-6 rounded-lg border"
              style={{ background: "rgba(15, 15, 24, 0.7)", backdropFilter: "blur(12px)", borderColor: "rgba(255, 255, 255, 0.04)" }}
            >
              <h3 className="text-sm font-semibold mb-4" style={{ fontFamily: "'Outfit', sans-serif", color: "#E8E8F0" }}>
                Top Repositories
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {topRepos.map((repo) => (
                  <a
                    key={repo.name}
                    href={`https://github.com/${profile.username}/${repo.name}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-lg border transition-all hover:border-[rgba(0,255,224,0.2)]"
                    style={{ background: "rgba(255, 255, 255, 0.02)", borderColor: "rgba(255, 255, 255, 0.04)" }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[13px] font-semibold truncate" style={{ fontFamily: "'Outfit', sans-serif", color: "#E8E8F0" }}>
                        {repo.name}
                      </span>
                      <ExternalLink size={12} className="text-[#4A4A64] flex-shrink-0" />
                    </div>
                    {repo.description && (
                      <p className="text-[11px] text-[#7E7E98] mb-2 line-clamp-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        {repo.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-[11px]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                      {repo.language && <span className="text-[#00FFE0]">{repo.language}</span>}
                      <span className="text-[#7E7E98] flex items-center gap-1">
                        <Star size={10} /> {repo.stars}
                      </span>
                      <span className="text-[#7E7E98] flex items-center gap-1">
                        <GitFork size={10} /> {repo.forks}
                      </span>
                      {repo.isForked && <span className="text-[#4A4A64]">(fork)</span>}
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* View on GitHub */}
          <div className="text-center">
            <a
              href={`https://github.com/${profile.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg border transition-all hover:bg-white/5"
              style={{ borderColor: "rgba(255, 255, 255, 0.08)", fontFamily: "'Outfit', sans-serif", color: "#7E7E98" }}
            >
              <Github size={16} />
              View Profile on GitHub
              <ExternalLink size={14} />
            </a>
          </div>
        </motion.div>
      )}

      {/* Empty State */}
      {!analyzeMutation.isPending && !analysis && !analyzeMutation.isError && (
        <div className="text-center py-16">
          <Github size={48} className="mx-auto mb-4 text-[#4A4A64]" />
          <p className="text-lg font-semibold mb-2" style={{ fontFamily: "'Outfit', sans-serif", color: "#7E7E98" }}>
            Enter a GitHub username to get started
          </p>
          <p className="text-sm text-[#4A4A64]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            AI will analyze the profile and provide actionable suggestions to impress recruiters
          </p>
        </div>
      )}
    </div>
  );
}
