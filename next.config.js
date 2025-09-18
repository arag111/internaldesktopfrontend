/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  // Remove static export for dynamic routes
  // output: 'export', // This causes the error

  // Image optimization
  images: {
    domains: ['appnode.tracknexus.in', 'app.tracknexus.in'],
  },

  // For production deployment (not static export)
  trailingSlash: false,

  // Disable static optimization for dynamic routes
  experimental: {
    // esmExternals: false,
  },
};

module.exports = nextConfig;