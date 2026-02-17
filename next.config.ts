import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Instrumentation hook is enabled by default in Next.js 14+
  // The instrumentation.ts file will be automatically detected

  // Enable standalone output for Docker deployment
  output: 'standalone',

  serverExternalPackages: ['googleapis', 'nodemailer', 'puppeteer', 'playwright'],

  webpack: (config, { isServer }) => {
    // Fix for googleapis module resolution issues
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        path: false,
        os: false,
        stream: false,
      };
    }

    return config;
  },
};

export default nextConfig;
