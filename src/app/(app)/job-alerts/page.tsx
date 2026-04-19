"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import {
  Bell,
  Plus,
  Trash2,
  MapPin,
  Search,
  TrendingUp,
  Clock,
  Target,
  Wifi,
  WifiOff,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bgBase: "#060608",
  bgSurface: "#0C0C14",
  bgElevated: "#111120",
  accent: "#8B5CF6",
  accentBright: "#7C3AED",
  accentMuted: "rgba(124, 58, 237, 0.12)",
  accentBorder: "rgba(124, 58, 237, 0.25)",
  textPrimary: "#F0F0FF",
  textSecondary: "#9090B8",
  textMuted: "#3A3A60",
  borderSubtle: "rgba(255,255,255,0.06)",
  borderMedium: "rgba(255,255,255,0.08)",
  green: "#34D399",
  amber: "#FBBF24",
  red: "#F87171",
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

interface JobAlert {
  id: string;
  userId: string;
  name: string;
  keywords: string;
  location: string;
  minSalary: number;
  minMatchScore: number;
  remote: boolean;
  active: boolean;
  lastRunAt?: string;
  matchCount: number;
  seenJobIds: string[];
  createdAt: string;
}

interface AlertFormState {
  name: string;
  keywords: string;
  location: string;
  minSalary: number;
  minMatchScore: number;
  remote: boolean;
  active: boolean;
}

