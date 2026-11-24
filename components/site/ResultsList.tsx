import { classChip } from '@/lib/site'
import { SIM_SHORT, type Result } from '@/lib/types'

function formatDate(date: string | null) {
  if (!date) return '—'
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', timeZone: 'UTC' })
}

// Podium finishes get trophy-metal tiles, like a timing tower's top three.
const PODIUM: Record<number, string> = {
  1: 'bg-[#f0cd6b] text-ink',
  2: 'bg-[#cfd4db] text-ink',
  3: 'bg-[#d9a57a] text-ink',
}

function Position({ finish }: { finish: number | null }) {
  const tone = (finish && PODIUM[finish]) || 'bg-graphite-3 text-white'
  return (
    <span
      className={`flex h-12 w-14 shrink-0 items-center justify-center rounded-md font-heading text-lg font-bold tabular-nums sm:h-14 sm:w-16 sm:text-xl ${tone}`}
      aria-label={finish ? `Finished P${finish}` : 'No finish recorded'}
    >
      {finish ? `P${finish}` : '—'}
    </span>
  )
}

// One row per result, position first, the way a timing tower reads.
export function ResultsList({ results, showSim = false, empty }: { results: Result[]; showSim?: boolean; empty: string }) {
  if (results.length === 0) {
    return <p className="rounded-xl border border-graphite-3 bg-graphite-2 p-6 text-[15px] text-muted-dark">{empty}</p>
  }

  return (
    <ol className="flex flex-col overflow-hidden rounded-xl border border-graphite-3 bg-graphite-2 text-white">
      {results.map((r) => (
        <li key={r.id} className="flex items-center gap-4 border-t border-graphite-3 p-3 first:border-t-0 sm:gap-6 sm:px-5 sm:py-4">
          <Position finish={r.finish} />
          <div className="flex min-w-0 flex-1 flex-col gap-1 md:flex-row md:items-center md:gap-6">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="font-semibold leading-snug">{[r.championship, r.track].filter(Boolean).join(', ') || 'Race'}</span>
              <span className="text-sm text-body-dark">{r.car ?? 'Car not recorded'}</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-dark md:shrink-0 md:justify-end">
              {r.class && (
                <span className={`rounded px-2 py-0.5 text-xs font-semibold text-ink ${classChip(r.class)}`}>{r.class}</span>
              )}
              {showSim && <span>{SIM_SHORT[r.sim]}</span>}
              <span className="tabular-nums md:w-16 md:text-right">{formatDate(r.raced_on)}</span>
            </div>
          </div>
        </li>
      ))}
    </ol>
  )
}
