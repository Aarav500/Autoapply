/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker deployment
  output: 'standalone',

  experimental: {
    serverComponentsExternalPackages: ['googleapis', 'nodemailer', 'puppeteer', 'playwright', 'pdf-parse'],
    instrumentationHook: true,
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
