import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // ✅ FIX #12: Enable linting and type checking during builds
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },

  // Image optimization domains
  images: {
    domains: ['appnode.tracknexus.in', 'client.tracknexus.in'],
  },

  // Production settings
  poweredByHeader: false,
  reactStrictMode: true,

  // Webpack configuration to fix module loading issues
  webpack: (config, { isServer }) => {
    // Fix for "Cannot read properties of undefined (reading 'call')" error
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    // Improve module resolution
    config.resolve.modules = ['node_modules', ...(config.resolve.modules || [])];

    return config;
  },
};

export default nextConfig;
