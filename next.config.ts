import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Serve images as-is. Our images are small, pre-sized logos and photos, and
  // skipping Vercel's image optimisation keeps usage (and cost) at zero.
  images: { unoptimized: true },

  // Old DTS Academy addresses → their PRISM replacements.
  async redirects() {
    return [
      { source: '/schedule', destination: '/sessions', permanent: true },
      { source: '/members', destination: '/messages', permanent: true },
      { source: '/admin', destination: '/coach', permanent: true },
      { source: '/admin/:path*', destination: '/coach', permanent: true },
    ]
  },
}

export default nextConfig
