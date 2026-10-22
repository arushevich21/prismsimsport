import { getPublishedRace } from '@/lib/data'
import { renderLineupGraphic } from '@/lib/graphics/lineup'

// GET /api/graphics/lineup/<race id>[?cars=<id>,<id>]: the lineup PNG the bot
// posts for a published race, optionally just some of its cars.
export async function GET(request: Request, { params }: { params: Promise<{ raceId: string }> }) {
  const { raceId } = await params
  const url = new URL(request.url)
  const race = await getPublishedRace(raceId)
  if (!race) return new Response('Not found', { status: 404 })
  return renderLineupGraphic(race, url.origin, url.searchParams.get('cars')?.split(',').filter(Boolean))
}
