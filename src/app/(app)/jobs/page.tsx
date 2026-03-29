"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import {
  Search,
  Heart,
  Grid3x3,
  List,
  Filter,
  Check,
  AlertTriangle,
  X,
  CheckCircle2,
  MapPin,
  Building2,
  Clock,
  Zap,
  ChevronRight,
  Briefcase,
  Bookmark,
  BookmarkCheck,
  ArrowUpDown,
  RefreshCw,
  Download,
  Square,
  CheckSquare,
  Sliders,
  Wand2,
  Trash2,
  Archive,
  BookmarkPlus,
  Save,
  AlertOctagon,
  Sparkles,
  Mail,
  Calendar,
  Copy,
  Send,
} from "lucide-react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { useCallback } from "react";

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bgBase: "#060608",
  bgSurface: "#0C0C14",
  bgElevated: "#111120",
  accent: "#8B5CF6",
  accentBright: "#7C3AED",
  accentMuted: "rgba(124, 58, 237,0.12)",
  accentBorder: "rgba(124, 58, 237,0.25)",
  textPrimary: "#F0F0FF",
  textSecondary: "#9090B8",
  textMuted: "#3A3A60",
  borderSubtle: "rgba(255,255,255,0.05)",
  borderMedium: "rgba(255,255,255,0.08)",
  green: "#34D399",
  amber: "#FBBF24",
  red: "#F87171",
  blue: "#60A5FA",
} as const;

type SortMode = "score" | "recency";
type ApplicationUrgency = "apply-now" | "soon" | "normal" | "stale" | "expired";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "discovered", label: "Discovered" },
  { value: "saved", label: "Saved" },
  { value: "applying", label: "Applying" },
  { value: "applied", label: "Applied" },
  { value: "screening", label: "Screening" },
  { value: "interview", label: "Interview" },
  { value: "offer", label: "Offer" },
  { value: "rejected", label: "Rejected" },
];

function getMatchColor(score: number): string {
  if (score >= 90) return C.green;
  if (score >= 75) return C.accent;
  if (score >= 60) return C.amber;
  return C.red;
}

function getStatusBadgeStyle(status: string): { bg: string; color: string } {
  switch (status) {
    case "offer":
      return { bg: "rgba(74,222,128,0.12)", color: C.green };
    case "interview":
    case "screening":
      return { bg: "rgba(96,165,250,0.12)", color: C.blue };
    case "applied":
    case "applying":
      return { bg: C.accentMuted, color: C.accent };
    case "rejected":
      return { bg: "rgba(248,113,113,0.12)", color: C.red };
    default:
      return { bg: "rgba(255,255,255,0.06)", color: C.textSecondary };
  }
}

function getMatchStatusIcon(status: string) {
  switch (status) {
    case "match":
      return <Check size={13} style={{ color: C.green }} />;
    case "learning":
      return <AlertTriangle size={13} style={{ color: C.amber }} />;
    case "missing":
      return <X size={13} style={{ color: C.red }} />;
    default:
      return null;
  }
}

/** Returns label and color info for an urgency level */
function getUrgencyDisplay(
  urgency: ApplicationUrgency | undefined,
  postingAgeHours: number | undefined
): { label: string; color: string; pulse: boolean; strikethrough: boolean } {
  const hours = postingAgeHours ?? 0;
  const days = Math.round(hours / 24);

  switch (urgency) {
    case "apply-now":
      return {
        label: hours < 1 ? "Just posted" : `${hours}h ago`,
        color: C.green,
        pulse: true,
        strikethrough: false,
      };
    case "soon":
      return {
        label: `${hours}h ago`,
        color: C.amber,
        pulse: false,
        strikethrough: false,
      };
    case "normal":
      return {
        label: `${days}d ago`,
        color: C.textSecondary,
        pulse: false,
        strikethrough: false,
      };
    case "stale":
      return {
        label: `${days}d ago`,
        color: C.textMuted,
        pulse: false,
        strikethrough: false,
      };
    case "expired":
      return {
        label: "Likely expired",
        color: C.red,
        pulse: false,
        strikethrough: true,
      };
    default:
      return {
        label: "",
        color: C.textMuted,
        pulse: false,
        strikethrough: false,
      };
  }
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function CardSkeleton() {
  return (
    <div
      className="rounded-xl p-4 space-y-3 animate-pulse"
      style={{ background: C.bgSurface, border: `1px solid ${C.borderSubtle}` }}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <div className="h-4 rounded-md" style={{ background: "rgba(255,255,255,0.05)", width: "60%" }} />
          <div className="h-3 rounded-md" style={{ background: "rgba(255,255,255,0.04)", width: "40%" }} />
        </div>
        <div className="w-10 h-10 rounded-lg" style={{ background: "rgba(255,255,255,0.04)" }} />
      </div>
      <div className="h-3 rounded-md" style={{ background: "rgba(255,255,255,0.03)", width: "75%" }} />
      <div className="flex gap-2">
        <div className="h-5 w-16 rounded-full" style={{ background: "rgba(255,255,255,0.04)" }} />
        <div className="h-5 w-20 rounded-full" style={{ background: "rgba(255,255,255,0.04)" }} />
      </div>
    </div>
  );
}

// ─── Match bar ────────────────────────────────────────────────────────────────
function MatchBar({ score }: { score: number }) {
  const color = getMatchColor(score);
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span
          className="text-[11px] uppercase tracking-wider"
          style={{ fontFamily: "'Inter', sans-serif", color: C.textMuted }}
        >
          Match Score
        </span>
        <span
          className="text-sm font-bold"
          style={{ fontFamily: "monospace, monospace", color }}
        >
          {score}%
        </span>
      </div>
      <div
        className="h-1.5 rounded-full overflow-hidden"
        style={{ background: "rgba(255,255,255,0.06)" }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{
            background: `linear-gradient(90deg, ${color}99, ${color})`,
          }}
        />
      </div>
    </div>
  );
}

