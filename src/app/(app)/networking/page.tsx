"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo } from "react";
import {
  Users,
  Plus,
  Search,
  Copy,
  Check,
  X,
  Pencil,
  Trash2,
  Sparkles,
  Calendar,
  Mail,
  Linkedin,
  Tag,
  RefreshCw,
  ChevronDown,
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
  accentMuted: "rgba(124,58,237,0.12)",
  accentBorder: "rgba(124,58,237,0.25)",
  textPrimary: "#F0F0FF",
  textSecondary: "#9090B8",
  textMuted: "#3A3A60",
  borderSubtle: "rgba(255,255,255,0.06)",
  borderMedium: "rgba(255,255,255,0.08)",
  green: "#34D399",
  amber: "#FBBF24",
  red: "#F87171",
  blue: "#60A5FA",
  violet: "#A78BFA",
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────
interface Contact {
  id: string;
  name: string;
  company: string;
  role: string;
  email?: string;
  linkedinUrl?: string;
  lastContactDate?: string;
  followUpDate?: string;
  notes: string;
  tags: string[];
  status: "active" | "responded" | "cold" | "converted";
  createdAt: string;
}

type MessageType = "follow-up" | "cold-outreach" | "thank-you" | "referral-ask";

interface ContactFormData {
  name: string;
  company: string;
  role: string;
  email: string;
  linkedinUrl: string;
  lastContactDate: string;
  followUpDate: string;
  notes: string;
  tags: string[];
  status: Contact["status"];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const ALL_TAGS = ["recruiter", "hiring-manager", "referral", "colleague", "mentor", "investor"];

const MESSAGE_TYPES: { value: MessageType; label: string }[] = [
  { value: "follow-up", label: "Follow-up" },
  { value: "cold-outreach", label: "Cold Outreach" },
  { value: "thank-you", label: "Thank You" },
  { value: "referral-ask", label: "Referral Ask" },
];

function getStatusBadge(status: Contact["status"]): { label: string; bg: string; color: string } {
  switch (status) {
    case "active":
      return { label: "Active", bg: "rgba(52,211,153,0.12)", color: C.green };
    case "responded":
      return { label: "Responded", bg: "rgba(96,165,250,0.12)", color: C.blue };
    case "cold":
      return { label: "Cold", bg: "rgba(255,255,255,0.06)", color: C.textSecondary };
    case "converted":
      return { label: "Converted", bg: "rgba(124,58,237,0.15)", color: C.violet };
  }
}

function getFollowUpStyle(dateStr?: string): { color: string; label: string } | null {
  if (!dateStr) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const date = new Date(dateStr);
  date.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { color: C.red, label: `Overdue by ${Math.abs(diffDays)}d` };
  if (diffDays === 0) return { color: C.amber, label: "Due today" };
  if (diffDays <= 3) return { color: C.amber, label: `Due in ${diffDays}d` };
  return { color: C.textSecondary, label: formatDate(dateStr) };
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function isFollowUpDueToday(dateStr?: string): boolean {
  if (!dateStr) return false;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const date = new Date(dateStr);
  date.setHours(0, 0, 0, 0);
  return date <= now;
}

function emptyForm(): ContactFormData {
  return {
    name: "",
    company: "",
    role: "",
    email: "",
    linkedinUrl: "",
    lastContactDate: "",
    followUpDate: "",
    notes: "",
    tags: [],
    status: "active",
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatCard({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div
      style={{
        background: C.bgSurface,
        border: `1px solid ${C.borderSubtle}`,
        borderRadius: 12,
        padding: "16px 20px",
        flex: 1,
        minWidth: 120,
      }}
    >
      <div
        style={{
          fontSize: 26,
          fontWeight: 700,
          color: color ?? C.textPrimary,
          lineHeight: 1,
          marginBottom: 6,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 12, color: C.textSecondary }}>{label}</div>
    </div>
  );
}

function TagChip({
  tag,
  selected,
  onClick,
}: {
  tag: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "3px 10px",
        borderRadius: 20,
        border: `1px solid ${selected ? C.accentBorder : C.borderSubtle}`,
        background: selected ? C.accentMuted : "transparent",
        color: selected ? C.accent : C.textSecondary,
        fontSize: 12,
        cursor: "pointer",
        fontFamily: "'Inter', sans-serif",
        transition: "all 0.15s",
      }}
    >
      {tag}
    </button>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 12, color: C.textSecondary, fontWeight: 500 }}>
        {label}
        {required && <span style={{ color: C.red, marginLeft: 2 }}>*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          background: C.bgElevated,
          border: `1px solid ${C.borderSubtle}`,
          borderRadius: 8,
          padding: "8px 12px",
          color: C.textPrimary,
          fontSize: 14,
          fontFamily: "'Inter', sans-serif",
          outline: "none",
          width: "100%",
          boxSizing: "border-box",
        }}
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 12, color: C.textSecondary, fontWeight: 500 }}>{label}</label>
      <div style={{ position: "relative" }}>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            background: C.bgElevated,
            border: `1px solid ${C.borderSubtle}`,
            borderRadius: 8,
            padding: "8px 32px 8px 12px",
            color: C.textPrimary,
            fontSize: 14,
            fontFamily: "'Inter', sans-serif",
            outline: "none",
            width: "100%",
            appearance: "none",
            cursor: "pointer",
            boxSizing: "border-box",
          }}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value} style={{ background: C.bgElevated }}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={14}
          style={{
            position: "absolute",
            right: 10,
            top: "50%",
            transform: "translateY(-50%)",
            color: C.textSecondary,
            pointerEvents: "none",
          }}
        />
      </div>
    </div>
  );
}

