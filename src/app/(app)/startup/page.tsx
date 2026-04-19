"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import {
  Rocket,
  Lightbulb,
  BarChart3,
  LayoutGrid,
  Bookmark,
  AlertCircle,
  TrendingUp,
  Users,
  Target,
  Shield,
  Zap,
  Clock,
  Search,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

type TabId = "ideate" | "research" | "canvas" | "saved";

interface FeedbackMessage {
  type: "success" | "error";
  text: string;
}

export default function StartupLabPage() {
  const [activeTab, setActiveTab] = useState<TabId>("ideate");
  const [feedbackMessage, setFeedbackMessage] = useState<FeedbackMessage | null>(null);
  const queryClient = useQueryClient();

  const showFeedback = (type: "success" | "error", text: string) => {
    setFeedbackMessage({ type, text });
    setTimeout(() => setFeedbackMessage(null), 5000);
  };

  const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: "ideate", label: "Ideate", icon: Lightbulb },
    { id: "research", label: "Market Research", icon: BarChart3 },
    { id: "canvas", label: "Business Canvas", icon: LayoutGrid },
    { id: "saved", label: "My Ideas", icon: Bookmark },
  ];

  return (
    <div className="w-full">
      {/* Background texture */}
      <div
        className="fixed inset-0 opacity-[0.015] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Feedback toast */}
      {feedbackMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="mb-4 px-4 py-3 rounded-lg text-sm font-medium"
          style={{
            background: feedbackMessage.type === "success" ? "rgba(124, 58, 237, 0.1)" : "rgba(255, 71, 87, 0.1)",
            border: `1px solid ${feedbackMessage.type === "success" ? "rgba(124, 58, 237, 0.3)" : "rgba(255, 71, 87, 0.3)"}`,
            color: feedbackMessage.type === "success" ? "#8B5CF6" : "#F87171",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {feedbackMessage.text}
        </motion.div>
      )}

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <Rocket size={28} style={{ color: "#8B5CF6" }} />
          <h1
            className="text-3xl font-bold"
            style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
          >
            Startup Lab
          </h1>
        </div>
        <p
          className="text-sm ml-[40px]"
          style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
        >
          AI-powered startup ideation, market research & business planning
        </p>
      </motion.div>

      {/* Tab bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mb-6"
      >
        <div
          className="flex gap-1 p-1 rounded-lg inline-flex"
          style={{ background: "rgba(255, 255, 255, 0.03)" }}
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-md transition-all text-sm font-medium"
                style={{
                  background: activeTab === tab.id ? "rgba(124, 58, 237, 0.1)" : "transparent",
                  color: activeTab === tab.id ? "#8B5CF6" : "#9090B8",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Tab content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {activeTab === "ideate" && (
          <IdeateTab showFeedback={showFeedback} setActiveTab={setActiveTab} queryClient={queryClient} />
        )}
        {activeTab === "research" && (
          <ResearchTab showFeedback={showFeedback} />
        )}
        {activeTab === "canvas" && (
          <CanvasTab showFeedback={showFeedback} />
        )}
        {activeTab === "saved" && (
          <SavedIdeasTab showFeedback={showFeedback} setActiveTab={setActiveTab} queryClient={queryClient} />
        )}
      </motion.div>
    </div>
  );
}

/* ============================================================
   IDEATE TAB
   ============================================================ */
function IdeateTab({
  showFeedback,
  queryClient,
}: {
  showFeedback: (type: "success" | "error", text: string) => void;
  setActiveTab: (tab: TabId) => void;
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const [skills, setSkills] = useState("");
  const [interests, setInterests] = useState("");
  const [targetMarket, setTargetMarket] = useState("");
  const [budget, setBudget] = useState("");

  const ideateMutation = useMutation({
    mutationFn: () =>
      apiFetch<Record<string, unknown>>("/api/startup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ideate",
          skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
          interests: interests.split(",").map((s) => s.trim()).filter(Boolean),
          targetMarket: targetMarket || undefined,
          budget: budget || undefined,
        }),
      }),
    onError: () => showFeedback("error", "Failed to generate ideas. Check your API key."),
  });

  const saveMutation = useMutation({
    mutationFn: (ideaData: Record<string, unknown>) =>
      apiFetch<Record<string, unknown>>("/api/startup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", ideaData }),
      }),
    onSuccess: () => {
      showFeedback("success", "Idea saved successfully!");
      queryClient.invalidateQueries({ queryKey: ["startupIdeas"] });
    },
    onError: () => showFeedback("error", "Failed to save idea."),
  });

  const result = ideateMutation.data as Record<string, unknown> | undefined;
  const resultData = result?.data as Record<string, unknown> | undefined;
  const ideas = (resultData?.ideas as Record<string, unknown>[]) || [];

  const competitionColor = (level: string) => {
    if (level === "low") return "#34D399";
    if (level === "high") return "#F87171";
    return "#FBBF24";
  };

  return (
    <div className="space-y-6">
      {/* Input form */}
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
          Your Founder Profile
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              className="block text-xs font-medium mb-1.5"
              style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
            >
              Skills (comma-separated)
            </label>
            <input
              type="text"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="Python, ML, React, DevOps..."
              className="w-full px-3 py-2.5 rounded-lg border bg-transparent outline-none text-sm"
              style={{
                borderColor: "rgba(255, 255, 255, 0.08)",
                fontFamily: "'Inter', sans-serif",
                color: "#F0F0FF",
              }}
            />
          </div>
          <div>
            <label
              className="block text-xs font-medium mb-1.5"
              style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
            >
              Interests (comma-separated)
            </label>
            <input
              type="text"
              value={interests}
              onChange={(e) => setInterests(e.target.value)}
              placeholder="Fintech, Healthcare, Education..."
              className="w-full px-3 py-2.5 rounded-lg border bg-transparent outline-none text-sm"
              style={{
                borderColor: "rgba(255, 255, 255, 0.08)",
                fontFamily: "'Inter', sans-serif",
                color: "#F0F0FF",
              }}
            />
          </div>
          <div>
            <label
              className="block text-xs font-medium mb-1.5"
              style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
            >
              Target Market (optional)
            </label>
            <input
              type="text"
              value={targetMarket}
              onChange={(e) => setTargetMarket(e.target.value)}
              placeholder="B2B SaaS, Consumer, Enterprise..."
              className="w-full px-3 py-2.5 rounded-lg border bg-transparent outline-none text-sm"
              style={{
                borderColor: "rgba(255, 255, 255, 0.08)",
                fontFamily: "'Inter', sans-serif",
                color: "#F0F0FF",
              }}
            />
          </div>
          <div>
            <label
              className="block text-xs font-medium mb-1.5"
              style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
            >
              Budget (optional)
            </label>
            <input
              type="text"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="Bootstrap, $10K, $50K seed..."
              className="w-full px-3 py-2.5 rounded-lg border bg-transparent outline-none text-sm"
              style={{
                borderColor: "rgba(255, 255, 255, 0.08)",
                fontFamily: "'Inter', sans-serif",
                color: "#F0F0FF",
              }}
            />
          </div>
        </div>
        <button
          onClick={() => ideateMutation.mutate()}
          disabled={ideateMutation.isPending || (!skills.trim() && !interests.trim())}
          className="mt-4 px-6 py-2.5 rounded-lg font-semibold transition-all disabled:opacity-50"
          style={{
            background: "#8B5CF6",
            color: "#050508",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {ideateMutation.isPending ? "Generating Ideas..." : "Generate Startup Ideas"}
        </button>
      </div>

      {/* Loading */}
      {ideateMutation.isPending && (
        <div className="text-center py-12">
          <div
            className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-4"
            style={{ borderColor: "rgba(124, 58, 237, 0.3)", borderTopColor: "transparent" }}
          />
          <p className="text-sm" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
            AI is brainstorming startup ideas...
          </p>
        </div>
      )}

      {/* Error */}
      {ideateMutation.isError && (
        <div className="text-center py-8">
          <AlertCircle size={48} className="mx-auto mb-3" style={{ color: "#F87171" }} />
          <p className="text-sm" style={{ fontFamily: "'Inter', sans-serif", color: "#F87171" }}>
            Failed to generate ideas. Please try again.
          </p>
        </div>
      )}

      {/* Results */}
      {ideas.length > 0 && (
        <div className="space-y-4">
          <h3
            className="text-lg font-semibold"
            style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
          >
            Generated Ideas
          </h3>
          {ideas.map((idea, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
              className="rounded-xl p-6 border"
              style={{
                background: "rgba(11, 11, 20, 0.7)",
                backdropFilter: "blur(12px)",
                borderColor: "rgba(255, 255, 255, 0.04)",
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4
                    className="text-xl font-bold"
                    style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
                  >
                    {idea.name as string}
                  </h4>
                  <p
                    className="text-sm italic mt-0.5"
                    style={{ fontFamily: "'Inter', sans-serif", color: "#8B5CF6" }}
                  >
                    {idea.tagline as string}
                  </p>
                </div>
                <div className="flex gap-2 ml-4">
                  <span
                    className="px-2.5 py-1 rounded-full text-[11px] font-medium"
                    style={{
                      background: `${competitionColor(idea.competition_level as string)}15`,
                      color: competitionColor(idea.competition_level as string),
                      fontFamily: "monospace, monospace",
                    }}
                  >
                    {(idea.competition_level as string || "moderate").toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-[11px] uppercase font-semibold mb-1" style={{ fontFamily: "monospace, monospace", color: "#3A3A60" }}>
                    Problem
                  </p>
                  <p className="text-sm leading-relaxed" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
                    {idea.problem as string}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase font-semibold mb-1" style={{ fontFamily: "monospace, monospace", color: "#3A3A60" }}>
                    Solution
                  </p>
                  <p className="text-sm leading-relaxed" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
                    {idea.solution as string}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <div className="flex items-start gap-2">
                  <Target size={14} className="mt-0.5 shrink-0" style={{ color: "#8B5CF6" }} />
                  <div>
                    <p className="text-[10px] uppercase font-semibold" style={{ fontFamily: "monospace, monospace", color: "#3A3A60" }}>Target Market</p>
                    <p className="text-xs" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>{idea.target_market as string}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <TrendingUp size={14} className="mt-0.5 shrink-0" style={{ color: "#8B5CF6" }} />
                  <div>
                    <p className="text-[10px] uppercase font-semibold" style={{ fontFamily: "monospace, monospace", color: "#3A3A60" }}>Revenue Model</p>
                    <p className="text-xs" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>{idea.revenue_model as string}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Shield size={14} className="mt-0.5 shrink-0" style={{ color: "#8B5CF6" }} />
                  <div>
                    <p className="text-[10px] uppercase font-semibold" style={{ fontFamily: "monospace, monospace", color: "#3A3A60" }}>Unfair Advantage</p>
                    <p className="text-xs" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>{(idea.unfair_advantage as string) || "N/A"}</p>
                  </div>
                </div>
              </div>

              {/* Tech stack tags */}
              {((idea.tech_stack as string[]) || []).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {(idea.tech_stack as string[]).map((tech, tIdx) => (
                    <span
                      key={tIdx}
                      className="px-2 py-0.5 rounded text-[11px]"
                      style={{
                        background: "rgba(124, 58, 237, 0.06)",
                        color: "#8B5CF6",
                        fontFamily: "monospace, monospace",
                      }}
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              )}

              {/* Bottom row: MVP time, market size, actions */}
              <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: "rgba(255, 255, 255, 0.04)" }}>
                <div className="flex gap-4">
                  <div className="flex items-center gap-1.5">
                    <Clock size={12} style={{ color: "#3A3A60" }} />
                    <span className="text-[11px]" style={{ fontFamily: "monospace, monospace", color: "#9090B8" }}>
                      MVP: {idea.estimated_mvp_time as string}
                    </span>
                  </div>
                  {(idea.market_size as string) && (
                    <div className="flex items-center gap-1.5">
                      <BarChart3 size={12} style={{ color: "#3A3A60" }} />
                      <span className="text-[11px]" style={{ fontFamily: "monospace, monospace", color: "#9090B8" }}>
                        Market: {idea.market_size as string}
                      </span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => saveMutation.mutate(idea)}
                  disabled={saveMutation.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-white/5"
                  style={{
                    border: "1px solid rgba(124, 58, 237, 0.2)",
                    color: "#8B5CF6",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  <Bookmark size={12} />
                  Save Idea
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   MARKET RESEARCH TAB
   ============================================================ */
function ResearchTab({
  showFeedback,
}: {
  showFeedback: (type: "success" | "error", text: string) => void;
}) {
  const [idea, setIdea] = useState("");
  const [industry, setIndustry] = useState("");
  const [targetCustomer, setTargetCustomer] = useState("");

  const researchMutation = useMutation({
    mutationFn: () =>
      apiFetch<Record<string, unknown>>("/api/startup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "research",
          idea,
          industry,
          targetCustomer: targetCustomer || undefined,
        }),
      }),
    onError: () => showFeedback("error", "Failed to run market research."),
  });

  const result = researchMutation.data as Record<string, unknown> | undefined;
  const resultData = result?.data as Record<string, unknown> | undefined;
  const research = resultData?.research as Record<string, unknown> | undefined;

  const industries = [
    "SaaS", "Fintech", "Healthcare", "Education", "E-commerce", "Cybersecurity",
    "AI/ML", "Climate Tech", "Real Estate", "Gaming", "Enterprise Software", "Other",
  ];

  return (
    <div className="space-y-6">
      {/* Input */}
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
          Describe Your Startup
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
              Startup Idea
            </label>
            <textarea
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="Describe your startup idea in detail..."
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg border bg-transparent outline-none text-sm resize-none"
              style={{
                borderColor: "rgba(255, 255, 255, 0.08)",
                fontFamily: "'Inter', sans-serif",
                color: "#F0F0FF",
              }}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
                Industry
              </label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border bg-transparent outline-none text-sm"
                style={{
                  borderColor: "rgba(255, 255, 255, 0.08)",
                  fontFamily: "'Inter', sans-serif",
                  color: industry ? "#F0F0FF" : "#3A3A60",
                  backgroundColor: "rgba(11, 11, 20, 0.9)",
                }}
              >
                <option value="" style={{ backgroundColor: "#0C0C14" }}>Select industry...</option>
                {industries.map((ind) => (
                  <option key={ind} value={ind} style={{ backgroundColor: "#0C0C14" }}>{ind}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
                Target Customer (optional)
              </label>
              <input
                type="text"
                value={targetCustomer}
                onChange={(e) => setTargetCustomer(e.target.value)}
                placeholder="SMBs, developers, enterprise..."
                className="w-full px-3 py-2.5 rounded-lg border bg-transparent outline-none text-sm"
                style={{
                  borderColor: "rgba(255, 255, 255, 0.08)",
                  fontFamily: "'Inter', sans-serif",
                  color: "#F0F0FF",
                }}
              />
            </div>
          </div>
          <button
            onClick={() => researchMutation.mutate()}
            disabled={researchMutation.isPending || !idea.trim() || !industry}
            className="px-6 py-2.5 rounded-lg font-semibold transition-all disabled:opacity-50"
            style={{
              background: "#8B5CF6",
              color: "#050508",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            <Search size={16} className="inline mr-2" />
            {researchMutation.isPending ? "Analyzing Market..." : "Run Market Research"}
          </button>
        </div>
      </div>

      {/* Loading */}
      {researchMutation.isPending && (
        <div className="text-center py-12">
          <div
            className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-4"
            style={{ borderColor: "rgba(124, 58, 237, 0.3)", borderTopColor: "transparent" }}
          />
          <p className="text-sm" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
            Analyzing market data, competitors, and trends...
          </p>
        </div>
      )}

      {/* Error */}
      {researchMutation.isError && (
        <div className="text-center py-8">
          <AlertCircle size={48} className="mx-auto mb-3" style={{ color: "#F87171" }} />
          <p className="text-sm" style={{ fontFamily: "'Inter', sans-serif", color: "#F87171" }}>
            Market research failed. Please try again.
          </p>
        </div>
      )}

      {/* Results */}
      {research && (
        <div className="space-y-6">
          {/* Market Overview */}
          <div
            className="rounded-xl p-6 border"
            style={{
              background: "rgba(11, 11, 20, 0.7)",
              backdropFilter: "blur(12px)",
              borderColor: "rgba(255, 255, 255, 0.04)",
            }}
          >
            <h3 className="text-lg font-semibold mb-3" style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}>
              Market Overview
            </h3>
            <p className="text-sm leading-relaxed" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
              {research.market_overview as string}
            </p>
          </div>

          {/* TAM / SAM / SOM */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: "TAM", sublabel: "Total Addressable Market", value: research.tam as string, color: "#8B5CF6" },
              { label: "SAM", sublabel: "Serviceable Addressable", value: research.sam as string, color: "#536DFE" },
              { label: "SOM", sublabel: "Serviceable Obtainable", value: research.som as string, color: "#FBBF24" },
            ].map((market) => (
              <div
                key={market.label}
                className="rounded-xl p-5 border text-center"
                style={{
                  background: "rgba(11, 11, 20, 0.7)",
                  backdropFilter: "blur(12px)",
                  borderColor: `${market.color}20`,
                }}
              >
                <div
                  className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center"
                  style={{ background: `${market.color}10`, border: `2px solid ${market.color}30` }}
                >
                  <span className="text-sm font-bold" style={{ fontFamily: "monospace, monospace", color: market.color }}>
                    {market.label}
                  </span>
                </div>
                <p className="text-lg font-bold" style={{ fontFamily: "monospace, monospace", color: "#F0F0FF" }}>
                  {market.value || "N/A"}
                </p>
                <p className="text-[11px] mt-1" style={{ fontFamily: "'Inter', sans-serif", color: "#3A3A60" }}>
                  {market.sublabel}
                </p>
              </div>
            ))}
          </div>

          {/* Growth rate */}
          {(research.growth_rate as string) && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-lg" style={{ background: "rgba(124, 58, 237, 0.05)", border: "1px solid rgba(124, 58, 237, 0.1)" }}>
              <TrendingUp size={16} style={{ color: "#8B5CF6" }} />
              <span className="text-sm font-medium" style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}>
                Growth Rate: {research.growth_rate as string}
              </span>
            </div>
          )}

          {/* Competitors */}
          {((research.competitors as Record<string, unknown>[]) || []).length > 0 && (
            <div
              className="rounded-xl p-6 border"
              style={{
                background: "rgba(11, 11, 20, 0.7)",
                backdropFilter: "blur(12px)",
                borderColor: "rgba(255, 255, 255, 0.04)",
              }}
            >
              <h3 className="text-lg font-semibold mb-4" style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}>
                Competitive Landscape
              </h3>
              <div className="space-y-3">
                {(research.competitors as Record<string, unknown>[]).map((comp, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-lg"
                    style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.04)" }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold" style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}>
                        {comp.name as string}
                      </h4>
                      <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(83, 109, 254, 0.1)", color: "#536DFE", fontFamily: "monospace, monospace" }}>
                        Funding: {comp.funding as string}
                      </span>
                    </div>
                    <p className="text-xs mb-2" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
                      {comp.description as string}
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[10px] uppercase font-semibold mb-1" style={{ fontFamily: "monospace, monospace", color: "#34D399" }}>Strengths</p>
                        <ul className="space-y-0.5">
                          {((comp.strengths as string[]) || []).map((s, sIdx) => (
                            <li key={sIdx} className="text-[11px]" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
                              <span style={{ color: "#34D399" }}>+</span> {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-semibold mb-1" style={{ fontFamily: "monospace, monospace", color: "#F87171" }}>Weaknesses</p>
                        <ul className="space-y-0.5">
                          {((comp.weaknesses as string[]) || []).map((w, wIdx) => (
                            <li key={wIdx} className="text-[11px]" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
                              <span style={{ color: "#F87171" }}>-</span> {w}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Customer Segments */}
          {((research.customer_segments as Record<string, unknown>[]) || []).length > 0 && (
            <div
              className="rounded-xl p-6 border"
              style={{
                background: "rgba(11, 11, 20, 0.7)",
                backdropFilter: "blur(12px)",
                borderColor: "rgba(255, 255, 255, 0.04)",
              }}
            >
              <h3 className="text-lg font-semibold mb-4" style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}>
                <Users size={18} className="inline mr-2" style={{ color: "#8B5CF6" }} />
                Customer Segments
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(research.customer_segments as Record<string, unknown>[]).map((seg, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-lg"
                    style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.04)" }}
                  >
                    <h4 className="text-sm font-semibold mb-2" style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}>
                      {seg.segment as string}
                    </h4>
                    <div className="space-y-1 mb-2">
                      {((seg.pain_points as string[]) || []).map((pp, ppIdx) => (
                        <p key={ppIdx} className="text-[11px]" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
                          <span style={{ color: "#FBBF24" }}>!</span> {pp}
                        </p>
                      ))}
                    </div>
                    {(seg.willingness_to_pay as string) && (
                      <p className="text-[11px]" style={{ fontFamily: "monospace, monospace", color: "#34D399" }}>
                        WTP: {seg.willingness_to_pay as string}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trends */}
          {((research.trends as string[]) || []).length > 0 && (
            <div
              className="rounded-xl p-6 border"
              style={{
                background: "rgba(11, 11, 20, 0.7)",
                backdropFilter: "blur(12px)",
                borderColor: "rgba(255, 255, 255, 0.04)",
              }}
            >
              <h3 className="text-lg font-semibold mb-3" style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}>
                <TrendingUp size={18} className="inline mr-2" style={{ color: "#8B5CF6" }} />
                Market Trends
              </h3>
              <div className="space-y-2">
                {(research.trends as string[]).map((trend, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <Zap size={12} className="mt-1 shrink-0" style={{ color: "#FBBF24" }} />
                    <p className="text-sm" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>{trend}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Go-to-Market */}
          {((research.go_to_market as Record<string, unknown>[]) || []).length > 0 && (
            <div
              className="rounded-xl p-6 border"
              style={{
                background: "rgba(11, 11, 20, 0.7)",
                backdropFilter: "blur(12px)",
                borderColor: "rgba(255, 255, 255, 0.04)",
              }}
            >
              <h3 className="text-lg font-semibold mb-4" style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}>
                Go-to-Market Strategy
              </h3>
              <div className="space-y-3">
                {(research.go_to_market as Record<string, unknown>[]).map((gtm, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 rounded-lg"
                    style={{ background: "rgba(255, 255, 255, 0.02)" }}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: "rgba(124, 58, 237, 0.1)" }}
                    >
                      <span className="text-xs font-bold" style={{ fontFamily: "monospace, monospace", color: "#8B5CF6" }}>
                        {idx + 1}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold" style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}>
                        {gtm.channel as string}
                      </h4>
                      <p className="text-xs mt-0.5" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
                        {gtm.strategy as string}
                      </p>
                      <span className="text-[10px] mt-1 inline-block" style={{ fontFamily: "monospace, monospace", color: "#3A3A60" }}>
                        Est. CAC: {gtm.estimated_cac as string}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Risks */}
          {((research.risks as string[]) || []).length > 0 && (
            <div
              className="rounded-xl p-6 border"
              style={{
                background: "rgba(11, 11, 20, 0.7)",
                backdropFilter: "blur(12px)",
                borderColor: "rgba(255, 71, 87, 0.1)",
              }}
            >
              <h3 className="text-lg font-semibold mb-3" style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}>
                <AlertCircle size={18} className="inline mr-2" style={{ color: "#F87171" }} />
                Key Risks
              </h3>
              <div className="space-y-2">
                {(research.risks as string[]).map((risk, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: "#F87171" }} />
                    <p className="text-sm" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>{risk}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   BUSINESS CANVAS TAB
   ============================================================ */
function CanvasTab({
  showFeedback,
}: {
  showFeedback: (type: "success" | "error", text: string) => void;
}) {
  const [idea, setIdea] = useState("");
  const [industry, setIndustry] = useState("");
  const [valueProposition, setValueProposition] = useState("");

  const canvasMutation = useMutation({
    mutationFn: () =>
      apiFetch<Record<string, unknown>>("/api/startup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "canvas",
          idea,
          industry,
          valueProposition: valueProposition || undefined,
        }),
      }),
    onError: () => showFeedback("error", "Failed to generate business canvas."),
  });

  const result = canvasMutation.data as Record<string, unknown> | undefined;
  const resultData = result?.data as Record<string, unknown> | undefined;
  const canvas = resultData?.canvas as Record<string, unknown> | undefined;

  const canvasBlocks: { key: string; label: string; color: string; gridArea: string }[] = [
    { key: "key_partners", label: "Key Partners", color: "#536DFE", gridArea: "1 / 1 / 3 / 2" },
    { key: "key_activities", label: "Key Activities", color: "#8B5CF6", gridArea: "1 / 2 / 2 / 3" },
    { key: "key_resources", label: "Key Resources", color: "#FBBF24", gridArea: "2 / 2 / 3 / 3" },
    { key: "value_propositions", label: "Value Propositions", color: "#34D399", gridArea: "1 / 3 / 3 / 4" },
    { key: "customer_relationships", label: "Customer Relationships", color: "#FF6D00", gridArea: "1 / 4 / 2 / 5" },
    { key: "channels", label: "Channels", color: "#E040FB", gridArea: "2 / 4 / 3 / 5" },
    { key: "customer_segments", label: "Customer Segments", color: "#F87171", gridArea: "1 / 5 / 3 / 6" },
    { key: "cost_structure", label: "Cost Structure", color: "#9090B8", gridArea: "3 / 1 / 4 / 3" },
    { key: "revenue_streams", label: "Revenue Streams", color: "#8B5CF6", gridArea: "3 / 3 / 4 / 6" },
  ];

  return (
    <div className="space-y-6">
      {/* Input */}
      <div
        className="rounded-xl p-6 border"
        style={{
          background: "rgba(11, 11, 20, 0.7)",
          backdropFilter: "blur(12px)",
          borderColor: "rgba(255, 255, 255, 0.04)",
        }}
      >
        <h3 className="text-lg font-semibold mb-4" style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}>
          Business Canvas Generator
        </h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
                Startup Idea
              </label>
              <input
                type="text"
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder="e.g., AI-powered code review tool"
                className="w-full px-3 py-2.5 rounded-lg border bg-transparent outline-none text-sm"
                style={{
                  borderColor: "rgba(255, 255, 255, 0.08)",
                  fontFamily: "'Inter', sans-serif",
                  color: "#F0F0FF",
                }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
                Industry
              </label>
              <input
                type="text"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="e.g., Developer Tools, SaaS"
                className="w-full px-3 py-2.5 rounded-lg border bg-transparent outline-none text-sm"
                style={{
                  borderColor: "rgba(255, 255, 255, 0.08)",
                  fontFamily: "'Inter', sans-serif",
                  color: "#F0F0FF",
                }}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
              Core Value Proposition (optional)
            </label>
            <input
              type="text"
              value={valueProposition}
              onChange={(e) => setValueProposition(e.target.value)}
              placeholder="What unique value do you deliver?"
              className="w-full px-3 py-2.5 rounded-lg border bg-transparent outline-none text-sm"
              style={{
                borderColor: "rgba(255, 255, 255, 0.08)",
                fontFamily: "'Inter', sans-serif",
                color: "#F0F0FF",
              }}
            />
          </div>
          <button
            onClick={() => canvasMutation.mutate()}
            disabled={canvasMutation.isPending || !idea.trim() || !industry.trim()}
            className="px-6 py-2.5 rounded-lg font-semibold transition-all disabled:opacity-50"
            style={{
              background: "#8B5CF6",
              color: "#050508",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            <LayoutGrid size={16} className="inline mr-2" />
            {canvasMutation.isPending ? "Generating Canvas..." : "Generate Business Canvas"}
          </button>
        </div>
      </div>

      {/* Loading */}
      {canvasMutation.isPending && (
        <div className="text-center py-12">
          <div
            className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-4"
            style={{ borderColor: "rgba(124, 58, 237, 0.3)", borderTopColor: "transparent" }}
          />
          <p className="text-sm" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
            Building your Business Model Canvas...
          </p>
        </div>
      )}

      {/* Error */}
      {canvasMutation.isError && (
        <div className="text-center py-8">
          <AlertCircle size={48} className="mx-auto mb-3" style={{ color: "#F87171" }} />
          <p className="text-sm" style={{ fontFamily: "'Inter', sans-serif", color: "#F87171" }}>
            Failed to generate canvas. Please try again.
          </p>
        </div>
      )}

      {/* Canvas Grid */}
      {canvas && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold" style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}>
            Business Model Canvas
          </h3>
          <div
            className="grid gap-3"
            style={{
              gridTemplateColumns: "repeat(5, 1fr)",
              gridTemplateRows: "auto auto auto",
            }}
          >
            {canvasBlocks.map((block) => {
              const items = (canvas[block.key] as string[]) || [];
              return (
                <div
                  key={block.key}
                  className="rounded-xl p-4 border min-h-[140px]"
                  style={{
                    gridArea: block.gridArea,
                    background: "rgba(11, 11, 20, 0.7)",
                    backdropFilter: "blur(12px)",
                    borderColor: `${block.color}20`,
                  }}
                >
                  <h4
                    className="text-[11px] uppercase font-bold mb-3 tracking-wide"
                    style={{ fontFamily: "monospace, monospace", color: block.color }}
                  >
                    {block.label}
                  </h4>
                  <ul className="space-y-1.5">
                    {items.map((item, iIdx) => (
                      <li key={iIdx} className="flex items-start gap-1.5">
                        <span className="text-[10px] mt-0.5" style={{ color: block.color }}>&#9679;</span>
                        <span className="text-xs leading-relaxed" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
                          {item}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          {/* Metrics & Unfair Advantage */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {((canvas.metrics as string[]) || []).length > 0 && (
              <div
                className="rounded-xl p-5 border"
                style={{
                  background: "rgba(11, 11, 20, 0.7)",
                  backdropFilter: "blur(12px)",
                  borderColor: "rgba(124, 58, 237, 0.1)",
                }}
              >
                <h4 className="text-[11px] uppercase font-bold mb-3 tracking-wide" style={{ fontFamily: "monospace, monospace", color: "#8B5CF6" }}>
                  Key Metrics
                </h4>
                <ul className="space-y-1.5">
                  {(canvas.metrics as string[]).map((m, mIdx) => (
                    <li key={mIdx} className="flex items-start gap-2">
                      <BarChart3 size={11} className="mt-0.5 shrink-0" style={{ color: "#8B5CF6" }} />
                      <span className="text-xs" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>{m}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(canvas.unfair_advantage as string) && (
              <div
                className="rounded-xl p-5 border"
                style={{
                  background: "rgba(11, 11, 20, 0.7)",
                  backdropFilter: "blur(12px)",
                  borderColor: "rgba(255, 171, 0, 0.1)",
                }}
              >
                <h4 className="text-[11px] uppercase font-bold mb-3 tracking-wide" style={{ fontFamily: "monospace, monospace", color: "#FBBF24" }}>
                  Unfair Advantage / Moat
                </h4>
                <div className="flex items-start gap-2">
                  <Shield size={14} className="mt-0.5 shrink-0" style={{ color: "#FBBF24" }} />
                  <p className="text-sm leading-relaxed" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
                    {canvas.unfair_advantage as string}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   SAVED IDEAS TAB
   ============================================================ */
function SavedIdeasTab({
  setActiveTab,
}: {
  setActiveTab: (tab: TabId) => void;
  [key: string]: unknown;
}) {
  const { data: ideasData, isLoading, isError } = useQuery({
    queryKey: ["startupIdeas"],
    queryFn: () =>
      apiFetch<Record<string, unknown>>("/api/startup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list" }),
      }),
    retry: false,
  });

  const ideasInner = (ideasData as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
  const ideas = ((ideasInner?.ideas as Record<string, unknown>[]) || []);

  const statusColor = (status: string) => {
    if (status === "researched") return "#536DFE";
    if (status === "validated") return "#34D399";
    return "#9090B8";
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-24 rounded-lg animate-pulse"
            style={{ background: "rgba(255, 255, 255, 0.03)" }}
          />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-12">
        <AlertCircle size={48} className="mx-auto mb-3" style={{ color: "#F87171" }} />
        <p className="text-sm" style={{ fontFamily: "'Inter', sans-serif", color: "#F87171" }}>
          Failed to load saved ideas.
        </p>
      </div>
    );
  }

  if (ideas.length === 0) {
    return (
      <div className="text-center py-16">
        <Lightbulb size={64} className="mx-auto mb-4" style={{ color: "#3A3A60" }} />
        <h3
          className="text-xl font-semibold mb-2"
          style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
        >
          No Saved Ideas Yet
        </h3>
        <p
          className="text-sm mb-6"
          style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
        >
          Generate startup ideas in the Ideate tab and save the ones you like
        </p>
        <button
          onClick={() => setActiveTab("ideate")}
          className="px-6 py-2.5 rounded-lg font-semibold transition-all"
          style={{
            background: "#8B5CF6",
            color: "#050508",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          Start Ideating
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {ideas.map((idea, idx) => (
        <motion.div
          key={(idea.id as string) || idx}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.05 }}
          className="rounded-xl p-5 border flex items-start justify-between"
          style={{
            background: "rgba(11, 11, 20, 0.7)",
            backdropFilter: "blur(12px)",
            borderColor: "rgba(255, 255, 255, 0.04)",
          }}
        >
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h4
                className="text-lg font-bold"
                style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
              >
                {idea.name as string}
              </h4>
              <span
                className="px-2 py-0.5 rounded-full text-[10px] uppercase font-semibold"
                style={{
                  background: `${statusColor(idea.status as string)}15`,
                  color: statusColor(idea.status as string),
                  fontFamily: "monospace, monospace",
                }}
              >
                {idea.status as string}
              </span>
            </div>
            {(idea.tagline as string) && (
              <p className="text-sm italic mb-1" style={{ fontFamily: "'Inter', sans-serif", color: "#8B5CF6" }}>
                {idea.tagline as string}
              </p>
            )}
            <div className="flex items-center gap-4 mt-2">
              {(idea.industry as string) && (
                <span className="text-[11px]" style={{ fontFamily: "monospace, monospace", color: "#3A3A60" }}>
                  {idea.industry as string}
                </span>
              )}
              <span className="text-[11px]" style={{ fontFamily: "monospace, monospace", color: "#3A3A60" }}>
                {(() => {
                  try {
                    return new Date(idea.createdAt as string).toLocaleDateString();
                  } catch {
                    return "";
                  }
                })()}
              </span>
            </div>
          </div>
          <div className="flex gap-2 ml-4">
            <button
              onClick={() => setActiveTab("research")}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-white/5"
              style={{
                border: "1px solid rgba(255, 255, 255, 0.08)",
                color: "#9090B8",
                fontFamily: "'Inter', sans-serif",
              }}
            >
              <Search size={12} />
              Research
            </button>
            <button
              onClick={() => setActiveTab("canvas")}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-white/5"
              style={{
                border: "1px solid rgba(255, 255, 255, 0.08)",
                color: "#9090B8",
                fontFamily: "'Inter', sans-serif",
              }}
            >
              <LayoutGrid size={12} />
              Canvas
            </button>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
