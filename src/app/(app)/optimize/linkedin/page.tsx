"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import {
  Linkedin,
  ArrowUp,
  AlertCircle,
  Copy,
  CheckCircle2,
  Lightbulb,
  Users,
  CalendarDays,
  Clock,
  Hash,
  MessageSquare,
  Target,
  Sparkles,
  Zap,
} from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

// ─── Shared Interfaces ────────────────────────────────────────────────────────

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

interface PostIdea {
  title: string;
  hook: string;
  content_outline: string[];
  hashtags: string[];
  best_time: string;
  engagement_type: string;
}

interface TargetConnection {
  role_type: string;
  why: string;
  where_to_find: string;
  outreach_template: string;
}

interface NetworkGroup {
  name: string;
  reason: string;
}

interface CalendarPost {
  day: string;
  topic: string;
  format: string;
  key_points: string[];
}

interface CalendarWeek {
  week_number: number;
  theme: string;
  posts: CalendarPost[];
}

interface UserProfile {
  name?: string;
  headline?: string;
  skills?: Array<{ name: string; proficiency?: string }> | string[];
  experience?: Array<{ title: string; company: string; description?: string }>;
  preferences?: {
    targetRoles?: string[];
    targetCompanies?: string[];
    industries?: string[];
  };
}

interface AutoOptimizeResult {
  posts: { posts: PostIdea[] };
  network: {
    target_connections: TargetConnection[];
    groups: NetworkGroup[];
    weekly_actions: string[];
  };
  calendar: { weeks: CalendarWeek[] };
  derivedFields: {
    targetField: string;
    niche: string;
    goals: string[];
    targetRole: string | null;
    targetCompanies: string[] | null;
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

// ─── Tab Config ───────────────────────────────────────────────────────────────

const tabs = [
  { id: "analysis" as const, label: "Profile Analysis", icon: Linkedin },
  { id: "posts" as const, label: "Post Ideas", icon: Lightbulb },
  { id: "network" as const, label: "Networking", icon: Users },
  { id: "calendar" as const, label: "Content Calendar", icon: CalendarDays },
];

type TabId = (typeof tabs)[number]["id"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const cardStyle = {
  background: "rgba(11, 11, 20, 0.7)",
  backdropFilter: "blur(12px)",
  borderColor: "rgba(255, 255, 255, 0.04)",
};

const inputStyle = {
  borderColor: "rgba(255, 255, 255, 0.08)",
  fontFamily: "'Inter', sans-serif",
  fontSize: "14px",
  color: "#F0F0FF",
};

const getScoreColor = (score: number) => {
  if (score >= 90) return "#34D399";
  if (score >= 75) return "#8B5CF6";
  if (score >= 60) return "#FBBF24";
  return "#F87171";
};

const getScoreLabel = (score: number) => {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 60) return "Needs Work";
  return "Poor";
};

const engagementColors: Record<string, string> = {
  "thought-leadership": "#536DFE",
  storytelling: "#8B5CF6",
  "how-to": "#34D399",
  debate: "#F87171",
  celebration: "#FBBF24",
  "data-insight": "#7C4DFF",
};

// ─── Loading / Error Components ───────────────────────────────────────────────

function LoadingSpinner({ message }: { message: string }) {
  return (
    <div className="text-center py-12">
      <div
        className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-4"
        style={{ borderColor: "rgba(83, 109, 254, 0.3)", borderTopColor: "transparent" }}
      />
      <p className="text-[#9090B8]" style={{ fontFamily: "'Inter', sans-serif" }}>
        {message}
      </p>
    </div>
  );
}

function ErrorAlert({ error }: { error: Error | null }) {
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LinkedInOptimizerPage() {
  const [activeTab, setActiveTab] = useState<TabId>("analysis");

  const autoOptimizeMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ data: AutoOptimizeResult }>("/api/optimize/linkedin/enhanced", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "auto-optimize" }),
      }),
  });

  const autoResult = autoOptimizeMutation.data as Record<string, unknown> | undefined;
  const autoData = autoResult?.data as AutoOptimizeResult | undefined;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(83, 109, 254, 0.08)", border: "1px solid rgba(83, 109, 254, 0.2)" }}
          >
            <Linkedin size={20} style={{ color: "#536DFE" }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}>
              LinkedIn Profile Optimizer
            </h1>
            <p className="text-sm" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
              Optimize your LinkedIn profile, generate content, and grow your network
            </p>
          </div>
        </div>
      </div>

      {/* Auto-Optimize Everything Button */}
      <div
        className="p-5 rounded-lg border"
        style={{
          background: "linear-gradient(135deg, rgba(83, 109, 254, 0.08), rgba(124, 77, 255, 0.08))",
          borderColor: "rgba(83, 109, 254, 0.2)",
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap size={24} style={{ color: "#536DFE" }} />
            <div>
              <h2 className="text-base font-bold" style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}>
                Auto-Optimize Everything
              </h2>
              <p className="text-[12px]" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
                Automatically generate post ideas, networking strategy, and content calendar from your profile -- no manual input needed
              </p>
            </div>
          </div>
          <button
            onClick={() => autoOptimizeMutation.mutate()}
            disabled={autoOptimizeMutation.isPending}
            className="px-6 py-2.5 rounded-lg font-semibold transition-all disabled:opacity-50 flex items-center gap-2 flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, #536DFE, #7C4DFF)",
              color: "#FFFFFF",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            <Zap size={16} />
            {autoOptimizeMutation.isPending ? "Optimizing..." : "Run Full Optimization"}
          </button>
        </div>

        {autoOptimizeMutation.isPending && (
          <div className="mt-4">
            <LoadingSpinner message="Running full LinkedIn optimization -- generating posts, network strategy, and content calendar..." />
          </div>
        )}

        {autoOptimizeMutation.isError && (
          <div className="mt-4">
            <ErrorAlert error={autoOptimizeMutation.error as Error} />
          </div>
        )}

        {autoData && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg" style={{ background: "rgba(83, 109, 254, 0.1)" }}>
                <p className="text-[11px] font-medium mb-1" style={{ fontFamily: "'Inter', sans-serif", color: "#536DFE" }}>
                  Post Ideas
                </p>
                <p className="text-lg font-bold" style={{ fontFamily: "monospace, monospace", color: "#F0F0FF" }}>
                  {autoData.posts?.posts?.length || 0}
                </p>
              </div>
              <div className="p-3 rounded-lg" style={{ background: "rgba(124, 58, 237, 0.1)" }}>
                <p className="text-[11px] font-medium mb-1" style={{ fontFamily: "'Inter', sans-serif", color: "#8B5CF6" }}>
                  Target Connections
                </p>
                <p className="text-lg font-bold" style={{ fontFamily: "monospace, monospace", color: "#F0F0FF" }}>
                  {autoData.network?.target_connections?.length || 0}
                </p>
              </div>
              <div className="p-3 rounded-lg" style={{ background: "rgba(255, 171, 0, 0.1)" }}>
                <p className="text-[11px] font-medium mb-1" style={{ fontFamily: "'Inter', sans-serif", color: "#FBBF24" }}>
                  Calendar Weeks
                </p>
                <p className="text-lg font-bold" style={{ fontFamily: "monospace, monospace", color: "#F0F0FF" }}>
                  {autoData.calendar?.weeks?.length || 0}
                </p>
              </div>
            </div>
            {autoData.derivedFields && (
              <p className="text-[11px] mt-3" style={{ fontFamily: "'Inter', sans-serif", color: "#3A3A60" }}>
                Auto-derived: field = {autoData.derivedFields.targetField}, niche = {autoData.derivedFields.niche}
                {autoData.derivedFields.targetRole && `, role = ${autoData.derivedFields.targetRole}`}
              </p>
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
            className="px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2"
            style={{
              background: activeTab === tab.id ? "rgba(83, 109, 254, 0.15)" : "transparent",
              color: activeTab === tab.id ? "#536DFE" : "#9090B8",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "analysis" && <ProfileAnalysisTab />}
      {activeTab === "posts" && <PostIdeasTab />}
      {activeTab === "network" && <NetworkingTab />}
      {activeTab === "calendar" && <ContentCalendarTab />}
    </div>
  );
}

// ─── Tab 1: Profile Analysis (existing functionality) ─────────────────────────

function ProfileAnalysisTab() {
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

  const copyHeadline = (headline: string, index: number) => {
    navigator.clipboard.writeText(headline);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Analysis Form */}
      <div className="p-6 rounded-lg border" style={cardStyle}>
        <p className="text-[12px] mb-4" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
          This analyzer uses your saved AutoApply profile. Make sure your profile is complete for the best results.
        </p>
        <div className="flex gap-3">
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
              style={inputStyle}
            />
          </div>
          <div className="flex-1">
            <label className="block text-[12px] mb-2" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
              Target Industry (optional)
            </label>
            <input
              type="text"
              value={targetIndustry}
              onChange={(e) => setTargetIndustry(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
              placeholder="e.g. FinTech, SaaS"
              className="w-full px-4 py-2.5 rounded-lg border bg-transparent outline-none"
              style={inputStyle}
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleAnalyze}
              disabled={analyzeMutation.isPending}
              className="px-6 py-2.5 rounded-lg font-semibold transition-all disabled:opacity-50"
              style={{ background: "#536DFE", color: "#FFFFFF", fontFamily: "'Inter', sans-serif" }}
            >
              {analyzeMutation.isPending ? "Analyzing..." : "Optimize"}
            </button>
          </div>
        </div>
      </div>

      {/* Loading */}
      {analyzeMutation.isPending && <LoadingSpinner message="Analyzing your profile with AI..." />}

      {/* Error */}
      {analyzeMutation.isError && <ErrorAlert error={analyzeMutation.error as Error} />}

      {/* Results */}
      {analysis && profileSummary && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Profile Summary + Overall Score */}
          <div className="flex gap-4">
            <div className="flex-1 p-6 rounded-lg border" style={cardStyle}>
              <h2 className="text-lg font-bold mb-1" style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}>
                {profileSummary.name}
              </h2>
              <p className="text-sm mb-3" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
                {profileSummary.headline || "No headline set"}
              </p>
              <div className="flex gap-6 text-sm" style={{ fontFamily: "monospace, monospace" }}>
                <span className="text-[#9090B8]">
                  <span className="text-[#F0F0FF] font-bold">{profileSummary.experienceCount}</span> positions
                </span>
                <span className="text-[#9090B8]">
                  <span className="text-[#F0F0FF] font-bold">{profileSummary.skillsCount}</span> skills
                </span>
                <span className="text-[#9090B8]">
                  <span className="text-[#F0F0FF] font-bold">{profileSummary.educationCount}</span> education
                </span>
              </div>
            </div>

            {/* Overall Score */}
            <div
              className="w-[200px] p-6 rounded-lg border flex flex-col items-center justify-center"
              style={cardStyle}
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
              <span
                className="text-sm font-semibold"
                style={{ fontFamily: "'Inter', sans-serif", color: getScoreColor(analysis.overall_score) }}
              >
                {getScoreLabel(analysis.overall_score)}
              </span>
              <span className="text-[11px] text-[#3A3A60] mt-1">Overall Score</span>
            </div>
          </div>

          {/* Headline Options */}
          {analysis.headline_options && analysis.headline_options.length > 0 && (
            <div className="p-6 rounded-lg border" style={cardStyle}>
              <h3 className="text-sm font-semibold mb-4" style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}>
                Suggested Headlines
              </h3>
              <div className="space-y-2">
                {analysis.headline_options.map((headline, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 rounded-lg border transition-all hover:border-[rgba(83,109,254,0.2)]"
                    style={{ background: "rgba(255, 255, 255, 0.02)", borderColor: "rgba(255, 255, 255, 0.04)" }}
                  >
                    <span className="text-[13px] flex-1" style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}>
                      {headline}
                    </span>
                    <button
                      onClick={() => copyHeadline(headline, i)}
                      className="ml-3 p-1.5 rounded hover:bg-white/5 transition-all flex-shrink-0"
                    >
                      {copiedIndex === i ? (
                        <CheckCircle2 size={14} className="text-[#34D399]" />
                      ) : (
                        <Copy size={14} className="text-[#3A3A60]" />
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
                <div key={section} className="p-5 rounded-lg border" style={cardStyle}>
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
                        <ArrowUp size={14} className="text-[#536DFE] flex-shrink-0 mt-0.5" />
                        <span className="text-[12px] leading-relaxed" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
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
          <Linkedin size={48} className="mx-auto mb-4 text-[#3A3A60]" />
          <p className="text-lg font-semibold mb-2" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
            Optimize your LinkedIn profile
          </p>
          <p className="text-sm text-[#3A3A60] mb-4" style={{ fontFamily: "'Inter', sans-serif" }}>
            Uses your saved AutoApply profile to generate LinkedIn-specific recommendations
          </p>
          <button
            onClick={handleAnalyze}
            disabled={analyzeMutation.isPending}
            className="px-6 py-2.5 rounded-lg font-semibold transition-all"
            style={{ background: "#536DFE", color: "#FFFFFF", fontFamily: "'Inter', sans-serif" }}
          >
            Analyze My Profile
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Tab 2: Post Ideas ────────────────────────────────────────────────────────

function PostIdeasTab() {
  const [targetField, setTargetField] = useState("");
  const [niche, setNiche] = useState("");
  const [copiedHook, setCopiedHook] = useState<number | null>(null);
  const [prefilled, setPrefilled] = useState(false);

  const profileQuery = useQuery({
    queryKey: ['profile-for-linkedin-posts'],
    queryFn: () => apiFetch<{ data: UserProfile }>('/api/profile'),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (prefilled) return;
    const profileResult = profileQuery.data as Record<string, unknown> | undefined;
    const profile = profileResult?.data as UserProfile | undefined;
    if (!profile) return;
    const skills = extractSkillNamesClient(profile.skills);
    const experience = profile.experience || [];
    if (!targetField && experience.length > 0) {
      setTargetField(experience[0].title || '');
    } else if (!targetField && skills.length > 0) {
      setTargetField(skills.slice(0, 3).join(', '));
    }
    if (!niche && profile.headline) {
      setNiche(profile.headline);
    } else if (!niche && skills.length > 0) {
      setNiche(skills.slice(0, 2).join(' & '));
    }
    setPrefilled(true);
  }, [profileQuery.data, prefilled, targetField, niche]);

  const postsMutation = useMutation({
    mutationFn: (data: { action: string; targetField: string; niche?: string }) =>
      apiFetch<{ data: { posts: { posts: PostIdea[] }; targetField: string } }>(
        "/api/optimize/linkedin/enhanced",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      ),
  });

  const handleGenerate = () => {
    postsMutation.mutate({
      action: "posts",
      targetField: targetField.trim() || "general professional development",
      niche: niche.trim() || undefined,
    });
  };

  const result = postsMutation.data as Record<string, unknown> | undefined;
  const resultData = result?.data as Record<string, unknown> | undefined;
  const postsResult = resultData?.posts as { posts: PostIdea[] } | undefined;
  const posts = postsResult?.posts || [];

  const copyHook = (hook: string, index: number) => {
    navigator.clipboard.writeText(hook);
    setCopiedHook(index);
    setTimeout(() => setCopiedHook(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Form */}
      <div className="p-6 rounded-lg border" style={cardStyle}>
        <p className="text-[12px] mb-4" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
          Generate LinkedIn post ideas tailored to your profile and target audience. Each idea includes a scroll-stopping hook, content outline, and optimal posting time.
        </p>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-[12px] mb-2" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
              Target Field
            </label>
            <input
              type="text"
              value={targetField}
              onChange={(e) => setTargetField(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              placeholder="e.g. Software Engineering, Product Management"
              className="w-full px-4 py-2.5 rounded-lg border bg-transparent outline-none"
              style={inputStyle}
            />
          </div>
          <div className="flex-1">
            <label className="block text-[12px] mb-2" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
              Niche (optional)
            </label>
            <input
              type="text"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              placeholder="e.g. AI/ML, DevOps, Startup Growth"
              className="w-full px-4 py-2.5 rounded-lg border bg-transparent outline-none"
              style={inputStyle}
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleGenerate}
              disabled={postsMutation.isPending}
              className="px-6 py-2.5 rounded-lg font-semibold transition-all disabled:opacity-50"
              style={{ background: "#536DFE", color: "#FFFFFF", fontFamily: "'Inter', sans-serif" }}
            >
              {postsMutation.isPending ? "Generating..." : "Generate Ideas"}
            </button>
          </div>
        </div>
      </div>

      {postsMutation.isPending && <LoadingSpinner message="Generating post ideas with AI..." />}
      {postsMutation.isError && <ErrorAlert error={postsMutation.error as Error} />}

      {/* Post Ideas Results */}
      {posts.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <h3 className="text-sm font-semibold" style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}>
            {posts.length} Post Ideas Generated
          </h3>
          {posts.map((post, i) => {
            const typeColor = engagementColors[post.engagement_type] || "#536DFE";
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-5 rounded-lg border"
                style={cardStyle}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                        style={{ background: `${typeColor}15`, color: typeColor }}
                      >
                        {post.engagement_type}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-[#3A3A60]">
                        <Clock size={10} />
                        {post.best_time}
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold mb-2" style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}>
                      {post.title}
                    </h4>
                  </div>
                  <button
                    onClick={() => copyHook(post.hook, i)}
                    className="p-1.5 rounded hover:bg-white/5 transition-all flex-shrink-0 ml-3"
                    title="Copy hook"
                  >
                    {copiedHook === i ? (
                      <CheckCircle2 size={14} className="text-[#34D399]" />
                    ) : (
                      <Copy size={14} className="text-[#3A3A60]" />
                    )}
                  </button>
                </div>

                {/* Hook */}
                <div
                  className="p-3 rounded-lg mb-3"
                  style={{ background: "rgba(83, 109, 254, 0.05)", border: "1px solid rgba(83, 109, 254, 0.1)" }}
                >
                  <p className="text-[12px] font-medium mb-1" style={{ fontFamily: "'Inter', sans-serif", color: "#536DFE" }}>
                    Hook
                  </p>
                  <p className="text-[13px] leading-relaxed whitespace-pre-line" style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}>
                    {post.hook}
                  </p>
                </div>

                {/* Content Outline */}
                {post.content_outline.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[11px] font-medium mb-2" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
                      Content Outline
                    </p>
                    <ul className="space-y-1">
                      {post.content_outline.map((point, j) => (
                        <li key={j} className="flex items-start gap-2">
                          <Sparkles size={12} className="text-[#536DFE] flex-shrink-0 mt-0.5" />
                          <span className="text-[12px]" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
                            {point}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Hashtags */}
                {post.hashtags.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Hash size={12} className="text-[#3A3A60]" />
                    {post.hashtags.map((tag, j) => (
                      <span
                        key={j}
                        className="text-[11px] px-2 py-0.5 rounded"
                        style={{ background: "rgba(255, 255, 255, 0.03)", color: "#9090B8", fontFamily: "monospace, monospace" }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Empty State */}
      {!postsMutation.isPending && posts.length === 0 && !postsMutation.isError && (
        <div className="text-center py-16">
          <Lightbulb size={48} className="mx-auto mb-4 text-[#3A3A60]" />
          <p className="text-lg font-semibold mb-2" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
            Generate LinkedIn post ideas
          </p>
          <p className="text-sm text-[#3A3A60] mb-4" style={{ fontFamily: "'Inter', sans-serif" }}>
            Get 10 tailored post ideas with hooks, outlines, and optimal posting times
          </p>
          <button
            onClick={handleGenerate}
            disabled={postsMutation.isPending}
            className="px-6 py-2.5 rounded-lg font-semibold transition-all"
            style={{ background: "#536DFE", color: "#FFFFFF", fontFamily: "'Inter', sans-serif" }}
          >
            Generate Ideas
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Tab 3: Networking ────────────────────────────────────────────────────────

function NetworkingTab() {
  const [goals, setGoals] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [targetCompanies, setTargetCompanies] = useState("");
  const [copiedTemplate, setCopiedTemplate] = useState<number | null>(null);
  const [prefilled, setPrefilled] = useState(false);

  const profileQuery = useQuery({
    queryKey: ['profile-for-linkedin-network'],
    queryFn: () => apiFetch<{ data: UserProfile }>('/api/profile'),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (prefilled) return;
    const profileResult = profileQuery.data as Record<string, unknown> | undefined;
    const profile = profileResult?.data as UserProfile | undefined;
    if (!profile) return;
    const prefs = profile.preferences;
    if (!targetRole && prefs?.targetRoles && prefs.targetRoles.length > 0) {
      setTargetRole(prefs.targetRoles[0]);
    }
    if (!targetCompanies && prefs?.targetCompanies && prefs.targetCompanies.length > 0) {
      setTargetCompanies(prefs.targetCompanies.join(', '));
    }
    if (!goals && prefs?.industries && prefs.industries.length > 0) {
      setGoals(`Build network in ${prefs.industries.join(', ')}`);
    }
    setPrefilled(true);
  }, [profileQuery.data, prefilled, targetRole, targetCompanies, goals]);

  const networkMutation = useMutation({
    mutationFn: (data: {
      action: string;
      goals?: string[];
      targetRole?: string;
      targetCompanies?: string[];
    }) =>
      apiFetch<{
        data: {
          network: {
            target_connections: TargetConnection[];
            groups: NetworkGroup[];
            weekly_actions: string[];
          };
          goals: string[];
        };
      }>("/api/optimize/linkedin/enhanced", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
  });

  const handleGenerate = () => {
    const goalList = goals
      .split(",")
      .map((g) => g.trim())
      .filter((g) => g.length > 0);
    const companyList = targetCompanies
      .split(",")
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    networkMutation.mutate({
      action: "network",
      goals: goalList.length > 0 ? goalList : undefined,
      targetRole: targetRole.trim() || undefined,
      targetCompanies: companyList.length > 0 ? companyList : undefined,
    });
  };

  const result = networkMutation.data as Record<string, unknown> | undefined;
  const resultData = result?.data as Record<string, unknown> | undefined;
  const networkResult = resultData?.network as {
    target_connections: TargetConnection[];
    groups: NetworkGroup[];
    weekly_actions: string[];
  } | undefined;

  const connections = networkResult?.target_connections || [];
  const groups = networkResult?.groups || [];
  const weeklyActions = networkResult?.weekly_actions || [];

  const copyTemplate = (template: string, index: number) => {
    navigator.clipboard.writeText(template);
    setCopiedTemplate(index);
    setTimeout(() => setCopiedTemplate(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Form */}
      <div className="p-6 rounded-lg border" style={cardStyle}>
        <p className="text-[12px] mb-4" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
          Generate a personalized networking strategy with connection targets, outreach templates, and groups to join.
        </p>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-[12px] mb-2" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
              Goals (comma-separated)
            </label>
            <input
              type="text"
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              placeholder="e.g. Land a senior role, Build thought leadership"
              className="w-full px-4 py-2.5 rounded-lg border bg-transparent outline-none"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="block text-[12px] mb-2" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
              Target Role (optional)
            </label>
            <input
              type="text"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              placeholder="e.g. Engineering Manager"
              className="w-full px-4 py-2.5 rounded-lg border bg-transparent outline-none"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="block text-[12px] mb-2" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
              Target Companies (optional)
            </label>
            <input
              type="text"
              value={targetCompanies}
              onChange={(e) => setTargetCompanies(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              placeholder="e.g. Google, Stripe, Figma"
              className="w-full px-4 py-2.5 rounded-lg border bg-transparent outline-none"
              style={inputStyle}
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleGenerate}
            disabled={networkMutation.isPending}
            className="px-6 py-2.5 rounded-lg font-semibold transition-all disabled:opacity-50"
            style={{ background: "#536DFE", color: "#FFFFFF", fontFamily: "'Inter', sans-serif" }}
          >
            {networkMutation.isPending ? "Generating..." : "Build Strategy"}
          </button>
        </div>
      </div>

      {networkMutation.isPending && <LoadingSpinner message="Building your networking strategy with AI..." />}
      {networkMutation.isError && <ErrorAlert error={networkMutation.error as Error} />}

      {/* Networking Results */}
      {(connections.length > 0 || groups.length > 0 || weeklyActions.length > 0) && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Target Connections */}
          {connections.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}>
                <Target size={16} className="text-[#536DFE]" />
                Target Connections ({connections.length})
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {connections.map((conn, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="p-4 rounded-lg border"
                    style={cardStyle}
                  >
                    <h4 className="text-[13px] font-semibold mb-2" style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}>
                      {conn.role_type}
                    </h4>
                    <p className="text-[12px] mb-2" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
                      {conn.why}
                    </p>
                    <p className="text-[11px] mb-3" style={{ fontFamily: "'Inter', sans-serif", color: "#3A3A60" }}>
                      Find them: {conn.where_to_find}
                    </p>
                    <div
                      className="p-3 rounded-lg relative"
                      style={{ background: "rgba(83, 109, 254, 0.05)", border: "1px solid rgba(83, 109, 254, 0.1)" }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] font-medium" style={{ fontFamily: "'Inter', sans-serif", color: "#536DFE" }}>
                          Outreach Template
                        </p>
                        <button
                          onClick={() => copyTemplate(conn.outreach_template, i)}
                          className="p-1 rounded hover:bg-white/5 transition-all"
                        >
                          {copiedTemplate === i ? (
                            <CheckCircle2 size={12} className="text-[#34D399]" />
                          ) : (
                            <Copy size={12} className="text-[#3A3A60]" />
                          )}
                        </button>
                      </div>
                      <p className="text-[12px] leading-relaxed" style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}>
                        {conn.outreach_template}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Groups */}
          {groups.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}>
                <Users size={16} className="text-[#8B5CF6]" />
                Groups to Join ({groups.length})
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {groups.map((group, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="p-4 rounded-lg border"
                    style={cardStyle}
                  >
                    <h4 className="text-[13px] font-semibold mb-1" style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}>
                      {group.name}
                    </h4>
                    <p className="text-[12px]" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
                      {group.reason}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Weekly Actions */}
          {weeklyActions.length > 0 && (
            <div className="p-5 rounded-lg border" style={cardStyle}>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}>
                <CalendarDays size={16} className="text-[#FBBF24]" />
                Weekly Action Plan
              </h3>
              <ul className="space-y-2">
                {weeklyActions.map((action, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span
                      className="text-[11px] font-bold min-w-[20px] h-5 flex items-center justify-center rounded-full"
                      style={{ background: "rgba(83, 109, 254, 0.1)", color: "#536DFE", fontFamily: "monospace, monospace" }}
                    >
                      {i + 1}
                    </span>
                    <span className="text-[13px]" style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}>
                      {action}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>
      )}

      {/* Empty State */}
      {!networkMutation.isPending && connections.length === 0 && !networkMutation.isError && (
        <div className="text-center py-16">
          <Users size={48} className="mx-auto mb-4 text-[#3A3A60]" />
          <p className="text-lg font-semibold mb-2" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
            Build your networking strategy
          </p>
          <p className="text-sm text-[#3A3A60] mb-4" style={{ fontFamily: "'Inter', sans-serif" }}>
            Get personalized connection targets, outreach templates, and a weekly action plan
          </p>
          <button
            onClick={handleGenerate}
            disabled={networkMutation.isPending}
            className="px-6 py-2.5 rounded-lg font-semibold transition-all"
            style={{ background: "#536DFE", color: "#FFFFFF", fontFamily: "'Inter', sans-serif" }}
          >
            Build Strategy
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Tab 4: Content Calendar ──────────────────────────────────────────────────

function ContentCalendarTab() {
  const [calNiche, setCalNiche] = useState("");
  const [postsPerWeek, setPostsPerWeek] = useState("3");
  const [prefilled, setPrefilled] = useState(false);

  const profileQuery = useQuery({
    queryKey: ['profile-for-linkedin-calendar'],
    queryFn: () => apiFetch<{ data: UserProfile }>('/api/profile'),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (prefilled) return;
    const profileResult = profileQuery.data as Record<string, unknown> | undefined;
    const profile = profileResult?.data as UserProfile | undefined;
    if (!profile) return;
    if (!calNiche && profile.headline) {
      setCalNiche(profile.headline);
    } else if (!calNiche) {
      const skills = extractSkillNamesClient(profile.skills);
      if (skills.length > 0) setCalNiche(skills.slice(0, 2).join(' & '));
    }
    setPrefilled(true);
  }, [profileQuery.data, prefilled, calNiche]);

  const calendarMutation = useMutation({
    mutationFn: (data: { action: string; niche: string; postsPerWeek?: number }) =>
      apiFetch<{
        data: {
          calendar: { weeks: CalendarWeek[] };
          niche: string;
        };
      }>("/api/optimize/linkedin/enhanced", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
  });

  const handleGenerate = () => {
    calendarMutation.mutate({
      action: "calendar",
      niche: calNiche.trim() || "professional insights",
      postsPerWeek: parseInt(postsPerWeek, 10) || 3,
    });
  };

  const result = calendarMutation.data as Record<string, unknown> | undefined;
  const resultData = result?.data as Record<string, unknown> | undefined;
  const calendarResult = resultData?.calendar as { weeks: CalendarWeek[] } | undefined;
  const weeks = calendarResult?.weeks || [];

  const formatColors: Record<string, string> = {
    "text-post": "#536DFE",
    carousel: "#8B5CF6",
    poll: "#FBBF24",
    "image-post": "#7C4DFF",
    "video-idea": "#F87171",
    article: "#34D399",
    document: "#FF6D00",
  };

  return (
    <div className="space-y-6">
      {/* Form */}
      <div className="p-6 rounded-lg border" style={cardStyle}>
        <p className="text-[12px] mb-4" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
          Generate a 4-week content calendar with themed weeks, daily topics, and varied content formats to build your authority consistently.
        </p>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-[12px] mb-2" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
              Content Niche
            </label>
            <input
              type="text"
              value={calNiche}
              onChange={(e) => setCalNiche(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              placeholder="e.g. Cloud Architecture, Leadership, Data Science"
              className="w-full px-4 py-2.5 rounded-lg border bg-transparent outline-none"
              style={inputStyle}
            />
          </div>
          <div className="w-[160px]">
            <label className="block text-[12px] mb-2" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
              Posts / Week
            </label>
            <select
              value={postsPerWeek}
              onChange={(e) => setPostsPerWeek(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border bg-transparent outline-none appearance-none"
              style={{
                ...inputStyle,
                background: "rgba(11, 11, 20, 0.7)",
              }}
            >
              <option value="2" style={{ background: "#0C0C14" }}>2 posts</option>
              <option value="3" style={{ background: "#0C0C14" }}>3 posts</option>
              <option value="4" style={{ background: "#0C0C14" }}>4 posts</option>
              <option value="5" style={{ background: "#0C0C14" }}>5 posts</option>
              <option value="6" style={{ background: "#0C0C14" }}>6 posts</option>
              <option value="7" style={{ background: "#0C0C14" }}>7 posts</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleGenerate}
              disabled={calendarMutation.isPending}
              className="px-6 py-2.5 rounded-lg font-semibold transition-all disabled:opacity-50"
              style={{ background: "#536DFE", color: "#FFFFFF", fontFamily: "'Inter', sans-serif" }}
            >
              {calendarMutation.isPending ? "Generating..." : "Generate Calendar"}
            </button>
          </div>
        </div>
      </div>

      {calendarMutation.isPending && <LoadingSpinner message="Building your content calendar with AI..." />}
      {calendarMutation.isError && <ErrorAlert error={calendarMutation.error as Error} />}

      {/* Calendar Results */}
      {weeks.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {weeks.map((week, wi) => (
            <motion.div
              key={wi}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: wi * 0.1 }}
              className="p-5 rounded-lg border"
              style={cardStyle}
            >
              <div className="flex items-center gap-3 mb-4">
                <span
                  className="text-[12px] font-bold px-3 py-1 rounded-full"
                  style={{ background: "rgba(83, 109, 254, 0.1)", color: "#536DFE", fontFamily: "monospace, monospace" }}
                >
                  Week {week.week_number}
                </span>
                <h3 className="text-sm font-semibold" style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}>
                  {week.theme}
                </h3>
              </div>

              <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(week.posts.length, 4)}, 1fr)` }}>
                {week.posts.map((post, pi) => {
                  const fmtColor = formatColors[post.format] || "#536DFE";
                  return (
                    <div
                      key={pi}
                      className="p-4 rounded-lg border"
                      style={{ background: "rgba(255, 255, 255, 0.02)", borderColor: "rgba(255, 255, 255, 0.04)" }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[12px] font-semibold" style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}>
                          {post.day}
                        </span>
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                          style={{ background: `${fmtColor}15`, color: fmtColor }}
                        >
                          {post.format}
                        </span>
                      </div>
                      <p className="text-[13px] font-medium mb-2" style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}>
                        {post.topic}
                      </p>
                      {post.key_points.length > 0 && (
                        <ul className="space-y-1">
                          {post.key_points.map((point, ki) => (
                            <li key={ki} className="flex items-start gap-1.5">
                              <MessageSquare size={10} className="text-[#3A3A60] flex-shrink-0 mt-1" />
                              <span className="text-[11px]" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
                                {point}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Empty State */}
      {!calendarMutation.isPending && weeks.length === 0 && !calendarMutation.isError && (
        <div className="text-center py-16">
          <CalendarDays size={48} className="mx-auto mb-4 text-[#3A3A60]" />
          <p className="text-lg font-semibold mb-2" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
            Plan your content calendar
          </p>
          <p className="text-sm text-[#3A3A60] mb-4" style={{ fontFamily: "'Inter', sans-serif" }}>
            Get a 4-week posting schedule with themed weeks, daily topics, and format variety
          </p>
          <button
            onClick={handleGenerate}
            disabled={calendarMutation.isPending}
            className="px-6 py-2.5 rounded-lg font-semibold transition-all"
            style={{ background: "#536DFE", color: "#FFFFFF", fontFamily: "'Inter', sans-serif" }}
          >
            Generate Calendar
          </button>
        </div>
      )}
    </div>
  );
}
