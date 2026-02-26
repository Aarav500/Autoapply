"use client";

import { motion } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import { Calendar, CheckCircle2, ExternalLink, Send, Sparkles, RefreshCw } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

export default function CommsPage() {
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState("All");
  const [replyText, setReplyText] = useState("");
  const [isGeneratingReply, setIsGeneratingReply] = useState(false);
  const [generateReplyError, setGenerateReplyError] = useState<string | null>(null);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const queryClient = useQueryClient();

  const handleEmailSync = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await apiFetch<{ data: Record<string, unknown> }>("/api/comms/email/sync", { method: "POST" });
      const inner = (res as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
      const count = (inner?.newEmails as number) || 0;
      queryClient.invalidateQueries({ queryKey: ["emailThreads"] });
      setSyncFeedback({ type: "success", text: count > 0 ? `Synced ${count} new email${count > 1 ? "s" : ""}` : "Inbox is up to date" });
      setTimeout(() => setSyncFeedback(null), 4000);
    } catch {
      setSyncFeedback({ type: "error", text: "Sync failed. Make sure Gmail is connected in Settings." });
      setTimeout(() => setSyncFeedback(null), 5000);
    } finally {
      setIsSyncing(false);
    }
  };

  // Fetch email threads
  const { data: threadsData, isLoading: threadsLoading, isError: threadsError } = useQuery({
    queryKey: ["emailThreads"],
    queryFn: () => apiFetch<{ data: any[] }>("/api/comms/email/threads"),
    retry: false,
  });

  // Fetch selected email
  const { data: emailData, isLoading: emailLoading } = useQuery({
    queryKey: ["email", selectedThreadId],
    queryFn: () => apiFetch<{ data: any }>(`/api/comms/email/${selectedThreadId}`),
    enabled: !!selectedThreadId,
    retry: false,
  });

  // Send reply mutation
  const replyMutation = useMutation({
    mutationFn: ({ emailId, body }: { emailId: string; body: string }) =>
      apiFetch("/api/comms/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inReplyTo: emailId, body }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emailThreads"] });
      queryClient.invalidateQueries({ queryKey: ["email", selectedThreadId] });
      setReplyText("");
    },
  });

  const threadsInner = (threadsData as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
  const threads: Record<string, unknown>[] = useMemo(
    () => (threadsInner?.threads as Record<string, unknown>[]) || [],
    [threadsInner]
  );
  const emailInner = (emailData as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
  const selectedEmail = (emailInner?.email || emailInner) as any;

  // Set first thread as selected by default
  useEffect(() => {
    if (!selectedThreadId && threads.length > 0) {
      setSelectedThreadId(threads[0].id as string);
    }
  }, [threads, selectedThreadId]);

  const filters = [
    { id: "All", label: "All", count: threads.length },
    { id: "Unread", label: "Unread", count: threads.filter((t: any) => t.unread).length },
    { id: "Interview", label: "Interviews", count: threads.filter((t: any) => t.category === "interview_invite").length },
    { id: "Action", label: "Action Required", count: threads.filter((t: any) => t.category === "action_required").length },
  ];

  const filteredThreads =
    activeFilter === "All"
      ? threads
      : activeFilter === "Unread"
      ? threads.filter((t: any) => t.unread)
      : threads.filter((t: any) =>
          activeFilter === "Interview"
            ? t.category === "interview_invite"
            : t.category === "action_required"
        );

  const getCategoryBadge = (category: string) => {
    const badges: Record<string, { color: string; label: string }> = {
      interview_invite: { color: "#00FFE0", label: "Interview" },
      rejection: { color: "#FF4757", label: "Rejection" },
      recruiter_outreach: { color: "#536DFE", label: "Recruiter" },
      follow_up: { color: "#FFAB00", label: "Follow-up" },
      offer: { color: "#00E676", label: "Offer" },
      action_required: { color: "#FFAB00", label: "Action" },
    };
    return badges[category] || { color: "#7E7E98", label: "Other" };
  };

  const handleGenerateReply = async () => {
    if (!selectedThreadId) return;
    setIsGeneratingReply(true);
    setGenerateReplyError(null);
    try {
      const response = await apiFetch<{ data: { reply: string } }>("/api/comms/email/generate-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailId: selectedThreadId }),
      });
      setReplyText(response.data.reply);
    } catch {
      setGenerateReplyError("Failed to generate reply. Please try again.");
    } finally {
      setIsGeneratingReply(false);
    }
  };

  const handleSendReply = () => {
    if (!selectedThreadId || !replyText.trim()) return;
    replyMutation.mutate({ emailId: selectedThreadId, body: replyText });
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

      {/* LEFT PANEL - EMAIL THREADS */}
      <div className="w-[360px] flex flex-col gap-4">
        {/* Sync Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleEmailSync}
            disabled={isSyncing}
            className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all hover:bg-white/5 disabled:opacity-50"
            style={{
              border: "1px solid rgba(255, 255, 255, 0.06)",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "13px",
              color: "#7E7E98",
            }}
          >
            <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
            {isSyncing ? "Syncing..." : "Sync Email"}
          </button>
          {syncFeedback && (
            <span
              className="text-[12px]"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                color: syncFeedback.type === "success" ? "#00E676" : "#FF4757",
              }}
            >
              {syncFeedback.text}
            </span>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className="flex-shrink-0 px-4 py-2 rounded-lg transition-all"
              style={{
                background: activeFilter === filter.id ? "rgba(0, 255, 224, 0.08)" : "transparent",
                border: `1px solid ${
                  activeFilter === filter.id ? "rgba(0, 255, 224, 0.2)" : "rgba(255, 255, 255, 0.06)"
                }`,
                fontFamily: "'Outfit', sans-serif",
                fontSize: "13px",
                fontWeight: 500,
                color: activeFilter === filter.id ? "#00FFE0" : "#7E7E98",
              }}
            >
              {filter.label} ({filter.count})
            </button>
          ))}
        </div>

        {/* Thread List */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {threadsError ? (
            <div
              className="p-4 rounded-lg"
              style={{
                background: "rgba(255, 71, 87, 0.08)",
                border: "1px solid rgba(255, 71, 87, 0.2)",
              }}
            >
              <p
                className="text-sm"
                style={{ fontFamily: "'DM Sans', sans-serif", color: "#FF4757" }}
              >
                Failed to load messages. Please try again later.
              </p>
            </div>
          ) : threadsLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="h-20 rounded-lg animate-pulse"
                  style={{ background: "rgba(255, 255, 255, 0.03)" }}
                />
              ))}
            </div>
          ) : filteredThreads.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[#7E7E98]">No messages</p>
              <p className="text-sm text-[#4A4A64] mt-2">Your inbox is empty</p>
            </div>
          ) : (
            filteredThreads.map((thread: any) => {
              const badge = getCategoryBadge(thread.category);
              return (
                <motion.div
                  key={thread.id}
                  onClick={() => setSelectedThreadId(thread.id)}
                  className="p-3 rounded-lg border cursor-pointer transition-all"
                  style={{
                    background:
                      selectedThreadId === thread.id
                        ? "rgba(0, 255, 224, 0.08)"
                        : "rgba(15, 15, 24, 0.7)",
                    backdropFilter: "blur(12px)",
                    borderColor:
                      selectedThreadId === thread.id
                        ? "rgba(0, 255, 224, 0.2)"
                        : "rgba(255, 255, 255, 0.04)",
                  }}
                  whileHover={{ scale: 1.01 }}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{
                        background: "linear-gradient(135deg, #00FFE0 0%, #00B8D4 100%)",
                      }}
                    >
                      <span
                        className="text-sm font-bold"
                        style={{ fontFamily: "'IBM Plex Mono', monospace", color: "#050508" }}
                      >
                        {thread.from?.charAt(0) || "?"}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3
                          className="text-[13px] font-semibold truncate"
                          style={{
                            fontFamily: "'Outfit', sans-serif",
                            color: thread.unread ? "#E8E8F0" : "#7E7E98",
                          }}
                        >
                          {thread.from || thread.company || "Unknown"}
                        </h3>
                        <span
                          className="text-[10px] flex-shrink-0 ml-2"
                          style={{ fontFamily: "'IBM Plex Mono', monospace", color: "#4A4A64" }}
                        >
                          {thread.receivedAt || thread.time || "Recent"}
                        </span>
                      </div>
                      <p
                        className="text-[12px] mb-1 truncate"
                        style={{
                          fontFamily: "'DM Sans', sans-serif",
                          color: thread.unread ? "#E8E8F0" : "#7E7E98",
                        }}
                      >
                        {thread.subject}
                      </p>
                      {thread.category && (
                        <span
                          className="inline-block px-2 py-0.5 rounded text-[10px]"
                          style={{
                            background: "rgba(255, 255, 255, 0.06)",
                            color: badge.color,
                            fontFamily: "'IBM Plex Mono', monospace",
                          }}
                        >
                          {badge.label}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT PANEL - EMAIL CONVERSATION */}
      <div className="flex-1 flex flex-col">
        {selectedEmail ? (
          <div
            className="flex-1 flex flex-col rounded-lg border overflow-hidden"
            style={{
              background: "rgba(15, 15, 24, 0.7)",
              backdropFilter: "blur(12px)",
              borderColor: "rgba(255, 255, 255, 0.04)",
            }}
          >
            {/* Email Header */}
            <div className="p-6 border-b" style={{ borderColor: "rgba(255, 255, 255, 0.04)" }}>
              <h2
                className="text-xl font-bold mb-2"
                style={{ fontFamily: "'Outfit', sans-serif", color: "#E8E8F0" }}
              >
                {selectedEmail.subject}
              </h2>
              <div className="flex items-center justify-between">
                <div>
                  <p
                    className="text-[13px] mb-1"
                    style={{ fontFamily: "'DM Sans', sans-serif", color: "#7E7E98" }}
                  >
                    From: {selectedEmail.from}
                  </p>
                  <p
                    className="text-[11px]"
                    style={{ fontFamily: "'IBM Plex Mono', monospace", color: "#4A4A64" }}
                  >
                    {selectedEmail.receivedAt || "Recently"}
                  </p>
                </div>
                {selectedEmail.category && (
                  <span
                    className="px-3 py-1 rounded-lg text-[11px]"
                    style={{
                      background: "rgba(255, 255, 255, 0.06)",
                      color: getCategoryBadge(selectedEmail.category).color,
                      fontFamily: "'IBM Plex Mono', monospace",
                    }}
                  >
                    {getCategoryBadge(selectedEmail.category).label}
                  </span>
                )}
              </div>
            </div>

            {/* Email Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {emailLoading ? (
                <div className="space-y-3">
                  <div className="h-4 bg-white/5 rounded w-3/4 animate-pulse" />
                  <div className="h-4 bg-white/5 rounded w-full animate-pulse" />
                  <div className="h-4 bg-white/5 rounded w-5/6 animate-pulse" />
                </div>
              ) : (
                <div
                  className="prose prose-invert max-w-none"
                  style={{ fontFamily: "'DM Sans', sans-serif", color: "#E8E8F0" }}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">
                    {selectedEmail.body || selectedEmail.textBody || "No content available"}
                  </p>
                </div>
              )}

              {/* AI Analysis */}
              {selectedEmail.analysis && (
                <div
                  className="mt-6 p-4 rounded-lg"
                  style={{
                    background: "rgba(0, 255, 224, 0.05)",
                    border: "1px solid rgba(0, 255, 224, 0.15)",
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={16} className="text-[#00FFE0]" />
                    <span
                      className="text-sm font-semibold"
                      style={{ fontFamily: "'Outfit', sans-serif", color: "#00FFE0" }}
                    >
                      AI Insights
                    </span>
                  </div>
                  <p
                    className="text-sm"
                    style={{ fontFamily: "'DM Sans', sans-serif", color: "#7E7E98" }}
                  >
                    {selectedEmail.analysis.summary || selectedEmail.analysis.actionItems?.[0] || "No insights available"}
                  </p>
                </div>
              )}
            </div>

            {/* Reply Section */}
            <div className="p-6 border-t" style={{ borderColor: "rgba(255, 255, 255, 0.04)" }}>
              <div className="flex items-center justify-between mb-3">
                <span
                  className="text-sm font-semibold"
                  style={{ fontFamily: "'Outfit', sans-serif", color: "#E8E8F0" }}
                >
                  Reply
                </span>
                <button
                  onClick={handleGenerateReply}
                  disabled={isGeneratingReply}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all hover:bg-white/5"
                  style={{
                    background: "rgba(0, 255, 224, 0.08)",
                    border: "1px solid rgba(0, 255, 224, 0.2)",
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "12px",
                    color: "#00FFE0",
                  }}
                >
                  <Sparkles size={14} />
                  {isGeneratingReply ? "Generating..." : "AI Generate"}
                </button>
              </div>
              {generateReplyError && (
                <div
                  className="p-3 rounded-lg mb-3"
                  style={{
                    background: "rgba(255, 71, 87, 0.08)",
                    border: "1px solid rgba(255, 71, 87, 0.2)",
                  }}
                >
                  <p
                    className="text-sm"
                    style={{ fontFamily: "'DM Sans', sans-serif", color: "#FF4757" }}
                  >
                    {generateReplyError}
                  </p>
                </div>
              )}
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your reply..."
                rows={4}
                className="w-full px-4 py-3 rounded-lg border bg-transparent outline-none resize-none mb-3"
                style={{
                  borderColor: "rgba(255, 255, 255, 0.08)",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "14px",
                  color: "#E8E8F0",
                }}
              />
              {replyMutation.isError && (
                <div
                  className="p-3 rounded-lg mb-3"
                  style={{
                    background: "rgba(255, 71, 87, 0.08)",
                    border: "1px solid rgba(255, 71, 87, 0.2)",
                  }}
                >
                  <p
                    className="text-sm"
                    style={{ fontFamily: "'DM Sans', sans-serif", color: "#FF4757" }}
                  >
                    Failed to send reply. Please try again.
                  </p>
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleSendReply}
                  disabled={replyMutation.isPending || !replyText.trim()}
                  className="flex-1 px-4 py-2.5 rounded-lg font-semibold transition-all disabled:opacity-50"
                  style={{
                    background: "#00FFE0",
                    color: "#050508",
                    fontFamily: "'Outfit', sans-serif",
                  }}
                >
                  <Send size={16} className="inline mr-2" />
                  {replyMutation.isPending ? "Sending..." : "Send Reply"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[#7E7E98]">
            Select a message to view conversation
          </div>
        )}
      </div>
    </div>
  );
}
