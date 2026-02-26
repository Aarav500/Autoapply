"use client";

import { motion } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import { FileText, Download, Plus, AlertCircle, X, CheckCircle2, ChevronDown } from "lucide-react";
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

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/documents/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      setSelectedDocId(null);
    },
  });

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
    if (score >= 90) return "#00E676";
    if (score >= 75) return "#00FFE0";
    if (score >= 60) return "#FFAB00";
    return "#FF4757";
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
                background: activeCategory === cat.id ? "rgba(0, 255, 224, 0.08)" : "transparent",
                border: `1px solid ${activeCategory === cat.id ? "rgba(0, 255, 224, 0.2)" : "rgba(255, 255, 255, 0.06)"}`,
                fontFamily: "'Outfit', sans-serif",
                fontSize: "13px",
                fontWeight: 500,
                color: activeCategory === cat.id ? "#00FFE0" : "#7E7E98",
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
            background: "#00FFE0",
            color: "#050508",
            fontFamily: "'Outfit', sans-serif",
          }}
        >
          <Plus size={16} className="inline mr-2" />
          Generate Document
        </button>

        {generateSuccess && (
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{
              background: "rgba(0, 230, 118, 0.08)",
              border: "1px solid rgba(0, 230, 118, 0.2)",
            }}
          >
            <CheckCircle2 size={14} style={{ color: "#00E676", flexShrink: 0 }} />
            <span className="text-[12px]" style={{ fontFamily: "'DM Sans', sans-serif", color: "#00E676" }}>
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
              style={{ background: "#12121C", border: "1px solid rgba(255, 255, 255, 0.08)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold" style={{ fontFamily: "'Outfit', sans-serif", color: "#E8E8F0" }}>Generate Document</h3>
                <button onClick={() => setShowGenerateModal(false)} className="p-1 hover:bg-white/5 rounded-lg"><X size={20} className="text-[#7E7E98]" /></button>
              </div>

              {/* Document Type */}
              <div className="mb-4">
                <label className="block text-[12px] mb-2" style={{ fontFamily: "'DM Sans', sans-serif", color: "#7E7E98" }}>Document Type</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setGenerateType("cv")}
                    className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
                    style={{
                      background: generateType === "cv" ? "rgba(0, 255, 224, 0.1)" : "rgba(255, 255, 255, 0.04)",
                      border: `1px solid ${generateType === "cv" ? "rgba(0, 255, 224, 0.3)" : "rgba(255, 255, 255, 0.08)"}`,
                      color: generateType === "cv" ? "#00FFE0" : "#7E7E98",
                      fontFamily: "'Outfit', sans-serif",
                    }}
                  >
                    CV / Resume
                  </button>
                  <button
                    onClick={() => setGenerateType("cover-letter")}
                    className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
                    style={{
                      background: generateType === "cover-letter" ? "rgba(0, 255, 224, 0.1)" : "rgba(255, 255, 255, 0.04)",
                      border: `1px solid ${generateType === "cover-letter" ? "rgba(0, 255, 224, 0.3)" : "rgba(255, 255, 255, 0.08)"}`,
                      color: generateType === "cover-letter" ? "#00FFE0" : "#7E7E98",
                      fontFamily: "'Outfit', sans-serif",
                    }}
                  >
                    Cover Letter
                  </button>
                </div>
              </div>

              {/* Job Selection */}
              <div className="mb-6">
                <label className="block text-[12px] mb-2" style={{ fontFamily: "'DM Sans', sans-serif", color: "#7E7E98" }}>
                  Tailor for a specific job (optional)
                </label>
                <select
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-transparent outline-none text-sm appearance-none cursor-pointer"
                  style={{
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    fontFamily: "'DM Sans', sans-serif",
                    color: selectedJobId ? "#E8E8F0" : "#7E7E98",
                    background: "rgba(255, 255, 255, 0.04)",
                  }}
                >
                  <option value="" style={{ background: "#12121C" }}>General (no specific job)</option>
                  {availableJobs.map((job: Record<string, unknown>) => (
                    <option key={job.id as string} value={job.id as string} style={{ background: "#12121C" }}>
                      {job.title as string} at {job.company as string}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] mt-1" style={{ fontFamily: "'DM Sans', sans-serif", color: "#4A4A64" }}>
                  {generateType === "cover-letter" && !selectedJobId ? "Selecting a job is recommended for cover letters" : "Tailored documents score higher on ATS systems"}
                </p>
              </div>

              {generateError && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg mb-4" style={{ background: "rgba(255, 71, 87, 0.08)", border: "1px solid rgba(255, 71, 87, 0.2)" }}>
                  <AlertCircle size={14} style={{ color: "#FF4757", flexShrink: 0 }} />
                  <span className="text-[12px]" style={{ fontFamily: "'DM Sans', sans-serif", color: "#FF4757" }}>{generateError}</span>
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
                style={{ background: "#00FFE0", color: "#050508", fontFamily: "'Outfit', sans-serif" }}
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
            <AlertCircle size={14} style={{ color: "#FF4757", flexShrink: 0 }} />
            <span
              className="text-[12px]"
              style={{ fontFamily: "'DM Sans', sans-serif", color: "#FF4757" }}
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
            <AlertCircle size={14} style={{ color: "#FF4757", flexShrink: 0 }} />
            <span
              className="text-[12px]"
              style={{ fontFamily: "'DM Sans', sans-serif", color: "#FF4757" }}
            >
              {deleteMutation.error instanceof Error ? deleteMutation.error.message : "Failed to delete document"}
            </span>
          </div>
        )}

        {/* Document List */}
        <div className="flex-1 overflow-y-auto space-y-3">
          {isQueryError ? (
            <div className="text-center py-12">
              <AlertCircle size={48} className="mx-auto mb-4" style={{ color: "#FF4757" }} />
              <p
                className="text-[14px] font-semibold mb-2"
                style={{ fontFamily: "'Outfit', sans-serif", color: "#FF4757" }}
              >
                Failed to load documents
              </p>
              <p
                className="text-[12px]"
                style={{ fontFamily: "'DM Sans', sans-serif", color: "#7E7E98" }}
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
              <FileText size={48} className="mx-auto mb-4 text-[#4A4A64]" />
              <p className="text-[#7E7E98]">No documents yet</p>
              <p className="text-sm text-[#4A4A64] mt-2">
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
                      ? "rgba(0, 255, 224, 0.08)"
                      : "rgba(15, 15, 24, 0.7)",
                  backdropFilter: "blur(12px)",
                  borderColor:
                    selectedDocId === doc.id
                      ? "rgba(0, 255, 224, 0.2)"
                      : "rgba(255, 255, 255, 0.04)",
                }}
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex items-start gap-3">
                  <FileText size={20} className="text-[#00FFE0] flex-shrink-0 mt-1" />
                  <div className="flex-1 min-w-0">
                    <h3
                      className="text-[14px] font-semibold mb-1 truncate"
                      style={{ fontFamily: "'Outfit', sans-serif", color: "#E8E8F0" }}
                    >
                      {doc.title || doc.name}
                    </h3>
                    <p
                      className="text-[12px] text-[#7E7E98] mb-2"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      {doc.template || doc.type} · Generated {doc.createdAt || "recently"}
                    </p>
                    {doc.atsScore !== undefined && (
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-[#7E7E98]">ATS Score:</span>
                        <span
                          className="text-[11px] font-bold"
                          style={{
                            fontFamily: "'IBM Plex Mono', monospace",
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
      </div>

      {/* RIGHT PANEL - DOCUMENT PREVIEW */}
      <div className="flex-1">
        {selectedDocument ? (
          <div
            className="h-full p-6 rounded-lg border overflow-y-auto"
            style={{
              background: "rgba(15, 15, 24, 0.7)",
              backdropFilter: "blur(12px)",
              borderColor: "rgba(255, 255, 255, 0.04)",
            }}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <h2
                  className="text-2xl font-bold mb-2"
                  style={{ fontFamily: "'Outfit', sans-serif", color: "#E8E8F0" }}
                >
                  {selectedDocument.title || selectedDocument.name}
                </h2>
                <p
                  className="text-[13px]"
                  style={{ fontFamily: "'DM Sans', sans-serif", color: "#7E7E98" }}
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
                        fontFamily: "'IBM Plex Mono', monospace",
                        color: getATSScoreColor(selectedDocument.atsScore),
                      }}
                    >
                      {selectedDocument.atsScore}
                    </span>
                    <span className="text-[10px] text-[#7E7E98]">ATS Score</span>
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
                style={{ fontFamily: "'DM Sans', sans-serif", color: "#7E7E98" }}
              >
                {selectedDocument.content || "Document preview not available. Download to view full content."}
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t" style={{ borderColor: "rgba(255, 255, 255, 0.04)" }}>
              <a
                href={selectedDocument.pdfUrl || selectedDocument.downloadUrl || "#"}
                download
                className="flex-1 px-4 py-3 rounded-lg font-semibold text-center transition-all"
                style={{
                  background: "#00FFE0",
                  color: "#050508",
                  fontFamily: "'Outfit', sans-serif",
                }}
              >
                <Download size={16} className="inline mr-2" />
                Download PDF
              </a>
              {selectedDocument.docxUrl && (
                <a
                  href={selectedDocument.docxUrl}
                  download
                  className="px-4 py-3 rounded-lg font-semibold border hover:bg-white/5 transition-all"
                  style={{
                    borderColor: "rgba(255, 255, 255, 0.08)",
                    color: "#7E7E98",
                    fontFamily: "'Outfit', sans-serif",
                  }}
                >
                  Download DOCX
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
                  color: "#FF4757",
                  fontFamily: "'Outfit', sans-serif",
                }}
              >
                Delete
              </button>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-[#7E7E98]">
            Select a document to preview
          </div>
        )}
      </div>
    </div>
  );
}
