"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useCallback, useEffect } from "react";
import {
  Code2,
  Github,
  Star,
  GitFork,
  ExternalLink,
  Sparkles,
  RefreshCw,
  Save,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Edit3,
  Check,
  X,
  AlertTriangle,
  Lightbulb,
  GripVertical,
  Tag,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  blue: "#60A5FA",
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

type RepoCategory =
  | "web-app"
  | "api"
  | "library"
  | "ml-ai"
  | "data"
  | "mobile"
  | "cli-tool"
  | "other";

interface PortfolioRepo {
  name: string;
  original_description: string;
  ai_description: string;
  impact_statement: string;
  tech_stack: string[];
  highlights: string[];
  demo_tip: string;
  relevance_score: number;
  category: RepoCategory;
}

interface PortfolioConfig {
  id: string;
  generatedAt: string;
  githubUsername: string;
  selected_repos: PortfolioRepo[];
  portfolio_bio: string;
  tagline: string;
  top_skills: string[];
}

interface GetResponse {
  portfolio: PortfolioConfig | null;
  githubUrl: string | null;
  githubUsername: string | null;
}

interface PostResponse {
  portfolio: PortfolioConfig;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<RepoCategory, string> = {
  "web-app": "Web App",
  api: "API",
  library: "Library",
  "ml-ai": "ML / AI",
  data: "Data",
  mobile: "Mobile",
  "cli-tool": "CLI Tool",
  other: "Other",
};

const CATEGORY_COLORS: Record<RepoCategory, { bg: string; color: string }> = {
  "web-app": { bg: "rgba(96,165,250,0.12)", color: C.blue },
  api: { bg: "rgba(52,211,153,0.12)", color: C.green },
  library: { bg: C.accentMuted, color: C.accent },
  "ml-ai": { bg: "rgba(251,191,36,0.12)", color: C.amber },
  data: { bg: "rgba(248,113,113,0.12)", color: C.red },
  mobile: { bg: "rgba(167,139,250,0.12)", color: "#A78BFA" },
  "cli-tool": { bg: "rgba(255,255,255,0.06)", color: C.textSecondary },
  other: { bg: "rgba(255,255,255,0.06)", color: C.textSecondary },
};

function scoreBarColor(score: number): string {
  if (score >= 8) return C.green;
  if (score >= 6) return C.accent;
  if (score >= 4) return C.amber;
  return C.red;
}

// ─── Inline editable field ────────────────────────────────────────────────────

interface InlineEditProps {
  value: string;
  onSave: (val: string) => void;
  multiline?: boolean;
  style?: React.CSSProperties;
}

function InlineEdit({ value, onSave, multiline = false, style }: InlineEditProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const commit = useCallback(() => {
    onSave(draft.trim() || value);
    setEditing(false);
  }, [draft, value, onSave]);

  const cancel = useCallback(() => {
    setDraft(value);
    setEditing(false);
  }, [value]);

  if (!editing) {
    return (
      <span
        style={{ cursor: "pointer", ...style }}
        onClick={() => {
          setDraft(value);
          setEditing(true);
        }}
        title="Click to edit"
      >
        {value}
        <Edit3
          size={11}
          style={{ display: "inline", marginLeft: 6, color: C.textMuted, verticalAlign: "middle" }}
        />
      </span>
    );
  }

  return (
    <span style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
      {multiline ? (
        <textarea
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          style={{
            flex: 1,
            background: C.bgElevated,
            border: `1px solid ${C.accentBorder}`,
            borderRadius: 6,
            color: C.textPrimary,
            fontSize: "inherit",
            lineHeight: "inherit",
            padding: "4px 8px",
            resize: "vertical",
            fontFamily: "'Inter', sans-serif",
            ...style,
          }}
        />
      ) : (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") cancel();
          }}
          style={{
            flex: 1,
            background: C.bgElevated,
            border: `1px solid ${C.accentBorder}`,
            borderRadius: 6,
            color: C.textPrimary,
            fontSize: "inherit",
            padding: "2px 8px",
            fontFamily: "'Inter', sans-serif",
            ...style,
          }}
        />
      )}
      <button onClick={commit} style={{ color: C.green, cursor: "pointer", marginTop: 2 }}>
        <Check size={14} />
      </button>
      <button onClick={cancel} style={{ color: C.red, cursor: "pointer", marginTop: 2 }}>
        <X size={14} />
      </button>
    </span>
  );
}

