import { driverPhotoUrl } from '@/lib/photos'
import type { Driver, DriverRankTier } from '@/lib/types'
import { Flag, countryName } from './Flag'

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')
}

// Our own tier colours; deliberately not LMU's badge artwork.
const TIER_CHIP: Record<DriverRankTier, string> = {
  bronze: 'bg-[#d9a57a]',
  silver: 'bg-[#cfd4db]',
  gold: 'bg-[#f0cd6b]',
  platinum: 'bg-ice',
}

// LMU Driver Rank, entered by an admin from the driver's in-game profile.
function RankChip({ driver }: { driver: Driver }) {
  const tier = driver.lmu_dr_tier
  if (!tier) return null
  const updated = driver.lmu_dr_updated_on && new Date(`${driver.lmu_dr_updated_on}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  return (
    <span className="flex items-center gap-2 text-[13px] text-[#4a4f57] sm:text-sm" title={updated ? `LMU Driver Rank · updated ${updated}` : 'LMU Driver Rank'}>
      <span className="font-mono text-[11px] font-semibold tracking-wider text-muted">DR</span>
      <span className={`rounded px-2 py-0.5 font-mono text-[12px] font-semibold text-ink ${TIER_CHIP[tier]}`}>
        {tier[0]!.toUpperCase() + tier.slice(1)} {driver.lmu_dr_level ?? ''}
      </span>
    </span>
  )
}

export function DriverCard({ driver, showRank = false }: { driver: Driver; showRank?: boolean }) {
  const photo = driverPhotoUrl(driver.photo_path)
  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-line bg-white">
      <div className="relative aspect-[4/5] bg-graphite">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- user-uploaded photo from Supabase storage
          <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
        ) : (
          <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center font-heading text-4xl font-bold text-muted-dark/50 sm:text-5xl">
            {initials(driver.name)}
          </span>
        )}
        {driver.role_tag && (
          <span className="absolute top-2.5 left-2.5 max-w-[calc(100%-1.25rem)] rounded bg-ember px-2 py-1 text-[10px] leading-tight font-semibold tracking-wider text-ink uppercase sm:text-[11px]">
            {driver.role_tag}
          </span>
        )}
        {driver.nickname && (
          <span className="absolute bottom-2.5 left-2.5 rounded bg-white px-2.5 py-1 text-[12px] font-semibold text-ink sm:text-[13px]">
            “{driver.nickname}”
          </span>
        )}
      </div>
      <div className="flex flex-col gap-2 p-3.5 sm:p-5">
        <h3 className="text-[15px] leading-snug font-semibold sm:text-lg">{driver.name}</h3>
        <div className="flex items-center gap-2 text-[13px] text-[#4a4f57] sm:text-sm">
          <Flag code={driver.country_code} />
          <span>{countryName(driver.country_code) ?? 'Country not set'}</span>
        </div>
        {showRank && <RankChip driver={driver} />}
      </div>
    </article>
  )
}
