import type { Metadata } from 'next'
import RaceEditor from '@/components/admin/RaceEditor'
import { PageTitle } from '@/components/academy/ui'

export const metadata: Metadata = { title: 'Races and lineups' }

export default function AdminRacesPage() {
  return (
    <>
      <PageTitle
        title="Races and lineups"
        subtitle="Upcoming races, their cars and who drives them. Publishing posts the lineup to Discord."
      />
      <div className="rounded-xl border border-line bg-white">
        <RaceEditor />
      </div>
    </>
  )
}
