"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { FlaskConical, AlertCircle, Copy, CheckCircle2, BookOpen, Search, PenTool, FolderOpen, Send, ExternalLink, ChevronDown, ChevronUp, Mail, Globe, Calendar, BarChart2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

interface Tab {
  id: string;
  label: string;
  icon: React.ElementType;
}

const tabs: Tab[] = [
  { id: "analyze", label: "Analyze Paper", icon: Search },
  { id: "match", label: "Find Publications", icon: BookOpen },
  { id: "generate", label: "Generate Paper", icon: PenTool },
  { id: "papers", label: "My Papers", icon: FolderOpen },
  { id: "submit", label: "Submit Paper", icon: Send },
];

function getScoreColor(score: number): string {
  if (score >= 85) return "#34D399";
  if (score >= 70) return "#8B5CF6";
  if (score >= 50) return "#FBBF24";
  return "#F87171";
}

// ===== Submit Paper Types =====

interface SubmitVenue {
  name: string;
  type: string;
  submission_url?: string;
  submission_email?: string;
  deadline?: string;
  acceptance_rate?: string;
}

interface SubmissionPackage {
  arxiv_category: string;
  arxiv_instructions: string[];
  recommended_venues: SubmitVenue[];
  formatted_abstract: string;
  cover_letter: string;
  latex_template: string;
  email_submission_template: string;
}

interface SubmitApiResponse {
  submission: SubmissionPackage;
  paperTitle: string;
  paperId: string;
  generatedAt: string;
}

// ===== Submit Paper Tab =====

