import type { Metadata } from 'next'
import Link from 'next/link'
import { Card, PageTitle } from '@/components/academy/ui'
import { LocalTime } from '@/components/site/Countdown'
import { getLatestResults, getNextRace } from '@/lib/data'
import { createPublicClient } from '@/lib/supabase/public'
import { SIM_SHORT, raceSlots } from '@/lib/types'

export const metadata: Metadata = { title: 'Overview' }

const action = 'tap inline-flex items-center self-start text-[15px] font-semibold text-iris-deep hover:text-ink'

// How many active drivers are on each sim's main lineup.
async function lineupCounts() {
  const { data } = await createPublicClient().from('drivers').select('main_lineup').eq('archived', false)
  const rows = (data ?? []) as { main_lineup: string[] }[]
  return { lmu: rows.filter((d) => d.main_lineup.includes('lmu')).length, acc: rows.filter((d) => d.main_lineup.includes('acc')).length, all: rows.length }
}

// What's on the public site right now, with the way to change each part.
export default async function AdminOverviewPage() {
  const [race, [latest], counts] = await Promise.all([getNextRace(), getLatestResults(1, 'lmu'), lineupCounts()])
  const start = race ? raceSlots(race)[0] : undefined

  return (
    <>
      <PageTitle title="Admin" subtitle="What the public site shows right now, and where to change it." />
      <div className="grid gap-5 md:grid-cols-2">
        <Card title="Next race">
          {race ? (
            <div className="flex flex-col gap-1">
              <p className="font-semibold">{race.event_name ?? race.series ?? race.track ?? 'Untitled race'} ({SIM_SHORT[race.sim]})</p>
              <p className="text-[15px] text-[#4a4f57]">
                {race.track}
                {start && <>, <LocalTime iso={start} fallback="" /></>}
              </p>
              <p className="text-[15px] text-[#4a4f57]">{race.cars.length} car{race.cars.length === 1 ? '' : 's'} entered</p>
            </div>
          ) : (
            <p className="text-[15px] text-[#4a4f57]">Nothing scheduled. The home page says the next race is announced in the Discord.</p>
          )}
          <Link href="/manage/races" className={action}>{race ? 'Edit races and lineups' : 'Add a race'}</Link>
        </Card>

        <Card title="Latest result">
          {latest ? (
            <div className="flex flex-col gap-1">
              <p className="font-semibold">{latest.finish ? `P${latest.finish}` : 'No finish'}, {latest.championship ?? 'Race'}</p>
              <p className="text-[15px] text-[#4a4f57]">{[latest.track, latest.car].filter(Boolean).join(', ')}</p>
              <p className="text-[15px] text-[#4a4f57]">Featured at the top of the home page.</p>
            </div>
          ) : (
            <p className="text-[15px] text-[#4a4f57]">No LMU results yet.</p>
          )}
          <Link href="/manage/results" className={action}>Add or edit results</Link>
        </Card>

        <Card title="Driver roster">
          <p className="text-[15px] text-[#4a4f57]">
            {counts.lmu} on the LMU lineup, {counts.acc} on the ACC lineup, {counts.all} active drivers in total.
          </p>
          <Link href="/manage/roster" className={action}>Edit the roster</Link>
        </Card>

        <Card title="Photos and sponsors">
          <p className="text-[15px] text-[#4a4f57]">
            The hero and car photos, sponsors and partner logos are set in the site&apos;s code (lib/site.ts), not here yet.
          </p>
        </Card>
      </div>
    </>
  )
}
