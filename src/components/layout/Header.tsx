"use client";

import { Search, Bell } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";

interface HeaderProps {
  unreadNotifications?: number;
  onSearchClick?: () => void;
  onNotificationClick?: () => void;
  onAvatarClick?: () => void;
}

export function Header({
  unreadNotifications = 0,
  onSearchClick,
  onNotificationClick,
  onAvatarClick,
}: HeaderProps) {
  const pathname = usePathname();

  // Generate breadcrumb from pathname
  const generateBreadcrumb = () => {
    if (!pathname) return { parent: "Dashboard", current: "Overview" };

    const pathSegments = pathname.split("/").filter(Boolean);

    if (pathSegments.length === 0 || pathname === "/dashboard") {
      return { parent: "Dashboard", current: "Overview" };
    }

    const pageMap: Record<string, { parent: string; current: string }> = {
      profile: { parent: "Dashboard", current: "Profile" },
      jobs: { parent: "Dashboard", current: "Jobs" },
      documents: { parent: "Dashboard", current: "Documents" },
      comms: { parent: "Dashboard", current: "Messages" },
      interview: { parent: "Dashboard", current: "Interviews" },
      settings: { parent: "Dashboard", current: "Settings" },
      "optimize/github": { parent: "Optimize", current: "GitHub" },
      "optimize/linkedin": { parent: "Optimize", current: "LinkedIn" },
    };

    const key = pathSegments.join("/");
    return pageMap[key] || {
      parent: "Dashboard",
      current: pathSegments[pathSegments.length - 1].charAt(0).toUpperCase() +
               pathSegments[pathSegments.length - 1].slice(1)
    };
  };

  const { parent, current } = generateBreadcrumb();

  return (
    <header className="w-full h-14 flex items-center justify-between px-8 bg-[#0A0A10]/50 backdrop-blur-sm border-b border-white/[0.04]">
      {/* LEFT SIDE - Breadcrumb */}
      <div className="flex items-center gap-2">
        <span
          className="text-[13px]"
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 400,
            color: "#4A4A64",
          }}
        >
          {parent}
        </span>
        <span className="text-[13px] text-[#4A4A64]">/</span>
        <span
          className="text-[13px]"
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 500,
            color: "#7E7E98",
          }}
        >
          {current}
        </span>
      </div>

      {/* RIGHT SIDE */}
      <div className="flex items-center gap-4">
        {/* Command Palette Trigger */}
        <button
          onClick={onSearchClick}
          className="w-[120px] h-8 px-3 flex items-center gap-2 rounded-lg transition-all hover:bg-white/[0.05]"
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
          }}
        >
          <Search size={14} className="text-[#4A4A64] flex-shrink-0" strokeWidth={2} />
          <span
            className="text-xs flex-1"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              color: "#4A4A64",
            }}
          >
            Search...
          </span>
          <div
            className="px-1.5 py-0.5 rounded flex items-center justify-center"
            style={{
              background: "rgba(255, 255, 255, 0.04)",
            }}
          >
            <span
              className="text-[10px]"
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                color: "#4A4A64",
              }}
            >
              ⌘K
            </span>
          </div>
        </button>

        {/* Notification Bell */}
        <button
          className="relative"
          onClick={onNotificationClick}
          aria-label={`Notifications${unreadNotifications > 0 ? ` (${unreadNotifications} unread)` : ""}`}
        >
          <Bell size={20} className="text-[#7E7E98]" strokeWidth={1.5} />
          {unreadNotifications > 0 && (
            <div
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
              style={{
                background: "#00FFE0",
              }}
            >
              <span
                className="text-[9px] font-bold"
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  color: "#050508",
                }}
              >
                {unreadNotifications > 9 ? "9+" : unreadNotifications}
              </span>
            </div>
          )}
        </button>

        {/* User Avatar */}
        <button
          onClick={onAvatarClick}
          className="w-7 h-7 rounded-full border"
          style={{
            background: "linear-gradient(135deg, #00FFE0 0%, #00B8D4 100%)",
            borderColor: "rgba(255, 255, 255, 0.08)",
          }}
          aria-label="User menu"
        />
      </div>
    </header>
  );
}
