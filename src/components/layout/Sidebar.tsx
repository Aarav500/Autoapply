"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  User,
  Search,
  FileText,
  MessageSquare,
  Mic,
  Github,
  Linkedin,
  Settings,
  LogOut,
  FlaskConical,
  Compass,
  Flag,
  Bookmark,
  DollarSign,
  Users,
  Zap,
  ChevronRight,
  KanbanSquare,
  Brain,
  Network,
  TrendingUp,
  Scale,
  UserCheck,
  ShieldCheck,
  Send,
  Code2,
  Bell,
  FolderGit2,
  Shield,
  FileSearch,
  Building2,
  PhoneCall,
  Activity,
  BarChart2,
  GraduationCap,
  ClipboardList,
  Target,
  Command,
  X,
  MapPin,
  Layers,
} from "lucide-react";

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  href: string;
  active?: boolean;
  badge?: number;
  color?: string;
}

function NavItem({ icon: Icon, label, href, active = false, badge, color }: NavItemProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      href={href}
      className="relative flex items-center gap-2.5 h-[33px] px-3 rounded-[9px] w-full group"
      style={{
        background: active
          ? "rgba(124, 58, 237, 0.14)"
          : hovered
          ? "rgba(255, 255, 255, 0.04)"
          : "transparent",
        transition: "background 150ms ease",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Active bar */}
      <AnimatePresence>
        {active && (
          <motion.div
            layoutId="sidebar-active-bar"
            className="absolute left-0 top-[7px] bottom-[7px] w-[2px] rounded-r-full"
            style={{ background: "#8B5CF6" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 40 }}
          />
        )}
      </AnimatePresence>

      {/* Icon */}
      <Icon
        size={14}
        style={{
          color: active ? "#A78BFA" : color || "#3A3A60",
          flexShrink: 0,
          transition: "color 150ms ease",
        }}
      />

      {/* Label */}
      <span
        className="text-[13px] leading-none flex-1"
        style={{
          color: active ? "#A78BFA" : hovered ? "#9090B8" : "#4A4A70",
          fontWeight: active ? 500 : 400,
          transition: "color 150ms ease",
        }}
      >
        {label}
      </span>

      {/* Badge */}
      {badge && badge > 0 && (
        <span
          className="ml-auto min-w-[18px] h-[18px] px-1.5 rounded-full flex items-center justify-center text-[9px] font-semibold"
          style={{
            background: active ? "rgba(124,58,237,0.35)" : "rgba(255,255,255,0.08)",
            color: active ? "#A78BFA" : "#6060A0",
          }}
        >
          {badge}
        </span>
      )}
    </Link>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="px-3 pt-5 pb-1.5">
      <span className="section-label" style={{ color: "#2A2A50" }}>
        {label}
      </span>
    </div>
  );
}

interface SidebarProps {
  userEmail?: string;
  userName?: string;
  unreadNotifications?: number;
}

const SEARCH_ROUTES = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Jobs", href: "/jobs" },
  { label: "Pipeline", href: "/pipeline" },
  { label: "Profile", href: "/profile" },
  { label: "Documents", href: "/documents" },
  { label: "Comms", href: "/comms" },
  { label: "Interview Coach", href: "/interview" },
  { label: "Recruiter Prep", href: "/recruiter-prep" },
  { label: "Salary Coach", href: "/salary" },
  { label: "Offer Compare", href: "/offers" },
  { label: "GitHub Optimizer", href: "/optimize/github" },
  { label: "LinkedIn Optimizer", href: "/optimize/linkedin" },
  { label: "Skills Gap", href: "/skills-gap" },
  { label: "Career Path", href: "/career" },
  { label: "Research Hub", href: "/research" },
  { label: "Mentor AI", href: "/mentor" },
  { label: "Company Research", href: "/company-research" },
  { label: "Green Card", href: "/greencard" },
  { label: "Startup Tracker", href: "/startup" },
  { label: "Saved Content", href: "/saved" },
  { label: "Settings", href: "/settings" },
  { label: "War Room", href: "/warroom" },
  { label: "Job Alerts", href: "/job-alerts" },
  { label: "Networking CRM", href: "/networking" },
];

