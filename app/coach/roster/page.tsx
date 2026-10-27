import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import RosterEditor from '@/components/admin/RosterEditor'
import { PageTitle } from '@/components/academy/ui'
import { requireStaff } from '@/lib/auth'

export const metadata: Metadata = { title: 'Driver roster' }

// The team page's roster editor, without going through edit mode: linking
// drivers to their Discord accounts and merging the entries added from Discord.
export default async function CoachRosterPage() {
  const viewer = await requireStaff('/coach/roster')
  if (viewer.role !== 'admin') redirect('/coach')

  return (
    <>
      <PageTitle
        title="Driver roster"
        subtitle="Link each driver to their Discord account. Entries marked “Added from Discord” can be merged into the driver’s original entry."
      />
      <div className="rounded-xl border border-line bg-white">
        <RosterEditor sim="lmu" />
      </div>
    </>
  )
}
