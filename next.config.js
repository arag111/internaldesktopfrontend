/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  // Image optimization
  images: {
    domains: ['appnode.tracknexus.in', 'app.tracknexus.in'],
  },
};

module.exports = nextConfig;