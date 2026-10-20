import Image from 'next/image'
import Link from 'next/link'
import { getAcademyDrivers, getMainLineup, getNextRace, getSeasonResults, getSeasons } from '@/lib/data'
import { Editable } from '@/components/admin/Editable'
import { classChip } from '@/lib/site'
import { SIM_SHORT, lineupBadge, type Sim } from '@/lib/types'
import { btn, eyebrow, h2 } from '@/lib/ui'
import { Countdown, LocalTime } from './Countdown'
import { AcademyDrivers } from './AcademyDrivers'
import { DriverCard } from './DriverCard'
import { DriverRanks } from './DriverRanks'
import { Flag } from './Flag'
import { ResultsList } from './ResultsList'

const TABS: { sim: Sim; label: string }[] = [
  { sim: 'lmu', label: 'Le Mans Ultimate' },
  { sim: 'acc', label: 'ACC · Falcon Motorsport' },
]

export async function TeamView({ sim, season: requestedSeason }: { sim: Sim; season?: number }) {
  const [race, lineup, academy, seasons] = await Promise.all([getNextRace(sim), getMainLineup(sim), getAcademyDrivers(sim), getSeasons(sim)])
  const currentYear = new Date().getFullYear()
  const season = requestedSeason ?? seasons[0] ?? currentYear
  const seasonOptions = [...new Set([season, ...seasons])].sort((a, b) => b - a)
  const stats = await getSeasonResults(sim, season)
  const short = SIM_SHORT[sim]

  return (
    <>
      <section className="bg-graphite text-white">
        <div className="page-x flex flex-col gap-4 pt-12 sm:gap-5 sm:pt-16">
          <span className={`${eyebrow} text-ice`}>PRISM eSports · {season} season</span>
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
                className="tap inline-flex shrink-0 items-center rounded-t-lg bg-graphite-2 px-4 py-3 text-[15px] font-semibold whitespace-nowrap text-body-dark aria-[current=page]:bg-white aria-[current=page]:text-ink sm:px-5"
              >
                {t.label}
              </Link>
            ))}
          </nav>
        </div>
      </section>

      {/* Next race lineup */}
      <section id="lineup" className="scroll-mt-24 border-b border-line">
        <div className="page-x flex flex-col gap-6 py-12 sm:py-16">
          <Editable editor="race" sim={sim}>
          <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <span className={`${eyebrow} text-ember-deep`}>Next race lineup · {short}</span>
            {race ? (
              <>
                <h2 className="font-heading text-2xl font-bold sm:text-[1.75rem]">{race.event_name ?? race.series ?? 'Next race'}</h2>
                <p className="text-[#4a4f57]">
                  {[race.track, race.race_length].filter(Boolean).join(' · ')}
                  {race.starts_at && <> · <LocalTime iso={race.starts_at} fallback="" /></>}
                </p>
              </>
            ) : (
              <p className="text-[17px] text-[#4a4f57]">The lineup for our next {short} race is posted here once it&apos;s set.</p>
            )}
          </div>
          {race?.starts_at && (
            <div className="max-w-md rounded-xl bg-graphite p-3 text-white sm:p-4">
              <Countdown startsAt={race.starts_at} />
            </div>
          )}
          {race && race.cars.length > 0 && (
            <div className="grid gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-3">
              {race.cars.map((car) => (
                <article key={car.id} className="overflow-hidden rounded-xl border border-line">
                  <div className="flex items-center gap-3 bg-graphite px-5 py-4 text-white">
                    <span className="flex-1 font-semibold">{car.car_name ?? 'Car'}</span>
                    {car.class && (
                      <span className={`rounded px-2 py-1 text-[11px] font-semibold tracking-wider text-ink uppercase ${classChip(car.class)}`}>{car.class}</span>
                    )}
                  </div>
                  <ul className="px-5 py-1">
                    {car.drivers.map((d) => (
                      <li key={d.id} className="flex items-center gap-3 border-b border-mist py-3 last:border-0">
                        <Flag code={d.country_code} />
                        <span className="flex-1 font-semibold">
                          {d.name}
                          {d.nickname && <span className="font-normal text-muted"> “{d.nickname}”</span>}
                        </span>
                        {lineupBadge(d, sim) === 'GUEST' && (
                          <span className="rounded border border-[#cbd1d9] px-1.5 py-0.5 text-[11px] font-semibold tracking-wider text-[#4a4f57]">GUEST</span>
                        )}
                        {lineupBadge(d, sim) === 'ACADEMY' && (
                          <span className="rounded bg-iris px-1.5 py-0.5 text-[11px] font-semibold tracking-wider text-ink">ACADEMY</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
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
              <div className="flex items-center gap-3 self-start rounded-lg bg-graphite px-4 py-2">
                <span className="text-[13px] text-body-dark">In partnership with</span>
                <Image src="/brand/falcon-logo.png" alt="Falcon Motorsport" width={1200} height={848} className="h-9 w-auto" />
              </div>
            )}
          </div>
          <Editable editor="roster" sim={sim}>
          <div className="flex flex-col gap-10">
          {lineup.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-5">
              {lineup.map((d) => <DriverCard key={d.id} driver={d} />)}
            </div>
          ) : (
            <p className="text-muted">The lineup is being finalised.</p>
          )}
          {sim === 'lmu' && <DriverRanks drivers={lineup} />}
          </div>
          </Editable>

          <aside aria-label="Driver academy" className="mt-4 flex flex-col gap-6 rounded-xl bg-graphite p-6 text-white sm:p-10 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex max-w-2xl flex-col gap-3">
              <span className={`${eyebrow} text-ember`}>PRISM driver academy</span>
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
      <section id="results" className="scroll-mt-24 bg-mist">
        <div className="page-x flex flex-col gap-7 py-12 sm:py-20">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-2">
              <h2 className={h2}>Results</h2>
              <p className="text-[#4a4f57]">{sim === 'acc' ? 'ACC entries run with Falcon Motorsport.' : 'Le Mans Ultimate championships and endurance events.'}</p>
            </div>
            {seasonOptions.length > 1 && (
              <nav aria-label="Season" className="flex flex-wrap gap-2">
                {seasonOptions.map((s) => (
                  <Link
                    key={s}
                    href={s === seasons[0] ? `/team/${sim}#results` : `/team/${sim}/${s}#results`}
                    aria-current={s === season ? 'page' : undefined}
                    className="tap inline-flex items-center rounded-md border border-[#cbd1d9] bg-white px-4 font-mono text-sm aria-[current=page]:border-ink aria-[current=page]:bg-ink aria-[current=page]:text-white"
                  >
                    {s}
                  </Link>
                ))}
              </nav>
            )}
          </div>
          <Editable editor="results" sim={sim} season={season}>
          <div className="flex flex-col gap-7">
          <dl className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {[
              { label: 'Races', value: String(stats.races) },
              { label: 'Wins', value: String(stats.wins) },
              { label: 'Podiums', value: String(stats.podiums) },
              { label: 'Best championship', value: stats.bestChampionship ? `P${stats.bestChampionship}` : '—' },
            ].map((s) => (
              <div key={s.label} className="flex flex-col gap-1 rounded-xl border border-line bg-white p-4 sm:p-6">
                <dt className="text-[13px] text-muted">{s.label}</dt>
                <dd className="font-mono text-2xl font-semibold sm:text-3xl">{s.value}</dd>
              </div>
            ))}
          </dl>
          <ResultsList results={stats.results} empty={`No ${short} results logged for ${season} yet.`} />
          </div>
          </Editable>
        </div>
      </section>
    </>
  )
}
