import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

export default function sitemap(): MetadataRoute.Sitemap {
  return ['', '/team', '/team/lmu', '/team/acc', '/community', '/academy'].map((path) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: path.startsWith('/team') || path === '' ? 'daily' : 'monthly',
    priority: path === '' ? 1 : 0.7,
  }))
}
