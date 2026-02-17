"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { useQuery } from "@tanstack/react-query";

interface LayoutProps {
  children: React.ReactNode;
}

// Fetch notification counts from the API
async function fetchNotificationCounts() {
  const response = await fetch("/api/comms/notifications/count", {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch notification counts");
  }

  return response.json();
}

// Fetch user profile
async function fetchUserProfile() {
  const response = await fetch("/api/profile", {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch user profile");
  }

  return response.json();
}

export default function AppLayout({ children }: LayoutProps) {
  // Fetch notification counts for badges
  const { data: notificationData } = useQuery({
    queryKey: ["notificationCounts"],
    queryFn: fetchNotificationCounts,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch user profile for sidebar display
  const { data: profileData } = useQuery({
    queryKey: ["userProfile"],
    queryFn: fetchUserProfile,
  });

  const unreadCount = notificationData?.data?.unread || 0;
  const userName = profileData?.data?.personalInfo?.fullName || "User";
  const userEmail = profileData?.data?.personalInfo?.email || "user@example.com";

  // TODO: These will be fetched from their respective APIs
  const newJobsCount = 0; // Will be fetched from /api/jobs endpoint
  const unreadMessagesCount = 0; // Will be fetched from /api/comms/email/inbox
  const upcomingInterviewsCount = 0; // Will be fetched from /api/interview endpoint

  return (
    <div className="min-h-screen bg-[#0A0A10]">
      {/* Sidebar */}
      <Sidebar
        unreadNotifications={unreadCount}
        newJobs={newJobsCount}
        unreadMessages={unreadMessagesCount}
        upcomingInterviews={upcomingInterviewsCount}
        userName={userName}
        userEmail={userEmail}
      />

      {/* Main content area */}
      <div className="ml-[240px] min-h-screen flex flex-col">
        {/* Header */}
        <Header
          unreadNotifications={unreadCount}
          onSearchClick={() => {
            // TODO: Implement command palette
            console.log("Search clicked");
          }}
          onNotificationClick={() => {
            // TODO: Open notifications panel
            console.log("Notifications clicked");
          }}
          onAvatarClick={() => {
            // TODO: Open user menu
            console.log("Avatar clicked");
          }}
        />

        {/* Page content */}
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
