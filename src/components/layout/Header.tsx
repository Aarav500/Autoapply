"use client";

import { Bell, Search, Zap, Sun, Moon } from "lucide-react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

interface HeaderProps {
  unreadNotifications?: number;
  onSearchClick?: () => void;
  onNotificationClick?: () => void;
  onAvatarClick?: () => void;
  userName?: string;
  isDark?: boolean;
  onThemeToggle?: () => void;
}

const PAGE_TITLES: Record<string, { title: string; description?: string }> = {
  "/dashboard":         { title: "Dashboard",             description: "Career command center" },
  "/profile":           { title: "Profile",               description: "Professional info & resume" },
  "/jobs":              { title: "Jobs",                  description: "Search, save & auto-apply" },
  "/pipeline":          { title: "Pipeline",              description: "Application Kanban board" },
  "/documents":         { title: "Documents",             description: "CVs, cover letters & more" },
  "/comms":             { title: "Messages",              description: "Email & notifications" },
  "/interview":         { title: "Interviews",            description: "Prep & track interviews" },
  "/recruiter-prep":    { title: "Recruiter Prep",        description: "Phone screen mastery" },
  "/warroom":           { title: "War Room",              description: "FAANG interview strategy" },
  "/job-alerts":        { title: "Job Alerts",            description: "Custom alert rules" },
  "/settings":          { title: "Settings",              description: "Configure AutoApply" },
  "/optimize/github":   { title: "GitHub Optimizer",      description: "AI-powered profile boost" },
  "/optimize/linkedin": { title: "LinkedIn Optimizer",    description: "AI-powered profile boost" },
  "/linkedin-tools":    { title: "LinkedIn Toolkit",      description: "Posts, network & growth" },
  "/portfolio":         { title: "Portfolio",             description: "Showcase your projects" },
  "/salary":            { title: "Salary Coach",          description: "Research & negotiate" },
  "/offers":            { title: "Offer Comparison",      description: "Side-by-side offer analysis" },
  "/offer-letter":      { title: "Offer Analyzer",        description: "Red flags & negotiation" },
  "/skills-gap":        { title: "Skills Gap",            description: "What to learn next" },
  "/career":            { title: "Career Path",           description: "Long-term growth map" },
  "/cert-roi":          { title: "Cert ROI",              description: "Certification value analysis" },
  "/market":            { title: "Market Intel",          description: "Hiring trends & salaries" },
  "/referral":          { title: "Referral Finder",       description: "Connections at target companies" },
  "/accountability":    { title: "Accountability",        description: "Goals & streaks" },
  "/burnout":           { title: "Burnout Tracker",       description: "Wellbeing & pacing" },
  "/networking":        { title: "Networking CRM",        description: "Track your connections" },
  "/outreach":          { title: "Cold Outreach",         description: "AI-crafted intro messages" },
  "/references":        { title: "References",            description: "Manage recommenders" },
  "/bgcheck":           { title: "BGCheck Prep",          description: "Background check readiness" },
  "/peer-review":       { title: "Peer Review",           description: "Get feedback on applications" },
  "/company-research":  { title: "Company Research",      description: "Deep-dive company intelligence" },
  "/greencard":         { title: "Green Card",            description: "Immigration pathways" },
  "/research":          { title: "Research Hub",          description: "Publications & academic tools" },
  "/mentor":            { title: "AI Mentor",             description: "Personalised career coaching" },
  "/startup":           { title: "Startup Lab",           description: "Ideas, research & validation" },
  "/saved":             { title: "Saved Content",         description: "Resources, tools & bookmarks" },
  "/flashcards":        { title: "Interview Flashcards",  description: "Spaced repetition practice" },
  "/relocate":          { title: "Relocation Calculator", description: "Cost-of-living salary adjustment" },
  "/trends":            { title: "Skill Trends",          description: "In-demand skills & emerging roles" },
};