export function Sidebar({ userEmail: _userEmail, userName, unreadNotifications }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const searchResults = searchQuery.trim()
    ? SEARCH_ROUTES.filter((r) => r.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : SEARCH_ROUTES.slice(0, 8);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowSearch((v) => !v);
        setSearchQuery("");
      }
      if (e.key === "Escape") {
        setShowSearch(false);
        setSearchQuery("");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleSearchSelect = useCallback((href: string) => {
    router.push(href);
    setShowSearch(false);
    setSearchQuery("");
  }, [router]);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const initials = userName
    ? userName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "U";

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      router.push("/login");
    } catch {
      setLoggingOut(false);
    }
  };

  return (
    <motion.aside
      initial={{ x: -16, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="fixed left-0 top-0 h-full flex flex-col z-40"
      style={{
        width: 232,
        background: "var(--bg-surface)",
        borderRight: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      {/* Subtle violet glow in sidebar */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 120% 40% at -10% 60%, rgba(124,58,237,0.04) 0%, transparent 70%)",
        }}
      />

      {/* ── Logo ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 h-14 flex-shrink-0">
        <div
          className="flex items-center justify-center w-[30px] h-[30px] rounded-[8px] flex-shrink-0"
          style={{
            background: "linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)",
            boxShadow: "0 4px 14px rgba(124,58,237,0.4)",
          }}
        >
          <Zap size={14} className="text-white" style={{ fill: "white" }} />
        </div>
        <span className="text-[14px] font-bold" style={{ color: "#F0F0FF", letterSpacing: "-0.01em" }}>
          AutoApply
        </span>
      </div>

      {/* Divider */}
      <div className="mx-4 h-px" style={{ background: "rgba(255,255,255,0.05)" }} />

      {/* ── Global Search trigger ─────────────────────────── */}
      <div className="px-3 pt-2 pb-1 flex-shrink-0">
        <button
          onClick={() => { setShowSearch(true); setSearchQuery(""); }}
          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-[9px] transition-all group"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <Search size={12} style={{ color: "#3A3A60", flexShrink: 0 }} />
          <span className="flex-1 text-[12px] text-left" style={{ color: "#3A3A60", fontFamily: "'Inter', sans-serif" }}>Search…</span>
          <div className="flex items-center gap-1">
            <kbd style={{ fontSize: 9, padding: "1px 4px", borderRadius: 4, background: "rgba(255,255,255,0.06)", color: "#3A3A60", fontFamily: "monospace", border: "1px solid rgba(255,255,255,0.06)" }}>⌘K</kbd>
          </div>
        </button>
      </div>

      {/* Global search modal */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed", inset: 0, zIndex: 9999,
              background: "rgba(0,0,0,0.65)",
              display: "flex", alignItems: "flex-start", justifyContent: "center",
              paddingTop: "15vh",
            }}
            onClick={() => setShowSearch(false)}
          >
            <motion.div
              initial={{ scale: 0.93, y: -12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.93, y: -12 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: 440,
                maxWidth: "90vw",
                background: "#0C0C14",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 14,
                boxShadow: "0 24px 80px rgba(0,0,0,0.7)",
                overflow: "hidden",
              }}
            >
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <Command size={15} style={{ color: "#8B5CF6", flexShrink: 0 }} />
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search pages…"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && searchResults.length > 0) {
                      handleSearchSelect(searchResults[0].href);
                    }
                  }}
                  style={{
                    flex: 1, background: "none", border: "none", outline: "none",
                    color: "#F0F0FF", fontSize: 14, fontFamily: "'Inter', sans-serif",
                  }}
                />
                <button onClick={() => setShowSearch(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#3A3A60", padding: 0 }}>
                  <X size={14} />
                </button>
              </div>
              {/* Results */}
              <div style={{ maxHeight: 320, overflowY: "auto" }}>
                {searchResults.length === 0 ? (
                  <div style={{ padding: "20px", textAlign: "center", color: "#3A3A60", fontSize: 13, fontFamily: "'Inter', sans-serif" }}>
                    No pages found
                  </div>
                ) : (
                  searchResults.map((result) => (
                    <button
                      key={result.href}
                      onClick={() => handleSearchSelect(result.href)}
                      className="w-full text-left flex items-center gap-3 px-4 py-2.5 transition-all hover:bg-white/[0.03]"
                      style={{ background: "none", border: "none", cursor: "pointer" }}
                    >
                      <ChevronRight size={12} style={{ color: "#3A3A60", flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: "#9090B8", fontFamily: "'Inter', sans-serif" }}>{result.label}</span>
                      <span style={{ marginLeft: "auto", fontSize: 11, color: "#3A3A60", fontFamily: "monospace" }}>{result.href}</span>
                    </button>
                  ))
                )}
              </div>
              <div style={{ padding: "8px 16px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: 12 }}>
                <span style={{ fontSize: 10, color: "#3A3A60", fontFamily: "'Inter', sans-serif" }}>↑↓ navigate</span>
                <span style={{ fontSize: 10, color: "#3A3A60", fontFamily: "'Inter', sans-serif" }}>↵ select</span>
                <span style={{ fontSize: 10, color: "#3A3A60", fontFamily: "'Inter', sans-serif" }}>esc close</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Navigation ───────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-3 py-1 min-h-0">

        {/* CORE */}
        <SectionLabel label="CORE" />
        <NavItem icon={LayoutDashboard} label="Dashboard"  href="/dashboard" active={isActive("/dashboard")} />
        <NavItem icon={Search}          label="Jobs"        href="/jobs"      active={isActive("/jobs")} />
        <NavItem icon={KanbanSquare}    label="Pipeline"    href="/pipeline"  active={isActive("/pipeline")} />
        <NavItem icon={User}            label="Profile"     href="/profile"   active={isActive("/profile")} />
        <NavItem icon={FileText}        label="Documents"   href="/documents" active={isActive("/documents")} />
        <NavItem icon={MessageSquare}   label="Comms"       href="/comms"     active={isActive("/comms")} badge={unreadNotifications} />
        <NavItem icon={Mic}             label="Interview"   href="/interview"       active={isActive("/interview")} />
        <NavItem icon={Layers}          label="Flashcards"  href="/flashcards"      active={isActive("/flashcards")} />
        <NavItem icon={PhoneCall}       label="Recruiter Prep" href="/recruiter-prep" active={isActive("/recruiter-prep")} />
        <NavItem icon={Shield}          label="War Room"    href="/warroom"   active={isActive("/warroom")} />
        <NavItem icon={Bell}            label="Job Alerts"  href="/job-alerts" active={isActive("/job-alerts")} />

        {/* GROW */}
        <SectionLabel label="GROW" />
        <NavItem icon={DollarSign}    label="Salary Coach"    href="/salary"          active={isActive("/salary")} />
        <NavItem icon={Scale}         label="Offer Compare"   href="/offers"          active={isActive("/offers")} />
        <NavItem icon={FileSearch}    label="Offer Analyzer"  href="/offer-letter"    active={isActive("/offer-letter")} />
        <NavItem icon={Brain}         label="Skills Gap"      href="/skills-gap"      active={isActive("/skills-gap")} />
        <NavItem icon={TrendingUp}    label="Career Path"     href="/career"          active={isActive("/career")} />
        <NavItem icon={GraduationCap} label="Cert ROI"        href="/cert-roi"        active={isActive("/cert-roi")} />
        <NavItem icon={BarChart2}     label="Market Intel"    href="/market"          active={isActive("/market")} />
        <NavItem icon={FlaskConical}  label="Research"        href="/research"        active={isActive("/research")} />
        <NavItem icon={Compass}       label="Mentor AI"       href="/mentor"          active={isActive("/mentor")} />
        <NavItem icon={Users}         label="Referral"        href="/referral"        active={isActive("/referral")} />
        <NavItem icon={Activity}      label="Accountability"  href="/accountability"  active={isActive("/accountability")} />
        <NavItem icon={Target}        label="Burnout Tracker" href="/burnout"         active={isActive("/burnout")} />
        <NavItem icon={TrendingUp}    label="Skill Trends"    href="/trends"          active={isActive("/trends")} />
        <NavItem icon={MapPin}        label="Relocate"        href="/relocate"        active={isActive("/relocate")} />

        {/* NETWORK */}
        <SectionLabel label="NETWORK" />
        <NavItem icon={Network}       label="Networking CRM"  href="/networking"      active={isActive("/networking")} />
        <NavItem icon={Send}          label="Cold Outreach"   href="/outreach"        active={isActive("/outreach")} />
        <NavItem icon={UserCheck}     label="References"      href="/references"      active={isActive("/references")} />
        <NavItem icon={ShieldCheck}   label="BGCheck Prep"    href="/bgcheck"         active={isActive("/bgcheck")} />
        <NavItem icon={ClipboardList} label="Peer Review"     href="/peer-review"     active={isActive("/peer-review")} />

        {/* TOOLS */}
        <SectionLabel label="TOOLS" />
        <NavItem icon={Github}       label="GitHub Optimizer"   href="/optimize/github"    active={isActive("/optimize/github")} />
        <NavItem icon={Linkedin}     label="LinkedIn Optimizer" href="/optimize/linkedin"  active={isActive("/optimize/linkedin")} />
        <NavItem icon={Linkedin}     label="LinkedIn Toolkit"   href="/linkedin-tools"     active={isActive("/linkedin-tools")} />
        <NavItem icon={Code2}        label="Portfolio"          href="/portfolio"           active={isActive("/portfolio")} />
        <NavItem icon={FolderGit2}   label="Startup Tracker"    href="/startup"             active={isActive("/startup")} />
        <NavItem icon={Flag}         label="Green Card"         href="/greencard"           active={isActive("/greencard")} />
        <NavItem icon={Building2}    label="Company Research"   href="/company-research"    active={isActive("/company-research")} />
        <NavItem icon={Bookmark}     label="Saved Content"      href="/saved"               active={isActive("/saved")} />
      </nav>

      {/* ── User Card ────────────────────────────────────── */}
      <div className="px-3 pb-3 flex-shrink-0">
        <div className="mx-0 h-px mb-2" style={{ background: "rgba(255,255,255,0.05)" }} />
        <div
          className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] group cursor-pointer"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {/* Avatar */}
          <div
            className="w-8 h-8 rounded-[8px] flex items-center justify-center text-[11px] font-semibold text-white flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)",
            }}
          >
            {initials}
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-medium truncate" style={{ color: "#F0F0FF" }}>
              {userName || "User"}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="pulse-dot" style={{ width: 5, height: 5 }} />
              <span className="text-[10px]" style={{ color: "#34D399" }}>Active</span>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md"
            style={{ color: "#3A3A60" }}
            title="Sign out"
          >
            <LogOut size={13} />
          </button>
        </div>

        {/* Settings link */}
        <Link
          href="/settings"
          className="flex items-center gap-2 px-3 py-1.5 mt-1 rounded-[8px] group"
          style={{ color: "#3A3A60" }}
        >
          <Settings size={12} />
          <span className="text-[11px]" style={{ color: "#3A3A60" }}>Settings</span>
          <ChevronRight size={10} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
        </Link>
      </div>
    </motion.aside>
  );
}
