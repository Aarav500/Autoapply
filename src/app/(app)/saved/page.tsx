"use client";

import { motion } from "framer-motion";
import { useState, useMemo } from "react";
import {
  Bookmark,
  Plus,
  Trash2,
  ExternalLink,
  Search,
  AlertCircle,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

interface SavedItem {
  id: string;
  title: string;
  url: string | null;
  notes: string | null;
  source: string | null;
  category: string;
  tags: string[];
  summary: string;
  createdAt: string;
}

interface Recommendation {
  title: string;
  type: string;
  description: string;
  why_relevant: string;
  url_hint: string;
}

const categoryColors: Record<string, string> = {
  Book: "#536DFE",
  Website: "#9090B8",
  "GitHub Repo": "#8B5CF6",
  Course: "#34D399",
  Tool: "#FBBF24",
  Article: "#B388FF",
  Video: "#F87171",
  "Research Paper": "#00B8D4",
  Podcast: "#FF6E40",
  Newsletter: "#69F0AE",
  Other: "#3A3A60",
};

const categoryFilters = [
  "All",
  "Book",
  "Website",
  "GitHub Repo",
  "Course",
  "Tool",
  "Article",
  "Video",
  "Research Paper",
];

const sourceOptions = ["Instagram", "Twitter", "Reddit", "Web", "Manual"];

const tabs = [
  { id: "collection", label: "My Collection" },
  { id: "recommendations", label: "Recommendations" },
];

export default function SavedContentPage() {
  const [activeTab, setActiveTab] = useState("collection");
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchText, setSearchText] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formSource, setFormSource] = useState("Manual");
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  const queryClient = useQueryClient();

  // Fetch saved items
  const {
    data: itemsData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["saved-items"],
    queryFn: () =>
      apiFetch<{ data: { items: SavedItem[]; total: number } }>("/api/saved"),
  });

  const rawData = (itemsData as Record<string, unknown>)?.data as
    | { items: SavedItem[]; total: number }
    | undefined;

  // Filter items
  const filteredItems = useMemo(() => {
    const allItems: SavedItem[] = rawData?.items || [];
    let items = allItems;
    if (activeCategory !== "All") {
      items = items.filter((item) => item.category === activeCategory);
    }
    if (searchText.trim()) {
      const lower = searchText.toLowerCase();
      items = items.filter(
        (item) =>
          item.title.toLowerCase().includes(lower) ||
          (item.notes && item.notes.toLowerCase().includes(lower)) ||
          item.tags.some((tag) => tag.toLowerCase().includes(lower)) ||
          item.summary.toLowerCase().includes(lower)
      );
    }
    return items;
  }, [rawData, activeCategory, searchText]);

  // Add mutation
  const addMutation = useMutation({
    mutationFn: (data: {
      title: string;
      url?: string;
      notes?: string;
      source?: string;
    }) =>
      apiFetch("/api/saved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", ...data }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-items"] });
      setFormTitle("");
      setFormUrl("");
      setFormNotes("");
      setFormSource("Manual");
      setShowAddForm(false);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch("/api/saved", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-items"] });
    },
  });

  // Recommend mutation
  const recommendMutation = useMutation({
    mutationFn: () =>
      apiFetch<{
        data: { recommendations: Recommendation[] };
      }>("/api/saved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "recommend" }),
      }),
    onSuccess: (data) => {
      const inner = (data as Record<string, unknown>)?.data as
        | { recommendations: Recommendation[] }
        | undefined;
      setRecommendations(inner?.recommendations || []);
    },
  });

  function handleAddSubmit() {
    if (!formTitle.trim()) return;
    addMutation.mutate({
      title: formTitle.trim(),
      url: formUrl.trim() || undefined,
      notes: formNotes.trim() || undefined,
      source: formSource,
    });
  }

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8">
      {/* Background texture */}
      <div
        className="fixed inset-0 opacity-[0.015] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-8"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(124, 58, 237, 0.1)" }}
          >
            <Bookmark size={20} style={{ color: "#8B5CF6" }} />
          </div>
          <div>
            <h1
              className="text-2xl font-bold"
              style={{ color: "#F0F0FF", fontFamily: "'Inter', sans-serif" }}
            >
              Saved Content
            </h1>
            <p
              className="text-sm mt-0.5"
              style={{ color: "#9090B8", fontFamily: "'Inter', sans-serif" }}
            >
              Organize your saved recommendations from Instagram, Twitter & the
              web
            </p>
          </div>
        </div>
      </motion.div>

      {/* Tab Bar */}
      <div
        className="flex gap-1 p-1 rounded-lg mb-6"
        style={{ background: "rgba(255, 255, 255, 0.03)" }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-4 py-2 rounded-md text-sm font-medium transition-all"
            style={{
              background:
                activeTab === tab.id
                  ? "rgba(124, 58, 237, 0.15)"
                  : "transparent",
              color: activeTab === tab.id ? "#8B5CF6" : "#9090B8",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* My Collection Tab */}
      {activeTab === "collection" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          {/* Top bar: Search + Add Button */}
          <div className="flex items-center gap-3 mb-5">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: "#3A3A60" }}
              />
              <input
                type="text"
                placeholder="Search saved content..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm outline-none transition-all"
                style={{
                  background: "rgba(11, 11, 20, 0.7)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                  color: "#F0F0FF",
                  fontFamily: "'Inter', sans-serif",
                }}
              />
            </div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all"
              style={{
                background: showAddForm
                  ? "rgba(255, 71, 87, 0.15)"
                  : "rgba(124, 58, 237, 0.1)",
                border: `1px solid ${showAddForm ? "rgba(255, 71, 87, 0.3)" : "rgba(124, 58, 237, 0.2)"}`,
                color: showAddForm ? "#F87171" : "#8B5CF6",
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {showAddForm ? (
                <>
                  <X size={16} /> Cancel
                </>
              ) : (
                <>
                  <Plus size={16} /> Add Content
                </>
              )}
            </button>
          </div>

          {/* Inline Add Form */}
          {showAddForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="rounded-xl p-5 mb-5"
              style={{
                background: "rgba(11, 11, 20, 0.7)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(124, 58, 237, 0.1)",
              }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label
                    className="block text-xs font-medium mb-1.5"
                    style={{
                      color: "#9090B8",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    Title *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Clean Code by Robert C. Martin"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{
                      background: "rgba(255, 255, 255, 0.04)",
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                      color: "#F0F0FF",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  />
                </div>
                <div>
                  <label
                    className="block text-xs font-medium mb-1.5"
                    style={{
                      color: "#9090B8",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    URL
                  </label>
                  <input
                    type="text"
                    placeholder="https://..."
                    value={formUrl}
                    onChange={(e) => setFormUrl(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{
                      background: "rgba(255, 255, 255, 0.04)",
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                      color: "#F0F0FF",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label
                    className="block text-xs font-medium mb-1.5"
                    style={{
                      color: "#9090B8",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    Notes
                  </label>
                  <textarea
                    placeholder="Why did you save this?"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
                    style={{
                      background: "rgba(255, 255, 255, 0.04)",
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                      color: "#F0F0FF",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  />
                </div>
                <div>
                  <label
                    className="block text-xs font-medium mb-1.5"
                    style={{
                      color: "#9090B8",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    Source
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {sourceOptions.map((src) => (
                      <button
                        key={src}
                        onClick={() => setFormSource(src)}
                        className="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
                        style={{
                          background:
                            formSource === src
                              ? "rgba(124, 58, 237, 0.15)"
                              : "rgba(255, 255, 255, 0.04)",
                          border: `1px solid ${formSource === src ? "rgba(124, 58, 237, 0.3)" : "rgba(255, 255, 255, 0.06)"}`,
                          color: formSource === src ? "#8B5CF6" : "#9090B8",
                          fontFamily: "'Inter', sans-serif",
                        }}
                      >
                        {src}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleAddSubmit}
                  disabled={!formTitle.trim() || addMutation.isPending}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-40"
                  style={{
                    background: "rgba(124, 58, 237, 0.15)",
                    border: "1px solid rgba(124, 58, 237, 0.3)",
                    color: "#8B5CF6",
                    fontFamily: "'Inter', sans-serif",
                  }}
                >
                  {addMutation.isPending ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />{" "}
                      Categorizing...
                    </>
                  ) : (
                    <>
                      <Plus size={14} /> Save & Categorize
                    </>
                  )}
                </button>
              </div>
              {addMutation.isError && (
                <p
                  className="text-xs mt-2"
                  style={{ color: "#F87171", fontFamily: "'Inter', sans-serif" }}
                >
                  Failed to save item. Please try again.
                </p>
              )}
            </motion.div>
          )}

          {/* Category Filter Pills */}
          <div className="flex gap-2 overflow-x-auto pb-3 mb-5">
            {categoryFilters.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all"
                style={{
                  background:
                    activeCategory === cat
                      ? `${categoryColors[cat] || "rgba(124, 58, 237, 1)"}20`
                      : "rgba(255, 255, 255, 0.03)",
                  border: `1px solid ${
                    activeCategory === cat
                      ? `${categoryColors[cat] || "#8B5CF6"}40`
                      : "rgba(255, 255, 255, 0.06)"
                  }`,
                  color:
                    activeCategory === cat
                      ? categoryColors[cat] || "#8B5CF6"
                      : "#9090B8",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <Loader2
                size={24}
                className="animate-spin"
                style={{ color: "#8B5CF6" }}
              />
            </div>
          )}

          {/* Error State */}
          {isError && (
            <div
              className="flex items-center gap-3 p-4 rounded-lg"
              style={{
                background: "rgba(255, 71, 87, 0.08)",
                border: "1px solid rgba(255, 71, 87, 0.2)",
              }}
            >
              <AlertCircle size={18} style={{ color: "#F87171" }} />
              <p
                className="text-sm"
                style={{
                  color: "#F87171",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                {error instanceof Error
                  ? error.message
                  : "Failed to load saved content"}
              </p>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !isError && filteredItems.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-20"
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: "rgba(124, 58, 237, 0.06)" }}
              >
                <Bookmark size={28} style={{ color: "#3A3A60" }} />
              </div>
              <p
                className="text-sm font-medium mb-1"
                style={{
                  color: "#9090B8",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                {searchText || activeCategory !== "All"
                  ? "No items match your filters"
                  : "No saved content yet"}
              </p>
              <p
                className="text-xs"
                style={{
                  color: "#3A3A60",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                {searchText || activeCategory !== "All"
                  ? "Try adjusting your search or category filter"
                  : "Start saving content from Instagram, Twitter, or the web"}
              </p>
            </motion.div>
          )}

          {/* Content Grid */}
          {!isLoading && filteredItems.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="rounded-xl p-4 group relative"
                  style={{
                    background: "rgba(11, 11, 20, 0.7)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid rgba(255, 255, 255, 0.04)",
                  }}
                >
                  {/* Category Badge + Delete */}
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className="px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider"
                      style={{
                        background: `${categoryColors[item.category] || "#3A3A60"}18`,
                        color: categoryColors[item.category] || "#3A3A60",
                        fontFamily: "monospace, monospace",
                      }}
                    >
                      {item.category}
                    </span>
                    <button
                      onClick={() => deleteMutation.mutate(item.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-[rgba(255,71,87,0.1)]"
                      style={{ color: "#3A3A60" }}
                      title="Delete item"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Title */}
                  <h3
                    className="text-sm font-semibold mb-1.5 line-clamp-2"
                    style={{
                      color: "#F0F0FF",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    {item.title}
                  </h3>

                  {/* Summary */}
                  {item.summary && (
                    <p
                      className="text-xs mb-3 line-clamp-2"
                      style={{
                        color: "#9090B8",
                        fontFamily: "'Inter', sans-serif",
                      }}
                    >
                      {item.summary}
                    </p>
                  )}

                  {/* Tags */}
                  {item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {item.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded text-[10px]"
                          style={{
                            background: "rgba(255, 255, 255, 0.04)",
                            color: "#9090B8",
                            fontFamily: "monospace, monospace",
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Footer: source + date + link */}
                  <div className="flex items-center justify-between mt-auto pt-2 border-t border-[rgba(255,255,255,0.04)]">
                    <div className="flex items-center gap-2">
                      {item.source && (
                        <span
                          className="text-[10px]"
                          style={{
                            color: "#3A3A60",
                            fontFamily: "monospace, monospace",
                          }}
                        >
                          {item.source}
                        </span>
                      )}
                      <span
                        className="text-[10px]"
                        style={{
                          color: "#3A3A60",
                          fontFamily: "monospace, monospace",
                        }}
                      >
                        {formatDate(item.createdAt)}
                      </span>
                    </div>
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded hover:bg-[rgba(0,255,224,0.08)] transition-colors"
                        style={{ color: "#8B5CF6" }}
                        title="Open link"
                      >
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Recommendations Tab */}
      {activeTab === "recommendations" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex items-center justify-between mb-6">
            <p
              className="text-sm"
              style={{
                color: "#9090B8",
                fontFamily: "'Inter', sans-serif",
              }}
            >
              AI-powered recommendations based on your saved content library
            </p>
            <button
              onClick={() => recommendMutation.mutate()}
              disabled={recommendMutation.isPending}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-40"
              style={{
                background: "rgba(124, 58, 237, 0.1)",
                border: "1px solid rgba(124, 58, 237, 0.2)",
                color: "#8B5CF6",
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {recommendMutation.isPending ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Generating...
                </>
              ) : (
                <>
                  <Sparkles size={14} /> Get Recommendations
                </>
              )}
            </button>
          </div>

          {recommendMutation.isError && (
            <div
              className="flex items-center gap-3 p-4 rounded-lg mb-6"
              style={{
                background: "rgba(255, 71, 87, 0.08)",
                border: "1px solid rgba(255, 71, 87, 0.2)",
              }}
            >
              <AlertCircle size={18} style={{ color: "#F87171" }} />
              <p
                className="text-sm"
                style={{
                  color: "#F87171",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                Failed to generate recommendations. Please try again.
              </p>
            </div>
          )}

          {/* No recommendations yet */}
          {recommendations.length === 0 && !recommendMutation.isPending && (
            <div className="flex flex-col items-center justify-center py-20">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: "rgba(124, 58, 237, 0.06)" }}
              >
                <Sparkles size={28} style={{ color: "#3A3A60" }} />
              </div>
              <p
                className="text-sm font-medium mb-1"
                style={{
                  color: "#9090B8",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                No recommendations yet
              </p>
              <p
                className="text-xs"
                style={{
                  color: "#3A3A60",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                Click &quot;Get Recommendations&quot; to discover new content based on
                your library
              </p>
            </div>
          )}

          {/* Loading state */}
          {recommendMutation.isPending && (
            <div className="flex items-center justify-center py-20">
              <Loader2
                size={24}
                className="animate-spin"
                style={{ color: "#8B5CF6" }}
              />
            </div>
          )}

          {/* Recommendation Cards */}
          {recommendations.length > 0 && !recommendMutation.isPending && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recommendations.map((rec, i) => (
                <motion.div
                  key={`${rec.title}-${i}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-xl p-5"
                  style={{
                    background: "rgba(11, 11, 20, 0.7)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid rgba(255, 255, 255, 0.04)",
                  }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className="px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider"
                      style={{
                        background: `${categoryColors[rec.type] || "#3A3A60"}18`,
                        color: categoryColors[rec.type] || "#3A3A60",
                        fontFamily: "monospace, monospace",
                      }}
                    >
                      {rec.type}
                    </span>
                  </div>
                  <h3
                    className="text-sm font-semibold mb-2"
                    style={{
                      color: "#F0F0FF",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    {rec.title}
                  </h3>
                  <p
                    className="text-xs mb-3"
                    style={{
                      color: "#9090B8",
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    {rec.description}
                  </p>
                  <div
                    className="rounded-lg p-3 mb-2"
                    style={{
                      background: "rgba(124, 58, 237, 0.04)",
                      border: "1px solid rgba(124, 58, 237, 0.08)",
                    }}
                  >
                    <p
                      className="text-[11px]"
                      style={{
                        color: "#8B5CF6",
                        fontFamily: "'Inter', sans-serif",
                      }}
                    >
                      {rec.why_relevant}
                    </p>
                  </div>
                  {rec.url_hint && (
                    <p
                      className="text-[10px] truncate"
                      style={{
                        color: "#3A3A60",
                        fontFamily: "monospace, monospace",
                      }}
                    >
                      {rec.url_hint}
                    </p>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
