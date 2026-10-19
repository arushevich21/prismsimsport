import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { ChatThread } from '@/components/academy/ChatThread'
import { Avatar, PageTitle } from '@/components/academy/ui'
import { getMessages, getPeople, getStudentHome, personName } from '@/lib/academy/queries'
import { requireAcademyAccess } from '@/lib/auth'

export const metadata: Metadata = { title: 'Ask my coach' }

export default async function MessagesPage() {
  const viewer = await requireAcademyAccess('/messages')
  if (viewer.role === 'coach' || viewer.role === 'admin') redirect('/coach/messages')

  const me = viewer.user.id
  const [{ coach }, messages] = await Promise.all([getStudentHome(me), getMessages(me)])
  const people = await getPeople(messages.map((m) => m.sender_id).filter((id) => id !== me))
  const names = Object.fromEntries([...people.values()].map((p) => [p.id, personName(p)]))

  return (
    <>
      <PageTitle
        title="Ask my coach"
        subtitle={coach ? `Your conversation with ${personName(coach)}. Saved here, and your coach gets it on Discord.` : 'Your conversation with the PRISM coaching team.'}
      >
        {coach && <Avatar person={coach} size="h-12 w-12" />}
      </PageTitle>
      <ChatThread
        studentId={me}
        meId={me}
        initial={messages}
        names={names}
        placeholder="e.g. How should I approach the braking zone into turn 1?"
        footnote="Ctrl + Enter to send."
      />
    </>
  )
}
