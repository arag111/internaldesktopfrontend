import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Disable linting and type checking during builds for faster deployment
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  // Image optimization domains
  images: {
    domains: ['appnode.tracknexus.in', 'client.tracknexus.in'],
  },

  // Production settings
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
