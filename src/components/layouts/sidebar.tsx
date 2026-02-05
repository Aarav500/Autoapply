'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  User,
  Briefcase,
  FileText,
  Mail,
  Calendar,
  Sparkles,
  Settings,
  ChevronLeft,
  Zap,
  Bell,
  Bot,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: string | number;
}

const mainNavItems: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { href: '/profile', label: 'Profile', icon: <User size={20} /> },
  { href: '/jobs', label: 'Jobs', icon: <Briefcase size={20} /> },
  { href: '/applications', label: 'Applications', icon: <FileText size={20} /> },
  { href: '/auto-apply', label: 'Auto-Apply', icon: <Bot size={20} /> },
  { href: '/documents', label: 'Documents', icon: <FileText size={20} /> },
  { href: '/inbox', label: 'Inbox', icon: <Mail size={20} /> },
  { href: '/interviews', label: 'Interviews', icon: <Calendar size={20} /> },
  { href: '/optimize', label: 'Optimize', icon: <Sparkles size={20} /> },
  { href: '/notifications', label: 'Notifications', icon: <Bell size={20} /> },
];

const bottomNavItems: NavItem[] = [
  { href: '/settings', label: 'Settings', icon: <Settings size={20} /> },
];

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen flex flex-col',
        'bg-[var(--bg-secondary)] border-r border-[var(--glass-border)]',
        'transition-all duration-300',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 p-6 border-b border-[var(--glass-border)]">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/25">
          <Zap size={24} className="text-white" />
        </div>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col"
          >
            <span className="font-bold text-lg">AutoApply</span>
            <span className="text-xs text-[var(--text-muted)]">AI Job Hunter</span>
          </motion.div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {mainNavItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl transition-all',
                'hover:bg-[var(--bg-hover)]',
                isActive && 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/25',
                !isActive && 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
                collapsed && 'justify-center px-0'
              )}
            >
              <span className={cn(isActive && 'text-white')}>{item.icon}</span>
              {!collapsed && (
                <span className="font-medium">{item.label}</span>
              )}
              {!collapsed && item.badge && (
                <span className="ml-auto px-2 py-0.5 text-xs font-medium rounded-full bg-blue-500/20 text-blue-400">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Navigation */}
      <div className="p-4 border-t border-[var(--glass-border)]">
        {bottomNavItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl transition-all',
                'hover:bg-[var(--bg-hover)]',
                isActive && 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]',
                !isActive && 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
                collapsed && 'justify-center px-0'
              )}
            >
              {item.icon}
              {!collapsed && <span className="font-medium">{item.label}</span>}
            </Link>
          );
        })}

        {/* Collapse Button */}
        {onToggle && (
          <button
            onClick={onToggle}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-xl transition-all w-full mt-2',
              'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]',
              collapsed && 'justify-center px-0'
            )}
          >
            <ChevronLeft
              size={20}
              className={cn('transition-transform', collapsed && 'rotate-180')}
            />
            {!collapsed && <span className="font-medium">Collapse</span>}
          </button>
        )}
      </div>
    </aside>
  );
}
