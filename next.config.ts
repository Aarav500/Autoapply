import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Instrumentation hook is enabled by default in Next.js 14+
  // The instrumentation.ts file will be automatically detected

  // Enable standalone output for Docker deployment
  output: 'standalone',

  // Disable static error pages to avoid Html import issues with Next 15 + React 19
  generateBuildId: async () => {
    return 'build-' + Date.now();
  },

  serverExternalPackages: ['googleapis', 'nodemailer', 'puppeteer', 'playwright'],

  // Experimental: skip default error page static generation
  experimental: {
    skipMiddlewareUrlNormalize: true,
  },

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
