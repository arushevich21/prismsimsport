import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Serve images as-is. Our images are small, pre-sized logos and photos, and
  // skipping Vercel's image optimisation keeps usage (and cost) at zero.
  images: { unoptimized: true },
}

export default nextConfig
