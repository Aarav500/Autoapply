"use client";

import { motion } from "framer-motion";
import { ArrowRight, Video, FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

export default function DashboardPage() {
  const { data: statsData } = useQuery({
    queryKey: ["dashboardStats"],
    queryFn: () => apiFetch("/api/dashboard/stats"),
    retry: false,
  });

  const { data: activityData } = useQuery({
    queryKey: ["recentActivity"],
    queryFn: () => apiFetch("/api/dashboard/activity"),
    retry: false,
  });

  const { data: interviewsData, isLoading: interviewsLoading } = useQuery({
    queryKey: ["upcomingInterviews"],
    queryFn: () => apiFetch("/api/interview?status=scheduled&limit=3"),
    retry: false,
  });

  const { data: pipelineData } = useQuery({
    queryKey: ["pipeline"],
    queryFn: () => apiFetch("/api/jobs/pipeline"),
    retry: false,
  });

  // Stats from API
  const stats: Array<{
    number: string;
    label: string;
    trend?: string;
    trendColor?: string;
    sub?: string;
    subColor?: string;
    accent?: boolean;
  }> = (statsData as Record<string, unknown>)?.stats as typeof stats || [
    { number: "0", label: "Jobs Found", trend: "—", trendColor: "#00E676" },
    { number: "0", label: "Applied", trend: "—", trendColor: "#00E676" },
    { number: "0%", label: "Response Rate", trend: "—", trendColor: "#00E676" },
    { number: "0", label: "Interviews", sub: "—", subColor: "#FFAB00", accent: true },
    { number: "0", label: "Offers", sub: "—", subColor: "#7E7E98", accent: true },
  ];

  const rawPipeline: Array<{status: string; count: number}> =
    (pipelineData as Record<string, Record<string, unknown>>)?.data?.pipeline as typeof rawPipeline || [];
  const maxCount = Math.max(...rawPipeline.map((s) => s.count), 1);
  const pipelineStages = rawPipeline.map((stage) => {
    const colors: Record<string, string> = {
      discovered: "#15152A",
      saved: "rgba(83, 109, 254, 0.3)",
      applying: "rgba(0, 255, 224, 0.15)",
      applied: "rgba(0, 255, 224, 0.25)",
      screening: "#00FFE0",
      interview: "rgba(0, 230, 118, 0.3)",
      offer: "#00E676",
      rejected: "rgba(255, 71, 87, 0.25)",
    };
    return {
      name: stage.status.charAt(0).toUpperCase() + stage.status.slice(1),
      count: stage.count,
      color: colors[stage.status] || "#15152A",
      height: Math.round((stage.count / maxCount) * 160),
    };
  });

  const activities: Array<{
    time: string;
    description: string;
    dotColor: string;
  }> = (activityData as Record<string, unknown>)?.data as typeof activities || [];

  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12
      ? "Good morning"
      : currentHour < 18
      ? "Good afternoon"
      : "Good evening";

  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="w-full">
      {/* Background texture */}
      <div
        className="fixed inset-0 opacity-[0.015] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* ROW 1 - GREETING */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between mb-8"
      >
        <div>
          <h1
            className="text-[32px] font-bold mb-2"
            style={{ fontFamily: "'Outfit', sans-serif", color: "#E8E8F0" }}
          >
            {greeting}
          </h1>
          <p
            className="text-[15px]"
            style={{ fontFamily: "'DM Sans', sans-serif", color: "#7E7E98" }}
          >
            Your job search is active. {(statsData as Record<string, number>)?.applicationsToday || 0} applications sent today.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <span
            className="text-[13px]"
            style={{ fontFamily: "'IBM Plex Mono', monospace", color: "#4A4A64" }}
          >
            {today}
          </span>
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{
              background: "rgba(0, 230, 118, 0.08)",
              border: "1px solid rgba(0, 230, 118, 0.2)",
            }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full bg-[#00E676]"
              style={{
                boxShadow: "0 0 8px rgba(0, 230, 118, 0.6)",
              }}
            />
            <span
              className="text-[11px]"
              style={{ fontFamily: "'DM Sans', sans-serif", color: "#00E676" }}
            >
              System Active
            </span>
          </div>
        </div>
      </motion.div>

      {/* ROW 2 - STAT CARDS */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-5 gap-4 mb-8"
      >
        {stats.map((stat, index) => (
          <div
            key={index}
            className="p-6 rounded-[14px] border"
            style={{
              background: "rgba(15, 15, 24, 0.7)",
              backdropFilter: "blur(12px)",
              borderColor: "rgba(255, 255, 255, 0.04)",
            }}
          >
            <p
              className="text-[48px] font-light mb-2"
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                color: stat.accent ? "#00FFE0" : "#E8E8F0",
              }}
            >
              {stat.number}
            </p>
            <p
              className="text-xs font-medium uppercase tracking-wider mb-2"
              style={{ fontFamily: "'Outfit', sans-serif", color: "#7E7E98" }}
            >
              {stat.label}
            </p>
            {stat.trend && (
              <p
                className="text-[11px]"
                style={{ fontFamily: "'DM Sans', sans-serif", color: stat.trendColor }}
              >
                {stat.trend}
              </p>
            )}
            {stat.sub && (
              <p
                className="text-[11px]"
                style={{ fontFamily: "'DM Sans', sans-serif", color: stat.subColor }}
              >
                {stat.sub}
              </p>
            )}
          </div>
        ))}
      </motion.div>

      {/* ROW 3 - TWO COLUMNS */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-[60%_40%] gap-4 mb-8"
      >
        {/* LEFT - PIPELINE */}
        <div
          className="p-6 rounded-[14px] border"
          style={{
            background: "rgba(15, 15, 24, 0.7)",
            backdropFilter: "blur(12px)",
            borderColor: "rgba(255, 255, 255, 0.04)",
          }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2
              className="text-lg font-semibold"
              style={{ fontFamily: "'Outfit', sans-serif", color: "#E8E8F0" }}
            >
              Pipeline
            </h2>
            <button
              className="flex items-center gap-1 text-sm hover:text-[#E8E8F0] transition-colors"
              style={{ fontFamily: "'DM Sans', sans-serif", color: "#7E7E98" }}
              onClick={() => window.location.href = "/jobs"}
            >
              View All
              <ArrowRight size={14} />
            </button>
          </div>

          {/* Bar Chart */}
          <div className="flex items-end justify-between gap-2 h-48">
            {pipelineStages.length === 0 ? (
              <p className="text-[13px] text-[#7E7E98] w-full text-center self-center">
                No pipeline data yet. Start searching for jobs!
              </p>
            ) : (
              pipelineStages.map((stage, index) => (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div className="w-full flex items-end justify-center mb-4" style={{ height: "160px" }}>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${stage.height}px` }}
                      transition={{ delay: 0.3 + index * 0.1, duration: 0.5 }}
                      className="w-full rounded-t-lg"
                      style={{
                        background: stage.color,
                        border: `1px solid ${stage.color}`,
                      }}
                    />
                  </div>
                  <p
                    className="text-[11px] font-medium mb-1 text-center"
                    style={{ fontFamily: "'Outfit', sans-serif", color: "#7E7E98" }}
                  >
                    {stage.name}
                  </p>
                  <p
                    className="text-[13px] font-medium"
                    style={{ fontFamily: "'IBM Plex Mono', monospace", color: "#E8E8F0" }}
                  >
                    {stage.count}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT - ACTIVITY */}
        <div
          className="p-6 rounded-[14px] border"
          style={{
            background: "rgba(15, 15, 24, 0.7)",
            backdropFilter: "blur(12px)",
            borderColor: "rgba(255, 255, 255, 0.04)",
          }}
        >
          <h2
            className="text-lg font-semibold mb-6"
            style={{ fontFamily: "'Outfit', sans-serif", color: "#E8E8F0" }}
          >
            Recent Activity
          </h2>

          {/* Timeline */}
          <div className="relative">
            {activities.length === 0 ? (
              <p className="text-[13px] text-[#7E7E98]">
                No recent activity. Your actions will appear here.
              </p>
            ) : (
              <>
                <div
                  className="absolute left-0 top-0 bottom-8 w-px"
                  style={{ background: "rgba(255, 255, 255, 0.06)" }}
                />
                <div className="space-y-6">
                  {activities.slice(0, 6).map((activity, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + index * 0.05 }}
                      className="relative pl-6"
                    >
                      <div
                        className="absolute left-0 top-0 w-2 h-2 rounded-full"
                        style={{
                          background: activity.dotColor,
                          transform: "translateX(-50%)",
                        }}
                      />
                      <div className="flex items-start gap-3">
                        <p
                          className="text-[11px] w-14 flex-shrink-0"
                          style={{ fontFamily: "'IBM Plex Mono', monospace", color: "#4A4A64" }}
                        >
                          {activity.time}
                        </p>
                        <p
                          className="text-[13px] flex-1"
                          style={{ fontFamily: "'DM Sans', sans-serif", color: "#7E7E98" }}
                        >
                          {activity.description}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </motion.div>

      {/* ROW 4 - UPCOMING INTERVIEWS & QUICK ACTIONS */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-2 gap-4"
      >
        {/* LEFT - UPCOMING INTERVIEWS */}
        <div
          className="p-6 rounded-[14px] border"
          style={{
            background: "rgba(15, 15, 24, 0.7)",
            backdropFilter: "blur(12px)",
            borderColor: "rgba(255, 255, 255, 0.04)",
          }}
        >
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <h2
                className="text-lg font-semibold mb-1"
                style={{ fontFamily: "'Outfit', sans-serif", color: "#E8E8F0" }}
              >
                Upcoming Interviews
              </h2>
              <p
                className="text-[13px]"
                style={{ fontFamily: "'DM Sans', sans-serif", color: "#7E7E98" }}
              >
                {((interviewsData as Record<string, Record<string, unknown[]>>)?.data?.interviews?.length) || 0} scheduled
              </p>
            </div>
            <button
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all hover:bg-white/[0.05]"
              style={{
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
              }}
              onClick={() => window.location.href = "/interview"}
            >
              <span
                className="text-[13px]"
                style={{ fontFamily: "'DM Sans', sans-serif", color: "#7E7E98" }}
              >
                View All
              </span>
            </button>
          </div>

          <div className="space-y-4">
            {interviewsLoading ? (
              <p className="text-[13px] text-[#7E7E98]">Loading interviews...</p>
            ) : !(((interviewsData as Record<string, Record<string, unknown[]>>)?.data?.interviews?.length)) ? (
              <p className="text-[13px] text-[#7E7E98]">No upcoming interviews</p>
            ) : (
              ((interviewsData as Record<string, Record<string, Array<Record<string, string>>>>)?.data?.interviews || []).slice(0, 3).map((interview, index: number) => (
                <div
                  key={index}
                  className="p-4 rounded-lg border"
                  style={{
                    background: "rgba(255, 255, 255, 0.02)",
                    borderColor: "rgba(255, 255, 255, 0.06)",
                  }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Video size={16} className="text-[#00FFE0]" />
                    <p
                      className="text-[14px] font-medium"
                      style={{ fontFamily: "'Outfit', sans-serif", color: "#E8E8F0" }}
                    >
                      {interview.company}
                    </p>
                  </div>
                  <p
                    className="text-[12px] mb-1"
                    style={{ fontFamily: "'DM Sans', sans-serif", color: "#7E7E98" }}
                  >
                    {interview.role}
                  </p>
                  <p
                    className="text-[11px]"
                    style={{ fontFamily: "'IBM Plex Mono', monospace", color: "#4A4A64" }}
                  >
                    {new Date(interview.scheduledAt).toLocaleDateString()} at{" "}
                    {new Date(interview.scheduledAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT - QUICK ACTIONS */}
        <div
          className="p-6 rounded-[14px] border"
          style={{
            background: "rgba(15, 15, 24, 0.7)",
            backdropFilter: "blur(12px)",
            borderColor: "rgba(255, 255, 255, 0.04)",
          }}
        >
          <h2
            className="text-lg font-semibold mb-6"
            style={{ fontFamily: "'Outfit', sans-serif", color: "#E8E8F0" }}
          >
            Quick Actions
          </h2>

          <div className="space-y-3">
            <button
              className="w-full p-4 rounded-lg flex items-center gap-3 transition-all hover:bg-white/[0.05]"
              style={{
                background: "rgba(0, 255, 224, 0.08)",
                border: "1px solid rgba(0, 255, 224, 0.2)",
              }}
              onClick={() => window.location.href = "/documents"}
            >
              <FileText size={20} className="text-[#00FFE0]" />
              <div className="flex-1 text-left">
                <p
                  className="text-[14px] font-medium mb-0.5"
                  style={{ fontFamily: "'Outfit', sans-serif", color: "#E8E8F0" }}
                >
                  Generate CV
                </p>
                <p
                  className="text-[11px]"
                  style={{ fontFamily: "'DM Sans', sans-serif", color: "#7E7E98" }}
                >
                  Create tailored CV for a job
                </p>
              </div>
            </button>

            <button
              className="w-full p-4 rounded-lg flex items-center gap-3 transition-all hover:bg-white/[0.05]"
              style={{
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
              }}
              onClick={() => window.location.href = "/jobs"}
            >
              <FileText size={20} className="text-[#7E7E98]" />
              <div className="flex-1 text-left">
                <p
                  className="text-[14px] font-medium mb-0.5"
                  style={{ fontFamily: "'Outfit', sans-serif", color: "#E8E8F0" }}
                >
                  Find Jobs
                </p>
                <p
                  className="text-[11px]"
                  style={{ fontFamily: "'DM Sans', sans-serif", color: "#7E7E98" }}
                >
                  Search for new opportunities
                </p>
              </div>
            </button>

            <button
              className="w-full p-4 rounded-lg flex items-center gap-3 transition-all hover:bg-white/[0.05]"
              style={{
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
              }}
              onClick={() => window.location.href = "/profile"}
            >
              <FileText size={20} className="text-[#7E7E98]" />
              <div className="flex-1 text-left">
                <p
                  className="text-[14px] font-medium mb-0.5"
                  style={{ fontFamily: "'Outfit', sans-serif", color: "#E8E8F0" }}
                >
                  Update Profile
                </p>
                <p
                  className="text-[11px]"
                  style={{ fontFamily: "'DM Sans', sans-serif", color: "#7E7E98" }}
                >
                  Keep your info current
                </p>
              </div>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
