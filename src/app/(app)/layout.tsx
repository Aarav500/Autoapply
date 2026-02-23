"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

interface LayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: LayoutProps) {
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
