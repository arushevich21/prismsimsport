import { AdminBar, AdminProvider } from '@/components/admin/AdminProvider'
import { LiveBar } from '@/components/site/LiveBar'
import { SiteFooter } from '@/components/site/SiteFooter'
import { SiteHeader } from '@/components/site/SiteHeader'
import { getNextRace } from '@/lib/data'
import { STREAM } from '@/lib/site'
import { raceSlots } from '@/lib/types'

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  // Our next (or current) LMU race, for the "Racing now" strip.
  const race = await getNextRace('lmu')

  return (
    <AdminProvider>
      <div className="flex min-h-dvh flex-col bg-white font-sans font-normal text-ink">
        <a
          href="#main"
          className="sr-only z-50 rounded-md bg-ink px-4 py-3 text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to content
        </a>
        <LiveBar
          race={race && {
            title: [race.event_name ?? race.series, race.track].filter(Boolean).join(', ') || 'PRISM race',
            slots: raceSlots(race),
            raceLength: race.race_length,
            // The race's own stream, else the channel our races are usually on.
            streamUrl: race.stream_url ?? STREAM.url,
            lineupUrl: `/team/${race.sim}#lineup`,
          }}
        />
        <SiteHeader />
        <AdminBar />
        <main id="main" className="flex-1">{children}</main>
        <SiteFooter />
      </div>
    </AdminProvider>
  )
}
