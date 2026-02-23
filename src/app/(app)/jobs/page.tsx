"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import {
  Search,
  Heart,
  Grid3x3,
  List,
  Filter,
  Check,
  AlertTriangle,
  X,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

export default function JobsPage() {
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const queryClient = useQueryClient();

  // Fetch jobs
  const { data: jobsData, isLoading: jobsLoading } = useQuery({
    queryKey: ["jobs", searchQuery],
    queryFn: () => apiFetch<{ data: any[] }>(`/api/jobs?${new URLSearchParams({ q: searchQuery })}`),
    retry: false,
  });

  const jobsInner = (jobsData as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
  const jobs: Record<string, unknown>[] = (jobsInner?.jobs as Record<string, unknown>[]) || [];
  const selectedJob: any = jobs.find((job: any) => job.id === selectedJobId) || jobs[0];

  // Set first job as selected by default
  useEffect(() => {
    if (!selectedJobId && jobs.length > 0) {
      setSelectedJobId(jobs[0].id as string);
    }
  }, [jobs, selectedJobId]);

  // Save job mutation
  const saveMutation = useMutation({
    mutationFn: (jobId: string) => apiFetch(`/api/jobs/${jobId}/save`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });

  // Apply mutation
  const applyMutation = useMutation({
    mutationFn: (jobId: string) => apiFetch(`/api/jobs/${jobId}/apply`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });

  const getMatchColor = (match: number) => {
    if (match >= 90) return "#00E676";
    if (match >= 75) return "#00FFE0";
    if (match >= 60) return "#FFAB00";
    return "#FF4757";
  };

  const getMatchStatusIcon = (status: string) => {
    switch (status) {
      case "match":
        return <Check size={14} className="text-[#00E676]" />;
      case "learning":
        return <AlertTriangle size={14} className="text-[#FFAB00]" />;
      case "missing":
        return <X size={14} className="text-[#FF4757]" />;
      default:
        return null;
    }
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

      {/* LEFT PANEL - JOB LIST */}
      <div className="w-[400px] flex flex-col gap-4">
        {/* Search & Filters */}
        <div className="flex gap-2">
          <div
            className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{
              background: "rgba(15, 15, 24, 0.7)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
            }}
          >
            <Search size={16} className="text-[#7E7E98]" />
            <input
              type="text"
              placeholder="Search jobs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm text-[#E8E8F0]"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            />
          </div>
          <button
            className="p-2 rounded-lg border transition-colors hover:bg-white/5"
            style={{ borderColor: "rgba(255, 255, 255, 0.06)" }}
          >
            <Filter size={16} className="text-[#7E7E98]" />
          </button>
          <button
            onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
            className="p-2 rounded-lg border transition-colors hover:bg-white/5"
            style={{ borderColor: "rgba(255, 255, 255, 0.06)" }}
          >
            {viewMode === "grid" ? (
              <List size={16} className="text-[#7E7E98]" />
            ) : (
              <Grid3x3 size={16} className="text-[#7E7E98]" />
            )}
          </button>
        </div>

        {/* Job Cards */}
        <div className="flex-1 overflow-y-auto space-y-3">
          {jobsLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="h-32 rounded-lg animate-pulse"
                  style={{ background: "rgba(255, 255, 255, 0.03)" }}
                />
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[#7E7E98]">No jobs found</p>
              <p className="text-sm text-[#4A4A64] mt-2">
                Try adjusting your search filters
              </p>
            </div>
          ) : (
            jobs.map((job: any) => (
              <motion.div
                key={job.id}
                onClick={() => setSelectedJobId(job.id)}
                className="p-4 rounded-lg border cursor-pointer transition-all"
                style={{
                  background:
                    selectedJobId === job.id
                      ? "rgba(0, 255, 224, 0.08)"
                      : "rgba(15, 15, 24, 0.7)",
                  backdropFilter: "blur(12px)",
                  borderColor:
                    selectedJobId === job.id
                      ? "rgba(0, 255, 224, 0.2)"
                      : "rgba(255, 255, 255, 0.04)",
                }}
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3
                      className="text-[15px] font-semibold mb-1"
                      style={{ fontFamily: "'Outfit', sans-serif", color: "#E8E8F0" }}
                    >
                      {job.title}
                    </h3>
                    <p
                      className="text-[13px] text-[#7E7E98]"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      {job.company}
                    </p>
                  </div>
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      background: `rgba(${getMatchColor(job.matchScore || 0)}, 0.1)`,
                      border: `2px solid ${getMatchColor(job.matchScore || 0)}`,
                    }}
                  >
                    <span
                      className="text-sm font-bold"
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        color: getMatchColor(job.matchScore || 0),
                      }}
                    >
                      {job.matchScore || 0}
                    </span>
                  </div>
                </div>
                <p
                  className="text-[12px] text-[#4A4A64] mb-2"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  {job.location} · {job.salary || "Salary not specified"}
                </p>
                <div className="flex items-center gap-2 mb-2">
                  {(job.tags || []).slice(0, 3).map((tag: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-2 py-1 rounded text-[10px]"
                      style={{
                        background: "rgba(0, 255, 224, 0.08)",
                        color: "#00FFE0",
                        fontFamily: "'IBM Plex Mono', monospace",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <p
                  className="text-[11px] text-[#4A4A64]"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  Posted {job.posted || job.createdAt || "recently"}
                </p>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* CENTER PANEL - JOB DETAILS */}
      <div className="flex-1 flex flex-col">
        {selectedJob ? (
          <div
            className="flex-1 p-6 rounded-lg border overflow-y-auto"
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
                  {selectedJob.title}
                </h2>
                <p
                  className="text-[15px] mb-1"
                  style={{ fontFamily: "'DM Sans', sans-serif", color: "#7E7E98" }}
                >
                  {selectedJob.company}
                </p>
                <p
                  className="text-[13px]"
                  style={{ fontFamily: "'DM Sans', sans-serif", color: "#4A4A64" }}
                >
                  {selectedJob.location} · {selectedJob.salary || "Salary not specified"}
                </p>
              </div>
              <button
                onClick={() => saveMutation.mutate(selectedJob.id)}
                className="p-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                <Heart
                  size={20}
                  className={selectedJob.saved ? "fill-[#FF4757] text-[#FF4757]" : "text-[#7E7E98]"}
                />
              </button>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-6">
              {(selectedJob.tags || []).map((tag: string, idx: number) => (
                <span
                  key={idx}
                  className="px-3 py-1.5 rounded-lg text-sm"
                  style={{
                    background: "rgba(0, 255, 224, 0.08)",
                    color: "#00FFE0",
                    fontFamily: "'IBM Plex Mono', monospace",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Description */}
            <div className="mb-6">
              <h3
                className="text-lg font-semibold mb-3"
                style={{ fontFamily: "'Outfit', sans-serif", color: "#E8E8F0" }}
              >
                About the Role
              </h3>
              <p
                className="text-sm leading-relaxed"
                style={{ fontFamily: "'DM Sans', sans-serif", color: "#7E7E98" }}
              >
                {selectedJob.description || "No description available."}
              </p>
            </div>

            {/* Requirements */}
            {selectedJob.requirements && selectedJob.requirements.length > 0 && (
              <div className="mb-6">
                <h3
                  className="text-lg font-semibold mb-3"
                  style={{ fontFamily: "'Outfit', sans-serif", color: "#E8E8F0" }}
                >
                  Requirements
                </h3>
                <ul className="space-y-2">
                  {selectedJob.requirements.map((req: string, idx: number) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 text-sm"
                      style={{ fontFamily: "'DM Sans', sans-serif", color: "#7E7E98" }}
                    >
                      <span className="text-[#00FFE0] mt-1">•</span>
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t" style={{ borderColor: "rgba(255, 255, 255, 0.04)" }}>
              <button
                onClick={() => applyMutation.mutate(selectedJob.id)}
                disabled={applyMutation.isPending || selectedJob.status === "applied"}
                className="flex-1 px-4 py-3 rounded-lg font-semibold transition-all disabled:opacity-50"
                style={{
                  background: selectedJob.status === "applied" ? "rgba(0, 230, 118, 0.2)" : "#00FFE0",
                  color: selectedJob.status === "applied" ? "#00E676" : "#050508",
                  fontFamily: "'Outfit', sans-serif",
                }}
              >
                {applyMutation.isPending
                  ? "Applying..."
                  : selectedJob.status === "applied"
                  ? "✓ Applied"
                  : "Apply Now"}
              </button>
              <button
                onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(selectedJob.company)}`, '_blank')}
                className="px-4 py-3 rounded-lg font-semibold transition-all border hover:bg-white/5"
                style={{
                  borderColor: "rgba(255, 255, 255, 0.08)",
                  color: "#7E7E98",
                  fontFamily: "'Outfit', sans-serif",
                }}
              >
                View Company
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[#7E7E98]">
            Select a job to view details
          </div>
        )}
      </div>

      {/* RIGHT PANEL - MATCH ANALYSIS */}
      {selectedJob && (
        <div className="w-[300px]">
          <div
            className="p-6 rounded-lg border"
            style={{
              background: "rgba(15, 15, 24, 0.7)",
              backdropFilter: "blur(12px)",
              borderColor: "rgba(255, 255, 255, 0.04)",
            }}
          >
            <h3
              className="text-lg font-semibold mb-4"
              style={{ fontFamily: "'Outfit', sans-serif", color: "#E8E8F0" }}
            >
              Match Analysis
            </h3>

            {/* Match Score */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[#7E7E98]">Overall Match</span>
                <span
                  className="text-2xl font-bold"
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    color: getMatchColor(selectedJob.matchScore || 0),
                  }}
                >
                  {selectedJob.matchScore || 0}%
                </span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${selectedJob.matchScore || 0}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{ background: getMatchColor(selectedJob.matchScore || 0) }}
                />
              </div>
            </div>

            {/* Skill Breakdown */}
            <div className="space-y-3">
              <h4
                className="text-sm font-semibold mb-3"
                style={{ fontFamily: "'Outfit', sans-serif", color: "#E8E8F0" }}
              >
                Skill Breakdown
              </h4>
              {selectedJob.matchAnalysis && selectedJob.matchAnalysis.length > 0 ? (
                selectedJob.matchAnalysis.map((skill: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getMatchStatusIcon(skill.status)}
                      <span
                        className="text-sm"
                        style={{ fontFamily: "'DM Sans', sans-serif", color: "#E8E8F0" }}
                      >
                        {skill.skill}
                      </span>
                    </div>
                    <span
                      className="text-xs"
                      style={{ fontFamily: "'IBM Plex Mono', monospace", color: "#7E7E98" }}
                    >
                      {skill.detail}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[#7E7E98]">No skill analysis available</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