export function Header({
  unreadNotifications = 0,
  onSearchClick,
  onNotificationClick,
  userName,
  isDark = true,
  onThemeToggle,
}: HeaderProps) {
  const pathname = usePathname();

  const pageInfo = pathname
    ? PAGE_TITLES[pathname] ??
      PAGE_TITLES[Object.keys(PAGE_TITLES).find((k) => pathname.startsWith(k)) ?? ""] ??
      { title: "AutoApply" }
    : { title: "AutoApply" };

  const initials = userName
    ? userName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "A";

  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between px-6"
      style={{
        height: 54,
        background: "rgba(6, 6, 8, 0.88)",
        backdropFilter: "blur(24px) saturate(160%)",
        WebkitBackdropFilter: "blur(24px) saturate(160%)",
        borderBottom: "1px solid rgba(255,255,255,0.055)",
      }}
    >
      {/* LEFT — breadcrumb */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="flex items-center gap-2">
          <Zap size={12} style={{ color: "#7C3AED", flexShrink: 0 }} />
          <span className="text-[11px]" style={{ color: "#3A3A60" }}>
            AutoApply
          </span>
        </div>

        <span style={{ color: "#1E1E30", fontSize: 13 }}>/</span>

        <motion.h1
          key={pathname}
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
          className="text-[14px] font-semibold truncate"
          style={{ color: "#F0F0FF" }}
        >
          {pageInfo.title}
        </motion.h1>

        {pageInfo.description && (
          <motion.span
            key={`desc-${pathname}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25, delay: 0.05 }}
            className="hidden md:block text-[12px]"
            style={{ color: "#3A3A60" }}
          >
            · {pageInfo.description}
          </motion.span>
        )}
      </div>

      {/* RIGHT — actions */}
      <div className="flex items-center gap-1.5">
        {/* Search pill */}
        <button
          onClick={onSearchClick}
          className="flex items-center gap-2 h-[30px] px-3 rounded-[8px] transition-all duration-150"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
            color: "#3A3A60",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)";
            (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.10)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
            (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)";
          }}
        >
          <Search size={11} />
          <span className="text-[12px]" style={{ color: "#3A3A60" }}>Search</span>
          <kbd
            className="text-[9px] px-1.5 py-0.5 rounded ml-1"
            style={{
              background: "rgba(255,255,255,0.06)",
              color: "#2A2A50",
              fontFamily: "monospace",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            ⌘K
          </kbd>
        </button>

        {/* Theme toggle */}
        <button
          onClick={onThemeToggle}
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          className="w-[30px] h-[30px] flex items-center justify-center rounded-[8px] transition-all duration-150"
          style={{ color: "#3A3A60" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
            (e.currentTarget as HTMLElement).style.color = "#9090B8";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
            (e.currentTarget as HTMLElement).style.color = "#3A3A60";
          }}
        >
          {isDark ? <Sun size={14} strokeWidth={1.75} /> : <Moon size={14} strokeWidth={1.75} />}
        </button>

        {/* Notification bell */}
        <button
          onClick={onNotificationClick}
          className="relative w-[30px] h-[30px] flex items-center justify-center rounded-[8px] transition-all duration-150"
          style={{ color: "#3A3A60" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
            (e.currentTarget as HTMLElement).style.color = "#9090B8";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
            (e.currentTarget as HTMLElement).style.color = "#3A3A60";
          }}
        >
          <Bell size={14} strokeWidth={1.75} />
          {unreadNotifications > 0 && (
            <span
              className="absolute top-[6px] right-[6px] w-[6px] h-[6px] rounded-full"
              style={{
                background: "#7C3AED",
                boxShadow: "0 0 6px rgba(124,58,237,0.7)",
              }}
            />
          )}
        </button>

        {/* Separator */}
        <div className="w-px h-4 mx-0.5" style={{ background: "rgba(255,255,255,0.07)" }} />

        {/* Avatar */}
        <div
          className="w-7 h-7 rounded-[7px] flex items-center justify-center text-[10px] font-bold cursor-pointer transition-all duration-150"
          style={{
            background: "linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)",
            color: "white",
            boxShadow: "0 2px 8px rgba(124,58,237,0.35)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 14px rgba(124,58,237,0.5)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(124,58,237,0.35)";
          }}
        >
          {initials}
        </div>
      </div>
    </header>
  );
}
