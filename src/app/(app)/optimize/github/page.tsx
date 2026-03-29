"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useState, useEffect } from "react";
import {
  Github,
  Search,
  Star,
  GitFork,
  ExternalLink,
  AlertCircle,
  ArrowUp,
  Pin,
  BookOpen,
  Users,
  FileText,
  Copy,
  Check,
  Sparkles,
  Target,
  Tag,
  Zap,
  Lock,
  GitPullRequest,
  X,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

// === Shared Interfaces ===

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

interface ScoreHistoryEntry {
  score: number;
  date: string;
  username: string;
}

interface ScoreHistoryData {
  history: ScoreHistoryEntry[];
  latest: ScoreHistoryEntry | null;
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

interface PinRecommendation {
  repo: string;
  reason: string;
  improvements: string[];
}

interface NamingSuggestion {
  current: string;
  suggested: string;
  reason: string;
}

interface DescriptionImprovement {
  repo: string;
  current: string;
  suggested: string;
}

interface PortfolioResult {
  pin_recommendations: PinRecommendation[];
  naming_suggestions: NamingSuggestion[];
  description_improvements: DescriptionImprovement[];
  overall_strategy: string[];
}

interface RecommendedProject {
  project_name: string;
  description: string;
  why_contribute: string;
  good_first_issues: string[];
  skills_match: string[];
  difficulty: string;
}

interface ContributionResult {
  recommended_projects: RecommendedProject[];
  contribution_strategy: string[];
  weekly_goals: string[];
}

interface ReadmeResult {
  content: string;
  sections: string[];
}

interface UserProfile {
  name?: string;
  headline?: string;
  skills?: Array<{ name: string; proficiency?: string }> | string[];
  experience?: Array<{ title: string; company: string; description?: string }>;
  socialLinks?: Array<{ platform: string; url: string }>;
  preferences?: {
    targetRoles?: string[];
    targetCompanies?: string[];
    industries?: string[];
  };
}

interface AutoOptimizeGitHubResult {
  portfolio: PortfolioResult | null;
  contributions: ContributionResult | null;
  readme: ReadmeResult | null;
  username: string;
  derivedFields: {
    languages: string[];
    interests: string[];
    targetRole: string | null;
  };
  errors: {
    portfolio: string | null;
    contributions: string | null;
  };
}

function extractSkillNamesClient(skills: UserProfile['skills']): string[] {
  if (!skills || !Array.isArray(skills)) return [];
  return skills.map((s) => {
    if (typeof s === 'string') return s;
    if (typeof s === 'object' && s !== null && 'name' in s) return (s as { name: string }).name;
    return String(s);
  });
}

function extractGitHubUsernameClient(profile: UserProfile): string | undefined {
  const links = profile.socialLinks || [];
  const ghLink = links.find((l) =>
    l.platform.toLowerCase() === 'github' ||
    l.url.toLowerCase().includes('github.com')
  );
  if (!ghLink) return undefined;
  const match = ghLink.url.match(/github\.com\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : undefined;
}

type TabId = "analysis" | "portfolio" | "contribute" | "readme";

const tabs: Array<{ id: TabId; label: string }> = [
  { id: "analysis", label: "Profile Analysis" },
  { id: "portfolio", label: "Portfolio" },
  { id: "contribute", label: "Contribute" },
  { id: "readme", label: "README Gen" },
];

// === Helper Functions ===

function getScoreColor(score: number): string {
  if (score >= 90) return "#34D399";
  if (score >= 75) return "#8B5CF6";
  if (score >= 60) return "#FBBF24";
  return "#F87171";
}

function getScoreLabel(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 60) return "Needs Work";
  return "Poor";
}

function getDifficultyColor(difficulty: string): string {
  switch (difficulty.toLowerCase()) {
    case "beginner":
      return "#34D399";
    case "intermediate":
      return "#FBBF24";
    case "advanced":
      return "#F87171";
    default:
      return "#9090B8";
  }
}

// === Card Wrapper ===

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`p-6 rounded-lg border ${className}`}
      style={{
        background: "rgba(11, 11, 20, 0.7)",
        backdropFilter: "blur(12px)",
        borderColor: "rgba(255, 255, 255, 0.04)",
      }}
    >
      {children}
    </div>
  );
}

// === Loading Spinner ===

function LoadingSpinner({ message }: { message: string }) {
  return (
    <div className="text-center py-12">
      <div
        className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-4"
        style={{ borderColor: "rgba(124, 58, 237, 0.3)", borderTopColor: "transparent" }}
      />
      <p className="text-[#9090B8]" style={{ fontFamily: "'Inter', sans-serif" }}>
        {message}
      </p>
    </div>
  );
}

// === Error Display ===

function ErrorDisplay({ error }: { error: Error | null }) {
  return (
    <div
      className="p-4 rounded-lg flex items-center gap-3"
      style={{ background: "rgba(255, 71, 87, 0.08)", border: "1px solid rgba(255, 71, 87, 0.2)" }}
    >
      <AlertCircle size={20} className="text-[#F87171]" />
      <p className="text-[#F87171] text-sm" style={{ fontFamily: "'Inter', sans-serif" }}>
        {error?.message || "Something went wrong. Please try again."}
      </p>
    </div>
  );
}

// === Score Progress Chart ===

