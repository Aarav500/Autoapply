"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import {
  UserCheck,
  Plus,
  X,
  Mail,
  Phone,
  Linkedin,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertTriangle,
  Trash2,
  Edit2,
  Clock,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

// ─── Design tokens ─────────────────────────────────────────────────────────────
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
  indigo: "#818CF8",
  gray: "#6B7280",
} as const;

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Reference {
  id: string;
  name: string;
  company: string;
  role: string;
  relationship: "manager" | "peer" | "report" | "client" | "professor" | "mentor";
  email?: string;
  phone?: string;
  linkedinUrl?: string;
  yearsWorkedTogether: number;
  context: string;
  strengths: string[];
  status: "available" | "asked" | "confirmed" | "used";
  lastPreparedAt?: string;
  notes: string;
  createdAt: string;
}

interface PrepBrief {
  subject_line: string;
  email_body: string;
  talking_points: string[];
  company_context: string;
  what_to_avoid: string[];
  expected_questions: string[];
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
const RELATIONSHIP_OPTIONS: Array<{ value: Reference["relationship"]; label: string }> = [
  { value: "manager", label: "Manager" },
  { value: "peer", label: "Peer" },
  { value: "report", label: "Direct Report" },
  { value: "client", label: "Client" },
  { value: "professor", label: "Professor" },
  { value: "mentor", label: "Mentor" },
];

const STATUS_OPTIONS: Array<{ value: Reference["status"]; label: string }> = [
  { value: "available", label: "Available" },
  { value: "asked", label: "Asked" },
  { value: "confirmed", label: "Confirmed" },
  { value: "used", label: "Used" },
];

function getStatusStyle(status: Reference["status"]): { bg: string; color: string } {
  switch (status) {
    case "available":
      return { bg: "rgba(129,140,248,0.12)", color: C.indigo };
    case "asked":
      return { bg: "rgba(251,191,36,0.12)", color: C.amber };
    case "confirmed":
      return { bg: "rgba(52,211,153,0.12)", color: C.green };
    case "used":
      return { bg: "rgba(107,114,128,0.12)", color: C.gray };
  }
}

function formatRelationship(rel: Reference["relationship"]): string {
  const map: Record<Reference["relationship"], string> = {
    manager: "Manager",
    peer: "Peer",
    report: "Direct Report",
    client: "Client",
    professor: "Professor",
    mentor: "Mentor",
  };
  return map[rel];
}

const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "8px",
  padding: "10px 14px",
  fontFamily: "'Inter', sans-serif",
  fontSize: "14px",
  color: C.textPrimary,
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  fontFamily: "'Inter', sans-serif",
  fontSize: "12px",
  fontWeight: 500,
  color: C.textSecondary,
  marginBottom: "6px",
  display: "block",
};

// ─── Empty form ────────────────────────────────────────────────────────────────
function emptyForm(): Omit<Reference, "id" | "createdAt"> {
  return {
    name: "",
    company: "",
    role: "",
    relationship: "peer",
    email: "",
    phone: "",
    linkedinUrl: "",
    yearsWorkedTogether: 1,
    context: "",
    strengths: [],
    status: "available",
    notes: "",
  };
}

