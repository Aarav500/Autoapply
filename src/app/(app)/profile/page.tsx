"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Edit2, Trash2, Plus, Upload, Github, Linkedin } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState("Experience");
  const tabs = ["Experience", "Education", "Skills", "Projects", "Preferences"];

  const queryClient = useQueryClient();

  // Fetch profile data
  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: () => apiFetch<{ data: any }>("/api/profile"),
    retry: false,
  });

  // Fetch completeness
  const { data: completenessData } = useQuery({
    queryKey: ["profileCompleteness"],
    queryFn: () => apiFetch<{ data: any }>("/api/profile/completeness"),
    retry: false,
  });

  const profile = profileData?.data;
  const completeness = completenessData?.data || {};
  const profileCompletion = completeness.percentage || 0;

  // Progress circle calculations
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (profileCompletion / 100) * circumference;

  // Suggestions from completeness data
  const suggestions = completeness.suggestions || [];

  // Experience data from API
  const experiences = profile?.experience || [];

  return (
    <div className="w-full">
      {/* Background texture */}
      <div
        className="fixed inset-0 opacity-[0.015] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* TOP SECTION - PROFILE HEADER */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start gap-5 mb-8"
      >
        {/* Progress Ring */}
        <div className="flex-shrink-0">
          <div className="relative w-[140px] h-[140px]">
            <svg className="w-full h-full -rotate-90">
              {/* Background circle */}
              <circle
                cx="70"
                cy="70"
                r={radius}
                stroke="rgba(255, 255, 255, 0.04)"
                strokeWidth="10"
                fill="none"
              />
              {/* Progress circle */}
              <motion.circle
                cx="70"
                cy="70"
                r={radius}
                stroke="#00FFE0"
                strokeWidth="10"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={circumference}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span
                className="text-4xl font-bold"
                style={{ fontFamily: "'IBM Plex Mono', monospace", color: "#E8E8F0" }}
              >
                {profileCompletion}
              </span>
              <span
                className="text-sm"
                style={{ fontFamily: "'IBM Plex Mono', monospace", color: "#7E7E98" }}
              >
                %
              </span>
            </div>
          </div>
        </div>

        {/* Profile Info */}
        <div className="flex-1">
          {profileLoading ? (
            <div className="animate-pulse">
              <div className="h-8 bg-white/5 rounded w-48 mb-2" />
              <div className="h-5 bg-white/5 rounded w-64 mb-1" />
              <div className="h-4 bg-white/5 rounded w-56 mb-3" />
            </div>
          ) : (
            <>
              <h1
                className="text-[28px] font-bold mb-2"
                style={{ fontFamily: "'Outfit', sans-serif", color: "#E8E8F0" }}
              >
                {profile?.personalInfo?.fullName || "User"}
              </h1>
              <p
                className="text-[15px] mb-1"
                style={{ fontFamily: "'DM Sans', sans-serif", color: "#7E7E98" }}
              >
                {profile?.personalInfo?.title || "Professional"} · {profile?.personalInfo?.location || "Location"}
              </p>
              <p
                className="text-[13px] mb-3"
                style={{ fontFamily: "'DM Sans', sans-serif", color: "#4A4A64" }}
              >
                {profile?.personalInfo?.email} · {profile?.personalInfo?.phone || "+1 (555) 000-0000"}
              </p>
              <p
                className="text-sm mb-4 max-w-2xl leading-relaxed"
                style={{ fontFamily: "'DM Sans', sans-serif", color: "#7E7E98" }}
              >
                {profile?.summary || "Add a professional summary to your profile."}
              </p>
            </>
          )}
          <button
            className="px-4 py-2 rounded-lg border transition-all hover:bg-white/5"
            style={{
              background: "transparent",
              borderColor: "rgba(255, 255, 255, 0.08)",
              fontFamily: "'Outfit', sans-serif",
              fontSize: "13px",
              fontWeight: 500,
              color: "#7E7E98",
            }}
          >
            Edit Profile
          </button>
        </div>
      </motion.div>

      {/* COMPLETENESS SUGGESTIONS */}
      {suggestions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 overflow-x-auto"
        >
          <div className="flex gap-3 pb-2">
            {suggestions.map((suggestion: any, index: number) => (
              <button
                key={index}
                className="flex-shrink-0 px-4 py-2 rounded-full transition-all hover:bg-[rgba(0,255,224,0.1)]"
                style={{
                  background: "rgba(0, 255, 224, 0.06)",
                  border: "1px solid rgba(0, 255, 224, 0.15)",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "12px",
                  color: "#00FFE0",
                }}
              >
                +{suggestion.points || 5} pts: {suggestion.message}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* TAB BAR */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="border-b mb-8"
        style={{ borderColor: "rgba(255, 255, 255, 0.04)" }}
      >
        <div className="flex gap-8">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="relative pb-3 transition-all"
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: "14px",
                fontWeight: 500,
                color: activeTab === tab ? "#E8E8F0" : "#7E7E98",
              }}
            >
              {tab}
              {activeTab === tab && (
                <motion.div
                  layoutId="activeTab"
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
        {/* EXPERIENCE TAB */}
        {activeTab === "Experience" && (
          <div className="space-y-4">
            {profileLoading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-32 bg-white/5 rounded-lg" />
                <div className="h-32 bg-white/5 rounded-lg" />
              </div>
            ) : experiences.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-[#7E7E98] mb-4">No work experience added yet</p>
                <button
                  className="px-4 py-2 rounded-lg bg-[#00FFE0] text-[#050508] font-medium"
                  style={{ fontFamily: "'Outfit', sans-serif" }}
                >
                  <Plus size={16} className="inline mr-2" />
                  Add Experience
                </button>
              </div>
            ) : (
              experiences.map((exp: any, index: number) => (
                <div
                  key={index}
                  className="p-6 rounded-lg border"
                  style={{
                    background: "rgba(15, 15, 24, 0.7)",
                    backdropFilter: "blur(12px)",
                    borderColor: "rgba(255, 255, 255, 0.04)",
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3
                        className="text-lg font-semibold mb-1"
                        style={{ fontFamily: "'Outfit', sans-serif", color: "#E8E8F0" }}
                      >
                        {exp.title}
                      </h3>
                      <p
                        className="text-[15px] mb-2"
                        style={{ fontFamily: "'DM Sans', sans-serif", color: "#7E7E98" }}
                      >
                        {exp.company} · {exp.startDate} — {exp.endDate || "Present"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                        <Edit2 size={16} className="text-[#7E7E98]" />
                      </button>
                      <button className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                        <Trash2 size={16} className="text-[#7E7E98]" />
                      </button>
                    </div>
                  </div>
                  <p
                    className="text-sm mb-3 leading-relaxed"
                    style={{ fontFamily: "'DM Sans', sans-serif", color: "#7E7E98" }}
                  >
                    {exp.description}
                  </p>
                  {exp.achievements && exp.achievements.length > 0 && (
                    <ul className="space-y-2">
                      {exp.achievements.map((achievement: string, idx: number) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 text-sm"
                          style={{ fontFamily: "'DM Sans', sans-serif", color: "#7E7E98" }}
                        >
                          <span className="text-[#00FFE0] mt-1">•</span>
                          <span>{achievement}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))
            )}

            {/* Add Button */}
            {experiences.length > 0 && (
              <button
                className="w-full p-4 rounded-lg border border-dashed transition-all hover:bg-white/5"
                style={{
                  borderColor: "rgba(255, 255, 255, 0.08)",
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "#7E7E98",
                }}
              >
                <Plus size={16} className="inline mr-2" />
                Add Experience
              </button>
            )}
          </div>
        )}

        {/* EDUCATION TAB */}
        {activeTab === "Education" && (
          <div className="text-center py-12">
            <p className="text-[#7E7E98] mb-4">Education section - Coming soon</p>
            <p className="text-sm text-[#4A4A64]">
              Add your degrees, certifications, and academic achievements
            </p>
          </div>
        )}

        {/* SKILLS TAB */}
        {activeTab === "Skills" && (
          <div>
            {profile?.skills && profile.skills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((skill: any, index: number) => (
                  <div
                    key={index}
                    className="px-3 py-2 rounded-lg"
                    style={{
                      background: "rgba(0, 255, 224, 0.08)",
                      border: "1px solid rgba(0, 255, 224, 0.2)",
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: "13px",
                      color: "#00FFE0",
                    }}
                  >
                    {skill.name || skill}
                    {skill.level && ` · ${skill.level}`}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-[#7E7E98] mb-4">No skills added yet</p>
                <button
                  className="px-4 py-2 rounded-lg bg-[#00FFE0] text-[#050508] font-medium"
                  style={{ fontFamily: "'Outfit', sans-serif" }}
                >
                  <Plus size={16} className="inline mr-2" />
                  Add Skills
                </button>
              </div>
            )}
          </div>
        )}

        {/* PROJECTS TAB */}
        {activeTab === "Projects" && (
          <div className="text-center py-12">
            <p className="text-[#7E7E98] mb-4">Projects section - Coming soon</p>
            <p className="text-sm text-[#4A4A64]">
              Showcase your side projects and portfolio work
            </p>
          </div>
        )}

        {/* PREFERENCES TAB */}
        {activeTab === "Preferences" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4" style={{ fontFamily: "'Outfit', sans-serif", color: "#E8E8F0" }}>
                Job Search Preferences
              </h3>
              <p className="text-sm text-[#7E7E98]">
                Target Salary: {profile?.jobPreferences?.targetSalary || "Not set"}<br />
                Remote: {profile?.jobPreferences?.remoteOnly ? "Yes" : "Flexible"}<br />
                Locations: {profile?.jobPreferences?.locations?.join(", ") || "Not specified"}
              </p>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
