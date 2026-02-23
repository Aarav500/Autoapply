"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import {
  Settings,
  Bell,
  Mail,
  Phone,
  MessageSquare,
  Zap,
  Clock,
  Globe,
  Save,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

type TabId = "notifications" | "auto-apply" | "integrations" | "general";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("notifications");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const queryClient = useQueryClient();

  // Fetch notification preferences
  const { data: prefsData } = useQuery({
    queryKey: ["notificationPreferences"],
    queryFn: () => apiFetch<Record<string, unknown>>("/api/comms/notifications/preferences"),
    retry: false,
  });

  // Fetch auto-apply rules
  const { data: autoApplyData } = useQuery({
    queryKey: ["autoApplyRules"],
    queryFn: () => apiFetch<Record<string, unknown>>("/api/settings/auto-apply"),
    retry: false,
  });

  // Fetch auto-reply settings
  const { data: autoReplyData } = useQuery({
    queryKey: ["autoReplySettings"],
    queryFn: () => apiFetch<Record<string, unknown>>("/api/comms/auto-reply"),
    retry: false,
  });

  // Unwrap API responses
  const prefsInner = (prefsData as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
  const prefs = (prefsInner?.preferences || prefsInner) as Record<string, unknown> | undefined;

  const autoApplyInner = (autoApplyData as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
  const autoApplyRulesWrapped = autoApplyInner?.data as Record<string, unknown> | undefined;
  const autoApplyRules = (autoApplyRulesWrapped?.autoApplyRules || autoApplyInner?.autoApplyRules || {}) as Record<string, unknown>;

  const autoReplyInner = (autoReplyData as Record<string, unknown>)?.data as Record<string, unknown> | undefined;
  const autoReply = (autoReplyInner?.settings || autoReplyInner) as Record<string, unknown> | undefined;

  // Mutations
  const updatePrefsMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch("/api/comms/notifications/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notificationPreferences"] });
      flashSaved();
    },
    onError: () => setSaveStatus("error"),
  });

  const updateAutoApplyMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch("/api/settings/auto-apply", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["autoApplyRules"] });
      flashSaved();
    },
    onError: () => setSaveStatus("error"),
  });

  const updateAutoReplyMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch("/api/comms/auto-reply", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["autoReplySettings"] });
      flashSaved();
    },
    onError: () => setSaveStatus("error"),
  });

  const flashSaved = () => {
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2000);
  };

  const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "auto-apply", label: "Auto-Apply", icon: Zap },
    { id: "integrations", label: "Integrations", icon: Mail },
    { id: "general", label: "General", icon: Settings },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(0, 255, 224, 0.08)", border: "1px solid rgba(0, 255, 224, 0.2)" }}
          >
            <Settings size={20} className="text-[#00FFE0]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: "'Outfit', sans-serif", color: "#E8E8F0" }}>
              Settings
            </h1>
            <p className="text-sm" style={{ fontFamily: "'DM Sans', sans-serif", color: "#7E7E98" }}>
              Configure your AutoApply preferences
            </p>
          </div>
        </div>
        {/* Save status indicator */}
        {saveStatus === "saved" && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 text-sm text-[#00E676]"
          >
            <CheckCircle2 size={16} /> Saved
          </motion.div>
        )}
        {saveStatus === "error" && (
          <div className="flex items-center gap-2 text-sm text-[#FF4757]">
            <AlertCircle size={16} /> Failed to save
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all"
            style={{
              background: activeTab === tab.id ? "rgba(0, 255, 224, 0.08)" : "transparent",
              border: `1px solid ${activeTab === tab.id ? "rgba(0, 255, 224, 0.2)" : "rgba(255, 255, 255, 0.06)"}`,
              fontFamily: "'Outfit', sans-serif",
              fontSize: "13px",
              fontWeight: 500,
              color: activeTab === tab.id ? "#00FFE0" : "#7E7E98",
            }}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div
        className="p-6 rounded-lg border"
        style={{ background: "rgba(15, 15, 24, 0.7)", backdropFilter: "blur(12px)", borderColor: "rgba(255, 255, 255, 0.04)" }}
      >
        {/* Notifications Tab */}
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
              label="SMS Notifications"
              description="Get text messages for urgent updates"
              checked={!!prefs?.smsEnabled}
              onChange={(v) => updatePrefsMutation.mutate({ smsEnabled: v })}
            />
            <ToggleRow
              label="WhatsApp Notifications"
              description="Receive updates via WhatsApp"
              checked={!!prefs?.whatsappEnabled}
              onChange={(v) => updatePrefsMutation.mutate({ whatsappEnabled: v })}
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

        {/* Auto-Apply Tab */}
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

        {/* Integrations Tab */}
        {activeTab === "integrations" && (
          <div className="space-y-6">
            <SectionTitle>Email</SectionTitle>
            <IntegrationCard
              icon={Mail}
              title="Gmail"
              description="Connect Gmail to sync emails and send replies"
              connected={!!autoReply?.autoReplyEnabled !== undefined}
              onConnect={() => {
                window.location.href = "/api/comms/email/connect";
              }}
            />
            <ToggleRow
              label="Auto-Reply"
              description="Automatically respond to certain email categories"
              checked={!!autoReply?.enabled}
              onChange={(v) => updateAutoReplyMutation.mutate({ enabled: v })}
            />

            <Divider />
            <SectionTitle>Messaging</SectionTitle>
            <IntegrationCard
              icon={Phone}
              title="SMS (Twilio)"
              description="Receive SMS notifications for urgent updates"
              connected={!!prefs?.smsEnabled}
              onConnect={() => {
                window.location.href = "/api/comms/sms/configure";
              }}
            />
            <IntegrationCard
              icon={MessageSquare}
              title="WhatsApp (Twilio)"
              description="Get WhatsApp messages for job updates"
              connected={!!prefs?.whatsappEnabled}
              onConnect={() => {
                window.location.href = "/api/comms/whatsapp/configure";
              }}
            />

            <Divider />
            <SectionTitle>Calendar</SectionTitle>
            <IntegrationCard
              icon={Clock}
              title="Google Calendar"
              description="Auto-schedule interviews and get calendar reminders"
              connected={false}
              onConnect={() => {
                window.location.href = "/api/comms/calendar/connect";
              }}
            />
          </div>
        )}

        {/* General Tab */}
        {activeTab === "general" && (
          <div className="space-y-6">
            <SectionTitle>Quiet Hours</SectionTitle>
            <p className="text-[12px] text-[#4A4A64] -mt-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
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
              className="w-full max-w-xs px-4 py-2.5 rounded-lg border bg-transparent outline-none appearance-none"
              style={{
                borderColor: "rgba(255, 255, 255, 0.08)",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "14px",
                color: "#E8E8F0",
              }}
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
                <option key={tz} value={tz} style={{ background: "#0F0F18" }}>
                  {tz.replace("_", " ")}
                </option>
              ))}
            </select>

            <Divider />
            <SectionTitle>Account</SectionTitle>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  localStorage.removeItem("accessToken");
                  localStorage.removeItem("refreshToken");
                  window.location.href = "/login";
                }}
                className="px-4 py-2.5 rounded-lg font-semibold border transition-all hover:bg-white/5"
                style={{
                  borderColor: "rgba(255, 71, 87, 0.2)",
                  color: "#FF4757",
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: "13px",
                }}
              >
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────

