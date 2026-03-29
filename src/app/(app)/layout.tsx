"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, CheckCheck, ExternalLink, Keyboard } from "lucide-react";
import Link from "next/link";

const INACTIVITY_TIMEOUT_MS = 2 * 60 * 60 * 1000;

interface LayoutProps {
  children: React.ReactNode;
}

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  data?: Record<string, unknown>;
}

function NotificationPanel({
  open,
  onClose,
  notifications,
  onMarkAllRead,
}: {
  open: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkAllRead: () => void;
}) {
  const T = {
    bgElevated: "#111120",
    cardBorder: "rgba(255,255,255,0.06)",
    accent: "#8B5CF6",
    accentMuted: "rgba(124,58,237,0.12)",
    accentBorder: "rgba(124,58,237,0.25)",
    textPrimary: "#F0F0FF",
    textSecondary: "#9090B8",
    textMuted: "#3A3A60",
    green: "#34D399",
    amber: "#FBBF24",
    red: "#F87171",
  };

  const getTypeColor = (type: string) => {
    if (type.includes("interview")) return T.accent;
    if (type.includes("offer")) return T.green;
    if (type.includes("job_match")) return T.amber;
    if (type.includes("application")) return "#60A5FA";
    return T.textSecondary;
  };

  const getTypeIcon = (type: string) => {
    if (type.includes("interview")) return "🎯";
    if (type.includes("offer")) return "🎉";
    if (type.includes("job_match")) return "🔥";
    if (type.includes("application")) return "📤";
    if (type.includes("email")) return "📧";
    if (type.includes("digest")) return "📊";
    return "🔔";
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = (now.getTime() - d.getTime()) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={onClose} />
          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="fixed z-50 w-96 rounded-2xl overflow-hidden"
            style={{
              top: 62,
              right: 16,
              background: T.bgElevated,
              border: `1px solid ${T.cardBorder}`,
              boxShadow: "0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)",
              maxHeight: "70vh",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3 flex-shrink-0"
              style={{ borderBottom: `1px solid rgba(255,255,255,0.06)` }}
            >
              <div className="flex items-center gap-2">
                <Bell size={14} style={{ color: T.accent }} />
                <span className="text-[13px] font-semibold" style={{ color: T.textPrimary }}>
                  Notifications
                </span>
                {notifications.filter((n) => !n.read).length > 0 && (
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: T.accentMuted, color: T.accent, border: `1px solid ${T.accentBorder}` }}
                  >
                    {notifications.filter((n) => !n.read).length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {notifications.some((n) => !n.read) && (
                  <button
                    onClick={onMarkAllRead}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] transition-all hover:bg-white/5"
                    style={{ color: T.textSecondary }}
                  >
                    <CheckCheck size={11} />
                    Mark all read
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-1 rounded-lg hover:bg-white/5 transition-all"
                  style={{ color: T.textMuted }}
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Notification list */}
            <div className="overflow-y-auto flex-1">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                    style={{ background: T.accentMuted }}
                  >
                    🔔
                  </div>
                  <p className="text-[13px]" style={{ color: T.textSecondary }}>
                    No notifications yet
                  </p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className="flex items-start gap-3 px-4 py-3 transition-all hover:bg-white/[0.025] cursor-pointer"
                    style={{
                      borderBottom: `1px solid rgba(255,255,255,0.03)`,
                      background: notif.read ? "transparent" : "rgba(124,58,237,0.03)",
                    }}
                  >
                    <span className="text-base flex-shrink-0 mt-0.5">{getTypeIcon(notif.type)}</span>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-[12px] font-medium leading-snug mb-0.5"
                        style={{ color: notif.read ? T.textSecondary : T.textPrimary }}
                      >
                        {notif.title}
                      </p>
                      <p
                        className="text-[11px] leading-snug"
                        style={{ color: T.textMuted }}
                      >
                        {notif.message}
                      </p>
                      <p className="text-[10px] mt-1" style={{ color: T.textMuted }}>
                        {formatTime(notif.createdAt)}
                      </p>
                    </div>
                    {!notif.read && (
                      <div
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5"
                        style={{ background: getTypeColor(notif.type) }}
                      />
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div
              className="flex-shrink-0 p-3"
              style={{ borderTop: `1px solid rgba(255,255,255,0.06)` }}
            >
              <Link
                href="/comms"
                onClick={onClose}
                className="flex items-center justify-center gap-2 w-full py-2 rounded-xl text-[12px] font-medium transition-all hover:bg-white/5"
                style={{ color: T.accent, border: `1px solid ${T.accentBorder}` }}
              >
                <ExternalLink size={12} />
                View all in Messages
              </Link>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

const SHORTCUTS = [
  { key: "⌘K", desc: "Open command palette" },
  { key: "?", desc: "Show keyboard shortcuts" },
  { key: "Esc", desc: "Close modal / deselect" },
  { key: "A", desc: "Quick apply (job detail open)" },
  { key: "S", desc: "Save / bookmark job" },
  { key: "←→", desc: "Navigate job list" },
  { key: "⌘↵", desc: "Submit search" },
  { key: "G D", desc: "Go to Dashboard" },
  { key: "G J", desc: "Go to Jobs" },
  { key: "G P", desc: "Go to Pipeline" },
];

export default function AppLayout({ children }: LayoutProps) {
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [notifPanelOpen, setNotifPanelOpen] = useState(false);
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const queryClient = useQueryClient();

  // Load theme preference
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const dark = saved !== "light";
    setIsDark(dark);
    document.documentElement.classList.toggle("light", !dark);
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle("light", !next);
      localStorage.setItem("theme", next ? "dark" : "light");
      return next;
    });
  }, []);

  useEffect(() => {
    const resetTimer = () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      inactivityTimer.current = setTimeout(async () => {
        const refreshToken = localStorage.getItem("refreshToken");
        if (refreshToken) {
          try {
            const res = await fetch("/api/auth/refresh", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ refreshToken }),
            });
            if (res.ok) {
              const data = await res.json();
              if (data?.data?.accessToken) {
                localStorage.setItem("accessToken", data.data.accessToken);
                if (data.data.refreshToken) localStorage.setItem("refreshToken", data.data.refreshToken);
                resetTimer();
                return;
              }
            }
          } catch {
            // fall through
          }
        }
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        window.location.href = "/login?reason=inactivity";
      }, INACTIVITY_TIMEOUT_MS);
    };

    const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "click"];
    events.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();
    return () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      events.forEach((e) => window.removeEventListener(e, resetTimer));
    };
  }, []);

  // ⌘K + ? keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const inInput = tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement).isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdPaletteOpen((prev) => !prev);
      }
      if (e.key === "?" && !inInput) {
        setShortcutsOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setCmdPaletteOpen(false);
        setNotifPanelOpen(false);
        setShortcutsOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const { data: notificationCountData } = useQuery({
    queryKey: ["notificationCounts"],
    queryFn: () => apiFetch("/api/comms/notifications/count"),
    refetchInterval: 30000,
    retry: false,
  });

  const { data: notificationsData } = useQuery({
    queryKey: ["notificationsList"],
    queryFn: () => apiFetch("/api/comms/notifications?limit=20"),
    enabled: notifPanelOpen,
    retry: false,
  });

  const { data: profileData } = useQuery({
    queryKey: ["userProfile"],
    queryFn: () => apiFetch("/api/auth/me"),
    retry: false,
  });

  const markAllReadMutation = useMutation({
    mutationFn: (ids: string[]) =>
      apiFetch("/api/comms/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notificationCounts"] });
      queryClient.invalidateQueries({ queryKey: ["notificationsList"] });
    },
  });

  // FIX: was reading data?.unread — API returns unreadCount
  const unreadCount = (notificationCountData as Record<string, unknown>)?.data
    ? ((notificationCountData as Record<string, Record<string, number>>).data?.unreadCount || 0)
    : 0;

  const notifications: NotificationItem[] = (() => {
    const inner = (notificationsData as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
    const list = inner?.notifications;
    return Array.isArray(list) ? list as NotificationItem[] : [];
  })();

  const profileUser = (profileData as Record<string, { user: Record<string, string> }>)?.data?.user;
  const userName = profileUser?.name || "User";
  const userEmail = profileUser?.email || "";

  const handleMarkAllRead = () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length > 0) {
      markAllReadMutation.mutate(unreadIds);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-base)" }}>
      <div className="aurora-grid" />
      <div className="noise-overlay" />
      <div className="glow-blob glow-violet" style={{ width: 900, height: 600, top: -200, left: "20%", opacity: 0.8 }} />
      <div className="glow-blob glow-teal" style={{ width: 600, height: 600, bottom: -100, right: "5%", opacity: 0.6 }} />

      <Sidebar unreadNotifications={unreadCount} userName={userName} userEmail={userEmail} />

      <div className="relative" style={{ marginLeft: 232, minHeight: "100vh", display: "flex", flexDirection: "column", zIndex: 10 }}>
        <Header
          unreadNotifications={unreadCount}
          userName={userName}
          isDark={isDark}
          onThemeToggle={toggleTheme}
          onSearchClick={() => setCmdPaletteOpen(true)}
          onNotificationClick={() => setNotifPanelOpen((p) => !p)}
        />

        <NotificationPanel
          open={notifPanelOpen}
          onClose={() => setNotifPanelOpen(false)}
          notifications={notifications}
          onMarkAllRead={handleMarkAllRead}
        />

        {/* Command Palette */}
        <AnimatePresence>
          {cmdPaletteOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                onClick={() => setCmdPaletteOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: -12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -12 }}
                transition={{ duration: 0.15 }}
                className="fixed z-50 left-1/2 -translate-x-1/2 w-full max-w-lg rounded-2xl overflow-hidden"
                style={{
                  top: "18vh",
                  background: "#111120",
                  border: "1px solid rgba(255,255,255,0.08)",
                  boxShadow: "0 32px 100px rgba(0,0,0,0.8)",
                }}
              >
                {/* Search input */}
                <div
                  className="flex items-center gap-3 px-4 py-3.5"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3A3A60" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                  </svg>
                  <input
                    autoFocus
                    placeholder="Search pages, jobs, settings…"
                    className="flex-1 bg-transparent outline-none text-sm"
                    style={{ color: "#F0F0FF", fontFamily: "'Inter', sans-serif" }}
                    onKeyDown={(e) => e.key === "Escape" && setCmdPaletteOpen(false)}
                  />
                  <kbd className="text-[10px] px-2 py-1 rounded" style={{ background: "rgba(255,255,255,0.06)", color: "#3A3A60", fontFamily: "monospace" }}>ESC</kbd>
                </div>

                {/* Quick navigation */}
                <div className="p-2 max-h-80 overflow-y-auto">
                  <p className="text-[10px] uppercase tracking-widest px-3 py-2" style={{ color: "#3A3A60" }}>Quick Navigate</p>
                  {[
                    { href: "/dashboard", icon: "⚡", label: "Dashboard", desc: "Career overview" },
                    { href: "/jobs", icon: "💼", label: "Jobs", desc: "Search & apply" },
                    { href: "/pipeline", icon: "📊", label: "Pipeline", desc: "Track applications" },
                    { href: "/profile", icon: "👤", label: "Profile", desc: "Edit your info" },
                    { href: "/documents", icon: "📄", label: "Documents", desc: "CVs & cover letters" },
                    { href: "/comms", icon: "📧", label: "Messages", desc: "Email & notifications" },
                    { href: "/interview", icon: "🎯", label: "Interview Prep", desc: "Practice & prepare" },
                    { href: "/salary", icon: "💰", label: "Salary Coach", desc: "Research & negotiate" },
                    { href: "/optimize/github", icon: "🐙", label: "GitHub Optimizer", desc: "Boost your profile" },
                    { href: "/optimize/linkedin", icon: "💼", label: "LinkedIn Optimizer", desc: "Optimize presence" },
                    { href: "/mentor", icon: "🧠", label: "AI Mentor", desc: "Career coaching" },
                    { href: "/research", icon: "🔬", label: "Research Hub", desc: "Papers & publications" },
                    { href: "/settings", icon: "⚙️", label: "Settings", desc: "Configure AutoApply" },
                  ].map((item) => (
                    <a
                      key={item.href}
                      href={item.href}
                      onClick={() => setCmdPaletteOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all hover:bg-white/[0.04] group"
                    >
                      <span className="text-base w-7 text-center flex-shrink-0">{item.icon}</span>
                      <div>
                        <p className="text-[13px] font-medium" style={{ color: "#F0F0FF" }}>{item.label}</p>
                        <p className="text-[11px]" style={{ color: "#3A3A60" }}>{item.desc}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Keyboard Shortcuts Overlay */}
        <AnimatePresence>
          {shortcutsOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                onClick={() => setShortcutsOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -8 }}
                transition={{ duration: 0.15 }}
                className="fixed z-50 left-1/2 -translate-x-1/2 w-full max-w-sm rounded-2xl overflow-hidden"
                style={{ top: "20vh", background: "#111120", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 32px 100px rgba(0,0,0,0.8)" }}
              >
                <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="flex items-center gap-2">
                    <Keyboard size={14} style={{ color: "#8B5CF6" }} />
                    <span className="text-[13px] font-semibold" style={{ color: "#F0F0FF" }}>Keyboard Shortcuts</span>
                  </div>
                  <button onClick={() => setShortcutsOpen(false)} className="p-1 rounded-lg hover:bg-white/5 transition-all">
                    <X size={14} style={{ color: "#3A3A60" }} />
                  </button>
                </div>
                <div className="p-4 space-y-1.5">
                  {SHORTCUTS.map((s) => (
                    <div key={s.key} className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/[0.03]">
                      <span className="text-[12px]" style={{ color: "#9090B8", fontFamily: "'Inter', sans-serif" }}>{s.desc}</span>
                      <kbd className="text-[11px] px-2 py-0.5 rounded-md" style={{ background: "rgba(255,255,255,0.07)", color: "#F0F0FF", fontFamily: "monospace", border: "1px solid rgba(255,255,255,0.10)" }}>{s.key}</kbd>
                    </div>
                  ))}
                </div>
                <div className="px-5 pb-4 pt-2">
                  <p className="text-[11px] text-center" style={{ color: "#3A3A60" }}>Press <kbd className="px-1.5 py-0.5 rounded text-[10px] mx-1" style={{ background: "rgba(255,255,255,0.06)", fontFamily: "monospace" }}>?</kbd> to toggle this overlay</p>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
