"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Video,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Lightbulb,
  Send,
  Mail,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

interface Section {
  id: string;
  title: string;
  count?: number;
  isExpanded: boolean;
}

interface FeedbackMessage {
  type: "success" | "error";
  text: string;
}

export default function InterviewPrepPage() {
  const [activeTab, setActiveTab] = useState("prep");
  const [feedbackMessage, setFeedbackMessage] = useState<FeedbackMessage | null>(null);
  const [sections, setSections] = useState<Section[]>([
    { id: "company", title: "Company Research", isExpanded: true },
    { id: "behavioral", title: "Behavioral Questions", count: 10, isExpanded: false },
    { id: "technical", title: "Technical Questions", count: 7, isExpanded: false },
    { id: "questions", title: "Questions to Ask Them", count: 5, isExpanded: false },
  ]);

  const queryClient = useQueryClient();

  const showFeedback = (type: "success" | "error", text: string) => {
    setFeedbackMessage({ type, text });
    setTimeout(() => setFeedbackMessage(null), 5000);
  };

  const { data: interviewsData, isLoading: interviewsLoading, isError: interviewsError } = useQuery({
    queryKey: ["upcomingInterviews"],
    queryFn: () => apiFetch<{ data: any[] }>("/api/interview?status=scheduled"),
    retry: false,
  });

  const interviewsInner = (interviewsData as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
  const interviews: Record<string, unknown>[] = (interviewsInner?.interviews as Record<string, unknown>[]) || [];
  const nextInterview: any = interviews[0];

  // Fetch prep package for next interview
  const { data: prepData, isLoading: prepLoading } = useQuery({
    queryKey: ["interviewPrep", nextInterview?.id],
    queryFn: () => apiFetch<{ data: any }>(`/api/interview/${nextInterview.id}/prep`),
    enabled: !!nextInterview,
    retry: false,
  });

  const prepInner = (prepData as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
  const prep: any = prepInner;

  // Countdown timer
  const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    if (!nextInterview?.scheduledAt) return;

    const timer = setInterval(() => {
      try {
        const now = new Date().getTime();
        const target = new Date(nextInterview.scheduledAt).getTime();
        if (isNaN(target)) return;
        const diff = target - now;

        if (diff > 0) {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
          setCountdown({ hours, minutes, seconds });
        } else {
          setCountdown({ hours: 0, minutes: 0, seconds: 0 });
        }
      } catch {
        setCountdown({ hours: 0, minutes: 0, seconds: 0 });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [nextInterview]);

  const toggleSection = (id: string) => {
    setSections((prev) =>
      prev.map((section) =>
        section.id === id ? { ...section, isExpanded: !section.isExpanded } : section
      )
    );
  };

  const formatTime = (num: number) => String(num).padStart(2, "0");

  return (
    <div className="w-full">
      {/* Background texture */}
      <div
        className="fixed inset-0 opacity-[0.015] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {feedbackMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="mb-4 px-4 py-3 rounded-lg text-sm font-medium"
          style={{
            background: feedbackMessage.type === "success" ? "rgba(0, 255, 224, 0.1)" : "rgba(255, 71, 87, 0.1)",
            border: `1px solid ${feedbackMessage.type === "success" ? "rgba(0, 255, 224, 0.3)" : "rgba(255, 71, 87, 0.3)"}`,
            color: feedbackMessage.type === "success" ? "#00FFE0" : "#FF4757",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {feedbackMessage.text}
        </motion.div>
      )}

      {interviewsError ? (
        <div className="text-center py-20">
          <AlertTriangle size={64} className="mx-auto mb-4" style={{ color: "#FF4757" }} />
          <h2
            className="text-2xl font-bold mb-2"
            style={{ fontFamily: "'Outfit', sans-serif", color: "#E8E8F0" }}
          >
            Failed to Load Interviews
          </h2>
          <p
            className="text-sm"
            style={{ fontFamily: "'DM Sans', sans-serif", color: "#7E7E98" }}
          >
            Could not fetch your interviews. Please try refreshing the page.
          </p>
        </div>
      ) : nextInterview ? (
        <>
          {/* HERO CARD - Next Interview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative rounded-2xl p-8 mb-8"
            style={{
              background: "linear-gradient(135deg, rgba(0, 255, 224, 0.1) 0%, rgba(83, 109, 254, 0.05) 100%)",
              border: "1px solid rgba(0, 255, 224, 0.2)",
            }}
          >
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <span
                  className="inline-block px-3 py-1 rounded-full mb-3 text-[11px]"
                  style={{
                    background: "rgba(0, 255, 224, 0.15)",
                    color: "#00FFE0",
                    fontFamily: "'IBM Plex Mono', monospace",
                  }}
                >
                  NEXT INTERVIEW
                </span>
                <h2
                  className="text-3xl font-bold mb-2"
                  style={{ fontFamily: "'Outfit', sans-serif", color: "#E8E8F0" }}
                >
                  {nextInterview.role || "Interview"}
                </h2>
                <p
                  className="text-lg mb-1"
                  style={{ fontFamily: "'DM Sans', sans-serif", color: "#7E7E98" }}
                >
                  {nextInterview.company}
                </p>
                <p
                  className="text-sm"
                  style={{ fontFamily: "'IBM Plex Mono', monospace", color: "#4A4A64" }}
                >
                  {(() => { try { return new Date(nextInterview.scheduledAt).toLocaleString(); } catch { return "Date unavailable"; } })()} · {nextInterview.type || "Video Call"}
                </p>
              </div>

              {/* Countdown Timer */}
              <div
                className="flex gap-3 px-6 py-4 rounded-xl"
                style={{
                  background: "rgba(15, 15, 24, 0.8)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                <div className="text-center">
                  <div
                    className="text-4xl font-bold"
                    style={{ fontFamily: "'IBM Plex Mono', monospace", color: "#00FFE0" }}
                  >
                    {formatTime(countdown.hours)}
                  </div>
                  <div
                    className="text-[10px] uppercase mt-1"
                    style={{ fontFamily: "'Outfit', sans-serif", color: "#7E7E98" }}
                  >
                    Hours
                  </div>
                </div>
                <div
                  className="text-4xl font-bold self-center"
                  style={{ fontFamily: "'IBM Plex Mono', monospace", color: "#4A4A64" }}
                >
                  :
                </div>
                <div className="text-center">
                  <div
                    className="text-4xl font-bold"
                    style={{ fontFamily: "'IBM Plex Mono', monospace", color: "#00FFE0" }}
                  >
                    {formatTime(countdown.minutes)}
                  </div>
                  <div
                    className="text-[10px] uppercase mt-1"
                    style={{ fontFamily: "'Outfit', sans-serif", color: "#7E7E98" }}
                  >
                    Minutes
                  </div>
                </div>
                <div
                  className="text-4xl font-bold self-center"
                  style={{ fontFamily: "'IBM Plex Mono', monospace", color: "#4A4A64" }}
                >
                  :
                </div>
                <div className="text-center">
                  <div
                    className="text-4xl font-bold"
                    style={{ fontFamily: "'IBM Plex Mono', monospace", color: "#00FFE0" }}
                  >
                    {formatTime(countdown.seconds)}
                  </div>
                  <div
                    className="text-[10px] uppercase mt-1"
                    style={{ fontFamily: "'Outfit', sans-serif", color: "#7E7E98" }}
                  >
                    Seconds
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (nextInterview.meetingLink) {
                    window.open(nextInterview.meetingLink, '_blank');
                  } else {
                    showFeedback("error", "No meeting link available yet. Check your email for the interview link.");
                  }
                }}
                className="px-5 py-2.5 rounded-lg font-semibold transition-all"
                style={{
                  background: "#00FFE0",
                  color: "#050508",
                  fontFamily: "'Outfit', sans-serif",
                }}
              >
                <Video size={16} className="inline mr-2" />
                Join Interview
              </button>
              <button
                className="px-5 py-2.5 rounded-lg font-semibold border transition-all hover:bg-white/5"
                style={{
                  borderColor: "rgba(255, 255, 255, 0.08)",
                  color: "#E8E8F0",
                  fontFamily: "'Outfit', sans-serif",
                }}
                onClick={() => setActiveTab("mock")}
              >
                <MessageSquare size={16} className="inline mr-2" />
                Practice Mock Interview
              </button>
            </div>
          </motion.div>

          {/* TAB BAR */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="border-b mb-6"
            style={{ borderColor: "rgba(255, 255, 255, 0.04)" }}
          >
            <div className="flex gap-8">
              {[
                { id: "prep", label: "Prep Materials" },
                { id: "mock", label: "Mock Interview" },
                { id: "follow-up", label: "Post-Interview" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="relative pb-3 transition-all"
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: "14px",
                    fontWeight: 500,
                    color: activeTab === tab.id ? "#E8E8F0" : "#7E7E98",
                  }}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="activeInterviewTab"
                      className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#00FFE0]"
                    />
                  )}
                </button>
              ))}
            </div>
          </motion.div>

          {/* TAB CONTENT */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* PREP TAB */}
            {activeTab === "prep" && (
              <div className="space-y-4">
                {prepLoading ? (
                  <div className="space-y-4">
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        className="h-24 rounded-lg animate-pulse"
                        style={{ background: "rgba(255, 255, 255, 0.03)" }}
                      />
                    ))}
                  </div>
                ) : (
                  sections.map((section) => (
                    <div
                      key={section.id}
                      className="rounded-lg border overflow-hidden"
                      style={{
                        background: "rgba(15, 15, 24, 0.7)",
                        backdropFilter: "blur(12px)",
                        borderColor: "rgba(255, 255, 255, 0.04)",
                      }}
                    >
                      {/* Section Header */}
                      <button
                        onClick={() => toggleSection(section.id)}
                        className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <BookOpen size={20} className="text-[#00FFE0]" />
                          <h3
                            className="text-lg font-semibold"
                            style={{ fontFamily: "'Outfit', sans-serif", color: "#E8E8F0" }}
                          >
                            {section.title}
                          </h3>
                          {section.count && (
                            <span
                              className="px-2 py-0.5 rounded-full text-[11px]"
                              style={{
                                background: "rgba(0, 255, 224, 0.1)",
                                color: "#00FFE0",
                                fontFamily: "'IBM Plex Mono', monospace",
                              }}
                            >
                              {section.count}
                            </span>
                          )}
                        </div>
                        {section.isExpanded ? (
                          <ChevronDown size={20} className="text-[#7E7E98]" />
                        ) : (
                          <ChevronRight size={20} className="text-[#7E7E98]" />
                        )}
                      </button>

                      {/* Section Content */}
                      {section.isExpanded && (
                        <div className="px-6 pb-6">
                          {section.id === "company" && prep?.companyResearch && (
                            <div className="space-y-4">
                              <div>
                                <h4 className="text-sm font-semibold mb-2 text-[#E8E8F0]">Overview</h4>
                                <p className="text-sm text-[#7E7E98] leading-relaxed">
                                  {prep.companyResearch.overview}
                                </p>
                              </div>
                              {prep.companyResearch.keyProducts && (
                                <div>
                                  <h4 className="text-sm font-semibold mb-2 text-[#E8E8F0]">Key Products</h4>
                                  <ul className="space-y-1">
                                    {prep.companyResearch.keyProducts.map((product: string, idx: number) => (
                                      <li key={idx} className="text-sm text-[#7E7E98] flex items-start gap-2">
                                        <span className="text-[#00FFE0]">•</span>
                                        <span>{product}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}

                          {section.id === "behavioral" && prep?.questions && (
                            <div className="space-y-3">
                              {prep.questions
                                .filter((q: any) => q.type === "behavioral")
                                .slice(0, 10)
                                .map((question: any, idx: number) => (
                                  <div
                                    key={idx}
                                    className="p-4 rounded-lg"
                                    style={{
                                      background: "rgba(255, 255, 255, 0.02)",
                                      border: "1px solid rgba(255, 255, 255, 0.04)",
                                    }}
                                  >
                                    <p className="text-sm text-[#E8E8F0] mb-2">{question.question}</p>
                                    {question.starAnswer && (
                                      <p className="text-xs text-[#7E7E98]">
                                        <span className="text-[#00FFE0]">STAR:</span> {question.starAnswer.situation}
                                      </p>
                                    )}
                                  </div>
                                ))}
                            </div>
                          )}

                          {!prep && (
                            <p className="text-sm text-[#7E7E98]">Generating prep materials...</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* MOCK INTERVIEW TAB */}
            {activeTab === "mock" && (
              <MockInterviewTab interviewId={nextInterview?.id} showFeedback={showFeedback} />
            )}

            {/* POST-INTERVIEW TAB */}
            {activeTab === "follow-up" && (
              <PostInterviewTab interviewId={nextInterview?.id} showFeedback={showFeedback} />
            )}
          </motion.div>
        </>
      ) : (
        <div className="text-center py-20">
          <Video size={64} className="mx-auto mb-4 text-[#4A4A64]" />
          <h2 className="text-2xl font-bold mb-2 text-[#E8E8F0]">No Upcoming Interviews</h2>
          <p className="text-[#7E7E98]">Schedule an interview to access prep materials</p>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   MOCK INTERVIEW TAB — Conversational Q&A with AI feedback
   ============================================================ */
function MockInterviewTab({ interviewId, showFeedback }: { interviewId?: string; showFeedback: (type: "success" | "error", text: string) => void }) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{ role: "interviewer" | "candidate"; text: string; score?: number; feedback?: string }>>([]);
  const [answer, setAnswer] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [assessment, setAssessment] = useState<Record<string, unknown> | null>(null);

  const startMock = async (mode: "behavioral" | "technical") => {
    if (!interviewId) return;
    setIsStarting(true);
    try {
      const res = await apiFetch<Record<string, unknown>>(`/api/interview/${interviewId}/mock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const inner = (res as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
      const sid = (inner?.sessionId as string) || "";
      const firstQ = (inner?.question as string) || (inner?.message as string) || "Tell me about yourself.";
      setSessionId(sid);
      setMessages([{ role: "interviewer", text: firstQ }]);
      setAssessment(null);
    } catch {
      showFeedback("error", "Failed to start mock interview.");
    } finally {
      setIsStarting(false);
    }
  };

  const sendAnswer = async () => {
    if (!interviewId || !sessionId || !answer.trim()) return;
    setIsSending(true);
    setMessages((prev) => [...prev, { role: "candidate", text: answer }]);
    const currentAnswer = answer;
    setAnswer("");
    try {
      const res = await apiFetch<Record<string, unknown>>(`/api/interview/${interviewId}/mock/${sessionId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer: currentAnswer }),
      });
      const inner = (res as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
      const score = inner?.score as number | undefined;
      const fb = inner?.feedback as string | undefined;
      const nextQ = inner?.nextQuestion as string | undefined;
      const overall = inner?.overallAssessment as Record<string, unknown> | undefined;

      // Add feedback for the answer
      if (fb) {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { ...updated[updated.length - 1], score, feedback: fb };
          return updated;
        });
      }

      // Add next question or show assessment
      if (overall) {
        setAssessment(overall);
      } else if (nextQ) {
        setMessages((prev) => [...prev, { role: "interviewer", text: nextQ }]);
      }
    } catch {
      showFeedback("error", "Failed to send answer. Try again.");
    } finally {
      setIsSending(false);
    }
  };

  // Not started yet
  if (!sessionId) {
    return (
      <div className="text-center py-12">
        <MessageSquare size={48} className="mx-auto mb-4 text-[#00FFE0]" />
        <h3 className="text-xl font-semibold mb-2 text-[#E8E8F0]" style={{ fontFamily: "'Outfit', sans-serif" }}>Mock Interview Simulator</h3>
        <p className="text-sm text-[#7E7E98] mb-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          Practice with an AI interviewer and get real-time scoring and feedback
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => startMock("behavioral")}
            disabled={isStarting}
            className="px-5 py-2.5 rounded-lg font-semibold transition-all disabled:opacity-50"
            style={{ background: "#00FFE0", color: "#050508", fontFamily: "'Outfit', sans-serif" }}
          >
            {isStarting ? "Starting..." : "Start Behavioral Mock"}
          </button>
          <button
            onClick={() => startMock("technical")}
            disabled={isStarting}
            className="px-5 py-2.5 rounded-lg font-semibold border transition-all hover:bg-white/5 disabled:opacity-50"
            style={{ borderColor: "rgba(255, 255, 255, 0.08)", color: "#E8E8F0", fontFamily: "'Outfit', sans-serif" }}
          >
            {isStarting ? "Starting..." : "Start Technical Mock"}
          </button>
        </div>
      </div>
    );
  }

  // Active session
  return (
    <div className="flex flex-col" style={{ minHeight: "400px" }}>
      {/* Conversation */}
      <div className="flex-1 space-y-4 mb-4 max-h-[500px] overflow-y-auto">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === "candidate" ? "justify-end" : "justify-start"}`}>
            <div
              className="max-w-[80%] p-4 rounded-lg"
              style={{
                background: msg.role === "interviewer" ? "rgba(0, 255, 224, 0.06)" : "rgba(83, 109, 254, 0.08)",
                border: `1px solid ${msg.role === "interviewer" ? "rgba(0, 255, 224, 0.15)" : "rgba(83, 109, 254, 0.15)"}`,
              }}
            >
              <span className="text-[10px] uppercase font-semibold block mb-1" style={{
                fontFamily: "'IBM Plex Mono', monospace",
                color: msg.role === "interviewer" ? "#00FFE0" : "#536DFE",
              }}>
                {msg.role === "interviewer" ? "Interviewer" : "You"}
              </span>
              <p className="text-sm leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif", color: "#E8E8F0" }}>
                {msg.text}
              </p>
              {msg.score !== undefined && (
                <div className="mt-2 pt-2 border-t" style={{ borderColor: "rgba(255, 255, 255, 0.06)" }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] text-[#7E7E98]">Score:</span>
                    <span className="text-sm font-bold" style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      color: msg.score >= 7 ? "#00E676" : msg.score >= 5 ? "#FFAB00" : "#FF4757",
                    }}>
                      {msg.score}/10
                    </span>
                  </div>
                  {msg.feedback && (
                    <p className="text-[12px] text-[#7E7E98]" style={{ fontFamily: "'DM Sans', sans-serif" }}>{msg.feedback}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {isSending && (
          <div className="flex justify-start">
            <div className="px-4 py-3 rounded-lg" style={{ background: "rgba(0, 255, 224, 0.06)", border: "1px solid rgba(0, 255, 224, 0.15)" }}>
              <span className="text-sm text-[#7E7E98] animate-pulse">AI is evaluating...</span>
            </div>
          </div>
        )}
      </div>

      {/* Overall Assessment */}
      {assessment && (
        <div className="mb-4 p-5 rounded-lg" style={{ background: "rgba(0, 230, 118, 0.06)", border: "1px solid rgba(0, 230, 118, 0.2)" }}>
          <h4 className="text-sm font-semibold mb-2 text-[#00E676]" style={{ fontFamily: "'Outfit', sans-serif" }}>Overall Assessment</h4>
          <p className="text-sm text-[#7E7E98] mb-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>{assessment.summary as string}</p>
          {(assessment.strengths as string[])?.length > 0 && (
            <div className="mb-1"><span className="text-[11px] text-[#00E676]">Strengths:</span> <span className="text-[12px] text-[#7E7E98]">{(assessment.strengths as string[]).join(", ")}</span></div>
          )}
          {(assessment.improvements as string[])?.length > 0 && (
            <div><span className="text-[11px] text-[#FFAB00]">Improve:</span> <span className="text-[12px] text-[#7E7E98]">{(assessment.improvements as string[]).join(", ")}</span></div>
          )}
          <button
            onClick={() => { setSessionId(null); setMessages([]); setAssessment(null); }}
            className="mt-3 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:bg-white/5"
            style={{ border: "1px solid rgba(255, 255, 255, 0.08)", color: "#7E7E98", fontFamily: "'Outfit', sans-serif" }}
          >
            Start New Mock
          </button>
        </div>
      )}

      {/* Answer Input */}
      {!assessment && (
        <div className="flex gap-2">
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendAnswer(); } }}
            placeholder="Type your answer... (Enter to send, Shift+Enter for newline)"
            rows={3}
            className="flex-1 px-4 py-3 rounded-lg border bg-transparent outline-none resize-none"
            style={{ borderColor: "rgba(255, 255, 255, 0.08)", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: "#E8E8F0" }}
          />
          <button
            onClick={sendAnswer}
            disabled={isSending || !answer.trim()}
            className="self-end px-4 py-3 rounded-lg font-semibold transition-all disabled:opacity-50"
            style={{ background: "#00FFE0", color: "#050508", fontFamily: "'Outfit', sans-serif" }}
          >
            <Send size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   POST-INTERVIEW TAB — Generate + Send thank-you email
   ============================================================ */
function PostInterviewTab({ interviewId, showFeedback }: { interviewId?: string; showFeedback: (type: "success" | "error", text: string) => void }) {
  const [thankYouDraft, setThankYouDraft] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const generateThankYou = async () => {
    if (!interviewId) return;
    setIsGenerating(true);
    try {
      const res = await apiFetch<Record<string, unknown>>(`/api/interview/${interviewId}/thank-you`, { method: "POST" });
      const inner = (res as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
      const draft = (inner?.draft as string) || (inner?.body as string) || (inner?.email as string) || "";
      setThankYouDraft(draft || "Thank you for taking the time to interview me...");
    } catch {
      showFeedback("error", "Failed to generate thank-you email.");
    } finally {
      setIsGenerating(false);
    }
  };

  const sendThankYou = async () => {
    if (!interviewId || !thankYouDraft) return;
    setIsSending(true);
    try {
      await apiFetch(`/api/interview/${interviewId}/thank-you`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: thankYouDraft }),
      });
      showFeedback("success", "Thank-you email sent successfully!");
      setThankYouDraft(null);
    } catch {
      showFeedback("error", "Failed to send. Make sure Gmail is connected in Settings.");
    } finally {
      setIsSending(false);
    }
  };

  if (!thankYouDraft && !isGenerating) {
    return (
      <div className="text-center py-12">
        <Mail size={48} className="mx-auto mb-4 text-[#00E676]" />
        <h3 className="text-xl font-semibold mb-2 text-[#E8E8F0]" style={{ fontFamily: "'Outfit', sans-serif" }}>Post-Interview Actions</h3>
        <p className="text-sm text-[#7E7E98] mb-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          Generate and send a professional thank-you email
        </p>
        <button
          onClick={generateThankYou}
          className="px-5 py-2.5 rounded-lg font-semibold transition-all"
          style={{ background: "#00FFE0", color: "#050508", fontFamily: "'Outfit', sans-serif" }}
        >
          Generate Thank You Email
        </button>
      </div>
    );
  }

  if (isGenerating) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-4" style={{ borderColor: "rgba(0, 230, 118, 0.3)", borderTopColor: "transparent" }} />
        <p className="text-sm text-[#7E7E98]" style={{ fontFamily: "'DM Sans', sans-serif" }}>Generating thank-you email...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ fontFamily: "'Outfit', sans-serif", color: "#E8E8F0" }}>Thank-You Email Draft</h3>
        <span className="text-[11px] text-[#4A4A64]">Edit before sending</span>
      </div>
      <textarea
        value={thankYouDraft || ""}
        onChange={(e) => setThankYouDraft(e.target.value)}
        rows={10}
        className="w-full px-4 py-3 rounded-lg border bg-transparent outline-none resize-none"
        style={{ borderColor: "rgba(255, 255, 255, 0.08)", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: "#E8E8F0" }}
      />
      <div className="flex gap-3">
        <button
          onClick={sendThankYou}
          disabled={isSending || !thankYouDraft?.trim()}
          className="flex-1 px-4 py-3 rounded-lg font-semibold transition-all disabled:opacity-50"
          style={{ background: "#00E676", color: "#050508", fontFamily: "'Outfit', sans-serif" }}
        >
          <Send size={16} className="inline mr-2" />
          {isSending ? "Sending..." : "Send via Gmail"}
        </button>
        <button
          onClick={generateThankYou}
          disabled={isGenerating}
          className="px-4 py-3 rounded-lg font-semibold border transition-all hover:bg-white/5"
          style={{ borderColor: "rgba(255, 255, 255, 0.08)", color: "#7E7E98", fontFamily: "'Outfit', sans-serif" }}
        >
          Regenerate
        </button>
      </div>
    </div>
  );
}
