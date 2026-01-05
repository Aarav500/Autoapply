'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  FileText,
  Briefcase,
  FolderOpen,
  Mail,
  GraduationCap,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Calendar,
  Map,
  Focus,
  Recycle,
  Brain,
  ChevronDown,
  Search,
  Award,
  ClipboardList,
  Linkedin,
  BookOpen,
  ScrollText
} from 'lucide-react';

const mainNavItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
  { icon: FileText, label: 'Essays', href: '/essays' },
  { icon: ScrollText, label: 'CV Builder', href: '/cv-builder', badge: 'NEW' },
  { icon: Briefcase, label: 'Jobs', href: '/jobs' },
  { icon: Award, label: 'Scholarships', href: '/scholarships', badge: 'NEW' },
  { icon: ClipboardList, label: 'Checklist', href: '/checklist', badge: 'NEW' },
  { icon: GraduationCap, label: 'Interview Prep', href: '/prepare' },
];

const aiToolsItems = [
  { icon: Brain, label: 'AI Automate', href: '/automate', badge: 'NEW' },
  { icon: Search, label: 'Job Hub', href: '/job-hub', badge: 'NEW' },
  { icon: Linkedin, label: 'LinkedIn', href: '/linkedin', badge: 'NEW' },
  { icon: BookOpen, label: 'My Grades', href: '/grades' },
  { icon: Calendar, label: 'Calendar', href: '/calendar' },
  { icon: Map, label: 'Strength Map', href: '/strength-map' },
  { icon: Recycle, label: 'Recycler', href: '/recycler' },
  { icon: Focus, label: 'Focus Mode', href: '/focus' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [aiToolsExpanded, setAiToolsExpanded] = useState(true);

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 80 : 280 }}
      className="h-screen sticky top-0 flex flex-col"
      style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(20px)',
        borderRight: '1px solid var(--glass-border)',
      }}
    >
      {/* Logo */}
      <div className="p-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <motion.div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--gradient-primary)' }}
            whileHover={{ scale: 1.05, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
          >
            <Sparkles className="w-5 h-5 text-white" />
          </motion.div>
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
              >
                <h1 className="text-lg font-bold" style={{ fontFamily: 'var(--font-display)' }}>
                  EssayPro
                </h1>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>AI-Powered</p>
              </motion.div>
            )}
          </AnimatePresence>
        </Link>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: 'var(--bg-secondary)' }}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </motion.button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {mainNavItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors relative ${isActive ? 'text-white' : ''
                  }`}
                style={{
                  background: isActive ? 'var(--gradient-primary)' : 'transparent',
                  color: isActive ? 'white' : 'var(--text-secondary)',
                }}
                whileHover={{
                  backgroundColor: isActive ? undefined : 'var(--bg-hover)',
                  x: 4
                }}
                whileTap={{ scale: 0.98 }}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="font-medium"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            </Link>
          );
        })}

        {/* AI Tools Section */}
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="pt-4 mt-4"
            style={{ borderTop: '1px solid var(--glass-border)' }}
          >
            <button
              onClick={() => setAiToolsExpanded(!aiToolsExpanded)}
              className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--text-muted)' }}
            >
              <span>AI Tools</span>
              <motion.div
                animate={{ rotate: aiToolsExpanded ? 180 : 0 }}
              >
                <ChevronDown className="w-4 h-4" />
              </motion.div>
            </button>

            <AnimatePresence>
              {aiToolsExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-1 overflow-hidden"
                >
                  {aiToolsItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link key={item.href} href={item.href}>
                        <motion.div
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors relative"
                          style={{
                            background: isActive ? 'var(--gradient-accent)' : 'transparent',
                            color: isActive ? 'white' : 'var(--text-secondary)',
                          }}
                          whileHover={{
                            backgroundColor: isActive ? undefined : 'var(--bg-hover)',
                            x: 4
                          }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <item.icon className="w-5 h-5 flex-shrink-0" />
                          <span className="font-medium flex-1">{item.label}</span>
                          {item.badge && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full"
                              style={{ background: 'var(--accent-rose)', color: 'white' }}>
                              {item.badge}
                            </span>
                          )}
                        </motion.div>
                      </Link>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Collapsed AI Tools */}
        {isCollapsed && (
          <div className="pt-4 mt-4 space-y-1" style={{ borderTop: '1px solid var(--glass-border)' }}>
            {aiToolsItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <motion.div
                    className="flex items-center justify-center p-2.5 rounded-xl transition-colors relative"
                    style={{
                      background: isActive ? 'var(--gradient-accent)' : 'transparent',
                      color: isActive ? 'white' : 'var(--text-secondary)',
                    }}
                    whileHover={{ backgroundColor: isActive ? undefined : 'var(--bg-hover)' }}
                    whileTap={{ scale: 0.95 }}
                    title={item.label}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.badge && (
                      <span className="absolute top-0 right-0 w-2 h-2 rounded-full"
                        style={{ background: 'var(--accent-rose)' }} />
                    )}
                  </motion.div>
                </Link>
              );
            })}
          </div>
        )}
      </nav>

      {/* User Profile */}
      <div className="p-4" style={{ borderTop: '1px solid var(--glass-border)' }}>
        <motion.div
          className="flex items-center gap-3 p-2 rounded-xl cursor-pointer"
          whileHover={{ backgroundColor: 'var(--bg-hover)' }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
            style={{ background: 'var(--gradient-accent)' }}
          >
            A
          </div>
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex-1 min-w-0"
              >
                <p className="font-medium truncate">Aarav</p>
                <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                  Transfer 2026
                </p>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Link href="/settings">
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    className="p-2 rounded-lg"
                    style={{ background: 'var(--bg-secondary)' }}
                  >
                    <Settings className="w-4 h-4" />
                  </motion.button>
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </motion.aside>
  );
}
