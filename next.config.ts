import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Serve images as-is. Our images are small, pre-sized logos and photos, and
  // skipping Vercel's image optimisation keeps usage (and cost) at zero.
  images: { unoptimized: true },

  // Basic hardening for every response. (The Cal.com and YouTube embeds are
  // framed *inside* our pages, which these don't affect.)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
        ],
      },
    ]
  },

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
