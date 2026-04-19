"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo, useCallback } from "react";
import {
  Scale,
  Plus,
  Trash2,
  X,
  Loader2,
  Sparkles,
  Trophy,
  ChevronDown,
  ChevronUp,
  Building2,
  MapPin,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Check,
  Info,
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
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

interface Offer {
  id: string;
  company: string;
  role: string;
  location: string;
  remote: "remote" | "hybrid" | "onsite";
  baseSalary: number;
  targetBonus: number;
  signingBonus: number;
  equityGrant: number;
  equityVestingYears: number;
  pto: number;
  retirement401k: boolean;
  healthInsurance: "excellent" | "good" | "basic" | "none";
  learningBudget: number;
  workFromHomeStiped: number;
  notes: string;
  createdAt: string;
  annualEquityValue?: number;
  trueAnnualValue?: number;
}

interface ProsCons {
  company: string;
  pros: string[];
  cons: string[];
}

interface AIAnalysis {
  winner: string;
  reasoning: string;
  pros_cons: ProsCons[];
  negotiation_tips: string[];
  final_recommendation: string;
}

interface OfferFormData {
  company: string;
  role: string;
  location: string;
  remote: "remote" | "hybrid" | "onsite";
  baseSalary: string;
  targetBonus: string;
  signingBonus: string;
  equityGrant: string;
  equityVestingYears: string;
  pto: string;
  retirement401k: boolean;
  healthInsurance: "excellent" | "good" | "basic" | "none";
  learningBudget: string;
  workFromHomeStiped: string;
  notes: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function parseNum(val: string): number {
  const n = parseFloat(val.replace(/[^0-9.]/g, ""));
  return isNaN(n) ? 0 : n;
}

function computeLiveValue(form: OfferFormData): number {
  const base = parseNum(form.baseSalary);
  const bonus = base * (parseNum(form.targetBonus) / 100);
  const vestingYears = parseNum(form.equityVestingYears) || 4;
  const annualEquity = parseNum(form.equityGrant) / vestingYears;
  const signing = parseNum(form.signingBonus) / 2;
  const learning = parseNum(form.learningBudget);
  const wfh = parseNum(form.workFromHomeStiped);
  return base + bonus + annualEquity + signing + learning + wfh;
}

const INITIAL_FORM: OfferFormData = {
  company: "",
  role: "",
  location: "",
  remote: "hybrid",
  baseSalary: "",
  targetBonus: "",
  signingBonus: "",
  equityGrant: "",
  equityVestingYears: "4",
  pto: "",
  retirement401k: false,
  healthInsurance: "good",
  learningBudget: "",
  workFromHomeStiped: "",
  notes: "",
};

const REMOTE_LABELS: Record<string, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "On-site",
};

const HEALTH_LABELS: Record<string, string> = {
  excellent: "Excellent",
  good: "Good",
  basic: "Basic",
  none: "None",
};

const CARD_COLORS = [
  { border: "rgba(139,92,246,0.35)", glow: "rgba(139,92,246,0.08)" },
  { border: "rgba(96,165,250,0.35)", glow: "rgba(96,165,250,0.08)" },
  { border: "rgba(52,211,153,0.35)", glow: "rgba(52,211,153,0.08)" },
  { border: "rgba(251,191,36,0.35)", glow: "rgba(251,191,36,0.08)" },
];

// ─── Sub-components ────────────────────────────────────────────────────────────

function InputField({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
  prefix,
  suffix,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  prefix?: string;
  suffix?: string;
  required?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: C.textSecondary,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        {label}
        {required && <span style={{ color: C.red, marginLeft: 2 }}>*</span>}
      </label>
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        {prefix && (
          <span
            style={{
              position: "absolute",
              left: 12,
              color: C.textMuted,
              fontSize: 14,
              pointerEvents: "none",
            }}
          >
            {prefix}
          </span>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            width: "100%",
            background: C.bgBase,
            border: `1px solid ${C.borderMedium}`,
            borderRadius: 8,
            padding: `10px ${suffix ? "36px" : "12px"} 10px ${prefix ? "28px" : "12px"}`,
            color: C.textPrimary,
            fontSize: 14,
            outline: "none",
            fontFamily: "'Inter', sans-serif",
            boxSizing: "border-box",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = C.accentBorder;
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = C.borderMedium;
          }}
        />
        {suffix && (
          <span
            style={{
              position: "absolute",
              right: 12,
              color: C.textMuted,
              fontSize: 12,
              pointerEvents: "none",
            }}
          >
            {suffix}
          </span>
        )}
      </div>
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
      <label
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: C.textSecondary,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          background: C.bgBase,
          border: `1px solid ${C.borderMedium}`,
          borderRadius: 8,
          padding: "10px 12px",
          color: C.textPrimary,
          fontSize: 14,
          outline: "none",
          fontFamily: "'Inter', sans-serif",
          cursor: "pointer",
          appearance: "none",
          WebkitAppearance: "none",
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} style={{ background: C.bgSurface }}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ─── Add Offer Modal ───────────────────────────────────────────────────────────

function AddOfferModal({
  onClose,
  onSave,
  isSaving,
}: {
  onClose: () => void;
  onSave: (form: OfferFormData) => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState<OfferFormData>(INITIAL_FORM);
  const liveValue = useMemo(() => computeLiveValue(form), [form]);

  const setField = useCallback(
    <K extends keyof OfferFormData>(key: K, value: OfferFormData[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleSubmit = () => {
    if (!form.company || !form.role || !form.location || !form.baseSalary) return;
    onSave(form);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(6,6,8,0.85)",
        backdropFilter: "blur(8px)",
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        overflowY: "auto",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.2 }}
        style={{
          background: C.bgSurface,
          border: `1px solid ${C.accentBorder}`,
          borderRadius: 16,
          width: "100%",
          maxWidth: 640,
          maxHeight: "90vh",
          overflowY: "auto",
          padding: 32,
          position: "relative",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 24,
          }}
        >
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: C.textPrimary, margin: 0 }}>
              Add Job Offer
            </h2>
            <p style={{ fontSize: 13, color: C.textSecondary, margin: "4px 0 0" }}>
              Enter offer details to compare true annual value
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: C.borderSubtle,
              border: "none",
              borderRadius: 8,
              padding: "6px 8px",
              cursor: "pointer",
              color: C.textSecondary,
              display: "flex",
              alignItems: "center",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Live Value Banner */}
        {liveValue > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: "rgba(52,211,153,0.08)",
              border: "1px solid rgba(52,211,153,0.2)",
              borderRadius: 10,
              padding: "12px 16px",
              marginBottom: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span style={{ fontSize: 13, color: C.textSecondary }}>
              True Annual Value (live preview)
            </span>
            <span
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: C.green,
                fontFamily: "monospace",
              }}
            >
              {formatCurrency(liveValue)}
            </span>
          </motion.div>
        )}

        {/* Form Grid */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Row 1: Company + Role */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <InputField
              label="Company"
              value={form.company}
              onChange={(v) => setField("company", v)}
              placeholder="Acme Corp"
              required
            />
            <InputField
              label="Role"
              value={form.role}
              onChange={(v) => setField("role", v)}
              placeholder="Senior Engineer"
              required
            />
          </div>

          {/* Row 2: Location + Remote */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <InputField
              label="Location"
              value={form.location}
              onChange={(v) => setField("location", v)}
              placeholder="San Francisco, CA"
              required
            />
            <SelectField
              label="Work Type"
              value={form.remote}
              onChange={(v) => setField("remote", v as OfferFormData["remote"])}
              options={[
                { value: "remote", label: "Remote" },
                { value: "hybrid", label: "Hybrid" },
                { value: "onsite", label: "On-site" },
              ]}
            />
          </div>

          {/* Section: Compensation */}
          <div>
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: C.accent,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                margin: "0 0 12px",
              }}
            >
              Compensation
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <InputField
                label="Base Salary"
                value={form.baseSalary}
                onChange={(v) => setField("baseSalary", v)}
                placeholder="150000"
                prefix="$"
                type="number"
                required
              />
              <InputField
                label="Target Bonus"
                value={form.targetBonus}
                onChange={(v) => setField("targetBonus", v)}
                placeholder="15"
                suffix="%"
                type="number"
              />
              <InputField
                label="Signing Bonus"
                value={form.signingBonus}
                onChange={(v) => setField("signingBonus", v)}
                placeholder="20000"
                prefix="$"
                type="number"
              />
            </div>
          </div>

          {/* Section: Equity */}
          <div>
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: C.accent,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                margin: "0 0 12px",
              }}
            >
              Equity
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <InputField
                label="Total Equity Grant"
                value={form.equityGrant}
                onChange={(v) => setField("equityGrant", v)}
                placeholder="300000"
                prefix="$"
                type="number"
              />
              <InputField
                label="Vesting Years"
                value={form.equityVestingYears}
                onChange={(v) => setField("equityVestingYears", v)}
                placeholder="4"
                type="number"
              />
            </div>
          </div>

          {/* Section: Benefits */}
          <div>
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: C.accent,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                margin: "0 0 12px",
              }}
            >
              Benefits
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <InputField
                label="PTO Days / Year"
                value={form.pto}
                onChange={(v) => setField("pto", v)}
                placeholder="20"
                type="number"
              />
              <SelectField
                label="Health Insurance"
                value={form.healthInsurance}
                onChange={(v) =>
                  setField("healthInsurance", v as OfferFormData["healthInsurance"])
                }
                options={[
                  { value: "excellent", label: "Excellent" },
                  { value: "good", label: "Good" },
                  { value: "basic", label: "Basic" },
                  { value: "none", label: "None" },
                ]}
              />
              <InputField
                label="Learning Budget / Year"
                value={form.learningBudget}
                onChange={(v) => setField("learningBudget", v)}
                placeholder="3000"
                prefix="$"
                type="number"
              />
              <InputField
                label="WFH Stipend / Year"
                value={form.workFromHomeStiped}
                onChange={(v) => setField("workFromHomeStiped", v)}
                placeholder="1200"
                prefix="$"
                type="number"
              />
            </div>

            {/* 401k checkbox */}
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginTop: 16,
                cursor: "pointer",
              }}
            >
              <div
                onClick={() => setField("retirement401k", !form.retirement401k)}
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 4,
                  border: `2px solid ${form.retirement401k ? C.accent : C.borderMedium}`,
                  background: form.retirement401k ? C.accent : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {form.retirement401k && <Check size={12} color="#fff" />}
              </div>
              <span style={{ fontSize: 14, color: C.textSecondary }}>
                401(k) employer match included
              </span>
            </label>
          </div>

          {/* Notes */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: C.textSecondary,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              Notes
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
              placeholder="Team culture, growth potential, commute, etc."
              rows={3}
              style={{
                background: C.bgBase,
                border: `1px solid ${C.borderMedium}`,
                borderRadius: 8,
                padding: "10px 12px",
                color: C.textPrimary,
                fontSize: 14,
                fontFamily: "'Inter', sans-serif",
                resize: "vertical",
                outline: "none",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = C.accentBorder;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = C.borderMedium;
              }}
            />
          </div>
        </div>

        {/* Actions */}
        <div
          style={{
            display: "flex",
            gap: 12,
            marginTop: 28,
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: `1px solid ${C.borderMedium}`,
              borderRadius: 8,
              padding: "10px 20px",
              color: C.textSecondary,
              fontSize: 14,
              cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={
              isSaving || !form.company || !form.role || !form.location || !form.baseSalary
            }
            style={{
              background:
                isSaving || !form.company || !form.role || !form.location || !form.baseSalary
                  ? C.textMuted
                  : C.accentBright,
              border: "none",
              borderRadius: 8,
              padding: "10px 24px",
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor:
                isSaving || !form.company || !form.role || !form.location || !form.baseSalary
                  ? "not-allowed"
                  : "pointer",
              fontFamily: "'Inter', sans-serif",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            {isSaving ? "Saving…" : "Add Offer"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Offer Card ────────────────────────────────────────────────────────────────

function OfferCard({
  offer,
  colorIndex,
  isWinner,
  onDelete,
}: {
  offer: Offer;
  colorIndex: number;
  isWinner: boolean;
  onDelete: (id: string) => void;
}) {
  const color = CARD_COLORS[colorIndex % CARD_COLORS.length];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      layout
      style={{
        background: isWinner
          ? `linear-gradient(135deg, rgba(52,211,153,0.06) 0%, ${C.bgSurface} 60%)`
          : C.bgSurface,
        border: `1px solid ${isWinner ? "rgba(52,211,153,0.35)" : color.border}`,
        borderRadius: 14,
        padding: 24,
        minWidth: 280,
        maxWidth: 320,
        flexShrink: 0,
        position: "relative",
        boxShadow: isWinner
          ? "0 0 30px rgba(52,211,153,0.08)"
          : `0 0 20px ${color.glow}`,
      }}
    >
      {isWinner && (
        <div
          style={{
            position: "absolute",
            top: -12,
            left: "50%",
            transform: "translateX(-50%)",
            background: "linear-gradient(90deg, #34D399, #059669)",
            borderRadius: 20,
            padding: "3px 12px",
            fontSize: 11,
            fontWeight: 700,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            gap: 4,
            whiteSpace: "nowrap",
          }}
        >
          <Trophy size={10} />
          AI WINNER
        </div>
      )}

      {/* Header */}
      <div
        style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}
      >
        <div>
          <p style={{ fontSize: 18, fontWeight: 700, color: C.textPrimary, margin: 0 }}>
            {offer.company}
          </p>
          <p style={{ fontSize: 13, color: C.textSecondary, margin: "3px 0 0" }}>
            {offer.role}
          </p>
        </div>
        <button
          onClick={() => onDelete(offer.id)}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: C.textMuted,
            padding: 4,
            borderRadius: 6,
            display: "flex",
            alignItems: "center",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = C.red;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = C.textMuted;
          }}
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Location / Remote */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 20,
          color: C.textSecondary,
          fontSize: 12,
        }}
      >
        <MapPin size={12} />
        <span>{offer.location}</span>
        <span
          style={{
            background: C.accentMuted,
            color: C.accent,
            borderRadius: 20,
            padding: "1px 8px",
            fontSize: 11,
            fontWeight: 500,
            marginLeft: 4,
          }}
        >
          {REMOTE_LABELS[offer.remote]}
        </span>
      </div>

      {/* True Annual Value */}
      <div
        style={{
          background: isWinner ? "rgba(52,211,153,0.08)" : C.accentMuted,
          border: `1px solid ${isWinner ? "rgba(52,211,153,0.2)" : C.accentBorder}`,
          borderRadius: 10,
          padding: "12px 14px",
          marginBottom: 16,
        }}
      >
        <p style={{ fontSize: 11, color: C.textSecondary, margin: "0 0 4px" }}>
          True Annual Value
        </p>
        <p
          style={{
            fontSize: 24,
            fontWeight: 800,
            color: isWinner ? C.green : C.accent,
            margin: 0,
            fontFamily: "monospace",
          }}
        >
          {formatCurrency(offer.trueAnnualValue ?? 0)}
        </p>
      </div>

      {/* Fields grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
          fontSize: 12,
        }}
      >
        <FieldItem label="Base Salary" value={formatCurrency(offer.baseSalary)} />
        <FieldItem
          label="Target Bonus"
          value={`${offer.targetBonus}%`}
          sub={`≈ ${formatCurrency(offer.baseSalary * offer.targetBonus / 100)}`}
        />
        <FieldItem
          label="Signing Bonus"
          value={offer.signingBonus > 0 ? formatCurrency(offer.signingBonus) : "—"}
        />
        <FieldItem
          label="Annual Equity"
          value={
            offer.annualEquityValue && offer.annualEquityValue > 0
              ? formatCurrency(offer.annualEquityValue)
              : "—"
          }
          sub={
            offer.equityGrant > 0
              ? `${formatCurrency(offer.equityGrant)} / ${offer.equityVestingYears}yr`
              : undefined
          }
        />
        <FieldItem label="PTO" value={`${offer.pto} days`} />
        <FieldItem label="Health" value={HEALTH_LABELS[offer.healthInsurance]} />
        <FieldItem
          label="Learning"
          value={offer.learningBudget > 0 ? formatCurrency(offer.learningBudget) : "—"}
        />
        <FieldItem
          label="WFH Stipend"
          value={offer.workFromHomeStiped > 0 ? formatCurrency(offer.workFromHomeStiped) : "—"}
        />
        <FieldItem label="401(k)" value={offer.retirement401k ? "✓ Match" : "—"} />
      </div>

      {offer.notes && (
        <p
          style={{
            marginTop: 14,
            fontSize: 12,
            color: C.textSecondary,
            fontStyle: "italic",
            borderTop: `1px solid ${C.borderSubtle}`,
            paddingTop: 10,
          }}
        >
          {offer.notes}
        </p>
      )}
    </motion.div>
  );
}

function FieldItem({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div>
      <p style={{ margin: 0, color: C.textMuted, fontSize: 11 }}>{label}</p>
      <p
        style={{
          margin: "2px 0 0",
          color: C.textPrimary,
          fontSize: 13,
          fontWeight: 600,
          fontFamily: "monospace",
        }}
      >
        {value}
      </p>
      {sub && (
        <p style={{ margin: 0, color: C.textMuted, fontSize: 10 }}>{sub}</p>
      )}
    </div>
  );
}

// ─── Comparison Table ─────────────────────────────────────────────────────────

function ComparisonTable({
  offers,
  winnerCompany,
}: {
  offers: Offer[];
  winnerCompany: string | null;
}) {
  type Row = {
    label: string;
    getValue: (o: Offer) => string;
    getBest: (offers: Offer[]) => string;
  };

  const rows: Row[] = [
    {
      label: "True Annual Value",
      getValue: (o) => formatCurrency(o.trueAnnualValue ?? 0),
      getBest: (all) =>
        all.reduce((a, b) =>
          (a.trueAnnualValue ?? 0) >= (b.trueAnnualValue ?? 0) ? a : b
        ).company,
    },
    {
      label: "Base Salary",
      getValue: (o) => formatCurrency(o.baseSalary),
      getBest: (all) =>
        all.reduce((a, b) => (a.baseSalary >= b.baseSalary ? a : b)).company,
    },
    {
      label: "Target Bonus",
      getValue: (o) =>
        `${o.targetBonus}% (${formatCurrency(o.baseSalary * o.targetBonus / 100)})`,
      getBest: (all) =>
        all.reduce((a, b) => (a.targetBonus >= b.targetBonus ? a : b)).company,
    },
    {
      label: "Signing Bonus",
      getValue: (o) => (o.signingBonus > 0 ? formatCurrency(o.signingBonus) : "—"),
      getBest: (all) =>
        all.reduce((a, b) => (a.signingBonus >= b.signingBonus ? a : b)).company,
    },
    {
      label: "Annual Equity",
      getValue: (o) =>
        o.annualEquityValue && o.annualEquityValue > 0
          ? formatCurrency(o.annualEquityValue)
          : "—",
      getBest: (all) =>
        all.reduce((a, b) =>
          (a.annualEquityValue ?? 0) >= (b.annualEquityValue ?? 0) ? a : b
        ).company,
    },
    {
      label: "PTO",
      getValue: (o) => `${o.pto} days`,
      getBest: (all) => all.reduce((a, b) => (a.pto >= b.pto ? a : b)).company,
    },
    {
      label: "Health Insurance",
      getValue: (o) => HEALTH_LABELS[o.healthInsurance],
      getBest: (all) => {
        const rank: Record<string, number> = { excellent: 4, good: 3, basic: 2, none: 1 };
        return all.reduce((a, b) =>
          (rank[a.healthInsurance] ?? 0) >= (rank[b.healthInsurance] ?? 0) ? a : b
        ).company;
      },
    },
    {
      label: "Learning Budget",
      getValue: (o) => (o.learningBudget > 0 ? formatCurrency(o.learningBudget) : "—"),
      getBest: (all) =>
        all.reduce((a, b) => (a.learningBudget >= b.learningBudget ? a : b)).company,
    },
    {
      label: "WFH Stipend",
      getValue: (o) =>
        o.workFromHomeStiped > 0 ? formatCurrency(o.workFromHomeStiped) : "—",
      getBest: (all) =>
        all.reduce((a, b) => (a.workFromHomeStiped >= b.workFromHomeStiped ? a : b)).company,
    },
    {
      label: "401(k) Match",
      getValue: (o) => (o.retirement401k ? "Yes ✓" : "No"),
      getBest: (all) => (all.find((o) => o.retirement401k)?.company ?? all[0].company),
    },
  ];

  return (
    <div
      style={{
        background: C.bgSurface,
        border: `1px solid ${C.borderSubtle}`,
        borderRadius: 14,
        overflow: "hidden",
        overflowX: "auto",
      }}
    >
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: C.bgElevated }}>
            <th
              style={{
                padding: "12px 20px",
                textAlign: "left",
                fontSize: 12,
                fontWeight: 600,
                color: C.textMuted,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                minWidth: 160,
              }}
            >
              Field
            </th>
            {offers.map((o, i) => (
              <th
                key={o.id}
                style={{
                  padding: "12px 20px",
                  textAlign: "right",
                  fontSize: 14,
                  fontWeight: 700,
                  color:
                    winnerCompany === o.company
                      ? C.green
                      : CARD_COLORS[i % CARD_COLORS.length].border.replace("0.35", "1"),
                  minWidth: 160,
                }}
              >
                {o.company}
                {winnerCompany === o.company && (
                  <Trophy size={12} style={{ marginLeft: 4, display: "inline" }} />
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIdx) => {
            const bestCompany = row.getBest(offers);
            return (
              <tr
                key={row.label}
                style={{
                  borderTop: `1px solid ${C.borderSubtle}`,
                  background: rowIdx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                }}
              >
                <td
                  style={{
                    padding: "11px 20px",
                    fontSize: 13,
                    color: C.textSecondary,
                    fontWeight: 500,
                  }}
                >
                  {row.label}
                </td>
                {offers.map((o) => {
                  const isBest = bestCompany === o.company;
                  return (
                    <td
                      key={o.id}
                      style={{
                        padding: "11px 20px",
                        textAlign: "right",
                        fontSize: 13,
                        fontFamily: "monospace",
                        fontWeight: isBest ? 700 : 400,
                        color: isBest ? C.green : C.textPrimary,
                        background: isBest ? "rgba(52,211,153,0.06)" : "transparent",
                      }}
                    >
                      {row.getValue(o)}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────

function ValueBarChart({ offers }: { offers: Offer[] }) {
  const maxValue = Math.max(...offers.map((o) => o.trueAnnualValue ?? 0), 1);

  return (
    <div
      style={{
        background: C.bgSurface,
        border: `1px solid ${C.borderSubtle}`,
        borderRadius: 14,
        padding: 24,
      }}
    >
      <h3
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: C.textSecondary,
          margin: "0 0 20px",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <TrendingUp size={16} color={C.accent} />
        True Annual Value Comparison
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {[...offers]
          .sort((a, b) => (b.trueAnnualValue ?? 0) - (a.trueAnnualValue ?? 0))
          .map((offer, i) => {
            const pct = ((offer.trueAnnualValue ?? 0) / maxValue) * 100;
            const colorIdx = offers.findIndex((o) => o.id === offer.id);
            const barColor =
              i === 0
                ? C.green
                : CARD_COLORS[colorIdx % CARD_COLORS.length].border.replace("0.35", "0.9");

            return (
              <div key={offer.id}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 6,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Building2 size={13} color={C.textMuted} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary }}>
                      {offer.company}
                    </span>
                    <span style={{ fontSize: 11, color: C.textMuted }}>{offer.role}</span>
                  </div>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: barColor,
                      fontFamily: "monospace",
                    }}
                  >
                    {formatCurrency(offer.trueAnnualValue ?? 0)}
                  </span>
                </div>
                <div
                  style={{
                    height: 8,
                    background: C.bgBase,
                    borderRadius: 4,
                    overflow: "hidden",
                  }}
                >
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, delay: i * 0.1, ease: "easeOut" }}
                    style={{
                      height: "100%",
                      background: barColor,
                      borderRadius: 4,
                    }}
                  />
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

// ─── AI Analysis Panel ────────────────────────────────────────────────────────

function AIAnalysisPanel({ analysis }: { analysis: AIAnalysis }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: "linear-gradient(135deg, rgba(124,58,237,0.08) 0%, rgba(11,11,20,0) 60%)",
        border: `1px solid ${C.accentBorder}`,
        borderRadius: 14,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 24px",
          borderBottom: `1px solid ${C.borderSubtle}`,
          cursor: "pointer",
        }}
        onClick={() => setExpanded((v) => !v)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              background: C.accentMuted,
              border: `1px solid ${C.accentBorder}`,
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Sparkles size={16} color={C.accent} />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.textPrimary }}>
              AI Recommendation
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: C.textSecondary }}>
              Winner:{" "}
              <span style={{ color: C.green, fontWeight: 600 }}>{analysis.winner}</span>
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp size={16} color={C.textMuted} />
        ) : (
          <ChevronDown size={16} color={C.textMuted} />
        )}
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 24 }}>
              {/* Reasoning */}
              <div>
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: C.accent,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    margin: "0 0 8px",
                  }}
                >
                  Reasoning
                </p>
                <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.65, margin: 0 }}>
                  {analysis.reasoning}
                </p>
              </div>

              {/* Pros / Cons */}
              <div>
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: C.accent,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    margin: "0 0 12px",
                  }}
                >
                  Pros & Cons
                </p>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                    gap: 14,
                  }}
                >
                  {analysis.pros_cons.map((pc) => (
                    <div
                      key={pc.company}
                      style={{
                        background: C.bgSurface,
                        border: `1px solid ${C.borderSubtle}`,
                        borderRadius: 10,
                        padding: 16,
                      }}
                    >
                      <p
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: C.textPrimary,
                          margin: "0 0 12px",
                        }}
                      >
                        {pc.company}
                      </p>
                      {pc.pros.length > 0 && (
                        <div style={{ marginBottom: 10 }}>
                          {pc.pros.map((pro, i) => (
                            <div
                              key={i}
                              style={{
                                display: "flex",
                                alignItems: "flex-start",
                                gap: 8,
                                marginBottom: 5,
                              }}
                            >
                              <Check
                                size={12}
                                color={C.green}
                                style={{ marginTop: 2, flexShrink: 0 }}
                              />
                              <span style={{ fontSize: 12, color: C.textSecondary }}>
                                {pro}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      {pc.cons.length > 0 && (
                        <div>
                          {pc.cons.map((con, i) => (
                            <div
                              key={i}
                              style={{
                                display: "flex",
                                alignItems: "flex-start",
                                gap: 8,
                                marginBottom: 5,
                              }}
                            >
                              <X
                                size={12}
                                color={C.red}
                                style={{ marginTop: 2, flexShrink: 0 }}
                              />
                              <span style={{ fontSize: 12, color: C.textSecondary }}>
                                {con}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Negotiation Tips */}
              <div>
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: C.accent,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    margin: "0 0 12px",
                  }}
                >
                  Negotiation Tips
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {analysis.negotiation_tips.map((tip, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 10,
                        background: "rgba(251,191,36,0.06)",
                        border: "1px solid rgba(251,191,36,0.15)",
                        borderRadius: 8,
                        padding: "10px 14px",
                      }}
                    >
                      <Info
                        size={14}
                        color={C.amber}
                        style={{ marginTop: 1, flexShrink: 0 }}
                      />
                      <span style={{ fontSize: 13, color: C.textSecondary }}>{tip}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Final Recommendation */}
              <div
                style={{
                  background: "rgba(52,211,153,0.06)",
                  border: "1px solid rgba(52,211,153,0.2)",
                  borderRadius: 10,
                  padding: 18,
                }}
              >
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: C.green,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    margin: "0 0 8px",
                  }}
                >
                  Final Recommendation
                </p>
                <p
                  style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.65, margin: 0 }}
                >
                  {analysis.final_recommendation}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OffersPage() {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // ── Data fetching ──────────────────────────────────────────────────────────
  const {
    data: offersResponse,
    isLoading,
    error: fetchError,
  } = useQuery({
    queryKey: ["offers"],
    queryFn: () =>
      apiFetch<{ success: boolean; data: { offers: Offer[] } }>("/api/offers"),
  });

  const offers: Offer[] = offersResponse?.data?.offers ?? [];

  // ── Save mutation ──────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: (form: OfferFormData) =>
      apiFetch("/api/offers", {
        method: "POST",
        body: JSON.stringify({
          action: "save",
          company: form.company,
          role: form.role,
          location: form.location,
          remote: form.remote,
          baseSalary: parseNum(form.baseSalary),
          targetBonus: parseNum(form.targetBonus),
          signingBonus: parseNum(form.signingBonus),
          equityGrant: parseNum(form.equityGrant),
          equityVestingYears: parseNum(form.equityVestingYears) || 4,
          pto: parseNum(form.pto),
          retirement401k: form.retirement401k,
          healthInsurance: form.healthInsurance,
          learningBudget: parseNum(form.learningBudget),
          workFromHomeStiped: parseNum(form.workFromHomeStiped),
          notes: form.notes,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offers"] });
      setShowAddModal(false);
    },
  });

  // ── Delete mutation ────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch("/api/offers", {
        method: "DELETE",
        body: JSON.stringify({ id }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offers"] });
      setAiAnalysis(null);
    },
  });

  // ── Compare mutation ───────────────────────────────────────────────────────
  const compareMutation = useMutation({
    mutationFn: (offerIds: string[]) =>
      apiFetch<{ success: boolean; data: { analysis: AIAnalysis } }>("/api/offers", {
        method: "POST",
        body: JSON.stringify({ action: "compare", offerIds }),
      }),
    onSuccess: (response) => {
      setAiAnalysis(response?.data?.analysis ?? null);
      setAiError(null);
    },
    onError: (err: Error) => {
      setAiError(err.message ?? "AI comparison failed");
    },
  });

  const handleCompare = () => {
    setAiError(null);
    compareMutation.mutate(offers.map((o) => o.id));
  };

  const winnerCompany = aiAnalysis?.winner ?? null;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bgBase,
        fontFamily: "'Inter', sans-serif",
        color: C.textPrimary,
        padding: "32px 32px 80px",
      }}
    >
      {/* ── Page Header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 36,
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 48,
              height: 48,
              background: C.accentMuted,
              border: `1px solid ${C.accentBorder}`,
              borderRadius: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Scale size={22} color={C.accent} />
          </div>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, color: C.textPrimary }}>
              Offer Comparison
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: 14, color: C.textSecondary }}>
              See the true value of every offer side-by-side
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {offers.length >= 2 && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCompare}
              disabled={compareMutation.isPending}
              style={{
                background: compareMutation.isPending
                  ? C.textMuted
                  : "linear-gradient(135deg, rgba(124,58,237,0.25), rgba(124,58,237,0.15))",
                border: `1px solid ${C.accentBorder}`,
                borderRadius: 10,
                padding: "10px 18px",
                color: compareMutation.isPending ? C.bgBase : C.textPrimary,
                fontSize: 14,
                fontWeight: 600,
                cursor: compareMutation.isPending ? "not-allowed" : "pointer",
                fontFamily: "'Inter', sans-serif",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {compareMutation.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Sparkles size={14} color={C.accent} />
              )}
              {compareMutation.isPending ? "Analysing…" : "Compare with AI"}
            </motion.button>
          )}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowAddModal(true)}
            style={{
              background: C.accentBright,
              border: "none",
              borderRadius: 10,
              padding: "10px 18px",
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Plus size={16} />
            Add Offer
          </motion.button>
        </div>
      </div>

      {/* ── Loading ── */}
      {isLoading && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: 200,
            gap: 12,
            color: C.textSecondary,
          }}
        >
          <Loader2 size={20} className="animate-spin" color={C.accent} />
          <span>Loading offers…</span>
        </div>
      )}

      {/* ── Fetch error ── */}
      {fetchError && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "rgba(248,113,113,0.08)",
            border: "1px solid rgba(248,113,113,0.2)",
            borderRadius: 10,
            padding: "14px 18px",
            color: C.red,
            marginBottom: 24,
          }}
        >
          <AlertCircle size={16} />
          <span>Failed to load offers. Please refresh.</span>
        </div>
      )}

      {/* ── Empty state ── */}
      {!isLoading && !fetchError && offers.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "80px 24px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              background: C.accentMuted,
              border: `1px solid ${C.accentBorder}`,
              borderRadius: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
            }}
          >
            <Scale size={32} color={C.accent} />
          </div>
          <h2
            style={{ fontSize: 20, fontWeight: 700, color: C.textPrimary, margin: "0 0 8px" }}
          >
            No offers yet
          </h2>
          <p style={{ fontSize: 14, color: C.textSecondary, margin: "0 0 24px", maxWidth: 400 }}>
            Add your first job offer to see its true annual value including salary, bonus, equity,
            and all benefits.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              background: C.accentBright,
              border: "none",
              borderRadius: 10,
              padding: "12px 24px",
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Plus size={16} />
            Add Your First Offer
          </button>
        </motion.div>
      )}

      {/* ── Offers Grid ── */}
      {offers.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          {/* Horizontal scroll of offer cards */}
          <div>
            <h2
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: C.textSecondary,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                margin: "0 0 16px",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <DollarSign size={14} color={C.accent} />
              {offers.length} {offers.length === 1 ? "Offer" : "Offers"}
            </h2>
            <div
              style={{
                display: "flex",
                gap: 20,
                overflowX: "auto",
                paddingBottom: 12,
              }}
            >
              <AnimatePresence mode="popLayout">
                {offers.map((offer, i) => (
                  <OfferCard
                    key={offer.id}
                    offer={offer}
                    colorIndex={i}
                    isWinner={winnerCompany === offer.company}
                    onDelete={(id) => deleteMutation.mutate(id)}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Bar Chart */}
          <ValueBarChart offers={offers} />

          {/* Comparison Table (2+ offers) */}
          {offers.length >= 2 && (
            <div>
              <h2
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: C.textSecondary,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  margin: "0 0 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Scale size={14} color={C.accent} />
                Side-by-Side Comparison
              </h2>
              <ComparisonTable offers={offers} winnerCompany={winnerCompany} />
            </div>
          )}

          {/* AI Error */}
          {aiError && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: "rgba(248,113,113,0.08)",
                border: "1px solid rgba(248,113,113,0.2)",
                borderRadius: 10,
                padding: "14px 18px",
                color: C.red,
              }}
            >
              <AlertCircle size={16} />
              <span>{aiError}</span>
            </div>
          )}

          {/* AI Analysis Panel */}
          {aiAnalysis && <AIAnalysisPanel analysis={aiAnalysis} />}

          {/* Hint when 2+ offers and no AI yet */}
          {offers.length >= 2 && !aiAnalysis && !compareMutation.isPending && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: C.accentMuted,
                border: `1px solid ${C.accentBorder}`,
                borderRadius: 10,
                padding: "12px 16px",
                color: C.textSecondary,
                fontSize: 13,
              }}
            >
              <Sparkles size={14} color={C.accent} />
              <span>
                Click{" "}
                <span style={{ color: C.accent, fontWeight: 600 }}>Compare with AI</span> to get
                an AI-powered recommendation and negotiation tips.
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Add Offer Modal ── */}
      <AnimatePresence>
        {showAddModal && (
          <AddOfferModal
            onClose={() => setShowAddModal(false)}
            onSave={(form) => saveMutation.mutate(form)}
            isSaving={saveMutation.isPending}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
