"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Eye, EyeOff, Zap, ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const pwStrength = password.length >= 12 ? "strong" : password.length >= 8 ? "medium" : password.length > 0 ? "weak" : "none";
  const pwColor = { strong: "#34D399", medium: "#FBBF24", weak: "#F87171", none: "#3A3A60" }[pwStrength];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    try {
      const res = await apiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });
      const data = res as Record<string, Record<string, string>>;
      if (data?.data?.accessToken) {
        localStorage.setItem("accessToken",  data.data.accessToken);
        localStorage.setItem("refreshToken", data.data.refreshToken || "");
        router.push("/profile");
      } else {
        setError("Registration failed. Please try again.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Registration failed.";
      setError(msg.includes("already") ? "Email already registered. Try signing in." : msg);
    } finally {
      setLoading(false);
    }
  };

  const features = [
    "AI auto-applies to 100s of jobs daily",
    "Tailored CVs & cover letters per job",
    "Smart email auto-responder",
    "Interview prep & coaching",
  ];

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: "var(--bg-base)" }}
    >
      <div className="aurora-grid" />
      <div className="noise-overlay" />

      {/* Glows */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: 900,
          height: 900,
          borderRadius: "50%",
          top: "40%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: "radial-gradient(circle, rgba(124,58,237,0.07) 0%, transparent 65%)",
          filter: "blur(60px)",
        }}
      />

      <div className="relative w-full max-w-[900px] mx-4 grid grid-cols-1 md:grid-cols-[1fr_420px] gap-0 overflow-hidden rounded-[22px]"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 40px 100px rgba(0,0,0,0.6)",
        }}
      >
        {/* LEFT — features panel */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" as const }}
          className="hidden md:flex flex-col justify-between p-10 relative overflow-hidden"
          style={{
            background: "linear-gradient(145deg, rgba(124,58,237,0.12) 0%, rgba(6,182,212,0.04) 100%)",
            borderRight: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {/* Decorative glow */}
          <div
            className="absolute pointer-events-none"
            style={{
              width: 300,
              height: 300,
              borderRadius: "50%",
              bottom: -60,
              right: -60,
              background: "radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)",
              filter: "blur(40px)",
            }}
          />

          <div className="relative">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-12">
              <div
                className="w-9 h-9 rounded-[10px] flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)",
                  boxShadow: "0 6px 18px rgba(124,58,237,0.45)",
                }}
              >
                <Zap size={16} className="text-white" style={{ fill: "white" }} />
              </div>
              <span className="text-[16px] font-bold" style={{ color: "#F0F0FF" }}>AutoApply</span>
            </div>

            <h2 className="text-[28px] font-bold mb-3 leading-tight" style={{ color: "#F0F0FF", letterSpacing: "-0.02em" }}>
              Your AI-powered<br />
              <span className="gradient-text">career co-pilot</span>
            </h2>
            <p className="text-[13px] mb-8" style={{ color: "#5A5A80", lineHeight: 1.7 }}>
              AutoApply works 24/7 to find jobs, apply, and manage your entire job search on autopilot.
            </p>

            {/* Features */}
            <div className="space-y-3">
              {features.map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.08, ease: "easeOut" as const }}
                  className="flex items-center gap-3"
                >
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.3)" }}
                  >
                    <Check size={10} style={{ color: "#34D399" }} />
                  </div>
                  <span className="text-[13px]" style={{ color: "#8888A8" }}>{f}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Stat */}
          <div
            className="relative mt-8 px-5 py-4 rounded-[12px]"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <div className="text-[28px] font-bold" style={{ color: "#A78BFA" }}>2,400+</div>
            <div className="text-[12px]" style={{ color: "#5A5A80" }}>job offers secured in the last 30 days</div>
          </div>
        </motion.div>

        {/* RIGHT — form */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05, ease: "easeOut" as const }}
          className="p-9"
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-7 md:hidden">
            <div
              className="w-8 h-8 rounded-[9px] flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)", boxShadow: "0 4px 14px rgba(124,58,237,0.4)" }}
            >
              <Zap size={14} className="text-white" style={{ fill: "white" }} />
            </div>
            <span className="text-[15px] font-bold" style={{ color: "#F0F0FF" }}>AutoApply</span>
          </div>

          <div className="mb-7">
            <h1 className="text-[24px] font-bold mb-1.5" style={{ color: "#F0F0FF", letterSpacing: "-0.02em" }}>
              Create your account
            </h1>
            <p className="text-[13px]" style={{ color: "#5A5A80" }}>
              Free forever. No credit card required.
            </p>
          </div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mb-4 px-4 py-3 rounded-[10px] text-[12px]"
              style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)", color: "#F87171" }}
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-[11px] font-medium mb-1.5" style={{ color: "#5A5A80", letterSpacing: "0.02em" }}>
                FULL NAME
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Aarav Shah"
                required
                className="input-base"
                style={{ height: 44 }}
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-[11px] font-medium mb-1.5" style={{ color: "#5A5A80", letterSpacing: "0.02em" }}>
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
                <label className="text-[11px] font-medium" style={{ color: "#5A5A80", letterSpacing: "0.02em" }}>
                  PASSWORD
                </label>
                {password.length > 0 && (
                  <span className="text-[10px] font-medium capitalize" style={{ color: pwColor }}>
                    {pwStrength}
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  required
                  className="input-base pr-10"
                  style={{ height: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "#3A3A60" }}
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {/* Strength bar */}
              {password.length > 0 && (
                <div className="flex gap-1 mt-2">
                  {[1, 2, 3].map((i) => (
                    <motion.div
                      key={i}
                      className="h-1 flex-1 rounded-full"
                      animate={{
                        background: (pwStrength === "strong" || (pwStrength === "medium" && i <= 2) || (pwStrength === "weak" && i === 1))
                          ? pwColor
                          : "rgba(255,255,255,0.06)",
                      }}
                      transition={{ duration: 0.2 }}
                    />
                  ))}
                </div>
              )}
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
                  Creating account...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Get started free
                  <ArrowRight size={15} />
                </span>
              )}
            </button>

            <p className="text-[11px] text-center mt-1" style={{ color: "#3A3A60" }}>
              By signing up you agree to our{" "}
              <span style={{ color: "#5A5A80" }}>Terms</span> and{" "}
              <span style={{ color: "#5A5A80" }}>Privacy Policy</span>
            </p>
          </form>

          {/* Login link */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
            <span className="text-[11px]" style={{ color: "#2A2A40" }}>already have an account?</span>
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
          </div>

          <Link
            href="/login"
            className="block w-full h-[42px] flex items-center justify-center rounded-[11px] text-[13px] font-medium transition-all duration-150"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#9090B8",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
          >
            Sign in instead
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
