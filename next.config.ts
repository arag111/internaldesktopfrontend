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

  // Security headers including CSP
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://appnode.tracknexus.in https://client.tracknexus.in",
              "connect-src 'self' https://appapi.tracknexus.in:8000 wss://appapi.tracknexus.in:8000 http://localhost:* ws://localhost:*",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },

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