// ─── Urgency badge ────────────────────────────────────────────────────────────
function UrgencyBadge({
  urgency,
  postingAgeHours,
}: {
  urgency: ApplicationUrgency | undefined;
  postingAgeHours: number | undefined;
}) {
  const { label, color, pulse } = getUrgencyDisplay(urgency, postingAgeHours);
  if (!label) return null;

  return (
    <span className="flex items-center gap-1">
      {pulse ? (
        <span className="relative flex h-2 w-2">
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
            style={{ background: color }}
          />
          <span
            className="relative inline-flex rounded-full h-2 w-2"
            style={{ background: color }}
          />
        </span>
      ) : (
        <Clock size={10} style={{ color }} />
      )}
      <span
        className="text-[10px] font-medium"
        style={{ fontFamily: "'Inter', sans-serif", color }}
      >
        {label}
      </span>
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function JobsPage() {
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [minScoreFilter, setMinScoreFilter] = useState(0);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortMode, setSortMode] = useState<SortMode>("score");
  const [applyFeedback, setApplyFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  // Track which job IDs have been saved to pipeline in this session
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set());

  const queryClient = useQueryClient();

  const params = new URLSearchParams();
  if (searchQuery) params.set("q", searchQuery);
  if (statusFilter) params.set("status", statusFilter);

  const {
    data: jobsData,
    isLoading: jobsLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["jobs", searchQuery, statusFilter],
    queryFn: () => apiFetch<{ data: Record<string, unknown> }>(`/api/jobs?${params.toString()}`),
    retry: false,
  });

  const jobsInner = (jobsData as Record<string, unknown>)?.data as
    | Record<string, unknown>
    | undefined;
  const rawJobs: Record<string, unknown>[] = useMemo(
    () => (jobsInner?.jobs as Record<string, unknown>[]) || [],
    [jobsInner]
  );

  // Advanced filters — must be declared before the useMemo that uses them
  const [minSalary, setMinSalary] = useState(0);
  const [jobTypeFilter, setJobTypeFilter] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState("");

  // Sort + filter based on sortMode, remoteOnly, minScoreFilter
  const jobs: Record<string, unknown>[] = useMemo(() => {
    let result = rawJobs;
    if (remoteOnly) result = result.filter((j) => j.remote === true || (j.location as string | undefined)?.toLowerCase().includes("remote"));
    if (minScoreFilter > 0) result = result.filter((j) => ((j.matchScore as number) || 0) >= minScoreFilter);
    if (minSalary > 0) result = result.filter((j) => {
      const sal = j.salary as { min?: number; max?: number } | undefined;
      return sal?.min !== undefined ? sal.min >= minSalary : sal?.max !== undefined ? sal.max >= minSalary : false;
    });
    if (jobTypeFilter) result = result.filter((j) => String(j.jobType || "").toLowerCase().includes(jobTypeFilter.toLowerCase()) || (j.tags as string[] | undefined)?.some((t) => t.toLowerCase().includes(jobTypeFilter.toLowerCase())));
    if (urgencyFilter) result = result.filter((j) => j.applicationUrgency === urgencyFilter);
    if (sortMode === "recency") {
      return [...result].sort((a, b) => {
        const ageA = (a.postingAgeHours as number | undefined) ?? Infinity;
        const ageB = (b.postingAgeHours as number | undefined) ?? Infinity;
        return ageA - ageB;
      });
    }
    return result; // already sorted by match score from API
  }, [rawJobs, sortMode, remoteOnly, minScoreFilter, jobTypeFilter, minSalary, urgencyFilter]);

  const selectedJob = jobs.find((job) => job.id === selectedJobId) ||
    (jobs.length > 0 ? jobs[0] : null);

  useEffect(() => {
    if (!selectedJobId && jobs.length > 0) {
      setSelectedJobId(jobs[0].id as string);
    }
  }, [jobs, selectedJobId]);

  // Pre-populate saved state from existing job statuses
  useEffect(() => {
    const existingSaved = new Set<string>();
    for (const job of rawJobs) {
      const status = job.status as string | undefined;
      if (
        status === "saved" ||
        status === "applying" ||
        status === "applied" ||
        status === "screening" ||
        status === "interview" ||
        status === "offer"
      ) {
        existingSaved.add(job.id as string);
      }
    }
    setSavedJobIds(existingSaved);
  }, [rawJobs]);

  const saveMutation = useMutation({
    mutationFn: (jobId: string) =>
      apiFetch(`/api/jobs/${jobId}/save`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["jobs"] }),
  });

  const pipelineMutation = useMutation({
    mutationFn: (jobId: string) =>
      apiFetch<{ saved: boolean; alreadySaved: boolean }>(`/api/jobs/${jobId}/pipeline`, { method: "POST" }),
    onSuccess: (data, jobId) => {
      const res = (data as Record<string, unknown>)?.data as { saved: boolean; alreadySaved: boolean } | undefined;
      if (res?.alreadySaved) {
        setApplyFeedback({ type: "success", text: "Already in your pipeline." });
      } else {
        setSavedJobIds((prev) => new Set([...prev, jobId]));
        setApplyFeedback({ type: "success", text: "Saved to pipeline!" });
      }
      setTimeout(() => setApplyFeedback(null), 3000);
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
    onError: () => {
      setApplyFeedback({ type: "error", text: "Failed to save to pipeline." });
      setTimeout(() => setApplyFeedback(null), 3000);
    },
  });

  const applyMutation = useMutation({
    mutationFn: (jobId: string) =>
      apiFetch(`/api/jobs/${jobId}/apply`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      setApplyFeedback({ type: "success", text: "Application submitted successfully!" });
      setTimeout(() => setApplyFeedback(null), 5000);
    },
    onError: (err: Error) => {
      setApplyFeedback({
        type: "error",
        text: err.message || "Failed to submit application.",
      });
      setTimeout(() => setApplyFeedback(null), 5000);
    },
  });

  const [searchTriggerFeedback, setSearchTriggerFeedback] = useState<string | null>(null);
  const [isRunningSearch, setIsRunningSearch] = useState(false);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkFeedback, setBulkFeedback] = useState<string | null>(null);

  // Saved searches
  const [showSaveSearch, setShowSaveSearch] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState("");

  // Auto-tailor
  const [tailorType, setTailorType] = useState<"cv" | "cover-letter">("cv");
  const [tailorTone, setTailorTone] = useState<"professional" | "enthusiastic" | "concise">("professional");
  const [tailorResult, setTailorResult] = useState<{ tailoredContent: string; keywordsAdded: string[]; atsScoreEstimate: number; summary: string } | null>(null);
  const [isTailoring, setIsTailoring] = useState(false);

  // Bulk mutation
  const bulkMutation = useMutation({
    mutationFn: (payload: { action: string; ids: string[]; status?: string }) =>
      apiFetch("/api/jobs/bulk", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: (_data, vars) => {
      setSelectedIds(new Set());
      setBulkFeedback(`${vars.action === "save" ? "Saved" : vars.action === "archive" ? "Archived" : "Updated"} ${vars.ids.length} jobs.`);
      setTimeout(() => setBulkFeedback(null), 3000);
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });

  // Saved search mutation
  const saveSearchMutation = useMutation({
    mutationFn: (name: string) =>
      apiFetch("/api/jobs/saved-searches", {
        method: "POST",
        body: JSON.stringify({
          name,
          filters: { statusFilter, remoteOnly, minScore: minScoreFilter, minSalary, jobType: jobTypeFilter, urgency: urgencyFilter, query: searchQuery },
        }),
      }),
    onSuccess: () => {
      setShowSaveSearch(false);
      setSaveSearchName("");
      setBulkFeedback("Search saved!");
      setTimeout(() => setBulkFeedback(null), 2500);
    },
  });

  const { data: savedSearchesData } = useQuery({
    queryKey: ["savedSearches"],
    queryFn: () => apiFetch<{ data: { searches: Array<{ id: string; name: string; filters: Record<string, unknown> }> } }>("/api/jobs/saved-searches"),
    retry: false,
  });
  const savedSearches = ((savedSearchesData as Record<string, unknown>)?.data as { searches: Array<{ id: string; name: string; filters: Record<string, unknown> }> } | undefined)?.searches ?? [];

  // Auto-tailor handler
  const handleTailor = useCallback(async (jobId: string) => {
    setIsTailoring(true);
    setTailorResult(null);
    try {
      const res = await apiFetch<{ data: { tailoredContent: string; keywordsAdded: string[]; atsScoreEstimate: number; summary: string } }>("/api/documents/tailor", {
        method: "POST",
        body: JSON.stringify({ jobId, type: tailorType, tone: tailorTone }),
      });
      setTailorResult((res as Record<string, unknown>)?.data as { tailoredContent: string; keywordsAdded: string[]; atsScoreEstimate: number; summary: string });
    } catch (err) {
      setApplyFeedback({ type: "error", text: err instanceof Error ? err.message : "Tailoring failed." });
      setTimeout(() => setApplyFeedback(null), 4000);
    } finally {
      setIsTailoring(false);
    }
  }, [tailorType, tailorTone]);

  // Keyboard shortcuts (j/k navigate, s save, a apply, Escape deselect)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      const idx = jobs.findIndex((j) => j.id === selectedJobId);
      if (e.key === "j" || (e.key === "ArrowDown" && !e.shiftKey)) {
        e.preventDefault();
        const next = jobs[idx + 1];
        if (next) setSelectedJobId(next.id as string);
      } else if (e.key === "k" || (e.key === "ArrowUp" && !e.shiftKey)) {
        e.preventDefault();
        const prev = jobs[idx - 1];
        if (prev) setSelectedJobId(prev.id as string);
      } else if (e.key === "s" && !e.metaKey && !e.ctrlKey && selectedJobId) {
        e.preventDefault();
        pipelineMutation.mutate(selectedJobId);
      } else if (e.key === "a" && !e.metaKey && !e.ctrlKey && selectedJobId) {
        e.preventDefault();
        applyMutation.mutate(selectedJobId);
      } else if (e.key === "Escape") {
        setSelectedIds(new Set());
        setTailorResult(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [jobs, selectedJobId, pipelineMutation, applyMutation]);

  // Toggle job selection for bulk
  const toggleSelect = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleExportCSV = () => {
    const rows = [
      ["Title", "Company", "Location", "Status", "Match Score", "Salary", "Platform", "URL"].join(","),
      ...jobs.map((j) => [
        `"${String(j.title || "").replace(/"/g, '""')}"`,
        `"${String(j.company || "").replace(/"/g, '""')}"`,
        `"${String(j.location || "").replace(/"/g, '""')}"`,
        String(j.status || ""),
        String(j.matchScore || ""),
        `"${String(j.salary || "").replace(/"/g, '""')}"`,
        String(j.platform || ""),
        String(j.url || ""),
      ].join(",")),
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jobs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRunSearch = async () => {
    setIsRunningSearch(true);
    setSearchTriggerFeedback(null);
    try {
      await apiFetch("/api/settings/scheduler", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run-now", task: "auto-search" }),
      });
      setSearchTriggerFeedback("Search started! Refresh in a moment.");
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["jobs"] });
        setSearchTriggerFeedback(null);
      }, 4000);
    } catch {
      setSearchTriggerFeedback("Failed to trigger search.");
      setTimeout(() => setSearchTriggerFeedback(null), 4000);
    } finally {
      setIsRunningSearch(false);
    }
  };

  return (
    <div className="w-full h-[calc(100vh-120px)] flex gap-4 relative">
      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div
          className="absolute top-0 left-0 right-0 z-20 flex items-center gap-3 px-4 py-2.5 rounded-xl"
          style={{ background: "#1a1040", border: `1px solid ${C.accentBorder}`, boxShadow: "0 4px 20px rgba(124,58,237,0.2)" }}
        >
          <span className="text-[12px] font-semibold" style={{ color: C.accent, fontFamily: "'Inter', sans-serif" }}>
            {selectedIds.size} selected
          </span>
          <div className="flex items-center gap-2 ml-2">
            <button
              onClick={() => bulkMutation.mutate({ action: "save", ids: [...selectedIds] })}
              disabled={bulkMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all hover:opacity-80 disabled:opacity-50"
              style={{ background: C.accentMuted, border: `1px solid ${C.accentBorder}`, color: C.accent, fontFamily: "'Inter', sans-serif" }}
            >
              <BookmarkPlus size={12} /> Save All
            </button>
            <button
              onClick={() => bulkMutation.mutate({ action: "archive", ids: [...selectedIds] })}
              disabled={bulkMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all hover:opacity-80 disabled:opacity-50"
              style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)", color: C.amber, fontFamily: "'Inter', sans-serif" }}
            >
              <Archive size={12} /> Archive
            </button>
            <button
              onClick={() => bulkMutation.mutate({ action: "delete", ids: [...selectedIds] })}
              disabled={bulkMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all hover:opacity-80 disabled:opacity-50"
              style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", color: C.red, fontFamily: "'Inter', sans-serif" }}
            >
              <Trash2 size={12} /> Delete
            </button>
          </div>
          {bulkFeedback && <span className="text-[11px] ml-auto" style={{ color: C.green, fontFamily: "'Inter', sans-serif" }}>{bulkFeedback}</span>}
          <button onClick={() => setSelectedIds(new Set())} className="ml-auto" title="Clear selection">
            <X size={14} style={{ color: C.textMuted }} />
          </button>
        </div>
      )}

      {/* Error banner */}
      {isError && (
        <div
          className="absolute top-0 left-0 right-0 z-10 flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{
            background: "rgba(248,113,113,0.10)",
            border: "1px solid rgba(248,113,113,0.25)",
          }}
        >
          <AlertTriangle size={15} style={{ color: C.red, flexShrink: 0 }} />
          <p
            className="text-sm"
            style={{ fontFamily: "'Inter', sans-serif", color: C.red }}
          >
            {error instanceof Error
              ? error.message
              : "Failed to load jobs. Please try again."}
          </p>
        </div>
      )}

      {/* ── LEFT PANEL ────────────────────────────────────────────────────── */}
      <div className="w-[380px] flex flex-col gap-3">
        {/* Top bar: search + filter + view toggle */}
        <div className="flex gap-2">
          {/* Search */}
          <div
            className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all"
            style={{
              background: C.bgSurface,
              border: `1px solid ${C.borderSubtle}`,
            }}
          >
            <Search size={15} style={{ color: C.textMuted, flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Search jobs… (Enter)"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setSearchQuery(searchInput);
              }}
              className="flex-1 bg-transparent outline-none text-sm"
              style={{
                fontFamily: "'Inter', sans-serif",
                color: C.textPrimary,
              }}
            />
            {searchInput && (
              <button
                onClick={() => {
                  setSearchInput("");
                  setSearchQuery("");
                }}
              >
                <X size={13} style={{ color: C.textMuted }} />
              </button>
            )}
          </div>

          {/* Filter */}
          <div className="relative">
            <button
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className="p-2.5 rounded-xl transition-all"
              style={{
                background: (statusFilter || remoteOnly || minScoreFilter > 0) ? C.accentMuted : C.bgSurface,
                border: `1px solid ${(statusFilter || remoteOnly || minScoreFilter > 0) ? C.accentBorder : C.borderSubtle}`,
              }}
            >
              <Filter
                size={15}
                style={{ color: (statusFilter || remoteOnly || minScoreFilter > 0) ? C.accent : C.textMuted }}
              />
            </button>
            <AnimatePresence>
              {showFilterDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full right-0 mt-1.5 w-48 rounded-xl overflow-hidden z-20"
                  style={{
                    background: C.bgElevated,
                    border: `1px solid ${C.borderMedium}`,
                    boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
                  }}
                >
                  {/* Remote toggle */}
                  <div className="px-4 py-2.5 border-b" style={{ borderColor: C.borderSubtle }}>
                    <button
                      onClick={() => setRemoteOnly(!remoteOnly)}
                      className="w-full flex items-center justify-between text-sm"
                      style={{ fontFamily: "'Inter', sans-serif", color: remoteOnly ? C.accent : C.textSecondary }}
                    >
                      Remote Only
                      <div
                        className="w-8 h-4 rounded-full transition-all relative"
                        style={{ background: remoteOnly ? C.accent : C.borderMedium }}
                      >
                        <div
                          className="absolute top-0.5 w-3 h-3 rounded-full transition-all"
                          style={{ background: "white", left: remoteOnly ? "18px" : "2px" }}
                        />
                      </div>
                    </button>
                  </div>
                  {/* Min score */}
                  <div className="px-4 py-2.5 border-b" style={{ borderColor: C.borderSubtle }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px]" style={{ color: C.textSecondary, fontFamily: "'Inter', sans-serif" }}>Min Match Score</span>
                      <span className="text-[11px] font-semibold" style={{ color: minScoreFilter > 0 ? C.accent : C.textMuted, fontFamily: "monospace" }}>{minScoreFilter > 0 ? `${minScoreFilter}%` : "Any"}</span>
                    </div>
                    <input
                      type="range" min={0} max={90} step={10}
                      value={minScoreFilter}
                      onChange={(e) => setMinScoreFilter(Number(e.target.value))}
                      className="w-full accent-violet-500 h-1"
                    />
                  </div>
                  {/* Min salary */}
                  <div className="px-4 py-2.5 border-b" style={{ borderColor: C.borderSubtle }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px]" style={{ color: C.textSecondary, fontFamily: "'Inter', sans-serif" }}>Min Salary (k)</span>
                      <span className="text-[11px] font-semibold" style={{ color: minSalary > 0 ? C.accent : C.textMuted, fontFamily: "monospace" }}>{minSalary > 0 ? `$${minSalary}k` : "Any"}</span>
                    </div>
                    <input
                      type="range" min={0} max={250} step={10}
                      value={minSalary}
                      onChange={(e) => setMinSalary(Number(e.target.value) * 1000)}
                      className="w-full accent-violet-500 h-1"
                    />
                  </div>
                  {/* Job type filter */}
                  <div className="px-4 py-2.5 border-b" style={{ borderColor: C.borderSubtle }}>
                    <p className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: C.textMuted, fontFamily: "'Inter', sans-serif" }}>Job Type</p>
                    <div className="flex flex-wrap gap-1">
                      {["", "full-time", "contract", "internship", "part-time"].map((t) => (
                        <button key={t} onClick={() => setJobTypeFilter(t)}
                          className="px-2 py-0.5 rounded-md text-[10px] transition-all"
                          style={{ background: jobTypeFilter === t ? C.accentMuted : "rgba(255,255,255,0.04)", border: `1px solid ${jobTypeFilter === t ? C.accentBorder : C.borderSubtle}`, color: jobTypeFilter === t ? C.accent : C.textSecondary, fontFamily: "'Inter', sans-serif" }}>
                          {t || "All"}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Urgency filter */}
                  <div className="px-4 py-2.5 border-b" style={{ borderColor: C.borderSubtle }}>
                    <p className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: C.textMuted, fontFamily: "'Inter', sans-serif" }}>Urgency</p>
                    <div className="flex flex-wrap gap-1">
                      {["", "apply-now", "soon", "normal"].map((u) => (
                        <button key={u} onClick={() => setUrgencyFilter(u)}
                          className="px-2 py-0.5 rounded-md text-[10px] transition-all"
                          style={{ background: urgencyFilter === u ? C.accentMuted : "rgba(255,255,255,0.04)", border: `1px solid ${urgencyFilter === u ? C.accentBorder : C.borderSubtle}`, color: urgencyFilter === u ? C.accent : C.textSecondary, fontFamily: "'Inter', sans-serif" }}>
                          {u || "Any"}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Status options */}
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setStatusFilter(opt.value);
                        setShowFilterDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-white/5 flex items-center justify-between"
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        color:
                          statusFilter === opt.value
                            ? C.accent
                            : C.textSecondary,
                      }}
                    >
                      {opt.label}
                      {statusFilter === opt.value && (
                        <Check size={13} style={{ color: C.accent }} />
                      )}
                    </button>
                  ))}
                  {/* Saved searches */}
                  {savedSearches.length > 0 && (
                    <div className="border-t" style={{ borderColor: C.borderSubtle }}>
                      <p className="px-4 pt-2.5 pb-1 text-[10px] uppercase tracking-wider" style={{ color: C.textMuted, fontFamily: "'Inter', sans-serif" }}>Saved Searches</p>
                      {savedSearches.map((ss) => (
                        <button key={ss.id}
                          onClick={() => {
                            const f = ss.filters;
                            if (f.statusFilter !== undefined) setStatusFilter(f.statusFilter as string);
                            if (f.remoteOnly !== undefined) setRemoteOnly(f.remoteOnly as boolean);
                            if (f.minScore !== undefined) setMinScoreFilter(f.minScore as number);
                            if (f.minSalary !== undefined) setMinSalary(f.minSalary as number);
                            if (f.jobType !== undefined) setJobTypeFilter(f.jobType as string);
                            if (f.urgency !== undefined) setUrgencyFilter(f.urgency as string);
                            if (f.query !== undefined) { setSearchQuery(f.query as string); setSearchInput(f.query as string); }
                            setShowFilterDropdown(false);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-white/5 flex items-center gap-2"
                          style={{ fontFamily: "'Inter', sans-serif", color: C.textSecondary, fontSize: 12 }}>
                          <Save size={10} style={{ color: C.accent }} /> {ss.name}
                        </button>
                      ))}
                    </div>
                  )}
                  {/* Save current search */}
                  <div className="border-t px-4 py-2.5" style={{ borderColor: C.borderSubtle }}>
                    {showSaveSearch ? (
                      <div className="flex gap-1.5">
                        <input value={saveSearchName} onChange={(e) => setSaveSearchName(e.target.value)}
                          placeholder="Search name…"
                          className="flex-1 px-2 py-1 rounded-md text-[12px] outline-none"
                          style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${C.borderMedium}`, color: C.textPrimary, fontFamily: "'Inter', sans-serif" }}
                          onKeyDown={(e) => { if (e.key === "Enter" && saveSearchName.trim()) saveSearchMutation.mutate(saveSearchName.trim()); }}
                        />
                        <button onClick={() => saveSearchMutation.mutate(saveSearchName.trim())}
                          disabled={!saveSearchName.trim() || saveSearchMutation.isPending}
                          className="px-2 py-1 rounded-md text-[11px] disabled:opacity-50"
                          style={{ background: C.accentBright, color: "white", fontFamily: "'Inter', sans-serif" }}>
                          Save
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setShowSaveSearch(true)} className="text-[11px] flex items-center gap-1.5 w-full" style={{ color: C.textMuted, fontFamily: "'Inter', sans-serif" }}>
                        <Save size={11} style={{ color: C.accent }} /> Save current filters
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* View toggle */}
          <button
            onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
            className="p-2.5 rounded-xl transition-all hover:bg-white/5"
            style={{
              background: C.bgSurface,
              border: `1px solid ${C.borderSubtle}`,
            }}
          >
            {viewMode === "grid" ? (
              <List size={15} style={{ color: C.textMuted }} />
            ) : (
              <Grid3x3 size={15} style={{ color: C.textMuted }} />
            )}
          </button>
        </div>

        {/* Sort toggle + result count + run search */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            {!jobsLoading && (
              <p
                className="text-[11px] uppercase tracking-wider"
                style={{ fontFamily: "'Inter', sans-serif", color: C.textMuted }}
              >
                {jobs.length} {jobs.length === 1 ? "position" : "positions"}
              </p>
            )}
            {searchTriggerFeedback && (
              <span
                className="text-[11px]"
                style={{ fontFamily: "'Inter', sans-serif", color: C.green }}
              >
                {searchTriggerFeedback}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!jobsLoading && jobs.length > 0 && (
              <button
                onClick={() => setSortMode(sortMode === "score" ? "recency" : "score")}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all hover:bg-white/5"
                style={{
                  border: `1px solid ${C.borderSubtle}`,
                  background: sortMode === "recency" ? C.accentMuted : "transparent",
                }}
              >
                <ArrowUpDown size={11} style={{ color: sortMode === "recency" ? C.accent : C.textMuted }} />
                <span
                  className="text-[10px] font-medium"
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    color: sortMode === "recency" ? C.accent : C.textMuted,
                  }}
                >
                  {sortMode === "score" ? "By Match" : "By Recency"}
                </span>
              </button>
            )}
            <button
              onClick={handleRunSearch}
              disabled={isRunningSearch}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all hover:bg-white/5 disabled:opacity-50"
              style={{
                border: `1px solid ${C.accentBorder}`,
                background: C.accentMuted,
              }}
              title="Run job search now"
            >
              <RefreshCw size={11} className={isRunningSearch ? "animate-spin" : ""} style={{ color: C.accent }} />
              <span className="text-[10px] font-medium" style={{ fontFamily: "'Inter', sans-serif", color: C.accent }}>
                {isRunningSearch ? "Searching…" : "Run Search"}
              </span>
            </button>
            {jobs.length > 0 && (
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all hover:bg-white/5"
                style={{
                  border: `1px solid ${C.borderSubtle}`,
                  background: "transparent",
                }}
                title="Export jobs as CSV"
              >
                <Download size={11} style={{ color: C.textMuted }} />
                <span className="text-[10px] font-medium" style={{ fontFamily: "'Inter', sans-serif", color: C.textMuted }}>
                  CSV
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Job list */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {jobsLoading ? (
            <>
              {[...Array(5)].map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </>
          ) : jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: C.accentMuted }}
              >
                <Briefcase size={22} style={{ color: C.accent }} />
              </div>
              <p
                className="text-sm font-medium"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  color: C.textSecondary,
                }}
              >
                No jobs found
              </p>
              <p
                className="text-xs text-center"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  color: C.textMuted,
                }}
              >
                Try adjusting your search or filters
              </p>
            </div>
          ) : (
            jobs.map((job) => {
              const isSelected = selectedJobId === job.id;
              const matchScore = (job.matchScore as number) || 0;
              const matchColor = getMatchColor(matchScore);
              const statusBadge = getStatusBadgeStyle(job.status as string);
              const urgency = job.applicationUrgency as ApplicationUrgency | undefined;
              const postingAgeHours = job.postingAgeHours as number | undefined;
              const whyApply = job.whyApply as string | undefined;
              const isExpired = urgency === "expired";
              const isPipelineSaved = savedJobIds.has(job.id as string);

              if (viewMode === "list") {
                return (
                  <motion.div
                    key={job.id as string}
                    onClick={() => setSelectedJobId(job.id as string)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all"
                    style={{
                      background: isSelected ? C.accentMuted : C.bgSurface,
                      border: `1px solid ${isSelected ? C.accentBorder : C.borderSubtle}`,
                      boxShadow: isSelected
                        ? "0 0 0 1px rgba(124, 58, 237,0.15)"
                        : "none",
                      opacity: isExpired ? 0.6 : 1,
                    }}
                    whileHover={{ scale: 1.005 }}
                  >
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-semibold truncate"
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          color: C.textPrimary,
                          textDecoration: isExpired ? "line-through" : "none",
                        }}
                      >
                        {job.title as string}
                      </p>
                      <p
                        className="text-xs truncate"
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          color: C.textSecondary,
                        }}
                      >
                        {job.company as string}
                      </p>
                    </div>
                    {urgency && (
                      <UrgencyBadge urgency={urgency} postingAgeHours={postingAgeHours} />
                    )}
                    <span
                      className="text-xs font-bold flex-shrink-0"
                      style={{
                        fontFamily: "monospace, monospace",
                        color: matchColor,
                      }}
                    >
                      {matchScore}%
                    </span>
                    <ChevronRight
                      size={14}
                      style={{ color: C.textMuted, flexShrink: 0 }}
                    />
                  </motion.div>
                );
              }

              const isBulkSelected = selectedIds.has(job.id as string);
              const missingSkills = (job.analysis as Record<string, unknown> | undefined)?.missingSkills as string[] | undefined;
              const analysis = job.analysis as { strengths?: string[]; missingSkills?: string[] } | undefined;
              const skillMatchCount = analysis?.strengths?.length ?? 0;
              const missingCount = analysis?.missingSkills?.length ?? 0;
              const totalSkills = skillMatchCount + missingCount;

              return (
                <motion.div
                  key={job.id as string}
                  onClick={() => setSelectedJobId(job.id as string)}
                  className="p-4 rounded-xl cursor-pointer transition-all relative"
                  style={{
                    background: isBulkSelected ? "rgba(124,58,237,0.10)" : isSelected ? C.accentMuted : C.bgSurface,
                    border: `1px solid ${isBulkSelected ? C.accentBorder : isSelected ? C.accentBorder : C.borderSubtle}`,
                    boxShadow: isSelected
                      ? "0 0 20px rgba(124, 58, 237,0.08)"
                      : "none",
                    opacity: isExpired ? 0.65 : 1,
                  }}
                  whileHover={{ scale: 1.01 }}
                  transition={{ duration: 0.15 }}
                >
                  {/* Bulk select checkbox */}
                  <button
                    onClick={(e) => toggleSelect(job.id as string, e)}
                    className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    style={{ opacity: isBulkSelected ? 1 : undefined }}
                    title="Select for bulk action"
                  >
                    {isBulkSelected
                      ? <CheckSquare size={14} style={{ color: C.accent }} />
                      : <Square size={14} style={{ color: C.textMuted }} />}
                  </button>

                  {/* Header row */}
                  <div className="flex items-start justify-between mb-2.5">
                    <div className="flex-1 min-w-0 pr-2 pl-1">
                      <h3
                        className="text-[14px] font-semibold leading-snug mb-0.5 truncate"
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          color: C.textPrimary,
                          textDecoration: isExpired ? "line-through" : "none",
                        }}
                      >
                        {job.title as string}
                      </h3>
                      <p
                        className="text-[12px]"
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          color: C.textSecondary,
                        }}
                      >
                        {job.company as string}
                      </p>
                    </div>
                    {/* Match score badge */}
                    <div
                      className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{
                        background: `${matchColor}14`,
                        border: `1px solid ${matchColor}33`,
                      }}
                    >
                      <span
                        className="text-[11px] font-bold leading-none"
                        style={{
                          fontFamily: "monospace, monospace",
                          color: matchColor,
                        }}
                      >
                        {matchScore}
                      </span>
                    </div>
                  </div>

                  {/* whyApply AI insight */}
                  {whyApply && (
                    <p
                      className="text-[11px] italic mb-2 leading-snug"
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        color: C.accent,
                        opacity: 0.85,
                      }}
                    >
                      {whyApply}
                    </p>
                  )}

                  {/* Location + salary */}
                  <div
                    className="flex items-center gap-3 text-[11px] mb-3"
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      color: C.textMuted,
                    }}
                  >
                    {!!job.location && (
                      <span className="flex items-center gap-1">
                        <MapPin size={11} />
                        {String(job.location)}
                      </span>
                    )}
                    {!!job.salary && (
                      <span className="flex items-center gap-1">
                        <span style={{ color: C.textMuted }}>·</span>
                        {String(job.salary)}
                      </span>
                    )}
                  </div>

                  {/* Tags row + urgency + save button */}
                  <div className="flex items-center gap-1.5 flex-wrap justify-between">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Status badge */}
                      {!!job.status && (
                        <span
                          className="px-2 py-0.5 rounded-md text-[10px] font-medium capitalize"
                          style={{
                            fontFamily: "'Inter', sans-serif",
                            background: statusBadge.bg,
                            color: statusBadge.color,
                          }}
                        >
                          {String(job.status)}
                        </span>
                      )}
                      {/* Platform + type tags */}
                      {(job.tags as string[] | undefined)
                        ?.slice(0, 2)
                        .map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md text-[10px]"
                            style={{
                              fontFamily: "monospace, monospace",
                              background: "rgba(255,255,255,0.04)",
                              color: C.textMuted,
                              border: `1px solid ${C.borderSubtle}`,
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                    </div>

                    {/* Save to Pipeline button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        pipelineMutation.mutate(job.id as string);
                      }}
                      disabled={pipelineMutation.isPending || isPipelineSaved}
                      className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md transition-all"
                      style={{
                        background: isPipelineSaved ? "rgba(52,211,153,0.10)" : "rgba(255,255,255,0.04)",
                        border: `1px solid ${isPipelineSaved ? "rgba(52,211,153,0.25)" : C.borderSubtle}`,
                        opacity: pipelineMutation.isPending ? 0.5 : 1,
                      }}
                      title={isPipelineSaved ? "Already in pipeline" : "Save to Pipeline"}
                    >
                      {isPipelineSaved ? (
                        <BookmarkCheck size={11} style={{ color: C.green }} />
                      ) : (
                        <Bookmark size={11} style={{ color: C.textMuted }} />
                      )}
                    </button>
                  </div>

                  {/* Urgency row */}
                  {urgency && (
                    <div className="mt-2">
                      <UrgencyBadge urgency={urgency} postingAgeHours={postingAgeHours} />
                    </div>
                  )}

                  {/* Fallback posted time when no urgency data */}
                  {!urgency && (() => {
                    const postedStr = (job.posted as string) || (job.createdAt as string);
                    const daysOld = postedStr ? Math.floor((Date.now() - new Date(postedStr).getTime()) / 86400000) : 0;
                    const expiryColor = daysOld >= 35 ? C.red : daysOld >= 21 ? C.amber : C.textMuted;
                    const expiryLabel = daysOld >= 35 ? `${daysOld}d old — may be closed` : daysOld >= 21 ? `${daysOld}d old — expiring soon` : postedStr || "Recently posted";
                    return (
                      <p className="text-[11px] mt-2.5 flex items-center gap-1" style={{ fontFamily: "'Inter', sans-serif", color: expiryColor }}>
                        <Clock size={10} />
                        {expiryLabel}
                      </p>
                    );
                  })()}

                  {/* Skill gap badge */}
                  {totalSkills > 0 && (
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className="text-[10px]" style={{ color: skillMatchCount === totalSkills ? C.green : missingCount > 2 ? C.red : C.amber, fontFamily: "'Inter', sans-serif" }}>
                        {skillMatchCount}/{totalSkills} skills
                      </span>
                      {missingSkills && missingSkills.length > 0 && (
                        <span className="text-[10px]" style={{ color: C.textMuted, fontFamily: "'Inter', sans-serif" }}>
                          · missing: {missingSkills.slice(0, 2).join(", ")}{missingSkills.length > 2 ? ` +${missingSkills.length - 2}` : ""}
                        </span>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* ── CENTER PANEL: JOB DETAIL ──────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedJob ? (
          <div
            className="flex-1 rounded-xl overflow-y-auto"
            style={{
              background: C.bgSurface,
              border: `1px solid ${C.borderSubtle}`,
            }}
          >
            {/* Detail header */}
            <div
              className="px-6 pt-6 pb-5"
              style={{ borderBottom: `1px solid ${C.borderSubtle}` }}
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1 min-w-0">
                  <h2
                    className="text-[22px] font-bold leading-tight mb-1"
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      color: C.textPrimary,
                      textDecoration:
                        (selectedJob.applicationUrgency as ApplicationUrgency | undefined) === "expired"
                          ? "line-through"
                          : "none",
                    }}
                  >
                    {selectedJob.title as string}
                  </h2>

                  {/* whyApply insight in detail header */}
                  {!!(selectedJob.whyApply as string | undefined) && (
                    <p
                      className="text-[13px] italic mb-2"
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        color: C.accent,
                        opacity: 0.9,
                      }}
                    >
                      {selectedJob.whyApply as string}
                    </p>
                  )}

                  <div
                    className="flex items-center gap-2 text-sm flex-wrap"
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      color: C.textSecondary,
                    }}
                  >
                    <span className="flex items-center gap-1">
                      <Building2 size={13} />
                      {selectedJob.company as string}
                    </span>
                    {!!selectedJob.location && (
                      <>
                        <span style={{ color: C.textMuted }}>·</span>
                        <span className="flex items-center gap-1">
                          <MapPin size={13} />
                          {String(selectedJob.location)}
                        </span>
                      </>
                    )}
                    {!!selectedJob.salary && (
                      <>
                        <span style={{ color: C.textMuted }}>·</span>
                        <span style={{ color: C.accent }}>
                          {String(selectedJob.salary)}
                        </span>
                      </>
                    )}
                    {/* Urgency badge in detail header */}
                    {!!(selectedJob.applicationUrgency as ApplicationUrgency | undefined) && (
                      <>
                        <span style={{ color: C.textMuted }}>·</span>
                        <UrgencyBadge
                          urgency={selectedJob.applicationUrgency as ApplicationUrgency}
                          postingAgeHours={selectedJob.postingAgeHours as number | undefined}
                        />
                      </>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => saveMutation.mutate(selectedJob.id as string)}
                  className="p-2 rounded-lg transition-all hover:bg-white/5 flex-shrink-0"
                  style={{ border: `1px solid ${C.borderSubtle}` }}
                >
                  <Heart
                    size={18}
                    style={{
                      color: selectedJob.saved ? C.red : C.textMuted,
                      fill: selectedJob.saved ? C.red : "transparent",
                    }}
                  />
                </button>
              </div>

              {/* Match bar in header */}
              <MatchBar score={(selectedJob.matchScore as number) || 0} />
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-6">
              {/* Tags */}
              {(selectedJob.tags as string[] | undefined)?.length ? (
                <div className="flex flex-wrap gap-2">
                  {(selectedJob.tags as string[]).map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-lg text-[12px]"
                      style={{
                        fontFamily: "monospace, monospace",
                        background: C.accentMuted,
                        color: C.accent,
                        border: `1px solid ${C.accentBorder}`,
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}

              {/* Status badge */}
              {!!selectedJob.status && (
                <div className="flex items-center gap-2">
                  <span
                    className="text-[11px] uppercase tracking-wider"
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      color: C.textMuted,
                    }}
                  >
                    Status
                  </span>
                  <span
                    className="px-3 py-1 rounded-full text-[11px] font-medium capitalize"
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      ...getStatusBadgeStyle(String(selectedJob.status)),
                    }}
                  >
                    {String(selectedJob.status)}
                  </span>
                </div>
              )}

              {/* About the role */}
              <div>
                <h3
                  className="text-[13px] font-semibold mb-3"
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    color: C.textPrimary,
                  }}
                >
                  About the Role
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    color: C.textSecondary,
                  }}
                >
                  {(selectedJob.description as string) ||
                    "No description available."}
                </p>
              </div>

              {/* Requirements */}
              {(selectedJob.requirements as string[] | undefined)?.length ? (
                <div>
                  <h3
                    className="text-[13px] font-semibold mb-3"
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      color: C.textPrimary,
                    }}
                  >
                    Requirements
                  </h3>
                  <ul className="space-y-2">
                    {(selectedJob.requirements as string[]).map((req, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2.5 text-sm"
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          color: C.textSecondary,
                        }}
                      >
                        <span
                          className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ background: C.accentBright }}
                        />
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {/* Match Analysis */}
              {!!(selectedJob.analysis as Record<string, unknown> | undefined) && (() => {
                const analysis = selectedJob.analysis as { strengths?: string[]; concerns?: string[]; missingSkills?: string[]; recommendations?: string[] };
                const hasContent = (analysis.strengths?.length || analysis.concerns?.length || analysis.missingSkills?.length);
                if (!hasContent) return null;
                return (
                  <div className="space-y-4">
                    <h3 className="text-[13px] font-semibold" style={{ fontFamily: "'Inter', sans-serif", color: C.textPrimary }}>
                      Match Analysis
                    </h3>
                    {!!(analysis.strengths?.length) && (
                      <div>
                        <p className="text-[11px] uppercase tracking-wider mb-2" style={{ fontFamily: "'Inter', sans-serif", color: C.textMuted }}>Strengths</p>
                        <ul className="space-y-1.5">
                          {analysis.strengths!.map((s, i) => (
                            <li key={i} className="flex items-start gap-2 text-[12px]" style={{ fontFamily: "'Inter', sans-serif", color: C.textSecondary }}>
                              <span className="mt-0.5 text-[10px]" style={{ color: C.green }}>✓</span>{s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {!!(analysis.missingSkills?.length) && (
                      <div>
                        <p className="text-[11px] uppercase tracking-wider mb-2" style={{ fontFamily: "'Inter', sans-serif", color: C.textMuted }}>Skills to Develop</p>
                        <div className="flex flex-wrap gap-1.5">
                          {analysis.missingSkills!.map((skill, i) => (
                            <span key={i} className="px-2 py-0.5 rounded-md text-[11px]" style={{ fontFamily: "'Inter', sans-serif", background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)", color: C.amber }}>
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {!!(analysis.concerns?.length) && (
                      <div>
                        <p className="text-[11px] uppercase tracking-wider mb-2" style={{ fontFamily: "'Inter', sans-serif", color: C.textMuted }}>Watch Out For</p>
                        <ul className="space-y-1.5">
                          {analysis.concerns!.map((c, i) => (
                            <li key={i} className="flex items-start gap-2 text-[12px]" style={{ fontFamily: "'Inter', sans-serif", color: C.textSecondary }}>
                              <span className="mt-0.5 text-[10px]" style={{ color: C.amber }}>!</span>{c}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {!!(analysis.recommendations?.length) && (
                      <div>
                        <p className="text-[11px] uppercase tracking-wider mb-2" style={{ fontFamily: "'Inter', sans-serif", color: C.textMuted }}>Recommendations</p>
                        <ul className="space-y-1.5">
                          {analysis.recommendations!.map((r, i) => (
                            <li key={i} className="flex items-start gap-2 text-[12px]" style={{ fontFamily: "'Inter', sans-serif", color: C.textSecondary }}>
                              <span className="mt-0.5 text-[10px]" style={{ color: C.accent }}>→</span>{r}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Auto-tailor button */}
              <div
                className="p-4 rounded-xl"
                style={{ background: "rgba(124,58,237,0.06)", border: `1px solid ${C.accentBorder}` }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Wand2 size={14} style={{ color: C.accent }} />
                    <span className="text-[13px] font-semibold" style={{ color: C.textPrimary, fontFamily: "'Inter', sans-serif" }}>AI Auto-Tailor</span>
                  </div>
                  {tailorResult && <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: "rgba(52,211,153,0.1)", color: C.green, fontFamily: "monospace" }}>ATS ~{tailorResult.atsScoreEstimate}%</span>}
                </div>
                <div className="flex gap-2 mb-3">
                  {(["cv", "cover-letter"] as const).map((t) => (
                    <button key={t} onClick={() => setTailorType(t)}
                      className="flex-1 py-1.5 rounded-lg text-[11px] font-medium transition-all"
                      style={{ background: tailorType === t ? C.accentBright : "rgba(255,255,255,0.04)", color: tailorType === t ? "white" : C.textSecondary, fontFamily: "'Inter', sans-serif", border: `1px solid ${tailorType === t ? "transparent" : C.borderSubtle}` }}>
                      {t === "cv" ? "CV" : "Cover Letter"}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1 mb-3">
                  {(["professional", "enthusiastic", "concise"] as const).map((tone) => (
                    <button key={tone} onClick={() => setTailorTone(tone)}
                      className="flex-1 py-1 rounded-md text-[10px] capitalize transition-all"
                      style={{ background: tailorTone === tone ? C.accentMuted : "transparent", color: tailorTone === tone ? C.accent : C.textMuted, border: `1px solid ${tailorTone === tone ? C.accentBorder : C.borderSubtle}`, fontFamily: "'Inter', sans-serif" }}>
                      {tone}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => { handleTailor(selectedJob.id as string); }}
                  disabled={isTailoring}
                  className="w-full py-2 rounded-lg text-[12px] font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  style={{ background: C.accentBright, color: "white", fontFamily: "'Inter', sans-serif", boxShadow: "0 2px 12px rgba(124,58,237,0.25)" }}
                >
                  {isTailoring ? <><Sparkles size={13} className="animate-spin" /> Tailoring…</> : <><Wand2 size={13} /> Tailor for this Job</>}
                </button>
                {tailorResult && (
                  <div className="mt-3 space-y-2">
                    <p className="text-[11px]" style={{ color: C.textSecondary, fontFamily: "'Inter', sans-serif" }}>{tailorResult.summary}</p>
                    {tailorResult.keywordsAdded.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {tailorResult.keywordsAdded.slice(0, 5).map((kw, i) => (
                          <span key={i} className="px-1.5 py-0.5 rounded-md text-[10px]" style={{ background: C.accentMuted, color: C.accent, border: `1px solid ${C.accentBorder}`, fontFamily: "monospace" }}>{kw}</span>
                        ))}
                      </div>
                    )}
                    <div className="p-3 rounded-lg text-[12px] leading-relaxed" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${C.borderSubtle}`, color: C.textSecondary, fontFamily: "'Inter', sans-serif", maxHeight: 160, overflowY: "auto" }}>
                      {tailorResult.tailoredContent}
                    </div>
                  </div>
                )}
              </div>

              {/* Cross-feature quick actions */}
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/company-research?company=${encodeURIComponent(String(selectedJob.company || ""))}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] transition-all hover:opacity-80"
                  style={{
                    background: "rgba(96,165,250,0.08)",
                    border: "1px solid rgba(96,165,250,0.2)",
                    color: C.blue,
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  <Building2 size={12} />
                  Research Company
                </Link>
                <Link
                  href={`/recruiter-prep?role=${encodeURIComponent(String(selectedJob.title || ""))}&company=${encodeURIComponent(String(selectedJob.company || ""))}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] transition-all hover:opacity-80"
                  style={{
                    background: C.accentMuted,
                    border: `1px solid ${C.accentBorder}`,
                    color: C.accent,
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  <ChevronRight size={12} />
                  Interview Prep
                </Link>
                <Link
                  href={`/salary?title=${encodeURIComponent(String(selectedJob.title || ""))}&company=${encodeURIComponent(String(selectedJob.company || ""))}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] transition-all hover:opacity-80"
                  style={{
                    background: "rgba(52,211,153,0.08)",
                    border: "1px solid rgba(52,211,153,0.2)",
                    color: C.green,
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  <Zap size={12} />
                  Salary Coach
                </Link>
              </div>

              {/* Job URL */}
              {!!(selectedJob.url as string | undefined) && (
                <a
                  href={selectedJob.url as string}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-[12px] transition-all hover:opacity-80"
                  style={{ fontFamily: "'Inter', sans-serif", color: C.accent }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                  </svg>
                  View Original Posting
                </a>
              )}

              {/* Apply feedback toast */}
              <AnimatePresence>
                {applyFeedback && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="px-4 py-3 rounded-xl flex items-center gap-2.5"
                    style={{
                      background:
                        applyFeedback.type === "success"
                          ? "rgba(74,222,128,0.10)"
                          : "rgba(248,113,113,0.10)",
                      border: `1px solid ${
                        applyFeedback.type === "success"
                          ? "rgba(74,222,128,0.25)"
                          : "rgba(248,113,113,0.25)"
                      }`,
                    }}
                  >
                    {applyFeedback.type === "success" ? (
                      <CheckCircle2
                        size={15}
                        style={{ color: C.green, flexShrink: 0 }}
                      />
                    ) : (
                      <AlertTriangle
                        size={15}
                        style={{ color: C.red, flexShrink: 0 }}
                      />
                    )}
                    <span
                      className="text-sm"
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        color:
                          applyFeedback.type === "success" ? C.green : C.red,
                      }}
                    >
                      {applyFeedback.text}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Actions footer */}
            <div
              className="px-6 py-4 flex gap-3"
              style={{ borderTop: `1px solid ${C.borderSubtle}` }}
            >
              <button
                onClick={() =>
                  applyMutation.mutate(selectedJob.id as string)
                }
                disabled={
                  applyMutation.isPending ||
                  selectedJob.status === "applied"
                }
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-50"
                style={{
                  background:
                    selectedJob.status === "applied"
                      ? "rgba(74,222,128,0.15)"
                      : C.accentBright,
                  color:
                    selectedJob.status === "applied"
                      ? C.green
                      : "#fff",
                  fontFamily: "'Inter', sans-serif",
                  boxShadow:
                    selectedJob.status !== "applied"
                      ? "0 0 20px rgba(124, 58, 237,0.30)"
                      : "none",
                }}
                onMouseEnter={(e) => {
                  if (selectedJob.status !== "applied") {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      C.accent;
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedJob.status !== "applied") {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      C.accentBright;
                  }
                }}
              >
                {applyMutation.isPending ? (
                  <>
                    <Zap size={15} className="animate-spin" />
                    Applying…
                  </>
                ) : selectedJob.status === "applied" ? (
                  <>
                    <CheckCircle2 size={15} />
                    Applied
                  </>
                ) : (
                  <>
                    <Zap size={15} />
                    Apply Now
                  </>
                )}
              </button>

              {/* Save to Pipeline button in footer */}
              <button
                onClick={() => pipelineMutation.mutate(selectedJob.id as string)}
                disabled={
                  pipelineMutation.isPending ||
                  savedJobIds.has(selectedJob.id as string)
                }
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-60"
                style={{
                  border: `1px solid ${savedJobIds.has(selectedJob.id as string) ? "rgba(52,211,153,0.25)" : C.borderMedium}`,
                  background: savedJobIds.has(selectedJob.id as string) ? "rgba(52,211,153,0.10)" : "transparent",
                  color: savedJobIds.has(selectedJob.id as string) ? C.green : C.textSecondary,
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                {savedJobIds.has(selectedJob.id as string) ? (
                  <><BookmarkCheck size={15} /> Saved</>
                ) : (
                  <><Bookmark size={15} /> Save</>
                )}
              </button>

              <button
                onClick={() => {
                  apiFetch(`/api/jobs/${selectedJob.id as string}/competitive-analysis`, { method: "POST" })
                    .then(() => queryClient.invalidateQueries({ queryKey: ["jobs"] }))
                    .catch(() => undefined);
                }}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all hover:bg-white/5"
                style={{ border: `1px solid ${C.borderSubtle}`, color: C.textMuted, fontFamily: "'Inter', sans-serif" }}
                title="Get competitive analysis"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
              </button>

              <button
                onClick={() =>
                  window.open(
                    `https://www.google.com/search?q=${encodeURIComponent(
                      selectedJob.company as string
                    )}`,
                    "_blank"
                  )
                }
                className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-white/5"
                style={{
                  border: `1px solid ${C.borderMedium}`,
                  color: C.textSecondary,
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                Company
              </button>
            </div>
          </div>
        ) : (
          <div
            className="flex-1 flex flex-col items-center justify-center gap-3 rounded-xl"
            style={{
              background: C.bgSurface,
              border: `1px solid ${C.borderSubtle}`,
            }}
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: C.accentMuted }}
            >
              <Briefcase size={22} style={{ color: C.accent }} />
            </div>
            <p
              className="text-sm"
              style={{ fontFamily: "'Inter', sans-serif", color: C.textSecondary }}
            >
              Select a job to view details
            </p>
          </div>
        )}
      </div>

      {/* ── RIGHT PANEL: MATCH ANALYSIS ───────────────────────────────────── */}
      {selectedJob && (
        <div className="w-[272px] flex-shrink-0">
          <div
            className="rounded-xl p-5 h-full"
            style={{
              background: C.bgSurface,
              border: `1px solid ${C.borderSubtle}`,
            }}
          >
            <p
              className="text-[11px] uppercase tracking-wider mb-4"
              style={{ fontFamily: "'Inter', sans-serif", color: C.textMuted }}
            >
              Match Analysis
            </p>

            {/* Score bar */}
            <div className="mb-6">
              <MatchBar score={(selectedJob.matchScore as number) || 0} />
            </div>

            {/* Skill breakdown */}
            <p
              className="text-[11px] uppercase tracking-wider mb-3"
              style={{ fontFamily: "'Inter', sans-serif", color: C.textMuted }}
            >
              Skill Breakdown
            </p>

            <div className="space-y-3">
              {(selectedJob.matchAnalysis as Array<Record<string, unknown>> | undefined)
                ?.length ? (
                (selectedJob.matchAnalysis as Array<Record<string, unknown>>).map(
                  (skill, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="flex-shrink-0">
                          {getMatchStatusIcon(skill.status as string)}
                        </span>
                        <span
                          className="text-[13px] truncate"
                          style={{
                            fontFamily: "'Inter', sans-serif",
                            color: C.textPrimary,
                          }}
                        >
                          {skill.skill as string}
                        </span>
                      </div>
                      <span
                        className="text-[11px] flex-shrink-0"
                        style={{
                          fontFamily: "monospace, monospace",
                          color: C.textSecondary,
                        }}
                      >
                        {skill.detail as string}
                      </span>
                    </div>
                  )
                )
              ) : (
                <p
                  className="text-[13px]"
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    color: C.textMuted,
                  }}
                >
                  No skill analysis available
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
