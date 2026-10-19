import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Signed-in areas: nothing useful for search engines.
      disallow: ['/api/', '/auth/', '/coach', '/dashboard', '/sessions', '/messages', '/telemetry', '/library', '/setups', '/apply', '/pending', '/login'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