function SectionTitle({ children }: { children: string }) {
  return (
    <h3 className="text-sm font-semibold" style={{ fontFamily: "'Outfit', sans-serif", color: "#E8E8F0" }}>
      {children}
    </h3>
  );
}

function Divider() {
  return <div className="h-px" style={{ background: "rgba(255, 255, 255, 0.04)" }} />;
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
  return (
    <div className="flex items-center justify-between py-1">
      <div>
        <p className="text-[13px] font-medium" style={{ fontFamily: "'Outfit', sans-serif", color: "#E8E8F0" }}>
          {label}
        </p>
        <p className="text-[11px]" style={{ fontFamily: "'DM Sans', sans-serif", color: "#4A4A64" }}>
          {description}
        </p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className="w-11 h-6 rounded-full transition-all relative flex-shrink-0"
        style={{
          background: checked ? "rgba(0, 255, 224, 0.3)" : "rgba(255, 255, 255, 0.08)",
        }}
      >
        <motion.div
          animate={{ x: checked ? 20 : 2 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className="w-5 h-5 rounded-full absolute top-0.5"
          style={{ background: checked ? "#00FFE0" : "#4A4A64" }}
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
    <div className="flex items-center justify-between py-1">
      <div>
        <p className="text-[13px] font-medium" style={{ fontFamily: "'Outfit', sans-serif", color: "#E8E8F0" }}>
          {label}
        </p>
        <p className="text-[11px]" style={{ fontFamily: "'DM Sans', sans-serif", color: "#4A4A64" }}>
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
        className="w-20 px-3 py-1.5 rounded-lg border bg-transparent outline-none text-center"
        style={{
          borderColor: "rgba(255, 255, 255, 0.08)",
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: "14px",
          color: "#E8E8F0",
        }}
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
      <div className="flex gap-2 mb-3 flex-wrap">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[12px]"
            style={{
              background: "rgba(255, 71, 87, 0.08)",
              border: "1px solid rgba(255, 71, 87, 0.15)",
              fontFamily: "'DM Sans', sans-serif",
              color: "#FF4757",
            }}
          >
            {tag}
            <button onClick={() => removeTag(tag)} className="hover:text-white transition-colors">
              &times;
            </button>
          </span>
        ))}
        {tags.length === 0 && (
          <span className="text-[12px] text-[#4A4A64]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
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
          className="flex-1 px-4 py-2 rounded-lg border bg-transparent outline-none"
          style={{
            borderColor: "rgba(255, 255, 255, 0.08)",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "13px",
            color: "#E8E8F0",
          }}
        />
        <button
          onClick={addTag}
          disabled={!input.trim()}
          className="px-4 py-2 rounded-lg text-[13px] font-semibold transition-all disabled:opacity-30"
          style={{
            background: "rgba(255, 255, 255, 0.06)",
            color: "#7E7E98",
            fontFamily: "'Outfit', sans-serif",
          }}
        >
          Add
        </button>
      </div>
    </div>
  );
}

function IntegrationCard({
  icon: Icon,
  title,
  description,
  connected,
  onConnect,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  connected: boolean;
  onConnect: () => void;
}) {
  return (
    <div
      className="flex items-center justify-between p-4 rounded-lg border"
      style={{ background: "rgba(255, 255, 255, 0.02)", borderColor: "rgba(255, 255, 255, 0.04)" }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: "rgba(0, 255, 224, 0.08)" }}
        >
          <Icon size={18} className="text-[#00FFE0]" />
        </div>
        <div>
          <p className="text-[13px] font-medium" style={{ fontFamily: "'Outfit', sans-serif", color: "#E8E8F0" }}>
            {title}
          </p>
          <p className="text-[11px]" style={{ fontFamily: "'DM Sans', sans-serif", color: "#4A4A64" }}>
            {description}
          </p>
        </div>
      </div>
      <button
        onClick={onConnect}
        className="px-4 py-2 rounded-lg text-[12px] font-semibold transition-all"
        style={{
          background: connected ? "rgba(0, 230, 118, 0.08)" : "rgba(0, 255, 224, 0.08)",
          border: `1px solid ${connected ? "rgba(0, 230, 118, 0.2)" : "rgba(0, 255, 224, 0.2)"}`,
          color: connected ? "#00E676" : "#00FFE0",
          fontFamily: "'Outfit', sans-serif",
        }}
      >
        {connected ? "Connected" : "Connect"}
      </button>
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
      <label className="block text-[11px] mb-1.5" style={{ fontFamily: "'Outfit', sans-serif", color: "#7E7E98" }}>
        {label}
      </label>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-4 py-2 rounded-lg border bg-transparent outline-none"
        style={{
          borderColor: "rgba(255, 255, 255, 0.08)",
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: "14px",
          color: "#E8E8F0",
          colorScheme: "dark",
        }}
      />
    </div>
  );
}
