import Image from 'next/image'
import Link from 'next/link'
import { getAcademyDrivers, getMainLineup, getNextRace, getSeasonResults, getSeasons } from '@/lib/data'
import { Editable } from '@/components/admin/Editable'
import { PHOTOS, classChip } from '@/lib/site'
import { CLASSES, SIM_SHORT, carStart, lineupBadge, raceSlots, type Sim } from '@/lib/types'
import { btn, h2 } from '@/lib/ui'
import { Countdown, LocalTime } from './Countdown'
import { AcademyDrivers } from './AcademyDrivers'
import { CarLogo } from './CarLogo'
import { DriverCard } from './DriverCard'
import { Flag } from './Flag'
import { ResultsList } from './ResultsList'
import { SeasonRecord } from './SeasonRecord'

const TABS: { sim: Sim; label: string }[] = [
  { sim: 'lmu', label: 'Le Mans Ultimate' },
  { sim: 'acc', label: 'ACC with Falcon Motorsport' },
]

// The main lineup grouped by class, in the sim's class order. Drivers with no
// class go under "Other", or ungrouped when nobody has one.
function byClass<D extends { lineup_class: string | null }>(sim: Sim, drivers: D[]) {
  const groups = CLASSES[sim]
    .map((cls) => ({ cls, drivers: drivers.filter((d) => d.lineup_class === cls) }))
    .filter((g) => g.drivers.length > 0)
  const rest = drivers.filter((d) => !d.lineup_class || !CLASSES[sim].includes(d.lineup_class))
  if (rest.length > 0) groups.push({ cls: groups.length > 0 ? 'Other' : '', drivers: rest })
  return groups
}

