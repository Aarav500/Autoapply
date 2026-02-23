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
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

interface Section {
  id: string;
  title: string;
  count?: number;
  isExpanded: boolean;
}

export default function InterviewPrepPage() {
  const [activeTab, setActiveTab] = useState("prep");
  const [sections, setSections] = useState<Section[]>([
    { id: "company", title: "Company Research", isExpanded: true },
    { id: "behavioral", title: "Behavioral Questions", count: 10, isExpanded: false },
    { id: "technical", title: "Technical Questions", count: 7, isExpanded: false },
    { id: "questions", title: "Questions to Ask Them", count: 5, isExpanded: false },
  ]);

  const queryClient = useQueryClient();

  // Fetch interviews
  const { data: interviewsData, isLoading: interviewsLoading } = useQuery({
    queryKey: ["upcomingInterviews"],
    queryFn: () => apiFetch<{ data: any[] }>("/api/interview?status=scheduled"),
    retry: false,
  });

  const interviews = interviewsData?.data || [];
  const nextInterview = interviews[0];

  // Fetch prep package for next interview
  const { data: prepData, isLoading: prepLoading } = useQuery({
    queryKey: ["interviewPrep", nextInterview?.id],
    queryFn: () => apiFetch<{ data: any }>(`/api/interview/${nextInterview.id}/prep`),
    enabled: !!nextInterview,
    retry: false,
  });

  const prep = prepData?.data;

  // Countdown timer
  const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    if (!nextInterview?.scheduledAt) return;

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const target = new Date(nextInterview.scheduledAt).getTime();
      const diff = target - now;

      if (diff > 0) {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setCountdown({ hours, minutes, seconds });
      } else {
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

      {nextInterview ? (
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
                  {new Date(nextInterview.scheduledAt).toLocaleString()} · {nextInterview.type || "Video Call"}
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
                    alert('No meeting link available yet. Check your email for the interview link.');
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
              <div className="text-center py-12">
                <MessageSquare size={48} className="mx-auto mb-4 text-[#00FFE0]" />
                <h3 className="text-xl font-semibold mb-2 text-[#E8E8F0]">Mock Interview Simulator</h3>
                <p className="text-sm text-[#7E7E98] mb-6">
                  Practice with AI interviewer and get real-time feedback
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={async () => {
                      if (!nextInterview) return;
                      try {
                        const res = await apiFetch<{ data: any }>(`/api/interview/${nextInterview.id}/mock`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "behavioral" }) });
                        alert('Mock interview started! Session ID: ' + (res.data?.sessionId || 'unknown'));
                      } catch (err) {
                        console.error("Failed to start mock:", err);
                        alert('Failed to start mock interview. Make sure you have an upcoming interview scheduled.');
                      }
                    }}
                    className="px-5 py-2.5 rounded-lg font-semibold transition-all"
                    style={{
                      background: "#00FFE0",
                      color: "#050508",
                      fontFamily: "'Outfit', sans-serif",
                    }}
                  >
                    Start Behavioral Mock
                  </button>
                  <button
                    onClick={async () => {
                      if (!nextInterview) return;
                      try {
                        const res = await apiFetch<{ data: any }>(`/api/interview/${nextInterview.id}/mock`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "technical" }) });
                        alert('Mock interview started! Session ID: ' + (res.data?.sessionId || 'unknown'));
                      } catch (err) {
                        console.error("Failed to start mock:", err);
                        alert('Failed to start mock interview. Make sure you have an upcoming interview scheduled.');
                      }
                    }}
                    className="px-5 py-2.5 rounded-lg font-semibold border transition-all hover:bg-white/5"
                    style={{
                      borderColor: "rgba(255, 255, 255, 0.08)",
                      color: "#E8E8F0",
                      fontFamily: "'Outfit', sans-serif",
                    }}
                  >
                    Start Technical Mock
                  </button>
                </div>
              </div>
            )}

            {/* POST-INTERVIEW TAB */}
            {activeTab === "follow-up" && (
              <div className="text-center py-12">
                <CheckCircle2 size={48} className="mx-auto mb-4 text-[#00E676]" />
                <h3 className="text-xl font-semibold mb-2 text-[#E8E8F0]">Post-Interview Actions</h3>
                <p className="text-sm text-[#7E7E98] mb-6">
                  Send thank-you emails and follow up professionally
                </p>
                <button
                  onClick={async () => {
                    if (!nextInterview) return;
                    try {
                      const res = await apiFetch<{ data: any }>(`/api/interview/${nextInterview.id}/thank-you`, { method: "POST" });
                      alert('Thank you email draft generated! Check the post-interview section.');
                    } catch (err) {
                      console.error("Failed to generate thank you:", err);
                      alert('Failed to generate thank you email.');
                    }
                  }}
                  className="px-5 py-2.5 rounded-lg font-semibold transition-all"
                  style={{
                    background: "#00FFE0",
                    color: "#050508",
                    fontFamily: "'Outfit', sans-serif",
                  }}
                >
                  Generate Thank You Email
                </button>
              </div>
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