// ─── Contact Modal ─────────────────────────────────────────────────────────────
function ContactModal({
  initial,
  onClose,
  onSave,
  isSaving,
}: {
  initial: ContactFormData & { id?: string };
  onClose: () => void;
  onSave: (data: ContactFormData & { id?: string }) => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState<ContactFormData & { id?: string }>(initial);

  function set<K extends keyof ContactFormData>(key: K, value: ContactFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleTag(tag: string) {
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter((t) => t !== tag) : [...prev.tags, tag],
    }));
  }

  const isValid = form.name.trim() && form.company.trim() && form.role.trim();

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(4px)",
        }}
      />

      {/* Panel */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ duration: 0.2 }}
        style={{
          position: "relative",
          background: C.bgSurface,
          border: `1px solid ${C.borderMedium}`,
          borderRadius: 16,
          width: "100%",
          maxWidth: 560,
          maxHeight: "90vh",
          overflowY: "auto",
          padding: 28,
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: C.textPrimary, margin: 0 }}>
            {form.id ? "Edit Contact" : "Add Contact"}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: C.textSecondary,
              cursor: "pointer",
              padding: 4,
              lineHeight: 1,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <InputField
              label="Full Name"
              value={form.name}
              onChange={(v) => set("name", v)}
              placeholder="Jane Smith"
              required
            />
          </div>
          <InputField
            label="Company"
            value={form.company}
            onChange={(v) => set("company", v)}
            placeholder="Acme Corp"
            required
          />
          <InputField
            label="Role"
            value={form.role}
            onChange={(v) => set("role", v)}
            placeholder="Senior Recruiter"
            required
          />
          <InputField
            label="Email"
            value={form.email}
            onChange={(v) => set("email", v)}
            placeholder="jane@acme.com"
            type="email"
          />
          <InputField
            label="LinkedIn URL"
            value={form.linkedinUrl}
            onChange={(v) => set("linkedinUrl", v)}
            placeholder="linkedin.com/in/janesmith"
          />
          <InputField
            label="Last Contact Date"
            value={form.lastContactDate}
            onChange={(v) => set("lastContactDate", v)}
            type="date"
          />
          <InputField
            label="Follow-up Date"
            value={form.followUpDate}
            onChange={(v) => set("followUpDate", v)}
            type="date"
          />
          <div style={{ gridColumn: "1 / -1" }}>
            <SelectField
              label="Status"
              value={form.status}
              onChange={(v) => set("status", v as Contact["status"])}
              options={[
                { value: "active", label: "Active" },
                { value: "responded", label: "Responded" },
                { value: "cold", label: "Cold" },
                { value: "converted", label: "Converted" },
              ]}
            />
          </div>
          <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ fontSize: 12, color: C.textSecondary, fontWeight: 500 }}>Tags</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {ALL_TAGS.map((tag) => (
                <TagChip
                  key={tag}
                  tag={tag}
                  selected={form.tags.includes(tag)}
                  onClick={() => toggleTag(tag)}
                />
              ))}
            </div>
          </div>
          <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 12, color: C.textSecondary, fontWeight: 500 }}>Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Context, shared interests, conversation topics…"
              rows={3}
              style={{
                background: C.bgElevated,
                border: `1px solid ${C.borderSubtle}`,
                borderRadius: 8,
                padding: "8px 12px",
                color: C.textPrimary,
                fontSize: 14,
                fontFamily: "'Inter', sans-serif",
                outline: "none",
                width: "100%",
                resize: "vertical",
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              padding: "9px 18px",
              borderRadius: 8,
              border: `1px solid ${C.borderSubtle}`,
              background: "transparent",
              color: C.textSecondary,
              fontSize: 14,
              cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={!isValid || isSaving}
            style={{
              padding: "9px 22px",
              borderRadius: 8,
              border: "none",
              background: isValid && !isSaving ? C.accentBright : C.textMuted,
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: isValid && !isSaving ? "pointer" : "not-allowed",
              fontFamily: "'Inter', sans-serif",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {isSaving ? <RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} /> : null}
            {form.id ? "Save Changes" : "Add Contact"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Generate Message Panel ───────────────────────────────────────────────────
function GenerateMessagePanel({
  contact,
  onClose,
}: {
  contact: Contact;
  onClose: () => void;
}) {
  const [messageType, setMessageType] = useState<MessageType>("follow-up");
  const [message, setMessage] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch<{ message: string }>("/api/networking", {
        method: "POST",
        body: JSON.stringify({
          action: "generate-message",
          contactId: contact.id,
          messageType,
        }),
      });
      return res.message;
    },
    onSuccess: (msg) => setMessage(msg),
  });

  function handleCopy() {
    if (!message) return;
    navigator.clipboard.writeText(message).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const badge = getStatusBadge(contact.status);

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.22 }}
      style={{
        background: C.bgSurface,
        border: `1px solid ${C.accentBorder}`,
        borderRadius: 14,
        padding: 22,
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <Sparkles size={16} color={C.accent} />
            <span style={{ fontSize: 15, fontWeight: 700, color: C.textPrimary }}>
              Generate Message
            </span>
          </div>
          <div style={{ fontSize: 13, color: C.textSecondary }}>
            {contact.name} · {contact.role} at {contact.company}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "transparent",
            border: "none",
            color: C.textSecondary,
            cursor: "pointer",
            padding: 2,
            lineHeight: 1,
          }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Message type selector */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {MESSAGE_TYPES.map((mt) => (
          <button
            key={mt.value}
            onClick={() => setMessageType(mt.value)}
            style={{
              padding: "5px 13px",
              borderRadius: 20,
              border: `1px solid ${messageType === mt.value ? C.accentBorder : C.borderSubtle}`,
              background: messageType === mt.value ? C.accentMuted : "transparent",
              color: messageType === mt.value ? C.accent : C.textSecondary,
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
              transition: "all 0.15s",
            }}
          >
            {mt.label}
          </button>
        ))}
      </div>

      {/* Generate button */}
      <button
        onClick={() => generateMutation.mutate()}
        disabled={generateMutation.isPending}
        style={{
          padding: "9px 0",
          borderRadius: 8,
          border: "none",
          background: generateMutation.isPending ? C.textMuted : C.accentBright,
          color: "#fff",
          fontSize: 14,
          fontWeight: 600,
          cursor: generateMutation.isPending ? "not-allowed" : "pointer",
          fontFamily: "'Inter', sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 7,
        }}
      >
        {generateMutation.isPending ? (
          <RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} />
        ) : (
          <Sparkles size={14} />
        )}
        {generateMutation.isPending ? "Generating…" : "Generate"}
      </button>

      {/* Result */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ display: "flex", flexDirection: "column", gap: 10 }}
        >
          <div
            style={{
              background: C.bgElevated,
              border: `1px solid ${C.borderSubtle}`,
              borderRadius: 10,
              padding: "14px 16px",
              fontSize: 13,
              color: C.textPrimary,
              lineHeight: 1.65,
              whiteSpace: "pre-wrap",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {message}
          </div>
          <button
            onClick={handleCopy}
            style={{
              alignSelf: "flex-end",
              padding: "7px 14px",
              borderRadius: 8,
              border: `1px solid ${C.borderSubtle}`,
              background: "transparent",
              color: copied ? C.green : C.textSecondary,
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
              display: "flex",
              alignItems: "center",
              gap: 5,
              transition: "color 0.15s",
            }}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? "Copied!" : "Copy"}
          </button>
        </motion.div>
      )}

      {generateMutation.isError && (
        <div style={{ fontSize: 13, color: C.red }}>
          Failed to generate message. Please try again.
        </div>
      )}

      <div style={{ display: "none" }}>
        <span style={{ color: badge.color }}>{badge.label}</span>
      </div>
    </motion.div>
  );
}