// ─── Project card ─────────────────────────────────────────────────────────────

interface ProjectCardProps {
  repo: PortfolioRepo;
  index: number;
  githubUsername: string;
  onUpdate: (index: number, updated: PortfolioRepo) => void;
  onDragStart: (index: number) => void;
  onDragOver: (index: number) => void;
  onDrop: () => void;
  isDragOver: boolean;
}

function ProjectCard({
  repo,
  index,
  githubUsername,
  onUpdate,
  onDragStart,
  onDragOver,
  onDrop,
  isDragOver,
}: ProjectCardProps) {
  const [tipExpanded, setTipExpanded] = useState(false);
  const catStyle = CATEGORY_COLORS[repo.category];

  const update = (patch: Partial<PortfolioRepo>) =>
    onUpdate(index, { ...repo, ...patch });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, delay: index * 0.05 }}
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver(index);
      }}
      onDrop={onDrop}
      style={{
        background: isDragOver
          ? `rgba(124,58,237,0.08)`
          : C.bgSurface,
        border: `1px solid ${isDragOver ? C.accentBorder : C.borderSubtle}`,
        borderRadius: 14,
        padding: "20px 22px",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        cursor: "grab",
        transition: "border-color 150ms, background 150ms",
        position: "relative",
      }}
    >
      {/* Drag handle */}
      <GripVertical
        size={14}
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          color: C.textMuted,
          cursor: "grab",
        }}
      />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <a
              href={`https://github.com/${githubUsername}/${repo.name}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: C.textPrimary,
                fontWeight: 600,
                fontSize: 15,
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {repo.name}
              <ExternalLink size={12} style={{ color: C.textMuted }} />
            </a>

            {/* Category badge */}
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                padding: "2px 8px",
                borderRadius: 20,
                background: catStyle.bg,
                color: catStyle.color,
              }}
            >
              {CATEGORY_LABELS[repo.category]}
            </span>
          </div>
        </div>

        {/* Relevance score bar */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 4,
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 11, color: C.textMuted }}>
            Score{" "}
            <span style={{ color: scoreBarColor(repo.relevance_score), fontWeight: 600 }}>
              {repo.relevance_score}/10
            </span>
          </span>
          <div
            style={{
              width: 72,
              height: 4,
              borderRadius: 99,
              background: "rgba(255,255,255,0.08)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${(repo.relevance_score / 10) * 100}%`,
                borderRadius: 99,
                background: scoreBarColor(repo.relevance_score),
                transition: "width 0.5s ease",
              }}
            />
          </div>
        </div>
      </div>

      {/* Tech stack chips */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {repo.tech_stack.map((tech) => (
          <span
            key={tech}
            style={{
              fontSize: 11,
              padding: "2px 8px",
              borderRadius: 20,
              background: "rgba(255,255,255,0.05)",
              color: C.textSecondary,
              border: `1px solid ${C.borderSubtle}`,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Tag size={9} style={{ color: C.textMuted }} />
            {tech}
          </span>
        ))}
      </div>

      {/* AI Description (editable) */}
      <div>
        <p
          style={{
            fontSize: 12,
            color: C.textMuted,
            marginBottom: 4,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            fontWeight: 500,
          }}
        >
          Description
        </p>
        <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.6 }}>
          <InlineEdit
            value={repo.ai_description}
            onSave={(v) => update({ ai_description: v })}
            multiline
          />
        </p>
      </div>

      {/* Impact statement */}
      <div
        style={{
          background: C.accentMuted,
          border: `1px solid ${C.accentBorder}`,
          borderRadius: 8,
          padding: "10px 14px",
        }}
      >
        <p
          style={{
            fontSize: 12,
            color: C.textMuted,
            marginBottom: 4,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            fontWeight: 500,
          }}
        >
          Impact
        </p>
        <p style={{ fontSize: 13, color: C.textPrimary, fontWeight: 500, lineHeight: 1.5 }}>
          <InlineEdit
            value={repo.impact_statement}
            onSave={(v) => update({ impact_statement: v })}
            multiline
          />
        </p>
      </div>

      {/* Highlights */}
      {repo.highlights.length > 0 && (
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 5 }}>
          {repo.highlights.map((h, hi) => (
            <li key={hi} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: C.accent,
                  flexShrink: 0,
                  marginTop: 6,
                }}
              />
              <span style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.5 }}>{h}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Interview tip (expandable) */}
      <div>
        <button
          onClick={() => setTipExpanded((p) => !p)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "none",
            border: "none",
            cursor: "pointer",
            color: C.amber,
            fontSize: 12,
            fontWeight: 500,
            padding: 0,
          }}
        >
          <Lightbulb size={13} />
          Interview Tip
          {tipExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
        <AnimatePresence>
          {tipExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: "hidden" }}
            >
              <div
                style={{
                  marginTop: 8,
                  background: "rgba(251,191,36,0.08)",
                  border: "1px solid rgba(251,191,36,0.2)",
                  borderRadius: 8,
                  padding: "10px 14px",
                  fontSize: 13,
                  color: "#FDE68A",
                  lineHeight: 1.55,
                }}
              >
                {repo.demo_tip}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Portfolio Preview ────────────────────────────────────────────────────────

