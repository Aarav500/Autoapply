"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import {
  Settings,
  Bell,
  Mail,
  MessageSquare,
  Zap,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Play,
  Pause,
  RefreshCw,
  Activity,
  FileText,
  Plus,
  Trash2,
  Sparkles,
  X,
  Tag,
  Loader2,
  Ban,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

type TabId = "notifications" | "auto-apply" | "integrations" | "general" | "scheduler" | "templates" | "blacklist";

// ─── Design tokens ────────────────────────────────────────────────────────────

const T = {
  bgBase: "#060608",
  bgSurface: "#0C0C14",
  bgElevated: "#111120",
  accent: "#8B5CF6",
  accentBright: "#7C3AED",
  accentMuted: "rgba(124, 58, 237,0.12)",
  accentBorder: "rgba(124, 58, 237,0.25)",
  textPrimary: "#F0F0FF",
  textSecondary: "#9090B8",
  textMuted: "#3A3A60",
  borderSubtle: "rgba(255,255,255,0.05)",
  cardBg: "#0C0C14",
  cardBorder: "rgba(255,255,255,0.06)",
  green: "#34D399",
  amber: "#FBBF24",
  red: "#F87171",
};

const inputBase: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: `1px solid rgba(255,255,255,0.07)`,
  fontFamily: "'Inter', sans-serif",
  fontSize: "14px",
  color: T.textPrimary,
  outline: "none",
  transition: "border-color 0.15s",
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("notifications");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const queryClient = useQueryClient();

  const { data: prefsData } = useQuery({
    queryKey: ["notificationPreferences"],
    queryFn: () => apiFetch<Record<string, unknown>>("/api/comms/notifications/preferences"),
    retry: false,
  });

  const { data: autoApplyData } = useQuery({
    queryKey: ["autoApplyRules"],
    queryFn: () => apiFetch<Record<string, unknown>>("/api/settings/auto-apply"),
    retry: false,
  });

  const { data: autoReplyData } = useQuery({
    queryKey: ["autoReplySettings"],
    queryFn: () => apiFetch<Record<string, unknown>>("/api/comms/auto-reply"),
    retry: false,
  });

  const prefsInner = (prefsData as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
  const prefs = (prefsInner?.preferences || prefsInner) as Record<string, unknown> | undefined;

  const autoApplyInner = (autoApplyData as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
  const autoApplyRulesWrapped = autoApplyInner?.data as Record<string, unknown> | undefined;
  const autoApplyRules = (autoApplyRulesWrapped?.autoApplyRules || autoApplyInner?.autoApplyRules || {}) as Record<string, unknown>;

  const autoReplyInner = (autoReplyData as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
  const autoReply = (autoReplyInner?.settings || autoReplyInner) as Record<string, unknown> | undefined;

  const updatePrefsMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch("/api/comms/notifications/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["notificationPreferences"] }); flashSaved(); },
    onError: () => setSaveStatus("error"),
  });

  const updateAutoApplyMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch("/api/settings/auto-apply", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["autoApplyRules"] }); flashSaved(); },
    onError: () => setSaveStatus("error"),
  });

  const updateAutoReplyMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch("/api/comms/auto-reply", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["autoReplySettings"] }); flashSaved(); },
    onError: () => setSaveStatus("error"),
  });

  const flashSaved = () => {
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2000);
  };

  const tabs: { id: TabId; label: string; icon: React.ElementType; description: string }[] = [
    { id: "notifications", label: "Notifications", icon: Bell, description: "Alerts & channels" },
    { id: "auto-apply", label: "Auto-Apply", icon: Zap, description: "Engine rules" },
    { id: "integrations", label: "Integrations", icon: Mail, description: "Connected services" },
    { id: "scheduler", label: "Scheduler", icon: Activity, description: "Background tasks" },
    { id: "general", label: "General", icon: Settings, description: "Timezone & account" },
    { id: "templates", label: "Templates", icon: FileText, description: "Answer library" },
    { id: "blacklist", label: "Blacklist", icon: Ban, description: "Hidden companies" },
  ];

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* ── Page header ── */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: T.accentMuted, border: `1px solid ${T.accentBorder}` }}
          >
            <Settings size={20} style={{ color: T.accent }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "'Inter', sans-serif", color: T.textPrimary }}>
              Settings
            </h1>
            <p className="text-sm mt-0.5" style={{ fontFamily: "'Inter', sans-serif", color: T.textSecondary }}>
              Configure your AutoApply preferences
            </p>
          </div>
        </div>

        {/* Save indicator */}
        <div className="h-8 flex items-center">
          {saveStatus === "saved" && (
            <motion.div
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg"
              style={{ background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.25)", color: T.green }}
            >
              <CheckCircle2 size={14} />
              <span style={{ fontFamily: "'Inter', sans-serif" }}>Saved</span>
            </motion.div>
          )}
          {saveStatus === "error" && (
            <div
              className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg"
              style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", color: T.red }}
            >
              <AlertCircle size={14} />
              <span style={{ fontFamily: "'Inter', sans-serif" }}>Failed to save</span>
            </div>
          )}
          {saveStatus === "idle" && (
            <div style={{ width: "1px" }} />
          )}
        </div>
      </div>

      {/* ── Layout: sidebar + content ── */}
      <div className="flex gap-6">
        {/* Left sidebar nav */}
        <aside className="w-52 flex-shrink-0">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all"
                  style={{
                    background: active ? T.accentMuted : "transparent",
                    border: `1px solid ${active ? T.accentBorder : "transparent"}`,
                  }}
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: active ? T.accentMuted : "rgba(255,255,255,0.04)" }}
                  >
                    <tab.icon size={14} style={{ color: active ? T.accent : T.textSecondary }} />
                  </div>
                  <div className="min-w-0">
                    <p
                      className="text-sm font-medium leading-tight"
                      style={{ fontFamily: "'Inter', sans-serif", color: active ? T.accent : T.textPrimary }}
                    >
                      {tab.label}
                    </p>
                    <p className="text-[11px] leading-tight mt-0.5 truncate" style={{ color: T.textMuted }}>
                      {tab.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </nav>

          {/* Quick-save hint */}
          <div className="mt-6 px-3 py-3 rounded-xl" style={{ background: T.bgElevated, border: `1px solid ${T.cardBorder}` }}>
            <p className="text-[11px] leading-relaxed" style={{ fontFamily: "'Inter', sans-serif", color: T.textMuted }}>
              Changes save automatically when you toggle a setting or blur a field.
            </p>
          </div>
        </aside>

        {/* Right content panel */}
        <div className="flex-1 min-w-0">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            className="rounded-xl border p-6 space-y-6"
            style={{ background: T.bgSurface, borderColor: T.cardBorder }}
          >
            {/* ── Notifications tab ── */}
            {activeTab === "notifications" && (
              <div className="space-y-6">
                <SectionTitle>Notification Channels</SectionTitle>
                <ToggleRow
                  label="In-App Notifications"
                  description="Show notifications inside AutoApply"
                  checked={prefs?.inAppEnabled !== false}
                  onChange={(v) => updatePrefsMutation.mutate({ inAppEnabled: v })}
                />
                <ToggleRow
                  label="Email Digest"
                  description="Receive daily email summaries of activity"
                  checked={!!prefs?.emailDigestEnabled}
                  onChange={(v) => updatePrefsMutation.mutate({ emailDigestEnabled: v })}
                />
                <ToggleRow
                  label="Telegram Notifications"
                  description="Get alerts via Telegram bot — free, with inline action buttons"
                  checked={!!prefs?.telegramEnabled}
                  onChange={(v) => updatePrefsMutation.mutate({ telegramEnabled: v })}
                />
                <Divider />
                <SectionTitle>Notification Types</SectionTitle>
                <ToggleRow
                  label="Interview Reminders"
                  description="Get reminded before upcoming interviews"
                  checked={prefs?.interviewReminders !== false}
                  onChange={(v) => updatePrefsMutation.mutate({ interviewReminders: v })}
                />
                <ToggleRow
                  label="Job Match Alerts"
                  description="Notify when new jobs match your preferences"
                  checked={prefs?.jobMatchAlerts !== false}
                  onChange={(v) => updatePrefsMutation.mutate({ jobMatchAlerts: v })}
                />
                <ToggleRow
                  label="Application Updates"
                  description="Status changes on your applications"
                  checked={prefs?.applicationUpdates !== false}
                  onChange={(v) => updatePrefsMutation.mutate({ applicationUpdates: v })}
                />
                <ToggleRow
                  label="Daily Digest"
                  description="Daily summary of all activity"
                  checked={!!prefs?.dailyDigest}
                  onChange={(v) => updatePrefsMutation.mutate({ dailyDigest: v })}
                />
              </div>
            )}

            {/* ── Auto-Apply tab ── */}
            {activeTab === "auto-apply" && (
              <div className="space-y-6">
                <SectionTitle>Auto-Apply Engine</SectionTitle>
                <ToggleRow
                  label="Enable Auto-Apply"
                  description="Automatically apply to high-match jobs"
                  checked={!!autoApplyRules.enabled}
                  onChange={(v) => updateAutoApplyMutation.mutate({ enabled: v })}
                />
                <Divider />
                <SectionTitle>Rules</SectionTitle>
                <NumberRow
                  label="Minimum Match Score"
                  description="Only apply to jobs with at least this match score (0-100)"
                  value={Number(autoApplyRules.minMatchScore) || 70}
                  min={0}
                  max={100}
                  onChange={(v) => updateAutoApplyMutation.mutate({ minMatchScore: v })}
                />
                <NumberRow
                  label="Max Applications Per Day"
                  description="Limit daily auto-applications (1-50)"
                  value={Number(autoApplyRules.maxApplicationsPerDay) || 10}
                  min={1}
                  max={50}
                  onChange={(v) => updateAutoApplyMutation.mutate({ maxApplicationsPerDay: v })}
                />
                <ToggleRow
                  label="Require Remote"
                  description="Only auto-apply to remote positions"
                  checked={!!autoApplyRules.requireRemote}
                  onChange={(v) => updateAutoApplyMutation.mutate({ requireRemote: v })}
                />
                <Divider />
                <SectionTitle>Excluded Companies</SectionTitle>
                <TagInput
                  tags={(autoApplyRules.excludeCompanies as string[]) || []}
                  placeholder="Add company to exclude..."
                  onChange={(tags) => updateAutoApplyMutation.mutate({ excludeCompanies: tags })}
                />
              </div>
            )}

            {/* ── Integrations tab ── */}
            {activeTab === "integrations" && (
              <IntegrationsTab
                autoReply={autoReply}
                updateAutoReplyMutation={updateAutoReplyMutation}
              />
            )}

            {/* ── Scheduler tab ── */}
            {activeTab === "scheduler" && (
              <SchedulerTab />
            )}

            {/* ── Templates tab ── */}
            {activeTab === "templates" && <TemplatesTab />}

            {/* ── Blacklist tab ── */}
            {activeTab === "blacklist" && <BlacklistTab />}

            {/* ── General tab ── */}
            {activeTab === "general" && (
              <div className="space-y-6">
                <SectionTitle>Quiet Hours</SectionTitle>
                <p className="text-[12px] -mt-4" style={{ fontFamily: "'Inter', sans-serif", color: T.textMuted }}>
                  Suppress non-critical notifications during these hours
                </p>
                <div className="flex gap-4">
                  <TimeInput
                    label="Start"
                    value={String(prefs?.quietHoursStart || "22:00")}
                    onChange={(v) => updatePrefsMutation.mutate({ quietHoursStart: v })}
                  />
                  <TimeInput
                    label="End"
                    value={String(prefs?.quietHoursEnd || "08:00")}
                    onChange={(v) => updatePrefsMutation.mutate({ quietHoursEnd: v })}
                  />
                </div>

                <Divider />
                <SectionTitle>Timezone</SectionTitle>
                <select
                  value={String(prefs?.timezone || "UTC")}
                  onChange={(e) => updatePrefsMutation.mutate({ timezone: e.target.value })}
                  className="w-full max-w-xs px-4 py-2.5 rounded-xl"
                  style={{ ...inputBase, border: `1px solid rgba(255,255,255,0.07)`, borderRadius: "12px" }}
                >
                  {[
                    "UTC",
                    "America/New_York",
                    "America/Chicago",
                    "America/Denver",
                    "America/Los_Angeles",
                    "Europe/London",
                    "Europe/Berlin",
                    "Europe/Paris",
                    "Asia/Tokyo",
                    "Asia/Shanghai",
                    "Asia/Kolkata",
                    "Australia/Sydney",
                  ].map((tz) => (
                    <option key={tz} value={tz} style={{ background: T.bgElevated }}>
                      {tz.replace("_", " ")}
                    </option>
                  ))}
                </select>

                <Divider />

                {/* Danger zone */}
                <div
                  className="p-5 rounded-xl"
                  style={{
                    background: "rgba(248,113,113,0.04)",
                    border: "1px solid rgba(248,113,113,0.18)",
                  }}
                >
                  <p
                    className="text-xs font-semibold uppercase tracking-widest mb-1"
                    style={{ fontFamily: "'Inter', sans-serif", color: T.red, letterSpacing: "0.1em" }}
                  >
                    Danger Zone
                  </p>
                  <p className="text-[12px] mb-4" style={{ fontFamily: "'Inter', sans-serif", color: T.textSecondary }}>
                    Signing out will clear your local session tokens.
                  </p>
                  <button
                    onClick={() => {
                      localStorage.removeItem("accessToken");
                      localStorage.removeItem("refreshToken");
                      window.location.href = "/login";
                    }}
                    className="px-5 py-2 rounded-lg font-semibold text-sm transition-all hover:opacity-90"
                    style={{
                      background: "rgba(248,113,113,0.12)",
                      border: "1px solid rgba(248,113,113,0.3)",
                      color: T.red,
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: string }) {
  return (
    <h3
      className="text-[13px] font-semibold uppercase tracking-wider"
      style={{ fontFamily: "'Inter', sans-serif", color: T.textMuted, letterSpacing: "0.07em" }}
    >
      {children}
    </h3>
  );
}

function Divider() {
  return <div className="h-px" style={{ background: T.borderSubtle }} />;
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  const [localChecked, setLocalChecked] = useState(checked);

  useEffect(() => {
    setLocalChecked(checked);
  }, [checked]);

  const handleToggle = () => {
    const next = !localChecked;
    setLocalChecked(next);
    onChange(next);
  };

  return (
    <div className="flex items-center justify-between py-0.5">
      <div className="mr-4">
        <p className="text-[13px] font-medium" style={{ fontFamily: "'Inter', sans-serif", color: T.textPrimary }}>
          {label}
        </p>
        <p className="text-[11px] mt-0.5" style={{ fontFamily: "'Inter', sans-serif", color: T.textMuted }}>
          {description}
        </p>
      </div>
      <button
        onClick={handleToggle}
        className="w-11 h-6 rounded-full relative flex-shrink-0 transition-all duration-200"
        style={{
          background: localChecked ? T.accentBright : "rgba(255,255,255,0.08)",
        }}
        aria-label={label}
      >
        <motion.div
          animate={{ x: localChecked ? 20 : 2 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className="w-5 h-5 rounded-full absolute top-0.5"
          style={{ background: localChecked ? "#fff" : T.textMuted }}
        />
      </button>
    </div>
  );
}

function NumberRow({
  label,
  description,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  description: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const [local, setLocal] = useState(String(value));

  const handleBlur = () => {
    const num = Math.min(max, Math.max(min, parseInt(local) || min));
    setLocal(String(num));
    if (num !== value) onChange(num);
  };

  return (
    <div className="flex items-center justify-between py-0.5">
      <div>
        <p className="text-[13px] font-medium" style={{ fontFamily: "'Inter', sans-serif", color: T.textPrimary }}>
          {label}
        </p>
        <p className="text-[11px] mt-0.5" style={{ fontFamily: "'Inter', sans-serif", color: T.textMuted }}>
          {description}
        </p>
      </div>
      <input
        type="number"
        value={local}
        min={min}
        max={max}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={handleBlur}
        className="w-20 px-3 py-1.5 rounded-lg text-center"
        style={{ ...inputBase, fontFamily: "monospace, monospace", fontSize: "13px", borderRadius: "10px" }}
      />
    </div>
  );
}

function TagInput({
  tags,
  placeholder,
  onChange,
}: {
  tags: string[];
  placeholder: string;
  onChange: (tags: string[]) => void;
}) {
  const [input, setInput] = useState("");

  const addTag = () => {
    const val = input.trim();
    if (val && !tags.includes(val)) {
      onChange([...tags, val]);
      setInput("");
    }
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter((t) => t !== tag));
  };

  return (
    <div>
      <div className="flex gap-2 mb-3 flex-wrap min-h-[24px]">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[12px]"
            style={{
              background: "rgba(248,113,113,0.08)",
              border: "1px solid rgba(248,113,113,0.2)",
              fontFamily: "'Inter', sans-serif",
              color: T.red,
            }}
          >
            {tag}
            <button onClick={() => removeTag(tag)} className="hover:text-white transition-colors leading-none">
              &times;
            </button>
          </span>
        ))}
        {tags.length === 0 && (
          <span className="text-[12px]" style={{ fontFamily: "'Inter', sans-serif", color: T.textMuted }}>
            No companies excluded
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTag()}
          placeholder={placeholder}
          className="flex-1 px-4 py-2 rounded-xl"
          style={{ ...inputBase, borderRadius: "12px" }}
        />
        <button
          onClick={addTag}
          disabled={!input.trim()}
          className="px-4 py-2 rounded-xl text-[13px] font-semibold transition-all disabled:opacity-30"
          style={{
            background: T.accentMuted,
            border: `1px solid ${T.accentBorder}`,
            color: T.accent,
            fontFamily: "'Inter', sans-serif",
          }}
        >
          Add
        </button>
      </div>
    </div>
  );
}

function TimeInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="block text-[11px] mb-1.5" style={{ fontFamily: "'Inter', sans-serif", color: T.textSecondary }}>
        {label}
      </label>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-4 py-2 rounded-xl"
        style={{ ...inputBase, fontFamily: "monospace, monospace", colorScheme: "dark", borderRadius: "12px" }}
      />
    </div>
  );
}

function IntegrationsTab({
  autoReply,
  updateAutoReplyMutation,
}: {
  autoReply: Record<string, unknown> | undefined;
  updateAutoReplyMutation: { mutate: (data: Record<string, unknown>) => void };
}) {
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [telegramCode, setTelegramCode] = useState<string | null>(null);
  const [telegramCodeExpiry, setTelegramCodeExpiry] = useState<string | null>(null);
  const [telegramLoading, setTelegramLoading] = useState(false);
  const [telegramUnlinkLoading, setTelegramUnlinkLoading] = useState(false);
  const queryClient = useQueryClient();

  const { data: statusData } = useQuery({
    queryKey: ["integrationStatus"],
    queryFn: () => apiFetch<Record<string, unknown>>("/api/settings/integrations"),
    retry: false,
  });

  const { data: telegramStatusData, refetch: refetchTelegram } = useQuery({
    queryKey: ["telegramStatus"],
    queryFn: () => apiFetch<Record<string, unknown>>("/api/comms/telegram/connect"),
    retry: false,
  });

  const statusInner = (statusData as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
  const gmail = statusInner?.gmail as Record<string, unknown> | undefined;
  const calendar = statusInner?.calendar as Record<string, unknown> | undefined;
  const telegramInner = (telegramStatusData as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
  const telegramIsLinked = !!telegramInner?.isLinked;
  const telegramServerConfigured = !!telegramInner?.isServerConfigured;
  const telegramBotUsername = (telegramInner?.botUsername as string) || "YourAutoApplyBot";

  const handleOAuthConnect = async (endpoint: string, name: string) => {
    setOauthLoading(name);
    try {
      const res = await apiFetch<Record<string, unknown>>(endpoint);
      const data = (res as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
      const authUrl = (data?.authUrl || data?.url) as string;
      if (authUrl) window.location.href = authUrl;
    } catch {
      // Error handled by status display
    } finally {
      setOauthLoading(null);
    }
  };

  const handleTelegramConnect = async () => {
    setTelegramLoading(true);
    try {
      const res = await apiFetch<Record<string, unknown>>("/api/comms/telegram/connect", { method: "POST" });
      const data = (res as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
      setTelegramCode((data?.code as string) || null);
      setTelegramCodeExpiry((data?.expiresAt as string) || null);
    } catch {
      // ignore
    } finally {
      setTelegramLoading(false);
    }
  };

  const handleTelegramUnlink = async () => {
    setTelegramUnlinkLoading(true);
    try {
      await apiFetch("/api/comms/telegram/connect", { method: "DELETE" });
      setTelegramCode(null);
      await refetchTelegram();
      queryClient.invalidateQueries({ queryKey: ["telegramStatus"] });
    } catch {
      // ignore
    } finally {
      setTelegramUnlinkLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionTitle>Email</SectionTitle>
      <IntegrationStatus
        icon={Mail}
        title="Gmail"
        description="Connect Gmail to sync emails and send replies"
        serverConfigured={!!gmail?.serverConfigured}
        userConnected={!!gmail?.userConnected}
        onConnect={() => handleOAuthConnect("/api/comms/email/connect", "gmail")}
        loading={oauthLoading === "gmail"}
        envVars={["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REDIRECT_URI"]}
      />
      <ToggleRow
        label="Auto-Reply"
        description="Automatically respond to certain email categories"
        checked={!!autoReply?.enabled}
        onChange={(v) => updateAutoReplyMutation.mutate({ enabled: v })}
      />

      <Divider />
      <SectionTitle>Messaging — Free via Telegram</SectionTitle>

      {/* Telegram Integration */}
      <div
        className="p-4 rounded-xl space-y-4"
        style={{ background: T.bgElevated, border: `1px solid ${T.cardBorder}` }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(38,136,221,0.15)" }}
            >
              <MessageSquare size={18} style={{ color: "#26A8DC" }} />
            </div>
            <div>
              <p className="text-[13px] font-medium" style={{ fontFamily: "'Inter', sans-serif", color: T.textPrimary }}>
                Telegram Bot <span className="text-[10px] ml-1 px-1.5 py-0.5 rounded" style={{ background: "rgba(74,222,128,0.12)", color: T.green }}>Free</span>
              </p>
              <p className="text-[11px]" style={{ fontFamily: "'Inter', sans-serif", color: T.textMuted }}>
                Job alerts, interview confirmations with inline buttons — no SMS costs
              </p>
            </div>
          </div>
          {telegramIsLinked ? (
            <div className="flex items-center gap-2">
              <span
                className="text-[11px] font-semibold px-3 py-1.5 rounded-lg"
                style={{ background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.25)", color: T.green, fontFamily: "'Inter', sans-serif" }}
              >
                Linked
              </span>
              <button
                onClick={handleTelegramUnlink}
                disabled={telegramUnlinkLoading}
                className="text-[11px] px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
                style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", color: T.red, fontFamily: "'Inter', sans-serif" }}
              >
                Unlink
              </button>
            </div>
          ) : telegramServerConfigured ? (
            <button
              onClick={handleTelegramConnect}
              disabled={telegramLoading}
              className="px-4 py-1.5 rounded-lg text-[12px] font-semibold transition-all disabled:opacity-50"
              style={{ background: T.accentMuted, border: `1px solid ${T.accentBorder}`, color: T.accent, fontFamily: "'Inter', sans-serif" }}
            >
              {telegramLoading ? "Generating..." : telegramCode ? "New Code" : "Connect"}
            </button>
          ) : (
            <span className="text-[11px] px-2 py-1 rounded" style={{ background: "rgba(255,255,255,0.04)", color: T.textMuted, fontFamily: "'Inter', sans-serif" }}>
              Needs TELEGRAM_BOT_TOKEN
            </span>
          )}
        </div>

        {/* Link code display */}
        {telegramCode && !telegramIsLinked && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="rounded-xl p-4 space-y-3"
            style={{ background: "rgba(38,136,221,0.06)", border: "1px solid rgba(38,136,221,0.2)" }}
          >
            <p className="text-[12px] font-medium" style={{ fontFamily: "'Inter', sans-serif", color: "#26A8DC" }}>
              Link your account:
            </p>
            <ol className="text-[12px] space-y-1.5 list-decimal list-inside" style={{ fontFamily: "'Inter', sans-serif", color: T.textSecondary }}>
              <li>Open Telegram and find <strong style={{ color: T.textPrimary }}>@{telegramBotUsername}</strong></li>
              <li>Send this command to the bot:</li>
            </ol>
            <div
              className="flex items-center justify-between px-4 py-2.5 rounded-lg cursor-pointer"
              style={{ background: T.bgBase, border: `1px solid ${T.accentBorder}` }}
              onClick={() => navigator.clipboard?.writeText(`/link ${telegramCode}`)}
            >
              <code className="text-base font-bold tracking-widest" style={{ color: T.accent, fontFamily: "monospace, monospace" }}>
                /link {telegramCode}
              </code>
              <span className="text-[10px]" style={{ color: T.textMuted }}>tap to copy</span>
            </div>
            {telegramCodeExpiry && (
              <p className="text-[10px]" style={{ fontFamily: "'Inter', sans-serif", color: T.textMuted }}>
                Code expires at {new Date(telegramCodeExpiry).toLocaleTimeString()}
              </p>
            )}
          </motion.div>
        )}

        {!telegramServerConfigured && (
          <p className="text-[11px] px-1" style={{ fontFamily: "'Inter', sans-serif", color: T.textMuted }}>
            Set <code style={{ color: T.textSecondary }}>TELEGRAM_BOT_TOKEN</code> and <code style={{ color: T.textSecondary }}>TELEGRAM_BOT_USERNAME</code> in your environment. Create a bot free at @BotFather.
          </p>
        )}
      </div>

      <Divider />
      <SectionTitle>Calendar</SectionTitle>
      <IntegrationStatus
        icon={Clock}
        title="Google Calendar"
        description="Auto-schedule interviews and get calendar reminders"
        serverConfigured={!!calendar?.serverConfigured}
        userConnected={!!calendar?.userConnected}
        onConnect={() => handleOAuthConnect("/api/comms/calendar/connect", "calendar")}
        loading={oauthLoading === "calendar"}
        envVars={["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"]}
      />
    </div>
  );
}

function IntegrationStatus({
  icon: Icon,
  title,
  description,
  serverConfigured,
  userConnected,
  onConnect,
  loading,
  envVars,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  serverConfigured: boolean;
  userConnected: boolean;
  onConnect: () => void;
  loading: boolean;
  envVars: string[];
}) {
  return (
    <div
      className="p-4 rounded-xl"
      style={{ background: T.bgElevated, border: `1px solid ${T.cardBorder}` }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: T.accentMuted }}
          >
            <Icon size={18} style={{ color: T.accent }} />
          </div>
          <div>
            <p className="text-[13px] font-medium" style={{ fontFamily: "'Inter', sans-serif", color: T.textPrimary }}>
              {title}
            </p>
            <p className="text-[11px]" style={{ fontFamily: "'Inter', sans-serif", color: T.textMuted }}>
              {description}
            </p>
          </div>
        </div>
        {userConnected ? (
          <span
            className="text-[11px] font-semibold px-3 py-1.5 rounded-lg"
            style={{ background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.25)", color: T.green, fontFamily: "'Inter', sans-serif" }}
          >
            Connected
          </span>
        ) : serverConfigured ? (
          <button
            onClick={onConnect}
            disabled={loading}
            className="px-4 py-1.5 rounded-lg text-[12px] font-semibold transition-all disabled:opacity-50"
            style={{ background: T.accentMuted, border: `1px solid ${T.accentBorder}`, color: T.accent, fontFamily: "'Inter', sans-serif" }}
          >
            {loading ? "Connecting..." : "Connect"}
          </button>
        ) : (
          <span
            className="text-[11px] font-semibold px-3 py-1.5 rounded-lg"
            style={{ background: "rgba(252,211,77,0.08)", border: "1px solid rgba(252,211,77,0.2)", color: T.amber, fontFamily: "'Inter', sans-serif" }}
          >
            Not Configured
          </span>
        )}
      </div>
      {!serverConfigured && (
        <div className="mt-3 p-3 rounded-lg" style={{ background: "rgba(252,211,77,0.04)", border: "1px solid rgba(252,211,77,0.1)" }}>
          <p className="text-[11px]" style={{ fontFamily: "'Inter', sans-serif", color: T.amber }}>
            Server-side credentials not configured. Add these environment variables:
          </p>
          <p className="text-[11px] mt-1" style={{ fontFamily: "monospace, monospace", color: T.textSecondary }}>
            {envVars.join(", ")}
          </p>
        </div>
      )}
    </div>
  );
}


const _EyeRef = Eye;
const _EyeOffRef = EyeOff;
void _EyeRef;
void _EyeOffRef;

// ─── Scheduler Tab ─────────────────────────────────────────────────────────────

interface TaskStatus {
  name: string;
  enabled: boolean;
  lastRun: string;
  interval: string;
}

const TASK_META: Record<string, { label: string; description: string }> = {
  "auto-search":          { label: "Auto Search",       description: "Finds new job matches every hour" },
  "email-sync":           { label: "Email Sync",        description: "Syncs Gmail inbox every 15 min" },
  "interview-reminders":  { label: "Interview Reminders", description: "Sends reminders every 15 min" },
  "auto-apply":           { label: "Auto Apply",        description: "Submits applications every 2 hours" },
  "daily-digest":         { label: "Daily Digest",      description: "Sends digest at 8 AM daily" },
  "linkedin-optimize":    { label: "LinkedIn Optimize", description: "Refreshes LinkedIn suggestions weekly" },
  "github-optimize":      { label: "GitHub Optimize",   description: "Refreshes GitHub suggestions weekly" },
  "job-alerts":           { label: "Job Alerts",        description: "Checks alert rules every hour" },
  "follow-up":            { label: "Follow-Up",         description: "Sends follow-ups daily" },
  "email-followup":       { label: "Email Follow-Up",   description: "Generates follow-up drafts every 6 hours" },
};

function formatLastRun(lastRun: string): string {
  if (lastRun === "never") return "Never run";
  try {
    const d = new Date(lastRun);
    const diffMs = Date.now() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h ago`;
    return d.toLocaleDateString();
  } catch {
    return lastRun;
  }
}

function SchedulerTab() {
  const queryClient = useQueryClient();
  const [triggeringTask, setTriggeringTask] = useState<string | null>(null);
  const [togglingTask, setTogglingTask] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, string>>({});

  const { data: schedulerData, isLoading, refetch } = useQuery({
    queryKey: ["schedulerStatus"],
    queryFn: () => apiFetch<{ data: { tasks: TaskStatus[] } }>("/api/settings/scheduler"),
    refetchInterval: 30000,
    retry: false,
  });

  const tasks: TaskStatus[] =
    (schedulerData as Record<string, unknown>)?.tasks as TaskStatus[] ?? [];

  const triggerTask = async (taskName: string, action: "run-now" | "enable" | "disable") => {
    if (action === "run-now") setTriggeringTask(taskName);
    else setTogglingTask(taskName);
    try {
      await apiFetch("/api/settings/scheduler", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, task: taskName }),
      });
      setFeedback((prev) => ({ ...prev, [taskName]: action === "run-now" ? "Triggered!" : action === "enable" ? "Enabled" : "Disabled" }));
      setTimeout(() => setFeedback((prev) => { const n = { ...prev }; delete n[taskName]; return n; }), 3000);
      queryClient.invalidateQueries({ queryKey: ["schedulerStatus"] });
    } catch {
      setFeedback((prev) => ({ ...prev, [taskName]: "Failed" }));
      setTimeout(() => setFeedback((prev) => { const n = { ...prev }; delete n[taskName]; return n; }), 3000);
    } finally {
      if (action === "run-now") setTriggeringTask(null);
      else setTogglingTask(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <SectionTitle>Background Tasks</SectionTitle>
          <p className="text-[12px] mt-1" style={{ fontFamily: "'Inter', sans-serif", color: T.textMuted }}>
            Monitor and manually trigger scheduled automation tasks
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] transition-all hover:bg-white/5"
          style={{ border: `1px solid ${T.cardBorder}`, color: T.textSecondary, fontFamily: "'Inter', sans-serif" }}
        >
          <RefreshCw size={13} />
          Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: T.bgElevated }} />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div
          className="p-6 rounded-xl text-center"
          style={{ background: T.bgElevated, border: `1px solid ${T.cardBorder}` }}
        >
          <Activity size={22} style={{ color: T.textMuted, margin: "0 auto 8px" }} />
          <p className="text-[13px]" style={{ color: T.textSecondary, fontFamily: "'Inter', sans-serif" }}>
            Scheduler not running
          </p>
          <p className="text-[11px] mt-1" style={{ color: T.textMuted, fontFamily: "'Inter', sans-serif" }}>
            Tasks start when the server boots
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => {
            const meta = TASK_META[task.name] ?? { label: task.name, description: "" };
            const isTriggering = triggeringTask === task.name;
            const isToggling = togglingTask === task.name;
            const fb = feedback[task.name];

            return (
              <div
                key={task.name}
                className="flex items-center justify-between px-4 py-3 rounded-xl"
                style={{
                  background: T.bgElevated,
                  border: `1px solid ${task.enabled ? T.cardBorder : "rgba(255,255,255,0.03)"}`,
                  opacity: task.enabled ? 1 : 0.6,
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      background: task.enabled ? T.accentMuted : "rgba(255,255,255,0.04)",
                    }}
                  >
                    <Activity size={14} style={{ color: task.enabled ? T.accent : T.textMuted }} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-medium" style={{ fontFamily: "'Inter', sans-serif", color: T.textPrimary }}>
                        {meta.label}
                      </p>
                      {!task.enabled && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded"
                          style={{ background: "rgba(248,113,113,0.1)", color: T.red, fontFamily: "monospace" }}
                        >
                          disabled
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-[11px]" style={{ fontFamily: "'Inter', sans-serif", color: T.textMuted }}>
                        {meta.description}
                      </p>
                      <span style={{ color: T.textMuted, fontSize: 10 }}>·</span>
                      <p className="text-[11px]" style={{ fontFamily: "monospace", color: T.textMuted }}>
                        {formatLastRun(task.lastRun)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                  {fb && (
                    <span
                      className="text-[11px]"
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        color: fb === "Failed" ? T.red : T.green,
                      }}
                    >
                      {fb}
                    </span>
                  )}
                  {/* Toggle enable/disable */}
                  <button
                    onClick={() => triggerTask(task.name, task.enabled ? "disable" : "enable")}
                    disabled={isToggling || isTriggering}
                    className="p-1.5 rounded-lg transition-all hover:bg-white/5 disabled:opacity-40"
                    style={{ border: `1px solid ${T.cardBorder}`, color: task.enabled ? T.amber : T.green }}
                    title={task.enabled ? "Disable task" : "Enable task"}
                  >
                    {isToggling ? (
                      <RefreshCw size={13} className="animate-spin" />
                    ) : task.enabled ? (
                      <Pause size={13} />
                    ) : (
                      <Play size={13} />
                    )}
                  </button>
                  {/* Run now */}
                  <button
                    onClick={() => triggerTask(task.name, "run-now")}
                    disabled={isTriggering || isToggling || !task.enabled}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all hover:opacity-80 disabled:opacity-40"
                    style={{
                      background: T.accentMuted,
                      border: `1px solid ${T.accentBorder}`,
                      color: T.accent,
                      fontFamily: "'Inter', sans-serif",
                    }}
                    title="Run task now"
                  >
                    {isTriggering ? (
                      <RefreshCw size={11} className="animate-spin" />
                    ) : (
                      <Play size={11} />
                    )}
                    {isTriggering ? "Running…" : "Run Now"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div
        className="p-4 rounded-xl"
        style={{ background: "rgba(124,58,237,0.04)", border: `1px solid rgba(124,58,237,0.12)` }}
      >
        <p className="text-[11px]" style={{ fontFamily: "'Inter', sans-serif", color: T.textMuted }}>
          Tasks run automatically in the background. &ldquo;Run Now&rdquo; triggers an immediate execution
          outside the normal schedule. Disabled tasks are skipped until re-enabled.
        </p>
      </div>
    </div>
  );
}

// ─── TemplatesTab ────────────────────────────────────────────────────────────

interface AppTemplate {
  id: string;
  question: string;
  answer: string;
  category: "motivation" | "experience" | "skills" | "cultural" | "salary" | "availability" | "other";
  tags: string[];
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  motivation: "#8B5CF6",
  experience: "#60A5FA",
  skills: "#34D399",
  cultural: "#FBBF24",
  salary: "#F87171",
  availability: "#A78BFA",
  other: "#9090B8",
};

function TemplatesTab() {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [category, setCategory] = useState<AppTemplate["category"]>("other");
  const [isGenerating, setIsGenerating] = useState(false);
  const [genContext, setGenContext] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAnswer, setEditAnswer] = useState("");
  const [filterCat, setFilterCat] = useState("all");

  const { data, isLoading } = useQuery<{ templates: AppTemplate[] }>({
    queryKey: ["appTemplates"],
    queryFn: () => apiFetch<{ templates: AppTemplate[] }>("/api/application-templates"),
  });

  const saveMutation = useMutation({
    mutationFn: (body: { question: string; answer: string; category: string }) =>
      apiFetch("/api/application-templates", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appTemplates"] });
      setShowAdd(false);
      setQuestion("");
      setAnswer("");
      setGenContext("");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (body: { id: string; answer: string }) =>
      apiFetch("/api/application-templates", { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appTemplates"] });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/application-templates?id=${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["appTemplates"] }),
  });

  async function handleGenerate() {
    if (!question.trim()) return;
    setIsGenerating(true);
    try {
      const res = await apiFetch<{ answer: string; category: string }>(
        "/api/application-templates?action=generate",
        { method: "POST", body: JSON.stringify({ question, context: genContext, tone: "professional" }) }
      );
      setAnswer(res.answer);
      setCategory(res.category as AppTemplate["category"]);
    } catch {
      // best-effort
    } finally {
      setIsGenerating(false);
    }
  }

  const templates = data?.templates ?? [];
  const filtered = filterCat === "all" ? templates : templates.filter((t) => t.category === filterCat);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <SectionTitle>Application Answer Templates</SectionTitle>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg transition-all"
          style={{
            background: T.accentMuted,
            border: `1px solid ${T.accentBorder}`,
            color: T.accent,
            fontFamily: "'Inter', sans-serif",
            cursor: "pointer",
          }}
        >
          <Plus size={12} />
          New Template
        </button>
      </div>

      <p className="text-xs -mt-2" style={{ fontFamily: "'Inter', sans-serif", color: T.textMuted }}>
        Save answers to common screening questions. Reuse them across applications.
      </p>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        {["all", "motivation", "experience", "skills", "cultural", "salary", "availability", "other"].map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCat(cat)}
            className="text-[11px] px-3 py-1 rounded-full capitalize transition-all"
            style={{
              background: filterCat === cat ? (cat === "all" ? T.accentMuted : `${CATEGORY_COLORS[cat]}18`) : "rgba(255,255,255,0.04)",
              border: `1px solid ${filterCat === cat ? (cat === "all" ? T.accentBorder : `${CATEGORY_COLORS[cat]}40`) : T.borderSubtle}`,
              color: filterCat === cat ? (cat === "all" ? T.accent : CATEGORY_COLORS[cat]) : T.textSecondary,
              cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Add template form */}
      {showAdd && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-xl space-y-4"
          style={{ background: T.bgElevated, border: `1px solid ${T.accentBorder}` }}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold" style={{ color: T.textPrimary, fontFamily: "'Inter', sans-serif" }}>New Template</span>
            <button onClick={() => setShowAdd(false)} style={{ background: "none", border: "none", cursor: "pointer", color: T.textMuted, padding: 0 }}>
              <X size={14} />
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-wider" style={{ color: T.textSecondary, fontFamily: "'Inter', sans-serif" }}>Question *</label>
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. Why do you want to work at this company?"
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${T.borderSubtle}`, color: T.textPrimary, fontFamily: "'Inter', sans-serif", outline: "none" }}
            />
          </div>

          <div className="flex gap-3">
            <input
              value={genContext}
              onChange={(e) => setGenContext(e.target.value)}
              placeholder="Optional: extra context for AI generation"
              className="flex-1 px-3 py-2 rounded-lg text-xs"
              style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${T.borderSubtle}`, color: T.textPrimary, fontFamily: "'Inter', sans-serif", outline: "none" }}
            />
            <button
              onClick={handleGenerate}
              disabled={!question.trim() || isGenerating}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all"
              style={{
                background: question.trim() ? T.accentMuted : "rgba(255,255,255,0.03)",
                border: `1px solid ${question.trim() ? T.accentBorder : T.borderSubtle}`,
                color: question.trim() ? T.accent : T.textMuted,
                cursor: question.trim() ? "pointer" : "default",
                fontFamily: "'Inter', sans-serif",
                flexShrink: 0,
              }}
            >
              {isGenerating ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
              {isGenerating ? "Generating…" : "Generate"}
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-wider" style={{ color: T.textSecondary, fontFamily: "'Inter', sans-serif" }}>Answer *</label>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Your answer…"
              rows={4}
              className="w-full px-3 py-2 rounded-lg text-sm resize-y"
              style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${T.borderSubtle}`, color: T.textPrimary, fontFamily: "'Inter', sans-serif", outline: "none" }}
            />
          </div>

          <div className="flex gap-3 items-center">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as AppTemplate["category"])}
              className="px-3 py-2 rounded-lg text-xs capitalize"
              style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${T.borderSubtle}`, color: T.textPrimary, fontFamily: "'Inter', sans-serif", outline: "none" }}
            >
              {["motivation", "experience", "skills", "cultural", "salary", "availability", "other"].map((c) => (
                <option key={c} value={c} style={{ background: T.bgElevated }}>{c}</option>
              ))}
            </select>
            <button
              onClick={() => { if (question && answer) saveMutation.mutate({ question, answer, category }); }}
              disabled={!question.trim() || !answer.trim() || saveMutation.isPending}
              className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                background: question && answer ? T.accentMuted : "rgba(255,255,255,0.03)",
                border: `1px solid ${question && answer ? T.accentBorder : T.borderSubtle}`,
                color: question && answer ? T.accent : T.textMuted,
                cursor: question && answer ? "pointer" : "default",
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {saveMutation.isPending ? "Saving…" : "Save Template"}
            </button>
          </div>
        </motion.div>
      )}

      {/* Templates list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl" style={{ background: T.bgElevated, border: `1px solid ${T.borderSubtle}` }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 flex flex-col items-center gap-3 text-center">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: T.accentMuted, border: `1px solid ${T.accentBorder}` }}>
            <FileText size={18} style={{ color: T.accent }} />
          </div>
          <p className="text-sm" style={{ color: T.textSecondary, fontFamily: "'Inter', sans-serif" }}>No templates yet</p>
          <p className="text-xs" style={{ color: T.textMuted, fontFamily: "'Inter', sans-serif" }}>Create your first template to speed up applications</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl space-y-2"
              style={{ background: T.bgElevated, border: `1px solid ${T.cardBorder}` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full capitalize"
                      style={{
                        background: `${CATEGORY_COLORS[t.category] ?? T.textMuted}18`,
                        color: CATEGORY_COLORS[t.category] ?? T.textMuted,
                        border: `1px solid ${CATEGORY_COLORS[t.category] ?? T.textMuted}30`,
                        fontFamily: "'Inter', sans-serif",
                      }}
                    >
                      <Tag size={8} style={{ display: "inline", marginRight: 3 }} />
                      {t.category}
                    </span>
                    {t.usageCount > 0 && (
                      <span className="text-[10px]" style={{ color: T.textMuted, fontFamily: "'Inter', sans-serif" }}>
                        used {t.usageCount}×
                      </span>
                    )}
                  </div>
                  <p className="text-[13px] font-medium leading-snug" style={{ color: T.textPrimary, fontFamily: "'Inter', sans-serif" }}>
                    {t.question}
                  </p>
                </div>
                <button
                  onClick={() => deleteMutation.mutate(t.id)}
                  className="flex-shrink-0 p-1 rounded-lg transition-all"
                  style={{ background: "none", border: "none", cursor: "pointer", color: T.textMuted }}
                >
                  <Trash2 size={13} />
                </button>
              </div>

              {editingId === t.id ? (
                <div className="space-y-2">
                  <textarea
                    value={editAnswer}
                    onChange={(e) => setEditAnswer(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg text-xs resize-y"
                    style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${T.accentBorder}`, color: T.textPrimary, fontFamily: "'Inter', sans-serif", outline: "none" }}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateMutation.mutate({ id: t.id, answer: editAnswer })}
                      className="text-xs px-3 py-1.5 rounded-lg"
                      style={{ background: T.accentMuted, border: `1px solid ${T.accentBorder}`, color: T.accent, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-xs px-3 py-1.5 rounded-lg"
                      style={{ background: "none", border: `1px solid ${T.borderSubtle}`, color: T.textSecondary, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p
                  className="text-xs leading-relaxed cursor-pointer"
                  style={{ color: T.textSecondary, fontFamily: "'Inter', sans-serif" }}
                  onClick={() => { setEditingId(t.id); setEditAnswer(t.answer); }}
                  title="Click to edit"
                >
                  {t.answer}
                </p>
              )}

              {t.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {t.tags.map((tag) => (
                    <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.04)", color: T.textMuted, border: `1px solid ${T.borderSubtle}`, fontFamily: "'Inter', sans-serif" }}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Blacklist Tab ─────────────────────────────────────────────────────────────
function BlacklistTab() {
  const queryClient = useQueryClient();
  const [newCompany, setNewCompany] = useState("");

  const { data: blData, isLoading } = useQuery({
    queryKey: ["blacklist"],
    queryFn: () => apiFetch<{ data: { companies: string[] } }>("/api/settings/blacklist"),
    retry: false,
  });
  const companies: string[] = (blData as { companies?: string[] } | undefined)?.companies ?? [];

  const addMutation = useMutation({
    mutationFn: (company: string) =>
      apiFetch("/api/settings/blacklist", { method: "POST", body: JSON.stringify({ company }) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["blacklist"] }); setNewCompany(""); },
  });

  const removeMutation = useMutation({
    mutationFn: (company: string) =>
      apiFetch(`/api/settings/blacklist?company=${encodeURIComponent(company)}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["blacklist"] }),
  });

  return (
    <div className="space-y-6">
      <div className="rounded-2xl p-5" style={{ background: T.bgElevated, border: `1px solid ${T.cardBorder}` }}>
        <div className="flex items-center gap-3 mb-1">
          <Ban size={16} style={{ color: T.red }} />
          <h3 className="text-[15px] font-semibold" style={{ color: T.textPrimary, fontFamily: "'Inter', sans-serif" }}>Company Blacklist</h3>
        </div>
        <p className="text-[12px] mb-5" style={{ color: T.textSecondary, fontFamily: "'Inter', sans-serif" }}>
          Companies added here will be hidden from job search results and never auto-applied to.
        </p>
        <div className="flex gap-2 mb-5">
          <input
            type="text"
            placeholder="e.g. Toxic Corp, Bad Startup LLC…"
            value={newCompany}
            onChange={(e) => setNewCompany(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && newCompany.trim()) addMutation.mutate(newCompany.trim()); }}
            className="flex-1 px-3 py-2 rounded-xl text-[13px] outline-none"
            style={{ ...inputBase, border: `1px solid ${T.cardBorder}` }}
          />
          <button
            onClick={() => newCompany.trim() && addMutation.mutate(newCompany.trim())}
            disabled={!newCompany.trim() || addMutation.isPending}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-medium transition-all disabled:opacity-50"
            style={{ background: T.accentMuted, color: T.accent, border: `1px solid ${T.accentBorder}`, fontFamily: "'Inter', sans-serif" }}
          >
            <Plus size={13} /> Add
          </button>
        </div>
        {isLoading ? (
          <p className="text-[12px] text-center py-6" style={{ color: T.textMuted, fontFamily: "'Inter', sans-serif" }}>Loading…</p>
        ) : companies.length === 0 ? (
          <div className="text-center py-10">
            <Ban size={28} className="mx-auto mb-3 opacity-20" style={{ color: T.textMuted }} />
            <p className="text-[13px]" style={{ color: T.textSecondary, fontFamily: "'Inter', sans-serif" }}>No blacklisted companies yet</p>
            <p className="text-[11px] mt-1" style={{ color: T.textMuted, fontFamily: "'Inter', sans-serif" }}>Add companies you never want to see in job results</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            <p className="text-[11px] mb-3" style={{ color: T.textMuted, fontFamily: "'Inter', sans-serif" }}>{companies.length} {companies.length === 1 ? "company" : "companies"} blocked</p>
            {companies.map((company) => (
              <motion.div
                key={company}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between px-4 py-2.5 rounded-xl"
                style={{ background: "rgba(248,113,113,0.05)", border: "1px solid rgba(248,113,113,0.12)" }}
              >
                <div className="flex items-center gap-2.5">
                  <Ban size={12} style={{ color: T.red, opacity: 0.7 }} />
                  <span className="text-[13px]" style={{ color: T.textPrimary, fontFamily: "'Inter', sans-serif" }}>{company}</span>
                </div>
                <button
                  onClick={() => removeMutation.mutate(company)}
                  disabled={removeMutation.isPending}
                  className="p-1.5 rounded-lg hover:bg-white/5 transition-all"
                  style={{ color: T.textMuted }}
                >
                  <X size={13} />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
