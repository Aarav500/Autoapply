"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import {
  Users,
  Search,
  MessageSquare,
  Loader2,
  AlertCircle,
  Copy,
  Check,
  Link2,
  Clock,
  Star,
  Mail,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReferralResult {
  linkedin_search_tips: string[];
  outreach_message: string;
  subject_line: string;
  follow_up_message: string;
  timing_advice: string;
  key_talking_points: string[];
}

interface ReferralResponse {
  company: string;
  jobTitle: string;
  data: ReferralResult;
}

// ─── Copy Button ──────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded hover:bg-white/10 transition-colors"
      title="Copy to clipboard"
    >
      {copied ? (
        <Check size={14} className="text-[#8B5CF6]" />
      ) : (
        <Copy size={14} className="text-white/40" />
      )}
    </button>
  );
}

// ─── Collapsible Section ──────────────────────────────────────────────────────

function Section({
  icon,
  title,
  children,
  defaultOpen = true,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="text-[#8B5CF6]">{icon}</div>
          <span className="font-semibold text-white">{title}</span>
        </div>
        {open ? (
          <ChevronUp size={16} className="text-white/40" />
        ) : (
          <ChevronDown size={16} className="text-white/40" />
        )}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReferralFinderPage() {
  const [company, setCompany] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [result, setResult] = useState<ReferralResponse | null>(null);

  const mutation = useMutation({
    mutationFn: (payload: { company: string; jobTitle: string; jobUrl?: string }) =>
      apiFetch<ReferralResponse>("/api/referral", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: (data) => setResult(data),
  });

  const handleSubmit = () => {
    if (!company.trim() || !jobTitle.trim()) return;
    mutation.mutate({
      company: company.trim(),
      jobTitle: jobTitle.trim(),
      jobUrl: jobUrl.trim() || undefined,
    });
  };

  const res = result?.data;

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4"
      >
        <div className="w-12 h-12 rounded-xl bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 flex items-center justify-center">
          <Users size={24} className="text-[#8B5CF6]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Referral Finder</h1>
          <p className="text-white/50 text-sm">
            Get AI-crafted outreach messages to land referrals at top companies
          </p>
        </div>
      </motion.div>

      {/* Input Form */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white/5 rounded-xl border border-white/10 p-6 space-y-4"
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm text-white/60 font-medium">Company *</label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g. Google"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/20 focus:outline-none focus:border-[#8B5CF6]/50 transition-colors"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm text-white/60 font-medium">Job Title *</label>
            <input
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g. Software Engineer Intern"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/20 focus:outline-none focus:border-[#8B5CF6]/50 transition-colors"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm text-white/60 font-medium">
            Job URL{" "}
            <span className="text-white/30 font-normal">(optional — improves personalization)</span>
          </label>
          <input
            type="url"
            value={jobUrl}
            onChange={(e) => setJobUrl(e.target.value)}
            placeholder="https://careers.google.com/jobs/..."
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/20 focus:outline-none focus:border-[#8B5CF6]/50 transition-colors"
          />
        </div>
        <button
          onClick={handleSubmit}
          disabled={!company.trim() || !jobTitle.trim() || mutation.isPending}
          className="w-full flex items-center justify-center gap-2 bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 hover:bg-[#8B5CF6]/20 disabled:opacity-50 disabled:cursor-not-allowed text-[#8B5CF6] font-semibold py-2.5 rounded-lg transition-colors"
        >
          {mutation.isPending ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Generating strategy...
            </>
          ) : (
            <>
              <Search size={16} />
              Find Referral Path
            </>
          )}
        </button>
      </motion.div>

      {/* Error */}
      <AnimatePresence>
        {mutation.isError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3"
          >
            <AlertCircle size={16} className="text-red-400 shrink-0" />
            <p className="text-red-400 text-sm">
              {mutation.error instanceof Error
                ? mutation.error.message
                : "Failed to generate referral strategy. Please try again."}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <AnimatePresence>
        {res && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Header */}
            <div className="flex items-center gap-2 pb-1">
              <div className="w-2 h-2 rounded-full bg-[#8B5CF6] animate-pulse" />
              <p className="text-white/50 text-sm">
                Referral strategy for{" "}
                <span className="text-white font-semibold">{result?.jobTitle}</span> at{" "}
                <span className="text-[#8B5CF6] font-semibold">{result?.company}</span>
              </p>
            </div>

            {/* LinkedIn Search Tips */}
            <Section icon={<Link2 size={18} />} title="LinkedIn Search Strategies">
              <ul className="space-y-2 mt-1">
                {res.linkedin_search_tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                    <span className="mt-0.5 w-5 h-5 rounded-full bg-[#8B5CF6]/10 text-[#8B5CF6] text-xs flex items-center justify-center shrink-0 font-bold">
                      {i + 1}
                    </span>
                    {tip}
                  </li>
                ))}
              </ul>
            </Section>

            {/* Outreach Message */}
            <Section icon={<MessageSquare size={18} />} title="LinkedIn Outreach Message">
              <div className="relative">
                <div className="absolute top-2 right-2">
                  <CopyButton text={res.outreach_message} />
                </div>
                <pre className="whitespace-pre-wrap text-sm text-white/80 bg-black/20 rounded-lg p-4 pr-10 font-sans leading-relaxed">
                  {res.outreach_message}
                </pre>
              </div>
            </Section>

            {/* Email Subject + Follow-up */}
            <Section icon={<Mail size={18} />} title="Email Subject & Follow-up">
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-white/40 mb-1 uppercase tracking-wide font-medium">
                    Subject Line
                  </p>
                  <div className="flex items-center gap-2 bg-black/20 rounded-lg px-3 py-2">
                    <p className="flex-1 text-sm text-white/80">{res.subject_line}</p>
                    <CopyButton text={res.subject_line} />
                  </div>
                </div>
                <div>
                  <p className="text-xs text-white/40 mb-1 uppercase tracking-wide font-medium">
                    Follow-up (after 5-7 days)
                  </p>
                  <div className="relative">
                    <div className="absolute top-2 right-2">
                      <CopyButton text={res.follow_up_message} />
                    </div>
                    <pre className="whitespace-pre-wrap text-sm text-white/80 bg-black/20 rounded-lg p-4 pr-10 font-sans leading-relaxed">
                      {res.follow_up_message}
                    </pre>
                  </div>
                </div>
              </div>
            </Section>

            {/* Timing Advice */}
            <Section icon={<Clock size={18} />} title="Timing & Strategy">
              <p className="text-sm text-white/70 leading-relaxed">{res.timing_advice}</p>
            </Section>

            {/* Key Talking Points */}
            <Section icon={<Star size={18} />} title="Key Talking Points">
              <ul className="space-y-2 mt-1">
                {res.key_talking_points.map((point, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                    <Star size={12} className="mt-1 text-[#8B5CF6] shrink-0" />
                    {point}
                  </li>
                ))}
              </ul>
            </Section>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
