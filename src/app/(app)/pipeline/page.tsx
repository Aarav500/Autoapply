"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useRef, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import {
  KanbanSquare,
  Building2,
  MapPin,
  Calendar,
  TrendingUp,
  Briefcase,
  Star,
  XCircle,
  Download,
  AlertOctagon,
  RotateCcw,
  Tag,
  X,
  Clock,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bgBase: "#060608",
  bgSurface: "#0C0C14",
  bgElevated: "#111120",
  accent: "#8B5CF6",
  accentBright: "#7C3AED",
  accentMuted: "rgba(124,58,237,0.10)",
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
  indigo: "#818CF8",
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────
interface BottleneckAlert {
  type: string;
  severity: "low" | "medium" | "high";
  stage: string;
  count: number;
  message: string;
  action: string;
}

interface StageMetrics {
  stage: string;
  count: number;
  avgDaysInStage: number;
  oldestDaysInStage: number;
}

interface PipelineCard {
  id: string;
  title: string;
  company: string;
  location: string | undefined;
  remote: boolean;
  matchScore: number;
  status: string;
  platform: string;
  url: string | undefined;
  savedAt: string;
  updatedAt: string;
  appliedAt: string | undefined;
  notes?: string;
}

type ColumnKey = "saved" | "applied" | "screening" | "interview" | "offer" | "rejected";

interface PipelineData {
  columns: Record<ColumnKey, PipelineCard[]>;
}

interface PipelineResponse {
  success: boolean;
  data: PipelineData;
}

// ─── Column config ────────────────────────────────────────────────────────────
interface ColumnConfig {
  key: ColumnKey;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  dotColor: string;
}