function ScoreChart({ history }: { history: ScoreHistoryEntry[] }) {
  if (history.length < 2) return null;

  const width = 400;
  const height = 80;
  const padX = 20;
  const padY = 10;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  const scores = history.map((h) => h.score);
  const minScore = Math.max(0, Math.min(...scores) - 5);
  const maxScore = Math.min(100, Math.max(...scores) + 5);
  const range = maxScore - minScore || 1;

  const toX = (i: number) => padX + (i / (history.length - 1)) * innerW;
  const toY = (score: number) => padY + innerH - ((score - minScore) / range) * innerH;

  const points = history.map((h, i) => `${toX(i)},${toY(h.score)}`).join(' ');

  const latest = scores[scores.length - 1];
  const prev = scores[scores.length - 2];
  const delta = latest - prev;
  const trendColor = delta > 0 ? '#34D399' : delta < 0 ? '#F87171' : '#9090B8';
  const trendLabel =
    delta === 0
      ? 'Flat — no change from last analysis'
      : delta > 0
      ? `+${delta} pts from last analysis`
      : `${delta} pts from last analysis`;

  return (
    <div
      className="p-5 rounded-lg border"
      style={{
        background: 'rgba(11,11,20,0.7)',
        backdropFilter: 'blur(12px)',
        borderColor: 'rgba(255,255,255,0.06)',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3
          className="text-sm font-semibold"
          style={{ fontFamily: "'Inter', sans-serif", color: '#F0F0FF' }}
        >
          Score Progress
        </h3>
        <span
          className="text-[12px] font-medium px-2 py-0.5 rounded-full"
          style={{
            color: trendColor,
            background: `${trendColor}18`,
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {trendLabel}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        style={{ display: 'block', maxWidth: `${width}px` }}
        aria-label="Score history chart"
      >
        {/* Grid lines */}
        {[0, 0.5, 1].map((t) => (
          <line
            key={t}
            x1={padX}
            y1={padY + innerH * t}
            x2={width - padX}
            y2={padY + innerH * t}
            stroke="rgba(255,255,255,0.04)"
            strokeWidth={1}
          />
        ))}
        {/* Trend line */}
        <polyline
          points={points}
          fill="none"
          stroke={trendColor}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* Data points */}
        {history.map((h, i) => (
          <circle
            key={i}
            cx={toX(i)}
            cy={toY(h.score)}
            r={i === history.length - 1 ? 5 : 3}
            fill={i === history.length - 1 ? trendColor : '#8B5CF6'}
            stroke={i === history.length - 1 ? 'rgba(11,11,20,0.9)' : 'none'}
            strokeWidth={2}
          />
        ))}
      </svg>

      {/* History list */}
      <div className="mt-3 space-y-1.5">
        {[...history].reverse().map((entry, i) => {
          const isLatest = i === 0;
          const prevScore = i < history.length - 1 ? [...history].reverse()[i + 1]?.score : null;
          const entryDelta = prevScore !== null ? entry.score - prevScore : null;
          const d = new Date(entry.date);
          const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
          return (
            <div key={i} className="flex items-center justify-between">
              <span
                className="text-[11px]"
                style={{ fontFamily: "'Inter', sans-serif", color: isLatest ? '#F0F0FF' : '#9090B8' }}
              >
                {label}
                {entry.username && (
                  <span style={{ color: '#3A3A60' }}> @{entry.username}</span>
                )}
              </span>
              <div className="flex items-center gap-2">
                {entryDelta !== null && (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded"
                    style={{
                      color: entryDelta > 0 ? '#34D399' : entryDelta < 0 ? '#F87171' : '#9090B8',
                      background:
                        entryDelta > 0
                          ? 'rgba(52,211,153,0.1)'
                          : entryDelta < 0
                          ? 'rgba(248,113,113,0.1)'
                          : 'rgba(144,144,184,0.1)',
                      fontFamily: 'monospace',
                    }}
                  >
                    {entryDelta > 0 ? '+' : ''}{entryDelta}
                  </span>
                )}
                {entryDelta === null && isLatest && (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded"
                    style={{
                      color: '#9090B8',
                      background: 'rgba(144,144,184,0.1)',
                      fontFamily: 'monospace',
                    }}
                  >
                    baseline
                  </span>
                )}
                <span
                  className="text-[12px] font-bold"
                  style={{ fontFamily: 'monospace', color: getScoreColor(entry.score) }}
                >
                  {entry.score}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// === GitHub Quick Actions ===

function GitHubQuickActions({
  analysis,
  profile,
}: {
  analysis: AnalysisResult;
  profile: { username: string; bio: string | null };
}) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyText = (key: string, text: string) => {
    navigator.clipboard.writeText(text).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    });
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const badgesSnippet = [
    `![GitHub followers](https://img.shields.io/github/followers/${profile.username}?label=Follow&style=social)`,
    `![Profile views](https://komarev.com/ghpvc/?username=${profile.username}&color=blueviolet)`,
    `![GitHub stars](https://img.shields.io/github/stars/${profile.username}?affiliations=OWNER&style=social)`,
  ].join('\n');

  const bioSuggestion =
    analysis.sections.bio.suggestions[0] ||
    `Passionate developer | Open to ${profile.username ? `new opportunities` : 'collaboration'} | Building cool things`;

  const pinnedReposStrategy = [
    '## Pinned Repos Strategy',
    '- Pin 6 repos that best showcase your range of skills',
    '- Prioritize projects with a README, demo link, and recent commits',
    '- Mix: 1-2 popular/starred repos + 3-4 best quality code samples',
    '- Avoid pinning forks unless you made significant contributions',
    '- Add descriptive topics/tags to each pinned repo',
  ].join('\n');

  const actions: Array<{ key: string; label: string; text: string; icon: string }> = [
    { key: 'badges', label: 'Copy Badges Snippet', text: badgesSnippet, icon: '🏷' },
    { key: 'bio', label: 'Copy Optimized Bio', text: bioSuggestion, icon: '📝' },
    { key: 'pinned', label: 'Copy Pinned Repos Strategy', text: pinnedReposStrategy, icon: '📌' },
  ];

  return (
    <div
      className="p-5 rounded-lg border"
      style={{
        background: 'rgba(124,58,237,0.04)',
        borderColor: 'rgba(124,58,237,0.2)',
      }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Zap size={16} className="text-[#8B5CF6]" />
        <h3
          className="text-sm font-semibold"
          style={{ fontFamily: "'Inter', sans-serif", color: '#F0F0FF' }}
        >
          Quick Actions
        </h3>
        <span
          className="text-[10px] px-2 py-0.5 rounded-full"
          style={{
            background: 'rgba(124,58,237,0.15)',
            color: '#8B5CF6',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          copy &amp; paste ready
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {actions.map((action) => (
          <button
            key={action.key}
            onClick={() => copyText(action.key, action.text)}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-all hover:border-[rgba(124,58,237,0.4)] text-left"
            style={{
              borderColor: 'rgba(255,255,255,0.06)',
              background: 'rgba(255,255,255,0.02)',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {copiedKey === action.key ? (
              <Check size={14} className="text-[#34D399] flex-shrink-0" />
            ) : (
              <Copy size={14} className="text-[#3A3A60] flex-shrink-0" />
            )}
            <span
              className="text-[12px] font-medium"
              style={{ color: copiedKey === action.key ? '#34D399' : '#F0F0FF' }}
            >
              {copiedKey === action.key ? 'Copied!' : action.label}
            </span>
          </button>
        ))}
      </div>

      <p
        className="text-[11px] mt-3"
        style={{ fontFamily: "'Inter', sans-serif", color: '#3A3A60' }}
      >
        Go to{' '}
        <a
          href={`https://github.com/${profile.username}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
          style={{ color: '#8B5CF6' }}
        >
          github.com/{profile.username}
        </a>{' '}
        to apply these changes to your profile.
      </p>
    </div>
  );
}

// === Profile Analysis Tab ===

function ProfileAnalysisTab() {
  const [username, setUsername] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [prefilled, setPrefilled] = useState(false);

  const profileQuery = useQuery({
    queryKey: ['profile-for-github-analysis'],
    queryFn: () => apiFetch<{ data: UserProfile }>('/api/profile'),
    staleTime: 5 * 60 * 1000,
  });

  const historyQuery = useQuery({
    queryKey: ['github-score-history'],
    queryFn: () => apiFetch<{ data: ScoreHistoryData }>('/api/optimize/github'),
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    if (prefilled) return;
    const profileResult = profileQuery.data as Record<string, unknown> | undefined;
    const profile = profileResult?.data as UserProfile | undefined;
    if (!profile) return;
    if (!username) {
      const ghUser = extractGitHubUsernameClient(profile);
      if (ghUser) setUsername(ghUser);
    }
    if (!targetRole && profile.preferences?.targetRoles?.[0]) {
      setTargetRole(profile.preferences.targetRoles[0]);
    }
    setPrefilled(true);
  }, [profileQuery.data, prefilled, username, targetRole]);

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

  const historyResult = historyQuery.data as Record<string, unknown> | undefined;
  const historyData = historyResult?.data as ScoreHistoryData | undefined;
  const scoreHistory = historyData?.history || [];

  return (
    <div className="space-y-6">
      {/* Score Progress Chart — shown when ≥2 entries exist */}
      {scoreHistory.length >= 2 && <ScoreChart history={scoreHistory} />}

      {/* Search Form */}
      <Card>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-[12px] mb-2" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
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
                fontFamily: "'Inter', sans-serif",
                fontSize: "14px",
                color: "#F0F0FF",
              }}
            />
          </div>
          <div className="flex-1">
            <label className="block text-[12px] mb-2" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
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
                fontFamily: "'Inter', sans-serif",
                fontSize: "14px",
                color: "#F0F0FF",
              }}
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleAnalyze}
              disabled={!username.trim() || analyzeMutation.isPending}
              className="px-6 py-2.5 rounded-lg font-semibold transition-all disabled:opacity-50"
              style={{ background: "#8B5CF6", color: "#050508", fontFamily: "'Inter', sans-serif" }}
            >
              <Search size={16} className="inline mr-2" />
              {analyzeMutation.isPending ? "Analyzing..." : "Analyze"}
            </button>
          </div>
        </div>
      </Card>

      {/* Loading */}
      {analyzeMutation.isPending && <LoadingSpinner message="Fetching GitHub data and running AI analysis..." />}

      {/* Error */}
      {analyzeMutation.isError && <ErrorDisplay error={analyzeMutation.error as Error} />}

      {/* Results */}
      {analysis && profile && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Profile Summary + Overall Score */}
          <div className="flex gap-4">
            {/* Profile Card */}
            <Card className="flex-1">
              <div className="flex items-center gap-4 mb-4">
                {profile.avatarUrl && (
                  <Image
                    src={profile.avatarUrl}
                    alt={profile.username}
                    width={64}
                    height={64}
                    className="w-16 h-16 rounded-full"
                    style={{ border: "2px solid rgba(124, 58, 237, 0.2)" }}
                    unoptimized
                  />
                )}
                <div>
                  <h2 className="text-lg font-bold" style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}>
                    {profile.name || profile.username}
                  </h2>
                  <p className="text-sm" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
                    @{profile.username}
                  </p>
                  {profile.bio && (
                    <p className="text-sm mt-1" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
                      {profile.bio}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-6 text-sm" style={{ fontFamily: "monospace, monospace" }}>
                <span className="text-[#9090B8]">
                  <span className="text-[#F0F0FF] font-bold">{profile.publicRepos}</span> repos
                </span>
                <span className="text-[#9090B8]">
                  <span className="text-[#F0F0FF] font-bold">{profile.followers}</span> followers
                </span>
                <span className="text-[#9090B8]">
                  <span className="text-[#F0F0FF] font-bold">{profile.following}</span> following
                </span>
              </div>
              {(profile.location || profile.company) && (
                <div className="flex gap-4 mt-3 text-xs text-[#3A3A60]" style={{ fontFamily: "'Inter', sans-serif" }}>
                  {profile.location && <span>{profile.location}</span>}
                  {profile.company && <span>{profile.company}</span>}
                </div>
              )}
            </Card>

            {/* Overall Score */}
            <div
              className="w-[200px] p-6 rounded-lg border flex flex-col items-center justify-center"
              style={{ background: "rgba(11, 11, 20, 0.7)", backdropFilter: "blur(12px)", borderColor: "rgba(255, 255, 255, 0.04)" }}
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
                  style={{ fontFamily: "monospace, monospace", color: getScoreColor(analysis.overall_score) }}
                >
                  {analysis.overall_score}
                </span>
              </div>
              <span className="text-sm font-semibold" style={{ fontFamily: "'Inter', sans-serif", color: getScoreColor(analysis.overall_score) }}>
                {getScoreLabel(analysis.overall_score)}
              </span>
              <span className="text-[11px] text-[#3A3A60] mt-1">Overall Score</span>
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
                <Card key={section} className="!p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold" style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}>
                      {labels[section]}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span
                        className="text-lg font-bold"
                        style={{ fontFamily: "monospace, monospace", color: getScoreColor(data.score) }}
                      >
                        {data.score}
                      </span>
                      <span className="text-[10px] text-[#3A3A60]">/100</span>
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
                        <ArrowUp size={14} className="text-[#8B5CF6] flex-shrink-0 mt-0.5" />
                        <span className="text-[12px] leading-relaxed" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
                          {suggestion}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Card>
              );
            })}
          </div>

          {/* Top Repos */}
          {topRepos.length > 0 && (
            <Card>
              <h3 className="text-sm font-semibold mb-4" style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}>
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
                      <span className="text-[13px] font-semibold truncate" style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}>
                        {repo.name}
                      </span>
                      <ExternalLink size={12} className="text-[#3A3A60] flex-shrink-0" />
                    </div>
                    {repo.description && (
                      <p className="text-[11px] text-[#9090B8] mb-2 line-clamp-2" style={{ fontFamily: "'Inter', sans-serif" }}>
                        {repo.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-[11px]" style={{ fontFamily: "monospace, monospace" }}>
                      {repo.language && <span className="text-[#8B5CF6]">{repo.language}</span>}
                      <span className="text-[#9090B8] flex items-center gap-1">
                        <Star size={10} /> {repo.stars}
                      </span>
                      <span className="text-[#9090B8] flex items-center gap-1">
                        <GitFork size={10} /> {repo.forks}
                      </span>
                      {repo.isForked && <span className="text-[#3A3A60]">(fork)</span>}
                    </div>
                  </a>
                ))}
              </div>
            </Card>
          )}

          {/* Quick Actions */}
          <GitHubQuickActions
            analysis={analysis}
            profile={{ username: profile.username, bio: profile.bio }}
          />

          {/* View on GitHub */}
          <div className="text-center">
            <a
              href={`https://github.com/${profile.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg border transition-all hover:bg-white/5"
              style={{ borderColor: "rgba(255, 255, 255, 0.08)", fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
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
          <Github size={48} className="mx-auto mb-4 text-[#3A3A60]" />
          <p className="text-lg font-semibold mb-2" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
            Enter a GitHub username to get started
          </p>
          <p className="text-sm text-[#3A3A60]" style={{ fontFamily: "'Inter', sans-serif" }}>
            AI will analyze the profile and provide actionable suggestions to impress recruiters
          </p>
        </div>
      )}
    </div>
  );
}

// === Portfolio Tab ===

function PortfolioTab() {
  const [username, setUsername] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [prefilled, setPrefilled] = useState(false);

  const profileQuery = useQuery({
    queryKey: ['profile-for-github-portfolio'],
    queryFn: () => apiFetch<{ data: UserProfile }>('/api/profile'),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (prefilled) return;
    const profileResult = profileQuery.data as Record<string, unknown> | undefined;
    const profile = profileResult?.data as UserProfile | undefined;
    if (!profile) return;
    if (!username) {
      const ghUser = extractGitHubUsernameClient(profile);
      if (ghUser) setUsername(ghUser);
    }
    if (!targetRole && profile.preferences?.targetRoles?.[0]) {
      setTargetRole(profile.preferences.targetRoles[0]);
    }
    setPrefilled(true);
  }, [profileQuery.data, prefilled, username, targetRole]);

  const portfolioMutation = useMutation({
    mutationFn: (data: { action: string; username: string; targetRole?: string }) =>
      apiFetch<{ data: { portfolio: PortfolioResult; repoCount: number; username: string } }>("/api/optimize/github/enhanced", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
  });

  const handleAnalyze = () => {
    if (!username.trim()) return;
    portfolioMutation.mutate({
      action: "portfolio",
      username: username.trim(),
      targetRole: targetRole.trim() || undefined,
    });
  };

  const result = portfolioMutation.data as Record<string, unknown> | undefined;
  const resultData = result?.data as Record<string, unknown> | undefined;
  const portfolio = resultData?.portfolio as PortfolioResult | undefined;

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-[12px] mb-2" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
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
                fontFamily: "'Inter', sans-serif",
                fontSize: "14px",
                color: "#F0F0FF",
              }}
            />
          </div>
          <div className="flex-1">
            <label className="block text-[12px] mb-2" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
              Target Role (optional)
            </label>
            <input
              type="text"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
              placeholder="e.g. Backend Engineer"
              className="w-full px-4 py-2.5 rounded-lg border bg-transparent outline-none"
              style={{
                borderColor: "rgba(255, 255, 255, 0.08)",
                fontFamily: "'Inter', sans-serif",
                fontSize: "14px",
                color: "#F0F0FF",
              }}
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleAnalyze}
              disabled={!username.trim() || portfolioMutation.isPending}
              className="px-6 py-2.5 rounded-lg font-semibold transition-all disabled:opacity-50"
              style={{ background: "#8B5CF6", color: "#050508", fontFamily: "'Inter', sans-serif" }}
            >
              <Sparkles size={16} className="inline mr-2" />
              {portfolioMutation.isPending ? "Analyzing..." : "Optimize"}
            </button>
          </div>
        </div>
      </Card>

      {portfolioMutation.isPending && <LoadingSpinner message="Analyzing your portfolio and generating recommendations..." />}
      {portfolioMutation.isError && <ErrorDisplay error={portfolioMutation.error as Error} />}

      {portfolio && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Overall Strategy */}
          {portfolio.overall_strategy.length > 0 && (
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <Target size={18} className="text-[#8B5CF6]" />
                <h3 className="text-sm font-semibold" style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}>
                  Portfolio Strategy
                </h3>
              </div>
              <ul className="space-y-3">
                {portfolio.overall_strategy.map((tip, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold"
                      style={{ background: "rgba(124, 58, 237, 0.1)", color: "#8B5CF6", fontFamily: "monospace, monospace" }}
                    >
                      {i + 1}
                    </span>
                    <span className="text-[13px] leading-relaxed" style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}>
                      {tip}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Pin Recommendations */}
          {portfolio.pin_recommendations.length > 0 && (
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <Pin size={18} className="text-[#8B5CF6]" />
                <h3 className="text-sm font-semibold" style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}>
                  Pin Recommendations
                </h3>
                <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: "rgba(124, 58, 237, 0.1)", color: "#8B5CF6" }}>
                  {portfolio.pin_recommendations.length} repos
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {portfolio.pin_recommendations.map((rec, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-lg border"
                    style={{ background: "rgba(255, 255, 255, 0.02)", borderColor: "rgba(255, 255, 255, 0.04)" }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <BookOpen size={14} className="text-[#8B5CF6]" />
                      <span className="text-[13px] font-semibold" style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}>
                        {rec.repo}
                      </span>
                    </div>
                    <p className="text-[12px] mb-3 leading-relaxed" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
                      {rec.reason}
                    </p>
                    {rec.improvements.length > 0 && (
                      <ul className="space-y-1.5">
                        {rec.improvements.map((imp, j) => (
                          <li key={j} className="flex items-start gap-2">
                            <ArrowUp size={12} className="text-[#8B5CF6] flex-shrink-0 mt-0.5" />
                            <span className="text-[11px]" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
                              {imp}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Naming Suggestions */}
          {portfolio.naming_suggestions.length > 0 && (
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <Tag size={18} className="text-[#8B5CF6]" />
                <h3 className="text-sm font-semibold" style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}>
                  Naming Improvements
                </h3>
              </div>
              <div className="space-y-3">
                {portfolio.naming_suggestions.map((suggestion, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg flex items-center gap-4"
                    style={{ background: "rgba(255, 255, 255, 0.02)" }}
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <span
                        className="text-[13px] px-2 py-1 rounded"
                        style={{ fontFamily: "monospace, monospace", color: "#F87171", background: "rgba(255, 71, 87, 0.08)" }}
                      >
                        {suggestion.current}
                      </span>
                      <span className="text-[#3A3A60]">→</span>
                      <span
                        className="text-[13px] px-2 py-1 rounded"
                        style={{ fontFamily: "monospace, monospace", color: "#34D399", background: "rgba(74, 222, 128, 0.08)" }}
                      >
                        {suggestion.suggested}
                      </span>
                    </div>
                    <span className="text-[11px] flex-1" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
                      {suggestion.reason}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Description Improvements */}
          {portfolio.description_improvements.length > 0 && (
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <FileText size={18} className="text-[#8B5CF6]" />
                <h3 className="text-sm font-semibold" style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}>
                  Description Improvements
                </h3>
              </div>
              <div className="space-y-3">
                {portfolio.description_improvements.map((desc, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-lg border"
                    style={{ background: "rgba(255, 255, 255, 0.02)", borderColor: "rgba(255, 255, 255, 0.04)" }}
                  >
                    <span className="text-[13px] font-semibold" style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}>
                      {desc.repo}
                    </span>
                    {desc.current && (
                      <p className="text-[12px] mt-2 px-3 py-1.5 rounded" style={{ fontFamily: "'Inter', sans-serif", color: "#F87171", background: "rgba(255, 71, 87, 0.05)" }}>
                        {desc.current}
                      </p>
                    )}
                    <p className="text-[12px] mt-2 px-3 py-1.5 rounded" style={{ fontFamily: "'Inter', sans-serif", color: "#34D399", background: "rgba(74, 222, 128, 0.05)" }}>
                      {desc.suggested}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </motion.div>
      )}

      {/* Empty State */}
      {!portfolioMutation.isPending && !portfolio && !portfolioMutation.isError && (
        <div className="text-center py-16">
          <Pin size={48} className="mx-auto mb-4 text-[#3A3A60]" />
          <p className="text-lg font-semibold mb-2" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
            Optimize your repository portfolio
          </p>
          <p className="text-sm text-[#3A3A60]" style={{ fontFamily: "'Inter', sans-serif" }}>
            Get AI recommendations for which repos to pin, rename, and improve descriptions
          </p>
        </div>
      )}
    </div>
  );
}

// === Contribute Tab ===

const KNOWN_LANGS = new Set([
  'javascript', 'typescript', 'python', 'java', 'c', 'c++', 'c#', 'go', 'rust',
  'ruby', 'php', 'swift', 'kotlin', 'scala', 'r', 'dart', 'lua', 'perl',
  'haskell', 'elixir', 'clojure', 'html', 'css', 'sql', 'shell', 'bash',
]);

function ContributeTab() {
  const [skills, setSkills] = useState("");
  const [languages, setLanguages] = useState("");
  const [interests, setInterests] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("intermediate");
  const [prefilled, setPrefilled] = useState(false);

  const profileQuery = useQuery({
    queryKey: ['profile-for-github-contribute'],
    queryFn: () => apiFetch<{ data: UserProfile }>('/api/profile'),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (prefilled) return;
    const profileResult = profileQuery.data as Record<string, unknown> | undefined;
    const profile = profileResult?.data as UserProfile | undefined;
    if (!profile) return;
    const allSkills = extractSkillNamesClient(profile.skills);
    if (!skills && allSkills.length > 0) {
      setSkills(allSkills.join(', '));
    }
    if (!languages) {
      const langs = allSkills.filter((s) => KNOWN_LANGS.has(s.toLowerCase()));
      if (langs.length > 0) setLanguages(langs.join(', '));
    }
    if (!interests) {
      const nonLangs = allSkills.filter((s) => !KNOWN_LANGS.has(s.toLowerCase()));
      if (profile.headline) {
        setInterests([profile.headline, ...nonLangs.slice(0, 3)].join(', '));
      } else if (nonLangs.length > 0) {
        setInterests(nonLangs.slice(0, 5).join(', '));
      }
    }
    setPrefilled(true);
  }, [profileQuery.data, prefilled, skills, languages, interests]);

  const contributeMutation = useMutation({
    mutationFn: (data: { action: string; skills: string[]; languages: string[]; interests: string[]; experienceLevel: string }) =>
      apiFetch<{ data: { contributions: ContributionResult } }>("/api/optimize/github/enhanced", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
  });

  const handleFind = () => {
    if (!skills.trim() || !languages.trim() || !interests.trim()) return;
    contributeMutation.mutate({
      action: "contributions",
      skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
      languages: languages.split(",").map((s) => s.trim()).filter(Boolean),
      interests: interests.split(",").map((s) => s.trim()).filter(Boolean),
      experienceLevel,
    });
  };

  const result = contributeMutation.data as Record<string, unknown> | undefined;
  const resultData = result?.data as Record<string, unknown> | undefined;
  const contributions = resultData?.contributions as ContributionResult | undefined;

  return (
    <div className="space-y-6">
      <Card>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-[12px] mb-2" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
              Skills (comma-separated)
            </label>
            <input
              type="text"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="e.g. React, Node.js, REST APIs, Testing"
              className="w-full px-4 py-2.5 rounded-lg border bg-transparent outline-none"
              style={{
                borderColor: "rgba(255, 255, 255, 0.08)",
                fontFamily: "'Inter', sans-serif",
                fontSize: "14px",
                color: "#F0F0FF",
              }}
            />
          </div>
          <div>
            <label className="block text-[12px] mb-2" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
              Programming Languages (comma-separated)
            </label>
            <input
              type="text"
              value={languages}
              onChange={(e) => setLanguages(e.target.value)}
              placeholder="e.g. TypeScript, Python, Go"
              className="w-full px-4 py-2.5 rounded-lg border bg-transparent outline-none"
              style={{
                borderColor: "rgba(255, 255, 255, 0.08)",
                fontFamily: "'Inter', sans-serif",
                fontSize: "14px",
                color: "#F0F0FF",
              }}
            />
          </div>
          <div>
            <label className="block text-[12px] mb-2" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
              Interests (comma-separated)
            </label>
            <input
              type="text"
              value={interests}
              onChange={(e) => setInterests(e.target.value)}
              placeholder="e.g. developer tools, AI/ML, web frameworks"
              className="w-full px-4 py-2.5 rounded-lg border bg-transparent outline-none"
              style={{
                borderColor: "rgba(255, 255, 255, 0.08)",
                fontFamily: "'Inter', sans-serif",
                fontSize: "14px",
                color: "#F0F0FF",
              }}
            />
          </div>
          <div>
            <label className="block text-[12px] mb-2" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
              Experience Level
            </label>
            <select
              value={experienceLevel}
              onChange={(e) => setExperienceLevel(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border bg-transparent outline-none"
              style={{
                borderColor: "rgba(255, 255, 255, 0.08)",
                fontFamily: "'Inter', sans-serif",
                fontSize: "14px",
                color: "#F0F0FF",
                background: "#0C0C14",
              }}
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end">
          <button
            onClick={handleFind}
            disabled={!skills.trim() || !languages.trim() || !interests.trim() || contributeMutation.isPending}
            className="px-6 py-2.5 rounded-lg font-semibold transition-all disabled:opacity-50"
            style={{ background: "#8B5CF6", color: "#050508", fontFamily: "'Inter', sans-serif" }}
          >
            <Search size={16} className="inline mr-2" />
            {contributeMutation.isPending ? "Finding..." : "Find Projects"}
          </button>
        </div>
      </Card>

      {contributeMutation.isPending && <LoadingSpinner message="Finding open source projects that match your skills..." />}
      {contributeMutation.isError && <ErrorDisplay error={contributeMutation.error as Error} />}

      {contributions && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Recommended Projects */}
          {contributions.recommended_projects.length > 0 && (
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <Github size={18} className="text-[#8B5CF6]" />
                <h3 className="text-sm font-semibold" style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}>
                  Recommended Projects
                </h3>
                <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: "rgba(124, 58, 237, 0.1)", color: "#8B5CF6" }}>
                  {contributions.recommended_projects.length} projects
                </span>
              </div>
              <div className="space-y-4">
                {contributions.recommended_projects.map((project, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-lg border"
                    style={{ background: "rgba(255, 255, 255, 0.02)", borderColor: "rgba(255, 255, 255, 0.04)" }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <a
                          href={`https://github.com/${project.project_name}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[14px] font-semibold hover:underline flex items-center gap-1.5"
                          style={{ fontFamily: "'Inter', sans-serif", color: "#8B5CF6" }}
                        >
                          {project.project_name}
                          <ExternalLink size={12} />
                        </a>
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                          style={{
                            background: `${getDifficultyColor(project.difficulty)}15`,
                            color: getDifficultyColor(project.difficulty),
                          }}
                        >
                          {project.difficulty}
                        </span>
                      </div>
                    </div>
                    <p className="text-[12px] mb-3" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
                      {project.description}
                    </p>
                    <p className="text-[12px] mb-3" style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}>
                      <span className="text-[#8B5CF6] font-medium">Why: </span>
                      {project.why_contribute}
                    </p>

                    {project.skills_match.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {project.skills_match.map((skill, j) => (
                          <span
                            key={j}
                            className="text-[10px] px-2 py-0.5 rounded-full"
                            style={{ background: "rgba(124, 58, 237, 0.08)", color: "#8B5CF6" }}
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}

                    {project.good_first_issues.length > 0 && (
                      <div>
                        <span className="text-[11px] font-medium" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
                          Good first issues:
                        </span>
                        <ul className="mt-1.5 space-y-1">
                          {project.good_first_issues.map((issue, j) => (
                            <li key={j} className="flex items-start gap-2">
                              <ArrowUp size={11} className="text-[#8B5CF6] flex-shrink-0 mt-0.5" />
                              <span className="text-[11px]" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
                                {issue}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Contribution Strategy + Weekly Goals */}
          <div className="grid grid-cols-2 gap-4">
            {contributions.contribution_strategy.length > 0 && (
              <Card>
                <div className="flex items-center gap-2 mb-4">
                  <Target size={18} className="text-[#8B5CF6]" />
                  <h3 className="text-sm font-semibold" style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}>
                    Contribution Strategy
                  </h3>
                </div>
                <ul className="space-y-3">
                  {contributions.contribution_strategy.map((tip, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold"
                        style={{ background: "rgba(124, 58, 237, 0.1)", color: "#8B5CF6", fontFamily: "monospace, monospace" }}
                      >
                        {i + 1}
                      </span>
                      <span className="text-[12px] leading-relaxed" style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}>
                        {tip}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {contributions.weekly_goals.length > 0 && (
              <Card>
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles size={18} className="text-[#8B5CF6]" />
                  <h3 className="text-sm font-semibold" style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}>
                    Weekly Goals
                  </h3>
                </div>
                <ul className="space-y-3">
                  {contributions.weekly_goals.map((goal, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold"
                        style={{ background: "rgba(124, 58, 237, 0.1)", color: "#8B5CF6", fontFamily: "monospace, monospace" }}
                      >
                        {i + 1}
                      </span>
                      <span className="text-[12px] leading-relaxed" style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}>
                        {goal}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        </motion.div>
      )}

      {/* Empty State */}
      {!contributeMutation.isPending && !contributions && !contributeMutation.isError && (
        <div className="text-center py-16">
          <Users size={48} className="mx-auto mb-4 text-[#3A3A60]" />
          <p className="text-lg font-semibold mb-2" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
            Find open source projects to contribute to
          </p>
          <p className="text-sm text-[#3A3A60]" style={{ fontFamily: "'Inter', sans-serif" }}>
            Get personalized recommendations based on your skills, languages, and interests
          </p>
        </div>
      )}
    </div>
  );
}

// === PR Modal ===

interface PRModalProps {
  repoName: string;
  onSuccess: (prUrl: string) => void;
  onClose: () => void;
}

function PRModal({ repoName, onSuccess, onClose }: PRModalProps) {
  const [githubToken, setGithubToken] = useState("");
  const [targetBranch, setTargetBranch] = useState("main");

  const prMutation = useMutation({
    mutationFn: (data: { repoName: string; targetBranch: string; githubToken: string }) =>
      apiFetch<{ data: { prUrl: string; prNumber: number; branch: string; improvements: string[] } }>(
        "/api/optimize/github/auto-pr",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      ),
    onSuccess: (res) => {
      const result = res as Record<string, unknown> | undefined;
      const data = result?.data as { prUrl: string } | undefined;
      if (data?.prUrl) {
        onSuccess(data.prUrl);
      }
    },
  });

  const result = prMutation.data as Record<string, unknown> | undefined;
  const prData = result?.data as {
    prUrl: string;
    prNumber: number;
    branch: string;
    improvements: string[];
  } | undefined;

  const handleSubmit = () => {
    if (!githubToken.trim()) return;
    prMutation.mutate({ repoName, targetBranch, githubToken: githubToken.trim() });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(5, 5, 8, 0.85)", backdropFilter: "blur(4px)" }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg p-6 rounded-xl border relative"
        style={{
          background: "rgba(11, 11, 20, 0.98)",
          borderColor: "rgba(124, 58, 237, 0.2)",
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg transition-all hover:bg-white/5"
        >
          <X size={16} style={{ color: "#9090B8" }} />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(124, 58, 237, 0.1)" }}
          >
            <GitPullRequest size={18} style={{ color: "#8B5CF6" }} />
          </div>
          <div>
            <h3
              className="text-base font-bold"
              style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
            >
              Create GitHub PR
            </h3>
            <p
              className="text-xs"
              style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
            >
              AI will improve your README and open a pull request on <strong style={{ color: "#F0F0FF" }}>{repoName}</strong>
            </p>
          </div>
        </div>

        {!prData ? (
          <div className="space-y-4">
            <div>
              <label
                className="block text-[12px] mb-1.5"
                style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
              >
                GitHub Personal Access Token
              </label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#3A3A60]" />
                <input
                  type="password"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg border bg-transparent outline-none"
                  style={{
                    borderColor: "rgba(255, 255, 255, 0.08)",
                    fontFamily: "monospace, monospace",
                    fontSize: "13px",
                    color: "#F0F0FF",
                  }}
                />
              </div>
              <p
                className="text-[11px] mt-1"
                style={{ fontFamily: "'Inter', sans-serif", color: "#3A3A60" }}
              >
                Needs <strong>repo</strong> scope. Token is used only for this request and not stored.
              </p>
            </div>

            <div>
              <label
                className="block text-[12px] mb-1.5"
                style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
              >
                Base Branch
              </label>
              <input
                type="text"
                value={targetBranch}
                onChange={(e) => setTargetBranch(e.target.value)}
                placeholder="main"
                className="w-full px-4 py-2.5 rounded-lg border bg-transparent outline-none"
                style={{
                  borderColor: "rgba(255, 255, 255, 0.08)",
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "14px",
                  color: "#F0F0FF",
                }}
              />
            </div>

            {prMutation.isError && (
              <div
                className="flex items-start gap-3 p-3 rounded-lg"
                style={{ background: "rgba(255, 71, 87, 0.08)", border: "1px solid rgba(255, 71, 87, 0.2)" }}
              >
                <AlertCircle size={16} className="text-[#F87171] flex-shrink-0 mt-0.5" />
                <p
                  className="text-[13px]"
                  style={{ fontFamily: "'Inter', sans-serif", color: "#F87171" }}
                >
                  {prMutation.error instanceof Error
                    ? prMutation.error.message
                    : "Failed to create PR. Please try again."}
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all hover:bg-white/5"
                style={{
                  borderColor: "rgba(255, 255, 255, 0.08)",
                  color: "#9090B8",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!githubToken.trim() || prMutation.isPending}
                className="flex-1 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                style={{
                  background: "#8B5CF6",
                  color: "#050508",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                {prMutation.isPending ? (
                  <>
                    <div
                      className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                      style={{ borderColor: "rgba(5,5,8,0.4)", borderTopColor: "transparent" }}
                    />
                    Creating PR...
                  </>
                ) : (
                  <>
                    <GitPullRequest size={14} />
                    Create Pull Request
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div
              className="p-4 rounded-lg"
              style={{ background: "rgba(74, 222, 128, 0.08)", border: "1px solid rgba(74, 222, 128, 0.2)" }}
            >
              <p
                className="text-sm font-semibold mb-1"
                style={{ fontFamily: "'Inter', sans-serif", color: "#34D399" }}
              >
                Pull Request Created!
              </p>
              <a
                href={prData.prUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm flex items-center gap-1.5 hover:underline"
                style={{ fontFamily: "'Inter', sans-serif", color: "#8B5CF6" }}
              >
                PR #{prData.prNumber}: View on GitHub
                <ExternalLink size={12} />
              </a>
            </div>

            {prData.improvements.length > 0 && (
              <div>
                <p
                  className="text-xs font-medium mb-2"
                  style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
                >
                  Improvements made:
                </p>
                <ul className="space-y-1.5">
                  {prData.improvements.map((imp, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check size={12} className="text-[#8B5CF6] flex-shrink-0 mt-0.5" />
                      <span
                        className="text-xs"
                        style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
                      >
                        {imp}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button
              onClick={onClose}
              className="w-full px-4 py-2.5 rounded-lg font-semibold text-sm transition-all"
              style={{
                background: "#8B5CF6",
                color: "#050508",
                fontFamily: "'Inter', sans-serif",
              }}
            >
              Done
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

// === README Generator Tab ===

function ReadmeGenTab() {
  const [repoName, setRepoName] = useState("");
  const [description, setDescription] = useState("");
  const [techStack, setTechStack] = useState("");
  const [features, setFeatures] = useState("");
  const [isPortfolioProject, setIsPortfolioProject] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showPRModal, setShowPRModal] = useState(false);
  const [prSuccessUrl, setPrSuccessUrl] = useState<string | null>(null);

  const readmeMutation = useMutation({
    mutationFn: (data: {
      action: string;
      repoName: string;
      description: string;
      techStack: string[];
      features?: string[];
      isPortfolioProject?: boolean;
    }) =>
      apiFetch<{ data: { readme: ReadmeResult } }>("/api/optimize/github/enhanced", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
  });

  const handleGenerate = () => {
    if (!repoName.trim() || !description.trim() || !techStack.trim()) return;
    readmeMutation.mutate({
      action: "readme",
      repoName: repoName.trim(),
      description: description.trim(),
      techStack: techStack.split(",").map((s) => s.trim()).filter(Boolean),
      features: features.trim()
        ? features.split(",").map((s) => s.trim()).filter(Boolean)
        : undefined,
      isPortfolioProject,
    });
  };

  const result = readmeMutation.data as Record<string, unknown> | undefined;
  const resultData = result?.data as Record<string, unknown> | undefined;
  const readme = resultData?.readme as ReadmeResult | undefined;

  const handleCopy = async () => {
    if (!readme?.content) return;
    try {
      await navigator.clipboard.writeText(readme.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = readme.content;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-[12px] mb-2" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
              Repository Name
            </label>
            <input
              type="text"
              value={repoName}
              onChange={(e) => setRepoName(e.target.value)}
              placeholder="e.g. my-awesome-project"
              className="w-full px-4 py-2.5 rounded-lg border bg-transparent outline-none"
              style={{
                borderColor: "rgba(255, 255, 255, 0.08)",
                fontFamily: "'Inter', sans-serif",
                fontSize: "14px",
                color: "#F0F0FF",
              }}
            />
          </div>
          <div>
            <label className="block text-[12px] mb-2" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
              Tech Stack (comma-separated)
            </label>
            <input
              type="text"
              value={techStack}
              onChange={(e) => setTechStack(e.target.value)}
              placeholder="e.g. Next.js, TypeScript, Tailwind, Prisma"
              className="w-full px-4 py-2.5 rounded-lg border bg-transparent outline-none"
              style={{
                borderColor: "rgba(255, 255, 255, 0.08)",
                fontFamily: "'Inter', sans-serif",
                fontSize: "14px",
                color: "#F0F0FF",
              }}
            />
          </div>
          <div className="col-span-2">
            <label className="block text-[12px] mb-2" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what your project does..."
              rows={3}
              className="w-full px-4 py-2.5 rounded-lg border bg-transparent outline-none resize-none"
              style={{
                borderColor: "rgba(255, 255, 255, 0.08)",
                fontFamily: "'Inter', sans-serif",
                fontSize: "14px",
                color: "#F0F0FF",
              }}
            />
          </div>
          <div>
            <label className="block text-[12px] mb-2" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
              Key Features (comma-separated, optional)
            </label>
            <input
              type="text"
              value={features}
              onChange={(e) => setFeatures(e.target.value)}
              placeholder="e.g. Auth, Real-time chat, File uploads"
              className="w-full px-4 py-2.5 rounded-lg border bg-transparent outline-none"
              style={{
                borderColor: "rgba(255, 255, 255, 0.08)",
                fontFamily: "'Inter', sans-serif",
                fontSize: "14px",
                color: "#F0F0FF",
              }}
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isPortfolioProject}
                onChange={(e) => setIsPortfolioProject(e.target.checked)}
                className="w-4 h-4 rounded border accent-[#8B5CF6]"
              />
              <span className="text-[12px]" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
                Portfolio / showcase project
              </span>
            </label>
          </div>
        </div>
        <div className="flex justify-end">
          <button
            onClick={handleGenerate}
            disabled={!repoName.trim() || !description.trim() || !techStack.trim() || readmeMutation.isPending}
            className="px-6 py-2.5 rounded-lg font-semibold transition-all disabled:opacity-50"
            style={{ background: "#8B5CF6", color: "#050508", fontFamily: "'Inter', sans-serif" }}
          >
            <FileText size={16} className="inline mr-2" />
            {readmeMutation.isPending ? "Generating..." : "Generate README"}
          </button>
        </div>
      </Card>

      {readmeMutation.isPending && <LoadingSpinner message="Generating a professional README for your repository..." />}
      {readmeMutation.isError && <ErrorDisplay error={readmeMutation.error as Error} />}

      {readme && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Sections included */}
          {readme.sections.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {readme.sections.map((section, i) => (
                <span
                  key={i}
                  className="text-[11px] px-2.5 py-1 rounded-full"
                  style={{ background: "rgba(124, 58, 237, 0.08)", color: "#8B5CF6", fontFamily: "'Inter', sans-serif" }}
                >
                  {section}
                </span>
              ))}
            </div>
          )}

          {/* README content */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-[#8B5CF6]" />
                <h3 className="text-sm font-semibold" style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}>
                  Generated README.md
                </h3>
              </div>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-all"
                style={{
                  background: copied ? "rgba(74, 222, 128, 0.15)" : "rgba(124, 58, 237, 0.1)",
                  color: copied ? "#34D399" : "#8B5CF6",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <div
              className="p-4 rounded-lg overflow-auto max-h-[600px]"
              style={{
                background: "rgba(0, 0, 0, 0.3)",
                border: "1px solid rgba(255, 255, 255, 0.04)",
              }}
            >
              <pre
                className="text-[12px] leading-relaxed whitespace-pre-wrap break-words"
                style={{ fontFamily: "monospace, monospace", color: "#F0F0FF" }}
              >
                {readme.content}
              </pre>
            </div>
          </Card>

          {/* Create PR button — shown below README content */}
          {repoName.trim() && (
            <div>
              {prSuccessUrl ? (
                <div
                  className="p-3 rounded-lg flex items-center gap-3"
                  style={{ background: "rgba(74, 222, 128, 0.08)", border: "1px solid rgba(74, 222, 128, 0.2)" }}
                >
                  <Check size={16} className="text-[#34D399] flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold" style={{ fontFamily: "'Inter', sans-serif", color: "#34D399" }}>
                      PR created!
                    </p>
                    <a
                      href={prSuccessUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[12px] flex items-center gap-1 hover:underline truncate"
                      style={{ fontFamily: "'Inter', sans-serif", color: "#8B5CF6" }}
                    >
                      {prSuccessUrl}
                      <ExternalLink size={10} className="flex-shrink-0" />
                    </a>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowPRModal(true)}
                  className="w-full px-4 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 border"
                  style={{
                    borderColor: "rgba(124, 58, 237, 0.3)",
                    color: "#8B5CF6",
                    background: "rgba(124, 58, 237, 0.06)",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  <Lock size={14} />
                  <GitPullRequest size={16} />
                  Create GitHub PR with this README
                </button>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* Empty State */}
      {!readmeMutation.isPending && !readme && !readmeMutation.isError && (
        <div className="text-center py-16">
          <FileText size={48} className="mx-auto mb-4 text-[#3A3A60]" />
          <p className="text-lg font-semibold mb-2" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
            Generate a professional README
          </p>
          <p className="text-sm text-[#3A3A60]" style={{ fontFamily: "'Inter', sans-serif" }}>
            Describe your project and get a complete, well-structured README.md ready to use
          </p>
        </div>
      )}

      {/* PR Modal */}
      {showPRModal && (
        <PRModal
          repoName={repoName.trim()}
          onSuccess={(url) => {
            setPrSuccessUrl(url);
            setShowPRModal(false);
          }}
          onClose={() => setShowPRModal(false)}
        />
      )}
    </div>
  );
}

// === Main Page ===

export default function GitHubOptimizerPage() {
  const [activeTab, setActiveTab] = useState<TabId>("analysis");

  const autoOptimizeMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ data: AutoOptimizeGitHubResult }>("/api/optimize/github/enhanced", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "auto-optimize" }),
      }),
  });

  const autoResult = autoOptimizeMutation.data as Record<string, unknown> | undefined;
  const autoData = autoResult?.data as AutoOptimizeGitHubResult | undefined;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ background: "rgba(124, 58, 237, 0.08)", border: "1px solid rgba(124, 58, 237, 0.2)" }}
        >
          <Github size={20} className="text-[#8B5CF6]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}>
            GitHub Profile Optimizer
          </h1>
          <p className="text-sm" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
            Analyze and optimize your GitHub profile for recruiters
          </p>
        </div>
      </div>

      {/* Auto-Optimize Everything Button */}
      <div
        className="p-5 rounded-lg border"
        style={{
          background: "linear-gradient(135deg, rgba(124, 58, 237, 0.06), rgba(74, 222, 128, 0.06))",
          borderColor: "rgba(124, 58, 237, 0.2)",
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap size={24} style={{ color: "#8B5CF6" }} />
            <div>
              <h2 className="text-base font-bold" style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}>
                Auto-Optimize Everything
              </h2>
              <p className="text-[12px]" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
                Automatically optimize your portfolio, find contribution opportunities, and generate READMEs from your profile
              </p>
            </div>
          </div>
          <button
            onClick={() => autoOptimizeMutation.mutate()}
            disabled={autoOptimizeMutation.isPending}
            className="px-6 py-2.5 rounded-lg font-semibold transition-all disabled:opacity-50 flex items-center gap-2 flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, #8B5CF6, #34D399)",
              color: "#050508",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            <Zap size={16} />
            {autoOptimizeMutation.isPending ? "Optimizing..." : "Run Full Optimization"}
          </button>
        </div>

        {autoOptimizeMutation.isPending && (
          <div className="mt-4">
            <LoadingSpinner message="Running full GitHub optimization -- analyzing portfolio, finding contributions, generating READMEs..." />
          </div>
        )}

        {autoOptimizeMutation.isError && (
          <div className="mt-4">
            <ErrorDisplay error={autoOptimizeMutation.error as Error} />
          </div>
        )}

        {autoData && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg" style={{ background: "rgba(124, 58, 237, 0.1)" }}>
                <p className="text-[11px] font-medium mb-1" style={{ fontFamily: "'Inter', sans-serif", color: "#8B5CF6" }}>
                  Pin Recommendations
                </p>
                <p className="text-lg font-bold" style={{ fontFamily: "monospace, monospace", color: "#F0F0FF" }}>
                  {autoData.portfolio?.pin_recommendations?.length || 0}
                </p>
              </div>
              <div className="p-3 rounded-lg" style={{ background: "rgba(83, 109, 254, 0.1)" }}>
                <p className="text-[11px] font-medium mb-1" style={{ fontFamily: "'Inter', sans-serif", color: "#536DFE" }}>
                  Projects to Contribute
                </p>
                <p className="text-lg font-bold" style={{ fontFamily: "monospace, monospace", color: "#F0F0FF" }}>
                  {autoData.contributions?.recommended_projects?.length || 0}
                </p>
              </div>
              <div className="p-3 rounded-lg" style={{ background: "rgba(255, 171, 0, 0.1)" }}>
                <p className="text-[11px] font-medium mb-1" style={{ fontFamily: "'Inter', sans-serif", color: "#FBBF24" }}>
                  README Generated
                </p>
                <p className="text-lg font-bold" style={{ fontFamily: "monospace, monospace", color: "#F0F0FF" }}>
                  {autoData.readme ? "Yes" : "No"}
                </p>
              </div>
            </div>
            <p className="text-[11px] mt-3" style={{ fontFamily: "'Inter', sans-serif", color: "#3A3A60" }}>
              GitHub: @{autoData.username}
              {autoData.derivedFields.languages.length > 0 && ` | Languages: ${autoData.derivedFields.languages.join(', ')}`}
              {autoData.derivedFields.targetRole && ` | Target: ${autoData.derivedFields.targetRole}`}
            </p>
            {autoData.errors.portfolio && (
              <p className="text-[11px] mt-1" style={{ color: "#F87171" }}>Portfolio: {autoData.errors.portfolio}</p>
            )}
            {autoData.errors.contributions && (
              <p className="text-[11px] mt-1" style={{ color: "#F87171" }}>Contributions: {autoData.errors.contributions}</p>
            )}
          </motion.div>
        )}
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 p-1 rounded-lg" style={{ background: "rgba(255, 255, 255, 0.03)" }}>
        {tabs.map((tab) => (
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

      {/* Tab Content */}
      {activeTab === "analysis" && <ProfileAnalysisTab />}
      {activeTab === "portfolio" && <PortfolioTab />}
      {activeTab === "contribute" && <ContributeTab />}
      {activeTab === "readme" && <ReadmeGenTab />}
    </div>
  );
}