const DEFAULT_FORM: AlertFormState = {
  name: "",
  keywords: "",
  location: "",
  minSalary: 0,
  minMatchScore: 70,
  remote: false,
  active: true,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatLastRun(iso?: string): string {
  if (!iso) return "Never run";
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function formatSalary(n: number): string {
  if (n === 0) return "Any";
  if (n >= 1000) return `$${Math.round(n / 1000)}k+`;
  return `$${n}+`;
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

function Chip({ label, color }: { label: string; color?: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 500,
        background: color ? `${color}18` : C.accentMuted,
        color: color ?? C.accent,
        border: `1px solid ${color ? `${color}30` : C.accentBorder}`,
      }}
    >
      {label}
    </span>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label
        style={{ fontSize: 12, fontWeight: 600, color: C.textSecondary, letterSpacing: "0.05em" }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  border: `1px solid ${C.borderMedium}`,
  background: C.bgBase,
  color: C.textPrimary,
  fontSize: 14,
  outline: "none",
  fontFamily: "'Inter', sans-serif",
  boxSizing: "border-box",
};

// ─── Alert Card ───────────────────────────────────────────────────────────────

function AlertCard({
  alert,
  onToggle,
  onDelete,
}: {
  alert: JobAlert;
  onToggle: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      style={{
        background: C.bgSurface,
        border: `1px solid ${alert.active ? C.accentBorder : C.borderSubtle}`,
        borderRadius: 12,
        padding: "18px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        fontFamily: "'Inter', sans-serif",
        transition: "border-color 0.2s",
      }}
    >
      {/* Top row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: C.textPrimary,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {alert.name}
            </span>
            {alert.active ? (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  color: C.green,
                  background: `${C.green}18`,
                  border: `1px solid ${C.green}30`,
                  borderRadius: 4,
                  padding: "1px 6px",
                  textTransform: "uppercase",
                }}
              >
                Active
              </span>
            ) : (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  color: C.textMuted,
                  background: `${C.textMuted}20`,
                  border: `1px solid ${C.textMuted}40`,
                  borderRadius: 4,
                  padding: "1px 6px",
                  textTransform: "uppercase",
                }}
              >
                Paused
              </span>
            )}
          </div>

          {/* Chips row */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
            {alert.keywords && (
              <Chip label={`🔍 ${alert.keywords}`} />
            )}
            {alert.location && (
              <Chip label={`📍 ${alert.location}`} color={C.amber} />
            )}
            {alert.remote && (
              <Chip label="Remote" color={C.green} />
            )}
            <Chip label={`Score ≥ ${alert.minMatchScore}%`} color={C.accent} />
            {alert.minSalary > 0 && (
              <Chip label={formatSalary(alert.minSalary)} color={C.green} />
            )}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {/* Toggle button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onToggle(alert.id, !alert.active)}
            title={alert.active ? "Pause alert" : "Activate alert"}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "6px 10px",
              borderRadius: 7,
              border: `1px solid ${alert.active ? C.accentBorder : C.borderMedium}`,
              background: alert.active ? C.accentMuted : "transparent",
              color: alert.active ? C.accent : C.textSecondary,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {alert.active ? (
              <>
                <Wifi size={13} />
                Pause
              </>
            ) : (
              <>
                <WifiOff size={13} />
                Resume
              </>
            )}
          </motion.button>

          {/* Delete button */}
          <motion.button
            whileHover={{ scale: 1.05, color: C.red }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onDelete(alert.id)}
            title="Delete alert"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 32,
              height: 32,
              borderRadius: 7,
              border: `1px solid ${C.borderSubtle}`,
              background: "transparent",
              color: C.textMuted,
              cursor: "pointer",
              transition: "color 0.15s",
            }}
          >
            <Trash2 size={14} />
          </motion.button>
        </div>
      </div>

      {/* Stats row */}
      <div
        style={{
          display: "flex",
          gap: 20,
          paddingTop: 10,
          borderTop: `1px solid ${C.borderSubtle}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <Clock size={12} color={C.textMuted} />
          <span style={{ fontSize: 12, color: C.textSecondary }}>
            Last run: <span style={{ color: C.textPrimary }}>{formatLastRun(alert.lastRunAt)}</span>
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <Target size={12} color={C.textMuted} />
          <span style={{ fontSize: 12, color: C.textSecondary }}>
            Total matches: <span style={{ color: C.accent, fontWeight: 600 }}>{alert.matchCount}</span>
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Create/Edit Modal ────────────────────────────────────────────────────────

function AlertModal({
  onClose,
  onSubmit,
  loading,
}: {
  onClose: () => void;
  onSubmit: (form: AlertFormState) => void;
  loading: boolean;
}) {
  const [form, setForm] = useState<AlertFormState>(DEFAULT_FORM);
  const [showAdvanced, setShowAdvanced] = useState(false);

  function update<K extends keyof AlertFormState>(key: K, value: AlertFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(form);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(4px)",
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        fontFamily: "'Inter', sans-serif",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        style={{
          background: C.bgSurface,
          border: `1px solid ${C.accentBorder}`,
          borderRadius: 16,
          padding: 28,
          width: "100%",
          maxWidth: 480,
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {/* Modal header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: C.accentMuted,
                border: `1px solid ${C.accentBorder}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Bell size={18} color={C.accent} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.textPrimary }}>
                Create Job Alert
              </div>
              <div style={{ fontSize: 12, color: C.textSecondary }}>
                Get notified when matching jobs appear
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: C.textMuted,
              padding: 4,
              display: "flex",
              alignItems: "center",
            }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Name */}
          <FormField label="ALERT NAME">
            <input
              style={inputStyle}
              placeholder='e.g. "Senior React in NYC"'
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              required
            />
          </FormField>

          {/* Keywords */}
          <FormField label="KEYWORDS (ROLE / SKILLS)">
            <input
              style={inputStyle}
              placeholder='e.g. "React Engineer" or "Machine Learning"'
              value={form.keywords}
              onChange={(e) => update("keywords", e.target.value)}
            />
          </FormField>

          {/* Location */}
          <FormField label="LOCATION">
            <div style={{ position: "relative" }}>
              <MapPin
                size={15}
                color={C.textMuted}
                style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}
              />
              <input
                style={{ ...inputStyle, paddingLeft: 32 }}
                placeholder='e.g. "New York" or "San Francisco"'
                value={form.location}
                onChange={(e) => update("location", e.target.value)}
              />
            </div>
          </FormField>

          {/* Remote checkbox */}
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              cursor: "pointer",
              padding: "10px 12px",
              borderRadius: 8,
              border: `1px solid ${form.remote ? C.accentBorder : C.borderSubtle}`,
              background: form.remote ? C.accentMuted : "transparent",
              transition: "all 0.15s",
            }}
          >
            <input
              type="checkbox"
              checked={form.remote}
              onChange={(e) => update("remote", e.target.checked)}
              style={{ accentColor: C.accentBright, width: 16, height: 16 }}
            />
            <span style={{ fontSize: 14, color: C.textPrimary, fontWeight: 500 }}>
              Remote positions only
            </span>
          </label>

          {/* Min Match Score */}
          <FormField label={`MIN MATCH SCORE — ${form.minMatchScore}%`}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={form.minMatchScore}
                onChange={(e) => update("minMatchScore", parseInt(e.target.value, 10))}
                style={{ flex: 1, accentColor: C.accentBright }}
              />
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: form.minMatchScore >= 80 ? C.green : form.minMatchScore >= 60 ? C.accent : C.amber,
                  minWidth: 36,
                  textAlign: "right",
                }}
              >
                {form.minMatchScore}%
              </span>
            </div>
          </FormField>

          {/* Advanced toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: C.textSecondary,
              fontSize: 13,
              fontWeight: 500,
              padding: 0,
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            Advanced options
          </button>

          <AnimatePresence>
            {showAdvanced && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                style={{ overflow: "hidden" }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: 4 }}>
                  {/* Min Salary */}
                  <FormField label="MIN SALARY (0 = ANY)">
                    <div style={{ position: "relative" }}>
                      <span
                        style={{
                          position: "absolute",
                          left: 12,
                          top: "50%",
                          transform: "translateY(-50%)",
                          color: C.textMuted,
                          fontSize: 14,
                        }}
                      >
                        $
                      </span>
                      <input
                        type="number"
                        min={0}
                        step={1000}
                        style={{ ...inputStyle, paddingLeft: 24 }}
                        placeholder="0"
                        value={form.minSalary === 0 ? "" : form.minSalary}
                        onChange={(e) =>
                          update("minSalary", parseInt(e.target.value || "0", 10))
                        }
                      />
                    </div>
                  </FormField>

                  {/* Active toggle */}
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      cursor: "pointer",
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: `1px solid ${form.active ? C.accentBorder : C.borderSubtle}`,
                      background: form.active ? C.accentMuted : "transparent",
                      transition: "all 0.15s",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={form.active}
                      onChange={(e) => update("active", e.target.checked)}
                      style={{ accentColor: C.accentBright, width: 16, height: 16 }}
                    />
                    <span style={{ fontSize: 14, color: C.textPrimary, fontWeight: 500 }}>
                      Alert is active (runs every hour)
                    </span>
                  </label>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit */}
          <div style={{ display: "flex", gap: 10, paddingTop: 8 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: "11px 0",
                borderRadius: 8,
                border: `1px solid ${C.borderMedium}`,
                background: "transparent",
                color: C.textSecondary,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "'Inter', sans-serif",
              }}
            >
              Cancel
            </button>
            <motion.button
              type="submit"
              disabled={loading || !form.name.trim()}
              whileHover={{ scale: loading ? 1 : 1.02 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
              style={{
                flex: 2,
                padding: "11px 0",
                borderRadius: 8,
                border: "none",
                background: loading ? C.accentMuted : `linear-gradient(135deg, ${C.accentBright}, ${C.accent})`,
                color: loading ? C.textMuted : "#fff",
                fontSize: 14,
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "'Inter', sans-serif",
                transition: "background 0.2s",
              }}
            >
              {loading ? "Creating…" : "Create Alert"}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function JobAlertsPage() {
  const [showModal, setShowModal] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["job-alerts"],
    queryFn: async () => {
      const res = await apiFetch<{ alerts: JobAlert[] }>("/api/job-alerts");
      return res.alerts;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (form: AlertFormState) => {
      return apiFetch<{ alert: JobAlert }>("/api/job-alerts", {
        method: "POST",
        body: JSON.stringify({ action: "create", ...form }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-alerts"] });
      setShowModal(false);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      return apiFetch<{ alert: JobAlert }>("/api/job-alerts", {
        method: "PATCH",
        body: JSON.stringify({ id, active }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-alerts"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiFetch<{ deleted: boolean }>("/api/job-alerts", {
        method: "DELETE",
        body: JSON.stringify({ id }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-alerts"] });
    },
  });

  const alerts = data ?? [];
  const activeCount = alerts.filter((a) => a.active).length;
  const totalMatches = alerts.reduce((sum, a) => sum + a.matchCount, 0);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bgBase,
        fontFamily: "'Inter', sans-serif",
        color: C.textPrimary,
        padding: "32px 24px",
        maxWidth: 860,
        margin: "0 auto",
      }}
    >
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ marginBottom: 32 }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: C.accentMuted,
                border: `1px solid ${C.accentBorder}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Bell size={24} color={C.accent} />
            </div>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>
                Job Alerts
              </h1>
              <p style={{ margin: 0, marginTop: 3, fontSize: 14, color: C.textSecondary }}>
                Get notified when matching jobs appear
              </p>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowModal(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 18px",
              borderRadius: 10,
              border: "none",
              background: `linear-gradient(135deg, ${C.accentBright}, ${C.accent})`,
              color: "#fff",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
              flexShrink: 0,
            }}
          >
            <Plus size={16} />
            Create Alert
          </motion.button>
        </div>

        {/* Stats bar */}
        {alerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              display: "flex",
              gap: 20,
              marginTop: 20,
              padding: "12px 16px",
              background: C.bgSurface,
              border: `1px solid ${C.borderSubtle}`,
              borderRadius: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Bell size={14} color={C.accent} />
              <span style={{ fontSize: 13, color: C.textSecondary }}>
                <span style={{ color: C.textPrimary, fontWeight: 700 }}>{alerts.length}</span> alert{alerts.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Wifi size={14} color={C.green} />
              <span style={{ fontSize: 13, color: C.textSecondary }}>
                <span style={{ color: C.green, fontWeight: 700 }}>{activeCount}</span> active
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <TrendingUp size={14} color={C.amber} />
              <span style={{ fontSize: 13, color: C.textSecondary }}>
                <span style={{ color: C.amber, fontWeight: 700 }}>{totalMatches}</span> total matches
              </span>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Content */}
      {isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ opacity: [0.4, 0.7, 0.4] }}
              transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.15 }}
              style={{
                height: 120,
                borderRadius: 12,
                background: C.bgSurface,
                border: `1px solid ${C.borderSubtle}`,
              }}
            />
          ))}
        </div>
      ) : error ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            padding: 24,
            borderRadius: 12,
            background: `${C.red}10`,
            border: `1px solid ${C.red}30`,
            color: C.red,
            fontSize: 14,
            textAlign: "center",
          }}
        >
          Failed to load job alerts. Please try again.
        </motion.div>
      ) : alerts.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 14,
            padding: "64px 24px",
            borderRadius: 16,
            border: `1px dashed ${C.borderMedium}`,
            background: C.bgSurface,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              background: C.accentMuted,
              border: `1px solid ${C.accentBorder}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Search size={28} color={C.accent} />
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: C.textPrimary, marginBottom: 6 }}>
              No alerts yet
            </div>
            <div style={{ fontSize: 14, color: C.textSecondary, maxWidth: 320 }}>
              Create an alert to get notified automatically when matching jobs appear
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowModal(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 20px",
              borderRadius: 10,
              border: "none",
              background: `linear-gradient(135deg, ${C.accentBright}, ${C.accent})`,
              color: "#fff",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
              marginTop: 4,
            }}
          >
            <Plus size={15} />
            Create First Alert
          </motion.button>
        </motion.div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <AnimatePresence mode="popLayout">
            {alerts.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onToggle={(id, active) => toggleMutation.mutate({ id, active })}
                onDelete={(id) => deleteMutation.mutate(id)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {showModal && (
          <AlertModal
            onClose={() => setShowModal(false)}
            onSubmit={(form) => createMutation.mutate(form)}
            loading={createMutation.isPending}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
