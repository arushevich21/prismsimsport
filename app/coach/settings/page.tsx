import type { Metadata } from 'next'
import { Avatar, Card, PageTitle } from '@/components/academy/ui'
import { getCoaches, personName } from '@/lib/academy/queries'
import { requireStaff } from '@/lib/auth'
import { AddCoachForm, CoachSettingsForm } from './forms'

export const metadata: Metadata = { title: 'Coach settings' }

export default async function CoachSettingsPage() {
  const viewer = await requireStaff('/coach/settings')
  const coaches = await getCoaches()
  const me = coaches.find((c) => c.id === viewer.user.id)

  return (
    <>
      <PageTitle title="Settings" subtitle="How students book and pay you." />
      {me ? (
        <Card title="Your coaching profile"><CoachSettingsForm coach={me} /></Card>
      ) : (
        <Card><p className="text-[15px] text-[#4a4f57]">You don’t have a coach profile yet. An admin can add one below.</p></Card>
      )}
      {viewer.role === 'admin' && (
        <>
          <Card title="Coaches">
            <ul className="flex flex-col">
              {coaches.map((c) => (
                <li key={c.id} className="flex items-center gap-3 border-b border-mist py-3 last:border-0">
                  <Avatar person={c} />
                  <span className="flex-1 font-medium">{personName(c)}</span>
                  <span className="text-sm text-muted">{c.cal_username ? `cal.com/${c.cal_username}` : 'No booking link yet'}</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card title="Add a coach"><AddCoachForm /></Card>
        </>
      )}
    </>
  )
}
