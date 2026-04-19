"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { Brain, Plus, RotateCcw, ChevronRight, ChevronLeft, CheckCircle2, XCircle, Trash2, Sparkles, BookOpen, Zap } from "lucide-react";

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
  borderSubtle: "rgba(255,255,255,0.05)",
  cardBorder: "rgba(255,255,255,0.07)",
  green: "#34D399",
  greenMuted: "rgba(52,211,153,0.1)",
  red: "#F87171",
  redMuted: "rgba(248,113,113,0.1)",
  amber: "#FBBF24",
};

interface Flashcard {
  id: string;
  question: string;
  answer: string;
  category: string;
  difficulty: "easy" | "medium" | "hard";
  timesShown: number;
  timesCorrect: number;
  nextReview?: string;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: C.green,
  medium: C.amber,
  hard: C.red,
};

const TOPICS = [
  "System Design", "Data Structures & Algorithms", "Behavioral Questions",
  "React & Frontend", "Node.js & Backend", "SQL & Databases",
  "Machine Learning", "Networking & Security", "Leadership & Culture",
];

export default function FlashcardsPage() {
  const queryClient = useQueryClient();
  const [flipped, setFlipped] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showGenForm, setShowGenForm] = useState(false);
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(10);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard" | "mixed">("mixed");
  const [sessionStats, setSessionStats] = useState({ correct: 0, total: 0 });

  const { data, isLoading } = useQuery({
    queryKey: ["flashcards"],
    queryFn: () => apiFetch<{ data: { cards: Flashcard[]; dueCount: number; totalCards: number } }>("/api/interview/flashcards"),
    retry: false,
  });

  const inner = (data as { data?: { cards?: Flashcard[]; dueCount?: number; totalCards?: number } } | undefined)?.data;
  const cards: Flashcard[] = inner?.cards ?? [];
  const dueCount = inner?.dueCount ?? 0;

  const reviewMutation = useMutation({
    mutationFn: ({ cardId, correct }: { cardId: string; correct: boolean }) =>
      apiFetch("/api/interview/flashcards", { method: "POST", body: JSON.stringify({ cardId, correct }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["flashcards"] }),
  });

  const generateMutation = useMutation({
    mutationFn: () =>
      apiFetch("/api/interview/flashcards", { method: "POST", body: JSON.stringify({ topic, count, difficulty }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flashcards"] });
      setShowGenForm(false);
      setTopic("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/interview/flashcards?id=${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["flashcards"] }),
  });

  const currentCard = cards[currentIdx];

  const handleReview = (correct: boolean) => {
    if (!currentCard) return;
    reviewMutation.mutate({ cardId: currentCard.id, correct });
    setSessionStats((s) => ({ correct: s.correct + (correct ? 1 : 0), total: s.total + 1 }));
    setFlipped(false);
    setTimeout(() => setCurrentIdx((i) => Math.min(i + 1, cards.length - 1)), 150);
  };

  const accuracy = sessionStats.total > 0 ? Math.round((sessionStats.correct / sessionStats.total) * 100) : 0;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: C.accentMuted, border: `1px solid ${C.accentBorder}` }}>
            <Brain size={20} style={{ color: C.accent }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: C.textPrimary, fontFamily: "'Inter', sans-serif" }}>Interview Flashcards</h1>
            <p className="text-sm mt-0.5" style={{ color: C.textSecondary, fontFamily: "'Inter', sans-serif" }}>Spaced repetition for interview mastery</p>
          </div>
        </div>
        <button
          onClick={() => setShowGenForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium transition-all"
          style={{ background: C.accentBright, color: "white", fontFamily: "'Inter', sans-serif", boxShadow: "0 2px 12px rgba(124,58,237,0.3)" }}
        >
          <Sparkles size={13} /> Generate Cards
        </button>
      </motion.div>

      {/* Stats strip */}
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="grid grid-cols-4 gap-3">
        {[
          { label: "Total Cards", value: cards.length, icon: BookOpen, color: C.accent },
          { label: "Due Today", value: dueCount, icon: Zap, color: C.amber },
          { label: "Session Accuracy", value: sessionStats.total > 0 ? `${accuracy}%` : "—", icon: CheckCircle2, color: C.green },
          { label: "Reviewed", value: sessionStats.total, icon: RotateCcw, color: "#60A5FA" },
        ].map((s, i) => (
          <div key={i} className="rounded-xl p-4" style={{ background: C.bgSurface, border: `1px solid ${C.cardBorder}` }}>
            <s.icon size={14} style={{ color: s.color, marginBottom: 8 }} />
            <div className="text-xl font-bold" style={{ color: s.color, fontFamily: "'Inter', sans-serif" }}>{s.value}</div>
            <div className="text-[11px]" style={{ color: C.textMuted, fontFamily: "'Inter', sans-serif" }}>{s.label}</div>
          </div>
        ))}
      </motion.div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: C.accentBorder, borderTopColor: C.accent }} />
        </div>
      ) : cards.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl" style={{ background: C.accentMuted }}>🧠</div>
          <p className="text-lg font-semibold" style={{ color: C.textPrimary, fontFamily: "'Inter', sans-serif" }}>No flashcards yet</p>
          <p className="text-sm" style={{ color: C.textSecondary, fontFamily: "'Inter', sans-serif" }}>Generate your first deck to start practicing</p>
          <button onClick={() => setShowGenForm(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-medium" style={{ background: C.accentBright, color: "white", fontFamily: "'Inter', sans-serif" }}>
            <Plus size={13} /> Generate Cards
          </button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-2 gap-6">
          {/* Flash card */}
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[12px]" style={{ color: C.textMuted, fontFamily: "'Inter', sans-serif" }}>Card {Math.min(currentIdx + 1, cards.length)} of {cards.length}</p>
              {currentCard && (
                <span className="text-[11px] px-2 py-0.5 rounded-full capitalize" style={{ color: DIFFICULTY_COLORS[currentCard.difficulty], background: `${DIFFICULTY_COLORS[currentCard.difficulty]}15`, fontFamily: "'Inter', sans-serif" }}>
                  {currentCard.difficulty}
                </span>
              )}
            </div>

            {/* Card flip */}
            <div
              className="relative cursor-pointer select-none"
              style={{ height: 280, perspective: 1000 }}
              onClick={() => setFlipped((f) => !f)}
            >
              <motion.div
                style={{ width: "100%", height: "100%", transformStyle: "preserve-3d", position: "relative" }}
                animate={{ rotateY: flipped ? 180 : 0 }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
              >
                {/* Front */}
                <div
                  className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center p-6 text-center"
                  style={{ background: C.bgSurface, border: `1px solid ${C.cardBorder}`, backfaceVisibility: "hidden" }}
                >
                  <span className="text-[11px] uppercase tracking-widest mb-4 px-3 py-1 rounded-full" style={{ color: C.accent, background: C.accentMuted, fontFamily: "'Inter', sans-serif" }}>
                    {currentCard?.category ?? "Question"}
                  </span>
                  <p className="text-[15px] font-medium leading-relaxed" style={{ color: C.textPrimary, fontFamily: "'Inter', sans-serif" }}>
                    {currentCard?.question}
                  </p>
                  <p className="text-[11px] mt-6 flex items-center gap-1.5" style={{ color: C.textMuted, fontFamily: "'Inter', sans-serif" }}>
                    <RotateCcw size={10} /> Click to reveal answer
                  </p>
                </div>
                {/* Back */}
                <div
                  className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center p-6 text-center"
                  style={{ background: C.bgElevated, border: `1px solid ${C.accentBorder}`, backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                >
                  <span className="text-[11px] uppercase tracking-widest mb-4 px-3 py-1 rounded-full" style={{ color: C.green, background: C.greenMuted, fontFamily: "'Inter', sans-serif" }}>
                    Answer
                  </span>
                  <p className="text-[14px] leading-relaxed" style={{ color: C.textPrimary, fontFamily: "'Inter', sans-serif" }}>
                    {currentCard?.answer}
                  </p>
                </div>
              </motion.div>
            </div>

            {/* Controls */}
            {flipped ? (
              <div className="flex gap-3">
                <button
                  onClick={() => handleReview(false)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-medium transition-all"
                  style={{ background: C.redMuted, color: C.red, border: "1px solid rgba(248,113,113,0.25)", fontFamily: "'Inter', sans-serif" }}
                >
                  <XCircle size={14} /> Missed
                </button>
                <button
                  onClick={() => handleReview(true)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-medium transition-all"
                  style={{ background: C.greenMuted, color: C.green, border: "1px solid rgba(52,211,153,0.25)", fontFamily: "'Inter', sans-serif" }}
                >
                  <CheckCircle2 size={14} /> Got it
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => { setFlipped(false); setCurrentIdx((i) => Math.max(i - 1, 0)); }}
                  disabled={currentIdx === 0}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[12px] transition-all disabled:opacity-30"
                  style={{ background: "rgba(255,255,255,0.04)", color: C.textSecondary, border: `1px solid ${C.borderSubtle}`, fontFamily: "'Inter', sans-serif" }}
                >
                  <ChevronLeft size={13} /> Prev
                </button>
                <button
                  onClick={() => { setFlipped(false); setCurrentIdx((i) => Math.min(i + 1, cards.length - 1)); }}
                  disabled={currentIdx >= cards.length - 1}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[12px] transition-all disabled:opacity-30"
                  style={{ background: "rgba(255,255,255,0.04)", color: C.textSecondary, border: `1px solid ${C.borderSubtle}`, fontFamily: "'Inter', sans-serif" }}
                >
                  Next <ChevronRight size={13} />
                </button>
                <button
                  onClick={() => { setCurrentIdx(0); setFlipped(false); setSessionStats({ correct: 0, total: 0 }); }}
                  className="ml-auto flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[12px] transition-all"
                  style={{ background: C.accentMuted, color: C.accent, border: `1px solid ${C.accentBorder}`, fontFamily: "'Inter', sans-serif" }}
                >
                  <RotateCcw size={12} /> Restart
                </button>
              </div>
            )}
          </motion.div>

          {/* Card list */}
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="space-y-3">
            <p className="text-[12px] font-medium" style={{ color: C.textMuted, fontFamily: "'Inter', sans-serif" }}>All Cards</p>
            <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
              {cards.map((card, idx) => (
                <div
                  key={card.id}
                  className="flex items-start gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all group"
                  style={{
                    background: idx === currentIdx ? C.accentMuted : "rgba(255,255,255,0.02)",
                    border: `1px solid ${idx === currentIdx ? C.accentBorder : "transparent"}`,
                  }}
                  onClick={() => { setCurrentIdx(idx); setFlipped(false); }}
                >
                  <span className="text-[10px] w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 font-bold" style={{ background: "rgba(255,255,255,0.06)", color: C.textMuted, fontFamily: "monospace" }}>{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] truncate" style={{ color: idx === currentIdx ? C.textPrimary : C.textSecondary, fontFamily: "'Inter', sans-serif" }}>{card.question}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px]" style={{ color: C.textMuted, fontFamily: "'Inter', sans-serif" }}>{card.category}</span>
                      {card.timesShown > 0 && (
                        <span className="text-[10px]" style={{ color: card.timesCorrect / card.timesShown >= 0.7 ? C.green : C.amber, fontFamily: "monospace" }}>
                          {card.timesCorrect}/{card.timesShown}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(card.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/5 transition-all"
                    style={{ color: C.textMuted }}
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {/* Generate modal */}
      <AnimatePresence>
        {showGenForm && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setShowGenForm(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="fixed z-50 left-1/2 -translate-x-1/2 w-full max-w-md rounded-2xl p-6"
              style={{ top: "18vh", background: "#111120", border: `1px solid ${C.cardBorder}`, boxShadow: "0 32px 100px rgba(0,0,0,0.8)" }}
            >
              <h3 className="text-[15px] font-semibold mb-4" style={{ color: C.textPrimary, fontFamily: "'Inter', sans-serif" }}>Generate Flashcards</h3>

              <div className="space-y-3 mb-5">
                <div>
                  <label className="text-[11px] mb-1.5 block" style={{ color: C.textMuted, fontFamily: "'Inter', sans-serif" }}>Topic</label>
                  <input
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. System Design, React Hooks, SQL…"
                    className="w-full px-3 py-2.5 rounded-xl text-[13px] outline-none"
                    style={{ background: "rgba(255,255,255,0.04)", border: `1px solid rgba(255,255,255,0.07)`, color: C.textPrimary, fontFamily: "'Inter', sans-serif" }}
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {TOPICS.map((t) => (
                      <button key={t} onClick={() => setTopic(t)} className="px-2.5 py-1 rounded-lg text-[11px] transition-all" style={{ background: topic === t ? C.accentMuted : "rgba(255,255,255,0.03)", color: topic === t ? C.accent : C.textMuted, border: `1px solid ${topic === t ? C.accentBorder : "transparent"}`, fontFamily: "'Inter', sans-serif" }}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] mb-1.5 block" style={{ color: C.textMuted, fontFamily: "'Inter', sans-serif" }}>Number of cards</label>
                    <select value={count} onChange={(e) => setCount(Number(e.target.value))} className="w-full px-3 py-2.5 rounded-xl text-[13px] outline-none cursor-pointer" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid rgba(255,255,255,0.07)`, color: C.textPrimary, fontFamily: "'Inter', sans-serif" }}>
                      {[5, 10, 15, 20].map((n) => <option key={n} value={n}>{n} cards</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] mb-1.5 block" style={{ color: C.textMuted, fontFamily: "'Inter', sans-serif" }}>Difficulty</label>
                    <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as typeof difficulty)} className="w-full px-3 py-2.5 rounded-xl text-[13px] outline-none cursor-pointer" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid rgba(255,255,255,0.07)`, color: C.textPrimary, fontFamily: "'Inter', sans-serif" }}>
                      {["mixed", "easy", "medium", "hard"].map((d) => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => setShowGenForm(false)} className="flex-1 py-2.5 rounded-xl text-[13px] font-medium" style={{ background: "rgba(255,255,255,0.04)", color: C.textSecondary, border: `1px solid ${C.borderSubtle}`, fontFamily: "'Inter', sans-serif" }}>Cancel</button>
                <button
                  onClick={() => generateMutation.mutate()}
                  disabled={!topic.trim() || generateMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-medium transition-all disabled:opacity-50"
                  style={{ background: C.accentBright, color: "white", fontFamily: "'Inter', sans-serif" }}
                >
                  {generateMutation.isPending ? <><div className="w-3 h-3 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(255,255,255,0.3)", borderTopColor: "white" }} /> Generating…</> : <><Sparkles size={13} /> Generate</>}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
