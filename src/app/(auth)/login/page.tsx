"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Eye, EyeOff, Zap, ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      const data = res as Record<string, Record<string, string>>;
      if (data?.data?.accessToken) {
        localStorage.setItem("accessToken",  data.data.accessToken);
        localStorage.setItem("refreshToken", data.data.refreshToken || "");
        router.push("/dashboard");
      } else {
        setError("Invalid email or password.");
      }
    } catch {
      setError("Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: "var(--bg-base)" }}
    >
      {/* Background effects */}
      <div className="aurora-grid" />
      <div className="noise-overlay" />

      {/* Violet glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: 800,
          height: 800,
          borderRadius: "50%",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: "radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 65%)",
          filter: "blur(40px)",
        }}
      />

      {/* Top-right teal accent */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: 400,
          height: 400,
          borderRadius: "50%",
          top: -100,
          right: -50,
          background: "radial-gradient(circle, rgba(6,182,212,0.06) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" as const }}
        className="relative w-full max-w-[420px] mx-4"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 20,
          padding: "36px 36px 32px",
          boxShadow: "0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)",
        }}
      >
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, ease: "easeOut" as const }}
          className="flex items-center gap-2.5 mb-8"
        >
          <div
            className="w-8 h-8 rounded-[9px] flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)",
              boxShadow: "0 4px 14px rgba(124,58,237,0.4)",
            }}
          >
            <Zap size={14} className="text-white" style={{ fill: "white" }} />
          </div>
          <span className="text-[15px] font-bold" style={{ color: "#F0F0FF" }}>
            AutoApply
          </span>
        </motion.div>

        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, ease: "easeOut" as const }}
          className="mb-7"
        >
          <h1 className="text-[26px] font-bold mb-1.5" style={{ color: "#F0F0FF", letterSpacing: "-0.02em" }}>
            Welcome back
          </h1>
          <p className="text-[13px]" style={{ color: "#5A5A80" }}>
            Sign in to continue your AI-powered job search
          </p>
        </motion.div>

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mb-4 px-4 py-3 rounded-[10px] text-[12px]"
            style={{
              background: "rgba(248,113,113,0.08)",
              border: "1px solid rgba(248,113,113,0.25)",
              color: "#F87171",
            }}
          >
            {error}
          </motion.div>
        )}

        {/* Form */}
        <motion.form
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, ease: "easeOut" as const }}
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          {/* Email */}
          <div>
            <label
              className="block text-[11px] font-medium mb-1.5"
              style={{ color: "#5A5A80", letterSpacing: "0.02em" }}
            >
              EMAIL
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="input-base"
              style={{ height: 44 }}
            />
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                className="text-[11px] font-medium"
                style={{ color: "#5A5A80", letterSpacing: "0.02em" }}
              >
                PASSWORD
              </label>
              <button
                type="button"
                className="text-[11px] transition-colors"
                style={{ color: "#5A5A90" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#A78BFA"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#5A5A90"; }}
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="input-base pr-10"
                style={{ height: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: "#3A3A60" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#9090B8"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#3A3A60"; }}
              >
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-[46px] flex items-center justify-center gap-2 rounded-[12px] font-semibold text-[14px] text-white transition-all duration-150 mt-2"
            style={{
              background: loading ? "#3A2060" : "linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)",
              boxShadow: loading ? "none" : "0 8px 24px rgba(124,58,237,0.4)",
              cursor: loading ? "not-allowed" : "pointer",
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                (e.currentTarget as HTMLElement).style.boxShadow = "0 10px 32px rgba(124,58,237,0.55)";
                (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 24px rgba(124,58,237,0.4)";
              (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
            }}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Signing in...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Sign In
                <ArrowRight size={15} />
              </span>
            )}
          </button>
        </motion.form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
          <span className="text-[11px]" style={{ color: "#2A2A40" }}>or</span>
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
        </div>

        {/* Register link */}
        <p className="text-center text-[13px]" style={{ color: "#4A4A70" }}>
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="font-medium transition-colors"
            style={{ color: "#A78BFA" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#8B5CF6"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#A78BFA"; }}
          >
            Create one free →
          </Link>
        </p>

        {/* Feature callout */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, ease: "easeOut" as const }}
          className="mt-6 px-4 py-3 rounded-[10px] flex items-start gap-2.5"
          style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.12)" }}
        >
          <Sparkles size={12} style={{ color: "#7C3AED", flexShrink: 0, marginTop: 2 }} />
          <p className="text-[11px]" style={{ color: "#5A4A80" }}>
            AutoApply&apos;s AI has helped secure{" "}
            <span style={{ color: "#A78BFA" }}>2,400+ job offers</span> in the last 30 days.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