function SubmitPaperTab() {
  const [title, setTitle] = useState("");
  const [abstract, setAbstract] = useState("");
  const [authors, setAuthors] = useState("");
  const [category, setCategory] = useState("");
  const [paperId, setPaperId] = useState("manual-" + Date.now().toString());

  const [expandedVenue, setExpandedVenue] = useState<number | null>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const submitMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ data: SubmitApiResponse }>("/api/research/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paperId,
          title,
          abstract,
          authors: authors.split(",").map((a) => a.trim()).filter(Boolean),
          category,
        }),
      }),
  });

  const result = submitMutation.data as SubmitApiResponse | undefined;
  const pkg = result?.submission;

  const handleCopySection = (text: string, key: string) => {
    navigator.clipboard.writeText(text).catch(() => {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    });
    setCopiedSection(key);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const inputStyle = {
    background: "rgba(255, 255, 255, 0.04)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: "8px",
    color: "#F0F0FF",
    fontFamily: "'Inter', sans-serif",
    fontSize: "14px",
    outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: "'Inter', sans-serif",
    fontSize: "12px",
    color: "#9090B8",
    marginBottom: "6px",
    display: "block",
  };

  const cardStyle = {
    background: "rgba(11, 11, 20, 0.7)",
    backdropFilter: "blur(12px)",
    borderColor: "rgba(255, 255, 255, 0.04)",
  };

  return (
    <div className="space-y-6">
      {/* Input form */}
      <div
        className="p-6 rounded-xl border"
        style={cardStyle}
      >
        <h2
          className="text-lg font-semibold mb-4"
          style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
        >
          Paper Details
        </h2>

        <div className="space-y-4">
          <div>
            <label style={labelStyle}>Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter paper title"
              className="w-full px-4 py-2.5"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Abstract</label>
            <textarea
              value={abstract}
              onChange={(e) => setAbstract(e.target.value)}
              placeholder="Paste your abstract here"
              rows={5}
              className="w-full px-4 py-2.5 resize-none"
              style={inputStyle}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>Authors (comma-separated)</label>
              <input
                type="text"
                value={authors}
                onChange={(e) => setAuthors(e.target.value)}
                placeholder="e.g., Jane Smith, John Doe"
                className="w-full px-4 py-2.5"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Research Field / Category</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g., Machine Learning, Computational Biology"
                className="w-full px-4 py-2.5"
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Paper ID (for tracking)</label>
            <input
              type="text"
              value={paperId}
              onChange={(e) => setPaperId(e.target.value)}
              placeholder="Paper ID or name"
              className="w-full px-4 py-2.5"
              style={inputStyle}
            />
          </div>

          <button
            onClick={() => submitMutation.mutate()}
            disabled={
              submitMutation.isPending ||
              !title.trim() ||
              !abstract.trim() ||
              !authors.trim() ||
              !category.trim()
            }
            className="w-full px-4 py-3 rounded-lg font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            style={{
              background: "#8B5CF6",
              color: "#050508",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {submitMutation.isPending ? (
              <>
                <div
                  className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: "rgba(5,5,8,0.4)", borderTopColor: "transparent" }}
                />
                Generating Submission Package...
              </>
            ) : (
              <>
                <Send size={16} />
                Generate Submission Package
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {submitMutation.isError && (
        <div
          className="flex items-center gap-3 p-4 rounded-lg"
          style={{ background: "rgba(255, 71, 87, 0.08)", border: "1px solid rgba(255, 71, 87, 0.2)" }}
        >
          <AlertCircle size={20} style={{ color: "#F87171", flexShrink: 0 }} />
          <p style={{ fontFamily: "'Inter', sans-serif", color: "#F87171", fontSize: "14px" }}>
            {submitMutation.error instanceof Error
              ? submitMutation.error.message
              : "Submission package generation failed. Please try again."}
          </p>
        </div>
      )}

      {/* Results */}
      {pkg && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

          {/* arXiv Info */}
          <div className="p-5 rounded-xl border" style={cardStyle}>
            <div className="flex items-center gap-2 mb-4">
              <div
                className="px-3 py-1.5 rounded-lg text-sm font-bold"
                style={{ background: "rgba(83, 109, 254, 0.15)", color: "#536DFE", fontFamily: "monospace, monospace" }}
              >
                arXiv: {pkg.arxiv_category}
              </div>
              <h3
                className="text-sm font-semibold"
                style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
              >
                arXiv Submission Instructions
              </h3>
            </div>
            <ol className="space-y-2">
              {pkg.arxiv_instructions.map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span
                    className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold"
                    style={{ background: "rgba(83, 109, 254, 0.15)", color: "#536DFE", fontFamily: "monospace, monospace" }}
                  >
                    {i + 1}
                  </span>
                  <span className="text-sm pt-0.5" style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}>
                    {step}
                  </span>
                </li>
              ))}
            </ol>
            <a
              href="https://arxiv.org/submit"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-xs hover:underline"
              style={{ fontFamily: "'Inter', sans-serif", color: "#536DFE" }}
            >
              <Globe size={12} />
              Open arXiv Submission Portal
              <ExternalLink size={10} />
            </a>
          </div>

          {/* Recommended Venues */}
          <div className="p-5 rounded-xl border" style={cardStyle}>
            <div className="flex items-center gap-2 mb-4">
              <BookOpen size={18} style={{ color: "#8B5CF6" }} />
              <h3
                className="text-sm font-semibold"
                style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
              >
                Recommended Publication Venues
              </h3>
              <span
                className="text-[11px] px-2 py-0.5 rounded-full"
                style={{ background: "rgba(124, 58, 237, 0.1)", color: "#8B5CF6" }}
              >
                {pkg.recommended_venues.length} venues
              </span>
            </div>

            <div className="space-y-3">
              {pkg.recommended_venues.map((venue, i) => (
                <div
                  key={i}
                  className="rounded-lg border overflow-hidden"
                  style={{ background: "rgba(255, 255, 255, 0.02)", borderColor: "rgba(255, 255, 255, 0.06)" }}
                >
                  <button
                    onClick={() => setExpandedVenue(expandedVenue === i ? null : i)}
                    className="w-full p-4 flex items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold"
                        style={{ background: "rgba(124, 58, 237, 0.1)", color: "#8B5CF6", fontFamily: "monospace, monospace" }}
                      >
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="text-[13px] font-semibold"
                            style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
                          >
                            {venue.name}
                          </span>
                          <span
                            className="text-[10px] px-2 py-0.5 rounded font-medium flex-shrink-0"
                            style={{
                              background: venue.type === "conference" ? "rgba(83, 109, 254, 0.15)" : "rgba(124, 58, 237, 0.1)",
                              color: venue.type === "conference" ? "#536DFE" : "#8B5CF6",
                              fontFamily: "'Inter', sans-serif",
                            }}
                          >
                            {venue.type}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          {venue.acceptance_rate && (
                            <span className="flex items-center gap-1 text-[11px]" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
                              <BarChart2 size={10} />
                              {venue.acceptance_rate}
                            </span>
                          )}
                          {venue.deadline && (
                            <span className="flex items-center gap-1 text-[11px]" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
                              <Calendar size={10} />
                              {venue.deadline}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {expandedVenue === i ? (
                      <ChevronUp size={16} className="flex-shrink-0 text-[#3A3A60]" />
                    ) : (
                      <ChevronDown size={16} className="flex-shrink-0 text-[#3A3A60]" />
                    )}
                  </button>

                  {expandedVenue === i && (
                    <div
                      className="px-4 pb-4 space-y-3 border-t"
                      style={{ borderColor: "rgba(255, 255, 255, 0.04)" }}
                    >
                      <div className="flex flex-wrap gap-2 pt-3">
                        {venue.submission_url && (
                          <a
                            href={venue.submission_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all hover:opacity-80"
                            style={{ background: "rgba(83, 109, 254, 0.15)", color: "#536DFE", fontFamily: "'Inter', sans-serif" }}
                          >
                            <Globe size={12} />
                            Submit Online
                            <ExternalLink size={10} />
                          </a>
                        )}
                        {venue.submission_email && (
                          <a
                            href={`mailto:${venue.submission_email}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all hover:opacity-80"
                            style={{ background: "rgba(124, 58, 237, 0.1)", color: "#8B5CF6", fontFamily: "'Inter', sans-serif" }}
                          >
                            <Mail size={12} />
                            Email Submission
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Formatted Abstract */}
          <div className="p-5 rounded-xl border" style={cardStyle}>
            <div className="flex items-center justify-between mb-3">
              <h3
                className="text-sm font-semibold"
                style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
              >
                Formatted Abstract
              </h3>
              <button
                onClick={() => handleCopySection(pkg.formatted_abstract, "abstract")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] font-medium transition-all"
                style={{
                  background: copiedSection === "abstract" ? "rgba(74, 222, 128, 0.15)" : "rgba(124, 58, 237, 0.1)",
                  color: copiedSection === "abstract" ? "#34D399" : "#8B5CF6",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                {copiedSection === "abstract" ? <CheckCircle2 size={12} /> : <Copy size={12} />}
                {copiedSection === "abstract" ? "Copied" : "Copy"}
              </button>
            </div>
            <p
              className="text-sm leading-relaxed whitespace-pre-wrap"
              style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
            >
              {pkg.formatted_abstract}
            </p>
          </div>

          {/* Cover Letter */}
          <div className="p-5 rounded-xl border" style={cardStyle}>
            <div className="flex items-center justify-between mb-3">
              <h3
                className="text-sm font-semibold"
                style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
              >
                Cover Letter
              </h3>
              <button
                onClick={() => handleCopySection(pkg.cover_letter, "cover")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] font-medium transition-all"
                style={{
                  background: copiedSection === "cover" ? "rgba(74, 222, 128, 0.15)" : "rgba(124, 58, 237, 0.1)",
                  color: copiedSection === "cover" ? "#34D399" : "#8B5CF6",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                {copiedSection === "cover" ? <CheckCircle2 size={12} /> : <Copy size={12} />}
                {copiedSection === "cover" ? "Copied" : "Copy"}
              </button>
            </div>
            <div
              className="p-4 rounded-lg overflow-auto max-h-[400px]"
              style={{ background: "rgba(0, 0, 0, 0.3)", border: "1px solid rgba(255, 255, 255, 0.04)" }}
            >
              <pre
                className="text-[12px] leading-relaxed whitespace-pre-wrap break-words"
                style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
              >
                {pkg.cover_letter}
              </pre>
            </div>
          </div>

          {/* Email Submission Template */}
          <div className="p-5 rounded-xl border" style={cardStyle}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Mail size={16} style={{ color: "#8B5CF6" }} />
                <h3
                  className="text-sm font-semibold"
                  style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
                >
                  Email Submission Template
                </h3>
              </div>
              <button
                onClick={() => handleCopySection(pkg.email_submission_template, "email")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] font-medium transition-all"
                style={{
                  background: copiedSection === "email" ? "rgba(74, 222, 128, 0.15)" : "rgba(124, 58, 237, 0.1)",
                  color: copiedSection === "email" ? "#34D399" : "#8B5CF6",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                {copiedSection === "email" ? <CheckCircle2 size={12} /> : <Copy size={12} />}
                {copiedSection === "email" ? "Copied" : "Copy"}
              </button>
            </div>
            <div
              className="p-4 rounded-lg overflow-auto max-h-[400px]"
              style={{ background: "rgba(0, 0, 0, 0.3)", border: "1px solid rgba(255, 255, 255, 0.04)" }}
            >
              <pre
                className="text-[12px] leading-relaxed whitespace-pre-wrap break-words"
                style={{ fontFamily: "monospace, monospace", color: "#F0F0FF" }}
              >
                {pkg.email_submission_template}
              </pre>
            </div>
          </div>

          {/* LaTeX Template */}
          <div className="p-5 rounded-xl border" style={cardStyle}>
            <div className="flex items-center justify-between mb-3">
              <h3
                className="text-sm font-semibold"
                style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
              >
                LaTeX Template
              </h3>
              <button
                onClick={() => handleCopySection(pkg.latex_template, "latex")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] font-medium transition-all"
                style={{
                  background: copiedSection === "latex" ? "rgba(74, 222, 128, 0.15)" : "rgba(124, 58, 237, 0.1)",
                  color: copiedSection === "latex" ? "#34D399" : "#8B5CF6",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                {copiedSection === "latex" ? <CheckCircle2 size={12} /> : <Copy size={12} />}
                {copiedSection === "latex" ? "Copied" : "Copy"}
              </button>
            </div>
            <div
              className="p-4 rounded-lg overflow-auto max-h-[400px]"
              style={{ background: "rgba(0, 0, 0, 0.3)", border: "1px solid rgba(255, 255, 255, 0.04)" }}
            >
              <pre
                className="text-[12px] leading-relaxed whitespace-pre-wrap break-words"
                style={{ fontFamily: "monospace, monospace", color: "#F0F0FF" }}
              >
                {pkg.latex_template}
              </pre>
            </div>
          </div>
        </motion.div>
      )}

      {/* Empty state */}
      {!submitMutation.isPending && !pkg && !submitMutation.isError && (
        <div className="text-center py-16">
          <Send size={48} className="mx-auto mb-4" style={{ color: "#3A3A60" }} />
          <p
            className="text-base font-semibold mb-2"
            style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
          >
            Generate a complete submission package
          </p>
          <p
            className="text-sm"
            style={{ fontFamily: "'Inter', sans-serif", color: "#3A3A60" }}
          >
            AI will recommend arXiv categories, top venues, format your abstract, write a cover letter, and provide email templates
          </p>
        </div>
      )}
    </div>
  );
}

export default function ResearchPage() {
  const [activeTab, setActiveTab] = useState("analyze");

  // Analyze state
  const [analyzeTitle, setAnalyzeTitle] = useState("");
  const [analyzeAbstract, setAnalyzeAbstract] = useState("");
  const [analyzeContent, setAnalyzeContent] = useState("");
  const [analyzeFeedback, setAnalyzeFeedback] = useState("");
  const [analyzeVenue, setAnalyzeVenue] = useState("");

  // Match state
  const [matchTitle, setMatchTitle] = useState("");
  const [matchAbstract, setMatchAbstract] = useState("");
  const [matchField, setMatchField] = useState("");
  const [matchKeywords, setMatchKeywords] = useState("");

  // Generate state
  const [generateIdea, setGenerateIdea] = useState("");
  const [generateField, setGenerateField] = useState("");
  const [generateMethodology, setGenerateMethodology] = useState("");
  const [generateExistingWork, setGenerateExistingWork] = useState("");

  // UI state
  const [copiedAll, setCopiedAll] = useState(false);
  const [savedPaperId, setSavedPaperId] = useState<string | null>(null);

  // Mutations
  const analyzeMutation = useMutation({
    mutationFn: () =>
      apiFetch<Record<string, unknown>>("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "analyze",
          title: analyzeTitle,
          abstract: analyzeAbstract,
          content: analyzeContent,
          previousFeedback: analyzeFeedback || undefined,
          targetVenue: analyzeVenue || undefined,
        }),
      }),
  });

  const matchMutation = useMutation({
    mutationFn: () =>
      apiFetch<Record<string, unknown>>("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "match",
          title: matchTitle,
          abstract: matchAbstract,
          field: matchField,
          keywords: matchKeywords.split(",").map((k) => k.trim()).filter(Boolean),
        }),
      }),
  });

  const generateMutation = useMutation({
    mutationFn: () =>
      apiFetch<Record<string, unknown>>("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          idea: generateIdea,
          field: generateField,
          methodology: generateMethodology || undefined,
          existingWork: generateExistingWork || undefined,
        }),
      }),
  });

  const listMutation = useMutation({
    mutationFn: () =>
      apiFetch<Record<string, unknown>>("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list" }),
      }),
  });

  const saveMutation = useMutation({
    mutationFn: (paperData: Record<string, unknown>) =>
      apiFetch<Record<string, unknown>>("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", paperData }),
      }),
    onSuccess: (res) => {
      const result = res as Record<string, unknown> | undefined;
      const paper = result?.paper as Record<string, unknown> | undefined;
      if (paper?.id) {
        setSavedPaperId(paper.id as string);
        setTimeout(() => setSavedPaperId(null), 3000);
      }
      listMutation.mutate();
    },
  });

  const handleCopyAll = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  // Extract results
  const analyzeResult = analyzeMutation.data as Record<string, unknown> | undefined;
  const analysis = analyzeResult?.analysis as Record<string, unknown> | undefined;

  const matchResult = matchMutation.data as Record<string, unknown> | undefined;
  const matches = matchResult?.matches as Record<string, unknown> | undefined;
  const venues = (matches?.venues as Record<string, unknown>[]) || [];

  const generateResult = generateMutation.data as Record<string, unknown> | undefined;
  const paper = generateResult?.paper as Record<string, unknown> | undefined;

  const listResult = listMutation.data as Record<string, unknown> | undefined;
  const savedPapers = (listResult?.papers as Record<string, unknown>[]) || [];

  const inputStyle = {
    background: "rgba(255, 255, 255, 0.04)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: "8px",
    color: "#F0F0FF",
    fontFamily: "'Inter', sans-serif",
    fontSize: "14px",
    outline: "none",
  };

  const labelStyle = {
    fontFamily: "'Inter', sans-serif" as const,
    fontSize: "12px" as const,
    color: "#9090B8",
    marginBottom: "6px",
    display: "block" as const,
  };

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Background texture */}
      <div
        className="fixed inset-0 opacity-[0.015] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ background: "rgba(124, 58, 237, 0.1)" }}
        >
          <FlaskConical size={20} style={{ color: "#8B5CF6" }} />
        </div>
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
          >
            Research Hub
          </h1>
          <p
            className="text-sm"
            style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
          >
            Analyze papers, find publication venues, and generate research drafts
          </p>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 p-1 rounded-lg mb-6" style={{ background: "rgba(255, 255, 255, 0.03)" }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              if (tab.id === "papers" && !listMutation.data) {
                listMutation.mutate();
              }
            }}
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

      {/* ANALYZE TAB */}
      {activeTab === "analyze" && (
        <div className="space-y-6">
          <div
            className="p-6 rounded-xl border"
            style={{
              background: "rgba(11, 11, 20, 0.7)",
              backdropFilter: "blur(12px)",
              borderColor: "rgba(255, 255, 255, 0.04)",
            }}
          >
            <h2
              className="text-lg font-semibold mb-4"
              style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
            >
              Paper Details
            </h2>

            <div className="space-y-4">
              <div>
                <label style={labelStyle}>Title</label>
                <input
                  type="text"
                  value={analyzeTitle}
                  onChange={(e) => setAnalyzeTitle(e.target.value)}
                  placeholder="Enter paper title"
                  className="w-full px-4 py-2.5"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Abstract</label>
                <textarea
                  value={analyzeAbstract}
                  onChange={(e) => setAnalyzeAbstract(e.target.value)}
                  placeholder="Paste your abstract here"
                  rows={4}
                  className="w-full px-4 py-2.5 resize-none"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Full Paper Content</label>
                <textarea
                  value={analyzeContent}
                  onChange={(e) => setAnalyzeContent(e.target.value)}
                  placeholder="Paste the full paper content here"
                  rows={12}
                  className="w-full px-4 py-2.5 resize-none"
                  style={inputStyle}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label style={labelStyle}>Previous Feedback (optional)</label>
                  <textarea
                    value={analyzeFeedback}
                    onChange={(e) => setAnalyzeFeedback(e.target.value)}
                    placeholder="Paste reviewer feedback from a previous submission"
                    rows={3}
                    className="w-full px-4 py-2.5 resize-none"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Target Venue (optional)</label>
                  <input
                    type="text"
                    value={analyzeVenue}
                    onChange={(e) => setAnalyzeVenue(e.target.value)}
                    placeholder="e.g., NeurIPS, Nature, IEEE TPAMI"
                    className="w-full px-4 py-2.5"
                    style={inputStyle}
                  />
                </div>
              </div>

              <button
                onClick={() => analyzeMutation.mutate()}
                disabled={analyzeMutation.isPending || !analyzeTitle || !analyzeAbstract || !analyzeContent}
                className="w-full px-4 py-3 rounded-lg font-semibold transition-all disabled:opacity-50"
                style={{
                  background: "#8B5CF6",
                  color: "#050508",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                {analyzeMutation.isPending ? "Analyzing..." : "Analyze Paper"}
              </button>
            </div>
          </div>

          {/* Loading */}
          {analyzeMutation.isPending && (
            <div className="text-center py-12">
              <div
                className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-4"
                style={{ borderColor: "rgba(124, 58, 237, 0.3)", borderTopColor: "transparent" }}
              />
              <p style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
                Analyzing your paper...
              </p>
            </div>
          )}

          {/* Error */}
          {analyzeMutation.isError && (
            <div
              className="flex items-center gap-3 p-4 rounded-lg"
              style={{ background: "rgba(255, 71, 87, 0.08)", border: "1px solid rgba(255, 71, 87, 0.2)" }}
            >
              <AlertCircle size={20} style={{ color: "#F87171", flexShrink: 0 }} />
              <p style={{ fontFamily: "'Inter', sans-serif", color: "#F87171", fontSize: "14px" }}>
                {analyzeMutation.error instanceof Error ? analyzeMutation.error.message : "Analysis failed. Please try again."}
              </p>
            </div>
          )}

          {/* Results */}
          {analysis && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              {/* Overall Score */}
              <div
                className="p-6 rounded-xl border text-center"
                style={{
                  background: "rgba(11, 11, 20, 0.7)",
                  backdropFilter: "blur(12px)",
                  borderColor: "rgba(255, 255, 255, 0.04)",
                }}
              >
                <p style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8", fontSize: "14px", marginBottom: "8px" }}>
                  Overall Score
                </p>
                <span
                  className="text-5xl font-bold"
                  style={{
                    fontFamily: "monospace, monospace",
                    color: getScoreColor(analysis.overall_score as number),
                  }}
                >
                  {analysis.overall_score as number}
                </span>
                <span style={{ fontFamily: "monospace, monospace", color: "#3A3A60", fontSize: "24px" }}>/100</span>
              </div>

              {/* Section Scores */}
              <div
                className="p-6 rounded-xl border"
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
                  Section Scores
                </h3>
                <div className="space-y-4">
                  {(["abstract", "introduction", "methodology", "results", "discussion", "conclusion"] as const).map((sectionKey) => {
                    const sections = analysis.sections as Record<string, Record<string, unknown>>;
                    const section = sections[sectionKey];
                    if (!section) return null;
                    const score = (section.score as number) || 0;
                    const feedback = (section.feedback as string) || "";
                    const suggestions = (section.suggestions as string[]) || [];

                    return (
                      <div key={sectionKey} className="pb-4 border-b" style={{ borderColor: "rgba(255, 255, 255, 0.04)" }}>
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className="text-sm font-medium capitalize"
                            style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
                          >
                            {sectionKey}
                          </span>
                          <span
                            className="text-sm font-bold"
                            style={{ fontFamily: "monospace, monospace", color: getScoreColor(score) }}
                          >
                            {score}/100
                          </span>
                        </div>
                        {/* Progress bar */}
                        <div
                          className="w-full h-2 rounded-full mb-3"
                          style={{ background: "rgba(255, 255, 255, 0.06)" }}
                        >
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${score}%`, background: getScoreColor(score) }}
                          />
                        </div>
                        <p
                          className="text-sm mb-2"
                          style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
                        >
                          {feedback}
                        </p>
                        {suggestions.length > 0 && (
                          <ul className="space-y-1">
                            {suggestions.map((s, i) => (
                              <li
                                key={i}
                                className="text-xs flex items-start gap-2"
                                style={{ fontFamily: "'Inter', sans-serif", color: "#8B5CF6" }}
                              >
                                <span style={{ color: "#3A3A60", marginTop: "2px" }}>-</span>
                                <span>{s}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Strengths & Weaknesses */}
              <div className="grid grid-cols-2 gap-6">
                <div
                  className="p-6 rounded-xl border"
                  style={{
                    background: "rgba(11, 11, 20, 0.7)",
                    backdropFilter: "blur(12px)",
                    borderColor: "rgba(255, 255, 255, 0.04)",
                  }}
                >
                  <h3
                    className="text-base font-semibold mb-3"
                    style={{ fontFamily: "'Inter', sans-serif", color: "#34D399" }}
                  >
                    Strengths
                  </h3>
                  <ul className="space-y-2">
                    {((analysis.strengths as string[]) || []).map((s, i) => (
                      <li
                        key={i}
                        className="text-sm flex items-start gap-2"
                        style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
                      >
                        <CheckCircle2 size={14} style={{ color: "#34D399", flexShrink: 0, marginTop: "3px" }} />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div
                  className="p-6 rounded-xl border"
                  style={{
                    background: "rgba(11, 11, 20, 0.7)",
                    backdropFilter: "blur(12px)",
                    borderColor: "rgba(255, 255, 255, 0.04)",
                  }}
                >
                  <h3
                    className="text-base font-semibold mb-3"
                    style={{ fontFamily: "'Inter', sans-serif", color: "#F87171" }}
                  >
                    Weaknesses
                  </h3>
                  <ul className="space-y-2">
                    {((analysis.weaknesses as string[]) || []).map((w, i) => (
                      <li
                        key={i}
                        className="text-sm flex items-start gap-2"
                        style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
                      >
                        <AlertCircle size={14} style={{ color: "#F87171", flexShrink: 0, marginTop: "3px" }} />
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Revision Priorities */}
              <div
                className="p-6 rounded-xl border"
                style={{
                  background: "rgba(11, 11, 20, 0.7)",
                  backdropFilter: "blur(12px)",
                  borderColor: "rgba(255, 255, 255, 0.04)",
                }}
              >
                <h3
                  className="text-base font-semibold mb-3"
                  style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
                >
                  Revision Priorities
                </h3>
                <ol className="space-y-2">
                  {((analysis.revision_priority as string[]) || []).map((r, i) => (
                    <li
                      key={i}
                      className="text-sm flex items-start gap-3"
                      style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
                    >
                      <span
                        className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{
                          background: "rgba(124, 58, 237, 0.15)",
                          color: "#8B5CF6",
                          fontFamily: "monospace, monospace",
                        }}
                      >
                        {i + 1}
                      </span>
                      <span className="pt-0.5">{r}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Save button */}
              <button
                onClick={() =>
                  saveMutation.mutate({
                    title: analyzeTitle,
                    field: analyzeVenue || "General",
                    status: "analyzed",
                    analysisScore: analysis.overall_score,
                  })
                }
                disabled={saveMutation.isPending}
                className="w-full px-4 py-3 rounded-lg font-semibold transition-all border disabled:opacity-50"
                style={{
                  borderColor: "rgba(124, 58, 237, 0.3)",
                  color: "#8B5CF6",
                  background: "rgba(124, 58, 237, 0.08)",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                {saveMutation.isPending ? "Saving..." : savedPaperId ? "Saved!" : "Save to My Papers"}
              </button>
            </motion.div>
          )}
        </div>
      )}

      {/* MATCH TAB */}
      {activeTab === "match" && (
        <div className="space-y-6">
          <div
            className="p-6 rounded-xl border"
            style={{
              background: "rgba(11, 11, 20, 0.7)",
              backdropFilter: "blur(12px)",
              borderColor: "rgba(255, 255, 255, 0.04)",
            }}
          >
            <h2
              className="text-lg font-semibold mb-4"
              style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
            >
              Paper Details
            </h2>

            <div className="space-y-4">
              <div>
                <label style={labelStyle}>Title</label>
                <input
                  type="text"
                  value={matchTitle}
                  onChange={(e) => setMatchTitle(e.target.value)}
                  placeholder="Enter paper title"
                  className="w-full px-4 py-2.5"
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Abstract</label>
                <textarea
                  value={matchAbstract}
                  onChange={(e) => setMatchAbstract(e.target.value)}
                  placeholder="Paste your abstract here"
                  rows={4}
                  className="w-full px-4 py-2.5 resize-none"
                  style={inputStyle}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label style={labelStyle}>Research Field</label>
                  <input
                    type="text"
                    value={matchField}
                    onChange={(e) => setMatchField(e.target.value)}
                    placeholder="e.g., Computer Science, Biology"
                    className="w-full px-4 py-2.5"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Keywords (comma-separated)</label>
                  <input
                    type="text"
                    value={matchKeywords}
                    onChange={(e) => setMatchKeywords(e.target.value)}
                    placeholder="e.g., deep learning, NLP, transformers"
                    className="w-full px-4 py-2.5"
                    style={inputStyle}
                  />
                </div>
              </div>

              <button
                onClick={() => matchMutation.mutate()}
                disabled={matchMutation.isPending || !matchTitle || !matchAbstract || !matchField || !matchKeywords}
                className="w-full px-4 py-3 rounded-lg font-semibold transition-all disabled:opacity-50"
                style={{
                  background: "#8B5CF6",
                  color: "#050508",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                {matchMutation.isPending ? "Finding Venues..." : "Find Publication Venues"}
              </button>
            </div>
          </div>

          {/* Loading */}
          {matchMutation.isPending && (
            <div className="text-center py-12">
              <div
                className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-4"
                style={{ borderColor: "rgba(124, 58, 237, 0.3)", borderTopColor: "transparent" }}
              />
              <p style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
                Matching your paper to venues...
              </p>
            </div>
          )}

          {/* Error */}
          {matchMutation.isError && (
            <div
              className="flex items-center gap-3 p-4 rounded-lg"
              style={{ background: "rgba(255, 71, 87, 0.08)", border: "1px solid rgba(255, 71, 87, 0.2)" }}
            >
              <AlertCircle size={20} style={{ color: "#F87171", flexShrink: 0 }} />
              <p style={{ fontFamily: "'Inter', sans-serif", color: "#F87171", fontSize: "14px" }}>
                {matchMutation.error instanceof Error ? matchMutation.error.message : "Matching failed. Please try again."}
              </p>
            </div>
          )}

          {/* Results */}
          {venues.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <h3
                className="text-lg font-semibold"
                style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
              >
                Recommended Venues ({venues.length})
              </h3>
              {venues.map((venue, i) => (
                <div
                  key={i}
                  className="p-5 rounded-xl border"
                  style={{
                    background: "rgba(11, 11, 20, 0.7)",
                    backdropFilter: "blur(12px)",
                    borderColor: "rgba(255, 255, 255, 0.04)",
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4
                          className="text-base font-semibold"
                          style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
                        >
                          {venue.name as string}
                        </h4>
                        <span
                          className="px-2 py-0.5 rounded text-xs font-medium"
                          style={{
                            background: (venue.type as string) === "conference" ? "rgba(83, 109, 254, 0.15)" : "rgba(124, 58, 237, 0.15)",
                            color: (venue.type as string) === "conference" ? "#536DFE" : "#8B5CF6",
                            fontFamily: "'Inter', sans-serif",
                          }}
                        >
                          {venue.type as string}
                        </span>
                      </div>
                      <p
                        className="text-xs"
                        style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
                      >
                        {venue.field as string}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className="text-2xl font-bold"
                        style={{
                          fontFamily: "monospace, monospace",
                          color: getScoreColor((venue.fit_score as number) || 0),
                        }}
                      >
                        {venue.fit_score as number}
                      </span>
                      <p className="text-[10px]" style={{ color: "#3A3A60" }}>fit score</p>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="flex gap-4 mb-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs" style={{ fontFamily: "'Inter', sans-serif", color: "#3A3A60" }}>
                        Acceptance:
                      </span>
                      <span
                        className="text-xs font-medium"
                        style={{ fontFamily: "monospace, monospace", color: "#F0F0FF" }}
                      >
                        {venue.acceptance_rate as string}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs" style={{ fontFamily: "'Inter', sans-serif", color: "#3A3A60" }}>
                        Impact:
                      </span>
                      <span
                        className="text-xs font-medium"
                        style={{ fontFamily: "monospace, monospace", color: "#F0F0FF" }}
                      >
                        {venue.impact_factor as string}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs" style={{ fontFamily: "'Inter', sans-serif", color: "#3A3A60" }}>
                        Review:
                      </span>
                      <span
                        className="text-xs font-medium"
                        style={{ fontFamily: "monospace, monospace", color: "#F0F0FF" }}
                      >
                        {venue.review_time as string}
                      </span>
                    </div>
                  </div>

                  <p
                    className="text-sm mb-3"
                    style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
                  >
                    {venue.why_good_fit as string}
                  </p>

                  {((venue.submission_tips as string[]) || []).length > 0 && (
                    <div>
                      <p className="text-xs font-medium mb-1" style={{ fontFamily: "'Inter', sans-serif", color: "#8B5CF6" }}>
                        Submission Tips
                      </p>
                      <ul className="space-y-1">
                        {((venue.submission_tips as string[]) || []).map((tip, j) => (
                          <li
                            key={j}
                            className="text-xs flex items-start gap-2"
                            style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
                          >
                            <span style={{ color: "#3A3A60" }}>-</span>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </motion.div>
          )}
        </div>
      )}

      {/* GENERATE TAB */}
      {activeTab === "generate" && (
        <div className="space-y-6">
          <div
            className="p-6 rounded-xl border"
            style={{
              background: "rgba(11, 11, 20, 0.7)",
              backdropFilter: "blur(12px)",
              borderColor: "rgba(255, 255, 255, 0.04)",
            }}
          >
            <h2
              className="text-lg font-semibold mb-4"
              style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
            >
              Research Details
            </h2>

            <div className="space-y-4">
              <div>
                <label style={labelStyle}>Research Idea</label>
                <textarea
                  value={generateIdea}
                  onChange={(e) => setGenerateIdea(e.target.value)}
                  placeholder="Describe your research idea in detail"
                  rows={6}
                  className="w-full px-4 py-2.5 resize-none"
                  style={inputStyle}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label style={labelStyle}>Research Field</label>
                  <input
                    type="text"
                    value={generateField}
                    onChange={(e) => setGenerateField(e.target.value)}
                    placeholder="e.g., Machine Learning, Neuroscience"
                    className="w-full px-4 py-2.5"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Methodology (optional)</label>
                  <input
                    type="text"
                    value={generateMethodology}
                    onChange={(e) => setGenerateMethodology(e.target.value)}
                    placeholder="e.g., Randomized controlled trial"
                    className="w-full px-4 py-2.5"
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Existing Work / Notes (optional)</label>
                <textarea
                  value={generateExistingWork}
                  onChange={(e) => setGenerateExistingWork(e.target.value)}
                  placeholder="Any preliminary findings, related work, or notes"
                  rows={3}
                  className="w-full px-4 py-2.5 resize-none"
                  style={inputStyle}
                />
              </div>

              <button
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending || !generateIdea || !generateField}
                className="w-full px-4 py-3 rounded-lg font-semibold transition-all disabled:opacity-50"
                style={{
                  background: "#8B5CF6",
                  color: "#050508",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                {generateMutation.isPending ? "Generating..." : "Generate Paper Draft"}
              </button>
            </div>
          </div>

          {/* Loading */}
          {generateMutation.isPending && (
            <div className="text-center py-12">
              <div
                className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-4"
                style={{ borderColor: "rgba(124, 58, 237, 0.3)", borderTopColor: "transparent" }}
              />
              <p style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
                Generating your paper draft...
              </p>
            </div>
          )}

          {/* Error */}
          {generateMutation.isError && (
            <div
              className="flex items-center gap-3 p-4 rounded-lg"
              style={{ background: "rgba(255, 71, 87, 0.08)", border: "1px solid rgba(255, 71, 87, 0.2)" }}
            >
              <AlertCircle size={20} style={{ color: "#F87171", flexShrink: 0 }} />
              <p style={{ fontFamily: "'Inter', sans-serif", color: "#F87171", fontSize: "14px" }}>
                {generateMutation.error instanceof Error ? generateMutation.error.message : "Generation failed. Please try again."}
              </p>
            </div>
          )}

          {/* Results */}
          {paper && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              {/* Copy All Button */}
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    const allText = [
                      `# ${paper.title as string}`,
                      "",
                      "## Abstract",
                      paper.abstract as string,
                      "",
                      ...((paper.sections as Record<string, unknown>[]) || []).flatMap((s) => [
                        `## ${s.heading as string}`,
                        s.content as string,
                        "",
                      ]),
                      "## References Needed",
                      ...((paper.references_needed as string[]) || []).map((r) => `- ${r}`),
                      "",
                      "## Methodology Notes",
                      paper.methodology_notes as string,
                    ].join("\n");
                    handleCopyAll(allText);
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all"
                  style={{
                    background: copiedAll ? "rgba(74, 222, 128, 0.15)" : "rgba(255, 255, 255, 0.06)",
                    border: `1px solid ${copiedAll ? "rgba(74, 222, 128, 0.3)" : "rgba(255, 255, 255, 0.08)"}`,
                    color: copiedAll ? "#34D399" : "#F0F0FF",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  {copiedAll ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                  {copiedAll ? "Copied!" : "Copy All"}
                </button>
              </div>

              {/* Title */}
              <div
                className="p-6 rounded-xl border"
                style={{
                  background: "rgba(11, 11, 20, 0.7)",
                  backdropFilter: "blur(12px)",
                  borderColor: "rgba(255, 255, 255, 0.04)",
                }}
              >
                <h2
                  className="text-xl font-bold mb-4"
                  style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
                >
                  {paper.title as string}
                </h2>

                <h3
                  className="text-sm font-semibold mb-2"
                  style={{ fontFamily: "'Inter', sans-serif", color: "#8B5CF6" }}
                >
                  Abstract
                </h3>
                <p
                  className="text-sm leading-relaxed whitespace-pre-wrap"
                  style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
                >
                  {paper.abstract as string}
                </p>
              </div>

              {/* Sections */}
              {((paper.sections as Record<string, unknown>[]) || []).map((section, i) => (
                <div
                  key={i}
                  className="p-6 rounded-xl border"
                  style={{
                    background: "rgba(11, 11, 20, 0.7)",
                    backdropFilter: "blur(12px)",
                    borderColor: "rgba(255, 255, 255, 0.04)",
                  }}
                >
                  <h3
                    className="text-base font-semibold mb-3"
                    style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
                  >
                    {section.heading as string}
                  </h3>
                  <p
                    className="text-sm leading-relaxed whitespace-pre-wrap"
                    style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
                  >
                    {section.content as string}
                  </p>
                </div>
              ))}

              {/* References Needed */}
              {((paper.references_needed as string[]) || []).length > 0 && (
                <div
                  className="p-6 rounded-xl border"
                  style={{
                    background: "rgba(11, 11, 20, 0.7)",
                    backdropFilter: "blur(12px)",
                    borderColor: "rgba(255, 255, 255, 0.04)",
                  }}
                >
                  <h3
                    className="text-base font-semibold mb-3"
                    style={{ fontFamily: "'Inter', sans-serif", color: "#FBBF24" }}
                  >
                    References Needed
                  </h3>
                  <ul className="space-y-1">
                    {((paper.references_needed as string[]) || []).map((ref, i) => (
                      <li
                        key={i}
                        className="text-sm flex items-start gap-2"
                        style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
                      >
                        <span style={{ color: "#3A3A60" }}>-</span>
                        <span>{ref}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Methodology Notes */}
              {(paper.methodology_notes as string) && (
                <div
                  className="p-6 rounded-xl border"
                  style={{
                    background: "rgba(11, 11, 20, 0.7)",
                    backdropFilter: "blur(12px)",
                    borderColor: "rgba(255, 255, 255, 0.04)",
                  }}
                >
                  <h3
                    className="text-base font-semibold mb-3"
                    style={{ fontFamily: "'Inter', sans-serif", color: "#536DFE" }}
                  >
                    Methodology Notes
                  </h3>
                  <p
                    className="text-sm leading-relaxed whitespace-pre-wrap"
                    style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
                  >
                    {paper.methodology_notes as string}
                  </p>
                </div>
              )}

              {/* Save button */}
              <button
                onClick={() =>
                  saveMutation.mutate({
                    title: paper.title as string,
                    field: generateField,
                    status: "draft",
                  })
                }
                disabled={saveMutation.isPending}
                className="w-full px-4 py-3 rounded-lg font-semibold transition-all border disabled:opacity-50"
                style={{
                  borderColor: "rgba(124, 58, 237, 0.3)",
                  color: "#8B5CF6",
                  background: "rgba(124, 58, 237, 0.08)",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                {saveMutation.isPending ? "Saving..." : savedPaperId ? "Saved!" : "Save to My Papers"}
              </button>
            </motion.div>
          )}
        </div>
      )}

      {/* SUBMIT PAPER TAB */}
      {activeTab === "submit" && <SubmitPaperTab />}

      {/* MY PAPERS TAB */}
      {activeTab === "papers" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2
              className="text-lg font-semibold"
              style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
            >
              Saved Papers
            </h2>
            <button
              onClick={() => listMutation.mutate()}
              disabled={listMutation.isPending}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                color: "#F0F0FF",
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {listMutation.isPending ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {/* Loading */}
          {listMutation.isPending && (
            <div className="text-center py-12">
              <div
                className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-4"
                style={{ borderColor: "rgba(124, 58, 237, 0.3)", borderTopColor: "transparent" }}
              />
              <p style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
                Loading papers...
              </p>
            </div>
          )}

          {/* Error */}
          {listMutation.isError && (
            <div
              className="flex items-center gap-3 p-4 rounded-lg"
              style={{ background: "rgba(255, 71, 87, 0.08)", border: "1px solid rgba(255, 71, 87, 0.2)" }}
            >
              <AlertCircle size={20} style={{ color: "#F87171", flexShrink: 0 }} />
              <p style={{ fontFamily: "'Inter', sans-serif", color: "#F87171", fontSize: "14px" }}>
                {listMutation.error instanceof Error ? listMutation.error.message : "Failed to load papers."}
              </p>
            </div>
          )}

          {/* Empty state */}
          {!listMutation.isPending && savedPapers.length === 0 && (
            <div className="text-center py-16">
              <FolderOpen size={48} className="mx-auto mb-4" style={{ color: "#3A3A60" }} />
              <p
                className="text-base font-semibold mb-2"
                style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
              >
                No saved papers yet
              </p>
              <p
                className="text-sm"
                style={{ fontFamily: "'Inter', sans-serif", color: "#3A3A60" }}
              >
                Analyze or generate a paper, then save it here
              </p>
            </div>
          )}

          {/* Paper list */}
          {savedPapers.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              {savedPapers.map((p) => {
                const statusColors: Record<string, { bg: string; text: string }> = {
                  draft: { bg: "rgba(126, 126, 152, 0.15)", text: "#9090B8" },
                  analyzed: { bg: "rgba(124, 58, 237, 0.15)", text: "#8B5CF6" },
                  submitted: { bg: "rgba(83, 109, 254, 0.15)", text: "#536DFE" },
                  published: { bg: "rgba(74, 222, 128, 0.15)", text: "#34D399" },
                  rejected: { bg: "rgba(255, 71, 87, 0.15)", text: "#F87171" },
                };
                const status = (p.status as string) || "draft";
                const colors = statusColors[status] || statusColors.draft;

                return (
                  <div
                    key={p.id as string}
                    className="p-4 rounded-xl border"
                    style={{
                      background: "rgba(11, 11, 20, 0.7)",
                      backdropFilter: "blur(12px)",
                      borderColor: "rgba(255, 255, 255, 0.04)",
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4
                          className="text-sm font-semibold truncate mb-1"
                          style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
                        >
                          {p.title as string}
                        </h4>
                        <p
                          className="text-xs"
                          style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
                        >
                          {p.field as string} · Updated {new Date(p.updatedAt as string).toLocaleDateString()}
                        </p>
                      </div>
                      <span
                        className="px-2.5 py-1 rounded-full text-xs font-medium capitalize flex-shrink-0 ml-3"
                        style={{
                          background: colors.bg,
                          color: colors.text,
                          fontFamily: "'Inter', sans-serif",
                        }}
                      >
                        {status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
