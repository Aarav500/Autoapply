"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Edit2, Trash2, Plus, X, Save, GraduationCap, FolderGit2, ExternalLink, Upload, CheckCircle2, AlertCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

const inputStyle = {
  background: "rgba(255, 255, 255, 0.04)",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  borderRadius: "8px",
  padding: "10px 14px",
  fontFamily: "'DM Sans', sans-serif",
  fontSize: "14px",
  color: "#E8E8F0",
  outline: "none",
  width: "100%",
};

const labelStyle = {
  fontFamily: "'DM Sans', sans-serif",
  fontSize: "12px",
  fontWeight: 500 as const,
  color: "#7E7E98",
  marginBottom: "6px",
  display: "block" as const,
};

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-xl p-6"
        style={{ background: "#12121C", border: "1px solid rgba(255, 255, 255, 0.08)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold" style={{ fontFamily: "'Outfit', sans-serif", color: "#E8E8F0" }}>{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-white/5 rounded-lg"><X size={20} className="text-[#7E7E98]" /></button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState("Experience");
  const tabs = ["Experience", "Education", "Skills", "Projects", "Preferences"];
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [addExpOpen, setAddExpOpen] = useState(false);
  const [editExpId, setEditExpId] = useState<string | null>(null);
  const [addEduOpen, setAddEduOpen] = useState(false);
  const [addProjectOpen, setAddProjectOpen] = useState(false);
  const [skillInput, setSkillInput] = useState("");

  // Form states
  const [profileForm, setProfileForm] = useState({ name: "", headline: "", location: "", phone: "", summary: "" });
  const [expForm, setExpForm] = useState({ role: "", company: "", startDate: "", endDate: "", current: false, description: "", bullets: "" });
  const [eduForm, setEduForm] = useState({ institution: "", degree: "", field: "", startDate: "", endDate: "", gpa: "" });
  const [projectForm, setProjectForm] = useState({ name: "", description: "", url: "", technologies: "" });
  const [prefsForm, setPrefsForm] = useState({ salaryMin: "", salaryMax: "", remotePreference: "any", locations: "" });
  const [prefsEditing, setPrefsEditing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importFeedback, setImportFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const queryClient = useQueryClient();

  const handleResumeImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'pdf' && ext !== 'docx' && ext !== 'doc') {
      setImportFeedback({ type: "error", text: "Please upload a PDF or DOCX file." });
      setTimeout(() => setImportFeedback(null), 5000);
      return;
    }
    setIsImporting(true);
    setImportFeedback(null);
    try {
      const formData = new FormData();
      formData.append("resume", file);
      await apiFetch("/api/profile/import/resume", { method: "POST", body: formData });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["profileCompleteness"] });
      setImportFeedback({ type: "success", text: "Resume imported! Your profile has been updated." });
      setTimeout(() => setImportFeedback(null), 5000);
    } catch (err) {
      setImportFeedback({ type: "error", text: err instanceof Error ? err.message : "Failed to import resume." });
      setTimeout(() => setImportFeedback(null), 5000);
    } finally {
      setIsImporting(false);
      e.target.value = "";
    }
  };

  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: () => apiFetch<{ data: Record<string, unknown> }>("/api/profile"),
    retry: false,
  });

  const { data: completenessData } = useQuery({
    queryKey: ["profileCompleteness"],
    queryFn: () => apiFetch<{ data: Record<string, unknown> }>("/api/profile/completeness"),
    retry: false,
  });

  // Correctly map backend profile shape: { profile: { name, headline, location, phone, summary, skills, experience, education, projects, preferences, ... } }
  const profileInner = (profileData as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
  const profile = (profileInner?.profile || profileInner) as Record<string, unknown> | undefined;

  const completenessInner = (completenessData as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
  const completeness = (completenessInner || {}) as Record<string, unknown>;
  const profileCompletion = (completeness.percentage as number) || (profile?.completenessScore as number) || 0;
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (profileCompletion / 100) * circumference;
  const suggestions = (completeness.suggestions as Array<Record<string, unknown>>) || [];

  // Backend field names: name, headline, location, phone, summary, skills, experience, education, projects, preferences
  const profileName = (profile?.name as string) || "";
  const profileEmail = (profile?.email as string) || "";
  const profileHeadline = (profile?.headline as string) || "";
  const profileLocation = (profile?.location as string) || "";
  const profilePhone = (profile?.phone as string) || "";
  const profileSummary = (profile?.summary as string) || "";
  const preferences = (profile?.preferences as Record<string, unknown>) || {};

  const experiences = (profile?.experience as Array<Record<string, unknown>>) || [];
  const education = (profile?.education as Array<Record<string, unknown>>) || [];
  const projects = (profile?.projects as Array<Record<string, unknown>>) || [];
  const skills = (profile?.skills as Array<Record<string, string>>) || [];

  // ===================== Mutations =====================

  // PUT /api/profile — basic fields only (name, headline, location, phone, summary)
  const updateProfileMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch("/api/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["profileCompleteness"] });
    },
  });

  // POST /api/profile/experience — add new experience entry
  const addExperienceMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch("/api/profile/experience", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile"] }),
  });

  // PUT /api/profile/experience/[id] — edit existing experience
  const updateExperienceMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      apiFetch(`/api/profile/experience/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile"] }),
  });

  // DELETE /api/profile/experience/[id]
  const deleteExperienceMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/profile/experience/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile"] }),
  });

  // POST /api/profile/education
  const addEducationMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch("/api/profile/education", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile"] }),
  });

  // DELETE /api/profile/education/[id]
  const deleteEducationMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/profile/education/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile"] }),
  });

  // POST /api/profile/projects — add new project
  const addProjectMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch("/api/profile/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile"] }),
  });

  // PUT /api/profile/skills — replace whole skills array (backend expects [{name, proficiency, years?}])
  const updateSkillsMutation = useMutation({
    mutationFn: (data: { skills: Array<{ name: string; proficiency: string }> }) =>
      apiFetch("/api/profile/skills", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile"] }),
  });

  // PUT /api/profile/preferences
  const updatePreferencesMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch("/api/profile/preferences", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile"] }),
  });

  // ===================== Handlers =====================

  const openEditProfile = () => {
    setProfileForm({
      name: profileName,
      headline: profileHeadline,
      location: profileLocation,
      phone: profilePhone,
      summary: profileSummary,
    });
    setEditProfileOpen(true);
  };

  const saveProfile = () => {
    updateProfileMutation.mutate({
      name: profileForm.name,
      headline: profileForm.headline,
      location: profileForm.location,
      phone: profileForm.phone,
      summary: profileForm.summary,
    });
    setEditProfileOpen(false);
  };

  const openAddExp = () => {
    setExpForm({ role: "", company: "", startDate: "", endDate: "", current: false, description: "", bullets: "" });
    setEditExpId(null);
    setAddExpOpen(true);
  };

  const openEditExp = (exp: Record<string, unknown>) => {
    setExpForm({
      role: (exp.role as string) || "",
      company: (exp.company as string) || "",
      startDate: (exp.startDate as string) || "",
      endDate: (exp.endDate as string) || "",
      current: (exp.current as boolean) || false,
      description: (exp.description as string) || "",
      bullets: ((exp.bullets as string[]) || []).join("\n"),
    });
    setEditExpId(exp.id as string);
    setAddExpOpen(true);
  };

  const saveExp = () => {
    const payload = {
      role: expForm.role,
      company: expForm.company,
      startDate: expForm.startDate,
      endDate: expForm.current ? null : (expForm.endDate || null),
      current: expForm.current,
      description: expForm.description,
      bullets: expForm.bullets.split("\n").filter((b) => b.trim()),
    };
    if (editExpId) {
      updateExperienceMutation.mutate({ id: editExpId, data: payload });
    } else {
      addExperienceMutation.mutate(payload);
    }
    setAddExpOpen(false);
  };

  const deleteExp = (id: string) => {
    if (!confirm("Delete this experience?")) return;
    deleteExperienceMutation.mutate(id);
  };

  const openAddEdu = () => {
    setEduForm({ institution: "", degree: "", field: "", startDate: "", endDate: "", gpa: "" });
    setAddEduOpen(true);
  };

  const saveEdu = () => {
    addEducationMutation.mutate({
      institution: eduForm.institution,
      degree: eduForm.degree,
      field: eduForm.field || undefined,
      startDate: eduForm.startDate,
      endDate: eduForm.endDate || null,
      gpa: eduForm.gpa ? parseFloat(eduForm.gpa) : undefined,
    });
    setAddEduOpen(false);
  };

  const deleteEdu = (id: string) => {
    if (!confirm("Delete this education entry?")) return;
    deleteEducationMutation.mutate(id);
  };

  const openAddProject = () => {
    setProjectForm({ name: "", description: "", url: "", technologies: "" });
    setAddProjectOpen(true);
  };

  const saveProject = () => {
    addProjectMutation.mutate({
      name: projectForm.name,
      description: projectForm.description,
      url: projectForm.url || undefined,
      technologies: projectForm.technologies.split(",").map((t) => t.trim()).filter(Boolean),
    });
    setAddProjectOpen(false);
  };

  const deleteProject = (index: number) => {
    if (!confirm("Delete this project?")) return;
    const updated = projects.filter((_, i) => i !== index);
    updateProfileMutation.mutate({ projects: updated });
  };

  const addSkill = () => {
    if (!skillInput.trim()) return;
    // Backend expects: { name: string, proficiency: 'beginner'|'intermediate'|'advanced'|'expert', years?: number }
    const current = skills.map((s) => ({ name: s.name || "", proficiency: s.proficiency || "intermediate" }));
    current.push({ name: skillInput.trim(), proficiency: "intermediate" });
    updateSkillsMutation.mutate({ skills: current });
    setSkillInput("");
  };

  const removeSkill = (index: number) => {
    const current = skills.map((s) => ({ name: s.name || "", proficiency: s.proficiency || "intermediate" }));
    current.splice(index, 1);
    updateSkillsMutation.mutate({ skills: current });
  };

  const openPrefsEdit = () => {
    setPrefsForm({
      salaryMin: preferences.salaryMin != null ? String(preferences.salaryMin) : "",
      salaryMax: preferences.salaryMax != null ? String(preferences.salaryMax) : "",
      remotePreference: (preferences.remotePreference as string) || "any",
      locations: ((preferences.locations as string[]) || []).join(", "),
    });
    setPrefsEditing(true);
  };

  const savePrefs = () => {
    updatePreferencesMutation.mutate({
      salaryMin: prefsForm.salaryMin ? parseInt(prefsForm.salaryMin, 10) : undefined,
      salaryMax: prefsForm.salaryMax ? parseInt(prefsForm.salaryMax, 10) : undefined,
      remotePreference: prefsForm.remotePreference || undefined,
      locations: prefsForm.locations.split(",").map((l) => l.trim()).filter(Boolean),
    });
    setPrefsEditing(false);
  };

  const anyMutationPending =
    updateProfileMutation.isPending ||
    addExperienceMutation.isPending ||
    updateExperienceMutation.isPending ||
    deleteExperienceMutation.isPending ||
    addEducationMutation.isPending ||
    deleteEducationMutation.isPending ||
    addProjectMutation.isPending ||
    updateSkillsMutation.isPending ||
    updatePreferencesMutation.isPending;

  return (
    <div className="w-full">
      <div className="fixed inset-0 opacity-[0.015] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }} />

      {/* TOP SECTION - PROFILE HEADER */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-5 mb-8">
        <div className="flex-shrink-0">
          <div className="relative w-[140px] h-[140px]">
            <svg className="w-full h-full -rotate-90">
              <circle cx="70" cy="70" r={radius} stroke="rgba(255, 255, 255, 0.04)" strokeWidth="10" fill="none" />
              <motion.circle cx="70" cy="70" r={radius} stroke="#00FFE0" strokeWidth="10" fill="none" strokeDasharray={circumference} strokeDashoffset={circumference} animate={{ strokeDashoffset: offset }} transition={{ duration: 1.5, ease: "easeOut" }} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold" style={{ fontFamily: "'IBM Plex Mono', monospace", color: "#E8E8F0" }}>{profileCompletion}</span>
              <span className="text-sm" style={{ fontFamily: "'IBM Plex Mono', monospace", color: "#7E7E98" }}>%</span>
            </div>
          </div>
        </div>

        <div className="flex-1">
          {profileLoading ? (
            <div className="animate-pulse">
              <div className="h-8 bg-white/5 rounded w-48 mb-2" />
              <div className="h-5 bg-white/5 rounded w-64 mb-1" />
              <div className="h-4 bg-white/5 rounded w-56 mb-3" />
            </div>
          ) : (
            <>
              <h1 className="text-[28px] font-bold mb-2" style={{ fontFamily: "'Outfit', sans-serif", color: "#E8E8F0" }}>
                {profileName || "User"}
              </h1>
              <p className="text-[15px] mb-1" style={{ fontFamily: "'DM Sans', sans-serif", color: "#7E7E98" }}>
                {profileHeadline || "Professional"}{profileLocation ? ` · ${profileLocation}` : ""}
              </p>
              <p className="text-[13px] mb-3" style={{ fontFamily: "'DM Sans', sans-serif", color: "#4A4A64" }}>
                {profileEmail}{profilePhone ? ` · ${profilePhone}` : ""}
              </p>
              <p className="text-sm mb-4 max-w-2xl leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif", color: "#7E7E98" }}>
                {profileSummary || "Add a professional summary to your profile."}
              </p>
            </>
          )}
          <div className="flex gap-2 items-center flex-wrap">
            <button onClick={openEditProfile} className="px-4 py-2 rounded-lg border transition-all hover:bg-white/5" style={{ background: "transparent", borderColor: "rgba(255, 255, 255, 0.08)", fontFamily: "'Outfit', sans-serif", fontSize: "13px", fontWeight: 500, color: "#7E7E98" }}>
              Edit Profile
            </button>
            <label className="px-4 py-2 rounded-lg border transition-all hover:bg-white/5 cursor-pointer inline-flex items-center gap-1.5" style={{ background: "transparent", borderColor: "rgba(83, 109, 254, 0.3)", fontFamily: "'Outfit', sans-serif", fontSize: "13px", fontWeight: 500, color: "#536DFE" }}>
              <Upload size={14} />
              {isImporting ? "Importing..." : "Import Resume"}
              <input type="file" accept=".pdf,.docx" onChange={handleResumeImport} className="hidden" disabled={isImporting} />
            </label>
            {importFeedback && (
              <span className="flex items-center gap-1.5 text-[12px]" style={{ fontFamily: "'DM Sans', sans-serif", color: importFeedback.type === "success" ? "#00E676" : "#FF4757" }}>
                {importFeedback.type === "success" ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                {importFeedback.text}
              </span>
            )}
          </div>
        </div>
      </motion.div>

      {/* COMPLETENESS SUGGESTIONS */}
      {suggestions.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-8 overflow-x-auto">
          <div className="flex gap-3 pb-2">
            {suggestions.map((suggestion, index: number) => (
              <button key={index} className="flex-shrink-0 px-4 py-2 rounded-full transition-all hover:bg-[rgba(0,255,224,0.1)]" style={{ background: "rgba(0, 255, 224, 0.06)", border: "1px solid rgba(0, 255, 224, 0.15)", fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: "#00FFE0" }}>
                +{(suggestion.points as number) || 5} pts: {suggestion.message as string}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* TAB BAR */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="border-b mb-8" style={{ borderColor: "rgba(255, 255, 255, 0.04)" }}>
        <div className="flex gap-8">
          {tabs.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className="relative pb-3 transition-all" style={{ fontFamily: "'Outfit', sans-serif", fontSize: "14px", fontWeight: 500, color: activeTab === tab ? "#E8E8F0" : "#7E7E98" }}>
              {tab}
              {activeTab === tab && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#00FFE0]" />}
            </button>
          ))}
        </div>
      </motion.div>

      {/* TAB CONTENT */}
      <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>

        {/* EXPERIENCE TAB */}
        {activeTab === "Experience" && (
          <div className="space-y-4">
            {profileLoading ? (
              <div className="animate-pulse space-y-4"><div className="h-32 bg-white/5 rounded-lg" /><div className="h-32 bg-white/5 rounded-lg" /></div>
            ) : experiences.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-[#7E7E98] mb-4">No work experience added yet</p>
                <button onClick={openAddExp} className="px-4 py-2 rounded-lg bg-[#00FFE0] text-[#050508] font-medium" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  <Plus size={16} className="inline mr-2" />Add Experience
                </button>
              </div>
            ) : (
              experiences.map((exp, index: number) => (
                <div key={(exp.id as string) || index} className="p-6 rounded-lg border" style={{ background: "rgba(15, 15, 24, 0.7)", backdropFilter: "blur(12px)", borderColor: "rgba(255, 255, 255, 0.04)" }}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-semibold mb-1" style={{ fontFamily: "'Outfit', sans-serif", color: "#E8E8F0" }}>{exp.role as string}</h3>
                      <p className="text-[15px] mb-2" style={{ fontFamily: "'DM Sans', sans-serif", color: "#7E7E98" }}>
                        {exp.company as string} · {exp.startDate as string} — {(exp.current as boolean) ? "Present" : ((exp.endDate as string) || "Present")}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => openEditExp(exp)} className="p-2 hover:bg-white/5 rounded-lg transition-colors"><Edit2 size={16} className="text-[#7E7E98]" /></button>
                      <button onClick={() => deleteExp(exp.id as string)} className="p-2 hover:bg-white/5 rounded-lg transition-colors"><Trash2 size={16} className="text-[#7E7E98]" /></button>
                    </div>
                  </div>
                  {(exp.description as string) && (
                    <p className="text-sm mb-3 leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif", color: "#7E7E98" }}>{exp.description as string}</p>
                  )}
                  {(exp.bullets as string[])?.length > 0 && (
                    <ul className="space-y-2">
                      {(exp.bullets as string[]).map((bullet: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-sm" style={{ fontFamily: "'DM Sans', sans-serif", color: "#7E7E98" }}>
                          <span className="text-[#00FFE0] mt-1">•</span><span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))
            )}
            {experiences.length > 0 && (
              <button onClick={openAddExp} className="w-full p-4 rounded-lg border border-dashed transition-all hover:bg-white/5" style={{ borderColor: "rgba(255, 255, 255, 0.08)", fontFamily: "'Outfit', sans-serif", fontSize: "14px", fontWeight: 500, color: "#7E7E98" }}>
                <Plus size={16} className="inline mr-2" />Add Experience
              </button>
            )}
          </div>
        )}

        {/* EDUCATION TAB */}
        {activeTab === "Education" && (
          <div className="space-y-4">
            {education.length === 0 ? (
              <div className="text-center py-12">
                <GraduationCap size={48} className="mx-auto mb-4 text-[#4A4A64]" />
                <p className="text-[#7E7E98] mb-4">No education added yet</p>
                <button onClick={openAddEdu} className="px-4 py-2 rounded-lg bg-[#00FFE0] text-[#050508] font-medium" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  <Plus size={16} className="inline mr-2" />Add Education
                </button>
              </div>
            ) : (
              education.map((edu, index: number) => (
                <div key={(edu.id as string) || index} className="p-6 rounded-lg border" style={{ background: "rgba(15, 15, 24, 0.7)", backdropFilter: "blur(12px)", borderColor: "rgba(255, 255, 255, 0.04)" }}>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold mb-1" style={{ fontFamily: "'Outfit', sans-serif", color: "#E8E8F0" }}>{edu.degree as string}{edu.field ? ` in ${edu.field}` : ""}</h3>
                      <p className="text-[15px] mb-1" style={{ fontFamily: "'DM Sans', sans-serif", color: "#7E7E98" }}>{edu.institution as string}</p>
                      <p className="text-[13px]" style={{ fontFamily: "'IBM Plex Mono', monospace", color: "#4A4A64" }}>
                        {edu.startDate as string} — {(edu.endDate as string) || "Present"}{edu.gpa ? ` · GPA: ${edu.gpa}` : ""}
                      </p>
                    </div>
                    <button onClick={() => deleteEdu(edu.id as string)} className="p-2 hover:bg-white/5 rounded-lg transition-colors"><Trash2 size={16} className="text-[#7E7E98]" /></button>
                  </div>
                </div>
              ))
            )}
            {education.length > 0 && (
              <button onClick={openAddEdu} className="w-full p-4 rounded-lg border border-dashed transition-all hover:bg-white/5" style={{ borderColor: "rgba(255, 255, 255, 0.08)", fontFamily: "'Outfit', sans-serif", fontSize: "14px", fontWeight: 500, color: "#7E7E98" }}>
                <Plus size={16} className="inline mr-2" />Add Education
              </button>
            )}
          </div>
        )}

        {/* SKILLS TAB */}
        {activeTab === "Skills" && (
          <div>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addSkill()}
                placeholder="Type a skill and press Enter..."
                className="flex-1"
                style={inputStyle}
              />
              <button onClick={addSkill} className="px-4 py-2 rounded-lg bg-[#00FFE0] text-[#050508] font-medium flex-shrink-0" style={{ fontFamily: "'Outfit', sans-serif" }}>
                <Plus size={16} className="inline mr-1" />Add
              </button>
            </div>
            {skills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {skills.map((skill, index: number) => (
                  <div key={index} className="flex items-center gap-2 px-3 py-2 rounded-lg group" style={{ background: "rgba(0, 255, 224, 0.08)", border: "1px solid rgba(0, 255, 224, 0.2)", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: "#00FFE0" }}>
                    {skill.name}
                    {skill.proficiency ? ` · ${skill.proficiency}` : null}
                    <button onClick={() => removeSkill(index)} className="opacity-0 group-hover:opacity-100 transition-opacity"><X size={14} /></button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-[#7E7E98]">No skills added yet. Type above to add skills.</p>
              </div>
            )}
          </div>
        )}

        {/* PROJECTS TAB */}
        {activeTab === "Projects" && (
          <div className="space-y-4">
            {projects.length === 0 ? (
              <div className="text-center py-12">
                <FolderGit2 size={48} className="mx-auto mb-4 text-[#4A4A64]" />
                <p className="text-[#7E7E98] mb-4">No projects added yet</p>
                <button onClick={openAddProject} className="px-4 py-2 rounded-lg bg-[#00FFE0] text-[#050508] font-medium" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  <Plus size={16} className="inline mr-2" />Add Project
                </button>
              </div>
            ) : (
              projects.map((proj, index: number) => (
                <div key={(proj.id as string) || index} className="p-6 rounded-lg border" style={{ background: "rgba(15, 15, 24, 0.7)", backdropFilter: "blur(12px)", borderColor: "rgba(255, 255, 255, 0.04)" }}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-lg font-semibold mb-1" style={{ fontFamily: "'Outfit', sans-serif", color: "#E8E8F0" }}>{proj.name as string}</h3>
                      <p className="text-sm leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif", color: "#7E7E98" }}>{proj.description as string}</p>
                    </div>
                    <div className="flex gap-2">
                      {proj.url ? (
                        <a href={proj.url as string} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-white/5 rounded-lg transition-colors"><ExternalLink size={16} className="text-[#00FFE0]" /></a>
                      ) : null}
                      <button onClick={() => deleteProject(index)} className="p-2 hover:bg-white/5 rounded-lg transition-colors"><Trash2 size={16} className="text-[#7E7E98]" /></button>
                    </div>
                  </div>
                  {(proj.technologies as string[])?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {(proj.technologies as string[]).map((tech: string, idx: number) => (
                        <span key={idx} className="px-2 py-1 rounded text-[11px]" style={{ background: "rgba(83, 109, 254, 0.1)", color: "#536DFE", fontFamily: "'IBM Plex Mono', monospace" }}>{tech}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
            {projects.length > 0 && (
              <button onClick={openAddProject} className="w-full p-4 rounded-lg border border-dashed transition-all hover:bg-white/5" style={{ borderColor: "rgba(255, 255, 255, 0.08)", fontFamily: "'Outfit', sans-serif", fontSize: "14px", fontWeight: 500, color: "#7E7E98" }}>
                <Plus size={16} className="inline mr-2" />Add Project
              </button>
            )}
          </div>
        )}

        {/* PREFERENCES TAB */}
        {activeTab === "Preferences" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold" style={{ fontFamily: "'Outfit', sans-serif", color: "#E8E8F0" }}>Job Search Preferences</h3>
              {!prefsEditing && (
                <button onClick={openPrefsEdit} className="px-3 py-1.5 rounded-lg border transition-all hover:bg-white/5" style={{ borderColor: "rgba(255, 255, 255, 0.08)", fontFamily: "'Outfit', sans-serif", fontSize: "13px", color: "#7E7E98" }}>
                  <Edit2 size={14} className="inline mr-1" />Edit
                </button>
              )}
            </div>
            {prefsEditing ? (
              <div className="space-y-4 p-6 rounded-lg border" style={{ background: "rgba(15, 15, 24, 0.7)", borderColor: "rgba(255, 255, 255, 0.04)" }}>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label style={labelStyle}>Min Salary ($/year)</label>
                    <input type="number" value={prefsForm.salaryMin} onChange={(e) => setPrefsForm({ ...prefsForm, salaryMin: e.target.value })} placeholder="e.g. 80000" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Max Salary ($/year)</label>
                    <input type="number" value={prefsForm.salaryMax} onChange={(e) => setPrefsForm({ ...prefsForm, salaryMax: e.target.value })} placeholder="e.g. 150000" style={inputStyle} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Remote Preference</label>
                  <select
                    value={prefsForm.remotePreference}
                    onChange={(e) => setPrefsForm({ ...prefsForm, remotePreference: e.target.value })}
                    style={{ ...inputStyle, cursor: "pointer" }}
                  >
                    <option value="any">Any</option>
                    <option value="remote">Remote Only</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="onsite">On-site Only</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Preferred Locations (comma separated)</label>
                  <input type="text" value={prefsForm.locations} onChange={(e) => setPrefsForm({ ...prefsForm, locations: e.target.value })} placeholder="e.g. New York, San Francisco, Remote" style={inputStyle} />
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={savePrefs} disabled={updatePreferencesMutation.isPending} className="px-4 py-2 rounded-lg bg-[#00FFE0] text-[#050508] font-medium disabled:opacity-50" style={{ fontFamily: "'Outfit', sans-serif" }}>
                    <Save size={16} className="inline mr-1" />{updatePreferencesMutation.isPending ? "Saving..." : "Save"}
                  </button>
                  <button onClick={() => setPrefsEditing(false)} className="px-4 py-2 rounded-lg border hover:bg-white/5" style={{ borderColor: "rgba(255, 255, 255, 0.08)", color: "#7E7E98", fontFamily: "'Outfit', sans-serif" }}>Cancel</button>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-lg border" style={{ background: "rgba(15, 15, 24, 0.7)", borderColor: "rgba(255, 255, 255, 0.04)" }}>
                <div className="space-y-3">
                  <div className="flex justify-between"><span className="text-sm text-[#7E7E98]">Salary Range</span><span className="text-sm text-[#E8E8F0]">
                    {preferences.salaryMin || preferences.salaryMax
                      ? `$${preferences.salaryMin || 0} – $${preferences.salaryMax || "∞"}`
                      : "Not set"}
                  </span></div>
                  <div className="flex justify-between"><span className="text-sm text-[#7E7E98]">Remote Preference</span><span className="text-sm text-[#E8E8F0]">{(preferences.remotePreference as string) || "Any"}</span></div>
                  <div className="flex justify-between"><span className="text-sm text-[#7E7E98]">Locations</span><span className="text-sm text-[#E8E8F0]">{((preferences.locations as string[]) || []).join(", ") || "Not specified"}</span></div>
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* MODALS */}
      <Modal open={editProfileOpen} onClose={() => setEditProfileOpen(false)} title="Edit Profile">
        <div className="space-y-4">
          <div><label style={labelStyle}>Full Name</label><input type="text" value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} style={inputStyle} /></div>
          <div><label style={labelStyle}>Job Title / Headline</label><input type="text" value={profileForm.headline} onChange={(e) => setProfileForm({ ...profileForm, headline: e.target.value })} placeholder="e.g. Senior Software Engineer" style={inputStyle} /></div>
          <div><label style={labelStyle}>Location</label><input type="text" value={profileForm.location} onChange={(e) => setProfileForm({ ...profileForm, location: e.target.value })} placeholder="e.g. New York, NY" style={inputStyle} /></div>
          <div><label style={labelStyle}>Phone</label><input type="text" value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} placeholder="e.g. +1 (555) 123-4567" style={inputStyle} /></div>
          <div><label style={labelStyle}>Professional Summary</label><textarea value={profileForm.summary} onChange={(e) => setProfileForm({ ...profileForm, summary: e.target.value })} rows={4} placeholder="Brief professional summary..." style={{ ...inputStyle, resize: "none" as const }} /></div>
          <div className="flex gap-2 pt-2">
            <button onClick={saveProfile} disabled={updateProfileMutation.isPending} className="flex-1 px-4 py-2.5 rounded-lg bg-[#00FFE0] text-[#050508] font-medium disabled:opacity-50" style={{ fontFamily: "'Outfit', sans-serif" }}>
              {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
            </button>
            <button onClick={() => setEditProfileOpen(false)} className="px-4 py-2.5 rounded-lg border hover:bg-white/5" style={{ borderColor: "rgba(255, 255, 255, 0.08)", color: "#7E7E98" }}>Cancel</button>
          </div>
        </div>
      </Modal>

      <Modal open={addExpOpen} onClose={() => setAddExpOpen(false)} title={editExpId ? "Edit Experience" : "Add Experience"}>
        <div className="space-y-4">
          <div><label style={labelStyle}>Job Title / Role</label><input type="text" value={expForm.role} onChange={(e) => setExpForm({ ...expForm, role: e.target.value })} placeholder="e.g. Software Engineer" style={inputStyle} /></div>
          <div><label style={labelStyle}>Company</label><input type="text" value={expForm.company} onChange={(e) => setExpForm({ ...expForm, company: e.target.value })} placeholder="e.g. Google" style={inputStyle} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label style={labelStyle}>Start Date</label><input type="text" value={expForm.startDate} onChange={(e) => setExpForm({ ...expForm, startDate: e.target.value })} placeholder="e.g. 2022-01-01" style={inputStyle} /></div>
            <div><label style={labelStyle}>End Date</label><input type="text" value={expForm.endDate} onChange={(e) => setExpForm({ ...expForm, endDate: e.target.value })} placeholder="Leave blank if current" style={inputStyle} disabled={expForm.current} /></div>
          </div>
          <div>
            <label className="flex items-center gap-2 cursor-pointer" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: "#7E7E98" }}>
              <input type="checkbox" checked={expForm.current} onChange={(e) => setExpForm({ ...expForm, current: e.target.checked, endDate: e.target.checked ? "" : expForm.endDate })} className="accent-[#00FFE0]" />
              I currently work here
            </label>
          </div>
          <div><label style={labelStyle}>Description</label><textarea value={expForm.description} onChange={(e) => setExpForm({ ...expForm, description: e.target.value })} rows={3} placeholder="Brief description of your role..." style={{ ...inputStyle, resize: "none" as const }} /></div>
          <div><label style={labelStyle}>Key Bullets (one per line)</label><textarea value={expForm.bullets} onChange={(e) => setExpForm({ ...expForm, bullets: e.target.value })} rows={3} placeholder={"Increased revenue by 20%\nLed team of 5 engineers"} style={{ ...inputStyle, resize: "none" as const }} /></div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={saveExp}
              disabled={anyMutationPending || !expForm.role || !expForm.company}
              className="flex-1 px-4 py-2.5 rounded-lg bg-[#00FFE0] text-[#050508] font-medium disabled:opacity-50"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              {anyMutationPending ? "Saving..." : editExpId ? "Update" : "Add Experience"}
            </button>
            <button onClick={() => setAddExpOpen(false)} className="px-4 py-2.5 rounded-lg border hover:bg-white/5" style={{ borderColor: "rgba(255, 255, 255, 0.08)", color: "#7E7E98" }}>Cancel</button>
          </div>
        </div>
      </Modal>

      <Modal open={addEduOpen} onClose={() => setAddEduOpen(false)} title="Add Education">
        <div className="space-y-4">
          <div><label style={labelStyle}>Institution</label><input type="text" value={eduForm.institution} onChange={(e) => setEduForm({ ...eduForm, institution: e.target.value })} placeholder="e.g. MIT" style={inputStyle} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label style={labelStyle}>Degree</label><input type="text" value={eduForm.degree} onChange={(e) => setEduForm({ ...eduForm, degree: e.target.value })} placeholder="e.g. Bachelor's" style={inputStyle} /></div>
            <div><label style={labelStyle}>Field of Study</label><input type="text" value={eduForm.field} onChange={(e) => setEduForm({ ...eduForm, field: e.target.value })} placeholder="e.g. Computer Science" style={inputStyle} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label style={labelStyle}>Start Date</label><input type="text" value={eduForm.startDate} onChange={(e) => setEduForm({ ...eduForm, startDate: e.target.value })} placeholder="e.g. 2018-09-01" style={inputStyle} /></div>
            <div><label style={labelStyle}>End Date</label><input type="text" value={eduForm.endDate} onChange={(e) => setEduForm({ ...eduForm, endDate: e.target.value })} placeholder="e.g. 2022-05-01" style={inputStyle} /></div>
          </div>
          <div><label style={labelStyle}>GPA (optional)</label><input type="text" value={eduForm.gpa} onChange={(e) => setEduForm({ ...eduForm, gpa: e.target.value })} placeholder="e.g. 3.8" style={inputStyle} /></div>
          <div className="flex gap-2 pt-2">
            <button onClick={saveEdu} disabled={addEducationMutation.isPending || !eduForm.institution || !eduForm.degree} className="flex-1 px-4 py-2.5 rounded-lg bg-[#00FFE0] text-[#050508] font-medium disabled:opacity-50" style={{ fontFamily: "'Outfit', sans-serif" }}>
              {addEducationMutation.isPending ? "Saving..." : "Add Education"}
            </button>
            <button onClick={() => setAddEduOpen(false)} className="px-4 py-2.5 rounded-lg border hover:bg-white/5" style={{ borderColor: "rgba(255, 255, 255, 0.08)", color: "#7E7E98" }}>Cancel</button>
          </div>
        </div>
      </Modal>

      <Modal open={addProjectOpen} onClose={() => setAddProjectOpen(false)} title="Add Project">
        <div className="space-y-4">
          <div><label style={labelStyle}>Project Name</label><input type="text" value={projectForm.name} onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })} placeholder="e.g. AutoApply" style={inputStyle} /></div>
          <div><label style={labelStyle}>Description</label><textarea value={projectForm.description} onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })} rows={3} placeholder="Brief description of the project..." style={{ ...inputStyle, resize: "none" as const }} /></div>
          <div><label style={labelStyle}>URL (optional)</label><input type="text" value={projectForm.url} onChange={(e) => setProjectForm({ ...projectForm, url: e.target.value })} placeholder="https://github.com/..." style={inputStyle} /></div>
          <div><label style={labelStyle}>Technologies (comma separated)</label><input type="text" value={projectForm.technologies} onChange={(e) => setProjectForm({ ...projectForm, technologies: e.target.value })} placeholder="e.g. React, TypeScript, Node.js" style={inputStyle} /></div>
          <div className="flex gap-2 pt-2">
            <button onClick={saveProject} disabled={updateProfileMutation.isPending || !projectForm.name} className="flex-1 px-4 py-2.5 rounded-lg bg-[#00FFE0] text-[#050508] font-medium disabled:opacity-50" style={{ fontFamily: "'Outfit', sans-serif" }}>
              {updateProfileMutation.isPending ? "Saving..." : "Add Project"}
            </button>
            <button onClick={() => setAddProjectOpen(false)} className="px-4 py-2.5 rounded-lg border hover:bg-white/5" style={{ borderColor: "rgba(255, 255, 255, 0.08)", color: "#7E7E98" }}>Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
