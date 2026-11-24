import { classChip } from '@/lib/site'
import type { Driver } from '@/lib/types'
import { RankChip } from './DriverCard'
import { Flag } from './Flag'
import { DriverSocials } from './SocialIcon'

// The lineup as a roster, one driver per row like a timing tower: flag, name,
// role, class and Driver Rank. Two columns from tablet width up.
export function DriverList({ drivers }: { drivers: (Driver & { lineup_class: string | null })[] }) {
  return (
    <ul className="grid border-b border-graphite-3 md:grid-cols-2 md:gap-x-12">
      {drivers.map((d) => (
        <li key={d.id} className="flex min-h-16 items-center gap-4 border-t border-graphite-3 py-3">
          <Flag code={d.country_code} />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate font-semibold">
              {d.name}
              {d.nickname && <span className="font-normal text-muted-dark"> “{d.nickname}”</span>}
            </span>
            {d.role_tag && <span className="text-[13px] text-ember">{d.role_tag}</span>}
          </div>
          <DriverSocials driver={d} name={d.name} className="hidden sm:flex" />
          {d.lineup_class && (
            <span className={`hidden rounded px-2 py-0.5 text-xs font-semibold text-ink xs:inline ${classChip(d.lineup_class)}`}>{d.lineup_class}</span>
          )}
          <RankChip driver={d} />
        </li>
      ))}
    </ul>
  )
}