// ─── Contact Card ──────────────────────────────────────────────────────────────
function ContactCard({
  contact,
  onEdit,
  onDelete,
  onMarkContacted,
  onGenerateMessage,
  isMarkingContacted,
}: {
  contact: Contact;
  onEdit: () => void;
  onDelete: () => void;
  onMarkContacted: () => void;
  onGenerateMessage: () => void;
  isMarkingContacted: boolean;
}) {
  const badge = getStatusBadge(contact.status);
  const followUpInfo = getFollowUpStyle(contact.followUpDate);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.2 }}
      style={{
        background: C.bgSurface,
        border: `1px solid ${C.borderSubtle}`,
        borderRadius: 12,
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      {/* Top row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: C.textPrimary }}>
              {contact.name}
            </span>
            <span
              style={{
                padding: "2px 8px",
                borderRadius: 20,
                background: badge.bg,
                color: badge.color,
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              {badge.label}
            </span>
          </div>
          <div style={{ fontSize: 13, color: C.textSecondary, marginTop: 2 }}>
            {contact.role} · {contact.company}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <button
            onClick={onGenerateMessage}
            title="Generate Message"
            style={{
              padding: "5px 10px",
              borderRadius: 7,
              border: `1px solid ${C.accentBorder}`,
              background: C.accentMuted,
              color: C.accent,
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
              display: "flex",
              alignItems: "center",
              gap: 4,
              transition: "opacity 0.15s",
            }}
          >
            <Sparkles size={12} />
            <span>Message</span>
          </button>
          <button
            onClick={onMarkContacted}
            disabled={isMarkingContacted}
            title="Mark as contacted today"
            style={{
              padding: "5px 9px",
              borderRadius: 7,
              border: `1px solid ${C.borderSubtle}`,
              background: "transparent",
              color: C.textSecondary,
              cursor: isMarkingContacted ? "not-allowed" : "pointer",
              lineHeight: 1,
              display: "flex",
              alignItems: "center",
            }}
          >
            <Check size={13} />
          </button>
          <button
            onClick={onEdit}
            title="Edit"
            style={{
              padding: "5px 9px",
              borderRadius: 7,
              border: `1px solid ${C.borderSubtle}`,
              background: "transparent",
              color: C.textSecondary,
              cursor: "pointer",
              lineHeight: 1,
              display: "flex",
              alignItems: "center",
            }}
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={onDelete}
            title="Delete"
            style={{
              padding: "5px 9px",
              borderRadius: 7,
              border: `1px solid ${C.borderSubtle}`,
              background: "transparent",
              color: C.textSecondary,
              cursor: "pointer",
              lineHeight: 1,
              display: "flex",
              alignItems: "center",
            }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Meta row */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {contact.email && (
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <Mail size={12} color={C.textMuted} />
            <a
              href={`mailto:${contact.email}`}
              style={{ fontSize: 12, color: C.textSecondary, textDecoration: "none" }}
            >
              {contact.email}
            </a>
          </div>
        )}
        {contact.linkedinUrl && (
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <Linkedin size={12} color={C.textMuted} />
            <a
              href={contact.linkedinUrl.startsWith("http") ? contact.linkedinUrl : `https://${contact.linkedinUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: 12, color: C.textSecondary, textDecoration: "none" }}
            >
              LinkedIn
            </a>
          </div>
        )}
        {contact.lastContactDate && (
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <Calendar size={12} color={C.textMuted} />
            <span style={{ fontSize: 12, color: C.textSecondary, fontFamily: "monospace" }}>
              Last: {formatDate(contact.lastContactDate)}
            </span>
          </div>
        )}
        {followUpInfo && (
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <Calendar size={12} color={followUpInfo.color} />
            <span style={{ fontSize: 12, color: followUpInfo.color, fontFamily: "monospace", fontWeight: 500 }}>
              {followUpInfo.label}
            </span>
          </div>
        )}
      </div>

      {/* Tags */}
      {contact.tags.length > 0 && (
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {contact.tags.map((tag) => (
            <span
              key={tag}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 3,
                padding: "2px 8px",
                borderRadius: 20,
                background: "rgba(255,255,255,0.04)",
                border: `1px solid ${C.borderSubtle}`,
                color: C.textMuted,
                fontSize: 11,
              }}
            >
              <Tag size={9} />
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Notes */}
      {contact.notes && (
        <div
          style={{
            fontSize: 12,
            color: C.textSecondary,
            lineHeight: 1.55,
            borderTop: `1px solid ${C.borderSubtle}`,
            paddingTop: 8,
          }}
        >
          {contact.notes}
        </div>
      )}
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function NetworkingPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [messageContact, setMessageContact] = useState<Contact | null>(null);

  // Fetch contacts
  const {
    data,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["networking-contacts"],
    queryFn: () => apiFetch<{ contacts: Contact[]; total: number }>("/api/networking"),
  });

  const contacts: Contact[] = useMemo(() => data?.contacts ?? [], [data?.contacts]);

  // Stats
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const stats = useMemo(() => {
    const total = contacts.length;
    const dueTodayCount = contacts.filter((c) => isFollowUpDueToday(c.followUpDate)).length;
    const respondedCount = contacts.filter((c) => c.status === "responded" || c.status === "converted").length;
    const respondedRate = total > 0 ? Math.round((respondedCount / total) * 100) : 0;
    return { total, dueTodayCount, respondedRate };
  }, [contacts]);

  // Filtered contacts
  const filtered = useMemo(() => {
    if (!search.trim()) return contacts;
    const q = search.toLowerCase();
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.company.toLowerCase().includes(q) ||
        c.role.toLowerCase().includes(q) ||
        c.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [contacts, search]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (form: ContactFormData) =>
      apiFetch<{ contact: Contact }>("/api/networking", {
        method: "POST",
        body: JSON.stringify({ action: "create", ...form }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["networking-contacts"] });
      setShowModal(false);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (form: ContactFormData & { id: string }) =>
      apiFetch<{ contact: Contact }>("/api/networking", {
        method: "PATCH",
        body: JSON.stringify(form),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["networking-contacts"] });
      setEditContact(null);
    },
  });

  // Mark contacted mutation
  const markContactedMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ contact: Contact }>("/api/networking", {
        method: "PATCH",
        body: JSON.stringify({
          id,
          lastContactDate: new Date().toISOString().slice(0, 10),
          status: "active",
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["networking-contacts"] });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ success: boolean }>("/api/networking", {
        method: "DELETE",
        body: JSON.stringify({ id }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["networking-contacts"] });
      if (messageContact && deleteMutation.variables === messageContact.id) {
        setMessageContact(null);
      }
    },
  });

  function handleSave(form: ContactFormData & { id?: string }) {
    if (form.id) {
      updateMutation.mutate({ ...form, id: form.id });
    } else {
      createMutation.mutate(form);
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      {/* Spin keyframe */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      <div
        style={{
          minHeight: "100vh",
          background: C.bgBase,
          fontFamily: "'Inter', sans-serif",
          color: C.textPrimary,
          padding: "32px 28px",
          maxWidth: 1100,
          margin: "0 auto",
        }}
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          style={{ marginBottom: 28 }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: C.accentMuted,
                border: `1px solid ${C.accentBorder}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Users size={20} color={C.accent} />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: C.textPrimary, margin: 0 }}>
                Networking CRM
              </h1>
              <p style={{ fontSize: 13, color: C.textSecondary, margin: 0 }}>
                Build and maintain your professional network
              </p>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}
        >
          <StatCard label="Total Contacts" value={stats.total} />
          <StatCard
            label="Follow-ups Due"
            value={stats.dueTodayCount}
            color={stats.dueTodayCount > 0 ? C.amber : C.green}
          />
          <StatCard
            label="Response Rate"
            value={`${stats.respondedRate}%`}
            color={stats.respondedRate >= 50 ? C.green : C.textSecondary}
          />
        </motion.div>

        {/* Action bar */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          style={{ display: "flex", gap: 10, marginBottom: 20, alignItems: "center" }}
        >
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: C.bgSurface,
              border: `1px solid ${C.borderSubtle}`,
              borderRadius: 9,
              padding: "9px 14px",
            }}
          >
            <Search size={15} color={C.textMuted} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, company, role or tag…"
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                color: C.textPrimary,
                fontSize: 14,
                fontFamily: "'Inter', sans-serif",
              }}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                style={{
                  background: "transparent",
                  border: "none",
                  color: C.textMuted,
                  cursor: "pointer",
                  lineHeight: 1,
                  padding: 0,
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button
            onClick={() => {
              setEditContact(null);
              setShowModal(true);
            }}
            style={{
              padding: "9px 18px",
              borderRadius: 9,
              border: "none",
              background: C.accentBright,
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
              display: "flex",
              alignItems: "center",
              gap: 6,
              whiteSpace: "nowrap",
            }}
          >
            <Plus size={16} />
            Add Contact
          </button>
        </motion.div>

        {/* Main content area */}
        {isLoading && (
          <div style={{ textAlign: "center", paddingTop: 60 }}>
            <RefreshCw size={28} color={C.textMuted} style={{ animation: "spin 1s linear infinite" }} />
            <div style={{ color: C.textSecondary, marginTop: 12, fontSize: 14 }}>Loading contacts…</div>
          </div>
        )}

        {isError && (
          <div
            style={{
              textAlign: "center",
              paddingTop: 60,
              color: C.red,
              fontSize: 14,
            }}
          >
            Failed to load contacts. Please refresh the page.
          </div>
        )}

        {!isLoading && !isError && contacts.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ textAlign: "center", paddingTop: 80 }}
          >
            <div
              style={{
                display: "inline-flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 16,
                  background: C.accentMuted,
                  border: `1px solid ${C.accentBorder}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Users size={28} color={C.accent} />
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.textPrimary, marginBottom: 6 }}>
                  Start building your network
                </div>
                <div style={{ fontSize: 14, color: C.textSecondary, maxWidth: 360 }}>
                  Add recruiters, hiring managers, and referrals to track your outreach and never miss a follow-up.
                </div>
              </div>
              <button
                onClick={() => setShowModal(true)}
                style={{
                  marginTop: 8,
                  padding: "10px 22px",
                  borderRadius: 9,
                  border: "none",
                  background: C.accentBright,
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "'Inter', sans-serif",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Plus size={16} />
                Add Your First Contact
              </button>
            </div>
          </motion.div>
        )}

        {!isLoading && !isError && contacts.length > 0 && (
          <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
            {/* Contact list */}
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {filtered.length === 0 && (
                <div style={{ textAlign: "center", paddingTop: 40, color: C.textSecondary, fontSize: 14 }}>
                  No contacts match &ldquo;{search}&rdquo;
                </div>
              )}
              <AnimatePresence mode="popLayout">
                {filtered.map((contact) => (
                  <ContactCard
                    key={contact.id}
                    contact={contact}
                    onEdit={() => {
                      setEditContact(contact);
                      setShowModal(true);
                    }}
                    onDelete={() => deleteMutation.mutate(contact.id)}
                    onMarkContacted={() => markContactedMutation.mutate(contact.id)}
                    isMarkingContacted={
                      markContactedMutation.isPending &&
                      markContactedMutation.variables === contact.id
                    }
                    onGenerateMessage={() =>
                      setMessageContact((prev) => (prev?.id === contact.id ? null : contact))
                    }
                  />
                ))}
              </AnimatePresence>
            </div>

            {/* Generate message panel */}
            <AnimatePresence>
              {messageContact && (
                <div style={{ width: 340, flexShrink: 0, position: "sticky", top: 24 }}>
                  <GenerateMessagePanel
                    key={messageContact.id}
                    contact={messageContact}
                    onClose={() => setMessageContact(null)}
                  />
                </div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <ContactModal
            initial={
              editContact
                ? {
                    id: editContact.id,
                    name: editContact.name,
                    company: editContact.company,
                    role: editContact.role,
                    email: editContact.email ?? "",
                    linkedinUrl: editContact.linkedinUrl ?? "",
                    lastContactDate: editContact.lastContactDate ?? "",
                    followUpDate: editContact.followUpDate ?? "",
                    notes: editContact.notes,
                    tags: editContact.tags,
                    status: editContact.status,
                  }
                : emptyForm()
            }
            onClose={() => {
              setShowModal(false);
              setEditContact(null);
            }}
            onSave={handleSave}
            isSaving={isSaving}
          />
        )}
      </AnimatePresence>
    </>
  );
}