// ─── Shared modal shell ────────────────────────────────────────────────────────
function ModalShell({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-10"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.18 }}
        className={`relative w-full rounded-xl p-6 ${wide ? "max-w-2xl" : "max-w-lg"}`}
        style={{ background: C.bgElevated, border: `1px solid ${C.borderMedium}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3
            className="text-lg font-semibold"
            style={{ fontFamily: "'Inter', sans-serif", color: C.textPrimary }}
          >
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg transition-colors"
            style={{ color: C.textSecondary }}
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}

// ─── Reference Form ────────────────────────────────────────────────────────────
function ReferenceForm({
  form,
  setForm,
  onSubmit,
  submitting,
  submitLabel,
}: {
  form: Omit<Reference, "id" | "createdAt">;
  setForm: (f: Omit<Reference, "id" | "createdAt">) => void;
  onSubmit: () => void;
  submitting: boolean;
  submitLabel: string;
}) {
  const [strengthInput, setStrengthInput] = useState("");

  function handleAddStrength() {
    const trimmed = strengthInput.trim();
    if (!trimmed || form.strengths.includes(trimmed)) return;
    setForm({ ...form, strengths: [...form.strengths, trimmed] });
    setStrengthInput("");
  }

  function handleRemoveStrength(s: string) {
    setForm({ ...form, strengths: form.strengths.filter((x) => x !== s) });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label style={labelStyle}>Full Name *</label>
          <input
            style={inputStyle}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Jane Smith"
          />
        </div>
        <div>
          <label style={labelStyle}>Relationship *</label>
          <select
            style={inputStyle}
            value={form.relationship}
            onChange={(e) =>
              setForm({ ...form, relationship: e.target.value as Reference["relationship"] })
            }
          >
            {RELATIONSHIP_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label style={labelStyle}>Company *</label>
          <input
            style={inputStyle}
            value={form.company}
            onChange={(e) => setForm({ ...form, company: e.target.value })}
            placeholder="Acme Corp"
          />
        </div>
        <div>
          <label style={labelStyle}>Their Role *</label>
          <input
            style={inputStyle}
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            placeholder="Engineering Manager"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label style={labelStyle}>Email</label>
          <input
            style={inputStyle}
            type="email"
            value={form.email ?? ""}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="jane@acme.com"
          />
        </div>
        <div>
          <label style={labelStyle}>Phone</label>
          <input
            style={inputStyle}
            value={form.phone ?? ""}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="+1 555 000 0000"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label style={labelStyle}>LinkedIn URL</label>
          <input
            style={inputStyle}
            value={form.linkedinUrl ?? ""}
            onChange={(e) => setForm({ ...form, linkedinUrl: e.target.value })}
            placeholder="https://linkedin.com/in/..."
          />
        </div>
        <div>
          <label style={labelStyle}>Years Worked Together *</label>
          <input
            style={inputStyle}
            type="number"
            min={0}
            step={0.5}
            value={form.yearsWorkedTogether}
            onChange={(e) =>
              setForm({ ...form, yearsWorkedTogether: parseFloat(e.target.value) || 0 })
            }
          />
        </div>
      </div>

      <div>
        <label style={labelStyle}>Context *</label>
        <textarea
          style={{ ...inputStyle, height: "80px", resize: "vertical" }}
          value={form.context}
          onChange={(e) => setForm({ ...form, context: e.target.value })}
          placeholder="How you know them and what you worked on together..."
        />
      </div>

      <div>
        <label style={labelStyle}>Strengths (what they can speak to)</label>
        <div className="flex gap-2 mb-2">
          <input
            style={{ ...inputStyle, flex: 1 }}
            value={strengthInput}
            onChange={(e) => setStrengthInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddStrength();
              }
            }}
            placeholder="e.g. Technical leadership"
          />
          <button
            type="button"
            onClick={handleAddStrength}
            className="px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: C.accentMuted,
              color: C.accent,
              border: `1px solid ${C.accentBorder}`,
              fontFamily: "'Inter', sans-serif",
            }}
          >
            Add
          </button>
        </div>
        {form.strengths.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {form.strengths.map((s) => (
              <span
                key={s}
                className="flex items-center gap-1 px-2 py-1 rounded-full text-xs"
                style={{ background: C.accentMuted, color: C.accent, border: `1px solid ${C.accentBorder}` }}
              >
                {s}
                <button onClick={() => handleRemoveStrength(s)}>
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label style={labelStyle}>Status</label>
          <select
            style={inputStyle}
            value={form.status}
            onChange={(e) =>
              setForm({ ...form, status: e.target.value as Reference["status"] })
            }
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label style={labelStyle}>Notes</label>
        <textarea
          style={{ ...inputStyle, height: "64px", resize: "vertical" }}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="Any additional notes..."
        />
      </div>

      <button
        onClick={onSubmit}
        disabled={submitting}
        className="w-full py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-opacity"
        style={{
          background: C.accentBright,
          color: "#fff",
          fontFamily: "'Inter', sans-serif",
          opacity: submitting ? 0.7 : 1,
        }}
      >
        {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
        {submitLabel}
      </button>
    </div>
  );
}

// ─── Copy button ───────────────────────────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
      style={{
        background: C.accentMuted,
        color: copied ? C.green : C.accent,
        border: `1px solid ${copied ? "rgba(52,211,153,0.25)" : C.accentBorder}`,
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

// ─── Prep Brief Modal ─────────────────────────────────────────────────────────
function PrepBriefModal({
  reference,
  onClose,
}: {
  reference: Reference;
  onClose: () => void;
}) {
  const [targetCompany, setTargetCompany] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [interviewRound, setInterviewRound] = useState("Final Round");
  const [brief, setBrief] = useState<PrepBrief | null>(null);
  const [questionsOpen, setQuestionsOpen] = useState(false);

  const generateMut = useMutation({
    mutationFn: async () => {
      const res = await apiFetch("/api/references", {
        method: "POST",
        body: JSON.stringify({
          action: "generate-brief",
          referenceId: reference.id,
          targetCompany,
          targetRole,
          interviewRound,
        }),
      });
      return res as { brief: PrepBrief };
    },
    onSuccess: (data) => {
      setBrief(data.brief);
    },
  });

  return (
    <ModalShell open title={`Prep Brief — ${reference.name}`} onClose={onClose} wide>
      {!brief ? (
        <div className="space-y-4">
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "14px", color: C.textSecondary }}>
            Generate a tailored brief for{" "}
            <span style={{ color: C.textPrimary, fontWeight: 500 }}>{reference.name}</span> to
            prepare them for a reference call about the following opportunity.
          </p>

          <div>
            <label style={labelStyle}>Target Company *</label>
            <input
              style={inputStyle}
              value={targetCompany}
              onChange={(e) => setTargetCompany(e.target.value)}
              placeholder="Stripe, OpenAI, etc."
            />
          </div>

          <div>
            <label style={labelStyle}>Target Role *</label>
            <input
              style={inputStyle}
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder="Senior Software Engineer"
            />
          </div>

          <div>
            <label style={labelStyle}>Interview Round</label>
            <input
              style={inputStyle}
              value={interviewRound}
              onChange={(e) => setInterviewRound(e.target.value)}
              placeholder="Final Round"
            />
          </div>

          {generateMut.isError && (
            <div
              className="flex items-center gap-2 p-3 rounded-lg text-sm"
              style={{ background: "rgba(248,113,113,0.08)", color: C.red, fontFamily: "'Inter', sans-serif" }}
            >
              <AlertTriangle size={16} />
              Failed to generate brief. Please try again.
            </div>
          )}

          <button
            onClick={() => generateMut.mutate()}
            disabled={!targetCompany.trim() || !targetRole.trim() || generateMut.isPending}
            className="w-full py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-opacity"
            style={{
              background: C.accentBright,
              color: "#fff",
              fontFamily: "'Inter', sans-serif",
              opacity: !targetCompany.trim() || !targetRole.trim() || generateMut.isPending ? 0.6 : 1,
            }}
          >
            {generateMut.isPending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Generating brief…
              </>
            ) : (
              "Generate Prep Brief"
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Subject line */}
          <div
            className="p-3 rounded-lg flex items-center justify-between gap-3"
            style={{ background: C.accentMuted, border: `1px solid ${C.accentBorder}` }}
          >
            <div>
              <span
                style={{ fontFamily: "'Inter', sans-serif", fontSize: "11px", color: C.accent, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}
              >
                Subject Line
              </span>
              <p
                style={{ fontFamily: "'Inter', sans-serif", fontSize: "14px", color: C.textPrimary, marginTop: "2px" }}
              >
                {brief.subject_line}
              </p>
            </div>
            <CopyButton text={brief.subject_line} />
          </div>

          {/* Email body */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span
                style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", fontWeight: 600, color: C.textSecondary, textTransform: "uppercase", letterSpacing: "0.05em" }}
              >
                Email to Send
              </span>
              <CopyButton text={brief.email_body} />
            </div>
            <pre
              className="whitespace-pre-wrap text-sm leading-relaxed p-4 rounded-lg overflow-auto max-h-56"
              style={{
                fontFamily: "'Inter', sans-serif",
                color: C.textPrimary,
                background: "rgba(255,255,255,0.03)",
                border: `1px solid ${C.borderSubtle}`,
              }}
            >
              {brief.email_body}
            </pre>
          </div>

          {/* Talking points */}
          <div>
            <span
              style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", fontWeight: 600, color: C.textSecondary, textTransform: "uppercase", letterSpacing: "0.05em" }}
            >
              Key Talking Points
            </span>
            <ol className="mt-2 space-y-2">
              {brief.talking_points.map((pt, i) => (
                <li
                  key={i}
                  className="flex gap-3 text-sm"
                  style={{ fontFamily: "'Inter', sans-serif", color: C.textPrimary }}
                >
                  <span
                    className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold mt-0.5"
                    style={{ background: C.accentMuted, color: C.accent }}
                  >
                    {i + 1}
                  </span>
                  {pt}
                </li>
              ))}
            </ol>
          </div>

          {/* Company context */}
          <div>
            <span
              style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", fontWeight: 600, color: C.textSecondary, textTransform: "uppercase", letterSpacing: "0.05em" }}
            >
              About the Company
            </span>
            <p
              className="mt-2 text-sm leading-relaxed"
              style={{ fontFamily: "'Inter', sans-serif", color: C.textPrimary }}
            >
              {brief.company_context}
            </p>
          </div>

          {/* What to avoid */}
          <div>
            <span
              style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", fontWeight: 600, color: C.red, textTransform: "uppercase", letterSpacing: "0.05em" }}
            >
              What to Avoid
            </span>
            <div className="mt-2 flex flex-wrap gap-2">
              {brief.what_to_avoid.map((item, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs"
                  style={{ background: "rgba(248,113,113,0.1)", color: C.red, border: "1px solid rgba(248,113,113,0.2)" }}
                >
                  <X size={11} />
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* Expected questions (collapsible) */}
          <div>
            <button
              onClick={() => setQuestionsOpen((v) => !v)}
              className="flex items-center gap-2 w-full"
            >
              <span
                style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", fontWeight: 600, color: C.textSecondary, textTransform: "uppercase", letterSpacing: "0.05em" }}
              >
                Expected Reference Questions
              </span>
              {questionsOpen ? (
                <ChevronUp size={14} style={{ color: C.textSecondary }} />
              ) : (
                <ChevronDown size={14} style={{ color: C.textSecondary }} />
              )}
            </button>
            <AnimatePresence>
              {questionsOpen && (
                <motion.ul
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="mt-2 space-y-1.5 overflow-hidden"
                >
                  {brief.expected_questions.map((q, i) => (
                    <li
                      key={i}
                      className="text-sm pl-3"
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        color: C.textSecondary,
                        borderLeft: `2px solid ${C.accentBorder}`,
                      }}
                    >
                      {q}
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={() => setBrief(null)}
            className="text-sm underline"
            style={{ fontFamily: "'Inter', sans-serif", color: C.textSecondary }}
          >
            Generate for a different role
          </button>
        </div>
      )}
    </ModalShell>
  );
}

// ─── Reference Card ────────────────────────────────────────────────────────────
function ReferenceCard({
  reference,
  onEdit,
  onDelete,
  onBrief,
}: {
  reference: Reference;
  onEdit: (r: Reference) => void;
  onDelete: (id: string) => void;
  onBrief: (r: Reference) => void;
}) {
  const statusStyle = getStatusStyle(reference.status);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="rounded-xl p-5 flex flex-col gap-4"
      style={{ background: C.bgSurface, border: `1px solid ${C.borderSubtle}` }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3
              className="font-semibold text-base truncate"
              style={{ fontFamily: "'Inter', sans-serif", color: C.textPrimary }}
            >
              {reference.name}
            </h3>
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={statusStyle}
            >
              {reference.status.charAt(0).toUpperCase() + reference.status.slice(1)}
            </span>
          </div>
          <p
            className="text-sm mt-0.5"
            style={{ fontFamily: "'Inter', sans-serif", color: C.textSecondary }}
          >
            {reference.role} · {reference.company}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(reference)}
            className="p-1.5 rounded-lg transition-colors hover:bg-white/5"
            style={{ color: C.textSecondary }}
          >
            <Edit2 size={15} />
          </button>
          <button
            onClick={() => onDelete(reference.id)}
            className="p-1.5 rounded-lg transition-colors hover:bg-white/5"
            style={{ color: C.textSecondary }}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Relationship tag */}
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className="px-2 py-0.5 rounded-md text-xs"
          style={{
            background: "rgba(255,255,255,0.04)",
            color: C.textSecondary,
            border: `1px solid ${C.borderSubtle}`,
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {formatRelationship(reference.relationship)} · {reference.yearsWorkedTogether}y
        </span>
      </div>

      {/* Contact icons */}
      {(reference.email || reference.phone || reference.linkedinUrl) && (
        <div className="flex items-center gap-3">
          {reference.email && (
            <a
              href={`mailto:${reference.email}`}
              className="flex items-center gap-1.5 text-xs transition-colors hover:opacity-80"
              style={{ fontFamily: "'Inter', sans-serif", color: C.textSecondary }}
            >
              <Mail size={13} style={{ color: C.accent }} />
              {reference.email}
            </a>
          )}
          {reference.phone && (
            <span
              className="flex items-center gap-1.5 text-xs"
              style={{ fontFamily: "'Inter', sans-serif", color: C.textSecondary }}
            >
              <Phone size={13} style={{ color: C.accent }} />
              {reference.phone}
            </span>
          )}
          {reference.linkedinUrl && (
            <a
              href={reference.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs transition-colors hover:opacity-80"
              style={{ fontFamily: "'Inter', sans-serif", color: C.textSecondary }}
            >
              <Linkedin size={13} style={{ color: C.accent }} />
              LinkedIn
            </a>
          )}
        </div>
      )}

      {/* Context preview */}
      {reference.context && (
        <p
          className="text-sm leading-relaxed"
          style={{ fontFamily: "'Inter', sans-serif", color: C.textSecondary }}
        >
          {reference.context.slice(0, 80)}
          {reference.context.length > 80 ? "…" : ""}
        </p>
      )}

      {/* Strength chips */}
      {reference.strengths.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {reference.strengths.slice(0, 4).map((s) => (
            <span
              key={s}
              className="px-2 py-0.5 rounded-full text-xs"
              style={{ background: C.accentMuted, color: C.accent, border: `1px solid ${C.accentBorder}` }}
            >
              {s}
            </span>
          ))}
          {reference.strengths.length > 4 && (
            <span
              className="px-2 py-0.5 rounded-full text-xs"
              style={{ background: "rgba(255,255,255,0.04)", color: C.textMuted }}
            >
              +{reference.strengths.length - 4}
            </span>
          )}
        </div>
      )}

      {/* Last prepared */}
      {reference.lastPreparedAt && (
        <div
          className="flex items-center gap-1.5 text-xs"
          style={{ fontFamily: "'Inter', sans-serif", color: C.textMuted }}
        >
          <Clock size={12} />
          Last prepped {new Date(reference.lastPreparedAt).toLocaleDateString()}
        </div>
      )}

      {/* Generate brief button */}
      <button
        onClick={() => onBrief(reference)}
        className="w-full py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors mt-auto"
        style={{
          background: C.accentMuted,
          color: C.accent,
          border: `1px solid ${C.accentBorder}`,
          fontFamily: "'Inter', sans-serif",
        }}
      >
        Generate Prep Brief
      </button>
    </motion.div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function ReferencesPage() {
  const queryClient = useQueryClient();

  const [addOpen, setAddOpen] = useState(false);
  const [editRef, setEditRef] = useState<Reference | null>(null);
  const [briefRef, setBriefRef] = useState<Reference | null>(null);
  const [form, setForm] = useState<Omit<Reference, "id" | "createdAt">>(emptyForm());

  // ── Queries ──
  const { data, isLoading, isError } = useQuery({
    queryKey: ["references"],
    queryFn: async () => {
      const res = await apiFetch("/api/references");
      return res as { references: Reference[] };
    },
  });

  const references = data?.references ?? [];
  const totalCount = references.length;
  const confirmedCount = references.filter((r) => r.status === "confirmed").length;
  const usedCount = references.filter((r) => r.status === "used").length;

  // ── Create ──
  const createMut = useMutation({
    mutationFn: async (payload: Omit<Reference, "id" | "createdAt">) => {
      return apiFetch("/api/references", {
        method: "POST",
        body: JSON.stringify({ action: "create", ...payload }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["references"] });
      setAddOpen(false);
      setForm(emptyForm());
    },
  });

  // ── Edit ──
  const editMut = useMutation({
    mutationFn: async (payload: Partial<Reference> & { id: string }) => {
      return apiFetch("/api/references", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["references"] });
      setEditRef(null);
    },
  });

  // ── Delete ──
  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      return apiFetch(`/api/references?id=${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["references"] });
    },
  });

  function openEdit(ref: Reference) {
    setEditRef(ref);
    setForm({
      name: ref.name,
      company: ref.company,
      role: ref.role,
      relationship: ref.relationship,
      email: ref.email ?? "",
      phone: ref.phone ?? "",
      linkedinUrl: ref.linkedinUrl ?? "",
      yearsWorkedTogether: ref.yearsWorkedTogether,
      context: ref.context,
      strengths: ref.strengths,
      status: ref.status,
      notes: ref.notes,
    });
  }

  function handleSaveEdit() {
    if (!editRef) return;
    editMut.mutate({ id: editRef.id, ...form });
  }

  return (
    <div
      className="min-h-screen p-6"
      style={{ background: C.bgBase, fontFamily: "'Inter', sans-serif" }}
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between gap-4 mb-8 flex-wrap"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: C.accentMuted, border: `1px solid ${C.accentBorder}` }}
          >
            <UserCheck size={20} style={{ color: C.accent }} />
          </div>
          <div>
            <h1
              className="text-xl font-bold"
              style={{ color: C.textPrimary }}
            >
              Reference Manager
            </h1>
            <p className="text-sm" style={{ color: C.textSecondary }}>
              Prepare your references for every final round
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            setForm(emptyForm());
            setAddOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
          style={{ background: C.accentBright, color: "#fff" }}
        >
          <Plus size={16} />
          Add Reference
        </button>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-3 gap-4 mb-8"
      >
        {[
          { label: "Total References", value: totalCount, color: C.accent },
          { label: "Confirmed", value: confirmedCount, color: C.green },
          { label: "Used", value: usedCount, color: C.textSecondary },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl p-4"
            style={{ background: C.bgSurface, border: `1px solid ${C.borderSubtle}` }}
          >
            <p className="text-xs mb-1" style={{ color: C.textSecondary }}>
              {stat.label}
            </p>
            <p className="text-2xl font-bold" style={{ color: stat.color }}>
              {stat.value}
            </p>
          </div>
        ))}
      </motion.div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="animate-spin" style={{ color: C.accent }} />
        </div>
      ) : isError ? (
        <div
          className="flex items-center gap-3 p-4 rounded-xl text-sm"
          style={{ background: "rgba(248,113,113,0.08)", color: C.red, border: "1px solid rgba(248,113,113,0.15)" }}
        >
          <AlertTriangle size={18} />
          Failed to load references. Please refresh the page.
        </div>
      ) : references.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20 text-center gap-4"
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: C.accentMuted, border: `1px solid ${C.accentBorder}` }}
          >
            <UserCheck size={32} style={{ color: C.accent }} />
          </div>
          <div>
            <p className="font-semibold text-base" style={{ color: C.textPrimary }}>
              No references yet
            </p>
            <p className="text-sm mt-1" style={{ color: C.textSecondary }}>
              Add people who can vouch for you and generate AI prep briefs before final rounds.
            </p>
          </div>
          <button
            onClick={() => {
              setForm(emptyForm());
              setAddOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: C.accentBright, color: "#fff" }}
          >
            <Plus size={16} />
            Add your first reference
          </button>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.08 }}
          className="grid gap-4"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}
        >
          <AnimatePresence>
            {references.map((ref) => (
              <ReferenceCard
                key={ref.id}
                reference={ref}
                onEdit={openEdit}
                onDelete={(id) => deleteMut.mutate(id)}
                onBrief={(r) => setBriefRef(r)}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Add modal */}
      <AnimatePresence>
        {addOpen && (
          <ModalShell
            open={addOpen}
            onClose={() => setAddOpen(false)}
            title="Add Reference"
          >
            <div className="max-h-[65vh] overflow-y-auto pr-1">
              <ReferenceForm
                form={form}
                setForm={setForm}
                onSubmit={() => createMut.mutate(form)}
                submitting={createMut.isPending}
                submitLabel="Save Reference"
              />
            </div>
          </ModalShell>
        )}
      </AnimatePresence>

      {/* Edit modal */}
      <AnimatePresence>
        {editRef && (
          <ModalShell
            open={!!editRef}
            onClose={() => setEditRef(null)}
            title={`Edit — ${editRef.name}`}
          >
            <div className="max-h-[65vh] overflow-y-auto pr-1">
              <ReferenceForm
                form={form}
                setForm={setForm}
                onSubmit={handleSaveEdit}
                submitting={editMut.isPending}
                submitLabel="Save Changes"
              />
            </div>
          </ModalShell>
        )}
      </AnimatePresence>

      {/* Brief modal */}
      <AnimatePresence>
        {briefRef && (
          <PrepBriefModal reference={briefRef} onClose={() => setBriefRef(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