const COLUMNS: ColumnConfig[] = [
  {
    key: "saved",
    label: "Saved",
    color: C.indigo,
    bgColor: "rgba(129,140,248,0.08)",
    borderColor: "rgba(129,140,248,0.20)",
    dotColor: C.indigo,
  },
  {
    key: "applied",
    label: "Applied",
    color: C.blue,
    bgColor: "rgba(96,165,250,0.08)",
    borderColor: "rgba(96,165,250,0.20)",
    dotColor: C.blue,
  },
  {
    key: "screening",
    label: "Screening",
    color: C.amber,
    bgColor: "rgba(251,191,36,0.08)",
    borderColor: "rgba(251,191,36,0.20)",
    dotColor: C.amber,
  },
  {
    key: "interview",
    label: "Interview",
    color: C.accent,
    bgColor: C.accentMuted,
    borderColor: C.accentBorder,
    dotColor: C.accent,
  },
  {
    key: "offer",
    label: "Offer",
    color: C.green,
    bgColor: "rgba(52,211,153,0.08)",
    borderColor: "rgba(52,211,153,0.20)",
    dotColor: C.green,
  },
  {
    key: "rejected",
    label: "Rejected",
    color: "#6B7280",
    bgColor: "rgba(107,114,128,0.06)",
    borderColor: "rgba(107,114,128,0.15)",
    dotColor: "#6B7280",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getMatchColor(score: number): string {
  if (score >= 90) return C.green;
  if (score >= 75) return C.accent;
  if (score >= 55) return C.amber;
  return C.red;
}

function computeWinProb(status: string, matchScore: number): number {
  const base: Record<string, number> = {
    saved: 5, applying: 8, applied: 10, screening: 25,
    interview: 45, offer: 75, discovered: 3, rejected: 0,
  };
  let prob = base[status] ?? 10;
  if (matchScore >= 80) prob += 10;
  else if (matchScore < 50) prob -= 5;
  return Math.min(98, Math.max(0, prob));
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Skeleton card ────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div
      style={{
        background: C.bgElevated,
        border: `1px solid ${C.borderSubtle}`,
        borderRadius: 10,
        padding: "14px 16px",
        marginBottom: 10,
      }}
    >
      <div
        style={{
          height: 12,
          width: "70%",
          borderRadius: 6,
          background: C.bgSurface,
          marginBottom: 8,
        }}
      />
      <div
        style={{
          height: 10,
          width: "45%",
          borderRadius: 6,
          background: C.bgSurface,
          marginBottom: 10,
        }}
      />
      <div
        style={{
          height: 8,
          width: "30%",
          borderRadius: 6,
          background: C.bgSurface,
        }}
      />
    </div>
  );
}

// ─── Application card ─────────────────────────────────────────────────────────
interface CardProps {
  card: PipelineCard;
  onDragStart: (card: PipelineCard) => void;
  isDragging: boolean;
  onUpdateNotes: (id: string, notes: string) => void;
  onTagRejection?: (id: string) => void;
}

function getDaysInStage(updatedAt: string): number {
  return Math.floor((Date.now() - new Date(updatedAt).getTime()) / 86_400_000);
}

function JobCard({ card, onDragStart, isDragging, onUpdateNotes, onTagRejection }: CardProps) {
  const [showNotes, setShowNotes] = useState(false);
  const [noteDraft, setNoteDraft] = useState(card.notes || "");
  const daysInStage = getDaysInStage(card.updatedAt);
  const stageWarning = daysInStage >= 14 ? "high" : daysInStage >= 7 ? "medium" : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: isDragging ? 0.45 : 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.18 }}
      draggable
      onDragStart={() => onDragStart(card)}
      style={{
        background: C.bgElevated,
        border: `1px solid ${C.borderMedium}`,
        borderRadius: 10,
        padding: "14px 16px",
        marginBottom: 10,
        cursor: "grab",
        userSelect: "none",
        transition: "border-color 0.15s, box-shadow 0.15s",
        fontFamily: "'Inter', sans-serif",
      }}
      whileHover={{
        borderColor: C.accentBorder,
        boxShadow: `0 4px 20px rgba(124,58,237,0.12)`,
      }}
    >
      {/* Title */}
      <p
        style={{
          margin: "0 0 3px",
          fontSize: 13,
          fontWeight: 600,
          color: C.textPrimary,
          lineHeight: 1.35,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
        title={card.title}
      >
        {card.title}
      </p>

      {/* Company */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          marginBottom: 8,
        }}
      >
        <Building2 size={11} color={C.textSecondary} />
        <span
          style={{
            fontSize: 12,
            color: C.textSecondary,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {card.company}
        </span>
      </div>

      {/* Footer row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Location / Remote */}
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <MapPin size={10} color={C.textMuted} />
            <span style={{ fontSize: 11, color: C.textMuted }}>
              {card.remote ? "Remote" : (card.location ?? "—")}
            </span>
          </div>

          {/* Date */}
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Calendar size={10} color={C.textMuted} />
            <span style={{ fontSize: 11, color: C.textMuted }}>
              {formatDate(card.appliedAt ?? card.savedAt)}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {/* Win probability */}
          {card.status !== "rejected" && (
            <span
              title="Win probability"
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: "#6A8A98",
                fontFamily: "monospace, monospace",
              }}
            >
              {computeWinProb(card.status, card.matchScore)}%W
            </span>
          )}
          {/* Match score */}
          {card.matchScore > 0 && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: getMatchColor(card.matchScore),
                background: `${getMatchColor(card.matchScore)}18`,
                borderRadius: 5,
                padding: "2px 6px",
              }}
            >
              {card.matchScore}%
            </span>
          )}
        </div>
      </div>

      {/* Stage duration badge */}
      {stageWarning && card.status !== "rejected" && card.status !== "offer" && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            marginTop: 6,
            padding: "3px 7px",
            borderRadius: 6,
            background: stageWarning === "high" ? "rgba(248,113,113,0.10)" : "rgba(251,191,36,0.10)",
            border: `1px solid ${stageWarning === "high" ? "rgba(248,113,113,0.25)" : "rgba(251,191,36,0.25)"}`,
            width: "fit-content",
          }}
        >
          <Clock size={9} color={stageWarning === "high" ? C.red : C.amber} />
          <span style={{ fontSize: 10, color: stageWarning === "high" ? C.red : C.amber }}>
            {daysInStage}d in {card.status}{stageWarning === "high" ? " ⚠" : ""}
          </span>
        </div>
      )}

      {/* Notes toggle + rejection tag row */}
      <div style={{ marginTop: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button
          onClick={(e) => { e.stopPropagation(); setShowNotes(!showNotes); }}
          style={{
            fontSize: 10,
            color: card.notes ? C.amber : C.textMuted,
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
            fontFamily: "'Inter', sans-serif",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          {card.notes ? "📝 " : "+ "}
          {card.notes ? "View note" : "Add note"}
        </button>
        {card.status === "rejected" && onTagRejection && (
          <button
            onClick={(e) => { e.stopPropagation(); onTagRejection(card.id); }}
            style={{
              fontSize: 10,
              color: C.textMuted,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              fontFamily: "'Inter', sans-serif",
              display: "flex",
              alignItems: "center",
              gap: 3,
            }}
          >
            <Tag size={9} />
            Tag reason
          </button>
        )}
      </div>
      {showNotes && (
        <div style={{ marginTop: 6 }} onClick={(e) => e.stopPropagation()}>
          <textarea
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            placeholder="Add a note…"
            rows={2}
            style={{
              width: "100%",
              background: "rgba(255,255,255,0.03)",
              border: `1px solid rgba(255,255,255,0.08)`,
              borderRadius: 7,
              color: C.textPrimary,
              fontSize: 11,
              fontFamily: "'Inter', sans-serif",
              padding: "6px 8px",
              resize: "vertical",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
          <button
            onClick={() => {
              onUpdateNotes(card.id, noteDraft);
              setShowNotes(false);
            }}
            style={{
              marginTop: 4,
              fontSize: 11,
              padding: "4px 10px",
              borderRadius: 6,
              background: C.accentMuted,
              border: `1px solid ${C.accentBorder}`,
              color: C.accent,
              cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            Save
          </button>
        </div>
      )}
    </motion.div>
  );
}

// ─── Column ───────────────────────────────────────────────────────────────────
interface ColumnProps {
  config: ColumnConfig;
  cards: PipelineCard[];
  isLoading: boolean;
  draggingCard: PipelineCard | null;
  onDragStart: (card: PipelineCard) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (targetStatus: ColumnKey) => void;
  isDragTarget: boolean;
  onUpdateNotes: (id: string, notes: string) => void;
  onTagRejection: (id: string) => void;
}

function KanbanColumn({
  config,
  cards,
  isLoading,
  draggingCard,
  onDragStart,
  onDragOver,
  onDrop,
  isDragTarget,
  onUpdateNotes,
  onTagRejection,
}: ColumnProps) {
  return (
    <div
      style={{
        minWidth: 260,
        width: 260,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Column header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
          padding: "0 2px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: config.dotColor,
              display: "inline-block",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: C.textPrimary,
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {config.label}
          </span>
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: config.color,
            background: config.bgColor,
            border: `1px solid ${config.borderColor}`,
            borderRadius: 20,
            padding: "1px 8px",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {isLoading ? "—" : cards.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={onDragOver}
        onDrop={() => onDrop(config.key)}
        style={{
          flex: 1,
          minHeight: 120,
          borderRadius: 12,
          border: `2px dashed ${isDragTarget ? config.color : "transparent"}`,
          background: isDragTarget ? config.bgColor : "transparent",
          padding: isDragTarget ? "2px" : "0",
          transition: "border-color 0.15s, background 0.15s, padding 0.1s",
        }}
      >
        {/* Loading skeletons */}
        {isLoading && (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        )}

        {/* Cards */}
        {!isLoading && (
          <AnimatePresence>
            {cards.map((card) => (
              <JobCard
                key={card.id}
                card={card}
                onDragStart={onDragStart}
                isDragging={draggingCard?.id === card.id}
                onUpdateNotes={onUpdateNotes}
                onTagRejection={onTagRejection}
              />
            ))}
          </AnimatePresence>
        )}

        {/* Empty state */}
        {!isLoading && cards.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "28px 16px",
              gap: 8,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: config.bgColor,
                border: `1px solid ${config.borderColor}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Briefcase size={15} color={config.color} />
            </div>
            <p
              style={{
                fontSize: 12,
                color: C.textMuted,
                margin: 0,
                textAlign: "center",
                fontFamily: "'Inter', sans-serif",
              }}
            >
              No applications yet
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ─── Stats strip ──────────────────────────────────────────────────────────────
interface StatsStripProps {
  columns: Record<ColumnKey, PipelineCard[]> | undefined;
  isLoading: boolean;
}

function StatsStrip({ columns, isLoading }: StatsStripProps) {
  if (isLoading || !columns) {
    return (
      <div style={{ display: "flex", gap: 12, marginBottom: 28 }}>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 72,
              background: C.bgSurface,
              borderRadius: 12,
              border: `1px solid ${C.borderSubtle}`,
            }}
          />
        ))}
      </div>
    );
  }

  const total = Object.values(columns).reduce((sum, arr) => sum + arr.length, 0);
  const active = total - columns.rejected.length;
  const offers = columns.offer.length;
  const applied =
    columns.applied.length +
    columns.screening.length +
    columns.interview.length +
    columns.offer.length +
    columns.rejected.length;
  const conversionRate =
    applied > 0 ? Math.round((columns.offer.length / applied) * 100) : 0;

  const stats = [
    {
      label: "Total Applications",
      value: total,
      icon: <Briefcase size={16} color={C.accent} />,
      color: C.accent,
    },
    {
      label: "Active",
      value: active,
      icon: <TrendingUp size={16} color={C.blue} />,
      color: C.blue,
    },
    {
      label: "Offers",
      value: offers,
      icon: <Star size={16} color={C.green} />,
      color: C.green,
    },
    {
      label: "Conversion Rate",
      value: `${conversionRate}%`,
      icon: <XCircle size={16} color={C.amber} />,
      color: C.amber,
    },
  ];

  return (
    <div style={{ display: "flex", gap: 12, marginBottom: 28 }}>
      {stats.map((stat) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            flex: 1,
            background: C.bgSurface,
            border: `1px solid ${C.borderSubtle}`,
            borderRadius: 12,
            padding: "14px 18px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontFamily: "'Inter', sans-serif",
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 9,
              background: `${stat.color}14`,
              border: `1px solid ${stat.color}30`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {stat.icon}
          </div>
          <div>
            <p
              style={{
                margin: 0,
                fontSize: 20,
                fontWeight: 700,
                color: C.textPrimary,
                lineHeight: 1.2,
              }}
            >
              {stat.value}
            </p>
            <p
              style={{
                margin: 0,
                fontSize: 11,
                color: C.textSecondary,
                marginTop: 1,
              }}
            >
              {stat.label}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
function exportPipelineCSV(columns: Record<ColumnKey, PipelineCard[]> | undefined) {
  if (!columns) return;
  const rows: string[] = [
    ["Title", "Company", "Location", "Status", "Match Score", "Platform", "Applied At", "URL"].join(","),
  ];
  for (const [, cards] of Object.entries(columns)) {
    for (const card of cards) {
      rows.push([
        `"${card.title.replace(/"/g, '""')}"`,
        `"${card.company.replace(/"/g, '""')}"`,
        `"${(card.location || "").replace(/"/g, '""')}"`,
        card.status,
        card.matchScore,
        card.platform,
        card.appliedAt ? new Date(card.appliedAt).toLocaleDateString() : "",
        card.url || "",
      ].join(","));
    }
  }
  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pipeline-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function PipelinePage() {
  const queryClient = useQueryClient();
  const draggingCardRef = useRef<PipelineCard | null>(null);
  const [draggingCard, setDraggingCard] = useState<PipelineCard | null>(null);
  const [dragTargetColumn, setDragTargetColumn] = useState<ColumnKey | null>(null);
  // Local optimistic columns override while mutation is in-flight
  const [localColumns, setLocalColumns] = useState<Record<ColumnKey, PipelineCard[]> | null>(null);
  // Undo toast
  const [undoEntry, setUndoEntry] = useState<{ id: string; from: ColumnKey; to: ColumnKey } | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Rejection tagging modal
  const [rejectionModal, setRejectionModal] = useState<{ id: string; title: string } | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const REJECTION_REASONS = ["Overqualified", "Underqualified", "Salary mismatch", "No response", "Rejected after screen", "Rejected after interview", "Position filled", "Other"];

  const { data, isLoading, error } = useQuery<PipelineData>({
    queryKey: ["pipeline"],
    queryFn: async () => {
      const res = await apiFetch<PipelineResponse>("/api/pipeline");
      if (!res.success) throw new Error("Failed to load pipeline");
      return res.data;
    },
    staleTime: 30_000,
  });

  const { data: analyticsData } = useQuery<{ alerts: BottleneckAlert[]; stageMetrics: StageMetrics[] }>({
    queryKey: ["pipelineAnalytics"],
    queryFn: async () => {
      const res = await apiFetch<{ success: boolean; data: { alerts: BottleneckAlert[]; stageMetrics: StageMetrics[] } }>("/api/pipeline/analytics");
      return res.data;
    },
    staleTime: 60_000,
  });

  const mutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ColumnKey }) => {
      const res = await apiFetch<{ success: boolean; data: { updated: boolean } }>(
        "/api/pipeline",
        {
          method: "PATCH",
          body: JSON.stringify({ id, status }),
        }
      );
      if (!res.success) throw new Error("Failed to update status");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline"] });
      queryClient.invalidateQueries({ queryKey: ["pipelineAnalytics"] });
      setLocalColumns(null);
    },
    onError: () => {
      setLocalColumns(null);
    },
  });

  const columns = localColumns ?? data?.columns;

  const handleDragStart = useCallback((card: PipelineCard) => {
    draggingCardRef.current = card;
    setDraggingCard(card);
  }, []);

  const handleDrop = useCallback(
    (targetStatus: ColumnKey) => {
      const card = draggingCardRef.current;
      if (!card || card.status === targetStatus) {
        setDragTargetColumn(null);
        setDraggingCard(null);
        draggingCardRef.current = null;
        return;
      }

      const fromStatus = card.status as ColumnKey;

      // Build optimistic local update
      if (columns) {
        const updated: Record<ColumnKey, PipelineCard[]> = {
          saved: [...columns.saved],
          applied: [...columns.applied],
          screening: [...columns.screening],
          interview: [...columns.interview],
          offer: [...columns.offer],
          rejected: [...columns.rejected],
        };
        if (fromStatus in updated) {
          updated[fromStatus] = updated[fromStatus].filter((c) => c.id !== card.id);
        }
        const movedCard: PipelineCard = { ...card, status: targetStatus, updatedAt: new Date().toISOString() };
        updated[targetStatus] = [movedCard, ...updated[targetStatus]];
        setLocalColumns(updated);
      }

      setDragTargetColumn(null);
      setDraggingCard(null);
      draggingCardRef.current = null;

      // Show undo toast for 5s
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      setUndoEntry({ id: card.id, from: fromStatus, to: targetStatus });
      undoTimerRef.current = setTimeout(() => {
        setUndoEntry(null);
        mutation.mutate({ id: card.id, status: targetStatus });
      }, 5000);
    },
    [columns, mutation]
  );

  const handleUndo = useCallback(() => {
    if (!undoEntry) return;
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setUndoEntry(null);
    // Revert local columns
    if (columns) {
      const reverted: Record<ColumnKey, PipelineCard[]> = {
        saved: [...columns.saved],
        applied: [...columns.applied],
        screening: [...columns.screening],
        interview: [...columns.interview],
        offer: [...columns.offer],
        rejected: [...columns.rejected],
      };
      const movedCard = reverted[undoEntry.to].find((c) => c.id === undoEntry.id);
      if (movedCard) {
        reverted[undoEntry.to] = reverted[undoEntry.to].filter((c) => c.id !== undoEntry.id);
        reverted[undoEntry.from] = [{ ...movedCard, status: undoEntry.from }, ...reverted[undoEntry.from]];
        setLocalColumns(reverted);
      }
    }
    // No mutation — undo means the move never persisted
    queryClient.invalidateQueries({ queryKey: ["pipeline"] });
  }, [undoEntry, columns, queryClient]);

  const handleColumnDragOver = useCallback(
    (e: React.DragEvent, colKey: ColumnKey) => {
      e.preventDefault();
      setDragTargetColumn(colKey);
    },
    []
  );

  const handleUpdateNotes = useCallback(
    async (id: string, notes: string) => {
      try {
        await apiFetch("/api/pipeline", {
          method: "PATCH",
          body: JSON.stringify({ id, notes }),
        });
        queryClient.invalidateQueries({ queryKey: ["pipeline"] });
      } catch {
        // silently fail — note save is best-effort
      }
    },
    [queryClient]
  );

  const handleTagRejection = useCallback((id: string) => {
    const card = Object.values(columns ?? {}).flat().find((c) => c.id === id);
    if (card) {
      setRejectionReason("");
      setRejectionModal({ id, title: card.title });
    }
  }, [columns]);

  const handleSaveRejectionTag = useCallback(async () => {
    if (!rejectionModal) return;
    try {
      await apiFetch("/api/pipeline", {
        method: "PATCH",
        body: JSON.stringify({ id: rejectionModal.id, notes: `Rejection reason: ${rejectionReason}` }),
      });
      queryClient.invalidateQueries({ queryKey: ["pipeline"] });
    } catch {
      // best-effort
    }
    setRejectionModal(null);
  }, [rejectionModal, rejectionReason, queryClient]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bgBase,
        padding: "32px 32px 48px",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        {/* Page header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: 28,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: C.accentMuted,
                border: `1px solid ${C.accentBorder}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <KanbanSquare size={22} color={C.accent} />
            </div>
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: 22,
                  fontWeight: 700,
                  color: C.textPrimary,
                  lineHeight: 1.2,
                }}
              >
                Job Pipeline
              </h1>
              <p
                style={{
                  margin: "3px 0 0",
                  fontSize: 13,
                  color: C.textSecondary,
                }}
              >
                Track every application at a glance
              </p>
            </div>
          </div>
          {/* Export button */}
          {columns && (
            <button
              onClick={() => exportPipelineCSV(columns)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 10,
                background: "rgba(255,255,255,0.04)",
                border: `1px solid ${C.borderSubtle}`,
                color: C.textSecondary,
                fontFamily: "'Inter', sans-serif",
                fontSize: 12,
                cursor: "pointer",
                transition: "all 0.15s",
                flexShrink: 0,
              }}
              title="Export pipeline as CSV"
            >
              <Download size={13} />
              Export CSV
            </button>
          )}
        </div>

        {/* Stats strip */}
        <StatsStrip columns={columns} isLoading={isLoading} />

        {/* Bottleneck Alerts */}
        {analyticsData?.alerts && analyticsData.alerts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ marginBottom: 20, display: "flex", flexDirection: "column", gap: 8 }}
          >
            {analyticsData.alerts.map((alert, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 16px",
                  borderRadius: 10,
                  background: alert.severity === "high"
                    ? "rgba(248,113,113,0.07)"
                    : alert.severity === "medium"
                    ? "rgba(251,191,36,0.07)"
                    : "rgba(96,165,250,0.07)",
                  border: `1px solid ${
                    alert.severity === "high"
                      ? "rgba(248,113,113,0.22)"
                      : alert.severity === "medium"
                      ? "rgba(251,191,36,0.22)"
                      : "rgba(96,165,250,0.22)"
                  }`,
                }}
              >
                <AlertOctagon
                  size={14}
                  color={
                    alert.severity === "high" ? C.red : alert.severity === "medium" ? C.amber : C.blue
                  }
                />
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 12, color: C.textPrimary, fontFamily: "'Inter', sans-serif" }}>
                    {alert.message}
                  </span>
                  <span style={{ fontSize: 11, color: C.textSecondary, marginLeft: 8, fontFamily: "'Inter', sans-serif" }}>
                    {alert.action}
                  </span>
                </div>
                <ChevronRight size={12} color={C.textMuted} />
              </div>
            ))}
          </motion.div>
        )}

        {/* Undo toast */}
        <AnimatePresence>
          {undoEntry && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              style={{
                position: "fixed",
                bottom: 32,
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 9999,
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "12px 20px",
                borderRadius: 12,
                background: C.bgElevated,
                border: `1px solid ${C.borderMedium}`,
                boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                fontFamily: "'Inter', sans-serif",
                fontSize: 13,
                color: C.textPrimary,
                minWidth: 280,
              }}
            >
              <AlertTriangle size={14} color={C.amber} />
              Moved to <strong>{undoEntry.to}</strong>
              <button
                onClick={handleUndo}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  marginLeft: "auto",
                  padding: "4px 12px",
                  borderRadius: 7,
                  background: C.accentMuted,
                  border: `1px solid ${C.accentBorder}`,
                  color: C.accent,
                  fontSize: 12,
                  cursor: "pointer",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                <RotateCcw size={11} />
                Undo
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Rejection tagging modal */}
        <AnimatePresence>
          {rejectionModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: "fixed", inset: 0, zIndex: 9998,
                background: "rgba(0,0,0,0.6)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
              onClick={() => setRejectionModal(null)}
            >
              <motion.div
                initial={{ scale: 0.92, y: 16 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.92, y: 16 }}
                onClick={(e) => e.stopPropagation()}
                style={{
                  background: C.bgElevated,
                  border: `1px solid ${C.borderMedium}`,
                  borderRadius: 16,
                  padding: "24px 28px",
                  width: 400,
                  maxWidth: "90vw",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: C.textPrimary }}>
                    Tag Rejection Reason
                  </h3>
                  <button onClick={() => setRejectionModal(null)} style={{ background: "none", border: "none", cursor: "pointer", color: C.textMuted, padding: 0 }}>
                    <X size={16} />
                  </button>
                </div>
                <p style={{ margin: "0 0 16px", fontSize: 12, color: C.textSecondary }}>{rejectionModal.title}</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
                  {REJECTION_REASONS.map((r) => (
                    <button
                      key={r}
                      onClick={() => setRejectionReason(r)}
                      style={{
                        padding: "5px 12px",
                        borderRadius: 20,
                        fontSize: 11,
                        cursor: "pointer",
                        fontFamily: "'Inter', sans-serif",
                        background: rejectionReason === r ? C.accentMuted : "rgba(255,255,255,0.04)",
                        border: `1px solid ${rejectionReason === r ? C.accentBorder : C.borderSubtle}`,
                        color: rejectionReason === r ? C.accent : C.textSecondary,
                        transition: "all 0.15s",
                      }}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                  <button
                    onClick={() => setRejectionModal(null)}
                    style={{ padding: "8px 16px", borderRadius: 8, background: "none", border: `1px solid ${C.borderSubtle}`, color: C.textSecondary, fontSize: 12, cursor: "pointer", fontFamily: "'Inter', sans-serif" }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveRejectionTag}
                    disabled={!rejectionReason}
                    style={{
                      padding: "8px 16px", borderRadius: 8,
                      background: rejectionReason ? C.accentMuted : "rgba(255,255,255,0.03)",
                      border: `1px solid ${rejectionReason ? C.accentBorder : C.borderSubtle}`,
                      color: rejectionReason ? C.accent : C.textMuted,
                      fontSize: 12, cursor: rejectionReason ? "pointer" : "default", fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    Save Tag
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error state */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                background: "rgba(248,113,113,0.08)",
                border: "1px solid rgba(248,113,113,0.25)",
                borderRadius: 10,
                padding: "12px 18px",
                marginBottom: 20,
                fontSize: 13,
                color: C.red,
                fontFamily: "'Inter', sans-serif",
              }}
            >
              Failed to load pipeline data. Please refresh and try again.
            </motion.div>
          )}
        </AnimatePresence>

        {/* Kanban board */}
        <div
          style={{
            display: "flex",
            gap: 16,
            overflowX: "auto",
            paddingBottom: 16,
            // Custom scrollbar styling
            scrollbarWidth: "thin",
            scrollbarColor: `${C.textMuted} transparent`,
          }}
          onDragEnd={() => {
            setDraggingCard(null);
            setDragTargetColumn(null);
            draggingCardRef.current = null;
          }}
        >
          {COLUMNS.map((colConfig) => (
            <KanbanColumn
              key={colConfig.key}
              config={colConfig}
              cards={columns?.[colConfig.key] ?? []}
              isLoading={isLoading}
              draggingCard={draggingCard}
              onDragStart={handleDragStart}
              onDragOver={(e) => handleColumnDragOver(e, colConfig.key)}
              onDrop={handleDrop}
              isDragTarget={dragTargetColumn === colConfig.key}
              onUpdateNotes={handleUpdateNotes}
              onTagRejection={handleTagRejection}
            />
          ))}
        </div>

        {/* Drag hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: 0.8 }}
          style={{
            marginTop: 16,
            fontSize: 11,
            color: C.textMuted,
            textAlign: "center",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          Drag cards between columns to update application status
        </motion.p>
      </motion.div>
    </div>
  );
}
