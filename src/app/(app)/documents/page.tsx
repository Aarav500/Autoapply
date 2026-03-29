"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import { FileText, Download, Plus, AlertCircle, X, CheckCircle2, ChevronDown, ShieldCheck, ChevronUp, History, ExternalLink, Loader2, Clock } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

export default function DocumentsPage() {
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("all");
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateType, setGenerateType] = useState<"cv" | "cover-letter">("cv");
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateSuccess, setGenerateSuccess] = useState<string | null>(null);
  const [atsResult, setAtsResult] = useState<{ score: number; improvements: Array<{ priority: string; category: string; suggestion: string }> } | null>(null);
  const [atsExpanded, setAtsExpanded] = useState(false);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [versionName, setVersionName] = useState("");
  const [versionTargetRole, setVersionTargetRole] = useState("");
  const [versionTargetIndustry, setVersionTargetIndustry] = useState("");
  const [versionJobDescription, setVersionJobDescription] = useState("");
  const [versionError, setVersionError] = useState<string | null>(null);
  const [isCreatingVersion, setIsCreatingVersion] = useState(false);
  const [showVersions, setShowVersions] = useState(false);

  const queryClient = useQueryClient();

  // Fetch jobs for targeting
  const { data: jobsData } = useQuery({
    queryKey: ["jobs-for-docs"],
    queryFn: () => apiFetch<{ data: Record<string, unknown> }>("/api/jobs?status=saved"),
    retry: false,
  });
  const jobsInner = (jobsData as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
  const availableJobs: Record<string, unknown>[] = (jobsInner?.jobs as Record<string, unknown>[]) || [];

  // Fetch documents
  const { data: documentsData, isLoading, isError: isQueryError, error: queryError } = useQuery({
    queryKey: ["documents"],
    queryFn: () => apiFetch<{ data: any[] }>("/api/documents"),
    retry: false,
  });

  // ATS check mutation
  const atsMutation = useMutation({
    mutationFn: (documentId: string) =>
      apiFetch<{ data: { atsResult: { score: number }; improvements: Array<{ priority: string; category: string; suggestion: string }> } }>("/api/documents/ats-check", {
        method: "POST",
        body: JSON.stringify({ documentId }),
      }),
    onSuccess: (data) => {
      const d = (data as { data: { atsResult: { score: number }; improvements: Array<{ priority: string; category: string; suggestion: string }> } }).data;
      setAtsResult({ score: d.atsResult.score, improvements: d.improvements });
      setAtsExpanded(true);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/documents/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      setSelectedDocId(null);
    },
  });

  // CV Versions
  interface CVVersion { id: string; name: string; description: string; targetRole?: string; atsScore?: number; createdAt: string; downloadUrl?: string | null; }
  const { data: versionsData, refetch: refetchVersions } = useQuery({
    queryKey: ["cvVersions"],
    queryFn: () => apiFetch<{ data: { versions: CVVersion[] } }>("/api/documents/versions"),
    retry: false,
  });
  const cvVersions: CVVersion[] =
    ((versionsData as Record<string, unknown>)?.data as Record<string, unknown>)?.versions as CVVersion[] || [];

  const handleCreateVersion = async () => {
    if (!versionName.trim()) { setVersionError("Name is required"); return; }
    setIsCreatingVersion(true);
    setVersionError(null);
    try {
      await apiFetch("/api/documents/versions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create-version",
          name: versionName.trim(),
          description: "",
          targetRole: versionTargetRole.trim() || undefined,
          targetIndustry: versionTargetIndustry.trim() || undefined,
          jobDescription: versionJobDescription.trim() || undefined,
        }),
      });
      refetchVersions();
      setShowVersionModal(false);
      setVersionName(""); setVersionTargetRole(""); setVersionTargetIndustry(""); setVersionJobDescription("");
    } catch (err) {
      setVersionError(err instanceof Error ? err.message : "Failed to create version");
    } finally {
      setIsCreatingVersion(false);
    }
  };

  const docsInner = (documentsData as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
  const documents: Record<string, unknown>[] = useMemo(
    () => (docsInner?.documents as Record<string, unknown>[]) || [],
    [docsInner]
  );
  const selectedDocument: any = documents.find((doc) => doc.id === selectedDocId) || documents[0];

  // Set first document as selected by default
  useEffect(() => {
    if (!selectedDocId && documents.length > 0) {
      setSelectedDocId(documents[0].id as string);
    }
  }, [documents, selectedDocId]);

  const categories = [
    { id: "all", label: "All", count: documents.length },
    { id: "cvs", label: "CVs", count: documents.filter((d: any) => d.type === "cv").length },
    { id: "cover-letters", label: "Cover Letters", count: documents.filter((d: any) => d.type === "cover-letter").length },
    { id: "other", label: "Other", count: documents.filter((d: any) => d.type === "other").length },
  ];

  const filteredDocuments = activeCategory === "all"
    ? documents
    : documents.filter((d: any) => {
        if (activeCategory === "cvs") return d.type === "cv";
        if (activeCategory === "cover-letters") return d.type === "cover-letter";
        if (activeCategory === "other") return d.type === "other";
        return true;
      });

  const getATSScoreColor = (score: number) => {
    if (score >= 90) return "#34D399";
    if (score >= 75) return "#8B5CF6";
    if (score >= 60) return "#FBBF24";
    return "#F87171";
  };

  return (
    <div className="w-full h-[calc(100vh-120px)] flex gap-4">
      {/* Background texture */}
      <div
        className="fixed inset-0 opacity-[0.015] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* LEFT PANEL - DOCUMENT LIBRARY */}
      <div className="w-[360px] flex flex-col gap-4">
        {/* Category Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className="flex-shrink-0 px-4 py-2 rounded-lg transition-all"
              style={{
                background: activeCategory === cat.id ? "rgba(124, 58, 237, 0.08)" : "transparent",
                border: `1px solid ${activeCategory === cat.id ? "rgba(124, 58, 237, 0.2)" : "rgba(255, 255, 255, 0.06)"}`,
                fontFamily: "'Inter', sans-serif",
                fontSize: "13px",
                fontWeight: 500,
                color: activeCategory === cat.id ? "#8B5CF6" : "#9090B8",
              }}
            >
              {cat.label} ({cat.count})
            </button>
          ))}
        </div>

        {/* Generate Button */}
        <button
          onClick={() => { setShowGenerateModal(true); setGenerateError(null); setGenerateSuccess(null); }}
          className="w-full px-4 py-3 rounded-lg font-semibold transition-all"
          style={{
            background: "#8B5CF6",
            color: "#050508",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          <Plus size={16} className="inline mr-2" />
          Generate Document
        </button>

        {generateSuccess && (
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{
              background: "rgba(74, 222, 128, 0.08)",
              border: "1px solid rgba(74, 222, 128, 0.2)",
            }}
          >
            <CheckCircle2 size={14} style={{ color: "#34D399", flexShrink: 0 }} />
            <span className="text-[12px]" style={{ fontFamily: "'Inter', sans-serif", color: "#34D399" }}>
              {generateSuccess}
            </span>
          </div>
        )}

        {/* Generate Modal */}
        {showGenerateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowGenerateModal(false)}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative w-full max-w-md rounded-xl p-6"
              style={{ background: "#111120", border: "1px solid rgba(255, 255, 255, 0.08)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold" style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}>Generate Document</h3>
                <button onClick={() => setShowGenerateModal(false)} className="p-1 hover:bg-white/5 rounded-lg"><X size={20} className="text-[#9090B8]" /></button>
              </div>

              {/* Document Type */}
              <div className="mb-4">
                <label className="block text-[12px] mb-2" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>Document Type</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setGenerateType("cv")}
                    className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
                    style={{
                      background: generateType === "cv" ? "rgba(124, 58, 237, 0.1)" : "rgba(255, 255, 255, 0.04)",
                      border: `1px solid ${generateType === "cv" ? "rgba(124, 58, 237, 0.3)" : "rgba(255, 255, 255, 0.08)"}`,
                      color: generateType === "cv" ? "#8B5CF6" : "#9090B8",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    CV / Resume
                  </button>
                  <button
                    onClick={() => setGenerateType("cover-letter")}
                    className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
                    style={{
                      background: generateType === "cover-letter" ? "rgba(124, 58, 237, 0.1)" : "rgba(255, 255, 255, 0.04)",
                      border: `1px solid ${generateType === "cover-letter" ? "rgba(124, 58, 237, 0.3)" : "rgba(255, 255, 255, 0.08)"}`,
                      color: generateType === "cover-letter" ? "#8B5CF6" : "#9090B8",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    Cover Letter
                  </button>
                </div>
              </div>

              {/* Job Selection */}
              <div className="mb-6">
                <label className="block text-[12px] mb-2" style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}>
                  Tailor for a specific job (optional)
                </label>
                <select
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-transparent outline-none text-sm appearance-none cursor-pointer"
                  style={{
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    fontFamily: "'Inter', sans-serif",
                    color: selectedJobId ? "#F0F0FF" : "#9090B8",
                    background: "rgba(255, 255, 255, 0.04)",
                  }}
                >
                  <option value="" style={{ background: "#111120" }}>General (no specific job)</option>
                  {availableJobs.map((job: Record<string, unknown>) => (
                    <option key={job.id as string} value={job.id as string} style={{ background: "#111120" }}>
                      {job.title as string} at {job.company as string}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] mt-1" style={{ fontFamily: "'Inter', sans-serif", color: "#3A3A60" }}>
                  {generateType === "cover-letter" && !selectedJobId ? "Selecting a job is recommended for cover letters" : "Tailored documents score higher on ATS systems"}
                </p>
              </div>

              {generateError && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg mb-4" style={{ background: "rgba(255, 71, 87, 0.08)", border: "1px solid rgba(255, 71, 87, 0.2)" }}>
                  <AlertCircle size={14} style={{ color: "#F87171", flexShrink: 0 }} />
                  <span className="text-[12px]" style={{ fontFamily: "'Inter', sans-serif", color: "#F87171" }}>{generateError}</span>
                </div>
              )}

              <button
                onClick={async () => {
                  setIsGenerating(true);
                  setGenerateError(null);
                  try {
                    const endpoint = generateType === "cv" ? "/api/documents/cv/generate" : "/api/documents/cover-letter/generate";
                    const body: Record<string, string> = {};
                    if (selectedJobId) body.jobId = selectedJobId;
                    await apiFetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
                    queryClient.invalidateQueries({ queryKey: ["documents"] });
                    setShowGenerateModal(false);
                    setGenerateSuccess(`${generateType === "cv" ? "CV" : "Cover letter"} generated successfully!`);
                    setTimeout(() => setGenerateSuccess(null), 5000);
                  } catch (err) {
                    setGenerateError(err instanceof Error ? err.message : "Failed to generate document");
                  } finally {
                    setIsGenerating(false);
                  }
                }}
                disabled={isGenerating}
                className="w-full px-4 py-3 rounded-lg font-semibold transition-all disabled:opacity-50"
                style={{ background: "#8B5CF6", color: "#050508", fontFamily: "'Inter', sans-serif" }}
              >
                {isGenerating ? "Generating..." : `Generate ${generateType === "cv" ? "CV" : "Cover Letter"}`}
              </button>
            </motion.div>
          </div>
        )}

        {generateError && (
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{
              background: "rgba(255, 71, 87, 0.08)",
              border: "1px solid rgba(255, 71, 87, 0.2)",
            }}
          >
            <AlertCircle size={14} style={{ color: "#F87171", flexShrink: 0 }} />
            <span
              className="text-[12px]"
              style={{ fontFamily: "'Inter', sans-serif", color: "#F87171" }}
            >
              {generateError}
            </span>
          </div>
        )}

        {deleteMutation.isError && (
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{
              background: "rgba(255, 71, 87, 0.08)",
              border: "1px solid rgba(255, 71, 87, 0.2)",
            }}
          >
            <AlertCircle size={14} style={{ color: "#F87171", flexShrink: 0 }} />
            <span
              className="text-[12px]"
              style={{ fontFamily: "'Inter', sans-serif", color: "#F87171" }}
            >
              {deleteMutation.error instanceof Error ? deleteMutation.error.message : "Failed to delete document"}
            </span>
          </div>
        )}

        {/* Document List */}
        <div className="flex-1 overflow-y-auto space-y-3">
          {isQueryError ? (
            <div className="text-center py-12">
              <AlertCircle size={48} className="mx-auto mb-4" style={{ color: "#F87171" }} />
              <p
                className="text-[14px] font-semibold mb-2"
                style={{ fontFamily: "'Inter', sans-serif", color: "#F87171" }}
              >
                Failed to load documents
              </p>
              <p
                className="text-[12px]"
                style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
              >
                {queryError instanceof Error ? queryError.message : "An unexpected error occurred"}
              </p>
            </div>
          ) : isLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="h-24 rounded-lg animate-pulse"
                  style={{ background: "rgba(255, 255, 255, 0.03)" }}
                />
              ))}
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-12">
              <FileText size={48} className="mx-auto mb-4 text-[#3A3A60]" />
              <p className="text-[#9090B8]">No documents yet</p>
              <p className="text-sm text-[#3A3A60] mt-2">
                Generate your first CV or cover letter
              </p>
            </div>
          ) : (
            filteredDocuments.map((doc: any) => (
              <motion.div
                key={doc.id}
                onClick={() => setSelectedDocId(doc.id)}
                className="p-4 rounded-lg border cursor-pointer transition-all"
                style={{
                  background:
                    selectedDocId === doc.id
                      ? "rgba(124, 58, 237, 0.08)"
                      : "rgba(11, 11, 20, 0.7)",
                  backdropFilter: "blur(12px)",
                  borderColor:
                    selectedDocId === doc.id
                      ? "rgba(124, 58, 237, 0.2)"
                      : "rgba(255, 255, 255, 0.04)",
                }}
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex items-start gap-3">
                  <FileText size={20} className="text-[#8B5CF6] flex-shrink-0 mt-1" />
                  <div className="flex-1 min-w-0">
                    <h3
                      className="text-[14px] font-semibold mb-1 truncate"
                      style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
                    >
                      {doc.title || doc.name}
                    </h3>
                    <p
                      className="text-[12px] text-[#9090B8] mb-2"
                      style={{ fontFamily: "'Inter', sans-serif" }}
                    >
                      {doc.template || doc.type} · Generated {doc.createdAt || "recently"}
                    </p>
                    {/* CV Freshness indicator */}
                    {doc.createdAt && (() => {
                      const daysSince = Math.floor((Date.now() - new Date(doc.createdAt).getTime()) / 86_400_000);
                      const isStale = daysSince >= 30;
                      const isOld = daysSince >= 14;
                      if (!isOld) return null;
                      return (
                        <div
                          className="flex items-center gap-1 mb-2"
                          style={{
                            display: "inline-flex",
                            padding: "2px 7px",
                            borderRadius: 20,
                            background: isStale ? "rgba(248,113,113,0.10)" : "rgba(251,191,36,0.10)",
                            border: `1px solid ${isStale ? "rgba(248,113,113,0.25)" : "rgba(251,191,36,0.25)"}`,
                          }}
                        >
                          <Clock size={9} color={isStale ? "#F87171" : "#FBBF24"} />
                          <span style={{ fontSize: 10, color: isStale ? "#F87171" : "#FBBF24", fontFamily: "'Inter', sans-serif", marginLeft: 3 }}>
                            {daysSince}d old{isStale ? " — consider refreshing" : ""}
                          </span>
                        </div>
                      );
                    })()}
                    {doc.atsScore !== undefined && (
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-[#9090B8]">ATS Score:</span>
                        <span
                          className="text-[11px] font-bold"
                          style={{
                            fontFamily: "monospace, monospace",
                            color: getATSScoreColor(doc.atsScore),
                          }}
                        >
                          {doc.atsScore}/100
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
        {/* CV Versions section */}
        <div className="mt-4 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <button
            onClick={() => setShowVersions(!showVersions)}
            className="flex items-center justify-between w-full mb-2 hover:opacity-80 transition-opacity"
          >
            <div className="flex items-center gap-2">
              <History size={13} style={{ color: "#8B5CF6" }} />
              <span className="text-[12px] font-semibold" style={{ color: "#9090B8" }}>Named CV Versions</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(139,92,246,0.15)", color: "#8B5CF6" }}>{cvVersions.length}</span>
            </div>
            {showVersions ? <ChevronUp size={13} style={{ color: "#5A5A80" }} /> : <ChevronDown size={13} style={{ color: "#5A5A80" }} />}
          </button>

          <AnimatePresence>
            {showVersions && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <button
                  onClick={() => { setShowVersionModal(true); setVersionError(null); }}
                  className="w-full mb-2 px-3 py-2 rounded-lg text-[12px] font-semibold transition-all hover:bg-white/5"
                  style={{ border: "1px dashed rgba(139,92,246,0.3)", color: "#8B5CF6" }}
                >
                  + Save Current CV as Version
                </button>
                {cvVersions.length === 0 ? (
                  <p className="text-[11px] text-center py-3" style={{ color: "#3A3A60" }}>No versions yet</p>
                ) : (
                  <div className="space-y-1.5">
                    {cvVersions.map((v) => (
                      <div key={v.id} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                        <div className="min-w-0 flex-1">
                          <p className="text-[12px] font-medium truncate" style={{ color: "#F0F0FF" }}>{v.name}</p>
                          {v.targetRole && <p className="text-[10px] truncate" style={{ color: "#5A5A80" }}>{v.targetRole}</p>}
                        </div>
                        <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                          {v.atsScore !== undefined && (
                            <span className="text-[10px] font-semibold" style={{ color: v.atsScore >= 75 ? "#34D399" : v.atsScore >= 60 ? "#FBBF24" : "#F87171", fontFamily: "monospace" }}>{v.atsScore}%</span>
                          )}
                          {v.downloadUrl && (
                            <a href={v.downloadUrl} download target="_blank" rel="noopener noreferrer" className="p-1 rounded hover:bg-white/5 transition-all" title="Download">
                              <ExternalLink size={11} style={{ color: "#5A5A80" }} />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Create Version Modal */}
      {showVersionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowVersionModal(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full max-w-md rounded-xl p-6"
            style={{ background: "#111120", border: "1px solid rgba(255, 255, 255, 0.08)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[16px] font-semibold" style={{ color: "#F0F0FF" }}>Save CV Version</h3>
              <button onClick={() => setShowVersionModal(false)} className="p-1 hover:bg-white/5 rounded-lg"><X size={18} className="text-[#9090B8]" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[12px] mb-1.5" style={{ color: "#9090B8" }}>Version Name *</label>
                <input value={versionName} onChange={(e) => setVersionName(e.target.value)} placeholder="e.g. ML Engineer - Google 2026" className="w-full px-3 py-2.5 rounded-lg bg-transparent outline-none text-[13px]" style={{ border: "1px solid rgba(255,255,255,0.08)", color: "#F0F0FF" }} />
              </div>
              <div>
                <label className="block text-[12px] mb-1.5" style={{ color: "#9090B8" }}>Target Role (optional)</label>
                <input value={versionTargetRole} onChange={(e) => setVersionTargetRole(e.target.value)} placeholder="e.g. Senior ML Engineer" className="w-full px-3 py-2.5 rounded-lg bg-transparent outline-none text-[13px]" style={{ border: "1px solid rgba(255,255,255,0.08)", color: "#F0F0FF" }} />
              </div>
              <div>
                <label className="block text-[12px] mb-1.5" style={{ color: "#9090B8" }}>Target Industry (optional)</label>
                <input value={versionTargetIndustry} onChange={(e) => setVersionTargetIndustry(e.target.value)} placeholder="e.g. AI / Machine Learning" className="w-full px-3 py-2.5 rounded-lg bg-transparent outline-none text-[13px]" style={{ border: "1px solid rgba(255,255,255,0.08)", color: "#F0F0FF" }} />
              </div>
              <div>
                <label className="block text-[12px] mb-1.5" style={{ color: "#9090B8" }}>Job Description (optional — improves ATS tailoring)</label>
                <textarea value={versionJobDescription} onChange={(e) => setVersionJobDescription(e.target.value)} placeholder="Paste the job description to get an ATS-tailored version..." rows={3} className="w-full px-3 py-2.5 rounded-lg bg-transparent outline-none text-[13px] resize-none" style={{ border: "1px solid rgba(255,255,255,0.08)", color: "#F0F0FF" }} />
              </div>
              {versionError && <p className="text-[12px]" style={{ color: "#F87171" }}>{versionError}</p>}
              <button
                onClick={handleCreateVersion}
                disabled={isCreatingVersion}
                className="w-full py-2.5 rounded-lg font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: "#8B5CF6", color: "#050508" }}
              >
                {isCreatingVersion ? <><Loader2 size={14} className="animate-spin" /> Generating…</> : "Generate & Save Version"}
              </button>
              <p className="text-[11px] text-center" style={{ color: "#3A3A60" }}>AI will tailor your CV to the role and compute an ATS score</p>
            </div>
          </motion.div>
        </div>
      )}

      {/* RIGHT PANEL - DOCUMENT PREVIEW */}
      <div className="flex-1">
        {selectedDocument ? (
          <div
            className="h-full p-6 rounded-lg border overflow-y-auto"
            style={{
              background: "rgba(11, 11, 20, 0.7)",
              backdropFilter: "blur(12px)",
              borderColor: "rgba(255, 255, 255, 0.04)",
            }}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <h2
                  className="text-2xl font-bold mb-2"
                  style={{ fontFamily: "'Inter', sans-serif", color: "#F0F0FF" }}
                >
                  {selectedDocument.title || selectedDocument.name}
                </h2>
                <p
                  className="text-[13px]"
                  style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
                >
                  {selectedDocument.template || selectedDocument.type} · Generated {selectedDocument.createdAt || "recently"}
                </p>
              </div>
              {selectedDocument.atsScore !== undefined && (
                <div
                  className="px-4 py-2 rounded-lg"
                  style={{
                    background: "rgba(255, 255, 255, 0.04)",
                    border: `1px solid ${getATSScoreColor(selectedDocument.atsScore)}`,
                  }}
                >
                  <div className="text-center">
                    <span
                      className="text-2xl font-bold block"
                      style={{
                        fontFamily: "monospace, monospace",
                        color: getATSScoreColor(selectedDocument.atsScore),
                      }}
                    >
                      {selectedDocument.atsScore}
                    </span>
                    <span className="text-[10px] text-[#9090B8]">ATS Score</span>
                  </div>
                </div>
              )}
            </div>

            {/* Document Preview */}
            <div
              className="mb-6 p-6 rounded-lg"
              style={{
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.04)",
              }}
            >
              <p
                className="text-sm leading-relaxed whitespace-pre-wrap"
                style={{ fontFamily: "'Inter', sans-serif", color: "#9090B8" }}
              >
                {selectedDocument.content || "Document preview not available. Download to view full content."}
              </p>
            </div>

            {/* ATS Check Results */}
            <AnimatePresence>
              {atsResult && atsExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4 rounded-lg overflow-hidden"
                  style={{ border: "1px solid rgba(139,92,246,0.2)", background: "rgba(139,92,246,0.05)" }}
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <ShieldCheck size={14} style={{ color: "#8B5CF6" }} />
                        <span className="text-[13px] font-semibold" style={{ color: "#F0F0FF", fontFamily: "'Inter', sans-serif" }}>ATS Analysis</span>
                        <span className="text-[13px] font-bold" style={{ color: getATSScoreColor(atsResult.score), fontFamily: "monospace, monospace" }}>{atsResult.score}/100</span>
                      </div>
                      <button onClick={() => setAtsExpanded(false)}><X size={14} style={{ color: "#9090B8" }} /></button>
                    </div>
                    {atsResult.improvements.length > 0 && (
                      <div className="space-y-2">
                        {atsResult.improvements.map((imp, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <span className="text-[10px] px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5 font-semibold uppercase" style={{
                              background: imp.priority === "high" ? "rgba(248,113,113,0.12)" : imp.priority === "medium" ? "rgba(251,191,36,0.12)" : "rgba(139,92,246,0.12)",
                              color: imp.priority === "high" ? "#F87171" : imp.priority === "medium" ? "#FBBF24" : "#8B5CF6",
                            }}>{imp.priority}</span>
                            <div>
                              <span className="text-[11px] font-semibold" style={{ color: "#9090B8", fontFamily: "'Inter', sans-serif" }}>{imp.category}: </span>
                              <span className="text-[11px]" style={{ color: "#6060A0", fontFamily: "'Inter', sans-serif" }}>{imp.suggestion}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t" style={{ borderColor: "rgba(255, 255, 255, 0.04)" }}>
              <a
                href={selectedDocument.pdfUrl || selectedDocument.downloadUrl || "#"}
                download
                className="flex-1 px-4 py-3 rounded-lg font-semibold text-center transition-all"
                style={{
                  background: "#8B5CF6",
                  color: "#050508",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                <Download size={16} className="inline mr-2" />
                Download PDF
              </a>
              <button
                onClick={() => {
                  setAtsResult(null);
                  atsMutation.mutate(selectedDocument.id);
                }}
                disabled={atsMutation.isPending}
                className="px-4 py-3 rounded-lg font-semibold border hover:bg-white/5 transition-all disabled:opacity-50 inline-flex items-center gap-1.5"
                style={{
                  borderColor: "rgba(139,92,246,0.3)",
                  color: "#8B5CF6",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                <ShieldCheck size={14} />
                {atsMutation.isPending ? "Checking…" : atsResult ? `${atsResult.score}% ATS` : "Check ATS"}
                {atsResult && <ChevronDown size={12} onClick={(e) => { e.stopPropagation(); setAtsExpanded(!atsExpanded); }} />}
              </button>
              {selectedDocument.docxUrl && (
                <a
                  href={selectedDocument.docxUrl}
                  download
                  className="px-4 py-3 rounded-lg font-semibold border hover:bg-white/5 transition-all"
                  style={{
                    borderColor: "rgba(255, 255, 255, 0.08)",
                    color: "#9090B8",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  DOCX
                </a>
              )}
              <button
                onClick={() => {
                  if (confirm("Are you sure you want to delete this document?")) {
                    deleteMutation.mutate(selectedDocument.id);
                  }
                }}
                className="px-4 py-3 rounded-lg font-semibold border hover:bg-white/5 transition-all"
                style={{
                  borderColor: "rgba(255, 71, 87, 0.2)",
                  color: "#F87171",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                Delete
              </button>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-[#9090B8]">
            Select a document to preview
          </div>
        )}
      </div>
    </div>
  );
}