export async function TeamView({ sim, season: requestedSeason }: { sim: Sim; season?: number }) {
  const [race, lineup, academy, seasons] = await Promise.all([getNextRace(sim), getMainLineup(sim), getAcademyDrivers(sim), getSeasons(sim)])
  const currentYear = new Date().getFullYear()
  const season = requestedSeason ?? seasons[0] ?? currentYear
  const seasonOptions = [...new Set([season, ...seasons])].sort((a, b) => b - a)
  const stats = await getSeasonResults(sim, season)
  const short = SIM_SHORT[sim]
  const slots = race ? raceSlots(race) : []

  return (
    <div className="bg-graphite text-white">
      <section className="relative isolate overflow-hidden bg-graphite-2">
        {PHOTOS.teamHeader && (
          <>
            <Image src={PHOTOS.teamHeader.src} alt={PHOTOS.teamHeader.alt} fill priority sizes="100vw" className="-z-10 object-cover object-[50%_55%]" />
            {/* Keeps the title and intro readable over the photo */}
            <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,var(--color-graphite-2)_0%,rgb(30_33_40/0.88)_45%,rgb(30_33_40/0.45)_100%)]" />
          </>
        )}
        <div className="page-x flex flex-col gap-4 pt-12 sm:gap-5 sm:pt-16">
          <span className="text-sm font-semibold text-ice">{season} season</span>
          <h1 className="font-heading text-4xl leading-none font-bold sm:text-6xl">The team</h1>
          <p className="max-w-2xl text-[17px] leading-relaxed text-body-dark sm:text-lg">
            Our competitive lineups. LMU is where PRISM races under its own banner; in ACC our drivers run with Falcon Motorsport.
          </p>
          <nav aria-label="Program" className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:mt-6 sm:px-0">
            {TABS.map((t) => (
              <Link
                key={t.sim}
                href={`/team/${t.sim}`}
                aria-current={t.sim === sim ? 'page' : undefined}
                className="tap inline-flex shrink-0 items-center rounded-t-lg bg-graphite-3/60 px-4 py-3 text-[15px] font-semibold whitespace-nowrap text-body-dark hover:text-white aria-[current=page]:bg-graphite aria-[current=page]:text-white sm:px-5"
              >
                {t.label}
              </Link>
            ))}
          </nav>
        </div>
      </section>

      {/* Next race lineup */}
      <section id="lineup" className="scroll-mt-24 border-b border-graphite-3">
        <div className="page-x flex flex-col gap-6 py-12 sm:py-16">
          <Editable editor="race" sim={sim}>
          <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-ember">Next {short} race</span>
            {race ? (
              <>
                <h2 className="font-heading text-2xl font-bold sm:text-[1.75rem]">{race.event_name ?? race.series ?? 'Next race'}</h2>
                <p className="text-body-dark">
                  {[race.track, race.race_length].filter(Boolean).join(', ')}
                  {slots.length === 1 && <>, <LocalTime iso={slots[0]!} fallback="" /></>}
                  {slots.length > 1 && <>, {slots.length} timeslots</>}
                </p>
              </>
            ) : (
              <p className="text-[17px] text-body-dark">The lineup for our next {short} race is posted here once it&apos;s set.</p>
            )}
          </div>
          {slots.length > 0 && (
            <div className="max-w-md rounded-xl bg-graphite-2 p-3 sm:p-4">
              <Countdown startsAt={slots} />
            </div>
          )}
          {race && race.cars.length > 0 && (
            <div className="grid gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-3">
              {race.cars.map((car) => {
                const start = carStart(car, race)
                return (
                <article key={car.id} className="overflow-hidden rounded-xl border border-graphite-3 bg-graphite-2">
                  <div className="flex items-center gap-3 border-b border-graphite-3 px-5 py-4">
                    <CarLogo car={car.car_name} />
                    <span className="flex-1 font-semibold">{car.car_name ?? 'Car'}</span>
                    {car.class && (
                      <span className={`rounded px-2 py-1 text-[11px] font-semibold tracking-wider text-ink uppercase ${classChip(car.class)}`}>{car.class}</span>
                    )}
                  </div>
                  {slots.length > 1 && start && (
                    <p className="border-b border-graphite-3 px-5 py-2 text-[13px] text-body-dark">
                      Timeslot: <span className="font-semibold text-white"><LocalTime iso={start} fallback="" /></span>
                    </p>
                  )}
                  <ul className="px-5 py-1">
                    {car.drivers.map((d) => (
                      <li key={d.id} className="flex items-center gap-3 border-b border-graphite-3 py-3 last:border-0">
                        <Flag code={d.country_code} />
                        <span className="flex-1 font-semibold">
                          {d.name}
                          {d.nickname && <span className="font-normal text-muted-dark"> “{d.nickname}”</span>}
                        </span>
                        {lineupBadge(d, sim) === 'GUEST' && (
                          <span className="rounded border border-graphite-3 px-1.5 py-0.5 text-[11px] font-semibold tracking-wider text-body-dark">GUEST</span>
                        )}
                        {lineupBadge(d, sim) === 'ACADEMY' && (
                          <span className="rounded bg-iris px-1.5 py-0.5 text-[11px] font-semibold tracking-wider text-ink">ACADEMY</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </article>
                )
              })}
            </div>
          )}
          </div>
          </Editable>
        </div>
      </section>

      {/* Main lineup */}
      <section>
        <div className="page-x flex flex-col gap-7 py-12 sm:py-16">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-heading text-2xl font-bold sm:text-[1.75rem]">{short} lineup</h2>
            {sim === 'acc' && (
              <div className="flex items-center gap-3 self-start rounded-lg bg-graphite-2 px-4 py-2">
                <span className="text-[13px] text-body-dark">In partnership with</span>
                <Image src="/brand/falcon-logo.png" alt="Falcon Motorsport" width={1200} height={848} className="h-9 w-auto" />
              </div>
            )}
          </div>
          <Editable editor="roster" sim={sim}>
          {lineup.length > 0 ? (
            <div className="flex flex-col gap-8">
              {byClass(sim, lineup).map((g) => (
                <div key={g.cls || 'all'} className="flex flex-col gap-4">
                  {g.cls && (
                    <span className={`self-start rounded px-2 py-1 text-[11px] font-semibold tracking-wider text-ink uppercase ${g.cls === 'Other' ? 'bg-line' : classChip(g.cls)}`}>{g.cls}</span>
                  )}
                  <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-5">
                    {g.drivers.map((d) => <DriverCard key={d.id} driver={d} showRank={sim === 'lmu'} />)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-dark">The lineup is being finalised.</p>
          )}
          </Editable>

          <aside aria-label="Driver academy" className="mt-4 flex flex-col gap-6 rounded-xl border border-graphite-3 bg-graphite-2 p-6 sm:p-10 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex max-w-2xl flex-col gap-3">
              <h3 className="font-heading text-2xl leading-tight font-bold sm:text-[2rem]">Interested in joining?</h3>
              <p className="text-[17px] leading-relaxed text-body-dark">
                Apply to our driver academy, where your potential gets realised. Coaching, data review and a pathway onto the {short} lineup.
              </p>
            </div>
            <div className="flex flex-col gap-3 xs:flex-row lg:shrink-0">
              <Link href="/apply" className={btn.ember}>Apply to the academy</Link>
              <Link href="/academy#coaches" className={btn.outlineDark}>Meet the coaches</Link>
            </div>
          </aside>

          <AcademyDrivers sim={sim} drivers={academy} />
        </div>
      </section>

      {/* Results */}
      <section id="results" className="scroll-mt-24 border-t border-graphite-3">
        <div className="page-x flex flex-col gap-7 py-12 sm:py-20">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-2">
              <h2 className={h2}>Results</h2>
              <p className="text-body-dark">{sim === 'acc' ? 'ACC entries run with Falcon Motorsport.' : 'Le Mans Ultimate championships and endurance events.'}</p>
            </div>
            {seasonOptions.length > 1 && (
              <nav aria-label="Season" className="flex flex-wrap gap-2">
                {seasonOptions.map((s) => (
                  <Link
                    key={s}
                    href={s === seasons[0] ? `/team/${sim}#results` : `/team/${sim}/${s}#results`}
                    aria-current={s === season ? 'page' : undefined}
                    className="tap inline-flex items-center rounded-md border border-graphite-3 px-4 text-sm font-semibold tabular-nums text-body-dark hover:text-white aria-[current=page]:border-ice aria-[current=page]:bg-ice aria-[current=page]:text-ink"
                  >
                    {s}
                  </Link>
                ))}
              </nav>
            )}
          </div>
          <Editable editor="results" sim={sim} season={season}>
          <div className="flex flex-col gap-7">
          <div className="rounded-xl border border-graphite-3 bg-graphite-2 px-5 pt-4 sm:px-6">
            <SeasonRecord stats={stats} caption={`${season} season`} />
          </div>
          <ResultsList results={stats.results} empty={`No ${short} results logged for ${season} yet.`} />
          </div>
          </Editable>
        </div>
      </section>
    </div>
  )
}
