"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        const message = data.error?.message || data.error || "Login failed";
        throw new Error(message);
      }

      // Store tokens
      localStorage.setItem("accessToken", data.data.accessToken);
      localStorage.setItem("refreshToken", data.data.refreshToken);

      // Redirect to dashboard
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center">
      {/* Glass Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-[440px] rounded-[20px] p-10"
        style={{
          background: "rgba(15, 15, 24, 0.8)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.06)",
        }}
      >
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <svg
            width="28"
            height="28"
            viewBox="0 0 28 28"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M14 2L24 26H20L18 21H10L8 26H4L14 2Z"
              stroke="#00FFE0"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <path
              d="M11 16H17"
              stroke="#00FFE0"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Title */}
        <h1
          className="text-[28px] font-bold text-center mb-2"
          style={{
            fontFamily: "'Outfit', sans-serif",
            color: "#E8E8F0",
          }}
        >
          Welcome back
        </h1>
        <p
          className="text-[14px] text-center mb-8"
          style={{
            fontFamily: "'DM Sans', sans-serif",
            color: "#7E7E98",
          }}
        >
          Sign in to your command center
        </p>

        {/* Error Message */}
        {error && (
          <div
            className="mb-4 p-3 rounded-lg"
            style={{
              background: "rgba(255, 71, 87, 0.1)",
              border: "1px solid rgba(255, 71, 87, 0.2)",
            }}
          >
            <p className="text-sm text-[#FF4757]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              {error}
            </p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Email Input */}
          <div className="mb-4 relative">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder=" "
              required
              className="peer w-full px-4 pt-6 pb-2 rounded-lg border transition-all duration-200 bg-transparent outline-none"
              style={{
                borderColor: "rgba(255, 255, 255, 0.08)",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "14px",
                color: "#E8E8F0",
              }}
            />
            <label
              className="absolute left-4 top-4 transition-all duration-200 pointer-events-none peer-focus:top-2 peer-focus:text-xs peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:text-xs"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "14px",
                color: "#7E7E98",
              }}
            >
              Email
            </label>
          </div>

          {/* Password Input */}
          <div className="mb-6 relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder=" "
              required
              className="peer w-full px-4 pt-6 pb-2 pr-12 rounded-lg border transition-all duration-200 bg-transparent outline-none"
              style={{
                borderColor: "rgba(255, 255, 255, 0.08)",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "14px",
                color: "#E8E8F0",
              }}
            />
            <label
              className="absolute left-4 top-4 transition-all duration-200 pointer-events-none peer-focus:top-2 peer-focus:text-xs peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:text-xs"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "14px",
                color: "#7E7E98",
              }}
            >
              Password
            </label>
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2"
            >
              {showPassword ? (
                <EyeOff size={18} className="text-[#7E7E98]" />
              ) : (
                <Eye size={18} className="text-[#7E7E98]" />
              )}
            </button>
          </div>

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-lg font-semibold mb-4 transition-all disabled:opacity-50"
            style={{
              background: "#00FFE0",
              color: "#050508",
              fontFamily: "'Outfit', sans-serif",
            }}
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </button>

          {/* Register Link */}
          <p
            className="text-center text-sm"
            style={{ fontFamily: "'DM Sans', sans-serif", color: "#7E7E98" }}
          >
            Don&apos;t have an account?{" "}
            <a
              href="/register"
              className="font-semibold hover:underline"
              style={{ color: "#00FFE0" }}
            >
              Create one
            </a>
          </p>
        </form>
      </motion.div>
    </div>
  );
}
