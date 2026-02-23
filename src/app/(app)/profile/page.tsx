"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Edit2, Trash2, Plus, X, Save, GraduationCap, FolderGit2, ExternalLink } from "lucide-react";
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
  const [editExpIndex, setEditExpIndex] = useState<number | null>(null);
  const [addEduOpen, setAddEduOpen] = useState(false);
  const [addProjectOpen, setAddProjectOpen] = useState(false);
  const [skillInput, setSkillInput] = useState("");

  // Form states
  const [profileForm, setProfileForm] = useState({ fullName: "", title: "", location: "", phone: "", summary: "" });
  const [expForm, setExpForm] = useState({ title: "", company: "", startDate: "", endDate: "", description: "", achievements: "" });
  const [eduForm, setEduForm] = useState({ institution: "", degree: "", field: "", startDate: "", endDate: "", gpa: "" });
  const [projectForm, setProjectForm] = useState({ name: "", description: "", url: "", technologies: "" });
  const [prefsForm, setPrefsForm] = useState({ targetSalary: "", remoteOnly: false, locations: "" });
  const [prefsEditing, setPrefsEditing] = useState(false);

  const queryClient = useQueryClient();

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

  const profileInner = (profileData as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
  const profile = (profileInner?.profile || profileInner) as Record<string, unknown> | undefined;
  const personalInfo = profile?.personalInfo as Record<string, string> | undefined;
  const jobPreferences = profile?.jobPreferences as Record<string, unknown> | undefined;
  const completenessInner = (completenessData as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
  const completeness = (completenessInner || {}) as Record<string, unknown>;
  const profileCompletion = (completeness.percentage as number) || 0;
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (profileCompletion / 100) * circumference;
  const suggestions = (completeness.suggestions as Array<Record<string, unknown>>) || [];
  const experiences = (profile?.experience as Array<Record<string, unknown>>) || [];
  const education = (profile?.education as Array<Record<string, unknown>>) || [];
  const projects = (profile?.projects as Array<Record<string, unknown>>) || [];
  const skills = (profile?.skills as Array<Record<string, unknown> | string>) || [];

  const updateProfile = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiFetch("/api/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["profile"] }); queryClient.invalidateQueries({ queryKey: ["profileCompleteness"] }); },
  });

  const updateSkills = useMutation({
    mutationFn: (data: { skills: Array<Record<string, string>> }) => apiFetch("/api/profile/skills", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["profile"] }); queryClient.invalidateQueries({ queryKey: ["profileCompleteness"] }); },
  });

  const updatePreferences = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiFetch("/api/profile/preferences", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["profile"] }); },
  });

  const openEditProfile = () => {
    setProfileForm({
      fullName: personalInfo?.fullName || "",
      title: personalInfo?.title || "",
      location: personalInfo?.location || "",
      phone: personalInfo?.phone || "",
      summary: (profile?.summary as string) || "",
    });
    setEditProfileOpen(true);
  };

  const saveProfile = () => {
    updateProfile.mutate({
      personalInfo: { fullName: profileForm.fullName, title: profileForm.title, location: profileForm.location, phone: profileForm.phone, email: personalInfo?.email },
      summary: profileForm.summary,
    });
    setEditProfileOpen(false);
  };

  const openAddExp = () => {
    setExpForm({ title: "", company: "", startDate: "", endDate: "", description: "", achievements: "" });
    setEditExpIndex(null);
    setAddExpOpen(true);
  };

  const openEditExp = (index: number) => {
    const exp = experiences[index];
    setExpForm({
      title: (exp.title as string) || "",
      company: (exp.company as string) || "",
      startDate: (exp.startDate as string) || "",
      endDate: (exp.endDate as string) || "",
      description: (exp.description as string) || "",
      achievements: ((exp.achievements as string[]) || []).join("\n"),
    });
    setEditExpIndex(index);
    setAddExpOpen(true);
  };

  const saveExp = () => {
    const newExp = {
      title: expForm.title,
      company: expForm.company,
      startDate: expForm.startDate,
      endDate: expForm.endDate || null,
      description: expForm.description,
      achievements: expForm.achievements.split("\n").filter((a) => a.trim()),
    };
    const updated = [...experiences];
    if (editExpIndex !== null) {
      updated[editExpIndex] = newExp;
    } else {
      updated.push(newExp);
    }
    updateProfile.mutate({ experience: updated });
    setAddExpOpen(false);
  };

  const deleteExp = (index: number) => {
    if (!confirm("Delete this experience?")) return;
    const updated = experiences.filter((_, i) => i !== index);
    updateProfile.mutate({ experience: updated });
  };

  const openAddEdu = () => {
    setEduForm({ institution: "", degree: "", field: "", startDate: "", endDate: "", gpa: "" });
    setAddEduOpen(true);
  };

  const saveEdu = () => {
    const newEdu = { institution: eduForm.institution, degree: eduForm.degree, field: eduForm.field, startDate: eduForm.startDate, endDate: eduForm.endDate, gpa: eduForm.gpa || undefined };
    updateProfile.mutate({ education: [...education, newEdu] });
    setAddEduOpen(false);
  };

  const deleteEdu = (index: number) => {
    if (!confirm("Delete this education entry?")) return;
    updateProfile.mutate({ education: education.filter((_, i) => i !== index) });
  };

  const openAddProject = () => {
    setProjectForm({ name: "", description: "", url: "", technologies: "" });
    setAddProjectOpen(true);
  };

  const saveProject = () => {
    const newProject = { name: projectForm.name, description: projectForm.description, url: projectForm.url || undefined, technologies: projectForm.technologies.split(",").map((t) => t.trim()).filter(Boolean) };
    updateProfile.mutate({ projects: [...projects, newProject] });
    setAddProjectOpen(false);
  };

  const deleteProject = (index: number) => {
    if (!confirm("Delete this project?")) return;
    updateProfile.mutate({ projects: projects.filter((_, i) => i !== index) });
  };

  const addSkill = () => {
    if (!skillInput.trim()) return;
    const current = skills.map((s) => typeof s === "string" ? { name: s, level: "intermediate" } : { name: (s.name as string) || "", level: (s.level as string) || "intermediate" });
    current.push({ name: skillInput.trim(), level: "intermediate" });
    updateSkills.mutate({ skills: current });
    setSkillInput("");
  };

  const removeSkill = (index: number) => {
    const current = skills.map((s) => typeof s === "string" ? { name: s, level: "intermediate" } : { name: (s.name as string) || "", level: (s.level as string) || "intermediate" });
    current.splice(index, 1);
    updateSkills.mutate({ skills: current });
  };

  const openPrefsEdit = () => {
    setPrefsForm({
      targetSalary: (jobPreferences?.targetSalary as string) || "",
      remoteOnly: (jobPreferences?.remoteOnly as boolean) || false,
      locations: ((jobPreferences?.locations as string[]) || []).join(", "),
    });
    setPrefsEditing(true);
  };

  const savePrefs = () => {
    updatePreferences.mutate({
      targetSalary: prefsForm.targetSalary,
      remoteOnly: prefsForm.remoteOnly,
      locations: prefsForm.locations.split(",").map((l) => l.trim()).filter(Boolean),
    });
    setPrefsEditing(false);
  };

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
                {personalInfo?.fullName || "User"}
              </h1>
              <p className="text-[15px] mb-1" style={{ fontFamily: "'DM Sans', sans-serif", color: "#7E7E98" }}>
                {personalInfo?.title || "Professional"} · {personalInfo?.location || "Location"}
              </p>
              <p className="text-[13px] mb-3" style={{ fontFamily: "'DM Sans', sans-serif", color: "#4A4A64" }}>
                {personalInfo?.email} · {personalInfo?.phone || "+1 (555) 000-0000"}
              </p>
              <p className="text-sm mb-4 max-w-2xl leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif", color: "#7E7E98" }}>
                {(profile?.summary as string) || "Add a professional summary to your profile."}
              </p>
            </>
          )}
          <button onClick={openEditProfile} className="px-4 py-2 rounded-lg border transition-all hover:bg-white/5" style={{ background: "transparent", borderColor: "rgba(255, 255, 255, 0.08)", fontFamily: "'Outfit', sans-serif", fontSize: "13px", fontWeight: 500, color: "#7E7E98" }}>
            Edit Profile
          </button>
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
                <div key={index} className="p-6 rounded-lg border" style={{ background: "rgba(15, 15, 24, 0.7)", backdropFilter: "blur(12px)", borderColor: "rgba(255, 255, 255, 0.04)" }}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-semibold mb-1" style={{ fontFamily: "'Outfit', sans-serif", color: "#E8E8F0" }}>{exp.title as string}</h3>
                      <p className="text-[15px] mb-2" style={{ fontFamily: "'DM Sans', sans-serif", color: "#7E7E98" }}>
                        {exp.company as string} · {exp.startDate as string} — {(exp.endDate as string) || "Present"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => openEditExp(index)} className="p-2 hover:bg-white/5 rounded-lg transition-colors"><Edit2 size={16} className="text-[#7E7E98]" /></button>
                      <button onClick={() => deleteExp(index)} className="p-2 hover:bg-white/5 rounded-lg transition-colors"><Trash2 size={16} className="text-[#7E7E98]" /></button>
                    </div>
                  </div>
                  <p className="text-sm mb-3 leading-relaxed" style={{ fontFamily: "'DM Sans', sans-serif", color: "#7E7E98" }}>{exp.description as string}</p>
                  {(exp.achievements as string[])?.length > 0 && (
                    <ul className="space-y-2">
                      {(exp.achievements as string[]).map((achievement: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-sm" style={{ fontFamily: "'DM Sans', sans-serif", color: "#7E7E98" }}>
                          <span className="text-[#00FFE0] mt-1">•</span><span>{achievement}</span>
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
                <div key={index} className="p-6 rounded-lg border" style={{ background: "rgba(15, 15, 24, 0.7)", backdropFilter: "blur(12px)", borderColor: "rgba(255, 255, 255, 0.04)" }}>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold mb-1" style={{ fontFamily: "'Outfit', sans-serif", color: "#E8E8F0" }}>{edu.degree as string} in {edu.field as string}</h3>
                      <p className="text-[15px] mb-1" style={{ fontFamily: "'DM Sans', sans-serif", color: "#7E7E98" }}>{edu.institution as string}</p>
                      <p className="text-[13px]" style={{ fontFamily: "'IBM Plex Mono', monospace", color: "#4A4A64" }}>
                        {edu.startDate as string} — {(edu.endDate as string) || "Present"}{edu.gpa ? ` · GPA: ${edu.gpa}` : ""}
                      </p>
                    </div>
                    <button onClick={() => deleteEdu(index)} className="p-2 hover:bg-white/5 rounded-lg transition-colors"><Trash2 size={16} className="text-[#7E7E98]" /></button>
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
                    {typeof skill === "string" ? skill : (skill.name as string)}
                    {typeof skill !== "string" && skill.level ? ` · ${String(skill.level)}` : null}
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
                <div key={index} className="p-6 rounded-lg border" style={{ background: "rgba(15, 15, 24, 0.7)", backdropFilter: "blur(12px)", borderColor: "rgba(255, 255, 255, 0.04)" }}>
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
                <div>
                  <label style={labelStyle}>Target Salary</label>
                  <input type="text" value={prefsForm.targetSalary} onChange={(e) => setPrefsForm({ ...prefsForm, targetSalary: e.target.value })} placeholder="e.g. $120,000" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Remote Only</label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={prefsForm.remoteOnly} onChange={(e) => setPrefsForm({ ...prefsForm, remoteOnly: e.target.checked })} className="accent-[#00FFE0]" />
                    <span className="text-sm text-[#E8E8F0]">Only show remote positions</span>
                  </label>
                </div>
                <div>
                  <label style={labelStyle}>Preferred Locations (comma separated)</label>
                  <input type="text" value={prefsForm.locations} onChange={(e) => setPrefsForm({ ...prefsForm, locations: e.target.value })} placeholder="e.g. New York, San Francisco, Remote" style={inputStyle} />
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={savePrefs} className="px-4 py-2 rounded-lg bg-[#00FFE0] text-[#050508] font-medium" style={{ fontFamily: "'Outfit', sans-serif" }}>
                    <Save size={16} className="inline mr-1" />Save
                  </button>
                  <button onClick={() => setPrefsEditing(false)} className="px-4 py-2 rounded-lg border hover:bg-white/5" style={{ borderColor: "rgba(255, 255, 255, 0.08)", color: "#7E7E98", fontFamily: "'Outfit', sans-serif" }}>Cancel</button>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-lg border" style={{ background: "rgba(15, 15, 24, 0.7)", borderColor: "rgba(255, 255, 255, 0.04)" }}>
                <div className="space-y-3">
                  <div className="flex justify-between"><span className="text-sm text-[#7E7E98]">Target Salary</span><span className="text-sm text-[#E8E8F0]">{(jobPreferences?.targetSalary as string) || "Not set"}</span></div>
                  <div className="flex justify-between"><span className="text-sm text-[#7E7E98]">Remote</span><span className="text-sm text-[#E8E8F0]">{jobPreferences?.remoteOnly ? "Remote Only" : "Flexible"}</span></div>
                  <div className="flex justify-between"><span className="text-sm text-[#7E7E98]">Locations</span><span className="text-sm text-[#E8E8F0]">{((jobPreferences?.locations as string[]) || []).join(", ") || "Not specified"}</span></div>
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* MODALS */}
      <Modal open={editProfileOpen} onClose={() => setEditProfileOpen(false)} title="Edit Profile">
        <div className="space-y-4">
          <div><label style={labelStyle}>Full Name</label><input type="text" value={profileForm.fullName} onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })} style={inputStyle} /></div>
          <div><label style={labelStyle}>Job Title</label><input type="text" value={profileForm.title} onChange={(e) => setProfileForm({ ...profileForm, title: e.target.value })} placeholder="e.g. Senior Software Engineer" style={inputStyle} /></div>
          <div><label style={labelStyle}>Location</label><input type="text" value={profileForm.location} onChange={(e) => setProfileForm({ ...profileForm, location: e.target.value })} placeholder="e.g. New York, NY" style={inputStyle} /></div>
          <div><label style={labelStyle}>Phone</label><input type="text" value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} placeholder="e.g. +1 (555) 123-4567" style={inputStyle} /></div>
          <div><label style={labelStyle}>Professional Summary</label><textarea value={profileForm.summary} onChange={(e) => setProfileForm({ ...profileForm, summary: e.target.value })} rows={4} placeholder="Brief professional summary..." style={{ ...inputStyle, resize: "none" as const }} /></div>
          <div className="flex gap-2 pt-2">
            <button onClick={saveProfile} disabled={updateProfile.isPending} className="flex-1 px-4 py-2.5 rounded-lg bg-[#00FFE0] text-[#050508] font-medium disabled:opacity-50" style={{ fontFamily: "'Outfit', sans-serif" }}>
              {updateProfile.isPending ? "Saving..." : "Save Changes"}
            </button>
            <button onClick={() => setEditProfileOpen(false)} className="px-4 py-2.5 rounded-lg border hover:bg-white/5" style={{ borderColor: "rgba(255, 255, 255, 0.08)", color: "#7E7E98" }}>Cancel</button>
          </div>
        </div>
      </Modal>

      <Modal open={addExpOpen} onClose={() => setAddExpOpen(false)} title={editExpIndex !== null ? "Edit Experience" : "Add Experience"}>
        <div className="space-y-4">
          <div><label style={labelStyle}>Job Title</label><input type="text" value={expForm.title} onChange={(e) => setExpForm({ ...expForm, title: e.target.value })} placeholder="e.g. Software Engineer" style={inputStyle} /></div>
          <div><label style={labelStyle}>Company</label><input type="text" value={expForm.company} onChange={(e) => setExpForm({ ...expForm, company: e.target.value })} placeholder="e.g. Google" style={inputStyle} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label style={labelStyle}>Start Date</label><input type="text" value={expForm.startDate} onChange={(e) => setExpForm({ ...expForm, startDate: e.target.value })} placeholder="e.g. Jan 2022" style={inputStyle} /></div>
            <div><label style={labelStyle}>End Date</label><input type="text" value={expForm.endDate} onChange={(e) => setExpForm({ ...expForm, endDate: e.target.value })} placeholder="Present" style={inputStyle} /></div>
          </div>
          <div><label style={labelStyle}>Description</label><textarea value={expForm.description} onChange={(e) => setExpForm({ ...expForm, description: e.target.value })} rows={3} placeholder="Brief description of your role..." style={{ ...inputStyle, resize: "none" as const }} /></div>
          <div><label style={labelStyle}>Key Achievements (one per line)</label><textarea value={expForm.achievements} onChange={(e) => setExpForm({ ...expForm, achievements: e.target.value })} rows={3} placeholder="Increased revenue by 20%&#10;Led team of 5 engineers" style={{ ...inputStyle, resize: "none" as const }} /></div>
          <div className="flex gap-2 pt-2">
            <button onClick={saveExp} disabled={updateProfile.isPending || !expForm.title || !expForm.company} className="flex-1 px-4 py-2.5 rounded-lg bg-[#00FFE0] text-[#050508] font-medium disabled:opacity-50" style={{ fontFamily: "'Outfit', sans-serif" }}>
              {updateProfile.isPending ? "Saving..." : editExpIndex !== null ? "Update" : "Add Experience"}
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
            <div><label style={labelStyle}>Start Date</label><input type="text" value={eduForm.startDate} onChange={(e) => setEduForm({ ...eduForm, startDate: e.target.value })} placeholder="e.g. 2018" style={inputStyle} /></div>
            <div><label style={labelStyle}>End Date</label><input type="text" value={eduForm.endDate} onChange={(e) => setEduForm({ ...eduForm, endDate: e.target.value })} placeholder="e.g. 2022" style={inputStyle} /></div>
          </div>
          <div><label style={labelStyle}>GPA (optional)</label><input type="text" value={eduForm.gpa} onChange={(e) => setEduForm({ ...eduForm, gpa: e.target.value })} placeholder="e.g. 3.8" style={inputStyle} /></div>
          <div className="flex gap-2 pt-2">
            <button onClick={saveEdu} disabled={updateProfile.isPending || !eduForm.institution || !eduForm.degree} className="flex-1 px-4 py-2.5 rounded-lg bg-[#00FFE0] text-[#050508] font-medium disabled:opacity-50" style={{ fontFamily: "'Outfit', sans-serif" }}>
              {updateProfile.isPending ? "Saving..." : "Add Education"}
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
            <button onClick={saveProject} disabled={updateProfile.isPending || !projectForm.name} className="flex-1 px-4 py-2.5 rounded-lg bg-[#00FFE0] text-[#050508] font-medium disabled:opacity-50" style={{ fontFamily: "'Outfit', sans-serif" }}>
              {updateProfile.isPending ? "Saving..." : "Add Project"}
            </button>
            <button onClick={() => setAddProjectOpen(false)} className="px-4 py-2.5 rounded-lg border hover:bg-white/5" style={{ borderColor: "rgba(255, 255, 255, 0.08)", color: "#7E7E98" }}>Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
