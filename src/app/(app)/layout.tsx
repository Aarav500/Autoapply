"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { useEffect, useRef } from "react";

// Auto-logout after 2 hours of inactivity (matches access token TTL)
const INACTIVITY_TIMEOUT_MS = 2 * 60 * 60 * 1000;
// Warn 5 minutes before logout
const WARN_BEFORE_MS = 5 * 60 * 1000;

interface LayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: LayoutProps) {
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Inactivity logout: reset timer on any user interaction
  useEffect(() => {
    const resetTimer = () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      inactivityTimer.current = setTimeout(async () => {
        // Try refresh one last time before logging out
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
                if (data.data.refreshToken) {
                  localStorage.setItem("refreshToken", data.data.refreshToken);
                }
                resetTimer(); // User just refreshed — restart timer
                return;
              }
            }
          } catch {
            // fall through to logout
          }
        }
        // Logout
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        window.location.href = "/login?reason=inactivity";
      }, INACTIVITY_TIMEOUT_MS);
    };

    const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "click"];
    events.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer(); // Start the timer on mount

    return () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      events.forEach((e) => window.removeEventListener(e, resetTimer));
    };
  }, []);

  // Fetch notification counts for badges
  const { data: notificationData } = useQuery({
    queryKey: ["notificationCounts"],
    queryFn: () => apiFetch("/api/comms/notifications/count"),
    refetchInterval: 30000,
    retry: false,
  });

  // Fetch user profile for sidebar display
  const { data: profileData } = useQuery({
    queryKey: ["userProfile"],
    queryFn: () => apiFetch("/api/auth/me"),
    retry: false,
  });

  const unreadCount = (notificationData as Record<string, unknown>)?.data
    ? ((notificationData as Record<string, Record<string, number>>).data.unread || 0)
    : 0;

  const profile = (profileData as Record<string, Record<string, string>>)?.data;
  const userName = profile?.name || "User";
  const userEmail = profile?.email || "";

  const newJobsCount = 0;
  const unreadMessagesCount = 0;
  const upcomingInterviewsCount = 0;

  return (
    <div className="min-h-screen bg-[#0A0A10]">
      <Sidebar
        unreadNotifications={unreadCount}
        newJobs={newJobsCount}
        unreadMessages={unreadMessagesCount}
        upcomingInterviews={upcomingInterviewsCount}
        userName={userName}
        userEmail={userEmail}
      />

      <div className="ml-[240px] min-h-screen flex flex-col">
        <Header
          unreadNotifications={unreadCount}
          onSearchClick={() => console.log("Search clicked")}
          onNotificationClick={() => console.log("Notifications clicked")}
          onAvatarClick={() => console.log("Avatar clicked")}
        />

        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
