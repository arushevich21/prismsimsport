import { classChip } from '@/lib/site'
import { CLASSES, type Driver, type Sim } from '@/lib/types'
import { Flag } from './Flag'

// Academy drivers for a sim, grouped by the class they're developing in.
// Drivers without a class (or with another sim's class) go under "Other".
export function AcademyDrivers({ sim, drivers }: { sim: Sim; drivers: Driver[] }) {
  if (drivers.length === 0) return null
  const classes = CLASSES[sim]
  const groups = classes
    .map((cls) => ({ cls, drivers: drivers.filter((d) => d.academy_class === cls) }))
    .filter((g) => g.drivers.length > 0)
  const rest = drivers.filter((d) => !d.academy_class || !classes.includes(d.academy_class))
  if (rest.length > 0) groups.push({ cls: groups.length > 0 ? 'Other' : '', drivers: rest })

  return (
    <div className="flex flex-col gap-5">
      <h3 className="font-heading text-xl font-bold sm:text-2xl">Academy drivers</h3>
      <div className="grid gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-3">
        {groups.map((g) => (
          <article key={g.cls || 'all'} className="overflow-hidden rounded-xl border border-line">
            {g.cls && (
              <div className="flex items-center bg-mist px-5 py-3">
                <span className={`rounded px-2 py-1 text-[11px] font-semibold tracking-wider text-ink uppercase ${g.cls === 'Other' ? 'bg-line' : classChip(g.cls)}`}>{g.cls}</span>
              </div>
            )}
            <ul className="px-5 py-1">
              {g.drivers.map((d) => (
                <li key={d.id} className="flex items-center gap-3 border-b border-mist py-3 last:border-0">
                  <Flag code={d.country_code} />
                  <span className="flex-1 font-semibold">
                    {d.name}
                    {d.nickname && <span className="font-normal text-muted"> “{d.nickname}”</span>}
                  </span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </div>
  )
}
