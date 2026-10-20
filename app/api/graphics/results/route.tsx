import { getResultsByIds } from '@/lib/data'
import { renderResultsGraphic } from '@/lib/graphics/results'

// GET /api/graphics/results?ids=<id>,<id>: the results PNG the bot posts.
export async function GET(request: Request) {
  const url = new URL(request.url)
  const ids = url.searchParams.get('ids')?.split(',').filter(Boolean).slice(0, 10) ?? []
  const results = ids.length ? await getResultsByIds(ids) : []
  if (results.length === 0) return new Response('Not found', { status: 404 })
  return renderResultsGraphic(results, url.origin)
}
