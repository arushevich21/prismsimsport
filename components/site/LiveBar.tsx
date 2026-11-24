'use client'

import { useEffect, useState } from 'react'

export type LiveRace = { title: string; slots: string[]; raceLength: string | null; streamUrl: string | null; lineupUrl: string }

const HOUR = 60 * 60 * 1000

// How long a race runs, from its length as typed ("6 hours", "24h", "90 min").
// Four hours when it can't be read.
function durationMs(length: string | null) {
  const m = length?.match(/(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours|m|min|mins|minutes)\b/i)
  if (!m) return 4 * HOUR
  const n = Number(m[1])
  return /^h/i.test(m[2]!) ? n * HOUR : n * 60 * 1000
}

// A strip across the top of every page while we're racing, linking to the
// stream. The server can't know the time a cached page is viewed at, so this
// decides in the browser and checks again every half minute.
export function LiveBar({ race }: { race: LiveRace | null }) {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    const tick = () => setNow(Date.now())
    tick()
    const id = setInterval(tick, 30_000)
    return () => clearInterval(id)
  }, [])

  if (!race || now === null || race.slots.length === 0) return null
  const starts = race.slots.map((s) => Date.parse(s))
  const live = now >= Math.min(...starts) && now < Math.max(...starts) + durationMs(race.raceLength)
  if (!live) return null

  return (
    <div className="bg-ember text-ink">
      <div className="page-x flex min-h-11 flex-wrap items-center gap-x-4 gap-y-1 py-1.5 text-sm">
        <span className="flex items-center gap-2 font-semibold">
          <span aria-hidden="true" className="h-2 w-2 animate-pulse rounded-full bg-[#b3261e]" />
          Racing now
        </span>
        <span className="min-w-0 flex-1 truncate">{race.title}</span>
        <a href={race.streamUrl ?? race.lineupUrl} className="tap inline-flex items-center font-semibold underline underline-offset-2" {...(race.streamUrl ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
          {race.streamUrl ? 'Watch live' : 'See the lineup'}
        </a>
      </div>
    </div>
  )
}
