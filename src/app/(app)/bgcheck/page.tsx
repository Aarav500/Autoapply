"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import {
  ShieldCheck,
  Briefcase,
  GraduationCap,
  Scale,
  CreditCard,
  Award,
  Users,
  Fingerprint,
  Flag,
  Loader2,
  AlertCircle,
  CheckCircle2,
  MinusCircle,
  Clock,
  AlertTriangle,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

// ─── Types ────────────────────────────────────────────────────────────────────

type Category =
  | "employment"
  | "education"
  | "criminal"
  | "credit"
  | "licenses"
  | "references"
  | "identity";

type ItemStatus = "pending" | "ready" | "needs-attention" | "not-applicable";
type OverallStatus = "not-started" | "in-progress" | "ready";

interface ChecklistItem {
  id: string;
  category: Category;
  item: string;
  status: ItemStatus;
  notes: string;
  flagged: boolean;
  explanation?: string;
}

interface BGCheckState {
  items: ChecklistItem[];
  overallStatus: OverallStatus;
  lastUpdated: string;
}

// ─── Category metadata ────────────────────────────────────────────────────────

const CATEGORIES: {
  id: Category;
  label: string;
  icon: React.ElementType;
}[] = [
  { id: "employment", label: "Employment History", icon: Briefcase },
  { id: "education", label: "Education", icon: GraduationCap },
  { id: "criminal", label: "Criminal / Civil", icon: Scale },
  { id: "credit", label: "Credit", icon: CreditCard },
  { id: "licenses", label: "Professional Licenses", icon: Award },
  { id: "references", label: "References", icon: Users },
  { id: "identity", label: "Identity Documents", icon: Fingerprint },
];

// ─── Status cycling ───────────────────────────────────────────────────────────

const STATUS_CYCLE: ItemStatus[] = [
  "pending",
  "ready",
  "needs-attention",
  "not-applicable",
];

function nextStatus(current: ItemStatus): ItemStatus {
  const idx = STATUS_CYCLE.indexOf(current);
  return STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
}

// ─── Status visuals ───────────────────────────────────────────────────────────

interface StatusMeta {
  icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
  label: string;
}

