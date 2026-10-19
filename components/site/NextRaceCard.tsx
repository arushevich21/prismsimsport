import { DISCORD_INVITE_URL } from '@/lib/site'
import { SIM_SHORT, type Race } from '@/lib/types'
import { Countdown, LocalTime } from './Countdown'

export function NextRaceCard({ race }: { race: Race | null }) {
  if (!race) {
    return (
      <aside aria-label="Next race" className="flex flex-col gap-4 rounded-xl border border-graphite-3 bg-graphite-2 p-6 sm:p-8">
        <span className="font-mono text-xs tracking-[0.15em] text-ember uppercase">Next race</span>
        <p className="font-heading text-2xl font-bold">No race on the calendar yet.</p>
        <p className="text-body-dark">The next one gets announced in the Discord first.</p>
        {DISCORD_INVITE_URL && (
          <a href={DISCORD_INVITE_URL} className="font-semibold text-ice hover:text-white">Join the Discord →</a>
        )}
      </aside>
    )
  }

  const subtitle = [race.series ?? race.event_name, race.race_length].filter(Boolean).join(' · ')
  const entries = race.cars.map((c) => [c.car_name, c.class].filter(Boolean).join(' · ')).filter(Boolean)

  return (
    <aside aria-label="Next race" className="flex flex-col gap-6 rounded-xl border border-graphite-3 bg-graphite-2 p-5 sm:p-8">
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-xs tracking-[0.15em] text-ember uppercase">Next race</span>
        <span className="rounded border border-[#3a3f49] px-2 py-1 font-mono text-xs text-muted-dark">{SIM_SHORT[race.sim]}</span>
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="font-heading text-2xl leading-tight font-bold sm:text-[1.75rem]">{race.track ?? race.event_name ?? 'Track to be confirmed'}</p>
        {subtitle && <p className="text-body-dark">{subtitle}</p>}
      </div>
      {race.starts_at && <Countdown startsAt={race.starts_at} />}
      <dl className="flex flex-col text-[15px]">
        {race.starts_at && (
          <div className="flex justify-between gap-4 border-t border-graphite-3 py-3">
            <dt className="text-muted-dark">Green flag</dt>
            <dd className="text-right"><LocalTime iso={race.starts_at} fallback="" /></dd>
          </div>
        )}
        {entries.length > 0 && (
          <div className="flex justify-between gap-4 border-t border-graphite-3 py-3">
            <dt className="shrink-0 text-muted-dark">PRISM entries</dt>
            <dd className="text-right">{entries.join(', ')}</dd>
          </div>
        )}
      </dl>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <a href={`/team/${race.sim}#lineup`} className="tap inline-flex items-center font-semibold text-ice hover:text-white">See the lineup →</a>
        {race.stream_url && (
          <a href={race.stream_url} className="tap inline-flex items-center font-semibold text-ice hover:text-white" rel="noopener">Watch live →</a>
        )}
      </div>
    </aside>
  )
}
