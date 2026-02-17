"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  User,
  Search,
  FileText,
  Mail,
  Mic,
  Github,
  Linkedin,
  Settings,
} from "lucide-react";

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  href: string;
  active?: boolean;
  badge?: number;
}

function NavItem({ icon: Icon, label, href, active = false, badge }: NavItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Link
      href={href}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative w-full h-11 px-3 flex items-center gap-3 transition-all duration-200"
      style={{
        background: active
          ? "rgba(0, 255, 224, 0.08)"
          : isHovered
          ? "rgba(255, 255, 255, 0.03)"
          : "transparent",
        borderRadius: "8px",
      }}
    >
      {/* Active left border */}
      {active && (
        <motion.div
          layoutId="activeNavBorder"
          className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#00FFE0] rounded-r-full"
        />
      )}

      {/* Icon */}
      <Icon
        size={20}
        strokeWidth={1.5}
        className="flex-shrink-0"
        style={{
          color: active ? "#00FFE0" : isHovered ? "#E8E8F0" : "#4A4A64",
        }}
      />

      {/* Label */}
      <span
        className="flex-1 text-left text-[13px] font-medium"
        style={{
          fontFamily: "'Outfit', sans-serif",
          color: active ? "#00FFE0" : isHovered ? "#E8E8F0" : "#7E7E98",
        }}
      >
        {label}
      </span>

      {/* Notification Badge */}
      {badge !== undefined && badge > 0 && (
        <div
          className="flex-shrink-0 h-[18px] px-2 flex items-center justify-center rounded-full"
          style={{
            background: "#00FFE0",
          }}
        >
          <span
            className="text-[10px] font-bold"
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              color: "#050508",
            }}
          >
            {badge > 99 ? "99+" : badge}
          </span>
        </div>
      )}
    </Link>
  );
}

function Divider() {
  return <div className="h-px bg-white/[0.04] my-4" />;
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div className="px-3 mb-2">
      <span
        className="text-[11px] font-medium uppercase"
        style={{
          fontFamily: "'Outfit', sans-serif",
          color: "#4A4A64",
          letterSpacing: "1px",
        }}
      >
        {children}
      </span>
    </div>
  );
}

interface SidebarProps {
  unreadNotifications?: number;
  newJobs?: number;
  unreadMessages?: number;
  upcomingInterviews?: number;
  userName?: string;
  userEmail?: string;
}

export function Sidebar({
  unreadNotifications = 0,
  newJobs = 0,
  unreadMessages = 0,
  upcomingInterviews = 0,
  userName = "Aarav S.",
  userEmail = "aarav@example.com",
}: SidebarProps) {
  const pathname = usePathname();

  // Determine which nav item is active based on pathname
  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return pathname === "/dashboard" || pathname === "/";
    }
    return pathname?.startsWith(path);
  };

  return (
    <div className="w-[240px] h-screen bg-[#0F0F18] flex flex-col fixed left-0 top-0">
      {/* TOP SECTION */}
      <div className="pt-4 px-4">
        {/* Logo - Geometric A */}
        <Link href="/dashboard" className="flex items-center justify-center mb-4">
          <svg
            width="28"
            height="28"
            viewBox="0 0 28 28"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Geometric Angular "A" */}
            <path
              d="M14 2L24 26H20L18 21H10L8 26H4L14 2Z"
              stroke="#00FFE0"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <path
              d="M11 16H17"
              stroke="#00FFE0"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>

        {/* Divider */}
        <div className="h-px bg-white/[0.04]" />
      </div>

      {/* MAIN NAVIGATION */}
      <div className="pt-4 px-2 flex-1 overflow-y-auto">
        <div className="space-y-2">
          <NavItem
            icon={Home}
            label="Dashboard"
            href="/dashboard"
            active={isActive("/dashboard")}
          />
          <NavItem
            icon={User}
            label="Profile"
            href="/profile"
            active={isActive("/profile")}
          />
          <NavItem
            icon={Search}
            label="Jobs"
            href="/jobs"
            active={isActive("/jobs")}
            badge={newJobs}
          />
          <NavItem
            icon={FileText}
            label="Documents"
            href="/documents"
            active={isActive("/documents")}
          />
          <NavItem
            icon={Mail}
            label="Messages"
            href="/comms"
            active={isActive("/comms")}
            badge={unreadMessages}
          />
          <NavItem
            icon={Mic}
            label="Interviews"
            href="/interview"
            active={isActive("/interview")}
            badge={upcomingInterviews}
          />
        </div>

        {/* OPTIMIZE Section */}
        <Divider />
        <SectionLabel>Optimize</SectionLabel>
        <div className="space-y-2">
          <NavItem
            icon={Github}
            label="GitHub"
            href="/optimize/github"
            active={isActive("/optimize/github")}
          />
          <NavItem
            icon={Linkedin}
            label="LinkedIn"
            href="/optimize/linkedin"
            active={isActive("/optimize/linkedin")}
          />
        </div>
      </div>

      {/* BOTTOM SECTION */}
      <div className="px-2 pb-4">
        {/* Settings */}
        <Divider />
        <NavItem
          icon={Settings}
          label="Settings"
          href="/settings"
          active={isActive("/settings")}
        />

        {/* User Area */}
        <Divider />
        <div className="px-3 py-3">
          <div className="flex items-center gap-3 mb-3">
            {/* Avatar */}
            <div
              className="w-9 h-9 rounded-full flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, #00FFE0 0%, #00B8D4 100%)",
              }}
            />

            {/* User Info */}
            <div className="flex-1 min-w-0">
              <p
                className="text-[13px] font-medium text-[#E8E8F0] truncate"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                {userName}
              </p>
              <p
                className="text-[11px] text-[#4A4A64] truncate"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                {userEmail}
              </p>
            </div>
          </div>

          {/* Status Indicator */}
          <div className="flex items-center gap-2">
            {/* Glowing dot */}
            <div className="relative">
              <div
                className="w-1.5 h-1.5 rounded-full bg-[#00FFE0]"
                style={{
                  boxShadow: "0 0 8px rgba(0, 255, 224, 0.6)",
                }}
              />
            </div>
            <span
              className="text-[11px] text-[#7E7E98]"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              System Active
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