function getStatusMeta(status: ItemStatus): StatusMeta {
  switch (status) {
    case "ready":
      return {
        icon: CheckCircle2,
        color: "#34D399",
        bg: "rgba(52,211,153,0.08)",
        border: "rgba(52,211,153,0.2)",
        label: "Ready",
      };
    case "needs-attention":
      return {
        icon: AlertTriangle,
        color: "#FBBF24",
        bg: "rgba(251,191,36,0.08)",
        border: "rgba(251,191,36,0.2)",
        label: "Needs attention",
      };
    case "not-applicable":
      return {
        icon: MinusCircle,
        color: "#3A3A60",
        bg: "rgba(58,58,96,0.08)",
        border: "rgba(58,58,96,0.2)",
        label: "N/A",
      };
    default:
      return {
        icon: Clock,
        color: "#9090B8",
        bg: "rgba(144,144,184,0.06)",
        border: "rgba(144,144,184,0.12)",
        label: "Pending",
      };
  }
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ReadinessBar({
  items,
}: {
  items: ChecklistItem[];
}) {
  const resolved = items.filter(
    (i) => i.status === "ready" || i.status === "not-applicable"
  ).length;
  const pct = items.length === 0 ? 0 : Math.round((resolved / items.length) * 100);

  let barColor = "#7C3AED";
  let labelColor = "#9090B8";
  if (pct === 100) {
    barColor = "#34D399";
    labelColor = "#34D399";
  } else if (pct >= 60) {
    barColor = "#FBBF24";
    labelColor = "#FBBF24";
  }

  return (
    <div
      className="rounded-xl p-5"
      style={{ background: "#0C0C14", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div className="flex items-center justify-between mb-3">
        <span
          className="text-[13px] font-medium"
          style={{ color: "#9090B8", fontFamily: "'Inter', sans-serif" }}
        >
          Overall Readiness
        </span>
        <span
          className="text-[22px] font-bold"
          style={{ color: labelColor, fontFamily: "monospace, monospace" }}
        >
          {pct}%
        </span>
      </div>
      <div
        className="h-2 rounded-full overflow-hidden"
        style={{ background: "rgba(255,255,255,0.06)" }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{ background: barColor }}
          initial={{ width: "0%" }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
      <div className="flex items-center justify-between mt-2">
        <span
          className="text-[11px]"
          style={{ color: "#3A3A60", fontFamily: "monospace, monospace" }}
        >
          {resolved} of {items.length} items resolved
        </span>
        <span
          className="text-[11px] uppercase tracking-widest font-semibold"
          style={{ color: labelColor, fontFamily: "monospace, monospace" }}
        >
          {pct === 100
            ? "READY"
            : pct === 0
            ? "NOT STARTED"
            : "IN PROGRESS"}
        </span>
      </div>
    </div>
  );
}

// ─── AI Guidance panel ────────────────────────────────────────────────────────

function GuidancePanel({
  itemId,
  itemText,
}: {
  itemId: string;
  itemText: string;
}) {
  const [situation, setSituation] = useState("");
  const [guidance, setGuidance] = useState<string | null>(null);

  const mutation = useMutation<{ guidance: string }, Error>({
    mutationFn: () =>
      apiFetch<{ guidance: string }>("/api/bgcheck", {
        method: "POST",
        body: JSON.stringify({
          action: "get-guidance",
          itemId,
          situation,
        }),
      }),
    onSuccess: (data) => setGuidance(data.guidance),
  });

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.22 }}
      className="overflow-hidden"
    >
      <div
        className="mt-3 rounded-xl p-4 space-y-3"
        style={{
          background: "rgba(251,191,36,0.04)",
          border: "1px solid rgba(251,191,36,0.18)",
        }}
      >
        <div className="flex items-center gap-2">
          <Sparkles size={13} style={{ color: "#FBBF24" }} />
          <span
            className="text-[12px] font-semibold uppercase tracking-widest"
            style={{ color: "#FBBF24", fontFamily: "monospace, monospace" }}
          >
            AI Guidance
          </span>
        </div>

        <p
          className="text-[12px]"
          style={{ color: "#9090B8", fontFamily: "'Inter', sans-serif" }}
        >
          Briefly describe your situation for &ldquo;{itemText}&rdquo;
        </p>

        <textarea
          value={situation}
          onChange={(e) => setSituation(e.target.value)}
          placeholder="e.g. I have a 6-month gap because I was caring for a family member..."
          rows={3}
          className="w-full px-3 py-2.5 rounded-lg text-[13px] outline-none resize-none"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "#F0F0FF",
            fontFamily: "'Inter', sans-serif",
          }}
        />

        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !situation.trim()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition-all disabled:opacity-50"
          style={{
            background: mutation.isPending
              ? "rgba(251,191,36,0.15)"
              : "rgba(251,191,36,0.12)",
            color: "#FBBF24",
            border: "1px solid rgba(251,191,36,0.25)",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {mutation.isPending ? (
            <>
              <Loader2 size={13} className="animate-spin" />
              Generating guidance…
            </>
          ) : (
            <>
              <Sparkles size={13} />
              Get AI Guidance
            </>
          )}
        </button>

        {mutation.isError && (
          <div
            className="flex items-center gap-2 p-3 rounded-lg text-[12px]"
            style={{
              background: "rgba(248,113,113,0.08)",
              color: "#F87171",
              border: "1px solid rgba(248,113,113,0.2)",
            }}
          >
            <AlertCircle size={13} />
            {mutation.error.message}
          </div>
        )}

        <AnimatePresence>
          {guidance && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-lg p-4"
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(251,191,36,0.15)",
              }}
            >
              <p
                className="text-[13px] leading-relaxed whitespace-pre-wrap"
                style={{ color: "#F0F0FF", fontFamily: "'Inter', sans-serif" }}
              >
                {guidance}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Checklist item row ───────────────────────────────────────────────────────

function ItemRow({
  item,
  onUpdate,
}: {
  item: ChecklistItem;
  onUpdate: (updated: ChecklistItem) => void;
}) {
  const [showGuidance, setShowGuidance] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const meta = getStatusMeta(item.status);
  const StatusIcon = meta.icon;
  const isNA = item.status === "not-applicable";

  function handleCycle() {
    onUpdate({ ...item, status: nextStatus(item.status) });
  }

  function handleFlag() {
    const flagged = !item.flagged;
    onUpdate({ ...item, flagged });
    if (flagged) setShowGuidance(true);
  }

  function handleNotes(value: string) {
    onUpdate({ ...item, notes: value });
  }

  function handleExplanation(value: string) {
    onUpdate({ ...item, explanation: value });
  }

  return (
    <div
      className="rounded-xl overflow-hidden transition-all"
      style={{
        background:
          item.flagged
            ? "rgba(251,191,36,0.03)"
            : "rgba(255,255,255,0.015)",
        border: item.flagged
          ? "1px solid rgba(251,191,36,0.18)"
          : "1px solid rgba(255,255,255,0.05)",
      }}
    >
      {/* Main row */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Status toggle */}
        <button
          onClick={handleCycle}
          className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all"
          style={{
            background: meta.bg,
            border: `1px solid ${meta.border}`,
          }}
          title={`Status: ${meta.label}. Click to cycle.`}
        >
          <StatusIcon size={14} style={{ color: meta.color }} />
        </button>

        {/* Item text */}
        <span
          className="flex-1 text-[13px] leading-snug"
          style={{
            color: isNA ? "#3A3A60" : "#F0F0FF",
            textDecoration: isNA ? "line-through" : "none",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {item.item}
        </span>

        {/* Notes toggle */}
        <button
          onClick={() => setNotesOpen((v) => !v)}
          className="flex-shrink-0 p-1.5 rounded-lg transition-all"
          style={{
            background: notesOpen
              ? "rgba(139,92,246,0.12)"
              : "transparent",
            color: notesOpen ? "#8B5CF6" : "#3A3A60",
          }}
          title="Add notes"
        >
          {notesOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>

        {/* Flag button */}
        <button
          onClick={handleFlag}
          className="flex-shrink-0 p-1.5 rounded-lg transition-all"
          style={{
            background: item.flagged
              ? "rgba(251,191,36,0.12)"
              : "transparent",
            color: item.flagged ? "#FBBF24" : "#3A3A60",
            border: item.flagged
              ? "1px solid rgba(251,191,36,0.25)"
              : "1px solid transparent",
          }}
          title={item.flagged ? "Remove flag" : "Flag this item (needs explanation)"}
        >
          <Flag size={13} />
        </button>
      </div>

      {/* Notes / explanation expander */}
      <AnimatePresence>
        {notesOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 space-y-2.5">
              <div>
                <label
                  className="block text-[11px] font-medium mb-1"
                  style={{
                    color: "#9090B8",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  Notes
                </label>
                <textarea
                  value={item.notes}
                  onChange={(e) => handleNotes(e.target.value)}
                  placeholder="Add a note…"
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg text-[12px] outline-none resize-none"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    color: "#F0F0FF",
                    fontFamily: "'Inter', sans-serif",
                  }}
                />
              </div>

              {item.flagged && (
                <div>
                  <label
                    className="block text-[11px] font-medium mb-1"
                    style={{
                      color: "#FBBF24",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    Your explanation for this flag
                  </label>
                  <textarea
                    value={item.explanation ?? ""}
                    onChange={(e) => handleExplanation(e.target.value)}
                    placeholder="Write your explanation here…"
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg text-[12px] outline-none resize-none"
                    style={{
                      background: "rgba(251,191,36,0.04)",
                      border: "1px solid rgba(251,191,36,0.18)",
                      color: "#F0F0FF",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Guidance */}
      <AnimatePresence>
        {item.flagged && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-4 pb-3"
          >
            <button
              onClick={() => setShowGuidance((v) => !v)}
              className="flex items-center gap-1.5 text-[12px] font-medium transition-all"
              style={{
                color: showGuidance ? "#FBBF24" : "#9090B8",
                fontFamily: "'Inter', sans-serif",
              }}
            >
              <Sparkles size={12} />
              {showGuidance ? "Hide AI Guidance" : "Get AI Guidance"}
            </button>

            <AnimatePresence>
              {showGuidance && (
                <GuidancePanel itemId={item.id} itemText={item.item} />
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Category section ─────────────────────────────────────────────────────────

function CategorySection({
  categoryId,
  items,
  onUpdate,
}: {
  categoryId: Category;
  items: ChecklistItem[];
  onUpdate: (updated: ChecklistItem) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const meta = CATEGORIES.find((c) => c.id === categoryId)!;
  const Icon = meta.icon;

  const resolved = items.filter(
    (i) => i.status === "ready" || i.status === "not-applicable"
  ).length;
  const allDone = resolved === items.length && items.length > 0;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "#0C0C14",
        border: allDone
          ? "1px solid rgba(52,211,153,0.2)"
          : "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Header */}
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 transition-colors"
        style={{
          background: allDone ? "rgba(52,211,153,0.04)" : "transparent",
        }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            background: allDone
              ? "rgba(52,211,153,0.12)"
              : "rgba(124,58,237,0.1)",
            border: allDone
              ? "1px solid rgba(52,211,153,0.2)"
              : "1px solid rgba(124,58,237,0.2)",
          }}
        >
          <Icon
            size={15}
            style={{ color: allDone ? "#34D399" : "#8B5CF6" }}
          />
        </div>

        <div className="flex-1 text-left">
          <p
            className="text-[14px] font-semibold"
            style={{
              color: "#F0F0FF",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {meta.label}
          </p>
          <p
            className="text-[11px]"
            style={{
              color: allDone ? "#34D399" : "#9090B8",
              fontFamily: "monospace, monospace",
            }}
          >
            {resolved}/{items.length} ready
          </p>
        </div>

        {allDone && (
          <CheckCircle2
            size={16}
            style={{ color: "#34D399", flexShrink: 0 }}
          />
        )}

        {collapsed ? (
          <ChevronDown
            size={15}
            style={{ color: "#3A3A60", flexShrink: 0 }}
          />
        ) : (
          <ChevronUp size={15} style={{ color: "#3A3A60", flexShrink: 0 }} />
        )}
      </button>

      {/* Items */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-2">
              {items.map((item) => (
                <ItemRow key={item.id} item={item} onUpdate={onUpdate} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BGCheckPage() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery<BGCheckState, Error>({
    queryKey: ["bgcheck"],
    queryFn: () => apiFetch<BGCheckState>("/api/bgcheck"),
  });

  const saveMutation = useMutation<BGCheckState, Error, ChecklistItem[]>({
    mutationFn: (items: ChecklistItem[]) =>
      apiFetch<BGCheckState>("/api/bgcheck", {
        method: "POST",
        body: JSON.stringify({ action: "update", items }),
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["bgcheck"], updated);
    },
  });

  function handleItemUpdate(updated: ChecklistItem) {
    if (!data) return;
    const items = data.items.map((i) =>
      i.id === updated.id ? updated : i
    );
    // Optimistic update
    queryClient.setQueryData<BGCheckState>(["bgcheck"], {
      ...data,
      items,
    });
    saveMutation.mutate(items);
  }

  const allReady =
    data?.overallStatus === "ready" && (data?.items.length ?? 0) > 0;

  return (
    <div
      className="max-w-3xl mx-auto px-4 py-8 space-y-6"
      style={{ background: "#060608", minHeight: "100vh" }}
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-3 mb-1">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: "rgba(124,58,237,0.12)",
              border: "1px solid rgba(124,58,237,0.25)",
            }}
          >
            <ShieldCheck size={20} style={{ color: "#8B5CF6" }} />
          </div>
          <div>
            <h1
              className="text-[22px] font-bold"
              style={{ color: "#F0F0FF", fontFamily: "'Inter', sans-serif" }}
            >
              Background Check Prep
            </h1>
            <p
              className="text-[13px]"
              style={{ color: "#9090B8", fontFamily: "'Inter', sans-serif" }}
            >
              Be ready for every verification before it happens
            </p>
          </div>
        </div>
      </motion.div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16 gap-3">
          <Loader2
            size={20}
            className="animate-spin"
            style={{ color: "#8B5CF6" }}
          />
          <span
            className="text-[14px]"
            style={{ color: "#9090B8", fontFamily: "'Inter', sans-serif" }}
          >
            Loading your checklist…
          </span>
        </div>
      )}

      {/* Error */}
      {isError && (
        <div
          className="flex items-center gap-3 p-4 rounded-xl text-[14px]"
          style={{
            background: "rgba(248,113,113,0.08)",
            color: "#F87171",
            border: "1px solid rgba(248,113,113,0.2)",
          }}
        >
          <AlertCircle size={16} />
          {error.message}
        </div>
      )}

      {/* Content */}
      {data && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="space-y-5"
        >
          {/* Progress */}
          <ReadinessBar items={data.items} />

          {/* Success banner */}
          <AnimatePresence>
            {allReady && (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                className="flex items-center gap-3 px-5 py-4 rounded-xl"
                style={{
                  background: "rgba(52,211,153,0.08)",
                  border: "1px solid rgba(52,211,153,0.25)",
                }}
              >
                <CheckCircle2 size={18} style={{ color: "#34D399" }} />
                <div>
                  <p
                    className="text-[14px] font-semibold"
                    style={{
                      color: "#34D399",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    You&rsquo;re background check ready!
                  </p>
                  <p
                    className="text-[12px]"
                    style={{
                      color: "#9090B8",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    All items have been resolved. You&rsquo;re set to proceed
                    with confidence.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Hint */}
          <div
            className="flex items-center gap-2 px-4 py-3 rounded-xl text-[12px]"
            style={{
              background: "rgba(124,58,237,0.06)",
              border: "1px solid rgba(124,58,237,0.12)",
              color: "#9090B8",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            <ShieldCheck size={13} style={{ color: "#7C3AED" }} />
            Click the status icon to cycle: Pending → Ready → Needs attention →
            N/A. Flag items that need an explanation and get AI guidance.
          </div>

          {/* Category sections */}
          {CATEGORIES.map((cat) => {
            const catItems = data.items.filter(
              (i) => i.category === cat.id
            );
            if (catItems.length === 0) return null;
            return (
              <CategorySection
                key={cat.id}
                categoryId={cat.id}
                items={catItems}
                onUpdate={handleItemUpdate}
              />
            );
          })}

          {/* Auto-save indicator */}
          {saveMutation.isPending && (
            <div
              className="flex items-center gap-2 justify-end text-[11px]"
              style={{ color: "#3A3A60", fontFamily: "'Inter', sans-serif" }}
            >
              <Loader2 size={11} className="animate-spin" />
              Saving…
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
