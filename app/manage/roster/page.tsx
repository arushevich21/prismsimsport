import type { Metadata } from 'next'
import RosterEditor from '@/components/admin/RosterEditor'
import { PageTitle } from '@/components/academy/ui'

export const metadata: Metadata = { title: 'Driver roster' }

export default function AdminRosterPage() {
  return (
    <>
      <PageTitle
        title="Driver roster"
        subtitle="Names, flags, photos, classes and Driver Rank. Link each driver to their Discord account; entries marked “Added from Discord” can be merged into the driver’s original entry."
      />
      <div className="rounded-xl border border-line bg-white">
        <RosterEditor sim="lmu" />
      </div>
    </>
  )
}