interface PreviewPanelProps {
  portfolio: PortfolioConfig;
}

function PreviewPanel({ portfolio }: PreviewPanelProps) {
  return (
    <div
      style={{
        background: C.bgSurface,
        border: `1px solid ${C.borderSubtle}`,
        borderRadius: 16,
        padding: "32px 36px",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 28, paddingBottom: 24, borderBottom: `1px solid ${C.borderSubtle}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <Github size={20} style={{ color: C.accent }} />
          <span style={{ color: C.textMuted, fontSize: 13 }}>github.com/{portfolio.githubUsername}</span>
        </div>
        <p
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: C.textPrimary,
            marginBottom: 6,
            lineHeight: 1.3,
          }}
        >
          {portfolio.tagline}
        </p>
        <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.7, maxWidth: 580 }}>
          {portfolio.portfolio_bio}
        </p>

        {/* Top skills */}
        {portfolio.top_skills.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 16 }}>
            {portfolio.top_skills.map((skill) => (
              <span
                key={skill}
                style={{
                  fontSize: 12,
                  padding: "3px 10px",
                  borderRadius: 20,
                  background: C.accentMuted,
                  color: C.accent,
                  border: `1px solid ${C.accentBorder}`,
                  fontWeight: 500,
                }}
              >
                {skill}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Projects */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {portfolio.selected_repos.map((repo) => {
          const catStyle = CATEGORY_COLORS[repo.category];
          return (
            <div
              key={repo.name}
              style={{
                background: C.bgElevated,
                border: `1px solid ${C.borderSubtle}`,
                borderRadius: 10,
                padding: "16px 20px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ fontWeight: 600, fontSize: 14, color: C.textPrimary }}>
                  {repo.name}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    padding: "1px 7px",
                    borderRadius: 20,
                    background: catStyle.bg,
                    color: catStyle.color,
                  }}
                >
                  {CATEGORY_LABELS[repo.category]}
                </span>
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: 11,
                    color: scoreBarColor(repo.relevance_score),
                    fontWeight: 600,
                  }}
                >
                  {repo.relevance_score}/10
                </span>
              </div>
              <p style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.6, marginBottom: 10 }}>
                {repo.ai_description}
              </p>
              <p
                style={{
                  fontSize: 12,
                  color: C.accent,
                  fontWeight: 500,
                  fontStyle: "italic",
                  marginBottom: 10,
                }}
              >
                {repo.impact_statement}
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {repo.tech_stack.map((t) => (
                  <span
                    key={t}
                    style={{
                      fontSize: 10,
                      padding: "1px 7px",
                      borderRadius: 20,
                      background: "rgba(255,255,255,0.05)",
                      color: C.textMuted,
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PortfolioPage() {
  const qc = useQueryClient();
  const [showPreview, setShowPreview] = useState(false);
  const [localPortfolio, setLocalPortfolio] = useState<PortfolioConfig | null>(null);
  const [savedBanner, setSavedBanner] = useState(false);
  const dragFromRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // ── Fetch existing portfolio ──────────────────────────────────────────────
  const { data, isLoading: loadingInitial } = useQuery({
    queryKey: ["portfolio"],
    queryFn: async () => {
      const res = await apiFetch<GetResponse>("/api/portfolio");
      return res;
    },
  });

  useEffect(() => {
    if (data?.portfolio && !localPortfolio) {
      setLocalPortfolio(data.portfolio);
    }
  }, [data?.portfolio, localPortfolio]);

  const portfolio = localPortfolio ?? data?.portfolio ?? null;
  const githubUsername = data?.githubUsername ?? null;
  const githubUrl = data?.githubUrl ?? null;

  // ── Generate mutation ─────────────────────────────────────────────────────
  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch<PostResponse>("/api/portfolio", {
        method: "POST",
        body: JSON.stringify({ action: "generate" }),
      });
      return res;
    },
    onSuccess: (res) => {
      setLocalPortfolio(res.portfolio);
      qc.invalidateQueries({ queryKey: ["portfolio"] });
    },
  });

  // ── Save mutation ─────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async (config: PortfolioConfig) => {
      const res = await apiFetch<PostResponse>("/api/portfolio", {
        method: "POST",
        body: JSON.stringify({ action: "save", portfolio: config }),
      });
      return res;
    },
    onSuccess: () => {
      setSavedBanner(true);
      qc.invalidateQueries({ queryKey: ["portfolio"] });
      setTimeout(() => setSavedBanner(false), 3000);
    },
  });

  // ── Drag-to-reorder ───────────────────────────────────────────────────────
  const handleDragStart = useCallback((index: number) => {
    dragFromRef.current = index;
  }, []);

  const handleDragOver = useCallback((index: number) => {
    setDragOverIndex(index);
  }, []);

  const handleDrop = useCallback(() => {
    if (dragFromRef.current === null || dragOverIndex === null) return;
    if (dragFromRef.current === dragOverIndex) {
      dragFromRef.current = null;
      setDragOverIndex(null);
      return;
    }
    setLocalPortfolio((prev) => {
      if (!prev) return prev;
      const repos = [...prev.selected_repos];
      const [moved] = repos.splice(dragFromRef.current!, 1);
      repos.splice(dragOverIndex, 0, moved);
      return { ...prev, selected_repos: repos };
    });
    dragFromRef.current = null;
    setDragOverIndex(null);
  }, [dragOverIndex]);

  // ── Update a single repo ──────────────────────────────────────────────────
  const handleUpdateRepo = useCallback((index: number, updated: PortfolioRepo) => {
    setLocalPortfolio((prev) => {
      if (!prev) return prev;
      const repos = [...prev.selected_repos];
      repos[index] = updated;
      return { ...prev, selected_repos: repos };
    });
  }, []);

  const handleUpdateField = useCallback(
    (field: "portfolio_bio" | "tagline") => (value: string) => {
      setLocalPortfolio((prev) => (prev ? { ...prev, [field]: value } : prev));
    },
    []
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  const isGenerating = generateMutation.isPending;
  const isSaving = saveMutation.isPending;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bgBase,
        fontFamily: "'Inter', sans-serif",
        color: C.textPrimary,
        padding: "32px 32px 64px",
      }}
    >
      {/* ── Page header ───────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: C.accentMuted,
              border: `1px solid ${C.accentBorder}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Code2 size={20} style={{ color: C.accent }} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: C.textPrimary, margin: 0 }}>
              Portfolio Builder
            </h1>
            <p style={{ fontSize: 13, color: C.textSecondary, margin: 0, marginTop: 2 }}>
              Turn your GitHub into a professional showcase
            </p>
          </div>
        </div>

        {portfolio && (
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => setShowPreview((p) => !p)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "8px 16px",
                borderRadius: 9,
                border: `1px solid ${C.borderMedium}`,
                background: "transparent",
                color: C.textSecondary,
                fontSize: 13,
                cursor: "pointer",
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
              {showPreview ? "Hide Preview" : "Show Preview"}
            </button>

            <button
              onClick={() => generateMutation.mutate()}
              disabled={isGenerating}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "8px 16px",
                borderRadius: 9,
                border: `1px solid ${C.accentBorder}`,
                background: C.accentMuted,
                color: C.accent,
                fontSize: 13,
                cursor: isGenerating ? "not-allowed" : "pointer",
                opacity: isGenerating ? 0.6 : 1,
                fontFamily: "'Inter', sans-serif",
              }}
            >
              <RefreshCw size={14} style={{ animation: isGenerating ? "spin 1s linear infinite" : "none" }} />
              Regenerate
            </button>

            <button
              onClick={() => portfolio && saveMutation.mutate(portfolio)}
              disabled={isSaving}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                padding: "8px 18px",
                borderRadius: 9,
                border: "none",
                background: isSaving ? "rgba(124,58,237,0.5)" : C.accentBright,
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                cursor: isSaving ? "not-allowed" : "pointer",
                fontFamily: "'Inter', sans-serif",
              }}
            >
              <Save size={14} />
              {isSaving ? "Saving…" : "Save Portfolio"}
            </button>
          </div>
        )}
      </motion.div>

      {/* ── Saved banner ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {savedBanner && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            style={{
              background: "rgba(52,211,153,0.12)",
              border: "1px solid rgba(52,211,153,0.3)",
              borderRadius: 10,
              padding: "12px 18px",
              marginBottom: 20,
              fontSize: 13,
              color: C.green,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Check size={15} />
            Portfolio saved successfully.
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Error banner ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {(generateMutation.error || saveMutation.error) && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            style={{
              background: "rgba(248,113,113,0.1)",
              border: "1px solid rgba(248,113,113,0.25)",
              borderRadius: 10,
              padding: "12px 18px",
              marginBottom: 20,
              fontSize: 13,
              color: C.red,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <AlertTriangle size={15} />
            {String(
              (generateMutation.error as Error)?.message ||
                (saveMutation.error as Error)?.message ||
                "An error occurred."
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Initial loading ───────────────────────────────────────────────── */}
      {loadingInitial && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: 200,
            color: C.textMuted,
            gap: 10,
          }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <RefreshCw size={16} />
          </motion.div>
          Loading…
        </div>
      )}

      {/* ── Empty state — no portfolio generated ─────────────────────────── */}
      {!loadingInitial && !portfolio && !isGenerating && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "64px 32px",
            gap: 20,
            textAlign: "center",
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
            <Code2 size={28} style={{ color: C.accent }} />
          </div>

          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: C.textPrimary, margin: "0 0 8px" }}>
              Build Your Portfolio
            </h2>
            <p style={{ fontSize: 14, color: C.textSecondary, margin: 0, maxWidth: 420, lineHeight: 1.6 }}>
              Connect your GitHub repos to generate professional descriptions, impact statements, and interview talking points — powered by AI.
            </p>
          </div>

          {/* GitHub status */}
          {githubUrl ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 16px",
                borderRadius: 8,
                background: "rgba(52,211,153,0.08)",
                border: "1px solid rgba(52,211,153,0.2)",
                fontSize: 13,
                color: C.green,
              }}
            >
              <Github size={14} />
              Detected:{" "}
              <a
                href={githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: C.green, textDecoration: "underline" }}
              >
                github.com/{githubUsername}
              </a>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 16px",
                borderRadius: 8,
                background: "rgba(251,191,36,0.08)",
                border: "1px solid rgba(251,191,36,0.2)",
                fontSize: 13,
                color: C.amber,
              }}
            >
              <AlertTriangle size={14} />
              No GitHub URL found — add it in{" "}
              <a href="/profile" style={{ color: C.amber, textDecoration: "underline" }}>
                Profile settings
              </a>
            </div>
          )}

          <button
            onClick={() => generateMutation.mutate()}
            disabled={!githubUrl}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 28px",
              borderRadius: 10,
              border: "none",
              background: githubUrl ? C.accentBright : "rgba(255,255,255,0.05)",
              color: githubUrl ? "#fff" : C.textMuted,
              fontSize: 15,
              fontWeight: 600,
              cursor: githubUrl ? "pointer" : "not-allowed",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            <Sparkles size={16} />
            Generate Portfolio from GitHub
          </button>
        </motion.div>
      )}

      {/* ── Generating state ──────────────────────────────────────────────── */}
      {isGenerating && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            padding: "64px 32px",
          }}
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
          >
            <Sparkles size={32} style={{ color: C.accent }} />
          </motion.div>
          <p style={{ fontSize: 16, fontWeight: 600, color: C.textPrimary }}>
            Analyzing your repositories…
          </p>
          <p style={{ fontSize: 13, color: C.textSecondary }}>
            Fetching repos, scoring impact, writing descriptions
          </p>
        </motion.div>
      )}

      {/* ── Main content — portfolio generated ───────────────────────────── */}
      {!isGenerating && portfolio && (
        <div style={{ display: "grid", gridTemplateColumns: showPreview ? "1fr 1fr" : "1fr", gap: 24 }}>
          {/* Left — Editor */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Bio + Tagline card */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: C.bgSurface,
                border: `1px solid ${C.borderSubtle}`,
                borderRadius: 14,
                padding: "20px 24px",
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                <Github size={15} style={{ color: C.accent }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: C.textSecondary }}>
                  github.com/{portfolio.githubUsername}
                </span>
              </div>

              {/* Tagline */}
              <div>
                <p
                  style={{
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                    color: C.textMuted,
                    fontWeight: 500,
                    marginBottom: 6,
                  }}
                >
                  Tagline
                </p>
                <p style={{ fontSize: 16, fontWeight: 700, color: C.textPrimary, lineHeight: 1.4 }}>
                  <InlineEdit
                    value={portfolio.tagline}
                    onSave={handleUpdateField("tagline")}
                  />
                </p>
              </div>

              {/* Portfolio bio */}
              <div>
                <p
                  style={{
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                    color: C.textMuted,
                    fontWeight: 500,
                    marginBottom: 6,
                  }}
                >
                  Portfolio Bio
                </p>
                <p style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.7 }}>
                  <InlineEdit
                    value={portfolio.portfolio_bio}
                    onSave={handleUpdateField("portfolio_bio")}
                    multiline
                  />
                </p>
              </div>

              {/* Top skills */}
              {portfolio.top_skills.length > 0 && (
                <div>
                  <p
                    style={{
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: "0.07em",
                      color: C.textMuted,
                      fontWeight: 500,
                      marginBottom: 8,
                    }}
                  >
                    Top Skills
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                    {portfolio.top_skills.map((skill) => (
                      <span
                        key={skill}
                        style={{
                          fontSize: 12,
                          padding: "3px 11px",
                          borderRadius: 20,
                          background: C.accentMuted,
                          color: C.accent,
                          border: `1px solid ${C.accentBorder}`,
                          fontWeight: 500,
                        }}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>

            {/* Drag-hint */}
            <p style={{ fontSize: 12, color: C.textMuted, textAlign: "center", margin: 0 }}>
              Drag cards to reorder · Click text to edit
            </p>

            {/* Project cards grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: showPreview ? "1fr" : "repeat(auto-fill, minmax(340px, 1fr))",
                gap: 16,
              }}
            >
              <AnimatePresence>
                {portfolio.selected_repos.map((repo, i) => (
                  <ProjectCard
                    key={repo.name}
                    repo={repo}
                    index={i}
                    githubUsername={portfolio.githubUsername}
                    onUpdate={handleUpdateRepo}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    isDragOver={dragOverIndex === i}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Right — Preview */}
          <AnimatePresence>
            {showPreview && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.25 }}
              >
                <div
                  style={{
                    position: "sticky",
                    top: 24,
                    maxHeight: "calc(100vh - 48px)",
                    overflowY: "auto",
                  }}
                >
                  <p
                    style={{
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: "0.07em",
                      color: C.textMuted,
                      fontWeight: 500,
                      marginBottom: 12,
                    }}
                  >
                    Portfolio Preview
                  </p>
                  <PreviewPanel portfolio={portfolio} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Spin keyframe */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
