import type { SeasonResults } from '@/lib/data'

// A season's record as one timing-screen row: races, wins, podiums, and the
// best championship finish. For dark backgrounds.
export function SeasonRecord({ stats, caption }: { stats: SeasonResults; caption: string }) {
  const cells = [
    { label: 'Races', value: String(stats.races) },
    { label: 'Wins', value: String(stats.wins) },
    { label: 'Podiums', value: String(stats.podiums) },
    // Only once a championship finish has been recorded; an empty cell reads as missing data.
    ...(stats.bestChampionship ? [{ label: 'Best championship', value: `P${stats.bestChampionship}` }] : []),
  ]
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-dark">{caption}</p>
      <dl className={`grid grid-cols-2 ${cells.length === 4 ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}>
        {cells.map((c, i) => (
          <div
            key={c.label}
            className={`flex flex-col-reverse gap-1 border-graphite-3 py-4 sm:py-5 [&:nth-child(-n+2)]:border-b sm:[&:nth-child(-n+2)]:border-b-0 ${i % 2 === 1 ? 'pl-5' : ''} ${i > 0 ? 'sm:border-l sm:pl-6' : ''} ${i % 2 === 1 ? 'border-l' : ''}`}
          >
            <dt className="text-[13px] text-muted-dark">{c.label}</dt>
            <dd className="font-heading text-3xl font-bold tabular-nums text-white sm:text-4xl">{c.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
