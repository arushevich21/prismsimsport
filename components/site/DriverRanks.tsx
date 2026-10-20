import { DR_TIERS, type Driver, type DriverRankTier } from '@/lib/types'
import { Flag } from './Flag'

const TIER_CHIP: Record<DriverRankTier, string> = {
  bronze: 'bg-[#d9a57a] text-ink',
  silver: 'bg-[#cfd4db] text-ink',
  gold: 'bg-[#f0cd6b] text-ink',
  platinum: 'bg-ice text-ink',
}

const tierName = (t: DriverRankTier) => t[0]!.toUpperCase() + t.slice(1)
const score = (d: Driver) => (d.lmu_dr_tier ? DR_TIERS.indexOf(d.lmu_dr_tier) * 3 + (d.lmu_dr_level ?? 1) : 0)

// LMU Driver Rank for the main lineup. Ranks are entered by an admin from each
// driver's in-game profile, so we show when they were last updated.
export function DriverRanks({ drivers }: { drivers: Driver[] }) {
  const ranked = drivers.filter((d) => d.lmu_dr_tier).sort((a, b) => score(b) - score(a))
  if (ranked.length === 0) return null
  const updated = ranked.map((d) => d.lmu_dr_updated_on).filter(Boolean).sort().at(-1)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <h3 className="font-heading text-xl font-bold sm:text-2xl">Driver Rank</h3>
        {updated && <p className="text-[13px] text-muted">From LMU driver profiles · updated {new Date(`${updated}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>}
      </div>
      <ul className="grid gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
        {ranked.map((d) => (
          <li key={d.id} className="flex items-center gap-3 border-b border-mist py-3">
            <Flag code={d.country_code} />
            <span className="min-w-0 flex-1 truncate font-semibold">{d.name}</span>
            <span className={`rounded px-2 py-1 font-mono text-[12px] font-semibold tracking-wide ${TIER_CHIP[d.lmu_dr_tier!]}`}>
              {tierName(d.lmu_dr_tier!)} {d.lmu_dr_level ?? ''}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
