'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, Search, Menu } from 'lucide-react';
import { Sidebar } from './sidebar';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Sidebar - Desktop */}
      <div className="hidden lg:block">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Mobile */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-40 lg:hidden transition-transform',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <Sidebar />
      </div>

      {/* Main Content */}
      <main
        className={cn(
          'min-h-screen transition-all duration-300',
          sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'
        )}
      >
        {/* Header */}
        <header className="sticky top-0 z-20 backdrop-blur-lg bg-[var(--bg-primary)]/80 border-b border-[var(--glass-border)]">
          <div className="flex items-center justify-between h-16 px-4 lg:px-8">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]"
            >
              <Menu size={24} />
            </button>

            {/* Search */}
            <div className="hidden sm:flex items-center flex-1 max-w-xl mx-4">
              <div className="relative w-full">
                <Search
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                />
                <input
                  type="text"
                  placeholder="Search jobs, companies, applications..."
                  className="w-full pl-12 pr-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--glass-border)] rounded-xl text-sm focus:outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-glow)] transition-all"
                />
              </div>
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-3">
              {/* Notifications */}
              <button className="relative p-2.5 rounded-xl hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                <Bell size={20} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full" />
              </button>

              {/* User Avatar */}
              <button className="flex items-center gap-3 p-1.5 pr-4 rounded-xl hover:bg-[var(--bg-hover)] transition-colors">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-medium text-sm">
                  U
                </div>
                <span className="hidden sm:block text-sm font-medium">User</span>
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="p-4 lg:p-8"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
